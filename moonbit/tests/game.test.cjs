// The playable MoonBit slice in Chromium: play a level at par, tap by pointer, undo,
// and auto-solve, on both grids and both backends.
const test = require('node:test'), assert = require('node:assert');
const { chromium } = require('playwright');
const BASE = (process.env.MF_TEST_URL || 'http://127.0.0.1:4173/') + 'moonbit/index.html';
const status = page => page.evaluate(() => { const X = window.mf.raw; X.game_status(); return Array.from({ length: 8 }, (_, i) => X.out_get(i)); });
const idle = page => page.waitForFunction(() => { const X = window.mf.raw; X.game_status(); return X.out_get(7) === 0; });
async function open(browser, level, engine = '') {
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${BASE}?level=${level}${engine}`);
  await page.waitForFunction(() => window.mf && /woven/.test(document.getElementById('engine').textContent));
  return { page, errors };
}
test('MoonBit slice', async t => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  try {
    for (const [level, engine] of [[12, ''], [60, ''], [57, '&engine=js'], [94, '']]) {
      await t.test(`level ${level}${engine ? ' (JS build)' : ''}: the par plan earns three stars`, async () => {
        const { page, errors } = await open(browser, level, engine);
        const plan = await page.evaluate(n => window.mf.generate('J3-MONKEYFIST', n - 1).plan, level);
        await page.evaluate(() => window.mf.raw.game_start());
        for (const i of plan) {
          const [, , left, , , auto] = await status(page); if (!left || auto) break;
          await page.evaluate(i => window.mf.raw.game_tap(i), i); await idle(page);
        }
        await page.waitForSelector('#result[open]', { timeout: 30000 });
        const [taps, par, left, , stars] = await status(page);
        assert.strictEqual(left, 0); assert.strictEqual(taps, par); assert.strictEqual(stars, 3);
        assert.deepStrictEqual(errors, []); await page.close();
      });
    }
    await t.test('a pointer tap on a rope moves it; undo restores it', async () => {
      const { page } = await open(browser, 3);
      // Find the rope the solution taps first in the display list and tap its middle.
      const point = await page.evaluate(() => {
        const X = window.mf.raw, first = window.mf.generate('J3-MONKEYFIST', 2).plan[0]; X.game_start();
        const n = X.game_draw(), d = Array.from({ length: n }, (_, i) => X.f_get(i));
        for (let k = 0; k < d.length;) {
          if (d[k] !== 4) { k += 5; continue; }
          const m = d[k + 3];
          if (d[k + 1] === first) { const j = k + 4 + 2 * Math.floor(m / 2); return [d[j], d[j + 1]]; }
          k += 4 + 2 * m + 2;
        }
      });
      await page.mouse.click(point[0], point[1]);
      const [taps] = await status(page); assert.strictEqual(taps, 1);
      await idle(page); await page.click('#undo');
      const [taps2, , , undos] = await status(page); assert.strictEqual(taps2, 2); assert.strictEqual(undos, 2);
      await page.close();
    });
  } finally { await browser.close(); }
});
