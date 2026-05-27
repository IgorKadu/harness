# AGENTS.md — Entry Point genérico (Harness · Lean AI OS)

> Para qualquer agente/LLM (Codex, Cursor, Cline, Aider, etc.). Mesmo protocolo do `CLAUDE.md`.

## Autonomia (ADR-0026)
Voce aciona o Harness sozinho; o usuario so confirma mudanca de fase e plano de tarefa complex. Nao exija comandos.

## Em 4 passos
1. CORE = só `.ai/CONSTITUTION.md` + `.ai/memory/state-of-world.md`. Leia esses dois primeiro (ou chame a tool MCP `os_read_core`).
2. Rode `node bin/os.mjs work "<intenção da tarefa>"` (ou a tool MCP `os_work`) para saber quais ≤5 arquivos carregar. Nada além disso.
3. Código → grep/busca por símbolo na hora. Histórico → grep em `.ai/memory/logs/` (nunca inteiro).
4. Classifique (`trivial | simple | complex`); feche `simple/complex` com a linha `audit:`.

## Invariante
Contexto por tarefa, não por projeto. Estourou o orçamento (`os work` avisa) → decomponha a tarefa.

## Proibições (ver CONSTITUTION para a lista completa)
Não inventar APIs/resultados; não apagar trabalho sem confirmação; não editar CONSTITUTION/regras/ADR aceito sem ADR; logs são append-only.

Detalhes: `.ai/CONSTITUTION.md` · Fundamento: `.ai/specs/ADR/ADR-0022-lean-retrieval-first-context.md`.
