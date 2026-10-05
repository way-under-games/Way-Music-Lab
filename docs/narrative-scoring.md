# Narrative scoring: one theme, an unfolding game

Implemented in version 0.5, October 5, 2026. Original document and code: MIT. The direction is a persistent authored score, with procedural performance and development. A game restart must not invent a new musical identity.

## What the soundtrack references suggest

Austin Wintory describes *Journey* as an evolving single-theme score, with cello representing the player and other instruments representing the surrounding world. He also describes iterating musical triggers in the game to make the score unfold seamlessly. Our takeaway is to keep a recognizable identity and treat implementation as part of composition. [Wintory's firsthand interview, TheSixthAxis, March 15, 2012](https://www.thesixthaxis.com/2012/03/15/interview-journey-composer-austin-wintory/).

Naughty Dog describes Gustavo Santaolalla's *The Last of Us* score as intimate and serving the narrative and characters' perceptions. Our interpretation is to leave space for vulnerability instead of making every activity produce a busy accompaniment. [Eric Monacelli, Naughty Dog / PlayStation, May 17, 2013](https://blog.playstation.com/2013/05/17/the-music-of-the-last-of-us-gustavo-santaolalla/).

Jessica Curry's *Everybody's Gone to the Rapture* interview discusses a move from early synthesizer experiments toward orchestral writing after discovering singer Elin Manahan Thomas. This is a useful reference for an intentional, emotionally distinctive instrument palette; our inference is that a soundtrack's personality should not be reduced to its intensity number. We have not transcribed the embedded audio interview or implemented Rapture's proprietary triggering system. [GameTyrant's interview page](https://gametyrant.com/news/everybodys-gone-to-the-rapture-an-interview-with-composer-jessica-curry).

Akira Yamaoka describes *Silent Hill* scoring in terms of loneliness, sadness, anxiety and emotional experience, with room for different textures and silence. Our takeaway is to separate narrative emotion from physical danger. A loss cue should not merely be a louder battle cue. [Yamaoka's firsthand interview with Andy Price, MusicRadar, July 1, 2026](https://www.musicradar.com/artists/rather-than-simply-writing-scary-music-i-wanted-to-express-loneliness-sadness-anxiety-and-the-psychological-aspects-of-fear-we-speak-to-video-game-horror-soundtrack-godfather-akira-yamaoka-about-the-legacy-of-silent-hill).

These are design references and original interpretations, not a claim to reproduce those soundtracks or their implementation. No recordings, MIDI transcriptions, score passages, melodies, images or proprietary code from those games are included. The example motif is our own placeholder for an eventual authored Way theme. Its eight degrees are `0,2,4,3,2,0,1,0`; degree zero means tonic. No new license dependency was added by this research.

## Musical progression

| Context | Treatment | Control policy |
| --- | --- | --- |
| Title | Clear two-bar motif on recorded harp, soft strings, no percussion or brass | Fixed project theme, seed, key and motif; repeated thematic statement. |
| Opening | Slower, sparse flute fragments, restrained harp, soft strings, alternate bars without melody | Host enters opening; ordinary changes wait for a four-bar boundary. |
| Player gains control | Shorter thematic notes, playful flute/harp, light supporting ensemble | Host grants control; activity gradually shapes pulse, energy and tempo. |
| Movement/actions | More rhythmic motion as activity rises; syncopated feel at activity >=0.5 | Movement 0–1 plus capped action impulses; consumed once per prepared bar. No step-to-note mapping. |
| Danger/battle | More urgent arrangement of the same theme, stronger strings/brass/percussion | Danger >=0.65 enters at the next uncommitted bar. Two safe bars at <=0.35 and a minimum two-bar combat hold precede a phrase-boundary return. |
| Revelation | Unresolved harmony with space, strings/flute and some horn color | Timed story event; default priority 90 overrides combat's priority 80. |
| Loss | Sparse unresolved theme fragments, softer strings/harp/flute, no percussion/brass | A distinct emotion, with a bounded authored duration. |
| Resolution | Major-mode return of the theme with restrained ensemble | Timed cue, then returns to current gameplay state. |

Those instrument balances are authored heuristics for this prototype, not universal emotional rules. Tempo moves by at most six BPM per prepared bar; energy normally moves by at most 0.12, or 0.35 entering danger. Danger is considered urgent but still obeys the audio scheduler's committed lookahead. A story cue can interrupt at a bar boundary and return after its exact requested bar duration. This is a bar/phrase director, not frame-accurate cinematic scoring.

The title presents the actual authored degree contour. Other arrangements retain the same contour or deliberately fragment it; major/minor mode and dominant scale treatment can change its interval color. Changing orchestration, rhythm and harmonic meaning supplies variation without changing the identity seed. Seeds still govern deterministic minor performance variation, not theme selection on New Game.

## Engine-independent API

`ScoreDirector` is a pure JavaScript policy module, separate from audio and game engines. `BrowserMusic` is the optional browser host. The director reads normalized gameplay meaning, not Unreal objects, browser key events or raw controller axes.

```javascript
import { ScoreDirector } from './src/director.mjs';
import { BrowserMusic } from './src/browser-player.mjs';

const director = new ScoreDirector({ theme: {
  id: 'our-game-theme', seed: 'our-game-theme-v1', key: 'D', tempo: 92,
  motif: [0, 2, 4, 3, 2, 0, 1, 0]
} });
const music = new BrowserMusic({ director });
await music.loadSampleBank('/samples/vsco-ce/manifest.json');
// Call music.start() from a player's audio-unlock gesture.

director.setStage('opening');             // game begins
director.setTelemetry({ hasControl: true }); // opening becomes play
director.setTelemetry({ movement: 0.6, danger: 0.1 });
director.action('jump');                  // or interact, discover, attack
director.cue({ id: 'chapter-2-reveal', kind: 'revelation', bars: 4 });
```

Set movement/danger at the host's useful gameplay rate; only the latest values are sampled at a musical bar. Repeated action calls are capped at four activity units per bar. `hasControl` only promotes an opening to play, not a title screen. `setStage('play')` is also available for an explicit host transition. Title screens ignore danger and defer queued story cues until gameplay begins.

In a native/service host, call `director.advance(bar)` once for each consecutively prepared musical bar and feed its `settings` into `compose` and the renderer. The plan contains theme ID, requested/active profile, stage, activity, cue ID and a pending-boundary flag. `MusicTransport.prepareBar` performs this before composition on the browser audio timeline. Recent prepared plans are immutable and cached for eight bars so lookahead and pause/replay do not consume actions/cues twice. This is not arbitrary seek: older history and nonconsecutive new bars require restoring a saved host timeline or starting a new director.

Cue IDs deduplicate accepted triggers within a bounded 256-ID history; very old evicted IDs can be accepted again. Persist one-shot story completion in the game save if it must never repeat across sessions. Lower-priority cues cannot replace active/queued higher-priority cues. A higher/equal-priority accepted cue replaces the current story cue rather than stacking it. `music.stop()` resets the musical timeline, active cue and smoothing while retaining game telemetry, stage and theme; already accepted cue IDs stay deduplicated. `music.pause()` retains musical position. A true New Game constructs a fresh director with the same authored theme.

Authored meter cycles remain supported through `theme.meterCycle`. For example import `MATH_ROCK_METERS` from `src/meter.mjs` and supply it once in the theme. Meter grouping, syncopated feel, activity and narrative emotion remain separate dimensions. The initial audition uses 4/4 to make the narrative contrast easy to hear; it does not remove variable signatures from the library.

## Remaining musical work

This provides working theme identity, narrative states and reaction policy. It does not yet provide authored transition bridges, common-tone revoicing across profile changes, dedicated stingers, overlapping cue crossfades, composer-editable rhythmic motifs, a full silence/diegetic policy, story-specific secondary leitmotifs, save/restore snapshots, tempo-map export or a native Unreal renderer. Sustained notes still end at bars. Story durations are measured in musical bars, so their elapsed seconds depend on the evolving tempo.

Our next composition work should author the actual game's theme and its rhythmic signature, build transitions between these treatments, and audition the complete title-to-control sequence with game footage. Technical tests can establish stable behavior; they cannot establish the emotional effect of a famous authored soundtrack.
