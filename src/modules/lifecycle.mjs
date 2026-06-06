// Harness — Lean AI OS · module/lifecycle (ADR-0038)
// Project lifecycle of a Harness INSTALL: reset (wipe to a fresh, project-agnostic state),
// reforce (deterministic directive telling the LLM to recompile/condense memory+saves+docs),
// and version (read the package version). Operates on the local .ai/ tree (engine paths).

import { existsSync, rmSync, readdirSync, mkdirSync, unlinkSync } from "node:fs";
import { writeFileAtomic } from "../core/io.mjs";
import { join, basename } from "node:path";
import { ROOT, AI, PROJECT_ROOT } from "../core/paths.mjs";
import { readIfExists } from "../core/util.mjs";

export function version() {
  const marker = readIfExists(join(ROOT, "VERSION"));
  if (marker && marker.trim()) return marker.trim();
  try { return JSON.parse(readIfExists(join(ROOT, "package.json"))).version || "0.0.0"; }
  catch { return "0.0.0"; }
}

// Fresh skeletons (single source of truth for a zeroed memory). Kept tiny on purpose.
function freshStateOfWorld(proj) {
  return `# State of the World — Harness
<!-- last-sync: ${new Date().toISOString()} -->

> Memoria quente. Reescrita a cada /sync. Alvo: <= 1200 tokens.

## Identidade
- **Projeto:** ${proj} (recem-inicializado com Harness).

## Onde paramos
- **Foco ativo:** onboarding. Rode 'init' e depois 'scan'.

## Decisoes vigentes
- (nenhuma ainda)
`;
}
const FRESH_LOGS = [
  ["tasks-log.md", "# Tasks Log (append-only)\n"],
  ["decisions-log.md", "# Decisions Log (append-only)\n"],
  ["errors-log.md", "# Errors & Solutions Log (append-only)\n"],
];
const FRESH_DECISIONS_INDEX = "# Decisions Index\n\n| ID | Titulo | Status |\n|---|---|---|\n";

// Wipe this install back to a clean, project-agnostic state — as if freshly installed.
// Clears: memory logs, decisions-index, state-of-world, project.json (-> discovery), saves,
// runtime, handoff/report/session. PRESERVES: CONSTITUTION, knowledge, retrieval-index, specs, code.
export function reset({ confirm = false } = {}) {
  if (!confirm) return { ok: false, reason: "reset requires confirm:true (destructive). Clears memory/saves of THIS install.", wouldClear: ["memory logs", "decisions-index", "state-of-world", "project.json", "saves", "runtime", "handoff/report/session"] };
  const proj = basename(PROJECT_ROOT) || "projeto";
  const cleared = [];

  const memLogs = join(AI, "memory", "logs");
  mkdirSync(memLogs, { recursive: true });
  for (const [f, head] of FRESH_LOGS) { writeFileAtomic(join(memLogs, f), head, "utf8"); cleared.push("memory/logs/" + f); }
  writeFileAtomic(join(AI, "memory", "decisions-index.md"), FRESH_DECISIONS_INDEX, "utf8"); cleared.push("memory/decisions-index.md");
  writeFileAtomic(join(AI, "memory", "state-of-world.md"), freshStateOfWorld(proj), "utf8"); cleared.push("memory/state-of-world.md");
  writeFileAtomic(join(AI, "project.json"), JSON.stringify({ phase: "discovery", phase_set_at: new Date().toISOString(), created: new Date().toISOString() }, null, 2) + "\n", "utf8"); cleared.push("project.json");

  // saves: remove the whole directory (absence re-triggers bootstrap)
  const savesDir = join(AI, "saves");
  if (existsSync(savesDir)) { try { rmSync(savesDir, { recursive: true, force: true }); cleared.push("saves/"); } catch { /* */ } }

  // runtime + transient channel files
  const runtime = join(AI, "runtime");
  if (existsSync(runtime)) { for (const f of safeList(runtime)) { try { unlinkSync(join(runtime, f)); cleared.push("runtime/" + f); } catch { /* */ } } }
  for (const f of ["handoff.md", "report.md", "session.json", "subsessions.json"]) {
    const p = join(AI, f);
    if (existsSync(p)) { try { unlinkSync(p); cleared.push(f); } catch { /* */ } }
  }
  return { ok: true, project: proj, version: version(), clearedCount: cleared.length, cleared, preserved: ["CONSTITUTION.md", "knowledge/", "retrieval-index.json", "specs/", "engine code"] };
}

function safeList(dir) { try { return readdirSync(dir); } catch { return []; } }

// Deterministic directive: tells the LLM to RECOMPILE memory/saves/docs to the current project
// state — a refinement pass that condenses without losing critical info. The LLM executes it
// (LLM_CONTRACT: Harness specifies, LLM rewrites). Like rebuilding a clean save from progress.
export function reforce() {
  return {
    objective: "Recompile and condense the project's memory, Saves and docs so they reflect the CURRENT state — a refinement pass: tighten wording, drop redundancy, keep every critical decision. Lower token/context cost without losing signal.",
    read_first: [
      "os_scan then os_pipeline — refresh the code-map and project profile",
      "os_saves (all layers) — current checkpoints",
      "state-of-world + decisions-index — current hot memory",
      "os_recall on key terms — pull critical history from the append-only logs",
    ],
    rewrite: [
      { target: ".ai/memory/state-of-world.md", how: "rewrite within the token cap; reflect where we actually are now; via os_sync after editing", keep: "current phase, active focus, last milestone, next step" },
      { target: "Save L1 overview", how: "os_save_write 1 — identity/goal/scope/stack/phase/global stage, condensed", keep: "what the project IS" },
      { target: "Save L2 progress", how: "os_save_write 2 — milestones with accurate stage (initial|pending|done)", keep: "what is done vs pending" },
      { target: "Save L3 technical", how: "os_save_write 3 — architecture, modules, locked decisions, validation state, resume point", keep: "how to resume coding safely" },
      { target: ".ai/memory/decisions-index.md", how: "ensure every accepted ADR is listed; one line each", keep: "all ADR rows" },
    ],
    principles: [
      "Condense, do not delete signal. Critical decisions/ADRs and constraints are never dropped.",
      "Align to the current code (code-map) and validation state, not to stale notes.",
      "Respect the caps (CORE <= 600/1200 tk). If something does not fit hot memory, push it to a Save or a log.",
      "Append-only logs are history — never rewrite them; only the rewritable artifacts above.",
    ],
    closeout: "After rewriting: os_sync + os_save_checkpoint layers='all' note='reforce: memoria/saves/docs recompilados ao estado atual'.",
    version: version(),
  };
}
