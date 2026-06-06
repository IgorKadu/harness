# ADR-0038 — Interactive installer, clean install, and a minimal user command surface

- **Status:** accepted
- **Date:** 2026-06-04
- **Prior context:** ADR-0023 (one brain, many mouths), ADR-0030/0031/0032 (discrete install),
  ADR-0033 (channel + .harness protection), ADR-0037 (save points).

## Problem
Three gaps in the install/usage experience:
1. `install` required the user to know and type the target IDE (`install claude`). There was no
   guided screen to pick the development environment.
2. The CLI exposed ~30 commands. Most are internal (the LLM drives them via MCP, or the CLI
   fallback). A human scanning `help` could run `work`/`scan`/`orchestrate` by accident.
3. There was no first-class way to (a) wipe an install clean between projects, (b) update the
   Harness without losing memory/saves, or (c) ask the LLM to recompile/condense its memory.

## Decision
**Add an interactive installer, guarantee a clean install, and reduce the user surface to three
lifecycle commands; everything else becomes internal (still functional, hidden from help).**

### Interactive installer
- `bin/installer.mjs` (zero-dep `readline`): a numbered menu lists the environments (Claude Code,
  Antigravity, Cursor, Windsurf, VS Code, or all). The user types a number (or several). Non-TTY
  falls back to "all". `install <target>` still skips the menu.
- After selection it runs `scaffold.install`, which adapts the folders/files/instructions for the
  chosen environment(s).

### Clean install
- A fresh install vendors the engine/knowledge/config but writes **zeroed** memory (skeleton
  state-of-world, empty append-only logs, `project.json` at discovery) and **no Saves** (their
  absence is the bootstrap signal). No data from other projects leaks in. A `VERSION` marker is
  written into `.harness/`. The published npm package excludes the Harness' own memory/saves/ADRs.

### Minimal user command surface
- Public (shown in `help`): `install`, `setup`, `reset`, `update`, `reforce`, `help`.
- `reset` — wipe this install to a freshly-installed state: clears memory logs, decisions-index,
  state-of-world, project.json, Saves, runtime and the transient channel files; preserves the
  engine, knowledge, retrieval-index and specs. Requires confirmation (`--yes` to skip).
- `update` — re-vendor the newer Harness while **preserving** memory and Saves (vendor never
  touches `.ai/saves`; memory is preserved via the upgrade backup path). Reports version delta.
- `reforce` — returns a deterministic directive (also MCP `os_reforce`) telling the LLM to
  recompile and condense memory/Saves/docs to the current state without losing critical signal.
- All other commands remain dispatchable (the LLM needs them in the CLI fallback per ADR-0023)
  but are **hidden** from `help`. Slash commands (`.claude/commands`, `.agents/commands`) ship
  only `/reset`, `/update`, `/reforce`.

### Default usage
After install the user just talks to the LLM. The generated instruction docs already explain
what the Harness can do and how (saves-first protocol, tools), so the LLM runs the right flows.

## Consequences
### Positive
- One guided screen; the package adapts to the chosen environment.
- No accidental use of internal commands; the human surface is tiny and intentional.
- Clean installs and a real reset/update/reforce lifecycle — safe to reuse across projects.

### Negative / accepted trade-offs
- Numbered menu (not arrow-key TUI) — chosen for zero-dep robustness over polish.
- Internal commands are hidden, not hard-blocked, so a determined user can still run them; this
  is required so the LLM's CLI fallback keeps working (ADR-0023).

## Alternatives considered
- **Arrow-key TUI** — rejected: needs raw-mode/escape handling, fragile across terminals.
- **Hard-gating internal commands behind a flag** — rejected: adds friction to the LLM CLI
  fallback; hiding from help achieves the intent without breaking the mouth.

## Future impact
New environments are one row in the installer menu + a `SHAPES` entry. The reset/reforce
skeletons are the single source for "clean state"; freshness checks on Saves can build on the
`VERSION` marker later.
