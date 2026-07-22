# Graph Report - Калькулятор еды для Поршика  (2026-07-22)

## Corpus Check
- 51 files · ~302,773 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 550 nodes · 1153 edges · 30 communities (19 shown, 11 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2548555d`
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

## God Nodes (most connected - your core abstractions)
1. `t()` - 48 edges
2. `writeRecords()` - 18 edges
3. `formatNumber()` - 18 edges
4. `updateDerivedUI()` - 18 edges
5. `drawNormChart()` - 18 edges
6. `toast()` - 16 edges
7. `renderAll()` - 16 edges
8. `createDailyBackup()` - 15 edges
9. `renderHistoryTable()` - 15 edges
10. `Задача: принципиальный редизайн приложения «Поршик»` - 15 edges

## Surprising Connections (you probably didn't know these)
- `isEmailAllowed()` --calls--> `require`  [INFERRED]
  sites-app/legacy-api/_auth.js → tests/api-records.test.mjs
- `readAllowedEmails()` --calls--> `require`  [INFERRED]
  api/_users.js → tests/api-records.test.mjs
- `writeAllowedEmails()` --calls--> `require`  [INFERRED]
  api/_users.js → tests/api-records.test.mjs
- `isEmailAllowed()` --calls--> `require`  [INFERRED]
  api/_auth.js → tests/api-records.test.mjs
- `writeProfile()` --calls--> `randomUUID()`  [INFERRED]
  api/_profile.js → sites-app/legacy-api/_weights.js

## Communities (30 total, 11 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (54): action, appendAuditEvent(), { authorizeRequest }, blobSafeStamp(), buildRecordsPayload(), {
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
}, buildStorageState() (+46 more)

### Community 1 - "Community 1"
Cohesion: 0.20
Nodes (9): redirect, statusCode, rewrite, navigationFallback, rewrite, responseOverrides, 401, 403 (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (34): 10. Состояния интерфейса, 11. Доступность и качество, 12. Критерии приёмки, 13. Обязательная проверка результата, 14. Референс для продуктового правила, 1. Цель, 2. Продуктовые принципы, 3.1. Главная страница `/` (+26 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (46): authorizeRequest(), buildClearCookie(), buildClearRememberedSessionCookie(), buildRememberedSessionCookie(), buildSessionCookie(), createRememberedSession(), hasBlobToken(), isAdminEmail() (+38 more)

### Community 5 - "Community 5"
Cohesion: 0.33
Nodes (5): dependencies, @vercel/blob, private, scripts, test

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
Cohesion: 0.08
Nodes (53): activeDogProfile(), activeFeedingNorms(), addNormEditorPoint(), buildMealControls(), colorWithAlpha(), comparisonDelta(), cssColor(), drawBarfChart() (+45 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (25): dependencies, @cloudflare/vite-plugin, next, react, react-dom, react-server-dom-webpack, @vercel/blob, vinext (+17 more)

### Community 14 - "Community 14"
Cohesion: 0.10
Nodes (24): { buildClearCookie }, authorizeRequest(), buildClearCookie(), buildSessionCookie(), isAdminEmail(), isEmailAllowed(), parseCookies(), shouldUseSecureCookies() (+16 more)

### Community 21 - "Community 21"
Cohesion: 0.07
Nodes (80): addHistoryDraft(), applyAvatar(), applyTheme(), applyTranslations(), avatarDataUrlFromFile(), cancelInlineEditor(), confirmRecordReplacement(), confirmSelectedBackupRestore() (+72 more)

### Community 24 - "Community 24"
Cohesion: 0.09
Nodes (21): backupPayloads, { buildRecordsPayload, normalizeRecord, readRecords }, expenses, feedingSettings, { normalizeExpenseOrder, normalizeExpenseOrders }, { normalizeRecord, readRecords }, persistState(), port (+13 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (12): browserErrors, command(), evaluate(), message, navigate(), pending, report, { resolve, reject } (+4 more)

### Community 26 - "Community 26"
Cohesion: 0.18
Nodes (18): { authorizeRequest }, decodeAvatarDataUrl(), DEFAULT_FEEDING_NORMS, defaultProfile(), hasBlobToken(), normalizeFeedingSettings(), persistProfile(), { randomUUID } (+10 more)

### Community 27 - "Community 27"
Cohesion: 0.09
Nodes (21): Azure Static Web Apps, Blob data layout, code:bash (npm install), code:bash (npm test), code:bash (DEV_AUTH=1 node tests/dev-server.mjs), code:bash (node tests/dev-server.mjs), code:bash (npm test), code:text (index.html                 Dashboard) (+13 more)

### Community 28 - "Community 28"
Cohesion: 0.15
Nodes (19): { authorizeRequest }, finiteNumber(), hasBlobToken(), id, listExpenseSnapshots(), normalizeExpenseOrder(), { normalizeExpenseOrder, readExpenseOrders, writeExpenseOrders }, normalizeExpenseOrders() (+11 more)

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (10): browserErrors, command(), evaluate(), handlers, message, navigate(), pending, report (+2 more)

## Knowledge Gaps
- **210 isolated node(s):** `cleanUrls`, `private`, `test`, `@vercel/blob`, `routes` (+205 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `randomUUID()` connect `Community 0` to `Community 26`, `Community 28`, `Community 7`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `normalizeExpenseOrder()` connect `Community 28` to `Community 24`, `Community 0`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `require` connect `Community 0` to `Community 3`, `Community 14`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `writeRecords()` (e.g. with `require` and `randomUUID()`) actually correct?**
  _`writeRecords()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `cleanUrls`, `private`, `test` to the rest of the system?**
  _210 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09962406015037593 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._