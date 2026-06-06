# Decisions Log (append-only)

> Espelho histórico append-only das decisões. NUNCA carregado inteiro — só grep.
> O índice navegável fica em ../decisions-index.md; o corpo em ../../specs/ADR/.

2026-05-26 | ADR-0023 implementado: motor src/engine.mjs + CLI + MCP (8 tools) validados; configs Claude Code/Antigravity criadas
2026-05-26 | fase: discovery -> execution
2026-05-26 | fase: execution -> stabilization
2026-05-26 | fase: stabilization -> discovery
2026-05-26 | fase: discovery -> discovery
2026-05-26 | fase: discovery -> execution
2026-05-26 | fase: execution -> stabilization
2026-05-26 | fase: stabilization -> discovery
2026-05-27 | ADR-0026 operacao autonoma aceita como modelo de uso
2026-05-27 | Distribuicao: pacote npm @igorkadu/harness (escopo publico), bin harness/os, files whitelist; publish-ready
2026-05-29 | ADR-0027: camada de orquestracao + extensao VSCode + MCP 16 tools; pronto p/ publicar
2026-05-29 | fase: discovery -> execution
2026-05-29 | ADR-0028 v0.2.0: handoff + sessao + chat-orquestrador + CLI install/banner; MCP 18 tools
2026-05-29 | upgrade-safe: scaffold detecta memoria; os upgrade preserva .ai/memory+fase com backup; instalacao zerada so sem memoria
2026-05-30 | ADR-0030 v0.4.0: instalacao discreta, tudo em .harness/
2026-05-30 | ADR-0033 v0.5.0: canal smash/handoff/report + protecao .harness + scan do PROJECT_ROOT + slot LLM na extensao; 25 tools
2026-05-30 | ADR-0034 v0.6.0: Harness vira turbina (os_pipeline/analyze/inspect/automations); extensao VSCode removida; 29 tools
2026-06-03 | ADR-0035: engine modularizado por dominio (core/modules/llm) + fachada barrel + contrato LLM formal; 58 exports preservados, zero-dep, CI verde
2026-06-03 | CLI bin/os.mjs modularizado: bin/lib/ui.mjs + bin/commands/{workflow,system}.mjs + dispatcher enxuto; scaffold passa a copiar bin/ recursivo; Smells=0 no projeto
2026-06-03 | ADR-0036: politica de idioma (EN sistema/PT dialogo, knowledge/rules/language.md) + loop de validacao (src/modules/validate.mjs, os validate, tools os_validate/os_checks, skill validation-loop.md, rota validacao). CLI bin/os.mjs tambem modularizado. 31 tools MCP.
2026-06-04 | ADR-0037: Save points (.ai/saves, 3 camadas read-first) — modulo saves.mjs, brief carrega status, CLI os save, tools os_saves/os_save_write/os_save_checkpoint, instrucoes+CLAUDE.md com passo 0, skill save-points + rota saves. 34 tools MCP.
2026-06-04 | ADR-0038: instalador interativo (bin/installer.mjs menu numerado), instalacao limpa (memoria zerada/saves ausentes/VERSION), superficie minima reset/update/reforce (lifecycle.mjs + tool os_reforce + slash commands), internos ocultos no help. 35 tools MCP.
2026-06-04 | fase: execution -> stabilization
2026-06-05 | ADR-0039: estabilizacao — 26 testes node:test (test/ + _sandbox HARNESS_AI_DIR), writeFileAtomic em todos os writers duraveis, memory unificado no AI, doctor checa saves/memoria, CI roda npm test (18/20/22). v0.7.0.
2026-06-06 | ADR-0040: capsula de contexto os_start + ponteiro de foco os_focus + staleness dos saves; passo 0 nas instrucoes/CLAUDE.md; skill continuity + rota; 4 testes bootstrap (30 total); 37 tools. v0.8.0.
2026-06-06 | ADR-0041: os_assess (taskShape escalate/single-pass, guarda anti-explosao) + os_verify (refutacao adversarial); capsula carrega task.shape; skill workflow-shape + rota; tools-ext.mjs (Smells=0); 6 testes (36 total); 39 tools. v0.9.0. Fonte: blog Anthropic Dynamic Workflows 28/05/2026.
2026-06-06 | v0.9.0: estabilizacao concluida — postura de custo dobrada no taskShape (#3), CHANGELOG 0.7-0.9, saves consolidados (reforce). Ciclo completo iniciar/continuar/concluir. 39 tools, 36 testes, Smells=0.
2026-06-06 | ADR-0042: superficie MCP curada para ~20 tools (tools/list filtrado por CORE_TOOLS; demais seguem chamaveis/CLI) -> overhead ~3500->2150 tk/sessao (-38%). Fix: conflito de passo 0 nas instrucoes; capsula nao sobrescreve pre-requisito (bootstrap/stale/handoff). 37 testes. v0.9.1. Fonte: MCP SEP-1576 / too-many-tools.
2026-06-06 | ADR-0043 v0.9.2: curadoria — fix detectStack(PROJECT_ROOT), removida msg de extensao no setup, 9 imports orfaos limpos, engine strings -> tools core, docs (README/CONNECT/AGENTS/ROADMAP) atualizados. 37 testes, Smells=0.
2026-06-06 | ADR-0044 v0.9.3: auditoria estruturada G1-G7. Fixes: removido hook LLM morto (setLLM/hasLLM/assist), 2 rotas p/ knowledge orfao (dont/lifecycle), package files enxuto (sem dotfiles de dev), +5 testes (orchestrate/phase/scan). Saudaveis: grafo de imports, paridade CLI/MCP, integridade do index, ADRs no decisions-index. 42 testes, Smells=0.