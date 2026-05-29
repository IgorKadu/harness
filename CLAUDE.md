# CLAUDE.md — Entry Point (Harness · Lean AI OS)

> Modelo Lean / Retrieval-First (ADR-0022). O CORE é **mínimo**; tudo o mais é recuperado sob demanda.

## Operação autônoma (ADR-0026) — você aciona, o usuário só confirma o essencial
O usuário conversa normalmente; **você** aciona o Harness sozinho. Não exija comandos.
- **Trava boa (peça confirmação):** avançar de fase e aprovar plano de tarefa `complex`. Só isso.
- Todo o resto flui sem pausa.

## Protocolo (toda mensagem)
1. Leia **só** `.ai/CONSTITUTION.md` + `.ai/memory/state-of-world.md` (o CORE — ~1k tokens) — ou chame `os_brief`.
2. Para uma tarefa, prefira `os_orchestrate "<intenção>"` (ADR-0027): uma chamada devolve classificação + ≤5 arquivos + perguntas guiadas + decomposição + `actions`/`awaiting`. Siga o `awaiting` (só pausa em `user_answers`/`user_confirm_plan`). Use `os_work` quando quiser só o working-set, `os_session` para conduzir a conversa com o usuário e `os_handoff` para entregar a tarefa já definida (objetivo/escopo/não-fazer/onde/como). **Não leia nada por garantia.**
3. **Siga a postura da fase** que veio no brief/work (discovery questiona muito; execution executa; stabilization conclui).
4. Contexto de código vem de grep/símbolo no momento (use os candidatos do `os_work`/`os_find`).
5. Classifique (`trivial | simple | complex`); em `complex` proponha plano e espere OK.
6. Ao fechar: `os_remember` + `os_sync` (re-escaneia sozinho se o código mudou). Feche `simple/complex` com a linha `audit:`.

## Invariante (não negociável)
Custo de contexto = função da tarefa, não do projeto. Não cabe no orçamento → **decompor a tarefa**.

## Comunicação adaptativa (ADR-0024)
Antes de dialogar com o usuário, **leia a situação**: rode `node bin/os.mjs brief` (tool `os_brief`). Ele entrega fase, maturidade e a **postura de diálogo** — quanto questionar vs. executar:
- `discovery` → questione muito, alinhe objetivo/escopo antes de executar.
- `execution` → só o pontual que destrava a tarefa; foque em construir.
- `stabilization` → minimize escopo novo, enfatize concluir/estabilizar (sem loop infinito).

Avance a fase com `os phase <fase>`. Para onboarding (novo/existente), `os init` entrega as perguntas a conduzir. Para ver as opções disponíveis, `os caps` (tool `os_capabilities`).

## Duas bocas, um cérebro (ADR-0023)
Toda a lógica vive em `src/engine.mjs`. Você aciona pelo caminho disponível:
- **MCP conectado** (Claude Code com `.claude/settings.json`): chame as tools `os_read_core`, `os_brief`, `os_capabilities`, `os_work`, `os_route`, `os_init`, `os_phase`, `os_recall`, `os_remember`, `os_sync`, `os_doctor`, `os_tokens` — sem digitar comando.
- **Sem MCP** (fallback universal): rode o CLI `node bin/os.mjs <comando>`.

## Varredura do código (ADR-0025)
- `node bin/os.mjs scan` (tool `os_scan`) — mapeia código/stack/smells em `.ai/runtime/code-map.json` (regenerável). Rode no início e após mudanças grandes.
- `node bin/os.mjs find "<termo>"` (tool `os_find`) — acha arquivos/símbolos no code-map. O `work` já sugere candidatos de código — leia-os sob demanda (grep), não pré-carregue.

## Comandos úteis (CLI = espelho das tools MCP)
- `node bin/os.mjs work "<intenção>"` — recupera contexto + aplica orçamento.
- `node bin/os.mjs recall "<termo>"` — grep nos logs (sem carregar inteiro).
- `node bin/os.mjs remember <tasks|decisions|errors> "<txt>"` — registra na memória.
- `node bin/os.mjs doctor` — integridade do índice/CORE.
- `node bin/os.mjs tokens` — mede o CORE contra o teto.
- `node bin/os.mjs sync` — reescreve o state-of-world + mede.

## O que NÃO carregar
- `.ai/memory/logs/**` nunca é lido inteiro — só 