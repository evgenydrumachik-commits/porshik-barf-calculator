import { writeFile } from "node:fs/promises";

const endpoint = process.env.CDP_ENDPOINT || "http://127.0.0.1:9222";
const appUrl = process.env.APP_URL || "http://127.0.0.1:4173/";
const watchdog = setTimeout(() => {
  console.error("Browser smoke test watchdog expired");
  process.exit(2);
}, 35000);

const targetResponse = await fetch(`${endpoint}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" });
if (!targetResponse.ok) throw new Error(`Cannot create Chrome target: ${targetResponse.status}`);
const target = await targetResponse.json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
const browserErrors = [];

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
    return;
  }
  if (message.method === "Runtime.exceptionThrown") {
    browserErrors.push(message.params.exceptionDetails.text);
  }
  if (message.method === "Log.entryAdded" && ["error", "warning"].includes(message.params.entry.level)) {
    browserErrors.push(`${message.params.entry.level}: ${message.params.entry.text}`);
  }
});

function command(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression, timeoutMs = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function navigate(url) {
  await command("Page.navigate", { url });
  await waitFor("document.readyState === 'complete'");
  await waitFor("!document.querySelector('#chartLoading:not([hidden])')");
}

async function screenshot(path) {
  const result = await command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    fromSurface: true
  });
  await writeFile(path, Buffer.from(result.data, "base64"));
}

await command("Page.enable");
await command("Runtime.enable");
await command("Log.enable");

await command("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1100,
  deviceScaleFactor: 1,
  mobile: false
});
await navigate(appUrl);
console.log("desktop loaded");

const desktop = await evaluate(`(() => ({
  title: document.title,
  width: innerWidth,
  overflow: document.documentElement.scrollWidth - innerWidth,
  chartPoints: document.querySelectorAll('.chart-point-button').length,
  foodSegments: [...document.querySelectorAll('.chart-point-button')].filter((button) => button.getAttribute('aria-label')?.includes('Всего за день')).length,
  chartSubtitle: document.querySelector('#growthChartTitle + p')?.textContent?.trim(),
  latestWeight: document.querySelector('#latestWeight')?.textContent?.trim(),
  stage: document.querySelector('#stagePill')?.textContent?.trim(),
  tableOnHome: Boolean(document.querySelector('.history-table')),
  pawDecoration: getComputedStyle(document.querySelector('.stat-card'), '::after').content,
  avatarWidth: Math.round(document.querySelector('.brand-avatar').getBoundingClientRect().width),
  commentInputs: document.querySelectorAll('#weightComment, #feedingComment').length
}))()`);
const chartInfoInitial = await evaluate(`(() => ({
  buttonExpanded: document.querySelector('#growthChartInfoButton')?.getAttribute('aria-expanded'),
  popoverHidden: document.querySelector('#growthChartInfoPopover')?.hidden,
  guideInNormPanel: Boolean(document.querySelector('.norm-panel-guide'))
}))()`);
await evaluate("document.querySelector('#growthChartInfoButton')?.click()");
await waitFor("document.querySelector('#growthChartInfoPopover') && !document.querySelector('#growthChartInfoPopover').hidden");
const chartInfoOpen = await evaluate(`({
  buttonExpanded: document.querySelector('#growthChartInfoButton')?.getAttribute('aria-expanded'),
  popoverHidden: document.querySelector('#growthChartInfoPopover')?.hidden,
  title: document.querySelector('#growthChartInfoTitle')?.textContent.trim(),
  options: document.querySelectorAll('#growthChartInfoPopover .chart-info-options article').length
})`);
await evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))");
await waitFor("document.querySelector('#growthChartInfoPopover')?.hidden");
const chartInfoEscape = await evaluate(`({
  buttonExpanded: document.querySelector('#growthChartInfoButton')?.getAttribute('aria-expanded'),
  popoverHidden: document.querySelector('#growthChartInfoPopover')?.hidden
})`);
await evaluate("document.querySelector('#growthChartInfoButton')?.click()");
await waitFor("document.querySelector('#growthChartInfoPopover') && !document.querySelector('#growthChartInfoPopover').hidden");
await evaluate("document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))");
await waitFor("document.querySelector('#growthChartInfoPopover')?.hidden");
const chartInfoOutside = await evaluate(`({
  buttonExpanded: document.querySelector('#growthChartInfoButton')?.getAttribute('aria-expanded'),
  popoverHidden: document.querySelector('#growthChartInfoPopover')?.hidden
})`);
await waitFor("Number(document.querySelector('#growthChart')?.dataset.normPoints) > 100");
await evaluate("document.querySelector('[data-growth-view=lines]')?.click()");
await waitFor("document.querySelector('#growthChart')?.dataset.mode === 'lines'");
const lineSeriesColors = await evaluate(`(() => {
  const chart = document.querySelector('#growthChart');
  const actualMark = document.querySelector('.growth-actual-mark');
  const targetMark = document.querySelector('.growth-target-mark');
  const actualInput = document.querySelector('#showGrowthActual');
  const targetInput = document.querySelector('#showGrowthTarget');
  const resolveVariable = (name) => {
    const probe = document.createElement('span');
    probe.style.color = 'var(' + name + ')';
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  };
  const actualAccent = getComputedStyle(actualInput).accentColor;
  const targetAccent = getComputedStyle(targetInput).accentColor;
  return {
    weight: chart.dataset.weightColor,
    actual: chart.dataset.actualColor,
    target: chart.dataset.targetColor,
    distinct: new Set([chart.dataset.weightColor, chart.dataset.actualColor, chart.dataset.targetColor]).size === 3,
    actualMarkIsLine: actualMark?.classList.contains('line') && !actualMark?.classList.contains('bar'),
    targetMarkIsDashed: targetMark?.classList.contains('target'),
    actualMarkColor: getComputedStyle(actualMark).backgroundColor,
    targetMarkColor: getComputedStyle(targetMark).backgroundImage,
    actualInputAccent: actualAccent,
    targetInputAccent: targetAccent,
    actualAccentMatches: actualAccent === resolveVariable('--coral'),
    targetAccentMatches: targetAccent === resolveVariable('--orange')
  };
})()`);
const normChart = await evaluate(`({
  normPoints: Number(document.querySelector('#growthChart').dataset.normPoints),
  actualPoints: Number(document.querySelector('#growthChart').dataset.actualPoints),
  currentRatio: document.querySelector('#growthChart').dataset.currentRatio,
  adultDate: document.querySelector('#growthChart').dataset.adultDate,
  adultRatio: document.querySelector('#growthChart').dataset.adultRatio,
  todayLabel: document.querySelector('#growthChart').dataset.todayLabel,
  timelinePoints: document.querySelectorAll('#normTimelineList li').length,
  timelineDates: [...document.querySelectorAll('#normTimelineList .norm-timeline-summary > span:first-child')].map((element) => element.textContent.trim()),
  timelineText: document.querySelector('#normTimelineList')?.textContent,
  dailyRatio: document.querySelector('#dailyRecommendationRatio')?.textContent
})`);
const normHover = await evaluate(`(() => {
  const canvas = document.querySelector('#growthChart');
  const rect = canvas.getBoundingClientRect();
  canvas.dispatchEvent(new PointerEvent('pointermove', {
    bubbles: true,
    clientX: rect.left + Number(canvas.dataset.hoverX),
    clientY: rect.top + Number(canvas.dataset.hoverY)
  }));
  const tooltip = document.querySelector('#growthChartTooltip');
  return { visible: !tooltip.hidden, text: tooltip.textContent.trim() };
})()`);
const normClick = await evaluate(`(() => {
  const canvas = document.querySelector('#growthChart');
  const rect = canvas.getBoundingClientRect();
  canvas.dispatchEvent(new PointerEvent('click', {
    bubbles: true,
    clientX: rect.left + Number(canvas.dataset.hoverX),
    clientY: rect.top + Number(canvas.dataset.hoverY)
  }));
  const tooltip = document.querySelector('#growthChartTooltip');
  return { visible: !tooltip.hidden, text: tooltip.textContent.trim() };
})()`);
await evaluate("document.querySelector('[data-growth-view=bars]')?.click()");
await waitFor("document.querySelector('#growthChart')?.dataset.mode === 'bars'");
const legendToggles = await evaluate(`(() => {
  const ids = ['showGrowthWeight', 'showGrowthActual', 'showGrowthTarget', 'showExpenseFood', 'showExpenseDelivery', 'showExpensePriceKg'];
  for (const id of ids) {
    const input = document.getElementById(id);
    input.checked = false;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const hidden = {
    growth: [document.querySelector('#growthChart').dataset.showWeight, document.querySelector('#growthChart').dataset.showActual, document.querySelector('#growthChart').dataset.showTarget],
    expense: [document.querySelector('#expenseChart').dataset.showFood, document.querySelector('#expenseChart').dataset.showDelivery, document.querySelector('#expenseChart').dataset.showPriceKg]
  };
  for (const id of ids) {
    const input = document.getElementById(id);
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return { count: document.querySelectorAll('.chart-toggle-legend input[type="checkbox"]').length, hidden };
})()`);
await evaluate("document.querySelector('[data-edit-inline-norm]')?.click()");
await waitFor("document.querySelector('[data-norm-editor-row]')");
const normEditor = await evaluate(`({
  timelineRows: document.querySelectorAll('#normTimelineList > li').length,
  editButtons: document.querySelectorAll('[data-edit-inline-norm]').length,
  deleteButtons: document.querySelectorAll('[data-delete-inline-norm]').length,
  actionText: [...document.querySelectorAll('.norm-row-action')].map((button) => button.textContent.trim()),
  tooltips: [...document.querySelectorAll('.norm-row-action')].map((button) => button.dataset.tooltip),
  date: document.querySelector('[data-inline-norm-date]')?.value,
  percent: document.querySelector('[data-inline-norm-percent]')?.value,
  dialogPresent: Boolean(document.querySelector('#normDialog'))
})`);
await evaluate("document.querySelector('[data-save-inline-norm]')?.click()");
await waitFor("!document.querySelector('[data-norm-editor-row]')");
const savedNorms = await evaluate(`(async () => {
  const payload = await (await fetch('/api/profile', { cache: 'no-store' })).json();
  return payload.feedingSettings?.feedingNorms || [];
})()`);
await evaluate("document.querySelector('#normInlineAddButton')?.click()");
await waitFor("document.querySelector('[data-norm-editor-row].is-new')");
await waitFor("[...document.querySelectorAll('[data-norm-timeline-date]')].every((row) => row.getAnimations().length > 0)");
const normAdd = await evaluate(`({
  timelineRows: document.querySelectorAll('#normTimelineList > li').length,
  firstIsEditor: document.querySelector('#normTimelineList > li:first-child')?.hasAttribute('data-norm-editor-row'),
  animated: document.querySelector('[data-norm-editor-row]')?.classList.contains('is-new'),
  editorAnimationName: getComputedStyle(document.querySelector('[data-norm-editor-row]')).animationName,
  editorAnimationMs: Number.parseFloat(getComputedStyle(document.querySelector('[data-norm-editor-row]')).animationDuration) * 1000,
  shiftedRows: [...document.querySelectorAll('[data-norm-timeline-date]')].filter((row) => row.getAnimations().length > 0).length,
  date: document.querySelector('[data-inline-norm-date]')?.value,
  percent: document.querySelector('[data-inline-norm-percent]')?.value
})`);
await evaluate("document.querySelector('[data-cancel-inline-norm]')?.click()");
await waitFor("!document.querySelector('[data-norm-editor-row]')");
await command("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1800,
  deviceScaleFactor: 1,
  mobile: false
});
await new Promise((resolve) => setTimeout(resolve, 200));
await screenshot("output/playwright/norm-timeline-actual.png");
await command("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1100,
  deviceScaleFactor: 1,
  mobile: false
});
await screenshot("/tmp/porschik-cdp-desktop.png");
console.log("desktop inspected");

await evaluate(`document.querySelector('.chart-actions [data-open-record="feeding"]')?.click()`);
await waitFor("document.querySelector('#recordDialog')?.open");
console.log("feeding dialog opened");
const puppyMeals = await evaluate("document.querySelectorAll('#mealsContainer .meal-row').length");
await evaluate(`(() => {
  window.confirm = () => false;
  const input = document.querySelector('#feedingDate');
  input.value = '2026-10-28';
  input.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
const adultMeals = await evaluate("document.querySelectorAll('#mealsContainer .meal-row').length");
await evaluate("document.querySelector('#recordDialog').close()");
console.log("feeding phase controls checked");

const mealCountInitial = await evaluate(`({
  count: document.querySelector('#mealCountRecommendation')?.textContent.trim(),
  source: document.querySelector('#mealCountSource')?.textContent.trim(),
  editVisible: !document.querySelector('#mealCountEditButton')?.hidden
})`);
await evaluate("document.querySelector('#mealCountEditButton')?.click()");
await waitFor("document.querySelector('#mealCountDialog')?.open");
const mealCountPreview = await evaluate(`(() => {
  const date = document.querySelector('#mealCountDate');
  date.value = '2026-07-28';
  date.dispatchEvent(new Event('change', { bubbles: true }));
  const radio = document.querySelector('input[name="mealsPerDay"][value="2"]');
  radio.checked = true;
  radio.dispatchEvent(new Event('change', { bubbles: true }));
  return {
    text: document.querySelector('#mealCountPreview')?.textContent.trim(),
    history: document.querySelectorAll('#mealCountHistory [data-delete-meal-count]').length
  };
})()`);
await evaluate("document.querySelector('#mealCountForm button[type=submit]')?.click()");
await waitFor("!document.querySelector('#mealCountDialog')?.open && document.querySelector('#mealCountRecommendation')?.textContent.trim() === '2'");
await evaluate("document.querySelector('#growthQuickAddButton')?.click()");
await waitFor("document.querySelector('#growthQuickAddForm')?.classList.contains('is-open')");
const quickManualTwoMeals = await evaluate(`({
  editableMeals: [...document.querySelectorAll('#growthQuickAddRow [data-inline-field^="meal-"]')].map((cell) => cell.dataset.inlineField),
  thirdDisabled: Boolean(document.querySelector('#growthQuickAddRow .meal-not-planned'))
})`);
await evaluate("document.querySelector('#growthQuickAddButton')?.click()");
await evaluate("document.querySelector('#mealCountEditButton')?.click()");
await waitFor("document.querySelector('#mealCountDialog')?.open");
await evaluate(`(() => {
  const date = document.querySelector('#mealCountDate');
  date.value = '2026-08-12';
  date.dispatchEvent(new Event('change', { bubbles: true }));
  const radio = document.querySelector('input[name="mealsPerDay"][value="3"]');
  radio.checked = true;
  radio.dispatchEvent(new Event('change', { bubbles: true }));
  document.querySelector('#mealCountForm button[type=submit]').click();
})()`);
await waitFor("!document.querySelector('#mealCountDialog')?.open");
const savedMealCountChanges = await evaluate(`(async () => {
  const payload = await (await fetch('/api/profile', { cache: 'no-store' })).json();
  return payload.feedingSettings?.mealCountChanges || [];
})()`);
await evaluate(`document.querySelector('.chart-actions [data-open-record="feeding"]')?.click()`);
await waitFor("document.querySelector('#recordDialog')?.open");
await evaluate(`(() => {
  const input = document.querySelector('#feedingDate');
  input.value = '2026-07-28';
  input.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
const manualTwoMeals = await evaluate("document.querySelectorAll('#mealsContainer .meal-row').length");
await evaluate(`(() => {
  const input = document.querySelector('#feedingDate');
  input.value = '2026-08-12';
  input.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
const manualThreeMeals = await evaluate("document.querySelectorAll('#mealsContainer .meal-row').length");
await evaluate("document.querySelector('#recordDialog').close()");
console.log("manual feeding schedule checked");

await evaluate(`document.querySelector('.chart-actions [data-open-record="feeding"]')?.click()`);
await waitFor("document.querySelector('#recordDialog')?.open");
const feedingFormNoComment = await evaluate(`(() => {
  const form = document.querySelector('#feedingForm');
  return { valid: form.checkValidity(), hidden: form.hidden, date: document.querySelector('#feedingDate').value, commentField: Boolean(document.querySelector('#feedingComment')) };
})()`);
console.log("feeding form validity", feedingFormNoComment);
await evaluate("document.querySelector('#recordDialog').close()");
const feedingTooltip = await evaluate(`(() => {
  const point = [...document.querySelectorAll('.chart-point-button')].find((button) => button.getAttribute('aria-label')?.includes('Всего за день'));
  point?.dispatchEvent(new PointerEvent('pointerenter'));
  return document.querySelector('#growthChartTooltip')?.innerText;
})()`);
await screenshot("output/playwright/growth-daily-bars-hover.png");
console.log("feeding tooltip checked");

await evaluate("document.querySelector('.chart-point-button')?.click()");
await waitFor("!document.querySelector('#growthChartTooltip')?.hidden");
const pointClick = await evaluate(`({
  tooltip: document.querySelector('#growthChartTooltip')?.innerText,
  recordDialogOpen: Boolean(document.querySelector('#recordDialog')?.open)
})`);
console.log("chart point tooltip checked");

await evaluate(`document.querySelector('.chart-actions [data-open-record="weight"]')?.click()`);
await waitFor("document.querySelector('#recordDialog')?.open");
await evaluate(`(() => {
  document.querySelector('#weightValue').value = '8.10';
  document.querySelector('#weightForm button[type=submit]').click();
})()`);
await waitFor("document.querySelector('#replaceDialog')?.open");
const replacementPreview = await evaluate(`({
  intro: document.querySelector('#replaceIntro')?.textContent,
  before: document.querySelector('#replaceBefore')?.textContent,
  after: document.querySelector('#replaceAfter')?.textContent,
  preserved: document.querySelector('#replacePreserved')?.textContent
})`);
await evaluate("document.querySelector('#replaceConfirmButton')?.click()");
await waitFor("!document.querySelector('#replaceDialog')?.open");
await waitFor("!document.querySelector('#recordDialog')?.open");
await waitFor(`document.querySelectorAll('.chart-point-button').length === ${desktop.chartPoints + 1}`);
await evaluate(`document.querySelector('.chart-actions [data-open-record="weight"]')?.click()`);
await waitFor("document.querySelector('#recordDialog')?.open");
const deleteWeightVisible = await evaluate("!document.querySelector('#deleteWeightButton').hidden");
await evaluate(`(() => {
  window.confirm = () => true;
  document.querySelector('#deleteWeightButton').click();
})()`);
await waitFor("!document.querySelector('#recordDialog')?.open");
await waitFor(`document.querySelectorAll('.chart-point-button').length === ${desktop.chartPoints}`);
console.log("weight-only deletion checked");

const photoSaved = await evaluate(`(async () => {
  const bytes = new Uint8Array(await (await fetch('/assets/porschik.jpg')).arrayBuffer());
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
  const avatarDataUrl = 'data:image/jpeg;base64,' + btoa(binary);
  const response = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ avatarDataUrl })
  });
  return response.ok;
})()`);
await navigate(appUrl);
const customPhotoLoaded = await evaluate("document.querySelector('#dogAvatar')?.src.startsWith('data:image/jpeg;base64,')");
console.log("photo persistence checked");

await navigate(new URL("/history", appUrl).href);
console.log("history desktop loaded");
const historyDesktop = await evaluate(`({
  rows: document.querySelectorAll('#historyTableBody tr').length,
  cards: document.querySelectorAll('#mobileRecordList .mobile-record-card').length,
  tableVisible: getComputedStyle(document.querySelector('.table-scroll')).display !== 'none',
  backupPanelVisible: !document.querySelector('#historyBackupPanel').hidden,
  editableCells: document.querySelectorAll('[data-inline-field]').length,
  derivedCells: document.querySelectorAll('.derived-cell').length,
  targetCells: document.querySelectorAll('.target-cell').length,
  differenceCells: document.querySelectorAll('.difference-cell').length,
  deleteButtons: document.querySelectorAll('[data-delete-record]').length,
  targetHeader: [...document.querySelectorAll('.history-table th')].some((cell) => cell.textContent.trim() === 'Норма'),
  differenceHeader: [...document.querySelectorAll('.history-table th')].some((cell) => cell.textContent.trim() === 'Расхождение'),
  commentHeader: [...document.querySelectorAll('.history-table th')].some((cell) => cell.textContent.trim() === 'Комментарий'),
  actionsHeader: [...document.querySelectorAll('.history-table th')].some((cell) => cell.textContent.trim() === 'Действия'),
  manualBackupButton: Boolean(document.querySelector('#dailyBackupButton')),
  automaticBadge: document.querySelector('.backup-auto-badge')?.textContent.trim()
})`);
await evaluate("document.querySelector('[data-inline-record=\"2026-07-17\"][data-inline-field=\"weight\"]')?.click()");
await waitFor("document.querySelector('[data-inline-record=\"2026-07-17\"][data-inline-field=\"weight\"] [data-inline-input]')");
await evaluate(`(() => {
  const cell = document.querySelector('[data-inline-record="2026-07-17"][data-inline-field="weight"]');
  cell.querySelector('[data-inline-input]').value = '8.00';
  cell.querySelector('[data-inline-cancel]').click();
})()`);
const inlineCancelledWeight = await evaluate("document.querySelector('[data-inline-record=\"2026-07-17\"][data-inline-field=\"weight\"]')?.textContent");
await evaluate("document.querySelector('[data-inline-record=\"2026-07-17\"][data-inline-field=\"weight\"]')?.click()");
await evaluate(`(() => {
  const cell = document.querySelector('[data-inline-record="2026-07-17"][data-inline-field="weight"]');
  cell.querySelector('[data-inline-input]').value = '8.00';
  cell.querySelector('[data-inline-save]').click();
})()`);
await waitFor("document.querySelector('[data-inline-record=\"2026-07-17\"][data-inline-field=\"weight\"]')?.textContent.includes('8')");
const inlineSavedWeight = await evaluate("document.querySelector('[data-inline-record=\"2026-07-17\"][data-inline-field=\"weight\"]')?.textContent");
await evaluate("document.querySelector('[data-inline-record=\"2026-07-17\"][data-inline-field=\"weight\"]')?.click()");
await evaluate(`(() => {
  const cell = document.querySelector('[data-inline-record="2026-07-17"][data-inline-field="weight"]');
  cell.querySelector('[data-inline-input]').value = '7.95';
  cell.querySelector('[data-inline-save]').click();
})()`);
await waitFor("document.querySelector('[data-inline-record=\"2026-07-17\"][data-inline-field=\"weight\"]')?.textContent.includes('7,95')");
await evaluate("document.querySelector('#addHistoryRowButton')?.click()");
await waitFor("document.querySelector('[data-inline-key=\"draft\"][data-inline-field=\"weight\"]')");
const inlineDraft = await evaluate(`(() => ({
  rows: document.querySelectorAll('#historyTableBody tr').length,
  date: document.querySelector('[data-inline-key="draft"][data-inline-field="date"]')?.dataset.inlineRecord,
  weight: document.querySelector('[data-inline-key="draft"][data-inline-field="weight"]')?.textContent.trim(),
  meal1: document.querySelector('[data-inline-key="draft"][data-inline-field="meal-1"]')?.textContent.trim()
}))()`);
await evaluate("document.querySelector('[data-inline-key=\"draft\"][data-inline-field=\"weight\"]')?.click()");
await evaluate(`(() => {
  const cell = document.querySelector('[data-inline-key="draft"][data-inline-field="weight"]');
  cell.querySelector('[data-inline-input]').value = '8.15';
  cell.querySelector('[data-inline-save]').click();
})()`);
await waitFor("document.querySelector('#replaceDialog')?.open || !document.querySelector('[data-inline-key=\"draft\"]')");
if (await evaluate("Boolean(document.querySelector('#replaceDialog')?.open)")) {
  await evaluate("document.querySelector('#replaceConfirmButton')?.click()");
}
await waitFor(`!document.querySelector('[data-inline-key="draft"]') && document.querySelector('[data-inline-record="${inlineDraft.date}"][data-inline-field="weight"]')?.textContent.includes('8,15')`);
const historyAfterDraft = await evaluate("document.querySelectorAll('#historyTableBody tr').length");
const backupExport = await evaluate(`(async () => {
  const response = await fetch('/api/weights?export=1', { credentials: 'same-origin' });
  const payload = await response.json();
  return {
    ok: response.ok,
    disposition: response.headers.get('Content-Disposition'),
    schemaVersion: payload.schemaVersion,
    backupType: payload.backupType,
    records: payload.records?.length,
    feedingNorms: payload.profile?.feedingSettings?.feedingNorms?.length,
    mealCountChanges: payload.profile?.feedingSettings?.mealCountChanges?.length,
    avatar: payload.profile?.avatarUrl,
    expenses: payload.expenses?.length
  };
})()`);
await waitFor("document.querySelector('#restorePointSelect')?.options.length > 1");
const automaticBackups = await evaluate(`(() => ({
  options: document.querySelector('#restorePointSelect').options.length,
  status: document.querySelector('#backupStatusMessage').textContent
}))()`);
await evaluate(`(() => {
  const select = document.querySelector('#restorePointSelect');
  select.selectedIndex = 1;
  document.querySelector('#restoreBackupButton').click();
})()`);
await waitFor("document.querySelector('#restoreDialog')?.open");
await evaluate("document.querySelector('#confirmRestoreButton').click()");
await waitFor("document.querySelector('#backupStatusMessage')?.textContent.includes('восстановлены')");
const backupRestored = await evaluate("document.querySelector('#backupStatusMessage').textContent");

await command("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true
});
await navigate(appUrl);
console.log("mobile dashboard loaded");
const mobile = await evaluate(`(() => ({
  width: innerWidth,
  overflow: document.documentElement.scrollWidth - innerWidth,
  stickyActions: getComputedStyle(document.querySelector('.mobile-actions')).display,
  chartHeight: Math.round(document.querySelector('.chart-canvas').getBoundingClientRect().height),
  historyButtonVisible: document.querySelector('.chart-actions .button-secondary').getBoundingClientRect().width > 0,
  legendChecks: document.querySelectorAll('.chart-toggle-legend input[type="checkbox"]').length,
  legendVisible: getComputedStyle(document.querySelector('.chart-toggle-legend')).display,
  minLegendTapHeight: Math.min(...[...document.querySelectorAll('.legend-toggle')].map((label) => label.getBoundingClientRect().height))
}))()`);
await screenshot("/tmp/porschik-cdp-mobile.png");

await navigate(new URL("/history", appUrl).href);
console.log("mobile history loaded");
const historyMobile = await evaluate(`({
  tableVisible: getComputedStyle(document.querySelector('.table-scroll')).display !== 'none',
  cardListVisible: getComputedStyle(document.querySelector('#mobileRecordList')).display !== 'none',
  cards: document.querySelectorAll('#mobileRecordList .mobile-record-card').length,
  overflow: document.documentElement.scrollWidth - innerWidth
})`);

await command("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1800,
  deviceScaleFactor: 1,
  mobile: false
});
await navigate(appUrl);
await evaluate("document.querySelector('[data-growth-view=lines]')?.click()");
await waitFor("document.querySelector('#growthChart')?.dataset.mode === 'lines' && Number(document.querySelector('#growthChart')?.dataset.actualPoints) > 0");
const normActualLine = await evaluate(`({
  points: Number(document.querySelector('#growthChart').dataset.actualPoints),
  summary: document.querySelector('#growthChartModeNote')?.textContent.trim()
})`);
await screenshot("/tmp/porschik-cdp-barf-after-flows.png");

const report = { desktop, chartInfoInitial, chartInfoOpen, chartInfoEscape, chartInfoOutside, lineSeriesColors, normChart, normHover, normClick, legendToggles, normEditor, normAdd, savedNorms, normActualLine, puppyMeals, adultMeals, mealCountInitial, mealCountPreview, quickManualTwoMeals, savedMealCountChanges, manualTwoMeals, manualThreeMeals, feedingFormNoComment, feedingTooltip, pointClick, replacementPreview, deleteWeightVisible, photoSaved, customPhotoLoaded, historyDesktop, inlineCancelledWeight, inlineSavedWeight, inlineDraft, historyAfterDraft, backupExport, automaticBackups, backupRestored, mobile, historyMobile, browserErrors };
console.log(JSON.stringify(report, null, 2));

if (desktop.overflow > 0 || mobile.overflow > 0 || historyMobile.overflow > 0) process.exitCode = 1;
if (chartInfoInitial.buttonExpanded !== "false" || !chartInfoInitial.popoverHidden || chartInfoInitial.guideInNormPanel || chartInfoOpen.buttonExpanded !== "true" || chartInfoOpen.popoverHidden || chartInfoOpen.options !== 2 || chartInfoEscape.buttonExpanded !== "false" || !chartInfoEscape.popoverHidden || chartInfoOutside.buttonExpanded !== "false" || !chartInfoOutside.popoverHidden) process.exitCode = 1;
if (desktop.tableOnHome || desktop.commentInputs || feedingFormNoComment.commentField || puppyMeals !== 3 || adultMeals !== 2 || pointClick.recordDialogOpen || !pointClick.tooltip) process.exitCode = 1;
if (mealCountInitial.count !== "3" || !mealCountInitial.source?.includes("возраст") || !mealCountInitial.editVisible) process.exitCode = 1;
if (!mealCountPreview.text?.includes("3 → 2") || mealCountPreview.history !== 0) process.exitCode = 1;
if (quickManualTwoMeals.editableMeals.join(",") !== "meal-1,meal-2" || !quickManualTwoMeals.thirdDisabled) process.exitCode = 1;
if (savedMealCountChanges.length !== 2 || savedMealCountChanges[0]?.mealsPerDay !== 2 || savedMealCountChanges[1]?.mealsPerDay !== 3) process.exitCode = 1;
if (manualTwoMeals !== 2 || manualThreeMeals !== 3) process.exitCode = 1;
if (!desktop.pawDecoration?.includes("🐾") || desktop.avatarWidth < 80) process.exitCode = 1;
if (desktop.foodSegments < 20 || !desktop.chartSubtitle?.includes("составные столбики")) process.exitCode = 1;
if (!lineSeriesColors.distinct || !lineSeriesColors.actualMarkIsLine || !lineSeriesColors.targetMarkIsDashed || !lineSeriesColors.actualAccentMatches || !lineSeriesColors.targetAccentMatches) process.exitCode = 1;
if (normChart.normPoints < 100 || normChart.actualPoints < 1 || normChart.currentRatio !== "0.054" || normChart.adultDate !== "2026-10-28" || normChart.adultRatio !== "0.03" || normChart.timelinePoints !== 4) process.exitCode = 1;
if (normChart.timelineDates.join(",") !== "28 окт.,22 июл.,01 июл.,01 мая") process.exitCode = 1;
if (!normChart.todayLabel?.includes("22 июля") || !normChart.timelineText?.includes("4мес 24дн") || !normChart.dailyRatio?.includes("5,4%")) process.exitCode = 1;
if (!normHover.visible || !normHover.text.includes("Фактически съедено") || !normClick.visible || !normClick.text.includes("Фактически съедено") || !feedingTooltip?.includes("Всего")) process.exitCode = 1;
if (legendToggles.count !== 6 || Object.values(legendToggles.hidden).flat().some((value) => value !== "false")) process.exitCode = 1;
if (normEditor.timelineRows !== 4 || normEditor.editButtons !== 3 || normEditor.deleteButtons !== 3 || normEditor.date !== "2026-10-28" || normEditor.percent !== "3.0" || normEditor.dialogPresent) process.exitCode = 1;
if (normEditor.actionText.some(Boolean) || !normEditor.tooltips.includes("Изменить") || !normEditor.tooltips.includes("Удалить")) process.exitCode = 1;
if (normAdd.timelineRows !== 5 || !normAdd.firstIsEditor || !normAdd.animated || normAdd.editorAnimationName !== "norm-row-in" || normAdd.editorAnimationMs < 500 || normAdd.shiftedRows !== 4 || !normAdd.date || !normAdd.percent) process.exitCode = 1;
if (savedNorms.length !== 4 || savedNorms[1]?.date !== "2026-07-01" || savedNorms[1]?.interpolation !== "step" || savedNorms[2]?.ratio !== 0.054) process.exitCode = 1;
if (normActualLine.points < 1 || !normActualLine.summary.includes("Фактическая линия")) process.exitCode = 1;
if (!replacementPreview.after?.includes("8,1 кг") || !replacementPreview.preserved?.includes("питание")) process.exitCode = 1;
if (!deleteWeightVisible || !photoSaved || !customPhotoLoaded) process.exitCode = 1;
if (!historyDesktop.rows || historyDesktop.rows !== historyDesktop.cards || !historyDesktop.tableVisible) process.exitCode = 1;
if (historyDesktop.editableCells !== historyDesktop.rows * 5 || historyDesktop.derivedCells !== historyDesktop.rows * 4) process.exitCode = 1;
if (historyDesktop.targetCells !== historyDesktop.rows || historyDesktop.differenceCells !== historyDesktop.rows || historyDesktop.deleteButtons !== historyDesktop.rows * 2) process.exitCode = 1;
if (!historyDesktop.targetHeader || !historyDesktop.differenceHeader || historyDesktop.commentHeader || historyDesktop.actionsHeader) process.exitCode = 1;
if (historyDesktop.manualBackupButton || !historyDesktop.automaticBadge?.includes("Автокопирование")) process.exitCode = 1;
if (!inlineCancelledWeight?.includes("7,95") || !inlineSavedWeight?.includes("8")) process.exitCode = 1;
if (mobile.legendChecks !== 8 || mobile.legendVisible === "none" || mobile.minLegendTapHeight < 44) process.exitCode = 1;
if (inlineDraft.rows !== historyDesktop.rows + 1 || inlineDraft.weight !== "—" || inlineDraft.meal1 !== "—" || historyAfterDraft !== historyDesktop.rows) process.exitCode = 1;
if (!historyDesktop.backupPanelVisible || !backupExport.ok || backupExport.schemaVersion !== 4 || backupExport.backupType !== "full" || backupExport.records !== historyAfterDraft || backupExport.feedingNorms !== 4 || backupExport.mealCountChanges !== 2 || !backupExport.avatar || backupExport.expenses < 1 || !backupExport.disposition?.includes("porschik-full-backup")) process.exitCode = 1;
if (automaticBackups.options < 2 || !backupRestored?.includes("восстановлены")) process.exitCode = 1;
if (historyMobile.tableVisible || !historyMobile.cardListVisible || historyMobile.cards !== historyAfterDraft) process.exitCode = 1;
if (browserErrors.length) process.exitCode = 1;

socket.close();
await fetch(`${endpoint}/json/close/${target.id}`);
clearTimeout(watchdog);
