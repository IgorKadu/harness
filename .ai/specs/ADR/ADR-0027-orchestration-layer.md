# ADR-0027 — Camada de orquestracao autoexecutavel

- **Status:** aceito
- **Data:** 2026-05-28
- **Contexto anterior:** ADR-0022 (lean/retrieval-first), ADR-0023 (duas bocas/um cerebro),
  ADR-0024 (comunicacao adaptativa), ADR-0026 (operacao autonoma).

## Problema
Ate aqui o Harness *informava opcoes* (`caps`) e *recuperava contexto* (`work`), mas quem
encadeava o fluxo era a LLM, a cada turno, via chat. Isso e caro (tokens/janela), cansa o
usuario (muito texto, decisoes ambiguas) e deixa a LLM se perder na complexidade.

## Decisao
Adicionar uma **camada de orquestracao** que, dada uma intencao, devolve um **pacote de
interacao** estruturado e acionavel — `orchestrate(intent, {answers, approved})`:
- `classification` (trivial|simple|complex) inferida de sinais do working-set;
- `workingSet` (arquivos + orcamento + veredito);
- `questions` (perguntas guiadas conforme a fase/postura);
- `decomposition` (subtarefas quando estoura o orcamento — invariante ADR-0022);
- `suggestions`, `actions` (proximos passos com tool/args/why) e `awaiting`
  (`null | user_answers | user_confirm_plan`) — as unicas travas que pedem o usuario.

O mesmo pacote serve **as duas pontas**: a LLM no chat e a **extensao VSCode** (UI), que
o renderiza com botoes. Zero duplicacao: a extensao chama o CLI `--json`, que importa o
mesmo `engine.mjs` do MCP (ADR-0023).

## Consequencias
- A LLM passa a fazer 1 chamada (`os_orchestrate`) em vez de orquestrar manualmente.
- O usuario interage por escolhas/botoes, nao por paredes de texto.
- O fluxo tem inicio-meio-fim explicito (`awaiting`) sem loop infinito.
- Novas bocas (web, CLI, IDE) reusam o pacote sem reimplementar logica.
