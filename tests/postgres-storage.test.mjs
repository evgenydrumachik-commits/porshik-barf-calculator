import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const require = createRequire(import.meta.url);
const db = require("../api/_db.js");
const weights = require("../api/_weights.js");
const profile = require("../api/_profile.js");
const expenses = require("../api/_expenses.js");
const auth = require("../api/_auth.js");

test("production API contains no Vercel Blob runtime dependency", async () => {
  const apiFiles = (await readdir(new URL("../api/", import.meta.url))).filter((name) => name.endsWith(".js"));
  const sources = await Promise.all(apiFiles.map((name) => readFile(new URL(`../api/${name}`, import.meta.url), "utf8")));
  const packageJson = await readFile(new URL("../package.json", import.meta.url), "utf8");
  assert.equal(sources.some((source) => source.includes("@vercel/blob")), false);
  assert.equal(packageJson.includes("@vercel/blob"), false);
  assert.match(packageJson, /@neondatabase\/serverless/);
});

test("diary writes keep snapshots, daily backup, current state and audit in Postgres", async () => {
  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://test.invalid/database";
  const calls = [];
  db.setQueryImplementationForTests(async (text, params) => {
    calls.push({ text, params });
    if (text.startsWith("SELECT id FROM porschik_backups")) return [];
    return [];
  });

  try {
    const records = [{ date: "2026-07-22", weightKg: 8.1, meals: [], comment: "test" }];
    const saved = await weights.writeRecords(records, { auditEvent: { action: "update" } });
    assert.equal(saved.length, 1);
    assert.equal(calls.filter((call) => call.text.includes("INSERT INTO porschik_backups")).length, 2);
    assert.equal(calls.filter((call) => call.text.includes("INSERT INTO porschik_state")).length, 1);
    assert.equal(calls.filter((call) => call.text.includes("INSERT INTO porschik_audit")).length, 1);
  } finally {
    db.resetDatabaseForTests();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  }
});

test("profile, expenses and remembered sessions use Postgres", async () => {
  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://test.invalid/database";
  const calls = [];
  db.setQueryImplementationForTests(async (text, params) => {
    calls.push({ text, params });
    if (text.startsWith("SELECT profile")) return [{ profile: {} }];
    if (text.startsWith("SELECT email, created_at")) {
      return [{ email: "user@example.com", created_at: "2026-07-22T10:00:00Z", expires_at: "2046-07-17T10:00:00Z" }];
    }
    return [];
  });

  try {
    const avatar = "data:image/png;base64,aGVsbG8=";
    const savedProfile = await profile.writeProfile(avatar);
    assert.equal(savedProfile.avatarUrl, avatar);
    await expenses.writeExpenseOrders([{
      date: "2026-07-22",
      type: "BARF",
      kilograms: 3,
      pricePerKg: 5,
      deliveryCost: 2,
      description: "test"
    }]);
    const token = await auth.createRememberedSession("user@example.com");
    const session = await auth.readRememberedSession(token);
    await auth.revokeRememberedSession(token);

    assert.equal(session.email, "user@example.com");
    assert.ok(calls.some((call) => call.text.includes("porschik_expense_snapshots")));
    assert.ok(calls.some((call) => call.text.includes("porschik_sessions")));
    assert.equal(calls.some((call) => call.params?.includes(token)), false, "raw session token must never be stored");
  } finally {
    db.resetDatabaseForTests();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  }
});
