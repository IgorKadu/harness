// Harness — Lean AI OS · modulo/orchestrate (ADR-0027)
// Dada uma intencao, devolve um PACOTE DE INTERACAO: classificacao, contexto,
// perguntas guiadas, sugestoes, acoes e o que esta aguardando. Puro, serve chat e UI.

import { norm } from "../core/util.mjs";
import { posture, initPlan } from "./navigation.mjs";
import { computeWorkingSet } from "./routing.mjs";

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
