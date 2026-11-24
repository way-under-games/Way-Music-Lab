# Instrument character development plan

**Implementation follow-up:** [version 0.11](musicality-update.md) implements a bounded first pass. The remaining proposals below are not all implemented.

November 23, 2026 · Proposed work, not implemented capabilities · Original Way design: MIT.

Instrument creation and composition both remain active problems. The [current instrument audit](instrument-character-audit.md) identifies actual limits after the 0.9/0.10 upgrades. Coordinate this plan with [the composition studies](composition-development-plan.md); do not defer one until the other is considered complete.

## 1. Make the existing controls and representations trustworthy

- Supply audible, instrument-specific macro mappings in starting recipes. A movement control should create an understandable change without requiring matrix construction first. Distinguish an unassigned macro from an active control.
- Add explicit destinations for actual stereo spread and selected effect parameters, with documented live/offline semantics. Moving pan is not the same operation as changing unison width. Animate shared processing at part level where appropriate, rather than allocating a new effects chain for every parameter update.
- Preserve phase-bearing waveform information when drawing/importing cycles. Maintain old patch compatibility and clear limits. Check a cosine, asymmetric cycle and multi-harmonic phase pattern; also check table blending, normalization, saved recall and live/offline output. An editor should show the signal that will be reproduced.
- Mark edits that affect the next attack versus a held note. Show effective constraints when anti-aliasing/resource policies reduce a requested setting. Keep limits, but avoid letting the interface imply that every maximum can be combined.

## 2. Build complete instruments as acceptance studies

Start with three deliberately contrasting original recipes: an articulated moving bass, an organic struck instrument and an evolving pad. Test the wide lead and found-sound path as the next pair. Include different attacks, sustained behavior, register response and note-release behavior, not just different static waveforms.

Each study needs an intelligible signal path, a useful default playing range, velocity response and a few named controls that produce meaningful, bounded changes. Add specific synthesis capabilities only where the study is blocked. The instrument should remain useful with effects bypassed; assess the intended processed identity too.

Compare the same note, a sustained note, a short user-authored phrase, lower/upper octaves and both soft/hard playing. Match perceived level as carefully as practical and document the method. A brighter/louder output or a different spectrum is not by itself proof of a more interesting instrument. Record the user's preference and whether they can deliberately reach a desired character.

## 3. Expand interaction and source transformation

For the moving-bass study, prioritize a bounded oscillator-interaction/warp path and resonant/formant shaping with independent articulation. For organic struck sounds, evaluate an excitation/resonator model. For personal textures, evaluate source-to-table preparation and then grain/slice processing. Preserve the ability to keep a clean sub or attack separate from heavily processed material.

Provide a small set of explicit serial/parallel routing choices before an unrestricted modular graph. Feedback needs stability/gain constraints. Choose a rendering architecture that can support denser tables and unison together without one permanent oscillator per frame; verify band limiting, CPU/memory bounds and the same saved behavior in offline renders. Do not treat a UI label or native oversampling switch as proof of a complete anti-aliasing design.

Personal source provenance must survive editing, resampling and export. Do not distribute commercial presets or sample libraries as part of an MIT code release. The user's own recordings can supply identity; creation should include useful ways to transform them, not only import them.

## 4. Make instruments playable and editable over time

Add intentional performance mappings for velocity, pitch gestures and supported pressure/slide controls. Record chosen macro/timbre automation and reproduce it in exported audio. Preserve authored melody/countermelody events while editing sound.

Provide structured exploration: audition a family, move a few expressive controls, compare a variation, retain the result, render a sample if useful, and return to its recipe. Constrain mutations by instrument role; randomize articulation or character coherently rather than changing every parameter independently.

## Musical acceptance

A successful pass should let the user make recognizably different bass, struck, pad and personal-source instruments on purpose, save them, reopen them, perform a phrase and export the same behavior. It should also demonstrate both EDM and game-score uses. Existing non-silence, clipping, FM and stereo tests remain necessary engineering checks; the user must judge the musical payoff.

This is a scoped development proposal, not a claim that the current engine already implements these stages or that a feature count will produce an artist's signature sound.
