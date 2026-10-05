import { ScoreDirector } from '/src/director.mjs';
import { BrowserMusic } from '/src/browser-player.mjs';
const el = id => document.getElementById(id);
let director = new ScoreDirector(), music, loadPromise, timer, cueSequence = 0, epoch = 0;
const describe = profile => ({ title: 'Title · the leitmotif', contemplative: 'Opening · contemplative', playful: 'Player control · playful', danger: 'Danger · battle', revelation: 'Story · revelation', loss: 'Story · loss', resolution: 'Story · resolution' })[profile];
function host() {
  music ??= new BrowserMusic({ director, onBar: bar => {
    const plan = director.getStatus();
    el('profile').textContent = describe(plan.profile);
    el('position').textContent = `Fixed theme: ${plan.themeId} · ${bar.score.settings.key} · bar ${bar.score.startBar + 1} · ${bar.score.settings.tempo.toFixed(0)} BPM`;
    el('decision').textContent = `${plan.pending ? `Waiting for ${plan.requested} at a phrase boundary` : plan.cueId ? `Story cue ${plan.cueId}` : `Following ${plan.stage}`} · activity ${Math.round(plan.activity * 100)}% · ${bar.score.events.length} notes`;
  }});
  return music;
}
async function play() {
  const token = ++epoch;
  el('play').disabled = true;
  try {
    const player = host(); await player.context.resume();
    loadPromise ??= player.loadSampleBank('/samples/vsco-ce/manifest.json', { onProgress: p => { if (token === epoch) el('samples').textContent = `Loading recorded instruments ${p.loaded}/${p.total}`; } });
    const bank = await loadPromise;
    if (token !== epoch) return;
    el('samples').textContent = `${bank.regions.length} recordings · CC0 · same theme every game`;
    player.setVolume(Number(el('volume').value) / 100);
    await player.start();
    el('play').textContent = 'Resume score';
    el('status').textContent = 'Playing · the score follows your game';
    clearInterval(timer);
    timer = setInterval(() => {
      const s = player.getStatus();
      el('metrics').textContent = `${s.running ? 'Running' : 'Paused'} · ${s.voices} voices · ${s.sampledEvents} recorded notes · ${s.synthesizedEvents} fallback notes · ${s.droppedEvents} late notes`;
      if (!s.running) el('status').textContent = s.error ?? 'Paused · tap Resume score';
    }, 150);
  } catch (error) { if (token === epoch) { el('status').textContent = error.message; loadPromise = null; } }
  finally { if (token === epoch) el('play').disabled = false; }
}
el('play').addEventListener('click', play);
el('pause').addEventListener('click', () => { epoch++; music?.pause(); el('play').disabled = false; el('status').textContent = 'Paused · tap Resume score'; });
el('stop').addEventListener('click', () => { epoch++; music?.stop(); el('play').disabled = false; el('status').textContent = 'Stopped · game state and fixed theme retained'; });
document.querySelectorAll('[data-stage]').forEach(button => button.addEventListener('click', () => {
  director.setStage(button.dataset.stage); director.setTelemetry({ hasControl: false });
  document.querySelectorAll('[data-stage]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  el('request').textContent = `${button.dataset.stage} requested · next phrase boundary`;
}));
el('control').addEventListener('click', () => {
  director.setStage('play'); director.setTelemetry({ hasControl: true });
  document.querySelectorAll('[data-stage]').forEach(button => button.setAttribute('aria-pressed', 'false'));
  el('request').textContent = 'Player control granted · playful score at the next phrase boundary';
});
el('reset').addEventListener('click', async () => {
  epoch++; clearInterval(timer); el('play').disabled = true; await music?.dispose(); music = null; loadPromise = null;
  director = new ScoreDirector();
  el('position').textContent = `Fixed theme: ${director.theme.id} · ${director.theme.key} · 0–2–4–3 / 2–0–1–0`;
  for (const id of ['movement', 'danger']) { el(id).value = '0'; el(`${id}-value`).textContent = '0%'; }
  el('request').textContent = 'New game · same authored theme and motif'; el('status').textContent = 'Title · ready to introduce the same theme'; el('profile').textContent = 'Title'; el('play').textContent = 'Play title theme';
  el('decision').textContent = 'Waiting for the first downbeat.'; el('metrics').textContent = 'No audio started'; el('samples').textContent = 'Recorded CC0 orchestra · loads on Play';
  el('play').disabled = false;
  document.querySelectorAll('[data-stage]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.stage === 'title')));
});
for (const key of ['movement', 'danger']) el(key).addEventListener('input', () => { const value = Number(el(key).value); el(`${key}-value`).textContent = `${value}%`; director.setTelemetry({ [key]: value / 100 }); });
el('volume').addEventListener('input', () => { const value = Number(el('volume').value); el('volume-value').textContent = `${value}%`; music?.setVolume(value / 100); });
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => { director.action(button.dataset.action); el('request').textContent = `${button.dataset.action} · shaping the next bar's activity`; }));
document.querySelectorAll('[data-cue]').forEach(button => button.addEventListener('click', () => {
  const kind = button.dataset.cue, id = `${kind}-${++cueSequence}`;
  director.cue({ id, kind, bars: 4 }); el('request').textContent = `${kind} requested · four-bar story cue, then return to game state`;
}));
window.addEventListener('pagehide', () => { epoch++; clearInterval(timer); music?.dispose(); });
