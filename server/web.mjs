#!/usr/bin/env node
// Harness — Lean AI OS · painel WEB standalone (boca extra — ADR-0023, roadmap #8)
// http zero-dep (node:http). Serve o chat-orquestrador para quem nao usa IDE.
// Reusa src/engine.mjs (mesma logica de MCP/CLI/extensao).

import { createServer } from "node:http";
import * as engine from "../src/engine.mjs";

const PAGE = `<!doctype html><html lang="pt-br"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Harness — Orquestrador</title>
<style>
 :root{--bg:#0d1117;--fg:#e6edf3;--mut:#8b949e;--ac:#2f81f7;--card:#161b22;--bd:#30363d}
 *{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:var(--bg);color:var(--fg);display:flex;flex-direction:column;height:100vh}
 header{padding:12px 16px;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:10px}
 header b{font-size:15px}.pill{font-size:11px;background:#1f2937;color:var(--mut);padding:2px 8px;border-radius:10px}
 #log{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:10px;max-width:820px;width:100%;margin:0 auto}
 .msg{padding:9px 13px;border-radius:10px;max-width:88%;white-space:pre-wrap;line-height:1.45}
 .orch{background:var(--card);border:1px solid var(--bd);align-self:flex-start}
 .me{background:var(--ac);color:#fff;align-self:flex-end}.sys{align-self:center;color:var(--mut);font-size:12px}
 .handoff{align-self:stretch;background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:14px}
 .handoff pre{white-space:pre-wrap;margin:0 0 10px;font-family:ui-monospace,monospace;font-size:12px}
 footer{padding:12px;border-top:1px solid var(--bd);display:flex;gap:8px;max-width:820px;width:100%;margin:0 auto}
 input{flex:1;padding:11px;border-radius:8px;border:1px solid var(--bd);background:#0b0e14;color:var(--fg)}
 button{padding:10px 16px;border:none;border-radius:8px;background:var(--ac);color:#fff;cursor:pointer;font-size:14px}
 button.sec{background:#21262d;color:var(--fg);border:1px solid var(--bd)}.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
</style></head><body>
 <header><b>Harness</b><span class="pill" id="phase">orquestrador</span><span style="flex:1"></span>
   <button class="sec" id="new">Nova tarefa</button></header>
 <div id="log"></div>
 <footer><input id="inp" placeholder="Descreva a tarefa ou responda o orquestrador..." autofocus />
   <button id="send">Enviar</button></footer>
<script>
 const $=id=>document.getElementById(id),log=$("log");
 const esc=s=>String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
 const add=(c,t)=>{const d=document.createElement("div");d.className="msg "+c;d.textContent=t;log.appendChild(d);log.scrollTop=log.scrollHeight;};
 async function api(action,extra){const r=await fetch("/api/session",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,...extra})});return r.json();}
 function handoff(h){const md=["# Handoff — "+h.intent,"","Objetivo: "+(h.objetivo||"(a alinhar)"),h.escopo_mvp?("Escopo: "+h.escopo_mvp):"","NAO fazer: "+h.nao_fazer.join("; "),"Onde: "+h.onde,(h.alvos_codigo||[]).map(t=>" - "+t.path).join("\\n"),(h.falta&&h.falta.length)?("Falta: "+h.falta.map(g=>g.kind+":"+g.path).join("; ")):"","Como: "+h.como,"Porque: "+h.porque].filter(Boolean).join("\\n");
   const w=document.createElement("div");w.className="handoff";w.innerHTML='<b>Handoff pronto</b><pre>'+esc(md)+'</pre>';
   const row=document.createElement("div");row.className="row";const b=document.createElement("button");b.textContent="Copiar p/ a LLM";b.onclick=()=>navigator.clipboard.writeText(md);row.appendChild(b);w.appendChild(row);log.appendChild(w);log.scrollTop=log.scrollHeight;}
 function render(s){log.innerHTML="";$("phase").textContent=s.active?(s.classification||"orquestrador"):"orquestrador";
   if(!s.active){add("orch","Ola! Diga em uma frase o que quer construir ou resolver. Eu organizo e preparo a entrega para a LLM.");return;}
   (s.log||[]).forEach(m=>add(m.role==="user"?"me":"orch",m.text));if(s.handoff)handoff(s.handoff);}
 async function send(){const t=$("inp").value.trim();if(!t)return;add("me",t);$("inp").value="";const st=await api("status",{});const r=(!st||!st.active)?await api("start",{intent:t}):await api("answer",{value:t});render(r);}
 $("send").onclick=send;$("inp").addEventListener("keydown",e=>{if(e.key==="Enter")send();});
 $("new").onclick=async()=>{await api("clear",{});render({active:false});};
 (async()=>render(await api("status",{})))();
</script></body></html>`;

function body(req) { return new Promise((res) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => res(b)); }); }

export function start(port = 4173) {
  const srv = createServer(async (req, res) => {
    if (req.method === "GET" && (req.url === "/" || req.url.startsWith("/?"))) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(PAGE);
    }
    if (req.method === "POST" && req.url === "/api/session") {
      try {
        const { action, intent, value } = JSON.parse((await body(req)) || "{}");
        let out;
        if (action === "start") out = engine.startSession(intent);
        else if (action === "answer") out = engine.answerSession(value || "", { intent });
        else if (action === "resume") out = engine.resumeSession();
        else if (action === "clear") out = engine.clearSession();
        else out = engine.loadSession() || { active: false };
        res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify(out));
      } catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ error: e.message })); }
    }
    res.writeHead(404); res.end("not found");
  });
  srv.listen(port, () => console.log(`Harness web -> http://localhost:${port}  (Ctrl+C para parar)`));
  return srv;
}

import { fileURLToPath as _f } from "node:url";
if (process.argv[1] && (_f(import.meta.url) === _f("file://" + process.argv[1].replace(/\\/g, "/")) || process.argv[1].endsWith("web.mjs"))) {
  start(Number(process.argv[2]) || 4173);
}
