#!/usr/bin/env node
// Harness — Lean AI OS · CLI (uma das "bocas" do motor — ADR-0023)
// NAO contem logica de negocio: so renderiza src/engine.mjs no terminal.

import * as engine from "../src/engine.mjs";
import { writeFileSync, mkdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m",
};
const color = (c, s) => (process.stdout.isTTY ? C[c] + s + C.reset : s);
const die = (msg) => { console.error(color("red", "x " + msg)); process.exit(1); };
const mark = (ok) => (ok ? color("green", "ok") : color("red", "x"));

function cmdRoute(intent) {
  if (!intent) die('uso: os route "<intencao>"');
  const { matched, files } = engine.route(intent);
  console.log(color("bold", `\nRotas casadas (${matched.length}):`));
  if (matched.length === 0) console.log(color("dim", "  nenhuma — fallback: so CORE + pedir classificacao"));
  matched.forEach((m) => console.log(`  - ${color("cyan", m.id)}  ${color("dim", "<- '" + m.trigger + "'")}`));
  console.log(color("bold", `\nArquivos a carregar (${files.length}):`));
  files.forEach((f) => {
    const ft = engine.fileTokens(f);
    console.log(`  ${mark(ft.exists)} ${f}  ${ft.exists ? color("dim", `~${ft.tokens} tk`) : color("red", "FALTANDO")}`);
  });
}

function cmdWork(intent) {
  if (!intent) die('uso: os work "<intencao>"');
  const ws = engine.computeWorkingSet(intent);
  console.log(color("bold", `\n=== Working-set para: "${intent}" ===`));
  const p = ws.posture;
  console.log(color("dim", `Fase: ${p.phase} (${p.maturity}) | postura: questionamento ${p.questioning}, foco ${p.focus}`));
  console.log(`Classifique a tarefa: ${color("yellow", "trivial | simple | complex")}`);
  console.log(color("bold", `\nContexto recuperado (${ws.files.length} arquivos):`));
  ws.files.forEach((l) =>
    console.log(`  ${mark(l.exists)} ${l.rel}  ${l.exists ? color("dim", `~${l.tokens} tk`) : color("red", "FALTANDO")}`));
  const pct = Math.round((ws.total / ws.cap) * 100);
  console.log(color("bold", `\nOrcamento de contexto:`));
  console.log(`  total ~${ws.total} tk / cap ${ws.cap} tk  (${pct}%)  ${ws.within ? color("green", "OK") : color("red", "ESTOUROU -> decompor a tarefa")}`);
  console.log(color("dim", `\nDialogo: ${p.guidance}`));
  console.log(color("dim", "Codigo: grep/busca por simbolo no momento da tarefa. Historico: 'os recall <termo>'."));
  if (ws.codeCandidates && ws.codeCandidates.length) {
    console.log(color("bold", `\nCandidatos de codigo (leia sob demanda, nao pre-carregue):`));
    ws.codeCandidates.forEach((c) => console.log(`  -> ${c.path}  ${color("dim", "(" + c.lines + "L" + (c.exports.length ? ", " + c.exports.slice(0,4).join(",") : "") + ")")}`));
  }
  if (ws.fallback) console.log(color("yellow", "\nNenhuma rota casou. Peca ao usuario uma palavra de classificacao."));
  process.exit(ws.within ? 0 : 2);
}

