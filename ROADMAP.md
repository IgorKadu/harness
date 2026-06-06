# Roadmap — Harness

Estado atual (**v0.9.1**): motor modular zero-dep (fachada `engine.mjs` + `src/core`/`src/modules`/`src/llm`),
três bocas (CLI/MCP/web), **núcleo curado de ~20 tools MCP** (ADR-0042), instalador interativo e
suíte de testes (`node:test`). Ciclo completo iniciar → continuar → concluir:

`os_start` (cápsula) → `os_orchestrate`/`os_assess` → trabalho → `os_validate` → `os_report`/`os_sync`/`os_save_checkpoint`.

## Concluído (marcos recentes)
- ✅ Engine modular por domínio + contrato LLM (ADR-0035)
- ✅ Política de idioma + loop de validação (`os_validate`) (ADR-0036)
- ✅ Save points: 3 camadas read-first + staleness (ADR-0037/0040)
- ✅ Instalador interativo + reset/update/reforce + superfície mínima (ADR-0038)
- ✅ Estabilização: testes, escrita atômica, state root único, doctor mais fundo (ADR-0039)
- ✅ Cápsula de contexto `os_start` + foco `os_focus` (ADR-0040)
- ✅ Forma da tarefa + verificação adversarial (inspirado em Dynamic Workflows, sem o runtime) (ADR-0041)
- ✅ Superfície MCP curada (−38% overhead) + curadoria/limpeza (ADR-0042/0043)

## Em aberto (opcional, sem urgência)
1. Encurtar descrições verbosas das tools do núcleo (mais alguns tokens economizados).
2. Unificar os três classificadores de tamanho (`classify` / `taskShape` / `decompose`) num vocabulário só.
3. JSDoc + `tsc --checkJs` no CI (tipagem leve, sem dependência de runtime).
4. Migração de schema da memória no `update`.
5. Migrar os docs de `knowledge/` restantes de PT para EN (política ADR-0036, gradual).
6. Publicar no GitHub/npm (push do usuário).

> Princípio: fazer só o necessário e que gera ganho real; não inflar complexidade.
