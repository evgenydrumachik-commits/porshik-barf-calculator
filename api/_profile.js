const { randomUUID } = require("crypto");

const PROFILE_PATH = "porschik/profile.json";
const AVATAR_PREFIX = "porschik/avatar/";
const DEFAULT_AVATAR_URL = "/assets/porschik.jpg";
const MAX_AVATAR_BYTES = 1_500_000;
const DEFAULT_FEEDING_NORMS = Object.freeze([
  Object.freeze({ date: "2026-05-01", ratio: 0.08 }),
  Object.freeze({ date: "2026-07-01", ratio: 0.06, interpolation: "step" }),
  Object.freeze({ date: "2026-07-22", ratio: 0.054 }),
  Object.freeze({ date: "2026-10-28", ratio: 0.03 })
]);
const RECOMMENDED_FEEDING_SETTINGS = Object.freeze({ feedingNorms: DEFAULT_FEEDING_NORMS });

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

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
  const source = Array.isArray(value.feedingNorms) && value.feedingNorms.length
    ? value.feedingNorms
    : DEFAULT_FEEDING_NORMS;
  if (source.length > 24) {
    const error = new Error("Можно сохранить не более 24 контрольных точек нормы");
    error.statusCode = 400;
    throw error;
  }
  const seenDates = new Set();
  const feedingNorms = source.map((item) => {
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
  return { feedingNorms };
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
  if (!hasBlobToken()) return defaultProfile(false);
  try {
    const { get } = require("@vercel/blob");
    const blob = await get(PROFILE_PATH, { access: "public", headers: { "Cache-Control": "no-store" } });
    if (!blob || blob.statusCode !== 200 || !blob.stream) throw new Error("profile not found");
    const payload = JSON.parse(await new Response(blob.stream).text());
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
  const { put } = require("@vercel/blob");
  const normalized = {
    avatarUrl: typeof profile.avatarUrl === "string" ? profile.avatarUrl : DEFAULT_AVATAR_URL,
    feedingSettings: normalizeFeedingSettings(profile.feedingSettings),
    updatedAt: new Date().toISOString()
  };
  await put(PROFILE_PATH, JSON.stringify(normalized, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: "application/json"
  });
  return { ...normalized, storageReady: true };
}

async function writeProfile(avatarDataUrl) {
  if (!hasBlobToken()) {
    const error = new Error("Vercel Blob ещё не подключён");
    error.statusCode = 503;
    throw error;
  }
  const { contentType, buffer } = decodeAvatarDataUrl(avatarDataUrl);
  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const current = await readProfile();
  const { put } = require("@vercel/blob");
  const avatar = await put(`${AVATAR_PREFIX}${Date.now()}-${randomUUID()}.${extension}`, buffer, {
    access: "public",
    addRandomSuffix: false,
    cacheControlMaxAge: 31_536_000,
    contentType
  });
  return persistProfile({ ...current, avatarUrl: avatar.url });
}

async function writeFeedingSettings(feedingSettings) {
  if (!hasBlobToken()) {
    const error = new Error("Vercel Blob ещё не подключён");
    error.statusCode = 503;
    throw error;
  }
  const current = await readProfile();
  return persistProfile({ ...current, feedingSettings: normalizeFeedingSettings(feedingSettings) });
}

module.exports = {
  DEFAULT_FEEDING_NORMS,
  DEFAULT_AVATAR_URL,
  MAX_AVATAR_BYTES,
  RECOMMENDED_FEEDING_SETTINGS,
  decodeAvatarDataUrl,
  normalizeFeedingSettings,
  readProfile,
  writeFeedingSettings,
  writeProfile
};
