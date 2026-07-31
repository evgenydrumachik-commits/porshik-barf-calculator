import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadDevState, saveDevState } from "./dev-state.mjs";

test("local development state survives a server-style reload", async () => {
  const directory = await mkdtemp(join(tmpdir(), "porschik-dev-state-"));
  const filePath = join(directory, "dev-state.json");
  const fallback = {
    records: [{ id: "seed", date: "2026-05-01", meals: [] }],
    avatarUrl: "/assets/porschik.jpg",
    feedingSettings: { feedingNorms: [], mealCountChanges: [] },
    expenses: []
  };

  try {
    assert.deepEqual(await loadDevState(filePath, fallback), fallback);
    const changed = {
      ...fallback,
      records: [...fallback.records, { id: "local", date: "2026-07-23", meals: [{ slot: 1, grams: 150 }] }],
      expenses: [{ id: "order-1", date: "2026-07-23", type: "BARF", totalCost: 50 }]
    };
    await saveDevState(filePath, changed);
    assert.deepEqual(await loadDevState(filePath, fallback), changed);
    assert.equal(JSON.parse(await readFile(filePath, "utf8")).schemaVersion, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
