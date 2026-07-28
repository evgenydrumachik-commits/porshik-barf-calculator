const { authorizeRequest } = require("./_auth");
const { buildFullBackupPayload } = require("./_backup");
const { readExpenseOrders } = require("./_expenses");
const { readProfile } = require("./_profile");
const {
  createDailyBackup,
  listRestorePoints,
  normalizeRecord,
  readRecords,
  restoreRecordsFromPath,
  writeRecords
} = require("./_weights");

function sessionEmail(session) {
  return session?.claims?.email || "unknown";
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function mergeIncomingRecord(previous, body) {
  const candidate = {
    date: body.date,
    weightKg: hasOwn(body, "weightKg") ? body.weightKg : previous?.weightKg,
    meals: hasOwn(body, "meals") ? body.meals : (previous?.meals || []),
    comment: hasOwn(body, "comment") || hasOwn(body, "note")
      ? (body.comment ?? body.note)
      : (previous?.comment || "")
  };
  return normalizeRecord(candidate);
}

module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method === "GET") {
    try {
      if (request.query.export || request.query.backups) {
        const session = await authorizeRequest(request);
        if (!session) {
          response.status(401).json({ error: "Нужен вход администратора" });
          return;
        }
      }

      if (request.query.export) {
        const [recordData, profile, expenseData] = await Promise.all([
          readRecords(),
          readProfile(),
          readExpenseOrders()
        ]);
        const payload = buildFullBackupPayload({
          records: recordData.records,
          profile,
          expenses: expenseData.orders
        }, {
          exportType: "manual",
          storageReady: Boolean(recordData.storageReady && profile.storageReady && expenseData.storageReady)
        });
        const filename = `porschik-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        response.status(200).send(JSON.stringify(payload, null, 2));
        return;
      }

      if (request.query.backups) {
        response.status(200).json({ restorePoints: await listRestorePoints() });
        return;
      }

      const { records, storageReady } = await readRecords();
      response.status(200).json({ schemaVersion: 2, records, storageReady });
    } catch (error) {
      response.status(500).json({ error: "Не удалось загрузить дневник Поршика" });
    }
    return;
  }

  const session = await authorizeRequest(request);
  if (!session) {
    response.status(401).json({ error: "Нужен вход администратора" });
    return;
  }

  if (request.method === "POST") {
    try {
      const body = typeof request.body === "string" ? JSON.parse(request.body) : (request.body || {});
      const action = String(body.action || "");

      if (action === "dailyBackup") {
        const { records } = await readRecords();
        const backup = await createDailyBackup(records, new Date(), {
          auditEvent: {
            action: "daily_backup",
            actor: sessionEmail(session),
            recordCount: records.length
          }
        });
        response.status(200).json({ backup, storageReady: true });
        return;
      }

      if (action === "restore") {
        const pathname = String(body.pathname || "");
        if (!pathname) {
          response.status(400).json({ error: "Не выбрана резервная копия" });
          return;
        }
        const before = await readRecords();
        const saved = await restoreRecordsFromPath(pathname, {
          auditEvent: {
            action: "restore",
            actor: sessionEmail(session),
            sourcePath: pathname,
            beforeCount: before.records.length
          }
        });
        response.status(200).json({ records: saved, storageReady: true });
        return;
      }

      const replaceId = String(body.replaceId || body.date || "");
      const { records } = await readRecords();
      const previous = records.find((item) => item.id === replaceId || item.date === body.date) || null;
      const record = mergeIncomingRecord(previous, body);
      const nextRecords = records.filter((item) => item.id !== record.id && item.id !== replaceId);
      nextRecords.push(record);
      const saved = await writeRecords(nextRecords, {
        auditEvent: {
          action: previous ? "update" : "create",
          recordType: String(body.recordType || "daily_record"),
          actor: sessionEmail(session),
          before: previous,
          after: record,
          recordCount: nextRecords.length
        }
      });
      response.status(200).json({ records: saved, storageReady: true });
    } catch (error) {
      response.status(error.statusCode || 400).json({ error: error.message || "Не удалось сохранить запись" });
    }
    return;
  }

  if (request.method === "DELETE") {
    try {
      const id = String(request.query.id || "");
      if (!id) {
        response.status(400).json({ error: "Не указан ID записи" });
        return;
      }
      const { records } = await readRecords();
      const removed = records.find((item) => item.id === id) || null;
      const nextRecords = records.filter((item) => item.id !== id);
      const saved = await writeRecords(nextRecords, {
        auditEvent: {
          action: "delete",
          recordType: "daily_record",
          actor: sessionEmail(session),
          before: removed,
          recordCount: nextRecords.length
        }
      });
      response.status(200).json({ records: saved, storageReady: true });
    } catch (error) {
      response.status(error.statusCode || 400).json({ error: error.message || "Не удалось удалить запись" });
    }
    return;
  }

  response.setHeader("Allow", "GET, POST, DELETE");
  response.status(405).json({ error: "Method not allowed" });
};
