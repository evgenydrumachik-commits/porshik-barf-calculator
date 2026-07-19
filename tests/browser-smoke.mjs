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
  latestWeight: document.querySelector('#latestWeight')?.textContent?.trim(),
  stage: document.querySelector('#stagePill')?.textContent?.trim(),
  tableOnHome: Boolean(document.querySelector('.history-table')),
  pawDecoration: getComputedStyle(document.querySelector('.stat-card'), '::after').content,
  avatarWidth: Math.round(document.querySelector('.brand-avatar').getBoundingClientRect().width),
  commentInputs: document.querySelectorAll('#weightComment, #feedingComment').length
}))()`);
await evaluate(`(() => {
  const details = document.querySelector('#barfDetails');
  details.open = true;
  details.dispatchEvent(new Event('toggle'));
})()`);
await waitFor("document.querySelector('#barfChart')?.dataset.hasDropLines === 'true'");
const barf = await evaluate(`({
  hasDropLines: document.querySelector('#barfChart').dataset.hasDropLines,
  currentWeight: document.querySelector('#barfChart').dataset.currentWeight,
  currentDaily: document.querySelector('#barfChart').dataset.currentDaily,
  transitionStartWeight: document.querySelector('#barfChart').dataset.transitionStartWeight,
  targetWeight: document.querySelector('#barfChart').dataset.targetWeight
})`);
await command("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1800,
  deviceScaleFactor: 1,
  mobile: false
});
await new Promise((resolve) => setTimeout(resolve, 200));
await screenshot("/tmp/porschik-cdp-barf.png");
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

await evaluate(`document.querySelector('.chart-actions [data-open-record="feeding"]')?.click()`);
await waitFor("document.querySelector('#recordDialog')?.open");
const feedingFormNoComment = await evaluate(`(() => {
  const form = document.querySelector('#feedingForm');
  return { valid: form.checkValidity(), hidden: form.hidden, date: document.querySelector('#feedingDate').value, commentField: Boolean(document.querySelector('#feedingComment')) };
})()`);
console.log("feeding form validity", feedingFormNoComment);
await evaluate("document.querySelector('#feedingForm button[type=submit]').click()");
await new Promise((resolve) => setTimeout(resolve, 500));
console.log("feeding submit state", await evaluate(`({
  open: document.querySelector('#recordDialog')?.open,
  message: document.querySelector('#feedingFormMessage')?.textContent,
  values: [...document.querySelectorAll('[data-meal-value]')].map((input) => input.value)
})`));
await waitFor("!document.querySelector('#recordDialog')?.open");
await waitFor("document.querySelectorAll('.chart-point-button').length === 15");
const feedingTooltip = await evaluate(`(() => {
  const point = [...document.querySelectorAll('.chart-point-button')].find((button) => button.getAttribute('aria-label')?.includes('Приём 1'));
  point?.dispatchEvent(new PointerEvent('pointerenter'));
  return document.querySelector('#chartTooltip')?.innerText;
})()`);
await screenshot("/tmp/porschik-cdp-with-feeding.png");
console.log("feeding save and tooltip checked");

await evaluate("document.querySelector('.chart-point-button')?.click()");
await waitFor("document.querySelector('#recordDialog')?.open");
console.log("chart point opened");
const pointEdit = await evaluate(`({
  tab: document.querySelector('[data-record-tab][aria-selected="true"]')?.dataset.recordTab,
  date: document.querySelector('#weightDate')?.value,
  value: document.querySelector('#weightValue')?.value
})`);
await evaluate("document.querySelector('#recordDialog').close()");

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
await waitFor("document.querySelectorAll('.chart-point-button').length === 16");
await evaluate(`document.querySelector('.chart-actions [data-open-record="weight"]')?.click()`);
await waitFor("document.querySelector('#recordDialog')?.open");
const deleteWeightVisible = await evaluate("!document.querySelector('#deleteWeightButton').hidden");
await evaluate(`(() => {
  window.confirm = () => true;
  document.querySelector('#deleteWeightButton').click();
})()`);
await waitFor("!document.querySelector('#recordDialog')?.open");
await waitFor("document.querySelectorAll('.chart-point-button').length === 15");
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
await waitFor(`!document.querySelector('[data-inline-key="draft"]') && document.querySelector('[data-inline-record="${inlineDraft.date}"][data-inline-field="weight"]')?.textContent.includes('8,15')`);
const historyAfterDraft = await evaluate("document.querySelectorAll('#historyTableBody tr').length");
const backupExport = await evaluate(`(async () => {
  const response = await fetch('/api/weights?export=1', { credentials: 'same-origin' });
  const payload = await response.json();
  return {
    ok: response.ok,
    disposition: response.headers.get('Content-Disposition'),
    records: payload.records?.length
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
  historyButtonVisible: document.querySelector('.chart-actions .button-secondary').getBoundingClientRect().width > 0
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

const report = { desktop, barf, puppyMeals, adultMeals, feedingFormNoComment, feedingTooltip, pointEdit, replacementPreview, deleteWeightVisible, photoSaved, customPhotoLoaded, historyDesktop, inlineCancelledWeight, inlineSavedWeight, inlineDraft, historyAfterDraft, backupExport, automaticBackups, backupRestored, mobile, historyMobile, browserErrors };
console.log(JSON.stringify(report, null, 2));

if (desktop.overflow > 0 || mobile.overflow > 0 || historyMobile.overflow > 0) process.exitCode = 1;
if (desktop.tableOnHome || desktop.commentInputs || feedingFormNoComment.commentField || puppyMeals !== 3 || adultMeals !== 2 || pointEdit.tab !== "weight") process.exitCode = 1;
if (!desktop.pawDecoration?.includes("🐾") || desktop.avatarWidth < 80) process.exitCode = 1;
if (barf.hasDropLines !== "true" || barf.targetWeight !== "12" || barf.transitionStartWeight !== "10.8") process.exitCode = 1;
if (!replacementPreview.after?.includes("8,1 кг") || !replacementPreview.preserved?.includes("питание")) process.exitCode = 1;
if (!deleteWeightVisible || !photoSaved || !customPhotoLoaded) process.exitCode = 1;
if (!historyDesktop.rows || historyDesktop.rows !== historyDesktop.cards || !historyDesktop.tableVisible) process.exitCode = 1;
if (historyDesktop.editableCells !== historyDesktop.rows * 5 || historyDesktop.derivedCells !== historyDesktop.rows * 4) process.exitCode = 1;
if (historyDesktop.targetCells !== historyDesktop.rows || historyDesktop.differenceCells !== historyDesktop.rows || historyDesktop.deleteButtons !== historyDesktop.rows) process.exitCode = 1;
if (!historyDesktop.targetHeader || !historyDesktop.differenceHeader || historyDesktop.commentHeader || historyDesktop.actionsHeader) process.exitCode = 1;
if (historyDesktop.manualBackupButton || !historyDesktop.automaticBadge?.includes("Автокопирование")) process.exitCode = 1;
if (!inlineCancelledWeight?.includes("7,95") || !inlineSavedWeight?.includes("8")) process.exitCode = 1;
if (inlineDraft.rows !== historyDesktop.rows + 1 || inlineDraft.weight !== "—" || inlineDraft.meal1 !== "—" || historyAfterDraft !== historyDesktop.rows + 1) process.exitCode = 1;
if (!historyDesktop.backupPanelVisible || !backupExport.ok || backupExport.records !== historyAfterDraft) process.exitCode = 1;
if (automaticBackups.options < 2 || !backupRestored?.includes("восстановлены")) process.exitCode = 1;
if (historyMobile.tableVisible || !historyMobile.cardListVisible || historyMobile.cards !== historyAfterDraft) process.exitCode = 1;
if (browserErrors.length) process.exitCode = 1;

socket.close();
await fetch(`${endpoint}/json/close/${target.id}`);
clearTimeout(watchdog);
