// Doctor integrity — sandboxed. Healthy install passes; a corrupted Save is detected.
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { engine, sandbox } from "./_sandbox.mjs";

test("doctor passes on a healthy install", () => {
  const r = engine.doctor();
  assert.equal(r.ok, true, r.checks.filter((c) => !c.ok).map((c) => c.msg).join("; "));
});

test("doctor flags a Save with an invalid stage", () => {
  // write a structurally valid Save, then corrupt its frontmatter stage on disk
  engine.writeSave(1, "body", { stage: "pending" });
  const f = join(sandbox, "saves", "save-1-overview.md");
  writeFileSync(f, "---\nlayer: 1\ntitle: Overview\nstage: BROKEN\nupdated: x\n---\n# Save\n", "utf8");
  const r = engine.doctor();
  assert.equal(r.ok, false);
  assert.ok(r.checks.some((c) => !c.ok && /stage invalido/.test(c.msg)));
});
