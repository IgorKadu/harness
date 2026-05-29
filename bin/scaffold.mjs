#!/usr/bin/env node
// Harness — Lean AI OS · scaffolder/upgrader (instala ou ATUALIZA o Harness num projeto-alvo)
// - Sem memoria no alvo  -> instalacao PADRAO (memoria zerada).
// - Com memoria no alvo  -> UPGRADE: atualiza motor/bocas/CORE, PRESERVA .ai/memory + fase,
//   e cria backup em .ai/backup-<timestamp>/ antes de tocar em qualquer coisa.
// Uso: node bin/scaffold.mjs <dir-alvo> [--force]   |   node bin/os.mjs upgrade <dir-alvo>

import { cpSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function scaffold(targetDir, { force = false } = {}) {
  if (!targetDir) throw new Error("uso: scaffold <dir-alvo> [--force]");
  const dst = resolve(targetDir);
  const aiDst = join(dst, ".ai");

  // Detecta memoria existente ANTES de qualquer escrita.
  const memDir = join(aiDst, "memory");
  const projJson = join(aiDst, "project.json");
  const hasMemory = existsSync(join(memDir, "state-of-world.md")) || existsSync(projJson);

  // Sem --force: so instala em alvo limpo (nunca sobrescreve sem permissao).
  if (existsSync(aiDst) && !force) {
    throw new Error(`.ai ja existe em ${dst}. Para ATUALIZAR preservando a memoria use 'os upgrade ${targetDir}' (ou scaffold --force).`);
  }

  const isUpgrade = hasMemory && force;
  mkdirSync(dst, { recursive: true });

  // Backup de seguranca da memoria + fase (so no upgrade).
  let backup = null;
  if (isUpgrade) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    backup = join(aiDst, "backup-" + stamp);
    mkdirSync(backup, { recursive: true });
    if (existsSync(memDir)) cpSync(memDir, join(backup, "memory"), { recursive: true });
    if (existsSync(projJson)) cpSync(projJson, join(backup, "project.json"));
    if (existsSync(join(aiDst, "retrieval-index.json"))) cpSync(join(aiDst, "retrieval-index.json"), join(backup, "retrieval-index.json"));
    if (existsSync(join(aiDst, "specs"))) cpSync(join(aiDst, "specs"), join(backup, "specs"), { recursive: true });
  }

  const copy = (rel) => { const s = join(SRC, rel); if (existsSync(s)) cpSync(s, join(dst, rel), { recursive: true }); };

  // 1. Motor + bocas (engine, CLI, servidor MCP, web) — sempre atualizados.
  copy("src"); copy("bin/os.mjs"); copy("bin/scaffold.mjs"); copy("server");

  // 2. CORE + conhecimento + onboarding (atualizados; backup guarda a versao anterior).
  copy(".ai/CONSTITUTION.md");
  copy(".ai/retrieval-index.json");
  copy(".ai/retrieval-index.schema.json");
  copy(".ai/knowledge");
  copy(".ai/bootstrap");
  mkdirSync(join(aiDst, "specs", "ADR"), { recursive: true });
  copy(".ai/specs/ADR/_TEMPLATE.md");

  // 3. Configs por IDE + extensao.
  copy(".claude"); copy(".gemini"); copy(".vscode"); copy(".agents"); copy("extension");

  // 4. Entry docs + meta.
  copy("CLAUDE.md"); copy("AGENTS.md"); copy("CONNECT.md"); copy(".gitignore");

  // 5. Memoria: PRESERVA a existente no upgrade; semeia o que faltar; zera na instalacao padrao.
  mkdirSync(join(aiDst, "memory", "logs"), { recursive: true });
  const proj = (targetDir.split(/[\\/]/).filter(Boolean).pop()) || "projeto";
  const preserve = isUpgrade;
  const writeIf = (path, content) => { if (!preserve || !existsSync(path)) writeFileSync(path, content, "utf8"); };

  writeIf(join(aiDst, "memory", "state-of-world.md"),
`# State of the World — Harness

> Memoria quente. Reescrita a cada /sync (nao append-only). Alvo: <= 1200 tokens.

## Identidade
- **Projeto:** ${proj} (recem-inicializado com Harness).
- **Origem:** projeto novo/existente — rode 'os init' para alinhar.

## Onde paramos
- **Foco ativo:** onboarding. Rode 'os init' e depois 'os scan'.
- **Proximo passo:** conduzir as perguntas de init com o usuario; avancar fase com 'os phase execution'.

## Decisoes vigentes
- (nenhuma ainda — registre com ADR + 'os remember decisions')
`);
  writeIf(join(aiDst, "memory", "decisions-index.md"),
`# Decisions Index

> Uma linha por decisao. O corpo vive em .ai/specs/ADR/ADR-NNNN-*.md.

| ID | Titulo | Status |
|---|---|---|
`);
  for (const [f, h] of [["tasks-log.md", "# Tasks Log (append-only)\n"], ["decisions-log.md", "# Decisions Log (append-only)\n"], ["errors-log.md", "# Errors & Solutions Log (append-only)\n"]])
    writeIf(join(aiDst, "memory", "logs", f), h);
  writeIf(projJson,
    JSON.stringify({ phase: "discovery", phase_set_at: new Date().toISOString(), created: new Date().toISOString() }, null, 2) + "\n");

  // 6. package.json minimo (so se nao existir; nunca sobrescreve o do usuario).
  const pkgPath = join(dst, "package.json");
  if (!existsSync(pkgPath)) {
    writeFileSync(pkgPath, JSON.stringify({
      name: proj.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      version: "0.1.0", private: true, type: "module",
      bin: { os: "bin/os.mjs" },
      scripts: { os: "node bin/os.mjs", doctor: "node bin/os.mjs doctor", mcp: "node bin/os.mjs mcp" },
      engines: { node: ">=18" },
    }, null, 2) + "\n", "utf8");
  }

  const mode = isUpgrade ? "upgrade" : "fresh";
  const next = isUpgrade
    ? ["cd " + dst, "node bin/os.mjs doctor", "memoria preservada; backup em .ai/backup-*"]
    : ["cd " + dst, "node bin/os.mjs doctor", "node bin/os.mjs init", "node bin/os.mjs scan"];
  return { target: dst, mode, backup, next };
}

// Atalho de upgrade: forca a atualizacao preservando a memoria automaticamente.
export function upgrade(targetDir) { return scaffold(targetDir, { force: true }); }

// CLI direto
if (process.argv[1] && process.argv[1].endsWith("scaffold.mjs")) {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const dir = args.find((a) => !a.startsWith("--"));
  try { const r = scaffold(dir, { force }); console.log(`ok ${r.mode} -> ${r.target}`); if (r.backup) console.log("   backup:", r.backup); r.next.forEach((n) => console.log("   " + n)); }
  catch (e) { console.error("x " + e.message); process.exit(1); }
}
