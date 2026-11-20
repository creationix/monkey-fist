// iOS 15 (an iPad mini 4 tops out at 15.8): no Path2D/canvas roundRect and no
// wasm-gc. The game must still weave, draw and play its first level.
const test = require('node:test'), assert = require('node:assert/strict');
const { base, launch, ready } = require('./browser-helpers.cjs');
test('without roundRect or wasm-gc, as on iOS 15, a level weaves, draws and solves', { timeout: 120000 }, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 768, height: 1024 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { delete Path2D.prototype.roundRect; delete CanvasRenderingContext2D.prototype.roundRect; });
    await page.route('**/moonbit/dist/gen.wasm*', r => r.abort());
    await page.goto(base + '?set=J3-MONKEYFIST&level=1'); await ready(page);
    assert.equal(await page.evaluate(() => typeof Path2D.prototype.roundRect), 'undefined');
    assert.equal(await page.evaluate(() => __game.G.level.layoutKey), 'wgyj0i-1ujyjy0');
    await page.click('#autoSolve');
    await page.evaluate(() => { for (let i = 0; i < 5000 && !__game.G.ended; i++) __game.update(.05); __game.draw(0); });
    assert.equal(await page.evaluate(() => __game.G.ended), true);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
