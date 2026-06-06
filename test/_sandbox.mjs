// Test sandbox: copy the repo .ai into a temp dir and point Harness at it via HARNESS_AI_DIR,
// so stateful tests never touch the real repo. Each test file runs in its own process
// (node --test), so each gets an isolated sandbox. Engine is imported AFTER the env is set.

import { mkdtempSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
export const sandbox = mkdtempSync(join(tmpdir(), "harness-test-"));
cpSync(join(repo, ".ai"), sandbox, { recursive: true });
// start each sandbox without Saves so bootstrap behaviour is testable
try { rmSync(join(sandbox, "saves"), { recursive: true, force: true }); } catch { /* */ }
process.env.HARNESS_AI_DIR = sandbox;

export const engine = await import("../src/engine.mjs");
