import { PPQ, DEFAULT_METER, normalizeMeterCycle, makeBarMap, scoreBarMap } from './meter.mjs';
import { planPhrase, melodyForBar, degreeMidi } from './theory.mjs';
export { PPQ } from './meter.mjs';
// Legacy 4/4 constant; all current scheduling uses the explicit bar map.
export const BAR_TICKS = PPQ * 4;
export const SCENES = Object.freeze(['explore', 'tension', 'battle', 'victory']);
export const KEYS = Object.freeze({ D: 50, E: 52, G: 55, A: 57, C: 48 });
export const TRACKS = Object.freeze([
  Object.freeze({ id: 'strings', name: 'Strings', channel: 0, program: 48 }),
  Object.freeze({ id: 'harp', name: 'Harp', channel: 1, program: 46 }),
  Object.freeze({ id: 'woodwind', name: 'Woodwind', channel: 2, program: 73 }),
  Object.freeze({ id: 'horn', name: 'Horn', channel: 3, program: 60 }),
  Object.freeze({ id: 'percussion', name: 'Percussion', channel: 9, program: null })
]);
export const DEFAULTS = Object.freeze({ seed: 'astral-arcana', scene: 'explore', intensity: 0.35, tempo: 92, key: 'D', muted: [], rhythm: 'flowing', meterCycle: Object.freeze([DEFAULT_METER]) });
export const SCORE_STYLES = Object.freeze(['ensemble', 'title', 'contemplative', 'playful', 'danger', 'revelation', 'loss', 'resolution']);
const STYLE_GAIN = {
  ensemble: [1, 1, 1, 1, 1], title: [0.45, 0.95, 0, 0, 0],
  contemplative: [0.45, 0.38, 0.6, 0, 0], playful: [0.65, 0.9, 0.85, 0.35, 0.45],
  danger: [0.95, 0.55, 0.65, 0.85, 0.85], revelation: [0.7, 0.4, 0.7, 0.5, 0],
  loss: [0.4, 0.3, 0.45, 0, 0], resolution: [0.75, 0.65, 0.85, 0.7, 0.25]
};

function bounded(value, name, min, max, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new RangeError(`${name} must be ${integer ? 'an integer' : 'a number'} from ${min} to ${max}`);
  }
  return value;
}

export function normalizeSettings(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Settings must be an object');
  const settings = { ...DEFAULTS, ...input };
  if (typeof settings.seed !== 'string' || !settings.seed.trim() || settings.seed.length > 64) throw new TypeError('seed must contain 1–64 characters');
  if (!SCENES.includes(settings.scene)) throw new TypeError(`scene must be one of ${SCENES.join(', ')}`);
  if (!Object.hasOwn(KEYS, settings.key)) throw new TypeError(`key must be one of ${Object.keys(KEYS).join(', ')}`);
  bounded(settings.intensity, 'intensity', 0, 1);
  bounded(settings.tempo, 'tempo', 40, 200);
  if (!['flowing', 'math-rock'].includes(settings.rhythm)) throw new TypeError('rhythm must be flowing or math-rock');
  const meterCycle = normalizeMeterCycle(settings.meterCycle);
  const scoreStyle = settings.scoreStyle ?? 'ensemble';
  if (!SCORE_STYLES.includes(scoreStyle)) throw new TypeError('Unknown scoreStyle');
  const themeMotif = settings.themeMotif ?? null;
  if (themeMotif !== null && (!Array.isArray(themeMotif) || themeMotif.length !== 8 || themeMotif.some(degree => !Number.isInteger(degree) || degree < 0 || degree > 6))) throw new TypeError('themeMotif must contain eight scale degrees from 0–6');
  if (!Array.isArray(settings.muted) || settings.muted.some(id => !TRACKS.some(t => t.id === id))) throw new TypeError('muted must be an array of known track IDs');
  return Object.freeze({ seed: settings.seed, scene: settings.scene, intensity: settings.intensity, tempo: settings.tempo, key: settings.key, muted: Object.freeze([...new Set(settings.muted)]), rhythm: settings.rhythm, meterCycle, scoreStyle, themeMotif: themeMotif && Object.freeze([...themeMotif]) });
}

