// Portable region selection plus a browser-owned decoder. Original MIT code.
const TRACKS = ['strings', 'harp', 'woodwind', 'horn', 'percussion'];
const integer = (value, low, high) => Number.isInteger(value) && value >= low && value <= high;
export function validateSampleManifest(manifest) {
  if (!manifest || manifest.schemaVersion !== 1 || typeof manifest.id !== 'string' || !Array.isArray(manifest.regions) || !manifest.regions.length || manifest.regions.length > 256) throw new TypeError('Unsupported sample manifest');
  if (manifest.gain !== undefined && (!Number.isFinite(manifest.gain) || manifest.gain <= 0 || manifest.gain > 16)) throw new TypeError('Invalid sample bank gain');
  for (const region of manifest.regions) {
    if (!TRACKS.includes(region.track) || !['sustain', 'short', 'pluck', 'hit'].includes(region.articulation) ||
      !integer(region.midi, 0, 127) || !integer(region.loKey, 0, 127) || !integer(region.hiKey, region.loKey, 127) ||
      !integer(region.loVel, 1, 127) || !integer(region.hiVel, region.loVel, 127) || !integer(region.rr, 1, 8) ||
      !Number.isFinite(region.gainDb) || region.gainDb < -40 || region.gainDb > 30 ||
      !Number.isFinite(region.release) || region.release < 0 || region.release > 2 ||
      typeof region.url !== 'string' || !/^[a-zA-Z0-9_./-]+\.wav$/.test(region.url) || region.url.startsWith('/') || region.url.split('/').includes('..') ||
      typeof region.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(region.sha256) ||
      !Number.isFinite(region.duration) || region.duration <= 0 || region.duration > 15 ||
      region.oneShot !== undefined && typeof region.oneShot !== 'boolean' ||
      region.maxTail !== undefined && (!Number.isFinite(region.maxTail) || region.maxTail <= 0 || region.maxTail > 4) ||
      region.loop && (!Number.isFinite(region.loop.start) || !Number.isFinite(region.loop.end) || region.loop.start < 0 || region.loop.end <= region.loop.start || region.loop.end > region.duration)) throw new TypeError('Invalid sample region');
  }
  return manifest;
}

export function selectSample(regions, event, duration) {
  const desired = event.track === 'harp' ? 'pluck' : event.track === 'percussion' ? 'hit' : duration <= 0.32 ? 'short' : 'sustain';
  let candidates = regions.filter(region => region.track === event.track && event.midi >= region.loKey && event.midi <= region.hiKey && event.velocity >= region.loVel && event.velocity <= region.hiVel);
  const articulated = candidates.filter(region => region.articulation === desired);
  if (articulated.length) candidates = articulated;
  if (!candidates.length) return null; // Percussion must never borrow the wrong drum.
  const nearest = Math.min(...candidates.map(region => Math.abs(region.midi - event.midi)));
  candidates = candidates.filter(region => Math.abs(region.midi - event.midi) === nearest).sort((a, b) => a.rr - b.rr || a.url.localeCompare(b.url));
  // Take selection is keyed to the event, not mutable playback history, so seeking
  // and offline export use the same take for a given event. This is randomized
  // alternate-take selection, not a sequential round-robin counter.
  let hash = 2166136261;
  for (const char of event.id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return candidates[hash % candidates.length];
}

export async function loadSampleBank(context, manifestUrl, { onProgress = () => {}, fetchImpl = fetch, maxEncodedBytes = 32 * 1024 * 1024, maxDecodedBytes = 128 * 1024 * 1024 } = {}) {
  const base = new URL(manifestUrl, globalThis.location?.href ?? 'http://localhost/');
  const response = await fetchImpl(base);
  if (!response.ok) throw new Error(`Sample manifest unavailable: ${response.status}`);
  const manifest = validateSampleManifest(await response.json());
  let next = 0, completed = 0, encodedBytes = 0, decodedBytes = 0, failure;
  const regions = new Array(manifest.regions.length);
  // Return a complete bank atomically; a failed decode must not replace live data.
  await Promise.allSettled(Array.from({ length: 4 }, async () => {
    try {
    while (!failure && next < manifest.regions.length) {
      const index = next++, region = manifest.regions[index];
      const fetched = await fetchImpl(new URL(region.url, base));
      if (!fetched.ok) throw new Error(`Sample unavailable: ${region.url}`);
      const bytes = await fetched.arrayBuffer();
      encodedBytes += bytes.byteLength;
      if (encodedBytes > maxEncodedBytes) throw new RangeError('Sample bank exceeds encoded memory budget');
      const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
      const actual = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
      if (actual !== region.sha256) throw new Error(`Sample integrity mismatch: ${region.url}`);
      const buffer = await context.decodeAudioData(bytes);
      if (failure) return;
      decodedBytes += buffer.length * buffer.numberOfChannels * 4;
      if (decodedBytes > maxDecodedBytes) throw new RangeError('Sample bank exceeds decoded memory budget');
      if (region.loop && region.loop.end > buffer.duration + 0.001) throw new TypeError('Loop exceeds decoded sample');
      regions[index] = { ...region, buffer };
      onProgress({ loaded: ++completed, total: regions.length, encodedBytes, decodedBytes });
    }
    } catch (error) { failure ??= error; }
  }));
  if (failure) throw failure;
  return { manifest, regions, encodedBytes, decodedBytes };
}
