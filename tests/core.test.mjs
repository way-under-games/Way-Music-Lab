import test from 'node:test';
import assert from 'node:assert/strict';
import { compose, validateScore, normalizeSettings, SCENES, KEYS, BAR_TICKS, TRACKS } from '../src/composer.mjs';
import { MusicTransport } from '../src/transport.mjs';
import { exportMidi } from '../src/midi.mjs';
import { parseMeterCycle, normalizeMeterCycle, MATH_ROCK_METERS } from '../src/meter.mjs';
import { readFile } from 'node:fs/promises';

test('composition is reproducible and partial bar requests match a whole score', () => {
  const score = compose({ seed: 'fixture', bars: 12 });
  assert.deepEqual(score, compose({ seed: 'fixture', bars: 12 }));
  const partial = compose({ seed: 'fixture', startBar: 7, bars: 2 });
  assert.deepEqual(partial.events, score.events.filter(event => event.startTick >= 7 * BAR_TICKS && event.startTick < 9 * BAR_TICKS));
  assert.notDeepEqual(score.events, compose({ seed: 'different', bars: 12 }).events);
});

test('all scenes, keys and intensity extremes satisfy event and scale invariants', () => {
  for (const scene of SCENES) for (const key of Object.keys(KEYS)) for (const intensity of [0, 0.25, 0.5, 0.8, 1]) {
    const score = validateScore(compose({ scene, key, intensity, startBar: 80, bars: 16 }));
    for (const event of score.events) {
      const phase = Math.floor(event.startTick / BAR_TICKS) % 8;
      const dominant = scene === 'victory' ? [4, 5].includes(phase) : scene === 'tension' ? [6, 7].includes(phase) : phase === 6;
      const scale = scene === 'victory' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, dominant ? 11 : 10];
      if (event.track !== 'percussion') assert.ok(scale.includes(((event.midi - KEYS[key]) % 12 + 12) % 12));
      assert.ok(Math.floor(event.startTick / BAR_TICKS) === Math.floor((event.startTick + event.durationTicks - 1) / BAR_TICKS));
    }
  }
});

test('increasing energy adds orchestral layers and muting never changes other parts', () => {
  const quiet = compose({ intensity: 0.1, bars: 8 });
  const loud = compose({ intensity: 1, bars: 8 });
  assert.ok(loud.events.length > quiet.events.length);
  assert.equal(quiet.events.some(event => event.track === 'horn'), false);
  assert.equal(loud.events.some(event => event.track === 'horn'), true);
  const muted = compose({ intensity: 1, bars: 8, muted: ['strings', 'percussion'] });
  assert.deepEqual(muted.events, loud.events.filter(e => !['strings', 'percussion'].includes(e.track)));
  assert.equal(compose({ muted: TRACKS.map(t => t.id) }).events.length, 0);
});

test('invalid input is rejected before scheduling or allocating large scores', () => {
  for (const input of [{ bars: 0 }, { bars: 257 }, { bars: 1.5 }, { startBar: -1 }, { tempo: NaN }, { tempo: 300 }, { intensity: -0.1 }, { scene: 'unknown' }, { key: '__proto__' }, { seed: '' }, { seed: 'x'.repeat(65) }, { muted: ['bad'] }, null, []]) {
    assert.throws(() => compose(input));
  }
  const muted = ['harp'];
  const settings = normalizeSettings({ muted }); muted.push('horn');
  assert.deepEqual(settings.muted, ['harp']);
});

test('score validation catches corrupted note ranges, duplicate IDs and duration overruns', () => {
  for (const corrupt of [score => score.events[0].midi = 128, score => score.events[1].id = score.events[0].id,
    score => score.events.at(-1).durationTicks = BAR_TICKS, score => score.events.reverse(), score => score.tracks[0].channel = 9,
    score => score.harmony = [], score => score.generatorVersion = null]) {
    const score = compose(); corrupt(score); assert.throws(() => validateScore(score));
  }
});

function fakeRenderer() {
  return { clock: 10, scheduled: [], silences: 0, now() { return this.clock; },
    schedule(event, time, duration) { this.scheduled.push({ event, time, duration }); }, silence() { this.silences++; } };
}

