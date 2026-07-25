import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("expense chart derives each point from its order date", async () => {
  const app = await readFile(new URL("assets/app.mjs", root), "utf8");

  assert.match(app, /orders\.forEach\(\(order\) => \{\s+const x = xFor\(Date\.parse\(`\$\{order\.date\}T00:00:00Z`\)\);/);
  assert.doesNotMatch(app, /xFor\(times\[index\]\)/);
});
