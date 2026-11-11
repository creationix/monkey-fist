// Run against a static server: node --test tests/responsive.test.cjs
// Override MF_TEST_URL if the server is not on port 4173.
const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

test('resizing fits the board, preserves moves, and maps taps through either orientation', async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', e => errors.push(String(e)));
    await page.goto(process.env.MF_TEST_URL || 'http://127.0.0.1:4173/');
    await page.waitForFunction(() => !!window.__mf);
    await page.evaluate(() => { __mf.useSet('slide'); __mf.startLevel(20); });
    let previous;
    for (const [width, height] of [[390, 844], [1440, 900], [900, 1440], [844, 390], [320, 568], [640, 360]]) {
      await page.setViewportSize({ width, height });
      await page.waitForFunction(() => {
        const c = document.querySelector('#board'), b = c.getBoundingClientRect();
        return c.width === Math.round(b.width * Math.min(devicePixelRatio, 2.5));
      });
      // Let the ResizeObserver run even if the previous and current widths happen to match.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const layout = await page.evaluate(() => {
        const g = __mf.G, b = document.querySelector('#board').getBoundingClientRect();
        const n = Math.min((b.width - 20) / g.W, (b.height - 20) / g.H);
        const r = Math.min((b.height - 20) / g.W, (b.width - 20) / g.H);
        const inside = el => { const q = el.getBoundingClientRect(); return q.left >= 0 && q.top >= 0 && q.right <= innerWidth + 1 && q.bottom <= innerHeight + 1; };
        return { rotated: g.rotated, expected: r > n, fits: g.ox >= 9 && g.oy >= 9,
          controls: [...document.querySelectorAll('#hud button')].filter(el => getComputedStyle(el).display !== 'none').every(inside),
          state: JSON.stringify([g.occ, g.noodles.map(n => [n.cur, n.off]), g.history, g.plan, g.undos, g.taps]) };
      });
      assert.equal(layout.rotated, layout.expected, `${width}x${height}: orientation`);
      assert.ok(layout.fits && layout.controls, `${width}x${height}: clipped board or controls`);
      if (previous) assert.equal(layout.state, previous, 'resizing must preserve the puzzle and undo history');
      const target = await page.evaluate(() => {
        const g = __mf.G, b = document.querySelector('#board').getBoundingClientRect();
        const rope = g.noodles.find(n => n.state === 'idle' && __mf.ray(n.cur, g.occ, g.W, g.H).dist > 0);
        const p = rope.cur[rope.cur.length - 1], x = g.ox + (p.x + 0.5) * g.cs, y = g.oy + (p.y + 0.5) * g.cs;
        return { id: rope.id, x: b.left + (g.rotated ? b.width - y : x), y: b.top + (g.rotated ? x : y), taps: g.taps };
      });
      await page.mouse.click(target.x, target.y);
      assert.equal(await page.evaluate(() => __mf.G.taps), target.taps + 1, 'tap should reach the displayed rope');
      assert.equal(await page.evaluate(() => __mf.G.history.at(-1).id), target.id);
      await page.waitForFunction(() => __mf.G.noodles.every(n => n.state === 'idle' || n.state === 'gone'));
      previous = await page.evaluate(() => { const g = __mf.G; return JSON.stringify([g.occ, g.noodles.map(n => [n.cur, n.off]), g.history, g.plan, g.undos, g.taps]); });
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
