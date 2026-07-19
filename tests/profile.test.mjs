import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { RECOMMENDED_FEEDING_SETTINGS, decodeAvatarDataUrl, normalizeFeedingSettings } = require("../api/_profile.js");

test("profile accepts supported base64 image formats", () => {
  const decoded = decodeAvatarDataUrl("data:image/jpeg;base64,/9j/2Q==");
  assert.equal(decoded.contentType, "image/jpeg");
  assert.ok(decoded.buffer.length > 0);
});

test("profile rejects unsupported image formats", () => {
  assert.throws(
    () => decodeAvatarDataUrl("data:image/gif;base64,R0lGODlhAQABAAAAACw="),
    /JPEG, PNG и WebP/
  );
});

test("feeding settings preserve breeder recommendations by default", () => {
  assert.deepEqual(normalizeFeedingSettings(), RECOMMENDED_FEEDING_SETTINGS);
});

test("feeding settings accept safe custom values", () => {
  assert.deepEqual(normalizeFeedingSettings({
    puppyRatio: 0.075,
    adultRatio: 0.032,
    transitionDays: 35,
    targetAdultWeightKg: 12.5
  }), {
    puppyRatio: 0.075,
    adultRatio: 0.032,
    transitionDays: 35,
    targetAdultWeightKg: 12.5
  });
});

test("feeding settings reject an adult ratio above the puppy ratio", () => {
  assert.throws(() => normalizeFeedingSettings({ puppyRatio: 0.03, adultRatio: 0.04 }), /выше взрослой/);
});
