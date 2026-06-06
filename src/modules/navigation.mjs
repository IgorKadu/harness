// Harness — Lean AI OS · modulo/navigation (ADR-0024)
// Comunicacao adaptativa: estado/fase, maturidade inferida, postura de dialogo,
// capacidades (o OS informa suas opcoes a LLM), brief e onboarding (novo/existente).

import { existsSync, readdirSync } from "node:fs";
import { writeFileAtomic } from "../core/io.mjs";
import { join } from "node:path";
import { ROOT, AI, PROJECT_PATH, QUESTIONS_PATH, HANDOFF_PATH } from "../core/paths.mjs";
import { readIfExists, loadIndex } from "../core/util.mjs";
import { LOGS, remember } from "./memory.mjs";
import { readReport } from "./channel.mjs";
import { savesStatus } from "./saves.mjs";

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
  writeFileAtomic(PROJECT_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
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
    discovery: "os_start + alinhe objetivo/escopo/direcao com o usuario (os_init traz perguntas de onboarding, se precisar).",
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
    saves: savesStatus(),
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
