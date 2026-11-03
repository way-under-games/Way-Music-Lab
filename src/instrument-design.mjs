// MIT. Portable curve/partial tools; no DOM, audio device, or third-party presets.
const clamp=(v,lo=-1,hi=1)=>Math.max(lo,Math.min(hi,v));
export function lfoValue(shape,phase,curve){
  phase=((phase%1)+1)%1;
  if(shape==='custom'){
    const position=phase*curve.length,left=Math.floor(position),mix=position-left;
    return curve[left]*(1-mix)+curve[(left+1)%curve.length]*mix;
  }
  return shape==='sine'?Math.sin(phase*Math.PI*2):shape==='triangle'?1-4*Math.abs(phase-.5):phase<.5?1:-1;
}
export function movementCurve(kind,count=16){
  if(!Number.isInteger(count)||count<4||count>64)throw new RangeError('A movement curve needs 4–64 points');
  if(!['sine','triangle','rise','fall','gate','bounce','steps'].includes(kind))throw new TypeError('Unknown movement shape');
  return Array.from({length:count},(_,i)=>{const p=i/count;return kind==='rise'?-1+2*p:kind==='fall'?1-2*p:kind==='gate'?(p<.5?1:-1):kind==='bounce'?2*Math.abs(Math.sin(2*Math.PI*p))-1:kind==='steps'?[-1,.6,-.3,1][Math.floor(p*4)]:lfoValue(kind,p);});
}
export function sculptFrame(frame,operation){
  if(!Array.isArray(frame)||frame.length!==8||frame.some(v=>!Number.isFinite(v)||Math.abs(v)>1))throw new TypeError('Expected eight bounded harmonics');
  if(['sine','saw','square','bell'].includes(operation))return Array.from({length:8},(_,i)=>{const n=i+1;return operation==='sine'?(i===0?1:0):operation==='saw'?1/n:operation==='square'?(n%2?1/n:0):[1,0,.15,0,.65,0,0,.35][i];});
  if(!['brighten','soften','hollow','invert'].includes(operation))throw new TypeError('Unknown frame tool');
  return frame.map((v,i)=>operation==='brighten'?clamp(v*(1+i*.35)):operation==='soften'?v/(1+i*.6):operation==='hollow'?(i%2===1?0:v):-v);
}
