const { ALLOWED_EMAIL, GOOGLE_CLIENT_ID } = require("./_auth");

module.exports = function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.status(200).json({
    allowedEmail: ALLOWED_EMAIL,
    googleClientId: GOOGLE_CLIENT_ID,
    loginReady: Boolean(GOOGLE_CLIENT_ID)
  });
};
