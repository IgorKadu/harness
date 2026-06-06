---
layer: 3
title: Technical
stage: pending
updated: 2026-06-06T02:45:56.105Z
---
# Save · Layer 3 — Technical
> micro: architecture, modules, locked decisions, validation, resume point

## Architecture
- One brain (src/engine.mjs barrel) re-exporting domain modules; mouths import * as engine.
- Modules: routing, tokens, memory, navigation, codemap, orchestrate, session, gaps, channel, turbine, extensions, validate, saves, lifecycle, bootstrap, assurance.
- core/: paths (HARNESS_AI_DIR override), util, io (writeFileAtomic). MCP: server/tools.mjs + tools-ext.mjs + mcp.mjs transport. CLI: bin/lib/ui + bin/commands/{workflow,system,lifecycle} + dispatcher.

## Locked decisions
- Zero-dep, ESM. Cross-module cycles only inside function bodies. All durable writes atomic. State root = AI (override-able).
- Saves under .ai/saves (durable, not gitignored, not vendored). focus.json in runtime (transient).
- Do NOT build a parallel-subagent runtime; for massive tasks, os_assess escalates to native Dynamic Workflows or decompose.

## Validation state
- 36 node:test passing; os validate --kind test PASS (dogfood); doctor green; scan Smells=0; CI Node 18/20/22 (syntax+tests+doctor+scaffold).

## Resume point
- Stabilization essentially concluded at v0.9.0. Optional next: checkJs, schema migration. Then publish.

## Checkpoint log
- 2026-06-06 02:12 · v0.9.0 estabilizacao concluida: ciclo completo, custo dobrado no assess, docs+saves consolidados
- 2026-06-06 02:24 · ADR-0042: superficie MCP curada (-38% overhead) + fixes de conflito/override; v0.9.1
- 2026-06-06 02:35 · ADR-0043 curadoria v0.9.2: alinhamento total, docs e code limpos
- 2026-06-06 02:45 · ADR-0044 auditoria estruturada completa: projeto coerente ponta-a-ponta, v0.9.3
