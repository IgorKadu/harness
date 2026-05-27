#!/usr/bin/env node
// Harness — Lean AI OS · servidor MCP (a "boca" MCP do motor — ADR-0023/0024)
// Transporte: stdio, JSON-RPC 2.0 newline-delimited (protocolo MCP 2024-11-05). Zero-dep.
// NAO contem logica: importa src/engine.mjs e expoe 12 tools finas.

import * as engine from "../src/engine.mjs";

const PROTOCOL = "2024-11-05";
const SERVER = { name: "harness-lean-ai-os", version: "0.1.0" };
const J = (o) => JSON.stringify(o, null, 2);

const TOOLS = [
  {
    name: "os_read_core",
    description: "Le o CORE sempre-ligado (CONSTITUTION + state-of-world). Use no inicio de toda tarefa.",
    inputSchema: { type: "object", properties: {} },
    run: () => { const c = engine.readCore(); return c.constitution + "\n\n---\n\n" + c.stateOfWorld; },
  },
  {
    name: "os_brief",
    description: "Situacao estruturada para a LLM ANTES de falar com o usuario: fase, maturidade, postura de dialogo e proximo passo. Leia isto para calibrar o tom.",
    inputSchema: { type: "object", properties: {} },
    run: () => J(engine.brief()),
  },
  {
    name: "os_capabilities",
    description: "Navegacao interna: o Harness informa as opcoes disponiveis agora + a acao recomendada. A LLM escolhe.",
    inputSchema: { type: "object", properties: {} },
    run: () => J(engine.capabilities()),
  },
  {
    name: "os_work",
    description: "Dada a intencao da tarefa, devolve os <=5 arquivos a carregar + orcamento + postura. Carregue SO esses arquivos.",
    inputSchema: { type: "object", properties: { intent: { type: "string" } }, required: ["intent"] },
    run: ({ intent }) => {
      const ws = engine.computeWorkingSet(intent);
      const lines = ws.files.map((f) => `${f.exists ? "OK" : "FALTANDO"} ${f.rel} (~${f.tokens} tk)`);
      const verdict = ws.within ? "OK" : "ESTOUROU -> decompor a tarefa";
      const note = ws.fallback ? "\nNenhuma rota casou: peca classificacao ao usuario." : "";
      return [
        `Working-set para: "${intent}"`,
        `Fase ${ws.posture.phase} (${ws.posture.maturity}) | postura: questionamento ${ws.posture.questioning}, foco ${ws.posture.focus}`,
        `Classifique: trivial | simple | complex`,
        ``,
        `Carregar (${ws.files.length}):`,
        ...lines.map((l) => "  " + l),
        ``,
        `Orcamento: ~${ws.total} tk / cap ${ws.cap} tk -> ${verdict}`,
        `Dialogo: ${ws.posture.guidance}`,
        (ws.codeCandidates && ws.codeCandidates.length ? `Candidatos de codigo (leia sob demanda): ${ws.codeCandidates.map((c) => c.path).join(", ")}` : ""),
        `Codigo: grep/busca por simbolo no momento da tarefa. Historico: os_recall.${note}`,
      ].join("\n");
    },
  },
  {
    name: "os_route",
    description: "So o roteamento: quais rotas e arquivos casam com a intencao.",
    inputSchema: { type: "object", properties: { intent: { type: "string" } }, required: ["intent"] },
    run: ({ intent }) => { const { matched, files } = engine.route(intent); return J({ matched: matched.map((m) => ({ id: m.id, trigger: m.trigger })), files }); },
  },
  {
    name: "os_init",
    description: "Onboarding guiado: detecta projeto novo vs existente e devolve as perguntas para a LLM conduzir com o usuario. Param opcional kind=new|existing.",
    inputSchema: { type: "object", properties: { kind: { type: "string", enum: ["new", "existing"] } } },
    run: ({ kind }) => J(engine.initPlan(kind)),
  },
  {
    name: "os_phase",
    description: "Ve ou avanca a fase do projeto (discovery -> execution -> stabilization). Sem arg = consulta. A fase controla a intensidade do dialogo.",
    inputSchema: { type: "object", properties: { phase: { type: "string", enum: engine.PHASES } } },
    run: ({ phase }) => {
      if (!phase) { const s = engine.getState(); return `Fase atual: ${s.phase}\nPostura: ${engine.posture().guidance}`; }
      const r = engine.setPhase(phase);
      return `Fase: ${r.from} -> ${r.to}\nPostura: ${engine.posture().guidance}`;
    },
  },
  {
    name: "os_recall",
    description: "Grep nos logs append-only SEM carrega-los inteiros. Use p/ historico/erros recorrentes.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, log: { type: "string", enum: ["tasks", "decisions", "errors"] } }, required: ["query"] },
    run: ({ query, log }) => {
      const r = engine.recall(query, { log: log || null });
      if (r.count === 0) return `Recall "${query}": nada nos logs.`;
      return `Recall "${query}" (${r.count}):\n` + r.hits.map((h) => `  ${h.log}:${h.line}  ${h.text}`).join("\n");
    },
  },
  {
    name: "os_remember",
    description: "Acrescenta uma entrada a um log append-only (tasks|decisions|errors). Nunca sobrescreve historico.",
    inputSchema: { type: "object", properties: { log: { type: "string", enum: ["tasks", "decisions", "errors"] }, entry: { type: "string" } }, required: ["log", "entry"] },
    run: ({ log, entry }) => { const r = engine.remember(log, entry); return `Registrado em ${r.rel}: ${r.appended}`; },
  },
  {
    name: "os_sync",
    description: "Reescreve o timestamp do state-of-world (memoria quente) e mede o CORE.",
    inputSchema: { type: "object", properties: {} },
    run: () => { const { stamp, core } = engine.sync(); return `Sincronizado (${stamp}). CORE ~${core.total} tk (ok=${core.ok}).`; },
  },
  {
    name: "os_doctor",
    description: "Integridade do indice, do CORE, dos logs e da fase.",
    inputSchema: { type: "object", properties: {} },
    run: () => { const r = engine.doctor(); return (r.ok ? "Doctor OK — 0 problemas\n" : `Doctor: ${r.problems} problema(s)\n`) + r.checks.map((c) => `  ${c.ok ? "OK" : "X"} ${c.msg}`).join("\n"); },
  },
  {
    name: "os_tokens",
    description: "Mede o CORE sempre-ligado contra o teto (mata o drift silencioso).",
    inputSchema: { type: "object", properties: {} },
    run: () => {
      const c = engine.measureCore();
      return [
        `CONSTITUTION ~${c.constitution.tokens}/${c.constitution.cap} tk (ok=${c.constitution.ok})`,
        `state-of-world ~${c.stateOfWorld.tokens}/${c.stateOfWorld.cap} tk (ok=${c.stateOfWorld.ok})`,
        `CORE total ~${c.total} tk (ok=${c.ok})`,
      ].join("\n");
    },
  },
  {
    name: "os_scan",
    description: "Varredura do projeto: mapeia arquivos de codigo, stack e smells -> .ai/runtime/code-map.json (regeneravel). Rode no inicio e apos mudancas grandes.",
    inputSchema: { type: "object", properties: {} },
    run: () => { const r = engine.scan(); return J(r); },
  },
  {
    name: "os_find",
    description: "Busca arquivos/simbolos no code-map por termo. Devolve candidatos (caminhos) para a LLM ler sob demanda. Requer os_scan antes.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    run: ({ query }) => J(engine.searchCode(query)),
  },
];

