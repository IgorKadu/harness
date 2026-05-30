#!/usr/bin/env node
// Harness — Lean AI OS · instalador (ADR-0030/0031): instalacao DISCRETA e COMPLETA.
// Tudo (motor + bocas + .ai + extensao) vive em .harness/. Qualquer 'install <ide>'
// GARANTE o .harness/ completo e entao escreve a config MCP da IDE pedida.
// Na raiz do projeto ficam so os dotfiles de config (ocultos) e um CLAUDE.md enxuto.

import { cpSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), ".."); // raiz do pacote (origem)

function pkgVersion() { try { return JSON.parse(readFileSync(join(SRC, "package.json"), "utf8")).version || "0.0.0"; } catch { return "0.0.0"; } }

// ---- configs MCP por IDE (sempre apontando para o .harness/ local) ----------
const NODE_LOCAL = { command: "node", args: [".harness/bin/os.mjs", "mcp"] };
export const CONFIG_TARGETS = ["claude", "vscode", "antigravity", "cursor", "windsurf"];
const CFG = {
  claude: { file: ".claude/settings.json", json: { mcpServers: { harness: { command: "node", args: ["${CLAUDE_PROJECT_DIR}/.harness/bin/os.mjs", "mcp"] } } } },
  vscode: { file: ".vscode/mcp.json", json: { servers: { harness: { type: "stdio", ...NODE_LOCAL } } } },
  antigravity: { file: ".gemini/settings.json", json: { mcpServers: { harness: { command: "node", args: ["${workspaceFolder}/.harness/bin/os.mjs", "mcp"] } } } },
  cursor: { file: ".cursor/mcp.json", json: { mcpServers: { harness: { ...NODE_LOCAL } } } },
  windsurf: { file: ".windsurf/mcp.json", json: { mcpServers: { harness: { ...NODE_LOCAL } } } },
};
function writeConfig(dst, target) {
  const c = CFG[target];
  if (!c) throw new Error(`alvo invalido: '${target}'. Use: ${CONFIG_TARGETS.join(" | ")} | all`);
  mkdirSync(join(dst, c.file.split("/")[0]), { recursive: true });
  writeFileSync(join(dst, c.file), JSON.stringify(c.json, null, 2) + "\n", "utf8");
  return c.file;
}

function rootClaude(proj) {
  return `# CLAUDE.md — ${proj} (powered by Harness · Lean AI OS)

> O Harness (orquestrador) esta instalado em \`.harness/\`. Voce (IA) o aciona pelas **tools MCP**
> (\`os_brief\`, \`os_orchestrate\`, \`os_handoff\`, …). O CLI equivalente e \`node .harness/bin/os.mjs <cmd>\`.

## Protocolo (toda mensagem)
1. Situacao: tool \`os_brief\` — fase, postura de dialogo e proximo passo.
2. Tarefa: \`os_orchestrate "<intencao>"\` — classifica + perguntas guiadas + decomposicao + acoes + \`awaiting\`.
   Siga o \`awaiting\` (so pausa em \`user_answers\` / \`user_confirm_plan\`).
3. Entrega p/ codar: \`os_handoff "<intencao>"\` — objetivo, escopo, o que NAO fazer, onde, como, porque.
4. Ao fechar: \`os_remember\` + \`os_sync\`.

## Travas boas (peça confirmacao ao usuario)
- Avancar de fase e aprovar plano de tarefa \`complex\`. Só isso.

Memoria e CORE vivem em \`.harness/.ai/\`. Nao carregue nada "por garantia".
`;
}

