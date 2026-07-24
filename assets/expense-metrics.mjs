const DAY_MS = 86_400_000;

export function calculateExpenseMetrics(orders, today) {
  const total = orders.reduce((sum, order) => sum + Number(order.totalCost || 0), 0);
  const currentYear = Number(today.slice(0, 4));
  const completedThisYear = orders
    .filter((order) => order.date <= today && Number(order.date.slice(0, 4)) === currentYear)
    .sort((a, b) => a.date.localeCompare(b.date));
  const year = completedThisYear.reduce((sum, order) => sum + Number(order.totalCost || 0), 0);
  const firstOrderDate = completedThisYear[0]?.date || "";
  const todayTime = Date.parse(`${today}T00:00:00Z`);
  const firstOrderTime = firstOrderDate ? Date.parse(`${firstOrderDate}T00:00:00Z`) : null;
  const nextYearTime = Date.parse(`${currentYear + 1}-01-01T00:00:00Z`);
  const elapsedActiveDays = firstOrderTime === null ? 0 : Math.max(1, (todayTime - firstOrderTime) / DAY_MS);
  const remainingDays = Math.max(0, (nextYearTime - todayTime) / DAY_MS);
  const yearEndProjection = completedThisYear.length
    ? year + year / elapsedActiveDays * remainingDays
    : null;
  const kilograms = orders.reduce((sum, order) => sum + Number(order.kilograms || 0), 0);
  const foodCost = orders.reduce((sum, order) => sum + Number(order.kilograms || 0) * Number(order.pricePerKg || 0), 0);

  return {
    total,
    year,
    yearEndProjection,
    firstOrderDate,
    averageKg: kilograms ? foodCost / kilograms : null
  };
}
