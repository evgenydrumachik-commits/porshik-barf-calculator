const LEGACY_BLOB_PATH = "porschik/weights.json";
const STATE_BLOB_PATH = "porschik/state.json";
const SNAPSHOT_PREFIX = "porschik/weights/";
const DAILY_BACKUP_PREFIX = "porschik/backups/daily/";
const { randomUUID } = require("crypto");

const seedRecords = [
  { id: "2026-05-01", date: "2026-05-01", weightKg: 2.5, meals: [], comment: "Первый замер" },
  { id: "2026-05-08", date: "2026-05-08", weightKg: 3.0, meals: [], comment: "" },
  { id: "2026-05-15", date: "2026-05-15", weightKg: 3.45, meals: [], comment: "" },
  { id: "2026-05-22", date: "2026-05-22", weightKg: 3.9, meals: [], comment: "" },
  { id: "2026-05-29", date: "2026-05-29", weightKg: 4.37, meals: [], comment: "" },
  { id: "2026-06-05", date: "2026-06-05", weightKg: 4.76, meals: [{ slot: 3, grams: 1, skipped: false }], comment: "" },
  { id: "2026-06-12", date: "2026-06-12", weightKg: 5.4, meals: [], comment: "" },
  { id: "2026-06-19", date: "2026-06-19", weightKg: 6.1, meals: [], comment: "" },
  { id: "2026-06-26", date: "2026-06-26", weightKg: 6.55, meals: [], comment: "" },
  { id: "2026-07-03", date: "2026-07-03", weightKg: 7.05, meals: [], comment: "Вечером перед ужином" },
  { id: "2026-07-10", date: "2026-07-10", weightKg: 7.25, meals: [], comment: "" },
  { id: "2026-07-12", date: "2026-07-12", weightKg: null, meals: [{ slot: 1, grams: 190, skipped: false }, { slot: 2, grams: 190, skipped: false }, { slot: 3, grams: 190, skipped: false }], comment: "" },
  { id: "2026-07-13", date: "2026-07-13", weightKg: null, meals: [{ slot: 1, grams: 190, skipped: false }, { slot: 2, grams: null, skipped: true }, { slot: 3, grams: null, skipped: true }], comment: "" },
  { id: "2026-07-14", date: "2026-07-14", weightKg: null, meals: [{ slot: 1, grams: 150, skipped: false }, { slot: 2, grams: 192, skipped: false }, { slot: 3, grams: 150, skipped: false }], comment: "" },
  { id: "2026-07-15", date: "2026-07-15", weightKg: null, meals: [{ slot: 1, grams: 150, skipped: false }, { slot: 2, grams: 173, skipped: false }, { slot: 3, grams: 178, skipped: false }], comment: "" },
  { id: "2026-07-16", date: "2026-07-16", weightKg: null, meals: [{ slot: 1, grams: 192, skipped: false }, { slot: 2, grams: null, skipped: true }, { slot: 3, grams: 148, skipped: false }], comment: "" },
  { id: "2026-07-17", date: "2026-07-17", weightKg: 7.95, meals: [{ slot: 1, grams: 190, skipped: false }, { slot: 2, grams: 190, skipped: false }, { slot: 3, grams: 190, skipped: false }], comment: "Вечер, до еды" },
  { id: "2026-07-18", date: "2026-07-18", weightKg: null, meals: [{ slot: 1, grams: 194, skipped: false }, { slot: 2, grams: 206, skipped: false }, { slot: 3, grams: 180, skipped: false }], comment: "" },
  { id: "2026-07-19", date: "2026-07-19", weightKg: null, meals: [{ slot: 1, grams: null, skipped: true }, { slot: 2, grams: 210, skipped: false }, { slot: 3, grams: 168, skipped: false }], comment: "" },
  { id: "2026-07-20", date: "2026-07-20", weightKg: null, meals: [{ slot: 1, grams: null, skipped: true }, { slot: 2, grams: 200, skipped: false }, { slot: 3, grams: 203, skipped: false }], comment: "" },
  { id: "2026-07-21", date: "2026-07-21", weightKg: null, meals: [{ slot: 2, grams: 213, skipped: false }, { slot: 3, grams: 100, skipped: false }], comment: "" },
  { id: "2026-07-22", date: "2026-07-22", weightKg: null, meals: [{ slot: 1, grams: 151, skipped: false }], comment: "" }
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

function restorePoint(entry, type) {
  const uploadedAt = entry?.uploadedAt instanceof Date
    ? entry.uploadedAt.toISOString()
    : new Date(entry?.uploadedAt || Date.now()).toISOString();
  return {
    pathname: String(entry?.pathname || ""),
    uploadedAt,
    type
  };
}

function normalizeRestorePoints(points) {
  const byPath = new Map();
  for (const point of Array.isArray(points) ? points : []) {
    const pathname = String(point?.pathname || "");
    const validSnapshot = pathname.startsWith(SNAPSHOT_PREFIX);
    const validBackup = pathname.startsWith(DAILY_BACKUP_PREFIX);
    if (!pathname || (!validSnapshot && !validBackup)) continue;
    const uploadedAt = new Date(point?.uploadedAt || 0);
    if (Number.isNaN(uploadedAt.getTime())) continue;
    byPath.set(pathname, {
      pathname,
      uploadedAt: uploadedAt.toISOString(),
      type: validBackup ? "backup" : "snapshot"
    });
  }
  return [...byPath.values()].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

function normalizeAuditEvents(events) {
  return (Array.isArray(events) ? events : [])
    .filter((event) => event && typeof event === "object")
    .map((event) => ({ ...event, timestamp: String(event.timestamp || isoStamp()) }));
}

function buildStorageState(records, { restorePoints = [], auditEvents = [] } = {}) {
  return {
    schemaVersion: 2,
    storageSchemaVersion: 1,
    updatedAt: isoStamp(),
    records: normalizeRecords(records),
    restorePoints: normalizeRestorePoints(restorePoints),
    auditEvents: normalizeAuditEvents(auditEvents)
  };
}

async function persistStorageState(state) {
  const { put } = require("@vercel/blob");
  const payload = buildStorageState(state.records, state);
  await put(STATE_BLOB_PATH, JSON.stringify(payload, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: "application/json"
  });
  return payload;
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

async function migrateLegacyState() {
  const [backups, snapshots] = await Promise.all([listDailyBackups(), listSnapshots()]);
  const latestSnapshot = snapshots[0];
  const payload = latestSnapshot
    ? await readBlobPayload(latestSnapshot.pathname)
    : await readBlobPayload(LEGACY_BLOB_PATH);
  const records = payload?.records || seedRecords;
  const restorePoints = [
    ...backups.map((entry) => restorePoint(entry, "backup")),
    ...snapshots.map((entry) => restorePoint(entry, "snapshot"))
  ];
  return persistStorageState(buildStorageState(records, { restorePoints }));
}

async function readStorageState() {
  if (!hasBlobToken()) {
    return buildStorageState(seedRecords);
  }
  const payload = await readBlobPayload(STATE_BLOB_PATH);
  if (payload && Array.isArray(payload.records)) {
    return buildStorageState(payload.records, {
      restorePoints: payload.restorePoints,
      auditEvents: payload.auditEvents
    });
  }
  return migrateLegacyState();
}

async function readRecords() {
  if (!hasBlobToken()) {
    return { storageReady: false, records: normalizeRecords(seedRecords) };
  }
  const state = await readStorageState();
  return {
    storageReady: true,
    records: state.records
  };
}

function appendAuditEvent(events, event) {
  if (!event) return normalizeAuditEvents(events);
  return normalizeAuditEvents([...events, { timestamp: isoStamp(), ...event }]);
}

function hasDailyBackup(restorePoints, day) {
  return restorePoints.some((point) => point.type === "backup" && point.uploadedAt.slice(0, 10) === day);
}

async function putSnapshot(records, date = new Date()) {
  const { put } = require("@vercel/blob");
  const snapshotPath = `${SNAPSHOT_PREFIX}${blobSafeStamp(date)}-${randomUUID()}.json`;
  await put(snapshotPath, JSON.stringify(buildRecordsPayload(records), null, 2), {
    access: "public",
    cacheControlMaxAge: 60,
    contentType: "application/json"
  });
  return restorePoint({ pathname: snapshotPath, uploadedAt: date }, "snapshot");
}

async function putDailyBackup(records, date = new Date()) {
  const { put } = require("@vercel/blob");
  const day = todayKey(date);
  const backupPath = `${DAILY_BACKUP_PREFIX}${day}/${blobSafeStamp(date)}-${randomUUID()}.json`;
  await put(backupPath, JSON.stringify(buildRecordsPayload(records, {
    backupType: "daily",
    backupDate: day
  }), null, 2), {
    access: "public",
    cacheControlMaxAge: 60,
    contentType: "application/json"
  });
  return restorePoint({ pathname: backupPath, uploadedAt: date }, "backup");
}

async function writeRecords(records, { auditEvent = null } = {}) {
  if (!hasBlobToken()) {
    const error = new Error("Vercel Blob ещё не подключён");
    error.statusCode = 503;
    throw error;
  }

  const normalized = normalizeRecords(records);
  const state = await readStorageState();
  const date = new Date();
  const snapshot = await putSnapshot(normalized, date);
  const restorePoints = [snapshot, ...state.restorePoints];
  const day = todayKey(date);
  if (!hasDailyBackup(restorePoints, day)) {
    restorePoints.unshift(await putDailyBackup(normalized, date));
  }
  await persistStorageState(buildStorageState(normalized, {
    restorePoints,
    auditEvents: appendAuditEvent(state.auditEvents, auditEvent)
  }));
  return normalized;
}

async function listRestorePoints() {
  if (!hasBlobToken()) return [];
  return (await readStorageState()).restorePoints;
}

async function ensureDailyBackup(records, date = new Date()) {
  const state = await readStorageState();
  const day = todayKey(date);
  if (hasDailyBackup(state.restorePoints, day)) return null;
  const point = await putDailyBackup(normalizeRecords(records), date);
  await persistStorageState(buildStorageState(records, {
    restorePoints: [point, ...state.restorePoints],
    auditEvents: state.auditEvents
  }));
  return { pathname: point.pathname, records: normalizeRecords(records) };
}

async function createDailyBackup(records, date = new Date(), { auditEvent = null } = {}) {
  if (!hasBlobToken()) {
    const error = new Error("Vercel Blob ещё не подключён");
    error.statusCode = 503;
    throw error;
  }

  const normalized = normalizeRecords(records);
  const state = await readStorageState();
  const point = await putDailyBackup(normalized, date);
  await persistStorageState(buildStorageState(normalized, {
    restorePoints: [point, ...state.restorePoints],
    auditEvents: appendAuditEvent(state.auditEvents, auditEvent
      ? { ...auditEvent, backupPath: point.pathname }
      : null)
  }));
  return { pathname: point.pathname, records: normalized };
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

async function restoreRecordsFromPath(pathname, options = {}) {
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
  return writeRecords(records, {
    ...options,
    auditEvent: options.auditEvent
      ? { ...options.auditEvent, afterCount: records.length }
      : null
  });
}

async function writeAuditEvent(event) {
  if (!hasBlobToken()) return null;
  const state = await readStorageState();
  await persistStorageState(buildStorageState(state.records, {
    restorePoints: state.restorePoints,
    auditEvents: appendAuditEvent(state.auditEvents, event)
  }));
  return STATE_BLOB_PATH;
}

module.exports = {
  buildRecordsPayload,
  buildStorageState,
  createDailyBackup,
  listDailyBackups,
  listRestorePoints,
  listSnapshots,
  normalizeMeals,
  normalizeRecord,
  normalizeRecords,
  normalizeRestorePoints,
  parseWeightKg,
  readRecords,
  restoreRecordsFromPath,
  writeAuditEvent,
  writeRecords
};
