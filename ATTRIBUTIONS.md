# Attribution and provenance

Audit date: October 5, 2026. This inventory separates redistributed material, adapted code, theory references, and evaluated tools. The repository's original software is MIT; source assets and the theory research document have the separate licenses described in [LICENSE-ANALYSIS.md](LICENSE-ANALYSIS.md).

## Included orchestral recordings and instrument maps

**VSCO 2 Community Edition**, by **Versilian Studios / Sam Gossner** and **Ivy Audio / Simon Dalzell**. Upstream also credits **Elan Hickler / Soundemote** for sample cutting. We preserve the complete upstream credits instead of claiming these instruments as our recordings.

- [Publisher and CC0 statement](https://versilian-studios.com/vsco-community/).
- [Original project](https://github.com/sgossner/VSCO-2-CE).
- [Pinned WAV revision: 440300901dfe9275fd84e0b7763af1f8443ae62e](https://github.com/sgossner/VSCO-2-CE/tree/440300901dfe9275fd84e0b7763af1f8443ae62e).
- [Pinned SFZ map revision: 6dd651d55dde97fd4028699be9d4481f26917891](https://github.com/sgossner/VSCO-2-CE/tree/6dd651d55dde97fd4028699be9d4481f26917891).
- [Upstream license at the WAV revision](https://github.com/sgossner/VSCO-2-CE/blob/440300901dfe9275fd84e0b7763af1f8443ae62e/LICENSE).
- Preserved locally: [LICENSE](samples/vsco-ce/UPSTREAM-LICENSE), [README](samples/vsco-ce/UPSTREAM-README.md), and [full sample credits/readme](samples/vsco-ce/UPSTREAM-Readme.txt).

We redistribute **95 derivative WAVs** (9,666,618 bytes) plus nine original SFZ mapping files in `samples/vsco-ce`. The recordings are violin/cello ensemble sustain and spiccato, harp, flute sustain/staccato, French horn sustain/staccato, bass drum, snare, timpani, and suspended cymbal. The short cymbal sound used on GM note 42 is a deliberately shortened cymbal substitute, not a recorded hi-hat.

[prepare-samples.mjs](scripts/prepare-samples.mjs) selects pitch roots, soft/loud velocity layers and up to two alternate takes. It reads numeric MIDI roots and gains from upstream maps: filenames alone are not a reliable octave convention. [sample-pcm.mjs](scripts/sample-pcm.mjs) downmixes to mono, resamples to 24 kHz 16-bit PCM with a windowed-sinc low-pass filter, trims sustained recordings to three seconds and others to four, adds short edge fades, and constructs crossfaded loops for sustains. These modifications trade breadth and fidelity for a compact browser bank; the loops are our preprocessing, not original upstream loop markers. No peak normalization is applied to individual recordings. Bank and per-role playback gains are our mix choices.

Each region in [manifest.json](samples/vsco-ce/manifest.json) identifies its exact source URL/path, source SHA-256, derivative SHA-256, pitch, velocity range, articulation and take. The manifest, importer, and retained maps make the selection and processing reviewable. Alternate takes are chosen deterministically from event IDs, not with a sequential round-robin counter. The original SFZ files are provenance inputs, not a promise of full SFZ compatibility.

VSCO source recordings/maps are **CC0 1.0**. We keep that designation for derivative recordings. Credits are retained voluntarily and in respect of the publisher's requests. The upstream readme also requests credit and discourages selling the raw samples; those requests are preserved verbatim in the source notice. The formal CC0 license and publisher's CC0 statement are the licensing basis for inclusion. We do not sell this subset as a separate sample library.

## Adapted random-number code and algorithm references

**Mulberry32 — Tommy Ettinger (2017)**: [original implementation and CC0/public-domain notice](https://gist.github.com/tommyettinger/46a874533244883189143505d203312c). Our `randomStream` in [composer.mjs](src/composer.mjs) adapts the JavaScript mixer published by **bryc** in [bryc/code, PRNGs.md](https://github.com/bryc/code/blob/88c1317ea6f9b25c153afa9c369c365fed11b482/jshash/PRNGs.md). The source revision is `88c1317ea6f9b25c153afa9c369c365fed11b482`. Changes include a seed-hashing wrapper and local variable names; the arithmetic mixer is borrowed. The [complete upstream notice](LICENSES/Bryc-MIT.txt) includes a public-domain statement and MIT fallback, copyright (c) 2024 bryc. Keep that notice with redistributed software. This PRNG is for repeatable musical variation, not security or cryptographic randomness.

**FNV-1a — Glenn Fowler, Landon Curt Noll, Kiem-Phong Vo**: used as an algorithm for string seeds and event-to-take selection. [FNV authors' reference](http://www.isthe.com/chongo/tech/comp/fnv/) and [IETF explanatory draft](https://www.ietf.org/archive/id/draft-eastlake-fnv-35.html). Our JavaScript arithmetic is an implementation of the algorithm; no reference implementation or draft prose is vendored. The draft is an Internet-Draft, not a claim of an adopted standard.

## Theory sources

The original composer translates theory ideas into bounded voice-leading costs, chord-tone anchors, resolving ornaments, phrase contours, cadences and accent groups. No source textbook music examples, notation images, exercises, or songs are included. The JavaScript algorithms were written for this project, rather than translated from textbook code.

**Open Music Theory**, current edition: **Mark Gotham, Kyle Gullings, Chelsey Hamm, Bryn Hughes, Brian Jarvis, Megan Lavengood, and John Peterson**, [book and license statement](https://viva.pressbooks.pub/openmusictheory/), CC BY-SA 4.0. Earlier cited online chapters identify **Hybrid Pedagogy Publishing** and Open Music Theory contributors under CC BY-SA 4.0. Sources used:

- [Cantus firmus and melodic tendencies](https://openmusictheory.github.io/cantusFirmus.html).
- [Sentence form](https://openmusictheory.github.io/sentence.html).
- [Embellishing tones](https://open-musictheory.github.io/docs/voice-leading-and-model-composition/strict-four-voice-composition/embellishingTones/).
- [Minor scales](https://viva.pressbooks.pub/openmusictheory/chapter/minor-scales/).
- [Compound meters and time signatures](https://viva.pressbooks.pub/openmusictheory/chapter/compound-meters-and-time-signatures/).
- [Jazz voicings](https://viva.pressbooks.pub/openmusictheory/chapter/jazz-voicings/), evaluated for later harmony work.

Our [music-theory-and-sound.md](docs/music-theory-and-sound.md) includes concise adapted theory summaries and adds our implementation/status analysis. We designate that document **CC BY-SA 4.0** and identify that adaptation here and in its header. It substantially abbreviates the source material, combines concepts across chapters, and applies them to this generator; it is not endorsed by the textbook authors. [License text](LICENSES/CC-BY-SA-4.0.txt).

**Elliott Miles McKinley**, Roger Williams University music theory textbook, copyright 2023, **all rights reserved**: [root-position connection of chords](https://rwu.pressbooks.pub/musictheory/chapter/root-position-connection-of-chords-in-the-major-mode/). Used as a reference for common tones, close motion, spacing, and parallel intervals. We include an original statement of musical concepts, not the author's prose, notation or exercises. This reference is not CC BY-SA; the license on our research document does not grant rights to that textbook's expression.

## Technical references and platform use

Version 0.6's authored studio, harmonic instruments, patch recipes, recorder, modulation, stage policy, piano roll, host adapter, and MIDI/WAV encoders are original MIT code. It imports no Vital, Serum, Sytrus, Ableton, Bitwig or Faust implementation or factory asset. Its harmonic frames are numeric coefficients authored for Way; no external preset/wavetable bank is bundled. Authored studio parts can also use the previously bundled CC0 orchestral recordings, with the same source revisions, hashes, credits, and notices listed above. The native verification screenshots show only Way's original interface and an isolated test project.

The optional [isolated DOM check](scripts/check-studio-ui.mjs) downloads **LinkeDOM 0.18.12**, by **Andrea Giammarchi / WebReflection**, from its npm registry tarball and verifies the registry's SHA-512 integrity before extracting the worker and license into ignored `.cache`. [Upstream project](https://github.com/WebReflection/linkedom), [upstream ISC notice](https://github.com/WebReflection/linkedom/blob/main/LICENSE), and [pinned package metadata](https://registry.npmjs.org/linkedom/0.18.12). It is development-only tooling, not a runtime dependency or redistributed application asset; its cached license is retained. The optional headless check uses a separately installed browser with its own terms and does not redistribute it. Neither check copies code into Way's executable runtime.

[Visual instrument design and keyboard authoring](docs/visual-instruments-and-keyboard-authoring.md) contains original MIT research and design proposals, citing Vital, Xfer Serum 2, Image-Line Sytrus, Ableton Live, Bitwig, browser platform documentation, and Faust documentation. Porter Robinson's credited Image-Line, Atwood Magazine, and Song Exploder accounts inform the workflow discussion. No source code, interface artwork, presets, wavetables, recordings, or article extracts from these references are included. Vital's GPLv3 source and separately restricted presets, and Faust's component-dependent generated-output terms, are research considerations only; neither is added as a dependency.

[Memorable game scores and composition research](docs/memorable-game-scores.md) adds original MIT analysis and exercises based on credited composer interviews, Library of Congress recognition, Classic FM's dated listener polls, Audiokinetic documentation, and the Jakubowski/Finkel/Stewart/Müllensiefen earworm study. Each source is linked beside the supported claim. The document separates documented accounts from proposed Way lessons and records limited retrieval or review scope where relevant. No soundtrack audio, notation, melodies, interview extracts, or third-party code are included. Source authors retain rights to their work; these research references add no runtime dependency or software licensing condition.

Version 0.5 adds original narrative policy and an original placeholder motif. [Narrative scoring research](docs/narrative-scoring.md) links firsthand Austin Wintory and Akira Yamaoka interviews, Naughty Dog's discussion of Gustavo Santaolalla's *The Last of Us* score, and Jessica Curry's *Everybody's Gone to the Rapture* interview page. These acknowledge design references only. No soundtrack audio, notation, transcriptions, proprietary triggering systems or code from those games is included; the new director and document remain MIT. The article authors/composers retain rights to their source expression.

- [W3C Web Audio specification](https://webaudio.github.io/web-audio-api/): platform API for scheduling, buffer sources, playback rate, gains, filters, offline rendering and convolution. No specification text or sample implementation is vendored. Our room impulse is generated by our own code; no third-party impulse recording is included.
- [SFZ format documentation](https://sfzformat.com/) and [drum tutorial](https://sfzformat.com/tutorials/drum_basics/): concepts of velocity regions, alternate takes and one-shot playback. Our manifest/renderer does not import an SFZ runtime.
- [Tone.js Transport documentation](https://github.com/Tonejs/Tone.js/wiki/Transport): lookahead/audio-clock architecture reference. No Tone.js source, package or instrument is included.
- [MIDI Association](https://midi.org/): MIDI terminology and General MIDI instrument conventions; we write our own Standard MIDI File encoder. No MIDI library, proprietary instrument bank, or copyrighted song is included.
- [Node.js](https://nodejs.org/): development/local-server runtime using built-in modules. Node is not bundled or redistributed by this repository; its own distribution licenses apply when installed separately.

## Researched tools that are not included

These projects informed the comparison in [music-research.md](docs/music-research.md), or were evaluated as future renderer/sample options. **They are not imports, dependencies, copied implementations or bundled assets in this release.** Inclusion here acknowledges research, not a license grant or compatibility determination for future integration.

| Project/source | Research role |
| --- | --- |
| [Tone.js](https://tonejs.github.io/) | Browser audio framework; transport concepts noted above. |
| [Strudel](https://strudel.cc/) / [TidalCycles](https://tidalcycles.org/) | Live pattern authoring, scheduling and variable rhythmic structures. |
| [SCAMP](https://scamp.marcevanstein.com/) | Python composition, note/instrument separation, MIDI/OSC. |
| [pyo](https://belangeo.github.io/pyo/) | Python DSP and event processing. |
| [FoxDot](https://github.com/Qirky/FoxDot) | Python patterns and live coding. |
| [Sonic Pi](https://sonic-pi.net/) | Live loops, deterministic variation and authoring. |
| [SuperCollider](https://supercollider.github.io/) | Client/server synthesis and pattern architecture. |
| [Csound](https://csound.com/) | Potential native/WebAssembly sound engine. |
| [FluidSynth](https://github.com/FluidSynth/fluidsynth) | Potential native SoundFont renderer. No SoundFont is bundled. |
| [OpenMPT/libopenmpt](https://lib.openmpt.org/) | Authored tracker playback and native API comparison. |
| [Unreal Harmonix](https://dev.epicgames.com/documentation/unreal-engine/harmonix-plugin-in-unreal-engine?lang=en-US) / [Quartz](https://dev.epicgames.com/documentation/en-us/unreal-engine/quartz-quick-start) | Future engine adapter and audio scheduling. No Unreal code included. |
| [sfizz / SFZTools](https://sfz.tools/sfizz/) | Potential native sampler; no library or bindings imported. |
| [Philharmonia samples](https://philharmonia.co.uk/resources/sound-samples/) | Alternative recording source; no files downloaded into this bank. |

The maintained ComfyUI toolkit referenced in the parent Way workspace generates visual assets. It is not used to compose, render or package this music project; no ComfyUI, Qwen model, model weight or generated visual asset is bundled here. The music lab uses system fonts and original HTML/CSS, with no downloaded font or icon package.

The cosmic Sound playground, six sound-world parameter recipes, harmonic morphing, mutation controls, and original CSS/SVG interface are original Way code and data under MIT. No commercial synthesizer code, factory preset, waveform recording, font, icon pack, or new runtime dependency was imported for this update.

The 0.6.1 drive correction, audio caching/smoothing, export refinements, frontend optimizations, HTTP caching/range support and measurement scripts are original MIT implementation work; no new dependency or third-party asset was added.
