# ADR-0039 — Stabilization: test suite, atomic writes, single state root, integrity checks

- **Status:** accepted
- **Date:** 2026-06-04
- **Prior context:** ADR-0023 (one brain, many mouths), ADR-0035 (modular engine),
  ADR-0036 (validation loop), ADR-0037 (save points), ADR-0038 (install/user surface).

## Problem
A professional review flagged the gap between "elegant prototype" and "trustworthy tool":
1. **No real test suite.** CI was syntax + smoke only — ironic for a system that preaches a
   validation loop. Every refactor relied on ad-hoc smoke checks.
2. **No write durability.** Durable state was written with plain `writeFileSync`; a crash or a
   misbehaving editor could leave a half-written/truncated file (a corruption class we hit in
   practice).
3. **State root was split.** Most state honored `.ai` but the memory logs were resolved against
   `ROOT`, so there was no single, overridable home for mutable state — which also made the
   engine hard to test without touching the repo.
4. **Doctor was shallow.** It validated the index/CORE/phase but not Saves or memory integrity.

## Decision
**Harden the foundation without adding product scope (stabilization posture).**

### Atomic writes
- `src/core/io.mjs` `writeFileAtomic(path, content)` — write to a temp file then `rename` (atomic
  on the same filesystem). Applied to every durable writer: saves, sessions, sub-sessions,
  code-map, project.json (phase), state-of-world sync, handoff/report, lifecycle reset.

### Single, overridable state root
- All mutable state now derives from `AI` (paths.mjs), including the memory logs (memory.mjs no
  longer resolves against `ROOT`). `AI` honors `HARNESS_AI_DIR`, so tests (and advanced setups)
  point Harness at a sandbox without touching the repo.

### Test suite (node:test, zero-dep)
- `test/*.test.mjs` using the built-in runner: pure functions (norm, tokens, route, classify,
  decompose, contract), atomic io, memory (append-only), saves (bootstrap/write/checkpoint),
  lifecycle (reset/reforce/version), validate (pass/fail + logging), doctor integrity.
- Stateful tests run in an isolated sandbox via `test/_sandbox.mjs` (copy `.ai` to a temp dir,
  set `HARNESS_AI_DIR`). `npm test` = `node --test test/*.test.mjs`; wired into CI across Node
  18/20/22. The Harness now dogfoods its own validation loop (`os validate --kind test`).

### Deeper doctor
- `doctor()` now checks Save frontmatter (existing layers must carry a valid `stage`) and the
  presence of the append-only memory logs.

## Consequences
### Positive
- Behavior is pinned by 26 tests; refactors are safe and CI is meaningful.
- The corruption class is structurally prevented, not just hoped against.
- One overridable state root → real testability and cleaner installs.

### Negative / accepted trade-offs
- `writeFileAtomic` does a temp-write + rename per save (negligible cost; durability wins).
- A few modules carry an unused `writeFileSync` import after the swap (harmless).

## Alternatives considered
- **A third-party test framework** — rejected: violates zero-dep; `node:test` is built in.
- **A write-lock instead of atomic rename** — rejected: heavier and still leaves partial writes;
  rename is the simplest correct primitive for single-writer local state.

## Future impact
Next stabilization steps (not in this ADR): JSDoc + `tsc --checkJs` in CI, schema-migration on
`update`, and optional protocol-adherence signals in `brief`. The test sandbox makes all of
these cheap to verify.
