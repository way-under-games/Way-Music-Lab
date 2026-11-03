# Instrument creation: interface research and the Way 0.8 workbench

Research date: November 2, 2026. Original analysis and implementation: MIT. This study uses official product documentation and interface examples; it is not a hands-on benchmark of installed commercial plugins or an exhaustive ranking.

The useful common pattern is a short, visible feedback loop: play a note, manipulate a shape, see the connection to the result, compare, and keep the discovery. More controls help when their purpose and effect remain apparent. Way retains its cosmic style and authored-melody workflow while adopting those interaction patterns.

## Reference interfaces

| Reference and primary source | Documented pattern | Design judgement for Way |
| --- | --- | --- |
| [Vital](https://vital.audio/) | Animated synthesis views, custom LFO shapes and modulation gestures; its connection workflow can preview modulation. | Put an editable movement shape beside its destinations. Show per-voice movement instead of a purely decorative animation. |
| [Arturia Pigments](https://www.arturia.com/products/software-instruments/pigments/overview) | Color-coded controls, a responsive Play View, multiple synthesis methods, and drag-and-drop modulation. | Use consistent colors for waveform, envelope and movement tools; keep audition controls available while editing. Our implementation does not reproduce Pigments' screen layout or engines. |
| [Kilohearts Phase Plant](https://kilohearts.com/docs/phase_plant) and its [modulation guide](https://kilohearts.com/docs/modulation) | Visual generator modules, separate modulation/effect areas, accessible macros, and a source-to-target connection mode. | Make a clear route through Tone → Shape → Movement → Performance. Selecting a source then a target is also a useful keyboard/touch alternative to dragging. |
| [Xfer Serum 2 manual](https://xferrecords.com/web-manual/serum-2/welcome) | Oscillator/filter editing, module initialization/copying, undo/redo, keyboard audition and a broad synthesis environment. Its [sample-to-wavetable workflow](https://support.xferrecords.com/article/59-converting-samples-to-wavetables) is a separate asset-conversion operation. | Make frame experiments visual and reversible. Offer starting shapes and transformations before requiring a blank-canvas drawing. Treat sample import as a future asset pipeline with provenance, not a cosmetic file-drop control. |

These are references for interaction design. Their vendor code, preset banks, wavetables, screenshots, icons, fonts, logos and skins are not included in Way. Existing source attributions remain in [ATTRIBUTIONS](../ATTRIBUTIONS.md); original code remains under the repository's MIT license.

## Implemented in 0.8

### Tone and frames

Waveform thumbnails make the current wavetable frames visible. Selecting a frame also moves the base scan position to that frame. Copy/delete tools preserve a minimum of one and maximum of sixteen frames. Sine, saw, square and bell starting spectra, plus brighten, soften, hollow and phase inversion, operate on the selected frame. Applying a frame tool switches the first synth oscillator to the harmonic source so the edit is audible on the next attack.

These operations use Way's eight signed harmonic coefficients, not a high-resolution commercial wavetable format. A drawn or generated shape is an approximation within that budget. Phase inversion may mainly change interactions with another oscillator or frame, rather than sounding different on its own.

### Shape the note directly

Four envelope handles edit attack, decay, sustain and release. Time handles use logarithmic ranges so a millisecond attack and a multi-second swell are both reachable. The segments have their own display regions rather than a linear seconds axis; values are labeled explicitly. Keyboard users can focus a handle and use arrow keys, or use the existing sliders. A pointer gesture commits one undo step; cancellation restores the parameter.

Amplitude settings apply to a new attack. The audition dock's Strike button hears that new envelope; Hold keeps a note sounding for continuous tone and movement edits.

### Draw real movement

The movement editor provides sine, rise, fall, gate, bounce and stepped recipes, pointer drawing, and an expandable point-slider editor. Curves are portable arrays of 4–64 values between −1 and 1; recipes create sixteen points. Linear interpolation joins successive values and wraps the final point back to the first. Edits reach the browser synth and offline WAV renderer through the same pure curve evaluator.

This is one repeating, per-note, control-rate LFO. It starts with each attack; it is not an audio-rate oscillator, a global automation timeline, or a multi-modulator sequencer. Free rate and tempo-period settings retain their existing meaning.

### Make connections legible

Movement and playing-strength source chips connect to tone brightness, waveform blend or pitch, using drag-and-drop or source-then-destination buttons. The existing depth editor remains available for signed amounts, source/destination changes and removal. Sources have consistent amber/cyan colors. A new movement connection raises depth and Motion to audible starting values, which Undo can restore.

The live playhead/readout follows an active voice's phase, movement, effective cutoff and wave position. Waveform blending needs the harmonic source and multiple frames. A recorded instrument can respond to filter/pitch movement but does not become a wavetable oscillator.

### Keep listening within reach

The sticky audition dock provides named test pitches, Strike, Hold and Stop audition. It does not write notes or engage step recording. Switching workspaces/parts or losing focus cancels held preview voices. Instrument editing is blocked during a take. A strike releases an existing held preview; normal effect tails can decay. Global Stop/All notes off still clears the shared audio graph.

Section jump buttons avoid scrolling through the full editor to reach a control family. Existing A/B, patch export/import, local project history and game variations retain curves along with the rest of each patch.

## Compatibility and validation

Patch/project versions remain 1. Validation fills missing movement curves in older patches with a sine recipe; existing built-in LFO shapes retain their evaluation. New custom-shape patches require a 0.8-or-newer reader; an older reader can reject the custom shape. Invalid curve lengths, non-finite values and out-of-range points are rejected. Custom-curve morphs resample their inputs and remain bounded. Notes, meter plans and game policies remain separate from sound design.

73 unit/integration tests pass. DOM checks cover frame shaping/copy/deletion, curve recipes, connection creation, keyboard envelope editing and note protection. Native browser checks draw a curve and drag an envelope, audition a held instrument, observe live modulation and stop its preview. A custom movement probe changes rendered PCM with a difference RMS of approximately 0.00710 compared with the same patch at zero modulation depth; this is a functional signal check, not a perceptual-quality score. Existing recording/export and twelve responsive layout checks pass.

## Next synthesis work

The most consequential remaining power increases are more partials/band-limited frame resolution, explicit unison/voice controls, additional independent modulators, audio-rate FM, and prepared sample-to-wavetable import. Those require DSP/resource/asset work beyond this interface pass. A native Unreal renderer is still a separate adapter. The present research does not establish cross-browser equivalence, device latency, physical MIDI behavior or subjective artist-quality results.
