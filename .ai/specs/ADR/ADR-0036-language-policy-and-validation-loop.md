# ADR-0036 — Language policy (English system / Portuguese dialogue) + automated validation loop

- **Status:** accepted
- **Date:** 2026-06-03
- **Prior context:** ADR-0023 (one brain, many mouths), ADR-0028 (handoff/session),
  ADR-0033 (LLM channel), ADR-0035 (modular engine + LLM contract).

## Problem
Two gaps blocked the goal of "a system that lets the LLM drive any project to done without
breaking mid-way":

1. **Language was inconsistent.** Knowledge docs and ADRs were written in Portuguese, while
   code identifiers were English. LLMs reason and pattern-match best in English (it is the
   substrate of libraries, docs and training signal), but the user's dialogue must stay
   Portuguese. There was no rule stating which surface uses which language.
2. **"Did it pass?" was not enforceable.** The system could `gaps` and recommend `testing`,
   but nothing actually ran the project's checks, captured failures, and held the LLM in a
   loop until green. That left room for the worst failure mode: claiming success without
   running anything.

## Decision
**Adopt a split language policy and add a deterministic validation loop.**

### Language policy
- System artifacts — code, identifiers, comments, knowledge docs, skills, ADRs, specs,
  commit messages, file/dir names — are **English**.
- The dialogue with the user, and user-facing descriptions, are **Portuguese** until the user
  asks to switch.
- One language per artifact; never mix. Migration of existing Portuguese docs is **gradual**
  (converted when next touched), to avoid stop-the-world rework.
- Recorded as a retrieval-gated rule: `.ai/knowledge/rules/language.md` (route `idioma`).

### Validation loop
- New deterministic module `src/modules/validate.mjs`:
  - `detectChecks()` — which checks are runnable now (test/lint/typecheck/build scripts in the
    **project's** package.json, never the Harness' own).
  - `validate({ kind, command })` — runs the check, captures output, extracts failure-ish lines,
    appends a structured entry to the **errors-log** (append-only), returns
    `{ ran, passed, exitCode, failures[], outputTail, summary }`.
- Exposed on every mouth: CLI `os validate [--kind=...] [--cmd="..."]`, MCP tools
  `os_validate` and `os_checks`, barrel re-export.
- Skill `.ai/knowledge/skills/validation-loop.md` (route `validacao`) documents the loop and
  the escape hatch (stop after ~3 stuck iterations and surface to the user).
- Division of labor (LLM_CONTRACT, ADR-0035): **Harness runs + collects + logs; the LLM fixes.**
  The LLM iterates `os_validate` until PASS; reporting green without an actual PASS is forbidden
  (mirrors the Constitution's "do not invent execution results").

## Consequences
### Positive
- The model operates in its strongest language while the human keeps their own.
- "Anti-break" gets teeth: a closing, logged, repeatable gate instead of a vibe check.
- Failures accumulate in the errors-log, so recurring problems are visible via `os_recall`.

### Negative / accepted trade-offs
- Mixed-language repo during the gradual migration window.
- `validate` shells out (execSync) — a side effect in an otherwise pure engine; bounded by
  timeout, maxBuffer, and project-scoped commands.

## Alternatives considered
- **Full immediate translation of all docs** — rejected: large rework, violates the lean/
  anti-redundancy principle; gradual migration achieves the same end state cheaper.
- **A generic test parser** — rejected: brittle across frameworks; a heuristic failure-line
  extractor plus raw `outputTail` gives the LLM enough signal at zero dependency cost.

## Future impact
Cheap to extend: more `kind`s map to more scripts; a structured per-framework parser can be
added behind `validate` without changing its contract. Reverting the language policy is a
doc-level change.
