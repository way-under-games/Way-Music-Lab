# Scrutinizing the actual musical construction

Version 0.13 · November 23, 2026. Original engineering and musical analysis: MIT.

The v0.12 checks established playable, valid output. They did not establish convincing composition. Calling three transpositions of one melody three distinct musical examples overstated their compositional variety. This review starts from the actual notes and their relationships, rather than counting synthesis features or treating test success as artistic approval.

## Findings and corrections

| Observed in v0.12 | Musical consequence | Implemented correction |
| --- | --- | --- |
| All three Studio leads used the same ordered pitches after reversing transposition. | Different sound, tempo and meter did not supply independent melodic ideas. | Three independently written lead lines, with different rhythmic cells, contours and harmonic/formal plans. |
| Clockwork multiplied 4/4 event positions by the length of each odd bar. Fifteen of its 28 lead starts fell outside the sixteenth-note grid. | The advertised additive-meter study unintentionally redistributed subdivisions instead of establishing a consistent eighth-note pulse. Off-grid music is valid; this was a mismatch with this example's intended groove. | Native quarter-beat positions for each actual bar; bass attacks mark additive groups and drums maintain the subdivision. The generated Clockwork theme explicitly opts into an eighth-note placement grid. |
| The narrative generator played a fixed hook over a chord list chosen without consulting that hook. | Repeated exposed tensions could lack an intended melodic/harmonic relationship. | A melody-first accompaniment planner evaluates triad choices across eight bars against the immutable hook, its duration/onset emphasis, stepwise embellishment candidates and chord-to-chord movement. |
| A dominant's raised seventh could change the hook's natural seventh. Victory also changed the hook's scale through scene selection. | The supposedly fixed musical identity could change interval content without an explicit authored variation. | Hook pitches now come from an explicit stable theme mode. Accompaniment may use a raised leading tone; it does not silently rewrite the theme. |
| More section labels and variable note lengths were treated as evidence of phrase purpose. | Labels did not demonstrate a question, response, climax or arrival. | The tonal studies now have an explicit open first-phrase ending and a stronger final tonic arrival, with rests; the EDM study uses a modal return instead of imposing a classical dominant cadence. |

Existing saved Studio notes are not rewritten. Changed examples appear on a fresh session or an explicit reload. No diagnostics automatically “correct” a user's melody, countermelody, tuplets, chromaticism or intentional dissonance.

## Theory applied in context

**Melody and dissonance.** A pitch outside a triad is not intrinsically an error. Its preparation, metrical emphasis, duration, continuation and harmonic context matter. Hutchinson's [non-chord-tone introduction](https://musictheory.pugetsound.edu/mt21c/NonChordTonesIntroduction.html) distinguishes embellishments through the motion into and out of them. The analyzer therefore reports candidates and review locations, not forbidden notes or a universal consonance grade.

For example, Lantern trail begins with D–F–A, then moves A–G–F over D minor. The intervening G is supported by descending stepwise motion; forcing it onto a triad member would remove that gesture. In Neon tide, C over D minor supplies a minor-seventh colour before transposition to A minor. In its generated interpretation, G over A minor and E over F major can likewise complete seventh colours. The report's simple triad comparison does not recognize all such harmonic extensions; those locations require interpretation, not automatic deletion.

**Phrase and cadence.** A final tonic note alone does not prove a convincing cadence, and a phrase need not always close. Hutchinson's [cadence chapter](https://musictheory.pugetsound.edu/mt21c/cadences.html) separates different types of arrival. [Sentence construction](https://musictheory.pugetsound.edu/mt21c/SentenceStructure.html) also connects the handling of a basic idea and continuation to a directed ending. These are useful lenses for these tonal examples, not mandatory templates for every ambient, EDM or game cue.

The new fantasy and meter studies use **i–VI–iv–V / i–VI–V–i** in their respective minor keys. Bar four ends on the dominant, leaving an open question. The second phrase varies the opening, then the final lead approaches tonic from the raised leading tone over V–i. The final arrival has a longer note and breathing space. Inner chord voices also move from C-sharp to D in the untransposed D-minor model. Clockwork composes those gestures within its actual 7/8, 5/8 and 4/4 bars.

