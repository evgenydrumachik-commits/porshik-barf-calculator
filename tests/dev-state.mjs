import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function saveDevState(filePath, state) {
  await mkdir(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  await writeFile(temporaryPath, `${JSON.stringify({ schemaVersion: 1, ...state }, null, 2)}\n`, "utf8");
  await rename(temporaryPath, filePath);
}

export async function loadDevState(filePath, fallbackState) {
  try {
    const saved = JSON.parse(await readFile(filePath, "utf8"));
    return {
      records: Array.isArray(saved.records) ? saved.records : fallbackState.records,
      avatarUrl: typeof saved.avatarUrl === "string" ? saved.avatarUrl : fallbackState.avatarUrl,
      feedingSettings: saved.feedingSettings && typeof saved.feedingSettings === "object"
        ? saved.feedingSettings
        : fallbackState.feedingSettings,
      expenses: Array.isArray(saved.expenses) ? saved.expenses : (fallbackState.expenses || [])
    };
  } catch (error) {
    if (error.code !== "ENOENT") throw new Error(`Не удалось прочитать локальные dev-данные из ${filePath}: ${error.message}`);
    await saveDevState(filePath, fallbackState);
    return structuredClone(fallbackState);
  }
}
