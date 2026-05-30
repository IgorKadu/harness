# Decisions Index

> Uma linha por decisão. O **corpo** vive em `.ai/specs/ADR/ADR-NNNN-*.md` e carrega sob demanda.
> Mantém o caminho quente barato: o agente lê esta lista, e só abre o ADR que importa.

| ID | Título | Status |
|---|---|---|
| ADR-0022 | Arquitetura Lean / Retrieval-First: contexto mínimo suficiente por tarefa | proposed |
| ADR-0023 | Um cérebro, várias bocas: motor único + adaptadores finos (CLI, MCP, extensão) | proposed |
| ADR-0024 | Comunicação adaptativa + navegação interna (protocolo LLM↔Harness) | proposed |
| ADR-0025 | Analisador de varredura zero-dep + code-map consultável | proposed |
| ADR-0026 | Operação autônoma: comandos como atalho, não trava | proposed |
| ADR-0027 | Camada de orquestração autoexecutável (pacote de interação para chat + extensão) | aceito |
| ADR-0028 | Handoff estruturado + memória de sessão (chat-orquestrador) | aceito |
| ADR-0029 | Evolução do orquestrador: métricas, rotas, subtarefas, templates, LLM opcional, web | aceito |
| ADR-0030 | Instalacao discreta: tudo em .harness/ (raiz so com dotfiles + CLAUDE.md) | aceito |
| ADR-0031 | install instala o Harness completo (qualquer IDE) + config local | aceito |
| ADR-0032 | Config MCP com caminho absoluto + instrucoes por ecossistema (CLAUDE/GEMINI/AGENTS) | aceito |
| ADR-0033 | Canal smash/handoff/report + protecao do .harness + scan do projeto + slot LLM | aceito |
| ADR-0034 | Harness como turbina (automacoes pipeline/analyze/inspect); extensao removida | aceito |
