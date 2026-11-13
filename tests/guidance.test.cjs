const test = require('node:test'), assert = require('node:assert/strict');
const { base, launch, ready } = require('./browser-helpers.cjs');
const G = require('../game-engine.js');

test('guidance removes redundant certificate taps before trying a new search', () => {
  for (const grid of ['square', 'hex']) {
    const level = G.generate({ grid, seed: 'BRAID', count: 1, min: 70, max: 70, mirrors: true, springs: true });
    const doubled = level.plan.flatMap(i => [i, ...(G.tap(level, level.ropes, i)?.event === 'exit' ? [i] : [])]);
    const guide = G.guide(level, level.ropes, 0, doubled);
    assert.equal(guide.solved, true); assert.equal(guide.nodes, 0); assert.equal(G.replay(level, guide.moves).solved, true);
  }
});

test('off-certificate moves search in a worker; undo and restart reject stale answers', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage(); await page.addInitScript(() => { requestAnimationFrame = () => 0; });
    for (const grid of ['S', 'H']) {
      await page.goto(base + `?set=U1-${grid}-100-100-1-MS-BRAID`); await ready(page);
      const original = await page.evaluate(() => JSON.stringify(__game.G.paths));
      const state = await page.evaluate(() => {
        const g = __game.G, i = g.paths.findLastIndex((p, i) => p && i !== g.plan[0] && MFGame.tap(g.level, g.paths, i));
        __game.tap(i); return { solving: g.solving, moving: g.moves.size };
      });
      assert.equal(state.solving, true); assert.equal(state.moving, 1);
      await page.evaluate(() => __game.undo());
      await page.waitForFunction(() => !__game.G.solving, null, { polling: 25 });
      assert.equal(await page.evaluate(() => JSON.stringify(__game.G.paths)), original);
      assert.equal(await page.evaluate(() => MFGame.replay(__game.G.level, __game.G.plan, __game.G.paths).solved), true);
      await page.evaluate(() => { const g = __game.G, i = g.paths.findLastIndex((p, i) => p && i !== g.plan[0] && MFGame.tap(g.level, g.paths, i)); __game.tap(i); __game.hint(); });
      await page.waitForFunction(() => !__game.G.solving, null, { polling: 25 });
      assert.equal(await page.evaluate(() => __game.G.taps), 5, 'hint charges only after the worker finds a route');
      assert.equal(await page.evaluate(() => MFGame.replay(__game.G.level, __game.G.plan, __game.G.paths).solved), true);
      await page.evaluate(() => { __game.G.plan = []; __game.hint(); return __game.start(0); });
      assert.equal(await page.evaluate(() => __game.G.taps), 0);
      assert.equal(await page.evaluate(() => JSON.stringify(__game.G.paths)), original);
      assert.equal(await page.evaluate(() => __game.G.solving), false);
    }
  } finally { await browser.close(); }
});
