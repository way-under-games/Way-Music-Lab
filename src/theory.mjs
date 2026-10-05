// Style-specific tonal heuristics, not universal rules for good music.
// Sources and the reason for each constraint: docs/music-theory-and-sound.md.
import { PPQ } from './meter.mjs';
export const MAJOR_SCALE = Object.freeze([0, 2, 4, 5, 7, 9, 11]);
export const MINOR_SCALE = Object.freeze([0, 2, 3, 5, 7, 8, 10]);
const PROGRESSIONS = Object.freeze({
  explore: [0, 0, 5, 5, 3, 3, 4, 0],
  tension: [0, 0, 3, 3, 5, 5, 4, 4],
  battle: [0, 0, 5, 5, 3, 3, 4, 0],
  victory: [0, 0, 3, 3, 4, 4, 0, 0]
});
const PHRASE_GAIN = [0.86, 0.9, 0.9, 0.94, 1, 1.06, 1.02, 0.82];
export const pitchClass = midi => ((midi % 12) + 12) % 12;

export function scaleForBar(scene, bar) {
  const chordDegree = PROGRESSIONS[scene][bar % 8];
  const scale = [...(scene === 'victory' ? MAJOR_SCALE : MINOR_SCALE)];
  // Raise degree seven only over V, avoiding simultaneous natural/raised sevenths.
  if (scene !== 'victory' && chordDegree === 4) scale[6] = 11;
  return scale;
}

export function degreeMidi(root, scale, degree) {
  return root + scale[((degree % 7) + 7) % 7] + 12 * Math.floor(degree / 7);
}

function parallelPenalty(previous, next) {
  let penalty = 0;
  for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) {
    const interval = pitchClass(previous[b] - previous[a]);
    if ((interval === 0 || interval === 7) && pitchClass(next[b] - next[a]) === interval &&
      next[a] !== previous[a] && Math.sign(next[a] - previous[a]) === Math.sign(next[b] - previous[b])) penalty += 6;
  }
  return penalty;
}

export function voiceTriad(chordNotes, previous, { low = 55, high = 79, tonic } = {}) {
  const pcs = new Set(chordNotes.map(pitchClass));
  const candidates = [];
  for (let note = low; note <= high; note++) if (pcs.has(pitchClass(note))) candidates.push(note);
  let best, bestCost = Infinity;
  for (let a = 0; a < candidates.length; a++) for (let b = a + 1; b < candidates.length; b++) for (let c = b + 1; c < candidates.length; c++) {
    const notes = [candidates[a], candidates[b], candidates[c]];
    if (new Set(notes.map(pitchClass)).size !== 3 || notes[1] - notes[0] > 9 || notes[2] - notes[1] > 9 || notes[2] - notes[0] > 16) continue;
    let cost = notes.reduce((sum, note, index) => sum + Math.abs(note - (low + 3 + index * 5)) * 0.08, 0);
    if (previous) {
      cost += notes.reduce((sum, note, index) => sum + Math.abs(note - previous[index]) + Math.max(0, Math.abs(note - previous[index]) - 5) * 3, 0);
      cost += parallelPenalty(previous, notes);
      for (let index = 0; index < 3; index++) {
        if (pcs.has(pitchClass(previous[index])) && notes[index] !== previous[index]) cost += 2;
        if (tonic !== undefined && pitchClass(previous[index]) === pitchClass(tonic - 1) && notes[index] !== previous[index] + 1) cost += 10;
      }
    }
    if (cost < bestCost) { best = notes; bestCost = cost; }
  }
  if (!best) throw new RangeError('No three-voice chord fits the requested register');
  return best;
}

