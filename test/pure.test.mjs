// Pure / deterministic functions — read-only against the real repo .ai (no writes).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as engine from "../src/engine.mjs";

test("norm lowercases and strips accents", () => {
  assert.equal(engine.norm("ARVORE acao"), "arvore acao");
  assert.equal(engine.norm("Acao"), "acao");
  assert.equal(engine.norm(null), "");
});

test("estimateTokens ~ chars/4", () => {
  assert.equal(engine.estimateTokens("abcd"), 1);
  assert.equal(engine.estimateTokens(""), 0);
  assert.equal(engine.estimateTokens(null), 0);
});

test("route returns always-files for any intent", () => {
  const r = engine.route("qualquer coisa xyz");
  assert.ok(Array.isArray(r.files));
  assert.ok(r.files.includes(".ai/CONSTITUTION.md"));
});

test("classify flags heavy intents as complex", () => {
  assert.equal(engine.classify("refatorar a arquitetura inteira"), "complex");
});

test("computeWorkingSet respects the budget cap", () => {
  const ws = engine.computeWorkingSet("ajustar roteamento");
  assert.equal(typeof ws.within, "boolean");
  assert.ok(ws.cap > 0);
});

test("decompose returns a stable shape", () => {
  const d = engine.decompose("pequeno ajuste de teste");
  assert.equal(typeof d.needed, "boolean");
  assert.ok(Array.isArray(d.subtasks));
});

test("LLM_CONTRACT declares the decision boundary", () => {
  assert.equal(engine.LLM_CONTRACT.fronteira.aprovacao, "user");
  assert.equal(engine.LLM_CONTRACT.fronteira.implementacao, "llm");
});
