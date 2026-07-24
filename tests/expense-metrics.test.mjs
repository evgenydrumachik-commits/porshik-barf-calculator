import test from "node:test";
import assert from "node:assert/strict";
import { calculateExpenseMetrics } from "../assets/expense-metrics.mjs";

test("year-end expense projection starts at the first order, not 1 January", () => {
  const orders = [
    { date: "2026-05-04", kilograms: 6, pricePerKg: 4.39, totalCost: 40.34 },
    { date: "2026-05-19", kilograms: 10, pricePerKg: 3.99, totalCost: 53.9 },
    { date: "2026-06-19", kilograms: 11, pricePerKg: 4.39, totalCost: 62.29 },
    { date: "2026-07-14", kilograms: 12, pricePerKg: 4.39, totalCost: 66.68 }
  ];

  const metrics = calculateExpenseMetrics(orders, "2026-07-24");

  assert.equal(metrics.year, 223.21);
  assert.equal(metrics.firstOrderDate, "2026-05-04");
  assert.ok(Math.abs(metrics.yearEndProjection - 666.88) < 0.01);
});
