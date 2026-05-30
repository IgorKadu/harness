# ADR-0031 — 'install' instala o Harness COMPLETO (qualquer IDE)

- **Status:** aceito
- **Data:** 2026-05-30
- **Depende de:** ADR-0030 (instalacao discreta em .harness/).

## Problema
`install <ide>` (alvo especifico) so escrevia a config MCP apontando para `npx`, SEM instalar
o Harness: nao criava `.harness/` (motor, `.ai`, extensao). E o `npx ... mcp` rodava o motor
do cache do npm, operando na memoria errada. Resultado: instalacao incompleta e nao-obvia.

## Decisao
Qualquer `install <ide|all>` agora:
1. **Garante o `.harness/` completo** (motor + bocas + `.ai` + extensao) — vendoriza se ausente,
   preservando memoria se ja existir;
2. escreve a(s) config(s) MCP da(s) IDE(s) pedida(s), **sempre apontando para o `.harness/` local**
   (`node .harness/bin/os.mjs mcp`), nunca para npx (que operaria na memoria errada);
3. informa claramente o que foi instalado + o caminho do `.vsix` da extensao.

`scaffold` = instalacao completa + todas as configs; `install <ide>` = completa + config daquela IDE.

## Consequencias
- "So conectar e usar" em qualquer IDE (Antigravity, Cursor, Windsurf, VSCode, Claude Code).
- O MCP sempre opera na memoria do projeto (`.harness/.ai`), nunca na do pacote.
- Fonte unica das configs/instalacao em bin/scaffold.mjs (sem duplicacao no CLI).
