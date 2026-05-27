---
id: ADR-0022
slug: lean-retrieval-first-context
status: proposed  # proposed | accepted | superseded-by-NNNN | deprecated
date: 2026-05-25
deciders: [founder, architect]
related:
  - ADR-0003   # AI-DOS v4 (Context Engine + Multi-agent + Gates) — o que inflou a superfície
  - ADR-0013   # Progressive init + LLM-aware full-context.md
  - ADR-0014   # Compaction strategy (markdown, não binário)
  - ADR-0021   # Lifecycle phases canônicas
supersedes_partial:
  - ADR-0013   # revisa o "carregar full-context.md monolítico sempre" do /work
---

# ADR-0022 — Arquitetura Lean / Retrieval-First: contexto mínimo suficiente por tarefa

## Contexto

O StealthOS foi criado sobre a tese (correta) de que *"a inteligência está na estrutura, não no modelo"* (`.ai/INDEX.md`). A implementação atual, porém, escala a dimensão errada: para vencer o limite de janela de contexto, ela **adiciona estrutura que consome a própria janela de contexto**. Isso é autodestrutivo conforme o projeto-alvo cresce.

### Dados medidos (2026-05-25, neste repositório)

| Métrica | Valor medido | Valor declarado | Gap |
|---|---|---|---|
| `.ai/` total (`.md`, fora de snapshots/node_modules) | ~245k tokens | — | — |
| Subpastas em `.ai/` | 214 | — | — |
| Arquivos `.md` em `.ai/` | 249 | — | — |
| `INDEX.md` | ~3.3k tokens | `tokens: ~1100` | **3×** |
| `ROUTER.md` | ~3.0k tokens | `tokens: ~1100` | **2.7×** |
| `memory/project-context.md` | ~2.6k tokens | `~varies` | — |
| **CORE real carregado por mensagem** | **~9–11k tokens** | `~2.5k` ("não exceder 3k") | **~4×** |
| `memory/completed-tasks.md` (append-only) | 47 KB e crescendo | — | sem teto |
| `memory/decisions.md` (append-only) | 27 KB e crescendo | — | sem teto |
| Superfície operacional | 82 tools MCP, 11 papéis de agente, 10 gates, 5 fases, 9 blueprints, 7 workflows | — | — |

### Sintoma reportado

> "No início de um projeto a configuração dá certo, mas quando avança para nível médio/avançado as coisas não se desenvolvem bem; minha produtividade junto com a LLM fica absurdamente prejudicada."

### Causa-raiz (não o sintoma)

É um problema de **economia de contexto e atenção**, disfarçado de problema de organização. O orçamento finito de atenção da LLM é disputado por quatro consumidores simultâneos:

1. a fatia relevante de um código que cresce;
2. logs de memória append-only que só incham;
3. o ritual fixo do protocolo (`OS:loaded` → classificar → ler INDEX/CONTRACT/ROUTER → aplicar ROUTER → `[OS Audit]`);
4. a tarefa em si.

No início, o item (1) é minúsculo e o imposto fixo (3) é tolerável. No nível médio/avançado, os quatro colidem. O `full-context.md` (ADR-0013) — "compilar tudo num arquivo único dimensionado pela LLM" — agrava o problema: é o **oposto de recuperação sob demanda**. É um blob que cresce com o projeto e cuja relação sinal/ruído por tarefa despenca.

O OS otimiza para **completude** ("documentar tudo, pré-carregar tudo que é relevante") quando o que escala é o **contexto mínimo suficiente por tarefa**.

## Decisão

**Decidimos inverter o vetor de escala: o StealthOS deixa de ser uma enciclopédia que ele *carrega* e passa a ser uma biblioteca que ele *consulta*.**

Adotamos a arquitetura **Lean / Retrieval-First**, regida por um princípio único e mensurável:

> **Invariante de contexto:** o custo de contexto de uma tarefa é função da *tarefa*, não do *tamanho do projeto*. Um projeto 10× maior não pode custar 10× mais tokens por tarefa.

Cinco pilares concretizam isso:

