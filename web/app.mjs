import { compose, normalizeSettings, TRACKS, DEFAULTS, PPQ } from '/src/composer.mjs';
import { MATH_ROCK_METERS, parseMeterCycle, formatMeterCycle } from '/src/meter.mjs';
import { exportMidi } from '/src/midi.mjs';
import { MusicTransport } from '/src/transport.mjs';
import { WebAudioRenderer, renderWav } from '/src/webaudio.mjs';

const element = id => document.getElementById(id);
const noteName = midi => `${['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][midi % 12]}${Math.floor(midi / 12) - 1}`;
let settings = normalizeSettings(DEFAULTS), context, renderer, transport, timer, resumeBar = 0, hiddenPause = false;
let resumeTick;
let sampleBank, bankPromise, playEpoch = 0;
let barHistory = [], shownBar = null, lastStep = -1, themeCounter = 0;
const rows = new Map();
const trackRows = new Map();
for (const track of TRACKS) {
  const row = document.createElement('div'); row.className = 'track';
  const toggle = document.createElement('button'); toggle.textContent = `${track.name} ●`; toggle.setAttribute('aria-label', `Mute ${track.name}`); toggle.setAttribute('aria-pressed', 'true');
  toggle.addEventListener('click', () => {
    const muted = new Set(settings.muted);
    if (muted.has(track.id)) muted.delete(track.id); else muted.add(track.id);
    toggle.setAttribute('aria-pressed', String(!muted.has(track.id)));
    update({ muted: [...muted] });
  });
  row.append(toggle);
  const cells = Array.from({ length: 16 }, () => { const cell = document.createElement('div'); cell.className = 'step'; row.append(cell); return cell; });
  element('tracker').append(row); rows.set(track.id, cells);
  trackRows.set(track.id, row);
}

function displayScore(score) {
  const measure = score.barMap[0], offset = measure.startTick;
  const stepCount = measure.durationTicks / (PPQ / 4);
  const accents = new Set(); let accentTick = 0;
  for (const group of measure.groups) { accents.add(accentTick / (PPQ / 4)); accentTick += group * PPQ * 4 / measure.denominator; }
  for (const [track, row] of trackRows) {
    if (rows.get(track).length !== stepCount) {
      row.querySelectorAll('.step').forEach(cell => cell.remove());
      rows.set(track, Array.from({ length: stepCount }, () => { const cell = document.createElement('div'); cell.className = 'step'; row.append(cell); return cell; }));
    }
    row.style.gridTemplateColumns = `110px repeat(${stepCount}, minmax(12px,1fr))`;
    row.style.minWidth = `${110 + stepCount * 17}px`;
  }
  for (const [track, cells] of rows) cells.forEach((cell, step) => {
    const notes = score.events.filter(event => event.track === track && Math.floor((event.startTick - offset) / (PPQ / 4)) === step);
    cell.className = notes.length ? 'step note' : 'step';
    cell.classList.toggle('group-start', accents.has(step));
    cell.replaceChildren();
    if (notes.length) { const label = document.createElement('span'); label.textContent = noteName(notes[0].midi); cell.append(label); }
    cell.title = notes.length ? notes.map(note => noteName(note.midi)).join(' / ') : 'Rest';
  });
  const signature = `${measure.numerator}/${measure.denominator}`;
  element('bar-label').textContent = `BAR ${String(score.startBar + 1).padStart(3, '0')} · ${signature}`;
  element('meter-now').textContent = `${signature} · ${measure.groups.join('+')}`;
  element('harmony').textContent = `HARMONY · ${score.harmony[0].notes.map(noteName).join(' – ')}`;
  element('position').textContent = `${score.settings.key} ${score.settings.scene === 'victory' ? 'major' : 'minor'} · ${signature} · ♩ = ${score.settings.tempo} BPM`;
  lastStep = -1;
}

function update(patch) {
  try {
    settings = normalizeSettings({ ...settings, ...patch });
    if (transport) {
      const change = transport.setState(patch);
      if (transport.running) element('status').textContent = `Playing · change at bar ${change.effectiveBar + 1}`;
    }
    if (!transport?.running) displayScore(compose({ ...settings, bars: 1, startBar: resumeBar, startTick: resumeTick }));
  } catch (error) { element('status').textContent = error.message; }
}

