# AGENTS.md — Entry Point genérico (Harness · Lean AI OS)

> Para qualquer agente/LLM (Codex, Cursor, Cline, Aider, etc.). Mesmo protocolo do `CLAUDE.md`.

## Autonomia (ADR-0026)
Voce aciona o Harness sozinho; o usuario so confirma mudanca de fase e plano de tarefa complex. Nao exija comandos.

## Protocolo (toda mensagem)
0. **Cápsula primeiro (ADR-0040/0042).** Chame a tool `os_start` (ou `node bin/os.mjs start "<intenção>"`) — UM pacote barato com foco + saves (e o que está stale) + postura + `nextAction`. **Aja na nextAction**; não re-rode fluxos pesados para o que ela já respondeu.
1. Para uma tarefa, `os_orchestrate "<intenção>"` (classifica + perguntas + decompõe + ações). Tarefa grande/repo-wide? `os_assess` decide entre passe único e escalar (não moa um contexto só).
2. Código → grep/símbolo na hora (`os_find`); histórico → `os_recall` (nunca log inteiro). Carregue só os ≤5 arquivos do working-set.
3. Mantenha o fio com `os_focus set` quando o passo mudar. Valide com `os_validate` (nunca declare verde sem rodar).
4. Feche com `os_report` + `os_remember` + `os_sync` + `os_save_checkpoint` (estrutural = todas as camadas).

## Invariante
Contexto por tarefa, não por projeto. Estourou o orçamento → decomponha a tarefa.

## Proibições (ver CONSTITUTION para a lista completa)
Não inventar APIs/resultados; não apagar trabalho sem confirmação; não editar CONSTITUTION/regras/ADR aceito sem ADR; logs são append-only.

Detalhes: `.ai/CONSTITUTION.md` · Fundamento: `.ai/specs/ADR/ADR-0022-lean-retrieval-first-context.md`.
