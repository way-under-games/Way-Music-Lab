import test from 'node:test';
import assert from 'node:assert/strict';
import { ScoreDirector, DEFAULT_THEME, SCORE_PROFILES } from '../src/director.mjs';
import { compose, validateScore } from '../src/composer.mjs';
import { MATH_ROCK_METERS } from '../src/meter.mjs';
import { MusicTransport } from '../src/transport.mjs';

test('authored identity stays fixed across narrative progression, cues and new games', () => {
  const run = () => {
    const director = new ScoreDirector(), plans = [];
    for (let bar = 0; bar < 20; bar++) {
      if (bar === 4) director.setStage('opening');
      if (bar === 8) director.setTelemetry({ hasControl: true, movement: 0.8 });
      if (bar === 12) director.setTelemetry({ danger: 0.9 });
      if (bar === 16) director.cue({ id: 'chapter-1', kind: 'revelation' });
      plans.push(director.advance(bar));
    }
    return plans;
  };
  const plans = run(); assert.deepEqual(plans, run());
  assert.deepEqual(plans.filter(p => p.bar % 4 === 0).map(p => p.profile), ['title', 'contemplative', 'playful', 'danger', 'revelation']);
  for (const plan of plans) {
    assert.equal(plan.settings.seed, DEFAULT_THEME.seed); assert.equal(plan.settings.key, DEFAULT_THEME.key);
    assert.deepEqual(plan.settings.themeMotif, DEFAULT_THEME.motif);
  }
  assert.throws(() => plans[0].settings.themeMotif.push(2));
});

test('ordinary phase changes wait for phrase boundaries and quiet scoring leaves room', () => {
  const d = new ScoreDirector(); d.advance(0); d.setStage('opening');
  for (let bar = 1; bar < 4; bar++) { const p = d.advance(bar); assert.equal(p.profile, 'title'); assert.equal(p.pending, true); }
  const p = d.advance(4); assert.equal(p.profile, 'contemplative');
  const score = compose({ ...p.settings, bars: 8 }); validateScore(score);
  assert.ok(score.events.every(e => !['percussion', 'horn'].includes(e.track)));
  assert.ok(score.events.filter(e => e.track === 'woodwind').every(e => Number(e.id.split(':')[0]) % 2 === 0));
});

test('danger enters next bar, threshold jitter cannot chatter, and calm waits for a safe phrase', () => {
  const d = new ScoreDirector(); d.setStage('play'); d.advance(0);
  d.setTelemetry({ danger: 0.7 }); assert.equal(d.advance(1).profile, 'danger');
  d.setTelemetry({ danger: 0.5 }); assert.equal(d.advance(2).profile, 'danger');
  d.setTelemetry({ danger: 0.3 }); assert.equal(d.advance(3).profile, 'danger');
  assert.equal(d.advance(4).profile, 'playful');
  d.setTelemetry({ danger: 0.64 }); assert.equal(d.advance(5).profile, 'playful');
});

test('story cues have bounded duration, stable event IDs, priority and return to current danger', () => {
  const d = new ScoreDirector(); d.setStage('play'); d.setTelemetry({ danger: 1 }); d.advance(0);
  assert.equal(d.cue({ id: 'loss-1', kind: 'loss', bars: 2 }), true);
  assert.equal(d.cue({ id: 'loss-1', kind: 'loss', bars: 2 }), false);
  assert.equal(d.advance(1).profile, 'loss');
  assert.equal(d.cue({ id: 'minor', kind: 'revelation', priority: 70 }), false);
  assert.equal(d.advance(2).profile, 'loss'); assert.equal(d.advance(3).profile, 'danger');
  d.setTelemetry({ danger: 0 }); d.cue({ id: 'ending', kind: 'resolution', bars: 1 });
  assert.equal(d.advance(4).profile, 'resolution'); assert.equal(d.advance(5).profile, 'playful');
});

test('movement/actions are smoothed and capped, input is validated, prepared bars replay without consuming cues', () => {
  const d = new ScoreDirector(); d.setStage('play');
  for (let i = 0; i < 1000; i++) d.action('jump');
  const p = d.advance(0); assert.equal(p.activity, 0.25); d.advance(1);
  d.cue({ id: 'pending', kind: 'revelation' });
  assert.equal(d.advance(0), p); // replay after the next bar was prepared
  assert.equal(d.advance(2).cueId, 'pending');
  for (const patch of [{ movement: NaN }, { danger: -1 }, { hasControl: 1 }, { seed: 'new-game' }]) assert.throws(() => d.setTelemetry(patch));
  assert.throws(() => d.advance(99)); assert.throws(() => d.cue({ id: 'invalid', kind: 'battle' }));
  assert.throws(() => new ScoreDirector({ theme: { id: 'bad', motif: [0] } }));
  for (const tempo of [40, 200]) {
    const edge = new ScoreDirector({ theme: { ...DEFAULT_THEME, tempo } });
    edge.setStage('opening'); validateScore(compose(edge.advance(0).settings));
    edge.setTelemetry({ danger: 1 }); validateScore(compose(edge.advance(1).settings));
  }
});

test('every narrative arrangement is valid, preserves authored motif pitch identity and supports partial mixed-meter generation', () => {
  const theme = { ...DEFAULT_THEME, meterCycle: MATH_ROCK_METERS };
  const d = new ScoreDirector({ theme });
  for (const scoreStyle of Object.keys(SCORE_PROFILES)) {
    const settings = { ...d.advance(0).settings, scoreStyle, scene: SCORE_PROFILES[scoreStyle].scene, intensity: SCORE_PROFILES[scoreStyle].intensity };
    const full = compose({ ...settings, bars: 8 }); validateScore(full);
    const partial = compose({ ...settings, startBar: 3, bars: 3 });
    assert.deepEqual(partial.events, full.events.filter(e => e.startTick >= partial.startTick && e.startTick < partial.startTick + partial.durationTicks));
  }
  const settings = d.advance(0).settings;
  const title = compose({ ...settings, bars: 2 });
  assert.deepEqual(title.events.filter(e => e.track === 'harp').map(e => e.midi), DEFAULT_THEME.motif.map(degree => 62 + [0, 2, 3, 5, 7, 8, 10][degree]));
});

test('transport prepares director decisions once per bar and replay survives lookahead pause', () => {
  let now = 0; const d = new ScoreDirector();
  const renderer = { now: () => now, schedule() {}, silence() {} };
  const t = new MusicTransport(renderer, { prepareBar: bar => d.advance(bar).settings });
  t.start(); const first = t.current.score;
  now = t.current.endTime - 0.05; t.tick();
  assert.equal(d.lastBar, 1); t.stop();
  t.start({ bar: first.startBar, startTick: first.startTick });
  assert.deepEqual(t.current.score.events, first.events); t.stop();
});
