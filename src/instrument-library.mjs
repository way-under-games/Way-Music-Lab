// MIT. Portable saved instruments and provenance. Storage/decoding belong to adapters.
import {validatePatch} from './studio.mjs';
import {rackAssetIds,assetId} from './instrument-rack.mjs';
const text=(value,max,name,{empty=false}={})=>{if(typeof value!=='string'||value.length>max||!empty&&!value.trim())throw new TypeError(`Invalid ${name}`);return value;};
export const libraryId=value=>{if(typeof value!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(value)||value.includes('..'))throw new TypeError('Invalid instrument id');return value;};
export function validateInstrumentRecord(input){
  if(input?.version!==1)throw new TypeError('Unsupported saved instrument version');
  const patch=validatePatch(input.patch),name=text(input.name,100,'instrument name');patch.name=name;
  if(!Array.isArray(input.tags)||input.tags.length>20)throw new TypeError('Use at most twenty tags');
  const tags=[...new Set(input.tags.map(t=>text(t,40,'tag').trim().toLowerCase()))];
  const createdAt=input.createdAt??new Date().toISOString(),updatedAt=input.updatedAt??createdAt;
  if(typeof createdAt!=='string'||typeof updatedAt!=='string'||createdAt.length>64||updatedAt.length>64||!Number.isFinite(Date.parse(createdAt))||!Number.isFinite(Date.parse(updatedAt)))throw new TypeError('Invalid instrument dates');
  if(!Number.isInteger(input.revision)||input.revision<1||input.revision>1e9)throw new TypeError('Invalid instrument revision');
  return{version:1,id:libraryId(input.id),name,description:text(input.description??'',2000,'description',{empty:true}),tags,
    author:text(input.author??'You',100,'author'),license:text(input.license??'LicenseRef-UserSupplied',100,'license'),
    attribution:text(input.attribution??'',4000,'attribution',{empty:true}),sourceUrl:sourceUrl(input.sourceUrl??''),createdAt,updatedAt,revision:input.revision,patch};
}
export function createInstrumentRecord(patch,{name=patch.name,tags=[],author='You',license='LicenseRef-UserSupplied',description=''}={}){
  return validateInstrumentRecord({version:1,id:globalThis.crypto.randomUUID(),name,description,tags,author,license,revision:1,patch});
}
function sourceUrl(value){text(value,2000,'source URL',{empty:true});if(value){const url=new URL(value);if(!['https:','http:'].includes(url.protocol))throw new TypeError('Source reference must be an HTTP(S) URL');}return value;}
export function validateAssetMetadata(input={}){
  const m={name:text(input.name??'Imported audio',100,'audio name'),author:text(input.author??'You',100,'audio author'),license:text(input.license??'LicenseRef-UserSupplied',100,'audio license'),
    sourceUrl:sourceUrl(input.sourceUrl??''),attribution:text(input.attribution??'',4000,'audio attribution',{empty:true}),origin:input.origin??'imported',rootMidi:input.rootMidi??60};
  if(!['imported','generated','provider'].includes(m.origin))throw new TypeError('Invalid audio origin');
  if(!Number.isInteger(m.rootMidi)||m.rootMidi<0||m.rootMidi>127)throw new TypeError('Audio root must be a MIDI note');
  if(m.license.startsWith('CC-BY')&&!m.attribution.trim())throw new TypeError('Add the attribution supplied with this Creative Commons recording');
  if(input.originalSha256)m.originalSha256=assetId(input.originalSha256);
  if(input.recipe){m.recipe=validatePatch(input.recipe);if(m.origin!=='generated')throw new TypeError('A rendering recipe belongs to generated audio');}
  if(input.render){const r=input.render;if(!Number.isInteger(r.midi)||r.midi<0||r.midi>127||!Number.isInteger(r.velocity)||r.velocity<1||r.velocity>127||!Number.isFinite(r.hold)||r.hold<.05||r.hold>10||![24000,44100,48000].includes(r.sampleRate))throw new TypeError('Invalid sample render settings');m.render={midi:r.midi,velocity:r.velocity,hold:r.hold,sampleRate:r.sampleRate,renderer:text(r.renderer??'way-rack-1',100,'renderer')};}
  return m;
}
export function instrumentAssetIds(record){const p=record.patch??record;return p.rack?rackAssetIds(p.rack):[];}
export function instrumentNeedsOrchestra(record){const p=record.patch??record;return p.rack?p.rack.layers.some(l=>l.enabled&&l.kind==='orchestra'):p.source==='orchestra';}
export function validateInstrumentPackage(input){
  if(input?.format!=='way-instrument'||input.version!==1||!Array.isArray(input.assets)||input.assets.length>64)throw new TypeError('Unsupported instrument package');
  const record=validateInstrumentRecord(input.record),ids=new Set();let encoded=0;
  const assets=input.assets.map(a=>{const id=assetId(a.id);if(ids.has(id))throw new TypeError('Duplicate packaged asset');ids.add(id);if(typeof a.base64!=='string'||!a.base64.length||a.base64.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(a.base64))throw new TypeError('Invalid packaged audio');encoded+=a.base64.length;if(encoded>Math.ceil(32*1024*1024/3)*4)throw new RangeError('Package audio exceeds 32 MiB');return{id,metadata:validateAssetMetadata(a.metadata),base64:a.base64};});
  for(const id of [...instrumentAssetIds(record),...assets.flatMap(a=>a.metadata.recipe?instrumentAssetIds(a.metadata.recipe):[])])if(!ids.has(id))throw new TypeError('Package is missing an instrument or source-recipe sample');
  return{format:'way-instrument',version:1,record,assets};
}
