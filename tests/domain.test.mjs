import test from "node:test";
import assert from "node:assert/strict";
import {
  DOG_PROFILE,
  actualDailyGrams,
  actualMealCount,
  addMonths,
  ageOn,
  feedingPlanForDate,
  latestWeightRecord,
  intakeDifferencePercent,
  projectedBarfForWeight,
  recommendationFor
} from "../assets/domain.mjs";

test("birth date and eight-month boundary are calendar based", () => {
  assert.equal(addMonths(DOG_PROFILE.birthDate, 8), "2026-10-28");
  assert.deepEqual(ageOn("2026-07-18"), { years: 0, months: 4, days: 20 });
});

test("puppy phase lasts until the four-week transition starts", () => {
  const before = feedingPlanForDate("2026-09-29");
  assert.equal(before.phase, "puppy");
  assert.equal(before.ratio, 0.08);
  assert.equal(before.mealsPerDay, 3);
});

test("transition starts on 30 September with two meals", () => {
  const start = feedingPlanForDate("2026-09-30");
  assert.equal(start.phase, "transition");
  assert.equal(start.transitionStartDate, "2026-09-30");
  assert.equal(start.adultDate, "2026-10-28");
  assert.equal(start.ratio, 0.08);
  assert.equal(start.mealsPerDay, 2);
});

test("transition ratio falls linearly over 28 days", () => {
  const halfway = feedingPlanForDate("2026-10-14");
  assert.equal(halfway.phase, "transition");
  assert.equal(halfway.transitionProgress, 0.5);
  assert.equal(halfway.ratio, 0.055);
});

test("adult phase begins at eight months", () => {
  const adult = feedingPlanForDate("2026-10-28");
  assert.equal(adult.phase, "adult");
  assert.equal(adult.ratio, 0.03);
  assert.equal(adult.mealsPerDay, 2);
});

test("recommendation is calculated from current weight and phase", () => {
  const puppy = recommendationFor(8, "2026-07-18");
  assert.equal(puppy.dailyGrams, 640);
  assert.equal(Math.round(puppy.mealGrams), 213);

  const adult = recommendationFor(8, "2026-10-28");
  assert.equal(adult.dailyGrams, 240);
  assert.equal(adult.mealGrams, 120);
});

test("actual intake ignores skipped meals", () => {
  const record = {
    meals: [
      { slot: 1, grams: 210, skipped: false },
      { slot: 2, grams: null, skipped: true },
      { slot: 3, grams: 195, skipped: false }
    ]
  };
  assert.equal(actualMealCount(record), 2);
  assert.equal(actualDailyGrams(record), 405);
});

test("daily intake difference is expressed as a percentage of the target", () => {
  assert.equal(intakeDifferencePercent(360, 400), -10);
  assert.equal(intakeDifferencePercent(440, 400), 10);
  assert.equal(intakeDifferencePercent(0, 400), -100);
  assert.equal(intakeDifferencePercent(400, 0), null);
});

test("feeding-only records do not replace the latest measured weight", () => {
  const latest = latestWeightRecord([
    { date: "2026-07-17", weightKg: 7.95, meals: [] },
    { date: "2026-07-18", weightKg: null, meals: [{ slot: 1, grams: 212 }] }
  ]);
  assert.equal(latest.date, "2026-07-17");
  assert.equal(latest.weightKg, 7.95);
});

test("BARF-by-weight projection includes a four-week transition to target weight", () => {
  const puppy = projectedBarfForWeight(10.8);
  assert.equal(puppy.phase, "puppy");
  assert.equal(puppy.ratio, 0.08);

  const halfway = projectedBarfForWeight(11.4);
  assert.equal(halfway.phase, "transition");
  assert.equal(halfway.transitionProgress, 0.5);
  assert.equal(halfway.ratio, 0.055);

  const adult = projectedBarfForWeight(12);
  assert.equal(adult.phase, "adult");
  assert.equal(adult.ratio, 0.03);
  assert.equal(adult.dailyGrams, 360);
});