// Reconstruct the whole eight-bar phrase even for a one-bar request. This gives
// voice leading context without mutable history or dependence on request size.
export function planPhrase({ root, scene, motif }) {
  const frames = [];
  let previous;
  for (let phase = 0; phase < 8; phase++) {
    const scale = scaleForBar(scene, phase), chordDegree = PROGRESSIONS[scene][phase];
    const chordNotes = [0, 2, 4].map(offset => degreeMidi(root, scale, chordDegree + offset));
    const rootMidi = degreeMidi(root, scale, chordDegree);
    const voicing = voiceTriad(chordNotes, previous, { low: root + 7, high: root + 28, tonic: chordDegree === 0 ? root : undefined });
    const bassMidi = root + pitchClass(rootMidi - root) - 12;
    frames.push({ phase, scale, chordDegree, chordNotes, voicing, rootMidi, bassMidi,
      gain: PHRASE_GAIN[phase], ending: phase === 7, resolved: phase === 7 && chordDegree === 0,
      cadentialLead: chordDegree === 4 && PROGRESSIONS[scene][(phase + 1) % 8] === 0,
      // Repeat a two-bar idea; continuation lifts and then reduces the contour.
      targets: Array.from({ length: 4 }, (_, index) => degreeMidi(root, scale,
        7 + motif[(phase % 2) * 4 + index] + (phase === 4 || phase === 5 ? 1 : 0))) });
    previous = voicing;
  }
  return frames;
}

function nearestChordTone(frame, root, desired, previous) {
  const pcs = new Set(frame.chordNotes.map(pitchClass));
  let best, cost = Infinity;
  for (let midi = root + 12; midi <= root + 28; midi++) {
    if (!pcs.has(pitchClass(midi))) continue;
    const movement = Math.abs(midi - previous);
    const candidateCost = movement + Math.max(0, movement - 5) * 4 + Math.abs(midi - desired) * 0.7;
    if (candidateCost < cost) { best = midi; cost = candidateCost; }
  }
  return best;
}

export function melodyForBar({ frame, measure, root, rhythm, intensity }) {
  const unit = 4 / measure.denominator, beats = measure.durationTicks / PPQ;
  const anchors = [];
  let beat = 0, previous = frame.targets[0];
  for (let index = 0; index < measure.groups.length; index++) {
    const span = measure.groups[index] * unit;
    // Final bar leaves an audible breath, including in changing/short meters.
    if (frame.ending && index > 0 && beat >= beats * 0.5) break;
    let midi = nearestChordTone(frame, root, frame.targets[index % 4], previous);
    if (frame.resolved && index === 0) midi = root + 24;
    // Explicit ti -> do at the close, rather than a generic scale random walk.
    if (frame.cadentialLead && index === measure.groups.length - 1) midi = root + 23;
    anchors.push({ beat, span, midi }); previous = midi; beat += span;
  }
  const notes = [];
  for (let index = 0; index < anchors.length; index++) {
    const anchor = anchors[index], next = anchors[index + 1];
    const held = frame.ending ? Math.min(anchor.span, beats * 0.45) : anchor.span * (rhythm === 'math-rock' ? 0.48 : 0.82);
    notes.push({ beat: anchor.beat, duration: Math.max(0.05, held), midi: anchor.midi, accent: true });
    if (!next || intensity < 0.35 || anchor.span < 0.75) continue;
    const interval = next.midi - anchor.midi, direction = Math.sign(interval) || (index % 2 ? -1 : 1);
    const allowed = frame.scale.map(note => pitchClass(root + note));
    let ornament;
    // Only weak, short, stepwise ornaments that resolve at the next anchor.
    if (Math.abs(interval) >= 3 && Math.abs(interval) <= 4) {
      ornament = [anchor.midi + direction, anchor.midi + direction * 2].find(note => allowed.includes(pitchClass(note)) && Math.abs(next.midi - note) <= 2);
    } else if (interval === 0) {
      ornament = [anchor.midi + direction, anchor.midi + direction * 2].find(note => allowed.includes(pitchClass(note)));
    }
    if (ornament !== undefined && ornament >= root + 12 && ornament <= root + 28) {
      const offset = anchor.span - 0.25;
      notes[notes.length - 1].duration = Math.min(held, offset * 0.9);
      notes.push({ beat: anchor.beat + offset, duration: 0.2, midi: ornament, accent: false });
    }
  }
  return notes;
}
