// Browser integration tests for the published playground. Requires a static server at
// MF_TEST_URL (default http://127.0.0.1:4173) and Playwright plus Chromium.
const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.MF_TEST_URL || 'http://127.0.0.1:4173';

test('all playground puzzles can be completed with real pointer taps on wide and narrow screens', { timeout: 90000 }, async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    for (const [width, height] of [[1440, 900], [390, 844]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(String(e)));
      await page.goto(base + '/experiments/mechanics/');
      await page.waitForFunction(() => !!window.__mfSandbox);
      const count = await page.locator('#puzzle option').count(); assert.equal(count, 12);
      for (let index = 0; index < count; index++) {
        await page.selectOption('#puzzle', String(index));
        await page.locator('#board').scrollIntoViewIfNeeded();
        const solution = await page.evaluate(() => MFSandbox.solve(__mfSandbox.level));
        assert.equal(solution.solved, true);
        for (const i of solution.moves) {
          const at = await page.evaluate(i => {
            const { game, view } = __mfSandbox, p = game.paths[i].at(-1), b = document.querySelector('#board').getBoundingClientRect();
            const x = view.ox + (p.x + .5) * view.cs, y = view.oy + (p.y + .5) * view.cs;
            return { x: b.left + (view.rotated ? view.screenWidth - y : x), y: b.top + (view.rotated ? x : y) };
          }, i);
          await page.mouse.click(at.x, at.y);
          await page.waitForFunction(() => !__mfSandbox.game.animation);
        }
        assert.equal(await page.evaluate(() => __mfSandbox.game.paths.every(p => !p)), true, `${width}: puzzle ${index + 1}`);
        await page.locator('#undo').click();
        assert.equal(await page.evaluate(() => __mfSandbox.game.paths.some(Boolean)), true, 'undo restores an exited rope');
        await page.locator('#restart').click();
        assert.equal(await page.evaluate(() => __mfSandbox.game.taps), 0);
      }
      assert.deepEqual(errors, []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no horizontal overflow');
      await page.close();
    }
  } finally { await browser.close(); }
});

test('default-motion mirror and spring animations finish and can be undone mid-move', async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = []; page.on('pageerror', e => errors.push(String(e)));
    await page.goto(base + '/experiments/mechanics/?puzzle=7');
    await page.waitForFunction(() => !!window.__mfSandbox);
    await page.evaluate(() => __mfSandbox.tap(0));
    assert.equal(await page.evaluate(() => __mfSandbox.game.animation.event), 'bounce');
    await page.locator('#undo').click();
    assert.equal(await page.evaluate(() => __mfSandbox.game.animation), null);
    assert.equal(await page.evaluate(() => __mfSandbox.game.taps), 0);
    await page.evaluate(() => __mfSandbox.tap(0));
    await page.waitForFunction(() => !__mfSandbox.game.animation);
    assert.deepEqual(await page.evaluate(() => MFSandbox.direction(__mfSandbox.level, __mfSandbox.game.paths[0])), [0, 1], 'entering the spring advances one more cell before reversing the bent rope');
    await page.evaluate(() => __mfSandbox.tap(0));
    await page.waitForFunction(() => !__mfSandbox.game.animation);
    assert.equal(await page.evaluate(() => __mfSandbox.game.paths[0]), null);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
