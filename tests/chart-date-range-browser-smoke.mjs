const endpoint = process.env.CDP_ENDPOINT || "http://127.0.0.1:9222";
const appUrl = process.env.APP_URL || "http://127.0.0.1:4173/";

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
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
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
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function navigate() {
  await command("Page.navigate", { url: appUrl });
  await waitFor("document.readyState === 'complete'");
  await waitFor("!document.querySelector('#chartLoading:not([hidden])')");
  await waitFor("Number(document.querySelector('#normChart')?.dataset.normPoints) > 100");
}

await command("Page.enable");
await command("Runtime.enable");
await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await navigate();
await evaluate(`(async () => {
  await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'range-smoke-one', date: '2026-05-01', type: 'BARF', kilograms: 4, pricePerKg: 6, deliveryCost: 2 }) });
  await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'range-smoke-two', date: '2026-07-22', type: 'BARF', kilograms: 6, pricePerKg: 6.5, deliveryCost: 3 }) });
})()`);
await navigate();

const firstRender = await evaluate(`(() => {
  localStorage.removeItem('porschik_chart_date_ranges');
  const canvasFor = { growth: '#growthChart', norm: '#normChart', expense: '#expenseChart' };
  const controls = [...document.querySelectorAll('[data-chart-range]')].map((control) => {
    const key = control.dataset.chartRange;
    const start = control.querySelector('[data-chart-range-start]');
    const end = control.querySelector('[data-chart-range-end]');
    start.value = String(Math.min(Number(end.value) - 1, Number(start.value) + 14));
    start.dispatchEvent(new Event('input', { bubbles: true }));
    start.dispatchEvent(new Event('change', { bubbles: true }));
    const beforeDrag = { start: Number(start.value), end: Number(end.value) };
    const rangeWindow = control.querySelector('[data-chart-range-window]');
    const rangeRect = rangeWindow.getBoundingClientRect();
    const pointer = (type, clientX) => rangeWindow.dispatchEvent(new PointerEvent(type, {
      bubbles: true,
      pointerId: 41,
      pointerType: 'mouse',
      button: 0,
      clientX
    }));
    pointer('pointerdown', rangeRect.left + rangeRect.width / 2);
    pointer('pointermove', rangeRect.left + rangeRect.width / 2 - Math.max(12, rangeRect.width * 0.08));
    pointer('pointerup', rangeRect.left + rangeRect.width / 2 - Math.max(12, rangeRect.width * 0.08));
    const afterDrag = { start: Number(start.value), end: Number(end.value) };
    return {
      key,
      label: control.querySelector('[data-chart-range-label]').textContent.trim(),
      labelContainsYear: /\b20\d{2}\b/.test(control.querySelector('[data-chart-range-label]').textContent),
      labelAndTrackGap: Math.round(rangeWindow.closest('.chart-date-range-track').getBoundingClientRect().left - control.querySelector('[data-chart-range-label]').getBoundingClientRect().right),
      selected: JSON.parse(localStorage.getItem('porschik_chart_date_ranges'))[key],
      canvasMinDate: document.querySelector(canvasFor[key]).dataset.minDate,
      movedTogether: afterDrag.start < beforeDrag.start
        && afterDrag.end < beforeDrag.end
        && afterDrag.end - afterDrag.start === beforeDrag.end - beforeDrag.start
    };
  });
  return {
    controls,
    chartPoints: Number(document.querySelector('#normChart').dataset.normPoints)
  };
})()`);

await navigate();
const reloaded = await evaluate(`(() => ({
  ranges: JSON.parse(localStorage.getItem('porschik_chart_date_ranges')),
  canvasDates: {
    growth: document.querySelector('#growthChart').dataset.minDate,
    norm: document.querySelector('#normChart').dataset.minDate,
    expense: document.querySelector('#expenseChart').dataset.minDate
  }
}))()`);
await evaluate(`(async () => {
  localStorage.removeItem('porschik_chart_date_ranges');
  await fetch('/api/weights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: '2027-05-02', weightKg: 12 }) });
})()`);
await navigate();
const longRangeLabel = await evaluate("document.querySelector('[data-chart-range-label=\"growth\"]')?.textContent.trim()");
await evaluate(`(async () => {
  await fetch('/api/expenses?id=range-smoke-one', { method: 'DELETE' });
  await fetch('/api/expenses?id=range-smoke-two', { method: 'DELETE' });
  await fetch('/api/weights?id=2027-05-02', { method: 'DELETE' });
})()`);
await evaluate("localStorage.removeItem('porschik_chart_date_ranges')");

console.log(JSON.stringify({ firstRender, reloaded }, null, 2));
if (firstRender.controls.length !== 3 || firstRender.controls.some((control) => !control.label)) process.exitCode = 1;
if (firstRender.controls.some((control) => control.labelContainsYear || control.labelAndTrackGap > 16)) process.exitCode = 1;
if (firstRender.controls.some((control) => !control.movedTogether)) process.exitCode = 1;
if (firstRender.controls.some((control) => control.selected.startDate !== control.canvasMinDate) || firstRender.chartPoints < 100) process.exitCode = 1;
if (firstRender.controls.some((control) => reloaded.ranges[control.key]?.startDate !== control.selected.startDate || reloaded.canvasDates[control.key] !== control.selected.startDate)) process.exitCode = 1;
if (!/\b2026\b/.test(longRangeLabel) || !/\b2027\b/.test(longRangeLabel)) process.exitCode = 1;

socket.close();
await fetch(`${endpoint}/json/close/${target.id}`);
