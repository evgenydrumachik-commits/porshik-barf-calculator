let queryOverride = null;
let sqlClientPromise = null;

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

function hasDatabase() {
  return Boolean(databaseUrl());
}

function storageUnavailableError() {
  const error = new Error("Neon Postgres ещё не подключён");
  error.statusCode = 503;
  return error;
}

async function getSqlClient() {
  if (!hasDatabase()) throw storageUnavailableError();
  if (!sqlClientPromise) {
    sqlClientPromise = import("@neondatabase/serverless")
      .then(({ neon }) => neon(databaseUrl()));
  }
  return sqlClientPromise;
}

async function query(text, params = []) {
  if (queryOverride) return queryOverride(text, params);
  const sql = await getSqlClient();
  return sql.query(text, params);
}

function setQueryImplementationForTests(implementation) {
  queryOverride = implementation;
}

function resetDatabaseForTests() {
  queryOverride = null;
  sqlClientPromise = null;
}

module.exports = {
  databaseUrl,
  hasDatabase,
  query,
  resetDatabaseForTests,
  setQueryImplementationForTests,
  storageUnavailableError
};
