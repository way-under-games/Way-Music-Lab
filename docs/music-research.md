# Procedural game music: research and implementation decision

Research date: October 4, 2026. First sound target: **fantasy / orchestral**, as requested. “Tracker” here means programmable note/pattern playback, not a requirement to reproduce a particular MOD/XM interface.

The space is well explored. The opportunity for Way is a composer-facing, game-controlled layer with portable musical data, reliable transitions, and interchangeable instruments. Code that produces notes, the clock that schedules them, and the instruments that make sound should be separate components.

## Existing tools

| Tool | What exists | Fit for Way and the integration boundary |
| --- | --- | --- |
| [Tone.js](https://tonejs.github.io/) | Web Audio synthesis, sampling, effects, and a musical transport. | Strong browser renderer candidate. Use for instruments/sample banks and effects while retaining our own portable composition contract. It is a browser audio framework, not an Unreal runtime. |
| [Strudel](https://strudel.cc/technical-manual/repl/) / [TidalCycles](https://tidalcycles.org/) | Pattern composition and live coding; Strudel's scheduler queries patterns for events and routes them to outputs. | Closest pattern-language precedent. A possible future authoring adapter, rather than making its syntax the only score format. [Strudel's project](https://strudel.cc/) declares AGPL and separately references sound-bank licenses; adoption needs an explicit dependency/distribution decision. |
| [SCAMP](https://scamp.marcevanstein.com/) | Python composition framework with musical time, SoundFont playback, MIDI/OSC outputs, and notation export. | Strong Python-side composition/prototyping reference, especially for orchestration. Its note-versus-instrument boundary supports the proposed architecture. A Python runtime is an additional deployment component. |
| [pyo](https://belangeo.github.io/pyo/) | Python/C DSP toolkit for synthesis, effects, event processing, MIDI, and OSC. | Useful sound-design and native-side experimentation. Python audio-device/dependency setup is a separate concern from embedding music in a browser game. |
| [FoxDot](https://github.com/Qirky/FoxDot) | Python live-coding patterns controlling synthesis. The original maintainer says active development has ended. | Useful pattern/clock ideas; evaluate forks separately before selecting a maintained dependency. Do not base a new support promise on the original project's existence alone. |
| [Sonic Pi](https://sonic-pi.net/) | Live loops, synths, samples, deterministic randomness, and a current browser edition. Its published feature matrix distinguishes desktop MIDI/OSC/Link from browser IO. | Excellent authoring and audition environment. A possible external tool or adapter; a browser edition is not itself proof of a portable embeddable game SDK. |
| [SuperCollider](https://docs.supercollider.online/Guides/ClientVsServer.html) | Separate composition language/client and synthesis servers communicating with OSC. [Patterns](https://docs.supercollider.online/Tutorials/A-Practical-Guide/PG_01_Introduction.html) describe sequences that can become scheduled musical events. | A mature example of the separation we want. Potential advanced renderer, with an extra runtime/process unless embedded. |
| [Csound](https://csound.com/) | Programmable synthesis engine; the project lists desktop/mobile platforms and a WebAssembly target. | Worth evaluating for a shared native/browser DSP backend after the first score contract and instruments are stable. Cross-platform availability still requires integration work. |
| [FluidSynth](https://github.com/FluidSynth/fluidsynth) | Real-time synthesizer based on SoundFont 2. | Strong native instrument-rendering candidate for orchestral sound. It plays supplied musical data; composition rules remain our responsibility. The chosen SoundFont and engine are separate dependencies. |
| [OpenMPT / libopenmpt](https://lib.openmpt.org/doc/) | C/C++ library decodes tracker modules to PCM. The [FAQ](https://lib.openmpt.org/libopenmpt/faq/) documents stable C/C++ interfaces. | Useful for authored tracker songs and compact native playback. Decoding existing modules does not by itself solve generative arrangement or game-state transitions. |
| [Unreal Harmonix](https://dev.epicgames.com/documentation/unreal-engine/harmonix-plugin-in-unreal-engine?lang=en-US) | MIDI generation/filtering/manipulation and musical clock facilities in MetaSounds. | Thin Unreal instrument/playback adapter candidate. Keep the score, harmony, theme, and state policy outside the engine-specific graph. |
| [Unreal Quartz](https://dev.epicgames.com/documentation/en-us/unreal-engine/quartz-quick-start) | Blueprint-exposed scheduling that addresses game/audio thread timing. | Useful for quantized audio scheduling. Do not assume it and Harmonix share a clock automatically; pick one native timing authority per playback route. |

These are complementary layers, not interchangeable complete products. Tone.js is a browser audio toolkit; SCAMP is a composition framework; FluidSynth renders SoundFonts; libopenmpt plays modules; Harmonix and Quartz are engine-side facilities. A useful system can borrow from all of those categories without depending on one engine.

This research identifies primary projects and documented capabilities. It does not prove exhaustive market coverage, benchmark their audio quality, or certify a particular release/platform combination.

## Recommended architecture

```text
Game state / Composer controls
             |
             v
     Musical director
  scene, intensity, phrase policy
             |
             v
   Composition / pattern core
 theme + seed + harmony + arrangement
             |
       versioned note events
     /          |            \
 Browser     Native        Offline
 adapter     adapter       export
 Web Audio   synth/engine  MIDI/JSON/WAV
```

“Engine independent” means common behavior and data contracts, with thin adapters for hosts. It does not require using the identical audio-device code everywhere. Web Audio, Unreal audio rendering, and a desktop synthesizer have different lifecycle and scheduling interfaces.

1. **Core:** score definition, musical time, tempo maps, theme/motif, seeded variation, harmony, track roles, transition rules, and serializable state. No browser DOM, Unreal objects, network calls, audio devices, or model inference in this layer.
2. **Renderer contract:** events with pitch, velocity, onset, duration, instrument role, and musical tick. Hosts map instrument roles to synthesis, samples, SoundFonts, or MIDI.
3. **Timing authority:** one monotonic audio clock per output. JavaScript timers can fill a lookahead queue; they must not determine audible onset. [Tone.js documents this distinction](https://github.com/tonejs/tone.js/wiki/Transport), and the [Web Audio specification](https://webaudio.github.io/web-audio-api/) defines scheduled audio operations.
4. **Game integration:** controls express intent (`explore`, `tension`, `battle`, `victory`, intensity) rather than instructing every note. Host adapters consume whole phrases/bars ahead of playback and apply changes at a known boundary.
5. **Authoring:** named motifs, progressions, orchestration limits, pattern overrides, and auditions. Randomness should vary a coherent composition rather than select unrelated notes indefinitely.

## What was built in this pass

[Way Music](../README.md) is a dependency-free first implementation:

- Pure JavaScript composition core usable in Node or a browser.
- Four fantasy scenes, a shared harmonic plan, an eight-bar motif cycle, deterministic per-bar variation, five instrument roles, and intensity-dependent layering.
- Versioned score data with MIDI-compatible pitch/program/channel information and tick-based timing.
- Variable meter cycles, additive accent groups, and a math-rock rhythm mode. Version 0.2 replaces fixed 4/4 assumptions with an explicit bar map shared by composition, live scheduling, the tracker, WAV rendering, and MIDI signature markers. Saved version 1 scores remain readable.
- Renderer-independent live transport with bounded lookahead, merged state updates at bar boundaries, cancellation, and clock-stall recovery.
- Browser recorded-instrument playback with 95 locally bundled CC0 samples, bounded bank loading, integrity checks, velocity/articulation/take selection, sustain loops, shared room, synthesized fallback, live pattern display, pause/stop, muting, and volume control.
- MIDI/JSON exports, browser offline WAV rendering, and a local HTTP adapter for deterministic score/MIDI requests.

The small Web Audio renderer keeps the initial prototype runnable offline without an install or external CDN. This is not a conclusion that we should recreate Tone.js, SCAMP, or Csound. Evaluate Tone.js/SoundFont/native DSP adapters as richer instrument and timing requirements emerge. Keep those choices replaceable through the event contract.

## What is still needed for a robust shipped tool

The follow-up [music theory and sound study](music-theory-and-sound.md) records source-linked composition rules and instrument choices. Generator 0.3 adds phrase planning, smoother accompaniment voicing, chord-tone melodic anchors, resolved ornaments, tonal cadences, and phrase dynamics; these refine the baseline below without completing the production requirements.

| Area | Current baseline | Production acceptance work |
| --- | --- | --- |
| Fantasy timbre | Version 0.4 supplies a compact recorded VSCO CE bank with layers/articulations, alternate takes, loops, memory bounds, room and live/offline parity. | Listener evaluation, legato/release recordings, richer dynamic expression, broader pitch coverage, streaming and a native sampler. |
| Composition | Coherent scale/chord/motif rules and simple eight-bar phrasing. | Composer-authored themes, phrase-level development, voice-leading, cadences, tension/release, scene-specific orchestration, and repetition/quality evaluation. |
| Transitions | All settings change at the next uncommitted bar. | Phrase quantization, stingers, transition bridges, crossfades, hysteresis, tempo/key modulation, and priority rules for competing events. |
| Native use | Score/MIDI exports and stateless local HTTP score requests. | Actual native renderer/Unreal adapter, packaged runtime, clock mapping, prefetch, teardown, and packaged-game tests. No Unreal plugin is claimed complete. |
| Browser reliability | Audio-clock scheduling, voice limit, pause-on-hide, bounded recovery. | Mobile/device/browser matrix, long-duration stress, heavy game-frame stalls, device changes, suspend/resume, and audio-thread/worklet scheduling if required. |
| Interoperability | MIDI type 1 export plus JSON contract. | Import, MIDI/OSC live outputs, tempo maps, SoundFonts, authored tracker patterns/modules, and deterministic replay of game-state changes. |
| Deployment | Local Node server, static browser modules, no runtime third-party dependencies. | Versioned releases, engine adapter packages, sample provenance, performance budget, and support policy. |

The recorded-instrument foundation is now implemented. Use one real Unreal playback round trip for the next portability proof, and develop transitions and authored riffs for the next compositional improvement. Neither requires changing the composition API. Live symbolic composition here runs independently of ComfyUI.
