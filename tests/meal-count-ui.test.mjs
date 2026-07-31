import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, app, styles] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../assets/app.mjs", import.meta.url), "utf8"),
  readFile(new URL("../assets/app.css", import.meta.url), "utf8")
]);

test("dashboard exposes an authenticated dated two-or-three-meal editor", () => {
  assert.match(html, /class="edit-icon-button meal-count-edit-button" id="mealCountEditButton"/);
  assert.match(html, /id="mealCountEditButton"[^>]*><svg viewBox="0 0 24 24"/);
  assert.match(html, /id="mealCountDialog"/);
  assert.match(html, /id="mealCountDate" type="date"/);
  assert.match(html, /name="mealsPerDay" value="2"/);
  assert.match(html, /name="mealsPerDay" value="3"/);
  assert.match(html, /id="mealCountAutoButton"/);
  assert.match(html, /id="mealCountHistory"/);
});

test("all explicit edit controls share the same SVG icon button", () => {
  assert.match(app, /class="edit-icon-button" type="button" data-edit-inline-norm=/);
  assert.match(app, /class="edit-icon-button" type="button" data-edit-expense=/);
  assert.match(styles, /\.edit-icon-button \{/);
});

test("meal-count UI persists a dated history without dropping feeding norms", () => {
  assert.match(app, /function mealCountChangesWith\(change\)/);
  assert.match(app, /persistFeedingSettings\(\{\s*mealCountChanges:/);
  assert.match(app, /feedingSettings = \{\s*\.\.\.state\.feedingSettings,\s*\.\.\.patch/s);
  assert.match(app, /const count = Math\.max\(plan\.mealsPerDay, existingMax\)/);
  assert.match(app, /meal-extra-label/);
  assert.match(app, /slot > plannedMeals && !hasSavedMeal/);
  assert.match(app, /inline\.notPlannedMeal/);
});

test("meal-count editor has responsive visual controls and a history list", () => {
  assert.match(styles, /\.meal-count-options/);
  assert.match(styles, /\.meal-count-preview/);
  assert.match(styles, /\.meal-count-history/);
  assert.match(styles, /\.meal-not-planned/);
});
