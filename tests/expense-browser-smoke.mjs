import { writeFile } from "node:fs/promises";

const endpoint = process.env.CDP_ENDPOINT || "http://127.0.0.1:9223";
const appUrl = process.env.APP_URL || "http://127.0.0.1:4174/";
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
    const handlers = pending.get(message.id);
    pending.delete(message.id);
    return message.error ? handlers.reject(new Error(message.error.message)) : handlers.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params.exceptionDetails.text);
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") browserErrors.push(message.params.entry.text);
});

function command(method, params = {}) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression, timeoutMs = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

async function navigate() {
  await command("Page.navigate", { url: appUrl });
  await waitFor("document.readyState === 'complete'");
  await waitFor("!document.querySelector('#chartLoading:not([hidden])')");
}

await command("Page.enable");
await command("Runtime.enable");
await command("Log.enable");
await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
await navigate();

const splitChart = await evaluate(`(() => {
  const canvas = document.querySelector('#growthChart');
  return {
    weightTop: Number(canvas.dataset.weightTop),
    weightBottom: Number(canvas.dataset.weightBottom),
    foodTop: Number(canvas.dataset.foodTop),
    foodBottom: Number(canvas.dataset.foodBottom),
    height: Math.round(canvas.getBoundingClientRect().height)
  };
})()`);

await evaluate("document.querySelector('#addExpenseButton').click()");
await waitFor("document.querySelector('[data-expense-editor-row].is-new')");
const inlineEditor = await evaluate(`(() => {
  const form = document.querySelector('[data-expense-editor-row]');
  const set = (selector, value) => {
    const input = form.querySelector(selector);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  set('[data-expense-date]', '2026-07-22');
  set('[data-expense-type]', 'BARF');
  set('[data-expense-description]', 'Browser smoke order');
  set('[data-expense-kilograms]', '12');
  set('[data-expense-price-kg]', '6.5');
  set('[data-expense-delivery]', '9');
  const result = {
    dialogPresent: Boolean(document.querySelector('#expenseDialog')),
    animated: getComputedStyle(form).animationName === 'norm-row-in',
    total: form.querySelector('[data-expense-inline-total]').textContent.trim()
  };
  return result;
})()`);
await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 3000, deviceScaleFactor: 1, mobile: false });
await new Promise((resolve) => setTimeout(resolve, 250));
const inlineImage = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
await writeFile("output/playwright/expense-inline-editor.png", Buffer.from(inlineImage.data, "base64"));
await evaluate("document.querySelector('[data-expense-editor-row]').requestSubmit()");
await waitFor("!document.querySelector('[data-expense-editor-row]')");
await waitFor("Number(document.querySelector('#expenseChart').dataset.points) === 1");

const firstRender = await evaluate(`(() => ({
  total: document.querySelector('#expenseTotal').textContent.trim(),
  totalBreakdown: document.querySelector('#expenseTotalBreakdown').textContent.trim(),
  year: document.querySelector('#expenseYear').textContent.trim(),
  yearBreakdown: document.querySelector('#expenseYearBreakdown').textContent.trim(),
  pace: document.querySelector('#expenseAnnualPace').textContent.trim(),
  paceBreakdown: document.querySelector('#expenseAnnualPaceBreakdown').textContent.trim(),
  paceNote: document.querySelector('#expenseAnnualPaceNote').textContent.trim(),
  projectionInfo: {
    buttonHidden: document.querySelector('#expenseProjectionInfoButton').hidden,
    buttonExpanded: document.querySelector('#expenseProjectionInfoButton').getAttribute('aria-expanded'),
    reportOpen: document.querySelector('#expenseProjectionReport').classList.contains('is-open'),
    reportHidden: document.querySelector('#expenseProjectionReport').getAttribute('aria-hidden')
  },
  average: document.querySelector('#expenseAverageKg').textContent.trim(),
  projectionFormula: document.querySelector('#expenseProjectionFormula').textContent.trim(),
  projectionInputs: document.querySelector('#expenseProjectionInputs').textContent.trim(),
  count: document.querySelector('#expenseOrderCount').textContent.trim(),
  row: document.querySelector('#expenseOrderList').textContent.trim(),
  points: Number(document.querySelector('#expenseChart').dataset.points),
  expenseLeftAxis: document.querySelector('#expenseChart').dataset.leftAxis,
  expenseRightAxis: document.querySelector('#expenseChart').dataset.rightAxis,
  growthFoodAxisSide: document.querySelector('#growthChart').dataset.foodAxisSide
}))()`);

