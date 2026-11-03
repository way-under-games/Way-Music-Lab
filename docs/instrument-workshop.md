# Instrument workshop: EDM design and reusable game instruments

Version 0.9, November 3, 2026. Original implementation and recipes are MIT. This update implements the combined direction in the [EDM assessment](edm-synthesis-gap-assessment.md): distinctive electronic instruments and game-score sample instruments share one layered format. It does not copy the named games' melodies, instruments or recordings.

## Start here

Open Sound → Library. **Prism chorus** demonstrates stereo unison; **Cobalt growl** combines an FM bass with a clean sub; **Lantern mallet** uses an independent FM depth envelope; **Map room** uses harmonic keys; **Canopy strings** combines CC0 recorded strings with a synthetic upper layer; **Crypt organ** layers an original additive organ and octave reed. Use Strike/Hold in the persistent dock or your computer/MIDI keyboard. Your authored notes stay on their existing parts.

Select Layers to see what is actually sounding. Every enabled layer plays together when the incoming note is inside its key and velocity zone. Selecting a row changes the editor selection, not the sound source. On toggles a layer; Solo enables just that layer, and pressing it again restores all layers. The header states the active signal path. A classic version-one patch still uses its classic editor until you convert it or load a layered instrument. Conversion is an approximate translation into the new architecture; Undo retains the original project snapshot. It is not a promise of an identical waveform.

Layer volume envelope → filter → color → pan → shared ordered effects → master is the normal path. Bypass shared effects routes that layer directly to the master, useful for a centered clean bass foundation. Amp-envelope/source/topology changes apply to new notes. Filter, level, pan, pitch, table position, FM depth and connected modulation can change held notes. Shared effect edits create a new chain for subsequent attacks while existing notes and tails retain their chain. Stop clears the tails.

## Sound creation

- Up to six independent synth, sample, orchestra or noise layers, with coarse/fine tuning, key and velocity ranges, gain, pan and independent volume envelopes.
- Analog shapes, up to seven separate detuned/stereo-panned unison voices, fixed or seeded varying phase, and wavetable frames with 4–64 signed harmonic coefficients. The visual editor offers harmonic recipes, waveform drawing/resynthesis, frame selection/copy/remove, blend position and a 32-harmonic expansion. Fixed frame oscillators crossfade through scheduled AudioParams, so live and offline movement agree. Source budgets count every frame and unison voice; reduce frames or unison if a complex instrument reaches the limit.
- Linear audio-rate FM: sine modulator → its envelope → depth gain → carrier frequency. Frequency ratio, index and the independent depth ADSR produce evolving brightness instead of a slow pitch wobble. Native Web Audio performs that modulation at audio rate.
- Up to four independent drawn LFOs, envelopes or seeded random sources; 32 explicit connections to layer cutoff, resonance, volume, pan, pitch, table position, FM index and color. Tempo sync and per-note/transport clocks are available. Velocity, keyboard position and four gameplay macros are additional sources. Brightness also provides the shared base filter tilt; connect Motion, Width and Space explicitly in Movement. A full pitch-depth unit spans an octave; cutoff depth is an octave multiplier.
- Ordered peaking EQ, soft/hard/fold/crush color, chorus, delay, original generated stereo room impulse and compression, with wet/dry mixes and reorder/remove controls. No third-party impulse or vendor DSP is bundled.
- Polyphonic or mono playing, overlapping mono attack softening and pitch glide. Mono uses a short crossfade into the new voice; it does not implement a hardware synth's held-key priority stack or retain one oscillator's exact phase across keys.

## Save, recall and share

Give the instrument a name, tags, author, description and license. Save stores a new entry; Update replaces the loaded personal entry using its revision number; Save as new duplicates it. Factory entries remain read-only. Library searches names, tags and descriptions and can show factory or personal entries separately. Deleting moves the saved record into local trash and leaves the instrument currently on the part intact.

The Node adapter stores records and content-addressed WAV assets in ignored `library/`. It survives browser and server restarts. This is separate from the browser's project autosave. Back up the directory or export instruments/projects. Do not distribute another person's recording merely because you can import it.

**Export with audio** produces a `way-instrument` version-one JSON package containing the patch, metadata, exact custom WAV bytes, source recipes and their dependent custom recordings. Bundled VSCO recordings remain references to the included bank. Import verifies required references, bounded metadata and audio hashes and creates a new personal entry. A sampled project uses a `way-project` version-one envelope with the same embedded audio; old plain version-one projects still import. Plain patch JSON by itself is a reference-only recipe and is not a substitute for the portable package when custom samples are used.

## Recordings and baking

Samples accepts a local browser-decodable audio file, up to 16 MiB and 30 seconds. Download web recordings yourself from a source whose terms permit your intended use, then enter the author, source URL, license and supplied attribution before import. The application does not fetch arbitrary remote URLs. It normalizes to 48 kHz stereo PCM WAV, retaining the original file SHA-256 and your provenance fields. CC BY declarations require attribution text. Provenance fields are declarations, not automated license verification. Add a Sample layer, choose the asset, set its root MIDI pitch, trim, loop, reverse and key/velocity zone. Audio preview plays the stored recording without the instrument processing.

