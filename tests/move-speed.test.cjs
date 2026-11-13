const test = require('node:test'), assert = require('node:assert/strict');
const { base, launch, ready } = require('./browser-helpers.cjs');

test('saved Slow, Normal and Fast settings scale exits and bounces on both grids', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => { requestAnimationFrame = () => 0; });
    await page.goto(base); await ready(page); await page.click('#levels');
    assert.equal(await page.locator('#moveSpeed').textContent(), 'Speed: Normal');
    await page.click('#moveSpeed'); assert.equal(await page.locator('#moveSpeed').textContent(), 'Speed: Fast');
    await page.reload(); await ready(page); await page.click('#levels');
    assert.equal(await page.locator('#moveSpeed').textContent(), 'Speed: Fast');
    await page.click('#moveSpeed'); assert.equal(await page.locator('#moveSpeed').textContent(), 'Speed: Slow');
    await page.click('#moveSpeed'); assert.equal(await page.locator('#moveSpeed').textContent(), 'Speed: Normal');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.click('#closeLevels');
    const times = await page.evaluate(() => {
      const results = [], p = (q, r) => ({ q, r });
      for (const grid of ['square', 'hex']) for (const id of [0, 2]) for (const speed of ['normal', 'fast', 'slow']) {
        cancelGuide(); save.moveSpeed = speed;
        Object.assign(G, { level: { grid, W: 8, H: 8, mirrors: [], springs: [p(5, 3)], locks: [], par: 4 },
          paths: [[p(2, 5), p(1, 5), p(1, 4), p(2, 4), p(2, 3), p(3, 3)], [p(0, 4), p(0, 5)], [p(6, 2), p(6, 1)]],
          plan: [0, 2, 1, 0], moves: new Map(), history: [], loading: false, auto: false, ended: false, lost: false, camera: { zoom: 1, x: 0, y: 0 } });
        resize(); tap(id); let time = 0;
        while (G.moves.has(id) && time < 10) { update(.001); time += .001; }
        results.push({ grid, id, speed, time, finished: !G.moves.has(id) });
      }
      cancelGuide(); return results;
    });
    for (const grid of ['square', 'hex']) for (const id of [0, 2]) {
      const rows = times.filter(r => r.grid === grid && r.id === id), normal = rows.find(r => r.speed === 'normal').time;
      assert.ok(rows.every(r => r.finished));
      assert.ok(Math.abs(rows.find(r => r.speed === 'fast').time / normal - .5) < .01);
      assert.ok(Math.abs(rows.find(r => r.speed === 'slow').time / normal - 2) < .02);
    }
  } finally { await browser.close(); }
});
