const { randomUUID } = require("crypto");

const CURRENT_EXPENSE_PATH = "porschik/expenses.json";
const EXPENSE_SNAPSHOT_PREFIX = "porschik/expenses/";

function hasBlobToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function finiteNumber(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const number = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(number) || number < min || number > max) {
    const error = new Error(`${label}: допустимое значение от ${min} до ${max}`);
    error.statusCode = 400;
    throw error;
  }
  return Math.round(number * 100) / 100;
}

function normalizeExpenseOrder(input = {}) {
  const date = String(input.date || "").slice(0, 10);
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    const error = new Error("Нужна корректная дата заказа");
    error.statusCode = 400;
    throw error;
  }
  const type = String(input.type || "").trim().slice(0, 40);
  if (!type) {
    const error = new Error("Укажите тип еды");
    error.statusCode = 400;
    throw error;
  }
  const kilograms = finiteNumber(input.kilograms, "Количество килограммов", { min: 0.01, max: 500 });
  const pricePerKg = finiteNumber(input.pricePerKg, "Цена за килограмм", { min: 0, max: 1000 });
  const deliveryCost = finiteNumber(input.deliveryCost ?? 0, "Стоимость доставки", { min: 0, max: 5000 });
  const description = String(input.description || "").trim().slice(0, 120);
  return {
    id: String(input.id || randomUUID()),
    date,
    type,
    description,
    kilograms,
    pricePerKg,
    deliveryCost,
    totalCost: Math.round((kilograms * pricePerKg + deliveryCost) * 100) / 100
  };
}

function normalizeExpenseOrders(orders) {
  if (!Array.isArray(orders)) return [];
  return orders.map(normalizeExpenseOrder).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

async function listExpenseSnapshots() {
  if (!hasBlobToken()) return [];
  const { list } = require("@vercel/blob");
  const result = await list({ prefix: EXPENSE_SNAPSHOT_PREFIX, limit: 1000 });
  return result.blobs
    .filter((entry) => entry.pathname.endsWith(".json"))
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
}

async function readExpenseOrders() {
  if (!hasBlobToken()) return { storageReady: false, orders: [] };
  const { get } = require("@vercel/blob");
  let blob = await get(CURRENT_EXPENSE_PATH, { access: "public", headers: { "Cache-Control": "no-store" } });
  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    const latest = (await listExpenseSnapshots())[0];
    if (!latest) {
      await persistCurrentExpenseOrders([]);
      return { storageReady: true, orders: [] };
    }
    blob = await get(latest.pathname, { access: "public", headers: { "Cache-Control": "no-store" } });
    if (!blob || blob.statusCode !== 200 || !blob.stream) return { storageReady: true, orders: [] };
    const migrated = JSON.parse(await new Response(blob.stream).text());
    const orders = normalizeExpenseOrders(migrated.orders);
    await persistCurrentExpenseOrders(orders);
    return { storageReady: true, orders };
  }
  const payload = JSON.parse(await new Response(blob.stream).text());
  return { storageReady: true, orders: normalizeExpenseOrders(payload.orders) };
}

async function persistCurrentExpenseOrders(orders, timestamp = new Date().toISOString()) {
  const { put } = require("@vercel/blob");
  const normalized = normalizeExpenseOrders(orders);
  await put(CURRENT_EXPENSE_PATH, JSON.stringify({
    schemaVersion: 1,
    updatedAt: timestamp,
    orders: normalized
  }, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: "application/json"
  });
  return normalized;
}

async function writeExpenseOrders(orders) {
  if (!hasBlobToken()) {
    const error = new Error("Vercel Blob ещё не подключён");
    error.statusCode = 503;
    throw error;
  }
  const normalized = normalizeExpenseOrders(orders);
  const { put } = require("@vercel/blob");
  const timestamp = new Date().toISOString();
  const path = `${EXPENSE_SNAPSHOT_PREFIX}${timestamp.replaceAll(":", "-")}-${randomUUID()}.json`;
  await put(path, JSON.stringify({ schemaVersion: 1, exportedAt: timestamp, orders: normalized }, null, 2), {
    access: "public",
    cacheControlMaxAge: 60,
    contentType: "application/json"
  });
  await persistCurrentExpenseOrders(normalized, timestamp);
  return normalized;
}

module.exports = { normalizeExpenseOrder, normalizeExpenseOrders, readExpenseOrders, writeExpenseOrders };
