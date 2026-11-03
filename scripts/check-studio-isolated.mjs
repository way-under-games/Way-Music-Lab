// MIT. Runs an isolated headless test process, never attaches to an existing browser
// or sends desktop input. Pass an installed Chromium-family executable explicitly.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createMusicServer } from '../server.mjs';
const executable=process.argv[2];if(!executable)throw new Error('Usage: node scripts/check-studio-isolated.mjs <chromium-executable>');
const cache=fileURLToPath(new URL('../.cache/studio-isolated/',import.meta.url));await mkdir(cache,{recursive:true});
const fixture=`<!doctype html><html><body><pre id="result">RUNNING</pre><iframe id="studio" src="/web/studio.html" style="width:1500px;height:1100px"></iframe><script>window.report=async text=>{document.getElementById('result').textContent=text;await fetch('/__studio_result',{method:'POST',body:text});};window.addEventListener('error',e=>report('FAIL '+e.message));window.addEventListener('unhandledrejection',e=>report('FAIL '+e.reason));</script><script type="module">
import {newProject} from '/src/studio.mjs';import {renderStudioWav} from '/src/studio-audio.mjs';
const result=document.getElementById('result');const assert=(condition,message)=>{if(!condition)throw new Error(message);};
try{
result.textContent='WAITING_FOR_FRAME';
const frame=document.getElementById('studio');if(frame.contentDocument.readyState!=='complete')await new Promise(resolve=>frame.onload=resolve);await new Promise(resolve=>setTimeout(resolve,100));const d=frame.contentDocument,w=frame.contentWindow;
result.textContent='CHECKING_UI';
assert(d.querySelectorAll('#keyboard .piano-key').length===24,'Studio did not initialize');
d.getElementById('add-note').click();assert(d.querySelectorAll('#note-list button').length===1,'Authored note not added');
const before=d.getElementById('note-list').textContent;d.getElementById('vary').click();assert(d.getElementById('note-list').textContent===before,'Sound edits changed a hook');
d.querySelector('[data-tab="sound"]').click();assert(!d.getElementById('sound').hidden,'Sound workspace not selected');
d.querySelector('[data-tab="game"]').click();assert(d.querySelectorAll('#scenes .mapping').length===7,'Narrative scenes missing');
d.querySelector('[data-tab="perform"]').click();
const p=newProject();p.tempo=120;p.loopTicks=480;p.parts[0].notes=[{id:'native-test',midi:60,start:360,duration:960,velocity:90}];
result.textContent='RENDERING_AUDIO';const bytes=await renderStudioWav(p);const view=new DataView(bytes);let peak=0,sum=0,count=0;for(let i=44;i<bytes.byteLength;i+=2){const value=view.getInt16(i,true)/32768;assert(Number.isFinite(value),'Non-finite audio');peak=Math.max(peak,Math.abs(value));sum+=value*value;count++;}
assert(peak>.005&&peak<.99,'Audio silent or clipping: '+peak);assert(bytes.byteLength>24000*4*7,'Cross-loop release was truncated');
const changed=structuredClone(p);changed.parts[0].patch.cutoff=100;changed.parts[0].patch.filterEnv=0;const other=new Uint8Array(await renderStudioWav(changed));const original=new Uint8Array(bytes);assert(original.some((v,i)=>i>44&&v!==other[i]),'Filter control did not change rendered audio');
const recorded=structuredClone(p);recorded.parts[0].patch.source='orchestra';recorded.parts[0].patch.instrument='woodwind';const recordedView=new DataView(await renderStudioWav(recorded));let recordedPeak=0;for(let i=44;i<recordedView.byteLength;i+=2)recordedPeak=Math.max(recordedPeak,Math.abs(recordedView.getInt16(i,true)/32768));assert(recordedPeak>.001&&recordedPeak<.99,'Recorded instrument silent or clipping');
await report('PASS '+JSON.stringify({nativeAudio:true,peak,rms:Math.sqrt(sum/count),recordedPeak,bytes:bytes.byteLength,duration:(bytes.byteLength-44)/96000,parts:d.querySelectorAll('#parts .part').length,keys:24,scenes:7}));
}catch(error){await report('FAIL '+error.stack);}
</script></body></html>`;
let finishResult;const resultPromise=new Promise(resolve=>finishResult=resolve);
const app=createMusicServer();const server=createServer(async(req,res)=>{if(req.url==='/__studio_verify'){res.setHeader('Content-Type','text/html');res.end(fixture);}else if(req.url==='/__studio_result'&&req.method==='POST'){const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>16384){res.writeHead(413).end();return;}chunks.push(chunk);}res.end('OK');finishResult(Buffer.concat(chunks).toString());}else app.emit('request',req,res);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}`;
const flags=['--headless=new','--disable-gpu','--mute-audio','--disable-background-networking','--disable-component-update','--no-first-run','--no-default-browser-check','--disable-sync','--disable-extensions',`--user-data-dir=${path.join(cache,'profile')}`];
// This connection is restricted to the headless process created here. It never
// discovers or attaches to an existing user's browser or a fixed debugging port.
const child=spawn(executable,[...flags,'--remote-debugging-port=0',url+'/__studio_verify'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let errors='',resolveDebug;const debugReady=new Promise(resolve=>resolveDebug=resolve);
child.stderr.on('data',data=>{errors+=data;const match=errors.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/);if(match)resolveDebug(match[1]);});
let socket,timer;
try{
  // Native audio rendering uses a worker thread; wait for its actual completion.
  const timeout=new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error('Native fixture timed out: '+errors.slice(-1000))),30000));
  const result=await Promise.race([resultPromise,timeout]);clearTimeout(timer);
  await writeFile(path.join(cache,'last-check.txt'),result);if(!result.startsWith('PASS '))throw new Error(result);console.log(result);
  const debugURL=new URL(await debugReady), targets=await (await fetch(`http://${debugURL.host}/json/list`)).json();
  const target=targets.find(t=>t.type==='page'&&t.url===url+'/__studio_verify');if(!target)throw new Error('Isolated fixture target missing');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let sequence=0;const pending=new Map(),exceptions=[];socket.addEventListener('message',event=>{const response=JSON.parse(event.data);if(response.method==='Runtime.exceptionThrown')exceptions.push(response.params.exceptionDetails.exception?.description??response.params.exceptionDetails.text);const callback=pending.get(response.id);if(callback){clearTimeout(callback.timer);pending.delete(response.id);response.error?callback.reject(new Error(response.error.message)):callback.resolve(response.result);}});
  const command=(method,params={})=>new Promise((resolve,reject)=>{const request=++sequence,timer=setTimeout(()=>{pending.delete(request);reject(new Error('Isolated test command timed out: '+method));},10000);pending.set(request,{resolve,reject,timer});socket.send(JSON.stringify({id:request,method,params}));});
  await command('Runtime.enable');await command('Page.enable');await command('Page.navigate',{url:url+'/web/studio.html'});
  const evaluate=async expression=>{const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
  await evaluate(`new Promise(resolve=>{const check=()=>document.querySelectorAll('#keyboard .piano-key').length===24?resolve(true):setTimeout(check,20);check();})`);
  const layouts=[];
  for(const [name,width,height,tab]of [['studio-wide',1500,1100,'perform'],['studio-narrow',430,1000,'perform'],['studio-sound',1500,1200,'sound'],['studio-game',1500,1200,'game'],['studio-sound-narrow',430,1000,'sound'],['studio-game-narrow',430,1000,'game']]){
    // Chromium's command-line window size has a minimum width on Windows.
    // Override the viewport explicitly so a narrow screenshot is genuine.
    await command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await evaluate(`document.querySelector('[data-tab="${tab}"]').click();new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
    const layout=await evaluate(`({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,tab:'${tab}',overflow:[...document.querySelectorAll('body *')].filter(n=>n.getBoundingClientRect().right>innerWidth+1&&n.getBoundingClientRect().width>0).slice(0,12).map(n=>({tag:n.tagName,id:n.id,class:n.className,right:n.getBoundingClientRect().right}))})`);layouts.push(layout);
    const screenshot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path.join(cache,name+'.png'),Buffer.from(screenshot.data,'base64'));
  }
  await writeFile(path.join(cache,'layouts.json'),JSON.stringify(layouts,null,2));console.log('Viewport results: '+JSON.stringify(layouts));
  if(layouts.some(l=>l.scrollWidth>l.width+1))throw new Error('A studio workspace overflows the viewport');
  const performance=await evaluate(`(async()=>{
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),$=id=>document.getElementById(id);
    document.querySelector('[data-tab="perform"]').click();$('audio').click();await wait(100);
    if($('audio').textContent!=='Audio enabled')throw new Error('Native audio could not be enabled');
    const before=JSON.parse(localStorage.getItem('way-studio-v1')).parts[0].notes.length;
    $('record').click();await wait(100);document.body.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyA',bubbles:true}));await wait(140);document.body.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyA',bubbles:true}));await wait(30);$('record').click();await wait(30);
    if(!$('take-state').textContent.includes('1 notes captured'))throw new Error('Native recorder did not capture keyboard input: '+$('message').textContent);
    $('keep-take').click();await wait(20);const saved=JSON.parse(localStorage.getItem('way-studio-v1'));if(saved.parts[0].notes.length!==before+1)throw new Error('Keep take did not retain the native recording');
    $('stop').click();await wait(30);const note=saved.parts[0].notes.at(-1);
    $('key-map').value='Q:0, W:2';$('apply-keymap').click();await wait(20);if(JSON.parse(localStorage.getItem('way-studio-v1')).keyBindings.KeyQ!==0)throw new Error('Custom key map was not saved');
    $('instrument-source').value='orchestra';$('instrument-source').dispatchEvent(new Event('change',{bubbles:true}));await wait(20);$('load-recordings').click();
    const deadline=performance.now()+10000;while(!$('recording-status').textContent.includes('ready')){if(performance.now()>deadline)throw new Error('Recorded source did not preload: '+$('message').textContent);await wait(20);}
    $('record').click();await wait(90);document.body.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyQ',bubbles:true}));await wait(120);document.body.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyQ',bubbles:true}));await wait(20);$('record').click();await wait(20);$('keep-take').click();await wait(20);$('stop').click();await wait(30);
    const recorded=JSON.parse(localStorage.getItem('way-studio-v1'));if(recorded.parts[0].notes.length!==before+2||recorded.parts[0].notes.at(-1).midi!==60||recorded.parts[0].patch.source!=='orchestra')throw new Error('Recorded keyboard source or custom mapping failed');
    return {nativeRecording:true,midi:note.midi,durationTicks:note.duration,recordedKeyboard:true,customKeyboard:true,voices:$('voice-state').textContent};
  })()`);console.log('Performance results: '+JSON.stringify(performance));await writeFile(path.join(cache,'performance.json'),JSON.stringify(performance,null,2));
  if(exceptions.length)throw new Error('Uncaught page exceptions: '+exceptions.join('\n'));
  console.log('Screenshots: '+cache);console.log('Only a dedicated headless process with an isolated test profile was used. No existing browser or desktop input.');
}finally{
  clearTimeout(timer);socket?.close();child.kill();await new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once('close',resolve);});server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}
