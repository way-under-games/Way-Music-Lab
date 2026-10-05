import { TRACKS, validateScore } from './composer.mjs';
import { scoreBarMap } from './meter.mjs';

const bytes = text => [...new TextEncoder().encode(text)];
const u32 = value => [value >>> 24 & 255, value >>> 16 & 255, value >>> 8 & 255, value & 255];
const u16 = value => [value >>> 8 & 255, value & 255];
function vlq(value) {
  const result = [value & 127];
  while ((value >>>= 7)) result.unshift((value & 127) | 128);
  return result;
}
function chunk(type, data) { return [...bytes(type), ...u32(data.length), ...data]; }
function trackChunk(events, endTick) {
  events.sort((a, b) => a.tick - b.tick || a.order - b.order);
  let previous = 0;
  const data = [];
  for (const event of events) {
    data.push(...vlq(event.tick - previous), ...event.data);
    previous = event.tick;
  }
  data.push(...vlq(endTick - previous), 0xff, 0x2f, 0);
  return chunk('MTrk', data);
}

// Standard MIDI File type 1. Channel and program values are zero-based.
export function exportMidi(score) {
  validateScore(score);
  const tempo = Math.round(60_000_000 / score.settings.tempo);
  const map = scoreBarMap(score), offset = map[0].startTick;
  const endTick = map.at(-1).startTick + map.at(-1).durationTicks - offset;
  const conductorEvents = [{ tick: 0, order: 0, data: [0xff, 0x51, 3, tempo >>> 16 & 255, tempo >>> 8 & 255, tempo & 255] }];
  let previous = '';
  for (const bar of map) {
    const signature = `${bar.numerator}/${bar.denominator}`;
    if (signature !== previous) conductorEvents.push({ tick: bar.startTick - offset, order: 1, data: [0xff, 0x58, 4, bar.numerator, Math.log2(bar.denominator), 24, 8] });
    const label = bytes(`${signature} (${bar.groups.join('+')})`);
    conductorEvents.push({ tick: bar.startTick - offset, order: 2, data: [0xff, 6, ...vlq(label.length), ...label] });
    previous = signature;
  }
  const conductor = trackChunk(conductorEvents, endTick);
  const chunks = [conductor];
  for (const track of TRACKS) {
    const name = bytes(track.name);
    const events = [{ tick: 0, order: -2, data: [0xff, 3, ...vlq(name.length), ...name] }];
    if (track.program !== null) events.push({ tick: 0, order: -1, data: [0xc0 | track.channel, track.program] });
    for (const event of score.events.filter(e => e.track === track.id)) {
      events.push({ tick: event.startTick - offset, order: 1, data: [0x90 | track.channel, event.midi, event.velocity] });
      events.push({ tick: event.startTick + event.durationTicks - offset, order: 0, data: [0x80 | track.channel, event.midi, 0] });
    }
    chunks.push(trackChunk(events, endTick));
  }
  const header = chunk('MThd', [...u16(1), ...u16(chunks.length), ...u16(score.ppq)]);
  return new Uint8Array([...header, ...chunks.flat()]);
}