function initializeAudio() {
    if (!context) {
      context = new AudioContext({ latencyHint: 'interactive' });
      renderer = new WebAudioRenderer(context);
      transport = new MusicTransport(renderer, { settings, onBar: bar => { barHistory.push(bar); barHistory = barHistory.slice(-3); } });
      context.addEventListener('statechange', () => {
        if (context.state !== 'running' && transport.running) pause('Audio paused · tap Resume');
      });
    }
}
async function ensureBank() {
  initializeAudio();
  if (element('sound-source').value === 'synth') { renderer.setSampleBank(null); return null; }
  if (!sampleBank) {
    element('sample-status').textContent = 'Loading recorded instruments…';
    bankPromise ??= renderer.loadSampleBank('/samples/vsco-ce/manifest.json', { onProgress: progress => {
      element('sample-status').textContent = `Loading instruments · ${progress.loaded}/${progress.total}`;
    }}).then(bank => { sampleBank = bank; return bank; }).finally(() => { bankPromise = null; });
    await bankPromise;
  }
  renderer.setSampleBank(element('sound-source').value === 'sampled' ? sampleBank : null);
  element('sample-status').textContent = renderer.sampleBank ? `${sampleBank.regions.length} recordings · ${(sampleBank.decodedBytes / 1048576).toFixed(1)} MB decoded · CC0` : 'Synthesized sketch · recorded bank bypassed.';
  return renderer.sampleBank;
}
async function play() {
  element('play').disabled = true;
  const epoch = ++playEpoch;
  try {
    initializeAudio(); await context.resume(); await ensureBank();
    if (playEpoch !== epoch) return;
    renderer.setVolume(Number(element('volume').value) / 100);
    transport.setState(settings); transport.start({ bar: resumeBar, startTick: resumeTick });
    clearInterval(timer);
    timer = setInterval(() => {
      try { transport.tick(); } catch (error) { stop(); element('status').textContent = error.message; }
    }, 25);
    element('status').textContent = 'Playing · evolving in real time';
    element('dot').classList.add('active'); element('stop').disabled = false;
    element('play').textContent = 'Pause';
  } catch (error) { element('status').textContent = `Could not start audio: ${error.message}`; }
  finally { element('play').disabled = false; }
}

function pause(message = 'Paused · resume this bar') {
  playEpoch++;
  if (!transport) return;
  // Use the audible bar rather than a bar prepared ahead of the playhead.
  const audible = barHistory.find(bar => context.currentTime >= bar.startTime && context.currentTime < bar.endTime);
  resumeBar = audible?.score.startBar ?? transport.pause();
  resumeTick = audible?.score.startTick ?? transport.nextTick;
  transport.stop(); clearInterval(timer); barHistory = []; shownBar = null;
  element('status').textContent = message; element('play').textContent = 'Resume'; element('dot').classList.remove('active');
  element('health').textContent = `0 voices · paused · ${transport.droppedEvents} late notes · ${transport.resyncs} clock recoveries`;
}

function stop() {
  playEpoch++;
  transport?.stop(); clearInterval(timer); resumeBar = 0; resumeTick = undefined; barHistory = []; shownBar = null;
  element('play').textContent = 'Play score ↗'; element('stop').disabled = true;
  element('status').textContent = 'Stopped · ready for a new performance'; element('dot').classList.remove('active');
  element('health').textContent = 'Waiting for the first downbeat'; displayScore(compose({ ...settings, bars: 1 }));
}

element('play').addEventListener('click', () => transport?.running ? pause() : play());
element('stop').addEventListener('click', stop);
element('sound-source').addEventListener('change', () => {
  playEpoch++;
  if (transport?.running) pause('Sound changed · tap Resume');
  renderer?.setSampleBank(element('sound-source').value === 'sampled' ? sampleBank ?? null : null);
  element('sample-status').textContent = element('sound-source').value === 'sampled' ? 'CC0 recorded orchestra · ready to load or resume.' : 'Synthesized sketch · recorded bank bypassed.';
});
document.querySelectorAll('[data-scene]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-scene]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  update({ scene: button.dataset.scene });
}));
element('intensity').addEventListener('input', event => { element('energy-value').textContent = `${event.target.value}%`; update({ intensity: Number(event.target.value) / 100 }); });
element('tempo').addEventListener('input', event => { element('tempo-value').textContent = `${event.target.value} BPM`; update({ tempo: Number(event.target.value) }); });
element('volume').addEventListener('input', event => { element('volume-value').textContent = `${event.target.value}%`; renderer?.setVolume(Number(event.target.value) / 100); });
element('seed').addEventListener('change', event => update({ seed: event.target.value }));
element('key').addEventListener('change', event => update({ key: event.target.value }));
element('new-theme').addEventListener('click', () => { element('seed').value = `astral-${++themeCounter}-${Date.now().toString(36)}`; update({ seed: element('seed').value }); });

