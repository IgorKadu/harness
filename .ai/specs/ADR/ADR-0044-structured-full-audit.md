# ADR-0044 — Structured full-project audit (groups → connections → whole)

- **Status:** accepted
- **Date:** 2026-06-05
- **Prior context:** ADR-0035..0043 (the iterative build + curation passes).

## Problem
After many iterations, ad-hoc fixes were not enough: the project needed a *methodical* pass that
covers everything, analysing coherent groups in isolation and then their connections and the whole,
so nothing is missed and the work stays organized.

## Method
The project (124 files) was partitioned into connected groups and audited in order:
- **G1 Base** (`src/core`) + the engine import graph.
- **G2 Domain modules** (`src/modules/*`).
- **G3 Mouths** (`bin/*`, `server/*`).
- **G4 Retrieval + knowledge** (`.ai/CONSTITUTION`, `retrieval-index`, `knowledge/**`, `bootstrap`).
- **G5 Memory/state + Specs/ADRs**.
- **G6 Docs/config + IDE dotfiles**.
- **G7 Tests (coverage) + synthesis**.

## Findings & decisions

### Fixed (real)
- **G2 — dead LLM hook.** `setLLM`/`hasLLM`/`assist` were called by nothing (mouths, tests, modules)
  — vestigial from the removed-extension era (ADR-0034). Removed; kept `LLM_CONTRACT`/`llmContract`
  (the conceptual contract, still referenced).
- **G4 — orphan knowledge.** `rules/dont.md` and `rules/lifecycle.md` existed but no route loaded
  them (unreachable). Added routes `regras` and `ciclo` so they are retrievable.
- **G6 — stale slash commands & fat package.** Old `init/sync/work` slash commands lingered in
  `.claude/commands` and `.agents/workflows`; `package.json files` shipped dev IDE dotfiles
  (`.claude/.gemini/.vscode/.agents`) that the installer regenerates. Trimmed `files` (the package no
  longer ships them). (Deleting the dev-repo copies is blocked by the sandbox FS — cosmetic only,
  they no longer ship.)
- **G7 — coverage gap.** The central `orchestrate()` packet, phase navigation/posture, and code-map
  `scan`/`searchCode` had no direct tests. Added `test/orchestrate.test.mjs` (42 tests total).

### Verified healthy
- G1: `core/io` clean; import graph consistent with ADR-0035 (cycles only via function bodies).
- G3: CLI↔dispatcher has no orphan commands; all 20 `CORE_TOOLS` exist in the catalog.
- G4: retrieval-index integrity — every route/always path exists; no broken refs.
- G5: every ADR file has a `decisions-index` row.

### Noted, deliberately not forced (open items, low value / high churn now)
- PT/EN mix: 5 module headers + several returned strings + 12 older knowledge docs remain PT
  (ADR-0036 migration is gradual).
- Three overlapping size classifiers (`classify`/`taskShape`/`decompose`) — unify vocabulary later.
- The web panel (`server/web.mjs`) is session-only/narrow but functional.
- The barrel re-exports some internal helpers (API breadth, not a defect).

## Consequences
- The project is coherent end-to-end: no dead feature, no unreachable knowledge, no stale commands
  shipping, central flows under test. Validation green (42 tests, doctor, Smells=0) — nothing of
  value lost.

## Future impact
Re-run this group-based audit after each batch of features; it is the structured complement to the
quick curation pass (ADR-0043).
