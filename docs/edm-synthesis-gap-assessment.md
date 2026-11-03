# EDM synthesis capabilities and missing features

November 3, 2026. Audit of Way Music 0.8 at commit `c788a4e`. Original analysis: MIT. This is a research and engineering assessment; it does not add the proposed synthesis features.

Way's editor has advanced faster than its sound engine. Several sound-design methods used in EDM remain unavailable, so more experimentation with the current controls cannot reach every reference sound. The next substantial improvement should expand synthesis, modulation, processing and performance behavior together.

## Combined EDM and game soundtrack direction

The user subsequently supplied **Stardew Valley**, **Donkey Kong Country — Simian Segue**, and **Vampire Survivors — Reincarnated Echoes** as the sound references. These add a hybrid retro-game palette to the existing EDM direction. The user explicitly wants both incorporated. EDM synthesis is a core requirement alongside the game references; FM/PM, true unison, richer wavetables, independent modulation and flexible processing must not be deferred until a retro-instrument tool is finished. Both directions should use the same engine and layered instrument format.

Use the original Stardew Valley soundtrack as the broad reference, the original SNES world-map version of Simian Segue as the working version, and poncle's original Reincarnated Echoes upload. The exact Stardew track remains unspecified. The following palette descriptions are proposed design targets, not a transcription or a claim to have identified the original presets.

| Reference | Proposed target for Way | Main capability need |
| --- | --- | --- |
| Stardew Valley | Warm keys/plucks, woodwind-like voices, gentle synthetic pads and small percussion, with distinct seasonal moods. | A wider sample/synth palette, responsive instrument envelopes, room/reverb and phrase dynamics. |
| Simian Segue | Characterful compact sample voices, clear percussive attacks, melodic counterlines and controlled echo. | General sample-instrument creation, looping/tuning controls, pitch/envelope articulation and purposeful layering. |
| Reincarnated Echoes | An energetic melodic ensemble with an assertive lead, driving bass and drums, and contrasting retro/acoustic textures. | Distinct playable instrument roles, lead articulation, stronger rhythm/bass sounds and cohesive effects. |

### Source evidence

