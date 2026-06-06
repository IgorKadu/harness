# ADR-0042 — Curated MCP tool surface + protocol-conflict and capsule fixes

- **Status:** accepted
- **Date:** 2026-06-05
- **Prior context:** ADR-0022 (lean/retrieval-first), ADR-0023 (one brain, many mouths),
  ADR-0040 (context capsule), ADR-0041 (task shape).
- **External input:** MCP "too many tools" / token-bloat guidance (modelcontextprotocol SEP-1576;
  industry reports that tool definitions can be 30–50% of token consumption and degrade tool
  selection). Optimal advertised tool sets are small and curated.

## Problem
A critical self-review found the Harness violating its own invariant ("context per task, not per
project") at the tool layer: the MCP `tools/list` advertised **39 tools ≈ 3,500 tokens of FIXED
overhead every session**, regardless of the task, crowding the window and degrading selection.
The catalog had grown incrementally and was never pruned, with heavy redundancy (os_start already
subsumes os_brief/os_saves/os_work/os_route/os_capabilities; os_orchestrate includes decomposition;
os_assess includes verify; os_pipeline covers analyze/gaps/inspect).

Two concrete defects were also found:
1. The generated instructions had **two competing "step 0"s** — a "call os_saves first" section and
   "0. os_start first" — ambiguous and wasteful, since os_start already carries the saves status.
2. The **capsule clobbered hard prerequisites**: for an `escalate`-shaped task with no Saves (or
   stale Saves, or a pending handoff), the escalate advice overwrote the "build/refresh Saves first"
   nextAction, dropping a critical signal.

## Decision
**Advertise only a curated CORE set of ~20 tools; keep the rest callable but unlisted. Fix the two
defects.**

### Curated tool surface
`server/mcp.mjs` filters `tools/list` to a `CORE_TOOLS` set (the essential loop):
`os_start, os_orchestrate, os_handoff, os_smash, os_report, os_validate, os_assess, os_saves,
os_save_write, os_save_checkpoint, os_focus, os_scan, os_find, os_recall, os_remember, os_sync,
os_doctor, os_pipeline, os_phase, os_subtasks`.
- The other ~19 tools (brief, capabilities, work, route, decompose, init, tokens, gaps, checks,
  metrics, suggest_routes, template, analyze, inspect, automations, session, verify, reforce,
  read_core) remain in the catalog and are still resolvable via `tools/call` and via the CLI — they
  are simply not advertised, so they do not crowd the context window. Nothing loses capability.
- Result: advertised overhead drops from ~3,500 to ~2,150 tokens/session (~38% less), with better
  model tool selection. The change is data-driven and reversible (one Set).

### Fixes
- Instructions: `os_start` is the single step 0; the SAVE POINTS section now explains how Saves work
  (it no longer tells the model to call os_saves first). Demoted tools removed from instruction prose.
- Capsule: escalate/verify advice is applied to `nextAction` only when the base situation is `ready`
  (no bootstrap, no stale layers, no pending handoff); otherwise the prerequisite wins. Covered by a
  new test (37 total).

## Consequences
### Positive
- Directly attacks the user's #1 concern (token cost): ~1.35k fewer fixed tokens every session, more
  room for actual project context, less tool-selection distraction.
- Removes an internal contradiction (the lean OS was not lean at its own tool layer).
- Clearer, conflict-free opening protocol.

### Negative / accepted trade-offs
- The model no longer sees the long tail of tools by default; the rare ones are reached via CLI or by
  name. Acceptable — they were redundant or seldom used.
- `CORE_TOOLS` is a hand-curated list to keep current as tools evolve.

## Alternatives considered
- **Dynamic/embedding-based tool filtering** — powerful but adds complexity/deps; overkill for ~40
  tools. A static curated set captures most of the win at zero cost.
- **Delete the demoted tools** — rejected: keeping them callable-but-unlisted preserves capability and
  reversibility (mirrors the CLI's hidden-but-functional design, ADR-0038).

## Future impact
If the catalog grows again, revisit `CORE_TOOLS` (and consider shortening verbose descriptions, the
next cheapest token win). The three overlapping size classifiers (classify / taskShape / decompose)
are a noted follow-up to unify vocabulary.
