---
version: 1.0.0
updated: 2026-05-14
tier: conditional
tokens: ~500
load: performance
triggers: lento, slow, performance, latência, p95, p99, gargalo, otimizar
---

# Skill: Performance

## Princípio

> Medir > supor. Otimizar > especular. Profiling > opinião.

## Ordem de Investigação

1. **Reproduzir** o problema com workload realista.
2. **Medir** com profiler (não estimar).
3. **Identificar** o hot path (geralmente <5% do código consome >90% do tempo).
4. **Atacar** a maior contribuição primeiro.
5. **Validar** com novo profile.

## Métricas-alvo (referência)

| Camada | Métrica | Alvo razoável |
|---|---|---|
| HTTP API | p99 latency | < 300ms |
| Frontend | LCP | < 2.5s |
| Frontend | INP | < 200ms |
| DB query | p99 | < 100ms |
| Background job | throughput | depende do volume |

## Padrões de otimização (em ordem de impacto)

### Algoritmo
- O(n²) → O(n log n) ou O(n) com hash.
- Eliminar trabalho redundante (memoize, cache).

### I/O
- Batch (N requests → 1).
- Paralelizar requests independentes.
- Streaming em vez de carregar tudo.

### Banco
- Índice em coluna usada em WHERE/ORDER BY.
- Evitar N+1 (JOIN ou batch fetch).
- Paginar resultados grandes.
- Read replicas para leitura pesada.

### Cache
- Cache na camada mais próxima do consumo.
- TTL adequado ao churn dos dados.
- Invalidação explícita > TTL ingênuo.

### Concorrência
- Async para I/O-bound.
- Pool de workers para CPU-bound.
- Backpressure para evitar buffer overflow.

## Anti-padrões

- "Otimização preventiva" sem profile.
- Cache em tudo (cache miss + invalidação fica pior que sem cache).
- Paralelizar antes de garantir thread-safety.
- Trocar lib por outra "mais rápida" sem medir o ganho real.

## Registro

Toda otimização não-trivial vai para `memory/decisions.md` com:
- Métrica antes / depois
- Como foi medida
- Custo (complexidade, manutenção)
