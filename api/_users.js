const USERS_BLOB_PATH = "porschik/users.json";

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function normalizeEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    const error = new Error("Некорректный email-адрес");
    error.statusCode = 400;
    throw error;
  }
  return e;
}

async function readAllowedEmails() {
  if (!hasBlobToken()) {
    return [];
  }

  const { list } = require("@vercel/blob");
  const result = await list({ prefix: USERS_BLOB_PATH, limit: 1 });
  const blob = result.blobs.find((entry) => entry.pathname === USERS_BLOB_PATH);

  if (!blob) {
    return [];
  }

  const response = await fetch(blob.url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Не удалось прочитать список пользователей");
  }

  const payload = await response.json();
  return Array.isArray(payload.emails) ? payload.emails.map(String) : [];
}

async function writeAllowedEmails(emails) {
  if (!hasBlobToken()) {
    const error = new Error("Vercel Blob ещё не подключён");
    error.statusCode = 503;
    throw error;
  }

  const { put } = require("@vercel/blob");
  const normalized = [...new Set(emails.map(String))].filter(Boolean);
  await put(USERS_BLOB_PATH, JSON.stringify({ emails: normalized }, null, 2), {
    access: "public",
    allowOverwrite: true,
    contentType: "application/json"
  });
  return normalized;
}

module.exports = {
  normalizeEmail,
  readAllowedEmails,
  writeAllowedEmails
};
