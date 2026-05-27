---
description: Loop do dia-a-dia (retrieval-first). Recupera so o contexto da tarefa.
---
Voce vai trabalhar numa tarefa no modelo Lean / Retrieval-First (ADR-0022/0023).

1. Chame a tool MCP `os_read_core` (ou leia `.ai/CONSTITUTION.md` + `.ai/memory/state-of-world.md`).
2. Chame `os_work` com a intencao: **$ARGUMENTS**. Carregue SO os <=5 arquivos retornados. Nada por garantia.
3. Contexto de codigo: grep/busca por simbolo no momento da tarefa. Historico: `os_recall`.
4. Classifique: trivial | simple | complex. Em complex, proponha plano curto e espere OK.
5. Ao terminar (simple/complex), registre com `os_remember tasks "<resumo>"` e feche com a linha `audit:`.
