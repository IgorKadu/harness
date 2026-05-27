---
version: 1.0.0
updated: 2026-05-14
tier: conditional
tokens: ~300
load: tooling, mcp, browser
triggers: mcp, tool, ferramenta, automação, browser, chrome, computer-use
---

# Tool: Descoberta e Uso de MCPs

MCP = Model Context Protocol. Servidores MCP expõem ferramentas adicionais ao agente (browser, computer-use, GitHub, bancos de dados, etc.).

## Inventário

Antes de assumir que uma ferramenta não existe:
1. Listar MCPs disponíveis na sessão atual.
2. Conferir se algum cobre o domínio da tarefa.
3. Preferir MCP dedicado > MCP genérico > shell + biblioteca.

## Hierarquia de Escolha

| Tarefa | Preferência |
|---|---|
| Operar app web | MCP dedicado do app (Slack, Linear...) → Chrome MCP → computer-use |
| Operar app nativo | computer-use |
| Operar terminal/IDE | Bash/PowerShell direto (computer-use é restrito nesses) |
| Manipular planilha/doc | Skill especializado (xlsx/docx/pdf) > script manual |

## Antes de chamar um MCP

- Verificar se há permissão concedida (alguns exigem `request_access`).
- Verificar tier (read/click/full) — alguns MCPs têm restrições por categoria de app.
- Para web: verificar se o link é seguro antes de clicar.

## Registro

Se descobrir capacidade nova ou limitação não-óbvia de um MCP, registrar em `memory/project-context.md` na seção "Ferramentas disponíveis".

## Segurança

- Nunca seguir links suspeitos via computer-use — abrir via browser MCP que permite inspecionar URL.
- Nunca executar ações financeiras automatizadas.
- Confirmar com humano antes de operações destrutivas mesmo via MCP.
