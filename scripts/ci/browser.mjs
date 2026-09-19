// Browser checks run ONLY on the disposable Linux GitHub runner, not the Mac browser.
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { once } from 'node:events';
import assert from 'node:assert/strict';
export async function browserJourney(mode) {
  assert.equal(process.env.GITHUB_ACTIONS,'true');assert.equal(process.platform,'linux');assert.equal(process.arch,'x64');
  const executable=execFileSync('which',['google-chrome'],{encoding:'utf8'}).trim();
  const profile=mkdtempSync(join(process.env.RUNNER_TEMP,'bety-chrome-'));
  const chrome=spawn(executable,['--headless=new','--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--remote-debugging-port=9223','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
  let socket;
  try {
    let page;
    for(let i=0;i<100;i++) {try {const response=await fetch('http://127.0.0.1:9223/json/new?http://127.0.0.1:3001/',{method:'PUT'});if(response.ok){page=await response.json();break;}}catch{} await new Promise(resolve=>setTimeout(resolve,100));}
    assert.ok(page,'Chrome unavailable');socket=new WebSocket(page.webSocketDebuggerUrl);await once(socket,'open');
    let next=1;const pending=new Map();
    socket.addEventListener('message',event=>{const response=JSON.parse(event.data);if(response.id){const entry=pending.get(response.id);pending.delete(response.id);if(response.error)entry.reject(new Error('CDP command failed'));else entry.resolve(response.result);}});
    const call=(method,params)=>new Promise((resolve,reject)=>{const id=next++;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
    const evaluate=async expression=>{const response=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.exceptionDetails)throw new Error('Browser evaluation failed');return response.result?.value;};
    const wait=async expression=>{for(let i=0;i<200;i++){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,200));}throw new Error('Browser state timeout: '+mode);};
    const button=text=>`[...document.querySelectorAll('button')].find(e=>(e.getAttribute("aria-label") || e.textContent).includes(${JSON.stringify(text)}))`;
    await wait(`Boolean(${button('Abrir el sobre')})`);await evaluate(`${button('Abrir el sobre')}.click()`);
    await wait(`Boolean(${button('Abrir sorpresa')})`);await evaluate(`${button('Abrir sorpresa')}.click()`);
    await wait("Boolean(document.querySelector('input'))");
    if(mode==='3d')await wait("Boolean(document.querySelector('[data-stage=frame]') && document.querySelector('canvas'))");
    else await wait("document.querySelectorAll('canvas').length===0 && Boolean(document.querySelector('[role=img]'))");
    const state=await evaluate(`(()=>{const canvas=document.querySelector('canvas');const gl=canvas&&(canvas.getContext('webgl2')||canvas.getContext('webgl'));const info=gl&&gl.getExtension('WEBGL_debug_renderer_info');return {canvasCount:document.querySelectorAll('canvas').length,stage:document.querySelector('[data-stage]')?.getAttribute('data-stage'),renderer:gl?(info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)):null,questionVisible:document.body.innerText.includes('cómo te llamas'),userAgent:navigator.userAgent};})()`);
    assert.equal(state.questionVisible,true);assert.equal(state.canvasCount,mode==='3d'?1:0);
    writeFileSync(join(process.env.BETY_EVIDENCE_DIR,'browser-'+mode+'.json'),JSON.stringify({status:'PASS',mode,...state,rendering:'Chrome with explicit SwiftShader software rendering flags; not physical GPU or phone performance'},null,2));
  } finally {
    socket?.close();if(chrome.exitCode===null){const exited=once(chrome,'exit');chrome.kill('SIGTERM');await exited;}
  }
}
