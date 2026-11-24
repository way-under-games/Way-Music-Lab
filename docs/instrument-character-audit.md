# Instrument character: current limits and creative friction

November 23, 2026 · Audit of the maintained 0.10 instrument path at application/research revision `cf43cf2` · Original analysis: MIT.

The user reports that creating interesting, distinctive instruments still does not feel possible. This adds instrument character as an equal priority alongside [composition quality](composition-quality-research.md). The previous 0.8 EDM assessment is a historical baseline: several of its missing features were implemented in 0.9, but that does not establish a successful creative workflow or a compelling palette.

## What actually exists

The active rack supports six synth/sample/orchestra/noise layers, independent envelopes, real stereo unison, a sine-carrier/sine-modulator FM pair, harmonic-frame blending, four control modulators, ordered EQ/distortion/chorus/delay/reverb/compression, sample import and baking. Mono/glide uses voice crossfades. Those are real implemented capabilities, rather than the old oscillator-only renderer. It is possible to create characterful sounds with them; distinctive personal recordings can also supply complex source material.

The limitation is the combination of restricted transformations, weak defaults, limited performance mapping and a workflow that asks the user to assemble technical connections before hearing expressive results. Existing tests prove bounded, non-silent output and some parameter differences, not the appeal, originality or ease of designing complete instruments.

## Reproduced code findings

| Finding | Evidence | Creative consequence |
| --- | --- | --- |
| **All six factory instruments have zero rack modulators and zero routes.** | Evaluate `factoryInstruments()` and inspect each patch's `rack.modulators`/`rack.routes`. Dedicated amplitude/FM envelopes and chorus still operate independently. | Motion, Width and Space have no factory mapping. Brightness has a direct filter effect. Several prominently exposed controls therefore offer no immediate result without manual wiring. |
| **All three active factory wavetable layers use eight coefficients per frame.** | Map room, Canopy strings' synth layer and Crypt organ. The schema allows 4–64 coefficients, while the UI's expansion option pads to 32. | Existing starts do little to demonstrate the broader spectrum capacity. Adding zero-valued harmonics does not itself change the sound. Native analog saw/square oscillators are not subject to this eight-coefficient factory limitation. |
| **Wave drawing retains only a sine projection.** | `waveEditor` calculates `2/N × sum(sample × sin(harmonic phase))`; stored frames contain one signed amplitude per harmonic. `RackAudio.wave` supplies a global cycle phase, not independent frame/component phases. | Drawing an arbitrary cycle is not faithful reconstruction. A sampled cosine cycle yields at most approximately `3.43e-16` among the current eight projected coefficients: effectively silence despite a full-amplitude drawing. This is a representation/interaction defect, not a lack of user skill. |
| **FM is a fixed two-operator sine structure.** | `create` connects sine modulator → its envelope/depth → sine carrier frequency. Layers otherwise add together. | Ratio/index/envelope changes can produce useful bells and basses, but there is no modulation between arbitrary generators, operator feedback, phase modulation, ring modulation or oscillator warp path. |
| **Effects and source routing have limited interaction.** | Each layer has one biquad and a static waveshaper. Layers feed an ordered shared effects chain, with one bypass alternative. The modulation destinations are cutoff, resonance, volume, pan, pitch, table position, FM index and layer drive. | No effect-parameter routes for wet mix, delay feedback/time or EQ motion; no explicit unison-spread target. Width-to-pan moves a layer rather than controlling its unison width. Space cannot directly animate reverb mix through the current matrix. |
| **Wavetable complexity multiplies source count.** | `layerSourceCost` counts frames × unison. A 16-frame, seven-voice layer costs 112 slots against the 96-slot instrument limit. | Making a table longer can prevent using a wide unison patch. The budget is a valid safeguard, but it restricts the expressive combinations promised by the separate limits. |
| **Recorded samples have basic sampler transformations.** | Root tuning, gain, trim, loops, reverse and playback rate are implemented. No independent time/pitch, grain or spectral engine. Baking captures finite notes. | A personal recording can be distinctive, but the tool mainly plays it at a different pitch rather than extensively transforming its internal texture. Baking does not itself invent a new timbre. |

