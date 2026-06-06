// Central flows that lacked direct tests (found in the structured audit, G7): the orchestrate
// interaction packet, phase navigation/posture, and the code-map scan/search. Sandboxed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { engine } from "./_sandbox.mjs";

test("orchestrate returns a coherent interaction packet", () => {
  const p = engine.orchestrate("ajustar o roteamento");
  assert.ok(["trivial", "simple", "complex"].includes(p.classification));
  assert.ok(Array.isArray(p.actions) && p.actions.length >= 1);
  assert.ok("awaiting" in p);
  assert.ok(p.workingSet && typeof p.workingSet.within === "boolean");
});

test("orchestrate requires an intent", () => {
  assert.throws(() => engine.orchestrate("  "), /exige uma intencao/);
});

test("phase navigation transitions and drives posture", () => {
  engine.setPhase("execution");
  assert.equal(engine.getState().phase, "execution");
  assert.equal(engine.posture().phase, "execution");
  engine.setPhase("stabilization");
  assert.equal(engine.posture().focus, "concluir");
  assert.throws(() => engine.setPhase("bogus"), /fase invalida/);
});

test("scan builds a code-map and searchCode finds by term", () => {
  const r = engine.scan();
  assert.ok(r.fileCount > 0);
  assert.ok(Array.isArray(r.stack));
  const hits = engine.searchCode("saves");
  assert.equal(hits.scanned, true);
  assert.ok(hits.count >= 1);
});

test("brief carries phase, posture, saves status and a recommendation", () => {
  const b = engine.brief();
  assert.ok(b.phase && b.posture && b.saves);
  assert.equal(typeof b.recommended_next, "string");
});
