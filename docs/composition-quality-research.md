# Why the generated compositions feel static

November 23, 2026. Original code audit, synthesis and proposed research questions: MIT. The user clarified that the main concern is **generated composition**, rather than instrument sound. This report studies the current generator and composition literature. Proposed implementation decisions and listening experiments are in [the separate development plan](composition-development-plan.md).

## What this investigation establishes

The application has developed substantially as an instrument and authoring tool. Its generated-score composer still uses a small, largely unchanged pattern system. Earlier descriptions of a composition “foundation” being implemented were technical milestones, not evidence that the resulting music had become expressive or compelling.

This pass reviewed primary composition teaching material, original empirical studies, composer/developer accounts, and the actual note output of the maintained code. It did **not** conduct a listening panel, transcribe the named soundtracks, or identify their exact harmony from audio. Technical regularity is evidence about behavior, not proof of a listener's experience.

The reproducible [audit data](composition-audit.json) covers **39 generated sixteen-bar scores**, thirteen settings across three seeds. Run:

```powershell
node scripts/audit-composition.mjs docs/composition-audit.json
```

The report records the checked-out commit, SHA-256 of the three generator/policy files, complete tested settings and metric definitions. All generated scores pass the existing validator. The composer and audio behavior have not been changed by this research pass.

## Code and output findings

### 1. The narrative theme does not contain rhythmic identity

`ScoreDirector` stores the theme as eight scale-degree numbers. `composer.mjs` places four of them at equal intervals across each normal narrative bar, or two for quiet profiles. Duration is a single fixed fraction of that spacing. This representation cannot retain an authored pickup, long-short figure, syncopated hold, internal rest or accented arrival. By comparison, Studio's authored parts already contain actual note start/duration data; that existing material is a useful source for future arrangements.

With the default authored theme, in 4/4:

| Profile | Lead pitches across sixteen bars | Distinct lead durations | Lead onsets shared with another part | Pitch/rhythm/track pattern repeats eight bars later |
| --- | --- | --- | --- | --- |
| Title | D4, F4, A4, G4, E4 | 1 | 26.7% | 100% |
| Contemplative | **D4, A4 only** | 1 | 100% | 100% |
| Playful | D4, F4, A4, G4, E4 | 1 | 100% | 100% |
| Danger | D4, F4, A4, G4, E4 | 1 | 100% | 100% |
| Loss | **D4, A4 only** | 1 | 100% | 100% |

The quiet branch reads motif positions 0 and 2 on even bars; it suppresses the odd bars that would have introduced positions 4 and 6. It repeatedly retains just two of the eight source positions. Two-note music can be powerful. The concern here is unintended loss of source identity coupled with uniform rhythm and repetition, rather than a deliberate minimalist composition.

The comparison ignores randomized velocities and requires matching meter/grouping. All sampled 4/4 conditions repeat their pitch, rhythm and track allocation exactly after eight bars. The mixed three-bar meter cycle has no matching-meter pairs at an eight-bar offset in this audit, so its corresponding value is **not applicable**, not zero repetition.

### 2. Harmony has a fixed vocabulary and fixed placement

`theory.mjs` has four hard-coded eight-bar progression arrays. Explore and Battle share one array. For each ensemble scene, all three audited seeds produce one identical chord-voicing plan. Harmony records hold exactly three notes and are indexed once per bar; repeated adjacent entries often prolong a chord, but there is no within-bar harmonic change in these outputs.

Triads and repeated progressions are useful musical materials. What is missing is a way to choose the duration and dramatic purpose of a harmony: linger, prepare, accelerate, interrupt, evade a cadence, or settle. Changing a seed does not supply those decisions.

### 3. The ensemble melody favors safety more strongly than direction

`nearestChordTone` scores local movement, penalizes larger leaps and weakly attracts a note toward its target. This is a useful continuity heuristic, but it is not a complete melodic-development model. The continuation alters pitch targets without a corresponding plan for rhythmic fragmentation, phrase expansion, register trajectory or different cadential strength. This finding concerns the **ensemble branch**; the narrative branch instead reads the fixed theme directly.

Reducing leaps or increasing chord-tone percentages should not be treated as a quality objective. Either can flatten an intentional hook. The authoring system should retain the user's actual melody and countermelody, including purposeful non-chord tones.

### 4. Bar boundaries cut off musical possibilities

