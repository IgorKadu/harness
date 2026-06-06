// Harness — Lean AI OS · modulo/routing
// Roteamento retrieval-first: dada uma intencao, o indice aponta <=5 arquivos.
// computeWorkingSet soma tokens, aplica orcamento e anexa postura + candidatos de codigo.

import { loadIndex, norm, fileTokens } from "../core/util.mjs";
import { posture } from "./navigation.mjs";
import { searchCode } from "./codemap.mjs";

export function route(intent) {
  const idx = loadIndex();
  const q = norm(intent);
  const matched = [];
  for (const r of idx.routes) {
    const hit = r.triggers.find((t) => q.includes(norm(t)));
    if (hit) matched.push({ id: r.id, trigger: hit, load: r.load });
  }
  const files = [];
  const seen = new Set();
  const push = (p) => { if (!seen.has(p)) { seen.add(p); files.push(p); } };
  (idx.always || []).forEach(push);
  matched.forEach((m) => m.load.forEach(push));
  return { idx, matched, files };
}

// Working-set completo: arquivos + tokens + veredito de orcamento + postura.
export function computeWorkingSet(intent) {
  const { idx, matched, files } = route(intent);
  const cap = idx.budget?.working_set_token_cap ?? 15000;
  const items = files.map(fileTokens);
  const total = items.reduce((a, b) => a + b.tokens, 0);
  return {
    intent,
    matched,
    files: items,
    total,
    cap,
    within: total <= cap,
    fallback: matched.length === 0,
    posture: posture(),
    codeCandidates: searchCode(intent).hits,
  };
}
