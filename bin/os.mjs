#!/usr/bin/env node
// Harness — Lean AI OS · CLI (uma das "bocas" do motor — ADR-0023)
// NAO contem logica de negocio: so renderiza src/engine.mjs no terminal.
// Comandos: work route tokens doctor sync recall remember read-core brief caps phase init help

import * as engine from "../src/engine.mjs";

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

function cmdTokens() {
  const core = engine.measureCore();
  console.log(color("bold", "\n=== Medidor de tokens (CORE sempre-ligado) ==="));
  const row = (label, m) =>
    console.log(`  ${mark(m.ok)} ${label.padEnd(22)} ~${String(m.tokens).padStart(5)} tk / cap ${m.cap}  ${m.ok ? "" : color("red", "ACIMA")}`);
  row("CONSTITUTION.md", core.constitution);
  row("state-of-world.md", core.stateOfWorld);
  console.log(color("dim", "  ----"));
  console.log(`  CORE total carregado/mensagem: ~${core.total} tk`);
  console.log(color("dim", "  (referencia: o CORE do StealthOS media ~9-11k tk — ADR-0022)"));
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

function cmdHelp() {
  console.log(`
${color("bold", "Harness — Lean AI OS")}  ${color("dim", "(ADR-0022/0023/0024 · retrieval-first)")}

${color("bold", "Tarefa:")}
  ${color("cyan", 'work "<intencao>"')}        recupera <=5 arquivos + brief + postura
  ${color("cyan", 'route "<intencao>"')}       so o roteamento
${color("bold", "Comunicacao (ADR-0024):")}
  ${color("cyan", "brief")}                    situacao + postura de dialogo (leia antes de falar c/ usuario)
  ${color("cyan", "caps")}                     navegacao interna: opcoes + acao recomendada
  ${color("cyan", "phase [fase]")}             ve/avanca a fase (discovery->execution->stabilization)
  ${color("cyan", "init [new|existing]")}      onboarding guiado (perguntas p/ a LLM conduzir)
${color("bold", "Varredura (ADR-0025):")}\n  ${color("cyan", "scan")}                     mapeia codigo/stack -> .ai/runtime/code-map.json\n  ${color("cyan", 'find "<termo>"')}           acha arquivos/simbolos no code-map\n${color("bold", "Memoria:")}
  ${color("cyan", 'recall "<termo>"')}         grep nos logs (sem carregar inteiro)
  ${color("cyan", 'remember <log> "<txt>"')}   append num log (tasks|decisions|errors)
  ${color("cyan", "read-core")}                imprime CONSTITUTION + state-of-world
${color("bold", "Servidor:")}\n  ${color("cyan", "mcp")}                      inicia o servidor MCP (stdio) — usado pelas IDEs\n${color("bold", "Manutencao:")}
  ${color("cyan", "sync")}                     reescreve o state-of-world + mede o CORE
  ${color("cyan", "tokens")}                   mede o CORE contra o teto
  ${color("cyan", "doctor")}                   integridade do indice/CORE/fase

${color("bold", "Principio:")} contexto por tarefa, nao por projeto. Nao cabe -> decomponha a tarefa.
`);
}

const [cmd, ...rest] = process.argv.slice(2);
const arg = rest.join(" ").trim();
try {
  switch (cmd) {
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
    case "scaffold": import("./scaffold.mjs").then((m) => { try { const a = rest.filter((x)=>!x.startsWith("--")); const r = m.scaffold(a[0], { force: rest.includes("--force") }); console.log(color("green", "ok scaffolded -> " + r.target)); r.next.forEach((n)=>console.log("   " + n)); } catch (e) { die(e.message); } }); break;
    case "help": case undefined: cmdHelp(); break;
    default: die(`comando desconhecido: ${cmd}. Rode 'os help'.`);
  }
} catch (e) {
  die(e.message);
}
