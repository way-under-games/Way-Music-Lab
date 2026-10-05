import { readFile } from 'node:fs/promises';
import { validateScore } from '../src/composer.mjs';
import { scoreBarMap } from '../src/meter.mjs';

// Structural measurements for listening comparisons, not a musical quality score.
const pc = note => ((note % 12) + 12) % 12;
const travel = chords => chords.slice(1).reduce((sum, chord, index) => sum + chord.reduce((part, note, voice) => part + Math.abs(note - chords[index][voice]), 0), 0);
try {
  if (!process.argv[2]) throw new TypeError('Usage: node scripts/inspect-score.mjs score.json');
  const score = validateScore(JSON.parse(await readFile(process.argv[2], 'utf8')));
  const map = scoreBarMap(score);
  const voiced = score.harmony.map(chord => [...chord.notes].sort((a, b) => a - b));
  const rootPosition = score.harmony.map(chord => chord.notes.map(note => chord.rootMidi + pc(note - chord.rootMidi)).sort((a, b) => a - b));
  const melody = score.events.filter(event => event.track === 'woodwind');
  const intervals = melody.slice(1).map((note, index) => Math.abs(note.midi - melody[index].midi));
  const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  console.log(JSON.stringify({ file: process.argv[2], generatorVersion: score.generatorVersion, bars: score.bars, notes: score.events.length,
    meters: map.map(bar => `${bar.numerator}/${bar.denominator}`),
    accompanimentTravelSemitones: travel(voiced), rootPositionTravelSameHarmonySemitones: travel(rootPosition),
    melodyNotes: melody.length, meanMelodicIntervalSemitones: mean(intervals), maximumMelodicIntervalSemitones: intervals.length ? Math.max(...intervals) : 0,
    melodyStepOrRepeatFraction: intervals.length ? intervals.filter(value => value <= 2).length / intervals.length : 0
  }, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
