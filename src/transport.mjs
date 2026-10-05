import { compose, normalizeSettings, PPQ } from './composer.mjs';
import { barStartTick } from './meter.mjs';

// Renderer contract: now(), schedule(event, absoluteSeconds, durationSeconds),
// silence(). The host owns timer cadence and audio-device lifecycle.
export class MusicTransport {
  constructor(renderer, { settings = {}, lookahead = 0.15, onBar = () => {} } = {}) {
    if (!renderer || ['now', 'schedule', 'silence'].some(name => typeof renderer[name] !== 'function')) throw new TypeError('Invalid renderer');
    if (!Number.isFinite(lookahead) || lookahead < 0.05 || lookahead > 0.5) throw new RangeError('lookahead must be 0.05–0.5 seconds');
    this.renderer = renderer;
    this.settings = normalizeSettings(settings);
    this.lookahead = lookahead;
    this.onBar = onBar;
    this.running = false;
    this.nextBar = 0;
    this.pending = null;
    this.current = null;
    this.nextTick = null;
    this.scheduledEvents = 0;
    this.droppedEvents = 0;
    this.resyncs = 0;
  }

  setState(patch) {
    const updated = normalizeSettings({ ...(this.pending ?? this.settings), ...patch });
    if (this.running) this.pending = updated;
    else this.settings = updated;
    return { effectiveBar: this.running && this.current ? this.current.score.startBar + 1 : this.nextBar, settings: updated };
  }

  start({ bar = 0, startTick } = {}) {
    if (!Number.isInteger(bar) || bar < 0 || bar > 1_000_000) throw new RangeError('Invalid start bar');
    if (this.running) return;
    if (startTick !== undefined && (!Number.isInteger(startTick) || startTick < 0 || startTick > 1_000_000_000_000)) throw new RangeError('Invalid start tick');
    this.renderer.silence();
    this.running = true;
    this.nextBar = bar;
    this.nextTick = startTick ?? barStartTick(this.settings.meterCycle, bar);
    this.nextTime = this.renderer.now() + 0.08;
    this.current = null;
    this.tick();
  }

  stop() {
    this.running = false;
    this.renderer.silence();
    this.current = null;
    if (this.pending) { this.settings = this.pending; this.pending = null; }
  }

  pause() {
    // Resume at a whole bar; replaying a partial bar would require voice snapshots.
    const bar = this.current?.score.startBar ?? this.nextBar;
    const startTick = this.current?.score.startTick ?? this.nextTick;
    this.stop();
    this.nextBar = bar;
    this.nextTick = startTick;
    return bar;
  }

  tick() {
    if (!this.running) return;
    const now = this.renderer.now();
    if (!Number.isFinite(now)) throw new TypeError('Renderer clock must be finite');
    // A stalled/hidden tab must not flood the device with overdue notes.
    if (this.current && now > this.current.endTime + this.lookahead) {
      this.renderer.silence();
      this.resyncs++;
      this.nextBar = this.current.score.startBar + 1;
      this.nextTick = this.current.score.startTick + this.current.score.durationTicks;
      this.current = null;
      this.nextTime = now + 0.08;
    }
    const horizon = now + this.lookahead;
    for (let guard = 0; guard < 8; guard++) {
      if (!this.current) {
        if (this.nextTime > horizon) break;
        if (this.pending) { this.settings = this.pending; this.pending = null; }
        const score = compose({ ...this.settings, startBar: this.nextBar, startTick: this.nextTick, bars: 1 });
        const secondsPerTick = 60 / this.settings.tempo / PPQ;
        this.current = { score, secondsPerTick, startTime: this.nextTime,
          endTime: this.nextTime + score.durationTicks * secondsPerTick, cursor: 0 };
        this.nextBar++;
        this.nextTick = score.startTick + score.durationTicks;
        this.onBar({ score, startTime: this.current.startTime, endTime: this.current.endTime });
      }
      const bar = this.current;
      while (bar.cursor < bar.score.events.length) {
        const event = bar.score.events[bar.cursor];
        const time = bar.startTime + (event.startTick - bar.score.startTick) * bar.secondsPerTick;
        if (time > horizon) break;
        if (time >= now + 0.003) {
          this.renderer.schedule(event, time, event.durationTicks * bar.secondsPerTick);
          this.scheduledEvents++;
        } else this.droppedEvents++;
        bar.cursor++;
      }
      if (bar.endTime > horizon) break;
      this.nextTime = bar.endTime;
      this.current = null;
    }
  }
}