The cosine observation follows the current UI projection mathematically; it is not an auditory preference result. A minimal reproduction is `samples[i] = cos(2πi/96)`, then evaluate the exact projection above for harmonics 1–8. A phase-preserving representation needs both components or equivalent phase-bearing cycle data. No runtime change to that representation is included in this research update.

Other limits also matter: only four independent control modulators, fixed ADSR shapes rather than arbitrary one-shot envelopes, no general aftertouch/MPE-to-timbre path, and no general recorded timbre/effects automation lane. Slow control modulation is scheduler-driven with smoothing; the dedicated FM pair runs at audio rate. FM depth is also conservatively reduced in high registers. These controls should not be marketed as arbitrary audio-rate modulation or a fully oversampled synthesis backend.

## What established tools demonstrate

These sources document capabilities and workflows; their marketing claims are not evidence that Way must reproduce all their features.

- **[Phase Plant's manual](https://kilohearts.com/docs/phase_plant)** documents generator interaction at audio rate, distinct FM/PM/ring-modulation behaviors and serial/parallel effect lanes. The useful comparison is the ability to make sources and processing interact, beyond stacking independent oscillators.
- **[Serum 2's manufacturer overview](https://xferrecords.com/products/serum-2)** describes wavetable editing/warping and additional granular/spectral/sample approaches. **[Xfer's sample-to-wavetable guide](https://support.xferrecords.com/article/59-converting-samples-to-wavetables)** documents transforming personal source recordings into tables. Way's playable-sample import and sample baking are different operations.
- **[Pigments' manufacturer documentation](https://www.arturia.com/products/software-instruments/pigments/overview)** describes multiple synthesis families, including modal/granular, morphing filters, modulation and processing buses. This illustrates the range between electronic, sampled and resonant/organic instrument design, rather than a requirement to match its feature count.
- **[Ableton's instrument manual](https://www.ableton.com/en/manual/live-instrument-reference/)** describes Collision's excitation/resonator model and independently controlled resonators. An impact and a resonating body provide a useful design model for playable wood/glass/metal colors, beyond a bright oscillator with a short decay.

The inference for Way is that unique sources, nonlinear/oscillator interaction, meaningful temporal control, routing and playable expression need to work together. A distinctive instrument can use only a few of these well. The number of knobs or synthesis modes is not a quality metric.

## Design targets and actual feasibility

| Instrument study | What Way can do now | What would materially extend it |
| --- | --- | --- |
| Moving metallic / vocal-like bass | Two-op FM, layered clean sub, envelopes, bandpass/notch options, saturation and slow routes. | Controlled formant/resonant processing, oscillator interactions/warp, modulated processing order and coherent expression mappings. |
| Organic struck wood / glass / metal | FM mallets, sample/noise attack and amplitude layers. | An excitation/resonator stage with pitch-aware decay and damping; richer one-shot articulation. |
| Slowly evolving asymmetric pad | Existing layers, several LFOs/envelopes, wavetable blending and space effects. | First provide good mapped examples; then improve phase-bearing tables, longer evolution, independent per-note variation and playable controls. This does not need a granular engine just to become more useful. |
| Personal found-sound instrument | Import, tune, trim, reverse, loop and layer a licensed recording; retain provenance and bake notes. | Source-to-table preparation, slicing/granulation or other intentional transformations; quick resample/compare/edit cycles. |
| Expressive wide lead | True unison, tuning, glide, pitch expression and filters. | Audible macro defaults, actual width/FX destinations, better legato/expression and instrument-specific articulation. |

These are proposed original sound families, not claims to have recreated Porter Robinson, Stardew, DKC or Vampire Survivors patches. Both EDM and the game-score palette remain requirements.

## Consequences for the next implementation

Treat the instrument path as unfinished alongside the composer. Start with trustworthy waveform editing, working performance mappings and a handful of complete contrasting instruments. Extend the signal model where those instrument studies expose a real barrier. The [instrument development plan](instrument-development-plan.md) defines this separately from the evidence above.

No vendor implementation, presets, screenshots, samples or new dependency were imported. This is code inspection, mathematical projection and primary-document research; there was no new listening panel or commercial-plugin recreation. It does not claim that adding the listed capabilities guarantees originality or listener preference.
