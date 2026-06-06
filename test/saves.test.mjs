// Save points — sandboxed. Bootstrap, write, read, checkpoint, structural update.
import { test } from "node:test";
import assert from "node:assert/strict";
import { engine } from "./_sandbox.mjs";

test("savesStatus reports bootstrap when no Saves exist", () => {
  const st = engine.savesStatus();
  assert.equal(st.bootstrapNeeded, true);
  assert.match(st.recommendation, /NO SAVES YET/);
});

test("writeSave then readSaves round-trips with frontmatter stage", () => {
  const w = engine.writeSave(1, "Goal: test project.", { stage: "pending" });
  assert.equal(w.layer, 1);
  const r = engine.readSaves(1);
  assert.ok(r.exists);
  assert.match(r.text, /stage: pending/);
  assert.match(r.text, /Goal: test project\./);
});

test("writeSave rejects an unknown layer and an invalid stage", () => {
  assert.throws(() => engine.writeSave(9, "x"), /unknown save layer/);
  assert.throws(() => engine.writeSave(1, "x", { stage: "bogus" }), /invalid stage/);
});

test("structural checkpoint updates all three layers and bumps stage", () => {
  const r = engine.saveCheckpoint({ layers: "all", note: "marco estrutural", stage: "done" });
  assert.equal(r.updated.length, 3);
  assert.ok(r.updated.every((u) => u.stage === "done"));
  const st = engine.savesStatus();
  assert.equal(st.bootstrapNeeded, false);
  assert.ok(st.layers.every((l) => l.exists));
});

test("saveCheckpoint requires a note", () => {
  assert.throws(() => engine.saveCheckpoint({ note: "  " }), /requires a note/);
});
