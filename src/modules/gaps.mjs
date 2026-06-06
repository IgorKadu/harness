// Harness — Lean AI OS · modulo/gaps (ADR-0028)
// "O que falta" concreto: cruza code-map (smells), rotas casadas e ausencia de
// testes p/ apontar lacunas objetivas. Deterministico, zero-dep.

import { norm } from "../core/util.mjs";
import { loadCodeMap, searchCode } from "./codemap.mjs";
import { computeWorkingSet } from "./routing.mjs";

export function gaps(intent) {
  const out = [];
  const map = loadCodeMap();
  const code = searchCode(intent, { max: 8 });
  const hits = code.scanned ? code.hits : [];

  // 1) Arquivos grandes (smell) entre os alvos -> sugerir quebrar.
  if (map && map.smells) {
    const hitPaths = new Set(hits.map((h) => h.path));
    for (const sm of map.smells) {
      if (sm.kind === "large_file" && (hitPaths.has(sm.path) || hits.length === 0)) {
        out.push({ kind: "arquivo_grande", path: sm.path, detail: `${sm.lines}L — considere dividir` });
      }
    }
  }

  // 2) Alvos de codigo sem teste aparente.
  if (map) {
    const allPaths = (map.files || []).map((f) => f.path);
    const hasTest = (p) => {
      const base = p.replace(/\.[^.]+$/, "");
      return allPaths.some((q) => q !== p && /test|spec|__tests__/.test(norm(q)) && norm(q).includes(norm(base.split("/").pop())));
    };
    for (const h of hits.slice(0, 5)) {
      if (!/test|spec/.test(norm(h.path)) && !hasTest(h.path)) out.push({ kind: "sem_teste", path: h.path, detail: "sem teste correspondente" });
    }
  }

  // 3) Rota casou mas arquivo de conhecimento/contexto nao existe.
  const ws = computeWorkingSet(intent);
  ws.files.filter((f) => !f.exists).forEach((f) => out.push({ kind: "arquivo_ausente", path: f.rel, detail: "referenciado pelo indice, nao existe" }));

  // 4) Sem code-map -> falta varrer.
  if (!map) out.push({ kind: "sem_scan", path: "-", detail: "rode os_scan para mapear o codigo" });

  return { intent, count: out.length, items: out.slice(0, 12) };
}
