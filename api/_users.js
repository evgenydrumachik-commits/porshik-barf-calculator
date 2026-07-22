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

  const { get } = require("@vercel/blob");
  const blob = await get(USERS_BLOB_PATH, {
    access: "public",
    headers: { "Cache-Control": "no-store" }
  });
  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    return [];
  }
  const payload = JSON.parse(await new Response(blob.stream).text());
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
