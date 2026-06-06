// Atomic write helper — isolated temp files (no engine state needed).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileAtomic } from "../src/core/io.mjs";

test("writeFileAtomic writes, overwrites, and leaves no temp file", () => {
  const dir = mkdtempSync(join(tmpdir(), "harness-io-"));
  const f = join(dir, "nested", "state.json");
  writeFileAtomic(f, "v1");
  assert.equal(readFileSync(f, "utf8"), "v1");
  writeFileAtomic(f, "v2-longer-content");
  assert.equal(readFileSync(f, "utf8"), "v2-longer-content");
  // shrinking must not leave trailing garbage (the corruption class we guard against)
  writeFileAtomic(f, "x");
  assert.equal(readFileSync(f, "utf8"), "x");
  const leftovers = readdirSync(join(dir, "nested")).filter((n) => n.includes(".tmp-"));
  assert.equal(leftovers.length, 0, "no .tmp- leftovers");
  assert.ok(existsSync(f));
});
