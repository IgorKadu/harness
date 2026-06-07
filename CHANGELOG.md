# Changelog

Todas as mudancas relevantes deste projeto. Formato baseado em Keep a Changelog;
versionamento semantico.

## [0.9.4] - 2026-06-07
### Fixed
- **Docs:** README atualizado (versao, ADRs 0022-0044, remocao do comando `scaffold` inexistente do inicio rapido); CHANGELOG com as entradas 0.9.1-0.9.3.
- Removido script `scaffold` morto do `package.json`.

## [0.9.3] - 2026-06-06
### Fixed
- **Auditoria estruturada G1-G7 (ADR-0044):** removido hook LLM morto (`setLLM`/`hasLLM`/`assist`); 2 rotas para knowledge orfao (`dont`/`lifecycle`); `files` do package enxuto (sem dotfiles de dev).
### Added
- +5 testes (orchestrate/phase/scan) — total 42. Smells=0. Verificados: grafo de imports, paridade CLI/MCP, integridade do indice, ADRs no decisions-index.

## [0.9.2] - 2026-06-06
### Fixed
- **Passe de curadoria (ADR-0043):** `detectStack(PROJECT_ROOT)` corrigido; removida mensagem de extensao no `setup`; 9 imports orfaos limpos; strings do engine movidas para tools core.
### Changed
- Docs atualizados (README/CONNECT/AGENTS/ROADMAP).

## [0.9.1] - 2026-06-06
### Changed
- **Superficie MCP curada (ADR-0042):** `tools/list` filtrado para ~20 tools core (demais seguem chamaveis via CLI/MCP) — overhead por sessao ~3500→2150 tk (-38%). Fonte: MCP SEP-1576.
### Fixed
- Conflito de passo 0 nas instrucoes: a capsula nao sobrescreve pre-requisito (bootstrap/stale/handoff).

## [0.9.0] - 2026-06-05
### Added
- **Forma da tarefa + verificacao adversarial (ADR-0041)** — inspirado no Dynamic Workflows da Anthropic, sem o runtime caro de subagentes:
  - `os_assess` — classifica a tarefa em `single-pass` ou `escalate` (guarda anti-explosao: tarefa grande/paralela manda DELEGAR ao Dynamic Workflows nativo ou DECOMPOR em subsessoes, em vez de moer um contexto so); inclui postura de custo (caminho suficiente mais barato).
  - `os_verify` — checklist de refutacao adversarial p/ saidas de alto risco (refute o proprio resultado ate convergir; nunca declarar verde sem `os_validate`).
  - A capsula `os_start <intencao>` passa a carregar `task.shape` e redireciona a `nextAction` para escalar quando preciso. Skill `workflow-shape`. MCP com **39 tools**, catalogo dividido (`tools.mjs` + `tools-ext.mjs`).

## [0.8.0] - 2026-06-05
### Added
- **Capsula de contexto (ADR-0040):** `os_start` — UMA chamada barata (~500 tk) em ordem de prioridade: foco + saves (e o que esta STALE) + postura + `nextAction`. Passo 0 de toda mensagem; substitui re-rodar brief+saves+pipeline.
- **Ponteiro de foco:** `os_focus` (objetivo/passo/proxima acao) em `.ai/runtime/focus.json` — mantem o fio dentro e entre sessoes.
- **Staleness dos saves:** marca uma camada quando o code-map e mais novo que o save. Skill `continuity`.

