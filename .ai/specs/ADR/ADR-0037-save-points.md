# ADR-0037 — Save points: read-first checkpoints in three layers

- **Status:** accepted
- **Date:** 2026-06-03
- **Prior context:** ADR-0022 (lean/retrieval-first), ADR-0024 (adaptive communication),
  ADR-0028 (handoff/session), ADR-0035 (modular engine), ADR-0036 (validation loop).

## Problem
The agent instruction docs (CLAUDE.md / GEMINI.md / AGENTS.md) tell the LLM to run a whole
flow at the start of every task (brief → pipeline/scan/analyze → orchestrate). Replaying that
flow each session is expensive: it re-derives context the system already knew, burning tokens
and context window — the exact cost the lean model exists to avoid. There was no cheap, durable
"where are we" snapshot to resume from. The user's framing: like a video game, advancing a
phase or earning an achievement should write a **Save**; the next session loads the Save instead
of replaying the level.

## Decision
**Add "Save points": consolidated checkpoints the LLM reads FIRST, before any heavy flow.**

Three layers by altitude, encompassing any project (new or ongoing), each with a lifecycle
`stage` (`initial | pending | done`):

- **Layer 1 — Overview** (macro): identity, goal, scope/MVP, stack, phase, global stage.
- **Layer 2 — Progress** (meso): stages/milestones, each marked initial|pending|done.
- **Layer 3 — Technical** (micro): architecture, modules, locked decisions, validation state,
  resume point.

Stored under `.ai/saves/` as durable, committed memory.

### Protocol (the heart of the change)
Step 0 of every task is `os_saves`:
- **Saves exist & fresh** → resume from them; only run heavy flows for what they do not answer.
- **Saves missing** → run the flows, then write the Saves (`os_save_write`).
- **On completion** → update the adequate layer with `os_save_checkpoint`; a **structural**
  change updates all layers (`layers='all'`) plus the matching docs/ADRs. Not everything affects
  everything — escalate to "all" only when the change is genuinely structural.

### Surfaces
- Engine module `src/modules/saves.mjs`: `savesStatus`, `readSaves`, `writeSave`, `initSaves`,
  `saveCheckpoint`, `SAVE_LAYERS`, `SAVE_STAGES` (re-exported by the barrel).
- `brief()` now carries `saves` so the read-first status arrives with the very first call.
- CLI `os save <status|read|init|write|checkpoint>`; MCP tools `os_saves`, `os_save_write`,
  `os_save_checkpoint`.
- Instruction docs updated: the generated agent instructions (scaffold) and the repo CLAUDE.md
  put `os_saves` as step 0 and `os_save_checkpoint` in the close-out.
- Skill `.ai/knowledge/skills/save-points.md` (route `saves`).

## Consequences
### Positive
- Resume instead of re-derive: reading a Save (~80 tokens) replaces replaying pipeline/scan
  (thousands of tokens). Direct token/context savings, every session.
- A single, honest "where are we" that survives across sessions and contributors.
- Layered updates respect the user's rule: touch only the adequate Save unless structural.

### Negative / accepted trade-offs
- Saves can go stale if the LLM forgets to checkpoint — mitigated by wiring it into brief
  (visible status) and the documented close-out.
- One more artifact type to keep small; the altitude discipline (one concern per layer) bounds it.

## Alternatives considered
- **Reuse state-of-world for everything** — rejected: it is a single hot-memory file capped at
  ~1200 tokens; it cannot hold three altitudes of resumable detail without bloating the CORE.
- **A single Save file with three sections** — rejected: layered files allow updating one layer
  without rewriting the others, matching "update only the adequate Save".

## Future impact
Cheap to evolve: more layers or per-layer schemas slot in behind `SAVE_LAYERS`. Saves are the
natural place to later attach freshness checks (e.g. flag a Save stale when the code-map changed
after its `updated`).
