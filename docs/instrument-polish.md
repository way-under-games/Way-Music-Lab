# Instrument voicing and default-sound polish

Version 0.14 · November 23, 2026 · Original Way recipes and implementation: MIT.

The aim is more usable, stable and restrained starting instruments for both game scores and electronic music. This pass changes recipe data and starting controls; it does not claim a new physical model, commercial-synth fidelity or a listener preference result. The existing expressive synthesis controls remain available.

## What was making the defaults exaggerated

| Instrument | Previous recipe issue | Revised starting sound |
| --- | --- | --- |
| Lantern mallet | FM ratio 3.5, depth 2.4, substantial velocity-to-depth mapping, long release and room | Harmonic ratio 2, depth 0.85, a short independent brightness transient, quiet triangle attack, reduced upper brightness and shorter release/room. A rounded synthetic tine, not a claim of a sampled acoustic mallet. |
| Prism chorus | Seven voices at ±24 cents, followed by prominent chorus and delay | Five voices at ±9 cents, a quiet central body, gentler chorus and restrained tempo-synced echo. Stereo width remains separately controllable. |
| Cobalt growl | High FM depth, audible distortion, a clean layer an octave below the played note, longer glide and a slap echo | A centered harmonic FM body plus a clean fundamental at the played pitch, shorter articulation/glide and light saturation. The delay starts dry. Raising Motion still produces a stronger moving bass. |
| Map room | Larger differences between table frames and a conspicuous octave pluck | Closely related warm spectra, a clear fundamental, a much quieter upper transient and a short room. |
| Canopy strings | A relatively prominent synthetic layer an octave above the recorded strings and a long room | The CC0 recorded strings lead; quiet same-pitch synth support and a shorter room avoid the exposed artificial octave. |
| Crypt organ | A bright square-wave octave reed and more abrupt key-on | Restrained drawbars, a quiet triangle upper stop, softened attack and a small room. Gentle tremulant remains available. |

The old shared modulation recipe was also unsuitable for every role: it applied the same substantial tone/morph/velocity shaping to very different instruments. Those depths are now chosen per instrument, with conservative default Motion. FM velocity changes have more headroom before becoming very bright, and the mallet/keys filters begin below their previous ceiling. Space mappings have a smaller wet/dry range. The bass keeps its clean fundamental outside the shared saturation/effect chain.

These are aesthetic design choices for the starting palette. Fractional FM ratios, wide detuning, distortion, pitch modulation and long effects are all valid techniques when wanted; they are not prohibited by the engine.

## Classic editor and sound worlds

The four classic presets start with less automatic detuning, no default drive, quieter echoes and more controlled releases. The six sound worlds retain different sources and envelopes:

- Crystal rain has a rounder harmonic spectrum and less lingering echo.
- Gravity well retains a clean, audible root with some triangular definition.
- Solar acid still offers resonant movement, with less default resonance and saturation.
- Pixel comet moves filter colour rather than switching the note ±1 semitone at 9 Hz.
- Ion swarm keeps a broader saw character with ±7-cent detuning instead of ±38 cents and much lower drive.
- Velvet nebula keeps its slow contour with less harmonic-frame contrast, detuning and feedback.

More extreme exploration and custom modulation remain available. This is a change to starting recipes, not a restriction on user-authored instruments.

## Compatibility and use

Refresh Studio, open Instruments → Browse and load a factory recipe again to hear its revision 2 settings. Fresh musical examples also use the revised sounds. Existing project sounds, saved library entries and variation snapshots keep their stored values; they are not silently replaced. Loading an instrument keeps the musical note events intact. Classic presets and sound worlds change only when explicitly selected or used to create a new sound.

No rack/project schema or synthesis-renderer semantics changed. Old fractional-ratio FM, heavy effects and pitch-modulated patches still validate and play. The native UI check no longer assumes a mallet has exactly one layer or a fixed old depth value: it verifies that the inspector matches the real rack and keyboard adjustment actually changes its starting value.

## Verification and listening

**101 Node tests** cover the earlier system and additional recipe intent, keyed bass tuning, bounded starting modulation/effects, and compatibility with saved expressive patches. A legacy assertion that required extremely high distortion to distinguish sound worlds was replaced with a source-topology distinction; native spectral/output checks remain. The custom-movement regression explicitly raises Motion/depth to exercise the control rather than requiring every quiet default to be exaggerated.

The isolated native browser check renders all six factory recipes at three role-appropriate registers and velocities 50/110: 36 register/velocity probes, plus the usual default-note, complete score, stereo, FM, table-movement, import/bake, UI and layout checks. All probes are finite, non-silent and below clipping at their saved settings. Mallet half-integer partial energy at 2.5× and 4.5× the keyed frequency is approximately 0.000044 of its fundamental in the selected probe; the bass half-frequency ratio is approximately 0.000017. These are targeted pitch/spectrum checks, not a general score for good timbre. The engine can still make deliberate inharmonic sounds.

The [native check data](instrument-polish-check.json) records source hashes, register/velocity results and the before/after default-note peaks. The large output spread in that particular peak probe is reduced; **peak matching is not perceived-loudness matching**, and role-dependent dynamics remain important.

A local listening study renders all six old/new factory sounds through the same original eight-note phrase, with identical timing, pitches and velocities at 110 BPM. Effects are retained. The files are RMS matched to −24 dBFS over the musical loop, excluding the export tail. That is a coarse level control, not perceptual loudness normalization or a blind study. Judge pitch clarity, attack, sustained character, release, chord readability and whether the sound serves the music. No claim is made that a listening panel preferred the revisions.

## Sources and licenses

[The official Ableton instrument manual](https://www.ableton.com/en/manual/live-instrument-reference/) is a conceptual reference for FM frequency relationships, independent envelopes and unison behaviour. [Its effect reference](https://www.ableton.com/en/manual/live-audio-effect-reference/) supplies context for restrained chorus/processing choices. No Ableton preset, DSP code, recording or interface asset was copied.

All changed recipes and comparison phrases are original MIT material. No new runtime dependency, sample library or impulse response was added. Existing VSCO recordings retain their CC0 provenance. Existing separately licensed research documents and user/imported recordings retain their own terms; see [attributions](../ATTRIBUTIONS.md) and [license analysis](../LICENSE-ANALYSIS.md).