The EDM study instead uses **i–VI–III–VII / i–VI–VII–i**, a syncopated motif, an upper-register lift and a lower final return. Its VII–i ending is a modal return; it is not described or tested as a classical authentic cadence. The synthetic palette alone does not determine the composition's style.

**Harmonic rhythm and direction.** Harmony changes have timing and structural roles, not just acceptable pitch classes. Hutchinson discusses [harmonic rhythm](https://musictheory.pugetsound.edu/mt21c/HarmonicRhythm.html); Belkin connects [movement and variety](https://alanbelkinmusic.com/general-principles-of-harmony-movement-interest-and-variety/) to tension, texture, register and larger-scale progression. His discussion of [line and contour](https://alanbelkinmusic.com/counterpoint-line/) also treats leaps and registral extremes as salient events. These motivate asking where a gesture aims and where accompaniment yields, rather than adding arbitrary activity.

The revised answering part enters after the main phrase releases, rather than simply occupying preset late-bar positions that may overlap it. Bass and chord figures retain different responsibilities. However, general harmonic-span planning and prepared cross-bar suspensions remain unimplemented in the generated score core. One chord record per bar and bar-clipped notes are significant limits; adjusting velocities and gates does not solve them.

## Implementation boundaries

The new pure theme-harmony module uses a small deterministic search over tonal triads and their sequence. It weights melodic support, short stepwise embellishment candidates, reference progression and root movement; existing voicing then realizes the chosen harmony. Its coefficients are Way design choices, not experimentally validated laws of good music. It does not prove a complete non-chord-tone analysis, guarantee a cadence for any supplied hook, infer arbitrary modes or implement sophisticated reharmonization. The existing non-narrative ensemble path is unchanged.

Optional portable settings are themeMode ('minor' by default, or 'major') and themeGridTicks (null by default; explicit 60/120/240-tick placement). ScoreDirector accepts the corresponding theme.mode and theme.gridTicks. Default custom rhythmic input is not snapped. A bar too short for distinct requested grid positions retains its authored timing. Theme grid placement changes onsets only when explicitly selected; it preserves pitch order. Generator version is **0.7.0**; score schema stays **2**. Retain actual saved events for historical replay.

## Evidence and listening

The repeatable script is **node scripts/audit-theory.mjs report.json**. The frozen [before report](theory-review-before.json) pins v0.12; the separate [after report](theory-review-after.json) identifies source hashes and commit/tree state. Across the three presets and four generated scenes, the prior review found 39 instances of theme pitches differing from the fixed minor-key hook. The update has zero in that same scope. This checks identity preservation, not which version a listener prefers. Fewer triad mismatches is also not, by itself, musical improvement.

97 Node tests include fixed major/minor identity through all narrative profiles, partial mixed-meter generation, harmony responding to different hooks, independent demo melodies, harmonic/modal arrival intent, explicit breathing space, group pulse and preservation of deliberate passing/seventh colours. Native 48 kHz rendering and UI checks pass for all three examples. They establish functioning output, not a musician's artistic endorsement.

A local A/B study additionally renders old and new example notes through the same dry triangle instrument, with percussion muted. Files are matched by RMS over the musical loop, excluding the exported tail. That controls one crude level measure, **not perceived loudness**. It separates note/arrangement changes from instrument and reverb differences; it is not a blind study. Listen for phrase direction, retained identity, pulse, convincing tension/release and fatigue separately. No listener preference result is claimed here.

Still needed: user listening feedback, stronger independent counterlines, harmonic spans inside/across bars, genuine development over minutes, intentional silence, and transition voice-leading between committed game states. The existing named soundtrack references have not been transcribed in this pass. More theory features are not a substitute for that listening work.

## Provenance

Sources above were reviewed as theoretical/compositional references. No textbook music examples, notation, prose passages, soundtrack hooks, vendor algorithms, presets or new runtime dependencies were copied into the implementation. All new code, demonstration notes and analysis are original MIT contributions. Existing CC0 recordings and the older separately CC BY-SA research document retain their own licenses; see [attributions](../ATTRIBUTIONS.md) and [license analysis](../LICENSE-ANALYSIS.md).
