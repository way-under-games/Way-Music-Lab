// MIT. Browser offline adapter: synth/hybrid recipe -> tuned reusable sample layers.
import {validatePatch,preset} from './studio.mjs';
import {newRack,newLayer,rackTail} from './instrument-rack.mjs';
import {instrumentNeedsOrchestra} from './instrument-library.mjs';
import {StudioEngine,encodeWav} from './studio-audio.mjs';
import {loadInstrumentAssets,bytesBase64,libraryRequest} from './library-client.mjs';
export async function renderInstrumentNote(patch,{midi=60,velocity=100,hold=1.5,sampleRate=48000,sampleBank=null,customAssets=null,assetResolve}={}){
  patch=validatePatch(patch);if(!Number.isInteger(midi)||midi<0||midi>127||!Number.isInteger(velocity)||velocity<1||velocity>127||!Number.isFinite(hold)||hold<.05||hold>10||![24000,44100,48000].includes(sampleRate))throw new TypeError('Invalid note render settings');
  const tail=patch.rack?rackTail(patch.rack):patch.release+6,duration=Math.min(30,hold+tail+.1),context=new OfflineAudioContext(2,Math.ceil(duration*sampleRate),sampleRate),engine=new StudioEngine(context);
  try{if(instrumentNeedsOrchestra(patch)){if(sampleBank)engine.sampleBank=sampleBank;else await engine.ensureSampleBank();}if(customAssets)engine.customAssets=new Map(customAssets);await loadInstrumentAssets(engine,patch,{resolve:assetResolve});
    if(!engine.noteOn('bake',midi,velocity,'bake',patch,{time:0,eventId:'bake:'+midi}))throw new RangeError('This instrument exceeds the audio source budget');const v=engine.voices.get('bake');for(let t=0;t<hold;t+=.025)engine.updateVoice(v,t,120);engine.release('bake',hold);return encodeWav(await context.startRendering());
  }finally{engine.dispose();}
}
export async function bakeInstrument(patch,{roots=[48,60,72],hold=1.5,velocity=100,sampleRate=48000,sampleBank=null,customAssets=null,author='You',license='LicenseRef-UserSupplied',sourceUrl='',attribution='',onProgress=()=>{}}={}){
  patch=validatePatch(patch);roots=[...new Set(roots)].sort((a,b)=>a-b);if(!roots.length||roots.length>6||roots.some(m=>!Number.isInteger(m)||m<0||m>127))throw new TypeError('Bake one to six valid root notes');
  const result=preset(patch.name+' · sampled');result.macros={brightness:.45,motion:0,width:0,space:0};result.rack=newRack();result.rack.effects=[];result.rack.layers=[];
  for(const [i,midi]of roots.entries()){
    onProgress(`Rendering root ${midi} (${i+1}/${roots.length})…`);const bytes=await renderInstrumentNote(patch,{midi,velocity,hold,sampleRate,sampleBank,customAssets});
    const descriptor=await libraryRequest('assets',{method:'POST',body:{base64:bytesBase64(bytes),metadata:{name:patch.name+' · '+midi,author,license,sourceUrl,attribution,origin:'generated',rootMidi:midi,recipe:patch,render:{midi,velocity,hold,sampleRate,renderer:'way-rack-1'}}}});
    const l=newLayer('sample',patch.name+' · root '+midi);l.sample.assetId=descriptor.id;l.sample.rootMidi=midi;l.sample.gainDb=20*Math.log10(1/(.17*.55*(velocity/127)));l.gain=1;l.filter.cutoff=20000;l.envelope={attack:.001,decay:.001,sustain:1,release:.08};l.loKey=i===0?0:Math.floor((roots[i-1]+midi)/2)+1;l.hiKey=i===roots.length-1?127:Math.floor((midi+roots[i+1])/2);result.rack.layers.push(l);
  }
  // The visible per-sample gain compensates for the captured renderer/master velocity scale.
  return validatePatch(result);
}
