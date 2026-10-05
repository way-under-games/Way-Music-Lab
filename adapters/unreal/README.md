# Unreal integration contract (not yet implemented)

Keep the composition portable. Unreal owns instrument rendering, its audio clock, and the mapping from game state to musical controls. This folder documents the boundary; it does not contain a compiled plugin or claim in-engine playback verification.

## First in-engine proof

Export a MIDI from the browser lab or `POST /api/v1/midi`, import it through the chosen Unreal MIDI/Harmonix workflow, and map its five tracks to instruments. Verify tempo, onset order, instrument/program mapping, note durations, and termination of every voice. Exporting a file is already implemented; engine import/playback remains to be tested against the user's Unreal version/project.

Epic documents [Harmonix](https://dev.epicgames.com/documentation/unreal-engine/harmonix-plugin-in-unreal-engine?lang=en-US) MIDI generation/manipulation in MetaSounds and [Quartz](https://dev.epicgames.com/documentation/en-us/unreal-engine/quartz-quick-start) audio scheduling. They are adapter candidates; do not assume their clocks are directly interchangeable.

## Live adapter behavior

1. Request upcoming bars asynchronously from the local service during development, or compose through an in-process/native/WASM implementation in a packaged game. Send seed, scene, intensity, tempo, key, rhythm, meterCycle, startBar, and bars. After live meter changes, supply the accumulated startTick rather than deriving elapsed time from the new cycle. Do not block the audio thread on HTTP or composition.
2. Validate `schemaVersion`, `generatorVersion`, PPQ, and events before they reach audio rendering. Store an ordered, bounded queue. Choose an explicit local audio-clock origin for the first bar.
3. For schema version 2, convert each onset relative to the batch's start: `(event.startTick - score.startTick) * 60 / tempo / ppq`. Convert duration with the same quarter-note tempo. Read bar boundaries, time signatures, and accent groups from barMap; do not assume fixed bar length. Map `strings`, `harp`, `woodwind`, `horn`, and `percussion` to local instruments.
4. Commit game-state changes at a known future boundary. Track a revision token for asynchronous requests; discard stale responses. Prefetch enough music for latency/stalls, but bound prefetch so reactive changes are not delayed by many committed bars.
5. On request failure keep an already validated phrase available as fallback, or fade to silence; report the fault. Never synthesize a burst of expired notes when a response arrives late.
6. On stop, level unload, device changes, or component destruction, release every voice and clear queued notes. Do not leave note-offs dependent on a discarded game object.

The sidecar only supplies musical data. It does not currently share its clock with Unreal, route PCM into Unreal, create MetaSound nodes, expose Blueprint components, or package itself for players. Those are native adapter requirements, not properties inferred from HTTP availability.

## Acceptance gate

Before claiming a drop-in Unreal tool: implement the adapter, build it for a specified Unreal version, play it in-editor and in a packaged game, test Explore -> Battle -> Victory while notes are sounding, inspect no stuck voices on stop/unload, test delayed/missing responses, and measure latency/CPU/voice counts under game load. Audio quality also needs listening review with the selected orchestral bank.
