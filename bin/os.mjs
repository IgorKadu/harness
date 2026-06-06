#!/usr/bin/env node
// Harness — Lean AI OS · CLI (uma das "bocas" do motor — ADR-0023)
// Apenas DISPATCH: mapeia comandos -> renderers. Sem logica de negocio.
// Publico (usuario): install · setup · reset · update · reforce · help.
// Demais comandos sao INTERNOS (uso da LLM via MCP ou fallback CLI) — ocultos no help.

import { banner } from "./lib/ui.mjs";
import * as w from "./commands/workflow.mjs";
import * as s from "./commands/system.mjs";
import * as life from "./commands/lifecycle.mjs";

const die = (msg) => { console.error("\x1b[31mx " + msg + "\x1b[0m"); process.exit(1); };

const [cmd, ...rest] = process.argv.slice(2);
const arg = rest.join(" ").trim();
try {
  switch (cmd) {
    // ---- PUBLICO (usuario) ----
    case "install": life.cmdInstall(rest); break;
    case "reset": life.cmdReset(rest); break;
    case "update": life.cmdUpdate(); break;
    case "reforce": life.cmdReforce(rest); break;
    case "setup": s.cmdSetup(); break;
    case "help": s.cmdHelp(); break;
    case undefined: banner(); s.cmdHelp(); break;

    // ---- INTERNO (LLM): turbina / automacoes ----
    case "pipeline": w.cmdPipeline(rest); break;
    case "analyze": w.cmdAnalyze(); break;
    case "inspect": w.cmdInspect(rest); break;
    case "automations": w.cmdAutomations(); break;
    // INTERNO: orquestracao
    case "next": case "orchestrate": w.cmdOrchestrate(rest); break;
    case "handoff": w.cmdHandoff(rest); break;
    case "smash": w.cmdSmash(); break;
    case "report": w.cmdReport(rest); break;
    case "gaps": w.cmdGaps(rest); break;
    case "validate": w.cmdValidate(rest); break;
    case "assess": w.cmdAssess(rest); break;
    case "verify": w.cmdVerify(rest); break;
    case "subtasks": w.cmdSubtasks(rest); break;
    case "routes": w.cmdRoutes(); break;
    case "metrics": w.cmdMetrics(rest); break;
    case "template": w.cmdTemplate(rest); break;
    case "session": w.cmdSession(rest); break;
    case "decompose": w.cmdDecompose(arg); break;
    case "work": w.cmdWork(arg); break;
    case "route": w.cmdRoute(arg); break;
    // INTERNO: comunicacao / varredura / memoria / saves / manutencao
    case "tokens": s.cmdTokens(); break;
    case "doctor": s.cmdDoctor(); break;
    case "sync": s.cmdSync(); break;
    case "recall": s.cmdRecall(arg); break;
    case "remember": s.cmdRemember(rest); break;
    case "read-core": s.cmdReadCore(); break;
    case "start": s.cmdStart(rest); break;
    case "focus": s.cmdFocus(rest); break;
    case "save": case "saves": s.cmdSave(rest); break;
    case "brief": s.cmdBrief(); break;
    case "caps": case "capabilities": s.cmdCaps(); break;
    case "phase": s.cmdPhase(arg); break;
    case "init": s.cmdInit(arg); break;
    case "scan": s.cmdScan(); break;
    case "find": s.cmdFind(arg); break;
    // INTERNO: servidores / scaffolder
    case "mcp": import("../server/mcp.mjs").then((m) => m.start()); break;
    case "serve": import("../server/web.mjs").then((m) => m.start(Number(rest[0]) || 4173)); break;
    case "upgrade": import("./scaffold.mjs").then((m) => { try { const a = rest.filter((x)=>!x.startsWith("--")); const r = m.upgrade(a[0] || "."); console.log("\x1b[32mok " + r.mode + " -> " + r.target + "\x1b[0m"); if (r.backup) console.log("\x1b[2m   backup: " + r.backup + "\x1b[0m"); r.next.forEach((n)=>console.log("   " + n)); } catch (e) { die(e.message); } }); break;
    default: die(`comando desconhecido: ${cmd}. Rode 'os help'.`);
  }
} catch (e) {
  die(e.message);
}
