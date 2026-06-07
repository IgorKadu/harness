# Harness — Lean AI OS

> **O cérebro que fica entre você e a IA.** Você diz o que quer; o Harness entende, organiza e entrega para a IA já mastigado — com objetivo, escopo, onde mexer e o que **não** fazer. Assim a IA não se perde, você não repete as mesmas explicações, e o projeto não trava conforme cresce.

Pense assim: a **IA** é um dev júnior de potencial enorme, **você** é quem idealiza o projeto (mas nem sempre sabe o "como"), e o **Harness** é quem traduz a sua ideia em uma tarefa bem definida para a IA executar.

```
Você  ──▶  Harness (organiza, pergunta, estrutura)  ──▶  IA (executa com tudo definido)
   ▲                                                              │
   └──────────────────  resposta / entrega  ◀────────────────────┘
```

- **Zero dependências.** Só precisa de **Node.js 18+**.
- **Funciona com** Claude Code, VSCode, Cursor, Windsurf, Antigravity — e até no navegador, sem IDE.
- **Não enche o contexto da IA:** carrega só os arquivos que importam para a tarefa atual (~1k tokens fixos, não o projeto inteiro).

---

## Comece em 30 segundos

> Requisito: **Node.js 18+**. Nada mais para instalar.

| O que você quer | Comando (rode dentro da pasta do projeto) |
|---|---|
| **Instalar** num projeto novo ou existente | `npx @igorkadu/harness install` (menu interativo) |
| **Atualizar** o Harness sem perder sua memória | `node .harness/bin/os.mjs update` |
| **Conectar** com todas as IDEs de uma vez | `npx @igorkadu/harness install all` |
| **Ver o painel** (sem IDE, no navegador) | `npx @igorkadu/harness serve` |

É só isso para começar. Depois de instalar, **reinicie a sua IDE** (os servidores de IA só conectam ao abrir).

> ⚠️ **Uma regra para não errar:** use **ou** `npx @igorkadu/harness <comando>` (quando vem do npm) **ou** `node .harness/bin/os.mjs <comando>` (quando o Harness já está instalado no projeto, em `.harness/`). **Nunca os dois juntos** — `npx @igorkadu/harness node .harness/bin/os.mjs ...` dá erro.

<details>
<summary>Prefere usar via git em vez do npm? (clique para abrir)</summary>

```bash
git clone https://github.com/IgorKadu/harness
cd harness
node .harness/bin/os.mjs setup     # banner + detecta seu ambiente + próximos passos
```
Dentro de um projeto já instalado, todos os comandos viram `node .harness/bin/os.mjs <comando>` (sem `npx`).
</details>

---

## Como funciona (em 1 minuto)

1. **Você conversa** com a IA normalmente, em linguagem natural.
2. **A IA aciona o Harness** nos bastidores. Você não precisa decorar comando nenhum.
3. **O Harness organiza:** classifica a tarefa, faz as perguntas certas, aponta onde está o código, o que falta, e monta uma entrega clara.
4. **A IA executa** com tudo definido — sabendo onde mexer, como e o que evitar.

As **únicas** vezes em que o Harness para para te perguntar algo são duas (as "travas boas"):

1. **Mudar de fase** do projeto (`discovery → execution → stabilization`).
2. **Aprovar o plano** de uma tarefa grande.

| Fase | A IA… | Foco |
|---|---|---|
| `discovery` | pergunta **bastante** | alinhar objetivo e escopo antes de codar |
| `execution` | pergunta o **essencial** | construir |
| `stabilization` | quase não pergunta | concluir e estabilizar |

---

## O fluxo "smash" (Usuário → Harness → LLM)

1. A LLM (ou você via CLI) roda `os_pipeline`/`os_orchestrate`; ao final o Harness salva tudo em `.harness/.ai/handoff.md` — objetivo, escopo, o que **não** fazer, onde mexer, o que falta.
2. No chat da IDE (com a LLM), digite **`smash`**. A LLM lê o handoff (tool `os_smash`), executa seguindo o Harness e, ao terminar, registra o que fez (`os_report`).
3. Na próxima interação, o Harness lê esse relatório e já sabe o andamento — define o próximo passo com contexto e memória.

**Proteção:** o agente nunca edita a pasta `.harness/` (regra nas instruções + arquivos de ignore `.aiexclude`/`.cursorignore`/etc.). Só o seu projeto é alterado.

## Conectar com a sua ferramenta

Um comando configura tudo automaticamente:

```bash
npx @igorkadu/harness install all
```

Ou escolha só a sua: `install claude` · `install vscode` · `install cursor` · `install windsurf` · `install antigravity`. Depois **reinicie a IDE**.

| Ferramenta | Como conecta |
|---|---|
| **Claude Code** | configuração automática em `.claude/settings.json` |
| **VSCode** (1.102+) | `.vscode/mcp.json` — paleta → *MCP: List Servers* |
| **Cursor / Windsurf** | `.cursor/mcp.json` / `.windsurf/mcp.json` |
| **Antigravity** | `.gemini/settings.json` |
| **Cline / Continue / Copilot** | aponte o MCP deles para `node .harness/bin/os.mjs mcp` |
| **Sem IDE** | `npx @igorkadu/harness serve` → abre no navegador |

