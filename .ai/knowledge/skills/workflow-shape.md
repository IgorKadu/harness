---
version: 1.0.0
updated: 2026-06-05
tier: conditional
tokens: ~520
load: workflow-shape
triggers: escalar, escalate, paralelo, parallel, subagente, subagent, dynamic workflow, workflow, verificar, verify, adversarial, refutar, auditoria, migracao, em massa
---

# Skill: Workflow shape (escalate vs single-pass) + adversarial verify

> Introduced in ADR-0041, inspired by Claude Code's Dynamic Workflows — but WITHOUT the expensive
> 1000-subagent runtime. The point is to spend the right effort on the right shape of task, so a
> big job does not "explode" the context window and a critical answer is not trusted blindly.

## Read the shape before starting (`os_assess`)

A task has a shape. Grinding the wrong shape in one context is the main way costs blow up.

| Shape | Looks like | Do this |
|---|---|---|
| **single-pass** | one bug, one feature, a few files, fits the budget | just execute with the capsule's <=5 files |
| **escalate** | repo-wide sweep, mass migration, hundreds of files, long/parallel | do NOT grind it in one context |

When `os_assess` says **escalate**, pick one:
1. **Native Dynamic Workflows** (if the environment is Claude Code with the feature): ask Claude to
   "create a workflow". It runs subagents in parallel OUTSIDE the conversation, saves progress, and
   resumes on interruption. It costs meaningfully more tokens — confirm before running, start scoped.
2. **Lean path** (any environment): `os_decompose` the task, `os_subtasks spawn`, and work ONE
   subsession at a time, checkpointing Saves between them. Same divide-and-converge shape, low cost.

The capsule (`os_start <intent>`) already carries `task.shape`; if it is `escalate`, its
`nextAction` steers you to escalate instead of grinding.

## Verify before accepting high-stakes results (`os_verify`)

The gem of Dynamic Workflows is **adversarial verification**: independent agents try to refute each
finding and the run iterates until answers converge. You can do this cheaply, in one context, for
any high-stakes result (a complex plan, a security/architecture/critical decision, a large change):

1. State the result in one sentence.
2. Attack it from an INDEPENDENT angle — what would a skeptic/red-team say is wrong or missing?
3. List concrete failure modes, edge cases, counterexamples (≥2).
4. Check against REALITY, not memory: run `os_validate` and re-read the code (`os_find`/grep).
5. If a refutation holds, fix and repeat. Accept only when refutations are exhausted (converge).

`os_assess` attaches this checklist automatically when the task is adversarial/complex/large.

## Cost discipline (token & context)

- **Match effort to shape.** Don't escalate a single-pass task (waste); don't grind an escalate task
  (explosion). `os_assess` is the cheap classifier that prevents both.
- **Escalation is opt-in and confirmed.** Heavy orchestration (native or subsessions) is for tasks
  that genuinely need it. Input/output token cost varies by model — prefer the cheapest sufficient path.
- **Never claim green without `os_validate`.** Verification is about reality, not confidence.

## Anti-patterns

- Running a repo-wide migration as one long single-context chat — it will exhaust the window.
- Spinning up heavy orchestration for a two-file change — pure waste.
- Accepting a critical plan/audit without an independent refutation pass.
