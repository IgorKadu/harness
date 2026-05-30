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