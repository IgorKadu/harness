---
id: ADR-0023
slug: one-brain-many-mouths
status: proposed  # proposed | accepted | superseded-by-NNNN | deprecated
date: 2026-05-26
deciders: [founder, architect]
related:
  - ADR-0022   # Lean / Retrieval-First (fundamento)
  - ADR-0012   # StealthOS hybrid architecture (origem do daemon MCP)
  - ADR-0016   # tool roles + orphan policy (origem da inflação de 82 tools)
---

# ADR-0023 — Um cérebro, várias bocas: motor único + adaptadores finos (CLI, MCP, extensão)

## Contexto

ADR-0022 estabeleceu o modelo Lean / Retrieval-First e o CLI `bin/os.mjs` provou a invariante de contexto (CORE ~1k tk; working-set por tarefa desacoplado do tamanho do projeto). Surgiu a pergunta estratégica do stakeholder:

> "MCP e a extensão de IDE são válidos/úteis, ou é melhor tudo num motor de scripts que a LLM aciona? Quero o loop Usuário→LLM→Harness→LLM→Usuário fluindo perfeitamente, em projetos novos e existentes, independente da LLM ou do nível do usuário."

O StealthOS já tinha um daemon MCP "híbrido" (ADR-0012), mas cometeu dois erros que este ADR corrige:
1. **Inflou a superfície** — 82 tools, 11 agentes, 10 gates (ADR-0016) — virando difícil de a LLM manejar.
2. **Misturou camadas** — conhecimento pré-carregado + transporte + UI no mesmo balaio, sem uma fonte da verdade única.

A dúvida "scripts vs. MCP vs. extensão" parte de uma falsa dicotomia: são **camadas distintas**, não alternativas.

## Decisão

**Decidimos a arquitetura "um cérebro, várias bocas": um motor determinístico único é a fonte da verdade; CLI, MCP e extensão são adaptadores finos que importam o mesmo motor e nunca duplicam lógica.**

### Camada 1 — Motor (`src/engine.mjs`) · o cérebro
Funções puras, sem `console`/`process.exit`, retornando dados: `route`, `computeWorkingSet`, `measureCore`, `doctor`, `sync`, `recall` (grep nos logs), `remember` (append nos logs), `readCore`, e futuramente `scan` (analisador). Independe de IDE e de LLM. É onde mora toda a varredura, roteamento, orçamento e estado.

### Camada 2 — Adaptadores · as bocas (todos importam a Camada 1)
- **CLI (`bin/os.mjs`)** — renderiza o motor no terminal. Funciona em **qualquer** ambiente com Node e acesso a arquivos (inclusive chat puro). É o fallback universal.
- **MCP (`server/mcp.mjs`)** — casca fina JSON-RPC/stdio (zero-dep). Expõe **6–8 tools no máximo** (`os_work`, `os_route`, `os_recall`, `os_remember`, `os_sync`, `os_doctor`, `os_tokens`, `os_read_core`). É o que faz o loop fluir sem fricção: a própria LLM aciona o Harness quando percebe que precisa de contexto, sem o usuário digitar comando. **Disciplina:** acrescentar uma tool exige justificativa; o teto é baixo de propósito.
- **Extensão VSCode (cockpit)** — UI/status/painel. **Adiada** por ser a camada mais cara e a menos essencial; reusará a base `stealthos-vscode`. Quando vier, também só chama o motor (via daemon HTTP do mesmo `server/`).

### Princípio inquebrável
Nenhum adaptador contém regra de negócio. Se uma boca precisa de lógica nova, ela entra no **cérebro** e todas as bocas ganham de graça. Isso impede o retorno do drift e da duplicação que afundaram o StealthOS.

### Alvos iniciais (suporte progressivo)
Claude Code (MCP stdio + slash commands + hooks) e Antigravity (MCP stdio + workflows). VSCode entra primeiro via MCP e depois ganha o cockpit dedicado. Mais clientes (Cursor, Cline, Continue) são adaptadores de config triviais sobre o mesmo `server/mcp.mjs`.

