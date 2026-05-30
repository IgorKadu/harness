# ADR-0034 — Harness como TURBINA (automacoes), nao painel

- **Status:** aceito
- **Data:** 2026-05-30
- **Substitui parcialmente:** a extensao VSCode como "painel" (removida).

## Decisao
O Harness deixa de tentar ser um painel/UI na IDE e assume o papel de **turbina do desenvolvimento**:
um conjunto de **automacoes (bots)** no motor que fazem o trabalho pesado direto no repositorio e
entregam tudo mastigado para a LLM (que cuida da codificacao, inteligencia e interacao com o usuario).

Novas automacoes (tools MCP + CLI), sempre escopadas ao PROJETO e protegendo `.harness/`:
- `os_pipeline` — fluxo padrao: scan + analyze + gaps + handoff (entrega perfil + handoff.md).
- `os_analyze` — perfil profundo: estrutura, stack, entrypoints, configs, docs, testes, deps, scripts, smells.
- `os_inspect [sub]` — lista pastas/arquivos (global ou isolada por modulo); protege `.harness/`.
- `os_automations` — catalogo dos bots (globais x isolados).

A **extensao VSCode foi removida** (e o `.vsix`). A interacao direta com o Harness sem a LLM
continua via **CLI** e **painel web** (`os serve`). O canal smash/handoff/report (ADR-0033) segue.

## Consequencias
- Independente da IDE/LLM: o valor esta no motor, acessado por MCP/CLI.
- Fluxo padrao para projeto novo ou existente: a LLM chama `os_pipeline` e ja recebe o perfil + handoff.
- Menos superficie fragil (sem empacotar/instalar extensao); foco no que entrega resultado.
