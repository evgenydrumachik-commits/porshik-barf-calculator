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
  assert.match(component, /data-growth-series="weight"/);
  assert.match(component, /data-growth-series="actual"/);
  assert.match(component, /data-growth-series="target"/);
  assert.match(component, /growth-actual-mark.*--mark: var\(--coral\)/);
  assert.match(component, /growth-target-mark.*--mark: var\(--orange\)/);
  assert.match(component, /data-chart-range="growth"/);
  assert.match(component, /id="growthViewToggle"[\s\S]*data-growth-view="bars"[\s\S]*data-growth-view="lines"/);
  assert.match(component, /id="growthAxisToggle"[\s\S]*data-growth-axis="percent"[\s\S]*data-growth-axis="grams"/);
  assert.match(component, /id="growthChartInfoButton"[\s\S]*aria-controls="growthChartInfoPopover"/);
  assert.match(component, /id="growthChartInfoPopover"[\s\S]*role="dialog"[\s\S]*hidden/);
  assert.match(component, /id="growthChartModeNote"/);
  assert.match(component, /class="add-icon-button growth-quick-add-trigger" id="growthQuickAddButton"/);
  assert.equal((dashboard.match(/class="add-icon-button /g) || []).length, 2);
  assert.match(component, /id="growthQuickAddForm"/);
  assert.match(component, /id="growthQuickAddRow"/);
  assert.match(component, /class="history-table"/);
  assert.doesNotMatch(component, /data-open-record="weight"/);
  assert.doesNotMatch(component, /data-open-record="feeding"/);
  assert.match(app, /function renderGrowthQuickRow\(\)/);
  assert.match(app, /chartDateRange\("growth", availableStart, availableEnd, \{ ensureEndDate: state\.growthView === "lines" \? defaultLineEnd : latestActualDate \}\)/);
  assert.match(app, /const defaultLineEnd = addDays\(today, 3\)/);
  assert.match(app, /const chartRangeEndResetPending = new Set\(\["growth", "expense"\]\)/);
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
  assert.match(app, /const GROWTH_CHART_AXIS_STORAGE_KEY = "porschik_growth_chart_axis"/);
  assert.match(app, /function setGrowthChartAxis\(axis\)/);
  assert.match(app, /localStorage\.setItem\(GROWTH_CHART_AXIS_STORAGE_KEY, state\.growthAxis\)/);
  assert.match(app, /const GROWTH_CHART_VIEW_STORAGE_KEY = "porschik_growth_chart_view"/);
  assert.match(app, /function setGrowthChartView\(view\)/);
  assert.match(app, /function syncGrowthChartLegend\(\)/);
  assert.match(app, /actualMark\.classList\.toggle\("line", state\.growthView === "lines"\)/);
  assert.match(app, /function setGrowthChartInfoOpen\(open\)/);
  assert.match(app, /growthChartInfoButton/);
  assert.match(app, /event\.key === "Escape"/);
  assert.match(app, /localStorage\.setItem\(GROWTH_CHART_VIEW_STORAGE_KEY, state\.growthView\)/);
  assert.match(app, /projectedWeightForDate\(date, latestWeight, profile\)/);
  assert.match(app, /canvas\.dataset\.axis = state\.growthAxis;/);
  assert.match(app, /chart\.growthChartAriaPercent/);
  assert.match(app, /state\.growthAxis === "percent"/);
  assert.match(app, /state\.growthView === "lines"/);
  assert.match(app, /const actualColor = coral;/);
  assert.match(app, /const targetColor = orange;/);
  assert.match(app, /toLinePoint\(point, "actual", actualColor\)/);
  assert.match(app, /toLinePoint\(point, "norm", targetColor\)/);
  assert.match(app, /canvas\.dataset\.actualColor = actualColor;/);
  assert.match(app, /canvas\.dataset\.targetColor = targetColor;/);
  assert.match(app, /isDailyIntakeComplete\(record, profile\)/);
  assert.doesNotMatch(dashboard, /id="normChart"/);
  assert.doesNotMatch(dashboard, /class="norm-panel-guide"/);
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