test('transport schedules once using the renderer clock and bounds its lookahead', () => {
  const renderer = fakeRenderer();
  const transport = new MusicTransport(renderer, { settings: { tempo: 120 } });
  transport.start(); transport.tick();
  assert.ok(renderer.scheduled.length > 0);
  assert.ok(renderer.scheduled.every(note => note.time >= 10 && note.time <= 10.15));
  const ids = renderer.scheduled.map(note => note.event.id);
  assert.equal(new Set(ids).size, ids.length);
  for (let tick = 1; tick <= 80; tick++) { renderer.clock = 10 + tick * 0.025; transport.tick(); }
  assert.equal(new Set(renderer.scheduled.map(note => note.event.id)).size, renderer.scheduled.length);
  assert.equal(transport.droppedEvents, 0);
  const expected = compose({ tempo: 120, bars: 1 }).events;
  assert.deepEqual(renderer.scheduled.filter(n => n.event.startTick < BAR_TICKS).map(n => n.event), expected);
});

test('scene and tempo updates merge and become active at the next bar boundary', () => {
  const renderer = fakeRenderer(), committed = [];
  const transport = new MusicTransport(renderer, { settings: { tempo: 120 }, onBar: bar => committed.push(bar) });
  transport.start();
  assert.equal(transport.setState({ scene: 'battle' }).effectiveBar, 1);
  transport.setState({ intensity: 0.9 }); transport.setState({ tempo: 60 });
  assert.equal(transport.current.score.settings.scene, 'explore');
  renderer.clock = 12; transport.tick();
  assert.equal(committed[1].startTime, 12.08);
  assert.equal(committed[1].endTime, 16.08);
  assert.equal(committed[1].score.settings.scene, 'battle');
  assert.equal(committed[1].score.settings.intensity, 0.9);
});

test('clock stalls resync without a burst of overdue notes; short stalls drop late notes', () => {
  const renderer = fakeRenderer();
  const transport = new MusicTransport(renderer); transport.start();
  renderer.clock = 40;
  const before = renderer.scheduled.length; transport.tick();
  assert.equal(transport.resyncs, 1);
  assert.ok(renderer.scheduled.slice(before).every(n => n.time > 40));
  assert.ok(renderer.scheduled.length - before < 20);
  renderer.clock = 41; transport.tick(); assert.ok(transport.droppedEvents > 0);
});

test('stop, repeated start, pause and restart cancel playback without duplicate scheduling', () => {
  const renderer = fakeRenderer(); const transport = new MusicTransport(renderer);
  transport.start({ bar: 3 }); const count = renderer.scheduled.length;
  transport.start(); assert.equal(renderer.scheduled.length, count);
  assert.equal(transport.pause(), 3); renderer.clock = 50; transport.tick(); assert.equal(renderer.scheduled.length, count);
  assert.equal(transport.running, false);
  transport.start({ bar: 3 }); assert.equal(transport.current.score.startBar, 3);
  transport.setState({ key: 'G' }); transport.stop(); assert.equal(transport.settings.key, 'G');
  assert.ok(renderer.silences >= 3);
});

// Independent SMF reader verifies binary structure and note balance.
function readMidi(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'MThd');
  assert.equal(view.getUint32(4), 6); assert.equal(view.getUint16(8), 1); assert.equal(view.getUint16(12), 480);
  const tracks = []; let pointer = 14;
  const vlq = () => { let value = 0, byte; do { byte = bytes[pointer++]; value = value * 128 + (byte & 127); } while (byte & 128); return value; };
  for (let track = 0; track < view.getUint16(10); track++) {
    assert.equal(new TextDecoder().decode(bytes.slice(pointer, pointer + 4)), 'MTrk');
    const end = pointer + 8 + view.getUint32(pointer + 4); pointer += 8;
    let time = 0; const events = [];
    while (pointer < end) {
      time += vlq(); const status = bytes[pointer++];
      if (status === 255) { const type = bytes[pointer++], length = vlq(); events.push({ time, status, type, data: bytes.slice(pointer, pointer + length) }); pointer += length; }
      else { const length = (status & 240) === 192 ? 1 : 2; events.push({ time, status, data: bytes.slice(pointer, pointer + length) }); pointer += length; }
    }
    assert.equal(pointer, end); tracks.push(events);
  }
  assert.equal(pointer, bytes.length); return tracks;
}

