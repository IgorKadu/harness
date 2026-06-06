// Harness — Lean AI OS · CLI/commands/system
// Renderers de comunicacao, varredura, memoria, manutencao e instalacao.
// Sem logica: tudo vem de src/engine.mjs (ADR-0023).

import { existsSync } from "node:fs";
import { join } from "node:path";
import * as engine from "../../src/engine.mjs";
import { color, die, mark, banner, existsDir } from "../lib/ui.mjs";

export function cmdTokens() {
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

export function cmdDoctor() {
  const r = engine.doctor();
  console.log(color("bold", "\n=== Doctor ==="));
  r.checks.forEach((c) => console.log(`  ${mark(c.ok)} ${c.msg}`));
  console.log(r.ok ? color("green", "\nok Doctor OK — 0 problemas") : color("red", `\nx Doctor: ${r.problems} problema(s)`));
  process.exit(r.ok ? 0 : 2);
}

export function cmdSync() {
  const { stamp } = engine.sync();
  console.log(color("green", `ok state-of-world.md sincronizado (${stamp})`));
  cmdTokens();
}

export function cmdRecall(query) {
  if (!query) die('uso: os recall "<termo>"');
  const r = engine.recall(query);
  console.log(color("bold", `\nRecall "${r.query}" — ${r.count} ocorrencia(s):`));
  if (r.count === 0) console.log(color("dim", "  nada nos logs."));
  r.hits.forEach((h) => console.log(`  ${color("cyan", h.log + ":" + h.line)}  ${h.text}`));
}

export function cmdRemember(args) {
  const [log, ...rest] = args;
  const entry = rest.join(" ").trim();
  if (!log || !entry) die('uso: os remember <tasks|decisions|errors> "<entrada>"');
  const r = engine.remember(log, entry);
  console.log(color("green", `ok registrado em ${r.rel}: ${r.appended}`));
}

export function cmdReadCore() {
  const c = engine.readCore();
  console.log(c.constitution + "\n\n---\n\n" + c.stateOfWorld);
}

export function cmdBrief() {
  const b = engine.brief();
  console.log(color("bold", "\n=== Brief (situacao para a LLM) ==="));
  console.log(`  Fase:        ${color("cyan", b.phase)}   Maturidade: ${color("cyan", b.maturity)}`);
  console.log(`  Sinais:      ADRs=${b.signals.adrs} tarefas=${b.signals.tasks} rotas=${b.signals.routes}`);
  console.log(`  Postura:     questionamento ${color("yellow", b.posture.questioning)}, foco ${color("yellow", b.posture.focus)}`);
  console.log(`  Dialogo:     ${color("dim", b.posture.guidance)}`);
  console.log(`  CORE:        ${b.core.join(" + ")}`);
  console.log(`  Proximo:     ${color("green", b.recommended_next)}`);
}

export function cmdCaps() {
  const c = engine.capabilities();
  console.log(color("bold", "\n=== Capabilities (navegacao interna) ==="));
  console.log(color("dim", `  fase ${c.phase} | maturidade ${c.maturity}`));
  console.log(color("bold", "\n  Opcoes:"));
  c.actions.forEach((a) => console.log(`  - ${color("cyan", a.cli.padEnd(42))} ${color("dim", a.when)}`));
  console.log(color("green", `\n  Recomendado agora: ${c.recommended_next}`));
}

export function cmdPhase(arg) {
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

export function cmdInit(arg) {
  const plan = engine.initPlan(arg);
  console.log(color("bold", `\n=== Init (${plan.kind}${plan.kind !== plan.detected ? ", detectado: " + plan.detected : ""}) ===`));
  console.log(color("dim", `  ${plan.note}`));
  console.log(color("bold", `\n  Perguntas para conduzir com o usuario (${plan.steps.length}):`));
  plan.steps.forEach((s, i) => console.log(`  ${i + 1}. ${s.q}  ${color("dim", "[" + s.id + "]")}`));
  console.log(color("dim", `\n  Conduza uma a uma; o que se firmar -> ADR + 'os remember decisions'. Avance a fase com 'os phase execution'.`));
}

export function cmdScan() {
  const r = engine.scan();
  console.log(color("bold", "\n=== Scan (varredura do projeto) ==="));
  console.log(`  Arquivos de codigo: ${r.fileCount} | linhas: ${r.totalLines}`);
  console.log(`  Stack: ${r.stack.length ? r.stack.join(", ") : "(nenhuma detectada)"}`);
  console.log(`  Smells: ${r.smells.length}`);
  r.smells.slice(0, 10).forEach((sm) => console.log(`    - ${sm.kind}: ${sm.path} (${sm.lines}L)`));
  console.log(color("dim", `  code-map -> ${r.path} (runtime, gitignored)`));
}

export function cmdFind(query) {
  if (!query) die('uso: os find "<termo>"');
  const r = engine.searchCode(query);
  if (!r.scanned) { console.log(color("yellow", "  " + r.note)); return; }
  console.log(color("bold", `\nFind "${r.query}" — ${r.count} candidato(s):`));
  r.hits.forEach((h) => console.log(`  -> ${h.path}  ${color("dim", "(" + h.lines + "L, " + h.lang + ", score " + h.score + ")")}`));
}

export function cmdSetup() {
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
  console.log(color("dim", "   Guia de conexao: .harness/CONNECT.md"));
  console.log("");
}

export function cmdInstall(rest) {
  const target = (rest[0] || "all").toLowerCase();
  banner();
  import("../scaffold.mjs").then((m) => {
    const list = target === "all" ? m.CONFIG_TARGETS : [target];
    let r;
    try { r = m.install(process.cwd(), list); } catch (e) { die(e.message); return; }
    if (r.harnessCreated) console.log(`   ${color("green", "ok")} Harness instalado em ${color("cyan", ".harness/")}  ${color("dim", "(motor + MCP + automacoes + memoria)")}`);
    else console.log(color("dim", "   .harness/ ja existe — atualizando configs"));
    console.log(color("bold", "\n   Configs MCP gravadas:"));
    r.written.forEach((w) => console.log(`   ${color("green", "ok")} ${w.target.padEnd(12)} -> ${w.file}`));
    console.log(color("dim", "\n   Proximo: rode o fluxo padrao -> node .harness/bin/os.mjs pipeline\n   Reinicie a IDE para conectar o MCP. Guia: .harness/CONNECT.md\n"));
  });
}

export function cmdHelp() {
  console.log(`
${color("bold", "Harness — Lean AI OS")}  ${color("dim", "(retrieval-first · orquestrador entre voce e a LLM)")}

${color("bold", "Comandos do usuario:")}
  ${color("cyan", "install")}                  instala o Harness (tela interativa: escolha o ambiente)
  ${color("cyan", "setup")}                    mostra o status da pasta atual e proximos passos
  ${color("cyan", "reset")}                    ZERA este Harness (memoria/Saves/runtime) p/ inicio limpo
  ${color("cyan", "update")}                   atualiza o Harness preservando memoria e Saves
  ${color("cyan", "reforce")}                  pede a LLM p/ recompilar memoria/Saves/docs ao estado atual
  ${color("cyan", "help")}                     esta ajuda

${color("dim", "Apos instalar, apenas converse com a LLM — ela ja sabe o que fazer (instrucoes + tools MCP).")}
${color("dim", "Os demais comandos sao internos do Harness (uso da LLM) e ficam ocultos.")}

${color("bold", "Principio:")} contexto por tarefa, nao por projeto. Save points primeiro; nao cabe -> decomponha.
`);
}

export function cmdSave(rest) {
  const action = rest[0] && !rest[0].startsWith("--") ? rest[0] : "status";
  const json = rest.includes("--json");
  const positional = rest.slice(1).filter((x) => !x.startsWith("--"));
  const all = rest.includes("--all");
  const layerArg = rest.find((x) => x.startsWith("--layer="));
  const stageArg = rest.find((x) => x.startsWith("--stage="));
  const stage = stageArg ? stageArg.slice(8) : null;

  if (action === "status") {
    const st = engine.savesStatus();
    if (json) { console.log(JSON.stringify(st, null, 2)); return; }
    console.log(color("bold", "\n=== Saves (checkpoints — leia ANTES dos fluxos) ==="));
    st.layers.forEach((l) => {
      const tag = l.exists ? color("green", "ok") : color("yellow", "--");
      const meta = l.exists ? color("dim", `[${l.stage || "?"}] ~${l.tokens} tk` + (l.ageHours != null ? `, ${l.ageHours}h` : "")) : color("dim", "ausente");
      console.log(`  ${tag} L${l.layer} ${color("cyan", l.title.padEnd(10))} ${meta}`);
    });
    console.log(color("bold", "\n  -> ") + st.recommendation);
    return;
  }
  if (action === "read") {
    const r = engine.readSaves(positional[0] || null);
    if (json) { console.log(JSON.stringify(r, null, 2)); return; }
    const list = r.saves || [r];
    list.forEach((s) => { console.log(color("bold", `\n--- ${s.file} ---`)); console.log(s.exists ? s.text : color("dim", "(ausente)")); });
    return;
  }
  if (action === "init") {
    const r = engine.initSaves();
    console.log(color("green", `ok skeletons criados: ${r.created.length ? "L" + r.created.join(", L") : "(nenhum — ja existiam)"}`));
    return;
  }
  if (action === "write") {
    const layer = layerArg ? layerArg.slice(8) : positional[0];
    const body = layerArg ? positional.join(" ") : positional.slice(1).join(" ");
    if (!layer || !body) return die('uso: os save write <1|2|3> "<conteudo>" [--stage=initial|pending|done]');
    const r = engine.writeSave(layer, body, stage ? { stage } : {});
    console.log(color("green", `ok Save L${r.layer} gravado (${r.file}, stage=${r.stage}, ~${r.tokens} tk)`));
    return;
  }
  if (action === "checkpoint") {
    const note = positional.join(" ").trim();
    if (!note) return die('uso: os save checkpoint "<nota>" [--all | --layer=N] [--stage=...]');
    const layers = all ? "all" : (layerArg ? layerArg.slice(8).split(",") : "all");
    const r = engine.saveCheckpoint({ layers, note, stage });
    console.log(color("green", `ok checkpoint em ${r.updated.map((u) => "L" + u.layer + "[" + u.stage + "]").join(", ")}`));
    return;
  }
  die("uso: os save <status|read|init|write|checkpoint> ...");
}

export function cmdStart(rest) {
  const json = rest.includes("--json");
  const intent = rest.filter((x) => !x.startsWith("--")).join(" ").trim() || null;
  const c = engine.capsule(intent);
  if (json) { console.log(JSON.stringify(c, null, 2)); return; }
  console.log(color("bold", "\n=== Start (capsula de contexto — leia ANTES de tudo) ==="));
  console.log(color("dim", `  fase ${c.phase} (${c.maturity}) · postura: ${c.posture.focus} · ~${c.capsuleTokens} tk`));
  if (c.focus) console.log(color("bold", "\n  Foco: ") + (c.focus.objective || "(sem objetivo)") + color("dim", c.focus.step ? ` [passo ${c.focus.step}/${c.focus.total || "?"}]` : ""));
  console.log(color("bold", "\n  Saves:"));
  c.saves.layers.forEach((l) => console.log(`   ${l.exists ? (l.stale ? color("yellow", "~") : color("green", "ok")) : color("dim", "--")} L${l.layer} ${l.title} ${color("dim", "[" + (l.stage || "?") + (l.stale ? ", stale" : "") + "]")}`));
  if (c.task) {
    console.log(color("bold", "\n  Tarefa: ") + color("yellow", c.task.classification) + color("dim", ` · ${c.task.load.length} arquivo(s) ~${c.task.budget.tokens}/${c.task.budget.cap} tk`));
    c.task.load.forEach((f) => console.log(color("dim", "   - " + f)));
  }
  console.log(color("bold", "\n  -> Proxima acao: ") + color("green", c.nextAction));
}

export function cmdFocus(rest) {
  const action = rest[0] && !rest[0].startsWith("--") ? rest[0] : "show";
  if (action === "clear") { engine.clearFocus(); console.log(color("green", "ok foco limpo")); return; }
  if (action === "set") {
    const stepArg = rest.find((x) => x.startsWith("--step="));
    const nextArg = rest.find((x) => x.startsWith("--next="));
    const objective = rest.slice(1).filter((x) => !x.startsWith("--")).join(" ").trim() || null;
    let step = null, total = null;
    if (stepArg) { const m = stepArg.slice(7).split("/"); step = Number(m[0]) || null; total = Number(m[1]) || null; }
    const f = engine.setFocus({ objective, step, total, next: nextArg ? nextArg.slice(7) : null });
    console.log(color("green", "ok foco: ") + (f.objective || "(sem objetivo)") + color("dim", f.step ? ` [${f.step}/${f.total || "?"}]` : ""));
    return;
  }
  const f = engine.getFocus();
  if (!f || f.cleared) { console.log(color("dim", "Nenhum foco ativo. Use: os focus set \"<objetivo>\" [--step=2/5] [--next=\"...\"]")); return; }
  console.log(color("bold", "Foco: ") + (f.objective || "(sem objetivo)") + color("dim", f.step ? ` [passo ${f.step}/${f.total || "?"}]` : ""));
  if (f.next) console.log(color("dim", "Proxima: " + f.next));
}
