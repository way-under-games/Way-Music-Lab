import test from 'node:test';
import {request as httpRequest} from 'node:http';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {newLayer,newRack,validateRack} from '../src/instrument-rack.mjs';
import {factoryInstruments,classicToRack} from '../src/instrument-factory.mjs';
import {createInstrumentRecord,validateAssetMetadata} from '../src/instrument-library.mjs';
import {createLibraryStore,LibraryConflict} from '../src/library-store.mjs';
import {createMusicServer} from '../server.mjs';
import {encodeWav} from '../src/studio-audio.mjs';
const wav=()=>Buffer.from(encodeWav({length:2400,sampleRate:24000,getChannelData:()=>Float32Array.from({length:2400},(_,i)=>Math.sin(i*.1)*.1)}));
async function directory(t){const root=await mkdtemp(path.join(tmpdir(),'way-library-'));assert.ok(root.startsWith(path.resolve(tmpdir())+path.sep));t.after(()=>rm(root,{recursive:true,force:true}));return root;}
test('factory recipes and rack bounds are portable and classic conversion retains the source',()=>{
  const recipes=factoryInstruments();assert.equal(recipes.length,6);assert.deepEqual(factoryInstruments(),recipes);for(const r of recipes)assert.deepEqual(validateRack(r.patch.rack),r.patch.rack);
  const p=structuredClone(recipes[0].patch);delete p.rack;const converted=classicToRack(p);assert.equal(p.rack,undefined);assert.equal(converted.rack.layers.length,2);
  for(const mutate of [r=>r.layers[0].synth.unison=100,r=>r.layers[0].synth.frames=[[NaN,0,0,0]],r=>r.layers[0].loKey=128,r=>r.routes=[{source:'missing',layer:'*',target:'pitch',amount:1}],r=>r.effects=[{id:'broken',type:'reverb',enabled:true,mix:1,duration:99}]]){const r=newRack();mutate(r);assert.throws(()=>validateRack(r));}
  assert.throws(()=>validateAssetMetadata({license:'CC-BY-4.0'}),/attribution/);
});
test('library persists samples, revisions and self-contained packages across new store instances',async t=>{
  const root=await directory(t),store=createLibraryStore({root,factory:factoryInstruments()}),bytes=wav();
  const metadata={name:'Original tone',origin:'generated',license:'MIT',recipe:factoryInstruments()[2].patch,render:{midi:60,velocity:100,hold:1,sampleRate:24000}};
  const asset=await store.putAsset(bytes.toString('base64'),metadata);assert.equal(asset.id,createHash('sha256').update(bytes).digest('hex'));
  const patch=factoryInstruments()[0].patch;patch.rack.layers=[newLayer('sample')];patch.rack.layers[0].sample.assetId=asset.id;
  const initial=await store.save(createInstrumentRecord(patch,{name:'My playable tone'}));
  const restored=createLibraryStore({root});assert.deepEqual(await restored.get(initial.id),initial);assert.deepEqual(await restored.assetBytes(asset.id),bytes);
  const update=await restored.save({...initial,name:'Renamed'},initial.id);assert.equal(update.revision,2);await assert.rejects(restored.save(initial,initial.id),LibraryConflict);
  const pack=await restored.exportPackage(initial.id);const otherRoot=await directory(t),other=createLibraryStore({root:otherRoot});const imported=await other.importPackage(pack);assert.notEqual(imported.id,initial.id);assert.equal(imported.name,'Renamed');assert.deepEqual(await other.assetBytes(asset.id),bytes);assert.deepEqual((await other.getAsset(asset.id)).recipe,metadata.recipe);
  const broken=structuredClone(pack);broken.assets[0].base64=wav().fill(0).toString('base64');await assert.rejects(other.importPackage(broken));
  await assert.rejects(store.remove('factory-prism'));await assert.rejects(store.get('../elsewhere'));
  await restored.remove(initial.id);await assert.rejects(restored.get(initial.id));
});
test('local library HTTP adapter supports durable CRUD, audio ranges, bundles and origin protection',async t=>{
  const libraryRoot=await directory(t),server=createMusicServer({libraryRoot});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const base=`http://127.0.0.1:${server.address().port}/api/v1/library/`;
  const request=(route,method='GET',body,headers={})=>fetch(base+route,{method,headers:{'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});
  const factories=await(await request('instruments')).json();assert.equal(factories.length,6);
  const record=createInstrumentRecord(factories[0].patch,{name:'HTTP test'}),created=await(await request('instruments','POST',record)).json();assert.notEqual(created.id,record.id);
  assert.equal((await request('instruments/'+created.id,'PUT',created)).status,200);assert.equal((await request('instruments/'+created.id,'PUT',created)).status,409);
  const audio=wav(),asset=await(await request('assets','POST',{base64:audio.toString('base64'),metadata:{name:'HTTP tone'}})).json();
  const range=await request('assets/'+asset.id+'.wav','GET',undefined,{Range:'bytes=0-15'});assert.equal(range.status,206);assert.deepEqual(Buffer.from(await range.arrayBuffer()),audio.subarray(0,16));
  const pack=await(await request('instruments/'+created.id+'/package')).json();assert.equal((await request('import','POST',pack)).status,201);
  assert.equal((await request('instruments','POST',record,{Origin:'https://unrelated.example'})).status,403);
  assert.equal(await new Promise((resolve,reject)=>{const req=httpRequest(base+'instruments',{headers:{Host:'unrelated.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();}),403);
  assert.equal((await request('instruments/'+created.id,'DELETE')).status,200);assert.equal((await request('instruments/'+created.id)).status,404);
});
