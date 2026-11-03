// MIT. Authored parts to SMF type 1. Patch timbre remains in project JSON/WAV.
import { validateProject, PPQ, bars } from './studio.mjs';
const text = new TextEncoder();
function variable(value) { value=Math.max(0,Math.round(value)); const bytes=[value&127];while(value>>>=7)bytes.unshift((value&127)|128);return bytes; }
const u32 = value => [value>>>24&255,value>>>16&255,value>>>8&255,value&255];
function chunk(name,data){return [...text.encode(name),...u32(data.length),...data];}
function meta(type,s){const data=[...text.encode(s)];return [255,type,...variable(data.length),...data];}
function track(events,end){events.sort((a,b)=>a.tick-b.tick||a.order-b.order);let tick=0;const bytes=[];for(const e of events){bytes.push(...variable(e.tick-tick),...e.data);tick=Math.round(e.tick);}bytes.push(...variable(Math.max(end,tick)-tick),255,47,0);return chunk('MTrk',bytes);}
export function exportStudioMidi(input){
  const p=validateProject(input), tracks=[], end=Math.ceil(Math.max(p.loopTicks,...p.parts.flatMap(part=>part.notes.filter(n=>n.start<p.loopTicks).map(n=>n.start+n.duration))));
  const micros=Math.round(60e6/p.tempo), conductor=[{tick:0,order:0,data:meta(3,p.name)},{tick:0,order:1,data:[255,81,3,micros>>>16&255,micros>>>8&255,micros&255]}];
  // Meter cycles can repeat beyond the loop end when authored releases cross it.
  for(const b of bars(p,Math.min(512,Math.ceil(end/120))))if(b.startTick<end)conductor.push({tick:b.startTick,order:2,data:[255,88,4,b.numerator,Math.log2(b.denominator),24,8]},{tick:b.startTick,order:3,data:meta(6,'Accents '+b.groups.join('+'))});
  tracks.push(track(conductor,end));
  let channelIndex=0;
  p.parts.forEach((part)=>{
    if(part.muted)return;const index=channelIndex++,ch=index<9?index:index+1;if(ch>15)throw new RangeError('MIDI export supports fifteen melodic parts');
    const events=[{tick:0,order:0,data:meta(3,part.name)}];
    for(const [cc,value] of [[101,0],[100,0],[6,24],[38,0],[101,127],[100,127]])events.push({tick:0,order:1,data:[176|ch,cc,value]});
    const bend=(tick,value)=>{const v=Math.max(0,Math.min(16383,Math.round(8192+value/24*8192)));events.push({tick,order:3,data:[224|ch,v&127,v>>>7&127]});};
    for(const n of part.notes)if(n.start<p.loopTicks){const start=Math.round(n.start),stop=Math.round(n.start+n.duration);bend(start,n.bend??0);events.push({tick:start,order:4,data:[144|ch,n.midi,Math.round(n.velocity)]},{tick:stop,order:2,data:[128|ch,n.midi,0]});for(const point of n.expression??[])bend(Math.round(n.start+point.tick),(n.bend??0)+point.value);}
    tracks.push(track(events,end));
  });
  return new Uint8Array([...chunk('MThd',[0,1,0,tracks.length,PPQ>>>8,PPQ&255]),...tracks.flat()]);
}
