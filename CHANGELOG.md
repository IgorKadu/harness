# Changelog

Todas as mudancas relevantes deste projeto. Formato baseado em Keep a Changelog;
versionamento semantico.

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