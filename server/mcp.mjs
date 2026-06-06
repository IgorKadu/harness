#!/usr/bin/env node
// Harness — Lean AI OS · servidor MCP (a "boca" MCP do motor — ADR-0023/0024)
// Transporte: stdio, JSON-RPC 2.0 newline-delimited (protocolo MCP 2024-11-05). Zero-dep.
// NAO contem logica nem catalogo: importa TOOLS de ./tools.mjs (que importa src/engine.mjs).

import { TOOLS } from "./tools.mjs";

const PROTOCOL = "2024-11-05";
const SERVER = { name: "harness-lean-ai-os", version: "0.6.0" };

// Curated CORE surface advertised to the model (ADR-0042). Fewer tools = far less fixed token
// overhead per session and better tool selection (MCP SEP-1576 / "too many tools"). The rest stay
// callable via tools/call and via the CLI, but are NOT listed so they do not crowd the window.
const CORE_TOOLS = new Set([
  "os_start", "os_orchestrate", "os_handoff", "os_smash", "os_report", "os_validate", "os_assess",
  "os_saves", "os_save_write", "os_save_checkpoint", "os_focus", "os_scan", "os_find", "os_recall",
  "os_remember", "os_sync", "os_doctor", "os_pipeline", "os_phase", "os_subtasks",
]);

const TOOL_MAP = Object.fromEntries(TOOLS.map((t) => [t.name, t]));

function send(msg) { process.stdout.write(JSON.stringify(msg) + "\n"); }
function result(id, res) { send({ jsonrpc: "2.0", id, result: res }); }
function error(id, code, message) { send({ jsonrpc: "2.0", id, error: { code, message } }); }

function handle(msg) {
  const { id, method, params } = msg;
  if (method === "initialize") return result(id, { protocolVersion: PROTOCOL, capabilities: { tools: {} }, serverInfo: SERVER });
  if (method === "notifications/initialized" || method === "initialized") return;
  if (method === "ping") return result(id, {});
  if (method === "tools/list") return result(id, { tools: TOOLS.filter((t) => CORE_TOOLS.has(t.name)).map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
  if (method === "tools/call") {
    const t = TOOL_MAP[params?.name];
    if (!t) return error(id, -32602, `tool desconhecida: ${params?.name}`);
    try { return result(id, { content: [{ type: "text", text: t.run(params.arguments || {}) }] }); }
    catch (e) { return result(id, { content: [{ type: "text", text: "Erro: " + e.message }], isError: true }); }
  }
  if (id !== undefined) return error(id, -32601, `metodo nao suportado: ${method}`);
}

export function start() {
  let buf = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      try { handle(msg); } catch (e) { if (msg?.id !== undefined) error(msg.id, -32603, e.message); }
    }
  });
  process.stdin.on("end", () => process.exit(0));
}

// Auto-inicia so quando executado diretamente (node server/mcp.mjs), nao quando importado.
import { fileURLToPath as _f } from "node:url";
if (process.argv[1] && _f(import.meta.url) === _f("file://" + process.argv[1].replace(/\\/g, "/")) || (process.argv[1] && process.argv[1].endsWith("mcp.mjs"))) {
  start();
}
