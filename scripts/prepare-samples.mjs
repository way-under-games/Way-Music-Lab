// MIT: Way Music Lab contributors. Converts a pinned CC0 subset, not a general SFZ parser.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { preparePcm } from './sample-pcm.mjs';

const AUDIO_REV = '440300901dfe9275fd84e0b7763af1f8443ae62e';
const MAP_REV = '6dd651d55dde97fd4028699be9d4481f26917891';
const upstream = 'https://github.com/sgossner/VSCO-2-CE';
const root = fileURLToPath(new URL('../samples/vsco-ce/', import.meta.url));
const cache = fileURLToPath(new URL('../.cache/vsco/', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const rawUrl = (revision, path) => `https://raw.githubusercontent.com/sgossner/VSCO-2-CE/${revision}/${path.split('/').map(encodeURIComponent).join('/')}`;
async function fetchBytes(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

const recipes = [
  { map: 'ViolinEnsSusVib.sfz', track: 'strings', articulation: 'sustain', roots: [57, 66, 76, 83], lo: 55, hi: 127 },
  { map: 'ViolinEnsSpic.sfz', track: 'strings', articulation: 'short', roots: [57, 66, 76, 83], lo: 55, hi: 127 },
  { map: 'CelloEnsSusVib.sfz', track: 'strings', articulation: 'sustain', roots: [36, 50], lo: 0, hi: 54 },
  { map: 'CelloEnsSpic.sfz', track: 'strings', articulation: 'short', roots: [36, 50], lo: 0, hi: 54 },
  { map: 'Harp.sfz', track: 'harp', articulation: 'pluck', roots: [69, 76, 83, 93], lo: 0, hi: 127 },
  { map: 'FluteSusNV.sfz', track: 'woodwind', articulation: 'sustain', roots: [64, 72, 81], lo: 0, hi: 127 },
  { map: 'FluteStac.sfz', track: 'woodwind', articulation: 'short', roots: [69, 76, 84], lo: 0, hi: 127 },
  { map: 'FHornSus.sfz', track: 'horn', articulation: 'sustain', roots: [36, 46, 57, 74], lo: 0, hi: 127 },
  { map: 'FHornStac.sfz', track: 'horn', articulation: 'short', roots: [36, 46, 57, 74], lo: 0, hi: 127 }
];

await mkdir(root, { recursive: true }); await mkdir(cache, { recursive: true });
const regions = [];
for (const recipe of recipes) {
  const mapping = await fetchBytes(rawUrl(MAP_REV, recipe.map));
  await writeFile(`${root}${recipe.map}`, mapping);
  const text = mapping.toString('utf8').replace(/\/\/[^\n]*/g, '');
  const directory = text.match(/default_path=([^\r\n]+)/)[1].trim().replaceAll('\\', '/');
  const candidates = text.split('<region>').slice(1).map(block => {
    const sample = block.match(/sample=([^\r\n]+)/)?.[1].trim();
    const midi = Number(block.match(/pitch_keycenter=(\d+)/)?.[1]);
    const velocityLayer = Number(sample?.match(/_v(\d+)/)?.[1] ?? 1);
    const rr = Number(sample?.match(/_rr(\d+)/i)?.[1] ?? 1);
    const gainDb = Number(block.match(/volume=(-?[\d.]+)/)?.[1] ?? 0);
    return { sample, midi, velocityLayer, rr, gainDb };
  }).filter(region => recipe.roots.includes(region.midi) && region.sample && region.rr <= 2);
  for (const midi of recipe.roots) {
    const matching = candidates.filter(region => region.midi === midi);
    const layers = [...new Set(matching.map(region => region.velocityLayer))].sort((a, b) => a - b);
    if (!layers.length) throw new Error(`Missing root ${midi} in ${recipe.map}`);
    const chosen = [...new Set([layers[0], layers.at(-1)])];
    for (const region of matching.filter(region => chosen.includes(region.velocityLayer))) {
      const sourcePath = directory + region.sample;
      regions.push({ track: recipe.track, articulation: recipe.articulation, midi, loKey: recipe.lo, hiKey: recipe.hi,
        loVel: chosen.length === 1 || region.velocityLayer === chosen[0] ? 1 : 63,
        hiVel: chosen.length === 1 || region.velocityLayer !== chosen[0] ? 127 : 62,
        rr: region.rr, gainDb: region.gainDb, sourcePath, mapping: recipe.map,
        oneShot: recipe.articulation === 'pluck', release: recipe.articulation === 'pluck' ? 0.12 : 0.22 });
    }
  }
}
// Own GM-role mapping of recorded orchestral percussion. 42 is a short muted
// cymbal substitute, not a recording of a closed drum-kit hi-hat.
for (const [midi, prefix, layers] of [
  [36, 'Percussion/BDrumNewhit', [1, 5]],
  [38, 'Percussion/Snare2-HitSN', [1, 5]],
  [45, 'Percussion/Timpani/Timpani3_Hit', [1, 3]]
]) for (const [layerIndex, layer] of layers.entries()) for (const rr of [1, 2]) {
  regions.push({ track: 'percussion', articulation: 'hit', midi, loKey: midi, hiKey: midi,
    loVel: layerIndex ? 63 : 1, hiVel: layerIndex ? 127 : 62, rr, gainDb: 0,
    sourcePath: `${prefix}_v${layer}_rr${rr}_Sum.wav`, oneShot: true, maxTail: 1.8, release: 0.08 });
}
for (const rr of [1, 2]) regions.push({ track: 'percussion', articulation: 'hit', midi: 42, loKey: 42, hiKey: 42,
  loVel: 1, hiVel: 127, rr, gainDb: -8, sourcePath: `Percussion/susCymb1-hit_pp_rr${rr}.wav`,
  oneShot: true, maxTail: 0.14, release: 0.05 });

let next = 0, bytesTotal = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (next < regions.length) {
    const index = next++, region = regions[index], url = rawUrl(AUDIO_REV, region.sourcePath);
    const filename = `${String(index).padStart(3, '0')}-${region.track}-${region.articulation}-${region.midi}-v${region.loVel}-r${region.rr}.wav`;
    const cachePath = `${cache}${hash(url)}.wav`;
    let source;
    try { source = await readFile(cachePath); } catch { source = await fetchBytes(url); await writeFile(cachePath, source); }
    const result = preparePcm(source, { sustain: region.articulation === 'sustain' });
    await writeFile(`${root}${filename}`, result.bytes);
    Object.assign(region, { url: filename, sourceUrl: url, sourceSha256: hash(source), sha256: hash(result.bytes),
      bytes: result.bytes.length, duration: result.duration, sampleRate: result.sampleRate,
      ...(result.loop ? { loop: result.loop } : {}) });
    bytesTotal += result.bytes.length;
    console.log(`${index + 1}/${regions.length} ${region.track} ${region.articulation} ${region.midi}`);
  }
}));
for (const file of ['LICENSE', 'README.md', 'Readme.txt']) await writeFile(`${root}UPSTREAM-${file}`, await fetchBytes(rawUrl(AUDIO_REV, file)));
const manifest = { schemaVersion: 1, id: 'way-vsco-ce', name: 'VSCO CE chamber orchestra', license: 'CC0-1.0',
  gain: 6,
  source: upstream, audioRevision: AUDIO_REV, mappingRevision: MAP_REV,
  credits: ['Versilian Studios / Sam Gossner', 'Ivy Audio / Simon Dalzell', 'Elan Hickler / Soundemote (sample cutting)'],
  processing: 'Own converter: mono downmix, windowed-sinc resampling to 24 kHz 16-bit PCM; sustain recordings trimmed to three seconds and others to four seconds; manufactured crossfaded sustain loop where long enough. No peak normalization. Velocity layers reduced to two; key ranges extended to nearest selected root within instrument split. Mapping gain retained.',
  bytes: bytesTotal, regions };
await writeFile(`${root}manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ samples: regions.length, bytes: bytesTotal, manifest: `${root}manifest.json` }));
