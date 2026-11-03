import {loadInstrumentAssets} from './library-client.mjs';
// MIT. Thin optional browser game host. Project and policy remain engine independent.
import { validateProject, needsSampleBank } from './studio.mjs';
import { StudioEngine, StudioPlayer } from './studio-audio.mjs';
export class BrowserStudio {
  constructor(project,{volume=.55,assetResolve}={}) {if(!Number.isFinite(volume)||volume<0||volume>1)throw new TypeError('Volume must be 0–1');this.assetResolve=assetResolve;this.disposed=false;this.project=validateProject(project);this.context=new AudioContext({latencyHint:'interactive'});this.engine=new StudioEngine(this.context);this.engine.master.gain.value=volume;this.player=new StudioPlayer(this.engine,this.project);this.player.gameEnabled=true;this.timer=null;this.startGeneration=0;this.lastError=null;this.hidden=()=>{if(document.hidden)this.stop();};document.addEventListener('visibilitychange',this.hidden);}
  async start(){if(this.disposed)throw new Error('Studio host is disposed');const generation=++this.startGeneration;await this.context.resume();if(this.disposed||generation!==this.startGeneration)return;if(needsSampleBank(this.project))await this.engine.ensureSampleBank();if(this.disposed||generation!==this.startGeneration)return;await loadInstrumentAssets(this.engine,this.project,{resolve:this.assetResolve});if(this.disposed||generation!==this.startGeneration||this.player.running)return;this.lastError=null;this.player.start();const tick=()=>{try{this.player.tick();}catch(error){this.lastError=error.message;this.stop();}};tick();if(this.player.running)this.timer=setInterval(tick,25);}
  stop(){this.startGeneration++;clearInterval(this.timer);this.timer=null;this.player.stop();}
  setStage(stage){this.player.director.setStage(stage);}
  cue(kind,bars=4){this.player.director.cue(kind,bars);}
  setTelemetry(patch){for(const[key,value]of Object.entries(patch)){if(!['danger','movement','story'].includes(key)||!Number.isFinite(value)||value<0||value>1)throw new TypeError('Telemetry values must be 0–1');}Object.assign(this.player.telemetry,patch);}
  getStatus(){return {running:this.player.running,stage:this.player.director.current,voices:this.engine.voices.size,dropped:this.engine.dropped,error:this.lastError};}
  async dispose(){if(this.disposed)return;this.disposed=true;this.stop();document.removeEventListener('visibilitychange',this.hidden);this.engine.dispose();await this.context.close();}
}
