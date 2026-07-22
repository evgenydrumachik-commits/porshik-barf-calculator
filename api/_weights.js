const { randomUUID } = require("crypto");
const { hasDatabase, query, storageUnavailableError } = require("./_db");

const RESTORE_PATH_PREFIX = "db:backup:";

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

function restorePoint(row) {
  return {
    pathname: `${RESTORE_PATH_PREFIX}${row.id}`,
    uploadedAt: new Date(row.created_at).toISOString(),
    type: row.type
  };
}

async function listSnapshots() {
  return listRestorePoints("snapshot");
}

async function listDailyBackups() {
  return listRestorePoints("backup");
}

async function readRecords() {
  if (!hasDatabase()) {
    return { storageReady: false, records: normalizeRecords(seedRecords) };
  }
  const rows = await query("SELECT records FROM porschik_state WHERE id = 1");
  return {
    storageReady: true,
    records: normalizeRecords(rows[0]?.records || seedRecords)
  };
}

async function putRestorePoint(records, type, date = new Date(), id = randomUUID()) {
  const normalized = normalizeRecords(records);
  await query(
    "INSERT INTO porschik_backups (id, created_at, type, records) VALUES ($1, $2, $3, $4::jsonb)",
    [id, date.toISOString(), type, JSON.stringify(normalized)]
  );
  return restorePoint({ id, created_at: date.toISOString(), type });
}

async function persistRecords(records, date = new Date()) {
  await query(
    `INSERT INTO porschik_state (id, records, updated_at)
     VALUES (1, $1::jsonb, $2)
     ON CONFLICT (id) DO UPDATE SET records = EXCLUDED.records, updated_at = EXCLUDED.updated_at`,
    [JSON.stringify(normalizeRecords(records)), date.toISOString()]
  );
}

async function writeRecords(records, { auditEvent = null } = {}) {
  if (!hasDatabase()) throw storageUnavailableError();

  const normalized = normalizeRecords(records);
  const date = new Date();
  await putRestorePoint(normalized, "snapshot", date);
  const daily = await query(
    "SELECT id FROM porschik_backups WHERE type = 'backup' AND created_at >= $1 AND created_at < $2 LIMIT 1",
    [`${todayKey(date)}T00:00:00.000Z`, `${todayKey(new Date(date.getTime() + 86_400_000))}T00:00:00.000Z`]
  );
  if (!daily.length) {
    await putRestorePoint(normalized, "backup", date);
  }
  await persistRecords(normalized, date);
  if (auditEvent) await writeAuditEvent(auditEvent);
  return normalized;
}

async function listRestorePoints(type = null) {
  if (!hasDatabase()) return [];
  const rows = type
    ? await query("SELECT id, created_at, type FROM porschik_backups WHERE type = $1 ORDER BY created_at DESC LIMIT 1000", [type])
    : await query("SELECT id, created_at, type FROM porschik_backups ORDER BY created_at DESC LIMIT 1000");
  return rows.map(restorePoint);
}

async function ensureDailyBackup(records, date = new Date()) {
  const start = `${todayKey(date)}T00:00:00.000Z`;
  const end = `${todayKey(new Date(date.getTime() + 86_400_000))}T00:00:00.000Z`;
  const existing = await query(
    "SELECT id FROM porschik_backups WHERE type = 'backup' AND created_at >= $1 AND created_at < $2 LIMIT 1",
    [start, end]
  );
  if (existing.length) return null;
  const point = await putRestorePoint(records, "backup", date);
  return { pathname: point.pathname, records: normalizeRecords(records) };
}

async function createDailyBackup(records, date = new Date(), { auditEvent = null } = {}) {
  if (!hasDatabase()) throw storageUnavailableError();

  const normalized = normalizeRecords(records);
  const point = await putRestorePoint(normalized, "backup", date);
  await persistRecords(normalized, date);
  if (auditEvent) await writeAuditEvent({ ...auditEvent, backupPath: point.pathname });
  return { pathname: point.pathname, records: normalized };
}

function restoreId(pathname) {
  const value = String(pathname || "");
  if (!value.startsWith(RESTORE_PATH_PREFIX)) return "";
  return value.slice(RESTORE_PATH_PREFIX.length);
}

async function readRecordsFromPath(pathname) {
  const id = restoreId(pathname);
  if (!id) {
    const error = new Error("Недопустимый путь резервной копии");
    error.statusCode = 400;
    throw error;
  }
  const rows = await query("SELECT records FROM porschik_backups WHERE id = $1", [id]);
  if (!Array.isArray(rows[0]?.records)) {
    const error = new Error("Не удалось прочитать выбранную резервную копию");
    error.statusCode = 400;
    throw error;
  }
  return normalizeRecords(rows[0].records);
}

async function restoreRecordsFromPath(pathname, options = {}) {
  const records = await readRecordsFromPath(pathname);
  return writeRecords(records, {
    ...options,
    auditEvent: options.auditEvent
      ? { ...options.auditEvent, afterCount: records.length }
      : null
  });
}

async function writeAuditEvent(event) {
  if (!hasDatabase()) return null;
  const payload = { timestamp: isoStamp(), ...(event || {}) };
  await query("INSERT INTO porschik_audit (event) VALUES ($1::jsonb)", [JSON.stringify(payload)]);
  return "porschik_audit";
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
