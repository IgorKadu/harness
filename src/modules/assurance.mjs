// Harness — Lean AI OS · module/assurance (ADR-0041)
// Two cheap, deterministic directives inspired by Claude Code's Dynamic Workflows — WITHOUT the
// expensive 1000-subagent runtime (that would "explode" tokens, against our lean thesis):
//
//   taskShape(intent) — anti-explosion guard. Detects when a task is "dynamic-workflow shaped"
//     (large / parallelizable / adversarial / long) and advises ESCALATING — delegate to the
//     native Dynamic Workflows if present, else decompose into subsessions — instead of grinding
//     one context window until it blows up.
//   verify(intent)    — adversarial verification. For high-stakes results, a refutation checklist:
//     attack your own answer from an independent angle and iterate until it converges (the gem
//     of Dynamic Workflows), at ~150 tokens.

import { norm } from "../core/util.mjs";
import { computeWorkingSet } from "./routing.mjs";
import { classify, decompose } from "./orchestrate.mjs";

const REPO_WIDE = ["todos os arquivos", "todo o repo", "repo inteiro", "em massa", "toda a base", "todo o codigo", "centenas de arquivos", "migrar todos", "migracao completa", "repo-wide", "codebase-wide", "across the codebase", "every file"];
const PARALLEL_HINTS = ["todos os arquivos", "todo o repo", "repo inteiro", "varios", "varias", "multiplo", "multiplos", "em massa", "varredura", "sweep", "auditoria", "audit", "migrar", "migracao", "migration", "rename", "renomear", "port ", "portar", "cross-check", "centenas", "todo o codigo", "toda a base"];
const ADVERSARIAL_HINTS = ["seguranca", "security", "auditoria", "audit", "plano", "estrategia", "decisao", "decision", "critico", "critical", "hipotese", "trade-off", "tradeoff", "arquitetura", "architecture", "irreversivel", "produção", "producao", "deploy"];

// The "shape" of a task: should we do it in one pass, or escalate the orchestration?
export function taskShape(intent) {
  if (!intent || !intent.trim()) throw new Error("taskShape requires an intent");
  const q = norm(intent);
  const ws = computeWorkingSet(intent);
  const dec = decompose(intent);
  const cls = classify(ws);
  const codeCandidates = ws.codeCandidates ? ws.codeCandidates.length : 0;

  const repoWide = REPO_WIDE.some((h) => q.includes(norm(h)));
  const parallelizable = repoWide || PARALLEL_HINTS.some((h) => q.includes(norm(h))) || codeCandidates >= 8;
  const adversarial = ADVERSARIAL_HINTS.some((h) => q.includes(norm(h)));
  const longRunning = dec.needed || !ws.within || codeCandidates >= 8 || repoWide;
  const scale = (!ws.within || codeCandidates >= 12 || repoWide) ? "large" : (codeCandidates >= 5 || cls === "complex" ? "medium" : "small");

  // Escalate when the task is genuinely big/parallel/long — grinding it in one context is the
  // failure mode the user fears. Adversarial alone does NOT escalate; it just asks for verify().
  const escalate = scale === "large" || (parallelizable && longRunning);

  const recommendation = escalate
    ? {
        verdict: "ESCALATE — do not grind this in a single context window.",
        options: [
          "If the environment has Claude Code Dynamic Workflows: ask Claude to 'create a workflow' — it runs subagents in parallel OUTSIDE the conversation, saves progress, and resumes on interruption. Confirm before running (it costs meaningfully more tokens).",
          "Otherwise (lean path): os_subtasks spawn to split it (the decomposition is shown by os_orchestrate), then work ONE subsession at a time, checkpointing Saves between them. Same divide-and-converge shape, low cost.",
        ],
      }
    : {
        verdict: "SINGLE-PASS — fits one context; just execute with the working-set.",
        options: ["Load only the capsule's <=5 files and do it; decompose only if the budget is exceeded."],
      };

  return {
    intent,
    classification: cls,
    scale,
    parallelizable,
    adversarial,
    longRunning,
    codeCandidates,
    within: ws.within,
    shape: escalate ? "escalate" : "single-pass",
    needsVerify: adversarial || cls === "complex" || scale === "large",
    // Cost posture (ADR-0041 #3): pick the cheapest SUFFICIENT path. Token cost (input/output)
    // varies by model, so reason in working-set tokens, not currency.
    cost: {
      workingSetTokens: ws.total,
      within: ws.within,
      posture: escalate
        ? "Heavy shape — escalate; confirm token cost first (input/output vary by model)."
        : (!ws.within
          ? "Over budget — decompose so each step stays cheap; never load 'por garantia'."
          : "Cheap — single pass; load only the capsule's <=5 files."),
    },
    recommendation,
  };
}

// Adversarial verification directive — refute your own result before accepting it.
export function verify(intent = null) {
  return {
    intent: intent || null,
    when: "Before ACCEPTING a high-stakes result: a complex plan, a security/architecture/critical decision, or a large change. Skip for trivial work.",
    steps: [
      "State the result/claim in one sentence.",
      "Attack it from an INDEPENDENT angle: what would a skeptic or red-team say is wrong or missing?",
      "List concrete failure modes, edge cases and counterexamples — at least two.",
      "Check against REALITY, not memory: run os_validate (tests/lint) and re-read the code (grep/os_find).",
      "If a refutation holds, fix and repeat. Accept only when refutations are exhausted (converge).",
    ],
    principle: "Independent verification beats confidence. This mirrors Dynamic Workflows (agents refute findings until they converge) — cheaply, in one context. Never report green without an actual os_validate PASS.",
  };
}

// Convenience: both at once (used by os_assess and the capsule).
export function assess(intent) {
  const shape = taskShape(intent);
  return { shape, verify: shape.needsVerify ? verify(intent) : null };
}
