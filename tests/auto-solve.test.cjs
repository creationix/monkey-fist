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
      assert.deepEqual(await page.evaluate(() => ({ left: G.paths.filter(Boolean).length, taps: G.taps, motions: allMotions().length, advanced: allMotions().some(m => m.progress > 0) })),
        { left: 0, taps: 0, motions: planned, advanced: false });
      const settle = () => page.evaluate(() => { for (let n = 0; n < 6000 && !G.ended; n++) { update(1 / 60); draw(n / 60); } return G.ended; });
      assert.equal(await settle(), true, 'all queued motions drain without deadlock');
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
