// Harness — Lean AI OS · module/validate
// Deterministic validation runner (ADR-0036). The Harness RUNS the project's checks
// (test/lint/typecheck/build/custom), captures failures, appends them to the errors-log,
// and returns a structured summary. The LLM reads the summary and iterates until green.
// Division of labor (LLM_CONTRACT): Harness = run+collect+log; LLM = fix the code.

import { execSync } from "node:child_process";
import { join } from "node:path";
import { PROJECT_ROOT } from "../core/paths.mjs";
import { readIfExists } from "../core/util.mjs";
import { remember } from "./memory.mjs";

// Map a logical check kind -> the npm script name we prefer, in order.
const KIND_SCRIPTS = {
  test: ["test", "tests", "spec"],
  lint: ["lint", "eslint"],
  typecheck: ["typecheck", "type-check", "tsc"],
  build: ["build", "compile"],
};

// Read the target project's package.json scripts (never the Harness' own).
function projectScripts() {
  const pj = readIfExists(join(PROJECT_ROOT, "package.json"));
  if (!pj) return {};
  try { return JSON.parse(pj).scripts || {}; } catch { return {}; }
}

// Which kinds are runnable right now (a matching script exists). Discoverable by the LLM.
export function detectChecks() {
  const scripts = projectScripts();
  const available = [];
  for (const [kind, names] of Object.entries(KIND_SCRIPTS)) {
    const hit = names.find((n) => scripts[n]);
    if (hit) available.push({ kind, script: hit, command: `npm run ${hit}` });
  }
  return { hasPackageJson: !!readIfExists(join(PROJECT_ROOT, "package.json")), available };
}

// Heuristic extraction of failure-ish lines from raw output (signals, not a parser).
function extractFailures(output, max = 25) {
  const re = /(\bfail(ed|ure)?\b|\berror\b|✖|✗|×|not ok|assert|expected|✘|cannot find|undefined is not|throw|Traceback|panic:)/i;
  const lines = output.split(/\r?\n/);
  const hits = [];
  for (const ln of lines) {
    const t = ln.trim();
    if (t && re.test(t)) hits.push(t.slice(0, 240));
    if (hits.length >= max) break;
  }
  return hits;
}

// Run one check. Returns a structured result; on failure, appends to the errors-log.
// opts: { kind="test", command=null (explicit override), log=true, timeoutMs=120000 }
export function validate({ kind = "test", command = null, log = true, timeoutMs = 120000 } = {}) {
  let cmd = command;
  let resolvedFrom = "explicit";
  if (!cmd) {
    const scripts = projectScripts();
    const names = KIND_SCRIPTS[kind];
    if (!names) return { ran: false, kind, reason: `unknown kind '${kind}'. Use: ${Object.keys(KIND_SCRIPTS).join("|")} or pass command.` };
    const hit = names.find((n) => scripts[n]);
    if (!hit) return { ran: false, kind, reason: `no '${kind}' script in package.json (looked for: ${names.join(", ")}). Pass an explicit command.`, detected: detectChecks() };
    cmd = `npm run ${hit}`;
    resolvedFrom = `package.json:${hit}`;
  }

  let stdout = "", passed = false, exitCode = 0;
  const started = Date.now();
  try {
    stdout = execSync(cmd, { cwd: PROJECT_ROOT, stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    passed = true;
  } catch (e) {
    exitCode = typeof e.status === "number" ? e.status : 1;
    stdout = (e.stdout || "") + (e.stderr ? "\n" + e.stderr : "");
    if (e.signal === "SIGTERM") stdout += `\n[harness] command timed out after ${timeoutMs}ms`;
  }
  const durationMs = Date.now() - started;
  const failures = passed ? [] : extractFailures(stdout);
  const tail = stdout.split(/\r?\n/).slice(-40).join("\n");

  if (!passed && log) {
    const head = failures.length ? failures.slice(0, 6).join(" | ") : (tail.slice(-240) || "exit " + exitCode);
    try { remember("errors", `validate[${kind}] FAIL (exit ${exitCode}) via '${cmd}': ${head}`); } catch { /* logs may not exist on a fresh target */ }
  }

  return {
    ran: true, kind, command: cmd, resolvedFrom,
    passed, exitCode, durationMs,
    failureCount: failures.length,
    failures,
    outputTail: tail,
    summary: passed
      ? `PASS ${kind} via '${cmd}' (${durationMs}ms)`
      : `FAIL ${kind} via '${cmd}' (exit ${exitCode}) — ${failures.length} failure-line(s). Fix the code and run os_validate again until green.`,
  };
}