Passo a passo detalhado de cada uma: **[CONNECT.md](./CONNECT.md)**.

### A turbina (o Harness faz o trabalho pesado)
O Harness analisa o repositório e entrega o contexto pronto para a IA — você não precisa abrir painel nenhum, é tudo via as tools MCP / CLI:

```bash
node .harness/bin/os.mjs pipeline        # analisa o projeto (estrutura, stack, docs, testes, smells) + gera o handoff
node .harness/bin/os.mjs analyze         # perfil profundo do projeto
node .harness/bin/os.mjs inspect src     # lista uma pasta/módulo (protege .harness)
node .harness/bin/os.mjs automations     # catálogo de automações (globais/isoladas)
```

Interação direta **sem a LLM**: pelo CLI acima ou pelo painel web `node .harness/bin/os.mjs serve`.

---

## Comandos do dia a dia

Você raramente precisa deles (a IA aciona sozinha), mas existem como atalho. Dentro de um projeto instalado, use `node .harness/bin/os.mjs <comando>`:

```bash
node .harness/bin/os.mjs setup     # detecta o ambiente + próximos passos
node .harness/bin/os.mjs reset     # zera o Harness deste projeto (memória/saves) p/ início limpo
node .harness/bin/os.mjs update    # atualiza o Harness preservando memória e saves
node .harness/bin/os.mjs reforce   # pede à IA p/ recompilar memória/saves/docs ao estado atual
node .harness/bin/os.mjs doctor    # checa se está tudo íntegro
```

<details>
<summary>Lista completa de comandos (clique para abrir)</summary>

| Comando | Para quê |
|---|---|
| `next "<tarefa>"` | Organiza a tarefa: classifica + perguntas + decompõe + próximos passos |
| `session <start\|answer\|status\|resume\|clear>` | Conversa do orquestrador (lembra de onde parou) |
| `handoff "<tarefa>"` | Entrega estruturada para a IA |
| `gaps "<tarefa>"` | O que está faltando (testes, arquivos, pontos a melhorar) |
| `decompose "<tarefa>"` | Quebra tarefa grande em partes menores |
| `metrics ["<tarefa>"]` | Economia de contexto por tarefa |
| `routes` | Sugere novas rotas a partir do seu histórico |
| `subtasks <spawn\|status\|done>` | Subtarefas com progresso |
| `template <api\|web\|cli\|lib>` | Ponto de partida por tipo de projeto |
| `brief` / `caps` | Situação atual + opções disponíveis |
| `phase [discovery\|execution\|stabilization]` | Vê ou avança a fase |
| `init` / `scan` / `find "<termo>"` | Onboarding · mapeia o código · busca no mapa |
| `recall "<termo>"` / `remember <log> "<txt>"` | Consulta e registra na memória |
| `sync` / `tokens` / `doctor` | Manutenção e integridade |
| `install [alvo]` / `serve [porta]` / `upgrade [pasta]` | Conectar IDE · painel web · atualizar |

A IA aciona um **núcleo curado de ~20 ferramentas MCP** (`os_start`, `os_orchestrate`, `os_handoff`, `os_validate`, `os_assess`, …) — menos overhead de contexto (ADR-0042). O motor tem mais funções; o CLI é o espelho de todas.
</details>

---

## Para curiosos: como é por dentro

**Um cérebro, várias bocas.** Toda a lógica vive num motor único; CLI, servidor MCP e painel web são só "bocas" finas que chamam esse motor — sem duplicar nada.

```
Harness/
├── src/engine.mjs       # o cérebro: FACHADA que reexporta os módulos (zero dependências)
│   ├── core/            # base: paths, util, escrita atômica
│   ├── modules/         # domínios: routing, saves, validate, bootstrap, assurance, …
│   └── llm/             # o contrato Harness <-> LLM
├── bin/os.mjs           # boca: linha de comando (CLI, dispatcher fino)
├── server/mcp.mjs       # boca: servidor MCP (usado pelas IDEs)
├── server/web.mjs       # boca: painel web
└── .ai/
    ├── CONSTITUTION.md      # regras sempre-ligadas (~1k tokens)
    ├── retrieval-index.json # mapa "intenção → até 5 arquivos"
    ├── memory/              # estado atual + histórico (sua memória)
    └── specs/ADR/           # decisões de arquitetura
```

**A ideia central:** o custo de contexto depende da *tarefa*, não do *tamanho do projeto*. Um projeto 10× maior não custa 10× mais tokens por tarefa — se não couber, o Harness **divide a tarefa**. Por isso ele continua leve mesmo quando o projeto cresce.

Decisões de arquitetura (ADRs 0022–0044) ficam em `.ai/specs/ADR/`. Veja também o **[ROADMAP.md](./ROADMAP.md)** e o **[CHANGELOG.md](./CHANGELOG.md)**.

---

## Licença
MIT — use, faça fork, publique. Versão atual: **v0.9.4**.