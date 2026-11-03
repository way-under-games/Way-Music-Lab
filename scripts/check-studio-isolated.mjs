// MIT. Runs an isolated headless test process, never attaches to an existing browser
// or sends desktop input. Pass an installed Chromium-family executable explicitly.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createMusicServer } from '../server.mjs';
const executable=process.argv[2];if(!executable)throw new Error('Usage: node scripts/check-studio-isolated.mjs <chromium-executable>');
const cache=fileURLToPath(new URL('../.cache/studio-isolated/',import.meta.url));await mkdir(cache,{recursive:true});
const fixture=`<!doctype html><html><body><pre id="result">RUNNING</pre><iframe id="studio" src="/web/studio.html" style="width:1500px;height:1100px"></iframe><script type="module">
import {newProject} from '/src/studio.mjs';import {renderStudioWav} from '/src/studio-audio.mjs';
const result=document.getElementById('result');const assert=(condition,message)=>{if(!condition)throw new Error(message);};
try{
const frame=document.getElementById('studio');if(frame.contentDocument.readyState!=='complete')await new Promise(resolve=>frame.onload=resolve);await new Promise(resolve=>setTimeout(resolve,100));const d=frame.contentDocument,w=frame.contentWindow;
assert(d.querySelectorAll('#keyboard .piano-key').length===24,'Studio did not initialize');
d.getElementById('add-note').click();assert(d.querySelectorAll('#note-list button').length===1,'Authored note not added');
const before=d.getElementById('note-list').textContent;d.getElementById('vary').click();assert(d.getElementById('note-list').textContent===before,'Sound edits changed a hook');
d.querySelector('[data-tab="sound"]').click();assert(!d.getElementById('sound').hidden,'Sound workspace not selected');
d.querySelector('[data-tab="game"]').click();assert(d.querySelectorAll('#scenes .mapping').length===7,'Narrative scenes missing');
d.querySelector('[data-tab="perform"]').click();
const p=newProject();p.tempo=120;p.loopTicks=480;p.parts[0].notes=[{id:'native-test',midi:60,start:360,duration:960,velocity:90}];
const bytes=await renderStudioWav(p);const view=new DataView(bytes);let peak=0,sum=0,count=0;for(let i=44;i<bytes.byteLength;i+=2){const value=view.getInt16(i,true)/32768;assert(Number.isFinite(value),'Non-finite audio');peak=Math.max(peak,Math.abs(value));sum+=value*value;count++;}
assert(peak>.005&&peak<.99,'Audio silent or clipping: '+peak);assert(bytes.byteLength>24000*4*7,'Cross-loop release was truncated');
const changed=structuredClone(p);changed.parts[0].patch.cutoff=100;changed.parts[0].patch.filterEnv=0;const other=new Uint8Array(await renderStudioWav(changed));const original=new Uint8Array(bytes);assert(original.some((v,i)=>i>44&&v!==other[i]),'Filter control did not change rendered audio');
result.textContent='PASS '+JSON.stringify({nativeAudio:true,peak,rms:Math.sqrt(sum/count),bytes:bytes.byteLength,duration:(bytes.byteLength-44)/96000,parts:d.querySelectorAll('#parts .part').length,keys:24,scenes:7});
}catch(error){result.textContent='FAIL '+error.stack;}
</script></body></html>`;
const app=createMusicServer();const server=createServer((req,res)=>{if(req.url==='/__studio_verify'){res.setHeader('Content-Type','text/html');res.end(fixture);}else app.emit('request',req,res);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}`;
const flags=['--headless=new','--disable-gpu','--mute-audio','--disable-background-networking','--disable-component-update','--no-first-run','--no-default-browser-check','--disable-sync','--disable-extensions',`--user-data-dir=${path.join(cache,'profile')}`];
async function run(args){return new Promise((resolve,reject)=>{const child=spawn(executable,[...flags,...args],{windowsHide:true,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';const timeout=setTimeout(()=>{child.kill();reject(new Error('Isolated check timed out'));},45000);child.stdout.on('data',data=>stdout+=data);child.stderr.on('data',data=>stderr+=data);child.on('error',reject);child.on('close',code=>{clearTimeout(timeout);code===0?resolve(stdout):reject(new Error('Isolated process failed: '+stderr.slice(-1000)));});});}
try{
const html=await run(['--dump-dom','--virtual-time-budget=15000',url+'/__studio_verify']);const result=html.match(/<pre id="result">([\s\S]*?)<\/pre>/)?.[1];if(!result?.startsWith('PASS '))throw new Error(result??'No test result');console.log(result);
await run(['--screenshot='+path.join(cache,'studio-wide.png'),'--window-size=1500,1100','--virtual-time-budget=1000',url+'/web/studio.html']);
await run(['--screenshot='+path.join(cache,'studio-narrow.png'),'--window-size=430,1000','--virtual-time-budget=1000',url+'/web/studio.html']);
console.log('Screenshots: '+cache);console.log('Only a dedicated headless process with an isolated test profile was used. No existing browser or desktop input.');
}finally{await new Promise(resolve=>server.close(resolve));}
