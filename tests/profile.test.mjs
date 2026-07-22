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

test("feeding settings provide the approved timeline to adulthood by default", () => {
  assert.deepEqual(normalizeFeedingSettings(), RECOMMENDED_FEEDING_SETTINGS);
});

test("feeding settings accept and sort dated norm points", () => {
  assert.deepEqual(normalizeFeedingSettings({
    feedingNorms: [
      { date: "2026-10-28", ratio: 0.03 },
      { date: "2026-07-22", ratio: 0.054 }
    ]
  }), {
    feedingNorms: [
      { date: "2026-07-22", ratio: 0.054 },
      { date: "2026-10-28", ratio: 0.03 }
    ]
  });
});

test("feeding settings preserve a step change between periods", () => {
  assert.deepEqual(normalizeFeedingSettings({
    feedingNorms: [
      { date: "2026-05-01", ratio: 0.08 },
      { date: "2026-07-01", ratio: 0.06, interpolation: "step" }
    ]
  }), {
    feedingNorms: [
      { date: "2026-05-01", ratio: 0.08 },
      { date: "2026-07-01", ratio: 0.06, interpolation: "step" }
    ]
  });
});

test("feeding settings reject duplicate dates and unsafe ratios", () => {
  assert.throws(() => normalizeFeedingSettings({ feedingNorms: [
    { date: "2026-07-22", ratio: 0.054 },
    { date: "2026-07-22", ratio: 0.05 }
  ] }), /одну дату/);
  assert.throws(() => normalizeFeedingSettings({ feedingNorms: [
    { date: "2026-07-22", ratio: 0.2 }
  ] }), /от 1% до 12%/);
});
