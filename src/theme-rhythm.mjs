// MIT. Original demonstration rhythm, expressed as fractions of a complete gesture.
// Authored pitches stay in order. Quiet scoring stretches the entire gesture.
export const DEFAULT_THEME_RHYTHM=Object.freeze([0,.09375,.25,.40625,.5,.625,.75,.90625].map((position,i)=>Object.freeze({position,duration:[.07,.11,.12,.07,.10,.08,.12,.07][i]})));
export function normalizeThemeRhythm(input=DEFAULT_THEME_RHYTHM){
  if(!Array.isArray(input)||input.length!==8)throw new TypeError('Theme rhythm needs eight timed notes');
  let previous=-1;
  return Object.freeze(input.map(note=>{
    if(!note||!Number.isFinite(note.position)||!Number.isFinite(note.duration)||note.position<0||note.position>=1||note.position<=previous||note.duration<=0||note.duration>1||note.position+note.duration>1)throw new TypeError('Theme timings must be ordered, positive and inside the gesture');
    previous=note.position;return Object.freeze({position:note.position,duration:note.duration});
  }));
}
export function themeNotesForBar({bar,beats,motif,rhythm,quiet,degree,playful,gridTicks=null}){
  const span=quiet?4:2,phase=bar%span;
  const notes=rhythm.flatMap((note,index)=>{
    const at=note.position*span;
    return Math.floor(at)!==phase?[]:[{beat:(at-phase)*beats,duration:note.duration*span*beats*(quiet ? .68 : playful ? .65 : 1),midi:degree(7+motif[index]),accent:index===0||index===4}];
  });
  // Explicit preset opt-in: preserve an eighth/sixteenth pulse in changing meters.
  // If a bar is too short to fit distinct grid positions, retain its authored timing.
  const grid=gridTicks/480;
  if(gridTicks&&Math.floor((beats-1/480)/grid)+1>=notes.length){
    for(let i=0;i<notes.length;i++){
      const lower=i?notes[i-1].beat+grid:0,upper=Math.floor((beats-1/480)/grid)*grid-(notes.length-1-i)*grid;
      notes[i].beat=Math.max(lower,Math.min(upper,Math.round(notes[i].beat/grid)*grid));
    }
  }
  return notes;
}
export function arrangementForBar(bar){
  const section=Math.floor(bar/8)%4,phase=bar%8;
  return {section:['statement','development','contrast','return'][section],phase,
    response:phase===3||phase===7,thin:section===2||phase===7,
    arp:section===1?[0,2,1,2,1,0,2,1]:section===2?[2,1,0,1]:[0,1,2,1,0,2,1,2],
    offset:section===1?.25:section===2?.5:0};
}
