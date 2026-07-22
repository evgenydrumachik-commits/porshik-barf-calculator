const { randomUUID } = require("crypto");
const { hasDatabase, query, storageUnavailableError } = require("./_db");

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

async function readExpenseOrders() {
  if (!hasDatabase()) return { storageReady: false, orders: [] };
  const rows = await query("SELECT expenses FROM porschik_state WHERE id = 1");
  return { storageReady: true, orders: normalizeExpenseOrders(rows[0]?.expenses || []) };
}

async function persistCurrentExpenseOrders(orders, timestamp = new Date().toISOString()) {
  const normalized = normalizeExpenseOrders(orders);
  await query(
    `INSERT INTO porschik_state (id, expenses, updated_at)
     VALUES (1, $1::jsonb, $2)
     ON CONFLICT (id) DO UPDATE SET expenses = EXCLUDED.expenses, updated_at = EXCLUDED.updated_at`,
    [JSON.stringify(normalized), timestamp]
  );
  return normalized;
}

async function writeExpenseOrders(orders) {
  if (!hasDatabase()) throw storageUnavailableError();
  const normalized = normalizeExpenseOrders(orders);
  const timestamp = new Date().toISOString();
  await query(
    "INSERT INTO porschik_expense_snapshots (id, created_at, orders) VALUES ($1, $2, $3::jsonb)",
    [randomUUID(), timestamp, JSON.stringify(normalized)]
  );
  await persistCurrentExpenseOrders(normalized, timestamp);
  return normalized;
}

module.exports = { normalizeExpenseOrder, normalizeExpenseOrders, readExpenseOrders, writeExpenseOrders };
