const COOKIE_NAME = "porschik_google_id_token";
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
  GOOGLE_CLIENT_ID,
  parseCookies,
  buildSessionCookie,
  buildClearCookie,
  isAdminEmail,
  isEmailAllowed,
  verifyGoogleIdToken,
  authorizeRequest
};
