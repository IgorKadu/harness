# ADR-0032 — Config MCP portavel (caminho absoluto) + instrucoes por ecossistema

- **Status:** aceito
- **Data:** 2026-05-30
- **Depende de:** ADR-0030/0031.

## Problema
1. As configs MCP usavam `${workspaceFolder}` / `${CLAUDE_PROJECT_DIR}`. O **Antigravity nao expande**
   essas variaveis -> procurava `...Antigravity IDE\${workspaceFolder}\.harness\bin\os.mjs` e falhava.
2. A **extensao** tinha `cliPath` default `bin/os.mjs` (sem `.harness/`) -> erro `Testando\bin\os.mjs`.
3. So gerava `CLAUDE.md`; o **Antigravity nao le CLAUDE.md** -> agente ficava sem instrucoes/regras.

## Decisao
1. Toda config MCP passa a usar **caminho ABSOLUTO** (com `/`) para `.harness/bin/os.mjs`, preenchido
   na hora do install. Como o motor resolve a raiz relativa a si, isso funciona em qualquer IDE,
   independente de expansao de variaveis e do cwd com que a IDE sobe o processo.
2. A extensao usa `cliPath` default **`.harness/bin/os.mjs`**.
3. O install gera o arquivo de instrucoes com o **nome de cada ecossistema**: `CLAUDE.md` (Claude Code),
   `GEMINI.md` (Antigravity/Gemini) e `AGENTS.md` (Cursor/Windsurf/VSCode e padrao cross-tool) — mesmo conteudo.

## Consequencias
- MCP conecta em Antigravity/Cursor/Windsurf/VSCode/Claude sem ajuste manual.
- O agente de cada IDE encontra suas instrucoes (protocolo + travas) no arquivo que ele le.
- Caminhos absolutos sao locais por projeto (as configs nao sao versionadas por padrao).
