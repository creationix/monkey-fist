// Run against a static server: node --test tests/responsive.test.cjs
// Override MF_TEST_URL if the server is not on port 4173.
const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

test('the top-left tan rope in X10BS-E5DDK level 4 animates fully before disappearing', async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    for (const [width, height] of [[1978, 1248], [900, 1440]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      // Step the animation ourselves to check its very first frame, not just its final state.
      await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
      await page.goto(process.env.MF_TEST_URL || 'http://127.0.0.1:4173/');
      const result = await page.evaluate(() => {
        __mf.useSet('X10BS-E5DDK'); __mf.startLevel(4);
        const g = __mf.G, tan = g.noodles[23];
        // The screenshot has one prior tap: slide the purple rope out of the tan rope's way.
        __mf.tap(g.noodles[8]);
        for (let i = 0; i < 120; i++) __mf.update(1 / 60);
        const original = tan.cur.map(p => ({ ...p }));
        __mf.tap(tan);
        const start = tan.state;
        __mf.update(1 / 60);
        const firstFrame = { state: tan.state, distance: tan.s };
        for (let i = 0; i < 300; i++) __mf.update(1 / 60);
        const end = { state: tan.state, popped: tan.popped };
        __mf.undo();
        for (let i = 0; i < 300; i++) __mf.update(1 / 60);
        return { rotated: g.rotated, start, firstFrame, end, original, restored: tan.cur, restoredState: tan.state };
      });
      assert.equal(result.rotated, width > height);
      assert.equal(result.start, 'out');
      assert.equal(result.firstFrame.state, 'out', `${width}x${height}: rope must remain visible while leaving`);
      assert.ok(result.firstFrame.distance > 0, 'rope should move on the first frame');
      assert.deepEqual(result.end, { state: 'gone', popped: true }, 'complete the exit and play its effect');
      assert.equal(result.restoredState, 'idle');
      assert.deepEqual(result.restored, result.original, 'undo must restore the exited rope');
      await page.close();
    }
  } finally { await browser.close(); }
});

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
        const rope = g.twist ? g.noodles[g.plan[0]] : g.noodles.find(n => n.state === 'idle' && __mf.ray(n.cur, g.occ, g.W, g.H).dist > 0);
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
