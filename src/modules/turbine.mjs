// Harness — Lean AI OS · modulo/turbine (ADR-0034)
// O Harness faz o trabalho pesado no repo: detecta estrutura, arquivos, codigo,
// docs, testes, configs e entrega um PERFIL pronto. Sempre escopado ao PROJECT_ROOT;
// nunca toca/expoe .harness. Globais (projeto todo) ou isoladas (subpasta).

import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { PROJECT_ROOT } from "../core/paths.mjs";
import { readIfExists } from "../core/util.mjs";
import { loadCodeMap, codeMapStale, scan } from "./codemap.mjs";
import { computeWorkingSet } from "./routing.mjs";
import { classify } from "./orchestrate.mjs";
import { posture } from "./navigation.mjs";
import { handoff } from "./session.mjs";
import { writeHandoffFile } from "./channel.mjs";
import { gaps } from "./gaps.mjs";

const PROJECT_IGNORE = new Set([".harness", ".git", "node_modules", "dist", "build", "coverage", ".next", ".nuxt", "out", "tmp", "vendor", ".cache", ".idea", ".vscode", ".cursor", ".gemini", ".windsurf", ".agents"]);

// Lista pastas/arquivos do projeto (ou de uma subpasta). Protege .harness e ruido.
export function inspectTree(sub = ".", { maxEntries = 500, maxDepth = 4 } = {}) {
  const base = resolve(PROJECT_ROOT, sub || ".");
  if (base !== PROJECT_ROOT && !base.startsWith(PROJECT_ROOT + "/") && !base.startsWith(PROJECT_ROOT + "\\")) {
    throw new Error("fora do projeto: " + sub);
  }
  const out = [];
  (function walk(dir, depth) {
    if (depth > maxDepth || out.length >= maxEntries) return;
    let entries = [];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (PROJECT_IGNORE.has(e.name)) continue;
      if (out.length >= maxEntries) return;
      const rel = join(dir, e.name).slice(PROJECT_ROOT.length + 1).split("\\").join("/");
      if (e.isDirectory()) { out.push({ type: "dir", path: rel }); walk(join(dir, e.name), depth + 1); }
      else out.push({ type: "file", path: rel });
    }
  })(base, 0);
  return { root: PROJECT_ROOT.split("\\").join("/"), sub, count: out.length, truncated: out.length >= maxEntries, entries: out };
}

// Perfil profundo do projeto: estrutura, stack, entrypoints, docs, testes, configs, smells.
export function analyzeProject() {
  let m = loadCodeMap();
  try { if (!m || codeMapStale()) { scan(); m = loadCodeMap(); } } catch { /* best-effort */ }
  const tree = inspectTree(".", { maxEntries: 800, maxDepth: 5 });
  const files = tree.entries.filter((e) => e.type === "file").map((e) => e.path);
  const dirs = tree.entries.filter((e) => e.type === "dir").length;
  const rx = (re) => files.filter((f) => re.test(f));
  const docs = rx(/(^|\/)(readme|contributing|changelog)|(^|\/)docs\//i);
  const tests = rx(/(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\./i);
  const configs = rx(/(^|\/)(package\.json|tsconfig.*\.json|vite\.config|webpack\.config|rollup\.config|\.eslintrc|dockerfile|docker-compose|requirements\.txt|pyproject\.toml|cargo\.toml|go\.mod|pom\.xml|build\.gradle|makefile|\.env\.example)/i);
  const entrypoints = rx(/(^|\/)(index|main|app|server|cli)\.(m?js|cjs|ts|tsx|jsx|py|go|rs|java|rb)$/i).slice(0, 10);
  let scripts = {}, pkgName = null, deps = [];
  const pj = readIfExists(join(PROJECT_ROOT, "package.json"));
  if (pj) { try { const d = JSON.parse(pj); scripts = d.scripts || {}; pkgName = d.name || null; deps = Object.keys({ ...(d.dependencies || {}), ...(d.devDependencies || {}) }).slice(0, 30); } catch { /* */ } }
  return {
    root: tree.root,
    package: pkgName,
    stack: m ? m.stack : [],
    counts: { entries: tree.count, dirs, codeFiles: m ? m.fileCount : 0, codeLines: m ? m.totalLines : 0 },
    entrypoints,
    configs: configs.slice(0, 20),
    docs: docs.slice(0, 20),
    tests: { has: tests.length > 0, count: tests.length, sample: tests.slice(0, 8) },
    deps,
    scripts,
    smells: m ? m.smells : [],
    treeTruncated: tree.truncated,
  };
}

// FLUXO PADRAO ("turbina"): scan + analyze + gaps + handoff -> entrega tudo p/ a LLM.
export function pipeline(intent) {
  const goal = (intent && intent.trim()) || "perfil do projeto";
  try { scan(); } catch { /* */ }
  const profile = analyzeProject();
  const ws = computeWorkingSet(goal);
  const h = handoff(goal, {});
  let handoffPath = null;
  try { handoffPath = writeHandoffFile(h).path; } catch { /* */ }
  return { intent: goal, classification: classify(ws), profile, gaps: gaps(goal).items, handoffPath, posture: posture() };
}

// Catalogo das automacoes disponiveis (globais x isoladas) — fluxo padrao discoverable.
export function automations() {
  return {
    global: [
      { id: "pipeline", tool: "os_pipeline", desc: "fluxo padrao: scan+analyze+gaps+handoff; entrega o perfil + handoff.md" },
      { id: "analyze", tool: "os_analyze", desc: "perfil profundo: estrutura, stack, entrypoints, docs, testes, configs, smells" },
      { id: "scan", tool: "os_scan", desc: "mapeia codigo/stack/smells -> code-map" },
      { id: "gaps", tool: "os_gaps", desc: "o que falta (testes, arquivos, smells)" },
      { id: "metrics", tool: "os_metrics", desc: "economia de contexto por tarefa" },
    ],
    isolated: [
      { id: "inspect", tool: "os_inspect", desc: "lista uma subpasta/modulo (ex: inspect src/payments)" },
      { id: "work", tool: "os_work", desc: "working-set <=5 arquivos para uma tarefa especifica" },
      { id: "find", tool: "os_find", desc: "acha arquivos/simbolos por termo" },
    ],
    note: "Harness faz o pesado no repo (deteccao/estrutura/contexto); a LLM faz a codificacao/inteligencia. .harness/ e protegido.",
  };
}
