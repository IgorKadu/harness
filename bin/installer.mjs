// Harness — Lean AI OS · interactive installer (ADR-0038)
// Zero-dep numbered menu: the user picks the dev environment(s); the package then adapts the
// folder/files/instructions and installs a CLEAN Harness (memory/saves zeroed) into .harness/.

import { createInterface } from "node:readline";
import { banner, color } from "./lib/ui.mjs";
import * as scaffold from "./scaffold.mjs";

const ENVS = [
  { key: "claude", label: "Claude Code" },
  { key: "antigravity", label: "Antigravity (Gemini)" },
  { key: "cursor", label: "Cursor" },
  { key: "windsurf", label: "Windsurf" },
  { key: "vscode", label: "VS Code" },
];

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a); }));
}

// Map a raw answer ("1,3" | "6" | "all" | "claude") to a list of target keys.
function parseChoice(raw) {
  const t = (raw || "").trim().toLowerCase();
  if (!t || t === "6" || t === "all" || t === "todos") return ENVS.map((e) => e.key);
  const picks = new Set();
  for (const tok of t.split(/[\s,]+/).filter(Boolean)) {
    const n = Number(tok);
    if (Number.isInteger(n) && n >= 1 && n <= ENVS.length) picks.add(ENVS[n - 1].key);
    else { const e = ENVS.find((x) => x.key === tok || x.label.toLowerCase().includes(tok)); if (e) picks.add(e.key); }
  }
  return [...picks];
}

function summary(cwd, targets) {
  let r;
  try { r = scaffold.install(cwd, targets); } catch (e) { console.error(color("red", "x " + e.message)); process.exit(1); }
  console.log("");
  if (r.harnessCreated) console.log(`   ${color("green", "ok")} Harness instalado em ${color("cyan", ".harness/")}  ${color("dim", "(motor + MCP + memoria ZERADA + saves ausentes)")}`);
  else console.log(color("dim", "   .harness/ ja existe — configs atualizadas (memoria/saves preservados)"));
  console.log(color("bold", "\n   Ambientes configurados:"));
  r.written.forEach((w) => console.log(`   ${color("green", "ok")} ${w.target.padEnd(12)} -> ${w.file}`));
  console.log(color("dim", "\n   Inicializacao limpa: sem dados de outros projetos."));
  console.log(color("dim", "   Comandos do usuario: /reset · /update · /reforce  (os demais sao internos da LLM)"));
  console.log(color("dim", "   Proximo: reinicie a IDE e converse normalmente com a LLM — ela ja sabe o que fazer.\n"));
  return r;
}

// Interactive entry. If targets are given explicitly (non-empty), skip the menu.
export async function runInstaller(cwd, preselected = null) {
  banner();
  if (preselected && preselected.length) return summary(cwd, preselected);
  if (!process.stdin.isTTY) { console.log(color("dim", "   (terminal nao interativo — instalando para todos os ambientes)\n")); return summary(cwd, ENVS.map((e) => e.key)); }

  console.log(color("bold", "   Escolha o ambiente de desenvolvimento:"));
  ENVS.forEach((e, i) => console.log(`     ${color("cyan", String(i + 1))}. ${e.label}`));
  console.log(`     ${color("cyan", String(ENVS.length + 1))}. Todos`);
  console.log(color("dim", "   (digite o numero; pode escolher varios separados por virgula, ex: 1,3)"));

  const raw = await ask(color("bold", "\n   > "));
  const targets = parseChoice(raw);
  if (!targets.length) { console.log(color("yellow", "   nenhuma opcao valida — instalando para todos.")); return summary(cwd, ENVS.map((e) => e.key)); }
  return summary(cwd, targets);
}
