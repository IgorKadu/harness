// Harness — Lean AI OS · modulo/extensions (ADR roadmap #6/#7/#9/#10)
// Subtarefas como sessoes filhas, aprendizado de rotas, metricas de economia e
// templates de projeto. Tudo deterministico/zero-dep por padrao.

import { mkdirSync } from "node:fs";
import { writeFileAtomic } from "../core/io.mjs";
import { join } from "node:path";
import { ROOT, AI, CHILDREN_PATH } from "../core/paths.mjs";
import { readIfExists, norm, loadIndex } from "../core/util.mjs";
import { LOGS } from "./memory.mjs";
import { decompose } from "./orchestrate.mjs";
import { computeWorkingSet } from "./routing.mjs";
import { loadCodeMap } from "./codemap.mjs";
import { measureCore } from "./tokens.mjs";

// ---- #6 Subtarefas como sessoes filhas -------------------------------------
function readChildren() { const r = readIfExists(CHILDREN_PATH); if (r == null) return { parent: null, items: [] }; try { return JSON.parse(r); } catch { return { parent: null, items: [] }; } }
function writeChildren(c) { try { mkdirSync(join(AI, "runtime"), { recursive: true }); } catch { /* */ } writeFileAtomic(CHILDREN_PATH, JSON.stringify(c, null, 2) + "\n", "utf8"); return c; }

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
