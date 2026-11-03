# Version 0.6 verification

November 2, 2026. Implementation checked in the standalone Way-Music-Lab checkout. No desktop input or existing browser control is part of the checks below. Desktop automation was discontinued at the user's instruction.

## Passed checks

- `node --test tests/*.test.mjs`: 57 tests pass, including the 43 existing regression tests and fourteen new authoring/audio-contract tests.
- `node scripts/check-studio-ui.mjs`: isolated in-memory DOM check passes studio initialization, keyboard creation, authored note entry, hook preservation during sound/meter changes, variation storage, keyboard-event recording and keeping a take, undo/redo, and adding a part. It uses a pinned development-only LinkeDOM worker and test doubles for canvas/audio. It does not interact with desktop input or a browser window.
- New modules parse under Node. `git diff --check` passes before release.
- HTTP integration serves the new home page and every new studio module, while retaining both older auditions and the API's file-access restrictions.

## Requirements and evidence

| Requirement | Implemented artifact and evidence |
| --- | --- |
| User supplies recognizable music | New projects contain empty parts. Project tests prove meter changes, patch variation, game mappings, and scene/variation recall preserve note events. |
| Keyboard and optional MIDI playing | Computer/on-screen handlers, MIDI connection/selection, velocity, sustain, bend, and CC Learn in `web/studio-app.mjs`; isolated DOM test exercises keyboard recording. Hardware MIDI itself has not been tested with a physical controller. |
| Independent melody and countermelody | Per-part note events and instrument patches; overlapping-part serialization and independent voice identity tests. |
| Editable recording | Take recorder retains event timing and overlapping notes; keep/discard, overdub/replace, loop overdub, step input, note editing, quantization, undo/redo, and project import/export are wired in the UI. DOM check exercises the central record/keep/undo path. |
| Visual sound instruments | Waveform resynthesis, harmonic sliders, sixteen-frame bound, two oscillators, envelopes, filter/LFO routes, effects and macros; initialization exercised in isolated DOM. Native visual appearance has not been screenshot-verified. |
| Reusable patches and protected exploration | Versioned validators, patch/project export/import, locks, A/B, variation storage; lock and serialization tests. |
| Dynamic meters | Existing additive meter parser and bar maps, tick-based parts, independent loop length. Tests prove meter edits preserve pitches, timing and expression. |
| Responsive game score | Authored stage admissions, patch variations, macro mappings, smoothed telemetry, danger hysteresis, timed cues, and silence. Tests cover danger/cue return, committed-bar decisions, source immutability, and empty-scene silence. |
| Engine-independent boundary | Pure project validation and AuthoredDirector; optional BrowserStudio adapter. Native Unreal synthesis remains outside this implemented browser release. |
| Audio scheduling and cancellation | Voice identity, pedal release, repeated pitches, future releases, cross-bar notes, stalls, stop, and voice-limit behavior covered by audio API test doubles. |
| Exports | SMF tempo/meter/note structure and stereo PCM WAV encoding tested. Actual native OfflineAudioContext rendering remains unverified in this environment. |

## Remaining verification limits

The in-app browser connection was unavailable. An optional native headless check was then attempted in a dedicated process with its own test profile, without attaching to the user's browser or sending desktop input. The process produced no output and timed out; no matching test process remained afterward. A separate minimal isolated attempt also produced no output. These attempts do not establish successful visual or native-audio verification.

Do not interpret DOM tests or mocked audio scheduling as proof of final timbral quality, device latency, actual Web MIDI support, or responsive visual layout. The optional `scripts/check-studio-isolated.mjs` fixture is provided for an environment with a working headless Chromium executable. A human listening and layout check can be performed by opening the local studio normally.

The application remains useful to review and test, but those native audio and visual acceptance checks are outstanding. Runtime software adds no npm dependency, factory presets, external waveform assets, or model service.
