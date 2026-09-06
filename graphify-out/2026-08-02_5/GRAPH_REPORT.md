# Graph Report - Калькулятор еды для Поршика  (2026-08-02)

## Corpus Check
- 69 files · ~312,443 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1250 nodes · 3250 edges · 85 communities (68 shown, 17 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 273 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f63c3ea2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_api_weights.js|api/_weights.js]]
- [[_COMMUNITY_staticwebapp.config.json|staticwebapp.config.json]]
- [[_COMMUNITY_toast|toast]]
- [[_COMMUNITY_api_auth.js|api/_auth.js]]
- [[_COMMUNITY_legacy-api_weights.js|legacy-api/_weights.js]]
- [[_COMMUNITY_dependencies|dependencies]]
- [[_COMMUNITY_.last-run.json|.last-run.json]]
- [[_COMMUNITY_sites-apppackage.json|sites-app/package.json]]
- [[_COMMUNITY_react-dom|react-dom]]
- [[_COMMUNITY_vercel.json|vercel.json]]
- [[_COMMUNITY_hooks|hooks]]
- [[_COMMUNITY_AGENTS|AGENTS.md]]
- [[_COMMUNITY_@vercelblob|@vercel/blob]]
- [[_COMMUNITY_@cloudflarevite-plugin|@cloudflare/vite-plugin]]
- [[_COMMUNITY_legacy-api_auth.js|legacy-api/_auth.js]]
- [[_COMMUNITY_approute.js|app/route.js]]
- [[_COMMUNITY_hosting.json|hosting.json]]
- [[_COMMUNITY_next.config.mjs|next.config.mjs]]
- [[_COMMUNITY_vinext|vinext]]
- [[_COMMUNITY_@vitejsplugin-react|@vitejs/plugin-react]]
- [[_COMMUNITY_@vitejsplugin-rsc|@vitejs/plugin-rsc]]
- [[_COMMUNITY_app.mjs|app.mjs]]
- [[_COMMUNITY_config.json|config.json]]
- [[_COMMUNITY_wrangler|wrangler]]
- [[_COMMUNITY_dev-server.mjs|dev-server.mjs]]
- [[_COMMUNITY_browser-smoke.mjs|browser-smoke.mjs]]
- [[_COMMUNITY_next-env.d.ts|next-env.d.ts]]
- [[_COMMUNITY_Поршик дневник роста и питания|Поршик: дневник роста и питания]]
- [[_COMMUNITY_chart-date-range-browser-smoke.mjs|chart-date-range-browser-smoke.mjs]]
- [[_COMMUNITY_expense-browser-smoke.mjs|expense-browser-smoke.mjs]]
- [[_COMMUNITY_domain.mjs|domain.mjs]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Q Почему после сохранения двухразового питания локальный интерфейс продолжал показывать три приема|Q: Почему после сохранения двухразового питания локальный интерфейс продолжал показывать три приема?]]
- [[_COMMUNITY__profile.js|_profile.js]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_query|query]]
- [[_COMMUNITY_drawNormChart|drawNormChart]]
- [[_COMMUNITY_postgres-storage.test.mjs|postgres-storage.test.mjs]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_expense-chart-source.test.mjs|expense-chart-source.test.mjs]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_t|t]]
- [[_COMMUNITY_growth-chart-component.test.mjs|growth-chart-component.test.mjs]]
- [[_COMMUNITY_Q Как поддержать переход между двухразовым и трехразовым питанием без порчи истории и расчетов|Q: Как поддержать переход между двухразовым и трехразовым питанием без порчи истории и расчетов?]]
- [[_COMMUNITY_expenses.js|expenses.js]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_migrate-local-state-to-neon.mjs|migrate-local-state-to-neon.mjs]]
- [[_COMMUNITY_Q Как переставить блок актуальной нормы перед графиком, унифицировать кнопки добавления и импортировать production backup в локальную dev-базу|Q: Как переставить блок актуальной нормы перед графиком, унифицировать кнопки добавления и импортировать production backup в локальную dev-базу?]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Q Как реализовать переключение между двухразовым и трехразовым питанием с выбранной даты без потери истории|Q: Как реализовать переключение между двухразовым и трехразовым питанием с выбранной даты без потери истории?]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Q Как унифицировать иконку редактирования режима кормления с другими кнопками редактирования|Q: Как унифицировать иконку редактирования режима кормления с другими кнопками редактирования?]]
- [[_COMMUNITY_dependencies|dependencies]]
- [[_COMMUNITY_wireEvents|wireEvents]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_updateMealCountPreview|updateMealCountPreview]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Задача принципиальный редизайн приложения «Поршик»|Задача: принципиальный редизайн приложения «Поршик»]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_deleteNormInline|deleteNormInline]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_scripts|scripts]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_next|next]]
- [[_COMMUNITY_vite|vite]]

