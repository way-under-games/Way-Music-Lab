// MIT. Phase-preserving periodic cycles; sine-only legacy frames remain valid.
export function cycleCoefficients(values, harmonics=32) {
  if (!Array.isArray(values) || values.length < 8 || values.length > 4096 || values.some(v=>!Number.isFinite(v)||Math.abs(v)>1)) throw new TypeError('A cycle needs 8–4096 bounded samples');
  if (!Number.isInteger(harmonics)||harmonics<4||harmonics>64||harmonics*2>=values.length) throw new RangeError('Use 4–64 harmonics below the cycle Nyquist limit');
  const project=fn=>Array.from({length:harmonics},(_,h)=>Math.max(-1,Math.min(1,2/values.length*values.reduce((sum,v,i)=>sum+v*fn(2*Math.PI*i/values.length*(h+1)),0))));
  // DC is deliberately removed; it does not produce a musical oscillator tone.
  return {sine:project(Math.sin),cosine:project(Math.cos)};
}
export function frameScale(sine,cosine=[]) { return Math.max(1,sine.reduce((sum,a,i)=>sum+Math.hypot(a,cosine[i]??0),0)); }
export function cycleValue(sine,cosine=[],position,normalize=true) {
  return sine.reduce((sum,a,i)=>{const angle=2*Math.PI*position*(i+1);return sum+a*Math.sin(angle)+(cosine[i]??0)*Math.cos(angle);},0)/(normalize?frameScale(sine,cosine):1);
}
