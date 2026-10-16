> **D-053 — Mandatory coding-agent profile (2026-10-16):** For **Copilot and Codex**, including implementation, reviews, diagnostics and verification, default to **GPT-6 Luna (`gpt-6-luna`) with provider-native MAX reasoning**. "Use Copilot" means **Copilot + Luna/MAX**, not Copilot + GPT-6.1 Sol/high; same model/effort rule for Codex. Only an **explicit owner instruction on this task** may select another model/effort (e.g. GPT-6.1 Sol medium/high, Claude Sonnet 5.5 medium). **Never silently use GPT-5.6.** Verify actual parent engine/model/effort before dispatch; do not use a Sol/high parent delegating to Luna, provider presets or weaker-effort fallback. If exact profile cannot be selected, report BLOCKED. Preserve active threads and production safeguards. [Canonical owner policy](https://github.com/evgenydrumachik-commits/Hermes-Infra/blob/main/GLOBAL_ENGINEERING_POLICY.md). Documentation does not change runtime defaults.

> **Portfolio policy (owner decision D-045):** For engineering work in this owner-controlled repository, read [Hermes Infra GLOBAL_ENGINEERING_POLICY.md](https://github.com/evgenydrumachik-commits/Hermes-Infra/blob/main/GLOBAL_ENGINEERING_POLICY.md) once at task start. The default workflow is **FAST** (rapid reversible changes, no blanket Issue/PR/review), with **CAREFUL** for material safety/data/irreversibility risks. **FAST is never the Codex product Fast option.** Coding: GPT-6 Luna/native MAX; UI/UX design: Claude Sonnet 5.5. T3 first, safe automatic fallback. Docs-only may commit directly without PR. This policy supersedes older generic process gates only; preserve project-specific requirements. Preserve the existing graphify rules and project-specific instructions.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
