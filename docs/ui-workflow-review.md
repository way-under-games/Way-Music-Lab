# UI evaluation and workflow redesign

November 3, 2026 · Way Music 0.10 · Original analysis and implementation: MIT.

The 0.9 application had enough creation tools, but its entry points, long forms and overlapping save/import controls made their relationships hard to understand. This pass evaluates observable tasks against documented patterns in established music tools. It is a design review with functional checks, not a controlled usability study or a claim of commercial feature parity.

## Documented references and decisions

| Reference | Documented pattern | Friction found in Way 0.9 | Implemented change |
| --- | --- | --- | --- |
| [Ableton Live: instruments and effects](https://www.ableton.com/en/manual/working-with-instruments-and-effects/) | A selected track has a device view; device order conveys signal flow; devices can fold to save space. | The current part, instrument, selected layer and controls were separated by long sections. Advanced setup appeared before core editing. | The instrument header names its owning part and current sound. A desktop layer rail stays beside the inspector. Tuning, phase, routing, key zones, project files and rhythm setup use disclosure controls. |
| [Phase Plant manual](https://kilohearts.com/docs/phase_plant) | The interface distinguishes preset information, generators, effect lanes and modulation; browsing and detailed editing are separate operations. | Five equally weighted workshop views competed with a large save form below every view and another classic editor. | Browse → Design → Samples → Save & share is the primary workflow. Layers, Movement and Effects are sections within Design. The classic editor is an explicit secondary choice. Saving has a dedicated screen and a persistent entry button. |
| [FL Studio: Channel Rack](https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/channelrack.htm) | Instrument rows expose selection, mute and settings; musical patterns and instrument channels are distinct concepts. | Users could confuse choosing a layer with changing the sound source, or opening a generated example with editing their own score. | Layer rows retain explicit On/Solo/selection controls and a visible source type. The path labels enabled layers and note zones. Tool navigation distinguishes Music Studio, Score generator and Story demo; demos link directly to the corresponding authoring workspace. |

These are organizational and interaction references. No manufacturer UI artwork, screenshots, code, fonts, presets or samples were copied.

## New everyday workflow

1. In **Compose**, play or draw your own notes. The piano roll appears before optional rhythm/count-in/record-mode settings. Expand **Rhythm & recording setup** for variable meters; the current cycle remains summarized while closed.
2. In **Instruments → Browse**, search while typing, choose EDM or Game soundtrack, and **Hear** a recipe before loading it. Preview preserves the current part and patch. Load applies the sound to the selected part and opens Design.
3. **Design** keeps the layer selection next to its controls on wide screens. On/Solo determines what sounds; selection determines what you edit. Movement and Effects have distinct secondary navigation. Advanced disclosures retain their open state while editing.
4. **Samples** contains recording import and baking, with source credits placed before the import action. Its generated sample library and retained source recipes remain available.
5. **Save & share** contains naming, tags, credits, save/update/duplicate and portable export. The header distinguishes factory recipes, modified copies, unsaved instruments and saved library revisions. Browser project autosave remains separate from durable instrument saving. **Project files & exports** contains whole-project/MIDI/WAV operations.
6. **Game score** keeps the live stage controls and simulator visible. Per-stage arrangements and mapping setup expand when requested. The separate **Story demo** places score feedback beside the controls on desktop and separates Reset story from the three narrative phase buttons.

The entry names change; existing composition, patch, meter, game policy and library data contracts remain unchanged. The music tools retain their shared full-width cosmic frame. Direct links to `/web/studio.html#sound` and `#game` open the corresponding studio workspace.

## Interaction fixes discovered during evaluation

- Decimal range values are restored after min/max/step initialization. Previously, constructing a range before its fractional step could round a value such as FM index 2.4 to a thumb position of 2 even while the patch retained 2.4. Studio macro ranges receive the same correction.
- Stable control identities preserve focus when a control edit redraws the inspector. Native ArrowRight adjustment changes the patch without dropping keyboard focus; Enter opens Save & share and focuses its navigation entry. Native form controls, labeled inputs, focus outlines and keyboard alternatives for waveform drawing remain available.
- Library preview loading has a generation guard. Stop audition, part changes, loading an instrument and workspace changes cancel pending preview work and stop its note.
- Save serializes repeated clicks and refreshes normalized metadata so a successful save displays the saved state.
- The isolated browser check uses a fresh private test library each run and removes only that verified temporary directory. It does not add test instruments to the user's library.

## Verification

81 Node tests pass. The in-memory UI workflow check passes. The isolated native-browser check covers preview without patch/note replacement, live search and EDM filtering, collapsed setup, saved/modified status, keyboard range/focus and Enter navigation, waveform/modulation drawing, recording/keep, instrument saving, audio-file import, three-root baking/replay, portable exports and actual sampled-score WAV output. Existing synth/FM/stereo/recorded audio checks continue to pass.

All three studio workspaces, all six instrument views (including Save), and the three additional tool pages were checked at 1500 and 430 px without horizontal overflow. Tool navigation remains visible after scrolling. Desktop and narrow screenshots were visually inspected. Checks ran in a dedicated headless profile; the connection to the user's in-app browser was unavailable, so the open user tab was not controlled. No DSP engine or asset-license change was needed.

Further work should be guided by observation of real composition sessions: whether users can distinguish preview from loading, find the selected layer's envelope, save and recall without losing edits, and understand stage changes. This pass does not claim measured task-time improvements, full accessibility certification, or native Unreal playback.
