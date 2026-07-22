import test from "node:test";
import assert from "node:assert/strict";
import Module, { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function createBlobMock(initial = {}) {
  const calls = [];
  const store = new Map(Object.entries(initial).map(([pathname, body]) => [pathname, {
    body: typeof body === "string" ? body : JSON.stringify(body),
    uploadedAt: new Date("2026-07-18T12:00:00.000Z")
  }]));

  return {
    calls,
    store,
    api: {
      async get(pathname) {
        calls.push({ operation: "get", pathname });
        const entry = store.get(pathname);
        return entry
          ? { statusCode: 200, stream: new Blob([entry.body]).stream() }
          : { statusCode: 404, stream: null };
      },
      async list({ prefix = "", limit = 1000 } = {}) {
        calls.push({ operation: "list", prefix, limit });
        const blobs = [...store.entries()]
          .filter(([pathname]) => pathname.startsWith(prefix))
          .slice(0, limit)
          .map(([pathname, entry]) => ({
            pathname,
            uploadedAt: entry.uploadedAt,
            url: `https://blob.test/${encodeURIComponent(pathname)}`
          }));
        return { blobs };
      },
      async put(pathname, body) {
        calls.push({ operation: "put", pathname });
        store.set(pathname, {
          body: Buffer.isBuffer(body) ? body.toString("utf8") : String(body),
          uploadedAt: new Date()
        });
        return { pathname, url: `https://blob.test/${encodeURIComponent(pathname)}` };
      },
      async del(pathname) {
        calls.push({ operation: "del", pathname });
        store.delete(pathname);
      }
    }
  };
}

function clearProjectModule(pathname) {
  delete require.cache[require.resolve(pathname)];
}

test("Blob hot paths avoid advanced list operations after one-time migration", async () => {
  const record = { id: "2026-07-18", date: "2026-07-18", weightKg: 8, meals: [], comment: "" };
  const expense = {
    id: "order-1",
    date: "2026-07-18",
    type: "BARF",
    kilograms: 10,
    pricePerKg: 5,
    deliveryCost: 0,
    totalCost: 50
  };
  const blob = createBlobMock({
    "porschik/weights/2026-07-18T12-00-00-000Z-old.json": { schemaVersion: 2, records: [record] },
    "porschik/backups/daily/2026-07-18/old.json": { schemaVersion: 2, records: [record] },
    "porschik/expenses/2026-07-18T12-00-00-000Z-old.json": { schemaVersion: 1, orders: [expense] },
    "porschik/users.json": { emails: ["friend@example.com"] },
    "porschik/sessions/known-token.json": { email: "evgeny.drumachik@gmail.com", createdAt: "2026-07-18T12:00:00.000Z" }
  });

  const originalLoad = Module._load;
  const previousToken = process.env.BLOB_READ_WRITE_TOKEN;
  Module._load = function load(request, parent, isMain) {
    if (request === "@vercel/blob") return blob.api;
    return originalLoad.call(this, request, parent, isMain);
  };
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";

  try {
    for (const modulePath of ["../api/_weights.js", "../api/_expenses.js", "../api/_users.js", "../api/_auth.js"]) {
      clearProjectModule(modulePath);
    }
    const weights = require("../api/_weights.js");
    const expenses = require("../api/_expenses.js");
    const users = require("../api/_users.js");
    const auth = require("../api/_auth.js");

    await weights.readRecords();
    assert.equal(blob.calls.filter((call) => call.operation === "list").length, 2, "weights migration lists legacy snapshots and backups once");
    assert.ok(blob.store.has("porschik/state.json"));

    blob.calls.length = 0;
    await weights.readRecords();
    const restorePoints = await weights.listRestorePoints();
    assert.equal(blob.calls.filter((call) => call.operation === "list").length, 0);
    assert.equal(blob.calls.filter((call) => call.operation === "put").length, 0);
    assert.equal(restorePoints.length, 2);

    blob.calls.length = 0;
    await weights.writeRecords([record], { auditEvent: { action: "update", actor: "test" } });
    assert.equal(blob.calls.filter((call) => call.operation === "list").length, 0);
    assert.equal(blob.calls.filter((call) => call.operation === "put").length, 3, "first save of the day writes snapshot, daily backup and state");

    blob.calls.length = 0;
    await weights.writeRecords([record], { auditEvent: { action: "update", actor: "test" } });
    assert.equal(blob.calls.filter((call) => call.operation === "list").length, 0);
    assert.equal(blob.calls.filter((call) => call.operation === "put").length, 2, "later saves write snapshot and state only");

    blob.calls.length = 0;
    await expenses.readExpenseOrders();
    assert.equal(blob.calls.filter((call) => call.operation === "list").length, 1, "expenses migrate their legacy snapshot once");
    assert.ok(blob.store.has("porschik/expenses.json"));

    blob.calls.length = 0;
    await expenses.readExpenseOrders();
    assert.equal(blob.calls.filter((call) => call.operation === "list").length, 0);
    assert.equal(blob.calls.filter((call) => call.operation === "put").length, 0);

    blob.calls.length = 0;
    await expenses.writeExpenseOrders([expense]);
    assert.equal(blob.calls.filter((call) => call.operation === "list").length, 0);
    assert.equal(blob.calls.filter((call) => call.operation === "put").length, 2, "expense history and current state are both preserved");

    for (const pathname of [...blob.store.keys()]) {
      if (pathname === "porschik/expenses.json" || pathname.startsWith("porschik/expenses/")) blob.store.delete(pathname);
    }
    blob.calls.length = 0;
    assert.deepEqual((await expenses.readExpenseOrders()).orders, []);
    assert.equal(blob.calls.filter((call) => call.operation === "list").length, 1);
    assert.equal(blob.calls.filter((call) => call.operation === "put").length, 1, "an empty expense store is initialized once");
    blob.calls.length = 0;
    await expenses.readExpenseOrders();
    assert.equal(blob.calls.filter((call) => call.operation === "list").length, 0);
    assert.equal(blob.calls.filter((call) => call.operation === "put").length, 0);

    blob.calls.length = 0;
    assert.deepEqual(await users.readAllowedEmails(), ["friend@example.com"]);
    const session = await auth.authorizeRequest({ headers: { cookie: `${auth.REMEMBER_COOKIE_NAME}=known-token` } });
    assert.equal(session?.claims?.email, "evgeny.drumachik@gmail.com");
    assert.equal(blob.calls.filter((call) => call.operation === "list").length, 0, "users and remembered sessions use direct reads");
  } finally {
    Module._load = originalLoad;
    if (previousToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = previousToken;
  }
});
