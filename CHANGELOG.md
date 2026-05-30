# Changelog

Todas as mudancas relevantes deste projeto. Formato baseado em Keep a Changelog;
versionamento semantico.

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
  (copiar p/ a LLM / salvar `.ai/runtime/handoff.md`) — nao e mais um painel de botoes.
- **CLI amigavel:** banner grafico + versao; `os setup` (detecta ambiente) e
  `os install [claude|vscode|antigravity|all]` (escreve as configs MCP certas).
- **`os_gaps`/`gaps`**: aponta lacunas concretas (smells, sem teste, arquivo ausente); integrado ao handoff (campo `falta`).
- **`session resume`**: retoma a conversa; refinamento do handoff apos pronto; sessao sobrevive a troca de fase.
- MCP agora com **19 tools**.

## [0.1.0] - 2026-05-28
### Added
- Motor Lean / Retrieval-First (`src/engine.mjs`) com CORE ~1k tokens (ADR-0022/0023).
- Comunicacao adaptativa por fase/maturidade: `brief`, `caps`, `phase`, `init` (ADR-0024).
- Varredura zero-dep + code-map consultavel: `scan`, `find` (ADR-0025).
- Operacao autonoma com "travas boas" (ADR-0026).
- **Camada de orquestracao autoexecutavel (ADR-0027):** `os_orchestrate`/`os next` devolve
  um pacote de interacao estruturado (classificacao, contexto, perguntas guiadas, sugestoes,
  acoes e `awaiting`); `os_decompose`/`os decompose` quebra tarefas que estouram o orcamento.
- **Servidor MCP** (`server/mcp.mjs`) com 16 tools (stdio, JSON-RPC, zero-dep).
- **Extensao VSCode** (`extension/`): painel visual que consome o mesmo motor via CLI `--json`.
- Configs de conexao para Cla