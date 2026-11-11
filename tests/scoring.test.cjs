const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

test('only player taps count, including early exits, bumps, and undone moves', { timeout: 60000 }, async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const errors = []; page.on('pageerror', e => errors.push(String(e)));
    await page.goto(process.env.MF_TEST_URL || 'http://127.0.0.1:4173/');
    await page.waitForFunction(() => !!window.__mf);
    await page.evaluate(() => { __mf.useSet('slide'); __mf.startLevel(1); });
    const target = await page.evaluate(() => {
      const g = __mf.G, n = g.noodles[g.plan[0]], p = n.cur.at(-1), b = document.querySelector('#board').getBoundingClientRect();
      const x = g.ox + (p.x + .5) * g.cs, y = g.oy + (p.y + .5) * g.cs;
      return { x: b.left + (g.rotated ? b.width - y : x), y: b.top + (g.rotated ? x : y) };
    });
    await page.mouse.click(target.x, target.y);
    await page.waitForFunction(() => __mf.G.ended);
    assert.equal(await page.evaluate(() => __mf.G.taps), 1);
    assert.match(await page.locator('#tangle').textContent(), /Taps 1 · par 1/);
    await page.waitForFunction(() => document.querySelector('#scrResult').classList.contains('show'));
    assert.match(await page.locator('#resText').textContent(), /^1 tap, the fewest possible/);
    assert.equal(await page.locator('#stars .on').count(), 3);
    const wasted = await page.evaluate(() => {
      __mf.startLevel(2); const g = __mf.G;
      const waste = g.noodles.find(n => __mf.ray(n.cur, g.occ, g.W, g.H).clear && !MFLevels.nothingBlocked(g.noodles.filter(m => m !== n).map(m => m.cur), g.W, g.H));
      __mf.tap(waste);
      const critical = g.noodles.find(n => n.state === 'idle' && __mf.ray(n.cur, g.occ, g.W, g.H).clear && MFLevels.nothingBlocked(g.noodles.filter(m => m !== n && m.state === 'idle').map(m => m.cur), g.W, g.H));
      __mf.tap(critical); return { taps: g.taps, par: g.par, auto: g.auto };
    });
    assert.deepEqual(wasted, { taps: 2, par: 1, auto: true });
    await page.waitForFunction(() => __mf.G.ended);
    assert.equal(await page.evaluate(() => __mf.G.taps), 2);
    const bumped = await page.evaluate(() => {
      __mf.startLevel(16); const g = __mf.G;
      const n = g.noodles.find(n => { const r = __mf.ray(n.cur, g.occ, g.W, g.H); return !r.clear && !r.dist; });
      __mf.tap(n); return { taps: g.taps, moves: g.history.length };
    });
    assert.deepEqual(bumped, { taps: 1, moves: 0 });
    await page.evaluate(() => { __mf.startLevel(16); __mf.tap(__mf.G.noodles[2]); });
    await page.waitForFunction(() => __mf.G.noodles[2].state === 'idle');
    await page.locator('#undoBtn').click();
    assert.equal(await page.evaluate(() => __mf.G.taps), 1, 'undo must not refund the player tap');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
