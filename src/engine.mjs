// Harness — Lean AI OS · MOTOR (o cerebro)
// Funcoes PURAS: retornam dados, nao imprimem, nao chamam process.exit.
// Todas as bocas (CLI, MCP, futura extensao) importam daqui. Zero duplicacao (ADR-0023).

import { readFileSync, writeFileSync, existsSync, appendFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, "..");
// Raiz do PROJETO a analisar: o pai de .harness/ quando instalado; senao a propria ROOT.
export const PROJECT_ROOT = basename(ROOT) === ".harness" ? dirname(ROOT) : ROOT;
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
  { id: "orchestrate", tool: "os_orchestrate", cli: 'next "<intencao>"', when: "passo unico: classifica + perguntas guiadas + decompoe + acoes + awaiting" },
  { id: "decompose", tool: "os_decompose", cli: 'decompose "<intencao>"', when: "tarefa estourou o orcamento: quebrar em subtarefas" },
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
    execution: "os_orchestrate <intencao> — pacote de interacao (classifica + acoes); execute o passo 'execute' e registre com os_remember.",
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
    pendingHandoff: existsSync(HANDOFF_PATH),
    lastReport: readReport(),
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
const SCAN_IGNORE = new Set([".harness", "node_modules", ".git", ".ai", "dist", "build", "coverage", ".vscode", ".idea", ".cursor", ".gemini", ".claude", ".windsurf", ".agents", "tmp", "out", ".next", ".nuxt", "vendor"]);
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
  const files = walkCode(PROJECT_ROOT, PROJECT_ROOT, []);
  const out = [];
  const smells = [];
  let totalLines = 0;
  for (const abs of files) {
    const rel = abs.slice(PROJECT_ROOT.length + 1).split("\\").join("/");
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
    root: PROJECT_ROOT.split("\\").join("/"),
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
  const files = walkCode(PROJECT_ROOT, PROJECT_ROOT, []);
  if (files.length !== map.fileCount) return true;
  for (const abs of files) { try { if (statSync(abs).mtimeMs > gen) return true; } catch { /* */ } }
  return false;
}

// ============================================================================
// Camada de ORQUESTRACAO autoexecutavel (ADR-0027)
// Dada uma intencao, devolve um PACOTE DE INTERACAO estruturado: classificacao,
// contexto, perguntas guiadas, sugestoes, acoes e o que esta aguardando.
// O mesmo pacote serve as duas pontas: a LLM no chat E a extensao (UI). Puro.
// ============================================================================

export function classify(intent) {
  const ws = typeof intent === "string" ? computeWorkingSet(intent) : intent;
  const files = ws.files.length;
  const code = ws.codeCandidates?.length || 0;
  if (!ws.within) return "complex";
  const q = norm(ws.intent || "");
  const heavy = ["refator", "arquitet", "migrar", "redesenh", "integr", "multiplo", "varios", "sistema"];
  if (heavy.some((h) => q.includes(h))) return "complex";
  if (files <= 2 && code <= 1) return "trivial";
  if (files <= 4 && code <= 4) return "simple";
  return "complex";
}

export function decompose(intent) {
  const ws = computeWorkingSet(intent);
  if (ws.within) return { needed: false, reason: "cabe no orcamento", subtasks: [] };
  const subs = [];
  if (ws.matched.length > 1) {
    for (const m of ws.matched) subs.push({ intent: intent + " - foco em " + m.id, basis: "rota " + m.id });
  } else if ((ws.codeCandidates?.length || 0) > 1) {
    for (const c of ws.codeCandidates.slice(0, 4)) subs.push({ intent: intent + " - em " + c.path, basis: c.path });
  } else {
    subs.push(
      { intent: intent + " - parte 1: levantar e planejar", basis: "split por etapa" },
      { intent: intent + " - parte 2: implementar", basis: "split por etapa" },
      { intent: intent + " - parte 3: validar e fechar", basis: "split por etapa" },
    );
  }
  return { needed: true, reason: "working-set ~" + ws.total + "tk > cap " + ws.cap + "tk", subtasks: subs };
}

