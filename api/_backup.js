const { normalizeExpenseOrders } = require("./_expenses");
const { DEFAULT_AVATAR_URL, normalizeFeedingSettings } = require("./_profile");
const { normalizeRecords } = require("./_weights");

const FULL_BACKUP_SCHEMA_VERSION = 3;

function buildFullBackupPayload({ records = [], profile = {}, expenses = [] }, extra = {}) {
  return {
    ...extra,
    schemaVersion: FULL_BACKUP_SCHEMA_VERSION,
    backupType: "full",
    exportedAt: new Date().toISOString(),
    records: normalizeRecords(records),
    profile: {
      avatarUrl: typeof profile.avatarUrl === "string" ? profile.avatarUrl : DEFAULT_AVATAR_URL,
      feedingSettings: normalizeFeedingSettings(profile.feedingSettings),
      updatedAt: profile.updatedAt || null
    },
    expenses: normalizeExpenseOrders(expenses)
  };
}

module.exports = { FULL_BACKUP_SCHEMA_VERSION, buildFullBackupPayload };
