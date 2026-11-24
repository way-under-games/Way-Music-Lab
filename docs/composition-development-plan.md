# Composition development and listening plan

November 23, 2026 · Proposed decisions, not implemented capabilities · Original Way design: MIT.

The user identifies generated composition as the principal problem. [Research and code evidence](composition-quality-research.md) explain why. This plan turns that evidence into a bounded musical development program. Preserve the existing instrument tools and keep musical policy/data independent of browser or Unreal adapters.

## Musical authorship boundary

The user supplies the melody, countermelody, bass riffs and other recognizable hooks. A theme includes **timing, durations, rests, accents and phrase landmarks**, not just scale degrees. The game keeps the authored identity and seed fixed across playthroughs.

Studio already stores actual authored notes. Use those parts as source material through a portable adapter, instead of building another melody editor or silently correcting their pitches. Record immutable source note IDs and approved transformations. If a material is unapproved, leave it out. A new secondary hook or a recognizable transition motif requires authoring/approval too.

The arranger's role is to choose supporting harmony, voicing, texture, register, articulation and the presentation of approved material. It may propose alternatives for review; it should not rewrite a locked hook to make a generic harmony rule pass. Ambiguous key/mode and intentional non-chord notes need author input or conservative support, not an automatic scale snap.

## Development order

### P0. Preserve the actual musical material

Replace the generated director's eight-degree-only theme input with a backward-compatible path for authored note events. Retain old demos for comparison and migration. Explicitly represent the musical purpose of a phrase: statement, answer, continuation, arrival, return, or intentionally sustained background.

The immediate fault to remove is the quiet branch's accidental reduction to theme slots 0 and 2. A softer arrangement can use fewer repetitions, omit accompaniment, change the lead instrument or lengthen gaps **between complete gestures**, without discarding the defining rhythm. Any augmentation or fragmentation must be approved as a named variant, rather than becoming an opaque consequence of a mood flag.

**Listening gate:** listeners can identify the same source hook in title, contemplative and active versions; they can tap its identifying rhythm. If identity fails, revise the arrangement before expanding the generator.

### P1. Arrange a phrase, rather than filling every bar

Give accompaniment lanes musical roles. Examples: an upper reply in an existing rest, a sustained common tone, a pulse layer, a bass approach, or a deliberately empty lane. Replies that become recognizable countermelodies should use user-authored material. Allow the lead to be exposed, with the rest of the texture entering later.

Each phrase chooses an arrival and a breathing point. A low-density phrase should still have direction through register, bass motion, harmonic timing or articulation. A high-energy phrase should still prioritize a focal line. Not every lane should become busier when danger increases.

**Listening gate:** the intended main line stays audible, a question/answer or other intended gesture is perceptible, and the phrase has a discernible destination. Check a plain sound and the existing game instrument palette separately.

### P2. Add harmony in musical time and note continuity

Represent harmonies as spans with start ticks and durations. Let a chord last across bars or change within a bar. Choose closed/open/deferred cadences and loop entries deliberately. Broaden the available palette only where a study needs it: inversion, pedal, suspended voice, added tone, modal color or a small tonicization.

Separate authored melody from supporting voice-leading. Candidate accompaniment costs can consider register, spacing, bass movement and interaction with structural melody notes. Avoid mandatory four-part classical constraints in every style. A prepared tension should have a named treatment or a deliberate unresolved purpose.

Current generated score version 2 prohibits cross-bar notes. A compatible schema/transport update needs sustained-note identities, phrase-exit carry rules and exact cancellation/note-offs. Do not simulate every tie by retriggering a sample at each bar. Test long notes through meter changes and scene boundaries, including interruption and replay. Studio's different authored-note behavior is not proof that the generated path already supports this.

**Listening gate:** the same harmonic material can sound like a sustained paragraph, a push toward arrival and a suspended question because its timing/voices differ. Prepared suspensions or anticipations are actually audible and carried continuously when intended.

### P3. Develop a controlled rhythmic vocabulary

Keep pulse, meter, additive grouping, note onset pattern and phrase length distinct. Store the designer's rhythmic motif independently of its current bar label. Provide a few approved transformations: a displaced entrance, a shortened repetition, one added/removed subdivision, or a contrasting answer. Agree on the intended return/downbeat before introducing tension against it.

For the user's math-rock and EDM interests, test bass/drum agreement against one deliberately displaced layer. Do not move every part off the beat simultaneously. Odd meters should support a recurring riff, not force an equally spaced four-note melody into every different bar length. Within-bar syncopation, sustained syncopation, polyrhythm and polymeter are separate capabilities and should be named accurately.

**Listening gate:** listeners can locate the underlying pulse and hear a deliberate departure/return. Added complexity should improve the intended character rather than merely increase a metric.

### P4. Plan sections and interactive transitions

Build a small graph of authored/approved sections with compatible entries, exits and durations. A useful first study can use A → varied A → contrasting support/approved material → return, but that is one study structure, not a compulsory form for every game state. Background vamps may remain open; a story resolution may justify a strong ending.

Store phrase/section progression separately from current danger and movement. Character, location, story meaning, immediate threat and recent listening history need distinct inputs. Retain prepared future material and decisions for deterministic seeking. The fixed seed selects reproducible arrangement decisions; it does not invent a different leitmotif on each run.

