const { buildClearCookie } = require("../_auth");

module.exports = function handler(request, response) {
  response.setHeader("Set-Cookie", buildClearCookie());
  response.setHeader("Cache-Control", "no-store");
  response.status(200).json({ ok: true });
};
