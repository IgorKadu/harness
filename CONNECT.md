# Conectar o Harness (MCP + CLI)

O Harness é a **turbina** do desenvolvimento: um motor de automações que faz o trabalho pesado
no repositório e entrega tudo mastigado para a sua LLM. Tudo vive em `.harness/` (instalação discreta).

## Um comando instala e conecta tudo

Dentro da pasta do seu projeto:

```bash
npx @igorkadu/harness install all
```

Instala o Harness completo em `.harness/` (motor + MCP + memória) e escreve a config MCP de cada IDE —
com **caminho absoluto** para `.harness/bin/os.mjs` (funciona em qualquer IDE). Gera também os arquivos
de instrução (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`) e os de ignore que **protegem o `.harness/`**.

Para uma IDE só: troque `all` por `claude` | `vscode` | `cursor` | `windsurf` | `antigravity`. Depois **reinicie a IDE**.

## O que cada IDE recebe

| IDE | Config MCP | Instruções |
|---|---|---|
| **Claude Code** | `.claude/settings.json` | `CLAUDE.md` |
| **VSCode** (1.102+) | `.vscode/mcp.json` | `AGENTS.md` |
| **Cursor** | `.cursor/mcp.json` | `AGENTS.md` |
| **Windsurf** | `.windsurf/mcp.json` | `AGENTS.md` |
| **Antigravity / Gemini** | `.gemini/settings.json` | `GEMINI.md` |

Config gravada (caminho absoluto preenchido na sua máquina):
```json
{ "mcpServers": { "harness": { "command": "node", "args": ["C:/seu/projeto/.harness/bin/os.mjs", "mcp"] } } }
```

## Fluxo padrão (a turbina)

1. **`os_pipeline`** — o Harness analisa o repo (estrutura, stack, docs, testes, smells) e escreve `.harness/.ai/handoff.md`.
2. No chat da IDE digite **`smash`** — a LLM lê o handoff (`os_smash`), executa seguindo o Harness e registra o que fez (`os_report`).
3. Na próxima interação, `os_brief` mostra o último relatório — o Harness sabe o andamento e define o próximo passo.

Interação direta com o Harness **sem a LLM**: pelo CLI (`node .harness/bin/os.mjs <cmd>`) ou pelo painel web (`node .harness/bin/os.mjs serve`).

## Verificar
```bash
node .harness/bin/os.mjs doctor
node .harness/bin/os.mjs pipeline      # analisa o projeto e gera o handoff
```

## As tools MCP (núcleo curado)
A IA enxerga um **núcleo de ~20 tools** (menos overhead de contexto; ADR-0042). As demais continuam no motor/CLI, só não são anunciadas.

Entrada/contexto: `os_start` (passo 0: foco + saves + postura + próxima ação).
Tarefa/entrega: `os_orchestrate, os_handoff, os_smash, os_report, os_assess, os_validate`.
Save points: `os_saves, os_save_write, os_save_checkpoint, os_focus`.
Código/memória: `os_scan, os_find, os_recall, os_remember, os_sync`.
Fluxo/manutenção: `os_pipeline, os_phase, os_subtasks, os_doctor`.

> O resto (`os_brief, os_analyze, os_inspect, os_metrics, os_template, …`) segue chamável via `tools/call` e via CLI.

> **Proteção:** o agente nunca edita/indexa `.harness/` (regra nas instruções + arquivos de ignore). Só o projeto é alterado.
