// Harness — Lean AI OS · modulo/codemap (ADR-0025)
// Varredura zero-dep do codigo do PROJETO-ALVO -> code-map.json consultavel.
// Extracao por regex (sinais, nao AST). searchCode devolve ponteiros, nao blobs.

import { readdirSync, existsSync, statSync, mkdirSync } from "node:fs";
import { writeFileAtomic } from "../core/io.mjs";
import { join } from "node:path";
import { ROOT, PROJECT_ROOT, AI, CODEMAP_PATH } from "../core/paths.mjs";
import { readIfExists, norm } from "../core/util.mjs";

const SCAN_IGNORE = new Set([".harness", "node_modules", ".git", ".ai", "dist", "build", "coverage", ".vscode", ".idea", ".cursor", ".gemini", ".claude", ".windsurf", ".agents", "tmp", "out", ".next", ".nuxt", "vendor"]);
const CODE_EXT = {
  ".mjs": "javascript", ".cjs": "javascript", ".js": "javascript", ".jsx": "javascript",
  ".ts": "typescript", ".tsx": "typescript", ".py": "python", ".go": "go", ".rs": "rust",
  ".java": "java", ".rb": "ruby", ".php": "php", ".c": "c", ".h": "c", ".cpp": "cpp", ".cs": "csharp",
};
const LARGE_FILE_LINES = 300;

function extOf(name) { const i = name.lastIndexOf("."); return i < 0 ? "" : name.slice(i); }

function walkCode(dir, rootAbs, acc) {
  let entries = [];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (e.name.startsWith(".") && e.name !== ".") { if (SCAN_IGNORE.has(e.name)) continue; }
    if (SCAN_IGNORE.has(e.name)) continue;
    const abs = join(dir, e.name);
    if (e.isDirectory()) walkCode(abs, rootAbs, acc);
    else if (e.isFile() && CODE_EXT[extOf(e.name)]) acc.push(abs);
  }
  return acc;
}

// Extracao por regex (sinais, nao AST) — ADR-0025.
function extractSymbols(content, lang) {
  const exports = new Set();
  const imports = new Set();
  const reExp = [
    /export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z0-9_$]+)/g,
    /export\s*\{([^}]+)\}/g,
    /(?:^|\n)\s*(?:public\s+|def\s+)([A-Za-z0-9_]+)\s*\(/g, // python/java-ish
  ];
  for (const re of reExp) {
    let m; while ((m = re.exec(content))) {
      m[1].split(",").forEach((s) => { const n = s.split(/\s+as\s+/)[0].trim(); if (n && /^[A-Za-z0-9_$]+$/.test(n)) exports.add(n); });
    }
  }
  const reImp = [
    /import\s+[^'"]*from\s+['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /(?:^|\n)\s*(?:from|import)\s+([A-Za-z0-9_.]+)/g, // python
  ];
  for (const re of reImp) { let m; while ((m = re.exec(content))) imports.add(m[1]); }
  return { exports: [...exports].slice(0, 40), imports: [...imports].slice(0, 40) };
}

function detectStack(rootAbs) {
  const stack = [];
  const has = (f) => existsSync(join(rootAbs, f));
  if (has("package.json")) stack.push("node");
  if (has("tsconfig.json")) stack.push("typescript");
  if (has("requirements.txt") || has("pyproject.toml") || has("setup.py")) stack.push("python");
  if (has("Cargo.toml")) stack.push("rust");
  if (has("go.mod")) stack.push("go");
  if (has("pom.xml") || has("build.gradle")) stack.push("java");
  if (has("Gemfile")) stack.push("ruby");
  return stack;
}

export function scan() {
  const files = walkCode(PROJECT_ROOT, PROJECT_ROOT, []);
  const out = [];
  const smells = [];
  let totalLines = 0;
  for (const abs of files) {
    const rel = abs.slice(PROJECT_ROOT.length + 1).split("\\").join("/");
    const content = readIfExists(abs);
    if (content == null) continue;
    const lines = content.split("\n").length;
    totalLines += lines;
    const lang = CODE_EXT[extOf(abs)] || "unknown";
    const { exports, imports } = extractSymbols(content, lang);
    out.push({ path: rel, lang, lines, exports, imports });
    if (lines > LARGE_FILE_LINES) smells.push({ kind: "large_file", path: rel, lines });
  }
  out.sort((a, b) => a.path.localeCompare(b.path));
  const map = {
    generated: new Date().toISOString(),
    root: PROJECT_ROOT.split("\\").join("/"),
    stack: detectStack(PROJECT_ROOT),
    fileCount: out.length,
    totalLines,
    smells,
    files: out,
  };
  try { mkdirSync(join(AI, "runtime"), { recursive: true }); } catch { /* */ }
  writeFileAtomic(CODEMAP_PATH, JSON.stringify(map, null, 2) + "\n", "utf8");
  return { fileCount: map.fileCount, totalLines, stack: map.stack, smells: map.smells, path: ".ai/runtime/code-map.json" };
}

export function loadCodeMap() {
  const raw = readIfExists(CODEMAP_PATH);
  if (raw == null) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// Busca no code-map por termo (path/simbolo). Retorna top-N candidatos (ponteiros).
export function searchCode(query, { max = 8 } = {}) {
  const map = loadCodeMap();
  if (!map) return { query, scanned: false, count: 0, hits: [], note: "code-map ausente — rode 'os scan'." };
  const terms = norm(query).split(/\s+/).filter((t) => t.length >= 3);
  const scored = [];
  for (const f of map.files) {
    let score = 0;
    const np = norm(f.path);
    const nsym = norm((f.exports || []).join(" "));
    for (const t of terms) {
      if (np.includes(t)) score += 3;
      if (nsym.includes(t)) score += 2;
    }
    if (score > 0) scored.push({ path: f.path, lines: f.lines, lang: f.lang, exports: (f.exports || []).slice(0, 6), score });
  }
  scored.sort((a, b) => b.score - a.score);
  return { query, scanned: true, count: scored.length, hits: scored.slice(0, max) };
}

// Code-map obsoleto? (algum arquivo de codigo mudou apos a ultima varredura) — ADR-0025/0026
export function codeMapStale() {
  const map = loadCodeMap();
  if (!map) return true;
  const gen = new Date(map.generated).getTime();
  const files = walkCode(PROJECT_ROOT, PROJECT_ROOT, []);
  if (files.length !== map.fileCount) return true;
  for (const abs of files) { try { if (statSync(abs).mtimeMs > gen) return true; } catch { /* */ } }
  return false;
}
