// Harness — Lean AI OS · CLI/ui
// Helpers de apresentacao compartilhados pelas command modules (cor, marcas, banner).
// Sem logica de negocio: o motor vive em src/engine.mjs (ADR-0023).

import { statSync } from "node:fs";
import { join } from "node:path";
import * as engine from "../../src/engine.mjs";

export const C = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m",
};
export const color = (c, s) => (process.stdout.isTTY ? C[c] + s + C.reset : s);
export const die = (msg) => { console.error(color("red", "x " + msg)); process.exit(1); };
export const mark = (ok) => (ok ? color("green", "ok") : color("red", "x"));
export function existsDir(p) { try { return statSync(p).isDirectory(); } catch { return false; } }

export function pkgVersion() {
  try { return JSON.parse(engine.readIfExists(join(engine.ROOT, "package.json"))).version || "?"; }
  catch { return "?"; }
}

export function banner() {
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
