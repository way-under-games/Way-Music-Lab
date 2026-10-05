import { readFile } from 'node:fs/promises';

try {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: node scripts/inspect-wav.mjs FILE.wav');
  const bytes = await readFile(file);
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Not a WAV file');
  let offset = 12, format, pcm;
  while (offset + 8 <= bytes.length) {
    const kind = bytes.toString('ascii', offset, offset + 4), length = bytes.readUInt32LE(offset + 4), start = offset + 8;
    if (start + length > bytes.length) throw new Error('Truncated WAV chunk');
    if (kind === 'fmt ') {
      if (length < 16) throw new Error('Truncated WAV format');
      format = { encoding: bytes.readUInt16LE(start), channels: bytes.readUInt16LE(start + 2), sampleRate: bytes.readUInt32LE(start + 4), bits: bytes.readUInt16LE(start + 14) };
    }
    if (kind === 'data') pcm = bytes.subarray(start, start + length);
    offset = start + length + (length % 2);
  }
  if (!format || !pcm || format.encoding !== 1 || format.bits !== 16 || format.channels !== 2 || pcm.length % 4) throw new Error('Expected stereo 16-bit PCM');
  let peak = 0, sum = 0, clipped = 0;
  for (let offset = 0; offset < pcm.length; offset += 2) {
    const raw = pcm.readInt16LE(offset), value = raw / (raw < 0 ? 32768 : 32767);
    peak = Math.max(peak, Math.abs(value)); sum += value * value;
    if (raw === -32768 || raw === 32767) clipped++;
  }
  console.log(JSON.stringify({ file, ...format, duration: pcm.length / (format.sampleRate * format.channels * 2), peak, rms: Math.sqrt(sum / (pcm.length / 2)), clipped }, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
