// Harness — Lean AI OS · module/saves (ADR-0037)
// "Save points" — consolidated checkpoints the LLM reads FIRST, before running any heavy
// flow. Like a game save: if a Save exists and is fresh, resume from it (cheap); if not,
// run the flows (init/pipeline/scan/...) and then write the Saves. On completion, update the
// affected layer(s) — structural change updates all. Saves are durable memory (committed).
//
// Three layers by altitude (encompass any project, new or ongoing; each has a lifecycle stage):
//   1 overview   — macro: identity, goal, scope/MVP, stack, phase, global status
//   2 progress   — stages/milestones, each with stage = initial|pending|done
//   3 technical  — micro: architecture, modules, locked decisions, validation state, resume point

import { mkdirSync, existsSync, statSync } from "node:fs";
import { writeFileAtomic } from "../core/io.mjs";
import { join } from "node:path";
import { AI } from "../core/paths.mjs";
import { readIfExists, estimateTokens } from "../core/util.mjs";
import { loadCodeMap } from "./codemap.mjs";

const SAVES_DIR = join(AI, "saves");
export const SAVE_STAGES = ["initial", "pending", "done"];

export const SAVE_LAYERS = [
  { id: 1, slug: "overview", file: "save-1-overview.md", title: "Overview", read: "first", scope: "macro: identity, goal, scope/MVP, stack, phase, global stage" },
  { id: 2, slug: "progress", file: "save-2-progress.md", title: "Progress", read: "when planning work", scope: "stages/milestones with stage=initial|pending|done" },
  { id: 3, slug: "technical", file: "save-3-technical.md", title: "Technical", read: "when touching code", scope: "micro: architecture, modules, locked decisions, validation, resume point" },
];

function layerOf(ref) {
  if (ref == null) return null;
  const s = String(ref).toLowerCase();
  return SAVE_LAYERS.find((l) => String(l.id) === s || l.slug === s || l.title.toLowerCase() === s) || null;
}
function absOf(layer) { return join(SAVES_DIR, layer.file); }
function relOf(layer) { return ".ai/saves/" + layer.file; }

// Parse the minimal frontmatter (stage/updated) without a YAML dep.
function parseMeta(text) {
  const meta = { stage: null, updated: null };
  if (!text) return meta;
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return meta;
  for (const line of m[1].split("\n")) {
    const mm = line.match(/^(\w+):\s*(.+)$/);
    if (mm) { if (mm[1] === "stage") meta.stage = mm[2].trim(); if (mm[1] === "updated") meta.updated = mm[2].trim(); }
  }
  return meta;
}

// Status of every layer: exists, stage, updated, age, tokens + a saves-first recommendation.
export function savesStatus() {
  const layers = SAVE_LAYERS.map((l) => {
    const text = readIfExists(absOf(l));
    const exists = text != null;
    const meta = parseMeta(text);
    let ageHours = null;
    try { if (exists) ageHours = Math.round((Date.now() - statSync(absOf(l)).mtimeMs) / 36e5); } catch { /* */ }
    // stale = the code changed after this Save was written (resume from it with caution).
    let stale = false;
    try { const cm = loadCodeMap(); if (exists && cm && meta.updated && new Date(cm.generated) > new Date(meta.updated)) stale = true; } catch { /* */ }
    return { layer: l.id, slug: l.slug, title: l.title, file: relOf(l), exists, stage: meta.stage, updated: meta.updated, ageHours, stale, tokens: exists ? estimateTokens(text) : 0 };
  });
  const missing = layers.filter((l) => !l.exists).map((l) => l.layer);
  const staleLayers = layers.filter((l) => l.exists && l.stale).map((l) => l.layer);
  const anyExist = layers.some((l) => l.exists);
  const recommendation = !anyExist
    ? "NO SAVES YET — run the flows (os_pipeline/os_scan) to build context, then write the Saves with os_save_write."
    : (missing.length
      ? `SAVES-FIRST — read existing Saves before any flow. Missing layer(s): ${missing.join(", ")} — fill them after the next relevant work.`
      : (staleLayers.length
        ? `SAVES-FIRST (with caution) — code changed after Save layer(s) ${staleLayers.join(", ")}; re-derive those before trusting them, then os_save_checkpoint.`
        : "SAVES-FIRST — read the Saves and resume from them; only run heavy flows for what the Saves do not already answer."));
  return { dir: ".ai/saves", layers, missing, staleLayers, bootstrapNeeded: !anyExist, recommendation };
}

