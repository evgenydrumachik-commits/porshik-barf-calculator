import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";

const require = createRequire(import.meta.url);
const { buildFullBackupPayload } = require("../api/_backup.js");

test("full backup contains every portable application data category", () => {
  const payload = buildFullBackupPayload({
    records: [{ date: "2026-07-26", meals: [{ slot: 1, grams: 165 }] }],
    profile: {
      avatarUrl: "data:image/png;base64,aGVsbG8=",
      feedingSettings: {
        feedingNorms: [
          { date: "2026-05-01", ratio: 0.08 },
          { date: "2026-07-22", ratio: 0.06 }
        ],
        mealCountChanges: [
          { date: "2026-07-28", mealsPerDay: 2 },
          { date: "2026-08-12", mealsPerDay: 3 }
        ]
      },
      updatedAt: "2026-07-26T10:00:00.000Z",
      storageReady: true
    },
    expenses: [{
      id: "order-1",
      date: "2026-07-14",
      type: "BARF",
      description: "Barfexpress",
      kilograms: 12,
      pricePerKg: 4.39,
      deliveryCost: 14
    }]
  }, { exportType: "manual", storageReady: true });

  assert.equal(payload.schemaVersion, 4);
  assert.equal(payload.backupType, "full");
  assert.equal(payload.exportType, "manual");
  assert.equal(payload.storageReady, true);
  assert.equal(payload.records.length, 1);
  assert.equal(payload.profile.feedingSettings.feedingNorms.length, 2);
  assert.deepEqual(payload.profile.feedingSettings.mealCountChanges, [
    { date: "2026-07-28", mealsPerDay: 2 },
    { date: "2026-08-12", mealsPerDay: 3 }
  ]);
  assert.equal(payload.profile.avatarUrl, "data:image/png;base64,aGVsbG8=");
  assert.equal(payload.profile.updatedAt, "2026-07-26T10:00:00.000Z");
  assert.equal(payload.expenses.length, 1);
  assert.equal(payload.expenses[0].totalCost, 66.68);
  assert.equal(Object.hasOwn(payload, "users"), false);
  assert.equal(Object.hasOwn(payload, "sessions"), false);
  assert.equal(Object.hasOwn(payload, "audit"), false);
  assert.equal(Object.hasOwn(payload, "restorePoints"), false);
});

test("production and local export paths both use the full backup builder", async () => {
  const [production, local] = await Promise.all([
    readFile(new URL("../api/weights.js", import.meta.url), "utf8"),
    readFile(new URL("./dev-server.mjs", import.meta.url), "utf8")
  ]);

  for (const source of [production, local]) {
    assert.match(source, /buildFullBackupPayload/);
    assert.match(source, /porschik-full-backup/);
  }
  assert.match(production, /readProfile/);
  assert.match(production, /readExpenseOrders/);
});