function cmdOrchestrate(rest) {
  const json = rest.includes("--json");
  const approved = rest.includes("--approved") || rest.includes("--ok");
  const intent = rest.filter((x) => !x.startsWith("--")).join(" ").trim();
  if (!intent) die('uso: os next "<intencao>" [--json] [--approved]');
  const pkt = engine.orchestrate(intent, { approved });
  if (json) { console.log(JSON.stringify(pkt, null, 2)); return; }
  console.log(color("bold", `\n=== Orquestracao: "${intent}" ===`));
  console.log(color("dim", `Fase ${pkt.phase} (${pkt.maturity}) | classificacao: `) + color("yellow", pkt.classification));
  const w = pkt.workingSet;
  console.log(`Contexto: ${w.files.length} arquivo(s) ~${w.total}/${w.cap} tk  ${w.within ? color("green", "OK") : color("red", "ESTOUROU")}`);
  if (pkt.questions.length) {
    console.log(color("bold", "\nPerguntas guiadas (faca ao usuario):"));
    pkt.questions.forEach((q, i) => console.log(`  ${i + 1}. ${q.q}  ${color("dim", "[" + q.id + "]")}`));
  }
  if (pkt.decomposition.needed) {
    console.log(color("bold", `\nDecomposicao (${pkt.decomposition.reason}):`));
    pkt.decomposition.subtasks.forEach((s) => console.log(`  - ${s.intent}  ${color("dim", "(" + s.basis + ")")}`));
  }
  if (pkt.suggestions.length) { console.log(color("bold", "\nSugestoes:")); pkt.suggestions.forEach((s) => console.log("  - " + s)); }
  console.log(color("bold", "\nAcoes (na ordem):"));
  pkt.actions.forEach((a) => console.log(`  -> ${color("cyan", a.step)} ${color("dim", "(" + a.tool + ")")} — ${a.why}`));
  console.log(color("yellow", `\nAguardando: ${pkt.awaiting || "nada — pode executar"}`));
}

function cmdDecompose(intent) {
  if (!intent) die('uso: os decompose "<intencao>"');
  const d = engine.decompose(intent);
  if (!d.needed) { console.log(color("green", `ok cabe no orcamento (${d.reason}) — nao precisa decompor.`)); return; }
  console.log(color("bold", `\nDecomposicao (${d.reason}):`));
  d.subtasks.forEach((s) => console.log(`  - ${s.intent}  ${color("dim", "(" + s.basis + ")")}`));
}

function cmdTokens() {
  const core = engine.measureCore();
  console.log(color("bold", "\n=== Medidor de tokens (CORE sempre-ligado) ==="));
  const row = (label, m) =>
    console.log(`  ${mark(m.ok)} ${label.padEnd(22)} ~${String(m.tokens).padStart(5)} tk / cap ${m.cap}  ${m.ok ? "" : color("red", "ACIMA")}`);
  row("CONSTITUTION.md", core.constitution);
  row("state-of-world.md", core.stateOfWorld);
  console.log(color("dim", "  ----"));
  console.log(`  CORE total carregado/mensagem: ~${core.total} tk`);
  if (!core.ok) { console.log(color("red", "\nx CORE acima do teto. Reduza antes de prosseguir.")); process.exit(2); }
  console.log(color("green", "\nok CORE dentro do orcamento."));
}

function cmdDoctor() {
  const r = engine.doctor();
  console.log(color("bold", "\n=== Doctor ==="));
  r.checks.forEach((c) => console.log(`  ${mark(c.ok)} ${c.msg}`));
  console.log(r.ok ? color("green", "\nok Doctor OK — 0 problemas") : color("red", `\nx Doctor: ${r.problems} problema(s)`));
  process.exit(r.ok ? 0 : 2);
}

function cmdSync() {
  const { stamp } = engine.sync();
  console.log(color("green", `ok state-of-world.md sincronizado (${stamp})`));
  cmdTokens();
}

function cmdRecall(query) {
  if (!query) die('uso: os recall "<termo>"');
  const r = engine.recall(query);
  console.log(color("bold", `\nRecall "${r.query}" — ${r.count} ocorrencia(s):`));
  if (r.count === 0) console.log(color("dim", "  nada nos logs."));
  r.hits.forEach((h) => console.log(`  ${color("cyan", h.log + ":" + h.line)}  ${h.text}`));
}

function cmdRemember(args) {
  const [log, ...rest] = args;
  const entry = rest.join(" ").trim();
  if (!log || !entry) die('uso: os remember <tasks|decisions|errors> "<entrada>"');
  const r = engine.remember(log, entry);
  console.log(color("green", `ok registrado em ${r.rel}: ${r.appended}`));
}

