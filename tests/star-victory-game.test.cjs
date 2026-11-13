const test = require('node:test'), assert = require('node:assert/strict');
const { base, launch, ready, settle, solve } = require('./browser-helpers.cjs');

test('manual results select the earned celebration and auto-solve selects calm zero stars once, on both grids', { timeout: 90000 }, async () => {
  const browser = await launch();
  try {
    for (const grid of ['S', 'H']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => { requestAnimationFrame = () => 0; });
      await page.goto(base + `?set=U3-${grid}-1-1-8-8-1-N-TRIUMPH`); await ready(page);
      for (const stars of [3, 2, 1, 0]) {
        await page.evaluate(() => { window.__wins = []; sfx.win = stars => __wins.push(stars); });
        if (stars === 2 || stars === 1) {
          await page.click('#hint');
          if (stars === 1) { await page.evaluate(() => __game.update(4)); await page.click('#hint'); }
        }
        if (stars) {
          assert.deepEqual(await page.evaluate(() => __wins), []);
          const result = await solve(page);
          assert.equal(result.ended, true);
          assert.equal(result.taps - result.par, stars === 3 ? 0 : stars === 2 ? 2 : 4);
        } else {
          await page.click('#autoSolve');
          assert.deepEqual(await page.evaluate(() => __wins), [], 'auto-solve stays quiet while its animation runs');
          assert.equal(await page.locator('#result').isVisible(), false);
          await settle(page);
        }
        assert.equal(await page.locator('#stars').getAttribute('aria-label'), stars + ' out of 3 stars');
        assert.deepEqual(await page.evaluate(() => __wins), [stars], 'the result plays only its matching ending');
        await page.evaluate(() => { for (let n = 0; n < 20; n++) __game.update(.05); });
        assert.deepEqual(await page.evaluate(() => __wins), [stars], 'settled results never repeat the victory sound');
        if (stars) { await page.click('#again'); await ready(page); }
      }
      assert.deepEqual(errors, []); await page.close();
    }
  } finally { await browser.close(); }
});
