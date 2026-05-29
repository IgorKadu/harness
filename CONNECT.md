# Conectar o Harness (MCP + extensao)

O Harness expoe **um motor** (`src/engine.mjs`) por **tres bocas**: CLI (`bin/os.mjs`),
servidor **MCP** (`server/mcp.mjs`) e a **extensao VSCode** (`extension/`). Voce conecta
pela boca que sua ferramenta entende.

## 1. Claude Code
Ja vem pronto em `.claude/settings.json`:
```json
{ "mcpServers": { "harness": { "command": "node", "args": ["${CLAUDE_PROJECT_DIR}/bin/os.mjs", "mcp"] } } }
```
Abra o projeto no Claude Code e **reinicie** — servidores MCP so conectam no boot. Teste pedindo "rode o brief do Harness".

## 2. VSCode (suporte nativo a MCP, 1.102+)
Use `.vscode/mcp.json`:
```json
{ "servers": { "harness": { "type": "stdio", "command": "node", "args": ["bin/os.mjs", "mcp"] } } }
```
Abra a paleta -> "MCP: List Servers" para iniciar/parar. Em clientes via extensao (Cline, Continue, Copilot Chat), aponte o MCP para o mesmo comando.

## 3. Antigravity / Gemini
`.gemini/settings.json`:
```json
{ "mcpServers": { "harness": { "command": "node", "args": ["${workspaceFolder}/bin/os.mjs", "mcp"] } } }
```

## 4. Extensao VSCode (interface visual)
Painel de orquestracao com botoes (perguntas/sugestoes/acoes) em vez de texto no chat:
```bash
npm i -g @vscode/vsce
cd extension && vsce package      # gera o .vsix
# VSCode -> Extensions -> "Install from VSIX..."
```

## Verificar a conexao
```bash
node bin/os.mjs doctor            # integridade
node bin/os.mjs next "teste" --json   # mesmo payload que o MCP/extensao consomem
```

## As tools MCP disponiveis
`os_read_core, os_brief, os_capabilities, os_orchestrate, os_decompose, os_handoff, os_session,
os_work, os_route, os_init, os_phase, os_recall, os_remember, os_sync, os_doctor, os_tokens,
os_gaps, os_scan, os_find` (19 tools).

> Fluxo recomendado para a LLM: `os_brief` -> `os_orchestrate "<intencao>"` (ou `os_session` p/ conversa guiada) -> `os_handoff` para a entrega definida -> seguir `actions`/`awaiting` -> `os_remember` + `os_sync` ao fechar.
