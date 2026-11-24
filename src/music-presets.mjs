// MIT. Original authored demonstration music and curated settings; no soundtrack quotations.
import {newProject,validateProject,PPQ,preset,soundWorld} from './studio.mjs';
import {factoryInstruments} from './instrument-factory.mjs';
import {parseMeterCycle,makeBarMap} from './meter.mjs';
import {normalizeSettings} from './composer.mjs';
export const MUSIC_PRESETS=Object.freeze([
  Object.freeze({id:'lantern-trail',name:'Lantern trail · lyrical fantasy',description:'A lyrical mallet theme, answering keys and a warm string bed. Eight bars with a breathing cadence.',scoreDescription:'A lyrical D-minor theme with uneven phrases and space between answers.',tempo:88,key:'D',meter:'4/4',motif:[0,2,4,3,2,0,1,0],positions:[0,.125,.3125,.4375,.5,.625,.75,.90625]}),
  Object.freeze({id:'clockwork-grove',name:'Clockwork grove · shifting meters',description:'Interlocking tapped figures in 7/8 → 5/8 → 4/4, with a clear bass pulse and a returning hook.',scoreDescription:'An E-minor hook over 7/8 → 5/8 → 4/4, with interlocking accents.',tempo:112,key:'E',meter:'7/8:2+2+3,5/8:3+2,4/4',motif:[0,4,2,5,4,2,1,0],positions:[0,.09375,.25,.375,.5,.6875,.8125,.9375]}),
  Object.freeze({id:'neon-tide',name:'Neon tide · melodic EDM',description:'A syncopated wide lead, articulated FM bass, offbeat chord stabs and a restrained drum groove.',scoreDescription:'An A-minor syncopated hook with a brighter pulse. Hear the full synth arrangement in Studio.',tempo:124,key:'A',meter:'4/4',motif:[0,2,4,6,5,4,2,0],positions:[0,.1875,.3125,.4375,.5,.625,.8125,.9375]})
]);
for(const p of MUSIC_PRESETS){Object.freeze(p.motif);Object.freeze(p.positions);}
export function musicPreset(id=MUSIC_PRESETS[0].id){const p=MUSIC_PRESETS.find(p=>p.id===id);if(!p)throw new TypeError('Unknown music preset');return structuredClone(p);}
export function presetTheme(id){const p=musicPreset(id);return {id:p.id,seed:p.id,key:p.key,tempo:p.tempo,motif:p.motif,gridTicks:id==='clockwork-grove'?240:null,meterCycle:parseMeterCycle(p.meter),rhythm:p.positions.map((position,i)=>({position,duration:Math.min([.09,.07,.10,.045][i%4],1-position)}))};}
export function presetScoreSettings(id,scene='explore'){
  const p=musicPreset(id),t=presetTheme(id);return normalizeSettings({seed:p.id,key:p.key,tempo:p.tempo,scene,intensity:p.id==='neon-tide'?.62:p.id==='clockwork-grove'?.48:.32,
    meterCycle:t.meterCycle,rhythm:p.id==='clockwork-grove'?'math-rock':'flowing',themeMotif:t.motif,themeRhythm:t.rhythm,themeGridTicks:t.gridTicks,scoreStyle:{explore:'playful',tension:'revelation',battle:'danger',victory:'resolution'}[scene]});
}
// Original, independently authored lead lines. Positions are musical quarter beats,
// not a 4/4 melody multiplied by the length of an odd bar.
const FANTASY=[
 [[0,74,.75],[1,77,.5],[2,81,.75],[3,79,.4],[3.5,77,.4]],
 [[0,74,1],[1.5,77,.5],[2.5,74,.5],[3.25,70,.5]],
 [[0,79,.75],[1,82,.5],[2,81,.4],[2.5,79,.4],[3.25,77,.5]],
 [[0,76,1],[1.5,73,.6],[2.5,76,.75]],
 [[0,74,.5],[.75,77,.4],[1.5,81,.65],[2.5,84,.4],[3.25,81,.45]],
 [[0,82,.7],[1,81,.4],[1.5,79,.4],[2,77,.75],[3,74,.6]],
 [[0,76,.6],[1,73,.4],[1.5,71,.4],[2,69,.65],[3.25,73,.45]],
 [[0,74,2.5]]
];
const CLOCKWORK=[
 [[0,74,.35],[.5,81,.3],[1.5,77,.3],[2,76,.3],[3,74,.3]],
 [[0,77,.3],[.75,74,.3],[1.5,70,.7]],
 [[0,79,.4],[.5,82,.3],[1.5,86,.4],[2.5,84,.3],[3,82,.5]],
 [[0,76,.4],[1,73,.4],[2,69,.65]],
 [[0,74,.25],[.5,81,.25],[1,77,.25],[1.5,76,.25],[2,74,.35]],
 [[0,77,.4],[.75,82,.4],[1.5,81,.3],[2,79,.3],[2.5,77,.4],[3.25,74,.4]],
 [[0,73,.5],[1,76,.3],[1.5,71,.3],[2,69,.5],[3,73,.3]],
 [[0,74,1.5]]
];
const NEON=[
 [[.5,81,.35],[1.25,84,.35],[2,86,.6],[3.25,81,.5]],
 [[0,77,.35],[.75,81,.35],[1.5,86,.5],[2.5,84,.4],[3.25,81,.5]],
 [[.5,81,.35],[1.25,84,.4],[2,89,.6],[3.25,88,.4]],
 [[.5,86,.35],[1.25,88,.35],[2,91,.5],[3.25,88,.35]],
 [[.25,81,.35],[1,84,.35],[1.75,86,.6],[3,89,.5]],
 [[.5,77,.35],[1.25,81,.35],[2,82,.6],[3.25,81,.35]],
 [[.5,79,.35],[1.25,76,.35],[2,74,.35],[2.75,76,.35],[3.5,79,.3]],
 [[0,77,.5],[.75,76,.3],[1.5,74,1]]
];
const TONAL_CHORDS=[[62,65,69],[58,62,65],[62,67,70],[61,64,69],[62,65,69],[58,62,65],[61,64,69],[62,65,69]];
const MODAL_CHORDS=[[62,65,69],[58,62,65],[60,65,69],[60,64,67],[62,65,69],[58,62,65],[60,64,67],[62,65,69]];
export function demoScorePlan(id){
 const p=musicPreset(id),odd=id==='clockwork-grove',edm=id==='neon-tide';
 return structuredClone({lead:odd?CLOCKWORK:edm?NEON:FANTASY,chords:edm?MODAL_CHORDS:TONAL_CHORDS,bass:edm?[38,34,41,36,38,34,36,38]:[38,34,43,33,38,34,33,38],
  form:edm?'modal hook / upper-register lift / return':'question / half cadence / varied answer / tonic arrival',
  functions:edm?['i','VI','III','VII','i','VI','VII','i']:['i','VI','iv','V','i','VI','V','i'],
  cadence:edm?'modal VII–i':'V–i',mode:'minor',meter:p.meter});
}
export function createDemoProject(id=MUSIC_PRESETS[0].id){
  const spec=musicPreset(id),p=newProject(),bank=factoryInstruments(),get=name=>structuredClone(bank.find(r=>r.id==='factory-'+name).patch),edm=id==='neon-tide',odd=id==='clockwork-grove',plan=demoScorePlan(id),transpose=spec.key==='E'?2:spec.key==='A'?7:0;
  p.name=spec.name;p.tempo=spec.tempo;p.meter=spec.meter;
  const map=makeBarMap(parseMeterCycle(p.meter),0,8);p.loopTicks=map.at(-1).startTick+map.at(-1).durationTicks;
  const percussion=preset('Recorded rhythm');percussion.source='orchestra';percussion.instrument='percussion';percussion.articulation='short';percussion.release=.08;
  p.parts=[{name:'Theme · Way example',patch:get(edm?'prism':'bell')},{name:'Answering keys',patch:get('map')},{name:'Bass pulse',patch:edm?get('cobalt'):soundWorld('sub')},{name:edm?'Offbeat chords':odd?'Organ answers':'Recorded string bed',patch:get(edm?'map':odd?'crypt':'canopy')},{name:'Drum groove',patch:percussion}].map((part,i)=>({...part,id:'part-'+i,muted:false,notes:[]}));
  p.parts[0].patch.macros.space=edm?.45:.55;p.parts[0].patch.macros.width=.65;
  if(edm){for(const l of p.parts[0].patch.rack.layers)l.gain=Math.min(1,l.gain*1.3);for(const l of p.parts[2].patch.rack.layers)l.gain*=.65;}
  // Shorter chord articulation leaves room for the melody and bass.
  for(const l of p.parts[3].patch.rack.layers){l.gain*=.38;l.envelope=edm?{attack:.005,decay:.18,sustain:.1,release:.18}:{attack:.18,decay:.6,sustain:.45,release:.65};}
  for(const l of p.parts[1].patch.rack.layers)l.gain*=.52;
  const add=(part,bar,beat,midi,duration,velocity)=>{const measure=map[bar],beats=measure.durationTicks/PPQ;if(beat>=beats)return;const start=measure.startTick+Math.round(beat*PPQ);p.parts[part].notes.push({id:'example-'+id+'-'+part+'-'+p.parts[part].notes.length,start,midi:midi+(part===4?0:transpose),duration:Math.max(1,Math.min(Math.round(duration*PPQ),measure.startTick+measure.durationTicks-start)),velocity});};
  for(let bar=0;bar<8;bar++){
    const beats=map[bar].durationTicks/PPQ,chord=plan.chords[bar],arrival=bar===7,groupStarts=[];let groupBeat=0;for(const group of map[bar].groups){groupStarts.push(groupBeat);groupBeat+=group*4/map[bar].denominator;}
    for(const [i,[beat,midi,duration]] of plan.lead[bar].entries())add(0,bar,beat,midi-(edm?12:0),duration,arrival?82:84+(i%3)*5);
    if(bar%2===1&&!arrival){const leadEnd=Math.max(...plan.lead[bar].map(n=>n[0]+n[2]));for(const [i,beat]of [Math.ceil(leadEnd*4)/4,Math.ceil(leadEnd*4)/4+.5].entries())add(1,bar,beat,chord[(i+1)%3],.3,58+i*5);}
    const bassPattern=edm?[0,.75,1.5,2,2.75,3.5]:odd?groupStarts:[0,2.5];
    for(const [i,beat]of bassPattern.entries())add(2,bar,beat,plan.bass[bar]+(edm&&i===3?12:0),edm?.28:Math.min(1.4,beats*.3),i?72:86);
    for(const beat of edm?[.5,1.5,2.5,3.5]:odd?groupStarts.filter((_,i)=>i%2===0).map(n=>n+.25):[0])for(const midi of chord)add(3,bar,beat,midi,edm?.24:odd?.2:beats*.8,edm?62:55);
    if(!(bar===0&&!edm)){for(const beat of edm?[0,1,2,3]:odd?[0,...groupStarts.slice(2)]:[0,2])add(4,bar,beat,36,.15,edm?82:55);if(edm||odd)for(const beat of odd?[groupStarts.at(-1)]:[1,3])add(4,bar,beat,38,.12,edm?65:52);for(let beat=.5;beat<beats*(arrival?.5:1);beat+=edm?.5:1)add(4,bar,beat,42,.08,beat%1?32:43);}
  }
  const all=p.parts.map(part=>part.id);p.scenes=Object.fromEntries(Object.keys(p.scenes).map(stage=>[stage,{parts:stage==='title'?['part-0','part-3']:stage==='opening'||stage==='loss'?['part-0','part-1']:stage==='revelation'?['part-0','part-1','part-3']:all,variation:''}]));
  // Demo scenes use explicit saved sound variations, never generated replacement hooks.
  p.variations={};for(const name of ['Soft opening','Battle energy','Distant memory']){
    const patches=p.parts.map(part=>{const patch=structuredClone(part.patch);Object.assign(patch.macros,name==='Battle energy'?{brightness:.65,motion:.7,space:.35}:name==='Distant memory'?{brightness:.2,motion:.12,space:.75}:{brightness:.32,motion:.2,space:.5});return patch;});p.variations[name]=patches;
  }
  p.scenes.opening.variation='Soft opening';p.scenes.danger.variation='Battle energy';p.scenes.loss.variation='Distant memory';
  return validateProject(p);
}
export function instrumentPreviewNotes({bass=false,midi=60}={}){return (bass?[[0,0,.32],[.75,0,.22],[1.5,7,.3],[2.25,10,.3],[3.25,7,.45]]:[[0,0,.55],[.75,3,.35],[1.5,7,.6],[2.5,10,.35],[3.25,7,.55]]).map(([beat,offset,duration],i)=>({beat,midi:midi+offset,duration,velocity:[92,72,87,76,82][i]}));}