function cmdReadCore() {
  const c = engine.readCore();
  console.log(c.constitution + "\n\n---\n\n" + c.stateOfWorld);
}

function cmdBrief() {
  const b = engine.brief();
  console.log(color("bold", "\n=== Brief (situacao para a LLM) ==="));
  console.log(`  Fase:        ${color("cyan", b.phase)}   Maturidade: ${color("cyan", b.maturity)}`);
  console.log(`  Sinais:      ADRs=${b.signals.adrs} tarefas=${b.signals.tasks} rotas=${b.signals.routes}`);
  console.log(`  Postura:     questionamento ${color("yellow", b.posture.questioning)}, foco ${color("yellow", b.posture.focus)}`);
  console.log(`  Dialogo:     ${color("dim", b.posture.guidance)}`);
  console.log(`  CORE:        ${b.core.join(" + ")}`);
  console.log(`  Proximo:     ${color("green", b.recommended_next)}`);
}

function cmdCaps() {
  const c = engine.capabilities();
  console.log(color("bold", "\n=== Capabilities (navegacao interna) ==="));
  console.log(color("dim", `  fase ${c.phase} | maturidade ${c.maturity}`));
  console.log(color("bold", "\n  Opcoes:"));
  c.actions.forEach((a) => console.log(`  - ${color("cyan", a.cli.padEnd(42))} ${color("dim", a.when)}`));
  console.log(color("green", `\n  Recomendado agora: ${c.recommended_next}`));
}

function cmdPhase(arg) {
  if (!arg) {
    const st = engine.getState();
    console.log(`Fase atual: ${color("cyan", st.phase)}  ${color("dim", "(" + engine.PHASES.join(" -> ") + ")")}`);
    console.log(color("dim", `Postura: ${engine.posture().guidance}`));
    return;
  }
  const r = engine.setPhase(arg);
  console.log(color("green", `ok fase: ${r.from} -> ${r.to}`));
  console.log(color("dim", `Postura: ${engine.posture().guidance}`));
}

function cmdInit(arg) {
  const plan = engine.initPlan(arg);
  console.log(color("bold", `\n=== Init (${plan.kind}${plan.kind !== plan.detected ? ", detectado: " + plan.detected : ""}) ===`));
  console.log(color("dim", `  ${plan.note}`));
  console.log(color("bold", `\n  Perguntas para conduzir com o usuario (${plan.steps.length}):`));
  plan.steps.forEach((s, i) => console.log(`  ${i + 1}. ${s.q}  ${color("dim", "[" + s.id + "]")}`));
  console.log(color("dim", `\n  Conduza uma a uma; o que se firmar -> ADR + 'os remember decisions'. Avance a fase com 'os phase execution'.`));
}

function cmdScan() {
  const r = engine.scan();
  console.log(color("bold", "\n=== Scan (varredura do projeto) ==="));
  console.log(`  Arquivos de codigo: ${r.fileCount} | linhas: ${r.totalLines}`);
  console.log(`  Stack: ${r.stack.length ? r.stack.join(", ") : "(nenhuma detectada)"}`);
  console.log(`  Smells: ${r.smells.length}`);
  r.smells.slice(0, 10).forEach((sm) => console.log(`    - ${sm.kind}: ${sm.path} (${sm.lines}L)`));
  console.log(color("dim", `  code-map -> ${r.path} (runtime, gitignored)`));
}

function cmdFind(query) {
  if (!query) die('uso: os find "<termo>"');
  const r = engine.searchCode(query);
  if (!r.scanned) { console.log(color("yellow", "  " + r.note)); return; }
  console.log(color("bold", `\nFind "${r.query}" — ${r.count} candidato(s):`));
  r.hits.forEach((h) => console.log(`  -> ${h.path}  ${color("dim", "(" + h.lines + "L, " + h.lang + ", score " + h.score + ")")}`));
}

