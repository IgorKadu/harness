// Harness — Lean AI OS · modulo/session (ADR-0028)
// O Orquestrador conduz a conversa (determinismo) e entrega a LLM uma SPEC completa
// (objetivo, escopo, nao-fazer, onde, como, porque). A sessao persiste entre execucoes.

import { mkdirSync } from "node:fs";
import { writeFileAtomic } from "../core/io.mjs";
import { join } from "node:path";
import { AI, SESSION_PATH } from "../core/paths.mjs";
import { readIfExists } from "../core/util.mjs";
import { getState } from "./navigation.mjs";
import { computeWorkingSet } from "./routing.mjs";
import { classify, decompose, orchestrate } from "./orchestrate.mjs";
import { searchCode, loadCodeMap } from "./codemap.mjs";
import { gaps } from "./gaps.mjs";
import { writeHandoffFile } from "./channel.mjs";

export function loadSession() {
  const raw = readIfExists(SESSION_PATH);
  if (raw == null) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function writeSession(s) {
  try { mkdirSync(join(AI, "runtime"), { recursive: true }); } catch { /* */ }
  writeFileAtomic(SESSION_PATH, JSON.stringify(s, null, 2) + "\n", "utf8");
  return s;
}

export function clearSession() {
  try { writeFileAtomic(SESSION_PATH, JSON.stringify({ active: false }, null, 2) + "\n", "utf8"); } catch { /* */ }
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
