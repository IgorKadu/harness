---
id: ADR-0025
slug: zero-dep-scan-and-code-map
status: proposed  # proposed | accepted | superseded-by-NNNN | deprecated
date: 2026-05-26
deciders: [founder, architect]
related:
  - ADR-0022   # Lean / Retrieval-First
  - ADR-0023   # Um cérebro, várias bocas
  - ADR-0024   # Comunicação adaptativa
---

# ADR-0025 — Analisador de varredura zero-dep + code-map consultável

## Contexto

O stakeholder descreveu a peça que falta: um mecanismo que "faz toda a varredura do que precisa — pastas, arquivos, códigos, estado atual do projeto" e entrega à LLM o necessário para direcionar a execução. Sem isso, o `retrieval-index` só conhece os arquivos de conhecimento (`.ai/knowledge`), não o **código real** do projeto — então a recuperação não acompanha o crescimento da base.

O StealthOS resolvia isso com **ts-morph** (AST TypeScript completo): preciso, porém é uma dependência pesada, lenta em bases grandes, e acoplada a TS/JS. O Harness é **zero-dependência** por princípio (ADR-0022/0023).

Tensão: precisamos de varredura útil **sem** quebrar o zero-dep nem inflar.

## Decisão

**Decidimos um analisador de varredura zero-dependência, baseado em regex, que gera um `code-map` pequeno e consultável; o código em si continua sendo lido por grep/busca no momento da tarefa (nunca pré-carregado).**

Mecânica:
1. **`scan`** percorre o projeto (ignorando `node_modules`, `.git`, `.ai`, `dist`, `build`, etc.), e para cada arquivo de código coleta, por regex: linguagem, nº de linhas, `exports` e `imports` (sinais, não AST). Detecta a **stack** por arquivos-âncora (`package.json`, `tsconfig`, `requirements.txt`, `Cargo.toml`, `go.mod`, `pom.xml`...). Marca **smells** simples (ex.: arquivo > 300 linhas).
2. Grava `.ai/runtime/code-map.json` — um índice **pequeno** (metadados, não conteúdo), gitignored e **regenerável**. Nunca é carregado inteiro no contexto.
3. **`searchCode`/`find`** consulta o code-map por termo (path/símbolo) e devolve os **top-N candidatos** (caminhos + porquê). O `os_work` passa a anexar esses candidatos como **ponteiros** — a LLM lê/grep só os que escolher, no momento da tarefa.

Assim a varredura **alimenta** a recuperação sem violar a invariante de contexto: o working-set continua função da tarefa, e o código entra sob demanda.

## Consequências

### Positivas
- Varredura real do projeto (pastas/arquivos/código/stack) — o Harness passa a acompanhar o crescimento.
- Zero-dependência preservado; rápido; funciona em qualquer linguagem (regex genérico + âncoras de stack).
- O code-map é pequeno e regenerável; não polui o git nem o contexto.
- `find` dá à LLM "onde está X" sem ela ler a base inteira.

### Negativas / Trade-offs aceitos
- Regex não entende semântica como AST: pode errar exports exóticos ou imports dinâmicos. Aceitável — o objetivo é *sinal para recuperação*, não refatoração automática. Precisão fina vem do grep/leitura no momento.
- +1 artefato de runtime (`code-map.json`) e +2 tools (`os_scan`, `os_find`) → 14 tools. Justificado: varredura é central ao produto; ainda muito abaixo do excesso do StealthOS.

### Neutras
- ts-morph (ou tree-sitter) fica como **opt-in futuro** para quem precisar de AST real (ADR próprio), sem virar default.

## Alternativas consideradas
- **ts-morph (modelo StealthOS)** — preciso, mas quebra zero-dep, é lento e só TS/JS. Descartado como default; reabrível como opt-in.
- **Sem code-map (só grep ao vivo)** — simples, mas a LLM não sabe *onde* procurar numa base grande sem um mapa. Descartado: o mapa é o que dá navegação.
- **Indexar tudo no retrieval-index.json** — inflaria o índice e o git. Descartado: code-map é runtime, separado e regenerável.

## Plano de implementação
1. Motor: `scan`, `loadCodeMap`, `searchCode`; `computeWorkingSet` anexa candidatos de código (ponteiros).
2. Bocas: CLI `scan`/`find`; MCP `os_scan`/`os_find`.
3. `/sync` passa a sugerir `scan` quando o code-map estiver ausente/obsoleto (futuro: invalidação por mtime).
4. Validação: rodar `scan` no próprio Harness; `find`; `work` com candidatos; doctor; smoke MCP.

## Impacto futuro
Se a precisão por regex se mostrar insuficiente num projeto específico, habilita-se um analisador AST opt-in (ts-morph/tree-sitter) que grava o **mesmo** formato de code-map — as bocas não mudam. Reverter = remover `scan`/`find` e o `code-map.json`; o núcleo retrieval-first permanece.

## Referências
- ADR-0022, ADR-0023, ADR-0024; `src/engine.mjs`
- Inspiração: Project State Engine do StealthOS (ts-morph) — aqui reimaginado zero-dep.

---

> **Lembrete**: ADR aceito não se edita. Mudança = novo ADR com `supersedes: ADR-NNNN`.
> Espelho histórico desta decisão também aparece em `.ai/memory/decisions-index.md`.
