// Harness — Lean AI OS · CLI/commands/lifecycle
// User-facing lifecycle commands: install (interactive), reset, update, reforce.
// These are the few commands a human runs; everything else is internal (LLM via MCP/fallback).

import { createInterface } from "node:readline";
import * as engine from "../../src/engine.mjs";
import { color, die } from "../lib/ui.mjs";

function confirm(question) {
  if (!process.stdin.isTTY) return Promise.resolve(false);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(/^s|y/i.test((a || "").trim())); }));
}

// install — interactive numbered menu (or explicit target list to skip the menu).
export function cmdInstall(rest) {
  const targets = rest.filter((x) => !x.startsWith("-"));
  const preselected = (targets.length && targets[0] !== "all") ? targets : (targets[0] === "all" ? null : null);
  import("../installer.mjs").then((m) => m.runInstaller(process.cwd(), preselected)).catch((e) => die(e.message));
}

// reset — wipe THIS install clean (memory/saves/runtime), keep engine/knowledge/config.
export async function cmdReset(rest) {
  const yes = rest.includes("--yes") || rest.includes("-y");
  if (!yes) {
    const ok = await confirm(color("yellow", "Isso vai ZERAR memoria, Saves e runtime deste Harness (mantem motor/knowledge/configs). Continuar? (s/N) "));
    if (!ok) { console.log(color("dim", "cancelado.")); return; }
  }
  const r = engine.reset({ confirm: true });
  if (!r.ok) return die(r.reason);
  console.log(color("green", `\nok Harness zerado (projeto '${r.project}', v${r.version}) — ${r.clearedCount} item(ns) limpos:`));
  r.cleared.forEach((c) => console.log(color("dim", "  - " + c)));
  console.log(color("dim", "  preservado: " + r.preserved.join(", ")));
  console.log(color("dim", "  Inicializacao limpa pronta — sem dados de outros projetos."));
}

// update — fetch a newer Harness and re-vendor, preserving memory + saves.
export function cmdUpdate() {
  import("../scaffold.mjs").then((m) => {
    let r;
    try { r = m.update(process.cwd()); } catch (e) { return die(e.message); }
    if (r.mode === "fresh") { console.log(color("green", `ok Harness instalado (v${r.to}) em ${r.target}`)); }
    else if (r.changed) console.log(color("green", `ok atualizado: v${r.from || "?"} -> v${r.to} (memoria e Saves preservados)`));
    else console.log(color("dim", `Harness ja na versao v${r.to} (nada a atualizar). Memoria e Saves intactos.`));
    (r.next || []).forEach((n) => console.log(color("dim", "  " + n)));
    console.log(color("dim", "  dica: para puxar a versao publicada, rode 'npx @igorkadu/harness@latest update' na raiz."));
  }).catch((e) => die(e.message));
}

// reforce — print the deterministic directive the LLM follows to recompile memory/saves/docs.
export function cmdReforce(rest) {
  const json = rest.includes("--json");
  const r = engine.reforce();
  if (json) { console.log(JSON.stringify(r, null, 2)); return; }
  console.log(color("bold", "\n=== Reforce — recompilar memoria/Saves/docs (diretiva p/ a LLM) ==="));
  console.log(color("dim", "  " + r.objective));
  console.log(color("bold", "\n  Ler primeiro:")); r.read_first.forEach((x) => console.log("   - " + x));
  console.log(color("bold", "\n  Reescrever:")); r.rewrite.forEach((x) => console.log("   - " + color("cyan", x.target) + color("dim", " — " + x.how)));
  console.log(color("bold", "\n  Principios:")); r.principles.forEach((x) => console.log("   - " + x));
  console.log(color("green", "\n  Fecho: ") + r.closeout);
}
