const test = require('node:test'), assert = require('node:assert/strict');
const { base, launch, ready } = require('./browser-helpers.cjs');

test('auto-solve queues a full plan immediately, finishes with zero stars, and preserves earned scores', { timeout: 90000 }, async () => {
  const browser = await launch();
  try {
    for (const grid of ['S', 'H']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = [];
      page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => { requestAnimationFrame = () => 0; });
      await page.goto(base + `?set=U1-${grid}-60-60-1-MS-AUTOSOLVE`); await ready(page);
      const planned = await page.evaluate(() => G.plan.length);
      await page.click('#autoSolve');
      assert.equal(await page.locator('.hud').isVisible(), false);
      assert.equal(await page.locator('#zoomControls').isVisible(), false);
      assert.equal(await page.locator('#notice').isVisible(), false);
      assert.equal(await page.locator('#result').isVisible(), false);
      assert.deepEqual(await page.evaluate(() => ({ left: G.paths.filter(Boolean).length, taps: G.taps, motions: allMotions().length, advanced: allMotions().some(m => m.progress > 0) })),
        { left: 0, taps: 0, motions: planned, advanced: false });
      const settle = () => page.evaluate(() => { for (let n = 0; n < 6000 && !G.ended; n++) { update(1 / 60); draw(n / 60); } return G.ended; });
      assert.equal(await settle(), true, 'all queued motions drain without deadlock');
      assert.equal(await page.locator('.hud').isVisible(), true);
      assert.equal(await page.locator('#stars').getAttribute('aria-label'), '0 out of 3 stars');
      assert.equal(await page.locator('#resultText').textContent(), 'Auto-solved · 0 stars');
      assert.equal(await page.evaluate(() => save.sets[MFGame.code(opts)][G.index].stars), 0);
      // A normal clear replaces a zero-star completion despite using more taps.
      await page.click('#again'); await ready(page);
      await page.evaluate(() => { for (let n = 0; n < 1000 && !G.ended; n++) { if (!G.auto) tap(G.plan[0]); update(1 / 60); for (let k = 0; k < 3000 && G.moving; k++) update(1 / 60); } });
      assert.equal(await page.locator('#stars').getAttribute('aria-label'), '3 out of 3 stars');
      const earned = await page.evaluate(() => JSON.stringify(save.sets[MFGame.code(opts)][G.index]));
      await page.click('#again'); await ready(page); await page.click('#autoSolve'); assert.equal(await settle(), true);
      assert.equal(await page.evaluate(() => JSON.stringify(save.sets[MFGame.code(opts)][G.index])), earned, 'auto-solve cannot replace an earned score');
      assert.deepEqual(errors, []); await page.close();
    }
  } finally { await browser.close(); }
});

test('auto-solve holds a fading empty grid for 2 / 4 / 1 seconds and plays completion only at the end', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage(); await page.addInitScript(() => { requestAnimationFrame = () => 0; });
    await page.goto(base); await ready(page);
    const results = await page.evaluate(() => {
      const results = [], p = (q, r) => ({ q, r });
      for (const [speed, factor] of [['normal', 1], ['slow', .5], ['fast', 2]]) {
        $('result').close(); cancelGuide(); save.moveSpeed = speed; let sounds = 0; sfx.win = () => sounds++;
        Object.assign(G, { level: { grid: 'square', W: 6, H: 4, locks: [], mirrors: [], springs: [], par: 1 }, paths: [[p(0, 1), p(1, 1)], [p(2, 1), p(3, 1)]], plan: [1, 0],
          moves: new Map(), history: [], ended: false, loading: false, auto: false, usedAutoSolve: false, clearOutro: null, camera: { zoom: 1, x: 0, y: 0 } });
        resetFeatures(); resize(); autoSolve(); while (G.moving) update(.001);
        const start = G.clearOutro, atStart = sounds; update((1 - start) / factor); draw(0);
        const halfway = { phase: G.clearOutro, sound: sounds, result: $('result').open, hudHidden: document.body.classList.contains('auto-solving') };
        update(.999 / factor); const beforeEnd = { ended: G.ended, sound: sounds }; update(.002 / factor); draw(0);
        results.push({ speed, seconds: 2 / factor, atStart, halfway, beforeEnd, ended: G.ended, sounds, finalPhase: G.clearOutro });
      }
      return results;
    });
    for (const r of results) {
      assert.equal(r.atStart, 0); assert.ok(Math.abs(r.halfway.phase - 1) < 1e-8);
      assert.deepEqual({ sound: r.halfway.sound, result: r.halfway.result, hudHidden: r.halfway.hudHidden }, { sound: 0, result: false, hudHidden: true });
      assert.deepEqual(r.beforeEnd, { ended: false, sound: 0 });
      assert.equal(r.ended, true); assert.equal(r.sounds, 1); assert.equal(r.finalPhase, 2);
    }
    assert.deepEqual(results.map(r => r.seconds), [2, 4, 1]);
  } finally { await browser.close(); }
});