export function orchestrate(intent, opts = {}) {
  const { answers = null, approved = false } = opts;
  if (!intent || !intent.trim()) throw new Error("orchestrate exige uma intencao");
  const p = posture();
  const ws = computeWorkingSet(intent);
  const cls = classify(ws);
  const dec = decompose(intent);

  const questions = [];
  const suggestions = [];
  const actions = [];
  let awaiting = null;

  if (p.phase === "discovery" && !answers) {
    const plan = initPlan();
    plan.steps.slice(0, 4).forEach((s) => questions.push({ id: s.id, q: s.q }));
    if (questions.length) { awaiting = "user_answers"; suggestions.push("Fase discovery: alinhe objetivo/escopo antes de codar."); }
  }

  if (dec.needed) {
    suggestions.push("Tarefa grande demais: decompor em " + dec.subtasks.length + " subtarefas (" + dec.reason + ").");
    actions.push({ step: "decompose", tool: "os_decompose", args: { intent }, why: dec.reason });
    awaiting = awaiting || "user_confirm_plan";
  } else if (cls === "complex") {
    actions.push({ step: "propose_plan", tool: "os_work", args: { intent }, why: "tarefa complexa: proponha plano e aguarde OK" });
    if (!approved) awaiting = awaiting || "user_confirm_plan";
    else actions.push({ step: "execute", tool: "os_work", args: { intent }, why: "plano aprovado: executar" });
  } else {
    actions.push({ step: "execute", tool: "os_work", args: { intent }, why: "tarefa " + cls + ": carregue so os " + ws.files.length + " arquivos e execute" });
  }

  actions.push({ step: "closeout", tool: "os_remember", args: { log: "tasks" }, why: "ao concluir: os_remember + os_sync" });

  return {
    intent,
    phase: p.phase,
    maturity: p.maturity,
    posture: { questioning: p.questioning, focus: p.focus, guidance: p.guidance },
    classification: cls,
    workingSet: {
      files: ws.files.map((f) => ({ rel: f.rel, exists: f.exists, tokens: f.tokens })),
      total: ws.total, cap: ws.cap, within: ws.within, matched: ws.matched.map((m) => m.id),
    },
    codeCandidates: (ws.codeCandidates || []).map((c) => ({ path: c.path, lines: c.lines })),
    decomposition: dec,
    questions,
    suggestions,
    actions,
    awaiting,
    answers: answers || null,
  };
}

// ============================================================================
// HANDOFF + MEMORIA DE SESSAO (ADR-0028)
// O Orquestrador conduz a conversa (determinismo) e entrega a LLM uma SPEC
// completa: objetivo, escopo, o que NAO fazer, pasta/arquivo alvo, onde esta o
// codigo, o que falta, como e porque. A sessao persiste entre execucoes (resume).
// ============================================================================

const SESSION_PATH = join(AI, "runtime", "session.json");

