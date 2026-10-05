// MIT. Portable narrative policy; no browser, audio device, engine or wall clock.
import { normalizeSettings, DEFAULTS } from './composer.mjs';

export const DEFAULT_THEME = Object.freeze({ id: 'astral-arcana', seed: 'astral-arcana', key: 'D',
  motif: Object.freeze([0, 2, 4, 3, 2, 0, 1, 0]), tempo: 92 });
export const SCORE_PROFILES = Object.freeze({
  title: { scene: 'explore', tempo: 76, intensity: 0.18 },
  contemplative: { scene: 'explore', tempo: 64, intensity: 0.08 },
  playful: { scene: 'explore', tempo: 96, intensity: 0.30 },
  danger: { scene: 'battle', tempo: 128, intensity: 0.85 },
  revelation: { scene: 'tension', tempo: 78, intensity: 0.45 },
  loss: { scene: 'tension', tempo: 62, intensity: 0.12 },
  resolution: { scene: 'victory', tempo: 84, intensity: 0.42 }
});
const unit = (value, name) => { if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(`${name} must be 0–1`); return value; };
const approach = (current, target, delta) => current + Math.max(-delta, Math.min(delta, target - current));

export class ScoreDirector {
  constructor({ theme = DEFAULT_THEME, phraseBars = 4 } = {}) {
    if (!Number.isInteger(phraseBars) || phraseBars < 1 || phraseBars > 16) throw new RangeError('phraseBars must be 1–16');
    if (typeof theme.id !== 'string' || !theme.id.trim() || theme.id.length > 64 || !Array.isArray(theme.motif)) throw new TypeError('An authored theme id and motif are required');
    const settings = normalizeSettings({ seed: theme.seed ?? theme.id, key: theme.key ?? DEFAULT_THEME.key, tempo: theme.tempo ?? DEFAULT_THEME.tempo, themeMotif: theme.motif, meterCycle: theme.meterCycle ?? DEFAULTS.meterCycle });
    this.theme = Object.freeze({ id: theme.id, seed: settings.seed, key: settings.key, tempo: settings.tempo,
      motif: settings.themeMotif, meterCycle: settings.meterCycle });
    this.phraseBars = phraseBars;
    this.stage = 'title';
    this.telemetry = { movement: 0, danger: 0, hasControl: false };
    this.actions = 0;
    this.pendingCue = null;
    this.seenCues = new Set();
    this.resetTimeline();
  }
  setStage(stage) {
    if (!['title', 'opening', 'play'].includes(stage)) throw new TypeError('stage must be title, opening or play');
    this.stage = stage;
  }
  setTelemetry(patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch) || Object.keys(patch).some(key => !['movement', 'danger', 'hasControl'].includes(key))) throw new TypeError('Unknown game telemetry');
    const next = { ...this.telemetry };
    for (const key of ['movement', 'danger']) if (patch[key] !== undefined) next[key] = unit(patch[key], key);
    if (patch.hasControl !== undefined) { if (typeof patch.hasControl !== 'boolean') throw new TypeError('hasControl must be boolean'); next.hasControl = patch.hasControl; }
    this.telemetry = next;
  }
  action(kind = 'interact') {
    if (!['jump', 'interact', 'discover', 'attack'].includes(kind)) throw new TypeError('Unknown action');
    this.actions = Math.min(4, this.actions + (kind === 'discover' ? 2 : 1));
  }
  cue({ id, kind, bars = 4, priority = 90 } = {}) {
    if (typeof id !== 'string' || !id.trim() || id.length > 64 || !['revelation', 'loss', 'resolution'].includes(kind) || !Number.isInteger(bars) || bars < 1 || bars > 32 || !Number.isInteger(priority) || priority < 0 || priority > 100) throw new TypeError('Invalid story cue');
    if (this.seenCues.has(id)) return false;
    // Mark accepted cues only; a lower-priority rejected cue can be requested later.
    if (Math.max(this.pendingCue?.priority ?? -1, this.activeCue?.priority ?? -1) > priority) return false;
    this.seenCues.add(id);
    if (this.seenCues.size > 256) this.seenCues.delete(this.seenCues.values().next().value);
    this.pendingCue = { id, kind, bars, priority };
    return true;
  }
  resetTimeline() {
    this.lastBar = -1; this.plan = null; this.profile = null; this.profileSince = 0;
    this.history = new Map();
    this.combat = false; this.combatSince = 0; this.safeBars = 0; this.activity = 0;
    this.activeCue = null; this.tempo = null; this.intensity = null;
    this.actions = 0;
  }
  advance(bar) {
    if (!Number.isInteger(bar) || bar < 0 || bar > 1_000_000) throw new RangeError('Invalid director bar');
    // Lookahead can prepare the next bar before pause replays the audible one.
    if (this.history.has(bar)) return this.plan = this.history.get(bar);
    if (this.lastBar >= 0 && bar !== this.lastBar + 1) throw new RangeError('Advance in consecutive musical bars');
    if (this.stage === 'opening' && this.telemetry.hasControl) this.stage = 'play';
    this.activity = approach(this.activity, Math.max(this.telemetry.movement, this.actions / 4), 0.25);
    this.actions = 0;
    if (this.activeCue && bar >= this.activeCue.endBar) this.activeCue = null;
    if (this.pendingCue && this.stage !== 'title') {
      this.activeCue = { ...this.pendingCue, endBar: bar + this.pendingCue.bars };
      this.pendingCue = null;
    }
    if (this.stage === 'title') { this.combat = false; this.safeBars = 0; }
    else if (this.telemetry.danger >= 0.65) { if (!this.combat) this.combatSince = bar; this.combat = true; this.safeBars = 0; }
    else if (this.combat) {
      this.safeBars = this.telemetry.danger <= 0.35 ? this.safeBars + 1 : 0;
      if (this.safeBars >= 2 && bar - this.combatSince >= 2) this.combat = false;
    }
    const base = this.stage === 'title' ? 'title' : this.stage === 'opening' ? 'contemplative' : 'playful';
    const cueWins = this.stage !== 'title' && this.activeCue && (!this.combat || this.activeCue.priority >= 80);
    const requested = cueWins ? this.activeCue.kind : this.combat ? 'danger' : base;
    const urgent = requested === 'danger' || cueWins || ['revelation', 'loss', 'resolution'].includes(this.profile);
    if (!this.profile || requested !== this.profile && (urgent || bar % this.phraseBars === 0)) {
      this.profile = requested; this.profileSince = bar;
    }
    const profile = SCORE_PROFILES[this.profile];
    const intensity = Math.min(1, profile.intensity + (this.profile === 'playful' ? this.activity * 0.30 : this.profile === 'danger' ? this.telemetry.danger * 0.12 : 0));
    const tempo = Math.max(40, Math.min(200, profile.tempo * this.theme.tempo / 92 + (this.profile === 'playful' ? this.activity * 12 : 0)));
    this.intensity = this.intensity === null ? intensity : approach(this.intensity, intensity, this.profile === 'danger' ? 0.35 : 0.12);
    this.tempo = this.tempo === null ? tempo : approach(this.tempo, tempo, 6);
    this.lastBar = bar;
    const settings = normalizeSettings({ seed: this.theme.seed, key: this.theme.key, themeMotif: this.theme.motif,
      scoreStyle: this.profile, scene: profile.scene, tempo: this.tempo, intensity: this.intensity,
      meterCycle: this.theme.meterCycle, rhythm: this.profile === 'playful' && this.activity >= 0.5 ? 'math-rock' : 'flowing' });
    this.plan = Object.freeze({ bar, themeId: this.theme.id, stage: this.stage, profile: this.profile,
      requested, pending: requested !== this.profile, cueId: cueWins ? this.activeCue.id : null,
      activity: this.activity, settings });
    this.history.set(bar, this.plan);
    if (this.history.size > 8) this.history.delete(this.history.keys().next().value);
    return this.plan;
  }
  getStatus() { return this.plan ?? { themeId: this.theme.id, stage: this.stage, profile: 'title', pending: false }; }
}
