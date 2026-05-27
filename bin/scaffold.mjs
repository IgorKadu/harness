#!/usr/bin/env node
// Harness — Lean AI OS · scaffolder (instala o Harness num projeto-alvo)
// Copia o motor + scaffolding .ai (memoria FRESCA) + configs por IDE. Zero-dep.
// Uso: node bin/scaffold.mjs <dir-alvo> [--force]

import { cpSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function scaffold(targetDir, { force = false } = {}) {
  if (!targetDir) throw new Error("uso: scaffold <dir-alvo> [--force]");
  const dst = resolve(targetDir);
  const aiDst = join(dst, ".ai");
  if (existsSync(aiDst) && !force) throw new Error(`.ai ja existe em ${dst} (use --force para sobrescrever)`);
  mkdirSync(dst, { recursive: true });

  const copy = (rel) => { const s = join(SRC, rel); if (existsSync(s)) cpSync(s, join(dst, rel), { recursive: true }); };

  // 1. Motor + bocas (engine, CLI, servidor MCP)
  copy("src"); copy("bin/os.mjs"); copy("bin/scaffold.mjs"); copy("server");

  // 2. CORE + conhecimento + onboarding (reaproveitaveis as-is)
  copy(".ai/CONSTITUTION.md");
  copy(".ai/retrieval-index.json");
  copy(".ai/retrieval-index.schema.json");
  copy(".ai/knowledge");
  copy(".ai/bootstrap");
  mkdirSync(join(aiDst, "specs", "ADR"), { recursive: true });
  copy(".ai/specs/ADR/_TEMPLATE.md");

  // 3. Configs por IDE
  copy(".claude"); copy(".gemini"); copy(".vscode"); copy(".agents");

  // 4. Entry docs + meta
  copy("CLAUDE.md"); copy("AGENTS.md"); copy(".gitignore");

  // 5. Memoria FRESCA (nao copiar a do Harness)
  mkdirSync(join(aiDst, "memory", "logs"), { recursive: true });
  const proj = (targetDir.split(/[\\/]/).filter(Boolean).pop()) || "projeto";
  writeFileSync(join(aiDst, "memory", "state-of-world.md"),
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
`, "utf8");
  writeFileSync(join(aiDst, "memory", "decisions-index.md"),
`# Decisions Index

> Uma linha por decisao. O corpo vive em .ai/specs/ADR/ADR-NNNN-*.md.

| ID | Titulo | Status |
|---|---|---|
`, "utf8");
  for (const [f, h] of [["tasks-log.md","# Tasks Log (append-only)\n"],["decisions-log.md","# Decisions Log (append-only)\n"],["errors-log.md","# Errors & Solutions Log (append-only)\n"]])
    writeFileSync(join(aiDst, "memory", "logs", f), h, "utf8");
  writeFileSync(join(aiDst, "project.json"),
    JSON.stringify({ phase: "discovery", phase_set_at: new Date().toISOString(), created: new Date().toISOString() }, null, 2) + "\n", "utf8");

  // 6. package.json minimo (se nao existir)
  const pkgPath = join(dst, "package.json");
  if (!existsSync(pkgPath) || force) {
    writeFileSync(pkgPath, JSON.stringify({
      name: proj.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      version: "0.1.0", private: true, type: "module",
      bin: { os: "bin/os.mjs" },
      scripts: { os: "node bin/os.mjs", doctor: "node bin/os.mjs doctor", mcp: "node bin/os.mjs mcp" },
      engines: { node: ">=18" },
    }, null, 2) + "\n", "utf8");
  }

  return { target: dst, next: ["cd " + dst, "node bin/os.mjs doctor", "node bin/os.mjs init", "node bin/os.mjs scan"] };
}

// CLI direto
if (process.argv[1] && process.argv[1].endsWith("scaffold.mjs")) {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const dir = args.find((a) => !a.startsWith("--"));
  try { const r = scaffold(dir, { force }); console.log("ok scaffolded ->", r.target); r.next.forEach((n) => console.log("   " + n)); }
  catch (e) { console.error("x " + e.message); process.exit(1); }
}
