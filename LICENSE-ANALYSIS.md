# License analysis and distribution boundaries

Reviewed October 5, 2026 against the pinned sources in [ATTRIBUTIONS.md](ATTRIBUTIONS.md). **The original software can be released under MIT. No included runtime library or sample bank requires that software to become copyleft.** The repository contains multiple separately licensed categories; an MIT label does not relicense other authors' recordings or textbook summaries.

## What is covered by which license

| Material | License and scope | Distribution action |
| --- | --- | --- |
| Original `src/`, `web/`, `server.mjs`, `scripts/`, tests, schemas, examples, and original documentation other than the exception below | [MIT](LICENSE), copyright 2026 Way Under Games contributors | Include the MIT copyright and permission notice with copies/substantial portions. Commercial games, modifications and closed-source hosts are permitted. |
| Adapted Mulberry32 mixer in `src/composer.mjs` | Original Tommy Ettinger implementation CC0/public domain; bryc JavaScript adaptation public domain with MIT fallback | Preserve [bryc's complete notice](LICENSES/Bryc-MIT.txt) and source attribution. MIT fallback is compatible with our MIT code and does not require disclosure of modifications. |
| `samples/vsco-ce/*.wav`, original `.sfz` maps and retained upstream notices | Upstream [CC0 1.0](samples/vsco-ce/UPSTREAM-LICENSE); derivatives retain CC0 designation | CC0 allows modification and redistribution, including commercial use, with no attribution or share-alike condition. Preserve provenance and credits voluntarily. Do not describe the recordings as original Way recordings. |
| Original selection metadata in `samples/vsco-ce/manifest.json`, importer and sample-conversion code | MIT for our authored contributions; metadata identifies CC0 source material | Keep both software and sample notices. Manifest license identifies the recordings, not a relicensing of upstream work. |
| `docs/music-theory-and-sound.md` | **CC BY-SA 4.0**, including adapted Open Music Theory summaries and our added analysis | When redistributing/adapting the document, keep credit, source/license links and modification notices; license adaptations under CC BY-SA 4.0 or a permitted compatible license. This applies to that document, not independently written software implementing musical ideas. |
| Example audio | Original generated musical arrangement plus CC0 instrument recordings | Our arrangement contribution is offered under MIT; source recordings retain CC0. No textbook score/song is sampled or reproduced. |
| Research links to unbundled tools/textbooks | Links and original comparison text only | Linking/research does not import a project's code license. Review exact versions, assets and packaging before adopting any tool later. |

[MIT's text](https://opensource.org/license/mit) is permissive but requires its notices. [CC0's legal code](https://creativecommons.org/publicdomain/zero/1.0/legalcode.en) supplies a public-domain waiver and fallback license; it does not provide a patent/trademark license or warranties about all rights. [CC BY-SA 4.0's legal code](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en) governs attribution, adaptations and share-alike for the research document. These distinct scopes are also stated in that document's header and the root README.

## Why the theory sources do not require a copyleft program

We researched voice leading, scales, cadences, ornaments and form, then wrote our own score algorithms. There is no imported textbook software, notation image or copyrighted exercise in the executable. The distinction between ideas/methods and their expression is described by the [U.S. Copyright Office, Circular 31](https://www.copyright.gov/circs/circ31.pdf). Our separate CC BY-SA document designation conservatively handles its adapted summaries without presenting those summaries as entirely MIT content. Creative Commons itself [discourages applying CC licenses to software](https://creativecommons.org/faq/#can-i-apply-a-creative-commons-license-to-software).

The RWU textbook is all rights reserved. Attribution alone is not permission to reproduce it. We cite it for concepts without copying its prose, diagrams or exercises, and do not imply our document license covers that textbook.

## Samples: formal license and publisher requests

The VSCO publisher explicitly calls the original WAVs CC0, and the pinned source includes the full CC0 legal code. Its readme separately asks users to credit contributors, discourages selling raw recordings, and encourages contributing improvements. Those requests are retained in the upstream notices and respected here. They do not appear as restrictions in the CC0 legal instrument. This release provides the derivative subset and its preparation script free of charge with full provenance.

No Philharmonia recordings, SoundFont, commercial orchestral library, third-party convolution impulse, model output, or model weights are included. Free download availability alone would not establish redistribution rights for another bank. A future bank needs its own per-file provenance and terms review; the MIT code license does not license arbitrary user-provided samples.

## Dependencies and future integrations

Version 0.6 adds only original MIT runtime code and original harmonic instrument recipes. The optional in-memory UI check fetches the pinned ISC-licensed LinkeDOM worker into ignored development cache and retains its license. It is not shipped by the local server, committed in the repository, or imported by the application. Its licensing remains separate; the test script's original orchestration code is MIT. Optional headless verification requires a separately installed browser and does not redistribute that browser. See the updated [attribution inventory](ATTRIBUTIONS.md).

There are **zero third-party npm/runtime package dependencies**. Browser audio is the platform Web Audio API; the local service uses Node built-ins. The repository does not redistribute Node itself. SFZ maps are included as source provenance, but no sfizz, FluidSynth, Tone.js, Strudel, SuperCollider, Unreal runtime or other researched engine is imported.

Adopting an external authoring/rendering engine later is a new licensing decision. For example, [Strudel's project](https://strudel.cc/) identifies AGPL licensing; that could introduce source/distribution or network-use obligations for an integrated derivative, and its sound-bank terms are separate. A separate executable or adapter does not automatically resolve every copyleft boundary. Unreal's engine/plugin terms likewise require an actual packaging review. No such component presently prevents our original library from being MIT.

## Release checks and limits

- Included recording and mapping revisions are pinned; every derivative WAV has a source/derivative SHA-256 in the manifest. Tests verify bundled hashes and source metadata.
- Original source notices, CC0 text, bryc's notice and CC BY-SA text are retained. Author and project links are listed in `ATTRIBUTIONS.md`.
- Rebuilding samples fetches only pinned VSCO files and records their hashes. Network availability is required only for rebuilding; normal playback is local.
- The published repository is the standalone music project, excluding the parent research vault, caches, local credentials and unrelated content-generation projects.

This is an engineering assessment of the materials actually included, not a guarantee of worldwide rights clearance or a legal opinion. The practical conclusion for this release is **MIT software, CC0 recordings, and one separately identified CC BY-SA research document**.
