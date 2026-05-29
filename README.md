# Harness — Lean AI OS

**A ferramenta que ajuda a criar outras ferramentas.** Uma camada de inteligência entre você, a LLM e o seu projeto — para que o desenvolvimento não trave conforme a complexidade cresce.

Harness é a implementação de referência de um *AI Operating System* no modelo **Lean / Retrieval-First**: a mesma tese do que já existe por aí — *"a inteligência está na estrutura, não no modelo"* — mas com o vetor de escala invertido. Em vez de uma enciclopédia que a LLM **carrega** (e que entope o contexto), é uma biblioteca que a LLM **consulta**.

---

## O problema que ele resolve

Assistentes de IA degradam conforme o projeto cresce: o contexto enche, a atenção se dilui, e o desenvolvimento "trava" no nível médio/avançado. A causa-raiz é que a maioria dos frameworks combate o limite de contexto **adicionando estrutura que consome o próprio contexto**.

### A invariante (a regra que rege tudo)
> **O custo de contexto de uma tarefa é função da tarefa, não do tamanho do projeto.**
> Um projeto 10× maior não custa 10× mais tokens por tarefa. Não coube no orçamento → **decompõe a tarefa**.

Resultado medido: o CORE sempre-ligado fica em **~1k tokens** (a referência anterior media ~9–11k); cada tarefa recupera só os ≤5 arquivos que importam.

---

## Instalação (1 comando)

> Requisito único: **Node.js ≥ 18**. Zero dependências de runtime.

**Em um projeto novo ou existente** (após o pacote estar publicado no npm):

```bash
npx @igorkadu/harness scaffold .
```

Isso instala, no diretório atual: o motor (`src/` + `bin/` + `server/`), o `.ai/` (CORE, conhecimento, memória fresca), e os stubs de configuração para Claude Code, Antigravity e VSCode. Use `--force` para sobrescrever.

### Atualizar (upgrade) sem perder a memória
Em um projeto que já usa o Harness, **não rode `scaffold` por cima** (ele recusa, para te proteger). Use:
```bash
node bin/os.mjs upgrade .     # atualiza motor/bocas/CORE, PRESERVA .ai/memory + fase, faz backup em .ai/backup-*
```
Se não houver memória no destino, o `upgrade`/`scaffold` faz a instalação padrão (zerada).

**Ou via git (enquanto o npm não está publicado):**

```bash
git clone https://github.com/IgorKadu/harness   # repo a ser criado
cd harness
node bin/os.mjs doctor                            # valida a integridade
```

Depois de instalar, **reinicie a IDE** (servidores MCP só conectam no boot do processo) e rode:

```bash
node bin/os.mjs init     # onboarding guiado (detecta projeto novo vs. existente)
node bin/os.mjs scan     # varre o código e monta o code-map
```

### Setup guiado (recomendado)
O CLI tem uma interface amigável (banner + versão + passos):
```bash
node bin/os.mjs setup            # mostra o banner, detecta o ambiente e os próximos passos
node bin/os.mjs install all      # escreve as configs MCP certas (Claude Code, VSCode, Antigravity)
```
`install` aceita também um alvo específico: `claude` | `vscode` | `antigravity` | `cursor` | `windsurf`. Depois, **reinicie a IDE**.

Sem IDE? Use o **painel web** do orquestrador:
```bash
node bin/os.mjs serve         # abre http://localhost:4173
```

### Extensão (chat-orquestrador)
Painel lateral que conversa com você, estrutura a tarefa e entrega o handoff à LLM:
```bash
npm i -g @vscode/vsce
cd extension && vsce package     # gera o .vsix
# VSCode → Extensions → "…" → Install from VSIX…
```
Guia completo de conexão (MCP + extensão) para todas as ferramentas: **[CONNECT.md](./CONNECT.md)**.

---

## Como você usa no dia a dia (autonomia — ADR-0026)

**Você não precisa decorar comando nenhum.** O modelo é *autônomo por padrão*: você conversa em linguagem natural com a LLM, e é a **LLM** que aciona os mecanismos do Harness no momento certo (via MCP). Os comandos existem como **atalho opcional**, não como obrigação.

