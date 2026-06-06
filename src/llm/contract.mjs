// Harness — Lean AI OS · LLM/contract
// A RELACAO Harness <-> LLM, formalizada. O Harness e deterministico (estrutura,
// contexto, orcamento, memoria); a LLM e o raciocinio (codigo, decisao, redacao).
// Este modulo define a fronteira e oferece o hook plugavel (default: determinismo).

// ---------------------------------------------------------------------------
// CONTRATO (definicao declarativa — serve de doc viva p/ a LLM e a UI)
// ---------------------------------------------------------------------------
export const LLM_CONTRACT = {
  versao: 1,
  principio: "Um cerebro, duas pontas (ADR-0023). A logica vive no engine; a LLM raciocina sobre o que o engine entrega.",
  papeis: {
    harness: {
      e: "motor deterministico, zero-dep",
      faz: ["mapear estrutura/codigo (scan)", "recuperar working-set <=5 arquivos", "medir orcamento de tokens", "classificar tarefa", "conduzir o dialogo (orchestrate/session)", "persistir memoria (logs append-only)", "montar o handoff"],
      nao_faz: ["escrever codigo de negocio", "tomar decisao de produto", "inventar fatos/resultados de execucao"],
    },
    llm: {
      e: "raciocinio sobre o contexto entregue",
      faz: ["implementar/editar codigo", "propor plano em tarefa complex", "redigir docs/decisoes", "interpretar o handoff e agir"],
      nao_faz: ["carregar arquivos 'por garantia' fora do working-set", "editar CONSTITUTION/rules/ADR aceito sem ADR", "apagar trabalho sem confirmacao", "push --force em main"],
    },
  },
  // Fronteira: o que cada lado decide. A LLM consulta isto p/ saber quando NAO assumir.
  fronteira: {
    contexto: "harness",     // quais arquivos entram
    orcamento: "harness",    // cabe ou decompoe
    classificacao: "harness",// trivial|simple|complex
    dialogo: "harness",      // perguntas guiadas / sessao
    implementacao: "llm",    // o codigo em si
    plano_complex: "llm",    // proposta; usuario aprova
    aprovacao: "user",       // avancar fase e aprovar plano complex
  },
  // Como a postura por fase modula o comportamento da LLM (espelha navigation.POSTURE).
  postura_por_fase: {
    discovery: "questione muito; alinhe objetivo/escopo antes de codar",
    execution: "pergunte so o pontual; construa alinhado ao rumo",
    stabilization: "minimize escopo novo; conclua e estabilize sem loops",
  },
  // Protocolo de troca via arquivos (ADR-0033): handoff (Harness->LLM), report (LLM->Harness).
  troca: {
    handoff: ".harness/.ai/handoff.md — diretrizes que a LLM deve seguir",
    report: ".harness/.ai/report.md — o que a LLM fez; o Harness le na proxima interacao",
  },
};

// Devolve o contrato (para tool os_llm_contract / brief estendido).
export function llmContract() { return LLM_CONTRACT; }
