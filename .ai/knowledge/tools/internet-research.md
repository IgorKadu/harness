---
version: 1.0.0
updated: 2026-05-14
tier: conditional
tokens: ~350
load: research, docs, latest
triggers: documentação, docs, latest, recente, mudou, release
---

# Tool: Pesquisa na Internet

## Quando usar

- Documentação de biblioteca/API que você não tem certeza sobre versão atual.
- Erro com mensagem específica que não está em `memory/errors-and-solutions.md`.
- Mudança recente em ecossistema (ex: nova versão de framework liberada após knowledge cutoff).
- Comparação de bibliotecas/abordagens para uma decisão arquitetural.

## Quando NÃO usar

- Pergunta respondível lendo o próprio repositório.
- Conhecimento já validado em `memory/` ou `evolution/`.
- Sintaxe básica de linguagem (verifique se realmente não sabe antes de buscar).

## Protocolo

1. **Formular query específica.** "react 19 use hook" > "react hooks".
2. **Priorizar fontes oficiais**: docs do projeto > GitHub releases/issues > Stack Overflow recente > blogs.
3. **Verificar data.** Resultado de >2 anos para ecossistema rápido (JS, Python ML) provavelmente desatualizado.
4. **Cruzar 2+ fontes** antes de aplicar mudança não-trivial.
5. **Citar fonte** na resposta ao usuário se a decisão depende dela.

## Registro

- Se a pesquisa levou a uma decisão arquitetural → registrar em `memory/decisions.md` com link da fonte.
- Se resolveu um erro → `memory/errors-and-solutions.md` com link.

## Anti-padrões

- Aceitar primeiro resultado sem ler.
- Copiar código de Stack Overflow sem entender.
- Buscar quando o repositório local já responde.
