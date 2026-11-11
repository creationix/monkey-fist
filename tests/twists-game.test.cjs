const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.MF_TEST_URL || 'http://127.0.0.1:4173/';
const launch = () => chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });

test('one set screen restores defaults, persists selections, and preserves legacy progress', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.addInitScript(() => {
      if (!localStorage.getItem('monkey-fist')) localStorage.setItem('monkey-fist', JSON.stringify({ gen: 8, sgen: 2, slide: true,
        sets: { slide: { max: 7, stars: { 1: 3 } }, 'X10BS-E5DDK': { max: 4, stars: { 2: 2 } } }, custom: { mode: 'N', count: 20, seed: 'ALPHA', slide: true } }));
    });
    await page.goto(base); await page.locator('#levelsBtn').click();
    assert.equal(await page.locator('#customBtn').count(), 0);
    assert.equal(await page.locator('#scrCustom').count(), 0);
    assert.equal(await page.inputValue('#seedIn'), 'MONKEYFIST');
    assert.equal(await page.locator('#lvGrid button:enabled').count(), 7);
    await page.selectOption('#setMode', 'N'); await page.selectOption('#setCount', '20');
    await page.locator('#diceBtn').click();
    await page.waitForFunction(() => !document.querySelector('#genBtn').disabled);
    assert.notEqual(await page.inputValue('#seedIn'), 'MONKEYFIST');
    await page.locator('#defaultSeedBtn').click();
    await page.waitForFunction(() => !document.querySelector('#genBtn').disabled);
    assert.equal(await page.inputValue('#seedIn'), 'MONKEYFIST');
    assert.equal(await page.inputValue('#setMode'), 'N'); assert.equal(await page.inputValue('#setCount'), '20');
    await page.reload(); await page.locator('#levelsBtn').click();
    assert.equal(await page.inputValue('#setMode'), 'N');
    await page.locator('#seedIn').fill('C60S-MONKEYFIST'); await page.locator('#seedIn').blur();
    await page.waitForFunction(() => !document.querySelector('#genBtn').disabled);
    assert.equal(await page.locator('#lvGrid button:enabled').count(), 7);
    assert.equal(await page.evaluate(() => __mf.save.sets['X10BS-E5DDK'].stars[2]), 2);
  } finally { await browser.close(); }
});

test('every real Twists level animates, clears at par, and awards progression on both orientations', { timeout: 120000 }, async () => {
  const browser = await launch();
  try {
    for (const [width, height] of [[1366, 900], [390, 844]]) {
      const page = await browser.newPage({ viewport: { width, height } });
      const errors = []; page.on('pageerror', e => errors.push(String(e)));
      await page.goto(base); await page.locator('#levelsBtn').click();
      await page.selectOption('#setMode', 'T');
      await page.waitForFunction(() => !document.querySelector('#genBtn').disabled);
      assert.equal(await page.locator('#lvGrid button').count(), 12);
      assert.equal(await page.locator('#lvGrid button:enabled').count(), 1);
      await page.locator('#genBtn').click();
      for (let level = 1; level <= 12; level++) {
        await page.evaluate(level => __mf.startLevel(level), level);
        for (let move = 0; move < 60; move++) {
          const state = await page.evaluate(() => ({ auto: __mf.G.auto, ended: __mf.G.ended }));
          if (state.ended) break;
          if (!state.auto) {
            const at = await page.evaluate(() => {
              const g = __mf.G, n = g.noodles[g.plan[0]], p = n.cur.at(-1), b = document.querySelector('#board').getBoundingClientRect();
              const x = g.ox + (p.x + .5) * g.cs, y = g.oy + (p.y + .5) * g.cs;
              return { x: b.left + (g.rotated ? b.width - y : x), y: b.top + (g.rotated ? x : y) };
            });
            await page.mouse.click(at.x, at.y);
          }
          // Real pointer input with a controlled clock to check the whole pack quickly.
          await page.evaluate(() => { for (let i = 0; i < 600 && !__mf.G.ended; i++) { __mf.update(.05); if (!__mf.G.auto && !__mf.G.noodles.some(n => n.state === 'twist')) break; } __mf.draw(0); });
        }
        const result = await page.evaluate(() => ({ ended: __mf.G.ended, taps: __mf.G.taps, par: __mf.G.par,
          stars: __mf.progress().stars[__mf.G.level], unlocked: __mf.progress().max }));
        assert.equal(result.ended, true, `${width}: twist ${level}`);
        assert.equal(result.taps, result.par, `${width}: twist ${level} par`);
        assert.equal(result.stars, 3); assert.equal(result.unlocked, Math.min(12, level + 1));
      }
      assert.deepEqual(errors, []); await page.close();
    }
  } finally { await browser.close(); }
});

test('spring undo, key-gate restoration, and offline Twists use the main game', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext(), page = await context.newPage();
    await page.goto(base); await page.locator('#levelsBtn').click(); await page.selectOption('#setMode', 'T');
    await page.waitForFunction(() => !document.querySelector('#genBtn').disabled); await page.locator('#genBtn').click();
    const spring = await page.evaluate(() => {
      __mf.startLevel(8); const before = JSON.stringify(__mf.G.paths); __mf.tap(__mf.G.noodles[0]);
      __mf.undo(); return { before, after: JSON.stringify(__mf.G.paths), taps: __mf.G.taps, undos: __mf.G.undos, state: __mf.G.noodles[0].state };
    });
    assert.equal(spring.before, spring.after); assert.equal(spring.taps, 1); assert.equal(spring.undos, 2); assert.equal(spring.state, 'idle');
    const gate = await page.evaluate(() => {
      __mf.startLevel(10); __mf.tap(__mf.G.noodles[1]);
      for (let i = 0; i < 200; i++) __mf.update(.05);
      const open = !__mf.G.paths[1]; __mf.undo(); return { open, restored: !!__mf.G.paths[1], taps: __mf.G.taps };
    });
    assert.deepEqual(gate, { open: true, restored: true, taps: 1 });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true); await page.reload();
    await page.locator('#levelsBtn').click();
    assert.equal(await page.inputValue('#setMode'), 'T');
    await page.locator('#genBtn').click(); assert.equal(await page.evaluate(() => __mf.G.twist), true);
  } finally { await browser.close(); }
});
