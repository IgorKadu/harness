# ADR-0041 — Workflow shape (escalate vs single-pass) + adversarial verification

- **Status:** accepted
- **Date:** 2026-06-05
- **Prior context:** ADR-0022 (lean/retrieval-first), ADR-0027 (orchestration), ADR-0036
  (validation loop), ADR-0040 (context capsule).
- **External input:** Anthropic's "dynamic workflows in Claude Code" (research preview, 2026-05-28):
  Claude writes a JS orchestration script on the fly and a runtime runs 10s–100s of parallel
  subagents OUTSIDE the conversation (up to 1,000/run, 16 concurrent), refuting findings until they
  converge, saving progress so an interrupted run resumes. Powerful, but consumes substantially
  more tokens and is explicitly "not for everything".

## Problem
Dynamic workflows validate the Harness thesis (coordination outside the conversation, progress
saved, decompose-and-converge) but the heavy 1000-subagent runtime is the opposite of our lean,
low-cost goal — adopting it wholesale would make the LLM "explode" tokens. Two cheap principles
from it were missing here:
1. **Knowing when a task is too big for one context** — so we escalate instead of grinding the
   window until it blows up.
2. **Adversarial verification** — refute a high-stakes result before trusting it.

## Decision
**Add two cheap, deterministic directives (no new runtime, no mass subagents): `taskShape` and
`verify`, exposed together as `assess`.**

### `taskShape(intent)` — anti-explosion guard
Classifies a task as `single-pass` (fits one context — just execute) or `escalate` (large /
parallelizable / long — do NOT grind it in one window). Signals: working-set budget, code-map
candidate count, and intent phrases (repo-wide / mass / migration / audit). When `escalate`, it
recommends either delegating to native Dynamic Workflows (if the environment has it; confirm first,
it costs more) or the lean path — `os_decompose` + `os_subtasks`, one subsession at a time with
Save checkpoints between them (same divide-and-converge shape, low cost).

### `verify(intent)` — adversarial verification
A ~150-token refutation checklist for high-stakes results (complex plan, security/architecture/
critical decision, large change): state the claim, attack it from an independent angle, list
failure modes, check against reality (`os_validate` + re-read code), iterate until it converges.

### Surfaces
- Engine: `taskShape`, `verify`, `assess` (barrel). The capsule (`os_start <intent>`) now carries
  `task.shape`/`needsVerify` and, when `escalate`, steers `nextAction` to escalate instead of grind.
- CLI `os assess` / `os verify`; MCP `os_assess` / `os_verify`.
- Skill `.ai/knowledge/skills/workflow-shape.md` (route `workflow-shape`).

## Consequences
### Positive
- The single biggest cost risk — grinding a repo-wide task in one context — is caught early and
  redirected, in line with the user's hard "don't explode tokens" constraint.
- High-stakes outputs get an independent refutation pass (the gem of dynamic workflows) cheaply.
- Effort is matched to task shape; no heavy orchestration for small tasks, no single-pass grind for
  big ones.

### Negative / accepted trade-offs
- Shape detection is heuristic (keywords + budget signals), like the rest of the system — a signal,
  not a guarantee; the LLM still decides.
- We deliberately do NOT implement parallel subagents; for truly massive parallel work we point to
  the native feature rather than rebuild it.

## Alternatives considered
- **Build a parallel-subagent runtime** — rejected: exactly the token explosion we must avoid, and
  duplicates Anthropic infra. Delegating to the native feature is cheaper and honest.
- **Always run verification** — rejected: wasteful on trivial work; `assess` attaches it only when
  the task is adversarial/complex/large.

## Future impact
`taskShape` is the natural place to later add model-aware cost posture (ADR-0041 follow-up #3:
estimate token/effort and prefer the cheapest sufficient path). New escalation targets (e.g. a
future Harness subagent runner) slot into `recommendation.options` without changing the contract.
