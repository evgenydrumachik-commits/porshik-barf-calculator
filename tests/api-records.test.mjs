import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildRecordsPayload, normalizeRecord, normalizeRecords } = require("../api/_weights.js");

test("legacy weight records migrate to schema version 2", () => {
  const records = normalizeRecords([
    { id: "2026-05-01", date: "2026-05-01", weightKg: 2.5, note: "Первый замер" }
  ]);
  assert.deepEqual(records, [{
    id: "2026-05-01",
    date: "2026-05-01",
    weightKg: 2.5,
    meals: [],
    comment: "Первый замер"
  }]);
  assert.equal(buildRecordsPayload(records).schemaVersion, 2);
});

test("daily record may contain feeding without weight", () => {
  const record = normalizeRecord({
    date: "2026-07-18",
    meals: [
      { slot: 1, grams: 210 },
      { slot: 2, grams: 205 },
      { slot: 3, skipped: true }
    ],
    comment: "Третий приём пропущен"
  });
  assert.equal(record.weightKg, null);
  assert.equal(record.meals.length, 3);
  assert.equal(record.meals[2].grams, null);
});

test("duplicate dates merge weight and meals without losing the note", () => {
  const records = normalizeRecords([
    { date: "2026-07-18", weightKg: 7.95, note: "До еды" },
    { date: "2026-07-18", meals: [{ slot: 1, grams: 210 }], comment: "" }
  ]);
  assert.equal(records.length, 1);
  assert.equal(records[0].weightKg, 7.95);
  assert.equal(records[0].meals[0].grams, 210);
  assert.equal(records[0].comment, "До еды");
});

