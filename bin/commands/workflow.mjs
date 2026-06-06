// Harness — Lean AI OS · CLI/commands/workflow
// Renderers das tarefas, orquestracao e turbina (route/work/next/handoff/session/
// pipeline/analyze/inspect/...). Sem logica: tudo vem de src/engine.mjs.

import * as engine from "../../src/engine.mjs";
import { color, die, mark } from "../lib/ui.mjs";

export function cmdRoute(intent) {
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

export function cmdWork(intent) {
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

export function cmdOrchestrate(rest) {
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

export function cmdDecompose(intent) {
  if (!intent) die('uso: os decompose "<intencao>"');
  const d = engine.decompose(intent);
  if (!d.needed) { console.log(color("green", `ok cabe no orcamento (${d.reason}) — nao precisa decompor.`)); return; }
  console.log(color("bold", `\nDecomposicao (${d.reason}):`));
  d.subtasks.forEach((s) => console.log(`  - ${s.intent}  ${color("dim", "(" + s.basis + ")")}`));
}

export function cmdGaps(rest) {
  const json = rest.includes("--json");
  const intent = rest.filter((x) => !x.startsWith("--")).join(" ").trim();
  if (!intent) die('uso: os gaps "<intencao>" [--json]');
  const g = engine.gaps(intent);
  if (json) { console.log(JSON.stringify(g, null, 2)); return; }
  console.log(color("bold", "\nO que falta (" + g.count + "):"));
  if (g.count === 0) console.log(color("dim", "  nada obvio — bom sinal."));
  g.items.forEach((i) => console.log("  - " + color("yellow", i.kind) + ": " + i.path + color("dim", " (" + i.detail + ")")));
}

export function cmdHandoff(rest) {
  const json = rest.includes("--json");
  const intent = rest.filter((x) => !x.startsWith("--")).join(" ").trim();
  if (!intent) die('uso: os handoff "<intencao>" [--json]');
  const r = engine.handoffToFile(intent, {});
  if (json) { console.log(JSON.stringify(r.handoff, null, 2)); return; }
  console.log(engine.renderHandoff(r.handoff));
  console.log(color("green", "\nok salvo em " + r.path));
}

export function cmdSmash() {
  const h = engine.readHandoff();
  if (!h.exists) { console.log(color("yellow", "Nenhum handoff pendente. Rode 'next'/'session' ou 'handoff \"<intencao>\"' primeiro.")); return; }
  console.log(h.text);
}

export function cmdReport(rest) {
  const text = rest.join(" ").trim();
  if (!text) die('uso: os report "<o que foi feito>"');
  const r = engine.submitReport(text);
  console.log(color("green", "ok relatorio salvo em " + r.path));
}

export function cmdSession(rest) {
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

export function cmdSubtasks(rest) {
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

export function cmdRoutes() {
  const r = engine.suggestRoutes();
  console.log(color("bold", "\nRotas sugeridas (a partir do historico, " + r.suggestions.length + "):"));
  if (!r.suggestions.length) console.log(color("dim", "  nada recorrente ainda."));
  r.suggestions.forEach((s) => console.log("  - " + color("cyan", s.term) + color("dim", " (x" + s.count + ") " + s.hint)));
}

export function cmdMetrics(rest) {
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

export function cmdTemplate(rest) {
  const kind = (rest[0] || "").toLowerCase();
  const t = engine.template(kind);
  if (t.error) { console.log(color("yellow", "tipos: " + t.kinds.join(" | "))); return; }
  console.log(color("bold", "\nTemplate '" + t.kind + "' — " + t.objetivo));
  console.log(color("bold", "  Primeiros passos:")); t.primeiros.forEach((p) => console.log("   - " + p));
  console.log(color("bold", "  Nao fazer agora:")); t.nao_fazer.forEach((p) => console.log("   - " + p));
  console.log(color("dim", "  triggers sugeridos p/ rotas: " + t.rotas.join(", ")));
}

export function cmdPipeline(rest) {
  const json = rest.includes("--json");
  const intent = rest.filter((x) => !x.startsWith("--")).join(" ").trim();
  const r = engine.pipeline(intent);
  if (json) { console.log(JSON.stringify(r, null, 2)); return; }
  console.log(color("bold", "\n=== Pipeline (turbina) — \"" + r.intent + "\" ==="));
  const p = r.profile;
  console.log("  Stack: " + (p.stack.join(", ") || "(n/d)") + " | arquivos de codigo: " + p.counts.codeFiles + " (" + p.counts.codeLines + " linhas)");
  console.log("  Entrypoints: " + (p.entrypoints.join(", ") || "(n/d)"));
  console.log("  Docs: " + p.docs.length + " | Testes: " + (p.tests.has ? p.tests.count : "nenhum") + " | Configs: " + p.configs.length + " | Smells: " + p.smells.length);
  console.log("  Classificacao: " + color("yellow", r.classification) + " | Falta: " + r.gaps.length + " item(ns)");
  console.log(color("green", "\n  ok handoff salvo em " + r.handoffPath));
}

export function cmdAnalyze() {
  const a = engine.analyzeProject();
  console.log(color("bold", "\n=== Analyze (perfil do projeto) ==="));
  console.log("  Pacote: " + (a.package || "(n/d)") + " | Stack: " + (a.stack.join(", ") || "(n/d)"));
  console.log("  Entries: " + a.counts.entries + " | dirs: " + a.counts.dirs + " | codigo: " + a.counts.codeFiles + " arq / " + a.counts.codeLines + " linhas");
  console.log("  Entrypoints: " + (a.entrypoints.join(", ") || "(n/d)"));
  console.log("  Configs: " + (a.configs.slice(0,6).join(", ") || "(n/d)"));
  console.log("  Docs: " + (a.docs.slice(0,4).join(", ") || "(n/d)") + " | Testes: " + (a.tests.has ? a.tests.count : "nenhum"));
  if (Object.keys(a.scripts).length) console.log("  Scripts: " + Object.keys(a.scripts).join(", "));
  if (a.deps.length) console.log("  Deps: " + a.deps.slice(0,10).join(", "));
  if (a.smells.length) console.log("  Smells: " + a.smells.map((s)=>s.path).join(", "));
}

export function cmdInspect(rest) {
  const sub = rest.filter((x) => !x.startsWith("--")).join(" ").trim() || ".";
  const t = engine.inspectTree(sub);
  console.log(color("bold", "\n=== Inspect: " + sub + " (" + t.count + (t.truncated ? "+" : "") + ") ==="));
  t.entries.forEach((e) => console.log("  " + (e.type === "dir" ? color("cyan", e.path + "/") : e.path)));
}

export function cmdValidate(rest) {
  const json = rest.includes("--json");
  const kindArg = rest.find((x) => x.startsWith("--kind="));
  const cmdArg = rest.find((x) => x.startsWith("--cmd="));
  const kind = kindArg ? kindArg.slice(7) : (rest.find((x) => !x.startsWith("--")) || "test");
  const command = cmdArg ? cmdArg.slice(6) : null;
  const r = engine.validate({ kind, command });
  if (json) { console.log(JSON.stringify(r, null, 2)); return; }
  if (!r.ran) {
    console.log(color("yellow", "\nValidate nao rodou: " + r.reason));
    if (r.detected && r.detected.available && r.detected.available.length) {
      console.log(color("dim", "  checks disponiveis: " + r.detected.available.map((a) => a.kind + " (" + a.command + ")").join(", ")));
    }
    return;
  }
  console.log(color("bold", "\n=== Validate (" + r.kind + ") ==="));
  console.log(color("dim", "  comando: " + r.command + "  (" + r.durationMs + "ms)"));
  if (r.passed) { console.log(color("green", "  ok PASS — sem falhas")); return; }
  console.log(color("red", "  x FAIL (exit " + r.exitCode + ") — " + r.failureCount + " linha(s) de falha:"));
  r.failures.slice(0, 12).forEach((f) => console.log(color("red", "    - ") + f));
  console.log(color("dim", "  registrado no errors-log. Corrija e rode 'os validate' de novo ate passar."));
  process.exit(2);
}

export function cmdAutomations() {
  const a = engine.automations();
  console.log(color("bold", "\n=== Automacoes (turbina) ==="));
  console.log(color("bold", "  Globais:")); a.global.forEach((x) => console.log("   - " + color("cyan", x.id.padEnd(10)) + " " + x.desc));
  console.log(color("bold", "  Isoladas:")); a.isolated.forEach((x) => console.log("   - " + color("cyan", x.id.padEnd(10)) + " " + x.desc));
  console.log(color("dim", "\n  " + a.note));
}

export function cmdAssess(rest) {
  const json = rest.includes("--json");
  const intent = rest.filter((x) => !x.startsWith("--")).join(" ").trim();
  if (!intent) die('uso: os assess "<intencao>" [--json]');
  const a = engine.assess(intent);
  if (json) { console.log(JSON.stringify(a, null, 2)); return; }
  const s = a.shape;
  console.log(color("bold", `\n=== Assess: "${intent}" ===`));
  console.log(color("dim", `  escala ${s.scale} · ${s.classification} · paralelizavel: ${s.parallelizable ? "sim" : "nao"} · adversarial: ${s.adversarial ? "sim" : "nao"}`));
  console.log(color("bold", "\n  Forma: ") + (s.shape === "escalate" ? color("yellow", "ESCALAR (nao moer num contexto so)") : color("green", "passe unico")));
  s.recommendation.options.forEach((o) => console.log(color("dim", "   - " + o)));
  if (a.verify) {
    console.log(color("bold", "\n  Verificacao adversarial (antes de aceitar):"));
    a.verify.steps.forEach((st, i) => console.log(color("dim", `   ${i + 1}. ${st}`)));
  }
}

export function cmdVerify(rest) {
  const json = rest.includes("--json");
  const intent = rest.filter((x) => !x.startsWith("--")).join(" ").trim() || null;
  const v = engine.verify(intent);
  if (json) { console.log(JSON.stringify(v, null, 2)); return; }
  console.log(color("bold", "\n=== Verify (refute antes de aceitar) ==="));
  console.log(color("dim", "  " + v.when));
  v.steps.forEach((st, i) => console.log(`   ${i + 1}. ${st}`));
  console.log(color("green", "\n  " + v.principle));
}
