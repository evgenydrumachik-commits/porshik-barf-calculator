# Graph Report - Калькулятор еды для Поршика  (2026-08-02)

## Corpus Check
- 67 files · ~312,226 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 746 nodes · 1851 edges · 55 communities (44 shown, 11 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 147 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1a527404`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api/_weights.js
- staticwebapp.config.json
- toast
- api/_auth.js
- legacy-api/_weights.js
- dependencies
- .last-run.json
- sites-app/package.json
- react-dom
- vercel.json
- hooks
- AGENTS.md
- @vercel/blob
- @cloudflare/vite-plugin
- legacy-api/_auth.js
- app/route.js
- hosting.json
- next.config.mjs
- vinext
- @vitejs/plugin-react
- @vitejs/plugin-rsc
- app.mjs
- config.json
- wrangler
- dev-server.mjs
- browser-smoke.mjs
- next-env.d.ts
- Поршик: дневник роста и питания
- chart-date-range-browser-smoke.mjs
- expense-browser-smoke.mjs
- domain.mjs
- Q: Почему после сохранения двухразового питания локальный интерфейс продолжал показывать три приема?
- _profile.js
- query
- drawNormChart
- postgres-storage.test.mjs
- expense-chart-source.test.mjs
- t
- growth-chart-component.test.mjs
- Q: Как поддержать переход между двухразовым и трехразовым питанием без порчи истории и расчетов?
- expenses.js
- migrate-local-state-to-neon.mjs
- Q: Как переставить блок актуальной нормы перед графиком, унифицировать кнопки добавления и импортировать production backup в локальную dev-базу?
- Q: Как реализовать переключение между двухразовым и трехразовым питанием с выбранной даты без потери истории?
- Q: Как унифицировать иконку редактирования режима кормления с другими кнопками редактирования?
- dependencies
- wireEvents
- updateMealCountPreview
- Задача: принципиальный редизайн приложения «Поршик»
- deleteNormInline
- scripts
- next
- vite

## God Nodes (most connected - your core abstractions)
1. `t()` - 68 edges
2. `wireEvents()` - 59 edges
3. `drawNormChart()` - 28 edges
4. `query()` - 27 edges
5. `hasDatabase()` - 25 edges
6. `writeRecords()` - 25 edges
7. `formatNumber()` - 24 edges
8. `toast()` - 23 edges
9. `formatDate()` - 22 edges
10. `updateDerivedUI()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `isEmailAllowed()` --calls--> `require`  [INFERRED]
  api/_auth.js → tests/api-records.test.mjs
- `normalizeExpenseOrder()` --calls--> `randomUUID()`  [INFERRED]
  api/_expenses.js → sites-app/legacy-api/_weights.js
- `writeExpenseOrders()` --calls--> `randomUUID()`  [INFERRED]
  api/_expenses.js → sites-app/legacy-api/_weights.js
- `writeProfile()` --calls--> `randomUUID()`  [INFERRED]
  api/_profile.js → sites-app/legacy-api/_weights.js
- `readAllowedEmails()` --calls--> `require`  [INFERRED]
  api/_users.js → tests/api-records.test.mjs

## Import Cycles
- 2-file cycle: `api/_users.js -> api/users.js -> api/_users.js`
- 2-file cycle: `api/_expenses.js -> api/expenses.js -> api/_expenses.js`

## Communities (55 total, 11 thin omitted)

### Community 0 - "api/_weights.js"
Cohesion: 0.08
Nodes (70): buildFullBackupPayload(), { DEFAULT_AVATAR_URL, normalizeFeedingSettings }, { normalizeExpenseOrders }, { normalizeRecords }, action, appendAuditEvent(), { authorizeRequest }, blobSafeStamp() (+62 more)

### Community 1 - "staticwebapp.config.json"
Cohesion: 0.25
Nodes (8): redirect, statusCode, rewrite, navigationFallback, responseOverrides, 401, 403, routes

### Community 2 - "toast"
Cohesion: 0.28
Nodes (19): confirmSelectedBackupRestore(), createDailyBackupFromHistory(), deleteRecord(), deleteWeightValue(), downloadBackup(), loadRecords(), loadRestorePoints(), normalizeClientRecord() (+11 more)

### Community 3 - "api/_auth.js"
Cohesion: 0.10
Nodes (33): authorizeRequest(), buildClearCookie(), buildClearRememberedSessionCookie(), buildRememberedSessionCookie(), buildSessionCookie(), { createHash, randomBytes }, createRememberedSession(), hasBlobToken() (+25 more)

### Community 4 - "legacy-api/_weights.js"
Cohesion: 0.15
Nodes (31): action, { authorizeRequest }, blobSafeStamp(), buildRecordsPayload(), {
  buildRecordsPayload,
  createDailyBackup,
  listRestorePoints,
  normalizeRecord,
  readRecords,
  restoreRecordsFromPath,
  writeAuditEvent,
  writeRecords
}, createDailyBackup(), ensureDailyBackup(), hasBlobToken() (+23 more)

### Community 5 - "dependencies"
Cohesion: 0.20
Nodes (10): @neondatabase/serverless, dependencies, @neondatabase/serverless, private, scripts, migrate:neon, test, @neondatabase/serverless (+2 more)

### Community 7 - "sites-app/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 8 - "react-dom"
Cohesion: 0.67
Nodes (3): react-dom, react-dom, react-dom

### Community 12 - "@vercel/blob"
Cohesion: 0.67
Nodes (3): @vercel/blob, @vercel/blob, @vercel/blob

### Community 13 - "@cloudflare/vite-plugin"
Cohesion: 0.67
Nodes (3): @cloudflare/vite-plugin, @cloudflare/vite-plugin, @cloudflare/vite-plugin

### Community 14 - "legacy-api/_auth.js"
Cohesion: 0.09
Nodes (29): createLegacyResponse(), DELETE, dynamic, GET, handlers, POST, runLegacyHandler(), authorizeRequest() (+21 more)

### Community 18 - "vinext"
Cohesion: 0.67
Nodes (3): vinext, vinext, vinext

### Community 19 - "@vitejs/plugin-react"
Cohesion: 0.67
Nodes (3): @vitejs/plugin-react, @vitejs/plugin-react, @vitejs/plugin-react

### Community 20 - "@vitejs/plugin-rsc"
Cohesion: 0.67
Nodes (3): @vitejs/plugin-rsc, @vitejs/plugin-rsc, @vitejs/plugin-rsc

### Community 21 - "app.mjs"
Cohesion: 0.07
Nodes (44): animateExpenseOrderShift(), applyAvatar(), applyTheme(), avatarDataUrlFromFile(), beginExpenseEditor(), cancelInlineEditor(), chartDateAtOffset(), chartRangeEndResetPending (+36 more)

### Community 23 - "wrangler"
Cohesion: 0.67
Nodes (3): wrangler, wrangler, wrangler

### Community 24 - "dev-server.mjs"
Cohesion: 0.09
Nodes (22): backupPayloads, { buildFullBackupPayload }, { buildRecordsPayload, normalizeRecord, readRecords }, expenses, feedingSettings, { normalizeExpenseOrder, normalizeExpenseOrders }, { normalizeRecord, readRecords }, persistState() (+14 more)

### Community 25 - "browser-smoke.mjs"
Cohesion: 0.22
Nodes (12): browserErrors, command(), evaluate(), message, navigate(), pending, report, { resolve, reject } (+4 more)

### Community 27 - "Поршик: дневник роста и питания"
Cohesion: 0.10
Nodes (20): Azure Static Web Apps, Deployment, Features, Feeding model, License, Local development, Pages and routes, Postgres data layout (+12 more)

### Community 28 - "chart-date-range-browser-smoke.mjs"
Cohesion: 0.33
Nodes (8): command(), evaluate(), message, navigate(), pending, { resolve, reject }, socket, waitFor()

### Community 29 - "expense-browser-smoke.mjs"
Cohesion: 0.23
Nodes (11): browserErrors, checks, command(), evaluate(), handlers, message, navigate(), pending (+3 more)

### Community 30 - "domain.mjs"
Cohesion: 0.08
Nodes (56): activeDogProfile(), addHistoryDraft(), addNormEditorPoint(), animateNormTimelineShift(), beginNormAdd(), buildMealControls(), cssColor(), drawBarfChart() (+48 more)

### Community 36 - "Q: Почему после сохранения двухразового питания локальный интерфейс продолжал показывать три приема?"
Cohesion: 0.50
Nodes (3): Answer, Q: Почему после сохранения двухразового питания локальный интерфейс продолжал показывать три приема?, Source Nodes

### Community 37 - "_profile.js"
Cohesion: 0.16
Nodes (21): { authorizeRequest }, decodeAvatarDataUrl(), DEFAULT_FEEDING_NORMS, DEFAULT_MEAL_COUNT_CHANGES, defaultProfile(), hasBlobToken(), { hasDatabase, query, storageUnavailableError }, normalizeFeedingSettings() (+13 more)

### Community 39 - "query"
Cohesion: 0.24
Nodes (14): databaseUrl(), getSqlClient(), hasDatabase(), query(), storageUnavailableError(), { authorizeRequest }, email, filtered (+6 more)

### Community 40 - "drawNormChart"
Cohesion: 0.16
Nodes (21): chartDateRange(), colorWithAlpha(), dateSixMonthsLater(), drawCanvasPill(), drawExpenseChart(), drawNormChart(), formatChartDateRange(), formatDate() (+13 more)

### Community 41 - "postgres-storage.test.mjs"
Cohesion: 0.20
Nodes (9): apiFiles, auth, calls, db, expenses, profile, records, require (+1 more)

### Community 45 - "t"
Cohesion: 0.13
Nodes (35): comparisonDelta(), confirmRecordReplacement(), deleteExpense(), deleteExpenseInlineEditor(), escapeHtml(), expenseEditorValues(), expenseFormValues(), expenseInlineEditorMarkup() (+27 more)

### Community 47 - "Q: Как поддержать переход между двухразовым и трехразовым питанием без порчи истории и расчетов?"
Cohesion: 0.50
Nodes (3): Answer, Q: Как поддержать переход между двухразовым и трехразовым питанием без порчи истории и расчетов?, Source Nodes

### Community 48 - "expenses.js"
Cohesion: 0.17
Nodes (20): { authorizeRequest }, finiteNumber(), hasBlobToken(), { hasDatabase, query, storageUnavailableError }, id, listExpenseSnapshots(), normalizeExpenseOrder(), { normalizeExpenseOrder, readExpenseOrders, writeExpenseOrders } (+12 more)

### Community 51 - "migrate-local-state-to-neon.mjs"
Cohesion: 0.17
Nodes (11): { DEFAULT_AVATAR_URL, normalizeFeedingSettings }, expenses, migratedAt, { normalizeExpenseOrders }, { normalizeRecords }, profile, records, require (+3 more)

### Community 52 - "Q: Как переставить блок актуальной нормы перед графиком, унифицировать кнопки добавления и импортировать production backup в локальную dev-базу?"
Cohesion: 0.50
Nodes (3): Answer, Q: Как переставить блок актуальной нормы перед графиком, унифицировать кнопки добавления и импортировать production backup в локальную dev-базу?, Source Nodes

### Community 55 - "Q: Как реализовать переключение между двухразовым и трехразовым питанием с выбранной даты без потери истории?"
Cohesion: 0.50
Nodes (3): Answer, Q: Как реализовать переключение между двухразовым и трехразовым питанием с выбранной даты без потери истории?, Source Nodes

### Community 57 - "Q: Как унифицировать иконку редактирования режима кормления с другими кнопками редактирования?"
Cohesion: 0.50
Nodes (3): Answer, Q: Как унифицировать иконку редактирования режима кормления с другими кнопками редактирования?, Source Nodes

### Community 58 - "dependencies"
Cohesion: 0.27
Nodes (10): react, react-server-dom-webpack, dependencies, react, react-server-dom-webpack, @vinext/cloudflare, react, react-server-dom-webpack (+2 more)

### Community 59 - "wireEvents"
Cohesion: 0.18
Nodes (19): cancelExpenseInlineEditor(), closeGrowthQuickAdd(), mealFormValues(), nearestExpensePoint(), openGrowthQuickAdd(), openRecordDialog(), populateFeedingForm(), populateGrowthQuickAdd() (+11 more)

### Community 61 - "updateMealCountPreview"
Cohesion: 0.32
Nodes (13): activeMealCountChanges(), applyTranslations(), deleteMealCountChange(), mealCountChangesWith(), openMealCountDialog(), renderMealCountHistory(), resetMealCountToAutomatic(), saveMealCountChange() (+5 more)

### Community 63 - "Задача: принципиальный редизайн приложения «Поршик»"
Cohesion: 0.06
Nodes (34): 10. Состояния интерфейса, 11. Доступность и качество, 12. Критерии приёмки, 13. Обязательная проверка результата, 14. Референс для продуктового правила, 1. Цель, 2. Продуктовые принципы, 3.1. Главная страница `/` (+26 more)

### Community 65 - "deleteNormInline"
Cohesion: 0.31
Nodes (9): activeFeedingNorms(), beginNormEdit(), cancelNormInlineEditor(), deleteNormInline(), focusNormInlineEditor(), persistFeedingNorms(), persistFeedingSettings(), saveNormInlineEditor() (+1 more)

### Community 68 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, build:vinext, deploy:vinext, dev, dev:vinext, start, start:vinext

### Community 83 - "next"
Cohesion: 0.67
Nodes (3): next, next, next

### Community 84 - "vite"
Cohesion: 0.67
Nodes (3): vite, vite, vite

## Knowledge Gaps
- **239 isolated node(s):** `{ createHash, randomBytes }`, `{ hasDatabase, query }`, `{ normalizeExpenseOrders }`, `{ DEFAULT_AVATAR_URL, normalizeFeedingSettings }`, `{ normalizeRecords }` (+234 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `randomUUID()` connect `api/_weights.js` to `expenses.js`, `legacy-api/_weights.js`, `_profile.js`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `require` connect `api/_weights.js` to `api/_auth.js`, `legacy-api/_auth.js`, `query`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `normalizeExpenseOrder()` connect `expenses.js` to `api/_weights.js`, `dev-server.mjs`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 16 inferred relationships involving `wireEvents()` (e.g. with `addHistoryDraft()` and `beginNormAdd()`) actually correct?**
  _`wireEvents()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Are the 14 inferred relationships involving `query()` (e.g. with `_db.js` and `persistCurrentExpenseOrders()`) actually correct?**
  _`query()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `hasDatabase()` (e.g. with `_db.js` and `readExpenseOrders()`) actually correct?**
  _`hasDatabase()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `{ createHash, randomBytes }`, `{ hasDatabase, query }`, `{ normalizeExpenseOrders }` to the rest of the system?**
  _239 weakly-connected nodes found - possible documentation gaps or missing edges._