## God Nodes (most connected - your core abstractions)
1. `api/_weights.js` - 73 edges
2. `t()` - 68 edges
3. `wireEvents()` - 60 edges
4. `wireEvents()` - 59 edges
5. `t()` - 56 edges
6. `drawNormChart()` - 36 edges
7. `legacy-api/_weights.js` - 35 edges
8. `api/_auth.js` - 33 edges
9. `feedingPlanForDate()` - 28 edges
10. `query()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `normalizeExpenseOrder()` --calls--> `randomUUID()`  [INFERRED]
  api/_expenses.js → sites-app/legacy-api/_weights.js
- `writeExpenseOrders()` --calls--> `randomUUID()`  [INFERRED]
  api/_expenses.js → sites-app/legacy-api/_weights.js
- `isEmailAllowed()` --calls--> `require`  [INFERRED]
  api/_auth.js → tests/api-records.test.mjs
- `normalizeExpenseOrder()` --calls--> `randomUUID()`  [INFERRED]
  api/_expenses.js → sites-app/legacy-api/_weights.js
- `writeExpenseOrders()` --calls--> `randomUUID()`  [INFERRED]
  api/_expenses.js → sites-app/legacy-api/_weights.js

## Communities (85 total, 17 thin omitted)

### Community 0 - "api/_weights.js"
Cohesion: 0.09
Nodes (34): action, { authorizeRequest }, { buildFullBackupPayload }, {
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
}, {
  createDailyBackup,
  listRestorePoints,
  normalizeRecord,
  readRecords,
  restoreRecordsFromPath,
  writeRecords
}, { hasDatabase, query, storageUnavailableError }, hasOwn() (+26 more)

### Community 1 - "staticwebapp.config.json"
Cohesion: 0.25
Nodes (8): redirect, statusCode, rewrite, navigationFallback, responseOverrides, 401, 403, routes

### Community 2 - "toast"
Cohesion: 0.12
Nodes (47): applyAvatar(), applyTheme(), avatarDataUrlFromFile(), confirmSelectedBackupRestore(), createDailyBackupFromHistory(), deleteExpense(), deleteExpenseInlineEditor(), deleteRecord() (+39 more)

### Community 3 - "api/_auth.js"
Cohesion: 0.10
Nodes (38): api/_auth.js, authorizeRequest(), buildClearCookie(), buildClearRememberedSessionCookie(), buildRememberedSessionCookie(), buildSessionCookie(), { createHash, randomBytes }, createRememberedSession() (+30 more)

### Community 4 - "legacy-api/_weights.js"
Cohesion: 0.06
Nodes (61): animateExpenseOrderShift(), applyAvatar(), applyTheme(), avatarDataUrlFromFile(), beginExpenseEditor(), cancelExpenseInlineEditor(), chartDateAtOffset(), chartDateRange() (+53 more)

### Community 5 - "dependencies"
Cohesion: 0.12
Nodes (15): @neondatabase/serverless, dependencies, @neondatabase/serverless, private, scripts, migrate:neon, test, dependencies (+7 more)

### Community 7 - "sites-app/package.json"
Cohesion: 0.09
Nodes (41): authorizeRequest(), buildClearCookie(), buildSessionCookie(), isAdminEmail(), isEmailAllowed(), { buildClearCookie }, parseCookies(), shouldUseSecureCookies() (+33 more)

### Community 8 - "react-dom"
Cohesion: 0.67
Nodes (3): react-dom, react-dom, react-dom

### Community 12 - "@vercel/blob"
Cohesion: 0.67
Nodes (3): @vercel/blob, @vercel/blob, @vercel/blob

### Community 13 - "@cloudflare/vite-plugin"
Cohesion: 0.21
Nodes (19): confirmSelectedBackupRestore(), deleteExpenseInlineEditor(), deleteRecord(), deleteWeightValue(), downloadBackup(), loadExpenses(), loadRecords(), loadRestorePoints() (+11 more)

### Community 14 - "legacy-api/_auth.js"
Cohesion: 0.06
Nodes (70): [...path]/route.js, createLegacyResponse(), DELETE, dynamic, GET, handlers, POST, runLegacyHandler() (+62 more)

### Community 18 - "vinext"
Cohesion: 0.67
Nodes (3): vinext, vinext, vinext

### Community 19 - "@vitejs/plugin-react"
Cohesion: 0.29
Nodes (7): react, react, @vitejs/plugin-react, dependencies, react, @vitejs/plugin-react, @vitejs/plugin-react

### Community 20 - "@vitejs/plugin-rsc"
Cohesion: 0.11
Nodes (36): query(), { authorizeRequest }, { buildFullBackupPayload }, buildRecordsPayload(), createDailyBackup(), {
  createDailyBackup,
  listRestorePoints,
  normalizeRecord,
  readRecords,
  restoreRecordsFromPath,
  writeRecords
}, ensureDailyBackup(), { hasDatabase, query, storageUnavailableError } (+28 more)

### Community 21 - "app.mjs"
Cohesion: 0.07
Nodes (45): addHistoryDraft(), animateExpenseOrderShift(), beginExpenseEditor(), cancelExpenseInlineEditor(), chartDateAtOffset(), chartRangeEndResetPending, expenseChartPoints, expenseEditorValues() (+37 more)

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
Cohesion: 0.13
Nodes (44): activeDogProfile(), addNormEditorPoint(), buildMealControls(), drawNormChart(), expenseMetrics(), renderGrowthQuickRow(), renderHistoryTable(), updateFeedingSummary() (+36 more)

### Community 33 - "Community 33"
Cohesion: 0.16
Nodes (33): buildMealControls(), drawNormChart(), normChartAxisValue(), renderGrowthQuickRow(), syncNormChartAxisToggle(), updateFeedingSummary(), actualDailyGrams(), actualMealCount() (+25 more)

### Community 34 - "Community 34"
Cohesion: 0.22
Nodes (31): appendAuditEvent(), blobSafeStamp(), buildRecordsPayload(), buildStorageState(), createDailyBackup(), ensureDailyBackup(), hasBlobToken(), hasDailyBackup() (+23 more)

### Community 35 - "Community 35"
Cohesion: 0.16
Nodes (22): authorizeRequest(), buildClearCookie(), buildClearRememberedSessionCookie(), buildRememberedSessionCookie(), buildSessionCookie(), { createHash, randomBytes }, createRememberedSession(), { hasDatabase, query } (+14 more)

### Community 36 - "Q: Почему после сохранения двухразового питания локальный интерфейс продолжал показывать три приема?"
Cohesion: 0.29
Nodes (6): Answer, Q: Почему после сохранения двухразового питания локальный интерфейс продолжал показывать три приема?, Source Nodes, Answer, Q: Почему после сохранения двухразового питания локальный интерфейс продолжал показывать три приема?, Source Nodes

### Community 37 - "_profile.js"
Cohesion: 0.16
Nodes (21): { authorizeRequest }, decodeAvatarDataUrl(), DEFAULT_FEEDING_NORMS, DEFAULT_MEAL_COUNT_CHANGES, defaultProfile(), hasBlobToken(), { hasDatabase, query, storageUnavailableError }, normalizeFeedingSettings() (+13 more)

### Community 38 - "Community 38"
Cohesion: 0.11
Nodes (18): backupPayloads, { buildFullBackupPayload }, expenses, feedingSettings, { normalizeExpenseOrder, normalizeExpenseOrders }, { normalizeRecord, readRecords }, persistState(), port (+10 more)

### Community 39 - "query"
Cohesion: 0.35
Nodes (4): colorWithAlpha(), cssColor(), drawCanvasPill(), GrowthChart

### Community 40 - "drawNormChart"
Cohesion: 0.19
Nodes (14): chartDateRange(), colorWithAlpha(), cssColor(), dateSixMonthsLater(), drawBarfChart(), drawCanvasPill(), drawExpenseChart(), formatChartDateRange() (+6 more)

### Community 41 - "postgres-storage.test.mjs"
Cohesion: 0.20
Nodes (9): apiFiles, auth, calls, db, expenses, profile, records, require (+1 more)

### Community 42 - "Community 42"
Cohesion: 0.27
Nodes (15): activeDogProfile(), activeMealCountChanges(), applyTranslations(), deleteMealCountChange(), expenseMetrics(), mealCountChangesWith(), openMealCountDialog(), renderMealCountHistory() (+7 more)

### Community 44 - "Community 44"
Cohesion: 0.21
Nodes (26): comparisonDelta(), confirmRecordReplacement(), drawExpenseChart(), escapeHtml(), expenseInlineEditorMarkup(), expenseTypeOptions(), feedingStatusLabel(), formatCurrency() (+18 more)

### Community 45 - "t"
Cohesion: 0.19
Nodes (19): comparisonDelta(), escapeHtml(), feedingStatusLabel(), formatNormChartValue(), formatNumber(), formatRatio(), handleNormChartPointer(), hideNormTooltip() (+11 more)

### Community 47 - "Q: Как поддержать переход между двухразовым и трехразовым питанием без порчи истории и расчетов?"
Cohesion: 0.29
Nodes (6): Answer, Q: Как поддержать переход между двухразовым и трехразовым питанием без порчи истории и расчетов?, Source Nodes, Answer, Q: Как поддержать переход между двухразовым и трехразовым питанием без порчи истории и расчетов?, Source Nodes

### Community 48 - "expenses.js"
Cohesion: 0.11
Nodes (36): databaseUrl(), getSqlClient(), hasDatabase(), query(), storageUnavailableError(), { authorizeRequest }, finiteNumber(), hasBlobToken() (+28 more)

### Community 49 - "Community 49"
Cohesion: 0.21
Nodes (15): { authorizeRequest }, decodeAvatarDataUrl(), DEFAULT_FEEDING_NORMS, DEFAULT_MEAL_COUNT_CHANGES, defaultProfile(), { hasDatabase, query, storageUnavailableError }, normalizeFeedingSettings(), persistProfile() (+7 more)

### Community 50 - "Community 50"
Cohesion: 0.25
Nodes (9): databaseUrl(), getSqlClient(), hasDatabase(), storageUnavailableError(), { authorizeRequest }, { hasDatabase, query, storageUnavailableError }, { normalizeEmail, readAllowedEmails, writeAllowedEmails }, readAllowedEmails() (+1 more)

### Community 51 - "migrate-local-state-to-neon.mjs"
Cohesion: 0.17
Nodes (11): { DEFAULT_AVATAR_URL, normalizeFeedingSettings }, expenses, migratedAt, { normalizeExpenseOrders }, { normalizeRecords }, profile, records, require (+3 more)

### Community 52 - "Q: Как переставить блок актуальной нормы перед графиком, унифицировать кнопки добавления и импортировать production backup в локальную dev-базу?"
Cohesion: 0.29
Nodes (6): Answer, Q: Как переставить блок актуальной нормы перед графиком, унифицировать кнопки добавления и импортировать production backup в локальную dev-базу?, Source Nodes, Answer, Q: Как переставить блок актуальной нормы перед графиком, унифицировать кнопки добавления и импортировать production backup в локальную dev-базу?, Source Nodes

### Community 53 - "Community 53"
Cohesion: 0.23
Nodes (12): { authorizeRequest }, finiteNumber(), { hasDatabase, query, storageUnavailableError }, normalizeExpenseOrder(), { normalizeExpenseOrder, readExpenseOrders, writeExpenseOrders }, normalizeExpenseOrders(), persistCurrentExpenseOrders(), { randomUUID } (+4 more)

### Community 54 - "Community 54"
Cohesion: 0.15
Nodes (12): name, private, scripts, build, build:vinext, deploy:vinext, dev, dev:vinext (+4 more)

### Community 55 - "Q: Как реализовать переключение между двухразовым и трехразовым питанием с выбранной даты без потери истории?"
Cohesion: 0.29
Nodes (6): Answer, Q: Как реализовать переключение между двухразовым и трехразовым питанием с выбранной даты без потери истории?, Source Nodes, Answer, Q: Как реализовать переключение между двухразовым и трехразовым питанием с выбранной даты без потери истории?, Source Nodes

### Community 56 - "Community 56"
Cohesion: 0.17
Nodes (11): { DEFAULT_AVATAR_URL, normalizeFeedingSettings }, expenses, migratedAt, { normalizeExpenseOrders }, { normalizeRecords }, profile, records, require (+3 more)

### Community 57 - "Q: Как унифицировать иконку редактирования режима кормления с другими кнопками редактирования?"
Cohesion: 0.29
Nodes (6): Answer, Q: Как унифицировать иконку редактирования режима кормления с другими кнопками редактирования?, Source Nodes, Answer, Q: Как унифицировать иконку редактирования режима кормления с другими кнопками редактирования?, Source Nodes

### Community 58 - "dependencies"
Cohesion: 0.21
Nodes (13): @cloudflare/vite-plugin, react-server-dom-webpack, dependencies, @cloudflare/vite-plugin, react-server-dom-webpack, @vinext/cloudflare, @vitejs/plugin-rsc, @cloudflare/vite-plugin (+5 more)

### Community 59 - "wireEvents"
Cohesion: 0.17
Nodes (18): cancelInlineEditor(), closeGrowthQuickAdd(), confirmRecordReplacement(), discardHistoryDraft(), handleHistoryAction(), handleHistoryKeydown(), inlineEditorError(), openGrowthQuickAdd() (+10 more)

### Community 60 - "Community 60"
Cohesion: 0.27
Nodes (10): browserErrors, command(), evaluate(), navigate(), pending, report, screenshot(), socket (+2 more)

### Community 61 - "updateMealCountPreview"
Cohesion: 0.30
Nodes (14): activeMealCountChanges(), applyTranslations(), deleteMealCountChange(), mealCountChangesWith(), openMealCountDialog(), persistFeedingSettings(), renderMealCountHistory(), resetMealCountToAutomatic() (+6 more)

### Community 62 - "Community 62"
Cohesion: 0.29
Nodes (9): browserErrors, checks, command(), evaluate(), navigate(), pending, report, socket (+1 more)

### Community 63 - "Задача: принципиальный редизайн приложения «Поршик»"
Cohesion: 0.06
Nodes (34): 10. Состояния интерфейса, 11. Доступность и качество, 12. Критерии приёмки, 13. Обязательная проверка результата, 14. Референс для продуктового правила, 1. Цель, 2. Продуктовые принципы, 3.1. Главная страница `/` (+26 more)

### Community 64 - "Community 64"
Cohesion: 0.31
Nodes (10): addHistoryDraft(), cancelInlineEditor(), discardHistoryDraft(), handleHistoryAction(), handleHistoryKeydown(), inlineEditorError(), openInlineEditor(), renderHistoryTable() (+2 more)

### Community 65 - "deleteNormInline"
Cohesion: 0.27
Nodes (11): activeFeedingNorms(), animateNormTimelineShift(), beginNormAdd(), beginNormEdit(), cancelNormInlineEditor(), deleteNormInline(), focusNormInlineEditor(), normTimelineRowPositions() (+3 more)

### Community 66 - "Community 66"
Cohesion: 0.25
Nodes (7): buildFullBackupPayload(), { DEFAULT_AVATAR_URL, normalizeFeedingSettings }, { normalizeExpenseOrders }, { normalizeRecords }, { buildFullBackupPayload }, payload, require

### Community 67 - "Community 67"
Cohesion: 0.29
Nodes (6): buildFullBackupPayload(), { DEFAULT_AVATAR_URL, normalizeFeedingSettings }, { normalizeExpenseOrders }, { normalizeRecords }, { buildFullBackupPayload }, require

### Community 68 - "scripts"
Cohesion: 0.15
Nodes (13): sites-app/package.json, name, private, scripts, build, build:vinext, deploy:vinext, dev (+5 more)

### Community 69 - "Community 69"
Cohesion: 0.24
Nodes (12): activeFeedingNorms(), animateNormTimelineShift(), beginNormAdd(), beginNormEdit(), cancelNormInlineEditor(), deleteNormInline(), focusNormInlineEditor(), normTimelineRowPositions() (+4 more)

### Community 70 - "Community 70"
Cohesion: 0.48
Nodes (6): command(), evaluate(), navigate(), pending, socket, waitFor()

### Community 71 - "Community 71"
Cohesion: 0.29
Nodes (6): auth, db, expenses, profile, require, weights

### Community 72 - "Community 72"
Cohesion: 0.33
Nodes (4): DELETE, dynamic, GET, POST

### Community 73 - "Community 73"
Cohesion: 0.50
Nodes (3): Answer, Q: Где сохраняются настройки отображения графиков и диапазоны?, Source Nodes

### Community 82 - "Community 82"
Cohesion: 0.40
Nodes (4): constantProfile, metrics, orders, records

### Community 83 - "next"
Cohesion: 0.67
Nodes (3): next, next, next

### Community 84 - "vite"
Cohesion: 0.67
Nodes (3): vite, vite, vite

## Knowledge Gaps
- **374 isolated node(s):** `cleanUrls`, `private`, `test`, `migrate:neon`, `require` (+369 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `saveDevState()` connect `Community 38` to `dev-server.mjs`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `persistState()` connect `dev-server.mjs` to `Community 38`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `api/_weights.js` connect `api/_weights.js` to `Community 66`, `api/_auth.js`, `Community 34`, `_profile.js`, `postgres-storage.test.mjs`, `expenses.js`, `migrate-local-state-to-neon.mjs`, `dev-server.mjs`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `api/_weights.js` (e.g. with `buildRecordsPayload()` and `createDailyBackup()`) actually correct?**
  _`api/_weights.js` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `wireEvents()` (e.g. with `wireChartRangeWindow()` and `addHistoryDraft()`) actually correct?**
  _`wireEvents()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `wireEvents()` (e.g. with `openMealCountDialog()` and `submitMealCount()`) actually correct?**
  _`wireEvents()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **What connects `cleanUrls`, `private`, `test` to the rest of the system?**
  _376 weakly-connected nodes found - possible documentation gaps or missing edges._