- [ConcernedApe's official soundtrack](https://concernedape.bandcamp.com/album/stardew-valley-ost) identifies the original reference. In [his NPR interview, carried by KNKX](https://www.knkx.org/2024-12-19/the-creator-of-video-game-stardew-valley-talks-its-legacy-and-future), Barone discusses expressing the seasons and making synthesizer/computer music feel organic. [Reason Studios](https://www.reasonstudios.com/news/post/the-reason-livestream-returns) confirms that the soundtrack was made in Reason. This does not establish an exact patch list for each song.
- [David Wise's first-person DKC interview](https://vgmonline.net/davidwiseinterview/) describes tiny waveform samples and programmed sequences inspired by the Korg Wavestation. This establishes an approach used in the series, not the exact construction or authorship of Simian Segue. The [track reference](https://www.mariowiki.com/Simian_Segue) distinguishes the original world-map cue from the GBA naming ambiguity.
- [Poncle's official Reincarnated Echoes upload](https://www.youtube.com/watch?v=dwx2DtyqSLc) credits Daniele Zandara as composer/arranger. Original sound-library and patch details are not established here.

### Integrated implementation sequence

| Milestone | Shared capabilities | EDM acceptance example | Game-score acceptance example |
| --- | --- | --- | --- |
| 1. Hybrid instrument foundation | Explicit sample/synth layers with independent gain, tuning, envelopes and pan; playable sample mapping/loops; true bounded unison, sub and mono/glide behavior. Review source allocation before multiplying unison voices. | Wide lead and expressive detuned bass. | Warm keys/plucks and a compact retro map ensemble. |
| 2. Spectral sound generation | Audio-rate FM/PM with ratio/depth envelopes, richer band-limited wavetable representation, and oscillator shaping. | Metallic pluck and evolving/growling bass. | Bell/mallet colors and animated synthetic leads/pads. |
| 3. Movement and processing | Independent envelopes/LFOs, broader destinations, musical volume pumping, EQ/filter choices, nonlinear models, flexible ordering, chorus and reverb. | Articulated talking bass and pumping stereo chords. | Expressive melodic ensemble and energetic lead/bass/drums. |
| 4. Personal source creation | Curated licensed instrument palette, owned-recording import, resampling/re-import and prepared sample-to-wavetable conversion; granular tools where they serve the sound. | Personal vocal-derived or fractured textures. | Reusable bespoke sampled instruments and environmental colors. |

Each milestone must demonstrate both directions through complete original sounds, with isolated-patch and ensemble listening. The game references guide palette, articulation and arrangement; the EDM research supplies additional synthesis, modulation and processing requirements. Neither is a substitute for the other.

Provide descriptive macro starting points and a visible layer/signal-path view so powerful processing remains understandable. A sample attack, synth body and clean sub should be audible as deliberate layers, rather than being confused with patch replacement controls. Composition and game hosts should consume the same instrument assets while keeping authored melody/countermelody separate.

Retain the broader EDM audit and roadmap below as technical requirements. Evaluate user-authored test phrases across the game-reference ensembles plus a wide EDM lead, FM/growling bass, metallic pluck and personal sampled texture. These targets do not require copying reference melodies or redistributing their instrument samples. A new runtime capability is complete only when live/offline sound behavior, resource bounds and game-transition behavior are checked.

## How distinctive electronic instruments are made

A source sound is shaped over time, processed, and often recorded and edited again. The audible result can include separate low-end, midrange and attack layers, plus automation and mix processing. A preset's oscillator is only part of that result.

- **Wide leads and supersaws:** detuned copies, phase relationships and stereo distribution give a single note density and movement. Envelope/filter shaping and spatial effects finish the character. [Ableton Wavetable](https://www.ableton.com/en/packs/wavetable/) documents unison, oscillator effects, a sub oscillator and an assignable modulation matrix.
- **Metallic, rubbery and aggressive bass:** audio-rate modulation generates new spectral components; changing the modulation depth through a note changes its articulation. [Image-Line's Sytrus manual](https://www.image-line.com/fl-studio-learning/fl-studio-online-manual/html/plugins/Sytrus.htm) covers FM/RM, operator envelopes, unison and examples including supersaw, acid, Reese and donk sounds.
- **Talking and evolving bass:** oscillator modulation or wavetable motion can feed moving resonances, nonlinear processing and further tone shaping. An [iZotope sound-design tutorial](https://www.izotope.com/en/learn/simple-fm-synthesis-sine-waves-and-processors.html) builds an articulating bass using FM, mono glide, envelope/processor automation, EQ before distortion, multiple distortion stages and spatial processing. Its example shows why processing order matters.
- **Glassy, noisy and warped timbres:** phase/frequency interactions, waveform deformation and distortion produce different structures. [Phase Plant's manual](https://kilohearts.com/docs/phase_plant) distinguishes phase modulation, linear/exponential FM and ring modulation, and provides several distortion modes.
- **Personal sampled or vocal-derived textures:** recordings can become playable sources or wavetables. [Xfer's sample-conversion documentation](https://support.xferrecords.com/article/59-converting-samples-to-wavetables) describes analyzing a sample into wavetable frames. This provides a route from a personal recording to an instrument.

These are technique families, not exact reconstructions of a particular artist's patch. In his [Image-Line interview](https://www.image-line.com/artists/porter-robinson), Porter Robinson describes Sytrus/3xOSC bass programming, manually sequenced pitch gestures, visual EQ and edited audio. That historical account supports treating the performance and processing workflow as part of a signature sound; it does not establish his present-day setup.

## What the current engine actually supplies

The relevant implementation is [the patch contract](../src/studio.mjs), [the browser renderer](../src/studio-audio.mjs), and [the curve/partial tools](../src/instrument-design.mjs).

| Capability | Current Way behavior | Consequence |
| --- | --- | --- |
| Oscillators | Two audible generators summed into one voice; each has shape, level and ±100 cents detune. | A basic detuned-saw/Reese-like tone is possible. Independent octave/semitone tuning and a dedicated sub/noise layer are absent. |
| Custom waveforms | Eight signed harmonic coefficients per frame; up to sixteen frames. | Complex custom spectra, fine formant detail and imported timbres are strongly restricted. The eight-partial restriction applies to custom harmonic frames; native saw/square oscillators have richer spectra. |
| Unison and stereo | No per-note unison. Width pans the entire voice according to MIDI-note parity. | A single sustained note is not spread across stereo detuned voices. Chord panning and two oscillators beating in mono are different capabilities. |
| Oscillator interaction | Generators add together; neither modulates the other at audio rate. | There is no actual FM/PM, ring modulation, hard sync, PWM or phase-distortion engine. |
| Modulation | One per-note looping LFO, velocity, and three route destinations: pitch, cutoff, frame position. | Independent pumping, timbral articulation, slow evolution and stereo motion cannot all receive their own modulators. Drive, resonance, individual oscillator level and pan are not route destinations. |
| Modulation timing | Live control updates approximately every 25 ms, with additional parameter smoothing; free LFO rate tops out at 16 Hz. | This is slow control movement, not audio-rate synthesis. Increasing the rate limit alone would not implement FM. |
| Envelopes | Shared amplitude ADSR; filter movement derives from attack/decay with a depth control. | There are no independently assignable modulation envelopes or dedicated pitch/FM envelopes. |
| Filtering | One fixed low-pass filter per voice. | No selectable high-pass/band-pass/notch, dual-filter routing, formant bank or comb/resonator stage. |
| Effects | One tanh saturation stage and feedback delay per part, plus a fixed master compressor. | No editable EQ, distortion models/order, chorus, flanger, phaser, reverb or multiband dynamics. Space controls delay, not reverb. |
| Playing behavior | Independent triggered notes with pitch-bend/expression support. | Mono note priority, legato and automatic portamento/glide are absent. |
| Source assets | Compact recorded orchestra is available as an alternative source. | No general personal-sample instrument, sample-to-wavetable preparation, granular engine or internal resampling/re-import loop. |
| Phrase expression | Notes and pitch expression are retained; macro CC values can move live. | Continuous macro automation and per-step timbre locks are not recorded into a timeline. |

All voices in a part feed its shared saturation/delay bus. Saturating a chord together can create interactions between its notes; it is different from distorting each voice separately. There is also no clean sub bypass around the distortion chain.

## Which desired sounds are blocked

| Desired sound family | Available starting point | Highest-impact missing pieces |
| --- | --- | --- |
| Huge EDM lead / supersaw | Saw oscillators, ADSR, filter | True stereo unison, phase controls, chorus/reverb, octave tuning |
| Expressive Reese / neuro bass | Two detuned saws and moving low-pass | Mono/glide, FM or richer wavetable motion, multiple modulators, EQ/filter/distortion stages |
| Vocal-like growl | A moving cutoff and custom frames | Richer source spectra, FM/warp, formant/notch filtering and independent articulation |
| Metallic pluck / donk | Bright partials and short ADSR | Ratio-based FM/PM and its own depth/pitch envelopes |
| Pumping future-bass chords | Chords, detune and one LFO | Stereo unison, volume modulation/ducking, multiple independent movements and spatial processing |
| Organic, fractured or vocal textures | Recorded orchestral source | Personal sample input, slicing/stretching/granulation and resampling workflows |

This mapping is an engineering inference from the audited implementation and documented techniques. Exact priorities depend on the reference recordings and passages the user wants to approach.

## General EDM capability roadmap

1. **Stronger sound generation and playing behavior.** Add true stereo unison with phase/detune controls, independent oscillator octave tuning, a clean sub source, and mono/legato/glide. Add a bounded two-operator FM/PM path with frequency ratios, depth and an independent modulation envelope. These provide recognizable changes in sound rather than another way to move the same few parameters.
2. **A broader modulation system.** Multiple independent envelopes/LFOs, one-shot and transport/per-note modes, seeded random/sample-and-hold, and destinations for volume, pan, resonance, oscillator interaction and effects. Expose a few descriptive macros above the full matrix.
3. **Tone shaping and processing order.** Selectable/dual filters, formant and notch options, EQ, multiple nonlinear models with oversampling, chorus and reverb, editable order and dry/wet controls. Add pumping/ducking as a deliberate musical control. [Ableton's audio-effect reference](https://www.ableton.com/en/live-manual/12/live-audio-effect-reference/) documents how these processor families change a source in different ways.
4. **Richer personal source material.** Raise custom-waveform resolution, add an appropriately band-limited wavetable representation, then prepare owned recordings for wavetable/sample playback and internal resampling. Granular synthesis can follow once asset preparation and memory bounds are reliable.

Some of these features should be delivered together in a narrow set of complete sound recipes. A small usable FM bass, stereo lead and vocal-like evolving instrument would demonstrate more than a large menu of unfinished synthesis methods.

## Architecture and acceptance criteria

Keep the instrument contract and synthesis definitions portable. Choose an audio-rate execution path before implementing FM; the existing UI/control timer is not that path. A browser renderer and offline exporter should share synthesis behavior, with a native engine adapter handled separately.

The current renderer allocates an oscillator for every harmonic frame of every active oscillator. At sixteen frames and two harmonic generators, that is 32 source oscillators for one played note before adding unison. Multiplying that graph by seven unison voices would mean 224 sources per note. This implementation detail needs a resource/DSP design review before adding wide unison indiscriminately. [Ableton's Wavetable CPU guide](https://help.ableton.com/hc/en-us/articles/360000036930-Managing-CPU-load-when-using-Wavetable) also identifies unison and table-position processing as CPU costs.

For each new capability, validate a dry isolated note and an authored phrase across low/mid/high registers and several velocities. Compare at matched loudness; check spectral change, aliasing, mono compatibility, phase consistency, headroom and worst-case polyphony. Test same-patch live/offline behavior, scene transitions and resource cleanup. Audition final musical examples with the processing chain engaged as well.

The existing clean-sine, non-silent WAV and clipping checks establish useful signal correctness. They do not establish convincing EDM timbre or artistic parity with a produced reference. A new sound-engine release needs listening comparisons in addition to those tests.

No external synth code, factory patch, sample pack or DSP dependency is selected by this assessment. Existing licensing remains unchanged; a future dependency or source asset needs its own provenance review.
