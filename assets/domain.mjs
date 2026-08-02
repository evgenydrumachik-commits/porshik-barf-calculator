export const DEFAULT_FEEDING_NORMS = Object.freeze([
  Object.freeze({ date: "2026-05-01", ratio: 0.08 }),
  Object.freeze({ date: "2026-07-01", ratio: 0.06, interpolation: "step" }),
  Object.freeze({ date: "2026-07-22", ratio: 0.054 }),
  Object.freeze({ date: "2026-10-28", ratio: 0.03 })
]);

export const DOG_PROFILE = Object.freeze({
  birthDate: "2026-02-28",
  timezone: "Europe/Berlin",
  puppyRatio: 0.08,
  adultRatio: 0.03,
  adultAgeMonths: 8,
  transitionDays: 28,
  puppyMealsPerDay: 3,
  adultMealsPerDay: 2,
  targetAdultWeightKg: 12,
  transitionStartWeightRatio: 0.9,
  feedingNorms: DEFAULT_FEEDING_NORMS,
  mealCountChanges: Object.freeze([])
});

const DAY_MS = 86_400_000;

function pad(value) {
  return String(value).padStart(2, "0");
}

export function parseIsoDate(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ""));
  if (!match) {
    throw new TypeError(`Invalid ISO date: ${isoDate}`);
  }
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new TypeError(`Invalid calendar date: ${isoDate}`);
  }
  return date;
}

export function toIsoDate(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addDays(isoDate, days) {
  const date = parseIsoDate(isoDate);
  date.setUTCDate(date.getUTCDate() + Number(days));
  return toIsoDate(date);
}

export function addMonths(isoDate, months) {
  const date = parseIsoDate(isoDate);
  const originalDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + Number(months));
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(originalDay, lastDay));
  return toIsoDate(date);
}

export function daysBetween(startIso, endIso) {
  return Math.round((parseIsoDate(endIso).getTime() - parseIsoDate(startIso).getTime()) / DAY_MS);
}

export function todayInTimezone(timezone = DOG_PROFILE.timezone, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function ageOn(dateIso, birthDate = DOG_PROFILE.birthDate) {
  if (daysBetween(birthDate, dateIso) < 0) {
    return { years: 0, months: 0, days: 0 };
  }

  let years = Number(dateIso.slice(0, 4)) - Number(birthDate.slice(0, 4));
  let cursor = addMonths(birthDate, years * 12);
  if (cursor > dateIso) {
    years -= 1;
    cursor = addMonths(birthDate, years * 12);
  }

  let months = 0;
  while (months < 11 && addMonths(cursor, months + 1) <= dateIso) {
    months += 1;
  }
  cursor = addMonths(cursor, months);

  return {
    years,
    months,
    days: daysBetween(cursor, dateIso)
  };
}

function pluralRu(value, one, few, many) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function formatAge(age, language = "ru") {
  if (language === "en") {
    if (age.years > 0) {
      return `${age.years} ${age.years === 1 ? "year" : "years"} ${age.months} ${age.months === 1 ? "month" : "months"}`;
    }
    return `${age.months} ${age.months === 1 ? "month" : "months"} ${age.days} ${age.days === 1 ? "day" : "days"}`;
  }

  if (age.years > 0) {
    return `${age.years} ${pluralRu(age.years, "год", "года", "лет")} ${age.months} ${pluralRu(age.months, "месяц", "месяца", "месяцев")}`;
  }
  return `${age.months} ${pluralRu(age.months, "месяц", "месяца", "месяцев")} ${age.days} ${pluralRu(age.days, "день", "дня", "дней")}`;
}

export function feedingRatioForDate(dateIso, profile = DOG_PROFILE) {
  parseIsoDate(dateIso);
  const norms = (Array.isArray(profile.feedingNorms) && profile.feedingNorms.length
    ? profile.feedingNorms
    : DEFAULT_FEEDING_NORMS)
    .map((item) => ({
      date: String(item.date).slice(0, 10),
      ratio: Number(item.ratio),
      interpolation: item.interpolation === "step" ? "step" : "linear"
    }))
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isFinite(item.ratio))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!norms.length || dateIso < norms[0].date) {
    return {
      ratio: Number(profile.puppyRatio ?? DOG_PROFILE.puppyRatio),
      normStartDate: null,
      normEndDate: norms[0]?.date || null,
      normProgress: 0
    };
  }

  const finalNorm = norms.at(-1);
  if (dateIso >= finalNorm.date) {
    return {
      ratio: finalNorm.ratio,
      normStartDate: finalNorm.date,
      normEndDate: null,
      normProgress: 1
    };
  }

  const nextIndex = norms.findIndex((item) => item.date > dateIso);
  const start = norms[nextIndex - 1];
  const end = norms[nextIndex];
  const totalDays = Math.max(1, daysBetween(start.date, end.date));
  const normProgress = daysBetween(start.date, dateIso) / totalDays;
  return {
    ratio: end.interpolation === "step"
      ? start.ratio
      : start.ratio + (end.ratio - start.ratio) * normProgress,
    normStartDate: start.date,
    normEndDate: end.date,
    normProgress
  };
}

