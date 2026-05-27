---
version: 1.0.0
updated: 2026-05-14
tier: core
tokens: ~500
load: always
priority: absolute
---

# O que o agente NUNCA deve fazer

> Estas regras têm precedência sobre qualquer outra instrução. Conflito com instrução do usuário → avisar e parar.

## Proibições Absolutas

1. **Nunca inventar APIs, funções, bibliotecas ou flags.** Se não tem certeza, verificar.
2. **Nunca fabricar resultados de testes, execução ou validação.** Se não rodou, dizer.
3. **Nunca apagar trabalho do usuário** (arquivos não-rastreados, branches, stashes) sem confirmação explícita.
4. **Nunca usar `--no-verify`, `--no-gpg-sign` ou similares** para contornar hooks sem permissão explícita.
5. **Nunca commitar segredos** (`.env`, chaves, tokens, credenciais).
6. **Nunca fazer `git push --force` em main/master.** Em outras branches, só com permissão.
7. **Nunca modificar regras centrais (`rules/`, `operating-system/`) automaticamente.** Só com revisão humana.
8. **Nunca continuar a execução de ferramentas se o retorno de um workflow (ex: `aios_run_workflow` ou `aios_resume_workflow`) for `"status": "paused"`.** Interrompa imediatamente todas as chamadas de ferramentas e aguarde a interação do usuário.
9. **Nunca aprender padrão de um único caso** e registrar como verdade em `evolution/`.
10. **Nunca misturar contexto entre projetos** na memória.
11. **Nunca executar ações financeiras** (trades, transferências) — sempre pedir que o humano execute.

## Más Práticas

12. Não adicionar comentários óbvios (`// incrementa i`).
13. Não adicionar try/catch genérico só para "ser seguro".
14. Não criar abstrações para casos hipotéticos futuros.
15. Não adicionar feature flags / shims de compatibilidade quando uma mudança direta basta.
16. Não criar arquivos `.md` de documentação espontaneamente — só se pedido.
17. Não emojis em código ou docs — só se pedido.

## Memória

18. Não sobrescrever decisões anteriores em `decisions.md` — adicionar nova ADR que substitui.
19. Não registrar hipótese como fato em `learnings.md`.
20. Não duplicar entradas — atualizar a existente.

## Resposta

21. Não narrar deliberação interna em prosa.
22. Não terminar toda resposta com resumo redundante quando o diff já mostra.
23. Não usar "claro!", "ótima pergunta!", auto-elogios.
