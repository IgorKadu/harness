# State of the World — Harness
<!-- last-sync: 2026-05-30T18:38:54.069Z -->

> **Memória quente.** Reescrito a cada `/sync` (não é append-only). Alvo: ≤ 1200 tokens.
> Responde "onde paramos" sem nunca inchar. Profundidade histórica → `os recall <termo>`.

## Identidade
- **Projeto:** Harness — implementação de referência do AI Operating System no modelo Lean / Retrieval-First.
- **Origem:** reformulação do StealthOS (`C:\Users\PC\Documents\stealthos`), que validou a tese "inteligência na estrutura" mas inflou o contexto. Aqui o vetor é invertido: biblioteca consultada, não enciclopédia carregada.
- **Stakeholder:** Igor Araujo.

## Stack (confirmada)
- Node.js ≥ 18, ESM, **zero dependências**. Sem banco; estado em arquivos `.md`/`.json` locais.

## Onde paramos
- **Foco ativo:** estabilizacao para v0.1 usavel — autonomia, distribuicao e docs.
- **Ultimo marco:** ADR-0026 (operacao autonoma); sync inteligente (auto-scan); bin unificado `os mcp`; configs Claude Code/Antigravity/VSCode; scaffolder `os scaffold` (testado isolado em /tmp); README completo. CLI+MCP com 14 tools.
- **Proximo passo sugerido:** (a) publicar no GitHub/npm (push do usuario); (b) cockpit VSCode; (c) usar em projeto real e calibrar.


## Convenções
- CORE = só `CONSTITUTION.md` + este arquivo. Tudo mais é recuperado.
- Docs em PT-BR; sem emojis em código. Working-set por tarefa ≤ 15k tk; não cabe → decompor.