`compose` clamps each duration to the current bar. `validateScore` also rejects cross-bar notes in score version 2. Therefore all 39 outputs have zero cross-bar notes. An offbeat short note is still possible, but a held anticipation across the bar or a continuously sustained voice over a bar-line harmony change is not represented by this generated path. This restriction does **not** apply to Studio's authored-note path, which has separate behavior.

The present event data also lacks explicit preparation/suspension/resolution, breath, phrase role or articulation intent. A renderer cannot infer all of that from a clipped note duration and a velocity.

### 5. Accompaniment behaves like an always-running backing pattern

Strings mostly sustain a chord or repeat it at a fixed interval. Harp follows a repeating arpeggio index pattern. Horn entries follow small fixed beat lists, and bass largely reinforces harmony roots. Math-rock mode synchronizes many ensemble attacks to the additive group map, then repeats short tapped figures. The audited full ensemble conditions each have one per-bar instrument-activity set.

The shared-onset statistic in the table is only a clue to ensemble dependence: it is not a syncopation score or a judgment against deliberate unison accents. Missing choices include accompanying *around* a lead phrase, answering in its gaps, dropping the harmonic pad, changing the bass function, and reserving a fill or register expansion for an arrival. The procedural tool has no independently authored countermelody lane; Studio already provides one for user material.

### 6. The director changes state more readily than musical form

The policy already provides useful danger hysteresis, safe scheduling boundaries, narrative cue priority and gradual tempo/intensity movement. Its profiles mainly select scene, speed, intensity, track gains and a rhythm switch. It does not plan a contrasting middle, delayed thematic return, character arc, long-range peak, or deliberate stretches of no music. Scene boundaries can consequently be technically clean without acting as convincing musical transitions.

## What the literature contributes

### Phrase function and purposeful return

Robert Hutchinson's [sentence](https://musictheory.pugetsound.edu/mt21c/SentenceStructure.html) and [period](https://musictheory.pugetsound.edu/mt21c/PeriodForm.html) chapters distinguish development of an idea toward a cadence from pairs of phrases with differing degrees of closure. These are useful form models for tonal examples, not universal game-score templates.

**Way inference:** a phrase should have a job, such as statement, answer, continuation, arrival or return. The current eight-frame table identifies phase but supplies too little differentiated behavior. Simply changing notes on pass two does not establish a convincing answer.

Alan Belkin's [*A Practical Guide to Musical Composition*](https://epe.lac-bac.gc.ca/100/200/300/alan_belkin/practical/pdf/form_book.pdf?nodisclaimer=1), credited to Alan Belkin and preserved by Library and Archives Canada, discusses perceptible progressions and relationships between preparation, peak and release. Change can involve register, texture and rhythmic activity as well as harmony. The book is a composition-craft source, not an empirical adaptive-game study.

**Way inference:** intensity needs an evolving trajectory and somewhere to arrive. A permanently fuller version of the same pattern provides little dramatic shape. Conversely, an exposed, quiet arrival can matter more than another layer being added.

### Harmony is also a timeline

Hutchinson's [harmonic-rhythm chapter](https://musictheory.pugetsound.edu/mt21c/HarmonicRhythm.html) treats how long harmonies last. His [suspension chapter](https://musictheory.pugetsound.edu/mt21c/Suspension.html) describes a prepared note becoming dissonant and resolving by step.

**Way inference:** an arrangement needs explicit harmonic spans and the ability to carry a voice through a change. Suspensions, pedal points, inversions, added tones and modal colors should be chosen for a musical purpose and style. Adding seventh chords everywhere would not repair the present rhythmic and formal restrictions. These tonal techniques also should not become mandatory resolution rules for ambient, horror or other deliberately ambiguous writing.

### Accompaniment can have its own identity