### Pilar 1 — CORE mínimo: uma "constituição" de ~500 tokens
Substituir o CORE de ~10k tokens por um arquivo único e curto com (a) as proibições inegociáveis (o essencial de `rules/dont.md`), (b) a invariante de contexto acima, e (c) uma única instrução operacional: *"para esta tarefa, carregue apenas o que o índice de recuperação apontar; nada por garantia."* `INDEX.md` e `ROUTER.md` deixam de ser carregados sempre — viram artefatos consultáveis sob demanda.

### Pilar 2 — Retrieval-First substitui o full-context monolítico (a maior alavanca)
O `/work` para de ler um `full-context.md` inteiro. Em vez disso, consulta um **índice de recuperação** pequeno (`runtime/retrieval-index.json`): um mapa `intenção/keyword → ≤5 caminhos`. O contexto de **código** vem de busca por símbolo/grep **no momento da tarefa**, nunca de um blob pré-compilado que envelhece entre syncs. O `full-context.md` é rebaixado a *fallback opcional* para LLMs sem ferramenta de busca de arquivos.

### Pilar 3 — A tarefa como unidade, com orçamento de contexto fixo
Cada tarefa recebe um *working-set* explícito e pequeno: objetivo, os 3–7 arquivos que ela toca, 1–2 decisões relevantes (por id), critério de aceite. Um teto declarado (ex.: ≤ 15k tokens de working-set por tarefa, independente do tamanho do projeto). Se a tarefa não cabe no orçamento, o sinal não é "carregar mais" — é **decompor a tarefa**. Complexidade fica plana porque é limitada *por tarefa*, não *por projeto*.

### Pilar 4 — Memória compilada (reescrita), não logs append-only
- **Estado quente:** um `memory/state-of-world.md` curto (~1k tokens), **reescrito** a cada sync (não append). Responde "onde paramos" sem inchar.
- **Log frio:** os append-only (`completed-tasks`, `decisions`, `errors-and-solutions`) **nunca são carregados inteiros** — só consultados por busca/grep quando uma tarefa pede profundidade.
- **Índice de decisões:** ADRs viram uma linha cada (`id | título | status`); o corpo carrega sob demanda.

### Pilar 5 — Superfície mínima (perfil "lean" por padrão)
Definir um perfil default com **3 comandos** (`/init`, `/sync`, `/work`) e **~6–10 tools** essenciais. As outras ~70 tools, os 11 papéis, os 10 gates e as 5 fases viram **opt-in** (perfil "full" / "enterprise"). Menos opções simultâneas = melhores decisões do modelo. Acrescentar um **medidor de tokens real** ao `aios_audit_drift`, falhando o gate se o CORE exceder o teto declarado (mata o drift silencioso visto na tabela acima).

## Consequências

### Positivas
- **Custo por tarefa desacoplado do tamanho do projeto** — o objetivo nº 1 (LLM eficaz no nível avançado).
- Mais orçamento de atenção sobra para o código real → menos alucinação, menos deriva.
- O CORE volta a ser honesto: ~500 tokens medidos, não ~10k mascarados de 2,5k.
- Memória para de crescer no caminho quente; o disco pode crescer, a janela não.
- Sistema mais simples de manter e de explicar a novos usuários (perfil lean).

### Negativas / Trade-offs aceitos
- LLMs/clients **sem** ferramenta de busca de arquivos (alguns chats puros) perdem o retrieval e dependem do `full-context.md` de fallback — pior experiência nesses ambientes. Aceitável: o público-alvo primário (Claude Code, Cursor, Cline, Antigravity) tem grep/leitura de arquivos.
- Recuperação por keyword pode errar o alvo em casos ambíguos; mitigado por fallback para CORE + pergunta de classificação (comportamento já previsto no ROUTER).
- Esforço de migração e reescrita de hooks/contrato; mitigado pelo plano incremental abaixo.

### Neutras
- O conhecimento profundo (governance, agents, specs, blueprints) **não é apagado** — só deixa de ser pré-carregado. Continua disponível via retrieval/opt-in.
- ADR-0014 (markdown, não binário) permanece válido: a mudança aqui é *quando/quanto* carregar, não *o formato*.

## Alternativas consideradas

### Alternativa A — Manter o modelo atual e só apertar o `full-context.md`
- Pros: zero migração.
- Cons: ataca o sintoma, não a causa; o blob continua crescendo com o projeto.
- **Descartada** porque viola a invariante de contexto (custo continua função do tamanho do projeto).

