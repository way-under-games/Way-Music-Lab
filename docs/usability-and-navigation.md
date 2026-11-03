# Guided rhythm and navigation — 0.7

This update makes the existing tools approachable without needing to know notation or synthesis terminology first. Original UI code and visual design remain MIT; no new dependency, recording, font, or image package was added.

## Getting around

Music Studio, Astral Chamber and Story Director have prominent navigation cards at the top. Navigation stays visible while scrolling. The Studio's Perform / Sound / Game buttons stay with it, and switching workspaces brings the controls back into view. The current tool/workspace is highlighted.

All tools now share the same full-window frame, page gutters, navy/violet/cyan palette, and stable scrollbar gutter. The Astral Chamber and Story Director no longer shrink into the old narrow centered layout. The browser game API example uses the same frame/theme and is reachable through the Studio's Game guide.

The Studio prevents tool navigation while a take is recording or waiting for Keep/Discard. Kept project edits continue to autosave locally. Export project for a durable backup; changing pages does not transfer a generated Chamber score into the authored Studio.

## Visual meter builder

Available in Music Studio → Perform and the Astral Chamber. The Story Director retains its existing authored-theme meter policy.

1. Choose Steady, Waltz, Rolling, Off-kilter, or Math rock.
2. Each card is one bar. Choose its tick count and tick size from menus.
3. Tap numbered ticks to start accent groups. Bright ticks get extra emphasis. The first tick stays accented. Groups always sum to the bar length, so there is no invalid group arithmetic to type.
4. Add, copy, reorder or remove bars. The last bar cannot be removed; cycles remain limited to 32 bars.
5. Hear the count before changing the score. The preview uses scheduled Web Audio tones and highlighted ticks, runs once up to 12 seconds / 96 ticks, and can be stopped. It closes its audio context on stop, focus loss, or page exit.
6. Use this rhythm applies the draft. Your authored note pitches and timing remain unchanged.

The Studio optionally fits the note loop to one full cycle. It leaves this option off by default to avoid silently changing playback length. Notes outside a shortened loop remain saved. Cycles longer than the Studio's 128-quarter-beat loop limit cannot be fitted; remove bars or leave fitting off. Without fitting, the existing note loop length stays in force.

Typed notation remains under Advanced. Existing project formats, additive groups, meter import/export, and the pure meter core stay compatible.

## Guidance through the other features

The Studio has a three-step start path that opens Perform, Sound or Game. Expandable guides explain recording/keeping a take, the piano roll and quantization, waveforms/envelopes/filters/movement/effects, game stages/mappings/variations, and save/export choices. Sound sliders include plain-language hints; modulation sources and oscillator choices have descriptive names. Advanced controls remain available.

The Chamber explains the difference between Energy and loudness, theme identity, and what MIDI/score/WAV exports contain. Story Director offers a five-action walkthrough from the title to control, danger, and story cues, including why a change can wait for a musical boundary.

## Verified

- 69 existing unit/integration tests pass.
- DOM checks cover draft protection, visual accent edits, applying a cycle, fitting the note loop, note preservation and guided workspace selection.
- A dedicated headless browser checks a native count preview and cleanup, applies meters in Studio and Chamber, protects an unfinished take during navigation, and uses the Story Director controls.
- Twelve layout cases cover three Studio workspaces and Chamber/Director/API example at 1500 and 430 px, with no horizontal overflow. All non-Studio frames start at x=0 and match the available document width (1485 / 415 px with the scrollbar gutter). The same frame is used by Studio.
- Existing native audio, pointer sound exploration, keyboard recording, recorded-instrument export and 48 kHz/sample-reuse checks still pass.

See [current measurements](studio-verification.json). This verifies behavior and layout in the installed Chromium-family browser; it does not establish a formal novice-usability study, physical MIDI-device performance, or cross-browser equivalence.
