# ADR-0035 — Engine modular por dominio + contrato LLM formal

- **Status:** aceito
- **Data:** 2026-06-03
- **Contexto anterior:** ADR-0023 (um cerebro, varias bocas), ADR-0024 (comunicacao
  adaptativa), ADR-0027 (orquestracao), ADR-0028 (handoff/sessao), ADR-0033 (canal LLM),
  ADR-0034 (turbina/automacoes).

## Problema
Toda a logica vivia num unico `src/engine.mjs` de ~1000 linhas (smell `large_file` que o
proprio `os scan` apontava). Um cerebro unico cumpriu a tese do ADR-0023, mas o arquivo
unico dificultava evoluir um dominio sem reler o todo, escondia as fronteiras entre
roteamento, memoria, varredura, orquestracao, sessao e canal, e — pior — deixava a
**relacao com a LLM** implicita (apenas um hook `setLLM/assist` perdido no fim do arquivo).
Para um OS cuja promessa e ajudar o usuario a **desenvolver, escalar e estabilizar sem
quebrar no meio**, a propria casa precisava ser modular e a divisao de trabalho
Harness(deterministico) x LLM(raciocinio) precisava ser explicita.

## Decisao
**Modularizar o engine por dominio, mantendo uma fachada (barrel) que preserva 100% da
superficie publica, e formalizar a relacao Harness<->LLM num contrato declarativo.**

Layout:

    src/
      engine.mjs          # FACHADA: so re-exporta. Zero logica. Compat total.
      core/
        paths.mjs         # constantes de caminho (ROOT, PROJECT_ROOT, AI, ...)
        util.mjs          # readIfExists, estimateTokens, norm, loadIndex, fileTokens
      modules/
        routing.mjs       # route, computeWorkingSet
        tokens.mjs        # measureCore, readCore, doctor, sync
        memory.mjs        # LOGS, recall, remember (append-only)
        navigation.mjs    # fase/maturidade/postura/capabilities/brief/onboarding (ADR-0024)
        codemap.mjs       # scan, searchCode, codeMapStale (ADR-0025)
        orchestrate.mjs   # classify, decompose, orchestrate (ADR-0027)
        session.mjs       # sessao + handoff spec (ADR-0028)
        gaps.mjs          # "o que falta" (ADR-0028)
        channel.mjs       # handoff.md / report.md (ADR-0033)
        turbine.mjs       # inspect/analyze/pipeline/automations (ADR-0034)
        extensions.mjs    # subtarefas, rotas, metricas, templates
      llm/
        contract.mjs      # LLM_CONTRACT + setLLM/hasLLM/assist

O contrato (`LLM_CONTRACT`, exposto por `llmContract()`) declara: papeis (o que o Harness
faz e nao faz; o que a LLM faz e nao faz), a **fronteira** de quem decide cada coisa
(contexto/orcamento/classificacao/dialogo = Harness; implementacao/plano = LLM;
aprovacao = usuario), a postura por fase e o protocolo de troca por arquivos (handoff/report).

## Invariantes preservadas (nao-quebra)
- **Zero dependencias**, ESM puro, Node >= 18.
- Todas as bocas continuam fazendo `import * as engine from "../src/engine.mjs"` — nada muda
  para CLI (`bin/os.mjs`), MCP (`server/mcp.mjs`) e web (`server/web.mjs`).
- Os corpos de funcao foram movidos sem alteracao de comportamento; a superficie de 58
  exports historicos permanece identica (so foram adicionados `LLM_CONTRACT` e `llmContract`).
- Ciclos entre modulos (routing<->navigation<->codemap<->orchestrate<->session<->channel)
  sao seguros: toda referencia cruzada ocorre dentro de corpos de funcao (ESM live-bindings),
  nunca na avaliacao de topo do modulo.

## Consequencias
### Positivas
- O smell `large_file` do engine desaparece; cada modulo cabe na cabeca (e no orcamento).
- Evoluir um dominio le/edita um arquivo pequeno, alinhado a invariante de contexto (ADR-0022).
- A relacao com a LLM deixa de ser implicita: vira doc viva e consultavel (tool/brief).
- `os find`/`searchCode` ficam mais precisos (simbolos por modulo, nao um blob unico).

### Negativas / Trade-offs aceitos
- Mais arquivos para navegar; mitigado pela fachada e pelo code-map.
- Pequena indirecao de import; custo nulo em runtime.

## Alternativas consideradas
- **Manter o monolito** — descartada: o proprio scan ja sinalizava o smell e a fronteira
  LLM seguia implicita.
- **Quebrar e atualizar os imports dos consumidores** — descartada nesta etapa: a fachada
  entrega o mesmo beneficio sem tocar CLI/MCP/web (menor risco).

## Impacto futuro
Reverter e barato (a fachada poderia reconcatenar), mas improvavel. Novos dominios entram
como `modules/<dominio>.mjs` + uma linha de re-export. O contrato LLM evolui por versao
(`LLM_CONTRACT.versao`).
