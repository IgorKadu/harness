// Task shape (anti-explosion guard) + adversarial verify — read-only, deterministic.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as engine from "../src/engine.mjs";

test("taskShape keeps a tiny task single-pass", () => {
  const s = engine.taskShape("corrigir um typo no readme");
  assert.equal(s.shape, "single-pass");
});

test("taskShape escalates a repo-wide / mass task", () => {
  const s = engine.taskShape("migrar todos os arquivos do projeto para typescript em massa");
  assert.equal(s.shape, "escalate");
  assert.ok(s.recommendation.options.length >= 2);
  assert.match(s.recommendation.options[0], /Dynamic Workflows/);
});

test("taskShape flags adversarial/critical work for verification", () => {
  const s = engine.taskShape("revisar a seguranca da decisao de arquitetura");
  assert.equal(s.needsVerify, true);
});

test("taskShape requires an intent", () => {
  assert.throws(() => engine.taskShape("  "), /requires an intent/);
});

test("verify returns a refutation checklist", () => {
  const v = engine.verify("plano X");
  assert.ok(v.steps.length >= 4);
  assert.match(v.principle, /Independent verification/);
});

test("assess attaches verify only when high-stakes", () => {
  assert.equal(engine.assess("corrigir typo").verify, null);
  assert.ok(engine.assess("auditar seguranca de toda a base de codigo").verify);
});
