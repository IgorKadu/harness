# ADR-0030 — Instalacao discreta (tudo em .harness/)

- **Status:** aceito
- **Data:** 2026-05-30
- **Depende de:** ADR-0023 (um cerebro, varias bocas).

## Problema
O scaffold espalhava `src/`, `bin/`, `server/`, `extension/`, `.ai/` e varios arquivos na
raiz do projeto do usuario — poluindo a area de desenvolvimento.

## Decisao
Toda a instalacao do Harness passa a viver em **um unico diretorio oculto `.harness/`**
(motor + bocas + `.ai/` memoria/CORE/conhecimento). Na raiz do projeto ficam apenas:
- os **dotfiles de config** das IDEs (`.claude/`, `.vscode/`, `.gemini/`, `.cursor/`, `.windsurf/`) — ocultos e exigidos pelas IDEs;
- um **`CLAUDE.md` enxuto** (contrato lido pelo Claude Code), apontando para `.harness/`.

O motor resolve a raiz relativa a si (`resolve(__dirname, "..")`), entao rodando de
`.harness/src/engine.mjs` a memoria fica em `.harness/.ai/` — sem mudar o engine. Os comandos
viram `node .harness/bin/os.mjs <cmd>`; o MCP usa o mesmo caminho. O scaffold/upgrade preservam
a memoria e fazem backup em `.harness/.ai/backup-*`.

## Consequencias
- Footprint minimo e discreto; nenhuma funcionalidade perdida.
- O `.vsix` da extensao viaja dentro de `.harness/extension/` (Install from VSIX).
- O repositorio do Harness (o pacote) mantem seu layout normal; so a SAIDA do scaffold mudou.
