---
name: work
description: Harness Lean AI OS — loop do dia-a-dia via MCP.
---
Modelo Lean / Retrieval-First (ADR-0022/0023). Protocolo completo em `.ai/CONSTITUTION.md`.
1. Chame a tool MCP `os_read_core` (CORE: CONSTITUTION + state-of-world).
2. Chame `os_work` com a intencao do usuario e carregue SO os <=5 arquivos retornados. Nada por garantia.
3. Codigo: grep/busca por simbolo na hora. Historico: `os_recall`.
4. Classifique trivial|simple|complex; em complex proponha plano e espere OK.
5. Ao fim, `os_remember tasks "<resumo>"` e feche com a linha `audit:`.
