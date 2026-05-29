# Roadmap — Orquestrador do Harness

Estado atual (v0.3.0): orquestrador determinístico (zero-dep) com pacote de interação,
decomposição, handoff estruturado, memória de sessão persistente, MCP (18 tools), CLI
amigável e extensão chat-orquestrador. Abaixo, o que acelera ainda mais o desenvolvimento
sem perder qualidade — em ordem sugerida.

## Curto prazo
1. ✅ **Retomada robusta de `awaiting`** — reabrir uma sessão e continuar exatamente do ponto,
   inclusive após troca de fase; histórico completo no painel.
2. ✅ **Handoff mais preciso (o que falta)** — cruzar `scan`/smells + rotas para apontar
   lacunas concretas ("falta teste em X", "endpoint Y sem validação").
3. ✅ **Ações executáveis de verdade na extensão** — botões que rodam `scan`/`work`/`decompose`
   e realimentam a sessão (hoje mostram a saída; passo seguinte é alimentar o handoff).
4. ✅ **`os install` para mais alvos** — Cursor, Cline/Continue, Windsurf; detecção automática.

## Médio prazo
5. ✅ **LLM opcional no orquestrador** — hook plugável (ex: Claude API com chave do usuário)
   para conversas livres, mantendo o determinístico como padrão zero-dep.
6. ✅ **Subtarefas como sessões filhas** — decompor cria sessões ligadas; o handoff de cada uma
   herda contexto da mãe; progresso agregado.
7. ✅ **Aprendizado de rotas** — sugerir novas entradas no `retrieval-index.json` a partir do
   histórico de intenções (recall), aprovado pelo usuário.

## Longo prazo
8. ✅ **Painel web standalone** (mesma engine via CLI/MCP) para quem não usa VSCode.
9. ✅ **Métricas de economia** — medir tokens/contexto poupados por tarefa vs. baseline.
10. ✅ **Templates de projeto** — handoffs e rotas pré-prontos por tipo (API, web, CLI, lib).
