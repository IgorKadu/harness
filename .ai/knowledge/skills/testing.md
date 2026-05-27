---
version: 1.0.0
updated: 2026-05-14
tier: conditional
tokens: ~550
load: testing
triggers: teste, test, tdd, unit, e2e, integration, mock, cobertura
---

# Skill: Testing

## Princípios

- **Teste comportamento, não implementação.** Refatorar não deve quebrar testes.
- **Pirâmide.** Muito unit, médio integração, pouco E2E.
- **Determinístico.** Sem flaky. Se flaky, corrigir ou remover — nunca retry cego.
- **Rápido.** Suite unit < 30s. Se demorar, isolar lentos.

## Tipos

| Tipo | Cobre | Custo | Velocidade |
|---|---|---|---|
| Unit | função/módulo puro | baixo | ms |
| Integration | múltiplos módulos + I/O real | médio | s |
| E2E | usuário → sistema completo | alto | s a min |
| Contract | borda entre serviços | médio | ms |
| Property-based | invariantes em N inputs aleatórios | médio | s |

## O que testar

- **Sempre**: regra de negócio, transformação de dados, branching condicional.
- **Frequentemente**: integração com DB/API externa (com mock controlado).
- **Estrategicamente**: fluxo crítico ponta-a-ponta (login, checkout, etc.).
- **Não obsessivamente**: getters/setters triviais, código de framework.

## AAA / Given-When-Then

```
// Arrange / Given
const order = buildOrder({ items: 3, discount: 0.1 });

// Act / When
const total = calculateTotal(order);

// Assert / Then
expect(total).toBe(270);
```

## Mocks — quando usar

- I/O externo lento ou caro (rede, disco, API paga).
- Tempo (`Date.now`, timers).
- Aleatoriedade.

## Mocks — quando NÃO usar

- Banco em testes de integração (use container real ou in-memory equivalente).
- Lógica que você está testando — se está mockando o sujeito do teste, está testando o mock.

## Test data

- Builders / factories > literais espalhados.
- Fixtures versionadas para dados complexos.
- Limpar estado entre testes (transação rollback em DB, reset em memória).

## CI

- Toda PR roda lint + type + unit + integration.
- E2E em pipeline separado, possivelmente em scheduled (não em todo push).
- Flaky test detectado → quarentena + issue, nunca silenciar com retry.

## Anti-padrões

- Teste que só passa em ordem específica.
- Teste com `sleep(N)` arbitrário em vez de espera explícita por condição.
- Teste que duplica a implementação ("assert que a função foi chamada com X").
- Cobertura como métrica final (90% de cobertura testando nada útil é pior que 50% testando o crítico).
