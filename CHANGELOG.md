# Changelog

Todas as mudancas relevantes deste projeto. Formato baseado em Keep a Changelog;
versionamento semantico.

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
- Configs de conexao para Claude Code, VSCode (`.vscode/mcp.json`), Antigravity/Gemini.
- `CONNECT.md` (guia de conexao) e `scaffold` que instala tudo num projeto-alvo.
