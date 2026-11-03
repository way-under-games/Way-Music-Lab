# Way Music authoring studio

Version 0.6 implements the Perform, Sound, and Game workflow. The home page is now an authoring studio. Projects start with empty melody, countermelody, and bass-hook parts; the application does not invent their notes. The earlier procedural orchestra and narrative auditions remain available from the sidebar.

## Perform

Enable audio through the button or a played note. The computer layout uses A–K for white keys, W/E/T/Y/U for black keys, Z/X for octave, and C/V for velocity. The on-screen keyboard supports pointer input. Typing into text and numeric fields does not play notes. Pitch assignments are retained until key release, including after an octave change. Focus loss and All notes off cancel voices.

Customize computer keyboard opens a portable key map. Enter letter/digit and semitone-offset pairs, such as `Q:0, 2:1, W:2`, then Apply. Offsets are relative to the octave control; reset restores the default piano layout. Assigning Z/X/C/V to notes overrides those shortcut keys. Key-map changes do not edit existing musical parts.

Connect MIDI optionally, choose an input or all inputs, and play notes with velocity, sustain, pitch bend, and assignable CC controls. The Learn button under each Sound macro binds a MIDI channel/CC pair. Device changes clear held notes. Web MIDI availability and permissions depend on the browser; computer and on-screen input do not require MIDI access.

Record a take, finish it, and explicitly Keep or Discard. Overdub adds notes; Replace replaces the selected part only when the take is kept. Undo restores the prior part. Loop overdub plays the existing parts and folds new note starts into the current loop while retaining durations across its boundary. Turn it off for a linear take that can extend the loop. Count-in is a visual quarter-beat countdown; it is not an audible metronome.

Step input places played pitches at the note editor's start position and advances by the selected duration. The piano roll lets you add and drag notes; the editor below it changes pitch, start, duration, velocity, and a constant pitch offset. Selecting a note also exposes its values. Other parts appear as ghost notes. The note list includes pitches outside the roll's displayed C3–B5 range.

Grid quantization moves starts only, and is reversible. MIDI pitch-bend gestures are retained as per-note timelines during recording; sustain extends recorded durations. CC macro performance is live and its latest value is saved in the patch, but CC automation is not recorded as a timeline in this version.

The variable meter field accepts the same additive cycles as the earlier tool, for example `7/8:2+2+3, 5/8:3+2, 4/4`. Applying a meter does not modify notes or loop length. Tempo counts quarter notes. Notes may cross bar and loop boundaries; notes starting outside the loop remain saved but do not play or export in the selected loop. Loop length is independently editable.

## Sound

Each part owns its own instrument patch. Four original starting recipes provide bell/pluck, pad, lead, and bass directions. They contain no third-party recordings or factory presets.

Sound source also offers the bundled **recorded orchestra**: strings, harp, flute, French horn, and percussion, with sustain or short articulation selection. Preload recordings or start playing to load and verify the 95 local CC0 WAVs. Melody/countermelody parts and saved variations can mix synthesized and recorded instruments. The same event ID selects the same recorded take in live and offline rendering. Percussion uses GM drum pitches such as 36 (kick), 38 (snare), 42 (short cymbal substitute), and 45 (timpani); set the input octave or enter the corresponding MIDI pitches. The compact bank still has the pitch-shifting and articulation limits described in the root README.

The waveform/oscillator editor applies to the designed-synth source. Envelopes, filters, effects, and filter/pitch modulation also shape recorded instruments. Wavetable-position modulation has no effect on a recorded source. A live readout shows the selected part's effective filter and modulation values while playing.

Two oscillators can use sine, triangle, saw, square, or the custom harmonic source, with level and detune. A harmonic frame contains eight signed sine-partial coefficients. The waveform canvas resynthesizes a drawn shape into those eight coefficients; this is a bounded approximation rather than unrestricted waveform capture. Harmonic sliders provide precise alternative input. Add up to sixteen frames and scan their position manually or through modulation. Native PeriodicWave oscillators handle the harmonic sources; adjacent frames crossfade with aligned starts.

Amplitude ADSR, filter cutoff/resonance/envelope, LFO shape/rate/depth, and source-to-destination routes are editable. The envelope plot and schematic filter cutoff plot help explain settings. The live scope and spectrum observe the actual mixed output. The filter plot is a schematic, not a measured frequency-response analyzer.

LFOs can use free Hertz or quarter-beat periods. LFO and velocity can modulate position, cutoff, or pitch. Four macros expose brightness, motion, stereo width, and delay space. Drive, delay amount, and feedback are separate controls. Width changes voice panning; it is not a unison engine. Space controls the delay, not convolution reverb. Modulation is updated at control rate by the browser adapter; there is no audio-rate FM engine or AudioWorklet in this release.

Oscillator shapes, harmonic frames, source levels, detune, and the amplitude envelope apply to new attacks. Filter, LFO, and macro changes affect held voices. Store A and compare A/B, use project Undo/Redo, or vary unlocked sound controls. Parameter locks protect the selected controls during variation. These operations do not alter authored note events.