test('MIDI export has tempo, programs, percussion channel and matching note-offs', () => {
  const score = compose({ scene: 'battle', intensity: 1, startBar: 8, bars: 8, tempo: 120 });
  const tracks = readMidi(exportMidi(score)); assert.equal(tracks.length, 6);
  assert.deepEqual([...tracks[0][0].data], [7, 161, 32]);
  let noteCount = 0;
  for (let index = 1; index < tracks.length; index++) {
    const active = new Map();
    for (const event of tracks[index]) {
      if ((event.status & 240) === 144) { const key = `${event.status & 15}:${event.data[0]}`; active.set(key, (active.get(key) ?? 0) + 1); noteCount++; }
      if ((event.status & 240) === 128) { const key = `${event.status & 15}:${event.data[0]}`; assert.ok(active.get(key) > 0); active.set(key, active.get(key) - 1); }
    }
    assert.ok([...active.values()].every(value => value === 0));
    assert.equal(tracks[index].at(-1).time, 8 * BAR_TICKS);
  }
  assert.equal(noteCount, score.events.length);
  assert.ok(tracks[5].some(event => event.status === 0x99));
});

test('fully muted score exports a well-formed silent MIDI file', () => {
  const tracks = readMidi(exportMidi(compose({ muted: TRACKS.map(t => t.id) })));
  assert.ok(tracks.flat().every(event => (event.status & 240) !== 144));
});

test('meter parsing preserves additive groups and rejects malformed or excessive plans', () => {
  assert.deepEqual(parseMeterCycle('7/8:2+2+3, 5/8:3+2, 4/4'), MATH_ROCK_METERS);
  assert.deepEqual(parseMeterCycle('9/8')[0].groups, [3, 3, 3]);
  for (const text of ['', '0/4', '17/8', '7/3', '7/8:2+2', '7/8:0+7', '4/4,', 'alert(1)', Array(33).fill('4/4').join(',')]) assert.throws(() => parseMeterCycle(text));
  const source = [{ numerator: 7, denominator: 8, groups: [2, 2, 3] }];
  const cycle = normalizeMeterCycle(source); source[0].groups[0] = 99;
  assert.equal(cycle[0].groups[0], 2);
});

test('mixed meters have cumulative tick offsets, repeatable partial scores and bounded notes', () => {
  for (const rhythm of ['flowing', 'math-rock']) {
    const score = validateScore(compose({ meterCycle: MATH_ROCK_METERS, rhythm, bars: 9 }));
    assert.deepEqual(score.barMap.slice(0, 3).map(bar => bar.durationTicks), [1680, 1200, 1920]);
    assert.deepEqual(score.barMap.slice(0, 4).map(bar => bar.startTick), [0, 1680, 2880, 4800]);
    assert.equal(score.durationTicks, 14400);
    const partial = compose({ meterCycle: MATH_ROCK_METERS, rhythm, startBar: 4, bars: 2 });
    assert.equal(partial.startTick, 6480);
    assert.deepEqual(partial.events, score.events.filter(event => event.startTick >= 6480 && event.startTick < 9600));
    for (const bar of score.barMap) for (const event of score.events.filter(event => event.startTick >= bar.startTick && event.startTick < bar.startTick + bar.durationTicks)) {
      assert.ok(event.startTick + event.durationTicks <= bar.startTick + bar.durationTicks);
    }
  }
});

test('all supported meter denominators and lengths validate, including large scores', () => {
  for (const denominator of [2, 4, 8, 16]) for (const numerator of [1, 3, 5, 7, 11, 16]) for (const rhythm of ['flowing', 'math-rock']) {
    const score = validateScore(compose({ meterCycle: [{ numerator, denominator }], rhythm, intensity: 1, bars: 3 }));
    assert.equal(score.durationTicks, numerator * 480 * 4 / denominator * 3);
  }
  validateScore(compose({ meterCycle: [{ numerator: 16, denominator: 2 }], intensity: 1, bars: 256 }));
});

