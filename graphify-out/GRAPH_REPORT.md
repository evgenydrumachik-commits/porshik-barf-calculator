# Graph Report - Калькулятор еды для Поршика  (2026-07-29)

## Corpus Check
- 68 files · ~311,853 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 853 nodes · 1736 edges · 58 communities (45 shown, 13 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f70496ff`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]

## God Nodes (most connected - your core abstractions)
1. `t()` - 66 edges
2. `query()` - 25 edges
3. `writeRecords()` - 24 edges
4. `hasDatabase()` - 23 edges
5. `toast()` - 23 edges
6. `feedingPlanForDate()` - 22 edges
7. `updateDerivedUI()` - 22 edges
8. `formatNumber()` - 21 edges
9. `createDailyBackup()` - 20 edges
10. `drawNormChart()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `isEmailAllowed()` --calls--> `require`  [INFERRED]
  sites-app/legacy-api/_auth.js → tests/api-records.test.mjs
- `readAllowedEmails()` --calls--> `require`  [INFERRED]
  api/_users.js → tests/api-records.test.mjs
- `writeAllowedEmails()` --calls--> `require`  [INFERRED]
  api/_users.js → tests/api-records.test.mjs
- `isEmailAllowed()` --calls--> `require`  [INFERRED]
  api/_auth.js → tests/api-records.test.mjs
- `normalizeExpenseOrder()` --calls--> `randomUUID()`  [INFERRED]
  api/_expenses.js → sites-app/legacy-api/_weights.js

## Communities (58 total, 13 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (62): action, appendAuditEvent(), { authorizeRequest }, blobSafeStamp(), { buildFullBackupPayload }, buildRecordsPayload(), {
  buildRecordsPayload,
  createDailyBackup,
  listRestorePoints,
  normalizeRecord,
  readRecords,
  restoreRecordsFromPath,
  writeAuditEvent,
  writeRecords
}, {
  buildRecordsPayload,
  createDailyBackup,
  listRestorePoints,
  normalizeRecord,
  readRecords,
  restoreRecordsFromPath,
  writeRecords
} (+54 more)

