import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  COOKIE_NAME,
  REMEMBER_COOKIE_NAME,
  buildClearCookie,
  buildClearRememberedSessionCookie,
  buildRememberedSessionCookie,
  parseCookies
} = require("../api/_auth.js");

test("remembered-session cookie is long-lived and protected from JavaScript", () => {
  const cookie = buildRememberedSessionCookie("session-token");
  assert.match(cookie, new RegExp(`^${REMEMBER_COOKIE_NAME}=session-token;`));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Max-Age=630720000/);
});

test("logout clears both temporary and remembered authentication cookies", () => {
  assert.match(buildClearCookie(), new RegExp(`^${COOKIE_NAME}=;`));
  assert.match(buildClearRememberedSessionCookie(), new RegExp(`^${REMEMBER_COOKIE_NAME}=;`));
  assert.match(buildClearRememberedSessionCookie(), /Max-Age=0/);
});

test("cookie parsing keeps the remembered session token intact", () => {
  const cookies = parseCookies({
    headers: { cookie: `${COOKIE_NAME}=google-token; ${REMEMBER_COOKIE_NAME}=remembered-token` }
  });
  assert.equal(cookies[COOKIE_NAME], "google-token");
  assert.equal(cookies[REMEMBER_COOKIE_NAME], "remembered-token");
});