## Consequências

### Positivas
- O loop Usuário→LLM→Harness→LLM→Usuário flui nativamente (MCP) sem perder o fallback universal (CLI).
- Uma fonte da verdade → zero duplicação, zero drift entre interfaces.
- Superfície pequena por design → a LLM maneja bem; o usuário não se perde.
- Funciona independente da LLM (motor determinístico) e do nível do usuário (entry docs em linguagem simples + diálogo guiado pelo motor).
- Novos clientes = só um arquivo de config; a extensão pode atrasar sem bloquear nada.

### Negativas / Trade-offs aceitos
- Implementar MCP stdio à mão (zero-dep) exige cuidado com o protocolo (`initialize`/`tools/list`/`tools/call`). Mitigado por testes via pipe.
- VSCode "puro" não fala MCP; o suporte perfeito lá depende da extensão-cockpit (fase posterior) ou de uma extensão de agente. Aceito conscientemente.

### Neutras
- O analisador de projeto (varredura com AST) entra como função do motor (`scan`) numa fase própria; o StealthOS fornece a base reaproveitável (ts-morph).

## Alternativas consideradas

### Alternativa A — Só CLI/scripts (sem MCP)
- Pros: simplicidade máxima, roda em todo lugar.
- Cons: o loop trava — alguém precisa invocar o script manualmente a cada tarefa.
- **Descartada como modelo final** (fica como fallback): não entrega o fluxo nativo que o stakeholder pediu.

### Alternativa B — MCP/daemon "gordo" como cérebro (modelo StealthOS)
- Pros: tudo num lugar, recursos ricos.
- Cons: foi exatamente o que inflou (82 tools); acopla lógica ao transporte.
- **Descartada** por reintroduzir o problema do ADR-0022/0016.

### Alternativa C — Extensão primeiro (UI-led)
- Pros: experiência visual imediata.
- Cons: camada mais cara, amarra a um único IDE, não serve LLMs em chat/CLI.
- **Descartada por ora**; vira fase posterior sobre o motor já pronto.

## Critérios de decisão
| Critério | Peso | Só CLI | MCP gordo | **Cérebro+bocas** |
|---|---|---|---|---|
| Loop sem fricção | Alto | Baixo | Alto | **Alto** |
| Anti-bloat / manutenibilidade | Alto | Alto | Baixo | **Alto** |
| Cobertura de ambientes | Alto | Alto | Médio | **Alto** |
| Esforço inicial | Médio | Baixo | Alto | Médio |

## Plano de implementação (fases)
1. **Refator do motor** — extrair `src/engine.mjs` (puro); `bin/os.mjs` vira renderer. Regressão: CLI idêntico.
2. **MCP fino** — `server/mcp.mjs` (stdio, zero-dep) com 6–8 tools sobre o motor. Teste via pipe (`tools/list`, `tools/call`).
3. **Configs de cliente** — `.claude/settings.json` (+ slash commands) e `.agents/workflows/` (Antigravity).
4. **Analisador (`scan`)** — fase própria; reusa ts-morph do StealthOS; alimenta `state-of-world` + índice de código.
5. **Cockpit VSCode** — fase final; reusa `stealthos-vscode`; consome o daemon HTTP do mesmo motor.

## Impacto futuro
Se MCP evoluir ou um cliente exigir transporte diferente (HTTP, websockets), é só mais uma boca sobre o mesmo cérebro — custo baixo. Reverter este ADR significaria recolapsar as camadas, o que o ADR-0022 já mostrou ser regressivo.

## Referências
- ADR-0022 (Lean/Retrieval-First), ADR-0012 (hybrid), ADR-0016 (tool roles)
- `bin/os.mjs` (CLI atual), `.ai/retrieval-index.json`

---

> **Lembrete**: ADR aceito não se edita. Mudança = novo ADR com `supersedes: ADR-NNNN`.
> Espelho histórico desta decisão também aparece em `.ai/memory/decisions-index.md`.