## Game

Enable game mappings, start the parts, and use the movement, danger, and story simulator. Each mapping has a source, destination macro, endpoint values, and smoothing time. Reversed ranges are supported; later enabled mappings win when several share a target. Bypass returns to the base patch macros.

Title, Opening, and Play select the persistent base stage. Danger enters above the 0.65 threshold and leaves after two consecutive bars at or below 0.35. Revelation, Loss, and Resolution are four-bar audition cues; the host API can request 1–32 bars. The score returns to the current base/danger stage after the cue. Lookahead can commit an upcoming bar before it is audible.

Each stage chooses which authored parts may enter and optionally recalls a saved instrument variation. An empty part selection intentionally leaves musical silence after releases. Variation snapshots include every part's patch, while leaving all note events intact. Adding or removing a part clears incompatible variation snapshots; Undo can restore them. Transitions change admission of notes and sound settings at bar boundaries; the tool does not automatically compose harmonic bridge passages.

## Save and export

Projects autosave to browser-local storage and export as versioned JSON. Export a project file for a durable copy independent of browser storage. Import validates patches, notes, expression, meter, mappings, scene references, and asset bounds before replacing the current project. Patch JSON can be exported/imported independently. The format has no executable code or remote instrument dependencies.

MIDI export contains authored parts, a tempo, meter/group markers, note velocities, and pitch bends. Its instruments are supplied by the destination; it cannot carry Way's synth timbre. MIDI 1.0 pitch bend is channel-wide, so overlapping independent bends in one part cannot retain their per-note meaning in an ordinary MIDI channel. The project JSON preserves it. Export supports up to fifteen unmuted melodic parts.

WAV uses native OfflineAudioContext at 24 kHz stereo PCM. It renders one loop, retains notes/releases extending beyond that loop, then allows six seconds for delay decay. With game mappings enabled it renders a snapshot of the current arrangement and target macro settings, not a recorded gameplay history. The 32-voice overlap limit is checked rather than silently exporting missing notes. Renders longer than three minutes are rejected. WAV downloads are browser-managed; they are not automatically uploaded to the local server.

## Browser game integration

The browser host is a thin adapter over portable project data and authored stage policy. Serve the `src` directory alongside the game; include `samples/vsco-ce` and its notices when using recorded instruments. The host preloads the recorded bank if the project or its variations need it. Load your exported project:

```javascript
import { BrowserStudio } from './way-music/src/studio-host.mjs';

const project = await (await fetch('/music/my-score.json')).json();
const music = new BrowserStudio(project, { volume: 0.5 });
startButton.addEventListener('click', () => music.start());
music.setStage('title');
// At the opening and then the moment control is granted:
music.setStage('opening');
music.setStage('play');
music.setTelemetry({ movement: 0.7, danger: 0.2, story: 0.1 });
music.cue('revelation', 4);
// On teardown: await music.dispose();
```

Call stage setters at the corresponding events, not all together as an initialization sequence. Native engines can consume the same JSON and pure `AuthoredDirector`, but still need an audio adapter implementing the patch semantics. This release does not include a native Unreal renderer or promise bit-identical cross-engine synthesis.

## Formats and bounds

Project and instrument formats are version 1. Notes use absolute tick starts, durations, MIDI pitches and velocities; PPQ is 480. Expression points are tick offsets from a note's start with semitone bend values relative to its initial bend. Meter is separate from phrase identity. Project JSON includes parts, patches, instrument-source choices, mappings, scene admissions, variation snapshots, MIDI CC bindings, and the computer key map. Earlier version-one files default to the original synth source and key layout. Runtime validators are exported from [studio.mjs](../src/studio.mjs).

Bounds include 16 parts, 10,000 notes, 1,000 expression points per note, sixteen eight-harmonic frames per patch, eight modulation routes per patch, sixteen game mappings, 32 variations, and a 128-quarter-beat loop. The renderer caps active note voices at 32. Keyboard input is immediate; authored playback uses 120 ms scheduling lookahead and a 25 ms feeder.

## Verification

Run `node --test tests/*.test.mjs` for core, scheduling, policy, format, MIDI, HTTP, and regression tests. `node scripts/check-studio-ui.mjs` runs an isolated in-memory DOM workflow check; it fetches the pinned LinkeDOM 0.18.12 worker with npm integrity verification and caches it under ignored `.cache`. It does not open or control a browser or desktop. Canvas and audio APIs in that test are doubles.

`node scripts/check-studio-isolated.mjs <chromium-executable>` provides a separate headless check of native synth/recorded WAV rendering, real-page keyboard recording, source switching and key remapping, plus viewport screenshots of all three workspaces. It creates its own ignored test profile, never attaches to an existing browser, and sends no desktop input. Native audio completion is reported to the temporary test server; screenshots use explicitly sized test viewports. See [version 0.6 verification](../VERIFICATION-0.6.md) for results and remaining device limits.
