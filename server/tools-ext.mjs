// Harness — Lean AI OS · MCP tool catalog (extended group)
// Turbine, insights, lifecycle, save points, capsule and assurance tools. Kept separate from
// the core catalog so each file stays small and single-purpose (ADR-0035/0039).

import * as engine from "../src/engine.mjs";

const J = (o) => JSON.stringify(o, null, 2);

export const TOOLS_EXT = [
  {
    name: "os_pipeline",
    description: "TURBINA (ADR-0034): fluxo padrao de desenvolvimento. O Harness faz o pesado no repo (scan + analyze + gaps) e ENTREGA o perfil do projeto + escreve handoff.md p/ a LLM. Use isto no inicio de um projeto novo ou existente. Param intent opcional.",
    inputSchema: { type: "object", properties: { intent: { type: "string" } } },
    run: ({ intent }) => J(engine.pipeline(intent || "")),
  },
  {
    name: "os_analyze",
    description: "Perfil profundo do PROJETO (nao do Harness): estrutura, stack, entrypoints, configs, docs, testes, dependencias, scripts e smells. Para a LLM entender o projeto sem ler tudo.",
    inputSchema: { type: "object", properties: {} },
    run: () => J(engine.analyzeProject()),
  },
  {
    name: "os_inspect",
    description: "Lista pastas/arquivos do projeto (ou de uma subpasta). Escopado e seguro: protege .harness e ignora ruido (node_modules, .git, build). Use sub para isolar um modulo (ex: src/payments).",
    inputSchema: { type: "object", properties: { sub: { type: "string" } } },
    run: ({ sub }) => J(engine.inspectTree(sub || ".")),
  },
  {
    name: "os_automations",
    description: "Catalogo das automacoes (bots) do Harness — globais e isoladas — que a LLM pode acionar para o trabalho pesado no repo.",
    inputSchema: { type: "object", properties: {} },
    run: () => J(engine.automations()),
  },
  {
    name: "os_report",
    description: "A LLM submete o documento do que foi feito. O Harness guarda em .harness/.ai/report.md e o LE na proxima interacao p/ saber o andamento. Feche toda tarefa com isto.",
    inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
    run: ({ text }) => { const r = engine.submitReport(text); return "Relatorio salvo em " + r.path + " (" + r.stamp + ")."; },
  },
  {
    name: "os_saves",
    description: "SAVE POINTS (ADR-0037) — READ THIS FIRST, before any heavy flow. Returns the status of the 3 checkpoint layers (1 overview, 2 progress, 3 technical), each with its lifecycle stage, plus a recommendation: if Saves exist and are fresh, resume from them (cheap, saves tokens); if missing, run the flows and then write them. Pass 'layer' (1|2|3|overview|progress|technical) to read that layer's full content; omit to read all.",
    inputSchema: { type: "object", properties: { layer: { type: "string", description: "1|2|3 or overview|progress|technical; omit for all" }, status: { type: "boolean", description: "true = only the status summary (default), false/with layer = read content" } } },
    run: ({ layer, status }) => {
      if (layer != null) return J(engine.readSaves(layer));
      if (status === false) return J(engine.readSaves());
      return J(engine.savesStatus());
    },
  },
  {
    name: "os_save_write",
    description: "Write/replace a Save layer's body (ADR-0037). The LLM composes the body (markdown); Harness owns the frontmatter. Use after finishing work that changed this layer. layer=1|2|3 (or slug); stage=initial|pending|done (lifecycle of this layer).",
    inputSchema: { type: "object", properties: { layer: { type: "string" }, body: { type: "string" }, stage: { type: "string", enum: ["initial", "pending", "done"] } }, required: ["layer", "body"] },
    run: ({ layer, body, stage }) => J(engine.writeSave(layer, body, stage ? { stage } : {})),
  },
  {
    name: "os_save_checkpoint",
    description: "Append a checkpoint note to the affected Save layer(s) and bump their stage/updated (ADR-0037). Update only the adequate layer; if the change is STRUCTURAL, pass layers='all' to update them all. Use this as a closing step alongside os_remember/os_sync.",
    inputSchema: { type: "object", properties: { note: { type: "string" }, layers: { description: "'all' or array of 1|2|3" }, stage: { type: "string", enum: ["initial", "pending", "done"] } }, required: ["note"] },
    run: ({ note, layers, stage }) => J(engine.saveCheckpoint({ note, layers: layers || "all", stage: stage || null })),
  },
  {
    name: "os_reforce",
    description: "REFORCE (ADR-0038): returns a deterministic directive telling YOU (the LLM) to recompile and condense the project's memory, Saves and docs to the CURRENT state — a refinement pass that tightens wording and drops redundancy without losing critical decisions. Execute the returned steps (scan -> read Saves -> rewrite -> os_sync -> os_save_checkpoint all).",
    inputSchema: { type: "object", properties: {} },
    run: () => J(engine.reforce()),
  },
  {
    name: "os_start",
    description: "CONTEXT CAPSULE (ADR-0040) — CALL THIS FIRST, before anything else. Returns ONE token-bounded packet, in priority order, with exactly what you need now to start/continue/conclude: focus (the current thread), saves digest (where we are + which layers are STALE because code changed after them), phase posture (how to behave), and an explicit nextAction. Pass an optional intent to also get the <=5-file working-set for that task. Reading this replaces re-running brief+saves+pipeline; act on nextAction and do not re-derive what the capsule already answers.",
    inputSchema: { type: "object", properties: { intent: { type: "string", description: "optional task intent to include its working-set" } } },
    run: ({ intent }) => J(engine.capsule(intent || null)),
  },
  {
    name: "os_focus",
    description: "The live thread pointer (ADR-0040): the current objective + step + next action that keeps you on-task across the window and across sessions. action=show|set|clear. set accepts objective, step, total, next. Update it whenever the current step changes; read it (or os_start) to resume without drifting.",
    inputSchema: { type: "object", properties: { action: { type: "string", enum: ["show", "set", "clear"] }, objective: { type: "string" }, step: { type: "number" }, total: { type: "number" }, next: { type: "string" } } },
    run: ({ action, objective, step, total, next }) => {
      if (action === "clear") return J(engine.clearFocus());
      if (action === "set") return J(engine.setFocus({ objective: objective || null, step: step ?? null, total: total ?? null, next: next || null }));
      return J(engine.getFocus() || { focus: null });
    },
  },
  {
    name: "os_assess",
    description: "TASK SHAPE + VERIFY (ADR-0041, inspired by Dynamic Workflows without the cost). Tells you the SHAPE of a task: 'single-pass' (fits one context — just do it) or 'escalate' (large/parallel/long — do NOT grind it in one context window; delegate to native Dynamic Workflows or os_decompose into subsessions). Also returns an adversarial verify checklist when the result is high-stakes. Use before starting a big or critical task to avoid exploding tokens.",
    inputSchema: { type: "object", properties: { intent: { type: "string" } }, required: ["intent"] },
    run: ({ intent }) => J(engine.assess(intent)),
  },
  {
    name: "os_verify",
    description: "ADVERSARIAL VERIFICATION (ADR-0041): a refutation checklist to run BEFORE accepting a high-stakes result (complex plan, security/architecture/critical decision, large change). Attack your own answer from an independent angle and iterate until it converges. Cheap, in-context; never report green without an actual os_validate PASS.",
    inputSchema: { type: "object", properties: { intent: { type: "string" } } },
    run: ({ intent }) => J(engine.verify(intent || null)),
  }
];
