---
version: 1.0.0
updated: 2026-06-03
tier: conditional
tokens: ~480
load: saves
triggers: save, saves, checkpoint, ponto de save, retomar, resume, savepoint, estado do projeto
---

# Skill: Save Points

> Introduced in ADR-0037. Saves are consolidated checkpoints the LLM reads FIRST, before
> running any heavy flow. Like a game save: load it to resume instantly instead of replaying
> the whole level. This is the single biggest token/context saver in the system.

## The three layers (by altitude — they encompass any project, new or ongoing)

| Layer | File | Altitude | Holds |
|---|---|---|---|
| 1 Overview | `.ai/saves/save-1-overview.md` | macro | identity, goal, scope/MVP, stack, phase, global stage |
| 2 Progress | `.ai/saves/save-2-progress.md` | meso | stages/milestones, each with `stage = initial\|pending\|done` |
| 3 Technical | `.ai/saves/save-3-technical.md` | micro | architecture, modules, locked decisions, validation state, resume point |

Each Save carries a frontmatter `stage` (initial → pending → done), the project lifecycle marker.

## The protocol (step 0 of every task)

```
os_saves                       # FIRST. Status of all three layers + recommendation.
if saves exist and fresh:
  read them (os_saves layer=1, then 2/3 as needed) and RESUME from them.
  only run heavy flows (os_pipeline/os_scan/os_analyze) for what the Saves do NOT answer.
else (missing):
  run the flows to build context, THEN write the Saves (os_save_write).
```

Reading a Save (~80 tokens) replaces re-running pipeline/scan/analyze (thousands of tokens).
That is the whole point — **resume, don't re-derive.**

## Updating Saves (on completion)

- Finish a task → update the **adequate** layer with `os_save_checkpoint`.
  - Touched only code/tech detail → layer 3.
  - Moved a milestone → layer 2 (bump its `stage`).
  - Changed goal/scope/stack/phase → layer 1.
- **Structural change** (architecture, new subsystem, policy) → `layers='all'`: update every
  layer, plus the matching docs/ADRs. Not everything affects everything — only escalate to
  "all" when the change is genuinely structural.
- Pair it with the normal close-out: `os_remember` + `os_sync` + `os_save_checkpoint`.

## Tools / commands

- `os_saves` (MCP) / `os saves` (CLI) — status; `layer=N` reads that layer.
- `os_save_write` / `os save write <layer> "<body>" [--stage=...]` — compose/replace a layer.
- `os_save_checkpoint` / `os save checkpoint "<note>" [--all|--layer=N]` — log + bump stage.
- `os save init` — create empty skeletons for missing layers (bootstrap).

## Anti-patterns

- Running `os_pipeline`/`os_scan` before checking `os_saves` — wasteful replay.
- Letting Saves go stale: if you changed the project and did not checkpoint, the next session
  resumes from a lie. Always close the loop.
- Writing everything into layer 1 — keep altitude discipline so each Save stays small and cheap.
