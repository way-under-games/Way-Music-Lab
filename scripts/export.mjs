import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compose } from '../src/composer.mjs';
import { exportMidi } from '../src/midi.mjs';

try {
  const input = process.argv[2] ? JSON.parse(await readFile(process.argv[2], 'utf8')) : {};
  const score = compose(input);
  const directory = path.resolve(process.argv[3] ?? fileURLToPath(new URL('../artifacts', import.meta.url)));
  await mkdir(directory, { recursive: true });
  const name = `score-${randomUUID()}`;
  const json = path.join(directory, `${name}.json`), midi = path.join(directory, `${name}.mid`);
  await writeFile(json, JSON.stringify(score, null, 2), { flag: 'wx' });
  await writeFile(midi, exportMidi(score), { flag: 'wx' });
  console.log(JSON.stringify({ json, midi, bars: score.bars, notes: score.events.length }, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
