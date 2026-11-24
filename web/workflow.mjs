// MIT. View state only; musical data and audio adapters are unchanged.
let installed=false,lastCompact=null;const homes=new Map();
export function refreshWorkflow(){
 const d=document,header=d.querySelector('body>header')??d.querySelector('header'),nav=d.querySelector('.tool-nav');
 d.documentElement.style.setProperty('--app-header-h',(header?.getBoundingClientRect?.().height||52)+'px');
 d.documentElement.style.setProperty('--session-h',(d.querySelector('.session')?.getBoundingClientRect?.().height||65)+'px');
 d.documentElement.style.setProperty('--app-nav-h',(nav?.getBoundingClientRect?.().height||50)+'px');
 const compact=(globalThis.innerWidth??1500)<721;if(lastCompact!==compact){for(const id of ['loop','volume']){const control=d.getElementById(id)?.closest('label');if(!control)continue;if(!homes.has(id)){const marker=d.createElement('span');marker.hidden=true;control.before(marker);homes.set(id,marker);}if(compact)d.querySelector('.popover-fields')?.append(control);else homes.get(id).after(control);}const list=d.getElementById('parts-panel');if(list)list.open=!compact;lastCompact=compact;}
 const take=d.querySelector('.take'),record=d.getElementById('record');
 if(take){const recording=record?.classList.contains('recording');take.hidden=!recording&&d.getElementById('keep-take').disabled&&d.getElementById('discard-take').disabled;if(recording)d.getElementById('take-state').textContent='Recording…';}
 const parts=d.querySelector('#parts-panel>summary');if(parts)parts.textContent='Parts · '+d.querySelectorAll('#parts .part').length;
}
export function setupWorkflow(){
 if(installed)return;installed=true;
 for(const [buttonKey,contentKey]of [['editorPanel','editorContent'],['gamePanel','gameContent'],['classicPanel','classicContent']]){
  const buttons=[...document.querySelectorAll('[data-'+buttonKey.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+']')];
  for(const [i,b]of buttons.entries()){
   b.setAttribute('role','tab');b.setAttribute('aria-selected',b.getAttribute('aria-pressed'));b.parentElement.setAttribute('role','tablist');
   b.addEventListener('click',()=>{for(const other of buttons){other.setAttribute('aria-pressed',String(other===b));other.setAttribute('aria-selected',String(other===b));}for(const panel of document.querySelectorAll('[data-'+contentKey.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+']'))panel.hidden=panel.dataset[contentKey]!==b.dataset[buttonKey];});
   b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next].click();buttons[next].focus();});
  }
 }
 if((globalThis.innerWidth??1500)<721){const parts=document.getElementById('parts-panel'),keys=document.getElementById('keyboard-panel');if(parts)parts.open=false;if(keys)keys.open=false;}
 document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;for(const details of document.querySelectorAll('.record-options[open],#project-files[open]')){details.open=false;details.querySelector('summary')?.focus();}});
 if(globalThis.ResizeObserver){const ro=new ResizeObserver(refreshWorkflow);for(const n of [document.querySelector('body>header')??document.querySelector('header'),document.querySelector('.tool-nav'),document.querySelector('.session')])if(n)ro.observe(n);}
 window.addEventListener('resize',refreshWorkflow);refreshWorkflow();
}
