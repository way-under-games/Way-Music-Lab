// MIT. Isolated DOM smoke test: no browser, desktop, window, keyboard or mouse control.
// Downloads the pinned LinkeDOM worker from the npm registry, verifies registry integrity,
// and caches it locally. It is development tooling, never served or bundled with the app.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const cache=new URL('../.cache/ui-check/',import.meta.url);await mkdir(cache,{recursive:true});
const meta=await (await fetch('https://registry.npmjs.org/linkedom/0.18.12')).json();
const integrity='sha512-jalJsOwIKuQJSeTvsgzPe9iJzyfVaEJiEXl+25EkKevsULHvMJzpNqwvj1jOESWdmgKDiXObyjOYwlUqG7wo1Q==';
assert.equal(meta.dist.integrity,integrity,'Published package integrity changed');
const archive=Buffer.from(await (await fetch(meta.dist.tarball)).arrayBuffer());
assert.equal('sha512-'+createHash('sha512').update(archive).digest('base64'),integrity,'Pinned package integrity');
const tar=gunzipSync(archive);let worker,license;
for(let pos=0;pos+512<tar.length;){const name=tar.toString('utf8',pos,pos+100).replace(/\0.*$/s,''),size=parseInt(tar.toString('utf8',pos+124,pos+136).replace(/\0.*$/s,'').trim(),8)||0;const data=tar.subarray(pos+512,pos+512+size);if(name==='package/worker.js')worker=data;if(name==='package/LICENSE')license=data;pos+=512+Math.ceil(size/512)*512;}
assert.ok(worker&&license);await writeFile(new URL('linkedom.mjs',cache),worker);await writeFile(new URL('LINKEDOM-LICENSE',cache),license);
const {parseHTML}=await import(new URL('linkedom.mjs',cache));
const {window,document}=parseHTML(await readFile(new URL('../web/studio.html',import.meta.url),'utf8'));
globalThis.window=window;globalThis.document=document;globalThis.localStorage={data:new Map(),getItem(k){return this.data.get(k)??null;},setItem(k,v){this.data.set(k,v);}};
Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});
const intervals=[], animation=[];globalThis.setInterval=cb=>(intervals.push(cb),intervals.length);globalThis.clearInterval=()=>{};globalThis.requestAnimationFrame=cb=>animation.push(cb);
const drawing={clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}};
window.HTMLCanvasElement.prototype.getContext=()=>drawing;
// LinkeDOM intentionally omits some browser form-control property behavior.
Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return this._testValue??this.querySelector('option[selected]')?.value??this.querySelector('option')?.value??'';},set(v){this._testValue=String(v);},configurable:true});
for(const input of document.querySelectorAll('input[type=checkbox]'))input.checked=input.hasAttribute('checked');
const parameter=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){},cancelAndHoldAtTime(){}});
const audioNode=()=>({gain:parameter(),frequency:parameter(),Q:parameter(),pan:parameter(),detune:parameter(),delayTime:parameter(),threshold:parameter(),ratio:parameter(),connect(n){return n;},disconnect(){},start(){},stop(){},setPeriodicWave(){}});
const contexts=[];
globalThis.AudioContext=class { constructor(){this.currentTime=0;this.sampleRate=48000;this.state='running';this.destination={};contexts.push(this);}async resume(){}addEventListener(){}createGain(){return audioNode();}createDynamicsCompressor(){return audioNode();}createAnalyser(){return audioNode();}createBiquadFilter(){return audioNode();}createWaveShaper(){return audioNode();}createDelay(){return audioNode();}createStereoPanner(){return audioNode();}createOscillator(){return audioNode();}createPeriodicWave(){return{};} };
let app=await readFile(new URL('../web/studio-app.mjs',import.meta.url),'utf8');app=app.replaceAll("from '/src/",`from '${new URL('../src/',import.meta.url).href}`);app=app.replaceAll("from '/web/",`from '${new URL('../web/',import.meta.url).href}`);await writeFile(new URL('app.mjs',cache),app);await import(new URL('app.mjs',cache));
const $=id=>document.getElementById(id),flush=()=>new Promise(resolve=>setImmediate(resolve));
async function click(id){$(id).dispatchEvent(new window.Event('click',{bubbles:true}));await flush();}
async function change(id,value){$(id).value=value;$(id).dispatchEvent(new window.Event('change',{bubbles:true}));await flush();}
const saved=()=>JSON.parse(localStorage.getItem('way-studio-v1'));
assert.equal(document.querySelectorAll('#parts .part').length,3);assert.equal(document.querySelectorAll('#keyboard button').length,24);
await click('add-note');assert.equal(saved().parts[0].notes.length,1);const original=structuredClone(saved().parts[0].notes);
await click('vary');assert.deepEqual(saved().parts[0].notes,original,'Sound variation preserves notes');
const meterBefore=saved().meter;
document.querySelector('[data-meter-starter="Steady"]').click();await flush();assert.equal(saved().meter,meterBefore,'Meter edits remain a draft');
document.querySelector('#meter-builder .meter-actions .primary').click();await flush();assert.equal(saved().meter,'4/4:1+1+1+1');assert.deepEqual(saved().parts[0].notes,original);
const count=document.querySelector('#meter-builder select');count.value='7';count.dispatchEvent(new window.Event('change'));await flush();
document.querySelector('[data-meter-tick="0:1"]').click();await flush();
document.querySelector('#meter-builder .meter-actions .primary').click();await flush();assert.match(saved().meter,/^7\/4:1\+1\+2\+3$/);
document.querySelector('#meter-builder .meter-fit input').checked=true;document.querySelector('#meter-builder .meter-actions .primary').click();await flush();assert.equal(saved().loopTicks,7*480);
assert.deepEqual(saved().parts[0].notes,original,'Visual rhythm edits never rewrite authored notes');
document.querySelector('[data-workspace-link="sound"]').click();await flush();assert.equal($('sound').hidden,false,'Quick start opens the selected workspace');
document.querySelector('[data-tab="sound"]').click();await flush();$('explore-listen').checked=false;
const startingPatch=structuredClone(saved().parts[0].patch);
document.querySelector('[data-world="swarm"]').click();await flush();
assert.equal(saved().parts[0].patch.name,'Ion swarm');assert.deepEqual(saved().parts[0].notes,original);
$('planet-x').value='0.9';$('planet-x').dispatchEvent(new window.Event('input',{bubbles:true}));await change('planet-x','0.9');assert.equal(saved().parts[0].patch.source,'synth');assert.match(saved().parts[0].patch.name,/Planet/);
await change('mutation-strength','1');await click('mutate-sound');assert.match(saved().parts[0].patch.name,/Mutation/);
assert.deepEqual(saved().parts[0].notes,original,'Playground preserves the authored hook');
await click('restore-sound');assert.deepEqual(saved().parts[0].patch,startingPatch,'Exploration start restores the full patch');
await change('meter','5/8:3+2, 7/8:2+2+3');await click('apply-meter');assert.deepEqual(saved().parts[0].notes,original,'Meter edits preserve notes');
await click('store-variation');assert.equal(saved().variations.Contemplative.length,3);
await click('audio');await click('record');contexts[0].currentTime=.25;
const down=new window.Event('keydown',{bubbles:true});Object.assign(down,{code:'KeyA',repeat:false,ctrlKey:false,metaKey:false,altKey:false});document.body.dispatchEvent(down);await flush();contexts[0].currentTime=.75;
const up=new window.Event('keyup',{bubbles:true});Object.assign(up,{code:'KeyA'});document.body.dispatchEvent(up);await flush();await click('record');assert.match($('take-state').textContent,/1 notes captured/);await click('keep-take');assert.equal(saved().parts[0].notes.length,2);
assert.equal(saved().parts[0].notes[1].midi,60);assert.ok(saved().parts[0].notes[1].duration>360);
await click('undo');assert.equal(saved().parts[0].notes.length,1);await click('redo');assert.equal(saved().parts[0].notes.length,2);
await click('add-part');assert.equal(saved().parts.length,4);assert.deepEqual(saved().parts[0].notes[0],original[0]);
console.log('PASS: studio boot, keyboard creation, note editing, protected hooks, meter editing, variations, recording/keep, undo/redo, and part creation.');
console.log('No browser or desktop automation used. Canvas and audio APIs are test doubles; visual layout and native audio require separate validation.');
