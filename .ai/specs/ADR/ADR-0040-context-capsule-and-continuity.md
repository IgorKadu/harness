# ADR-0040 — Context capsule (os_start), focus pointer, and Save staleness

- **Status:** accepted
- **Date:** 2026-06-05
- **Prior context:** ADR-0022 (lean/retrieval-first), ADR-0024 (adaptive communication),
  ADR-0027 (orchestration), ADR-0037 (save points), ADR-0039 (stabilization).

## Problem
The Harness had all the pieces for cheap continuity (retrieval, budgets, phases, Saves), but the
LLM still had to assemble them across several calls (brief + saves + work) and remember to do so.
That leaves room for the exact failure modes that make models "get lost" in long projects:
window saturation ("lost in the middle"), re-derivation cost, goal drift, acting on stale notes,
and skipping the saves-first protocol. The fix is not more capability — it is **one cheap,
ordered entry point** that hands the model exactly what it needs now, plus a live thread anchor
and an honesty signal for stale context.

## Decision
**Add a single context capsule (`os_start`), a focus pointer (`os_focus`), and Save staleness.**

### Context capsule — `os_start [intent]` / `capsule()`
Returns ONE token-bounded packet, in explicit priority/read order:
`focus → saves digest → phase posture → (optional) task working-set → nextAction`.
- It composes `brief` + `savesStatus` + (optional) `computeWorkingSet`/`classify` into ~500 tokens.
- It always ends in a single, unambiguous `nextAction` (bootstrap if no Saves; re-derive if a
  layer is stale; follow the handoff if pending; else the focus thread; else the phase rec).
- The instruction docs (generated + CLAUDE.md) make `os_start` the **step 0** of every message,
  superseding the old multi-call opening. Reading the capsule replaces re-running heavy flows.

### Focus pointer — `os_focus` / `getFocus`/`setFocus`/`clearFocus`
A tiny, live "thread": `{ objective, step, total, next, updatedAt }` in `.ai/runtime/focus.json`
(transient; cleared by `reset`). It keeps the model on-task within a saturating window and across
sessions — resume from the pointer, not from fading memory.

### Save staleness
`savesStatus` now flags a layer `stale` when the code-map was generated after the Save's
`updated` timestamp (the code moved since the Save was written). Surfaced in the capsule and in
`os_doctor` so the model never resumes from an out-of-date checkpoint without knowing.

### Knowledge
Skill `.ai/knowledge/skills/continuity.md` (route `continuity`) documents the context-engineering
principles: resume don't rebuild, keep the thread alive, honor the budget, distrust stale Saves.

## Consequences
### Positive
- One habit (`os_start`) collapses the opening protocol, cutting tokens and removing the chance to
  skip saves-first or over-load the window — works the same in any environment (CLI, MCP, web).
- The focus pointer + staleness give honest, cheap continuity: start, continue, conclude.
- Behavior is pinned by tests (capsule order/budget/nextAction, focus round-trip, staleness).

### Negative / accepted trade-offs
- The capsule duplicates a little of brief's content by design (it is the single front door).
- Focus is transient (runtime); durable progress still lives in the L2 Save by intent.

## Alternatives considered
- **Leave the opening as multiple calls** — rejected: it is precisely where models drift/over-read.
- **Make focus a committed file** — rejected: it is a live pointer; durable state belongs in Saves.

## Future impact
The capsule is the natural place to later add adherence signals (e.g. "Saves not refreshed this
session") and a hard token budget per packet. New fields slot into `capsule()` without changing
the step-0 habit.
