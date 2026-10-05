export const PPQ = 480;
export const DEFAULT_METER = Object.freeze({ numerator: 4, denominator: 4, groups: Object.freeze([1, 1, 1, 1]) });
export const MATH_ROCK_METERS = Object.freeze([
  Object.freeze({ numerator: 7, denominator: 8, groups: Object.freeze([2, 2, 3]) }),
  Object.freeze({ numerator: 5, denominator: 8, groups: Object.freeze([3, 2]) }),
  DEFAULT_METER
]);

export function normalizeMeter(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('A meter needs numerator and denominator');
  const { numerator, denominator } = input;
  if (!Number.isInteger(numerator) || numerator < 1 || numerator > 16) throw new RangeError('Meter numerator must be 1–16');
  if (![2, 4, 8, 16].includes(denominator)) throw new RangeError('Meter denominator must be 2, 4, 8, or 16');
  let groups = input.groups;
  if (groups === undefined) {
    groups = [];
    if (denominator <= 4 && numerator <= 4) groups = Array(numerator).fill(1);
    else if (denominator >= 8 && numerator % 3 === 0) groups = Array(numerator / 3).fill(3);
    else {
      let remaining = numerator;
      while (remaining > 3) { groups.push(2); remaining -= 2; }
      groups.push(remaining);
    }
  }
  if (!Array.isArray(groups) || groups.length < 1 || groups.length > 16 || groups.some(group => !Number.isInteger(group) || group < 1 || group > 16) || groups.reduce((sum, group) => sum + group, 0) !== numerator) {
    throw new RangeError('Accent groups must be positive integers adding up to the numerator');
  }
  return Object.freeze({ numerator, denominator, groups: Object.freeze([...groups]) });
}

export function normalizeMeterCycle(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 32) throw new RangeError('Meter cycle must contain 1–32 bars');
  return Object.freeze(input.map(normalizeMeter));
}

// Example: 7/8:2+2+3, 5/8:3+2, 4/4. No evaluation of user code.
export function parseMeterCycle(text) {
  if (typeof text !== 'string' || !text.trim() || text.length > 1024) throw new TypeError('Enter a meter cycle such as 7/8:2+2+3, 5/8, 4/4');
  return normalizeMeterCycle(text.split(',').map(part => {
    const match = part.trim().match(/^(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*:\s*(\d{1,2}(?:\s*\+\s*\d{1,2})*))?$/);
    if (!match) throw new TypeError(`Invalid meter: ${part.trim()}`);
    return { numerator: Number(match[1]), denominator: Number(match[2]), ...(match[3] ? { groups: match[3].split('+').map(Number) } : {}) };
  }));
}

export const formatMeterCycle = cycle => cycle.map(meter => `${meter.numerator}/${meter.denominator}:${meter.groups.join('+')}`).join(', ');
export const meterTicks = meter => PPQ * 4 * meter.numerator / meter.denominator;

export function barStartTick(cycle, bar) {
  const cycleTicks = cycle.reduce((sum, meter) => sum + meterTicks(meter), 0);
  return Math.floor(bar / cycle.length) * cycleTicks + cycle.slice(0, bar % cycle.length).reduce((sum, meter) => sum + meterTicks(meter), 0);
}

export function makeBarMap(cycle, startBar, bars, startTick = barStartTick(cycle, startBar)) {
  const result = [];
  for (let bar = startBar; bar < startBar + bars; bar++) {
    const meter = cycle[bar % cycle.length], durationTicks = meterTicks(meter);
    result.push({ bar, startTick, durationTicks, numerator: meter.numerator, denominator: meter.denominator, groups: [...meter.groups] });
    startTick += durationTicks;
  }
  return result;
}

// V1 remains readable for the earlier saved scores. New scores always use V2.
export function scoreBarMap(score) {
  if (score.schemaVersion === 1) return makeBarMap([DEFAULT_METER], score.startBar, score.bars);
  return score.barMap;
}
