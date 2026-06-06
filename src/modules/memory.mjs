// Harness — Lean AI OS · modulo/memory
// Logs append-only (tasks/decisions/errors): recall faz grep sem carregar inteiro;
// remember acrescenta sem nunca sobrescrever historico (Constituicao).
// Todos os caminhos derivam de AI (estado mutavel num so lugar — honra HARNESS_AI_DIR).

import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { AI } from "../core/paths.mjs";
import { readIfExists, norm } from "../core/util.mjs";

const LOG_FILES = { tasks: "tasks-log.md", decisions: "decisions-log.md", errors: "errors-log.md" };

// name -> absolute path under AI/memory/logs
export const LOGS = Object.fromEntries(
  Object.entries(LOG_FILES).map(([name, file]) => [name, join(AI, "memory", "logs", file)]),
);
const relOf = (name) => ".ai/memory/logs/" + LOG_FILES[name];

// Busca por termo nos logs SEM carregar os arquivos inteiros no contexto.
export function recall(query, { log = null, max = 20 } = {}) {
  if (!query) throw new Error("recall exige um termo de busca");
  const q = norm(query);
  const targets = log ? [[log, LOGS[log]]] : Object.entries(LOGS);
  const hits = [];
  for (const [name, abs] of targets) {
    if (!abs) continue;
    const content = readIfExists(abs);
    if (content == null) continue;
    content.split("\n").forEach((line, i) => {
      if (norm(line).includes(q)) hits.push({ log: name, line: i + 1, text: line.trim() });
    });
  }
  return { query, count: hits.length, hits: hits.slice(0, max) };
}

// Acrescenta uma entrada a um log append-only (nunca sobrescreve historico).
export function remember(log, entry) {
  const abs = LOGS[log];
  if (!abs) throw new Error(`log invalido: '${log}'. Use: ${Object.keys(LOGS).join(", ")}`);
  if (!entry || !entry.trim()) throw new Error("entry vazio");
  const stamp = new Date().toISOString().slice(0, 10);
  const line = `\n${stamp} | ${entry.trim()}`;
  appendFileSync(abs, line, "utf8");
  return { log, rel: relOf(log), appended: line.trim() };
}

export const LOG_NAMES = Object.keys(LOGS);