function cmdGaps(rest) {
  const json = rest.includes("--json");
  const intent = rest.filter((x) => !x.startsWith("--")).join(" ").trim();
  if (!intent) die('uso: os gaps "<intencao>" [--json]');
  const g = engine.gaps(intent);
  if (json) { console.log(JSON.stringify(g, null, 2)); return; }
  console.log(color("bold", "\nO que falta (" + g.count + "):"));
  if (g.count === 0) console.log(color("dim", "  nada obvio — bom sinal."));
  g.items.forEach((i) => console.log("  - " + color("yellow", i.kind) + ": " + i.path + color("dim", " (" + i.detail + ")")));
}

function cmdHandoff(rest) {

  const json = rest.includes("--json");
  const intent = rest.filter((x) => !x.startsWith("--")).join(" ").trim();
  if (!intent) die('uso: os handoff "<intencao>" [--json]');
  const r = engine.handoffToFile(intent, {});
  if (json) { console.log(JSON.stringify(r.handoff, null, 2)); return; }
  console.log(engine.renderHandoff(r.handoff));
  console.log(color("green", "\nok salvo em " + r.path));
}

function cmdSmash() {
  const h = engine.readHandoff();
  if (!h.exists) { console.log(color("yellow", "Nenhum handoff pendente. Rode 'next'/'session' ou 'handoff \"<intencao>\"' primeiro.")); return; }
  console.log(h.text);
}

function cmdReport(rest) {
  const text = rest.join(" ").trim();
  if (!text) die('uso: os report "<o que foi feito>"');
  const r = engine.submitReport(text);
  console.log(color("green", "ok relatorio salvo em " + r.path));
}

function cmdSession(rest) {
  const action = rest[0];
  const json = rest.includes("--json");
  const args = rest.slice(1).filter((x) => !x.startsWith("--"));
  const text = args.join(" ").trim();
  let r;
  if (action === "start") r = engine.startSession(text);
  else if (action === "answer") r = engine.answerSession(text);
  else if (action === "resume") r = engine.resumeSession();
  else if (action === "note") r = engine.noteSession(text);
  else if (action === "clear") r = engine.clearSession();
  else if (action === "status" || !action) r = engine.loadSession() || { active: false };
  else die("uso: os session <start|answer|status|resume|clear> [texto]");
  if (json) { console.log(JSON.stringify(r, null, 2)); return; }
  if (!r.active) { console.log(color("dim", "Nenhuma sessao ativa.")); return; }
  const last = r.log && r.log.length ? r.log[r.log.length - 1] : null;
  console.log(color("bold", "\nSessao " + r.id + " — \"" + r.intent + "\"  ") + color("dim", "[" + (r.awaiting || "ok") + "]"));
  if (last) console.log(color("cyan", "Orquestrador: ") + last.text);
  if (r.awaiting === "user_answers") console.log(color("dim", "-> responda com: os session answer \"<sua resposta>\""));
  if (r.handoff) { console.log(color("green", "\nHandoff pronto:\n")); console.log(engine.renderHandoff(r.handoff)); }
}

function pkgVersion() {
  try { return JSON.parse(engine.readIfExists(join(engine.ROOT, "package.json"))).version || "?"; }
  catch { return "?"; }
}

function banner() {
  const v = pkgVersion();
  const cyan = (s) => color("cyan", s);
  console.log("");
  console.log(cyan("   ██   ██  █████  ██████  ███    ██ ███████ ███████ ███████"));
  console.log(cyan("   ██   ██ ██   ██ ██   ██ ████   ██ ██      ██      ██     "));
  console.log(cyan("   ███████ ███████ ██████  ██ ██  ██ █████   ███████ ███████"));
  console.log(cyan("   ██   ██ ██   ██ ██   ██ ██  ██ ██ ██           ██      ██"));
  console.log(cyan("   ██   ██ ██   ██ ██   ██ ██   ████ ███████ ███████ ███████"));
  console.log("");
  console.log(`   ${color("bold", "Harness — Lean AI OS")}  ${color("dim", "v" + v)}`);
  console.log(`   ${color("dim", "Orquestrador entre voce e a LLM · contexto por tarefa, nao por projeto")}`);
  console.log("");
}

