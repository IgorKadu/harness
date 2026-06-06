// Harness — Lean AI OS · module/bootstrap (ADR-0040)
// The "context capsule": ONE deterministic, token-bounded packet the LLM reads to know exactly
// what it needs RIGHT NOW — in priority order — to start, continue or conclude. This is the
// single step-0 entry that prevents the two big LLM failure modes in long projects: skipping
// the saves-first protocol, and over-loading the context window. Cheap to read; cheap to refresh.
//
// Read order encoded in the packet: focus (the thread) -> saves digest (where we are) ->
// phase posture (how to behave) -> optional working-set (<=5 files for THIS task).

import { join } from "node:path";
import { AI } from "../core/paths.mjs";
import { writeFileAtomic } from "../core/io.mjs";
import { readIfExists, estimateTokens } from "../core/util.mjs";
import { brief } from "./navigation.mjs";
import { readSaves } from "./saves.mjs";
import { computeWorkingSet } from "./routing.mjs";
import { classify } from "./orchestrate.mjs";
import { taskShape } from "./assurance.mjs";

const FOCUS_PATH = join(AI, "runtime", "focus.json");

// ---- focus pointer: the live "thread" (objective + step + next action) ---------------------
export function getFocus() {
  const raw = readIfExists(FOCUS_PATH);
  if (raw == null) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// Merge-update the focus. Pass only the fields you want to change.
export function setFocus({ objective = null, step = null, total = null, next = null } = {}) {
  const cur = getFocus() || {};
  const f = {
    objective: objective ?? cur.objective ?? null,
    step: step ?? cur.step ?? null,
    total: total ?? cur.total ?? null,
    next: next ?? cur.next ?? null,
    updatedAt: new Date().toISOString(),
  };
  writeFileAtomic(FOCUS_PATH, JSON.stringify(f, null, 2) + "\n");
  return f;
}

export function clearFocus() {
  writeFileAtomic(FOCUS_PATH, JSON.stringify({ cleared: true }, null, 2) + "\n");
  return { cleared: true };
}

// Decide the single most useful next action (deterministic, never ambiguous).
function nextAction(b, focus) {
  const sv = b.saves;
  if (sv.bootstrapNeeded) return "No Saves yet — run os_pipeline (or os_scan) to build context, then write the Saves with os_save_write.";
  if (sv.staleLayers && sv.staleLayers.length) return `Code changed after Save layer(s) ${sv.staleLayers.join(", ")} — re-derive those (os_scan/os_pipeline), update them (os_save_write), then continue.`;
  if (b.pendingHandoff) return "A handoff is pending — call os_smash and follow it; close with os_report.";
  if (focus && focus.next) return `Continue the current thread: ${focus.next}`;
  return b.recommended_next;
}

// The capsule. Optional intent adds the <=5-file working-set for that specific task.
export function capsule(intent = null) {
  const b = brief();
  const focus = getFocus();
  const l1 = readSaves(1); // L1 overview = cheapest macro context; include it whole if present

  const packet = {
    readOrder: ["focus", "saves", "posture", intent ? "task" : null].filter(Boolean),
    phase: b.phase,
    maturity: b.maturity,
    posture: b.posture,
    focus: focus && !focus.cleared ? { objective: focus.objective, step: focus.step, total: focus.total, next: focus.next, updatedAt: focus.updatedAt } : null,
    saves: {
      bootstrapNeeded: b.saves.bootstrapNeeded,
      staleLayers: b.saves.staleLayers || [],
      recommendation: b.saves.recommendation,
      layers: b.saves.layers.map((l) => ({ layer: l.layer, title: l.title, stage: l.stage, exists: l.exists, stale: l.stale })),
      overview: l1.exists ? l1.text : null,
    },
    pendingHandoff: b.pendingHandoff,
    lastReport: b.lastReport && b.lastReport.summary ? b.lastReport.summary : null,
    nextAction: nextAction(b, focus && !focus.cleared ? focus : null),
  };

  if (intent && intent.trim()) {
    const ws = computeWorkingSet(intent);
    const shape = taskShape(intent);
    packet.task = {
      intent,
      classification: classify(ws),
      shape: shape.shape,
      needsVerify: shape.needsVerify,
      load: ws.files.filter((f) => f.exists).map((f) => f.rel),
      codeCandidates: (ws.codeCandidates || []).slice(0, 5).map((c) => c.path),
      budget: { tokens: ws.total, cap: ws.cap, within: ws.within },
    };
    // Anti-explosion: steer to escalate when the task is dynamic-workflow shaped — but NEVER clobber
    // a hard prerequisite (no Saves / stale Saves / pending handoff): those must be resolved first.
    const ready = !b.saves.bootstrapNeeded && !(b.saves.staleLayers || []).length && !b.pendingHandoff;
    if (ready && shape.shape === "escalate") packet.nextAction = shape.recommendation.verdict + " " + shape.recommendation.options[0];
    else if (ready && shape.needsVerify) packet.nextAction = (packet.nextAction || "") + " Before accepting, run an adversarial verify pass (os_assess / os_verify).";
    else if (shape.shape === "escalate") packet.task.note = "Big task — but resolve nextAction's prerequisite first, then escalate (os_assess).";
  }

  packet.capsuleTokens = estimateTokens(JSON.stringify(packet));
  packet.note = "Read this FIRST and act on nextAction. Do not re-run heavy flows for what the capsule already answers.";
  return packet;
}
