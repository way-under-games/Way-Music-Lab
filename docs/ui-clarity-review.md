# Interface clarity review — version 0.15

Reviewed November 23, 2026. The goal was simpler key workflows without removing capabilities or adding instructional copy to the product. The implementation retains the cosmic palette while giving controls a consistent hierarchy.

## Design references

- [Ableton Live Concepts](https://www.ableton.com/en/manual/live-concepts/): a stable control bar and separation between browsing, editing and performance. Way now keeps transport visible while changing workspaces and puts file operations in a shared Project menu.
- [FL Studio workflow](https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/basics_workflow.htm) and [toolbar](https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/toolbar_panels.htm): distinct roles for instrument selection, note editing, arrangement and global playback. Way separates Piano roll from Rhythm and gives the instrument editor consistent destinations.
- [Cubase Project Window](https://www.steinberg.help/r/cubase-pro/15.0/en/cubase_nuendo/topics/project_window/project_window_overview_r.html): track selection and focused editing within a consistent project frame. Way retains a desktop part sidebar, adds a mobile part selector, and keeps the selected instrument/layer visible while editing.

These are organizational lessons, not imported designs or implementations. No vendor code, manual text, screenshots, logos, fonts, skins or factory content were copied. No new runtime dependency was introduced.

## Three implementation passes

1. **Project and composition.** Compact shared navigation; project name and save state in the header; import/export/example actions grouped in Project; persistent playback/recording controls; focused Piano roll/Rhythm panels; secondary note and performance options in disclosures. Removed tutorial cards and explanatory prose. Fixed the piano roll's fixed MIDI 48–83 window so bass and high notes remain visible; Fit part and explicit ranges cover MIDI 0–127 without changing notes.
2. **Instruments and game score.** Flat Presets/Tone/Modulation/Effects/Samples/Save navigation; searchable compact preset cards; selected-layer list plus Source/Envelopes/Range inspector. Waveform drawing remains the waveform preview rather than duplicating it. Classic synthesis and sound exploration remain available. Game scoring uses Scenes/Connections/Snapshots panels and a scene-by-part matrix with snapshot selection.
3. **Interaction and responsive review.** Compact/mobile part selection and session options; stable sticky offsets; arrow/Home/End navigation for focused editor tabs; unavailable note actions and irrelevant one-voice detune controls disabled. Shared outer frame across Studio, Generator, Story and the integration example. Instrument descriptions, attribution and license metadata remain available; tutorial copy was removed rather than moved into new help panels.

## Capability preservation

| Area | Retained workflow |
| --- | --- |
| Project | Name, save state, original examples, blank project, import, portable project export, MIDI/JSON/WAV export and quality settings |
| Performance | Play/stop, tempo, loop, volume, record modes, count-in, overdub, step input, pending-take keep/discard, keyboard/MIDI input and mapping |
| Composition | Parts, naming/removal, note insertion/update/deletion, drag editing, quantization, expression/bends, event list, variable-meter drafting/counting/apply, undo/redo |
| Instruments | Preset search/preview/load/export, layer enable/solo/add/remove, source generation, phase/tuning/routing, waveform frames and drawing, harmonic controls, envelopes, range, modulation, effects, macros and classic editor |
| Samples and library | Import, recording metadata, sample playback settings, baking, persistent libraries, instrument package import/export and author/license fields |
| Game score | Simulator, scene/part enablement, scene snapshots, telemetry connections, variations and portable project data |
| Other tools | Generator and Story presets, meter editing, playback, exports, diagnostics and integration example controls |

`ui-control-contract.json` records every static HTML ID from the four screens at baseline commit `5c588f909a5b1f08de535162a0cda241e87fad8f`. A regression check requires every ID to remain and rejects duplicate IDs. This guards addressability; it is supplemented by interaction tests because IDs alone cannot establish usability or functionality. Dynamic instrument controls are covered by the native editor checks.

## Verification

- 103 Node tests pass, including the control-preservation contract and server asset routes.
- DOM smoke verifies boot, keyboard creation, note editing, hook preservation, rhythm editing, variations, recording/keep, undo/redo and part creation.
- Isolated native Edge checks exercise recording guards, project import/export, sample baking, library import/export, keyboard focus, waveform and movement drawing, classic envelopes, routing and native live/offline audio probes. The audio suite covers 36 register/velocity probes plus factory/score, FM, stereo and waveform-morph checks.
- Added native workflows verify Project actions, scene matrix edits/undo, snapshots/undo, meter draft/apply/undo, MIDI 0 and 127 visibility, layer Envelope/Range access, keyboard tab navigation and preservation of source notes.
- Desktop 1500px and compact 430px captures verify Studio workspaces and the other three tools, no root horizontal overflow, mobile part selection/options/keyboard access, and transport placement below navigation. The scene matrix scrolls internally on small screens.

Tests use an isolated browser process, temporary library and fixture project; the user's running browser, saved library and composition are not modified. Physical MIDI hardware was not tested. Layout and interaction checks support these specific workflows; they do not establish universal usability. The pure score core, saved project contract and audio synthesis behavior are unchanged by this interface update. Native Unreal live integration remains future work.