function existsDir(p) { try { return statSync(p).isDirectory(); } catch { return false; } }

function cmdSetup() {
  banner();
  const here = process.cwd();
  const installed = existsSync(join(here, ".harness", "bin", "os.mjs"));
  console.log(color("bold", "   Pasta atual: ") + color("dim", here));
  console.log(`   Harness: ${installed ? color("green", "instalado em .harness/") : color("yellow", "ainda nao instalado aqui")}`);
  console.log(color("bold", "\n   Configs de IDE detectadas:"));
  const checks = [[".claude", "Claude Code"], [".vscode", "VSCode"], [".gemini", "Antigravity/Gemini"], [".cursor", "Cursor"], [".windsurf", "Windsurf"]];
  for (const [dir, label] of checks) {
    const ok = existsDir(join(here, dir));
    console.log(`   ${ok ? color("green", "ok") : color("dim", "--")} ${label}  ${color("dim", dir)}`);
  }
  console.log("");
  console.log(color("bold", "   Proximos passos:"));
  console.log(`   1. ${color("cyan", "npx @igorkadu/harness install all")}   instala o Harness + conecta o MCP (ou troque 'all' pela sua IDE)`);
  console.log(`   2. ${color("cyan", "reinicie a IDE")}`);
  console.log(`   3. ${color("cyan", installed ? "node .harness/bin/os.mjs doctor" : "npx @igorkadu/harness doctor")}`);
  console.log(color("dim", "   Extensao: Install from VSIX -> .harness/extension/*.vsix. Guia: .harness/CONNECT.md"));
  console.log("");
}

function cmdInstall(rest) {
  const target = (rest[0] || "all").toLowerCase();
  banner();
  import("./scaffold.mjs").then((m) => {
    const list = target === "all" ? m.CONFIG_TARGETS : [target];
    let r;
    try { r = m.install(process.cwd(), list); } catch (e) { die(e.message); return; }
    if (r.harnessCreated) console.log(`   ${color("green", "ok")} Harness instalado em ${color("cyan", ".harness/")}  ${color("dim", "(motor + MCP + extensao + memoria)")}`);
    else console.log(color("dim", "   .harness/ ja existe — atualizando configs"));
    console.log(color("bold", "\n   Configs MCP gravadas:"));
    r.written.forEach((w) => console.log(`   ${color("green", "ok")} ${w.target.padEnd(12)} -> ${w.file}`));
    console.log(color("dim", `\n   Extensao (chat-orquestrador): Install from VSIX -> ${r.vsix}`));
    console.log(color("dim", "   Reinicie a IDE para conectar o MCP. Guia: .harness/CONNECT.md\n"));
  });
}

function cmdSubtasks(rest) {
  const action = rest[0];
  const text = rest.slice(1).join(" ").trim();
  if (action === "spawn") { const r = engine.spawnSubsessions(text); console.log(color("bold", "\nSubtarefas (" + r.items.length + "):")); r.items.forEach((s) => console.log("  " + color("cyan", s.id) + " [" + s.status + "] " + s.intent)); return; }
  if (action === "done") { const r = engine.setSubStatus(text, "done"); console.log(color("green", "ok " + text + " concluida — progresso " + r.progress.pct + "%")); return; }
  const c = engine.subStatus();
  if (!c.items || !c.items.length) { console.log(color("dim", "Nenhuma subtarefa. Use: os subtasks spawn \"<intencao>\"")); return; }
  console.log(color("bold", "\nSubtarefas de: " + c.parent));
  c.items.forEach((s) => console.log("  " + (s.status === "done" ? color("green", "ok") : color("dim", "--")) + " " + color("cyan", s.id) + " " + s.intent));
  if (c.progress) console.log(color("dim", "  progresso: " + c.progress.done + "/" + c.progress.total + " (" + c.progress.pct + "%)"));
}

