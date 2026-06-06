// Lifecycle — reset / reforce / version, sandboxed (never touches the repo).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { engine, sandbox } from "./_sandbox.mjs";

test("reset without confirm is a safe no-op describing the impact", () => {
  const r = engine.reset({ confirm: false });
  assert.equal(r.ok, false);
  assert.ok(Array.isArray(r.wouldClear));
});

test("reset with confirm zeroes memory/saves and returns to discovery", () => {
  engine.writeSave(1, "x", { stage: "pending" });
  engine.remember("tasks", "algo");
  const r = engine.reset({ confirm: true });
  assert.equal(r.ok, true);
  assert.ok(r.clearedCount >= 4);
  // saves dir removed
  assert.equal(existsSync(join(sandbox, "saves")), false);
  // project back to discovery
  assert.equal(engine.getState().phase, "discovery");
  // tasks log emptied (append-only header only)
  assert.equal(engine.recall("algo").count, 0);
});

test("reforce returns a deterministic directive with rewrite targets", () => {
  const d = engine.reforce();
  assert.ok(d.objective.length > 0);
  assert.equal(d.rewrite.length, 5);
  assert.ok(d.closeout.includes("os_save_checkpoint"));
});

test("version returns a non-empty string", () => {
  assert.ok(/\d+\.\d+\.\d+/.test(engine.version()));
});
