# Version 0.6 verification

November 2, 2026. Verified in the standalone Way-Music-Lab checkout. Browser checks use a dedicated headless process and isolated test profile. They do not attach to an existing browser, operate a desktop window, or send desktop keyboard/mouse input.

## Passed checks

- `node --test tests/*.test.mjs`: **69 tests pass**, including the existing regressions and sound-playground and optimization tests for contrasting recipes, bounded blends, locks, deterministic mutation, protected hooks, wave reuse, stable envelopes, elapsed-time smoothing, and pending-start cancellation.
- `node scripts/check-studio-ui.mjs`: isolated in-memory DOM checks pass note entry, protected hooks, meter edits, variations, recording/keeping a take, undo/redo, and part creation. This check uses canvas/audio doubles and a pinned development-only LinkeDOM worker.
- `node scripts/check-studio-isolated.mjs "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"`: real-page and native Web Audio checks pass. The fixture waits for actual audio completion rather than advancing a virtual clock past rendering.
- New modules parse, local documentation links resolve, and `git diff --check` passes.

## Native audio and interface results

| Check | Observed result |
| --- | --- |
| Designed instrument WAV | 784,848 bytes, 24 kHz stereo 16-bit PCM, 8.175 seconds including note release and delay decay. |
| Synth peak and RMS | Peak 0.0390930, RMS approximately 0.00348918; non-silent and below clipping. |
| Recorded flute WAV | Peak 0.0113220; non-silent and below clipping after the local bank was verified and decoded. |
| Filter edit | Changing cutoff changes the rendered PCM. |
| Cross-loop release | The fixture's note extends beyond the loop and its full release remains in the WAV. |
| Native keyboard recording | A C4 / MIDI 60 event records and keeps a timed note through the real interface and native AudioContext. |
| Remapped recorded keyboard | The interface saves Q:0 / W:2, selects/preloads the recorded source, and records C4 through the remapped key. |
| Stop cleanup | The interface reports zero voices after stopping. |
| Runtime errors | No uncaught page exceptions in the native check. |
| Perform, Sound, Game at 1500 px | Each document measures 1485 px wide, allowing for the scrollbar, with no horizontal overflow. |
| Perform, Sound, Game at 430 px | Each document measures 415 px wide, with no horizontal overflow. |

Screenshots of all six workspace/viewport combinations were generated and inspected. The checks exposed mobile overflow in volume and harmonic controls; both are corrected. [Sound workspace preview](docs/media/studio-sound-0.6.png). [Recorded measurements](docs/studio-verification.json).

## Sound playground verification

Six native WAV probes render the same C4 note through all six worlds: non-silent peaks range from 0.00976 to 0.10962, below clipping for this test. First-second zero-crossing counts range from 348 to 1118. These are basic contrast/signal checks, not perceptual quality or loudness matching. A real pointer drag commits final planet coordinates and restores the initial patch; native card audition, slider/mutation persistence, restoration, and note protection pass. All six responsive workspace checks remain free of horizontal overflow.

Version 0.6.1 adds native proof of a clean zero-drive sine (third-harmonic ratio approximately 0.000145 versus 0.02644 with drive), 48 kHz studio export with no bank requests after preload, and an 11.31-second high-feedback test render including its extended delay tail. Read the [fidelity and performance report](docs/fidelity-and-performance.md) and [before/after work counts](docs/fidelity-runtime.json).

## Requirement audit

| Requirement | Implementation and evidence |
| --- | --- |
| User-authored recognizable music | Empty initial parts. Tests prove sound variation, meter changes, game mappings, and variation recall preserve note events. |
| Keyboard options | Computer/on-screen input, configurable letter/digit map, octave/velocity controls, held-note identity, pointer/focus cleanup. Native recording and remapping checks pass. |
| MIDI input and expression | Optional device selection, velocity, sustain, bend, repeated attacks, and CC Learn. Tests cover initial held bend, subsequent relative bend, sustain, and release. |
| Melody and countermelody | Independent note lists, overlapping timing, separate patches, ghost notes, mute and editing. Serialization and voice-identity tests pass. |
| Editable recording | Keep/discard, overdub/replace, loop overdub, step entry, piano roll, note editor, reversible quantization, undo/redo, and import/export. DOM and native recording checks pass. |
| Visual instruments | Two oscillators, harmonic drawing/resynthesis, frames, envelopes, filter/LFO routes, macros, effects, scope/spectrum, and modulation readout. Native initialization, screenshots, and filter-to-PCM checks pass. |
| Recorded instruments | Authored parts select strings, harp, flute, horn, or percussion from the CC0 bank. Native recorded WAV/keyboard checks pass. Unit tests cover tuning, looping, stable takes, and disposal. |
| Reusable sound design | Versioned patches, A/B, locks, bounded variation, serialization, and backwards-compatible defaults. Unit and DOM checks pass. |
| Variable meters | Additive cycles, independent loop length, tick-based phrases crossing bar lines. Tests prove meter edits preserve authored timing and pitches. |
| Game score progression | Stage admissions, patch variations, smoothed telemetry, danger hysteresis, bounded story cues, return policy, and silence. Tests verify committed-bar decisions and chronological scheduling. |
| Engine independence | Pure project/policy modules and optional BrowserStudio host. Lifecycle and atomic telemetry validation tests pass. |
| MIDI and WAV | SMF tempo/meter/note/channel tests and native synth/recorded WAV checks pass. JSON remains authoritative for per-note expression and timbre. |
| Licensing | Original runtime remains MIT, recorded sources CC0 with pinned provenance, and separately identified theory prose CC BY-SA. No commercial synth code, factory patches, or new runtime package was added. |

## Device and product limits

Physical MIDI hardware, output-device latency, and subjective musical quality have not been measured. Native checks cover the installed Chromium-family implementation, not every browser/device combination. Synthetic input tests do not establish physical controller performance.

This release implements the initial authoring workflow. Native Unreal rendering, richer FM/granular engines, sample-to-wavetable import, and continuous CC automation recording remain documented future capabilities. MIDI 1.0 channel-wide bend and the compact orchestral bank's articulation/pitch-shifting limits are explained in the studio guide. Runtime use needs no npm install or cloud/model service.
