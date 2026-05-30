# Conectar o Harness (MCP + extensão)

O Harness é **um motor** com **quatro bocas**: CLI, servidor **MCP**, **painel web** e a **extensão**.
Tudo vive em `.harness/` (instalação discreta).

## Um comando instala e conecta tudo

Dentro da pasta do seu projeto:

```bash
npx @igorkadu/harness install all
```

Isso **instala o Harness completo** em `.harness/` (motor + MCP + extensão + memória) e escreve a config
MCP de cada IDE — **com caminho absoluto** para `.harness/bin/os.mjs` (funciona em qualquer IDE, sem
depender de `${workspaceFolder}`/`${CLAUDE_PROJECT_DIR}` e independente do cwd com que a IDE inicia).
Também gera os arquivos de instrução (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`) que cada ecossistema lê.

Para uma IDE só: troque `all` por `claude` | `vscode` | `cursor` | `windsurf` | `antigravity`.
Depois **reinicie a IDE**.

> Já instalado (tem `.harness/`)? Use `node .harness/bin/os.mjs install all`.

## O que cada IDE recebe

| IDE | Config MCP | Instruções | Como ativar |
|---|---|---|---|
| **Claude Code** | `.claude/settings.json` | `CLAUDE.md` | reabrir o projeto |
| **VSCode** (1.102+) | `.vscode/mcp.json` | `AGENTS.md` | paleta → *MCP: List Servers* |
| **Cursor** | `.cursor/mcp.json` | `AGENTS.md` | reabrir o projeto |
| **Windsurf** | `.windsurf/mcp.json` | `AGENTS.md` | reabrir o projeto |
| **Antigravity / Gemini** | `.gemini/settings.json` | `GEMINI.md` | reabrir o projeto |

A config gravada tem este formato (caminho absoluto preenchido na sua máquina):
```json
{ "mcpServers": { "harness": { "command": "node", "args": ["C:/seu/projeto/.harness/bin/os.mjs", "mcp"] } } }
```

## Extensão (chat-orquestrador) — já vem pronta

Não precisa compilar. O `.vsix` está em `.harness/extension/`:

1. Paleta (`Ctrl+Shift+P`) → **Install from VSIX...**
2. selecione `.harness/extension/harness-lean-ai-os-0.5.0.vsix`.
3. O ícone do Harness aparece na barra lateral.

Funciona em VSCode, Cursor, Windsurf e Antigravity (todas baseadas no VSCode).

## Verificar

```bash
node .harness/bin/os.mjs doctor          # integridade
node .harness/bin/os.mjs next "teste"    # o orquestrador responde
```
Na IDE, peça à IA: *"rode o brief do Harness"*. Se o MCP conectou, ela responde com a situação do projeto.

## As 25 tools MCP
`os_read_core, os_brief, os_capabilities, os_orchestrate, os_decompose, os_handoff, os_smash,
os_report, os_session, os_gaps, os_metrics, os_suggest_routes, os_subtasks, os_template, os_work,
os_route, os_init, os_phase, os_recall, os_remember, os_sync, os_doctor, os_tokens, os_scan, os_find`.

> Fluxo recomendado para a IA: `os_brief` → `os_orchestrate "<intenção>"` → `os_handoff` → seguir `actions`/`awaiting` → `os_remember` + `os_sync`.