const TOOL_MAP = Object.fromEntries(TOOLS.map((t) => [t.name, t]));

function send(msg) { process.stdout.write(JSON.stringify(msg) + "\n"); }
function result(id, res) { send({ jsonrpc: "2.0", id, result: res }); }
function error(id, code, message) { send({ jsonrpc: "2.0", id, error: { code, message } }); }

function handle(msg) {
  const { id, method, params } = msg;
  if (method === "initialize") return result(id, { protocolVersion: PROTOCOL, capabilities: { tools: {} }, serverInfo: SERVER });
  if (method === "notifications/initialized" || method === "initialized") return;
  if (method === "ping") return result(id, {});
  if (method === "tools/list") return result(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
  if (method === "tools/call") {
    const t = TOOL_MAP[params?.name];
    if (!t) return error(id, -32602, `tool desconhecida: ${params?.name}`);
    try { return result(id, { content: [{ type: "text", text: t.run(params.arguments || {}) }] }); }
    catch (e) { return result(id, { content: [{ type: "text", text: "Erro: " + e.message }], isError: true }); }
  }
  if (id !== undefined) return error(id, -32601, `metodo nao suportado: ${method}`);
}

export function start() {
  let buf = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      try { handle(msg); } catch (e) { if (msg?.id !== undefined) error(msg.id, -32603, e.message); }
    }
  });
  process.stdin.on("end", () => process.exit(0));
}

// Auto-inicia so quando executado diretamente (node server/mcp.mjs), nao quando importado.
import { fileURLToPath as _f } from "node:url";
if (process.argv[1] && _f(import.meta.url) === _f("file://" + process.argv[1].replace(/\\/g, "/")) || (process.argv[1] && process.argv[1].endsWith("mcp.mjs"))) {
  start();
}
