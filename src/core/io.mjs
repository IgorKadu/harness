// Harness — Lean AI OS · CORE/io
// Atomic file write (ADR-0039): write to a temp file then rename. rename(2) is atomic on the
// same filesystem, so a crash or an ill-behaved editor can never leave a half-written/truncated
// durable file (the exact corruption class we hit in practice). Used by every durable writer.

import { writeFileSync, renameSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";

export function writeFileAtomic(abs, content) {
  const dir = dirname(abs);
  try { mkdirSync(dir, { recursive: true }); } catch { /* */ }
  const tmp = `${abs}.tmp-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(tmp, content, "utf8");
    renameSync(tmp, abs);
  } catch (e) {
    try { unlinkSync(tmp); } catch { /* */ }
    throw e;
  }
  return abs;
}
