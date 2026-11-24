# Musicality and instrument character: version 0.11

November 23, 2026. Implemented changes, based on the separate [composition study](composition-quality-research.md) and [instrument audit](instrument-character-audit.md). Original implementation and demonstration material: MIT.

## Try the changes

Open Music Studio → Instruments → Browse and **load a factory recipe again**. Existing saved project/library sounds retain their own settings; updating the application does not replace them. Cobalt growl is the moving EDM bass study, Lantern mallet the struck game/EDM sound, and Canopy strings the recorded/synthetic pad. Map room now actually includes its described upper pluck, with two 32-partial table frames beneath it.

In Design → Movement, the recipes include tempo-synchronized movement, a separate articulation envelope and velocity mappings. **Motion controls movement depth**, rather than being an empty knob. Brightness controls filter brightness. **Width controls actual unison stereo spread** on Prism chorus; sounds without a Width route say “unassigned.” **Space changes mapped effect wet/dry levels**. The design header reports assignments. You can edit those connections and the Space depth on each effect.

Use Layers & tone to draw a waveform or edit sine/cosine harmonics. Amplitude and independent harmonic phase now survive drawing, frame copying/removal, saved projects and instrument packages. A cosine is a valid sound instead of collapsing to silence. DC is removed and harmonic content is limited to the chosen 4–64 coefficients. The preview and renderer share the same conservative normalization. No granular, resonator, feedback or arbitrary oscillator-routing engine is claimed here.

Audition the Score generator or Story demo for composition changes. These affect **generated scores**, while Studio melodies, countermelodies, expression and hook events remain authored material.

## Composition behavior

- Quiet/loss themes now play all eight motif positions over four bars, rather than selecting two positions and dropping odd bars. Other story profiles use a two-bar gesture. The original demonstration rhythm has uneven onsets, varied durations, accents and rests; playful articulation shortens the gates. Complete narrative gestures are no longer truncated at the final half-bar.
- Generated ensemble leads balance contour against smooth motion and use phrase-dependent gate lengths. Existing chord-tone anchors, resolving ornaments and cadential breaths remain.
- A deterministic 32-bar arrangement moves through statement, development, contrast and return. Harp order/onset, string activity, brief bass approaches and horn replies change with the section/phrase. The contrasting third phrase has a different harmonic plan; the fourth returns to the original. This remains a finite rule-based arrangement, not open-ended development.
- Some math-rock bass attacks move off the shared chord/drum accents, while the additive pulse stays intact. Variable-meter generation, seeking, muting and single-bar scheduling remain reproducible.

Custom eight-note rhythmic identity is available in the portable API:

~~~js
const director = new ScoreDirector({theme: {
  ...DEFAULT_THEME,
  rhythm: [0,.09375,.25,.40625,.5,.625,.75,.90625].map(position =>
    ({position, duration: .05}))
}});
// compose({themeMotif, themeRhythm, scoreStyle, ...}) accepts the same data.
~~~

Positions/durations are fractions of the complete two- or four-bar gesture. The input is validated, copied and frozen. In mixed meters each gesture position maps through the musical bar index, not equal seconds. Schema 2 still clips generated notes at bar boundaries; long custom durations cannot create ties across bars. This pass does not implement arbitrary-length authored theme clips, a visual theme-rhythm editor, transition bridges or long-form silence policy. Studio already preserves its separate authored note timing, including cross-bar notes.

Generator version is now **0.6.0**, score schema remains **2**, and older saved scores remain playable. Preserve the actual score for exact historical playback; generating from the same settings with a newer generator intentionally gives a different arrangement.

## Instrument contract and scheduling

Rack version remains 1 with backward-compatible optional fields:

| Field | Meaning |
| --- | --- |
| synth.frameCosines | Parallel arrays matching sine frames and harmonic counts; omitted means zero cosine coefficients. |
| modulator.depthSource = 'motion' | Scale the modulation signal by the Motion macro before routing. Omitted retains independent full-depth behavior. |
| route.target = 'spread' | Add normalized depth to unison stereo spread, clamped 0–1; distinct from layer pan. |
| effect.spaceDepth | Add (Space − 0.3) × depth to the saved mix, clamped 0–1. Omitted means unchanged mix. |

Macro changes are smoothed on held voices and in offline renders. Space updates existing shared bus gain parameters and does not create another effect graph per knob movement. Source changes and envelope edits take effect on the next attack. Effect topology/configuration changes start a new bounded chain for new notes; older voices/tails retain their chain. Space updates a shared chain at part level while an active voice drives it. Macro automation recording is still future work; offline export reproduces the chosen saved macro values and modulation curves.

Fixed oscillators per wavetable frame, scheduled crossfade gains, 96 sources per note and 256 active sources are retained. Adding harmonics does not add oscillators. This is not a new anti-aliasing design or commercial-synth feature parity. The browser implementation and pure composition/data remain separate; a live Unreal adapter is still unimplemented.

## Verification and interpretation

89 Node tests cover old behavior plus complete quiet hooks, custom rhythmic identity, 32-bar contrast/return, partial mixed-meter equivalence, phase reconstruction, legacy patch compatibility, held-note spread and shared Space bus reuse. HTTP tests include the new module routes. DOM smoke checks preserve authored hooks and navigation.

The isolated native Edge check renders 48 kHz audio, verifies all six factory sounds are finite/non-silent/unclipped at the probe settings, measures an actual Motion change on Cobalt (PCM difference RMS ~0.00885), a Space change on Prism (~0.000835), and a cosine-only frame (peak ~0.0302). It also checks scheduled wavetable movement, sample baking/reimport, keyboard focus, waveform phase saving/copying/removal and responsive layouts. These are engineering checks, not perceived-loudness matching or preference evidence. Extreme settings and every musical passage were not exhaustively listened to.

The frozen [before audit](composition-audit.json) is retained. The separate [after audit](composition-audit-after.json) uses the same 39 sixteen-bar conditions. With the default theme, contemplative/loss output changes from 16 lead notes and two pitches to 32 notes and all five theme pitches over sixteen bars; lead gate lengths change from one to five. In the default-seed 4/4 examples, eight-bar pitch/rhythm/track repeats change from 8/8 comparable pairs to 0/8. The audit's source hashes identify the exact files; sourceCommit identifies the parent commit when sourceFilesModified is true. None of these counts is a score for musical quality. The 32-bar contrast/return is separately verified by tests because that audit spans only sixteen bars.

Listen with the same authored phrase and comparable perceived level. Judge hook recognition, direction, groove, scene fit and fatigue separately. The next decisions should follow that feedback, alongside the still-open items in the two development plans.

## Sources and licenses

The implementations are original code informed by [Hutchinson's phrase/form chapters](https://musictheory.pugetsound.edu/mt21c/MusicTheory.html), [KTH's phrasing research](https://www.speech.kth.se/music/performance/Texts/phrasing.htm), [Phase Plant's signal/modulation model](https://kilohearts.com/docs/phase_plant), [Pigments' synthesis overview](https://www.arturia.com/products/software-instruments/pigments/overview) and the [Web Audio specification](https://www.w3.org/TR/webaudio/). Full research provenance and access limits remain in the linked studies and [ATTRIBUTIONS](../ATTRIBUTIONS.md).

No vendor presets, soundtrack hooks, textbook notation, samples, source code or runtime dependency were added by this pass. Original code/recipes remain MIT. Existing VSCO recordings remain CC0; the separately adapted older theory document retains CC BY-SA. User/imported audio keeps its own license. See [LICENSE-ANALYSIS](../LICENSE-ANALYSIS.md).
