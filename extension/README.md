# Harness — Lean AI OS (extensao VSCode)

**Chat-orquestrador** dentro do editor. O Harness fica *entre* voce e a LLM — e *com* os dois.
Voce descreve a tarefa em linguagem natural; o orquestrador **conversa** (orienta, pergunta,
recomenda), **estrutura** tudo e entrega a LLM um **handoff** pronto: objetivo, escopo, o que
**NAO** fazer, qual pasta/arquivo mexer, onde esta o codigo, como e porque. A LLM (Claude
Code, Antigravity, Copilot…) so executa — ja sabendo onde, como e por que.

## Por que
Conversar tudo no chat da LLM e caro (tokens), cansa o usuario e faz a LLM se perder. O
orquestrador absorve o desgaste: poucas perguntas certas -> uma entrega bem definida.

## Como funciona
Zero duplicacao de logica: a extensao chama `node bin/os.mjs session ... --json`, que importa
`src/engine.mjs` — a mesma fonte do servidor MCP. A sessao **persiste** (`.ai/runtime/session.json`),
entao voce retoma de onde parou. O handoff pode ser copiado para a LLM ou salvo em `.ai/runtime/handoff.md`.

## Uso
1. Abra um projeto com o Harness instalado (existe `bin/os.mjs` — use `npx @igorkadu/harness scaffold .`).
2. Clique no icone do Harness na barra lateral (ou **Harness: Abrir chat-orquestrador**).
3. Converse: descreva a tarefa, responda as perguntas. Ao final, clique **Copiar p/ a LLM**.

## Configuracao
- `harness.node` — executavel do Node (default `node`).
- `harness.cliPath` — caminho do CLI relativo ao workspace (default `bin/os.mjs`).

## Instalar
O arquivo `.vsix` ja vem pronto neste diretorio. No VSCode/Cursor/Windsurf/Antigravity:
1. `Ctrl+Shift+P` -> **Install from VSIX...**
2. selecione `harness-lean-ai-os-0.3.1.vsix`.

Recompilar (opcional): `npm i -g @vscode/vsce` e `vsce package`.
