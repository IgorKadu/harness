// Harness — Lean AI OS · CORE/util
// Utilitarios puros base: leitura segura, estimativa de tokens, normalizacao,
// carregamento do indice de recuperacao. Sem dependencias de outros modulos.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, INDEX_PATH } from "./paths.mjs";

export const estimateTokens = (str) => Math.round((str?.length ?? 0) / 4);

export function readIfExists(absPath) {
  try { return readFileSync(absPath, "utf8"); } catch { return null; }
}

export function loadIndex() {
  const raw = readIfExists(INDEX_PATH);
  if (raw == null) throw new Error(`retrieval-index.json nao encontrado em ${INDEX_PATH}`);
  try { return JSON.parse(raw); } catch (e) { throw new Error(`retrieval-index.json invalido: ${e.message}`); }
}

// lower + sem acento, para casamento de trigger
export function norm(s) {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function fileTokens(relPath) {
  const content = readIfExists(join(ROOT, relPath));
  if (content == null) return { rel: relPath, exists: false, tokens: 0 };
  return { rel: relPath, exists: true, tokens: estimateTokens(content) };
}
