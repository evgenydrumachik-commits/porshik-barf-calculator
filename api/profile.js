const { authorizeRequest } = require("./_auth");
const { readProfile, writeFeedingSettings, writeProfile } = require("./_profile");

module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method === "GET") {
    try {
      response.status(200).json(await readProfile());
    } catch {
      response.status(500).json({ error: "Не удалось загрузить профиль Поршика" });
    }
    return;
  }

  if (request.method === "POST") {
    const session = await authorizeRequest(request);
    if (!session) {
      response.status(401).json({ error: "Нужен вход администратора" });
      return;
    }
    try {
      const body = typeof request.body === "string" ? JSON.parse(request.body) : (request.body || {});
      if (body.feedingSettings) {
        response.status(200).json(await writeFeedingSettings(body.feedingSettings));
      } else {
        response.status(200).json(await writeProfile(body.avatarDataUrl));
      }
    } catch (error) {
      response.status(error.statusCode || 400).json({ error: error.message || "Не удалось сохранить профиль Поршика" });
    }
    return;
  }

  response.setHeader("Allow", "GET, POST");
  response.status(405).json({ error: "Method not allowed" });
};
