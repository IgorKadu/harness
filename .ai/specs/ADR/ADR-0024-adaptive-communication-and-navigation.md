---
id: ADR-0024
slug: adaptive-communication-and-navigation
status: proposed  # proposed | accepted | superseded-by-NNNN | deprecated
date: 2026-05-26
deciders: [founder, architect]
related:
  - ADR-0022   # Lean / Retrieval-First
  - ADR-0023   # Um cérebro, várias bocas
---

# ADR-0024 — Comunicação adaptativa + navegação interna (protocolo LLM↔Harness)

## Contexto

O Harness já recupera contexto sob orçamento (ADR-0022) por um motor único exposto em várias bocas (ADR-0023). Falta a camada que o stakeholder considera fundamental: **comunicação**.

Problema observado: o usuário interage primeiro com a LLM e nem sempre tem o conhecimento técnico/negócio/arquitetura para tomar decisões corretas ou dentro do escopo. Sem um processo nativo entre LLM e Harness:
- a LLM dialoga "no escuro", sem saber onde o projeto está nem para onde vai;
- o diálogo não calibra com a maturidade do projeto (mesmo tom no dia 1 e no dia 200);
- o desenvolvimento vira loop infinito por não ter ênfase em estabilizar/concluir;
- a LLM não sabe o que o Harness pode fazer naquele momento (sem "menu" de opções).

## Decisão

**Decidimos um protocolo de comunicação adaptativa em que o Harness é a fonte de situação e de opções, e a LLM é a interface de diálogo — calibrada pela fase do projeto.**

Três mecanismos, todos como funções determinísticas do motor (ADR-0023):

### 1. Ciclo em 3 fases + maturidade automática
- **Fases** (estado persistido em `.ai/project.json`): `discovery → execution → stabilization`. Avançam/retrocedem explicitamente; cada transição é registrada no log (nada se perde).
- **Maturidade** (inferida, não setada): `nascent | forming | mature`, derivada de sinais — nº de ADRs, entradas nos logs, tamanho do `retrieval-index`, presença de código.
- A combinação fase×maturidade produz a **postura de diálogo**:
  - `discovery` → questionamento **alto**, foco *explorar*: alinhar objetivo, escopo e direção antes de executar.
  - `execution` → questionamento **médio**, foco *construir*: só o pontual que destrava a tarefa; executar alinhado ao rumo.
  - `stabilization` → questionamento **baixo, porém sugestivo**, foco *concluir*: minimizar escopo novo, questionar scope creep, enfatizar finalizar/estabilizar. Melhorias são bem-vindas em qualquer fase, mas sem reabrir loops.

> A intensidade do diálogo **decai** ao longo do ciclo de propósito — muitos diálogos no início, pontuais no meio, conclusivos no fim. Início, meio e fim fazem parte do processo.

### 2. Navegação interna — `os_capabilities`
O Harness "sabe tudo sobre si" e **informa a LLM** as opções disponíveis naquele estado (como o wizard do CLI do StealthOS, só que entre Harness e LLM): lista de ações, quando usar cada uma, e a **ação recomendada** dada a postura atual. A LLM escolhe; o Harness executa e entrega. A inteligência da escolha fica na LLM; o conhecimento das opções, no Harness.

### 3. Situação estruturada — `os_brief`
Resposta única que entrega à LLM, **adaptada ao nível do projeto**: fase, maturidade, postura (com a instrução de como conversar agora), ponteiro do CORE e o próximo passo recomendado. É o que a LLM lê antes de falar com o usuário, para alinhar o diálogo tanto ao pedido quanto ao rumo do projeto. O `os_work` (retrieval por tarefa) passa a anexar a postura, para a recuperação também sair calibrada.

### 4. Onboarding guiado — `os_init` (novo vs. existente)
O Harness detecta se o projeto é **novo** (vazio/sem código/contexto não preenchido) ou **existente** (tem código/histórico) e serve à LLM um **banco de perguntas** (`.ai/bootstrap/questions.json`) adequado ao caso, que a LLM conduz com o usuário:
- **Novo:** objetivo, tipo, stack, escopo, restrições, definição de "pronto".
- **Existente:** confirma o estado detectado, objetivo daqui pra frente, o que não mexer, dívidas, próximo marco.
Em ambos, o que se firma vira ADR + `os_remember`; os "vai e vem" não quebram nada porque o histórico é append-only e o `state-of-world` é reescrito.

## Consequências

### Positivas
- A LLM passa a dialogar **alinhada à situação real** do projeto, não no escuro.
- O tom calibra sozinho com fase/maturidade → menos atrito, sem loop infinito.
- O Harness vira navegável: a LLM sempre sabe quais são suas opções e a recomendada.
- Funciona para quem não domina o técnico: o Harness guia, a LLM traduz.
- Tudo determinístico → independe da esperteza da LLM para a parte mecânica.

### Negativas / Trade-offs aceitos
- +2 arquivos de dados (`project.json`, `bootstrap/questions.json`) e +4 tools MCP (total ~12). Aceitável: ainda muito abaixo do excesso do StealthOS, e a superfície segue justificada uma a uma.
- A inferência de maturidade por sinais é heurística; pode ser recalibrada (mensurável via doctor).

### Neutras
- Postura é *orientação*, não trava: instrução direta do usuário continua vencendo (exceto `dont`).

## Alternativas consideradas
- **Diálogo livre sem fase** — descartado como padrão: não dá controle de "início/meio/fim" nem evita o loop infinito.
- **6 fases estilo StealthOS** (discovery→planning→execution→validation→delivery→retrospective) — descartado por ora: mais granular, porém mais pesado de manter e de a LLM seguir; reabrível se necessário.

## Plano de implementação
1. `.ai/project.json` (estado de fase) + `.ai/bootstrap/questions.json` (banco de perguntas).
2. Motor: `getState/setPhase`, `maturity`, `posture`, `capabilities`, `brief`, `detectKind/initPlan`; `computeWorkingSet` anexa postura.
3. Bocas: comandos CLI (`phase`, `caps`, `brief`, `init`) + tools MCP (`os_phase`, `os_capabilities`, `os_brief`, `os_init`).
4. Doctor valida `project.json` e a fase. Validação: 3 posturas, smoke MCP, doctor.

## Impacto futuro
Se a calibração por fase se mostrar insuficiente, evolui-se a função `posture` (uma só) sem tocar nas bocas. Reverter = remover as 4 tools e os 2 arquivos; o núcleo retrieval-first (ADR-0022/0023) permanece intacto.

## Referências
- ADR-0022, ADR-0023; `src/engine.mjs`, `.ai/retrieval-index.json`
- Inspiração: wizard de `/init` do StealthOS (CLI guiado) — agora entre Harness e LLM.

---

> **Lembrete**: ADR aceito não se edita. Mudança = novo ADR com `supersedes: ADR-NNNN`.
> Espelho histórico desta decisão também aparece em `.ai/memory/decisions-index.md`.
