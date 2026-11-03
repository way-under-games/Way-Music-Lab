// MIT. Shared visual authoring UI over the portable meter contract.
import {parseMeterCycle,formatMeterCycle,normalizeMeter,meterTicks} from '../src/meter.mjs';
export const METER_STARTERS=[
  ['Steady','4/4:1+1+1+1','A familiar four-count loop'],
  ['Waltz','3/4:1+1+1','A repeating one-two-three'],
  ['Rolling','6/8:3+3','Two groups of three little ticks'],
  ['Off-kilter','7/8:2+2+3','Short, short, long'],
  ['Math rock','7/8:2+2+3,5/8:3+2,4/4:1+1+1+1','Three different bars, then repeat']
];
const node=(tag,text='',attrs={})=>{const n=document.createElement(tag);n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
export function createMeterBuilder(root,{value,tempo=()=>92,onApply,allowFitLoop=false}={}){
  let committed=value,draft=parseMeterCycle(value).map(m=>structuredClone(m)),preview=null;
  root.classList.add('meter-builder');
  const heading=node('h3','Build your rhythm'),intro=node('p','A bar is one repeating count. A cycle is a row of bars played in order, then repeated.',{class:'meter-help'});
  const starters=node('div','',{class:'meter-starters'}),cards=node('div','',{class:'meter-cards'}),summary=node('p','',{class:'meter-summary','aria-live':'polite'}),actions=node('div','',{class:'meter-actions'}),feedback=node('p','Choose a starting feel, or change the bars below. Nothing changes until you apply it.',{class:'meter-help',role:'status'});
  const add=node('button','＋ Add bar',{type:'button'}),listen=node('button','▶ Hear the count',{type:'button'}),apply=node('button','Use this rhythm',{type:'button',class:'primary accent'});
  const fit=node('input','',{type:'checkbox'}),fitLabel=node('label','',{class:'meter-fit'});fitLabel.append(fit,document.createTextNode('Also fit the note loop to one full cycle (your notes stay saved)'));
  root.append(heading,intro,starters,cards,summary,actions);actions.append(add,listen,apply);if(allowFitLoop)root.append(fitLabel);root.append(feedback);
  for(const[name,text,hint]of METER_STARTERS){const b=node('button','',{type:'button','data-meter-starter':name,title:hint});b.append(node('strong',name),node('small',hint));b.addEventListener('click',()=>{draft=parseMeterCycle(text).map(m=>structuredClone(m));render();feedback.textContent='Try the count, then choose “Use this rhythm” when you like it.';});starters.append(b);}
  function stop(){if(!preview)return;for(const timer of preview.timers)clearTimeout(timer);for(const source of preview.sources)try{source.stop();}catch{}preview.context.close().catch(()=>{});preview=null;listen.textContent='▶ Hear the count';root.querySelectorAll('.counting').forEach(n=>n.classList.remove('counting'));}
  const act=(text,label,callback,disabled=false)=>{const b=node('button',text,{type:'button','aria-label':label});b.disabled=disabled;b.addEventListener('click',()=>{stop();callback();render();});return b;};
  function render(){
    stop();cards.replaceChildren();
    draft.forEach((m,index)=>{
      const card=node('div','',{class:'meter-bar'}),top=node('div','',{class:'meter-bar-top'});top.append(node('strong','Bar '+(index+1)));
      top.append(act('←','Move bar '+(index+1)+' earlier',()=>{[draft[index-1],draft[index]]=[draft[index],draft[index-1]];},index===0),act('→','Move bar '+(index+1)+' later',()=>{[draft[index+1],draft[index]]=[draft[index],draft[index+1]];},index===draft.length-1),act('Copy','Copy bar '+(index+1),()=>draft.splice(index+1,0,structuredClone(m)),draft.length>=32),act('Remove','Remove bar '+(index+1),()=>draft.splice(index,1),draft.length===1));
      card.append(top);const settings=node('div','',{class:'meter-bar-settings'});
      for(const[key,label,options]of [['numerator','How many ticks?',Array.from({length:16},(_,i)=>[i+1,String(i+1)])],['denominator','Size of each tick',[[4,'Quarter note · familiar beat'],[8,'Eighth note · half a beat'],[16,'Sixteenth note · quarter beat'],[2,'Half note · two beats']]]]){
        const l=node('label',label),select=node('select','',{'aria-label':label+' in bar '+(index+1)});for(const[v,text]of options){const option=node('option',text,{value:String(v)});option.selected=v===m[key];select.append(option);}select.addEventListener('change',()=>{draft[index]=structuredClone(normalizeMeter({...m,[key]:Number(select.value),...(key==='numerator'?{groups:undefined}:{})}));render();});l.append(select);settings.append(l);
      }
      card.append(settings,node('p','Tap a tick to start a new accent group. Bright ticks get an extra push.',{class:'meter-help'}));
      const beats=node('div','',{class:'meter-beats'});let offset=0;const starts=new Set(m.groups.map(g=>{const start=offset;offset+=g;return start;}));
      for(let i=0;i<m.numerator;i++){
        const b=node('button',String(i+1),{type:'button','aria-label':`Bar ${index+1}, tick ${i+1}: ${starts.has(i)?'accented':'light'}`,'aria-pressed':String(starts.has(i)),'data-meter-tick':`${index}:${i}`});b.disabled=i===0;
        b.addEventListener('click',()=>{if(starts.has(i))starts.delete(i);else starts.add(i);const ordered=[...starts].sort((a,b)=>a-b);draft[index].groups=ordered.map((start,j)=>(ordered[j+1]??m.numerator)-start);render();});beats.append(b);
      }
      card.append(beats,node('p',`${m.numerator}/${m.denominator} · ${m.groups.join(' + ')} · say “${m.groups.map(g=>Array.from({length:g},(_,i)=>i===0?'ONE':String(i+1)).join(' ')).join(' | ')}”`,{class:'meter-count'}));cards.append(card);
    });
    const quarterBeats=draft.reduce((sum,m)=>sum+meterTicks(m)/480,0);summary.textContent=draft.map(m=>`${m.numerator}/${m.denominator}`).join(' → ')+` → repeat · ${draft.length} ${draft.length===1?'bar':'bars'} · ${quarterBeats} quarter beats per cycle`;
    add.disabled=draft.length>=32;
  }
  add.addEventListener('click',()=>{if(draft.length>=32)return;draft.push(structuredClone(draft.at(-1)));render();});
  apply.addEventListener('click',()=>{try{onApply(formatMeterCycle(draft),{fitLoop:allowFitLoop&&fit.checked});feedback.textContent='Rhythm applied. You can keep exploring and apply another whenever you like.';}catch(error){feedback.textContent=error.message;}});
  listen.addEventListener('click',async()=>{
    if(preview){stop();return;}
    try{
      const rate=Number(tempo());if(!Number.isFinite(rate)||rate<40||rate>200)throw new Error('Set a tempo between 40 and 200 first.');
      const context=new AudioContext(),run={context,sources:[],timers:[]};preview=run;await context.resume();if(preview!==run)return;
      listen.textContent='■ Stop count';let elapsed=0,ticks=0;const origin=context.currentTime+.06;
      outer:for(const[index,m]of draft.entries()){
        let groupStart=0;const accents=new Set(m.groups.map(g=>{const v=groupStart;groupStart+=g;return v;}));
        for(let i=0;i<m.numerator;i++){
          if(elapsed>=12||ticks++>=96)break outer;
          const start=origin+elapsed,osc=context.createOscillator(),gain=context.createGain();osc.frequency.value=i===0?1100:accents.has(i)?800:520;
          gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(i===0?.09:.055,start+.002);gain.gain.exponentialRampToValueAtTime(.00001,start+.045);osc.connect(gain).connect(context.destination);osc.start(start);osc.stop(start+.05);run.sources.push(osc);
          run.timers.push(setTimeout(()=>{if(preview!==run)return;root.querySelectorAll('.counting').forEach(n=>n.classList.remove('counting'));root.querySelector(`[data-meter-tick="${index}:${i}"]`)?.classList.add('counting');},(elapsed+.06)*1000));
          elapsed+=60/rate*4/m.denominator;
        }
      }
      feedback.textContent='Counting your draft rhythm. The preview plays once, up to 12 seconds; applying it changes the music.';
      run.timers.push(setTimeout(()=>{if(preview===run)stop();},(Math.min(12,elapsed)+.15)*1000));
    }catch(error){stop();feedback.textContent='Could not preview the count: '+error.message;}
  });
  const hidden=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hidden);window.addEventListener('blur',stop);
  render();return{set(text){if(text===committed)return;committed=text;draft=parseMeterCycle(text).map(m=>structuredClone(m));render();},stop,destroy(){stop();document.removeEventListener('visibilitychange',hidden);window.removeEventListener('blur',stop);}};
}
