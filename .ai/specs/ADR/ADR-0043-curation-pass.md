# ADR-0043 — Curation pass: dead code, stale docs and demoted-tool references

- **Status:** accepted
- **Date:** 2026-06-05
- **Prior context:** ADR-0034 (extension removed), ADR-0035 (atomic writes / modular engine),
  ADR-0040 (capsule), ADR-0042 (curated tool surface).

## Problem
After many incremental iterations, a fine-tooth review found accumulated drift: dead imports, a
stale user-facing message, a latent bug, engine strings pointing at demoted tools, and several
out-of-date docs. None broke functionality, but together they made the project misaligned and
harder to trust — the kind of rot the user asked to clean up without losing working flows/layers.

## Decision
**Sweep and fix the concrete drift; touch nothing that delivers value.**

### Code
- **Latent bug:** `scan()` detected the stack with `detectStack(ROOT)`, so for an installed project
  (`ROOT = .harness`, which has no package.json) the code-map's `stack` was empty. Fixed to
  `detectStack(PROJECT_ROOT)` — the stack of the actual project.
- **Stale message:** `os setup` advertised an "Install from VSIX -> .harness/extension/*.vsix"
  extension that was removed in ADR-0034. Removed.
- **Dead imports:** 8 modules still imported `writeFileSync` from `node:fs` after the atomic-write
  swap (ADR-0039); none used it. Removed (one empty `import {}` line deleted).
- **Demoted-tool references:** engine action-strings (capsule `nextAction`, `reforce`, `savesStatus`
  recommendation, discovery recommendation) pointed at tools no longer advertised after ADR-0042
  (`os_init`, `os_analyze`). Repointed at core tools (`os_pipeline`/`os_scan`/`os_start`).

### Docs
- `CONNECT.md` "As 29 tools MCP" → curated ~20-tool core list (ADR-0042), noting the rest stay
  callable via CLI/`tools/call`.
- `README.md` "25 ferramentas MCP" → "~20 curadas"; architecture diagram now shows the modular
  engine (core/modules/llm); day-to-day commands lead with the real user surface
  (setup/reset/update/reforce, ADR-0038).
- `AGENTS.md` rewritten to the current `os_start`-first protocol (it still described the old
  os_read_core/os_work opening — a conflict with CLAUDE.md).
- `ROADMAP.md` refreshed from v0.3.0 (18 tools, extension) to v0.9.x current state + open items.

## Out of scope (deliberately not done)
- Editing accepted ADRs and append-only logs (constitution: history is immutable).
- Unifying the three size classifiers (classify/taskShape/decompose) — noted as an open item; a
  rewrite with test churn, not worth forcing now.
- Migrating the remaining PT knowledge docs to English — the ADR-0036 policy is gradual.

## Consequences
- The system is internally consistent again: no dead imports, no phantom features, no instructions
  pointing at hidden tools, no docs contradicting the code.
- Validation unchanged and green (37 tests, doctor, Smells=0) — no working flow/layer/automation lost.

## Future impact
Run a short curation pass like this after each batch of features; the test suite + doctor + scan
make it cheap and safe.
