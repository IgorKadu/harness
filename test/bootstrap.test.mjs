// Context capsule + focus pointer — sandboxed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { engine } from "./_sandbox.mjs";

test("capsule returns an ordered, token-bounded packet with a nextAction", () => {
  const c = engine.capsule();
  assert.ok(Array.isArray(c.readOrder) && c.readOrder[0] === "focus");
  assert.ok(typeof c.nextAction === "string" && c.nextAction.length > 0);
  assert.ok(c.capsuleTokens > 0);
  assert.equal(c.saves.bootstrapNeeded, true); // sandbox starts without Saves
});

test("capsule with an intent includes a bounded working-set", () => {
  const c = engine.capsule("ajustar roteamento");
  assert.ok(c.readOrder.includes("task"));
  assert.ok(c.task.load.length <= 5);
  assert.equal(typeof c.task.classification, "string");
});

test("focus set/show/clear round-trips", () => {
  assert.equal(engine.getFocus(), null);
  engine.setFocus({ objective: "concluir estabilizacao", step: 2, total: 4, next: "escrever testes" });
  let f = engine.getFocus();
  assert.equal(f.objective, "concluir estabilizacao");
  assert.equal(f.step, 2);
  engine.setFocus({ next: "rodar validate" });
  f = engine.getFocus();
  assert.equal(f.objective, "concluir estabilizacao");
  assert.equal(f.next, "rodar validate");
  engine.clearFocus();
  assert.ok(engine.getFocus().cleared);
});

test("capsule surfaces the focus thread; nextAction follows it once context exists", () => {
  engine.setFocus({ objective: "meta X", next: "passo Y" });
  // no Saves yet -> building context is the priority (bootstrap wins over focus)
  assert.match(engine.capsule().nextAction, /No Saves yet/);
  // once a Save exists -> the focus thread drives nextAction
  engine.writeSave(1, "overview", { stage: "pending" });
  const c = engine.capsule();
  assert.ok(c.focus && c.focus.objective === "meta X");
  assert.match(c.nextAction, /passo Y/);
});

test("escalate must not clobber a hard prerequisite (no Saves) in the capsule", () => {
  engine.reset({ confirm: true }); // clean state: no Saves -> bootstrap is the hard prerequisite
  const c = engine.capsule("migrar todos os arquivos em massa para outra linguagem");
  assert.equal(c.task.shape, "escalate");
  assert.match(c.nextAction, /No Saves yet/); // prerequisite wins, not the escalate advice
});
