---
version: 1.0.0
updated: 2026-05-14
tier: conditional
tokens: ~600
load: database
triggers: db, database, banco, sql, query, migration, schema, índice, postgres, mysql, mongo
---

# Skill: Database Design

## Princípios

- **Modelar o domínio, não a UI.** A tela muda, o modelo deveria mudar menos.
- **Normalizar primeiro, desnormalizar com motivo.** 3NF como ponto de partida.
- **Constraints no banco**, não só na aplicação. NOT NULL, FK, UNIQUE, CHECK.
- **Migrations são código de produção.** Versionadas, revisadas, reversíveis.

## Escolha de DB

| Caso | Escolha típica |
|---|---|
| OLTP relacional, transações | PostgreSQL / MySQL |
| Documentos flexíveis | MongoDB (com cuidado) ou JSONB no Postgres |
| Cache / sessões | Redis |
| Full-text search | Elasticsearch / Meilisearch / Postgres FTS |
| Time-series | TimescaleDB / InfluxDB |
| Grafos | Neo4j (raro; geralmente Postgres com recursivo basta) |

## Schema

- IDs: UUID v7 ou ULID (ordenáveis) > UUID v4 > auto-increment.
- Timestamps: `created_at`, `updated_at` em UTC, sempre.
- Soft delete: `deleted_at` nullable; nunca remover linhas com histórico relevante.
- Enums em coluna com CHECK ou tabela de lookup; não string livre.

## Índices

- Em colunas usadas em `WHERE`, `JOIN`, `ORDER BY`.
- Composto na ordem de seletividade.
- Não indexar tudo — índice tem custo de escrita.
- Verificar uso real com `EXPLAIN ANALYZE` antes de criar.

## Migrations

- Uma migration = uma mudança lógica.
- Reversível quando possível (`up` + `down`).
- Adicionar coluna NOT NULL: 1) adicionar nullable + default 2) backfill 3) ALTER para NOT NULL.
- Lock-aware em tabelas grandes (PostgreSQL: `CREATE INDEX CONCURRENTLY`).

## Queries

- Parametrizadas SEMPRE (prevenção de SQL injection).
- Evitar `SELECT *` em produção — listar colunas.
- LIMIT obrigatório em queries que retornam lista.
- Detectar N+1 (logging de queries em dev; ORMs têm flag).

## Transações

- Tão curtas quanto possível.
- Não fazer I/O externo dentro de transação.
- Isolation level explícito quando importa (READ COMMITTED é default usual).
- Deadlock → ordenar acessos a recursos consistentemente.

## Backup e recovery

- Backup automatizado, retenção definida.
- TESTAR restore periodicamente — backup não testado é teoria.
- PITR (point-in-time recovery) em produção.

## Anti-padrões

- EAV (entity-attribute-value) genérico "para flexibilidade".
- Strings concatenadas para queries dinâmicas.
- `OFFSET N` em paginação de tabela grande (usar cursor).
- Múltiplas booleans para estados mutuamente exclusivos (usar enum).
