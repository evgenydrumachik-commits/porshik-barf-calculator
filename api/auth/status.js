const { buildClearCookie, buildClearRememberedSessionCookie, authorizeRequest } = require("../_auth");

module.exports = async function handler(request, response) {
  const session = await authorizeRequest(request);

  if (!session) {
    response.setHeader("Set-Cookie", [buildClearCookie(), buildClearRememberedSessionCookie()]);
    response.setHeader("Cache-Control", "no-store");
    response.status(401).json({ authenticated: false });
    return;
  }

  response.setHeader("Cache-Control", "no-store");
  response.status(200).json({
    authenticated: true,
    isAdmin: session.isAdmin,
    email: session.claims.email,
    name: session.claims.name || "",
    picture: session.claims.picture || ""
  });
};
