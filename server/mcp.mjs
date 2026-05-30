#!/usr/bin/env node
// Harness — Lean AI OS · servidor MCP (a "boca" MCP do motor — ADR-0023/0024)
// Transporte: stdio, JSON-RPC 2.0 newline-delimited (protocolo MCP 2024-11-05). Zero-dep.
// NAO contem logica: importa src/engine.mjs e expoe as tools finas.

import * as engine from "../src/engine.mjs";

const PROTOCOL = "2024-11-05";
const SERVER = { name: "harness-lean-ai-os", version: "0.6.0" };
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
    name: "os_orchestrate",
    description: "ORQUESTRADOR (ADR-0027): dada a intencao, devolve um pacote de interacao estruturado — classificacao, contexto, perguntas guiadas, sugestoes, acoes a executar e o que esta aguardando (awaiting). Use como passo unico para conduzir o fluxo em camadas com baixo custo. Reenvie com 'answers' e/ou 'approved' quando o usuario responder/confirmar.",
    inputSchema: {
      type: "object",
      properties: {
        intent: { type: "string" },
        answers: { type: "object", description: "respostas do usuario as perguntas guiadas (opcional)" },
        approved: { type: "boolean", description: "true quando o usuario aprovou o plano de tarefa complexa" },
      },
      required: ["intent"],
    },
    run: ({ intent, answers, approved }) => J(engine.orchestrate(intent, { answers: answers || null, approved: !!approved })),
  },
  {
    name: "os_decompose",
    description: "Quando uma tarefa estoura o orcamento de contexto, devolve subtarefas menores (invariante ADR-0022). Use antes de executar tarefas grandes.",
    inputSchema: { type: "object", properties: { intent: { type: "string" } }, required: ["intent"] },
    run: ({ intent }) => J(engine.decompose(intent)),
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
  {
    name: "os_handoff",
    description: "ENTREGA p/ a LLM (ADR-0028): spec estruturada da tarefa — objetivo, escopo, o que NAO fazer, pasta/arquivo alvo, onde esta o codigo, como e porque. Param 'answers' opcional (objetivo/escopo/etc). 'render'=true devolve markdown pronto p/ colar.",
    inputSchema: { type: "object", properties: { intent: { type: "string" }, answers: { type: "object" }, render: { type: "boolean" } }, required: ["intent"] },
    run: ({ intent, answers, render }) => { const r = engine.handoffToFile(intent, { answers: answers || {} }); return (render === false) ? J(r.handoff) : (engine.renderHandoff(r.handoff) + "\n\n(salvo em " + r.path + ")"); },
  },
  {
    name: "os_session",
    description: "Sessao de orquestracao persistente (ADR-0028): conduz a conversa e resume entre execucoes. action=start|answer|status|clear. start exige 'intent'; answer usa 'value' (resposta do usuario). Ao esgotar as perguntas, anexa o handoff.",
    inputSchema: { type: "object", properties: { action: { type: "string", enum: ["start", "answer", "status", "resume", "clear"] }, intent: { type: "string" }, value: { type: "string" } }, required: ["action"] },
    run: ({ action, intent, value }) => {
      if (action === "start") return J(engine.startSession(intent));
      if (action === "answer") return J(engine.answerSession(value || "", { intent }));
      if (action === "resume") return J(engine.resumeSession());
      if (action === "clear") return J(engine.clearSession());
      return J(engine.loadSession() || { active: false });
    },
  },
  {
    name: "os_gaps",
    description: "O QUE FALTA (ADR-0028): cruza code-map (smells), rotas e ausencia de testes para apontar lacunas concretas a endereçar. Requer os_scan para melhor precisao.",
    inputSchema: { type: "object", properties: { intent: { type: "string" } }, required: ["intent"] },
    run: ({ intent }) => J(engine.gaps(intent)),
  },
  {
    name: "os_metrics",
    description: "Metricas de economia de contexto (roadmap #9): CORE, projeto inteiro estimado e tokens poupados por tarefa vs baseline. Passe 'intent' para a economia da tarefa.",
    inputSchema: { type: "object", properties: { intent: { type: "string" } } },
    run: ({ intent }) => J(engine.metrics(intent || null)),
  },
  {
    name: "os_suggest_routes",
    description: "Aprendizado de rotas (roadmap #7): analisa o historico de intencoes e sugere novas rotas/triggers ausentes no indice.",
    inputSchema: { type: "object", properties: {} },
    run: () => J(engine.suggestRoutes()),
  },
  {
    name: "os_subtasks",
    description: "Subtarefas como sessoes-filhas (roadmap #6). action=spawn|status|done. spawn usa 'intent'; done usa 'id'.",
    inputSchema: { type: "object", properties: { action: { type: "string", enum: ["spawn", "status", "done"] }, intent: { type: "string" }, id: { type: "string" } }, required: ["action"] },
    run: ({ action, intent, id }) => {
      if (action === "spawn") return J(engine.spawnSubsessions(intent));
      if (action === "done") return J(engine.setSubStatus(id, "done"));
      return J(engine.subStatus());
    },
  },
  {
    name: "os_template",
    description: "Template de projeto (roadmap #10): seed de objetivo, primeiros passos, o que NAO fazer e triggers por tipo. kind=api|web|cli|lib.",
    inputSchema: { type: "object", properties: { kind: { type: "string", enum: engine.TEMPLATE_KINDS } }, required: ["kind"] },
    run: ({ kind }) => J(engine.template(kind)),
  },
  {
    name: "os_smash",
    description: "SMASH (ADR-0033): devolve o handoff.md atual — estado/diretrizes do projeto alinhados entre Usuario e Harness. A LLM chama isto, SEGUE o handoff e ao terminar registra o que fez via os_report. Canal Usuario->Harness->LLM.",
    inputSchema: { type: "object", properties: {} },
    run: () => { const h = engine.readHandoff(); return h.exists ? h.text : "Nenhum handoff pendente. Rode os_orchestrate/os_session ou os_handoff primeiro."; },
  },
  {
    name: "os_pipeline",
    description: "TURBINA (ADR-0034): fluxo padrao de desenvolvimento. O Harness faz o pesado no repo (scan + analyze + gaps) e ENTREGA o perfil do projeto + escreve handoff.md p/ a LLM. Use isto no inicio de um projeto novo ou existente. Param intent opcional.",
    inputSchema: { type: "object", properties: { intent: { type: "string" } } },
    run: ({ intent }) => J(engine.pipeline(intent || "")),
  },
  {
    name: "os_analyze",
    description: "Perfil profundo do PROJETO (nao do Harness): estrutura, stack, entrypoints, configs, docs, testes, dependencias, scripts e smells. Para a LLM entender o projeto sem ler tudo.",
    inputSchema: { type: "object", properties: {} },
    run: () => J(engine.analyzeProject()),
  },
  {
    name: "os_inspect",
    description: "Lista pastas/arquivos do projeto (ou de uma subpasta). Escopado e seguro: protege .harness e ignora ruido (node_modules, .git, build). Use sub para isolar um modulo (ex: src/payments).",
    inputSchema: { type: "object", properties: { sub: { type: "string" } } },
    run: ({ sub }) => J(engine.inspectTree(sub || ".")),
  },
  {
    name: "os_automations",
    description: "Catalogo das automacoes (bots) do Harness — globais e isoladas — que a LLM pode acionar para o trabalho pesado no repo.",
    inputSchema: { type: "object", properties: {} },
    run: () => J(engine.automations()),
  },
  {
    name: "os_report",
    description: "A LLM submete o documento do que foi feito. O Harness guarda em .harness/.ai/report.md e o LE na proxima interacao p/ saber o andamento. Feche toda tarefa com isto.",
    inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
    run: ({ text }) => { const r = engine.submitReport(text); return "Relatorio salvo em " + r.path + " (" + r.stamp + ")."; },
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
