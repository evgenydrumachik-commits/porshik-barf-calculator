const { authorizeRequest } = require("./_auth");
const { normalizeExpenseOrder, readExpenseOrders, writeExpenseOrders } = require("./_expenses");

module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method === "GET") {
    try {
      const result = await readExpenseOrders();
      response.status(200).json(result);
    } catch {
      response.status(500).json({ error: "Не удалось загрузить расходы" });
    }
    return;
  }

  const session = await authorizeRequest(request);
  if (!session) {
    response.status(401).json({ error: "Нужен вход администратора" });
    return;
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : (request.body || {});
    const current = await readExpenseOrders();
    if (request.method === "POST") {
      const order = normalizeExpenseOrder(body);
      const replaceId = String(body.replaceId || order.id);
      const orders = current.orders.filter((item) => item.id !== replaceId && item.id !== order.id);
      orders.push(order);
      response.status(200).json({ orders: await writeExpenseOrders(orders), storageReady: true });
      return;
    }
    if (request.method === "DELETE") {
      const id = String(request.query.id || "");
      if (!id) return response.status(400).json({ error: "Не указан ID заказа" });
      response.status(200).json({ orders: await writeExpenseOrders(current.orders.filter((item) => item.id !== id)), storageReady: true });
      return;
    }
  } catch (error) {
    response.status(error.statusCode || 400).json({ error: error.message || "Не удалось сохранить расход" });
    return;
  }

  response.setHeader("Allow", "GET, POST, DELETE");
  response.status(405).json({ error: "Method not allowed" });
};
