// Harness — Lean AI OS · extensao VSCode (boca extra do motor — ADR-0023/0027/0028)
// O painel e um CHAT-ORQUESTRADOR: conversa com o usuario (perguntas guiadas),
// estrutura tudo e entrega a LLM um HANDOFF (objetivo/escopo/nao-fazer/onde/como).
// Nao duplica logica: chama o CLI (bin/os.mjs ... --json), que importa src/engine.mjs.

const vscode = require("vscode");
const cp = require("node:child_process");
const path = require("node:path");

function cfg() {
  const c = vscode.workspace.getConfiguration("harness");
  return { node: c.get("node") || "node", cliPath: c.get("cliPath") || ".harness/bin/os.mjs" };
}
function workspaceRoot() {
  const f = vscode.workspace.workspaceFolders;
  return f && f.length ? f[0].uri.fsPath : process.cwd();
}

// Roda o CLI e devolve { stdout, code }.
function runHarness(args) {
  return new Promise((resolve, reject) => {
    const { node, cliPath } = cfg();
    const root = workspaceRoot();
    const cli = path.isAbsolute(cliPath) ? cliPath : path.join(root, cliPath);
    cp.execFile(node, [cli, ...args], { cwd: root, maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (stdout && stdout.trim()) return resolve(stdout);
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout || "");
    });
  });
}
async function sessionJSON(args) { return JSON.parse(await runHarness(["session", ...args, "--json"])); }

class OrchestratorView {
  constructor(ctx) { this.ctx = ctx; this.view = null; }

  resolveWebviewView(view) {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = this.html();
    view.webview.onDidReceiveMessage(async (msg) => {
      try {
        if (msg.type === "ready") {
          const st = await sessionJSON(["status"]);
          view.webview.postMessage({ type: "session", session: st });
        } else if (msg.type === "send") {
          const st = await sessionJSON(["status"]);
          const next = (!st || !st.active) ? await sessionJSON(["start", msg.text]) : await sessionJSON(["answer", msg.text]);
          view.webview.postMessage({ type: "session", session: next });
        } else if (msg.type === "newTask") {
          await runHarness(["session", "clear"]);
          view.webview.postMessage({ type: "session", session: { active: false } });
        } else if (msg.type === "copyHandoff") {
          await vscode.env.clipboard.writeText(msg.text);
          vscode.window.showInformationMessage("Harness: handoff copiado — cole no chat da LLM.");
        } else if (msg.type === "openHandoff") {
          const root = workspaceRoot();
          const uri = vscode.Uri.file(path.join(root, ".harness", ".ai", "handoff.md"));
          try { const doc = await vscode.workspace.openTextDocument(uri); vscode.window.showTextDocument(doc); }
          catch { vscode.window.showWarningMessage("Harness: handoff.md ainda nao foi gerado. Conclua a conversa no painel."); }
        }
      } catch (e) {
        view.webview.postMessage({ type: "error", text: String(e.message || e) });
      }
    });
  }

