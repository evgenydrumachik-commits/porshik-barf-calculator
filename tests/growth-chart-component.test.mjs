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
  assert.ok(
    dashboard.indexOf('id="feedingTodayTitle"') < dashboard.indexOf('id="growthChartPanelMount"'),
    "the current feeding summary must appear before the growth chart on the dashboard"
  );
  assert.match(app, /import \{ mountGrowthChartPanel \} from "\.\/growth-chart-panel\.mjs"/);
  assert.match(app, /async function init\(\) \{\s+mountGrowthChartPanel\(\);/);
  assert.match(component, /export function mountGrowthChartPanel\(\)/);
  assert.match(component, /id="showGrowthWeight"/);
  assert.match(component, /data-chart-range="growth"/);
  assert.match(component, /class="add-icon-button growth-quick-add-trigger" id="growthQuickAddButton"/);
  assert.equal((dashboard.match(/class="add-icon-button /g) || []).length, 2);
  assert.match(component, /id="growthQuickAddForm"/);
  assert.match(component, /id="growthQuickAddRow"/);
  assert.match(component, /class="history-table"/);
  assert.doesNotMatch(component, /data-open-record="weight"/);
  assert.doesNotMatch(component, /data-open-record="feeding"/);
  assert.match(app, /function renderGrowthQuickRow\(\)/);
  assert.match(app, /chartDateRange\("growth", availableStart, availableEnd, \{ ensureEndDate: latestActualDate \}\)/);
  assert.match(app, /const defaultEndDate = addDays\(today, 3\)/);
  assert.match(app, /const endDate = \[adultDate, defaultEndDate, latestRecordDate\]\.sort\(\)\.at\(-1\)/);
  assert.match(app, /chartDateRange\("norm", startDate, endDate, \{ ensureEndDate: defaultEndDate \}\)/);
  assert.match(app, /const chartRangeEndResetPending = new Set\(\["growth", "norm", "expense"\]\)/);
  assert.match(app, /const shouldResetEnd = Boolean\(resetEndDate\) && chartRangeEndResetPending\.has\(key\)/);
  assert.match(app, /chartRangeEndResetPending\.delete\(key\)/);
  assert.match(app, /function snapDailyChartRangesToActualData\(\)/);
  assert.match(app, /snapDailyChartRangesToActualData\(\);\s+renderAll\(\);/);
  assert.match(app, /function snapExpenseChartRangeToActualData\(\)/);
  assert.match(app, /snapExpenseChartRangeToActualData\(\);\s+renderExpenses\(\);/);
  assert.match(app, /canvas\.addEventListener\("click", \(event\) => \{\s+const point = this\.nearestPoint\(event\);\s+if \(point\) this\.showTooltip\(point\);/);
  assert.match(app, /button\.addEventListener\("click", \(\) => this\.showTooltip\(point\)\);/);
  assert.doesNotMatch(app, /growthChart\.onActivate/);
  assert.doesNotMatch(app, /openRecordDialog\(point\.kind/);
  assert.match(app, /const rightGutter = width < 560 \? 70 : 82;/);
  assert.match(app, /right: width - rightGutter/);
  assert.match(app, /canvas\.dataset\.rightGutter = String\(rightGutter\);/);
  assert.match(dashboard, /id="normAxisToggle"[\s\S]*data-norm-axis="percent"[\s\S]*data-norm-axis="grams"/);
  assert.match(app, /function setNormChartAxis\(axis\)/);
  assert.match(app, /localStorage\.setItem\(NORM_CHART_AXIS_STORAGE_KEY, state\.normAxis\)/);
  assert.match(app, /projectedWeightForDate\(date, latestWeight, profile\)/);
  assert.match(app, /canvas\.dataset\.axis = state\.normAxis;/);
  assert.match(app, /state\.normAxis === "grams" \? t\("barf\.gramsAxis"\) : t\("barf\.percentAxis"\)/);
  assert.match(app, /canvas\.addEventListener\("pointermove", handleNormChartPointer\);\s+canvas\.addEventListener\("click", handleNormChartPointer\);/);
  assert.match(app, /const hoverProbe = expenseChartPoints\.at\(-1\);/);
  assert.match(app, /canvas\.dataset\.hoverX = hoverProbe \? String\(hoverProbe\.x\) : "";/);
  assert.match(app, /document\.getElementById\("expenseChart"\)\?\.addEventListener\("click", \(event\) => \{\s+const point = nearestExpensePoint\(event\);\s+if \(point\) showExpenseTooltip\(point\);/);
  assert.doesNotMatch(app, /if \(point\) beginExpenseEditor\(point\.order\);/);
  assert.match(app, /document\.getElementById\("refreshButton"\)\?\.addEventListener\("click"/);
  assert.match(app, /savePageScrollPosition\(\);\s+location\.reload\(\);/);
  assert.match(app, /async function loadExpenses\(retry = true\)/);
  assert.match(app, /return loadExpenses\(false\);/);
  assert.match(app, /const PAGE_SCROLL_STORAGE_KEY = `porschik_page_scroll:\$\{location\.pathname\}`/);
  assert.match(app, /addEventListener\("pagehide", savePageScrollPosition\)/);
  assert.match(app, /restorePageScrollPosition\(\);/);
});
