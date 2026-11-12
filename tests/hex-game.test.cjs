const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = (process.env.MF_TEST_URL || 'http://127.0.0.1:4173/') + 'hex/';
const launch = () => chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
async function clickRope(page, id) {
  const p = await page.evaluate(id => { const g = __hex.G, p = __hex.screen(g.paths[id].at(-1)), r = document.querySelector('#board').getBoundingClientRect(); return { x: r.left + p.x, y: r.top + p.y }; }, id);
  await page.mouse.click(p.x, p.y);
}
async function settle(page) { await page.evaluate(() => { for (let i = 0; i < 1200 && (__hex.G.moving || __hex.G.auto) && !__hex.G.ended; i++) __hex.update(.05); __hex.draw(0); }); }

test('hex puzzles play at par through real taps on phone and laptop, including large locked boards', { timeout: 120000 }, async () => {
  const browser = await launch();
  try {
    for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport }), errors = []; page.on('pageerror', e => errors.push(String(e)));
      await page.goto(base);
      for (const index of [0, 2, 4, 25, 59]) {
        await page.evaluate(i => __hex.start(i), index);
        for (let move = 0; move < 100 && !await page.evaluate(() => __hex.G.ended); move++) {
          const id = await page.evaluate(() => __hex.G.plan[0]); assert.notEqual(id, undefined);
          await clickRope(page, id); await settle(page);
        }
        const result = await page.evaluate(() => ({ ended: __hex.G.ended, taps: __hex.G.taps, par: __hex.G.level.par, stars: __hex.save.sets[MFHex.code(__hex.options)][__hex.G.index]?.stars }));
        assert.equal(result.ended, true); assert.equal(result.taps, result.par); assert.equal(result.stars, 3);
        assert.ok(await page.locator('#result').isVisible());
        if (index === 59) assert.equal(await page.locator('#next').isVisible(), false);
      }
      assert.deepEqual(errors, []); await page.close();
    }
  } finally { await browser.close(); }
});

test('hint costs, three undos, key restoration, resize, persistence, seed controls and offline play', { timeout: 90000 }, async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext(), page = await context.newPage({ viewport: { width: 1366, height: 900 } });
    await page.addInitScript(() => { if (!localStorage.getItem('monkey-fist')) localStorage.setItem('monkey-fist', '{"keep":"square progress"}'); });
    await page.goto(base + '?set=H60B-ALPHA&level=60');
    const before = await page.evaluate(() => JSON.stringify(__hex.G.paths));
    await page.locator('#hint').click(); await page.locator('#hint').click(); assert.equal(await page.evaluate(() => __hex.G.taps), 2);
    const first = await page.evaluate(() => __hex.G.plan[0]); await clickRope(page, first); await page.locator('#undo').click();
    assert.equal(await page.evaluate(() => JSON.stringify(__hex.G.paths)), before); assert.equal(await page.evaluate(() => __hex.G.taps), 4);
    for (let n = 0; n < 2; n++) { await clickRope(page, first); await page.locator('#undo').click(); }
    assert.equal(await page.evaluate(() => __hex.G.undos), 0); assert.equal(await page.locator('#undo').isDisabled(), true);
    await page.locator('#restart').click();
    let checkedKey = false;
    for (let n = 0; n < 100; n++) {
      const state = await page.evaluate(() => { const g = __hex.G, id = g.plan[0], m = MFHex.tap(g.level, g.paths, id); return { id, opens: m.event === 'exit' && g.level.locks.some(l => l.key === id), paths: JSON.stringify(g.paths) }; });
      await clickRope(page, state.id); await settle(page);
      if (state.opens) {
        assert.equal(await page.evaluate(i => __hex.G.paths[i], state.id), null);
        await page.locator('#undo').click(); assert.equal(await page.evaluate(() => JSON.stringify(__hex.G.paths)), state.paths); checkedKey = true; break;
      }
    }
    assert.ok(checkedKey);
    const state = await page.evaluate(() => JSON.stringify(__hex.G.paths)); await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => JSON.stringify(__hex.G.paths)), state); await clickRope(page, await page.evaluate(() => __hex.G.plan[0])); await settle(page);
    await page.locator('#levels').click(); assert.equal(await page.locator('#grid button').count(), 60);
    await page.selectOption('#count', '120'); await page.locator('#dice').click(); assert.notEqual(await page.inputValue('#seed'), 'ALPHA');
    await page.locator('#defaultSeed').click(); assert.equal(await page.inputValue('#seed'), 'MONKEYFIST');
    await page.locator('#grid button').nth(119).click(); assert.equal(await page.evaluate(() => __hex.G.index), 119);
    assert.ok(await page.evaluate(() => __hex.G.level.W * __hex.G.level.H >= 190));
    await page.reload(); assert.equal(await page.evaluate(() => __hex.G.index), 119); assert.equal(await page.evaluate(() => __hex.options.count), 120);
    assert.equal(await page.evaluate(() => localStorage.getItem('monkey-fist')), '{"keep":"square progress"}');
    await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true); await page.goto(base + '?set=H30-OFFLINE&level=30');
    assert.equal(await page.evaluate(() => __hex.options.seed), 'OFFLINE'); assert.equal(await page.evaluate(() => __hex.G.index), 29);
    await page.locator('#hint').click(); assert.equal(await page.evaluate(() => __hex.G.taps), 2);
  } finally { await browser.close(); }
});
