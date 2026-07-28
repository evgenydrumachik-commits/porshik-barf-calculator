import test from "node:test";
import assert from "node:assert/strict";
import {
  DOG_PROFILE,
  actualDailyGrams,
  actualMealCount,
  addMonths,
  ageOn,
  feedingPlanForDate,
  feedingRatioForDate,
  isDailyIntakeComplete,
  latestWeightRecord,
  intakeDifferencePercent,
  intakeRatioFor,
  recommendationFor
} from "../assets/domain.mjs";

test("birth date and eight-month boundary are calendar based", () => {
  assert.equal(addMonths(DOG_PROFILE.birthDate, 8), "2026-10-28");
  assert.deepEqual(ageOn("2026-07-18"), { years: 0, months: 4, days: 20 });
});

test("feeding target stays at 8% from 1 May through 30 June, then steps to 6%", () => {
  assert.equal(feedingRatioForDate("2026-05-01").ratio, 0.08);
  assert.equal(feedingRatioForDate("2026-06-01").ratio, 0.08);
  assert.equal(feedingRatioForDate("2026-06-30").ratio, 0.08);
  assert.equal(feedingRatioForDate("2026-07-01").ratio, 0.06);
});

test("feeding target interpolates daily between dated control points", () => {
  assert.equal(feedingRatioForDate("2026-07-22").ratio, 0.054);
  assert.ok(Math.abs(feedingRatioForDate("2026-09-09").ratio - 0.042) < 1e-12);
  assert.equal(feedingRatioForDate("2026-10-28").ratio, 0.03);
  assert.equal(feedingRatioForDate("2027-01-01").ratio, 0.03);
});

test("puppy meal count lasts until the four-week age transition starts", () => {
  const before = feedingPlanForDate("2026-09-29");
  assert.equal(before.phase, "puppy");
  assert.equal(before.mealsPerDay, 3);
});

test("transition starts on 30 September with two meals", () => {
  const start = feedingPlanForDate("2026-09-30");
  assert.equal(start.phase, "transition");
  assert.equal(start.transitionStartDate, "2026-09-30");
  assert.equal(start.adultDate, "2026-10-28");
  assert.equal(start.mealsPerDay, 2);
});

test("meal transition progress remains age-based", () => {
  const halfway = feedingPlanForDate("2026-10-14");
  assert.equal(halfway.phase, "transition");
  assert.equal(halfway.transitionProgress, 0.5);
});

test("adult phase begins at eight months", () => {
  const adult = feedingPlanForDate("2026-10-28");
  assert.equal(adult.phase, "adult");
  assert.equal(adult.ratio, 0.03);
  assert.equal(adult.mealsPerDay, 2);
});

test("recommendation is calculated from current weight and phase", () => {
  const puppy = recommendationFor(8, "2026-07-18");
  assert.ok(Math.abs(puppy.dailyGrams - 441.14285714285717) < 1e-9);
  assert.equal(Math.round(puppy.mealGrams), 147);

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

test("a daily intake is complete when every scheduled meal is entered or skipped", () => {
  const date = "2026-07-26";
  assert.equal(isDailyIntakeComplete({ date, meals: [
    { slot: 1, grams: 165, skipped: false },
    { slot: 2, grams: null, skipped: true },
    { slot: 3, grams: 167, skipped: false }
  ] }), true);
  assert.equal(isDailyIntakeComplete({ date, meals: [
    { slot: 1, grams: null, skipped: true },
    { slot: 2, grams: null, skipped: true },
    { slot: 3, grams: null, skipped: true }
  ] }), true);
  assert.equal(isDailyIntakeComplete({ date, meals: [
    { slot: 1, grams: 165, skipped: false },
    { slot: 2, grams: 168, skipped: false }
  ] }), false);
});

test("the two scheduled adult meals determine a complete adult day", () => {
  assert.equal(isDailyIntakeComplete({
    date: "2026-10-28",
    meals: [
      { slot: 1, grams: null, skipped: true },
      { slot: 2, grams: 120, skipped: false }
    ]
  }), true);
});

test("daily intake difference is expressed as a percentage of the target", () => {
  assert.equal(intakeDifferencePercent(360, 400), -10);
  assert.equal(intakeDifferencePercent(440, 400), 10);
  assert.equal(intakeDifferencePercent(0, 400), -100);
  assert.equal(intakeDifferencePercent(400, 0), null);
});

test("actual feeding can be compared as a ratio of body weight", () => {
  assert.ok(Math.abs(intakeRatioFor(450, 8.3) - (450 / 8300)) < 1e-12);
  assert.equal(intakeRatioFor(450, 0), null);
});

test("feeding-only records do not replace the latest measured weight", () => {
  const latest = latestWeightRecord([
    { date: "2026-07-17", weightKg: 7.95, meals: [] },
    { date: "2026-07-18", weightKg: null, meals: [{ slot: 1, grams: 212 }] }
  ]);
  assert.equal(latest.date, "2026-07-17");
  assert.equal(latest.weightKg, 7.95);
});
