const { buildClearCookie, buildClearRememberedSessionCookie, parseCookies, REMEMBER_COOKIE_NAME, revokeRememberedSession } = require("../_auth");

module.exports = async function handler(request, response) {
  const rememberedToken = parseCookies(request)[REMEMBER_COOKIE_NAME];
  await revokeRememberedSession(rememberedToken).catch(() => {});
  response.setHeader("Set-Cookie", [buildClearCookie(), buildClearRememberedSessionCookie()]);
  response.setHeader("Cache-Control", "no-store");
  response.status(200).json({ ok: true });
};
