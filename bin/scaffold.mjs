#!/usr/bin/env node
// Harness — Lean AI OS · instalador (ADR-0030..0033): discreto, completo, portavel e protegido.
// Tudo vive em .harness/. 'install <ide>' GARANTE o .harness/ completo, escreve a config MCP
// com CAMINHO ABSOLUTO, gera o arquivo de instrucoes da IDE e os arquivos de IGNORE que
// protegem o .harness/ de ser editado/indexado pelo agente.

import { cpSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function pkgVersion() { try { return JSON.parse(readFileSync(join(SRC, "package.json"), "utf8")).version || "0.0.0"; } catch { return "0.0.0"; } }

export const CONFIG_TARGETS = ["claude", "vscode", "antigravity", "cursor", "windsurf"];

function osmjsAbs(dst) { return join(dst, ".harness", "bin", "os.mjs").split("\\").join("/"); }
function mcpCfg(dst) { return { command: "node", args: [osmjsAbs(dst), "mcp"] }; }

const SHAPES = {
  claude: { file: ".claude/settings.json", wrap: (c) => ({ mcpServers: { harness: c } }) },
  vscode: { file: ".vscode/mcp.json", wrap: (c) => ({ servers: { harness: { type: "stdio", ...c } } }) },
  antigravity: { file: ".gemini/settings.json", wrap: (c) => ({ mcpServers: { harness: c } }) },
  cursor: { file: ".cursor/mcp.json", wrap: (c) => ({ mcpServers: { harness: c } }) },
  windsurf: { file: ".windsurf/mcp.json", wrap: (c) => ({ mcpServers: { harness: c } }) },
};
function writeConfig(dst, target) {
  const sh = SHAPES[target];
  if (!sh) throw new Error(`alvo invalido: '${target}'. Use: ${CONFIG_TARGETS.join(" | ")} | all`);
  mkdirSync(join(dst, sh.file.split("/")[0]), { recursive: true });
  writeFileSync(join(dst, sh.file), JSON.stringify(sh.wrap(mcpCfg(dst)), null, 2) + "\n", "utf8");
  return sh.file;
}

function instructions(proj) {
  return `# Instrucoes do Agente — ${proj} (powered by Harness · Lean AI OS)

> O Harness (orquestrador) vive em \`.harness/\`. Voce (IA) o aciona pelas **tools MCP**
> (\`os_start\`, \`os_orchestrate\`, \`os_handoff\`, \`os_smash\`, \`os_report\`, …).

## PROTECAO — LEIA PRIMEIRO (nao negociavel)
- **NUNCA crie, edite, mova ou apague qualquer arquivo dentro de \`.harness/\`.** Ele e o sistema
  operacional do projeto e deve permanecer intacto. A memoria do Harness so muda via tools \`os_*\`.
- Faca alteracoes de codigo **apenas no projeto** (fora de \`.harness/\`).
- \`.harness/\` esta nos arquivos de ignore (\`.aiexclude\`, \`.cursorignore\`, etc.) — nao o reindexe.

## Comando "smash" (canal Usuario -> Harness -> LLM)
Quando o usuario disser **smash** (ou "siga o handoff"):
1. chame a tool \`os_smash\` (ou leia o conteudo que ela retorna) — e o handoff alinhado entre Usuario e Harness;
2. **execute** seguindo objetivo/escopo/onde/como/o-que-nao-fazer do handoff;
3. ao terminar, chame \`os_report\` com um resumo do que voce fez — o Harness le isso na proxima vez.

## SAVE POINTS (checkpoints) — como funcionam
O Harness mantem 3 \`Saves\`: L1 overview, L2 progress, L3 technical. O \`os_start\` (passo 0 abaixo)
JA traz o status deles — nao chame \`os_saves\` separadamente no inicio.
- **Existem e frescos:** retome a partir deles; so rode fluxos pesados para o que nao respondem.
- **Nao existem:** rode os fluxos (\`os_pipeline\`/\`os_scan\`) e DEPOIS grave com \`os_save_write\`.
- **Ao concluir:** \`os_save_checkpoint\` no Save adequado; mudanca ESTRUTURAL = todas as camadas (layers='all').

## Fluxo padrao (projeto novo ou existente)
- Comece pela TURBINA: \`os_pipeline\` — o Harness analisa o repo (estrutura, stack, docs, testes, smells) e ja escreve o handoff. Use \`os_scan\`/\`os_find\` para aprofundar no codigo.

## Protocolo (toda mensagem)
0. \`os_start\` — PRIMEIRO E SEMPRE: a capsula de contexto. Um so pacote barato com foco (o fio), saves (e o que esta STALE), postura da fase e a \`nextAction\`. AJA na nextAction; nao re-rode fluxos pesados para o que a capsula ja respondeu. Passe uma intencao para vir tambem o working-set (<=5 arquivos).
1. \`os_orchestrate "<intencao>"\` — para uma tarefa: classifica + perguntas + decomposicao + acoes + \`awaiting\`.
2. \`os_handoff "<intencao>"\` — entrega definida; \`os_smash\` para seguir o handoff atual.
3. Mantenha o fio: \`os_focus set\` sempre que o passo atual mudar (objetivo/passo/proxima acao).
4. Feche com \`os_report\` + \`os_remember\` + \`os_sync\` + \`os_save_checkpoint\` (atualize o Save adequado; estrutural = todos).

## Travas boas (peça confirmacao ao usuario)
- Avancar de fase e aprovar plano de tarefa \`complex\`. Só isso.

Memoria e CORE vivem em \`.harness/.ai/\`. Nao carregue nada "por garantia".
`;
}

const INSTRUCTION_FILES = { claude: "CLAUDE.md", antigravity: "GEMINI.md", cursor: "AGENTS.md", windsurf: "AGENTS.md", vscode: "AGENTS.md" };
function writeInstructions(dst, proj, targets, preserve) {
  const names = new Set(["AGENTS.md", ...targets.map((t) => INSTRUCTION_FILES[t]).filter(Boolean)]);
  for (const name of names) { const p = join(dst, name); if (!preserve || !existsSync(p)) writeFileSync(p, instructions(proj), "utf8"); }
}

// Arquivos de ignore que protegem o .harness/ do indice/edicao do agente (todos sintaxe .gitignore).
const IGNORE_FILES = [".aiexclude", ".geminiignore", ".cursorignore", ".cursorindexingignore", ".codeiumignore", ".aiignore"];
function writeIgnores(dst, preserve) {
  const body = "# Protege o Harness: o agente NAO deve indexar/editar .harness/\n.harness/\n";
  for (const f of IGNORE_FILES) {
    const p = join(dst, f);
    if (existsSync(p)) { const cur = readFileSync(p, "utf8"); if (!cur.includes(".harness/")) writeFileSync(p, cur.replace(/\s*$/, "") + "\n.harness/\n", "utf8"); }
    else writeFileSync(p, body, "utf8");
  }
}

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
  copy("src"); copy("bin"); copy("server");
  copy(".ai/CONSTITUTION.md"); copy(".ai/retrieval-index.json"); copy(".ai/retrieval-index.schema.json");
  copy(".ai/knowledge"); copy(".ai/bootstrap");
  mkdirSync(join(aiDst, "specs", "ADR"), { recursive: true });
  copy(".ai/specs/ADR/_TEMPLATE.md");
  copy("CONNECT.md");
  writeFileSync(join(H, "VERSION"), pkgVersion() + "\n", "utf8");
  writeFileSync(join(H, ".gitignore"), ".ai/runtime/\n.ai/backup-*/\n.ai/handoff.md\n.ai/report.md\n.ai/session.json\n.ai/subsessions.json\nnode_modules/\n*.log\n", "utf8");

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

  writeIgnores(dst, preserve);
  return { mode: isUpgrade ? "upgrade" : "fresh", backup, proj, preserve };
}