**Render & save sampled instrument** captures the complete current synth/hybrid recipe at C4 or C3/C4/C5, at 48 kHz and velocity 100, with an adjustable hold. Each WAV stores the source patch and render settings. The new instrument maps roots to adjacent key zones, uses a short release envelope and exposes the recording gain that compensates for the captured renderer/velocity scale. It is saved in the library and loaded on the current part after completion. The source can be recalled from its recording entry. The authored melody is never part of a bake.

Baking captures a finite performance, including effect tails; it is not an indefinitely sustaining physical model. Holding beyond the recorded duration becomes silent unless you deliberately create a suitable loop. Three roots reduce extreme sample transposition but do not provide velocity round robins or a full orchestral multisample session. Existing VSCO regions continue to supply their own dynamic/articulation selection.

## Contracts and host integration

`instrument-rack.mjs` and `instrument-library.mjs` are pure versioned data validation. `library-store.mjs` is the Node disk adapter; `rack-audio.mjs`, `library-client.mjs` and `instrument-bake.mjs` are browser adapters. An optional `rack` extends the existing version-one patch. Older software that does not understand racks cannot reproduce these instruments from the legacy compatibility fields alone.

The browser game host loads referenced custom assets before starting. `BrowserStudio(project,{assetResolve:id=>myAssetUrl(id)})` supports a game's own content-addressed asset host. Hosting still needs the bundled orchestra manifest when recorded layers use it. Download verification and decoding use the host's AudioContext. Native Unreal/live native DSP is not implemented by this update; neither portable JSON nor MIDI proves native playback.

The loopback HTTP API supports:

| Operation | Route |
| --- | --- |
| List/create | GET/POST `/api/v1/library/instruments` |
| Recall/update/trash | GET/PUT/DELETE `/api/v1/library/instruments/:id` |
| Portable export/import | GET `/api/v1/library/instruments/:id/package`, POST `/api/v1/library/import` |
| List/upload audio and provenance | GET/POST `/api/v1/library/assets` |
| Metadata/audio | GET `/api/v1/library/assets/:sha256`, GET/HEAD `…/:sha256.wav` with byte ranges |

Writes accept JSON, safe IDs and same-server origins; the local library is not a public multi-user service. Limits: 500 personal entries; 512 MiB stored samples; 16 MiB per normalized audio file; 32 MiB audio per portable bundle; 128 MiB decoded custom audio per engine plus a separate bounded reverse cache; 32 voices and 256 concurrent rack sources; 96 source slots per note; eight effects and 32 retained effect-chain versions. Stop clears effect chains; reload clears decoded unused recordings. Request/body and offline graph limits are enforced before unbounded allocation.

## Verification and remaining synthesis work

The release checks 81 Node tests plus the isolated native-browser suite. Tests cover durable save/restart, revision conflicts, factory immutability, origin/path restrictions, WAV validation/ranges, hash checking and portable import/export; real stereo channel differences, audible FM index differences, scheduled three-frame spectral progression and bounded non-silent factory outputs; scheduled mono/glide, expression timing, source bounds and node disposal; actual file input/import, three-root UI baking/replay, sampled authored-score WAV export, portable projects and unchanged authored hooks. Native pointer tests draw rack waves and independent movement and save a connection. All five workshop views were checked at 1500 and 430 px without horizontal overflow; desktop and narrow screenshots were inspected. The dedicated test profile never attaches to the user's browser. Measurements check output and graph/resource invariants, not a claimed CPU/latency benchmark or subjective match to a commercial release.

This is a capable layered instrument foundation, not feature parity with Serum, Phase Plant or a finished sampled orchestra. Granular playback, recording-to-wavetable analysis, multi-operator FM matrices, true phase-continuous legato, velocity-layer baking, deep MPE and a shared native DSP renderer remain future work. Native PeriodicWave handles additive band limiting; FM depth is conservatively reduced in high registers, but this is not a dedicated fully oversampled FM engine. Live control modulation is updated at the existing scheduler rate with AudioParam smoothing; transport-driven offline renders evaluate control curves at 40 Hz. Audio-rate FM itself does not use that control-rate loop.

## Research and licenses

The [Phase Plant manual](https://kilohearts.com/docs/phase_plant) informed separation of generators, effect lanes and independent modulation, and the combination of samples, waves and audio-rate synthesis. [Ableton's instrument reference](https://www.ableton.com/en/manual/live-instrument-reference/) informed explicit envelopes, unison and playable source organization. The [Web Audio specification](https://www.w3.org/TR/webaudio-1.1/) defines native oscillator frequency modulation, PeriodicWave and graph scheduling used here. These are technique/API references; no vendor source code, presets, screenshots or recordings were copied. Other EDM and game-score sources remain linked in the assessment and attributions.

Original implementation and factory recipes: MIT. The existing Mulberry32 attribution and retained bryc MIT fallback also apply to the deterministic rack mixer. Existing orchestral recordings: CC0. User audio retains its own terms; generated outputs can inherit source-sample conditions, and typing MIT into a field does not remove those conditions. The app records the recipe and source dependency chain so they remain reviewable. No new third-party runtime dependency or web recording was added. See [license analysis](../LICENSE-ANALYSIS.md) and [attributions](../ATTRIBUTIONS.md).
