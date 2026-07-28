import {
  DOG_PROFILE,
  actualDailyGrams,
  addDays,
  addMonths,
  daysBetween,
  latestWeightRecord,
  recommendationFor
} from "./domain.mjs";

const ACTUAL_LOOKBACK_DAYS = 30;
const PROJECTION_DAYS = 365;
const MEAT_INFLATION_AFTER_MONTHS = 6;
const MEAT_INFLATION_RATE = 0.05;

function actualConsumptionFactor(records, today, profile) {
  const firstIncludedDate = addDays(today, -ACTUAL_LOOKBACK_DAYS);
  const completedDays = records.filter((record) => (
    record.date >= firstIncludedDate
    && record.date < today
    && actualDailyGrams(record) > 0
  ));
  let actualGrams = 0;
  let targetGrams = 0;

  completedDays.forEach((record) => {
    const weight = latestWeightRecord(records, record.date)?.weightKg;
    const target = recommendationFor(weight, record.date, profile).dailyGrams;
    if (!target) return;
    actualGrams += actualDailyGrams(record);
    targetGrams += target;
  });

  return {
    factor: targetGrams > 0 ? actualGrams / targetGrams : 1,
    days: targetGrams > 0 ? completedDays.length : 0,
    actualGrams,
    targetGrams
  };
}

function projectedWeightForDate(date, latestWeight, profile) {
  const currentWeightKg = Number(latestWeight?.weightKg);
  if (!Number.isFinite(currentWeightKg) || currentWeightKg <= 0) return null;
  const targetAdultWeightKg = Number(profile.targetAdultWeightKg);
  const adultDate = addMonths(profile.birthDate, profile.adultAgeMonths);
  if (
    !Number.isFinite(targetAdultWeightKg)
    || targetAdultWeightKg <= 0
    || currentWeightKg >= targetAdultWeightKg
    || latestWeight.date >= adultDate
  ) {
    return currentWeightKg;
  }
  if (date <= latestWeight.date) return currentWeightKg;
  if (date >= adultDate) return targetAdultWeightKg;
  const growthDays = Math.max(1, daysBetween(latestWeight.date, adultDate));
  const progress = daysBetween(latestWeight.date, date) / growthDays;
  return currentWeightKg + (targetAdultWeightKg - currentWeightKg) * progress;
}

export function calculateExpenseMetrics(
  orders,
  today,
  {
    records = [],
    profile = DOG_PROFILE,
    inflationRate = MEAT_INFLATION_RATE
  } = {}
) {
  const total = orders.reduce((sum, order) => sum + Number(order.totalCost || 0), 0);
  const totalFoodCost = orders.reduce((sum, order) => sum + Number(order.kilograms || 0) * Number(order.pricePerKg || 0), 0);
  const totalDeliveryCost = orders.reduce((sum, order) => sum + Number(order.deliveryCost || 0), 0);
  const currentYear = Number(today.slice(0, 4));
  const completedOrders = orders
    .filter((order) => order.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const yearOrders = completedOrders.filter((order) => Number(order.date.slice(0, 4)) === currentYear);
  const year = yearOrders.reduce((sum, order) => sum + Number(order.totalCost || 0), 0);
  const yearFoodCost = yearOrders.reduce((sum, order) => sum + Number(order.kilograms || 0) * Number(order.pricePerKg || 0), 0);
  const yearDeliveryCost = yearOrders.reduce((sum, order) => sum + Number(order.deliveryCost || 0), 0);
  const kilograms = orders.reduce((sum, order) => sum + Number(order.kilograms || 0), 0);
  const foodCost = orders.reduce((sum, order) => sum + Number(order.kilograms || 0) * Number(order.pricePerKg || 0), 0);
  const latestOrder = completedOrders.at(-1) || null;
  const latestWeight = latestWeightRecord(records, today);
  const latestPriceKg = Number(latestOrder?.pricePerKg);
  const latestOrderKg = Number(latestOrder?.kilograms);
  const latestDeliveryCost = Number(latestOrder?.deliveryCost || 0);
  const inflationDate = addMonths(today, MEAT_INFLATION_AFTER_MONTHS);
  const projectionEndDate = addDays(today, PROJECTION_DAYS - 1);
  const actual = actualConsumptionFactor(records, today, profile);

  let plannedKilograms = 0;
  let projectedKilograms = 0;
  let projectedFoodCost = 0;
  let projectedStartWeightKg = null;
  let projectedEndWeightKg = null;

  if (
    latestOrder
    && latestWeight
    && Number.isFinite(latestPriceKg)
    && latestPriceKg >= 0
    && Number.isFinite(latestOrderKg)
    && latestOrderKg > 0
  ) {
    for (let day = 0; day < PROJECTION_DAYS; day += 1) {
      const date = addDays(today, day);
      const weightKg = projectedWeightForDate(date, latestWeight, profile);
      if (day === 0) projectedStartWeightKg = weightKg;
      if (day === PROJECTION_DAYS - 1) projectedEndWeightKg = weightKg;
      const plannedGrams = recommendationFor(weightKg, date, profile).dailyGrams;
      const forecastGrams = plannedGrams * actual.factor;
      const priceKg = date >= inflationDate ? latestPriceKg * (1 + inflationRate) : latestPriceKg;
      plannedKilograms += plannedGrams / 1000;
      projectedKilograms += forecastGrams / 1000;
      projectedFoodCost += forecastGrams / 1000 * priceKg;
    }
  }

  const projectedDeliveries = projectedKilograms > 0 ? projectedKilograms / latestOrderKg : 0;
  const projectedDeliveryCost = projectedDeliveries * latestDeliveryCost;
  const rollingTwelveMonthProjection = projectedKilograms > 0
    ? projectedFoodCost + projectedDeliveryCost
    : null;

  return {
    total,
    totalFoodCost,
    totalDeliveryCost,
    year,
    yearFoodCost,
    yearDeliveryCost,
    averageKg: kilograms ? foodCost / kilograms : null,
    latestPriceKg: Number.isFinite(latestPriceKg) ? latestPriceKg : null,
    rollingTwelveMonthProjection,
    projectionStartDate: today,
    projectionEndDate,
    inflationDate,
    inflationRate,
    plannedKilograms,
    projectedKilograms,
    projectedFoodCost,
    projectedDeliveryCost,
    projectedDeliveries,
    latestOrderKg: latestOrder ? latestOrderKg : null,
    latestDeliveryCost: latestOrder ? latestDeliveryCost : null,
    actualConsumptionFactor: actual.factor,
    actualConsumptionDays: actual.days,
    projectedStartWeightKg,
    projectedEndWeightKg
  };
}
