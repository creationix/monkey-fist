const test = require('node:test'), assert = require('node:assert/strict');
const { base, launch, ready, settle, clickNext, solve } = require('./browser-helpers.cjs');

test('one journey opens ten levels at a time and keeps chapter unlocks after reload', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => { requestAnimationFrame = () => 0; });
    await page.goto(base + '?level=120'); await ready(page);
    assert.equal(await page.evaluate(() => __game.G.index), 9, 'a link cannot skip locked groups');
    await page.click('#levels'); assert.equal(await page.locator('#grid button').count(), 120); assert.equal(await page.locator('#grid button:enabled').count(), 10);
    await page.click('[data-level="1"]'); await ready(page); const first = await solve(page); assert.equal(first.ended, true); assert.equal(first.taps, first.par);
    assert.equal(await page.evaluate(() => __game.save.chapters), 1);
    await page.click('#resultLevels'); await page.click('[data-level="10"]'); await ready(page);
    const result = await solve(page); assert.equal(result.ended, true); assert.equal(result.taps, result.par);
    assert.match(await page.locator('#unlocked').textContent(), /11–20 unlocked/);
    await page.click('#next'); await ready(page); assert.equal(await page.evaluate(() => __game.G.index), 10);
    await page.reload(); await ready(page); await page.click('#levels'); assert.equal(await page.locator('#grid button:enabled').count(), 20);
    await page.click('[data-level="20"]'); await ready(page); assert.equal((await solve(page)).ended, true);
    await page.click('#resultLevels'); assert.equal(await page.locator('#grid button:enabled').count(), 30);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('custom square, Hex, mirrors and springs play at par on phone and laptop with concurrent taps', { timeout: 120000 }, async () => {
  const browser = await launch();
  try {
    for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport }), errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => { requestAnimationFrame = () => 0; });
      for (const [grid, features, difficulty] of [['S', 'N', 70], ['H', 'N', 100], ['S', 'MS', 75], ['H', 'MS', 100]]) {
        await page.goto(base + `?set=U1-${grid}-${difficulty}-${difficulty}-1-${features}-BRAID`); await ready(page);
        await page.screenshot({ path: `/tmp/monkey-unified-${grid}-${features}-${viewport.width}.png` });
        await clickNext(page);
        const first = await page.evaluate(() => __game.G.plan[0]);
        if (!await page.evaluate(i => __game.G.moves.has(i), first)) { await clickNext(page); assert.equal(await page.evaluate(() => __game.G.moves.size), 2); }
        await settle(page);
        const result = await solve(page); assert.equal(result.ended, true); assert.equal(result.taps, result.par); assert.equal(await page.locator('#next').isVisible(), false);
        assert.equal(await page.evaluate(() => __game.save.chapters), 1, 'custom clears do not unlock the journey');
      }
      assert.deepEqual(errors, []); await page.close();
    }
  } finally { await browser.close(); }
});

test('custom controls, old bookmarks, worker fallback, and offline saves use the same game', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext(), page = await context.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => { requestAnimationFrame = () => 0; window.Worker = undefined; if (!localStorage.getItem('monkey-fist')) localStorage.setItem('monkey-fist', '{"keep":"old scores","sound":false}'); });
    await page.goto(base + 'hex/?set=H60M-BRAID&level=6'); await ready(page);
    assert.equal(await page.evaluate(() => __game.G.level.grid), 'hex');
    assert.equal(await page.evaluate(() => __game.save.sound), 'off');
    await page.click('#levels'); await page.selectOption('#gridChoice', 'mixed');
    await page.fill('#count', '35'); await page.locator('#count').press('Tab');
    await page.fill('#minDifficulty', '20'); await page.locator('#minDifficulty').press('Tab');
    await page.fill('#maxDifficulty', '85'); await page.locator('#maxDifficulty').press('Tab');
    await page.check('#springs'); await page.click('#dice'); assert.notEqual(await page.inputValue('#seed'), 'BRAID');
    await page.click('#defaultSeed'); assert.equal(await page.inputValue('#seed'), 'MONKEYFIST');
    assert.equal(await page.locator('#grid button:enabled').count(), 35);
    await page.click('[data-level="35"]'); await ready(page);
    assert.deepEqual(await page.evaluate(() => __game.options), { revision: 2, sizeMin: 6, sizeMax: 40, kind: 'custom', seed: 'MONKEYFIST', grid: 'mixed', count: 35, min: 20, max: 85, mirrors: true, springs: true });
    const before = await page.evaluate(() => JSON.stringify(__game.G.level));
    await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { polling: 50 });
    await context.setOffline(true); await page.reload(); await ready(page);
    assert.equal(await page.evaluate(() => JSON.stringify(__game.G.level)), before);
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('monkey-fist'))), { keep: 'old scores', sound: false });
    await page.click('#levels'); await page.click('#journey'); assert.equal(await page.locator('#grid button:enabled').count(), 10);
    await page.click('[data-level="6"]'); await ready(page); assert.equal(await page.evaluate(() => __game.G.level.grid), require('../game-engine').spec(require('../game-engine').DEFAULT, 5).grid);
    assert.equal((await solve(page)).ended, true);
  } finally { await browser.close(); }
});

