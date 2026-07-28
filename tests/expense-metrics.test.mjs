import test from "node:test";
import assert from "node:assert/strict";
import { calculateExpenseMetrics } from "../assets/expense-metrics.mjs";

const constantProfile = {
  birthDate: "2020-01-01",
  adultAgeMonths: 8,
  targetAdultWeightKg: 10,
  puppyRatio: 0.04,
  adultRatio: 0.04,
  puppyMealsPerDay: 2,
  adultMealsPerDay: 2,
  transitionDays: 28,
  feedingNorms: [{ date: "2020-01-01", ratio: 0.04 }]
};

test("rolling 12-month projection combines planned intake, actual intake, latest price, delivery and six-month inflation", () => {
  const orders = [
    { date: "2025-11-01", kilograms: 8, pricePerKg: 4, deliveryCost: 8, totalCost: 40 },
    { date: "2025-12-20", kilograms: 10, pricePerKg: 5, deliveryCost: 10, totalCost: 60 }
  ];
  const records = [
    { date: "2025-12-20", weightKg: 10, meals: [] },
    { date: "2025-12-31", weightKg: null, meals: [{ slot: 1, grams: 400, skipped: false }] }
  ];

  const metrics = calculateExpenseMetrics(orders, "2026-01-01", {
    records,
    profile: constantProfile
  });

  const firstPriceDays = 181;
  const inflatedPriceDays = 365 - firstPriceDays;
  const expectedFood = 0.4 * (firstPriceDays * 5 + inflatedPriceDays * 5.25);
  const expectedDelivery = 0.4 * 365 / 10 * 10;
  assert.equal(metrics.projectionEndDate, "2026-12-31");
  assert.equal(metrics.inflationDate, "2026-07-01");
  assert.equal(metrics.actualConsumptionFactor, 1);
  assert.equal(metrics.actualConsumptionDays, 1);
  assert.equal(metrics.totalFoodCost, 82);
  assert.equal(metrics.totalDeliveryCost, 18);
  assert.equal(metrics.yearFoodCost, 0);
  assert.equal(metrics.yearDeliveryCost, 0);
  assert.ok(Math.abs(metrics.projectedKilograms - 146) < 1e-9);
  assert.ok(Math.abs(metrics.projectedFoodCost - expectedFood) < 1e-9);
  assert.ok(Math.abs(metrics.projectedDeliveryCost - expectedDelivery) < 1e-9);
  assert.ok(Math.abs(metrics.rollingTwelveMonthProjection - (expectedFood + expectedDelivery)) < 1e-9);
  assert.equal(metrics.latestPriceKg, 5);
});

test("recent actual intake scales the future target instead of extrapolating money already spent", () => {
  const orders = [
    { date: "2026-05-04", kilograms: 10, pricePerKg: 5, deliveryCost: 10, totalCost: 60 }
  ];
  const records = [
    { date: "2026-07-01", weightKg: 10, meals: [] },
    { date: "2026-07-22", weightKg: null, meals: [{ slot: 1, grams: 300, skipped: false }] },
    { date: "2026-07-23", weightKg: null, meals: [{ slot: 1, grams: 300, skipped: false }] }
  ];

  const metrics = calculateExpenseMetrics(orders, "2026-07-24", {
    records,
    profile: constantProfile,
    inflationRate: 0
  });

  assert.equal(metrics.actualConsumptionFactor, 0.75);
  assert.equal(metrics.actualConsumptionDays, 2);
  assert.ok(Math.abs(metrics.plannedKilograms - 146) < 1e-9);
  assert.ok(Math.abs(metrics.projectedKilograms - 109.5) < 1e-9);
  assert.ok(Math.abs(metrics.projectedFoodCost - 547.5) < 1e-9);
  assert.ok(Math.abs(metrics.projectedDeliveryCost - 109.5) < 1e-9);
  assert.ok(Math.abs(metrics.rollingTwelveMonthProjection - 657) < 1e-9);
});
