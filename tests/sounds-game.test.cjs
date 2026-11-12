const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.MF_TEST_URL || 'http://127.0.0.1:4173/';

test('Hex and square play the same swish with music off; Hex sound and music mute independently and persist offline', { timeout: 60000 }, async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    for (const hex of [false, true]) {
      const context = await browser.newContext(), page = await context.newPage({ viewport: { width: 390, height: 844 } }), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => {
        window.__noise = [];
        const original = AudioContext.prototype.createBufferSource;
        AudioContext.prototype.createBufferSource = function () {
          const source = original.call(this), start = source.start.bind(source);
          source.start = (...args) => { if (source.buffer?.length > 1) __noise.push({ duration: source.buffer.duration, energy: source.buffer.getChannelData(0).reduce((sum, v) => sum + v * v, 0) }); start(...args); };
          return source;
        };
        if (!localStorage.getItem('monkey-fist')) localStorage.setItem('monkey-fist', JSON.stringify({ music: false, sound: true }));
      });
      await page.goto(base + (hex ? 'hex/?level=60' : '?set=C60S-MONKEYFIST'));
      if (hex) await page.waitForFunction(() => window.__hex?.G.level && !__hex.G.loading);
      if (!hex) await page.locator('#lvGrid button').nth(59).click();
      const point = await page.evaluate(hex => {
        const g = (hex ? __hex : __mf).G, i = g.plan[0], p = g.paths[i].at(-1), b = document.querySelector('#board').getBoundingClientRect();
        if (hex) { const at = __hex.screen(p); return { x: b.left + at.x, y: b.top + at.y }; }
        const x = g.ox + (p.x + .5) * g.cs, y = g.oy + (p.y + .5) * g.cs;
        return { x: b.left + (g.rotated ? b.width - y : x), y: b.top + (g.rotated ? x : y) };
      }, hex);
      await page.mouse.click(point.x, point.y);
      const swishes = await page.evaluate(() => __noise.filter(n => Math.abs(n.duration - .3) < .001 && n.energy > 10));
      assert.equal(swishes.length, 1, 'first tap produces a real .3-second noise swish');
      assert.equal(await page.evaluate(hex => (hex ? __hex : __mf).music.state.enabled, hex), false);
      if (hex) {
        await page.locator('#sound').click();
        assert.equal(await page.evaluate(() => __hex.sound.state.enabled), false);
        await page.locator('#music').click();
        assert.equal(await page.evaluate(() => __hex.music.state.enabled), true);
        assert.equal(await page.evaluate(() => __hex.sound.state.enabled), false);
        const before = await page.evaluate(() => __noise.length);
        await page.locator('#restart').click(); await page.waitForFunction(() => __hex.G.level && !__hex.G.loading); await page.mouse.click(point.x, point.y);
        assert.equal(await page.evaluate(() => __noise.length), before, 'music does not turn sound effects back on');
        await page.locator('#sound').click(); await page.locator('#music').click();
        assert.equal(await page.evaluate(() => __hex.sound.state.enabled), true);
        assert.equal(await page.evaluate(() => __hex.music.state.enabled), false);
        await page.locator('#sound').click();
        await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForFunction(() => !!navigator.serviceWorker.controller);
        await context.setOffline(true); await page.reload(); await page.waitForFunction(() => __hex.G.level && !__hex.G.loading);
        assert.equal(await page.locator('#sound').getAttribute('aria-pressed'), 'false');
        await page.locator('#sound').click(); await page.mouse.click(point.x, point.y);
        assert.ok(await page.evaluate(() => __noise.some(n => Math.abs(n.duration - .3) < .001)), 'shared sounds load offline');
      }
      assert.deepEqual(errors, []); await context.close();
    }
  } finally { await browser.close(); }
});
