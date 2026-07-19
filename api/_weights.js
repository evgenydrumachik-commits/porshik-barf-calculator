const LEGACY_BLOB_PATH = "porschik/weights.json";
const SNAPSHOT_PREFIX = "porschik/weights/";
const DAILY_BACKUP_PREFIX = "porschik/backups/daily/";
const AUDIT_PREFIX = "porschik/audit/";
const { randomUUID } = require("crypto");

const seedRecords = [
  { id: "2026-05-01", date: "2026-05-01", weightKg: 2.5, meals: [], comment: "Первый замер" },
  { id: "2026-05-08", date: "2026-05-08", weightKg: 3.0, meals: [], comment: "" },
  { id: "2026-05-15", date: "2026-05-15", weightKg: 3.45, meals: [], comment: "" },
  { id: "2026-05-22", date: "2026-05-22", weightKg: 3.9, meals: [], comment: "" },
  { id: "2026-05-29", date: "2026-05-29", weightKg: 4.37, meals: [], comment: "" },
  { id: "2026-06-05", date: "2026-06-05", weightKg: 4.76, meals: [], comment: "" },
  { id: "2026-06-12", date: "2026-06-12", weightKg: 5.4, meals: [], comment: "" },
  { id: "2026-06-19", date: "2026-06-19", weightKg: 6.1, meals: [], comment: "" },
  { id: "2026-06-26", date: "2026-06-26", weightKg: 6.55, meals: [], comment: "" },
  { id: "2026-07-03", date: "2026-07-03", weightKg: 7.05, meals: [], comment: "Вечером перед ужином" },
  { id: "2026-07-10", date: "2026-07-10", weightKg: 7.25, meals: [], comment: "" },
  { id: "2026-07-17", date: "2026-07-17", weightKg: 7.95, meals: [], comment: "Вечер, до еды" }
];

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function parseLocalizedNumber(value) {
  if (value === null || value === undefined || value === "") {
    return NaN;
  }
  const raw = String(value)
    .trim()
    .replace(/\u00a0/g, " ")
    .replace(/[，٫]/g, ",")
    .replace(/[−–—]/g, "-");
  const match = raw
    .replace(/[^\d,.\-+\s']/g, " ")
    .match(/[+-]?(?:\d[\d\s,.'']*[,.]\d+|\d[\d\s,.'']*|\d*[,.]\d+)/);

  if (!match) return NaN;

  let token = match[0].replace(/\s+/g, "").replace(/'/g, "");
  const decimalIndex = Math.max(token.lastIndexOf(","), token.lastIndexOf("."));
  if (decimalIndex >= 0) {
    const integerPart = token.slice(0, decimalIndex).replace(/[,.]/g, "");
    const fractionalPart = token.slice(decimalIndex + 1).replace(/[,.]/g, "");
    token = `${integerPart || "0"}.${fractionalPart}`;
  } else {
    token = token.replace(/[,.]/g, "");
  }
  return Number.parseFloat(token);
}

function parseWeightKg(value) {
  let parsed = parseLocalizedNumber(value);
  const compact = String(value ?? "").replace(/[^\d]/g, "");
  if (parsed > 20 && /^\d{3,5}$/.test(compact)) {
    const digits = Number.parseInt(compact, 10);
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

function normalizeMeals(meals) {
  if (!Array.isArray(meals)) return [];
  const bySlot = new Map();

  for (const meal of meals) {
    const slot = Number.parseInt(meal?.slot, 10);
    if (!Number.isInteger(slot) || slot < 1 || slot > 4) {
      const error = new Error("Номер приёма должен быть от 1 до 4");
      error.statusCode = 400;
      throw error;
    }

    const skipped = Boolean(meal?.skipped);
    const grams = skipped ? null : parseLocalizedNumber(meal?.grams);
    if (!skipped && (!Number.isFinite(grams) || grams < 1 || grams > 1000)) {
      const error = new Error("Порция должна быть от 1 до 1000 г или отмечена как пропущенная");
      error.statusCode = 400;
      throw error;
    }

    bySlot.set(slot, {
      slot,
      grams: skipped ? null : Math.round(grams),
      skipped
    });
  }

  return [...bySlot.values()].sort((a, b) => a.slot - b.slot);
}

function normalizeRecord(record) {
  const date = String(record?.date || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const error = new Error("Нужна дата в формате YYYY-MM-DD");
    error.statusCode = 400;
    throw error;
  }

  const hasWeight = record?.weightKg !== null
    && record?.weightKg !== undefined
    && record?.weightKg !== "";
  const weightKg = hasWeight ? parseWeightKg(record.weightKg) : null;
  if (hasWeight && (!Number.isFinite(weightKg) || weightKg < 1 || weightKg > 20)) {
    const error = new Error("Вес должен быть от 1 до 20 кг");
    error.statusCode = 400;
    throw error;
  }

  const meals = normalizeMeals(record?.meals || []);
  const comment = String(record?.comment ?? record?.note ?? "").trim().slice(0, 240);
  if (!hasWeight && meals.length === 0 && !comment) {
    const error = new Error("Запись должна содержать вес, питание или комментарий");
    error.statusCode = 400;
    throw error;
  }

  return {
    id: date,
    date,
    weightKg: hasWeight ? Math.round(weightKg * 100) / 100 : null,
    meals,
    comment
  };
}

function sortRecords(records) {
  return [...records].sort((a, b) => a.date.localeCompare(b.date));
}

function normalizeRecords(records) {
  const byDate = new Map();
  for (const rawRecord of Array.isArray(records) ? records : []) {
    const normalized = normalizeRecord(rawRecord);
    const previous = byDate.get(normalized.date);
    if (!previous) {
      byDate.set(normalized.date, normalized);
      continue;
    }
    byDate.set(normalized.date, {
      ...previous,
      weightKg: normalized.weightKg ?? previous.weightKg,
      meals: normalized.meals.length ? normalized.meals : previous.meals,
      comment: normalized.comment || previous.comment
    });
  }
  return sortRecords([...byDate.values()]);
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

function buildRecordsPayload(records, extra = {}) {
  return {
    schemaVersion: 2,
    exportedAt: isoStamp(),
    records: normalizeRecords(records),
    ...extra
  };
}

async function readBlobPayload(pathname) {
  const { get } = require("@vercel/blob");
  const blob = await get(pathname, {
    access: "public",
    headers: { "Cache-Control": "no-store" }
  });
  if (!blob || blob.statusCode !== 200 || !blob.stream) return null;
  return JSON.parse(await new Response(blob.stream).text());
}

async function listBlobs(prefix, limit = 1000) {
  if (!hasBlobToken()) return [];
  const { list } = require("@vercel/blob");
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

async function readRecords() {
  if (!hasBlobToken()) {
    return { storageReady: false, records: normalizeRecords(seedRecords) };
  }

  const latestSnapshot = (await listSnapshots())[0];
  const payload = latestSnapshot
    ? await readBlobPayload(latestSnapshot.pathname)
    : await readBlobPayload(LEGACY_BLOB_PATH);

  if (!payload) {
    return { storageReady: true, records: normalizeRecords(seedRecords) };
  }

  return {
    storageReady: true,
    records: normalizeRecords(payload.records)
  };
}

async function writeRecords(records) {
  if (!hasBlobToken()) {
    const error = new Error("Vercel Blob ещё не подключён");
    error.statusCode = 503;
    throw error;
  }

  const { put } = require("@vercel/blob");
  const normalized = normalizeRecords(records);
  const snapshotPath = `${SNAPSHOT_PREFIX}${blobSafeStamp()}-${randomUUID()}.json`;
  await put(snapshotPath, JSON.stringify(buildRecordsPayload(normalized), null, 2), {
    access: "public",
    cacheControlMaxAge: 60,
    contentType: "application/json"
  });
  await ensureDailyBackup(normalized);
  return normalized;
}

async function listRestorePoints() {
  const [backups, snapshots] = await Promise.all([listDailyBackups(), listSnapshots()]);
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
  if (existing.length) return null;
  return createDailyBackup(records, date);
}

async function createDailyBackup(records, date = new Date()) {
  if (!hasBlobToken()) {
    const error = new Error("Vercel Blob ещё не подключён");
    error.statusCode = 503;
    throw error;
  }

  const { put } = require("@vercel/blob");
  const normalized = normalizeRecords(records);
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
  return { pathname: backupPath, records: normalized };
}

async function readRecordsFromPath(pathname) {
  const payload = await readBlobPayload(pathname);
  if (!payload || !Array.isArray(payload.records)) {
    const error = new Error("Не удалось прочитать выбранную резервную копию");
    error.statusCode = 400;
    throw error;
  }
  return normalizeRecords(payload.records);
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
  return writeRecords(await readRecordsFromPath(pathname));
}

async function writeAuditEvent(event) {
  if (!hasBlobToken()) return null;
  const { put } = require("@vercel/blob");
  const timestamp = isoStamp();
  const auditPath = `${AUDIT_PREFIX}${blobSafeStamp(new Date(timestamp))}-${randomUUID()}.json`;
  await put(auditPath, JSON.stringify({ schemaVersion: 2, timestamp, ...event }, null, 2), {
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
  normalizeMeals,
  normalizeRecord,
  normalizeRecords,
  parseWeightKg,
  readRecords,
  restoreRecordsFromPath,
  writeAuditEvent,
  writeRecords
};

