# Version 0.4 verification

Measured October 5, 2026. Original composition generator remains 0.3.0 and score schema remains version 2; 0.4 is the recorded-instrument/packaging update.

## Automated checks

`node --test tests/*.test.mjs`: **36 passed, 0 failed**. Runs with Node 24.19.0; Node >=22 is the declared requirement, not a separately tested version matrix. The browser-host regression test covers bank-preload pause before first start and repeated pause/resume position retention.

Coverage includes repeatable composition and partial-score equivalence; all scene/key/intensity combinations; meter parsing, cumulative tick maps and live changes; lookahead/cancellation/stall recovery; MIDI signatures, programs and note balance; saved schema-v1 scores; theory properties; HTTP route/path/input boundaries; and the new sample bank. The bank checks verify all 95 derivative hashes, pinned source metadata, PCM encoding, file sizes and bounded loop seams. Region-selection checks cover pitch, velocity, articulation, cello/violin split, both alternate takes, deterministic replay and all emitted roles. Loader checks cover SHA-256 integrity and encoded/decoded memory bounds; fake-audio tests check tuned sustain loops, natural hit tails and cancellation. Converter tests reject damaged input and check anti-alias suppression. A fake-audio test does not establish acoustic realism.

## Browser playback and offline export

Tested in the Codex in-app Chromium browser against the local demo:

- Default recorded bank loaded **95 recordings**, **36.9 MiB decoded** on this device/context. Stored WAV payload: **9,666,618 bytes**. A 48 kHz context uses approximately twice the decoded sample memory; default decoded budget is 128 MiB.
- Live mixed-meter battle playback scheduled recorded voices with **0 observed late notes and 0 clock recoveries** during a short audition. Changing sound source paused playback and retained the bar; resuming reused the loaded bank. This is not a long-duration game-load stress test.
- The standalone game-host example preloaded the bank through `BrowserMusic.loadSampleBank`, started recorded playback, and accepted a next-bar battle/tempo update with no observed late notes or voice-limit hits. End-session teardown stopped voices and closed audio.
- Explore, seed `astral-arcana`, D, 92 BPM, energy 0.35, math-rock feel and 7/8→5/8→4/4: **252 sampled / 0 synthesized events**, 20.95654 s including four-second tail, peak **0.1897**, PCM RMS **0.02525**, **0 clipped samples**. [Audio](examples/recorded-math-rock.wav), [settings](examples/math-rock.json), [score](examples/recorded-math-rock.score.json), [MIDI](examples/recorded-math-rock.mid).
- Battle at energy 1 with otherwise identical settings: **298 sampled / 0 synthesized events**, 20.95654 s, peak **0.264**, RMS **0.029**, **0 clipped samples**, as reported by offline rendering. This checks one dense fixture, not universal clipping freedom.

`node scripts/inspect-wav.mjs examples/recorded-math-rock.wav` independently reads the saved PCM file and checks its duration, encoding, peak, RMS and clipped-sample count. The recorded-bank illustration is [sampled-preview.png](docs/media/sampled-preview.png). Technical measurements do not replace listener evaluation, loudness matching or instrument balance review. Offline rendering uses the same bank and deterministic take selection, but different browser/device rates can produce different PCM.

## Readiness against the intended tool

| Goal | Evidence and remaining work |
| --- | --- |
| Procedural, engine-independent music core | Pure JS score/theory modules, renderer interface, JSON/schema and MIDI export implemented. Native packaging needs proof. |
| Fantasy/orchestral sound | Recorded five-role bank, velocity layers, alternate takes, short/sustain articulation, loops and room implemented. Legato, release samples, broader orchestration and expressive dynamics remain. |
| Dynamic signatures and math-rock | Variable cycles, additive accents, syncopated rhythm and MIDI markers implemented. Authored riff vocabulary, ties across bars, true polyrhythm/polymeter remain. |
| Browser game embedding | `BrowserMusic` lifecycle, preloading, state updates and standalone host example implemented. Mobile/device matrix and long game-load tests remain. |
| Unreal live integration | Score/API contract documented; no native Unreal playback adapter or packaged-game test yet. |
| Musically robust transitions | Next-bar state changes work. Phrase bridges, stingers, key/tempo transitions and longer thematic development remain. |
| Redistributable release | MIT original software, pinned CC0 assets, adapted-code notices and separately licensed theory document included. See the license analysis. |

This is a working recorded-instrument prototype, not a finished studio orchestral engine or production-ready engine SDK.
