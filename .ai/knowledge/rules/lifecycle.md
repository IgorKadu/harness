# Lifecycle — desenvolver, escalar e estabilizar sem quebrar no meio

> Conhecimento recuperado sob demanda (opt-in, ADR-0022). Define COMO o Harness conduz
> qualquer projeto pelas tres fases sem perder o rumo nem inflar contexto. Espelha
> `navigation.POSTURE` (codigo) e o `LLM_CONTRACT` (relacao com a LLM).

## As tres fases (uma so verdade: `os phase`)
O ciclo de vida de qualquer projeto e `discovery -> execution -> stabilization`. A fase
nao e decorativa: ela **modula a postura de dialogo** da LLM e a acao recomendada.

| Fase | Intencao | Postura (questionamento) | Foco | Trava de seguranca |
|---|---|---|---|---|
| discovery | desenvolver a ideia | alto | explorar/alinhar | nao codar antes de objetivo+escopo |
| execution | construir | medio | entregar incrementos | confirmar desvio de escopo |
| stabilization | escalar/estabilizar | baixo-sugestivo | concluir | questionar escopo novo (anti-loop) |

Avancar fase e uma das **duas unicas travas** que pedem o usuario (a outra e aprovar plano
`complex`). Tudo o mais flui sem pausa (ADR-0026).

## Desenvolver (discovery -> execution)
1. `os init` detecta projeto novo vs existente e entrega as perguntas a conduzir.
2. Alinhe objetivo, escopo e o que NAO entra. O que se firmar vira ADR.
3. Ao ter rumo, `os phase execution`. A partir daqui a LLM constroi; pergunta so o pontual.
4. Cada tarefa: `os work "<intencao>"` recupera <=5 arquivos + orcamento. Nao carregue nada
   "por garantia" — a invariante de contexto e lei (custo = funcao da tarefa, nao do projeto).

## Escalar sem quebrar (a invariante que protege o crescimento)
Um projeto 10x maior **nao** pode custar 10x mais tokens por tarefa. Sinais e respostas:
- **Working-set estourou o cap** -> `os decompose`: quebrar a tarefa, nunca "carregar mais".
- **Arquivo virou smell (`large_file`)** -> `os gaps`/`os scan` apontam; divida o modulo
  (foi exatamente o que o ADR-0035 fez com o proprio engine).
- **Muitas intencoes parecidas sem rota** -> `os suggestRoutes` propoe novas rotas no indice.
- **Subtarefas paralelas** -> `spawnSubsessions` cria sessoes-filhas com progresso.
A regra de ouro: escalar = manter o **contexto por tarefa** constante enquanto o projeto cresce.

## Estabilizar (stabilization)
1. `os phase stabilization`: a postura passa a minimizar escopo novo e questionar scope creep.
2. `os doctor` precisa estar verde (CORE no orcamento, indice integro, fase valida).
3. Feche cada bloco com `os remember` + `os sync` (reescreve a memoria quente, re-scan se mudou).
4. Decisoes que firmaram rumo viram ADR. Logs sao append-only — nunca reescrever historico.
5. Encaminhe para "pronto": sugira melhorias sem abrir loops infinitos.

## Como isso evita "quebrar no meio do processo"
- **Memoria persistente** (state-of-world + logs + sessao) -> retomar sempre sabe "onde paramos".
- **Handoff/report** (ADR-0033) -> a LLM recebe spec completa e devolve o que fez; nada se perde
  entre execucoes.
- **Classificacao + plano em `complex`** -> mudanca arquitetural so anda apos OK; sem surpresa.
- **Fronteira Harness/LLM explicita** (`LLM_CONTRACT`) -> o deterministico cuida de estrutura,
  contexto e orcamento; a LLM cuida do raciocinio. Cada lado sabe o que NAO deve assumir.
