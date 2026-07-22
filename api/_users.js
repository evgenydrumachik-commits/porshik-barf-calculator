const { hasDatabase, query, storageUnavailableError } = require("./_db");

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
  if (!hasDatabase()) return [];
  const rows = await query("SELECT email FROM porschik_users ORDER BY email");
  return rows.map((row) => String(row.email));
}

async function writeAllowedEmails(emails) {
  if (!hasDatabase()) throw storageUnavailableError();
  const normalized = [...new Set(emails.map(String))].filter(Boolean);
  await query("DELETE FROM porschik_users");
  for (const email of normalized) {
    await query("INSERT INTO porschik_users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING", [email]);
  }
  return normalized;
}

module.exports = {
  normalizeEmail,
  readAllowedEmails,
  writeAllowedEmails
};
