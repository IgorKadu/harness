---
version: 1.0.0
updated: 2026-06-03
tier: conditional
tokens: ~450
load: validation
triggers: validacao, validation, validate, testar, run tests, ci, lint, typecheck, green, falhando, failing
---

# Skill: Validation Loop

> Introduced in ADR-0036. Turn "did it work?" into a deterministic loop that ends only
> when checks are green. Harness runs the checks and logs failures; the LLM fixes the code.

## The loop (anti-break core)

```
os_checks                 # what can run? (test/lint/typecheck/build present in package.json)
repeat:
  os_validate kind=test   # Harness runs it, captures failures -> errors-log
  if PASS -> stop
  read the returned `failures` (and os_recall "validate" for history)
  fix the code (LLM)       # smallest change that addresses the failure
until PASS
```

The contract: **Harness = run + collect + log; LLM = fix.** Never claim "tests pass" without
an actual `os_validate` PASS — that is a hallucination the loop exists to prevent.

## Principles

- **Never report green without running.** "not executed" is an honest answer; a fabricated
  pass is not. (Mirrors the Constitution: do not invent execution results.)
- **One failure class at a time.** Fix the first/most fundamental failure, re-run, reassess.
  Cascading errors often collapse once the root one is fixed.
- **Smallest change that makes it pass.** Resist refactoring mid-loop; stabilize first.
- **Read the log, not your memory.** `os_recall "validate"` shows the failure history so you
  see recurring problems instead of guessing.
- **Escape hatch.** If the same failure survives ~3 iterations, stop and surface it to the user
  with the captured output — do not loop blindly (that burns tokens, the thing we optimize against).

## What `os_validate` returns

`{ ran, kind, command, passed, exitCode, failureCount, failures[], outputTail, summary }`

- `failures` — heuristic failure-ish lines (signals to act on).
- `outputTail` — last lines of raw output for context.
- On failure it appends `validate[kind] FAIL ... : <head>` to `errors-log` (append-only).

## When to run

- Before declaring a task done (`stabilization` posture demands green).
- After any non-trivial code change.
- As the closing step of a `complex` task, alongside `os_remember` + `os_sync`.

## Related

- `testing` skill (what to test, the pyramid). This skill is about the *loop mechanics*.
- `debugging` tool (how to localize a fault once `os_validate` points at it).
