const test = require('node:test'), assert = require('node:assert/strict');
const { base, launch, ready } = require('./browser-helpers.cjs');

test('Rope and Tiles settings persist and both grids animate translucent ropes and geared bouncers', { timeout: 90000 }, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => { requestAnimationFrame = () => 0; });
    await page.goto(base); await ready(page); await page.click('#levels');
    assert.equal(await page.locator('#graphics').textContent(), 'Graphics: Rope');
    await page.click('#graphics'); assert.equal(await page.locator('#graphics').textContent(), 'Graphics: Tiles');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.reload(); await ready(page); await page.click('#levels'); assert.equal(await page.locator('#graphics').textContent(), 'Graphics: Tiles');
    await page.click('#closeLevels');
    for (const grid of ['S', 'H']) {
      await page.goto(base + `?set=U3-${grid}-50-50-8-8-1-MS-TILES`); await ready(page);
      assert.equal(await page.evaluate(() => save.graphics), 'tiles');
      await page.click('#autoSolve');
      assert.equal(await page.evaluate(() => {
        for (let i = 0; i < 6000 && !G.ended; i++) { update(1 / 60); draw(i / 60); }
        return G.ended;
      }), true);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
