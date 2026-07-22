const { createHash, randomBytes } = require("crypto");
const { hasDatabase, query } = require("./_db");

const COOKIE_NAME = "porschik_google_id_token";
const REMEMBER_COOKIE_NAME = "porschik_remembered_session";
const REMEMBER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 20;
const ALLOWED_EMAIL = process.env.ADMIN_GOOGLE_EMAIL || "evgeny.drumachik@gmail.com";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";

function parseCookies(request) {
  const cookieHeader = request.headers.cookie || "";
  return cookieHeader.split(";").reduce((acc, entry) => {
    const index = entry.indexOf("=");
    if (index === -1) {
      return acc;
    }

    const key = entry.slice(0, index).trim();
    const value = entry.slice(index + 1).trim();
    if (key) {
      acc[key] = decodeURIComponent(value);
    }
    return acc;
  }, {});
}

function shouldUseSecureCookies() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production");
}

function buildSessionCookie(token, maxAgeSeconds) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(60, Math.floor(maxAgeSeconds))}`
  ];

  if (shouldUseSecureCookies()) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function buildRememberedSessionCookie(token) {
  const parts = [
    `${REMEMBER_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${REMEMBER_SESSION_MAX_AGE_SECONDS}`
  ];

  if (shouldUseSecureCookies()) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function buildClearCookie() {
  const parts = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0"
  ];

  if (shouldUseSecureCookies()) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function buildClearRememberedSessionCookie() {
  const parts = [
    `${REMEMBER_COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0"
  ];

  if (shouldUseSecureCookies()) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function persistentSessionHash(token) {
  return createHash("sha256").update(String(token || "")).digest("hex");
}

async function createRememberedSession(email) {
  if (!hasDatabase()) {
    throw new Error("Persistent sessions require configured storage");
  }

  const token = randomBytes(32).toString("hex");
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + REMEMBER_SESSION_MAX_AGE_SECONDS * 1000);
  await query(
    "INSERT INTO porschik_sessions (token_hash, email, created_at, expires_at) VALUES ($1, $2, $3, $4)",
    [persistentSessionHash(token), email, createdAt.toISOString(), expiresAt.toISOString()]
  );
  return token;
}

async function readRememberedSession(token) {
  if (!token || !hasDatabase()) {
    return null;
  }

  const rows = await query(
    "SELECT email, created_at, expires_at FROM porschik_sessions WHERE token_hash = $1 AND expires_at > now()",
    [persistentSessionHash(token)]
  );
  if (!rows[0]?.email) return null;
  return {
    email: rows[0].email,
    createdAt: new Date(rows[0].created_at).toISOString(),
    expiresAt: new Date(rows[0].expires_at).toISOString()
  };
}

async function revokeRememberedSession(token) {
  if (!token || !hasDatabase()) {
    return;
  }

  await query("DELETE FROM porschik_sessions WHERE token_hash = $1", [persistentSessionHash(token)]);
}

async function verifyGoogleIdToken(idToken) {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) {
    throw new Error("Google token verification failed");
  }

  const claims = await response.json();

  if (claims.iss !== "accounts.google.com" && claims.iss !== "https://accounts.google.com") {
    throw new Error("Invalid issuer");
  }

  if (GOOGLE_CLIENT_ID && claims.aud !== GOOGLE_CLIENT_ID) {
    throw new Error("Invalid audience");
  }

  if (String(claims.email_verified) !== "true") {
    throw new Error("Email not verified");
  }

  return claims;
}

function isAdminEmail(email) {
  return email === ALLOWED_EMAIL;
}

async function isEmailAllowed(email) {
  if (isAdminEmail(email)) {
    return true;
  }

  try {
    const { readAllowedEmails } = require("./_users");
    const emails = await readAllowedEmails();
    return emails.includes(email);
  } catch {
    return false;
  }
}

async function authorizeRequest(request) {
  const cookies = parseCookies(request);
  const rememberedToken = cookies[REMEMBER_COOKIE_NAME];
  if (rememberedToken) {
    try {
      const rememberedSession = await readRememberedSession(rememberedToken);
      if (rememberedSession && await isEmailAllowed(rememberedSession.email)) {
        return {
          token: rememberedToken,
          claims: rememberedSession,
          isAdmin: isAdminEmail(rememberedSession.email),
          remembered: true
        };
      }
    } catch {
      // Fall through to the short-lived Google token, if it is still valid.
    }
  }

  const token = cookies[COOKIE_NAME];
  if (!token) {
    return null;
  }

  try {
    const claims = await verifyGoogleIdToken(token);
    if (!await isEmailAllowed(claims.email)) {
      return null;
    }
    return {
      token,
      claims,
      isAdmin: isAdminEmail(claims.email)
    };
  } catch (error) {
    return null;
  }
}

module.exports = {
  ALLOWED_EMAIL,
  COOKIE_NAME,
  REMEMBER_COOKIE_NAME,
  GOOGLE_CLIENT_ID,
  parseCookies,
  buildSessionCookie,
  buildRememberedSessionCookie,
  buildClearCookie,
  buildClearRememberedSessionCookie,
  createRememberedSession,
  readRememberedSession,
  revokeRememberedSession,
  isAdminEmail,
  isEmailAllowed,
  verifyGoogleIdToken,
  authorizeRequest
};
