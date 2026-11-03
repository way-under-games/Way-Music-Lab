import {PPQ} from './meter.mjs';
// MIT. Web Audio adapter for the portable rack; no notes or hooks are generated here.
import {selectSample} from './samples.mjs';
import {layerSourceCost} from './instrument-rack.mjs';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const frequency=m=>440*2**((m-69)/12);
// Mulberry32 mixer adapted from bryc/ Tommy Ettinger; LICENSES/Bryc-MIT.txt.
function random(seed){let n=seed>>>0;return()=>{n+=0x6D2B79F5;let t=Math.imul(n^n>>>15,1|n);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
const hash=text=>{let n=2166136261;for(const ch of text)n=Math.imul(n^ch.charCodeAt(0),16777619);return n>>>0;};
function envLevel(e,t){if(t<0)return 0;if(t<e.attack)return t/e.attack;if(t<e.attack+e.decay)return 1+(e.sustain-1)*(t-e.attack)/e.decay;return e.sustain;}
function startEnvelope(param,e,time,level){param.setValueAtTime(0,time);param.linearRampToValueAtTime(level,time+e.attack);param.linearRampToValueAtTime(level*e.sustain,time+e.attack+e.decay);}
function releaseEnvelope(param,e,start,time,level,release=e.release){const current=level*envLevel(e,time-start);if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(time);else{param.cancelScheduledValues(time);param.setValueAtTime(current,time);}param.linearRampToValueAtTime(0,time+release);}
export function distortionCurve(amount,mode='soft'){
  if(amount===0)return null;const strength=1+amount*15;
  return Float32Array.from({length:4097},(_,i)=>{let x=i/2048-1;if(mode==='crush')return Math.round(x*(2+Math.round((1-amount)*126)))/(2+Math.round((1-amount)*126));x*=strength;if(mode==='hard')return clamp(x,-1,1);if(mode==='fold')return 2/Math.PI*Math.asin(Math.sin(x));return Math.tanh(x)/Math.tanh(strength);});
}
export class RackAudio {
  constructor(engine){this.engine=engine;this.context=engine.context;this.buses=new Map();this.waves=new Map();this.reversed=new Map();this.reversedBytes=0;this.noise=null;}
  smooth(param,value,time){this.engine.smooth(param,value,time,.012);}
  wave(frame,phase=0){const key=phase+':'+frame.join(',');if(this.waves.has(key))return this.waves.get(key);const re=new Float32Array(frame.length+1),im=new Float32Array(frame.length+1),scale=Math.max(1,frame.reduce((s,v)=>s+Math.abs(v),0));frame.forEach((v,i)=>{const a=phase*2*Math.PI*(i+1);re[i+1]=v*Math.sin(a)/scale;im[i+1]=v*Math.cos(a)/scale;});const wave=this.context.createPeriodicWave(re,im,{disableNormalization:true});if(this.waves.size>=256)this.waves.delete(this.waves.keys().next().value);this.waves.set(key,wave);return wave;}
  shape(s,phase){if(s.shape==='harmonic')return s.frames[0];return Array.from({length:64},(_,i)=>{const n=i+1;return s.shape==='sine'?(n===1?1:0):s.shape==='square'?(n%2?1/n:0):s.shape==='triangle'?(n%2?(-1)**((n-1)/2)/n**2:0):(-1)**(n+1)/n;});}
  bus(partId,rack,tempo,time){
    const signature=partId+':'+JSON.stringify(rack.effects)+':'+tempo;let bus=this.buses.get(signature);if(bus){bus.last=time;return bus;}
    // Keep old tails and sounding voices connected, but bound edits during an endless session.
    for(const[key,b]of this.buses)if(b.last+15<time&&![...this.engine.voices.values()].some(v=>v.rackVoice?.bus===b)){b.dispose();this.buses.delete(key);}
    if(this.buses.size>=32)throw new RangeError('Too many simultaneous effect versions; stop playback to clear tails');
    const c=this.context,input=c.createGain(),nodes=[input],sources=[];let output=input;
    const node=n=>(nodes.push(n),n);
    for(const e of rack.effects.filter(e=>e.enabled&&e.mix>0)){
      const split=output,dry=node(c.createGain()),wet=node(c.createGain()),sum=node(c.createGain());dry.gain.value=1-e.mix;wet.gain.value=e.mix;split.connect(dry).connect(sum);
      if(e.type==='eq'){const fx=node(c.createBiquadFilter());fx.type='peaking';fx.frequency.value=Math.min(e.frequency,c.sampleRate*.45);fx.Q.value=e.q;fx.gain.value=e.gainDb;split.connect(fx).connect(wet);}
      if(e.type==='distortion'){const fx=node(c.createWaveShaper());fx.curve=distortionCurve(e.drive,e.mode);fx.oversample=e.drive?'4x':'none';split.connect(fx).connect(wet);}
      if(e.type==='delay'){const fx=node(c.createDelay(4)),feedback=node(c.createGain());fx.delayTime.value=e.sync?Math.min(4,e.beats*60/tempo):e.time;feedback.gain.value=e.feedback;split.connect(fx).connect(wet);fx.connect(feedback).connect(fx);}
      if(e.type==='chorus'){const fx=node(c.createDelay(.1)),osc=node(c.createOscillator()),depth=node(c.createGain());fx.delayTime.value=.018;osc.frequency.value=e.rate;depth.gain.value=e.depth*.008;osc.connect(depth).connect(fx.delayTime);split.connect(fx).connect(wet);osc.start(time);sources.push(osc);}
      if(e.type==='reverb'){const fx=node(c.createConvolver()),length=Math.ceil(c.sampleRate*e.duration),impulse=c.createBuffer(2,length,c.sampleRate),rng=random(hash(e.id));for(let ch=0;ch<2;ch++){const data=impulse.getChannelData(ch);for(let i=0;i<length;i++)data[i]=(rng()*2-1)*Math.exp(-i/length*7)*.2;}fx.buffer=impulse;split.connect(fx).connect(wet);}
      if(e.type==='compressor'){const fx=node(c.createDynamicsCompressor());fx.threshold.value=e.threshold;fx.ratio.value=e.ratio;fx.attack.value=e.attack;fx.release.value=e.release;split.connect(fx).connect(wet);}
      wet.connect(sum);output=sum;
    }
    output.connect(this.engine.master);bus={input,last:time,dispose(){for(const s of sources)try{s.stop();}catch{}for(const n of nodes)n.disconnect();}};this.buses.set(signature,bus);return bus;
  }
  sampleBuffer(layer){const original=this.engine.customAssets.get(layer.sample.assetId);if(!original)throw new Error('Load the instrument samples before playing');if(!layer.sample.reverse)return original;
    const id=layer.sample.assetId;if(this.reversed.has(id))return this.reversed.get(id);const bytes=original.length*original.numberOfChannels*4;if(this.reversedBytes+bytes>128*1024*1024)throw new RangeError('Reversed sample memory exceeds 128 MiB; stop and reload the instrument');const b=this.context.createBuffer(original.numberOfChannels,original.length,original.sampleRate);for(let ch=0;ch<b.numberOfChannels;ch++)b.getChannelData(ch).set(Float32Array.from(original.getChannelData(ch)).reverse());this.reversedBytes+=bytes;this.reversed.set(id,b);return b;
  }
  create(key,midi,velocity,partId,patch,options){
    const {time,channel,macros,bend,expression,tempo,eventId}=options,rack=structuredClone(patch.rack),c=this.context;
    const layers=rack.layers.filter(l=>l.enabled&&midi>=l.loKey&&midi<=l.hiKey&&velocity>=l.loVelocity&&velocity<=l.hiVelocity);
    const cost=layers.reduce((sum,l)=>sum+layerSourceCost(l),0),active=[...this.engine.voices.values()].filter(v=>v.start<=time&&v.end>time);
    if(cost+active.reduce((sum,v)=>sum+(v.rackVoice?.cost??v.sources.length),0)>256){this.engine.dropped++;return null;}
    const siblings=active.filter(v=>v.partId===partId&&v.rackVoice&&!v.rackVoice.forced);
    const previous=siblings.filter(v=>v.start<=time&&v.releaseAt>time).sort((a,b)=>b.start-a.start)[0];
    if(rack.play.mode==='mono')for(const v of siblings)this.release(v,time,.012,true);
    else if(siblings.length>=rack.play.polyphony){const oldest=siblings.sort((a,b)=>a.start-b.start)[0];this.release(oldest,time,.012,true);}
    const bus=this.bus(partId,rack,tempo,time),voice={key,midi,velocity,partId,patch:structuredClone(patch),macros:{...macros},channel,start:time,bend,expression,tempo,sources:[],frameGains:[],released:false,releaseAt:Infinity,end:Infinity,level:velocity/127*.17};
    const state={rack,bus,cost,layers:[],nodes:[],forced:false,fromMidi:previous&&rack.play.glide?previous.midi:midi,legato:!!(previous&&rack.play.mode==='mono'&&rack.play.legato)};voice.rackVoice=state;
    const rng=random(rack.seed^hash(String(eventId)));
    try{for(const l of layers){
      const gain=c.createGain(),volume=c.createGain(),filter=c.createBiquadFilter(),drive=c.createWaveShaper(),pan=c.createStereoPanner();
      gain.connect(filter).connect(drive).connect(volume).connect(pan).connect(l.bypassEffects?this.engine.master:bus.input);state.nodes.push(gain,volume,filter,drive,pan);filter.type=l.filter.type;
      const ls={id:l.id,layer:l,gain,volume,filter,drive,pan,sources:[],envelopes:[],position:-1,driveAmount:-1};state.layers.push(ls);
      const amplitude={...l.envelope,attack:state.legato?Math.min(.01,l.envelope.attack):l.envelope.attack};ls.amplitude=amplitude;ls.level=voice.level*l.gain*(l.kind==='sample'?10**((l.sample.gainDb??0)/20):1);
      let sample=null;if(l.kind==='orchestra'){if(!this.engine.sampleBank)throw new Error('Load the recorded orchestra before playing');sample=selectSample(this.engine.sampleBank.regions,{id:eventId+':'+l.id,track:l.orchestra.instrument,midi,velocity},l.orchestra.articulation==='short'?.2:1);if(!sample)throw new Error('No orchestral region for this pitch');ls.level*= (this.engine.sampleBank.manifest.gain??1)*10**(sample.gainDb/20);}
      startEnvelope(gain.gain,amplitude,time,ls.level);
      if(l.kind==='synth'){
        const s=l.synth,count=s.unison;for(let u=0;u<count;u++){
          const spread=count===1?0:(u/(count-1)*2-1),stereo=c.createStereoPanner(),level=c.createGain();stereo.pan.value=spread*s.spread;level.gain.value=1/Math.sqrt(count);level.connect(stereo).connect(gain);state.nodes.push(level,stereo);
          const phase=s.randomPhase?rng():s.phase,osc=c.createOscillator(),spec={detune:spread*s.detune};osc.frequency.value=frequency(midi+l.tune);osc.detune.value=l.fine+spec.detune;
          if(s.engine==='fm'){if(phase)osc.setPeriodicWave(this.wave([1,0,0,0],phase));else osc.type='sine';}else if(s.engine==='wavetable'||s.shape==='harmonic')osc.setPeriodicWave(this.wave(s.frames[0],phase));else if(phase||s.randomPhase)osc.setPeriodicWave(this.wave(this.shape(s),phase));else osc.type=s.shape;
          osc.connect(level);osc.start(time);voice.sources.push({oscillator:osc,spec});const source={osc,detune:spec.detune,phase,level};ls.sources.push(source);
          if(s.engine==='fm'){
            const mod=c.createOscillator(),envelope=c.createGain(),depth=c.createGain();mod.type='sine';mod.frequency.value=frequency(midi+l.tune)*s.fm.ratio;mod.connect(envelope).connect(depth).connect(osc.frequency);startEnvelope(envelope.gain,s.fm.envelope,time,1);mod.start(time);state.nodes.push(envelope,depth);voice.sources.push({oscillator:mod,spec});source.fm={mod,envelope,depth};ls.envelopes.push({param:envelope.gain,e:s.fm.envelope,level:1});
          }else if(s.engine==='wavetable'){
            source.tableFrame=0;source.frameTotal=s.frames.length;source.baseLevel=1/Math.sqrt(count);
            for(let frame=1;frame<s.frames.length;frame++){
              const other=c.createOscillator(),frameLevel=c.createGain();other.frequency.value=osc.frequency.value;other.detune.value=osc.detune.value;other.setPeriodicWave(this.wave(s.frames[frame],phase));other.connect(frameLevel).connect(stereo);frameLevel.gain.value=0;other.start(time);state.nodes.push(frameLevel);voice.sources.push({oscillator:other,spec});ls.sources.push({osc:other,detune:spec.detune,phase,level:frameLevel,tableFrame:frame,frameTotal:s.frames.length,baseLevel:1/Math.sqrt(count)});
            }
          }
        }
      }else{
        const src=c.createBufferSource();let buffer;
        if(l.kind==='noise'){if(!this.noise){this.noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const data=this.noise.getChannelData(0),noiseRng=random(312);for(let i=0;i<data.length;i++)data[i]=noiseRng()*2-1;}buffer=this.noise;src.loop=true;}
        else buffer=sample?.buffer??this.sampleBuffer(l);
        src.buffer=buffer;let offset=0,duration;
        if(l.kind==='sample'){const a=l.sample,end=a.end??buffer.duration;if(a.start>=buffer.duration||end>buffer.duration+.001||a.loop&&a.loopEnd>buffer.duration+.001)throw new RangeError('Sample trim and loop must fit inside the audio');offset=a.start;duration=end-offset;src.loop=a.loop;src.loopStart=a.loopStart;src.loopEnd=a.loopEnd;}
        if(sample?.loop){src.loop=true;src.loopStart=sample.loop.start;src.loopEnd=sample.loop.end;}
        const root=sample?.midi??l.sample.rootMidi;src.playbackRate.value=l.kind==='noise'||l.kind==='orchestra'&&l.orchestra.instrument==='percussion'?1:2**((midi+l.tune-root)/12);src.connect(gain);if(!src.loop&&duration)src.start(time,offset,duration);else src.start(time,offset);voice.sources.push({oscillator:src,spec:{detune:0}});ls.sources.push({osc:src,detune:0,sample:true,root,percussion:l.kind==='noise'||l.kind==='orchestra'&&l.orchestra.instrument==='percussion'});
      }
    }
    this.update(voice,time,tempo);return voice;
    }catch(error){for(const s of voice.sources)try{s.oscillator.stop();s.oscillator.disconnect();}catch{}for(const n of state.nodes)n.disconnect();throw error;}
  }
  update(v,time,tempo){
    if(time<v.start||time>=v.releaseAt)return;const state=v.rackVoice,rack=v.patch.rack??state.rack,t=time-v.start;
    const values={velocity:v.velocity/127,key:(v.midi-60)/60,...v.macros};
    for(const m of rack.modulators){const rate=m.sync?tempo/60/m.period:m.rate,clock=m.retrigger==='transport'?time:t,position=((clock*rate)%1+1)%1;
      if(m.type==='envelope')values[m.id]=envLevel(m.envelope,t);else if(m.type==='random')values[m.id]=random(rack.seed^hash(m.id+':'+Math.floor(clock*rate)))()*2-1;
      else{const p=position*m.curve.length,i=Math.floor(p);values[m.id]=m.curve[i]*(1-p+i)+m.curve[(i+1)%m.curve.length]*(p-i);}v.lfoPhase=position;v.lfoValue=values[m.id];}
    let expression=0;for(const point of v.expression)if(point.tick<=t*v.tempo/60*PPQ)expression=point.value;else break;
    const bend=(this.engine.bends.get(v.channel)??0)+v.bend+expression,glide=state.rack.play.glide,pitchBase=glide?state.fromMidi+(v.midi-state.fromMidi)*clamp(t/glide):v.midi;
    for(const ls of state.layers){const l=rack.layers.find(l=>l.id===ls.id)??ls.layer,delta={cutoff:(v.macros.brightness-.45)*3,resonance:0,volume:0,pan:0,pitch:0,position:0,fmIndex:0,drive:0};for(const r of rack.routes)if(r.layer==='*'||r.layer===l.id)delta[r.target]+=(values[r.source]??0)*r.amount;
      const cutoff=clamp(l.filter.cutoff*2**delta.cutoff,30,this.context.sampleRate*.45);this.smooth(ls.filter.frequency,cutoff,time);this.smooth(ls.filter.Q,clamp(l.filter.resonance+delta.resonance*12,.1,18),time);ls.filter.type=l.filter.type;
      this.smooth(ls.volume.gain,l.enabled?clamp(1+delta.volume,0,2)*(ls.layer.gain?l.gain/ls.layer.gain:0):0,time);this.smooth(ls.pan.pan,clamp(l.pan+delta.pan,-1,1),time);
      const drive=clamp(l.drive+delta.drive);if(Math.abs(drive-ls.driveAmount)>.005){ls.drive.curve=distortionCurve(drive);ls.drive.oversample=drive?'4x':'none';ls.driveAmount=drive;}
      const position=clamp((l.synth?.position??0)+delta.position);v.position=position;v.cutoff=cutoff;
      for(const s of ls.sources){const midi=pitchBase+l.tune+bend+delta.pitch*12,detune=l.fine+s.detune;
        if(s.sample){this.smooth(s.osc.playbackRate,s.percussion?1:2**((midi-s.root+detune/100)/12),time);continue;}
        const hz=frequency(midi);this.smooth(s.osc.frequency,hz,time);this.smooth(s.osc.detune,detune,time);
        if(s.fm){this.smooth(s.fm.mod.frequency,Math.min(hz*l.synth.fm.ratio,this.context.sampleRate*.4),time);this.smooth(s.fm.mod.detune,detune,time);const index=Math.min(clamp(l.synth.fm.index+delta.fmIndex*12,0,12),Math.max(0,this.context.sampleRate*.45/hz-l.synth.fm.ratio-1));this.smooth(s.fm.depth.gain,hz*index,time);}
        if(s.tableFrame!==undefined){const weight=Math.max(0,1-Math.abs(position*(s.frameTotal-1)-s.tableFrame));this.smooth(s.level.gain,weight*s.baseLevel,time);}
      }
    }
  }
  release(v,time,forcedRelease,force=false){const state=v.rackVoice;if(state.forced)return;if(force)state.forced=true;const t=Math.max(time,v.start);let end=t;
    for(const ls of state.layers){const release=forcedRelease??ls.amplitude.release;releaseEnvelope(ls.gain.gain,ls.amplitude,v.start,t,ls.level,release);for(const e of ls.envelopes)releaseEnvelope(e.param,e.e,v.start,t,e.level,Math.min(e.e.release,release));end=Math.max(end,t+release);}
    for(const s of v.sources)try{s.oscillator.stop(end+.02);}catch{}v.releaseAt=t;v.end=end+.03;v.released=true;
  }
  kill(v){for(const n of v.rackVoice.nodes)n.disconnect();}
  silence(){for(const b of this.buses.values())b.dispose();this.buses.clear();}
  dispose(){this.silence();this.waves.clear();this.reversed.clear();this.reversedBytes=0;this.noise=null;}
}