// Stateless per-bar random streams make partial generation and seeking reproducible.
// Mulberry32 mixing: Tommy Ettinger; JS implementation adapted from bryc/code.
// Public-domain/MIT fallback notice retained in LICENSES/Bryc-MIT.txt.
export function randomStream(seed) {
  let state = 2166136261;
  for (const character of seed) state = Math.imul(state ^ character.charCodeAt(0), 16777619) >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function compose(input = {}) {
  const settings = normalizeSettings(input);
  const startBar = bounded(input.startBar ?? 0, 'startBar', 0, 1_000_000, true);
  const bars = bounded(input.bars ?? 8, 'bars', 1, 256, true);
  if (input.startTick !== undefined) bounded(input.startTick, 'startTick', 0, 1_000_000_000_000, true);
  const barMap = makeBarMap(settings.meterCycle, startBar, bars, input.startTick);
  const root = KEYS[settings.key];
  const identity = randomStream(settings.seed);
  const motif = settings.themeMotif ?? [0, 2 + Math.floor(identity() * 2), 4, 2, 1, 0, 4, 2 + Math.floor(identity() * 2)];
  const phrase = planPhrase({ root, scene: settings.scene, motif });
  const events = [], harmony = [];
  for (const measure of barMap) {
    const bar = measure.bar, beats = measure.durationTicks / PPQ;
    let eventIndex = 0;
    const random = randomStream(`${settings.seed}:${bar}`);
    const frame = phrase[bar % 8], chord = frame.chordDegree, chordNotes = frame.voicing;
    const degree = (n, octave = 0) => degreeMidi(root, frame.scale, n + octave * 7);
    harmony.push({ bar, rootMidi: frame.rootMidi, notes: chordNotes });
    const intensity = settings.intensity;
    const busy = settings.scene === 'battle' || intensity > 0.72;
    const add = (track, beat, duration, midi, velocity) => {
      const id = `${bar}:${track}:${eventIndex++}`;
      if (settings.muted.includes(track) || beat >= beats) return;
      const styleGain = STYLE_GAIN[settings.scoreStyle][TRACKS.findIndex(item => item.id === track)];
      if (!styleGain) return;
      const startTick = measure.startTick + Math.round(beat * PPQ);
      events.push({ id, track, startTick,
        durationTicks: Math.max(1, Math.min(Math.round(duration * PPQ), measure.startTick + measure.durationTicks - startTick)),
        midi, velocity: Math.max(1, Math.min(127, Math.round(velocity * styleGain * (track === 'percussion' ? 1 : frame.gain)))) });
    };
    const narrative = settings.scoreStyle !== 'ensemble' && settings.themeMotif;
    const quiet = ['contemplative', 'loss'].includes(settings.scoreStyle);
    const melody = narrative ? Array.from({ length: quiet ? 2 : 4 }, (_, index) => ({
      beat: index * beats / (quiet ? 2 : 4), duration: beats / (quiet ? 2 : 4) * (settings.scoreStyle === 'playful' ? 0.45 : 0.82),
      midi: degree(7 + motif[(bar % 2) * 4 + index * (quiet ? 2 : 1)]), accent: true
    })).filter(note => !(frame.ending && note.beat >= beats / 2) && !(quiet && bar % 2)) : melodyForBar({ frame, measure, root, rhythm: settings.rhythm, intensity });
    for (const note of melody) {
      add(settings.scoreStyle === 'title' ? 'harp' : 'woodwind', note.beat, note.duration, note.midi, (note.accent ? 57 : 43) + random() * 5);
    }
    if (settings.rhythm === 'math-rock') {
      const unitBeats = 4 / measure.denominator;
      let groupBeat = 0;
      for (let groupIndex = 0; groupIndex < measure.groups.length; groupIndex++) {
        const groupBeats = measure.groups[groupIndex] * unitBeats;
        // Short chord hits and tapped figures share the additive accent map.
        for (const midi of chordNotes) add('strings', groupBeat, Math.min(0.28, groupBeats * 0.45), midi, 47 + intensity * 22);
        add('horn', groupBeat, Math.min(0.38, groupBeats * 0.7), frame.bassMidi, 50 + intensity * 18);
        const steps = Math.round(groupBeats * 4);
        for (let step = 0; step < steps; step++) {
          if (step !== 0 && step % 3 !== 1 && !(intensity > 0.65 && step % 3 === 0)) continue;
          const position = groupBeat + step / 4;
          const tap = [0, 2, 1, 2][(step + groupIndex + bar % 2) % 4];
          add('harp', position, Math.min(0.2, groupBeat + groupBeats - position), chordNotes[tap] + 12, 53 + random() * 12);
        }
        add('percussion', groupBeat, 0.22, groupIndex % 2 ? 38 : 36, 65 + intensity * 25);
        for (let offset = 0; offset < groupBeats; offset += 0.5) add('percussion', groupBeat + offset, 0.09, 42, offset === 0 ? 48 : 29);
        if (intensity > 0.55 && groupBeats > 0.5) add('percussion', groupBeat + groupBeats - 0.25, 0.1, 38, 42);
        groupBeat += groupBeats;
      }
      continue;
    }
    // One shared harmonic plan drives every instrument. Motif changes are phrased.
    for (const midi of chordNotes) {
      if (busy) for (let beat = 0; beat < beats; beat += 0.5) add('strings', beat, 0.38, midi, 35 + intensity * 20 + (beat % 1 === 0 ? 7 : 0));
      else add('strings', 0, Math.max(0.1, beats - 0.3), midi, 36 + intensity * 20);
    }
    add('strings', 0, busy ? 1.75 : Math.max(0.1, beats - 0.3), frame.bassMidi, 53);
    const harpStep = intensity > 0.65 ? 0.25 : 0.5;
    for (let beat = 0, step = 0; beat < beats; beat += harpStep, step++) {
      if (settings.scoreStyle === 'title' || quiet && step % 4) continue;
      if (intensity < 0.2 && step % 2) continue;
      const arp = [0, 1, 2, 1, 0, 2, 1, 2][step % 8];
      add('harp', beat, 0.42, chordNotes[arp] + 12, 45 + intensity * 18 + random() * 8);
    }
    if (intensity >= 0.5 || settings.scene === 'victory') {
      for (const beat of settings.scene === 'victory' ? [0, 2] : [0, 3]) {
        add('horn', beat, 0.8, degree(chord), 46 + intensity * 22);
        if (intensity > 0.8) add('horn', beat, 0.8, degree(chord + 4), 45);
      }
    }
    if (intensity > 0.25 || settings.scene === 'battle') {
      add('percussion', 0, 0.45, 36, 56 + intensity * 35);
      if (intensity > 0.45 || busy) add('percussion', 2, 0.45, 36, 60 + intensity * 25);
      if (busy) {
        for (const beat of [1, 3]) add('percussion', beat, 0.25, 38, 44 + intensity * 30);
        for (let beat = 0.5; beat < beats; beat += 0.5) add('percussion', beat, 0.12, 42, 22 + random() * 14);
        if (bar % 4 === 3) for (const beat of [3.25, 3.5, 3.75]) add('percussion', beat, 0.2, 45, 38 + beat * 7);
      }
    }
  }
  events.sort((a, b) => a.startTick - b.startTick || a.track.localeCompare(b.track) || a.midi - b.midi);
  const startTick = barMap[0].startTick, last = barMap.at(-1);
  return { schemaVersion: 2, generatorVersion: '0.5.0', ppq: PPQ, startBar, bars, startTick,
    durationTicks: last.startTick + last.durationTicks - startTick, barMap,
    settings: { ...settings, muted: [...settings.muted] }, tracks: TRACKS.map(t => ({ ...t })), harmony, events };
}

export function validateScore(score) {
  if (!score || ![1, 2].includes(score.schemaVersion) || score.ppq !== PPQ || score.schemaVersion === 1 && score.beatsPerBar !== 4) throw new TypeError('Unsupported score format');
  if (typeof score.generatorVersion !== 'string' || !score.generatorVersion) throw new TypeError('Missing generator version');
  const settings = normalizeSettings(score.settings);
  bounded(score.startBar, 'startBar', 0, 1_000_000, true);
  bounded(score.bars, 'bars', 1, 256, true);
  if (!Array.isArray(score.events) || score.events.length > 200_000) throw new TypeError('Invalid event collection');
  const barMap = scoreBarMap(score);
  if (!Array.isArray(barMap) || barMap.length !== score.bars) throw new TypeError('Invalid bar map');
  if (score.schemaVersion === 2) {
    bounded(score.startTick, 'startTick', 0, 1_000_000_000_000, true);
    const expected = makeBarMap(settings.meterCycle, score.startBar, score.bars, score.startTick);
    if (barMap.some((bar, index) => !bar || ['bar', 'startTick', 'durationTicks', 'numerator', 'denominator'].some(key => bar[key] !== expected[index][key]) || !Array.isArray(bar.groups) || bar.groups.join(',') !== expected[index].groups.join(','))) throw new TypeError('Bar map does not match the meter cycle');
    if (score.durationTicks !== barMap.reduce((sum, bar) => sum + bar.durationTicks, 0)) throw new TypeError('Invalid score duration');
  }
  if (!Array.isArray(score.tracks) || score.tracks.length !== TRACKS.length || score.tracks.some((track, index) => !track || ['id', 'name', 'channel', 'program'].some(key => track[key] !== TRACKS[index][key]))) throw new TypeError('Unsupported track layout');
  if (!Array.isArray(score.harmony) || score.harmony.length !== score.bars) throw new TypeError('Missing per-bar harmony');
  for (let index = 0; index < score.harmony.length; index++) {
    const chord = score.harmony[index];
    if (!chord || chord.bar !== score.startBar + index || !Array.isArray(chord.notes) || chord.notes.length !== 3) throw new TypeError('Invalid harmony record');
    bounded(chord.rootMidi, 'rootMidi', 0, 127, true);
    chord.notes.forEach(note => bounded(note, 'harmony note', 0, 127, true));
  }
  let previous = -1;
  const ids = new Set();
  const start = barMap[0].startTick, end = barMap.at(-1).startTick + barMap.at(-1).durationTicks;
  let barIndex = 0;
  for (const event of score.events) {
    if (typeof event.id !== 'string' || ids.has(event.id)) throw new TypeError('Event IDs must be unique strings');
    ids.add(event.id);
    if (!TRACKS.some(t => t.id === event.track)) throw new TypeError('Unknown event track');
    bounded(event.startTick, 'startTick', start, end - 1, true);
    bounded(event.durationTicks, 'durationTicks', 1, PPQ * 32, true);
    bounded(event.midi, 'midi', 0, 127, true);
    bounded(event.velocity, 'velocity', 1, 127, true);
    if (event.startTick < previous || event.startTick + event.durationTicks > end) throw new TypeError('Events must be sorted and contained in the score');
    while (barIndex < barMap.length - 1 && event.startTick >= barMap[barIndex].startTick + barMap[barIndex].durationTicks) barIndex++;
    if (score.schemaVersion === 2 && event.startTick + event.durationTicks > barMap[barIndex].startTick + barMap[barIndex].durationTicks) throw new TypeError('A note exceeds its bar boundary');
    previous = event.startTick;
  }
  return score;
}
