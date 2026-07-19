const { authorizeRequest } = require("./_auth");
const {
  buildRecordsPayload,
  createDailyBackup,
  listRestorePoints,
  normalizeRecord,
  readRecords,
  restoreRecordsFromPath,
  writeAuditEvent,
  writeRecords
} = require("./_weights");

function sessionEmail(session) {
  return session?.claims?.email || "unknown";
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
        const { records, storageReady } = await readRecords();
        const payload = buildRecordsPayload(records, {
          exportType: "manual",
          storageReady
        });
        const filename = `porschik-weight-backup-${new Date().toISOString().slice(0, 10)}.json`;
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        response.status(200).send(JSON.stringify(payload, null, 2));
        return;
      }

      if (request.query.backups) {
        const restorePoints = await listRestorePoints();
        response.status(200).json({ restorePoints });
        return;
      }

      const { records, storageReady } = await readRecords();
      response.status(200).json({ records, storageReady });
    } catch (error) {
      response.status(500).json({ error: "Не удалось загрузить историю веса" });
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
      const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
      const action = String((body && body.action) || "");

      if (action === "dailyBackup") {
        const { records } = await readRecords();
        const backup = await createDailyBackup(records);
        await writeAuditEvent({
          action: "daily_backup",
          actor: sessionEmail(session),
          backupPath: backup.pathname,
          recordCount: records.length
        });
        response.status(200).json({ backup, storageReady: true });
        return;
      }

      if (action === "restore") {
        const pathname = String((body && body.pathname) || "");
        if (!pathname) {
          response.status(400).json({ error: "Не выбрана резервная копия" });
          return;
        }

        const before = await readRecords();
        const saved = await restoreRecordsFromPath(pathname);
        await writeAuditEvent({
          action: "restore",
          actor: sessionEmail(session),
          sourcePath: pathname,
          beforeCount: before.records.length,
          afterCount: saved.length
        });
        response.status(200).json({ records: saved, storageReady: true });
        return;
      }

      const record = normalizeRecord(body || {});
      const replaceId = String((body && body.replaceId) || record.id);
      const { records } = await readRecords();
      const previous = records.find((item) => item.id === replaceId || item.id === record.id) || null;
      const nextRecords = records.filter((item) => item.id !== record.id && item.id !== replaceId);
      nextRecords.push(record);
      const saved = await writeRecords(nextRecords);
      await writeAuditEvent({
        action: previous ? "update" : "create",
        actor: sessionEmail(session),
        before: previous,
        after: record,
        recordCount: saved.length
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
      const saved = await writeRecords(nextRecords);
      await writeAuditEvent({
        action: "delete",
        actor: sessionEmail(session),
        before: removed,
        recordCount: saved.length
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
