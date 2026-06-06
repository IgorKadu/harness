// Harness — Lean AI OS · CORE/paths
// Constantes de caminho compartilhadas por todos os modulos (zero-dep, ESM).
// Centralizar aqui evita recalcular ROOT em cada modulo e mantem uma so verdade.

import { dirname, resolve, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ROOT = raiz do pacote Harness (pai de src/). PROJECT_ROOT = projeto a analisar
// (pai de .harness/ quando instalado; senao a propria ROOT).
export const ROOT = resolve(__dirname, "..", "..");
export const PROJECT_ROOT = basename(ROOT) === ".harness" ? dirname(ROOT) : ROOT;

// AI root holds all mutable state (memory, saves, runtime). Overridable via HARNESS_AI_DIR
// so tests (and advanced setups) can point Harness at a sandbox without touching the repo.
export const AI = process.env.HARNESS_AI_DIR ? resolve(process.env.HARNESS_AI_DIR) : join(ROOT, ".ai");
export const INDEX_PATH = join(AI, "retrieval-index.json");
export const PROJECT_PATH = join(AI, "project.json");
export const QUESTIONS_PATH = join(AI, "bootstrap", "questions.json");
export const CODEMAP_PATH = join(AI, "runtime", "code-map.json");
export const SESSION_PATH = join(AI, "runtime", "session.json");
export const CHILDREN_PATH = join(AI, "runtime", "subsessions.json");
export const HANDOFF_PATH = join(AI, "handoff.md");
export const REPORT_PATH = join(AI, "report.md");
