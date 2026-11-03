import {validateProject} from './studio.mjs';
// MIT. Browser asset/package adapter; canonical records stay engine independent.
import {instrumentAssetIds,validateInstrumentPackage,validateAssetMetadata} from './instrument-library.mjs';
export async function libraryRequest(route,{method='GET',body}={}){const response=await fetch('/api/v1/library/'+route,{method,headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw new Error(result.error??'Library request failed');return result;}
export function projectAssetIds(project){return[...new Set([...project.parts.map(p=>p.patch),...Object.values(project.variations).flat()].flatMap(instrumentAssetIds))];}
export async function loadInstrumentAssets(engine,patchOrProject,{resolve=id=>'/api/v1/library/assets/'+id+'.wav',fetchFn=fetch}={}){
  const ids=patchOrProject.parts?projectAssetIds(patchOrProject):instrumentAssetIds(patchOrProject);
  if(!engine.customAssets)engine.customAssets=new Map();let encoded=0;
  // Serialize per engine to avoid duplicate fetch/decode during repeated keyboard attacks.
  const previous=engine.assetPromise??Promise.resolve();const run=previous.catch(()=>{}).then(async()=>{let decoded=[...engine.customAssets.values()].reduce((s,b)=>s+b.length*b.numberOfChannels*4,0);
    for(const id of ids){if(engine.customAssets.has(id))continue;const response=await fetchFn(resolve(id));if(!response.ok)throw new Error('An instrument sample is missing; import its portable instrument package first');const bytes=await response.arrayBuffer();encoded+=bytes.byteLength;if(bytes.byteLength>16*1024*1024||encoded>32*1024*1024)throw new RangeError('Sample download exceeds its memory budget');const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');if(digest!==id)throw new Error('Instrument sample integrity check failed');const buffer=await engine.context.decodeAudioData(bytes);decoded+=buffer.length*buffer.numberOfChannels*4;if(decoded>128*1024*1024)throw new RangeError('Decoded instrument samples exceed 128 MiB; reload to clear unused samples');if(engine.disposed)throw new Error('Instrument engine disposed during preload');engine.customAssets.set(id,buffer);}
    return engine.customAssets;
  });engine.assetPromise=run;return run;
}
export function bytesBase64(buffer){const bytes=new Uint8Array(buffer);let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text);}
export async function portableInstrument(record){return validateInstrumentPackage(await libraryRequest('instruments/'+record.id+'/package'));}

export async function exportPortableProject(project){
  project=validateProject(project);const queue=projectAssetIds(project);if(!queue.length)return project;
  const assets=[],seen=new Set();let bytes=0;
  for(const id of queue){if(seen.has(id))continue;seen.add(id);const metadata=await libraryRequest('assets/'+id),response=await fetch('/api/v1/library/assets/'+id+'.wav');if(!response.ok)throw new Error('Missing project sample');const audio=await response.arrayBuffer();bytes+=audio.byteLength;if(bytes>32*1024*1024)throw new RangeError('Portable project audio exceeds 32 MiB');assets.push({id,metadata,base64:bytesBase64(audio)});if(metadata.recipe)queue.push(...instrumentAssetIds(metadata.recipe));}
  return{format:'way-project',version:1,project,assets};
}
export async function importPortableProject(input){
  if(input?.format!=='way-project')return validateProject(input);
  if(input.version!==1||!Array.isArray(input.assets)||input.assets.length>64)throw new TypeError('Unsupported project package');
  const project=validateProject(input.project),ids=new Set(),assets=[];let bytes=0;
  for(const a of input.assets){if(ids.has(a.id))throw new TypeError('Duplicate project sample');ids.add(a.id);const metadata=validateAssetMetadata(a.metadata);if(typeof a.base64!=='string'||a.base64.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(a.base64))throw new TypeError('Invalid project audio');bytes+=a.base64.length*3/4;if(bytes>32*1024*1024)throw new RangeError('Portable project audio exceeds 32 MiB');const audio=Uint8Array.from(atob(a.base64),ch=>ch.charCodeAt(0));const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',audio))].map(x=>x.toString(16).padStart(2,'0')).join('');if(hash!==a.id)throw new Error('Project audio hash mismatch');assets.push({...a,metadata});}
  for(const id of [...projectAssetIds(project),...assets.flatMap(a=>a.metadata.recipe?instrumentAssetIds(a.metadata.recipe):[])])if(!ids.has(id))throw new Error('Project package is missing audio');
  for(const a of assets)await libraryRequest('assets',{method:'POST',body:{base64:a.base64,metadata:a.metadata}});return project;
}
