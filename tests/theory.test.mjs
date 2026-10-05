import test from 'node:test';
import assert from 'node:assert/strict';
import { compose, validateScore, KEYS, SCENES } from '../src/composer.mjs';
import { planPhrase, melodyForBar, voiceTriad, pitchClass } from '../src/theory.mjs';
import { makeBarMap, parseMeterCycle } from '../src/meter.mjs';

const motif = [0, 2, 4, 2, 1, 0, 4, 3];
const travel = notes => notes.slice(1).reduce((sum, chord, index) => sum + chord.reduce((subtotal, note, voice) => subtotal + Math.abs(note - notes[index][voice]), 0), 0);

test('voice leading preserves chord content, register, order and common tones', () => {
  const result = voiceTriad([60, 64, 69], [60, 64, 67], { low: 55, high: 79 });
  assert.deepEqual(result, [60, 64, 69]);
  assert.throws(() => voiceTriad([60, 64, 67], undefined, { low: 60, high: 62 }));
  for (const scene of SCENES) for (const root of Object.values(KEYS)) {
    const frames = planPhrase({ root, scene, motif });
    for (const frame of frames) {
      assert.deepEqual(new Set(frame.voicing.map(pitchClass)), new Set(frame.chordNotes.map(pitchClass)));
      assert.ok(frame.voicing[0] < frame.voicing[1] && frame.voicing[1] < frame.voicing[2]);
      assert.ok(frame.voicing[0] >= root + 7 && frame.voicing[2] <= root + 28);
      assert.ok(frame.bassMidi < frame.voicing[0]);
    }
    assert.ok(travel(frames.map(frame => frame.voicing)) < travel(frames.map(frame => frame.chordNotes)));
  }
});

test('minor dominant has a raised seventh and final tonic except in tension', () => {
  for (const scene of SCENES) {
    const score = compose({ scene, key: 'D' });
    const dominantIndex = scene === 'victory' ? 5 : 6;
    assert.deepEqual(new Set(score.harmony[dominantIndex].notes.map(pitchClass)), new Set([9, 1, 4])); // A C# E
    assert.equal(score.harmony[7].rootMidi, scene === 'tension' ? 57 : 50);
    if (scene !== 'victory') {
      assert.ok(score.events.filter(event => event.startTick >= 6 * 1920 && event.startTick < 7 * 1920 && event.track !== 'percussion').every(event => pitchClass(event.midi) !== 0));
    }
  }
});

test('leading tone resolves upward by semitone in the accompaniment at a tonic cadence', () => {
  const frames = planPhrase({ root: 50, scene: 'explore', motif });
  const leadingVoice = frames[6].voicing.findIndex(note => pitchClass(note) === 1);
  assert.ok(leadingVoice >= 0);
  assert.equal(frames[7].voicing[leadingVoice], frames[6].voicing[leadingVoice] + 1);
});

test('strong melodic anchors are chord tones and weak ornaments resolve by step', () => {
  const cycles = ['4/4', '7/8:2+2+3, 5/8:3+2, 4/4', '1/16', '11/8:3+3+3+2', '16/2'];
  for (const scene of SCENES) for (const text of cycles) for (const rhythm of ['flowing', 'math-rock']) {
    const frames = planPhrase({ root: 50, scene, motif });
    const map = makeBarMap(parseMeterCycle(text), 0, 8);
    for (const measure of map) {
      const frame = frames[measure.bar], pcs = frame.chordNotes.map(pitchClass);
      const notes = melodyForBar({ frame, measure, root: 50, rhythm, intensity: 1 });
      for (let index = 0; index < notes.length; index++) {
        const note = notes[index];
        assert.ok(note.midi >= 62 && note.midi <= 78);
        if (note.accent) assert.ok(pcs.includes(pitchClass(note.midi)));
        else {
          assert.ok(Math.abs(notes[index + 1].midi - note.midi) <= 2);
          assert.ok(Math.abs(notes[index - 1].midi - note.midi) <= 2);
          assert.ok(note.duration <= 0.2);
        }
      }
    }
  }
});

test('cadential melody resolves ti to do and leaves the final half-bar empty', () => {
  for (const rhythm of ['flowing', 'math-rock']) {
    const score = compose({ rhythm, meterCycle: parseMeterCycle('7/8:2+2+3, 5/8:3+2, 4/4'), intensity: 1 });
    const before = score.events.filter(event => event.track === 'woodwind' && event.startTick >= score.barMap[6].startTick && event.startTick < score.barMap[7].startTick);
    const final = score.events.filter(event => event.track === 'woodwind' && event.startTick >= score.barMap[7].startTick);
    assert.equal(final[0].midi - before.at(-1).midi, 1);
    assert.ok(final.every(event => event.startTick + event.durationTicks <= score.barMap[7].startTick + score.barMap[7].durationTicks * 0.5));
  }
});

test('motif repetition and continuation are planned rather than drawn independently per note', () => {
  const frames = planPhrase({ root: 50, scene: 'explore', motif });
  assert.deepEqual(frames[0].targets, frames[2].targets);
  assert.deepEqual(frames[1].targets, frames[3].targets);
  assert.notDeepEqual(frames[4].targets, frames[0].targets);
  assert.ok(frames[5].gain > frames[0].gain && frames[7].gain < frames[5].gain);
});

test('theory context is reproducible across phrase boundaries and anchored meter changes', () => {
  for (const scene of SCENES) for (const rhythm of ['flowing', 'math-rock']) {
    const settings = { scene, rhythm, meterCycle: parseMeterCycle('7/8, 5/8, 4/4'), startBar: 5, startTick: 12345, bars: 12 };
    const whole = validateScore(compose(settings));
    for (const measure of whole.barMap) {
      const single = validateScore(compose({ ...settings, startBar: measure.bar, startTick: measure.startTick, bars: 1 }));
      assert.deepEqual(single.events, whole.events.filter(event => event.startTick >= measure.startTick && event.startTick < measure.startTick + measure.durationTicks));
    }
  }
});