function cmdRoutes() {
  const r = engine.suggestRoutes();
  console.log(color("bold", "\nRotas sugeridas (a partir do historico, " + r.suggestions.length + "):"));
  if (!r.suggestions.length) console.log(color("dim", "  nada recorrente ainda."));
  r.suggestions.forEach((s) => console.log("  - " + color("cyan", s.term) + color("dim", " (x" + s.count + ") " + s.hint)));
}

function cmdMetrics(rest) {
  const intent = rest.filter((x) => !x.startsWith("--")).join(" ").trim();
  const m = engine.metrics(intent || null);
  console.log(color("bold", "\n=== Metricas de economia ==="));
  console.log("  CORE: ~" + m.coreTokens + " tk");
  if (m.projectTokens != null) console.log("  Projeto inteiro (estimado): ~" + m.projectTokens + " tk");
  if (m.intent) {
    console.log("  Working-set da tarefa: ~" + m.workingSetTokens + " tk");
    console.log("  Por tarefa (CORE+ws): ~" + m.perTask + " tk vs baseline ~" + m.baseline + " tk");
    console.log(color("green", "  Economia: ~" + m.saved + " tk (" + m.savedPct + "%)"));
  } else if (m.note) console.log(color("dim", "  " + m.note));
}

function cmdTemplate(rest) {
  const kind = (rest[0] || "").toLowerCase();
  const t = engine.template(kind);
  if (t.error) { console.log(color("yellow", "tipos: " + t.kinds.join(" | "))); return; }
  console.log(color("bold", "\nTemplate '" + t.kind + "' — " + t.objetivo));
  console.log(color("bold", "  Primeiros passos:")); t.primeiros.forEach((p) => console.log("   - " + p));
  console.log(color("bold", "  Nao fazer agora:")); t.nao_fazer.forEach((p) => console.log("   - " + p));
  console.log(color("dim", "  triggers sugeridos p/ rotas: " + t.rotas.join(", ")));
}

function cmdHelp() {


  console.log(`
${color("bold", "Harness — Lean AI OS")}  ${color("dim", "(retrieval-first · ADR-0022..0029)")}

${color("bold", "Orquestracao (ADR-0027):")}
  ${color("cyan", 'next "<intencao>"')}        pacote de interacao: classifica + perguntas + acoes (use --json p/ a extensao)
  ${color("cyan", 'decompose "<intencao>"')}   quebra tarefa grande em subtarefas
  ${color("cyan", 'handoff "<intencao>"')}     gera/escreve a entrega p/ a LLM em .harness/.ai/handoff.md
  ${color("cyan", "smash")}                    imprime o handoff atual (a LLM segue isto)
  ${color("cyan", 'report "<txt>"')}            a LLM registra o que fez (.harness/.ai/report.md)
  ${color("cyan", 'gaps "<intencao>"')}        aponta o que falta (smells, sem teste, arquivo ausente)
  ${color("cyan", "session <start|answer|status|clear>")}  conversa do orquestrador (persiste e resume)
${color("bold", "Tarefa:")}
  ${color("cyan", 'work "<intencao>"')}        recupera <=5 arquivos + brief + postura
  ${color("cyan", 'route "<intencao>"')}       so o roteamento
${color("bold", "Comunicacao (ADR-0024):")}
  ${color("cyan", "brief")}                    situacao + postura de dialogo
  ${color("cyan", "caps")}                     navegacao interna: opcoes + acao recomendada
  ${color("cyan", "phase [fase]")}             ve/avanca a fase (discovery->execution->stabilization)
  ${color("cyan", "init [new|existing]")}      onboarding guiado
${color("bold", "Varredura (ADR-0025):")}
  ${color("cyan", "scan")}                     mapeia codigo/stack -> .ai/runtime/code-map.json
  ${color("cyan", 'find "<termo>"')}           acha arquivos/simbolos no code-map
${color("bold", "Insights (roadmap):")}\n  ${color("cyan", 'metrics ["<intencao>"]')}    economia de contexto por tarefa\n  ${color("cyan", "routes")}                   sugere novas rotas pelo historico\n  ${color("cyan", "subtasks <spawn|status|done>")}  subtarefas como sessoes\n  ${color("cyan", "template <api|web|cli|lib>")}  seed por tipo de projeto\n${color("bold", "Memoria:")}
  ${color("cyan", 'recall "<termo>"')}         grep nos logs (sem carregar inteiro)
  ${color("cyan", 'remember <log> "<txt>"')}   append num log (tasks|decisions|errors)
  ${color("cyan", "read-core")}                imprime CONSTITUTION + state-of-world
${color("bold", "Servidor:")}
  ${color("cyan", "mcp")}                      inicia o servidor MCP (stdio) — usado pelas IDEs\n  ${color("cyan", "serve [porta]")}            painel web do orquestrador (http, default 4173)
${color("bold", "Manutencao:")}
  ${color("cyan", "sync")}                     reescreve o state-of-world + mede o CORE
  ${color("cyan", "tokens")}                   mede o CORE contra o teto
  ${color("cyan", "doctor")}                   integridade do indice/CORE/fase\n  ${color("cyan", "upgrade [dir]")}            atualiza o Harness PRESERVANDO memoria (backup automatico)

${color("bold", "Principio:")} contexto por tarefa, nao por projeto. Nao cabe -> decomponha.
`);
}

