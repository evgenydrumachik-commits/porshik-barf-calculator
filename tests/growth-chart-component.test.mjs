import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("dashboard and history mount the same growth-chart component", async () => {
  const [dashboard, history, app, component] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("history.html", root), "utf8"),
    readFile(new URL("assets/app.mjs", root), "utf8"),
    readFile(new URL("assets/growth-chart-panel.mjs", root), "utf8")
  ]);

  for (const page of [dashboard, history]) {
    assert.match(page, /<div id="growthChartPanelMount"><\/div>/);
    assert.doesNotMatch(page, /<section class="panel chart-panel"/);
  }
  assert.match(app, /import \{ mountGrowthChartPanel \} from "\.\/growth-chart-panel\.mjs"/);
  assert.match(app, /async function init\(\) \{\s+mountGrowthChartPanel\(\);/);
  assert.match(component, /export function mountGrowthChartPanel\(\)/);
  assert.match(component, /id="showGrowthWeight"/);
  assert.match(component, /data-chart-range="growth"/);
});
