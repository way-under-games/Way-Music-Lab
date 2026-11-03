# Instrument workshop delivery and completion gates

User goal: combine EDM sound-design capabilities with the game-score instrument direction, redesign creation and saving, and turn designed sounds into playable samples for the reusable instrument library. Work takes place in the isolated `codex/instrument-workshop` checkout while the maintained 0.8 studio remains available.

## Required end state

- A visible layered instrument editor with a clear signal path, per-layer enabled state, gain, pitch, pan and envelope. Synth, recorded orchestra and imported/generated samples can coexist in one instrument.
- Audible EDM capabilities: genuine stereo unison, independent oscillator tuning, audio-rate FM with its own depth envelope, independent modulation, useful mono/glide behavior and richer tone/effect processing. Complete original lead/bass/mallet instruments demonstrate them.
- Game-score instruments using sampled and synthetic layers, with expressive envelopes and effects; existing licensed orchestral recordings remain usable.
- A persistent searchable instrument library with names, tags, metadata, save/update, duplicate/recall, and portable export/import including required custom audio. Saving must survive a server/browser restart.
- Sample import with root tuning, playable range, trimming and optional loops. Metadata records authorship/source/license rather than silently treating arbitrary recordings as project-owned assets.
- Render an authored synth/hybrid instrument into one or several tuned samples, save those samples, create a playable sampled instrument from them, and retain the source recipe/provenance. Verify that the sampled result can be used on an authored musical part and exported.
- Keep authored melody/countermelody/note timing intact throughout sound editing, library recall, baking and importing. Keep composition/data contracts separate from browser/engine adapters. A native Unreal renderer remains a separate deliverable and is not implied by MIDI export.
- Preserve cosmic styling, consistent widths, accessible pointer/keyboard paths, guidance and responsive layouts. Make active layers, patch replacement and stored entries unambiguous.
- Original code remains MIT. Asset licenses/provenance stay explicit. Private user library files are excluded from Git; original factory content has reproducible provenance.

## Verification required before completion

Inspect actual schemas, implementations and runtime behavior for every item above. Run meaningful unit/integration checks, native audio/interaction tests, library persistence and portable-package round trips, sample-baking/replay tests, resource/cleanup checks, and desktop/narrow-screen visual inspection. Confirm real audible differences for FM/unison and non-silent, bounded generated/sample instruments. Verify the maintained server, mirror and published Git revision after integration.

An implemented schema, green legacy tests, a mock audio graph, a rendering-only demo or a library with no create/save/bake workflow does not prove completion. Record remaining work explicitly until the full end state is verified.

## Verified implementation

The implementation and limits are recorded in [the workshop guide](instrument-workshop.md). The local release checks pass 81 Node tests, native factory/FM/unison output checks, persistent-store restart and portable round trips, actual UI saving, recording import with original hash, three-root baking, playable sampled recall, authored-score WAV export and unchanged authored hooks. Native pointer tests cover waveform resynthesis and independent drawn modulation connections. All five workshop views fit at 1500/430 px; desktop/narrow screenshots were inspected. The isolated checker owns a dedicated headless browser and ignored test library; it does not attach to the user's browser. Maintained checkout integration and published revision are verified separately at release.