As **únicas** pausas deliberadas — as "travas boas" — são duas:
1. **Avançar de fase** (`discovery → execution → stabilization`): você decide quando o projeto muda de etapa.
2. **Aprovar o plano** de uma tarefa grande (`complex`): a LLM propõe, você confirma.

Isso garante **início, meio e fim** sem loop infinito — e sem você orquestrar o OS manualmente.

### O ciclo de vida (e como o diálogo muda)
O Harness calibra **quanto a LLM questiona vs. executa** conforme a fase:

| Fase | Postura da LLM | Foco |
|---|---|---|
| `discovery` | questiona **muito** | alinhar objetivo, escopo e direção antes de executar |
| `execution` | questiona o **pontual** | construir, alinhado ao rumo |
| `stabilization` | **sugestiva**, baixa fricção | concluir, estabilizar, evitar escopo novo |

Muitos diálogos no começo, pontuais no meio, conclusivos no fim. Melhorias podem ocorrer em qualquer fase.

---

## Configuração por ambiente

Os stubs abaixo já vêm prontos no scaffold. Todos apontam para o **mesmo binário** (`bin/os.mjs mcp`), que sobe o servidor MCP.

### Claude Code — `.claude/settings.json`
MCP nativo + slash commands (`/init`, `/sync`, `/work` em `.claude/commands/`). Reinicie o Claude Code após instalar.
```json
{ "mcpServers": { "harness": { "command": "node", "args": ["${CLAUDE_PROJECT_DIR}/bin/os.mjs", "mcp"] } } }
```

### Antigravity — `.gemini/settings.json`
MCP nativo + workflows em `.agents/workflows/`. Reinicie a IDE.
```json
{ "mcpServers": { "harness": { "command": "node", "args": ["${workspaceFolder}/bin/os.mjs", "mcp"] } } }
```

### VSCode — MCP nativo + extensão própria
- **MCP nativo (1.102+):** `.vscode/mcp.json` já aponta para `node bin/os.mjs mcp`. Abra a paleta → *MCP: List Servers*.
- **Extensão Harness (`extension/`):** um **painel de orquestração** na barra lateral. Você digita a intenção e recebe classificação, perguntas guiadas, decomposição e ações em **botões** — sem texto no chat. Empacote com `cd extension && vsce package` e instale o `.vsix`.
- **Agentes (Cline/Continue/Copilot):** aponte o MCP deles para `node bin/os.mjs mcp`.
- Também há **Tasks** (`Run Task → Harness: …`) para `doctor/brief/scan/sync/work`.

> Guia completo de conexão para todas as ferramentas: **[CONNECT.md](./CONNECT.md)**.

---

## As 23 ferramentas (tools MCP = espelho do CLI)

A LLM chama estas; você vê os equivalentes no CLI (`node bin/os.mjs <cmd>`).