function applyMeters(meterCycle, rhythm = settings.rhythm) {
  update({ meterCycle, rhythm });
  element('meter-cycle').value = formatMeterCycle(settings.meterCycle);
  element('rhythm').value = settings.rhythm;
  element('meter-feedback').textContent = `${settings.meterCycle.map(meter => `${meter.numerator}/${meter.denominator}`).join(' → ')} · ${transport?.running ? 'pending next bar' : 'ready'} · quarter-note tempo`;
}
element('meter-preset').addEventListener('change', event => {
  const preset = event.target.value;
  if (preset === 'custom') { element('meter-cycle').focus(); return; }
  const text = { '4/4': '4/4:1+1+1+1', '7/8': '7/8:2+2+3', '5/4': '5/4:3+2', shifting: '7/8:2+2+3,9/8:3+3+3,11/8:3+3+3+2' }[preset];
  applyMeters(preset === 'math-rock' ? MATH_ROCK_METERS : parseMeterCycle(text), preset === 'math-rock' ? 'math-rock' : settings.rhythm);
});
element('rhythm').addEventListener('change', event => update({ rhythm: event.target.value }));
element('apply-meter').addEventListener('click', () => {
  try { applyMeters(parseMeterCycle(element('meter-cycle').value)); element('meter-preset').value = 'custom'; }
  catch (error) { element('meter-feedback').textContent = error.message; }
});

function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
element('json').addEventListener('click', () => { download('way-score.json', JSON.stringify(compose({ ...settings, bars: 8 }), null, 2), 'application/json'); element('export-status').textContent = 'Eight-bar score exported.'; });
element('midi').addEventListener('click', () => { download('way-score.mid', exportMidi(compose({ ...settings, bars: 8 })), 'audio/midi'); element('export-status').textContent = 'Eight-bar MIDI exported · five instrument tracks.'; });
element('wav').addEventListener('click', async () => {
  element('wav').disabled = true; element('export-status').textContent = 'Rendering eight bars…';
  try {
    const bank = await ensureBank();
    const result = await renderWav(compose({ ...settings, bars: 8 }), { sampleBank: bank });
    const saved = await fetch('/api/v1/renders/wav', { method: 'POST', headers: { 'Content-Type': 'audio/wav' }, body: result.bytes });
    if (!saved.ok) throw new Error('Audio rendered, but the local export could not be saved');
    const artifact = await saved.json();
    element('export-status').textContent = `WAV ready · ${bank ? 'recorded orchestra' : 'synth sketch'} · ${result.sampledEvents} sampled / ${result.synthesizedEvents} synthesized notes · ${result.duration.toFixed(1)} s · peak ${result.peak.toFixed(3)} · RMS ${result.rms.toFixed(3)} · ${result.clipped} clipped samples · `;
    const link = document.createElement('a'); link.href = artifact.url; link.download = artifact.filename; link.textContent = 'Open saved WAV';
    element('export-status').append(link);
  } catch (error) { element('export-status').textContent = error.message; }
  finally { element('wav').disabled = false; }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && transport?.running) { hiddenPause = true; pause('Paused while away · tap Resume'); }
  else if (!document.hidden && hiddenPause) { hiddenPause = false; element('status').textContent = 'Welcome back · tap Resume'; }
});
window.addEventListener('pagehide', () => { transport?.stop(); clearInterval(timer); renderer?.dispose(); context?.close(); });

function animate() {
  if (transport?.running && context.state === 'running') {
    const now = context.currentTime;
    const playing = barHistory.find(bar => now >= bar.startTime && now < bar.endTime);
    if (playing) {
      if (shownBar !== playing.score.startBar) { displayScore(playing.score); shownBar = playing.score.startBar; }
      const stepCount = playing.score.durationTicks / (PPQ / 4);
      const step = Math.min(stepCount - 1, Math.floor((now - playing.startTime) / (playing.endTime - playing.startTime) * stepCount));
      if (step !== lastStep) { for (const cells of rows.values()) cells.forEach((cell, index) => cell.classList.toggle('playhead', index === step)); lastStep = step; }
      element('health').textContent = `${renderer.voices.size} voices · ${transport.droppedEvents} late notes · ${transport.resyncs} clock recoveries`;
    }
  }
  requestAnimationFrame(animate);
}
displayScore(compose({ ...settings, bars: 1 })); animate();
