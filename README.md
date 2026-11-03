# Way Music

Version **0.6** revamps Way into an **authored music studio** with Perform, Sound, and Game workspaces. Play a customizable computer/MIDI keyboard, record melodies and countermelodies, edit the piano roll, design harmonic/wavetable instruments or choose recorded orchestral sounds per part, save patches and variations, and map gameplay to approved sound and arrangement controls. Projects start with empty musical parts; procedural sound design never replaces your hooks. Read the [studio guide and game-host API](docs/authoring-studio.md).

The earlier procedural score generator and recorded-orchestra auditions remain available. Version **0.4** uses **recorded orchestral instruments** with variable meters, a syncopated math-rock rhythmic preset, and a theory-based phrase planner: violin/cello ensemble, harp, flute, French horn, and percussion. The composer and score contract are portable; audio adapters currently target browsers. A native Unreal plugin remains future work.

Version **0.5** adds a portable **narrative score director**: one authored theme for the title, a contemplative opening, playful player control, smoothed movement/action responses, danger hysteresis, and timed story cues. Open [the story-score audition](http://127.0.0.1:4317/web/director.html) after starting the server, or read [the narrative scoring design](docs/narrative-scoring.md).

The next phase studies composition with the tools already available. Read [memorable game scores and composition research](docs/memorable-game-scores.md) for twelve comparative cases, source limits, variable-meter exercises, current musical gaps, and a listening study plan.

The [visual instrument and keyboard authoring study](docs/visual-instruments-and-keyboard-authoring.md) records the research behind this workflow. Version 0.6 implements its initial authoring path; broader sample conversion, granular synthesis, richer FM, and a shared native DSP backend remain future work.

Original software: **MIT**. Bundled VSCO CE recordings: **CC0 1.0**. The theory research document is separately **CC BY-SA 4.0**. Read [attributions and source revisions](ATTRIBUTIONS.md), [license analysis](LICENSE-ANALYSIS.md), and [MIT license](LICENSE) before redistributing. No npm packages or cloud services are required.

## Run

Requires Node.js 22 or newer. No package installation is needed.

```powershell
git clone https://github.com/way-under-games/Way-Music-Lab.git
cd Way-Music-Lab
node server.mjs
```

Open [the authoring studio](http://127.0.0.1:4317). Enable audio, play keys or draw notes, and record/keep a take. Perform edits authored parts, Sound edits instruments, and Game auditions scene arrangements and mappings. Use Export project for a durable copy of all parts and patches. See the [studio guide](docs/authoring-studio.md) for keyboard controls, recording, limits, exports, and integration.

The remainder of the score-generation instructions below describes the [legacy procedural lab](http://127.0.0.1:4317/web/index.html). There, click Play to unlock audio, choose Explore/Tension/Battle/Victory, and change energy, tempo, key, theme seed, and muted sections. State changes land on the next uncommitted bar.

The page pauses when hidden or when the audio device suspends. Resume starts the paused bar again; it does not restore sounding voices halfway through a bar. Stop cancels voices and room tails and returns to bar zero. Exports generate eight bars from bar zero with the selected settings, rather than recording live state-change history. WAV uses the selected sound and the same loaded bank at 24 kHz stereo, adds a four-second release/room tail, and uses a fixed renderer volume independent of the live listening-level control.

The demo saves rendered WAVs without overwriting under `artifacts` and shows an “Open saved WAV” link. Standalone games can use `renderWav` directly and own their export destination.

## Recorded orchestra

The default sound loads 95 local CC0 VSCO CE recordings on Play or Render WAV. Two recorded velocity layers, nearby pitch roots, deterministic alternate takes, short/sustain articulation selection, looped sustains, natural percussion/pluck tails, track balance and a restrained shared room replace the earlier oscillator-only sketch. A synthesized sketch remains selectable for comparison and custom-bank fallback.

The bank is about 9.7 MB on disk; decoded memory is device-rate dependent (36.9 MB observed at 24 kHz; roughly twice that at 48 kHz). The loader verifies SHA-256 hashes and limits encoded/decoded memory to 32/128 MiB by default. This compact bank uses pitch shifting and manufactured loops; it does not provide legato transitions, release recordings, continuous orchestral dynamics or every articulation. MIDI note 42 uses a short cymbal substitute, not an actual hi-hat.

Live playback and WAV export use the same event-to-sample/take selection. An offline export is not guaranteed bit-identical to a live device at a different sample rate. [Hear the recorded math-rock example](examples/recorded-math-rock.wav) and inspect [measured checks](VERIFICATION.md).

To rebuild the subset from pinned upstream revisions, run `node scripts/prepare-samples.mjs` (network required). Recordings, source/derivative hashes, original maps and notices are included under `samples/vsco-ce`; normal playback needs no download from a third-party service. The preparation script is specific to this bank, not a general SFZ interpreter.

## Variable time signatures

Choose the Math rock meter plan for a repeating **7/8 → 5/8 → 4/4** cycle with additive accents **2+2+3**, **3+2**, and quarter-note beats. The separate rhythmic-feel control enables syncopated short attacks and tapped subdivisions using the existing orchestral instruments. Other presets include 5/4 and 7/8 → 9/8 → 11/8.

Enter a custom cycle such as `7/8:2+2+3, 11/8:3+3+3+2, 4/4`. Commas separate bars; the optional colon gives accent groups that must sum to the numerator. Supported numerators are 1–16, denominators are 2/4/8/16, and cycles contain up to 32 bars. Tempo always counts quarter notes. Live meter changes commit at the next uncommitted bar; the tracker resizes to that bar, and MIDI includes time-signature changes and grouping markers.

```javascript
music.setState({
  rhythm: 'math-rock',
  meterCycle: [
    { numerator: 7, denominator: 8, groups: [2, 2, 3] },
    { numerator: 5, denominator: 8, groups: [3, 2] },
    { numerator: 4, denominator: 4, groups: [1, 1, 1, 1] }
  ]
});
```

Use `WAY_MUSIC_PORT` to change the local port. The server binds to loopback only and is a local development adapter, not an internet service.

## Composition and sound quality

The portable theory layer chooses bounded chord inversions with less voice movement, repeats and develops motif contours, emphasizes chord-tone melodic anchors, adds short stepwise ornaments, shapes phrase dynamics, and leaves space at endings. Minor-key V chords use the raised seventh; Explore/Battle resolve to tonic while Tension ends on dominant. These are tonal style heuristics rather than a universal musical scoring system. See [the source-linked theory and sound study](docs/music-theory-and-sound.md) for algorithms, listening criteria, and further development.

Generator 0.5.0 adds authored motif and arrangement settings while preserving score schema version 2. Earlier saved scores remain playable. Theme replay must retain generator version or the actual score. The director adds narrative policy and phrase-boundary changes; harmonic transition bridges and cross-bar melodic continuity still need further development.

## Browser game API

Copy/serve the `src` directory with your game, plus `samples/vsco-ce` and its notices if using the recorded bank. It does not need this demo server or a specific framework. The convenience player owns browser audio and timer lifecycle:

The [browser game API example](http://127.0.0.1:4317/web/integration.html) is a minimal working host using that public API.

```javascript
import { BrowserMusic } from './way-music/src/browser-player.mjs';

const music = new BrowserMusic({
  settings: { seed: 'my-game-theme', key: 'D', tempo: 92, scene: 'explore' },
  volume: 0.5
});

// A real player gesture is required to unlock audio.
startButton.addEventListener('click', () => music.start());

function onGameStateChanged(state) {
  music.setState({ scene: state.inCombat ? 'battle' : 'explore', intensity: state.threat });
}

// Preload the bank before the player's Start gesture when possible.
// await music.loadSampleBank('/samples/vsco-ce/manifest.json');
// Optional simpler samples you own or have licensed; nearest root is pitch-shifted.
// await music.loadSamples('woodwind', [{ midi: 72, url: '/audio/flute-c5.wav' }]);

// music.pause(); await music.start(); music.stop(); music.getStatus();
// await music.dispose(); // When the game/session is torn down.
```

`intensity` is 0–1; `tempo` is 40–200 BPM; keys are D/E/G/A/C. Scenes are `explore`, `tension`, `battle`, `victory`. `seed` contains 1–64 characters. `muted` is an array of track IDs. Call `setState` on state changes rather than every frame. Its return value names the bar where pending settings will apply.

## Portable composition and rendering

```javascript
import { compose, validateScore } from './src/composer.mjs';
import { exportMidi } from './src/midi.mjs';

const score = compose({ seed: 'my-game-theme', scene: 'battle', intensity: 0.8,
  tempo: 112, key: 'D', startBar: 16, bars: 4 });
validateScore(score);
const midiBytes = exportMidi(score);
```

For file-based use without a browser, run `node scripts/export.mjs [settings.json] [output-directory]` from the repository root. It saves unique JSON/MIDI files and prints their paths. Omit both arguments for the default eight-bar theme under `artifacts`.

Composition is pure. The same seed, generator version, settings, and bar range produce the same note events. Random streams are keyed per bar, so partial requests match the corresponding bars of a whole score. Muting removes a track without perturbing the remaining notes. No audio backend, GPU, or service is involved.

For offline recorded-instrument WAV rendering in a browser:

```javascript
import { renderWav } from './src/webaudio.mjs';
const result = await renderWav(score, {
  bankUrl: '/samples/vsco-ce/manifest.json'
});
// result.bytes is stereo PCM WAV data; the host chooses where to save it.
// Or pass { sampleBank: loadedBank } to reuse a decoded live bank.
```

The [score schema](schemas/score.schema.json) and runtime validator describe the contract. Important units:

- `ppq = 480`; a bar lasts `ppq * 4 * numerator / denominator` ticks.
- Schema version 2 includes `barMap` with each bar's meter, groups, absolute start, and duration. `score.startTick` and `score.durationTicks` bound the whole batch; each event has its own absolute `startTick` and note-length `durationTicks`.
- A partial score normally derives its start from the repeating cycle. Live adapters can supply `compose({ ...settings, startBar, startTick, bars })` to continue an accumulated timeline after meter changes. Cycle selection uses `startBar % meterCycle.length`.
- Version 1 saved scores remain supported by the renderer, MIDI exporter, and runtime validator as fixed 4/4; their original schema is preserved in `schemas/score-v1.schema.json`.
- `midi` is 0–127; `velocity` is 1–127.
- Instrument role is `track`; MIDI channels/programs are zero-based. Percussion uses channel 9 (conventional channel 10).
- `seconds = ticks * 60 / tempo / ppq`, relative to the host's chosen audio origin. This version supports one tempo per score, not a tempo map.

To implement another renderer, provide `now()`, `schedule(event, absoluteSeconds, durationSeconds)`, and `silence()` to `MusicTransport`. Call `tick()` regularly to fill its 150 ms lookahead. The renderer schedules to its audio clock; the callback is only a queue feeder. `silence()` must cancel future and active voices. On a long stall, transport starts the next musical bar at a new audio origin rather than sending a burst of overdue notes. It deliberately preserves continuity of the score rather than jumping by every elapsed wall-clock bar.

## Native/local-service interface

`POST /api/v1/compose` returns score JSON; `POST /api/v1/midi` returns an SMF type 1 file. Requests take the same settings and bar range as `compose`. Maximum range is 256 bars and request size is 16 KB. Invalid input returns HTTP 400 with `{ "error": "..." }`. `GET /api/v1/health` reports service version. No stateful sessions, sound output, MIDI device access, or live push stream are implied.

```powershell
$request = @{ seed = 'astral-arcana'; scene = 'battle'; intensity = 0.8; tempo = 112; startBar = 16; bars = 4 } | ConvertTo-Json
Invoke-RestMethod -Uri http://127.0.0.1:4317/api/v1/compose -Method Post -ContentType application/json -Body $request
```

Any engine with JSON/HTTP can request music, but it still needs an audio adapter to play the returned notes. Prefer in-process/native or WebAssembly packaging for a shipped game after profiling. See the [Unreal integration contract](adapters/unreal/README.md); that adapter is not yet implemented or tested in Unreal.

## Files and validation

| File | Responsibility |
| --- | --- |
| `src/composer.mjs` | Settings, orchestral rule set, tick-based score, runtime validation. |
| `src/meter.mjs` | Meter parsing, additive accents, cycles, and variable bar timeline. |
| `src/theory.mjs` | Phrase planning, voice-leading costs, harmonic scales, melodic anchors and ornaments. |
| `src/transport.mjs` | Clock-independent queue scheduling and bar-boundary state changes. |
| `src/samples.mjs` | Manifest validation, deterministic region/take selection, bounded bank loading and integrity checks. |
| `src/webaudio.mjs` | Recorded and synthesized instruments, room effect, cancellation, matching offline WAV. |
| `src/browser-player.mjs` | Embeddable browser lifecycle/API. |
| `src/midi.mjs` | Standard MIDI File type 1 export. |
| `server.mjs` | Loopback demo and stateless score/MIDI HTTP adapter. |
| `web/` | Playable lab and pattern display. |
| `tests/` | Core invariants, timing/cancellation, MIDI structure/note balance, HTTP behavior. |

```powershell
node --test tests/*.test.mjs
```

See [verification](VERIFICATION.md) for measured results and remaining checks. This prototype runs with no third-party runtime packages, cloud service, or ComfyUI dependency. Its third-party recordings and adapted random mixer are attributed separately. Composer editing, fuller orchestral expression, more developed harmony, stingers/phrase transitions, native packaging, and live MIDI/OSC adapters are future work.

The [research and decision](docs/music-research.md) explains what already exists and what we should reuse as requirements grow.

For structural inspection, run `node scripts/inspect-score.mjs path/to/score.json`. Its motion and interval metrics help diagnose a score; they do not establish musical quality.
