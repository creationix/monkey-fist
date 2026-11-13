const test = require('node:test'), assert = require('node:assert/strict');
const { base, launch, ready } = require('./browser-helpers.cjs');

test('spring turnovers preserve solver results, allow concurrent taps, and only repaint the active objects', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    for (const reducedMotion of ['no-preference', 'reduce']) for (const grid of ['square', 'hex']) {
      const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, reducedMotion }), errors = [];
      page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => { requestAnimationFrame = () => 0; });
      await page.goto(base); await ready(page);
      const result = await page.evaluate(grid => {
        const p = (q, r) => ({ q, r }), paths = [[p(2, 5), p(1, 5), p(1, 4), p(2, 4), p(2, 3), p(3, 3)], [p(1, 6), p(2, 6)], [p(6, 2), p(6, 1)]];
        const level = { grid, W: 8, H: 8, mirrors: [], springs: [p(5, 3)], par: 4 };
        Object.assign(G, { level, paths, plan: [0, 2, 1, 0], moves: new Map(), auto: false, ended: false, lost: false, loading: false, history: [], camera: { zoom: 1, x: 0, y: 0 } }); resize();
        const expected = MFGame.tap(level, paths, 0).paths[0], poses = [];
        let hits = 0, rebuilds = 0; sfx.spring = () => hits++;
        const original = drawRestingBoard; drawRestingBoard = (...args) => { rebuilds++; return original(...args); };
        tap(0); const move = G.moves.get(0), beforeImpact = hits, committed = JSON.stringify(G.paths[0]) === JSON.stringify(expected);
        while (!move.impacted) update(1 / 1000);
        draw(0); const firstBuilds = rebuilds;
        for (const t of [.2, .4, .58, .8]) {
          update(Math.max(0, move.hold - move.bounceDuration * (1 - t)));
          poses.push(springFlip(move)); draw(0);
        }
        const animationRebuilds = rebuilds - firstBuilds;
        tap(2); const concurrent = G.moves.has(0) && G.moves.has(2);
        update(move.hold + .001); draw(0);
        const landed = !G.moves.has(0) && JSON.stringify(G.paths[0]) === JSON.stringify(expected);
        drawRestingBoard = original; cancelGuide();
        // Undo is allowed during a turnover, and clears its spring animation too.
        G.moves.clear(); G.paths = paths; G.plan = [0, 2, 1, 0]; G.auto = G.ended = false; G.undos = 3; G.history = [];
        tap(0); while (!G.moves.get(0).impacted) update(.001); update(.02); undo(); draw(0);
        return { committed, beforeImpact, hitsBeforeUndo: hits - 1, poses, animationRebuilds, concurrent, landed,
          undone: !G.moving && JSON.stringify(G.paths) === JSON.stringify(paths) };
      }, grid);
      assert.equal(result.committed, true); assert.equal(result.beforeImpact, 0); assert.equal(result.hitsBeforeUndo, 1);
      assert.equal(result.concurrent, true); assert.equal(result.landed, true); assert.equal(result.undone, true);
      assert.equal(result.animationRebuilds, 0, 'turnover frames reuse the stationary board');
      assert.equal(result.poses[0].reversed, false); assert.equal(result.poses.at(-1).reversed, true);
      if (reducedMotion === 'reduce') assert.ok(result.poses.every(p => p.squash === 1 && p.lift === 0));
      else assert.ok(result.poses[2].squash < .02 && result.poses[2].lift > 0);
      assert.deepEqual(errors, []); await page.close();
    }
  } finally { await browser.close(); }
});