const USER_COMMANDS = {
  reset: "# /reset — limpar o Harness deste projeto\n\nZera o Harness (memorias, Saves, runtime) deixando-o como recem-instalado, SEM tocar no motor, knowledge nem nas configs. Use entre projetos para nao misturar contextos.\n\n1. Confirme com o usuario (acao destrutiva).\n2. Rode: `node .harness/bin/os.mjs reset --yes`\n3. Relate o que foi limpo.\n",
  update: "# /update — atualizar o Harness\n\nBusca a versao mais nova do Harness e atualiza o motor/knowledge/instrucoes PRESERVANDO memorias e Saves.\n\n1. Na raiz do projeto rode: `npx @igorkadu/harness@latest update`\n2. Reinicie a IDE.\n3. Confira com `node .harness/bin/os.mjs doctor`.\n",
  reforce: "# /reforce — recompilar memoria/Saves/docs\n\nOrienta voce (LLM) a refinar e condensar memoria, Saves e documentacao ao estado ATUAL do projeto, sem perder o que e critico.\n\n1. Chame a tool `os_reforce` (ou rode `node .harness/bin/os.mjs reforce --json`).\n2. Execute a diretiva retornada (scan -> ler Saves -> reescrever -> os_sync -> os_save_checkpoint all).\n",
};
function writeSlashCommands(dst, preserve) {
  const dirs = [join(dst, ".claude", "commands"), join(dst, ".agents", "commands")];
  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true });
    for (const [name, body] of Object.entries(USER_COMMANDS)) {
      const p = join(dir, name + ".md");
      if (!preserve || !existsSync(p)) writeFileSync(p, body, "utf8");
    }
  }
}

