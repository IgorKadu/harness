// Harness — Lean AI OS · MOTOR (o cerebro) — FACHADA / BARREL
// Funcoes PURAS: retornam dados, nao imprimem, nao chamam process.exit.
// Todas as bocas (CLI, MCP, web, extensao) importam daqui. Zero duplicacao (ADR-0023).
//
// A logica foi modularizada por dominio (ADR-0035). Este arquivo apenas re-exporta,
// preservando 100% da superficie publica historica (`import * as engine`).
//
//   core/        paths + util (base sem dependencia de outros modulos)
//   modules/     routing, tokens, memory, navigation, codemap, orchestrate,
//                session, gaps, channel, turbine, extensions, validate, saves, lifecycle
//   llm/         contract (a relacao Harness<->LLM, formalizada)

// ---- base ------------------------------------------------------------------
export { ROOT, PROJECT_ROOT } from "./core/paths.mjs";
export { estimateTokens, readIfExists, loadIndex, norm, fileTokens } from "./core/util.mjs";

// ---- dominios --------------------------------------------------------------
export { route, computeWorkingSet } from "./modules/routing.mjs";
export { measureCore, readCore, doctor, sync } from "./modules/tokens.mjs";
export { recall, remember, LOG_NAMES } from "./modules/memory.mjs";
export {
  PHASES, getState, setPhase, maturity, posture,
  capabilities, brief, detectKind, initPlan,
} from "./modules/navigation.mjs";
export { scan, loadCodeMap, searchCode, codeMapStale } from "./modules/codemap.mjs";
export { classify, decompose, orchestrate } from "./modules/orchestrate.mjs";
export {
  loadSession, clearSession, noteSession, resumeSession,
  startSession, answerSession, handoff, renderHandoff,
} from "./modules/session.mjs";
export { gaps } from "./modules/gaps.mjs";
export { validate, detectChecks } from "./modules/validate.mjs";
export {
  SAVE_LAYERS, SAVE_STAGES, savesStatus, readSaves, writeSave, initSaves, saveCheckpoint,
} from "./modules/saves.mjs";
export { reset, reforce, version } from "./modules/lifecycle.mjs";
export { capsule, getFocus, setFocus, clearFocus } from "./modules/bootstrap.mjs";
export { taskShape, verify, assess } from "./modules/assurance.mjs";
export {
  writeHandoffFile, handoffToFile, readHandoff, submitReport, readReport,
} from "./modules/channel.mjs";
export { inspectTree, analyzeProject, pipeline, automations } from "./modules/turbine.mjs";
export {
  spawnSubsessions, subStatus, setSubStatus,
  suggestRoutes, metrics, template, TEMPLATE_KINDS,
} from "./modules/extensions.mjs";

// ---- relacao com a LLM -----------------------------------------------------
export { llmContract, LLM_CONTRACT } from "./llm/contract.mjs";