test('math-rock accents follow grouping and muting leaves other parts unchanged', () => {
  const settings = { rhythm: 'math-rock', meterCycle: parseMeterCycle('7/8:2+2+3'), intensity: 0.8, bars: 1 };
  const score = compose(settings);
  const kickSnare = score.events.filter(event => event.track === 'percussion' && [36, 38].includes(event.midi));
  assert.ok([0, 480, 960].every(tick => kickSnare.some(event => event.startTick === tick)));
  assert.ok(score.events.some(event => event.track === 'harp' && event.startTick === 120));
  assert.deepEqual(compose({ ...settings, muted: ['harp'] }).events, score.events.filter(event => event.track !== 'harp'));
  const regrouped = compose({ ...settings, meterCycle: parseMeterCycle('7/8:3+2+2') });
  assert.notDeepEqual(regrouped.events, score.events);
});

test('live meter changes preserve tick and audio continuity through shorter and longer bars', () => {
  const renderer = fakeRenderer(), bars = [];
  const transport = new MusicTransport(renderer, { settings: { tempo: 120 }, onBar: bar => bars.push(bar) });
  transport.start(); transport.setState({ meterCycle: parseMeterCycle('7/8') });
  renderer.clock = 12; transport.tick();
  assert.equal(bars[1].score.startTick, 1920);
  assert.equal(bars[1].score.durationTicks, 1680);
  assert.equal(bars[1].startTime, bars[0].endTime);
  assert.equal(bars[1].endTime, 13.83);
  transport.setState({ meterCycle: parseMeterCycle('5/4'), tempo: 60 });
  renderer.clock = 13.75; transport.tick();
  assert.equal(bars[2].score.startTick, 3600);
  assert.equal(bars[2].score.durationTicks, 2400);
  assert.equal(bars[2].startTime, bars[1].endTime);
  assert.equal(bars[2].endTime, 18.83);
  const paused = transport.pause(), tick = transport.nextTick;
  transport.start({ bar: paused, startTick: tick });
  assert.equal(transport.current.score.startTick, 3600);
});

test('mixed-meter MIDI includes correctly positioned signatures and grouping markers', () => {
  const score = compose({ meterCycle: MATH_ROCK_METERS, rhythm: 'math-rock', startBar: 1, bars: 4 });
  const tracks = readMidi(exportMidi(score));
  const signatures = tracks[0].filter(event => event.type === 0x58);
  assert.deepEqual(signatures.map(event => [event.time, ...event.data.slice(0, 2)]), [[0, 5, 3], [1200, 4, 2], [3120, 7, 3], [4800, 5, 3]]);
  const markers = tracks[0].filter(event => event.type === 6);
  assert.equal(new TextDecoder().decode(markers[2].data), '7/8 (2+2+3)');
  assert.ok(tracks.every(track => track.at(-1).time === score.durationTicks));
  assert.equal(tracks.flat().filter(event => (event.status & 240) === 144).length, score.events.length);
});

test('corrupted bar maps, signatures and cross-bar notes are rejected', () => {
  for (const corrupt of [score => score.barMap[1].startTick++, score => score.barMap[0].denominator = 3,
    score => score.durationTicks++, score => score.barMap[0].groups = [7], score => score.events[0].durationTicks = 1920]) {
    const score = compose({ meterCycle: MATH_ROCK_METERS }); corrupt(score); assert.throws(() => validateScore(score));
  }
});

test('saved V1 scores remain readable and exportable after the meter upgrade', async () => {
  const score = JSON.parse(await readFile(new URL('./fixtures/legacy-v1.json', import.meta.url), 'utf8'));
  assert.equal(score.schemaVersion, 1);
  validateScore(score);
  const tracks = readMidi(exportMidi(score));
  assert.equal(tracks[0].find(event => event.type === 0x58).data[0], 4);
});
