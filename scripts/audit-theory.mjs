// MIT. Contextual observations for review, not a numerical music-quality grade.
import{MUSIC_PRESETS,createDemoProject,presetScoreSettings}from'../src/music-presets.mjs';
import{compose,KEYS}from'../src/composer.mjs';import{MINOR_SCALE,MAJOR_SCALE}from'../src/theory.mjs';
import{writeFile,readFile}from'node:fs/promises';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';
const pc=n=>((n%12)+12)%12;
const results=MUSIC_PRESETS.map(p=>{
 const demo=createDemoProject(p.id),lead=demo.parts[0].notes,transpose=KEYS[p.key]-50;
 const pitchFingerprint=lead.map(n=>n.midi-transpose);
 const generated=['explore','tension','battle','victory'].map(scene=>{
   const settings=presetScoreSettings(p.id,scene),s=compose({...settings,bars:8}),notes=s.events.filter(n=>n.track==='woodwind'),scale=settings.themeMode==='major'?MAJOR_SCALE:MINOR_SCALE;
   const expected=p.motif.map(degree=>KEYS[p.key]+12+scale[degree]);
   const pitchAlterations=notes.flatMap((n,i)=>n.midi===expected[i%8]?[]:[{index:i,actual:n.midi,expected:expected[i%8]}]);
   const nonChord=notes.flatMap((n,i)=>{const bar=s.barMap.find(b=>n.startTick>=b.startTick&&n.startTick<b.startTick+b.durationTicks),h=s.harmony.find(h=>h.bar===bar.bar);if(h.notes.some(c=>pc(c)===pc(n.midi)))return[];
    const previous=notes[i-1],next=notes[i+1],stepIn=previous&&Math.abs(n.midi-previous.midi)<=2&&n.midi!==previous.midi,stepOut=next&&Math.abs(next.midi-n.midi)<=2&&next.midi!==n.midi;
    const nextBar=next&&s.barMap.find(b=>next.startTick>=b.startTick&&next.startTick<b.startTick+b.durationTicks),nextHarmony=nextBar&&s.harmony.find(h=>h.bar===nextBar.bar),resolves=next&&nextHarmony.notes.some(c=>pc(c)===pc(next.midi));
    return[{bar:bar.bar,beat:(n.startTick-bar.startTick)/480,midi:n.midi,duration:n.durationTicks/480,triad:h.notes,candidate:stepIn&&stepOut&&resolves?'stepwise embellishment candidate':stepOut&&resolves?'stepwise resolution candidate':'needs contextual review'}];});
   return{scene,pitchAlterations,nonChord};
 });
 return{id:p.id,demoLeadNotes:lead.length,demoLeadOffSixteenthGrid:lead.filter(n=>n.start%120!==0).length,pitchFingerprint,generated};
});
const sourceFiles=['src/music-presets.mjs','src/composer.mjs','src/theory.mjs','src/theme-rhythm.mjs','src/director.mjs','src/theme-harmony.mjs'];const sourceHashes={};for(const file of sourceFiles)sourceHashes[file]=createHash('sha256').update(await readFile(new URL('../'+file,import.meta.url))).digest('hex');
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:new URL('../',import.meta.url),encoding:'utf8'}).trim();const sourceFilesModified=!!execFileSync('git',['status','--porcelain','--',...sourceFiles],{cwd:new URL('../',import.meta.url),encoding:'utf8'}).trim();
const report={sourceCommit,sourceFilesModified,sourceHashes,format:'way-contextual-theory-review',version:1,scope:'Original preset data and generated notes. Non-chord tones and off-grid rhythms are observations, not automatic mistakes. No listening/preference claim.',results};
const output=JSON.stringify(report,null,2)+String.fromCharCode(10);if(process.argv[2])await writeFile(process.argv[2],output);else process.stdout.write(output);