export function mealCountPlanForDate(dateIso, profile = DOG_PROFILE) {
  parseIsoDate(dateIso);
  const adultDate = addMonths(profile.birthDate, profile.adultAgeMonths);
  const transitionStartDate = addDays(adultDate, -profile.transitionDays);
  const ageBasedMealsPerDay = dateIso < transitionStartDate
    ? Number(profile.puppyMealsPerDay)
    : Number(profile.adultMealsPerDay);
  const changes = (Array.isArray(profile.mealCountChanges) ? profile.mealCountChanges : [])
    .map((item) => ({
      date: String(item?.date || "").slice(0, 10),
      mealsPerDay: Number(item?.mealsPerDay),
      mode: item?.mode === "automatic" ? "automatic" : "manual"
    }))
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date)
      && (item.mode === "automatic" || [2, 3].includes(item.mealsPerDay)))
    .sort((a, b) => a.date.localeCompare(b.date));
  const activeChange = changes.filter((item) => item.date <= dateIso).at(-1) || null;

  if (activeChange?.mode === "manual") {
    return {
      mealsPerDay: activeChange.mealsPerDay,
      mealCountSource: "manual",
      mealCountStartDate: activeChange.date,
      ageBasedMealsPerDay
    };
  }

  return {
    mealsPerDay: ageBasedMealsPerDay,
    mealCountSource: "automatic",
    mealCountStartDate: activeChange?.date || null,
    ageBasedMealsPerDay
  };
}

export function feedingPlanForDate(dateIso, profile = DOG_PROFILE) {
  const adultDate = addMonths(profile.birthDate, profile.adultAgeMonths);
  const transitionStartDate = addDays(adultDate, -profile.transitionDays);
  const norm = feedingRatioForDate(dateIso, profile);
  const mealCountPlan = mealCountPlanForDate(dateIso, profile);

  if (dateIso < transitionStartDate) {
    return {
      phase: "puppy",
      ...norm,
      ...mealCountPlan,
      transitionProgress: 0,
      transitionStartDate,
      adultDate
    };
  }

  if (dateIso >= adultDate) {
    return {
      phase: "adult",
      ...norm,
      ...mealCountPlan,
      transitionProgress: 1,
      transitionStartDate,
      adultDate
    };
  }

  const elapsedDays = daysBetween(transitionStartDate, dateIso);
  const transitionProgress = elapsedDays / profile.transitionDays;
  return {
    phase: "transition",
    ...norm,
    ...mealCountPlan,
    transitionProgress,
    transitionStartDate,
    adultDate
  };
}

export function recommendationFor(weightKg, dateIso, profile = DOG_PROFILE) {
  const plan = feedingPlanForDate(dateIso, profile);
  const validWeight = Number(weightKg);
  const dailyGrams = Number.isFinite(validWeight) && validWeight > 0
    ? validWeight * 1000 * plan.ratio
    : 0;

  return {
    ...plan,
    dailyGrams,
    mealGrams: dailyGrams / plan.mealsPerDay
  };
}

