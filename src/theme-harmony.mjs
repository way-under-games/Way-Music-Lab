// MIT. Melody-first tonal accompaniment heuristic, not a universal quality model.
import {MINOR_SCALE,MAJOR_SCALE,degreeMidi,progressionDegrees,pitchClass} from './theory.mjs';
export function harmonizeTheme({root,scene,motif,rhythm,quiet=false,section=0,mode='minor'}){
  const scale=[...(mode==='major'?MAJOR_SCALE:MINOR_SCALE)],span=quiet?4:2;
  const preferred=progressionDegrees(scene,section);
  const notes=Array.from({length:8/span},(_,cycle)=>rhythm.map((n,i)=>({at:cycle*span+n.position*span,duration:n.duration*span,midi:degreeMidi(root,scale,7+motif[i])}))).flat();
  const candidates=Array.from({length:7},(_,degree)=>({degree,scale:[...scale]}));
  if(mode==='minor')candidates.push({degree:4,scale:scale.map((n,i)=>i===6?11:n)});
  for(const c of candidates)c.pcs=[0,2,4].map(n=>pitchClass(degreeMidi(root,c.scale,c.degree+n)));
  const contains=(c,midi)=>c.pcs.includes(pitchClass(midi));
  function fit(c,phase){
    let cost=c.degree===preferred[phase]?0:1.1;
    if(phase===0&&c.degree!==0)cost+=1.3;
    if(phase===7&&c.degree!==0&&scene!=='tension')cost+=1.1;
    for(let i=0;i<notes.length;i++){
      const n=notes[i];if(Math.floor(n.at)!==phase||contains(c,n.midi))continue;
      const before=notes[i-1],after=notes[i+1],incoming=before?n.midi-before.midi:0,outgoing=after?after.midi-n.midi:0;
      const stepIn=Math.abs(incoming)>0&&Math.abs(incoming)<=2,stepOut=Math.abs(outgoing)>0&&Math.abs(outgoing)<=2;
      const passing=before&&after&&stepIn&&stepOut&&Math.sign(incoming)===Math.sign(outgoing)&&contains(c,before.midi)&&contains(c,after.midi);
      const neighbor=before&&after&&stepIn&&stepOut&&before.midi===after.midi&&contains(c,after.midi);
      const resolution=after&&stepOut&&contains(c,after.midi);
      const position=n.at-phase,weight=(position===0?2.5:1)+Math.min(n.duration,1-position)*3;
      cost+=weight*((passing||neighbor) ? .2 : resolution ? .55 : 1.6);
    }
    return cost;
  }
  let states=candidates.map((c,index)=>({cost:fit(c,0),path:[index]}));
  for(let phase=1;phase<8;phase++)states=candidates.map((c,index)=>{
    let best;const localCost=fit(c,phase);
    for(let previous=0;previous<candidates.length;previous++){
      const from=candidates[previous],distance=(c.degree-from.degree+7)%7;
      let transition=distance===0?.15:[3,4].includes(distance)?.05:.35;
      if(from.degree===4&&c.degree===0)transition-=.25;
      const cost=states[previous].cost+transition+localCost;
      if(!best||cost<best.cost)best={cost,path:[...states[previous].path,index]};
    }
    return best;
  });
  const best=states.reduce((a,b)=>a.cost<=b.cost?a:b);
  return best.path.map(index=>({degree:candidates[index].degree,scale:[...candidates[index].scale]}));
}
