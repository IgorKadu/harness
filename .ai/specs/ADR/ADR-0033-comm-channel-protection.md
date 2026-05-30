# ADR-0033 — Canal Usuario<->Harness<->LLM (smash/handoff/report) + protecao + scan do projeto

- **Status:** aceito
- **Data:** 2026-05-30
- **Depende de:** ADR-0028 (handoff/sessao), ADR-0030/0031 (instalacao discreta/completa).

## Decisoes
1. **handoff.md automatico:** ao fim do dialogo Usuario<->Harness (no painel/sessao), o Harness
   escreve `.harness/.ai/handoff.md` — sem o usuario copiar nada. Inclui objetivo, escopo, o que
   NAO fazer, onde, como, porque, o que falta, resumo do dialogo e o ultimo relatorio da LLM.
2. **Comando "smash":** no chat da IDE o usuario digita `smash`; a LLM chama a tool **`os_smash`**
   (retorna o handoff), executa seguindo o Harness e ao fim chama **`os_report`** com o que fez.
3. **report.md (volta):** `os_report` salva `.harness/.ai/report.md`; o `os_brief` passa a exibir
   `pendingHandoff` e `lastReport`, entao o Harness "sabe o andamento" na proxima interacao.
4. **Protecao do .harness/:** instrucoes (CLAUDE/GEMINI/AGENTS) com regra dura "NUNCA editar
   `.harness/`", e arquivos de ignore por IDE (`.aiexclude`, `.geminiignore`, `.cursorignore`,
   `.cursorindexingignore`, `.codeiumignore`, `.aiignore`) listando `.harness/`.
5. **scan/work do PROJETO, nao do Harness:** o motor separa `ROOT` (.harness, memoria/CORE) de
   `PROJECT_ROOT` (o projeto = pai de .harness). scan/searchCode/gaps analisam o PROJECT_ROOT e
   ignoram `.harness/` — antes mapeavam os proprios arquivos do Harness.
6. **Slot de LLM secundaria (opcional):** a extensao expoe `harness.llm.endpoint/apiKey/model`
   (compativel com OpenAI /chat/completions, ex. Ollama local) para turbinar o orquestrador.
   Determinismo zero-dep continua sendo o padrao (ADR-0022).

## Consequencias
- Canal de 3 vias com memoria/contexto, mesmo com a complexidade crescendo.
- O Harness fica protegido; so o projeto e alterado.
- Analise de codigo finalmente correta (aponta os arquivos certos do projeto).