test('hint assistance survives expiry and undo; blocked taps cost one and there are only three undos', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage(); await page.addInitScript(() => { requestAnimationFrame = () => 0; });
    for (const grid of ['S', 'H']) {
      await page.goto(base + `?set=U1-${grid}-80-80-1-MS-COMBO`); await ready(page);
      const original = await page.evaluate(() => JSON.stringify(__game.G.paths));
      await page.evaluate(() => { __game.G.combo = 4; }); await page.click('#hint'); await page.click('#hint');
      assert.deepEqual(await page.evaluate(() => [__game.G.taps, __game.G.combo]), [2, 0]);
      await page.evaluate(() => { for (let i = 0; i < 80; i++) __game.update(.05); });
      for (let i = 0; i < 3; i++) {
        await clickNext(page); await page.click('#undo');
        assert.equal(await page.evaluate(() => JSON.stringify(__game.G.paths)), original);
        assert.equal(await page.evaluate(() => __game.G.combo), 0);
      }
      assert.equal(await page.locator('#undo').isDisabled(), true); assert.equal(await page.evaluate(() => __game.G.taps), 8);
      await clickNext(page); await settle(page); assert.equal(await page.evaluate(() => __game.G.combo), 0);
      const result = await solve(page); assert.equal(result.ended, true); assert.equal(result.taps, result.par + 8);
      await page.click('#again'); await ready(page);
      const blocked = await page.evaluate(() => { const g = __game.G; return g.paths.findIndex((p, i) => p && !MFGame.tap(g.level, g.paths, i)); });
      assert.ok(blocked >= 0); await page.evaluate(i => __game.tap(i), blocked); assert.equal(await page.evaluate(() => __game.G.taps), 1);
    }
  } finally { await browser.close(); }
});

test('rotation and zoom preserve the logical board and departing ropes animate to the screen edge', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } }); await page.addInitScript(() => { requestAnimationFrame = () => 0; });
    for (const grid of ['S', 'H']) {
      await page.goto(base + `?set=U1-${grid}-65-65-1-M-VIEW`); await ready(page);
      const original = await page.evaluate(() => JSON.stringify([__game.G.paths, __game.G.plan]));
      await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => resize());
      await page.click('#zoomIn'); await page.click('#zoomFit');
      assert.equal(await page.evaluate(() => JSON.stringify([__game.G.paths, __game.G.plan])), original);
      await page.setViewportSize({ width: 1366, height: 768 }); await page.evaluate(() => resize());
      const animation = await page.evaluate(() => {
        const g = __game.G, id = g.paths.findIndex((p, i) => p && MFGame.tap(g.level, g.paths, i)?.event === 'exit');
        __game.tap(id); __game.update(1 / 60); const move = g.moves.get(id), progress = move.progress;
        move.progress = move.distance; const tail = __game.screen(visiblePath(id)[0]); move.progress = progress;
        __game.draw(0); return { moving: g.moves.has(id), progress, tail, w: innerWidth, h: innerHeight };
      });
      assert.ok(animation.moving && animation.progress > 0);
      assert.ok(animation.tail.x < -10 || animation.tail.x > animation.w + 10 || animation.tail.y < -10 || animation.tail.y > animation.h + 10);
    }
  } finally { await browser.close(); }
});
