// MIT. Deterministic work counters, not a hardware latency benchmark.
import {StudioEngine,StudioPlayer} from '../src/studio-audio.mjs';
import {newProject,soundWorld} from '../src/studio.mjs';
import {createMusicServer} from '../server.mjs';
let waves=0,targets=0,clones=0;
const originalClone=globalThis.structuredClone;
globalThis.structuredClone=(...args)=>{clones++;return originalClone(...args);};
const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){targets++;},cancelScheduledValues(){},cancelAndHoldAtTime(){}});
const node=()=>({gain:param(),frequency:param(),detune:param(),pan:param(),Q:param(),delayTime:param(),threshold:param(),ratio:param(),connect(to){return to;},disconnect(){},start(){},stop(){},setPeriodicWave(){}});
const context={currentTime:0,sampleRate:48000,destination:{},createGain:node,createBiquadFilter:node,createStereoPanner:node,createWaveShaper:node,createDelay:node,createDynamicsCompressor:node,createAnalyser:node,createOscillator:node,createPeriodicWave(){waves++;return{};}};
const engine=new StudioEngine(context),p=newProject();p.parts[0].patch=soundWorld('drone');const player=new StudioPlayer(engine,p);
for(let i=0;i<100;i++)player.tick();const idleBuses=engine.buses.size;
waves=targets=clones=0;
for(let i=0;i<100;i++){engine.noteOn('probe',60,90,p.parts[0].id,p.parts[0].patch);engine.release('probe');engine.kill('probe');}
const attacks={periodicWaveBuilds:waves,structuredClones:clones,automationCalls:targets};
for(let i=0;i<16;i++)engine.noteOn('held:'+i,60+i,90,p.parts[0].id,p.parts[0].patch);
clones=targets=0;
for(let i=0;i<100;i++){context.currentTime+=.025;player.tick();}
const held={structuredClones:clones,automationCalls:targets};engine.dispose();globalThis.structuredClone=originalClone;
const server=createMusicServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let backend;try{const url='http://127.0.0.1:'+server.address().port+'/src/studio.mjs';const first=await fetch(url),etag=first.headers.get('etag');await first.arrayBuffer();const second=await fetch(url,{headers:etag?{'If-None-Match':etag}:{}});backend={conditionalStatus:second.status,repeatBodyBytes:(await second.arrayBuffer()).byteLength};}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
console.log(JSON.stringify({idleBuses,attacks,held,backend},null,2));
