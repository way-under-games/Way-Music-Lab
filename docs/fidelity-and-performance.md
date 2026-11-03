# Fidelity and optimization pass — 0.6.1

Verified November 2, 2026. This pass improves the existing original MIT runtime without adding packages, synth engines, recordings, or external services. Project/patch schemas remain version 1 and authored notes are preserved.

## Audio

- **Clean drive bypass:** zero drive now bypasses the waveshaper. Previously even zero applied a tanh curve. Nonzero drive approaches the clean signal continuously, uses an odd-length symmetric curve with an exact zero midpoint, and retains 2× oversampling. Existing low-drive patches sound cleaner and may be quieter because the unintended saturation/gain is removed.
- **Full-quality exports:** the studio defaults to 48 kHz stereo PCM, with 44.1 and 24 kHz options. The portable `renderStudioWav` API retains its 24 kHz default for compatibility. The selected rate is an export preference, not part of the musical project contract. Live audio continues at the device's AudioContext rate.
- **Long delay tails:** offline rendering retains at least six seconds after the last note release and extends that allowance for high feedback, using a −60 dB feedback-decay estimate. The three-minute total-render limit still applies.
- **Stable held envelopes:** changing ADSR while holding a note no longer changes that note's eventual release envelope. New attacks use the updated amplitude settings. Filter/modulation controls still update live.
- **Smoother previews:** repeated sound auditions release the previous preview rather than cutting its waveform immediately. Preview releases remain subject to the shared 32-voice bound; Stop and All notes off cancel preview audio.
- **Less repeated graph work:** context-local harmonic-wave caching (128 entries), one immutable patch snapshot per changed part, no silent oscillator allocation, and suppression of unchanged parameter targets. Changed frame coefficients and normalization receive fresh cached waves. Live graph topology remains fixed for each attack.
- **Reliable control timing:** gameplay macro smoothing uses elapsed audio time, capped after long stalls. When mappings share a target, the last enabled mapping supplies both its value and smoothing time. A stopped browser host cannot restart when an earlier resume/preload promise finishes. Scheduler failures stop the host and are exposed through `getStatus().error`.
- **Sample reuse and cleanup:** the studio reuses its verified decoded bank for offline exports, and the renderer disposes its engine on success or failure. Export controls block simultaneous renders and restore themselves after an error.

## Frontend

Analyzer buffers are allocated once per engine rather than each frame. Scope/spectrum work is limited to 30 fps, skips off-screen monitors, and stops after idle delay decay. Hidden documents skip visual/control polling. Audio scheduling remains independent of the visual frame limit at its existing 25 ms lookahead tick.

After initial setup, note edits rebuild the visible workspace rather than every hidden sound/game editor. Switching workspaces refreshes their controls. Waveform drawing initializes its 256-point cycle once, replacing 256 complete recalculations per pointer-down. The cosmetic theme and browser/on-screen keyboard behavior remain available.

## Local backend

Whitelisted source/sample files use a 16 MiB LRU byte cache. Every request checks filesystem metadata so local edits invalidate cache entries; concurrent identical reads share one promise. This is a development-server cache, not a content-addressed release CDN. Weak ETags and `private, no-cache` let browsers revalidate without downloading unchanged bytes; application responses retain `no-store`.

Sample and rendered WAV responses support HEAD and a single byte range, including suffix ranges. Unsatisfiable/malformed ranges return 416; multipart ranges are deliberately unsupported. Weak If-Range requests receive the full representation. Rendered WAVs stream from disk rather than loading the full file into a response buffer. Missing allowed files now return 404, and disconnected responses do not attempt a second error response. Existing path whitelists and upload/body bounds remain in force.

## Evidence

Run `node scripts/measure-runtime.mjs` for deterministic work counts using the same scenario as the pre-change baseline. These are allocation/automation counters, **not CPU speed, latency, or perceptual-quality measurements**.

| Scenario | Before | After |
| --- | ---: | ---: |
| Buses created by 100 idle player ticks | 3 | 0 |
| PeriodicWave builds, 100 repeated two-frame/two-oscillator attacks | 400 | 2 |
| Patch structured clones in those attacks | 100 | 1 |
| Patch structured clones, 16 held voices × 100 ticks | 1,600 | 0 |
| Parameter targets in the held-voice scenario | 18,500 | 7,936 |
| Conditional repeat module response | 200 / 20,501 bytes | 304 / 0 bytes |

The native Chromium test renders a sine at 48 kHz with zero drive: measured third-harmonic/fundamental amplitude is approximately 0.000145 (0.0145%); with drive 1 it is approximately 0.02644 (2.64%). This checks one harmonic, not total harmonic distortion or an aliasing benchmark. All six world probes remain non-silent and below clipping for the tested single-note cases. High-feedback export keeps an extended tail. The real interface exports a recorded instrument at 48 kHz with zero additional bank requests.

69 tests pass, including audio-cache invalidation, envelope stability, idle graph behavior, mapping timing, pending-start cancellation, HTTP validators, HEAD, ranges, and existing score/asset regressions. Dedicated headless checks cover native WAV/audio, pointer exploration, recording, restoration, exports, and six desktop/mobile layouts. See [recorded studio measurements](studio-verification.json) and [verification](../VERIFICATION-0.6.md).

Physical audio-device latency, physical MIDI controllers, mobile hardware CPU/battery, arbitrary polyphonic clipping, subjective loudness matching, and cross-browser DSP equivalence remain unmeasured. The synth still uses control-rate modulation and eight harmonic partials per frame; this pass does not add audio-rate FM, unison, granular synthesis, or native Unreal rendering.
