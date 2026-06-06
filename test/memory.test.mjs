// Memory logs — append-only, sandboxed (HARNESS_AI_DIR), never touches the repo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { engine } from "./_sandbox.mjs";

test("remember appends and recall finds it (append-only)", () => {
  engine.remember("tasks", "primeira entrada de teste");
  engine.remember("tasks", "segunda entrada de teste");
  const r = engine.recall("entrada de teste");
  assert.equal(r.count, 2);
  // append-only: the first entry survives the second write
  assert.ok(r.hits.some((h) => h.text.includes("primeira")));
});

test("remember rejects an unknown log", () => {
  assert.throws(() => engine.remember("nope", "x"), /log invalido/);
});

test("remember rejects an empty entry", () => {
  assert.throws(() => engine.remember("tasks", "   "), /vazio/);
});