export function scaffold(targetDir, { force = false } = {}) {
  if (!targetDir) throw new Error("uso: scaffold <dir-alvo> [--force]");
  const dst = resolve(targetDir);
  if (existsSync(join(dst, ".harness")) && !force) throw new Error(`.harness ja existe em ${dst}. Use 'upgrade ${targetDir}'.`);
  const v = vendor(dst, { force });
  CONFIG_TARGETS.forEach((t) => writeConfig(dst, t));
  writeInstructions(dst, v.proj, CONFIG_TARGETS, v.preserve);
  writeSlashCommands(dst, v.preserve);
  const next = v.mode === "upgrade"
    ? ["memoria preservada (backup em .harness/.ai/backup-*)", "reinicie a IDE", "node .harness/bin/os.mjs doctor"]
    : ["reinicie a IDE para conectar o MCP", "node .harness/bin/os.mjs doctor", "node .harness/bin/os.mjs pipeline  (fluxo padrao: analisa o projeto)"];
  return { target: dst, mode: v.mode, backup: v.backup, configs: CONFIG_TARGETS, next };
}

export function upgrade(targetDir) { return scaffold(targetDir, { force: true }); }

export function update(targetDir) {
  const dst = resolve(targetDir || ".");
  const verFile = join(dst, ".harness", "VERSION");
  const from = (existsSync(verFile) ? readFileSync(verFile, "utf8").trim() : null);
  const to = pkgVersion();
  if (!existsSync(join(dst, ".harness", "bin", "os.mjs"))) {
    // not installed yet -> behave like a fresh install
    const r = scaffold(dst, { force: false });
    return { mode: "fresh", from: null, to, target: r.target, changed: true, next: r.next };
  }
  const r = scaffold(dst, { force: true }); // re-vendor; memory+saves preserved (vendor never touches saves; writeIf preserves memory)
  return { mode: "update", from, to, changed: from !== to, target: r.target, backup: r.backup, next: ["memoria e Saves preservados", "reinicie a IDE", "node .harness/bin/os.mjs doctor"] };
}

export function install(targetDir, targets) {
  const dst = resolve(targetDir || ".");
  const list = (!targets || targets.length === 0 || targets[0] === "all") ? CONFIG_TARGETS : targets;
  for (const t of list) if (!SHAPES[t]) throw new Error(`alvo invalido: '${t}'. Use: ${CONFIG_TARGETS.join(" | ")} | all`);
  let harnessCreated = false, mode = null, backup = null, proj = (dst.split(/[\\/]/).filter(Boolean).pop()) || "projeto", preserve = false;
  if (!existsSync(join(dst, ".harness", "bin", "os.mjs"))) { const v = vendor(dst, {}); harnessCreated = true; mode = v.mode; backup = v.backup; proj = v.proj; }
  else { preserve = true; writeIgnores(dst, false); }
  const written = list.map((t) => ({ target: t, file: writeConfig(dst, t) }));
  writeInstructions(dst, proj, list, preserve);
  writeSlashCommands(dst, preserve);
  return { target: dst, harnessCreated, mode, backup, written };
}

if (process.argv[1] && process.argv[1].endsWith("scaffold.mjs")) {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const dir = args.find((a) => !a.startsWith("--"));
  try { const r = scaffold(dir, { force }); console.log(`ok ${r.mode} -> ${r.target}/.harness`); if (r.backup) console.log("   backup:", r.backup); r.next.forEach((n) => console.log("   " + n)); }
  catch (e) { console.error("x " + e.message); process.exit(1); }
}
