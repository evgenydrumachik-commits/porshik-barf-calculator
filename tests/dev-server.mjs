import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { loadDevState, saveDevState } from "./dev-state.mjs";

const require = createRequire(import.meta.url);
const { buildFullBackupPayload } = require("../api/_backup.js");
const { normalizeRecord, readRecords } = require("../api/_weights.js");
const { RECOMMENDED_FEEDING_SETTINGS, normalizeFeedingSettings } = require("../api/_profile.js");
const { normalizeExpenseOrder, normalizeExpenseOrders } = require("../api/_expenses.js");
const root = fileURLToPath(new URL("../", import.meta.url));
const port = Number(process.env.PORT || 4173);
const devAuth = process.env.DEV_AUTH === "1";
const devDataPath = process.env.DEV_DATA_PATH || join(root, ".local-data", "dev-state.json");
const seedState = {
  records: (await readRecords()).records,
  avatarUrl: "/assets/porschik.jpg",
  feedingSettings: { ...RECOMMENDED_FEEDING_SETTINGS },
  expenses: []
};
const savedState = await loadDevState(devDataPath, seedState);
let records = savedState.records.map(normalizeRecord).sort((a, b) => a.date.localeCompare(b.date));
let avatarUrl = savedState.avatarUrl;
let feedingSettings = normalizeFeedingSettings(savedState.feedingSettings);
let expenses = normalizeExpenseOrders(savedState.expenses);
let restorePoints = [];
const backupPayloads = new Map();
let snapshotSequence = 0;

async function persistState() {
  await saveDevState(devDataPath, { records, avatarUrl, feedingSettings, expenses });
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

function json(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(payload));
}

async function bodyJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function storeAutomaticSnapshot() {
  snapshotSequence += 1;
  const uploadedAt = new Date().toISOString();
  const pathname = `porschik/weights/${uploadedAt.replaceAll(":", "-")}-${snapshotSequence}.json`;
  backupPayloads.set(pathname, structuredClone(records));
  restorePoints = [{ pathname, uploadedAt, type: "snapshot" }, ...restorePoints];
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === "/api/weights") {
    if (request.method === "GET") {
      if ((url.searchParams.has("export") || url.searchParams.has("backups")) && !devAuth) {
        return json(response, 401, { error: "Нужен вход администратора" });
      }
      if (url.searchParams.has("export")) {
        const filename = `porschik-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
        response.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store"
        });
        response.end(JSON.stringify(buildFullBackupPayload({
          records,
          profile: { avatarUrl, feedingSettings, updatedAt: null },
          expenses
        }, { exportType: "manual", storageReady: true }), null, 2));
        return;
      }
      if (url.searchParams.has("backups")) return json(response, 200, { restorePoints });
      return json(response, 200, { schemaVersion: 2, records, storageReady: true });
    }
    if (!devAuth) return json(response, 401, { error: "Нужен вход администратора" });
    if (request.method === "POST") {
      try {
        const body = await bodyJson(request);
        if (body.action === "dailyBackup") {
          const uploadedAt = new Date().toISOString();
          const pathname = `porschik/backups/daily/${uploadedAt.slice(0, 10)}/${uploadedAt.replaceAll(":", "-")}.json`;
          backupPayloads.set(pathname, structuredClone(records));
          restorePoints = [{ pathname, uploadedAt, type: "backup" }, ...restorePoints.filter((point) => point.pathname !== pathname)];
          return json(response, 200, { backup: { pathname, records }, storageReady: true });
        }
        if (body.action === "restore") {
          const restored = backupPayloads.get(String(body.pathname || ""));
          if (!restored) return json(response, 400, { error: "Не выбрана доступная резервная копия" });
          records = structuredClone(restored);
          storeAutomaticSnapshot();
          await persistState();
          return json(response, 200, { records, storageReady: true });
        }
        const previous = records.find((record) => record.id === (body.replaceId || body.date) || record.date === body.date);
        const next = normalizeRecord({
          date: body.date,
          weightKg: Object.hasOwn(body, "weightKg") ? body.weightKg : previous?.weightKg,
          meals: Object.hasOwn(body, "meals") ? body.meals : previous?.meals,
          comment: Object.hasOwn(body, "comment") ? body.comment : previous?.comment
        });
        records = records.filter((record) => record.id !== next.id && record.id !== body.replaceId);
        records.push(next);
        records.sort((a, b) => a.date.localeCompare(b.date));
        storeAutomaticSnapshot();
        await persistState();
        return json(response, 200, { records, storageReady: true });
      } catch (error) {
        return json(response, 400, { error: error.message });
      }
    }
    if (request.method === "DELETE") {
      records = records.filter((record) => record.id !== url.searchParams.get("id"));
      storeAutomaticSnapshot();
      await persistState();
      return json(response, 200, { records, storageReady: true });
    }
  }
  if (url.pathname === "/api/profile") {
    if (request.method === "GET") return json(response, 200, { avatarUrl, feedingSettings, storageReady: true });
    if (!devAuth) return json(response, 401, { error: "Нужен вход администратора" });
    if (request.method === "POST") {
      try {
        const body = await bodyJson(request);
        if (body.feedingSettings) {
          feedingSettings = normalizeFeedingSettings(body.feedingSettings);
          await persistState();
          return json(response, 200, { avatarUrl, feedingSettings, storageReady: true });
        }
        if (!/^data:image\/(jpeg|png|webp);base64,/.test(String(body.avatarDataUrl || ""))) {
          return json(response, 400, { error: "Неверный формат фотографии" });
        }
        avatarUrl = body.avatarDataUrl;
        await persistState();
        return json(response, 200, { avatarUrl, feedingSettings, storageReady: true });
      } catch (error) {
        return json(response, 400, { error: error.message });
      }
    }
  }
  if (url.pathname === "/api/expenses") {
    if (request.method === "GET") return json(response, 200, { orders: expenses, storageReady: true });
    if (!devAuth) return json(response, 401, { error: "Нужен вход администратора" });
    try {
      if (request.method === "POST") {
        const body = await bodyJson(request);
        const order = normalizeExpenseOrder(body);
        const replaceId = String(body.replaceId || order.id);
        expenses = expenses.filter((item) => item.id !== replaceId && item.id !== order.id);
        expenses.push(order);
        expenses.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
        await persistState();
        return json(response, 200, { orders: expenses, storageReady: true });
      }
      if (request.method === "DELETE") {
        expenses = expenses.filter((item) => item.id !== url.searchParams.get("id"));
        await persistState();
        return json(response, 200, { orders: expenses, storageReady: true });
      }
    } catch (error) {
      return json(response, error.statusCode || 400, { error: error.message });
    }
  }
  if (url.pathname === "/api/auth/status") {
    return json(response, devAuth ? 200 : 401, devAuth
      ? { authenticated: true, isAdmin: true, email: "local-test@porschik.app" }
      : { authenticated: false });
  }
  if (url.pathname === "/api/config") return json(response, 200, { googleClientId: "", loginReady: false });
  if (url.pathname === "/api/auth/logout") return json(response, 200, { ok: true });

  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  if (pathname === "/history") pathname = "/history.html";
  if (pathname === "/admin") pathname = "/admin.html";
  const safePath = normalize(pathname).replace(/^[/\\]+/, "").replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = join(root, safePath);
  try {
    const body = await readFile(filePath);
    response.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream", "Cache-Control": "no-store" });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Porschik dev server: http://127.0.0.1:${port} (auth=${devAuth}, data=${devDataPath})`);
});