const [cmd, ...rest] = process.argv.slice(2);
const arg = rest.join(" ").trim();
try {
  switch (cmd) {
    case "next": case "orchestrate": cmdOrchestrate(rest); break;
    case "handoff": cmdHandoff(rest); break;
    case "smash": cmdSmash(); break;
    case "report": cmdReport(rest); break;
    case "gaps": cmdGaps(rest); break;
    case "subtasks": cmdSubtasks(rest); break;
    case "routes": cmdRoutes(); break;
    case "metrics": cmdMetrics(rest); break;
    case "template": cmdTemplate(rest); break;
    case "session": cmdSession(rest); break;
    case "decompose": cmdDecompose(arg); break;
    case "work": cmdWork(arg); break;
    case "route": cmdRoute(arg); break;
    case "tokens": cmdTokens(); break;
    case "doctor": cmdDoctor(); break;
    case "sync": cmdSync(); break;
    case "recall": cmdRecall(arg); break;
    case "remember": cmdRemember(rest); break;
    case "read-core": cmdReadCore(); break;
    case "brief": cmdBrief(); break;
    case "caps": case "capabilities": cmdCaps(); break;
    case "phase": cmdPhase(arg); break;
    case "init": cmdInit(arg); break;
    case "scan": cmdScan(); break;
    case "find": cmdFind(arg); break;
    case "mcp": import("../server/mcp.mjs").then((m) => m.start()); break;
    case "serve": import("../server/web.mjs").then((m) => m.start(Number(rest[0]) || 4173)); break;
    case "upgrade": import("./scaffold.mjs").then((m) => { try { const a = rest.filter((x)=>!x.startsWith("--")); const r = m.upgrade(a[0] || "."); console.log(color("green", "ok " + r.mode + " -> " + r.target)); if (r.backup) console.log(color("dim", "   backup: " + r.backup)); r.next.forEach((n)=>console.log("   " + n)); } catch (e) { die(e.message); } }); break;
    case "setup": cmdSetup(); break;
    case "install": cmdInstall(rest); break;
    case "help": cmdHelp(); break;
    case undefined: banner(); cmdHelp(); break;
    default: die(`comando desconhecido: ${cmd}. Rode 'os help'.`);
  }
} catch (e) {
  die(e.message);
}
