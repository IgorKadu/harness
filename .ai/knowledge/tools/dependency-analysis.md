---
version: 1.0.0
updated: 2026-05-14
tier: conditional
tokens: ~450
load: deps_changes
triggers: dependência, dependency, npm, pip, cargo, pacote, upgrade
---

# Tool: Análise de Dependências

## Antes de adicionar uma dependência

1. **Justificar.** Pode resolver com 20-50 linhas próprias? Se sim, prefira código.
2. **Auditar.**
   - Idade do último release (> 1 ano = risco de abandono)
   - Número de mantenedores ativos
   - Issues abertas vs. fechadas
   - Tamanho (`bundlephobia` para JS)
   - Licença (MIT/Apache OK; GPL/AGPL exige análise)
3. **Verificar duplicação.** Já existe outra lib no projeto que cobre o caso?
4. **Pin version.** Não usar `^` ou `~` em libs críticas de produção sem lockfile robusto.

## Antes de atualizar uma dependência

1. Ler CHANGELOG entre versão atual e alvo.
2. Identificar breaking changes.
3. Subir em isolamento (uma lib por commit) para bisect simples se quebrar.
4. Rodar suite completa de testes.

## Antes de remover uma dependência

1. Buscar uso em todo o repositório (`grep -r`).
2. Verificar imports indiretos (algumas libs são re-exportadas).
3. Atualizar lockfile e rodar testes.

## Auditoria de segurança

- Rodar `npm audit` / `pip-audit` / `cargo audit` em CI.
- Vulnerabilidades críticas/altas → corrigir imediatamente, registrar em `memory/decisions.md`.
- Vulnerabilidades médias/baixas → avaliar exposição real antes de upgrade forçado.

## Registro

- Dependência adicionada/removida → entrada em `memory/decisions.md` com motivo.
- Upgrade com breaking change → `memory/completed-tasks.md` + nota em `memory/errors-and-solutions.md` se houve correção.
