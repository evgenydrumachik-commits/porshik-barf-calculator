const {
  buildClearCookie,
  buildClearRememberedSessionCookie,
  buildRememberedSessionCookie,
  buildSessionCookie,
  createRememberedSession,
  verifyGoogleIdToken,
  isEmailAllowed,
  isAdminEmail
} = require("../_auth");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  let credential = "";
  let remember = false;
  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
    credential = body && typeof body.credential === "string" ? body.credential : "";
    remember = Boolean(body && body.remember);
  } catch {
    credential = "";
  }

  if (!credential) {
    response.status(400).json({ error: "Missing credential" });
    return;
  }

  try {
    const claims = await verifyGoogleIdToken(credential);
    if (!await isEmailAllowed(claims.email)) {
      throw new Error("Account not allowed");
    }
    const cookies = [buildClearCookie(), buildClearRememberedSessionCookie()];
    if (remember) {
      const rememberedSession = await createRememberedSession(claims.email);
      cookies[1] = buildRememberedSessionCookie(rememberedSession);
    } else {
      const expiresAt = Number.parseInt(claims.exp, 10) * 1000;
      const ttlSeconds = Math.max(60, Math.min(60 * 60 * 24 * 7, Math.floor((expiresAt - Date.now()) / 1000)));
      cookies[0] = buildSessionCookie(credential, ttlSeconds);
    }

    response.setHeader("Set-Cookie", cookies);
    response.setHeader("Cache-Control", "no-store");
    response.status(200).json({
      authenticated: true,
      isAdmin: isAdminEmail(claims.email),
      email: claims.email,
      name: claims.name || "",
      picture: claims.picture || ""
    });
  } catch (error) {
    response.setHeader("Set-Cookie", [buildClearCookie(), buildClearRememberedSessionCookie()]);
    response.status(401).json({
      error: "Google account is not allowed"
    });
  }
};
