const { hasDatabase, query, storageUnavailableError } = require("./_db");

const DEFAULT_AVATAR_URL = "/assets/porschik.jpg";
const MAX_AVATAR_BYTES = 1_500_000;
const DEFAULT_FEEDING_NORMS = Object.freeze([
  Object.freeze({ date: "2026-05-01", ratio: 0.08 }),
  Object.freeze({ date: "2026-07-01", ratio: 0.06, interpolation: "step" }),
  Object.freeze({ date: "2026-07-22", ratio: 0.054 }),
  Object.freeze({ date: "2026-10-28", ratio: 0.03 })
]);
const DEFAULT_MEAL_COUNT_CHANGES = Object.freeze([]);
const RECOMMENDED_FEEDING_SETTINGS = Object.freeze({
  feedingNorms: DEFAULT_FEEDING_NORMS,
  mealCountChanges: DEFAULT_MEAL_COUNT_CHANGES
});

function decodeAvatarDataUrl(value) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(value || ""));
  if (!match) {
    const error = new Error("Поддерживаются фотографии JPEG, PNG и WebP");
    error.statusCode = 400;
    throw error;
  }
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > MAX_AVATAR_BYTES) {
    const error = new Error("Фотография после обработки должна быть не больше 1,5 МБ");
    error.statusCode = 400;
    throw error;
  }
  return { contentType: match[1], buffer };
}

function normalizeFeedingSettings(value = {}) {
  const normSource = Array.isArray(value.feedingNorms) && value.feedingNorms.length
    ? value.feedingNorms
    : DEFAULT_FEEDING_NORMS;
  if (normSource.length > 24) {
    const error = new Error("Можно сохранить не более 24 контрольных точек нормы");
    error.statusCode = 400;
    throw error;
  }
  const seenDates = new Set();
  const feedingNorms = normSource.map((item) => {
    const date = String(item?.date || "").slice(0, 10);
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : null;
    if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
      const error = new Error("Для каждой нормы нужна корректная дата");
      error.statusCode = 400;
      throw error;
    }
    if (seenDates.has(date)) {
      const error = new Error("На одну дату можно задать только одну норму");
      error.statusCode = 400;
      throw error;
    }
    seenDates.add(date);
    const ratio = Number(item?.ratio);
    if (!Number.isFinite(ratio) || ratio < 0.01 || ratio > 0.12) {
      const error = new Error("Норма должна быть от 1% до 12%");
      error.statusCode = 400;
      throw error;
    }
    const normalized = { date, ratio: Math.round(ratio * 10000) / 10000 };
    if (item?.interpolation === "step") normalized.interpolation = "step";
    return normalized;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const mealCountSource = Array.isArray(value.mealCountChanges)
    ? value.mealCountChanges
    : DEFAULT_MEAL_COUNT_CHANGES;
  if (mealCountSource.length > 64) {
    const error = new Error("Можно сохранить не более 64 изменений режима кормления");
    error.statusCode = 400;
    throw error;
  }
  const seenMealCountDates = new Set();
  const mealCountChanges = mealCountSource.map((item) => {
    const date = String(item?.date || "").slice(0, 10);
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : null;
    if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
      const error = new Error("Для каждого режима кормления нужна корректная дата");
      error.statusCode = 400;
      throw error;
    }
    if (seenMealCountDates.has(date)) {
      const error = new Error("На одну дату можно задать только один режим кормления");
      error.statusCode = 400;
      throw error;
    }
    seenMealCountDates.add(date);
    if (item?.mode === "automatic") return { date, mode: "automatic" };
    const mealsPerDay = Number(item?.mealsPerDay);
    if (!Number.isInteger(mealsPerDay) || ![2, 3].includes(mealsPerDay)) {
      const error = new Error("Количество приёмов в день должно быть 2 или 3");
      error.statusCode = 400;
      throw error;
    }
    return { date, mealsPerDay };
  }).sort((a, b) => a.date.localeCompare(b.date));

  return { feedingNorms, mealCountChanges };
}

function defaultProfile(storageReady = false) {
  return {
    avatarUrl: DEFAULT_AVATAR_URL,
    feedingSettings: { ...RECOMMENDED_FEEDING_SETTINGS },
    updatedAt: null,
    storageReady
  };
}

async function readProfile() {
  if (!hasDatabase()) return defaultProfile(false);
  try {
    const rows = await query("SELECT profile FROM porschik_state WHERE id = 1");
    const payload = rows[0]?.profile;
    if (!payload || typeof payload !== "object") return defaultProfile(true);
    let feedingSettings;
    try {
      feedingSettings = normalizeFeedingSettings(payload.feedingSettings);
    } catch {
      feedingSettings = { ...RECOMMENDED_FEEDING_SETTINGS };
    }
    return {
      avatarUrl: typeof payload.avatarUrl === "string" ? payload.avatarUrl : DEFAULT_AVATAR_URL,
      feedingSettings,
      updatedAt: payload.updatedAt || null,
      storageReady: true
    };
  } catch {
    return defaultProfile(true);
  }
}

async function persistProfile(profile) {
  const normalized = {
    avatarUrl: typeof profile.avatarUrl === "string" ? profile.avatarUrl : DEFAULT_AVATAR_URL,
    feedingSettings: normalizeFeedingSettings(profile.feedingSettings),
    updatedAt: new Date().toISOString()
  };
  await query(
    `INSERT INTO porschik_state (id, profile, updated_at)
     VALUES (1, $1::jsonb, $2)
     ON CONFLICT (id) DO UPDATE SET profile = EXCLUDED.profile, updated_at = EXCLUDED.updated_at`,
    [JSON.stringify(normalized), normalized.updatedAt]
  );
  return { ...normalized, storageReady: true };
}

async function writeProfile(avatarDataUrl) {
  if (!hasDatabase()) throw storageUnavailableError();
  decodeAvatarDataUrl(avatarDataUrl);
  const current = await readProfile();
  return persistProfile({ ...current, avatarUrl: String(avatarDataUrl) });
}

async function writeFeedingSettings(feedingSettings) {
  if (!hasDatabase()) throw storageUnavailableError();
  const current = await readProfile();
  return persistProfile({
    ...current,
    feedingSettings: normalizeFeedingSettings({
      ...current.feedingSettings,
      ...(feedingSettings || {})
    })
  });
}

module.exports = {
  DEFAULT_FEEDING_NORMS,
  DEFAULT_MEAL_COUNT_CHANGES,
  DEFAULT_AVATAR_URL,
  MAX_AVATAR_BYTES,
  RECOMMENDED_FEEDING_SETTINGS,
  decodeAvatarDataUrl,
  normalizeFeedingSettings,
  readProfile,
  writeFeedingSettings,
  writeProfile
};
