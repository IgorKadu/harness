---
version: 1.0.0
updated: 2026-05-14
tier: conditional
tokens: ~600
load: backend, api
triggers: endpoint, api, rest, graphql, controller, route, middleware
---

# Skill: Backend Engineering

## Princípios

- **Boundaries explícitos.** Entrada validada, saída tipada, erros mapeados.
- **Idempotência por padrão** em endpoints de escrita quando possível (chaves de idempotência).
- **Stateless services** > estado em memória. Estado vai para DB/cache/fila.
- **Falha rápida.** Validar input na borda, não em camadas profundas.

## API Design

- REST: substantivos + verbos HTTP. `POST /orders`, não `POST /createOrder`.
- Status codes corretos: 2xx sucesso, 4xx erro do cliente, 5xx erro do servidor.
- Versionamento explícito (`/v1/`, header, ou query) desde o dia 1.
- Paginação padronizada (`?limit=&cursor=`), nunca offset puro em datasets grandes.
- Erros estruturados: `{ "error": { "code": "...", "message": "...", "details": {...} } }`.

## Validação

- Schema na borda (Zod, Pydantic, JSON Schema).
- Reject unknown fields por padrão.
- Limites: tamanho de payload, profundidade de objetos, tamanho de strings.

## Persistência

- Transações para operações multi-step.
- Migrations versionadas, reversíveis quando possível.
- Não fazer queries em loop (N+1). Usar join/batch.
- Índices baseados em queries reais, não em palpite.

## Concorrência

- Locks otimistas (versionamento de linha) > pessimistas.
- Filas para trabalho async; nunca processar pesado dentro do request HTTP.
- Retry com backoff exponencial + jitter.

## Observabilidade

- Logs estruturados (JSON) com `request_id`, `user_id`, `trace_id`.
- Métricas: latência (p50/p95/p99), taxa de erro, throughput.
- Health checks: `/healthz` (vivo) e `/readyz` (pronto para tráfego).

## Erros comuns a evitar

- Vazar stack trace para o cliente.
- Esconder erros internos atrás de 200 OK.
- Tornar endpoints "convenientes" misturando 5 ações em um.
- Acoplar lógica de negócio à camada HTTP.