The [arpeggiated-accompaniment](https://musictheory.pugetsound.edu/mt21c/ArpeggiatedAccompaniments.html) and [distinctive-bass-line](https://musictheory.pugetsound.edu/mt21c/DistinctiveBassLines.html) chapters distinguish voicing/pattern choices and recognize that a repeated riff can carry a piece's identity.

**Way inference:** users must be able to supply bass riffs and rhythmic hooks as well as the lead. Generated support should be able to alternate between pedal, moving bass, broken chord, held texture and silence, while keeping those supplied hooks intact. More notes in every lane would often make the hierarchy worse.

### Groove combines a learnable reference with rhythmic tension

Witek, Clarke, Wallentin, Kringelbach and Vuust's 2014 [original study](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0094446) tested funk drum-break patterns with 66 survey participants. Intermediate syncopation received the strongest average ratings for pleasure and desire to move in that task. This does not establish an optimum for math rock, all listeners or narrative underscore, and it does not show that random jitter produces groove.

**Way inference:** meter, subdivision, accent pattern, riff rhythm and phrase duration need separate representation. An audible pulse can remain stable while a riff displaces against it. Alternating 7/8 and 5/8 is not by itself a rhythmic vocabulary; neither is it automatically polyrhythm. Ensemble accents should sometimes agree and sometimes be deliberately independent.

### Expectation research argues against a universal interest score

Gold, Pearce, Mas-Herrero, Dagher and Zatorre's 2019 [original study](https://www.marcus-pearce.com/assets/papers/GoldEtAl2019JNeuro.pdf) modeled listeners' responses to predictive complexity and context in real musical excerpts. Its findings support studying expectation and learning, rather than indiscriminate novelty.

Mas-Herrero and Marco-Pallarés' 2025 [PNAS study](https://www.pnas.org/doi/10.1073/pnas.2500494122) used a design that separated surprise and uncertainty and examined individual preferences. It reported a different surprise/uncertainty interaction from earlier work and explicitly discussed sampling/confounding concerns in previous designs. Both listener differences and the musical context matter. These papers do not give Way a validated formula for a good soundtrack.

**Way inference:** keep familiar material available, make a few changes perceptible, and evaluate them with the intended listeners. Do not optimize pitch entropy, syncopation count or surprise as a standalone musical objective. Our audit measures diagnose constraints; they are not a substitute for preference or narrative-fit judgments.

### Expressive performance follows musical structure

The KTH research group's [performance-rule introduction](https://www.speech.kth.se/music/performance/performance_intro.html) and [phrase-arch demonstration](https://www.speech.kth.se/music/performance/Texts/phrasing.htm) describe context-dependent timing, duration and loudness treatments, including phrase punctuation. They provide examples of score-aware performance modeling, not evidence that every genre should use the same arch.

**Way inference:** annotate gestures, breaths and arrivals, then shape articulation and dynamics around them. Keep the game clock stable where needed; expressive note treatment need not mean continuously changing the global tempo. Random offsets should not be the first attempt at expression.

## Composer accounts relevant to our references

- In his [Library of Congress interview](https://lcweb2.loc.gov/static/programs/national-recording-preservation-board/documents/koji-kondo-interview.pdf), **Koji Kondo** discusses contrasting motifs and the interaction of even subdivisions with a triplet hi-hat in the Mario theme. This supports investigating rhythmic relationships and contrasting ideas. It does not prescribe the specific rhythm for Way or prove what made the score memorable.
- **ConcernedApe's [own Stardew development update](https://www.stardewvalley.net/dev-update-16/)** describes season-specific atmosphere and ambient sound between songs, rather than endlessly looping outdoor music. This is directly relevant to musical pacing: meaningful returns and non-musical space belong in our design. It does not establish the chords or form of any individual seasonal track.
- **Austin Wintory's [GDC session description](https://www.gdcvault.com/play/1015569/Journey-vs-Monaco-Music-is)** explicitly identifies narrative arcs at multiple structural scales and the reconciliation of adaptivity with musicality. Only the published description was reviewed here, not the full recorded talk.

The previous [game-score research](memorable-game-scores.md) remains useful for *Journey*, *Everybody's Gone to the Rapture*, *The Last of Us* and *Silent Hill 2*. It should be used as a set of musical questions, not a bank of automatic mood labels. *Simian Segue*, *Reincarnated Echoes*, the Stardew tracks, EDM and math rock still need focused, version-specific listening notes before we claim detailed analyses of their compositional devices.

## Conclusion and limits of this pass

The evidence points first to theme rhythm, phrase/section behavior, independent accompaniment, harmonic timing, sustained note continuity and expressive intent. It does not establish that any one new chord, style rule or statistical score will sound better. The next implementation should earn its place through the controlled studies in [the development plan](composition-development-plan.md).

No soundtrack audio, score images, textbook exercises, source prose or third-party algorithm implementation has been incorporated. The links remain their authors' work. This original audit and Way-specific synthesis are MIT; the older adapted [theory document](music-theory-and-sound.md) retains its separate CC BY-SA designation. Nothing in this research changes the executable software or recording licenses.
