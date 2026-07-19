const LEGACY_BLOB_PATH = "porschik/weights.json";
const SNAPSHOT_PREFIX = "porschik/weights/";
const DAILY_BACKUP_PREFIX = "porschik/backups/daily/";
const AUDIT_PREFIX = "porschik/audit/";
const randomUUID = () => globalThis.crypto.randomUUID();

const seedRecords = [
  {
    id: "2026-06-28",
    date: "2026-06-28",
    weightKg: 3.1,
    note: "Текущий ориентир"
  }
];

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function parseWeightKg(value) {
  const raw = String(value ?? "")
    .trim()
    .replace(/\u00a0/g, " ")
    .replace(/[，٫]/g, ",")
    .replace(/[−–—]/g, "-");
  const match = raw
    .replace(/[^\d,.\-+\s']/g, " ")
    .match(/[+-]?(?:\d[\d\s,.'']*[,.]\d+|\d[\d\s,.'']*|\d*[,.]\d+)/);

  if (!match) {
    return NaN;
  }

  let token = match[0].replace(/\s+/g, "").replace(/'/g, "");
  const lastComma = token.lastIndexOf(",");
  const lastDot = token.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);

  if (decimalIndex >= 0) {
    const intPart = token.slice(0, decimalIndex).replace(/[,.]/g, "");
    const fracPart = token.slice(decimalIndex + 1).replace(/[,.]/g, "");
    token = `${intPart || "0"}.${fracPart}`;
  } else {
    token = token.replace(/[,.]/g, "");
  }

  let parsed = Number.parseFloat(token);
  if (parsed > 20 && /^\d{3,5}$/.test(token)) {
    const digits = Number.parseInt(token, 10);
    for (const scale of [100, 1000, 10000]) {
      const inferred = digits / scale;
      if (inferred >= 1 && inferred <= 20) {
        parsed = inferred;
        break;
      }
    }
  }

  return parsed;
}

function normalizeRecord(record) {
  const date = String(record.date || "").slice(0, 10);
  const weightKg = parseWeightKg(record.weightKg);
  const note = String(record.note || "").trim().slice(0, 80);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Нужна дата в формате YYYY-MM-DD");
  }

  if (!Number.isFinite(weightKg) || weightKg < 1 || weightKg > 20) {
    throw new Error("Вес должен быть от 1 до 20 кг");
  }

  return {
    id: date,
    date,
    weightKg: Math.round(weightKg * 100) / 100,
    note
  };
}

function sortRecords(records) {
  return [...records].sort((a, b) => a.date.localeCompare(b.date));
}

function isoStamp() {
  return new Date().toISOString();
}

function blobSafeStamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

async function readRecords() {
  if (!hasBlobToken()) {
    return {
      storageReady: false,
      records: seedRecords
    };
  }

  const latestSnapshot = (await listSnapshots())[0];

  const payload = latestSnapshot
    ? await readBlobPayload(latestSnapshot.pathname)
    : await readBlobPayload(LEGACY_BLOB_PATH);

  if (!payload) {
    return {
      storageReady: true,
      records: seedRecords
    };
  }

  return {
    storageReady: true,
    records: sortRecords((payload.records || []).map(normalizeRecord))
  };
}

async function readBlobPayload(pathname) {
  const { get } = await import("@vercel/blob");
  const blob = await get(pathname, {
    access: "public",
    headers: {
      "Cache-Control": "no-store"
    }
  });

  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    return null;
  }

  return JSON.parse(await new Response(blob.stream).text());
}

async function writeRecords(records) {
  if (!hasBlobToken()) {
    const error = new Error("Vercel Blob ещё не подключён");
    error.statusCode = 503;
    throw error;
  }

  const { put } = await import("@vercel/blob");
  const normalized = sortRecords(records.map(normalizeRecord));
  const snapshotPath = `${SNAPSHOT_PREFIX}${blobSafeStamp()}-${randomUUID()}.json`;
  const payload = buildRecordsPayload(normalized);

  await put(snapshotPath, JSON.stringify(payload, null, 2), {
    access: "public",
    cacheControlMaxAge: 60,
    contentType: "application/json"
  });

  await ensureDailyBackup(normalized);

  return normalized;
}

