# ADR-0028 — Handoff estruturado + memoria de sessao (chat-orquestrador)

- **Status:** aceito
- **Data:** 2026-05-28
- **Depende de:** ADR-0022 (lean), ADR-0023 (um cerebro/varias bocas), ADR-0027 (orquestracao).

## Problema
A LLM e como um dev junior de potencial enorme; o usuario idealiza mas nem sempre sabe o
"como/onde". Faltava a peca que fica ENTRE os dois (e COM os dois): que conversa com o
usuario, estrutura, e entrega a LLM o trabalho ja definido — incluindo o que NAO fazer.

## Decisao
1. **Cerebro deterministico + LLM opcional** (honra ADR-0022, zero-dep): o orquestrador
   conduz a conversa por perguntas guiadas/regras; a LLM da IDE faz o trabalho pesado.
2. **Handoff** (`handoff()` + `renderHandoff()`): spec estruturada com objetivo, escopo,
   **nao_fazer**, alvos de codigo (scan+grep), onde, como, porque e fecho.
3. **Memoria de sessao** (`startSession`/`answerSession`/`loadSession`/`clearSession`):
   a conversa persiste em `.ai/runtime/session.json` e **resume** entre execucoes; ao
   esgotar as perguntas, anexa o handoff.
4. Exposto nas tres bocas: MCP (`os_handoff`, `os_session`), CLI (`handoff`, `session`) e a
   **extensao VSCode**, agora um **chat-orquestrador** (nao um painel de botoes): conversa,
   estrutura e entrega o handoff (copiar p/ a LLM / salvar `.ai/runtime/handoff.md`).

## Consequencias
- Menos desgaste do usuario (poucas perguntas certas) e da LLM (entrega definida, menos token).
- O fluxo Usuario -> Harness -> LLM fica explicito, persistente e retomavel.
- Tudo deterministico e zero-dep; plugar uma LLM propria no orquestrador e evolucao futura.
