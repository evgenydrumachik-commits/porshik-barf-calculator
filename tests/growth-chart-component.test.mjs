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
    assert.match(page, /id="refreshButton"[\s\S]*id="languageButton"/);
  }
  assert.match(app, /import \{ mountGrowthChartPanel \} from "\.\/growth-chart-panel\.mjs"/);
  assert.match(app, /async function init\(\) \{\s+mountGrowthChartPanel\(\);/);
  assert.match(component, /export function mountGrowthChartPanel\(\)/);
  assert.match(component, /id="showGrowthWeight"/);
  assert.match(component, /data-chart-range="growth"/);
  assert.match(component, /id="growthQuickAddButton"/);
  assert.match(component, /id="growthQuickAddForm"/);
  assert.match(component, /id="growthQuickAddRow"/);
  assert.match(component, /class="history-table"/);
  assert.doesNotMatch(component, /data-open-record="weight"/);
  assert.doesNotMatch(component, /data-open-record="feeding"/);
  assert.match(app, /function renderGrowthQuickRow\(\)/);
  assert.match(app, /chartDateRange\("growth", availableStart, availableEnd, \{ ensureEndDate: latestActualDate \}\)/);
  assert.match(app, /const chartRangeEndResetPending = new Set\(\["growth", "norm", "expense"\]\)/);
  assert.match(app, /const shouldResetEnd = Boolean\(resetEndDate\) && chartRangeEndResetPending\.has\(key\)/);
  assert.match(app, /chartRangeEndResetPending\.delete\(key\)/);
  assert.match(app, /document\.getElementById\("refreshButton"\)\?\.addEventListener\("click"/);
  assert.match(app, /savePageScrollPosition\(\);\s+location\.reload\(\);/);
  assert.match(app, /async function loadExpenses\(retry = true\)/);
  assert.match(app, /return loadExpenses\(false\);/);
  assert.match(app, /const PAGE_SCROLL_STORAGE_KEY = `porschik_page_scroll:\$\{location\.pathname\}`/);
  assert.match(app, /addEventListener\("pagehide", savePageScrollPosition\)/);
  assert.match(app, /restorePageScrollPosition\(\);/);
});
