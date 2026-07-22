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
await waitFor("document.querySelector('#expenseDialog').open");
await evaluate(`(() => {
  const set = (id, value) => {
    const input = document.querySelector(id);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  set('#expenseDate', '2026-07-22');
  set('#expenseType', 'BARF');
  set('#expenseDescription', 'Browser smoke order');
  set('#expenseKilograms', '12');
  set('#expensePriceKg', '6.5');
  set('#expenseDelivery', '9');
  document.querySelector('#expenseForm').requestSubmit();
})()`);
await waitFor("!document.querySelector('#expenseDialog').open");
await waitFor("Number(document.querySelector('#expenseChart').dataset.points) === 1");

const firstRender = await evaluate(`(() => ({
  total: document.querySelector('#expenseTotal').textContent.trim(),
  year: document.querySelector('#expenseYear').textContent.trim(),
  pace: document.querySelector('#expenseAnnualPace').textContent.trim(),
  average: document.querySelector('#expenseAverageKg').textContent.trim(),
  count: document.querySelector('#expenseOrderCount').textContent.trim(),
  row: document.querySelector('#expenseOrderList').textContent.trim(),
  points: Number(document.querySelector('#expenseChart').dataset.points)
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
  canvas.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }));
  return document.querySelector('#expenseChartTooltip').textContent.trim();
})()`);

await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 3000, deviceScaleFactor: 1, mobile: false });
await new Promise((resolve) => setTimeout(resolve, 250));
const image = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
await writeFile("output/playwright/split-growth-and-expenses.png", Buffer.from(image.data, "base64"));

const report = { splitChart, firstRender, persisted: { ...persisted, apiOrders }, tooltip, browserErrors };
console.log(JSON.stringify(report, null, 2));
if (!(splitChart.weightTop < splitChart.weightBottom && splitChart.weightBottom < splitChart.foodTop && splitChart.foodTop < splitChart.foodBottom)) process.exitCode = 1;
if (splitChart.height < 500 || firstRender.points !== 1 || !firstRender.total.includes("87") || !firstRender.average.includes("6,5")) process.exitCode = 1;
if (persisted.orders !== 1 || persisted.apiOrders !== 1 || !persisted.total.includes("87")) process.exitCode = 1;
if (browserErrors.length) process.exitCode = 1;

socket.close();
await fetch(`${endpoint}/json/close/${target.id}`);
