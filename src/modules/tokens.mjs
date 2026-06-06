// Harness — Lean AI OS · modulo/tokens
// CORE (CONSTITUTION + state-of-world): medicao contra teto, leitura, doctor
// (integridade do indice/CORE/fase) e sync (reescreve memoria quente + re-scan).

import { existsSync } from "node:fs";
import { writeFileAtomic } from "../core/io.mjs";
import { join } from "node:path";
import { AI, ROOT } from "../core/paths.mjs";
import { readIfExists, loadIndex, fileTokens } from "../core/util.mjs";
import { getState, PHASES } from "./navigation.mjs";
import { savesStatus, SAVE_STAGES } from "./saves.mjs";
import { LOGS } from "./memory.mjs";
import { codeMapStale, scan } from "./codemap.mjs";

export function measureCore() {
  const idx = loadIndex();
  const coreCap = idx.budget?.core_token_cap ?? 600;
  const sowCap = idx.budget?.state_of_world_token_cap ?? 1200;
  const constitution = fileTokens(".ai/CONSTITUTION.md");
  const sow = fileTokens(".ai/memory/state-of-world.md");
  return {
    constitution: { ...constitution, cap: coreCap, ok: constitution.tokens <= coreCap },
    stateOfWorld: { ...sow, cap: sowCap, ok: sow.tokens <= sowCap },
    total: constitution.tokens + sow.tokens,
    ok: constitution.tokens <= coreCap && sow.tokens <= sowCap,
  };
}

// Le o CORE inteiro (CONSTITUTION + state-of-world) numa chamada so.
export function readCore() {
  return {
    constitution: readIfExists(join(AI, "CONSTITUTION.md")) ?? "",
    stateOfWorld: readIfExists(join(AI, "memory", "state-of-world.md")) ?? "",
  };
}

export function doctor() {
  const idx = loadIndex();
  const checks = [];
  const add = (ok, msg) => checks.push({ ok, msg });

  ["/CONSTITUTION.md", "/memory/state-of-world.md"].forEach((p) =>
    add(existsSync(join(AI, p)), `CORE presente: .ai${p}`));

  const allPaths = new Set([...(idx.always || [])]);
  idx.routes.forEach((r) => r.load.forEach((p) => allPaths.add(p)));
  let missing = 0;
  for (const p of allPaths) if (!existsSync(join(ROOT, p))) { add(false, `indice aponta p/ arquivo inexistente: ${p}`); missing++; }
  if (missing === 0) add(true, `indice integro: ${allPaths.size} arquivos referenciados existem`);

  const maxFiles = idx.budget?.max_files_per_route ?? 5;
  let over = 0;
  idx.routes.forEach((r) => { if (r.load.length > maxFiles) { add(false, `rota '${r.id}' excede max_files_per_route`); over++; } });
  if (over === 0) add(true, `todas as rotas respeitam max_files_per_route (${maxFiles})`);

  const core = measureCore();
  add(core.constitution.ok, `CONSTITUTION ~${core.constitution.tokens} tk ${core.constitution.ok ? "<=" : ">"} ${core.constitution.cap}`);
  add(core.stateOfWorld.ok, `state-of-world ~${core.stateOfWorld.tokens} tk ${core.stateOfWorld.ok ? "<=" : ">"} ${core.stateOfWorld.cap}`);

  const hotLogs = [...(idx.always || [])].filter((p) => p.includes("/memory/logs/"));
  add(hotLogs.length === 0, hotLogs.length === 0 ? `logs append-only fora do caminho quente` : `logs no 'always': ${hotLogs.join(", ")}`);

  // ADR-0024: integridade do estado de fase
  const st = getState();
  add(PHASES.includes(st.phase), `fase valida: ${st.phase}`);

  // ADR-0037/0039: Saves integrity — existing layers must carry a valid lifecycle stage.
  const sv = savesStatus();
  const badSaves = sv.layers.filter((l) => l.exists && !SAVE_STAGES.includes(l.stage));
  badSaves.forEach((l) => add(false, `save L${l.layer} (${l.file}) com stage invalido: '${l.stage}'`));
  const existingSaves = sv.layers.filter((l) => l.exists).length;
  if (existingSaves > 0 && badSaves.length === 0) add(true, `saves integros: ${existingSaves} camada(s) com stage valido`);

  // ADR-0039: append-only memory logs present.
  const missingLogs = Object.entries(LOGS).filter(([, abs]) => !existsSync(abs)).map(([n]) => n);
  if (missingLogs.length) add(false, `log(s) de memoria ausente(s): ${missingLogs.join(", ")}`);
  else add(true, `logs de memoria presentes (${Object.keys(LOGS).join(", ")})`);

  const problems = checks.filter((c) => !c.ok).length;
  return { checks, problems, ok: problems === 0 };
}

// Reescreve (nao append) o timestamp do state-of-world e mede o CORE.
export function sync() {
  const sowPath = join(AI, "memory", "state-of-world.md");
  const content = readIfExists(sowPath);
  if (content == null) throw new Error("state-of-world.md nao encontrado");
  const stamp = new Date().toISOString();
  let next = content.replace(/<!-- last-sync:[^>]*-->\n?/g, "");
  next = next.replace(/^(# State of the World — Harness\n)/, `$1<!-- last-sync: ${stamp} -->\n`);
  writeFileAtomic(sowPath, next, "utf8");
  let rescanned = false;
  try { if (codeMapStale()) { scan(); rescanned = true; } } catch { /* scan best-effort */ }
  return { stamp, rescanned, core: measureCore() };
}
