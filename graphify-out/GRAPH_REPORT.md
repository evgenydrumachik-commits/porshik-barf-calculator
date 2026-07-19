# Graph Report - Калькулятор еды для Поршика  (2026-07-18)

## Corpus Check
- 42 files · ~223,636 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 410 nodes · 821 edges · 27 communities (15 shown, 12 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

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

## God Nodes (most connected - your core abstractions)
1. `t()` - 35 edges
2. `updateDerivedUI()` - 16 edges
3. `renderHistoryTable()` - 15 edges
4. `Задача: принципиальный редизайн приложения «Поршик»` - 15 edges
5. `formatNumber()` - 14 edges
6. `renderAll()` - 13 edges
7. `toast()` - 12 edges
8. `drawBarfChart()` - 12 edges
9. `feedingPlanForDate()` - 11 edges
10. `latestWeightRecord()` - 11 edges

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

## Communities (27 total, 12 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (42): action, { authorizeRequest }, blobSafeStamp(), buildRecordsPayload(), {
  buildRecordsPayload,
  createDailyBackup,
  listRestorePoints,
  normalizeRecord,
  readRecords,
  restoreRecordsFromPath,
  writeAuditEvent,
  writeRecords
}, createDailyBackup(), ensureDailyBackup(), hasBlobToken() (+34 more)

### Community 1 - "Community 1"
Cohesion: 0.20
Nodes (9): redirect, statusCode, rewrite, navigationFallback, rewrite, responseOverrides, 401, 403 (+1 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (34): 10. Состояния интерфейса, 11. Доступность и качество, 12. Критерии приёмки, 13. Обязательная проверка результата, 14. Референс для продуктового правила, 1. Цель, 2. Продуктовые принципы, 3.1. Главная страница `/` (+26 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (24): authorizeRequest(), buildClearCookie(), buildSessionCookie(), isAdminEmail(), isEmailAllowed(), { buildClearCookie }, parseCookies(), shouldUseSecureCookies() (+16 more)

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
Cohesion: 0.16
Nodes (20): addDays(), addMonths(), ageOn(), daysBetween(), DOG_PROFILE, formatAge(), intakeDifferencePercent(), pad() (+12 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (25): dependencies, @cloudflare/vite-plugin, next, react, react-dom, react-server-dom-webpack, @vercel/blob, vinext (+17 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (23): authorizeRequest(), buildClearCookie(), buildSessionCookie(), isAdminEmail(), isEmailAllowed(), parseCookies(), shouldUseSecureCookies(), verifyGoogleIdToken() (+15 more)

### Community 21 - "Community 21"
Cohesion: 0.08
Nodes (81): activeDogProfile(), addHistoryDraft(), applyAvatar(), applyTheme(), applyTranslations(), avatarDataUrlFromFile(), buildMealControls(), cancelInlineEditor() (+73 more)

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (12): browserErrors, command(), evaluate(), message, navigate(), pending, report, { resolve, reject } (+4 more)

### Community 26 - "Community 26"
Cohesion: 0.09
Nodes (28): { authorizeRequest }, decodeAvatarDataUrl(), defaultProfile(), hasBlobToken(), normalizeFeedingSettings(), persistProfile(), { randomUUID }, readProfile() (+20 more)

## Knowledge Gaps
- **156 isolated node(s):** `cleanUrls`, `private`, `test`, `@vercel/blob`, `routes` (+151 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `randomUUID()` connect `Community 0` to `Community 26`, `Community 7`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `require` connect `Community 0` to `Community 3`, `Community 14`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `isEmailAllowed()` connect `Community 14` to `Community 0`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `cleanUrls`, `private`, `test` to the rest of the system?**
  _156 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09696969696969697 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10752688172043011 - nodes in this community are weakly interconnected._