## [0.7.0] - 2026-06-04
### Added
- **Estabilizacao (ADR-0039):** suite de **testes** com `node:test` (sandbox via `HARNESS_AI_DIR`), `npm test` no CI (Node 18/20/22); **escrita atomica** (`writeFileAtomic`) em todos os writers duraveis; **state root unico** (memoria unificada no `AI`); `doctor` checa integridade de saves/memoria.
- **Save points (ADR-0037):** `os_saves`/`os_save_write`/`os_save_checkpoint` — 3 camadas read-first (overview/progress/technical) com estagio `initial|pending|done`.
- **Instalador interativo + reset/update/reforce (ADR-0038):** menu numerado por ambiente; instalacao limpa; superficie minima ao usuario (internos ocultos).
- **Loop de validacao (ADR-0036):** `os_validate`/`os_checks` rodam os checks do projeto e registram falhas no errors-log ate passar. Politica de idioma (sistema EN / dialogo PT).
### Changed
- **Engine modular por dominio + fachada (ADR-0035):** `src/core` + `src/modules` + `src/llm`, `engine.mjs` vira barrel; CLI modularizado; contrato LLM formal. Smells=0.

## [0.6.0] - 2026-05-30
### Added
- **Harness como TURBINA (ADR-0034):** automacoes que fazem o trabalho pesado no repo e entregam tudo p/ a LLM.
  - `os_pipeline` — fluxo padrao (scan+analyze+gaps+handoff) p/ projeto novo ou existente.
  - `os_analyze` — perfil profundo: estrutura, stack, entrypoints, configs, docs, testes, deps, scripts, smells.
  - `os_inspect [sub]` — lista pastas/arquivos (global ou por modulo), protegendo `.harness/`.
  - `os_automations` — catalogo dos bots (globais x isolados). MCP agora com **29 tools**.
### Removed
- **Extensao VSCode (.vsix) removida.** A interacao direta sem a LLM continua via CLI e painel web (`os serve`).
### Changed
- Posicionamento: o Harness e a turbina do desenvolvimento (motor via MCP/CLI), nao um painel — independente da IDE/LLM.

## [0.5.0] - 2026-05-30
### Added
- **Canal Usuario<->Harness<->LLM (ADR-0033):** `handoff.md` gerado automaticamente ao fim do dialogo; comando **`smash`** (tools `os_smash`/`os_report`) faz a LLM seguir o handoff e devolver um relatorio que o Harness le na proxima interacao (`os_brief` mostra `pendingHandoff`/`lastReport`). MCP agora com **25 tools**.
- **Slot de LLM secundaria (opcional):** a extensao expoe `harness.llm.endpoint/apiKey/model` (compativel com OpenAI, ex. Ollama local) — determinismo zero-dep segue como padrao.
### Fixed
- **scan/work analisam o PROJETO, nao o Harness:** o motor separa `ROOT` (.harness) de `PROJECT_ROOT`; `.harness/` e ignorado. Antes mapeava os proprios arquivos do Harness.
### Security
- **Protecao do `.harness/`:** regra dura nas instrucoes (CLAUDE/GEMINI/AGENTS) + arquivos de ignore por IDE (`.aiexclude`, `.geminiignore`, `.cursorignore`, `.codeiumignore`, `.aiignore`) — o agente nao edita/indexa o Harness; so o projeto.
### Changed
- Extensao: botoes scan/work removidos; ao concluir, salva o handoff e instrui o usuario a digitar `smash` no chat da IDE.

## [0.4.3] - 2026-05-30
### Fixed
- **Config MCP portavel (ADR-0032):** usa caminho ABSOLUTO para `.harness/bin/os.mjs` em vez de `${workspaceFolder}`/`${CLAUDE_PROJECT_DIR}` (que o Antigravity nao expandia -> "Cannot find module"). Conecta em qualquer IDE.
- **Instrucoes por ecossistema:** o install gera `CLAUDE.md` (Claude Code), `GEMINI.md` (Antigravity) e `AGENTS.md` (Cursor/Windsurf/VSCode) — antes so `CLAUDE.md`, que o Antigravity nao le.
- **Extensao:** `cliPath` default corrigido para `.harness/bin/os.mjs` (antes `bin/os.mjs` -> erro no painel).