### Alternativa B — Sumarização agressiva por LLM (resumir tudo a cada sync)
- Pros: cabe na janela.
- Cons: resumo perde precisão (`path:linha`), introduz alucinação na própria memória, e custa tokens/latência a cada sync.
- **Descartada** porque troca um problema de volume por um de fidelidade.

### Alternativa C — RAG vetorial (embeddings do projeto inteiro)
- Pros: recuperação semântica forte em bases enormes.
- Cons: infra de embeddings/índice por sync, custo recorrente, complexidade alta para dev solo; grep + índice de keywords já cobre 90% dos casos.
- **Descartada por ora** como default; reabrível como opt-in para monorepos gigantes (ADR próprio).

## Critérios de decisão
| Critério | Peso | Atual (full-context) | Lean/Retrieval | RAG vetorial |
|---|---|---|---|---|
| Custo por tarefa em projeto grande | Alto | Ruim | **Ótimo** | Ótimo |
| Fidelidade (path:linha, sem alucinação) | Alto | Médio | **Alto** | Médio |
| Simplicidade / manutenibilidade | Alto | Baixo | **Alto** | Baixo |
| Compatibilidade de clients | Médio | Alta | Alta (c/ fallback) | Baixa |
| Esforço de migração | Médio | Nulo | Médio | Alto |

## Plano de migração (incremental e reversível)

Cada fase é um snapshot rotulado; rollback via `aios_build_rollback`. Nada é apagado — o modelo antigo coexiste atrás de um flag até a Fase 4.

1. **Fase 0 — Instrumentar.** Adicionar medidor de tokens real ao `aios_audit_drift`. Medir o CORE atual. Critério de saída: relatório de tokens por arquivo do CORE no `drift-report.md`.
2. **Fase 1 — CORE lean lado a lado.** Criar `CONSTITUTION.md` (~500 tokens) e `runtime/retrieval-index.json`. Manter INDEX/CONTRACT/ROUTER intactos. Flag `STEALTHOS_CONTEXT_MODE=lean|legacy` (default `legacy`). Critério: `lean` carrega ≤ 1k tokens de CORE.
3. **Fase 2 — `/work` retrieval-first.** Em modo `lean`, `/work` usa o índice + grep em vez do `full-context.md`. Rodar a eval-suite comparando `lean` vs `legacy` na mesma tarefa. Critério: paridade de qualidade com ≥ 60% menos tokens de contexto por tarefa.
4. **Fase 3 — Memória compilada.** Introduzir `state-of-world.md` (reescrito) + parar de carregar logs append-only no caminho quente. Critério: caminho quente de memória ≤ 1k tokens independente do tamanho dos logs.
5. **Fase 4 — Perfil lean como default.** Trocar default para `lean`; mover tools/agents/gates extras para opt-in (`full`). Atualizar `CLAUDE.md`, clients e scaffolder. Registrar promoção em `evolution/agent-evolution.md`.

## Métricas de sucesso (gate de aceitação do ADR)
- **Custo de contexto por tarefa** constante (±20%) entre um projeto pequeno e um 10× maior. *(esta é a métrica que valida o objetivo nº 1)*
- CORE medido ≤ 1k tokens em modo lean.
- Caminho quente de memória ≤ 1k tokens com logs de qualquer tamanho.
- Eval-suite: qualidade de resposta em `lean` ≥ qualidade em `legacy`, com ≥ 60% menos tokens.

## Impacto futuro
Se a recuperação por keyword se mostrar insuficiente em bases muito grandes, o caminho de evolução é o RAG vetorial **como opt-in** (Alternativa C), não o retorno ao blob monolítico. Reverter este ADR é barato até a Fase 3 (flag); após a Fase 4, reverter exige restaurar o default `legacy` — também suportado pelo flag.

## Referências
- `.ai/INDEX.md`, `.ai/CONTRACT.md`, `.ai/ROUTER.md` (CORE atual)
- ADR-0013 (full-context.md), ADR-0014 (compaction), ADR-0003 (inflação de superfície v4)
- Medições de tokens deste repositório (2026-05-25)

---

> **Lembrete**: ADR aceito não se edita. Mudança = novo ADR com `supersedes: ADR-NNNN`.
> Espelho histórico desta decisão também aparece em `.ai/memory/decisions.md` (append-only).