export function projectedFeedingPlanForWeight(weightKg, profile = DOG_PROFILE) {
  const weight = Number(weightKg);
  const targetWeightKg = profile.targetAdultWeightKg;
  const transitionStartWeightKg = targetWeightKg * profile.transitionStartWeightRatio;

  if (!Number.isFinite(weight) || weight <= transitionStartWeightKg) {
    return {
      phase: "puppy",
      ratio: profile.puppyRatio,
      transitionProgress: 0,
      transitionStartWeightKg,
      targetWeightKg
    };
  }

  if (weight >= targetWeightKg) {
    return {
      phase: "adult",
      ratio: profile.adultRatio,
      transitionProgress: 1,
      transitionStartWeightKg,
      targetWeightKg
    };
  }

  const transitionProgress = (weight - transitionStartWeightKg) / (targetWeightKg - transitionStartWeightKg);
  return {
    phase: "transition",
    ratio: profile.puppyRatio + (profile.adultRatio - profile.puppyRatio) * transitionProgress,
    transitionProgress,
    transitionStartWeightKg,
    targetWeightKg
  };
}

export function projectedBarfForWeight(weightKg, profile = DOG_PROFILE) {
  const plan = projectedFeedingPlanForWeight(weightKg, profile);
  const weight = Number(weightKg);
  return {
    ...plan,
    dailyGrams: Number.isFinite(weight) && weight > 0 ? weight * 1000 * plan.ratio : 0
  };
}

export function sortDailyRecords(records) {
  return [...records].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export function latestWeightRecord(records, onOrBefore = "9999-12-31") {
  return sortDailyRecords(records)
    .filter((record) => record.date <= onOrBefore
      && record.weightKg !== null
      && record.weightKg !== undefined
      && record.weightKg !== ""
      && Number.isFinite(Number(record.weightKg)))
    .at(-1) || null;
}

export function projectedWeightForDate(dateIso, latestWeight, profile = DOG_PROFILE) {
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
  if (dateIso <= latestWeight.date) return currentWeightKg;
  if (dateIso >= adultDate) return targetAdultWeightKg;
  const growthDays = Math.max(1, daysBetween(latestWeight.date, adultDate));
  const progress = daysBetween(latestWeight.date, dateIso) / growthDays;
  return currentWeightKg + (targetAdultWeightKg - currentWeightKg) * progress;
}

export function actualMealCount(record) {
  return (record?.meals || []).filter((meal) => !meal.skipped && Number(meal.grams) > 0).length;
}

export function actualDailyGrams(record) {
  return (record?.meals || []).reduce((sum, meal) => (
    meal.skipped ? sum : sum + (Number(meal.grams) || 0)
  ), 0);
}

export function isDailyIntakeComplete(record, profile = DOG_PROFILE) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(record?.date || ""))) return false;
  const requiredMeals = feedingPlanForDate(record.date, profile).mealsPerDay;
  const mealsBySlot = new Map((record.meals || []).map((meal) => [Number(meal.slot), meal]));

  return Array.from({ length: requiredMeals }, (_, index) => {
    const meal = mealsBySlot.get(index + 1);
    return meal && (meal.skipped || Number(meal.grams) > 0);
  }).every(Boolean);
}

export function intakeDifferencePercent(actualGrams, targetGrams) {
  const actual = Number(actualGrams);
  const target = Number(targetGrams);
  if (!Number.isFinite(actual) || !Number.isFinite(target) || target <= 0) return null;
  return ((actual - target) / target) * 100;
}

export function intakeRatioFor(actualGrams, weightKg) {
  const actual = Number(actualGrams);
  const weight = Number(weightKg);
  if (!Number.isFinite(actual) || actual < 0 || !Number.isFinite(weight) || weight <= 0) return null;
  return actual / (weight * 1000);
}
