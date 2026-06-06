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
| ADR-0035 | Engine modular por dominio + fachada + contrato LLM formal | aceito |
| ADR-0036 | Politica de idioma (EN sistema / PT dialogo) + loop de validacao automatizado | aceito |
| ADR-0037 | Save points: checkpoints read-first em 3 camadas (overview/progress/technical) | aceito |
| ADR-0038 | Instalador interativo + instalacao limpa + superficie minima (reset/update/reforce) | aceito |
| ADR-0039 | Estabilizacao: suite de testes (node:test) + escrita atomica + state root unico + doctor mais fundo | aceito |
| ADR-0040 | Capsula de contexto (os_start) + ponteiro de foco (os_focus) + staleness dos saves | aceito |
| ADR-0041 | Forma da tarefa (escalate vs single-pass) + verificacao adversarial (inspirado em Dynamic Workflows, sem o runtime) | aceito |
| ADR-0042 | Superficie MCP curada (~20 tools, -38% overhead) + fix conflito de instrucoes + fix override da capsula | aceito |
| ADR-0043 | Curadoria: dead code, docs desatualizados, refs a tools demovidas, bug do detectStack | aceito |
| ADR-0044 | Auditoria estruturada completa (G1-G7): hook LLM morto removido, knowledge orfao religado, pacote enxuto, +5 testes | aceito |