function buildRecordsPayload(records, extra = {}) {
  return {
    schemaVersion: 1,
    exportedAt: isoStamp(),
    records,
    ...extra
  };
}

async function listBlobs(prefix, limit = 1000) {
  if (!hasBlobToken()) {
    return [];
  }

  const { list } = await import("@vercel/blob");
  const result = await list({ prefix, limit });
  return result.blobs
    .filter((entry) => entry.pathname.endsWith(".json"))
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
}

async function listSnapshots() {
  return listBlobs(SNAPSHOT_PREFIX);
}

async function listDailyBackups() {
  return listBlobs(DAILY_BACKUP_PREFIX);
}

async function listRestorePoints() {
  const [backups, snapshots] = await Promise.all([
    listDailyBackups(),
    listSnapshots()
  ]);

  return [...backups, ...snapshots]
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
    .map((entry) => ({
      pathname: entry.pathname,
      uploadedAt: entry.uploadedAt,
      type: entry.pathname.startsWith(DAILY_BACKUP_PREFIX) ? "backup" : "snapshot"
    }));
}

async function ensureDailyBackup(records, date = new Date()) {
  const day = todayKey(date);
  const existing = await listBlobs(`${DAILY_BACKUP_PREFIX}${day}/`, 1);

  if (existing.length) {
    return null;
  }

  return createDailyBackup(records, date);
}

async function createDailyBackup(records, date = new Date()) {
  if (!hasBlobToken()) {
    const error = new Error("Vercel Blob ещё не подключён");
    error.statusCode = 503;
    throw error;
  }

  const { put } = await import("@vercel/blob");
  const normalized = sortRecords(records.map(normalizeRecord));
  const day = todayKey(date);
  const backupPath = `${DAILY_BACKUP_PREFIX}${day}/${blobSafeStamp(date)}-${randomUUID()}.json`;

  await put(backupPath, JSON.stringify(buildRecordsPayload(normalized, {
    backupType: "daily",
    backupDate: day
  }), null, 2), {
    access: "public",
    cacheControlMaxAge: 60,
    contentType: "application/json"
  });

  return {
    pathname: backupPath,
    records: normalized
  };
}

async function readRecordsFromPath(pathname) {
  const payload = await readBlobPayload(pathname);
  if (!payload || !Array.isArray(payload.records)) {
    const error = new Error("Не удалось прочитать выбранную резервную копию");
    error.statusCode = 400;
    throw error;
  }

  return sortRecords(payload.records.map(normalizeRecord));
}

async function restoreRecordsFromPath(pathname) {
  if (
    pathname !== LEGACY_BLOB_PATH
    && !pathname.startsWith(SNAPSHOT_PREFIX)
    && !pathname.startsWith(DAILY_BACKUP_PREFIX)
  ) {
    const error = new Error("Недопустимый путь резервной копии");
    error.statusCode = 400;
    throw error;
  }

  const records = await readRecordsFromPath(pathname);
  const saved = await writeRecords(records);
  return saved;
}

async function writeAuditEvent(event) {
  if (!hasBlobToken()) {
    return null;
  }

  const { put } = await import("@vercel/blob");
  const timestamp = isoStamp();
  const auditPath = `${AUDIT_PREFIX}${blobSafeStamp(new Date(timestamp))}-${randomUUID()}.json`;
  const payload = {
    schemaVersion: 1,
    timestamp,
    ...event
  };

  await put(auditPath, JSON.stringify(payload, null, 2), {
    access: "public",
    cacheControlMaxAge: 60,
    contentType: "application/json"
  });

  return auditPath;
}

module.exports = {
  buildRecordsPayload,
  createDailyBackup,
  listDailyBackups,
  listRestorePoints,
  listSnapshots,
  normalizeRecord,
  parseWeightKg,
  readRecords,
  restoreRecordsFromPath,
  writeAuditEvent,
  writeRecords
};