Choose whether a game event merits immediate musical interruption, the next acceptable exit, a short authored bridge, a layer change or no musical response. Shared-tone transitions, a held pedal or an approved connecting figure can make an exit audible as music. A quantized cut or crossfade alone is not a complete transition plan.

Include deliberate silence/ambient-only intervals and re-entry policy. This is a musical planning proposal; a complete ambience engine is not a prerequisite for testing a rest and thematic return.

**Listening gate:** the player hears purposeful development during a longer session and recognizes returns without hearing the same short restart after every event. Test a calm → control → danger → calm → story sequence as well as rapid event changes.

### P5. Perform the musical plan

Once the phrase works in a simple rendering, add phrase-aware dynamics, articulation, note connections and breaths. Use deterministic performance choices with aligned ensemble anchors. Keep grid-accurate timing available for electronic parts. Do not apply the same rubato or random jitter to every genre or instrument.

**Listening gate:** a listener can distinguish deliberate expressive performance from the neutral version without mistaking ensemble attacks for timing errors. Compare it separately from changes in patches, effects and loudness.

## Proposed portable boundaries

```text
Authored Studio parts + approved variants + scoring brief
                       |
                 Phrase/section plan
        harmony spans, roles, arrivals, rests, exit rules
                       |
           Arranged note and expression events
                       |
         Browser / offline / future native renderer
```

| Proposed data | Main responsibility |
| --- | --- |
| Source material | Immutable note events, rhythmic/accent identity, phrase spans, hook/counterhook role and permitted transformations. Reuse existing Studio material where possible. |
| Composition profile | Intended character, register/texture limits, harmonic vocabulary, cadence/loop behavior and approved accompaniment patterns. Human-authored settings rather than a single complexity knob. |
| Phrase/section plan | Functional role, material references, harmonic spans, breathing/arrival locations, lane responsibilities and tension trajectory. |
| Continuity state | Sustained voices, pending musical exits, next material position and a deterministic choice history. Must not depend on wall-clock or engine objects. |
| Render events | Explicit notes and expression consumed consistently by live/offline adapters; new sustain semantics require a compatible score contract. |

Diagnostics can flag a missing protected hook, accidental uniform duration, unbroken activity, extreme register collision or an unresolvable transition. They should not override creative intent or collapse into a numerical “good music” score.

## Five controlled listening studies before broad integration

Keep an immutable copy of the source hook, source settings and rendered variants. Use equal listening conditions and comparable perceived loudness; document the matching method rather than calling peak matching loudness normalization. Counterbalance A/B order and hide which version is new where possible.

| Study | Hold constant | Change | Main question |
| --- | --- | --- | --- |
| Rhythmic identity | Authored pitches, renderer, intended tempo | Current even spacing versus retained authored timings/rests | Is the hook identifiable and does its gesture survive the quieter arrangement? |
| Phrase purpose | Lead, basic harmonic material, sound | Flat repetition versus differentiated statement/continuation/arrival | Can the listener hear a direction and an intended breathing point? |
| Harmonic timing | Lead and chord vocabulary | Harmonic spans, bass motion and one prepared tension | Does the arrival feel earned, and is the tension stylistically appropriate? |
| Groove | Hook and meter plan | Lane relationships and one approved displacement/return | Is the pulse followable and the return satisfying for this audience? |
| Long form | Approved source material and palette | Repeating eight bars versus planned contrast, return and silence | Does it remain engaging and appropriate during a several-minute game sequence? |

Use separate questions for **liking**, **recognizing the hook**, **phrase direction**, **desired groove**, **scene fit**, **fatigue**, and **distracting from gameplay/dialogue**. Record familiarity and musical taste. A listener might prefer a simpler ambient passage while judging a dense riff more exciting; those are not contradictory results. Start with the user and a small relevant listening group; do not portray that as a population-level validation.

For the reference library, log the exact recording/version, time span, the feature being studied, a factual observation and an interpretation separately. Start with one specific Stardew seasonal track, the original SNES *Simian Segue*, poncle's *Reincarnated Echoes*, one narrative cue and one user-selected math-rock/EDM passage. Existing references and credits are in [the EDM assessment](edm-synthesis-gap-assessment.md) and [game-score study](memorable-game-scores.md). Study relationships, not recognizable melodies to redistribute. These listening/transcription assignments remain outstanding; this research pass did not complete them.

## Acceptance and next build

The recommended next build pairs a **small composition-study prototype covering P0–P1** with the **instrument-character studies** in [the instrument plan](instrument-development-plan.md). The user has clarified that both generated composition and distinctive instrument creation remain unsatisfactory. Composition studies should use existing authored hooks and controlled rendering; instrument studies should use the same simple phrases so the two changes can be judged separately. Expand harmony, sustain, long form and synthesis as the specific listening/design results require them. Neither workstream should be treated as solved by the other's progress.

Code gates remain necessary: unchanged protected source notes, valid timing, bounded density, determinism, overlap/cancellation correctness and live/offline parity. Musical gates are separate: identity, direction, character, groove and longer-session fatigue. Passing schema/unit tests alone is not a completion claim for musical quality.

This proposal introduces no library, pretrained model, music corpus, copyrighted score/audio or engine dependency. Original executable code remains MIT. The research sources retain their own licenses; no source implementation or textbook notation is being imported.
