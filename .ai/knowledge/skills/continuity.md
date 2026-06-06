---
version: 1.0.0
updated: 2026-06-05
tier: conditional
tokens: ~520
load: continuity
triggers: continuidade, continuity, retomar, resume, contexto, context, janela, window, perdido, lost, capsula, capsule, foco, focus
---

# Skill: Continuity (context engineering for long projects)

> Introduced in ADR-0040. How to drive a project from start to finish without the model losing
> the thread, while keeping token cost low and the context window clean.

## Why models lose the thread (and the Harness answer)

| Failure mode | What it looks like | Harness lever |
|---|---|---|
| Window saturation ("lost in the middle") | early instructions/goal fade in a long session | small, re-readable capsule; CORE cap; retrieval-first |
| Re-derivation | re-running discovery/scan every session | Saves (read-first) + `os_start` |
| Goal drift / scope creep | inventing features, wandering off-objective | `os_focus` thread + phase posture + handoff "NÃO fazer" |
| Stale context | acting on notes older than the code | Save `stale` flag (code-map newer than Save) |
| Protocol skipping | forgetting saves-first, not checkpointing | one entry point: `os_start` |

## The loop that does NOT get lost

```
os_start [intent]        # the capsule: focus + saves(+stale) + posture + nextAction (one cheap call)
act on nextAction        # do NOT re-derive what the capsule already answered
os_focus set ...         # whenever the current step changes, move the pointer
...work...
os_validate              # prove it (don't claim green without running)
os_report + os_sync + os_save_checkpoint   # persist; structural -> all layers
```

`os_start` is the single most important habit: it collapses brief + saves + working-set into one
token-bounded packet, in priority order. Reading ~500 tokens replaces thousands of re-derivation.

## Rules of thumb (context engineering)

- **Resume, don't rebuild.** If `os_start` answers it, trust it. Only run heavy flows
  (`os_pipeline`/`os_scan`/`os_analyze`) for what is missing or marked `stale`.
- **Keep the thread alive.** Update `os_focus` (objective · step N/M · next) as you go. The next
  session — or the same session after the window fills — resumes from the pointer, not from memory.
- **Honor the budget.** Load only the capsule's `task.load` (<=5 files). "Por garantia" loading is
  the main cause of window bloat. If a task needs more, decompose it (`os_decompose`).
- **Distrust stale Saves.** A `stale` layer means the code moved since it was written — re-derive
  that layer before relying on it, then `os_save_checkpoint`.
- **One concern per altitude.** Macro in L1, milestones in L2, technical detail in L3 — so each
  stays small and the capsule stays cheap.
- **Condense periodically.** Run `os_reforce` when memory/Saves grow noisy; it recompiles them to
  the current state without losing critical signal.

## Anti-patterns

- Calling `os_pipeline`/`os_scan` before `os_start` — wasteful replay.
- Letting `focus` and Saves drift from reality — the next resume inherits the lie.
- Pasting whole files into context when the capsule already pointed at the <=5 that matter.
