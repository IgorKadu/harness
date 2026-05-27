---
id: ADR-0026
slug: autonomous-operation-protocol
status: proposed  # proposed | accepted | superseded-by-NNNN | deprecated
date: 2026-05-26
deciders: [founder, architect]
related:
  - ADR-0022   # Lean / Retrieval-First
  - ADR-0023   # Um cérebro, várias bocas
  - ADR-0024   # Comunicação adaptativa
  - ADR-0025   # Varredura
---

# ADR-0026 — Operação autônoma: comandos como atalho, não como trava

## Contexto

No StealthOS o uso girava em torno de **3 comandos** que o usuário digitava: `/init`, `/sync`, `/work`. O stakeholder questionou (com razão): obrigar o usuário a pausar o progresso para digitar comando a cada passo parece uma **trava**. Mas "travas podem ser boas ou ruins" — algumas protegem o fluxo, outras só atrapalham.

Tensão a resolver: como ter início/meio/fim e disciplina de estado **sem** transferir ao usuário o fardo de orquestrar o OS manualmente, e sem a LLM se perder.

## Decisão

**Decidimos operação autônoma por padrão: a LLM aciona os mecanismos do Harness automaticamente; comandos existem como atalhos opcionais, não como obrigação. As únicas travas deliberadas são as "boas".**

### 1. Ambient por padrão (a LLM dirige o Harness)
O usuário conversa em linguagem natural. A LLM, guiada pelo protocolo (CONSTITUTION + descrições das tools), aciona o Harness sozinha:
- **Toda mensagem de tarefa** → chama `os_work <intenção>` (uma chamada já devolve postura + arquivos + candidatos de código + orçamento). Para conversa exploratória → `os_brief`.
- **Segue a postura da fase** (discovery questiona muito; execution executa; stabilization conclui).
- **Ao fechar um bloco** → `os_remember` + `os_sync` (que re-escaneia se o código mudou — ADR-0025).
- **Projeto fresco/desalinhado** → roda `os_init` proativamente.

### 2. Comandos = atalhos, não trava
`/init`, `/sync`, `/work` continuam existindo (nomes dos fluxos), úteis quando o usuário OU a LLM quer disparar algo **de propósito**. Mas o uso diário não exige digitá-los. São conveniência, não pedágio.

### 3. Travas boas (as únicas que pausam de propósito)
Dois pontos — e só dois — pedem confirmação humana explícita:
- **Mudança de fase** (`discovery → execution → stabilization`): muda o "contrato" de diálogo do projeto.
- **Aprovação de plano** em tarefa `complex` (≥4 arquivos ou decisão arquitetural): evita a LLM sair executando mudança grande sem alinhamento.

Essas travas dão o **início/meio/fim** e impedem o loop infinito, sem atritar o resto.

### Resumo do contrato de autonomia
| Situação | Quem aciona | Trava? |
|---|---|---|
| Tarefa do dia-a-dia | LLM chama `os_work` | não |
| Buscar histórico/código | LLM chama `os_recall`/`os_find` | não |
| Fechar bloco / manter estado | LLM chama `os_sync` (auto-scan) | não |
| Onboarding (novo/existente) | LLM roda `os_init` | leve (perguntas) |
| Avançar de fase | usuário decide | **sim (boa)** |
| Plano de tarefa complex | usuário aprova | **sim (boa)** |

## Consequências

### Positivas
- O loop Usuário→LLM→Harness→LLM→Usuário flui sem o usuário orquestrar nada.
- Início/meio/fim preservados pelas duas travas boas — sem loop infinito.
- Quem domina pouco de técnica não precisa saber comando nenhum: só conversa.
- Quem quer controle fino ainda tem os comandos como atalho.

### Negativas / Trade-offs aceitos
- A autonomia depende de a LLM seguir o protocolo. Mitigação: protocolo curto e imperativo na CONSTITUTION + descrições de tool que dizem "quando" usar cada uma + (opt-in) hook que injeta o lembrete. Não dependemos de hook para funcionar.
- Risco de a LLM acionar `os_work` em excesso. Mitigação: `os_work`/`os_brief` são baratíssimos (CORE ~1k tk) e determinísticos.

### Neutras
- Hooks de IDE (ex.: Claude Code `UserPromptSubmit`) ficam **opt-in** para reforçar a autonomia, não obrigatórios.

## Alternativas consideradas
- **Comandos obrigatórios (modelo StealthOS)** — previsível, mas é a trava ruim que o stakeholder identificou. Descartado como padrão.
- **Sem comandos, 100% inferido** — frictionless, mas remove o controle deliberado de fase/plano (as travas boas). Descartado: perde início/meio/fim.
- **Autonomia via hook obrigatório** — frágil (hooks quebram entre IDEs, lição do StealthOS). Descartado como dependência; vira opt-in.

## Plano de implementação
1. Reescrever o protocolo na CONSTITUTION e no CLAUDE.md/AGENTS.md no tom "a LLM aciona; você só confirma fase e planos grandes".
2. Descrições das tools MCP deixam explícito o "quando chamar sozinho".
3. `os_sync` re-escaneia quando o code-map está obsoleto (já em ADR-0025/sync inteligente).
4. Hook opt-in documentado (não default).

## Impacto futuro
Se a autonomia se mostrar agressiva ou tímida, ajusta-se o protocolo (texto) e as descrições das tools — sem mudar o motor. Reverter = voltar a exigir comandos no protocolo.

## Referências
- ADR-0022/0023/0024/0025; `.ai/CONSTITUTION.md`, `CLAUDE.md`
- Inspiração: assistentes que agem por intenção (não por comando), mantendo gates de confirmação em ações de alto impacto.

---

> **Lembrete**: ADR aceito não se edita. Mudança = novo ADR com `supersedes: ADR-NNNN`.
> Espelho histórico desta decisão também aparece em `.ai/memory/decisions-index.md`.
