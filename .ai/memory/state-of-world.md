# State of the World — Harness
<!-- last-sync: 2026-06-06T02:45:59.069Z -->

> **Memória quente.** Reescrito a cada `/sync` (não é append-only). Alvo: ≤ 1200 tokens.
> Responde "onde paramos" sem nunca inchar. Profundidade histórica → `os recall <termo>`.

## Identidade
- **Projeto:** Harness — implementação de referência do AI Operating System no modelo Lean / Retrieval-First.
- **Origem:** reformulação do StealthOS (`C:\Users\PC\Documents\stealthos`), que validou a tese "inteligência na estrutura" mas inflou o contexto. Aqui o vetor é invertido: biblioteca consultada, não enciclopédia carregada.
- **Stakeholder:** Igor Araujo.

## Stack (confirmada)
- Node.js ≥ 18, ESM, **zero dependências**. Sem banco; estado em arquivos `.md`/`.json` locais.

## Onde paramos
- **Foco ativo:** estabilizacao CONCLUIDA em v0.9.0 (16 modulos, 39 tools, 36 testes, Smells=0, CI 18/20/22). Opcionais restantes: JSDoc/checkJs + migracao de schema no update; depois publicar.
- **Ultimo marco:** v0.9.2 — curadoria/pente-fino (ADR-0043): fix do detectStack (stack do PROJETO, nao do .harness), removida msg fantasma de extensao, 9 imports orfaos limpos, engine strings apontando p/ tools do nucleo, docs (README/CONNECT/AGENTS/ROADMAP) realinhados. Antes: ADR-0042 (superficie MCP curada ~20 tools), ADR-0041 (forma+verify). Tudo verde: 37 testes, doctor, Smells=0.
- **Proximo passo sugerido:** (a) usar em projeto real e calibrar; (b) JSDoc/checkJs (opcional); (c) publicar no GitHub/npm (push do usuario).


## Convenções
- CORE = só `CONSTITUTION.md` + este arquivo. Tudo mais é recuperado.
- **Idioma (ADR-0036):** sistema/código/docs/knowledge/ADRs em **inglês**; diálogo com o usuário em **português** até ele pedir outra língua.
- Sem emojis em código. Working-set por tarefa ≤ 15k tk; não cabe → decompor.
