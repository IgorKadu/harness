// Harness — Lean AI OS · MOTOR (o cerebro)
// Funcoes PURAS: retornam dados, nao imprimem, nao chamam process.exit.
// Todas as bocas (CLI, MCP, futura extensao) importam daqui. Zero duplicacao (ADR-0023).

import { readFileSync, writeFileSync, existsSync, appendFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, "..");
const AI = join(ROOT, ".ai");
const INDEX_PATH = join(AI, "retrieval-index.json");

// ---- util ------------------------------------------------------------------

export const estimateTokens = (str) => Math.round((str?.length ?? 0) / 4);

export function readIfExists(absPath) {
  try { return readFileSync(absPath, "utf8"); } catch { return null; }
}

export function loadIndex() {
  const raw = readIfExists(INDEX_PATH);
  if (raw == null) throw new Error(`retrieval-index.json nao encontrado em ${INDEX_PATH}`);
  try { return JSON.parse(raw); } catch (e) { throw new Error(`retrieval-index.json invalido: ${e.message}`); }
}

// lower + sem acento, para casamento de trigger
export function norm(s) {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function fileTokens(relPath) {
  const content = readIfExists(join(ROOT, relPath));
  if (content == null) return { rel: relPath, exists: false, tokens: 0 };
  return { rel: relPath, exists: true, tokens: estimateTokens(content) };
}

// ---- roteamento ------------------------------------------------------------

export function route(intent) {
  const idx = loadIndex();
  const q = norm(intent);
  const matched = [];
  for (const r of idx.routes) {
    const hit = r.triggers.find((t) => q.includes(norm(t)));
    if (hit) matched.push({ id: r.id, trigger: hit, load: r.load });
  }
  const files = [];
  const seen = new Set();
  const push = (p) => { if (!seen.has(p)) { seen.add(p); files.push(p); } };
  (idx.always || []).forEach(push);
  matched.forEach((m) => m.load.forEach(push));
  return { idx, matched, files };
}

// Working-set completo: arquivos + tokens + veredito de orcamento + postura.
export function computeWorkingSet(intent) {
  const { idx, matched, files } = route(intent);
  const cap = idx.budget?.working_set_token_cap ?? 15000;
  const items = files.map(fileTokens);
  const total = items.reduce((a, b) => a + b.tokens, 0);
  return {
    intent,
    matched,
    files: items,
    total,
    cap,
    within: total <= cap,
    fallback: matched.length === 0,
    posture: posture(),
    codeCandidates: searchCode(intent).hits,
  };
}

// ---- CORE / tokens ---------------------------------------------------------

export function measureCore() {
  const idx = loadIndex();
  const coreCap = idx.budget?.core_token_cap ?? 600;
  const sowCap = idx.budget?.state_of_world_token_cap ?? 1200;
  const constitution = fileTokens(".ai/CONSTITUTION.md");
  const sow = fileTokens(".ai/memory/state-of-world.md");
  return {
    constitution: { ...constitution, cap: coreCap, ok: constitution.tokens <= coreCap },
    stateOfWorld: { ...sow, cap: sowCap, ok: sow.tokens <= sowCap },
    total: constitution.tokens + sow.tokens,
    ok: constitution.tokens <= coreCap && sow.tokens <= sowCap,
  };
}

// Le o CORE inteiro (CONSTITUTION + state-of-world) numa chamada so.
export function readCore() {
  return {
    constitution: readIfExists(join(AI, "CONSTITUTION.md")) ?? "",
    stateOfWorld: readIfExists(join(AI, "memory", "state-of-world.md")) ?? "",
  };
}

// ---- doctor ----------------------------------------------------------------

export function doctor() {
  const idx = loadIndex();
  const checks = [];
  const add = (ok, msg) => checks.push({ ok, msg });

  ["/CONSTITUTION.md", "/memory/state-of-world.md"].forEach((p) =>
    add(existsSync(join(AI, p)), `CORE presente: .ai${p}`));

  const allPaths = new Set([...(idx.always || [])]);
  idx.routes.forEach((r) => r.load.forEach((p) => allPaths.add(p)));
  let missing = 0;
  for (const p of allPaths) if (!existsSync(join(ROOT, p))) { add(false, `indice aponta p/ arquivo inexistente: ${p}`); missing++; }
  if (missing === 0) add(true, `indice integro: ${allPaths.size} arquivos referenciados existem`);

  const maxFiles = idx.budget?.max_files_per_route ?? 5;
  let over = 0;
  idx.routes.forEach((r) => { if (r.load.length > maxFiles) { add(false, `rota '${r.id}' excede max_files_per_route`); over++; } });
  if (over === 0) add(true, `todas as rotas respeitam max_files_per_route (${maxFiles})`);

  const core = measureCore();
  add(core.constitution.ok, `CONSTITUTION ~${core.constitution.tokens} tk ${core.constitution.ok ? "<=" : ">"} ${core.constitution.cap}`);
  add(core.stateOfWorld.ok, `state-of-world ~${core.stateOfWorld.tokens} tk ${core.stateOfWorld.ok ? "<=" : ">"} ${core.stateOfWorld.cap}`);

  const hotLogs = [...(idx.always || [])].filter((p) => p.includes("/memory/logs/"));
  add(hotLogs.length === 0, hotLogs.length === 0 ? `logs append-only fora do caminho quente` : `logs no 'always': ${hotLogs.join(", ")}`);

  // ADR-0024: integridade do estado de fase
  const st = getState();
  add(PHASES.includes(st.phase), `fase valida: ${st.phase}`);

  const problems = checks.filter((c) => !c.ok).length;
  return { checks, problems, ok: problems === 0 };
}

// ---- sync ------------------------------------------------------------------

// Reescreve (nao append) o timestamp do state-of-world e mede o CORE.
export function sync() {
  const sowPath = join(AI, "memory", "state-of-world.md");
  const content = readIfExists(sowPath);
  if (content == null) throw new Error("state-of-world.md nao encontrado");
  const stamp = new Date().toISOString();
  let next = content.replace(/<!-- last-sync:[^>]*-->\n?/g, "");
  next = next.replace(/^(# State of the World — Harness\n)/, `$1<!-- last-sync: ${stamp} -->\n`);
  writeFileSync(sowPath, next, "utf8");
  let rescanned = false;
  try { if (codeMapStale()) { scan(); rescanned = true; } } catch { /* scan best-effort */ }
  return { stamp, rescanned, core: measureCore() };
}

// ---- memoria: recall (grep) e remember (append) ----------------------------

const LOGS = {
  tasks: ".ai/memory/logs/tasks-log.md",
  decisions: ".ai/memory/logs/decisions-log.md",
  errors: ".ai/memory/logs/errors-log.md",
};

// Busca por termo nos logs SEM carregar os arquivos inteiros no contexto.
export function recall(query, { log = null, max = 20 } = {}) {
  if (!query) throw new Error("recall exige um termo de busca");
  const q = norm(query);
  const targets = log ? [[log, LOGS[log]]] : Object.entries(LOGS);
  const hits = [];
  for (const [name, rel] of targets) {
    if (!rel) continue;
    const content = readIfExists(join(ROOT, rel));
    if (content == null) continue;
    content.split("\n").forEach((line, i) => {
      if (norm(line).includes(q)) hits.push({ log: name, line: i + 1, text: line.trim() });
    });
  }
  return { query, count: hits.length, hits: hits.slice(0, max) };
}

// Acrescenta uma entrada a um log append-only (nunca sobrescreve historico).
export function remember(log, entry) {
  const rel = LOGS[log];
  if (!rel) throw new Error(`log invalido: '${log}'. Use: ${Object.keys(LOGS).join(", ")}`);
  if (!entry || !entry.trim()) throw new Error("entry vazio");
  const stamp = new Date().toISOString().slice(0, 10);
  const line = `\n${stamp} | ${entry.trim()}`;
  appendFileSync(join(ROOT, rel), line, "utf8");
  return { log, rel, appended: line.trim() };
}

export const LOG_NAMES = Object.keys(LOGS);

// ============================================================================
// Camada de comunicacao adaptativa (ADR-0024)
// ============================================================================

const PROJECT_PATH = join(AI, "project.json");
const QUESTIONS_PATH = join(AI, "bootstrap", "questions.json");
export const PHASES = ["discovery", "execution", "stabilization"];

// ---- estado / fase ---------------------------------------------------------

export function getState() {
  const raw = readIfExists(PROJECT_PATH);
  if (raw == null) return { phase: "discovery", phase_set_at: null, created: null };
  try { return JSON.parse(raw); } catch { return { phase: "discovery", phase_set_at: null, created: null }; }
}

export function setPhase(phase) {
  if (!PHASES.includes(phase)) throw new Error(`fase invalida: '${phase}'. Use: ${PHASES.join(" -> ")}`);
  const st = getState();
  const prev = st.phase;
  const next = { ...st, phase, phase_set_at: new Date().toISOString(), created: st.created || new Date().toISOString() };
  writeFileSync(PROJECT_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
  try { remember("decisions", `fase: ${prev} -> ${phase}`); } catch { /* logs podem nao existir num target novo */ }
  return { from: prev, to: phase };
}

// ---- maturidade (inferida por sinais) --------------------------------------

export function maturity() {
  const idx = (() => { try { return loadIndex(); } catch { return { routes: [] }; } })();
  const decIndex = readIfExists(join(AI, "memory", "decisions-index.md")) ?? "";
  const tasksLog = readIfExists(join(ROOT, LOGS.tasks)) ?? "";
  const adrs = (decIndex.match(/^\|\s*ADR-\d+/gm) || []).length;
  const tasks = (tasksLog.match(/^\d{4}-\d{2}-\d{2}\s*\|/gm) || []).length;
  const routes = (idx.routes || []).length;
  let tier = "forming";
  if (adrs < 3 && tasks < 5) tier = "nascent";
  else if (adrs >= 8 || tasks >= 30) tier = "mature";
  return { tier, signals: { adrs, tasks, routes } };
}

// ---- postura de dialogo (fase x maturidade) --------------------------------

const POSTURE = {
  discovery: {
    questioning: "alto",
    focus: "explorar",
    guidance: "Faca muitas perguntas de esclarecimento. Alinhe objetivo, escopo e direcao ANTES de executar. Traduza termos tecnicos; nao assuma conhecimento do usuario.",
  },
  execution: {
    questioning: "medio",
    focus: "construir",
    guidance: "Pergunte so o pontual que destrava a tarefa atual. Execute alinhado ao rumo do projeto; confirme desvios de escopo, mas nao reabra discovery.",
  },
  stabilization: {
    questioning: "baixo-sugestivo",
    focus: "concluir",
    guidance: "Minimize escopo novo. Questione scope creep. Enfatize finalizar, estabilizar e concluir. Sugira melhorias sem abrir loops. Encaminhe para 'pronto'.",
  },
};

export function posture() {
  const { phase } = getState();
  const m = maturity();
  const p = POSTURE[phase] || POSTURE.discovery;
  return { phase, maturity: m.tier, signals: m.signals, ...p };
}

// ---- navegacao interna: o Harness informa suas opcoes a LLM ----------------

const ACTIONS = [
  { id: "read_core", tool: "os_read_core", cli: "read-core", when: "no inicio de toda tarefa: carrega CONSTITUTION + state-of-world" },
  { id: "work", tool: "os_work", cli: 'work "<intencao>"', when: "tem uma tarefa: recupera <=5 arquivos + orcamento" },
  { id: "brief", tool: "os_brief", cli: "brief", when: "antes de falar com o usuario: situacao + postura de dialogo" },
  { id: "capabilities", tool: "os_capabilities", cli: "caps", when: "para saber quais opcoes existem agora e a recomendada" },
  { id: "init", tool: "os_init", cli: "init [new|existing]", when: "preparar projeto novo ou alinhar um existente" },
  { id: "recall", tool: "os_recall", cli: 'recall "<termo>"', when: "precisa de historico: grep nos logs sem carregar inteiro" },
  { id: "remember", tool: "os_remember", cli: 'remember <log> "<txt>"', when: "registrar tarefa/decisao/erro (append-only)" },
  { id: "phase", tool: "os_phase", cli: "phase [discovery|execution|stabilization]", when: "ver ou avancar a fase do projeto" },
  { id: "sync", tool: "os_sync", cli: "sync", when: "fechar um bloco: reescreve a memoria quente + mede o CORE" },
  { id: "doctor", tool: "os_doctor", cli: "doctor", when: "checar integridade do OS" },
];

export function capabilities() {
  const p = posture();
  const recommended = {
    discovery: "os_init — conduza o onboarding e alinhe objetivo/escopo/direcao com o usuario.",
    execution: "os_work <intencao> — recupere o contexto da proxima tarefa e execute; registre com os_remember.",
    stabilization: "Foque em concluir: revise pendencias, os_doctor, evite escopo novo; sugira o fechamento do marco.",
  }[p.phase];
  return { phase: p.phase, maturity: p.maturity, posture: p, actions: ACTIONS, recommended_next: recommended };
}

// ---- situacao estruturada para a LLM ---------------------------------------

export function brief() {
  const p = posture();
  const caps = capabilities();
  return {
    phase: p.phase,
    maturity: p.maturity,
    signals: p.signals,
    posture: { questioning: p.questioning, focus: p.focus, guidance: p.guidance },
    core: [".ai/CONSTITUTION.md", ".ai/memory/state-of-world.md"],
    recommended_next: caps.recommended_next,
  };
}

// ---- onboarding: novo vs existente -----------------------------------------

const OS_ENTRIES = new Set([
  ".ai", "bin", "src", "server", ".claude", ".agents", "node_modules", ".git",
  "package.json", "package-lock.json", "README.md", "CLAUDE.md", "AGENTS.md",
  ".gitignore", ".gitattributes", "LICENSE",
]);

// Heuristica: ha codigo/conteudo do PROJETO-ALVO fora do scaffolding do OS?
export function detectKind() {
  let entries = [];
  try { entries = readdirSync(ROOT); } catch { /* */ }
  const targetEntries = entries.filter((e) => !OS_ENTRIES.has(e) && !e.startsWith("."));
  return targetEntries.length > 0 ? "existing" : "new";
}

export function initPlan(kind) {
  const k = kind && ["new", "existing"].includes(kind) ? kind : detectKind();
  let bank = { new: [], existing: [] };
  const raw = readIfExists(QUESTIONS_PATH);
  if (raw) { try { bank = JSON.parse(raw); } catch { /* */ } }
  return {
    kind: k,
    detected: detectKind(),
    phase: getState().phase,
    steps: bank[k] || [],
    note: k === "existing"
      ? "Projeto existente: confirme o estado atual antes de propor mudancas. Alinhe ao que ja existe."
      : "Projeto novo: alinhe objetivo/escopo/direcao incrementalmente; o que se firmar vira ADR.",
  };
}

// ============================================================================
// Analisador de varredura zero-dep + code-map consultavel (ADR-0025)
// ============================================================================

import { statSync, mkdirSync } from "node:fs";

const CODEMAP_PATH = join(AI, "runtime", "code-map.json");
const SCAN_IGNORE = new Set(["node_modules", ".git", ".ai", "dist", "build", "coverage", ".vscode", ".idea", "tmp", "out"]);
const CODE_EXT = {
  ".mjs": "javascript", ".cjs": "javascript", ".js": "javascript", ".jsx": "javascript",
  ".ts": "typescript", ".tsx": "typescript", ".py": "python", ".go": "go", ".rs": "rust",
  ".java": "java", ".rb": "ruby", ".php": "php", ".c": "c", ".h": "c", ".cpp": "cpp", ".cs": "csharp",
};
const LARGE_FILE_LINES = 300;

function extOf(name) { const i = name.lastIndexOf("."); return i < 0 ? "" : name.slice(i); }

function walkCode(dir, rootAbs, acc) {
  let entries = [];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (e.name.startsWith(".") && e.name !== ".") { if (SCAN_IGNORE.has(e.name)) continue; }
    if (SCAN_IGNORE.has(e.name)) continue;
    const abs = join(dir, e.name);
    if (e.isDirectory()) walkCode(abs, rootAbs, acc);
    else if (e.isFile() && CODE_EXT[extOf(e.name)]) acc.push(abs);
  }
  return acc;
}

// Extracao por regex (sinais, nao AST) — ADR-0025.
function extractSymbols(content, lang) {
  const exports = new Set();
  const imports = new Set();
  const reExp = [
    /export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z0-9_$]+)/g,
    /export\s*\{([^}]+)\}/g,
    /(?:^|\n)\s*(?:public\s+|def\s+)([A-Za-z0-9_]+)\s*\(/g, // python/java-ish
  ];
  for (const re of reExp) {
    let m; while ((m = re.exec(content))) {
      m[1].split(",").forEach((s) => { const n = s.split(/\s+as\s+/)[0].trim(); if (n && /^[A-Za-z0-9_$]+$/.test(n)) exports.add(n); });
    }
  }
  const reImp = [
    /import\s+[^'"]*from\s+['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /(?:^|\n)\s*(?:from|import)\s+([A-Za-z0-9_.]+)/g, // python
  ];
  for (const re of reImp) { let m; while ((m = re.exec(content))) imports.add(m[1]); }
  return { exports: [...exports].slice(0, 40), imports: [...imports].slice(0, 40) };
}

function detectStack(rootAbs) {
  const stack = [];
  const has = (f) => existsSync(join(rootAbs, f));
  if (has("package.json")) stack.push("node");
  if (has("tsconfig.json")) stack.push("typescript");
  if (has("requirements.txt") || has("pyproject.toml") || has("setup.py")) stack.push("python");
  if (has("Cargo.toml")) stack.push("rust");
  if (has("go.mod")) stack.push("go");
  if (has("pom.xml") || has("build.gradle")) stack.push("java");
  if (has("Gemfile")) stack.push("ruby");
  return stack;
}

export function scan() {
  const files = walkCode(ROOT, ROOT, []);
  const out = [];
  const smells = [];
  let totalLines = 0;
  for (const abs of files) {
    const rel = abs.slice(ROOT.length + 1).split("\\").join("/");
    const content = readIfExists(abs);
    if (content == null) continue;
    const lines = content.split("\n").length;
    totalLines += lines;
    const lang = CODE_EXT[extOf(abs)] || "unknown";
    const { exports, imports } = extractSymbols(content, lang);
    out.push({ path: rel, lang, lines, exports, imports });
    if (lines > LARGE_FILE_LINES) smells.push({ kind: "large_file", path: rel, lines });
  }
  out.sort((a, b) => a.path.localeCompare(b.path));
  const map = {
    generated: new Date().toISOString(),
    root: ROOT.split("\\").join("/"),
    stack: detectStack(ROOT),
    fileCount: out.length,
    totalLines,
    smells,
    files: out,
  };
  try { mkdirSync(join(AI, "runtime"), { recursive: true }); } catch { /* */ }
  writeFileSync(CODEMAP_PATH, JSON.stringify(map, null, 2) + "\n", "utf8");
  return { fileCount: map.fileCount, totalLines, stack: map.stack, smells: map.smells, path: ".ai/runtime/code-map.json" };
}

export function loadCodeMap() {
  const raw = readIfExists(CODEMAP_PATH);
  if (raw == null) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// Busca no code-map por termo (path/simbolo). Retorna top-N candidatos (ponteiros).
export function searchCode(query, { max = 8 } = {}) {
  const map = loadCodeMap();
  if (!map) return { query, scanned: false, count: 0, hits: [], note: "code-map ausente — rode 'os scan'." };
  const terms = norm(query).split(/\s+/).filter((t) => t.length >= 3);
  const scored = [];
  for (const f of map.files) {
    let score = 0;
    const np = norm(f.path);
    const nsym = norm((f.exports || []).join(" "));
    for (const t of terms) {
      if (np.includes(t)) score += 3;
      if (nsym.includes(t)) score += 2;
    }
    if (score > 0) scored.push({ path: f.path, lines: f.lines, lang: f.lang, exports: (f.exports || []).slice(0, 6), score });
  }
  scored.sort((a, b) => b.score - a.score);
  return { query, scanned: true, count: scored.length, hits: scored.slice(0, max) };
}


// Code-map obsoleto? (algum arquivo de codigo mudou apos a ultima varredura) — ADR-0025/0026
export function codeMapStale() {
  const map = loadCodeMap();
  if (!map) return true;
  const gen = new Date(map.generated).getTime();
  const files = walkCode(ROOT, ROOT, []);
  if (files.length !== map.fileCount) return true;
  for (const abs of files) { try { if (statSync(abs).mtimeMs > gen) return true; } catch { /* */ } }
  return false;
}
