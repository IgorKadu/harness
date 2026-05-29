# ADR-0029 — Evolucao do orquestrador (metricas, rotas, subtarefas, templates, web)

- **Status:** aceito
- **Data:** 2026-05-29
- **Depende de:** ADR-0027 (orquestracao), ADR-0028 (handoff/sessao).

## Decisao
Avanco do roadmap, tudo deterministico/zero-dep por padrao:
- **Metricas** (`metrics`): prova o valor do retrieval-first medindo tokens poupados/tarefa.
- **Aprendizado de rotas** (`suggestRoutes`): o indice deixa de ser estatico — sugere rotas
  a partir do historico de intencoes (usuario aprova).
- **Subtarefas como sessoes-filhas** (`spawnSubsessions`/`setSubStatus`): decomposicao com
  progresso agregado e persistido.
- **Templates** (`template`): seeds por tipo (api/web/cli/lib) — objetivo, primeiros passos,
  nao-fazer e triggers.
- **LLM opcional** (`setLLM`/`assist`): hook plugavel; cai no determinismo quando ausente,
  preservando o ADR-0022 (zero-dep).
- **Painel web** (`server/web.mjs`, `os serve`): o chat-orquestrador sem IDE, mesmo motor.
- **Acoes realimentam a sessao** (`noteSession`): o que a extensao executa vira nota persistida.

## Consequencias
- O orquestrador cobre o ciclo todo (entender -> estruturar -> entregar -> medir -> aprender).
- Quatro bocas do mesmo cerebro: CLI, MCP, extensao e web. Zero duplicacao (ADR-0023).
