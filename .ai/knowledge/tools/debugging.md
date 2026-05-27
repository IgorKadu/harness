---
version: 1.0.0
updated: 2026-05-14
tier: conditional
tokens: ~500
load: bugs, errors
triggers: bug, erro, error, falha, crash, exception, stacktrace
---

# Tool: Protocolo de Debug

## Princípio

> Causa raiz > sintoma. Reproduzir > supor. Bisecção > tentativa cega.

## Fluxo

### 1. Reproduzir
- Não debugue o que não reproduz. Se intermitente → registrar condições e frequência.
- Reproduzir no menor cenário possível (input mínimo).

### 2. Isolar
- Bisecar: dividir o pipeline em metades, isolar a metade que falha, repetir.
- `git bisect` para regressões introduzidas por commit recente.
- Comentar/desativar blocos para isolar.

### 3. Observar
- Logs com timestamp e nível.
- `console.log`/`print` temporários — REMOVER antes de commitar.
- Debugger > prints quando o estado é complexo.
- Network/DB queries quando o erro envolve I/O.

### 4. Hipotetizar
- Listar 2-3 hipóteses ordenadas por probabilidade.
- Para cada uma: como confirmar/refutar em 1 passo.

### 5. Corrigir
- Corrigir a CAUSA, não o sintoma.
- Se for paliativo, comentar "WORKAROUND:" + razão + link para issue.

### 6. Testar
- Teste que falha sem a correção e passa com ela.
- Rodar suite completa para regressão.

### 7. Registrar
- Sintoma + causa + correção em `memory/errors-and-solutions.md`.
- Se padrão recorrente → considerar `evolution/patterns-discovered.md` após 3+ ocorrências.

## Anti-padrões

- "Funciona localmente" sem investigar diferença de ambiente.
- Aumentar timeout para mascarar race condition.
- try/catch genérico engolindo o erro.
- Reescrever do zero antes de entender o bug.
- "Reiniciar o servidor resolve" como solução definitiva.

## Sinais de causa raiz não encontrada

- A correção exige número mágico.
- A correção quebra outra coisa "aleatoriamente".
- Você não consegue explicar POR QUE funciona.
- O bug "volta" depois de algum tempo.

Nesses casos → recuar, registrar como `known-issues.md`, escalar.
