// MIT. Thin optional browser game host. Project and policy remain engine independent.
import { validateProject } from './studio.mjs';
import { StudioEngine, StudioPlayer } from './studio-audio.mjs';
export class BrowserStudio {
  constructor(project,{volume=.55}={}) {if(!Number.isFinite(volume)||volume<0||volume>1)throw new TypeError('Volume must be 0–1');this.disposed=false;this.project=validateProject(project);this.context=new AudioContext({latencyHint:'interactive'});this.engine=new StudioEngine(this.context);this.engine.master.gain.value=volume;this.player=new StudioPlayer(this.engine,this.project);this.player.gameEnabled=true;this.timer=null;this.hidden=()=>{if(document.hidden)this.stop();};document.addEventListener('visibilitychange',this.hidden);}
  async start(){if(this.disposed)throw new Error('Studio host is disposed');await this.context.resume();if(this.disposed||this.player.running)return;this.player.start();this.timer=setInterval(()=>this.player.tick(),25);}
  stop(){clearInterval(this.timer);this.timer=null;this.player.stop();}
  setStage(stage){this.player.director.setStage(stage);}
  cue(kind,bars=4){this.player.director.cue(kind,bars);}
  setTelemetry(patch){for(const[key,value]of Object.entries(patch)){if(!['danger','movement','story'].includes(key)||!Number.isFinite(value)||value<0||value>1)throw new TypeError('Telemetry values must be 0–1');}Object.assign(this.player.telemetry,patch);}
  getStatus(){return {running:this.player.running,stage:this.player.director.current,voices:this.engine.voices.size,dropped:this.engine.dropped};}
  async dispose(){if(this.disposed)return;this.disposed=true;this.stop();document.removeEventListener('visibilitychange',this.hidden);this.engine.dispose();await this.context.close();}
}
