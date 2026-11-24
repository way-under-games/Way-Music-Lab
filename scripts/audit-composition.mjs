// MIT. Reproducible structural evidence for listening research, never a quality score.
import {compose,validateScore,SCENES} from '../src/composer.mjs';
import {DEFAULT_THEME,SCORE_PROFILES} from '../src/director.mjs';
import {PPQ,scoreBarMap} from '../src/meter.mjs';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const seeds=['astral-arcana','river','mountain'];
const mixed=[{numerator:7,denominator:8,groups:[2,2,3]},{numerator:5,denominator:8,groups:[3,2]},{numerator:4,denominator:4,groups:[1,1,1,1]}];
const cases=[...SCENES.map(scene=>({name:'ensemble-'+scene,settings:{scene,intensity:scene==='battle'?.85:.35}})),
  ...Object.entries(SCORE_PROFILES).map(([style,p])=>({name:'story-'+style,settings:{scene:p.scene,scoreStyle:style,tempo:p.tempo,intensity:p.intensity,themeMotif:[...DEFAULT_THEME.motif]}})),
  {name:'math-rock-mixed',settings:{scene:'explore',intensity:.55,rhythm:'math-rock',meterCycle:mixed}},
  {name:'story-playful-mixed',settings:{scene:'explore',scoreStyle:'playful',tempo:96,intensity:.3,themeMotif:[...DEFAULT_THEME.motif],meterCycle:mixed}}];
const unique=xs=>[...new Set(xs)];
const ratio=(a,b)=>b?a/b:null;
const signature=(events,start)=>JSON.stringify(events.map(n=>[n.track,n.startTick-start,n.durationTicks,n.midi]));
function inspect(score,name,seed){
  validateScore(score);const bars=scoreBarMap(score),leadTrack=score.settings.scoreStyle==='title'?'harp':'woodwind',lead=score.events.filter(n=>n.track===leadTrack);
  const perBar=bars.map(bar=>{const events=score.events.filter(n=>n.startTick>=bar.startTick&&n.startTick<bar.startTick+bar.durationTicks);return{bar:bar.bar,meter:`${bar.numerator}/${bar.denominator}:${bar.groups.join('+')}`,signature:signature(events,bar.startTick),lead:events.filter(n=>n.track===leadTrack).length,tracks:unique(events.map(n=>n.track)).sort()};});
  const intervals=lead.slice(1).map((n,i)=>n.midi-lead[i].midi),leadOnsets=new Set(lead.map(n=>n.startTick));let totalPairs=0,repeatedPairs=0;
  for(let i=8;i<perBar.length;i++)if(perBar[i].meter===perBar[i-8].meter){totalPairs++;if(perBar[i].signature===perBar[i-8].signature)repeatedPairs++;}
  const roots=score.harmony.map(h=>h.rootMidi);const harmonicChanges=roots.slice(1).flatMap((r,i)=>r===roots[i]?[]:[bars[i+1].startTick]);
  const crossBar=score.events.filter(n=>bars.some(b=>n.startTick>=b.startTick&&n.startTick<b.startTick+b.durationTicks&&n.startTick+n.durationTicks>b.startTick+b.durationTicks));
  return{name,seed,settings:{...score.settings,bars:score.bars},events:score.events.length,leadTrack,
    lead:{notes:lead.length,pitches:unique(lead.map(n=>n.midi)).sort((a,b)=>a-b),durationTicks:unique(lead.map(n=>n.durationTicks)).sort((a,b)=>a-b),
      consecutiveRepeatFraction:ratio(intervals.filter(n=>n===0).length,intervals.length),
      onsetCoincidesWithAnotherPartFraction:ratio(lead.filter(n=>score.events.some(other=>other.track!==leadTrack&&other.startTick===n.startTick)).length,lead.length),
      silentBars:perBar.filter(b=>b.lead===0).map(b=>b.bar)},
    harmony:{pitchesPerRecord:unique(score.harmony.map(h=>h.notes.length)),changes:harmonicChanges.length,withinBarChanges:harmonicChanges.filter(t=>!bars.some(b=>b.startTick===t)).length,
      pitchPlanHash:createHash('sha256').update(JSON.stringify(score.harmony.map(h=>h.notes))).digest('hex')},
    repeatedEightBarsLater:{comparablePairs:totalPairs,identicalPitchRhythmTrackPairs:repeatedPairs,fraction:ratio(repeatedPairs,totalPairs),velocityIncluded:false},
    crossBarNoteCount:crossBar.length,trackActivityPatterns:unique(perBar.map(b=>b.tracks.join('+'))),
    leadOnsetCount:leadOnsets.size};
}
const sourceHashes={};for(const file of ['src/composer.mjs','src/theory.mjs','src/director.mjs'])sourceHashes[file]=createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex');
const results=cases.flatMap(c=>seeds.map(seed=>inspect(compose({bars:16,...c.settings,seed}),c.name,seed)));
const harmonyDiversity=SCENES.map(scene=>({scene,seeds:seeds.length,distinctPitchPlans:unique(results.filter(r=>r.name==='ensemble-'+scene).map(r=>r.harmony.pitchPlanHash)).length}));
const report={format:'way-composition-audit',version:1,researchDate:'2026-11-23',sourceFilesModified:!!execFileSync('git',['status','--porcelain','--',...Object.keys(sourceHashes)],{cwd:root,encoding:'utf8'}).trim(),sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceHashes,
  scope:'39 deterministic 16-bar generated scores: 13 conditions × 3 seeds. Note data and code inspection, not listening or preference evidence.',
  exclusions:['No copyrighted score/audio transcription','No instrument or renderer evaluation','No subjective quality score','No changes to authored Studio parts'],
  harmonyDiversity,results};
const output=JSON.stringify(report,null,2)+'\n';if(process.argv[2]){await writeFile(process.argv[2],output);console.log(`Wrote ${results.length} validated score audits to ${process.argv[2]}`);}else process.stdout.write(output);
