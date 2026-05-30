# Conectar o Harness (MCP + extensão)

O Harness é **um motor** (`src/engine.mjs`) com **quatro bocas**: CLI (`bin/os.mjs`), servidor **MCP** (`server/mcp.mjs`), **painel web** (`server/web.mjs`) e a **extensão VSCode** (`extension/`). Você conecta pela que sua ferramenta entende.

## O jeito fácil: um comando configura tudo

Dentro da pasta do seu projeto:

```bash
npx @igorkadu/harness install all
```

Isso cria os arquivos de configuração do MCP **na sua pasta atual**, para todas as IDEs suportadas. Depois **reinicie a IDE** (servidores MCP só conectam ao abrir). Para uma só, troque `all` por `claude` | `vscode` | `cursor` | `windsurf` | `antigravity`.

> Já instalado localmente (tem `.harness/` no projeto)? Use `node .harness/bin/os.mjs install all`.
> O comando dentro das configs é escolhido automaticamente: `node .harness/bin/os.mjs mcp` se houver `bin/` local, senão `npx -y @igorkadu/harness mcp`.

## O que cada IDE usa (criado pelo `install`)

| IDE | Arquivo gerado | Como ativar |
|---|---|---|
| **Claude Code** | `.claude/settings.json` | reabrir o projeto |
| **VSCode** (1.102+) | `.vscode/mcp.json` | paleta → *MCP: List Servers* |
| **Cursor** | `.cursor/mcp.json` | reabrir o projeto |
| **Windsurf** | `.windsurf/mcp.json` | reabrir o projeto |
| **Antigravity / Gemini** | `.gemini/settings.json` | reabrir o projeto |
| **Cline / Continue / Copilot** | (use o mesmo comando MCP) | aponte o MCP deles para `npx -y @igorkadu/harness mcp` |

Exemplo do que é gravado (VSCode):
```json
{ "servers": { "harness": { "type": "stdio", "command": "npx", "args": ["-y", "@igorkadu/harness", "mcp"] } } }
```

## Extensão VSCode (chat-orquestrador) — já vem pronta

Não precisa compilar. O arquivo `.vsix` está em `extension/`:

1. Paleta (`Ctrl+Shift+P`) → **Install from VSIX...**
2. selecione `.harness/extension/harness-lean-ai-os-0.4.2.vsix`.
3. O ícone do Harness aparece na barra lateral.

> Não vê a pasta `extension/`? Rode `npx @igorkadu/harnes