// ---- vendor: copia o Harness COMPLETO para .harness/ (preserva memoria) ------
function vendor(dst, { force = false } = {}) {
  const H = join(dst, ".harness");
  const aiDst = join(H, ".ai");
  const memDir = join(aiDst, "memory");
  const projJson = join(aiDst, "project.json");
  const hasMemory = existsSync(join(memDir, "state-of-world.md")) || existsSync(projJson);
  const isUpgrade = hasMemory && force;
  mkdirSync(H, { recursive: true });

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

  const copy = (rel, toRel) => { const s = join(SRC, rel); if (existsSync(s)) cpSync(s, join(H, toRel || rel), { recursive: true }); };
  copy("src"); copy("bin/os.mjs"); copy("bin/scaffold.mjs"); copy("server"); copy("extension");
  copy(".ai/CONSTITUTION.md"); copy(".ai/retrieval-index.json"); copy(".ai/retrieval-index.schema.json");
  copy(".ai/knowledge"); copy(".ai/bootstrap");
  mkdirSync(join(aiDst, "specs", "ADR"), { recursive: true });
  copy(".ai/specs/ADR/_TEMPLATE.md");
  copy("CONNECT.md"); copy("AGENTS.md");
  writeFileSync(join(H, ".gitignore"), ".ai/runtime/\n.ai/backup-*/\nnode_modules/\n*.log\n", "utf8");

  mkdirSync(join(aiDst, "memory", "logs"), { recursive: true });
  const proj = (dst.split(/[\\/]/).filter(Boolean).pop()) || "projeto";
  const preserve = isUpgrade;
  const writeIf = (path, content) => { if (!preserve || !existsSync(path)) writeFileSync(path, content, "utf8"); };
  writeIf(join(aiDst, "memory", "state-of-world.md"),
`# State of the World — Harness

> Memoria quente. Reescrita a cada /sync. Alvo: <= 1200 tokens.

## Identidade
- **Projeto:** ${proj} (recem-inicializado com Harness).

## Onde paramos
- **Foco ativo:** onboarding. Rode 'init' e depois 'scan'.

## Decisoes vigentes
- (nenhuma ainda)
`);
  writeIf(join(aiDst, "memory", "decisions-index.md"), `# Decisions Index\n\n| ID | Titulo | Status |\n|---|---|---|\n`);
  for (const [f, h] of [["tasks-log.md", "# Tasks Log (append-only)\n"], ["decisions-log.md", "# Decisions Log (append-only)\n"], ["errors-log.md", "# Errors & Solutions Log (append-only)\n"]])
    writeIf(join(aiDst, "memory", "logs", f), h);
  writeIf(projJson, JSON.stringify({ phase: "discovery", phase_set_at: new Date().toISOString(), created: new Date().toISOString() }, null, 2) + "\n");

  const claudePath = join(dst, "CLAUDE.md");
  if (!existsSync(claudePath) || !preserve) writeFileSync(claudePath, rootClaude(proj), "utf8");

  return { mode: isUpgrade ? "upgrade" : "fresh", backup };
}

const vsixRel = () => `.harness/extension/harness-lean-ai-os-${pkgVersion()}.vsix`;

// ---- API publica ------------------------------------------------------------

// Instalacao COMPLETA: .harness/ + CLAUDE.md + TODAS as configs de IDE.
export function scaffold(targetDir, { force = false } = {}) {
  if (!targetDir) throw new Error("uso: scaffold <dir-alvo> [--force]");
  const dst = resolve(targetDir);
  if (existsSync(join(dst, ".harness")) && !force) throw new Error(`.harness ja existe em ${dst}. Use 'upgrade ${targetDir}'.`);
  const v = vendor(dst, { force });
  CONFIG_TARGETS.forEach((t) => writeConfig(dst, t));
  const next = v.mode === "upgrade"
    ? ["memoria preservada (backup em .harness/.ai/backup-*)", "reinicie a IDE", "node .harness/bin/os.mjs doctor"]
    : ["reinicie a IDE para conectar o MCP", "node .harness/bin/os.mjs doctor", `extensao: Install from VSIX -> ${vsixRel()}`];
  return { target: dst, mode: v.mode, backup: v.backup, configs: CONFIG_TARGETS, vsix: vsixRel(), next };
}

export function upgrade(targetDir) { return scaffold(targetDir, { force: true }); }

// Instala/garante o Harness COMPLETO e escreve a(s) config(s) da(s) IDE(s) pedida(s).
export function install(targetDir, targets) {
  const dst = resolve(targetDir || ".");
  const list = (!targets || targets.length === 0 || targets[0] === "all") ? CONFIG_TARGETS : targets;
  for (const t of list) if (!CFG[t]) throw new Error(`alvo invalido: '${t}'. Use: ${CONFIG_TARGETS.join(" | ")} | all`);
  let harnessCreated = false, mode = null, backup = null;
  if (!existsSync(join(dst, ".harness", "bin", "os.mjs"))) { const v = vendor(dst, {}); harnessCreated = true; mode = v.mode; backup = v.backup; }
  const written = list.map((t) => ({ target: t, file: writeConfig(dst, t) }));
  return { target: dst, harnessCreated, mode, backup, written, vsix: vsixRel() };
}

// CLI direto
if (process.argv[1] && process.argv[1].endsWith("scaffold.mjs")) {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const dir = args.find((a) => !a.startsWith("--"));
  try { const r = scaffold(dir, { force }); console.log(`ok ${r.mode} -> ${r.target}/.harness`); if (r.backup) console.log("   backup:", r.backup); r.next.forEach((n) => console.log("   " + n)); }
  catch (e) { console.error("x " + e.message); process.exit(1); }
}
