import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { neon } from "@neondatabase/serverless";

const require = createRequire(import.meta.url);
const { normalizeRecords } = require("../api/_weights.js");
const { normalizeExpenseOrders } = require("../api/_expenses.js");
const { DEFAULT_AVATAR_URL, normalizeFeedingSettings } = require("../api/_profile.js");

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
  throw new Error("Set DATABASE_URL or POSTGRES_URL before running the migration");
}

const sourcePath = resolve(process.argv[2] || ".local-data/dev-state.json");
const schemaPath = resolve("db/schema.sql");
const [rawState, schema] = await Promise.all([
  readFile(sourcePath, "utf8").then(JSON.parse),
  readFile(schemaPath, "utf8")
]);

const records = normalizeRecords(rawState.records);
const expenses = normalizeExpenseOrders(rawState.expenses);
const profile = {
  avatarUrl: typeof rawState.avatarUrl === "string" ? rawState.avatarUrl : DEFAULT_AVATAR_URL,
  feedingSettings: normalizeFeedingSettings(rawState.feedingSettings),
  updatedAt: new Date().toISOString()
};

const sql = neon(databaseUrl);
for (const statement of schema.split(";").map((part) => part.trim()).filter(Boolean)) {
  await sql.query(statement);
}

const migratedAt = new Date().toISOString();
await sql.query(
  `INSERT INTO porschik_state (id, records, profile, expenses, updated_at)
   VALUES (1, $1::jsonb, $2::jsonb, $3::jsonb, $4)
   ON CONFLICT (id) DO UPDATE SET
     records = EXCLUDED.records,
     profile = EXCLUDED.profile,
     expenses = EXCLUDED.expenses,
     updated_at = EXCLUDED.updated_at`,
  [JSON.stringify(records), JSON.stringify(profile), JSON.stringify(expenses), migratedAt]
);

await sql.query(
  `INSERT INTO porschik_backups (id, created_at, type, records)
   VALUES ($1, $2, 'snapshot', $3::jsonb)
   ON CONFLICT (id) DO UPDATE SET records = EXCLUDED.records, created_at = EXCLUDED.created_at`,
  ["local-migration-initial", migratedAt, JSON.stringify(records)]
);
await sql.query(
  `INSERT INTO porschik_backups (id, created_at, type, records)
   VALUES ($1, $2, 'backup', $3::jsonb)
   ON CONFLICT (id) DO UPDATE SET records = EXCLUDED.records, created_at = EXCLUDED.created_at`,
  ["local-migration-daily", migratedAt, JSON.stringify(records)]
);
await sql.query(
  "INSERT INTO porschik_expense_snapshots (id, created_at, orders) VALUES ($1, $2, $3::jsonb) ON CONFLICT (id) DO UPDATE SET orders = EXCLUDED.orders, created_at = EXCLUDED.created_at",
  ["local-migration-initial", migratedAt, JSON.stringify(expenses)]
);
await sql.query(
  "INSERT INTO porschik_audit (event) VALUES ($1::jsonb)",
  [JSON.stringify({
    timestamp: migratedAt,
    action: "migrate_local_state_to_neon",
    source: sourcePath,
    recordCount: records.length,
    expenseCount: expenses.length
  })]
);

const verification = await sql.query(
  `SELECT
     jsonb_array_length(records) AS record_count,
     jsonb_array_length(expenses) AS expense_count,
     profile->>'avatarUrl' AS avatar_url,
     jsonb_array_length(profile->'feedingSettings'->'feedingNorms') AS feeding_norm_count
   FROM porschik_state WHERE id = 1`
);

console.log(JSON.stringify({
  sourcePath,
  records: Number(verification[0].record_count),
  expenses: Number(verification[0].expense_count),
  avatarUrl: verification[0].avatar_url,
  feedingNorms: Number(verification[0].feeding_norm_count)
}, null, 2));
