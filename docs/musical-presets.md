# Ready-to-play music on every tool

Version 0.12 · November 23, 2026 · Original Way compositions and software: MIT.

## Three starting pieces

| Example | Musical shape | Studio instruments |
| --- | --- | --- |
| Lantern trail | Eight bars in D minor, 88 BPM; a lyrical question/answer melody, countermelody, bass, held harmony and a restrained rhythmic entrance | FM mallet, warm answering keys, compact bass, recorded strings and recorded percussion |
| Clockwork grove | Eight changing bars of 7/8 → 5/8 → 4/4 in E minor, 112 BPM; tapped figures, independent bass and a returning cadence | FM mallet, answering keys, bass, organ and recorded percussion |
| Neon tide | Eight bars in A minor, 124 BPM; syncopated melodic lead, articulated bass, offbeat chords and a steady drum groove | Stereo-unison lead, answering keys, mono FM/sub bass, chord stabs and recorded percussion |

The notes are fixed original demonstration compositions, with varied onset/duration/velocity, an answering role and a final cadence. They are editable examples, not an automatic replacement for the user's melody or counterhook. Each has five parts and saved soft-opening, battle and distant-memory sound variations. Scene settings change texture and timbre while retaining note events.

## Where they appear

- **Studio / Compose:** a fresh session starts with Lantern trail, ready for Play parts. Existing saved projects, including intentionally blank scores, are restored unchanged. The Music examples selector is visible from Compose, Instruments and Game score. Load any example, or choose Blank score. Loading is explicit and Undo restores the previous project. Pending recordings and ongoing instrument operations block replacement.
- **Studio / Instruments:** library Hear buttons play a five-note rhythmic phrase in a useful register; bass recipes play lower. Previewing preserves the current patch and note events. The global audition dock adds Hear phrase beside Strike/Hold/Stop, so source, movement, effects, Samples and Save views can all be heard musically.
- **Studio / Game score:** the selected example already has reduced title/opening/loss arrangements and explicit saved scene variations. The danger scene brings back the complete arrangement. These settings remain editable.
- **Score generator:** three matching starting-point presets set the authored motif, rhythmic identity, key, tempo, intensity and meter together. Scene buttons choose the corresponding arrangement style. New theme deliberately returns to seed-generated material. The recorded-orchestra interpretation uses the generator's renderer; the Studio examples contain the full authored synth/hybrid arrangements.
- **Story demo:** three theme palettes supply fixed identities with distinct rhythm and meter. New game keeps the chosen palette; explicitly selecting another palette stops/resets the previous performance. This screen interprets those themes through the recorded orchestra and narrative policy, rather than claiming to reproduce Studio's synth production.
- **Browser game example:** starts from Lantern trail's curated settings and loads the recorded bank on first Start; battle/exploration changes preserve the theme. Stop/Pause/End session cancel a pending start while assets load.

Playback always starts through a user action. The blank-project API still produces empty authored parts. Existing saved sounds and projects are not migrated into demo scores. Project replacement also clears the instrument editor's recalled-library context, avoiding accidental updates to an unrelated saved instrument.

## Validation

92 Node tests cover the three original scores, bounded eight-bar loops, musical roles, independent copies, portable validation, all narrative palettes and stable identity across new games, in addition to the existing suite. DOM smoke tests still exercise an explicitly blank project.

The isolated native Edge test renders all three complete pieces at 48 kHz; all are non-silent and below clipping at their saved settings (peaks approximately 0.096, 0.113 and 0.158). It checks each tool's preset controls, Story reset identity, loading/Undo, blank scores, phrase audition preserving hooks, and fresh-start playback. It also retains the earlier recording, baking, waveform, keyboard and responsive-layout checks. These checks establish working output and preservation, not a listener preference result or exhaustive musical review.

No commercial presets, soundtrack melody quotations, extra samples or runtime dependencies were added. The compositions/recipes and code remain MIT; bundled recorded instruments retain their existing VSCO CC0 attribution. User music/imported recordings retain their own ownership and licenses. See [attributions](../ATTRIBUTIONS.md) and [license analysis](../LICENSE-ANALYSIS.md).
