const { randomUUID } = require("crypto");

const PROFILE_PATH = "porschik/profile.json";
const AVATAR_PREFIX = "porschik/avatar/";
const DEFAULT_AVATAR_URL = "/assets/porschik.jpg";
const MAX_AVATAR_BYTES = 1_500_000;
const RECOMMENDED_FEEDING_SETTINGS = Object.freeze({
  puppyRatio: 0.08,
  adultRatio: 0.03,
  transitionDays: 28,
  targetAdultWeightKg: 12
});

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
  const settings = {
    puppyRatio: Number(value.puppyRatio ?? RECOMMENDED_FEEDING_SETTINGS.puppyRatio),
    adultRatio: Number(value.adultRatio ?? RECOMMENDED_FEEDING_SETTINGS.adultRatio),
    transitionDays: Math.round(Number(value.transitionDays ?? RECOMMENDED_FEEDING_SETTINGS.transitionDays)),
    targetAdultWeightKg: Number(value.targetAdultWeightKg ?? RECOMMENDED_FEEDING_SETTINGS.targetAdultWeightKg)
  };
  if (!Number.isFinite(settings.puppyRatio) || settings.puppyRatio < 0.03 || settings.puppyRatio > 0.12) {
    const error = new Error("Щенячья норма должна быть от 3% до 12%");
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isFinite(settings.adultRatio) || settings.adultRatio < 0.01 || settings.adultRatio > 0.06) {
    const error = new Error("Взрослая норма должна быть от 1% до 6%");
    error.statusCode = 400;
    throw error;
  }
  if (settings.puppyRatio <= settings.adultRatio) {
    const error = new Error("Щенячья норма должна быть выше взрослой");
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isInteger(settings.transitionDays) || settings.transitionDays < 7 || settings.transitionDays > 56) {
    const error = new Error("Переход должен занимать от 1 до 8 недель");
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isFinite(settings.targetAdultWeightKg) || settings.targetAdultWeightKg < 8 || settings.targetAdultWeightKg > 18) {
    const error = new Error("Целевой вес должен быть от 8 до 18 кг");
    error.statusCode = 400;
    throw error;
  }
  return settings;
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
  DEFAULT_AVATAR_URL,
  MAX_AVATAR_BYTES,
  RECOMMENDED_FEEDING_SETTINGS,
  decodeAvatarDataUrl,
  normalizeFeedingSettings,
  readProfile,
  writeFeedingSettings,
  writeProfile
};