await evaluate("document.querySelector('#expenseProjectionInfoButton').click()");
await waitFor("document.querySelector('#expenseProjectionReport').classList.contains('is-open')");
const projectionInfoOpened = await evaluate(`(() => ({
  expanded: document.querySelector('#expenseProjectionInfoButton').getAttribute('aria-expanded'),
  reportHidden: document.querySelector('#expenseProjectionReport').getAttribute('aria-hidden')
}))()`);
await evaluate("document.querySelector('#expenseProjectionInfoButton').click()");
await waitFor("!document.querySelector('#expenseProjectionReport').classList.contains('is-open')");
const projectionInfoClosed = await evaluate(`(() => ({
  expanded: document.querySelector('#expenseProjectionInfoButton').getAttribute('aria-expanded'),
  reportHidden: document.querySelector('#expenseProjectionReport').getAttribute('aria-hidden')
}))()`);

await navigate();
await waitFor("Number(document.querySelector('#expenseChart').dataset.points) === 1");
const persisted = await evaluate(`(() => ({
  total: document.querySelector('#expenseTotal').textContent.trim(),
  orders: document.querySelectorAll('.expense-order-row').length,
  apiOrders: null
}))()`);
const apiOrders = await evaluate("(async () => (await (await fetch('/api/expenses', { cache: 'no-store' })).json()).orders.length)()");

const tooltip = await evaluate(`(() => {
  const canvas = document.querySelector('#expenseChart');
  const rect = canvas.getBoundingClientRect();
  canvas.dispatchEvent(new PointerEvent('pointermove', {
    bubbles: true,
    clientX: rect.left + Number(canvas.dataset.hoverX),
    clientY: rect.top + Number(canvas.dataset.hoverY)
  }));
  return document.querySelector('#expenseChartTooltip').textContent.trim();
})()`);
const chartClick = await evaluate(`(() => {
  const canvas = document.querySelector('#expenseChart');
  const rect = canvas.getBoundingClientRect();
  canvas.dispatchEvent(new PointerEvent('click', {
    bubbles: true,
    clientX: rect.left + Number(canvas.dataset.hoverX),
    clientY: rect.top + Number(canvas.dataset.hoverY)
  }));
  const tooltip = document.querySelector('#expenseChartTooltip');
  return {
    tooltipVisible: !tooltip.hidden,
    tooltipText: tooltip.textContent.trim(),
    editorOpen: Boolean(document.querySelector('[data-expense-editor-row]'))
  };
})()`);

await new Promise((resolve) => setTimeout(resolve, 250));
const image = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
await writeFile("output/playwright/split-growth-and-expenses.png", Buffer.from(image.data, "base64"));

const checks = {
  split: splitChart.weightTop < splitChart.weightBottom && splitChart.weightBottom < splitChart.foodTop && splitChart.foodTop < splitChart.foodBottom,
  chart: splitChart.height >= 500 && firstRender.points === 1,
  totals: firstRender.total.includes("87") && firstRender.totalBreakdown.includes("Корм 78") && firstRender.totalBreakdown.includes("доставка 9") && firstRender.yearBreakdown.includes("Корм 78") && firstRender.yearBreakdown.includes("доставка 9") && firstRender.average.includes("6,5") && firstRender.pace.includes("·") && firstRender.pace.includes("кг"),
  projection: firstRender.projectionFormula.includes("365") && firstRender.projectionInputs.includes("5%") && firstRender.paceBreakdown.includes("+") && !firstRender.paceBreakdown.includes("=") && !firstRender.paceNote.includes("кг") && !firstRender.projectionInfo.buttonHidden && firstRender.projectionInfo.buttonExpanded === "false" && !firstRender.projectionInfo.reportOpen && firstRender.projectionInfo.reportHidden === "true" && projectionInfoOpened.expanded === "true" && projectionInfoOpened.reportHidden === "false" && projectionInfoClosed.expanded === "false" && projectionInfoClosed.reportHidden === "true",
  inline: !inlineEditor.dialogPresent && inlineEditor.animated && inlineEditor.total.includes("87"),
  axes: Boolean(firstRender.expenseLeftAxis && firstRender.expenseRightAxis && firstRender.growthFoodAxisSide === "left"),
  persisted: persisted.orders === 1 && apiOrders === 1 && persisted.total.includes("87"),
  chartClick: chartClick.tooltipVisible && Boolean(chartClick.tooltipText) && !chartClick.editorOpen,
  errors: browserErrors.length === 0
};
const report = { splitChart, inlineEditor, firstRender, projectionInfoOpened, projectionInfoClosed, persisted: { ...persisted, apiOrders }, tooltip, chartClick, browserErrors, checks };
console.log(JSON.stringify(report, null, 2));
if (Object.values(checks).some((passed) => !passed)) process.exitCode = 1;

socket.close();
await fetch(`${endpoint}/json/close/${target.id}`);