// Read one layer (ref = 1|overview|...) or all. Returns content for the LLM to resume from.
export function readSaves(ref = null) {
  if (ref != null) {
    const l = layerOf(ref);
    if (!l) throw new Error(`unknown save layer '${ref}'. Use: ${SAVE_LAYERS.map((x) => x.id + "/" + x.slug).join(", ")}`);
    const text = readIfExists(absOf(l));
    return { layer: l.id, slug: l.slug, file: relOf(l), exists: text != null, text: text || "" };
  }
  return { saves: SAVE_LAYERS.map((l) => { const t = readIfExists(absOf(l)); return { layer: l.id, slug: l.slug, file: relOf(l), exists: t != null, text: t || "" }; }) };
}

function frontmatter(layer, stage) {
  return `---\nlayer: ${layer.id}\ntitle: ${layer.title}\nstage: ${stage}\nupdated: ${new Date().toISOString()}\n---\n`;
}

// Write (replace) a layer's body. The LLM composes the body; Harness owns frontmatter/mechanics.
// opts: { stage="pending" } — lifecycle stage of this layer (initial|pending|done).
export function writeSave(ref, body, { stage = "pending" } = {}) {
  const l = layerOf(ref);
  if (!l) throw new Error(`unknown save layer '${ref}'. Use: ${SAVE_LAYERS.map((x) => x.id + "/" + x.slug).join(", ")}`);
  if (!SAVE_STAGES.includes(stage)) throw new Error(`invalid stage '${stage}'. Use: ${SAVE_STAGES.join(" | ")}`);
  try { mkdirSync(SAVES_DIR, { recursive: true }); } catch { /* */ }
  const content = frontmatter(l, stage) + `# Save · Layer ${l.id} — ${l.title}\n> ${l.scope}\n\n` + (body || "").trim() + "\n";
  writeFileAtomic(absOf(l), content, "utf8");
  return { layer: l.id, file: relOf(l), stage, tokens: estimateTokens(content) };
}

// Create empty skeletons for any missing layer (used on first bootstrap). Never overwrites.
export function initSaves() {
  const created = [];
  for (const l of SAVE_LAYERS) {
    if (existsSync(absOf(l))) continue;
    writeSave(l.id, `_(to fill — ${l.scope})_\n\n## Checkpoint log\n`, { stage: "initial" });
    created.push(l.id);
  }
  return { created, status: savesStatus() };
}

// Append a checkpoint line to the affected layer(s) and bump stage/updated. Structural change
// => layers="all". Mirrors "update the adequate Save; if structural, update them all".
// opts: { layers="all"|[ids], note, stage=null (keep current unless given) }
export function saveCheckpoint({ layers = "all", note = "", stage = null } = {}) {
  if (!note || !note.trim()) throw new Error("saveCheckpoint requires a note");
  if (stage != null && !SAVE_STAGES.includes(stage)) throw new Error(`invalid stage '${stage}'. Use: ${SAVE_STAGES.join(" | ")}`);
  const targets = (layers === "all" || layers == null)
    ? SAVE_LAYERS
    : (Array.isArray(layers) ? layers : [layers]).map(layerOf).filter(Boolean);
  if (!targets.length) throw new Error("no valid target layers");
  try { mkdirSync(SAVES_DIR, { recursive: true }); } catch { /* */ }
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const updated = [];
  for (const l of targets) {
    let text = readIfExists(absOf(l));
    if (text == null) { writeSave(l.id, `_(to fill — ${l.scope})_\n\n## Checkpoint log\n`, { stage: stage || "initial" }); text = readIfExists(absOf(l)); }
    const curStage = parseMeta(text).stage || "pending";
    const nextStage = stage || curStage;
    // bump frontmatter stage + updated
    text = text.replace(/^stage:.*$/m, `stage: ${nextStage}`).replace(/^updated:.*$/m, `updated: ${new Date().toISOString()}`);
    // append to the Checkpoint log (create the section if absent)
    if (!/##\s*Checkpoint log/i.test(text)) text = text.replace(/\s*$/, "\n\n## Checkpoint log\n");
    text = text.replace(/\s*$/, "") + `\n- ${stamp} · ${note.trim()}`;
    writeFileAtomic(absOf(l), text + "\n", "utf8");
    updated.push({ layer: l.id, stage: nextStage });
  }
  return { updated, note: note.trim() };
}