export function loadSession() {
  const raw = readIfExists(SESSION_PATH);
  if (raw == null) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function writeSession(s) {
  try { mkdirSync(join(AI, "runtime"), { recursive: true }); } catch { /* */ }
  writeFileSync(SESSION_PATH, JSON.stringify(s, null, 2) + "\n", "utf8");
  return s;
}

export function clearSession() {
  try { writeFileSync(SESSION_PATH, JSON.stringify({ active: false }, null, 2) + "\n", "utf8"); } catch { /* */ }
  return { active: false };
}

// Anexa uma nota (ex: resultado de uma acao executada) ao log da sessao ativa.
export function noteSession(text) {
  const s = loadSession();
  if (!s || !s.active) return { active: false };
  s.log.push({ role: "orchestrator", at: new Date().toISOString(), text: String(text || "").slice(0, 600) });
  return writeSession(s);
}

// Retoma a sessao ativa: recarrega e reemite a fala corrente do orquestrador.
export function resumeSession() {
  const s = loadSession();
  if (!s || !s.active) return { active: false };
  const text = s.questionQueue && s.questionQueue.length ? nextPrompt(s) : "Sessao retomada. Handoff disponivel (ou refine com mais detalhes).";
  s.log.push({ role: "orchestrator", at: new Date().toISOString(), text });
  return writeSession(s);
}

// Inicia (ou substitui) a sessao de orquestracao para uma intencao.
const ESSENTIAL_Q = [
  { id: "goal", q: "Em uma frase: qual o objetivo desta tarefa? O que muda quando estiver pronta?" },
  { id: "scope", q: "O que ENTRA nesta tarefa e o que NAO entra agora? (escopo e limites)" },
  { id: "constraints", q: "Alguma restricao, preferencia ou arquivo/pasta que eu ja deva considerar?" },
];

export function startSession(intent) {
  if (!intent || !intent.trim()) throw new Error("startSession exige uma intencao");
  const pkt = orchestrate(intent);
  let qs = pkt.questions.slice();
  if (qs.length === 0) qs = ESSENTIAL_Q.slice(); // garante conversa mesmo fora de discovery
  const queue = qs.map((q) => q.id);
  const s = {
    active: true,
    id: "s" + Date.now().toString(36),
    intent,
    started: new Date().toISOString(),
    phase: pkt.phase,
    classification: pkt.classification,
    answers: {},
    questionQueue: queue,
    questions: qs,
    awaiting: queue.length ? "user_answers" : (pkt.awaiting || null),
    log: [{ role: "orchestrator", at: new Date().toISOString(), text: nextPrompt({ questionQueue: queue, questions: qs }) }],
  };
  return writeSession(s);
}

// Texto da proxima fala do orquestrador (deterministico).
function nextPrompt(s) {
  if (s.questionQueue && s.questionQueue.length) {
    const q = (s.questions || []).find((x) => x.id === s.questionQueue[0]);
    return q ? q.q : "Pode detalhar um pouco mais?";
  }
  return "Tenho o suficiente. Gerando o handoff para a LLM.";
}

// Registra a resposta do usuario a pergunta corrente e avanca a fila.
export function answerSession(value, { intent } = {}) {
  let s = loadSession();
  if (!s || !s.active) {
    if (!intent) throw new Error("nenhuma sessao ativa — informe 'intent' para iniciar");
    s = startSession(intent);
  }
  if (value && value.trim() && s.questionQueue.length) {
    const id = s.questionQueue.shift();
    s.answers[id] = value.trim();
    s.log.push({ role: "user", at: new Date().toISOString(), text: value.trim() });
  } else if (value && value.trim()) {
    // fila vazia: trata como refinamento do handoff (continuidade)
    s.answers.refine = (s.answers.refine ? s.answers.refine + " | " : "") + value.trim();
    s.log.push({ role: "user", at: new Date().toISOString(), text: value.trim() });
  }
  s.awaiting = s.questionQueue.length ? "user_answers" : "ready_handoff";
  const prompt = nextPrompt(s);
  s.log.push({ role: "orchestrator", at: new Date().toISOString(), text: prompt });
  if (!s.questionQueue.length) {
    s.handoff = handoff(s.intent, { answers: s.answers });
    try { writeHandoffFile(s.handoff, s); s.handoffPath = ".harness/.ai/handoff.md"; } catch { /* */ }
  }
  return writeSession(s);
}

// Localizador de codigo + spec estruturada para a LLM.
export function handoff(intent, { answers = {} } = {}) {
  const ws = computeWorkingSet(intent);
  const cls = classify(ws);
  const code = searchCode(intent, { max: 6 });
  const map = loadCodeMap();
  const dec = decompose(intent);
  const targets = (code.scanned ? code.hits : []).map((h) => ({ path: h.path, lines: h.lines, symbols: (h.exports || []).slice(0, 6) }));
  return {
    intent,
    classification: cls,
    phase: getState().phase,
    objetivo: answers.goal || answers.objetivo || null,
    tipo: answers.kind || null,
    stack: answers.stack || (map ? map.stack : []),
    escopo_mvp: answers.scope || null,
    nao_fazer: answers.out_of_scope ? [answers.out_of_scope] : ["escopo alem do MVP acordado", "reescrever o que ja funciona sem motivo", "introduzir dependencias sem aprovacao"],
    contexto_arquivos: ws.files.filter((f) => f.exists).map((f) => f.rel),
    orcamento: { tokens: ws.total, cap: ws.cap, within: ws.within },
    alvos_codigo: targets,
    decomposicao: dec.needed ? dec.subtasks : [],
    falta: gaps(intent).items,
    onde: targets.length ? targets[0].path : (map ? "ver code-map (.ai/runtime/code-map.json)" : "rode os_scan primeiro"),
    como: cls === "complex" ? "proponha um plano curto e aguarde OK antes de codar" : "execute direto carregando so os arquivos do contexto",
    porque: answers.goal ? ("atende: " + (answers.goal)) : "alinhado ao objetivo do projeto (ver state-of-world)",
    fecho: "ao concluir: os_remember tasks + os_sync; registre decisoes em ADR se firmar rumo",
  };
}

// Renderiza o handoff como markdown pronto para colar/entregar a LLM.
export function renderHandoff(h) {
  const L = [];
  L.push(`# Handoff — ${h.intent}`);
  L.push(`> classificacao: ${h.classification} · fase: ${h.phase}`);
  L.push("");
  L.push(`## Objetivo\n${h.objetivo || "(a alinhar)"}`);
  if (h.escopo_mvp) L.push(`\n## Escopo (MVP)\n${h.escopo_mvp}`);
  L.push(`\n## NAO fazer`);
  h.nao_fazer.forEach((n) => L.push(`- ${n}`));
  L.push(`\n## Onde mexer`);
  L.push(`- alvo principal: ${h.onde}`);
  if (h.alvos_codigo.length) h.alvos_codigo.forEach((t) => L.push(`- ${t.path} (${t.lines}L${t.symbols.length ? ", " + t.symbols.join(",") : ""})`));
  if (h.contexto_arquivos.length) L.push(`- contexto: ${h.contexto_arquivos.join(", ")}`);
  if (h.stack && h.stack.length) L.push(`\n## Stack\n${h.stack.join(", ")}`);
  if (h.decomposicao.length) { L.push(`\n## Subtarefas (orcamento estourou)`); h.decomposicao.forEach((s) => L.push(`- ${s.intent}`)); }
  if (h.falta && h.falta.length) { L.push(`\n## O que falta`); h.falta.forEach((g) => L.push(`- ${g.kind}: ${g.path} (${g.detail})`)); }
  L.push(`\n## Como\n${h.como}`);
  L.push(`\n## Porque\n${h.porque}`);
  L.push(`\n## Fecho\n${h.fecho}`);
  return L.join("\n");
}

// ============================================================================
// GAPS — "o que falta" concreto (ADR-0028, roadmap #2)
// Cruza code-map (smells), rotas casadas e ausencia de testes para apontar
// lacunas objetivas que a LLM deve endereçar. Deterministico, zero-dep.
// ============================================================================

export function gaps(intent) {
  const out = [];
  const map = loadCodeMap();
  const code = searchCode(intent, { max: 8 });
  const hits = code.scanned ? code.hits : [];

  // 1) Arquivos grandes (smell) entre os alvos -> sugerir quebrar.
  if (map && map.smells) {
    const hitPaths = new Set(hits.map((h) => h.path));
    for (const sm of map.smells) {
      if (sm.kind === "large_file" && (hitPaths.has(sm.path) || hits.length === 0)) {
        out.push({ kind: "arquivo_grande", path: sm.path, detail: `${sm.lines}L — considere dividir` });
      }
    }
  }

  // 2) Alvos de codigo sem teste aparente.
  if (map) {
    const allPaths = (map.files || []).map((f) => f.path);
    const hasTest = (p) => {
      const base = p.replace(/\.[^.]+$/, "");
      return allPaths.some((q) => q !== p && /test|spec|__tests__/.test(norm(q)) && norm(q).includes(norm(base.split("/").pop())));
    };
    for (const h of hits.slice(0, 5)) {
      if (!/test|spec/.test(norm(h.path)) && !hasTest(h.path)) out.push({ kind: "sem_teste", path: h.path, detail: "sem teste correspondente" });
    }
  }

  // 3) Rota casou mas arquivo de conhecimento/contexto nao existe.
  const ws = computeWorkingSet(intent);
  ws.files.filter((f) => !f.exists).forEach((f) => out.push({ kind: "arquivo_ausente", path: f.rel, detail: "referenciado pelo indice, nao existe" }));

  // 4) Sem code-map -> falta varrer.
  if (!map) out.push({ kind: "sem_scan", path: "-", detail: "rode os_scan para mapear o codigo" });

  return { intent, count: out.length, items: out.slice(0, 12) };
}

// ============================================================================
// ROADMAP #5/#6/#7/#9/#10 — LLM opcional, subtarefas, aprendizado de rotas,
// metricas de economia e templates. Tudo deterministico/zero-dep por padrao.
// ============================================================================

// ---- #5 LLM opcional: hook plugavel (default determinismo) -----------------
let _llm = null;
export function setLLM(fn) { _llm = typeof fn === "function" ? fn : null; return { enabled: !!_llm }; }
export function hasLLM() { return !!_llm; }
// Conversa assistida: usa a LLM se registrada; senao cai no proximo prompt deterministico.
export async function assist(prompt, context = {}) {
  if (_llm) { try { return { source: "llm", text: await _llm(prompt, context) }; } catch (e) { return { source: "fallback", text: "(LLM falhou: " + e.message + ") " + prompt }; } }
  return { source: "deterministic", text: prompt };
}

// ---- #6 Subtarefas como sessoes filhas -------------------------------------
const CHILDREN_PATH = join(AI, "runtime", "subsessions.json");
function readChildren() { const r = readIfExists(CHILDREN_PATH); if (r == null) return { parent: null, items: [] }; try { return JSON.parse(r); } catch { return { parent: null, items: [] }; } }
function writeChildren(c) { try { mkdirSync(join(AI, "runtime"), { recursive: true }); } catch { /* */ } writeFileSync(CHILDREN_PATH, JSON.stringify(c, null, 2) + "\n", "utf8"); return c; }

// Cria sessoes-filhas a partir da decomposicao de uma intencao.
export function spawnSubsessions(intent) {
  const dec = decompose(intent);
  const items = (dec.needed ? dec.subtasks : [{ intent, basis: "unica" }]).map((s, i) => ({
    id: "sub" + (i + 1), intent: s.intent, basis: s.basis, status: "pending",
  }));
  return writeChildren({ parent: intent, created: new Date().toISOString(), items });
}
export function subStatus() { return readChildren(); }
export function setSubStatus(id, status) {
  const c = readChildren();
  const it = c.items.find((x) => x.id === id);
  if (!it) throw new Error("subtarefa nao encontrada: " + id);
  it.status = status;
  const done = c.items.filter((x) => x.status === "done").length;
  c.progress = { done, total: c.items.length, pct: Math.round((done / c.items.length) * 100) };
  return writeChildren(c);
}

// ---- #7 Aprendizado de rotas -----------------------------------------------
// Analisa intencoes no tasks-log; sugere triggers/rotas ausentes no indice.
export function suggestRoutes() {
  const idx = (() => { try { return loadIndex(); } catch { return { routes: [], always: [] }; } })();
  const known = new Set();
  (idx.routes || []).forEach((r) => (r.triggers || []).forEach((t) => known.add(norm(t))));
  const log = readIfExists(join(ROOT, LOGS.tasks)) || "";
  const STOP = new Set(["para", "como", "fazer", "novo", "nova", "criar", "ajustar", "todo", "isso", "esse", "essa", "com", "sem", "dos", "das", "uma", "que", "the", "and"]);
  const freq = {};
  log.split("\n").forEach((line) => {
    const txt = line.split("|").slice(1).join("|");
    norm(txt).split(/[^a-z0-9]+/).forEach((w) => { if (w.length >= 4 && !STOP.has(w) && !known.has(w)) freq[w] = (freq[w] || 0) + 1; });
  });
  const cands = Object.entries(freq).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return { suggestions: cands.map(([term, count]) => ({ term, count, hint: "rota nova? aponte os <=5 arquivos de contexto p/ '" + term + "'" })), known: known.size };
}

// ---- #9 Metricas de economia -----------------------------------------------
// Estima tokens poupados: working-set da tarefa vs carregar o projeto inteiro.
export function metrics(intent) {
  const map = loadCodeMap();
  const projectTokens = map ? Math.round((map.totalLines || 0) * 8) : null; // ~8 tk/linha (heuristica)
  const core = measureCore();
  if (!intent) {
    return { coreTokens: core.total, projectTokens, note: projectTokens ? "passe uma intencao p/ medir a economia por tarefa" : "rode os_scan p/ estimar o projeto" };
  }
  const ws = computeWorkingSet(intent);
  const perTask = core.total + ws.total;
  const baseline = (projectTokens || 0) + core.total;
  const saved = baseline - perTask;
  const pct = baseline > 0 ? Math.round((saved / baseline) * 100) : 0;
  return { intent, coreTokens: core.total, workingSetTokens: ws.total, perTask, projectTokens, baseline, saved: Math.max(saved, 0), savedPct: Math.max(pct, 0) };
}

// ---- #10 Templates de projeto ----------------------------------------------
const TEMPLATES = {
  api: { objetivo: "API/servico backend", rotas: ["endpoint", "rota", "controller", "auth", "banco", "schema"], nao_fazer: ["UI/frontend nesta fase", "regras de negocio fora do escopo do endpoint"], primeiros: ["definir contrato (rota+payload)", "camada de dados", "validacao", "testes de integracao"] },
  web: { objetivo: "Aplicacao web/frontend", rotas: ["componente", "pagina", "estado", "estilo", "rota", "form"], nao_fazer: ["logica de backend aqui", "otimizacao prematura de bundle"], primeiros: ["layout e navegacao", "componentes base", "estado/dados", "responsividade"] },
  cli: { objetivo: "Ferramenta de linha de comando", rotas: ["comando", "flag", "argumento", "saida", "config"], nao_fazer: ["GUI", "dependencias pesadas sem necessidade"], primeiros: ["parser de args", "comandos nucleo", "ajuda/usage", "saida amigavel"] },
  lib: { objetivo: "Biblioteca reutilizavel", rotas: ["api publica", "export", "tipo", "exemplo", "doc"], nao_fazer: ["acoplar a um app especifico", "efeitos colaterais na importacao"], primeiros: ["definir API publica", "implementacao nucleo", "testes", "README/exemplos"] },
};
export function template(kind) {
  const t = TEMPLATES[kind];
  if (!t) return { kinds: Object.keys(TEMPLATES), error: "tipo invalido" };
  return { kind, ...t };
}
export const TEMPLATE_KINDS = Object.keys(TEMPLATES);

// ============================================================================
// CANAL DE COMUNICACAO User <-> Harness <-> LLM (ADR-0033)
// handoff.md: o Harness escreve o estado/diretrizes do projeto p/ a LLM ler ('smash').
// report.md:  a LLM escreve o que fez; o Harness le na proxima interacao p/ saber o andamento.
// Ambos vivem em .harness/.ai/ e sao trocados via tools MCP (nao dependem de leitura de arquivo).
// ============================================================================

const HANDOFF_PATH = join(AI, "handoff.md");
const REPORT_PATH = join(AI, "report.md");

// Escreve o handoff.md (markdown rico) — chamado ao fim do dialogo do orquestrador.
export function writeHandoffFile(h, session = null) {
  try { if (codeMapStale()) scan(); } catch { /* best-effort */ }
  const md = [];
  md.push("<!-- gerado pelo Harness · nao editar manualmente -->");
  md.push("<!-- stamp: " + new Date().toISOString() + " -->");
  md.push("");
  md.push(renderHandoff(h));
  const rep = readReport();
  if (rep.exists) { md.push("\n---\n## Ultimo relatorio da LLM (contexto)\n" + rep.text.split("\n").slice(0, 30).join("\n")); }
  if (session && session.log && session.log.length) {
    md.push("\n---\n## Resumo do dialogo Usuario<->Harness");
    session.log.filter((m) => m.role === "user").forEach((m, i) => md.push(`${i + 1}. ${m.text}`));
  }
  md.push("\n---\n> LLM: siga este handoff. Ao concluir, registre o que fez via a tool `os_report` (ou escrevendo .harness/.ai/report.md).");
  writeFileSync(HANDOFF_PATH, md.join("\n") + "\n", "utf8");
  return { path: ".harness/.ai/handoff.md", abs: HANDOFF_PATH };
}

// Gera o handoff a partir de uma intencao e ja escreve o arquivo. (CLI/MCP)
export function handoffToFile(intent, { answers = {} } = {}) {
  const h = handoff(intent, { answers });
  const w = writeHandoffFile(h);
  return { ...w, handoff: h };
}

// Le o handoff.md atual (o que a LLM deve seguir no 'smash').
export function readHandoff() {
  const text = readIfExists(HANDOFF_PATH);
  return { exists: text != null, path: ".harness/.ai/handoff.md", text: text || "" };
}

// A LLM submete o documento do que foi feito; o Harness guarda p/ ler na proxima interacao.
export function submitReport(text) {
  if (!text || !text.trim()) throw new Error("report vazio");
  const stamp = new Date().toISOString();
  writeFileSync(REPORT_PATH, `<!-- relatorio da LLM · stamp: ${stamp} -->\n\n` + text.trim() + "\n", "utf8");
  try { remember("tasks", "LLM report recebido (" + stamp.slice(0, 10) + ")"); } catch { /* */ }
  return { path: ".harness/.ai/report.md", stamp };
}

// Le o ultimo relatorio da LLM (resumo curto para o brief/orquestrador).
export function readReport() {
  const text = readIfExists(REPORT_PATH);
  if (text == null) return { exists: false, summary: null };
  const body = text.replace(/<!--[^>]*-->/g, "").trim();
  return { exists: true, path: ".harness/.ai/report.md", summary: body.split("\n").filter(Boolean).slice(0, 3).join(" ").slice(0, 240) };
}

// ============================================================================
// TURBINA / AUTOMACOES (ADR-0034) — o Harness faz o trabalho pesado no repo
// Funcoes (bots) que a LLM aciona p/ detectar estrutura, arquivos, codigo, docs,
// testes, configs e entregar um PERFIL pronto. Sempre escopadas ao PROJECT_ROOT;
// nunca tocam/expoem .harness (protecao). Globais (projeto todo) ou isoladas (subpasta).
// ============================================================================

import { statSync as _statSync } from "node:fs";

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
