---
version: 1.0.0
updated: 2026-05-14
tier: conditional
tokens: ~600
load: architecture, design_decision
triggers: arquitetura, architecture, design, padrão, microserviço, monorepo
---

# Skill: Architecture Design

## Princípios

- **YAGNI até dor real.** Não desenhe para escala que não existe.
- **Conway's Law.** A arquitetura tende a refletir a estrutura do time.
- **Reversibilidade.** Decisões caras devem ser tomadas tarde; baratas, cedo.
- **Trade-offs explícitos.** Toda decisão tem um custo — registrar qual.

## Quando reformular arquitetura

- A regra atual exige >3 hops para entender um fluxo simples.
- Mudanças simples exigem alterar >5 arquivos não relacionados.
- Acoplamento bloqueia testes em isolamento.
- Performance degradou e não há caminho claro de otimização.

## Camadas Recomendadas

```
Presentation (UI / API handlers)
    ↓
Application (casos de uso, orquestração)
    ↓
Domain (entidades, regras de negócio puras)
    ↓
Infrastructure (DB, HTTP clients, filas)
```

- Dependências apontam para dentro (Clean Architecture / Hexagonal).
- Domain não conhece infrastructure.

## Decomposição

| Sintoma | Resposta |
|---|---|
| Módulo > 1000 linhas | Quebrar por responsabilidade |
| Duas equipes editando o mesmo arquivo | Quebrar por ownership |
| Tempo de build inaceitável | Quebrar em pacotes/módulos |
| Deploy acoplado entre features independentes | Considerar microserviço |

## Microserviços — usar quando

- Times independentes precisam liberar em cadências diferentes.
- Escala MUITO diferente entre componentes.
- Tolerância a falha precisa ser isolada.

## Microserviços — NÃO usar quando

- Time único, projeto novo.
- Transações atravessam serviços frequentemente.
- Latência inter-serviço é crítica.

## ADR (Architecture Decision Record)

Toda decisão arquitetural vai para `memory/decisions.md` no formato:

```
## ADR-NNN — Título
Data: AAAA-MM-DD
Status: Proposto | Aceito | Substituído por ADR-NNN

### Contexto
O que motivou a decisão.

### Decisão
O que foi decidido.

### Consequências
Trade-offs aceitos.

### Alternativas consideradas
Por que NÃO foram escolhidas.
```
