#!/usr/bin/env node
// Harness — Lean AI OS · scaffolder/upgrader (instalacao DISCRETA — ADR-0030)
// Tudo do Harness vive num unico diretorio oculto: .harness/ (motor + bocas + .ai).
// Na raiz do projeto ficam apenas: os dotfiles de config das IDEs e um CLAUDE.md enxuto.
// - Sem memoria no alvo  -> instalacao PADRAO (memoria zerada).
// - Com memoria no alvo  -> UPGRADE: atualiza .harness/, PRESERVA .harness/.ai/memory + fase,
//   com backup em .harness/.ai/backup-<timestamp>/.
// Uso: npx @igorkadu/harness scaffold <dir>   |   npx @igorkadu/harness upgrade <dir>

import { cpSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), ".."); // raiz do pacote (origem dos templates)

// Comando MCP a usar nas configs: bin vendorizado em .harness/ (se existir) ou npx.
function mcpArgs() {
  return { rel: ".harness/bin/os.mjs" };
}

function writeConfigs(dst) {
  const node = (relPath) => ({ command: "node", args: [relPath, "mcp"] });
  const claude = { command: "node", args: ["${CLAUDE_PROJECT_DIR}/.harness/bin/os.mjs", "mcp"] };
  const cfgs = [
    [".claude/settings.json", { mcpServers: { harness: claude } }],
    [".vscode/mcp.json", { servers: { harness: { type: "stdio", ...node(".harness/bin/os.mjs") } } }],
    [".gemini/settings.json", { mcpServers: { harness: { command: "node", args: ["${workspaceFolder}/.harness/bin/os.mjs", "mcp"] } } }],
    [".cursor/mcp.json", { mcpServers: { harness: node(".harness/bin/os.mjs") } }],
    [".windsurf/mcp.json", { mcpServers: { harness: node(".harness/bin/os.mjs") } }],
  ];
  for (const [file, json] of cfgs) {
    mkdirSync(join(dst, file.split("/")[0]), { recursive: true });
    writeFileSync(join(dst, file), JSON.stringify(json, null, 2) + "\n", "utf8");
  }
}

function rootClaude(proj) {
  return `# CLAUDE.md — ${proj} (powered by Harness · Lean AI OS)

> O Harness (orquestrador) esta instalado em \`.harness/\`. Você (IA) o aciona pelas **tools MCP**
> (\`os_brief\`, \`os_orchestrate\`, \`os_handoff\`, …). O CLI equivalente e \`node .harness/bin/os.mjs <cmd>\`.

## Protocolo (toda mensagem)
1. Situacao: tool \`os_brief\` — devolve fase, postura de dialogo e proximo passo.
2. Tarefa: \`os_orchestrate "<intencao>"\` — classifica + perguntas guiadas + decomposicao + acoes + \`awaiting\`.
   Siga o \`awaiting\` (so pausa em \`user_answers\` / \`user_confirm_plan\`).
3. Entrega p/ codar: \`os_handoff "<intencao>"\` — objetivo, escopo, o que NAO fazer, onde, como, porque.
4. Ao fechar: \`os_remember\` + \`os_sync\`.

## Travas boas (peça confirmacao ao usuario)
- Avancar de fase (discovery → execution → stabilization) e aprovar plano de tarefa \`complex\`. Só isso.

## Invariante
Custo de contexto = funcao da tarefa, nao do projeto. Nao coube no orcamento → **decomponha a tarefa**.

Memoria e CORE vivem em \`.harness/.ai/\`. Nao carregue nada "por garantia".
`;
}

