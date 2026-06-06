// Harness — Lean AI OS · modulo/channel (ADR-0033)
// Canal User <-> Harness <-> LLM. handoff.md: o Harness escreve diretrizes p/ a LLM ler.
// report.md: a LLM escreve o que fez; o Harness le na proxima interacao. Via tools MCP.

import { writeFileAtomic } from "../core/io.mjs";
import { HANDOFF_PATH, REPORT_PATH } from "../core/paths.mjs";
import { readIfExists } from "../core/util.mjs";
import { remember } from "./memory.mjs";
import { codeMapStale, scan } from "./codemap.mjs";
import { renderHandoff, handoff } from "./session.mjs";

// Escreve o handoff.md (markdown rico) — chamado ao fim do dialogo do orquestrador.
export function writeHandoffFile(h, session = null) {
  try { if (codeMapStale()) scan(); } catch { /* best-effort */ }
  const md = [];
  md.push("<!-- gerado pelo Harness · nao editar manualmente -->");
  md.push("<!-- stamp: " + new Date().toISOString() + " -->");
  md.push("");
  md.push(renderHandoff(h));
  const rep = readReport();
  if (rep.exists) { md.push("\n---\n## Ultimo relatorio da LLM (contexto)\n" + rep.text.split("\n").slice(0, 30).join("\n")); }
  if (session && session.log && session.log.length) {
    md.push("\n---\n## Resumo do dialogo Usuario<->Harness");
    session.log.filter((m) => m.role === "user").forEach((m, i) => md.push(`${i + 1}. ${m.text}`));
  }
  md.push("\n---\n> LLM: siga este handoff. Ao concluir, registre o que fez via a tool `os_report` (ou escrevendo .harness/.ai/report.md).");
  writeFileAtomic(HANDOFF_PATH, md.join("\n") + "\n", "utf8");
  return { path: ".harness/.ai/handoff.md", abs: HANDOFF_PATH };
}

// Gera o handoff a partir de uma intencao e ja escreve o arquivo. (CLI/MCP)
export function handoffToFile(intent, { answers = {} } = {}) {
  const h = handoff(intent, { answers });
  const w = writeHandoffFile(h);
  return { ...w, handoff: h };
}

// Le o handoff.md atual (o que a LLM deve seguir no 'smash').
export function readHandoff() {
  const text = readIfExists(HANDOFF_PATH);
  return { exists: text != null, path: ".harness/.ai/handoff.md", text: text || "" };
}

// A LLM submete o documento do que foi feito; o Harness guarda p/ ler na proxima interacao.
export function submitReport(text) {
  if (!text || !text.trim()) throw new Error("report vazio");
  const stamp = new Date().toISOString();
  writeFileAtomic(REPORT_PATH, `<!-- relatorio da LLM · stamp: ${stamp} -->\n\n` + text.trim() + "\n", "utf8");
  try { remember("tasks", "LLM report recebido (" + stamp.slice(0, 10) + ")"); } catch { /* */ }
  return { path: ".harness/.ai/report.md", stamp };
}

// Le o ultimo relatorio da LLM (resumo curto para o brief/orquestrador).
export function readReport() {
  const text = readIfExists(REPORT_PATH);
  if (text == null) return { exists: false, summary: null };
  const body = text.replace(/<!--[^>]*-->/g, "").trim();
  return { exists: true, path: ".harness/.ai/report.md", summary: body.split("\n").filter(Boolean).slice(0, 3).join(" ").slice(0, 240) };
}
