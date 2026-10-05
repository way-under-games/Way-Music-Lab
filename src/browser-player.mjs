import { MusicTransport } from './transport.mjs';
import { WebAudioRenderer } from './webaudio.mjs';

// Optional browser host. Core composition and transport do not depend on this class.
export class BrowserMusic {
  constructor({ settings = {}, volume = 0.6, onBar = () => {}, pauseWhenHidden = true } = {}) {
    this.context = new AudioContext({ latencyHint: 'interactive' });
    this.renderer = new WebAudioRenderer(this.context, { volume });
    this.transport = new MusicTransport(this.renderer, { settings, onBar });
    this.resumeBar = 0;
    this.resumeTick = undefined;
    this.disposed = false;
    this.timer = null;
    this.epoch = 0;
    this.lastError = null;
    this.barHistory = [];
    this.transport.onBar = bar => { this.barHistory.push(bar); this.barHistory = this.barHistory.slice(-3); onBar(bar); };
    this.visibility = () => { if (document.hidden && this.transport.running) this.pause(); };
    this.audioState = () => { if (this.context.state !== 'running' && this.transport.running) this.pause(); };
    if (pauseWhenHidden) document.addEventListener('visibilitychange', this.visibility);
    this.context.addEventListener('statechange', this.audioState);
  }

  async start({ bar = this.resumeBar, startTick = bar === this.resumeBar ? this.resumeTick : undefined } = {}) {
    if (this.disposed) throw new Error('Player is disposed');
    const epoch = ++this.epoch;
    await this.context.resume(); // Call from a real user gesture.
    if (this.disposed || this.epoch !== epoch) return;
    this.transport.start({ bar, startTick });
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      try { this.transport.tick(); } catch (error) { this.lastError = error.message; this.stop(); }
    }, 25);
  }

  setState(patch) {
    if (this.disposed) throw new Error('Player is disposed');
    return this.transport.setState(patch);
  }
  setVolume(volume) { this.renderer.setVolume(volume); }
  loadSamples(track, entries) { return this.renderer.loadSamples(track, entries); }
  loadSampleBank(url, options) { if (this.disposed) throw new Error('Player is disposed'); return this.renderer.loadSampleBank(url, options); }

  pause() {
    this.epoch++;
    if (!this.transport.running) return this.resumeBar;
    const audible = this.barHistory.find(bar => this.context.currentTime >= bar.startTime && this.context.currentTime < bar.endTime);
    this.resumeBar = audible?.score.startBar ?? this.transport.current?.score.startBar ?? this.transport.nextBar;
    this.resumeTick = audible?.score.startTick ?? this.transport.current?.score.startTick ?? this.transport.nextTick ?? undefined;
    this.transport.stop(); this.barHistory = [];
    clearInterval(this.timer); this.timer = null;
    return this.resumeBar;
  }
  stop() {
    this.epoch++;
    this.transport.stop(); clearInterval(this.timer); this.timer = null; this.resumeBar = 0; this.resumeTick = undefined; this.barHistory = [];
  }
  getStatus() {
    return { running: this.transport.running, audioState: this.context.state,
      bar: this.transport.current?.score.startBar ?? this.resumeBar,
      voices: this.renderer.voices.size, droppedEvents: this.transport.droppedEvents,
      resyncs: this.transport.resyncs, voiceLimitHits: this.renderer.voiceLimitHits, error: this.lastError,
      bankId: this.renderer.sampleBank?.manifest.id ?? null, sampledEvents: this.renderer.sampledEvents,
      synthesizedEvents: this.renderer.synthesizedEvents };
  }
  async dispose() {
    if (this.disposed) return;
    this.stop(); this.disposed = true;
    document.removeEventListener('visibilitychange', this.visibility);
    this.context.removeEventListener('statechange', this.audioState);
    this.renderer.dispose(); await this.context.close();
  }
}
