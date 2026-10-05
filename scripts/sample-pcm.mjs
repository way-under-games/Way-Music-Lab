// Original bounded PCM converter. Node-only build tooling; no runtime dependency.
export function preparePcm(bytes, { sustain = false, sampleRate = 24000 } = {}) {
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') throw new TypeError('Not a RIFF WAV');
  let format, pcm;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const id = bytes.toString('ascii', offset, offset + 4), length = bytes.readUInt32LE(offset + 4);
    if (offset + 8 + length > bytes.length) throw new TypeError('Truncated WAV');
    if (id === 'fmt ') format = { encoding: bytes.readUInt16LE(offset + 8), channels: bytes.readUInt16LE(offset + 10),
      rate: bytes.readUInt32LE(offset + 12), alignment: bytes.readUInt16LE(offset + 20), bits: bytes.readUInt16LE(offset + 22) };
    if (id === 'data') pcm = bytes.subarray(offset + 8, offset + 8 + length);
    offset += 8 + length + length % 2;
  }
  if (!format || !pcm || ![1, 3].includes(format.encoding) || ![1, 2].includes(format.channels) ||
    ![16, 24, 32].includes(format.bits) || format.encoding === 3 && format.bits !== 32 ||
    format.alignment !== format.channels * format.bits / 8 || format.rate < 8000 || format.rate > 192000) throw new TypeError('Unsupported PCM format');
  const frames = Math.floor(pcm.length / format.alignment), input = new Float32Array(frames);
  for (let frame = 0; frame < frames; frame++) for (let channel = 0; channel < format.channels; channel++) {
    const offset = frame * format.alignment + channel * format.bits / 8;
    const value = format.encoding === 3 ? pcm.readFloatLE(offset) : pcm.readIntLE(offset, format.bits / 8) / 2 ** (format.bits - 1);
    if (!Number.isFinite(value)) throw new TypeError('Nonfinite PCM sample');
    input[frame] += value / format.channels;
  }
  const length = Math.min(sampleRate * (sustain ? 3 : 4), Math.floor(frames * sampleRate / format.rate));
  const output = new Float32Array(length), ratio = format.rate / sampleRate;
  // Low-pass windowed sinc avoids aliasing when reducing the sample rate.
  const cutoff = Math.min(1, sampleRate / format.rate) * 0.94, radius = 16;
  for (let frame = 0; frame < length; frame++) {
    const position = frame * ratio, center = Math.floor(position); let sum = 0, weight = 0;
    for (let index = center - radius + 1; index <= center + radius; index++) {
      if (index < 0 || index >= frames) continue;
      const distance = position - index, x = Math.PI * distance * cutoff;
      const tap = (Math.abs(x) < 1e-8 ? 1 : Math.sin(x) / x) * (0.5 + 0.5 * Math.cos(Math.PI * distance / radius)) * cutoff;
      sum += input[index] * tap; weight += tap;
    }
    output[frame] = weight ? sum / weight : 0;
  }
  let loop;
  if (sustain && length > sampleRate * 2.2) {
    const start = Math.round(sampleRate * 0.7), end = Math.min(Math.round(sampleRate * 2.1), length - Math.round(sampleRate * 0.3));
    const fade = Math.round(sampleRate * 0.08);
    for (let index = 0; index < fade; index++) {
      const mix = index / (fade - 1);
      output[end - fade + index] = output[end - fade + index] * (1 - mix) + output[start + index] * mix;
    }
    loop = { start: (start + fade) / sampleRate, end: end / sampleRate };
  }
  // Remove clicks at recording endpoints, preserving the recorded attack.
  const edge = Math.min(120, length);
  for (let index = 0; index < edge; index++) { output[index] *= index / edge; output[length - 1 - index] *= index / edge; }
  const wav = Buffer.alloc(44 + length * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(length * 2, 40);
  for (let index = 0; index < length; index++) wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, output[index])) * 32767), 44 + index * 2);
  return { bytes: wav, sampleRate, duration: length / sampleRate, loop };
}
