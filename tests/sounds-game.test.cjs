const test = require('node:test'), assert = require('node:assert/strict');
const { base, launch, ready, clickNext } = require('./browser-helpers.cjs');

test('square and Hex share the real swish; sound and music mute independently', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    for (const grid of ['S', 'H']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => {
        requestAnimationFrame = () => 0; window.__noise = [];
        const original = AudioContext.prototype.createBufferSource;
        AudioContext.prototype.createBufferSource = function () {
          const source = original.call(this), start = source.start.bind(source);
          source.start = (...args) => { if (source.buffer?.length > 1) __noise.push({ duration: source.buffer.duration, energy: source.buffer.getChannelData(0).reduce((n, v) => n + v * v, 0) }); start(...args); };
          return source;
        };
        localStorage.setItem('monkey-fist-unified-v1', '{"sound":"full","music":false}');
      });
      await page.goto(base + `?set=U3-${grid}-70-70-8-8-1-N-SOUND`); await ready(page); await clickNext(page);
      assert.equal(await page.evaluate(() => __noise.filter(n => Math.abs(n.duration - .3) < .001).length), 0, 'accepted taps do not swish before visual motion');
      await page.evaluate(() => __game.update(1 / 60));
      assert.equal(await page.evaluate(() => __noise.filter(n => Math.abs(n.duration - .3) < .001 && n.energy > 10).length), 1);
      assert.equal(await page.evaluate(() => __game.music.state.enabled), false);
      await page.click('#levels'); await page.click('#sound'); await page.click('#music');
      assert.equal(await page.evaluate(() => __game.sound.state.enabled), false);
      await page.click('#closeLevels'); assert.equal(await page.evaluate(() => __game.music.state.enabled), true);
      const before = await page.evaluate(() => __noise.filter(n => Math.abs(n.duration - .3) < .001).length);
      await page.click('#restart'); await ready(page); await clickNext(page); await page.evaluate(() => __game.update(1 / 60));
      assert.equal(await page.evaluate(() => __noise.filter(n => Math.abs(n.duration - .3) < .001).length), before);
      // Sound Off to Soft; music Soft to Full to Off.
      await page.click('#levels'); await page.click('#sound'); await page.click('#music'); await page.click('#music'); await page.click('#closeLevels');
      assert.equal(await page.evaluate(() => __game.sound.state.enabled), true); assert.equal(await page.evaluate(() => __game.music.state.enabled), false);
      assert.deepEqual(errors, []); await page.close();
    }
  } finally { await browser.close(); }
});
