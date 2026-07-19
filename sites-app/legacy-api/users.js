const { authorizeRequest } = require("./_auth");
const { normalizeEmail, readAllowedEmails, writeAllowedEmails } = require("./_users");

module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  const session = await authorizeRequest(request);
  if (!session || !session.isAdmin) {
    response.status(401).json({ error: "Нужен вход администратора" });
    return;
  }

  if (request.method === "GET") {
    try {
      const emails = await readAllowedEmails();
      response.status(200).json({ emails });
    } catch (error) {
      response.status(500).json({ error: "Не удалось загрузить список пользователей" });
    }
    return;
  }

  if (request.method === "POST") {
    try {
      const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
      const email = normalizeEmail((body && body.email) || "");
      const emails = await readAllowedEmails();
      if (!emails.includes(email)) {
        emails.push(email);
        await writeAllowedEmails(emails);
      }
      const saved = await readAllowedEmails();
      response.status(200).json({ emails: saved });
    } catch (error) {
      response.status(error.statusCode || 400).json({ error: error.message || "Не удалось добавить пользователя" });
    }
    return;
  }

  if (request.method === "DELETE") {
    try {
      const email = normalizeEmail(request.query.email || "");
      const emails = await readAllowedEmails();
      const filtered = emails.filter((e) => e !== email);
      await writeAllowedEmails(filtered);
      const saved = await readAllowedEmails();
      response.status(200).json({ emails: saved });
    } catch (error) {
      response.status(error.statusCode || 400).json({ error: error.message || "Не удалось удалить пользователя" });
    }
    return;
  }

  response.setHeader("Allow", "GET, POST, DELETE");
  response.status(405).json({ error: "Method not allowed" });
};