  html() {
    return `<!doctype html><html><head><meta charset="utf-8">
<style>
 :root{color-scheme:light dark}
 body{font-family:var(--vscode-font-family);margin:0;display:flex;flex-direction:column;height:100vh;color:var(--vscode-foreground);font-size:12px}
 header{padding:8px 10px;border-bottom:1px solid var(--vscode-panel-border);display:flex;align-items:center;gap:6px}
 header b{font-size:13px}.pill{font-size:10px;padding:1px 6px;border-radius:8px;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground)}
 #log{flex:1;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:8px}
 .msg{padding:7px 10px;border-radius:8px;max-width:92%;white-space:pre-wrap;word-wrap:break-word}
 .orch{background:var(--vscode-textCodeBlock-background);align-self:flex-start}
 .me{background:var(--vscode-button-background);color:var(--vscode-button-foreground);align-self:flex-end}
 .sys{align-self:center;opacity:.7;font-size:11px}
 .handoff{align-self:stretch;background:var(--vscode-textCodeBlock-background);border:1px solid var(--vscode-panel-border);border-radius:8px;padding:10px}
 .handoff pre{white-space:pre-wrap;margin:0 0 8px;font-family:var(--vscode-editor-font-family)}
 footer{padding:8px;border-top:1px solid var(--vscode-panel-border);display:flex;gap:6px}
 input{flex:1;padding:7px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:6px}
 button{padding:6px 10px;border:none;border-radius:6px;cursor:pointer;background:var(--vscode-button-background);color:var(--vscode-button-foreground);font:inherit}
 button.sec{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground)}
 .row{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}
</style></head><body>
 <header><b>Harness</b><span class="pill" id="phase">orquestrador</span>
   <span style="flex:1"></span><button class="sec" id="new">Nova tarefa</button></header>
 <div id="log"></div>
 <footer><input id="inp" placeholder="Descreva a tarefa ou responda o orquestrador..." />
   <button id="send">Enviar</button></footer>
<script>
 const vs=acquireVsCodeApi();const $=id=>document.getElementById(id);const log=$("log");
 function esc(s){return String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));}
 function add(cls,txt){const d=document.createElement("div");d.className="msg "+cls;d.textContent=txt;log.appendChild(d);log.scrollTop=log.scrollHeight;return d;}
 function renderHandoff(h){
   const md=["# Handoff — "+h.intent,"","Objetivo: "+(h.objetivo||"(a alinhar)"),
     h.escopo_mvp?("Escopo: "+h.escopo_mvp):"","NAO fazer: "+h.nao_fazer.join("; "),
     "Onde: "+h.onde,(h.alvos_codigo||[]).map(t=>" - "+t.path).join("\\n"),
     (h.falta&&h.falta.length)?("O que falta: "+h.falta.map(g=>g.kind+":"+g.path).join("; ")):"",
     "Como: "+h.como,"Porque: "+h.porque,"Fecho: "+h.fecho].filter(Boolean).join("\\n");
   const wrap=document.createElement("div");wrap.className="handoff";
   wrap.innerHTML='<b>Handoff salvo em .harness/.ai/handoff.md</b>'
     +'<p class="muted">No chat da IDE (com a LLM) digite <b>smash</b>: a LLM le este handoff e executa seguindo o Harness; ao terminar ela registra o que fez (os_report).</p>'
     +'<pre>'+esc(md)+'</pre>';
   const row=document.createElement("div");row.className="row";
   const b1=document.createElement("button");b1.textContent="Copiar handoff";b1.onclick=()=>vs.postMessage({type:"copyHandoff",text:md});
   const b2=document.createElement("button");b2.className="sec";b2.textContent="Abrir handoff.md";b2.onclick=()=>vs.postMessage({type:"openHandoff"});
   row.append(b1,b2);wrap.appendChild(row);log.appendChild(wrap);log.scrollTop=log.scrollHeight;
 }
 let lastLen=0;
 function render(s){
   log.innerHTML="";lastLen=0;
   $("phase").textContent=s.active?(s.classification||"orquestrador")+" · "+(s.phase||""):"orquestrador";
   if(!s.active){add("orch","Ola! Me diga em uma frase o que voce quer construir ou resolver. Eu organizo tudo e preparo a entrega para a LLM.");return;}
   (s.log||[]).forEach(m=>add(m.role==="user"?"me":"orch",m.text));
   if(s.handoff) renderHandoff(s.handoff);
 }
 $("send").onclick=()=>{const t=$("inp").value.trim();if(!t)return;add("me",t);$("inp").value="";vs.postMessage({type:"send",text:t});};
 $("inp").addEventListener("keydown",e=>{if(e.key==="Enter")$("send").click();});
 $("new").onclick=()=>vs.postMessage({type:"newTask"});
 window.addEventListener("message",e=>{const m=e.data;
   if(m.type==="session")render(m.session);
   else if(m.type==="raw")add("sys",m.text);
   else if(m.type==="error")add("sys","Erro: "+m.text);
 });
 vs.postMessage({type:"ready"});
</script></body></html>`;
  }
}

function activate(ctx) {
  const provider = new OrchestratorView(ctx);
  ctx.subscriptions.push(vscode.window.registerWebviewViewProvider("harness.panel", provider));
  ctx.subscriptions.push(vscode.commands.registerCommand("harness.openPanel", () => vscode.commands.executeCommand("harness.panel.focus")));
  ctx.subscriptions.push(vscode.commands.registerCommand("harness.orchestrate", () => vscode.commands.executeCommand("harness.panel.focus")));
  const showText = (args) => async () => {
    try { const out = await runHarness(args); const doc = await vscode.workspace.openTextDocument({ content: out }); vscode.window.showTextDocument(doc); }
    catch (e) { vscode.window.showErrorMessage("Harness: " + e.message); }
  };
  ctx.subscriptions.push(vscode.commands.registerCommand("harness.brief", showText(["brief"])));
  ctx.subscriptions.push(vscode.commands.registerCommand("harness.doctor", showText(["doctor"])));
}
function deactivate() {}
module.exports = { activate, deactivate };
