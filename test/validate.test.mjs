// Validation loop — sandboxed. Pass/fail capture + errors-log append.
import { test } from "node:test";
import assert from "node:assert/strict";
import { engine } from "./_sandbox.mjs";

test("validate reports PASS for a succeeding command", () => {
  const r = engine.validate({ command: "node -e \"process.exit(0)\"" });
  assert.equal(r.ran, true);
  assert.equal(r.passed, true);
  assert.match(r.summary, /PASS/);
});

test("validate captures failures and logs them", () => {
  const r = engine.validate({ command: "node -e \"console.error('AssertionError: boom'); process.exit(1)\"" });
  assert.equal(r.passed, false);
  assert.ok(r.exitCode !== 0);
  assert.ok(r.failures.length >= 1);
  // it appended a structured entry to the errors-log
  assert.ok(engine.recall("validate", { log: "errors" }).count >= 1);
});

test("detectChecks returns a stable shape", () => {
  const d = engine.detectChecks();
  assert.equal(typeof d.hasPackageJson, "boolean");
  assert.ok(Array.isArray(d.available));
});

test("validate with an unknown kind and no script does not run", () => {
  const r = engine.validate({ kind: "bogus" });
  assert.equal(r.ran, false);
  assert.ok(r.reason);
});
