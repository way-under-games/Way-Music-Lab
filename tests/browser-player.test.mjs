import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserMusic } from '../src/browser-player.mjs';
import { MusicTransport } from '../src/transport.mjs';

test('bank preload can pause an idle browser host before its first start, and repeated pause retains resume position', async t => {
  // Exercise the public host lifecycle with a fake audio clock, without a DOM.
  const host = Object.create(BrowserMusic.prototype);
  const renderer = { now: () => 0, schedule() {}, silence() {} };
  Object.assign(host, { context: { currentTime: 0, resume: async () => {} }, transport: new MusicTransport(renderer),
    resumeBar: 0, resumeTick: undefined, epoch: 0, timer: null, disposed: false, barHistory: [] });
  t.after(() => host.stop());
  assert.equal(host.pause(), 0);
  await host.start();
  assert.equal(host.transport.current.score.startTick, 0);
  host.pause();
  const tick = host.resumeTick;
  host.pause();
  assert.equal(host.resumeTick, tick);
  await host.start();
  assert.equal(host.transport.current.score.startTick, tick);
  host.stop();
});
