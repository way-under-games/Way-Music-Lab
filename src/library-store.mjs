// MIT. Local Node adapter for persistent instruments and content-addressed audio.
import {mkdir,readFile,writeFile,rename,readdir,stat,unlink} from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {assetId} from './instrument-rack.mjs';
import {validateInstrumentRecord,validateAssetMetadata,validateInstrumentPackage,instrumentAssetIds,libraryId} from './instrument-library.mjs';
const MiB=1024*1024;
export class LibraryNotFound extends Error{}
export class LibraryConflict extends Error{}
export function inspectLibraryWav(bytes){
  if(!Buffer.isBuffer(bytes))bytes=Buffer.from(bytes);
  if(bytes.length<48||bytes.length>16*MiB||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,16)!=='WAVEfmt '||bytes.readUInt32LE(16)!==16||bytes.readUInt16LE(20)!==1||bytes.readUInt16LE(22)!==2||bytes.readUInt16LE(34)!==16||bytes.toString('ascii',36,40)!=='data'||bytes.readUInt32LE(4)!==bytes.length-8||bytes.readUInt32LE(40)!==bytes.length-44||(bytes.length-44)%4)throw new TypeError('Import normalized stereo 16-bit PCM WAV audio');
  const sampleRate=bytes.readUInt32LE(24);if(![24000,44100,48000].includes(sampleRate)||bytes.readUInt16LE(32)!==4||bytes.readUInt32LE(28)!==sampleRate*4)throw new TypeError('Unsupported sample rate or WAV alignment');
  const duration=(bytes.length-44)/(sampleRate*4);if(duration>.0&&duration<=30)return{sampleRate,duration,channels:2,bits:16,bytes:bytes.length};throw new RangeError('Sample duration must be greater than zero and at most 30 seconds');
}
const decode=base64=>{if(typeof base64!=='string'||base64.length>Math.ceil(16*MiB/3)*4||base64.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(base64))throw new TypeError('Invalid or oversized sample encoding');return Buffer.from(base64,'base64');};
export function createLibraryStore({root,factory=[]}){
  root=path.resolve(root);const instruments=path.join(root,'instruments'),assets=path.join(root,'assets'),trash=path.join(root,'trash');let pending=Promise.resolve();
  const factories=new Map(factory.map(value=>{const record=validateInstrumentRecord(value);return[record.id,record];}));
  const exclusive=fn=>{const run=pending.then(fn);pending=run.catch(()=>{});return run;};
  const init=()=>Promise.all([mkdir(instruments,{recursive:true}),mkdir(assets,{recursive:true}),mkdir(trash,{recursive:true})]);
  async function json(file){try{return JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')throw new LibraryNotFound('Library item not found');throw error;}}
  async function atomicJson(file,value){const temporary=file+'.'+randomUUID()+'.tmp';try{await writeFile(temporary,JSON.stringify(value,null,2)+'\n',{flag:'wx'});await rename(temporary,file);}catch(error){await unlink(temporary).catch(()=>{});throw error;}}
  async function get(id){libraryId(id);if(factories.has(id))return structuredClone(factories.get(id));return validateInstrumentRecord(await json(path.join(instruments,id+'.json')));}
  async function getAsset(id){assetId(id);const descriptor=await json(path.join(assets,id+'.json'));if(descriptor.id!==id)throw new Error('Stored sample metadata is inconsistent');return descriptor;}
  async function assetBytes(id){assetId(id);try{return await readFile(path.join(assets,id+'.wav'));}catch(error){if(error.code==='ENOENT')throw new LibraryNotFound('Sample audio not found');throw error;}}
  async function checkReferences(record){for(const id of instrumentAssetIds(record))await getAsset(id);}
  async function saveInternal(input,id){
    await init();let previous;if(id){libraryId(id);if(factories.has(id))throw new TypeError('Save a personal copy of a factory instrument');previous=await get(id);if(input.revision!==previous.revision)throw new LibraryConflict('This instrument changed elsewhere. Reload it or save a new copy.');}
    else{const existing=(await readdir(instruments)).filter(name=>name.endsWith('.json'));if(existing.length>=500)throw new RangeError('The local library is limited to 500 saved instruments');}
    const now=new Date().toISOString(),record=validateInstrumentRecord({...input,id:id??randomUUID(),version:1,revision:previous?previous.revision+1:1,createdAt:previous?.createdAt??now,updatedAt:now});
    await checkReferences(record);await atomicJson(path.join(instruments,record.id+'.json'),record);return record;
  }
  async function putAssetInternal(bytes,inputMetadata,expectedId){
    await init();const info=inspectLibraryWav(bytes),metadata=validateAssetMetadata(inputMetadata),id=createHash('sha256').update(bytes).digest('hex');if(expectedId&&id!==expectedId)throw new TypeError('Packaged sample hash does not match its audio');
    try{return await getAsset(id);}catch(error){if(!(error instanceof LibraryNotFound))throw error;}
    let total=0;for(const name of await readdir(assets))if(/^[a-f0-9]{64}\.wav$/.test(name))total+=(await stat(path.join(assets,name))).size;
    if(total+bytes.length>512*MiB)throw new RangeError('The local sample library reached its 512 MiB budget');
    const descriptor={version:1,id,...metadata,...info,createdAt:new Date().toISOString()};
    try{await writeFile(path.join(assets,id+'.wav'),bytes,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;const existing=await assetBytes(id);if(!existing.equals(bytes))throw new Error('Stored sample hash collision');}
    await atomicJson(path.join(assets,id+'.json'),descriptor);return descriptor;
  }
  return{
    root,assetPath:id=>path.join(assets,assetId(id)+'.wav'),get,getAsset,assetBytes,
    async list(){await init();const result=[...factories.values()].map(r=>({...structuredClone(r),factory:true}));for(const name of (await readdir(instruments)).filter(n=>/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}\.json$/.test(n)).slice(0,500)){const record=validateInstrumentRecord(await json(path.join(instruments,name)));result.push({...record,factory:false});}return result.sort((a,b)=>a.name.localeCompare(b.name));},
    async listAssets(){await init();const result=[];for(const name of (await readdir(assets)).filter(n=>/^[a-f0-9]{64}\.json$/.test(n)))result.push(await getAsset(name.slice(0,-5)));return result;},
    save:(record,id)=>exclusive(()=>saveInternal(record,id)),
    putAsset:(base64,metadata)=>exclusive(()=>putAssetInternal(decode(base64),metadata)),
    remove:id=>exclusive(async()=>{libraryId(id);if(factories.has(id))throw new TypeError('Factory instruments cannot be deleted');await init();await get(id);await rename(path.join(instruments,id+'.json'),path.join(trash,id+'-'+Date.now()+'.json'));return{id,trashed:true};}),
    async exportPackage(id){const record=await get(id),packaged=[];let total=0;const queue=instrumentAssetIds(record),seen=new Set();for(const hash of queue){if(seen.has(hash))continue;seen.add(hash);const descriptor=await getAsset(hash);if(descriptor.recipe)queue.push(...instrumentAssetIds(descriptor.recipe));const bytes=await assetBytes(hash);total+=bytes.length;if(total>32*MiB)throw new RangeError('Instrument package audio exceeds 32 MiB');packaged.push({id:hash,metadata:descriptor,base64:bytes.toString('base64')});}return{format:'way-instrument',version:1,record,assets:packaged};},
    importPackage:input=>exclusive(async()=>{const pack=validateInstrumentPackage(input);const decoded=pack.assets.map(a=>({asset:a,bytes:decode(a.base64)}));for(const{asset,bytes}of decoded){inspectLibraryWav(bytes);if(createHash('sha256').update(bytes).digest('hex')!==asset.id)throw new TypeError('Packaged sample hash does not match its audio');}for(const{asset,bytes}of decoded)await putAssetInternal(bytes,asset.metadata,asset.id);return saveInternal(pack.record);})
  };
}
