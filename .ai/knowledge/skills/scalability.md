---
version: 1.0.0
updated: 2026-05-14
tier: conditional
tokens: ~550
load: scaling
triggers: escalar, scale, scaling, tráfego, sharding, replicação, fila, queue
---

# Skill: Scalability

## Princípio

> Escala que não existe é problema imaginário. Mas decisões erradas cedo são caras de desfazer.

## Eixos de Escala

1. **Vertical** (mais CPU/RAM): rápido, finito, simples.
2. **Horizontal** (mais máquinas): exige stateless, harder, ilimitado em teoria.
3. **Funcional** (split por serviço/domínio): exige boundaries claros.
4. **Dados** (sharding/partitioning): último recurso para datasets gigantes.

Ordem recomendada: vertical → horizontal → funcional → dados.

## Stateless

- Estado fora do processo (Redis, DB, S3).
- Sessões via cookie assinado ou store externa, não memória do worker.
- Workers descartáveis a qualquer momento.

## Caching em Camadas

```
Browser cache
    ↓
CDN (estáticos + edge cache)
    ↓
Reverse proxy cache (Varnish, Nginx)
    ↓
Application cache (Redis)
    ↓
DB query cache
```

Cada camada absorve uma classe de carga. Comece pela mais barata (CDN) antes da mais cara (DB cache).

## Async + Filas

- Trabalho que não precisa ser síncrono → fila (SQS, RabbitMQ, Redis Streams).
- Worker pool processa em background.
- Webhook recebido → ack rápido + enfileira; nunca processar dentro do request.

## Read vs Write

- Leitura escala mais barato que escrita.
- Read replicas para leitura pesada.
- CQRS quando read e write têm modelos muito diferentes.
- Write: batch, async, particionar.

## Particionamento

- Por chave natural (user_id, tenant_id, region).
- Hot partition é o pior cenário — distribuição uniforme importa.
- Reparticionamento é doloroso → escolher chave com folga.

## Limites e Backpressure

- Rate limit por API key / IP / user.
- Circuit breaker em chamadas a serviços externos.
- Bulkhead: pools separados para cargas diferentes.
- Timeout em TODA chamada de rede.

## Observabilidade em Escala

- Sampling de traces (não trace 100% em alto throughput).
- Métricas agregadas + traces para amostras suspeitas.
- Alertas em sintomas (latência, erro) > em causas (CPU alto pode ser ok).

## Anti-padrões

- Microserviços antes de hitting limites do monolito.
- Sharding de DB antes de explorar índices/queries.
- Otimizar para 1000x do tráfego atual.
- Kafka + Kubernetes + 12 ferramentas para 100 usuários.