### Community 1 - "Community 1"
Cohesion: 0.20
Nodes (9): redirect, statusCode, rewrite, navigationFallback, rewrite, responseOverrides, 401, 403 (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (34): 10. Состояния интерфейса, 11. Доступность и качество, 12. Критерии приёмки, 13. Обязательная проверка результата, 14. Референс для продуктового правила, 1. Цель, 2. Продуктовые принципы, 3.1. Главная страница `/` (+26 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (20): buildClearCookie(), buildClearRememberedSessionCookie(), buildRememberedSessionCookie(), buildSessionCookie(), { buildClearCookie }, shouldUseSecureCookies(), { buildClearCookie, authorizeRequest }, { buildClearCookie, buildSessionCookie, verifyGoogleIdToken, isEmailAllowed, isAdminEmail } (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.25
Nodes (7): dependencies, @neondatabase/serverless, @vercel/blob, private, scripts, migrate:neon, test

### Community 7 - "Community 7"
Cohesion: 0.13
Nodes (30): action, { authorizeRequest }, blobSafeStamp(), buildRecordsPayload(), {
  buildRecordsPayload,
  createDailyBackup,
  listRestorePoints,
  normalizeRecord,
  readRecords,
  restoreRecordsFromPath,
  writeAuditEvent,
  writeRecords
}, createDailyBackup(), ensureDailyBackup(), hasBlobToken() (+22 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (22): activeFeedingNorms(), animateNormTimelineShift(), beginNormAdd(), beginNormEdit(), cancelNormInlineEditor(), deleteNormInline(), feedingStatusLabel(), focusNormInlineEditor() (+14 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (25): dependencies, @cloudflare/vite-plugin, next, react, react-dom, react-server-dom-webpack, @vercel/blob, vinext (+17 more)

### Community 14 - "Community 14"
Cohesion: 0.10
Nodes (24): { buildClearCookie }, authorizeRequest(), buildClearCookie(), buildSessionCookie(), isAdminEmail(), isEmailAllowed(), parseCookies(), shouldUseSecureCookies() (+16 more)

### Community 21 - "Community 21"
Cohesion: 0.06
Nodes (45): addHistoryDraft(), animateExpenseOrderShift(), applyAvatar(), applyTheme(), beginExpenseEditor(), cancelExpenseInlineEditor(), chartDateAtOffset(), chartRangeEndResetPending (+37 more)

### Community 24 - "Community 24"
Cohesion: 0.10
Nodes (16): backupPayloads, { buildFullBackupPayload }, { buildRecordsPayload, normalizeRecord, readRecords }, expenses, feedingSettings, { normalizeExpenseOrder, normalizeExpenseOrders }, { normalizeRecord, readRecords }, port (+8 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (12): browserErrors, command(), evaluate(), message, navigate(), pending, report, { resolve, reject } (+4 more)

### Community 26 - "Community 26"
Cohesion: 0.05
Nodes (41): Autoscaling, Branching, Check Status Quo, code:block1 (https://neon.com/docs/llms.txt), code:bash (npx skills add neondatabase/agent-skills --skill neon-postgr), code:bash (npx -y neon@latest init --agent <agent-name>), code:typescript (import { drizzle } from "drizzle-orm/node-postgres";), code:typescript (import { drizzle } from "drizzle-orm/node-postgres";) (+33 more)

### Community 27 - "Community 27"
Cohesion: 0.09
Nodes (22): Azure Static Web Apps, Blob data layout, code:bash (npm install), code:bash (npm test), code:bash (DEV_AUTH=1 node tests/dev-server.mjs), code:bash (node tests/dev-server.mjs), code:bash (npm test), code:text (index.html                 Dashboard) (+14 more)

### Community 28 - "Community 28"
Cohesion: 0.33
Nodes (8): command(), evaluate(), message, navigate(), pending, { resolve, reject }, socket, waitFor()

### Community 29 - "Community 29"
Cohesion: 0.23
Nodes (11): browserErrors, checks, command(), evaluate(), handlers, message, navigate(), pending (+3 more)

### Community 30 - "Community 30"
Cohesion: 0.11
Nodes (36): addNormEditorPoint(), addDays(), addMonths(), ageOn(), daysBetween(), DEFAULT_FEEDING_NORMS, DOG_PROFILE, feedingPlanForDate() (+28 more)

### Community 31 - "Community 31"
Cohesion: 0.06
Nodes (33): API surface (ergonomic client), Beta services, Client configuration, code:bash (npm install @neon/sdk), code:ts (const { data: uri } = await neon.postgres.connectionString({), code:ts (await neon.snapshots.restore(projectId, snapshotId, {), code:ts (import { raw } from "@neon/sdk";), code:ts (const { data } = await raw.createProjectBranch({) (+25 more)

### Community 32 - "Community 32"
Cohesion: 0.25
Nodes (7): buildFullBackupPayload(), { DEFAULT_AVATAR_URL, normalizeFeedingSettings }, { normalizeExpenseOrders }, { normalizeRecords }, { buildFullBackupPayload }, payload, require

### Community 33 - "Community 33"
Cohesion: 0.15
Nodes (12): computedHash, computedHash, skillPath, source, sourceType, skillPath, source, sourceType (+4 more)

### Community 34 - "Community 34"
Cohesion: 0.05
Nodes (42): Architecture: how Neon fits, Branch configuration, Branch-First Dev Flow, Check Status Quo, Choosing the Right Skill, code:block1 (https://neon.com/docs/llms.txt), code:bash (npm i @neon/env), code:typescript (import { parseEnv } from "@neon/env";) (+34 more)

### Community 35 - "Community 35"
Cohesion: 0.32
Nodes (14): confirmSelectedBackupRestore(), createDailyBackupFromHistory(), deleteRecord(), deleteWeightValue(), downloadBackup(), loadRecords(), loadRestorePoints(), openAuthDialog() (+6 more)

### Community 36 - "Community 36"
Cohesion: 0.50
Nodes (3): Answer, Q: Почему после сохранения двухразового питания локальный интерфейс продолжал показывать три приема?, Source Nodes

### Community 37 - "Community 37"
Cohesion: 0.23
Nodes (16): storageUnavailableError(), { authorizeRequest }, decodeAvatarDataUrl(), DEFAULT_FEEDING_NORMS, DEFAULT_MEAL_COUNT_CHANGES, defaultProfile(), hasBlobToken(), { hasDatabase, query, storageUnavailableError } (+8 more)

### Community 38 - "Community 38"
Cohesion: 0.25
Nodes (14): authorizeRequest(), { createHash, randomBytes }, createRememberedSession(), hasBlobToken(), { hasDatabase, query }, isAdminEmail(), isEmailAllowed(), parseCookies() (+6 more)

### Community 39 - "Community 39"
Cohesion: 0.21
Nodes (12): databaseUrl(), getSqlClient(), hasDatabase(), query(), { authorizeRequest }, email, filtered, hasBlobToken() (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.18
Nodes (8): auth, blob, expense, expenses, record, require, users, weights

### Community 41 - "Community 41"
Cohesion: 0.20
Nodes (9): apiFiles, auth, calls, db, expenses, profile, records, require (+1 more)

### Community 42 - "Community 42"
Cohesion: 0.15
Nodes (27): activeDogProfile(), buildMealControls(), cancelInlineEditor(), closeGrowthQuickAdd(), discardHistoryDraft(), handleHistoryAction(), handleHistoryKeydown(), inlineEditorError() (+19 more)

### Community 44 - "Community 44"
Cohesion: 0.15
Nodes (16): chartDateRange(), colorWithAlpha(), cssColor(), dateSixMonthsLater(), drawBarfChart(), drawCanvasPill(), drawNormChart(), expenseMetrics() (+8 more)

### Community 45 - "Community 45"
Cohesion: 0.15
Nodes (29): avatarDataUrlFromFile(), comparisonDelta(), confirmRecordReplacement(), deleteExpense(), deleteExpenseInlineEditor(), drawExpenseChart(), escapeHtml(), expenseEditorValues() (+21 more)

### Community 47 - "Community 47"
Cohesion: 0.50
Nodes (3): Answer, Q: Как поддержать переход между двухразовым и трехразовым питанием без порчи истории и расчетов?, Source Nodes

### Community 48 - "Community 48"
Cohesion: 0.23
Nodes (14): { authorizeRequest }, hasBlobToken(), { hasDatabase, query, storageUnavailableError }, id, listExpenseSnapshots(), { normalizeExpenseOrder, readExpenseOrders, writeExpenseOrders }, normalizeExpenseOrders(), order (+6 more)

### Community 50 - "Community 50"
Cohesion: 0.27
Nodes (15): activeMealCountChanges(), applyTranslations(), deleteMealCountChange(), mealCountChangesWith(), openMealCountDialog(), persistFeedingNorms(), persistFeedingSettings(), renderMealCountHistory() (+7 more)

### Community 51 - "Community 51"
Cohesion: 0.17
Nodes (11): { DEFAULT_AVATAR_URL, normalizeFeedingSettings }, expenses, migratedAt, { normalizeExpenseOrders }, { normalizeRecords }, profile, records, require (+3 more)

### Community 52 - "Community 52"
Cohesion: 0.50
Nodes (3): Answer, Q: Как переставить блок актуальной нормы перед графиком, унифицировать кнопки добавления и импортировать production backup в локальную dev-базу?, Source Nodes

### Community 53 - "Community 53"
Cohesion: 0.36
Nodes (6): persistState(), loadDevState(), saveDevState(), changed, fallback, filePath

### Community 54 - "Community 54"
Cohesion: 0.29
Nodes (6): finiteNumber(), normalizeExpenseOrder(), { normalizeExpenseOrder, normalizeExpenseOrders }, order, orders, require

### Community 55 - "Community 55"
Cohesion: 0.50
Nodes (3): Answer, Q: Как реализовать переключение между двухразовым и трехразовым питанием с выбранной даты без потери истории?, Source Nodes

### Community 56 - "Community 56"
Cohesion: 0.29
Nodes (6): RECOMMENDED_FEEDING_SETTINGS, { decodeAvatarDataUrl }, decoded, normalized, { RECOMMENDED_FEEDING_SETTINGS, decodeAvatarDataUrl, normalizeFeedingSettings }, require

### Community 57 - "Community 57"
Cohesion: 0.50
Nodes (3): Answer, Q: Как унифицировать иконку редактирования режима кормления с другими кнопками редактирования?, Source Nodes

## Knowledge Gaps
- **362 isolated node(s):** `cleanUrls`, `private`, `test`, `migrate:neon`, `@neondatabase/serverless` (+357 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `randomUUID()` connect `Community 0` to `Community 48`, `Community 37`, `Community 54`, `Community 7`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `normalizeExpenseOrder()` connect `Community 54` to `Community 24`, `Community 0`, `Community 48`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `require` connect `Community 0` to `Community 38`, `Community 14`, `Community 39`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `query()` (e.g. with `readAllowedEmails()` and `writeAllowedEmails()`) actually correct?**
  _`query()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `writeRecords()` (e.g. with `hasDatabase()` and `storageUnavailableError()`) actually correct?**
  _`writeRecords()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 12 inferred relationships involving `hasDatabase()` (e.g. with `readAllowedEmails()` and `writeAllowedEmails()`) actually correct?**
  _`hasDatabase()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **What connects `cleanUrls`, `private`, `test` to the rest of the system?**
  _362 weakly-connected nodes found - possible documentation gaps or missing edges._