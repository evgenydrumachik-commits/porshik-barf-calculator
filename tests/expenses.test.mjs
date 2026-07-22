import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { normalizeExpenseOrder, normalizeExpenseOrders } = require("../api/_expenses.js");

test("expense order calculates food, delivery and total cost", () => {
  const order = normalizeExpenseOrder({
    id: "order-1",
    date: "2026-07-22",
    type: "BARF",
    kilograms: "12,5",
    pricePerKg: "4.80",
    deliveryCost: 8.5
  });
  assert.equal(order.kilograms, 12.5);
  assert.equal(order.totalCost, 68.5);
});

test("expense orders sort by date and reject invalid values", () => {
  const orders = normalizeExpenseOrders([
    { id: "b", date: "2026-08-01", type: "BARF", kilograms: 5, pricePerKg: 5, deliveryCost: 0 },
    { id: "a", date: "2026-07-01", type: "Treats", kilograms: 1, pricePerKg: 12, deliveryCost: 2 }
  ]);
  assert.deepEqual(orders.map((order) => order.id), ["a", "b"]);
  assert.throws(() => normalizeExpenseOrder({ date: "bad", type: "BARF", kilograms: 1, pricePerKg: 5 }), /дата/);
});