## [0.4.2] - 2026-05-30
### Fixed
- **`install <ide>` agora instala o Harness COMPLETO (ADR-0031):** qualquer alvo (antigravity, cursor, windsurf, vscode, claude) garante o `.harness/` (motor + MCP + extensao + memoria) e escreve a config MCP apontando para o `.harness/` local — antes o alvo especifico so escrevia a config p/ npx, sem instalar nada.

## [0.4.1] - 2026-05-30
### Fixed
- **CI:** smoke test do scaffold ajustado para a instalacao discreta (`.harness/bin/os.mjs`); adiciona `server/web.mjs` a checagem de sintaxe.

## [0.4.0] - 2026-05-30
### Changed
- **Instalacao discreta (ADR-0030):** todo o Harness agora vive em um unico diretorio oculto **`.harness/`** (motor + bocas + `.ai/`). Na raiz do projeto ficam so os dotfiles de config das IDEs e um `CLAUDE.md` enxuto.
- Comandos passam a ser `node .harness/bin/os.mjs <cmd>`; configs MCP apontam para `.harness/bin/os.mjs`.
- `scaffold`/`upgrade` operam sobre `.harness/`, preservando memoria + fase (backup em `.harness/.ai/backup-*`).
- O `.vsix` da extensao agora viaja no pacote e e vendorizado em `.harness/extension/`.

## [0.3.1] - 2026-05-30
### Fixed
- **`install`/`setup` gravam na pasta do projeto** (antes escreviam na pasta do pacote via npx — as configs MCP "sumiam"). O comando MCP nas configs e escolhido automaticamente (`node bin/os.mjs mcp` local ou `npx -y @igorkadu/harness mcp`).
- **Extensao VSCode pronta para instalar**: `.vsix` ja incluido em `extension/harness-lean-ai-os-0.3.1.vsix` (Install from VSIX) — nao precisa rodar `vsce`.
- **README/CONNECT reescritos** mais claros e intuitivos; comandos `npx` consistentes.

## [0.3.0] - 2026-05-29
### Added
- **Métricas de economia** (`os_metrics`/`metrics`): tokens poupados por tarefa vs. carregar o projeto inteiro (~80%+ no proprio Harness).
- **Aprendizado de rotas** (`os_suggest_routes`/`routes`): sugere novas rotas pelo historico de intencoes.
- **Subtarefas como sessoes-filhas** (`os_subtasks`/`subtasks`): spawn/status/done com progresso agregado.
- **Templates de projeto** (`os_template`/`template <api|web|cli|lib>`): seed de objetivo, primeiros passos e o que NAO fazer.
- **LLM opcional no orquestrador** (`setLLM()`/`assist()`): hook plugavel; determinismo zero-dep por padrao.
- **Painel web standalone** (`os serve [porta]`): chat-orquestrador via http zero-dep, sem IDE.
- **Mais alvos de install**: Cursor e Windsurf (alem de Claude Code/VSCode/Antigravity).
- **Acoes na extensao realimentam a sessao** (`session note`): resultado de scan/work/decompose vira nota persistida.
- **`os upgrade [dir]`**: atualiza o motor/bocas/CORE PRESERVANDO `.ai/memory` + fase, com backup automatico em `.ai/backup-*`; instalacao zerada so quando nao ha memoria.
- MCP agora com **23 tools**.

## [0.2.0] - 2026-05-28
### Added
- **Handoff estruturado p/ a LLM (ADR-0028):** `os_handoff`/`handoff` gera spec com objetivo,
  escopo, o que NAO fazer, alvo de codigo (scan+grep), onde, como e porque (+ markdown).
- **Memoria de sessao / chat-orquestrador:** `os_session`/`session <start|answer|status|clear>`
  conduz a conversa, persiste em `.ai/runtime/session.json` e resume entre execucoes.
- **Extensao virou chat-orquestrador:** conversa com o usuario, estrutura e entrega o handoff
  (copiar p/ a LLM / salvar `.ai/runtime/handoff.md`) — na