export function scaffold(targetDir, { force = false } = {}) {
  if (!targetDir) throw new Error("uso: scaffold <dir-alvo> [--force]");
  const dst = resolve(targetDir);
  const H = join(dst, ".harness");
  const aiDst = join(H, ".ai");
  const memDir = join(aiDst, "memory");
  const projJson = join(aiDst, "project.json");
  const hasMemory = existsSync(join(memDir, "state-of-world.md")) || existsSync(projJson);

  if (existsSync(H) && !force) {
    throw new Error(`.harness ja existe em ${dst}. Para ATUALIZAR preservando a memoria use 'upgrade ${targetDir}'.`);
  }
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

  // copia FROM pacote (SRC) TO .harness/<rel>
  const copy = (rel, toRel) => { const s = join(SRC, rel); if (existsSync(s)) cpSync(s, join(H, toRel || rel), { recursive: true }); };

  // 1. Motor + bocas dentro de .harness/
  copy("src"); copy("bin/os.mjs"); copy("bin/scaffold.mjs"); copy("server"); copy("extension");

  // 2. CORE + conhecimento + onboarding em .harness/.ai/
  copy(".ai/CONSTITUTION.md"); copy(".ai/retrieval-index.json"); copy(".ai/retrieval-index.schema.json");
  copy(".ai/knowledge"); copy(".ai/bootstrap");
  mkdirSync(join(aiDst, "specs", "ADR"), { recursive: true });
  copy(".ai/specs/ADR/_TEMPLATE.md");

  // 3. Docs internos dentro de .harness/
  copy("CONNECT.md"); copy("AGENTS.md");

  // 4. .gitignore do proprio .harness (nao toca no .gitignore do projeto)
  writeFileSync(join(H, ".gitignore"), ".ai/runtime/\n.ai/backup-*/\nnode_modules/\n*.log\n", "utf8");

  // 5. Memoria: preserva no upgrade; semeia o que faltar; zera na instalacao padrao
  mkdirSync(join(aiDst, "memory", "logs"), { recursive: true });
  const proj = (targetDir.split(/[\\/]/).filter(Boolean).pop()) || "projeto";
  const preserve = isUpgrade;
  const writeIf = (path, content) => { if (!preserve || !existsSync(path)) writeFileSync(path, content, "utf8"); };

  writeIf(join(aiDst, "memory", "state-of-world.md"),
`# State of the World — Harness

> Memoria quente. Reescrita a cada /sync (nao append-only). Alvo: <= 1200 tokens.

## Identidade
- **Projeto:** ${proj} (recem-inicializado com Harness).

## Onde paramos
- **Foco ativo:** onboarding. Rode 'init' e depois 'scan'.

## Decisoes vigentes
- (nenhuma ainda — registre com 'remember decisions')
`);
  writeIf(join(aiDst, "memory", "decisions-index.md"),
`# Decisions Index

| ID | Titulo | Status |
|---|---|---|
`);
  for (const [f, h] of [["tasks-log.md", "# Tasks Log (append-only)\n"], ["decisions-log.md", "# Decisions Log (append-only)\n"], ["errors-log.md", "# Errors & Solutions Log (append-only)\n"]])
    writeIf(join(aiDst, "memory", "logs", f), h);
  writeIf(projJson, JSON.stringify({ phase: "discovery", phase_set_at: new Date().toISOString(), created: new Date().toISOString() }, null, 2) + "\n");

  // 6. Raiz do projeto: so o CLAUDE.md enxuto + os dotfiles de config (ocultos)
  const claudePath = join(dst, "CLAUDE.md");
  if (!existsSync(claudePath) || !preserve) writeFileSync(claudePath, rootClaude(proj), "utf8");
  writeConfigs(dst);

  const mode = isUpgrade ? "upgrade" : "fresh";
  const next = isUpgrade
    ? ["memoria preservada (backup em .harness/.ai/backup-*)", "reinicie a IDE", "node .harness/bin/os.mjs doctor"]
    : ["reinicie a IDE para conectar o MCP", "node .harness/bin/os.mjs doctor", "node .harness/bin/os.mjs init"];
  return { target: dst, mode, backup, next };
}

export function upgrade(targetDir) { return scaffold(targetDir, { force: true }); }

if (process.argv[1] && process.argv[1].endsWith("scaffold.mjs")) {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const dir = args.find((a) => !a.startsWith("--"));
  try { const r = scaffold(dir, { force }); console.log(`ok ${r.mode} -> ${r.target}/.harness`); if (r.backup) console.log("   backup:", r.backup); r.next.forEach((n) => console.log("   " + n)); }
  catch (e) { console.error("x " + e.message); process.exit(1); }
}