| Tool / comando | Para quê |
|---|---|
| `os_orchestrate` / `next "<intenção>"` | **Orquestrador:** pacote de interação (classifica + perguntas + decompõe + ações + `awaiting`) |
| `os_handoff` / `handoff "<intenção>"` | **Entrega à LLM:** spec estruturada (objetivo/escopo/não-fazer/onde/como/porquê) |
| `os_gaps` / `gaps "<intenção>"` | **O que falta:** smells, arquivos sem teste, arquivo ausente |
| `os_metrics` / `metrics ["<intenção>"]` | Economia de contexto por tarefa vs. projeto inteiro |
| `os_suggest_routes` / `routes` | Sugere novas rotas a partir do histórico |
| `os_subtasks` / `subtasks <spawn\|status\|done>` | Subtarefas como sessões-filhas (progresso) |
| `os_template` / `template <api\|web\|cli\|lib>` | Seed por tipo de projeto |
| `os_session` / `session <start\|answer\|status\|clear>` | Chat-orquestrador persistente (conduz a conversa e resume) |
| `os_decompose` / `decompose "<intenção>"` | Quebra tarefa que estoura o orçamento em subtarefas |
| `os_read_core` / `read-core` | Carrega o CORE (CONSTITUTION + state-of-world) numa chamada |
| `os_brief` / `brief` | Situação + postura de diálogo (a LLM lê antes de falar com você) |
| `os_capabilities` / `caps` | Navegação interna: opções disponíveis + ação recomendada |
| `os_work` / `work "<intenção>"` | Recupera ≤5 arquivos + orçamento + candidatos de código |
| `os_route` / `route` | Só o roteamento |
| `os_init` / `init [new\|existing]` | Onboarding guiado (perguntas para conduzir) |
| `os_phase` / `phase [fase]` | Vê/avança a fase (a trava boa) |
| `os_scan` / `scan` | Varre o código → `code-map` consultável |
| `os_find` / `find "<termo>"` | Acha arquivos/símbolos no code-map |
| `os_recall` / `recall "<termo>"` | Grep nos logs sem carregar inteiro |
| `os_remember` / `remember <log> "<txt>"` | Registra na memória (append-only) |
| `os_sync` / `sync` | Reescreve a memória quente + re-escaneia se preciso |
| `os_doctor` / `doctor` | Integridade do índice/CORE/fase |
| `os_tokens` / `tokens` | Mede o CORE contra o teto |

---

## Arquitetura

**Um cérebro, várias bocas (ADR-0023).** Toda a lógica vive num motor único; as interfaces são adaptadores finos que o importam e **nunca duplicam lógica**.

```
Harness/
├── src/engine.mjs          # MOTOR — única fonte de lógica (zero-dep)
├── bin/os.mjs              # boca CLI (+ comando 'mcp' e 'scaffold')
├── server/mcp.mjs          # boca MCP (stdio, 14 tools)
├── .claude/ .gemini/ .vscode/ .agents/   # configs por ambiente
└── .ai/
    ├── CONSTITUTION.md          # CORE sempre-ligado (~600 tk)
    ├── retrieval-index.json     # rotas intenção→≤5 arquivos (+ schema)
    ├── memory/
    │   ├── state-of-world.md    # quente, reescrito (não incha)
    │   ├── decisions-index.md   # 1 linha por ADR
    │   └── logs/                # append-only, só consultado por grep
    ├── knowledge/               # skills/tools/regras (recuperados sob demanda)
    ├── bootstrap/questions.json # banco de perguntas do onboarding
    └── specs/ADR/               # decisões arquiteturais
```

**Camadas de contexto:** CORE (sempre, ~1k tk) → recuperado por tarefa (≤5 arquivos via índice) → código sob demanda (grep no momento, guiado pelos candidatos do `scan`). Nada é pré-carregado "por garantia".

### Decisões (ADRs)
- **0022** — Lean / Retrieval-First (fundamento)
- **0023** — Um cérebro, várias bocas (motor + adaptadores)
- **0024** — Comunicação adaptativa + navegação interna
- **0025** — Varredura zero-dep + code-map consultável
- **0026** — Operação autônoma (comandos como atalho, não trava)

---

## O que o torna diferente

Harness não aposta numa técnica só — combina o que funciona, enxuto: **retrieval-first** (contra o limite de contexto), **memória compilada** (estado reescrito + histórico append-only consultável), **ciclo de vida com postura adaptativa** (início/meio/fim sem loop), **navegação interna** (o OS informa suas opções à LLM) e **varredura zero-dep** (acompanha o crescimento do código). Tudo determinístico, independente da LLM e do nível do usuário.

---

## Desenvolvimento (trabalhar NO Harness)

```bash
node bin/os.mjs doctor      # integridade
node bin/os.mjs scan        # re-mapeia o código
node bin/os.mjs sync        # checkpoint da memória quente
```

Antes de abrir mudanças: leia `.ai/CONSTITUTION.md` e os ADRs em `.ai/specs/ADR/`.

## Licença
MIT — use, faça fork, publique.
