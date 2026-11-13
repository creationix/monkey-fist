const test = require('node:test'), assert = require('node:assert/strict');
const { base, launch, ready } = require('./browser-helpers.cjs');

test('real multi-touch tolerates drift and an edge grip, recovers from cancel, and leaves small boards centered', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 800, height: 1000 }, hasTouch: true, isMobile: true }), page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => { requestAnimationFrame = () => 0; });
    await page.goto(base); await ready(page);
    assert.equal(await page.evaluate(() => __game.G.view.zoomable), false);
    const cdp = await context.newCDPSession(page), held = { x: 6, y: 500, id: 10, radiusX: 8, radiusY: 8 };
    const send = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
    await send('touchStart', [held]);
    const target = await page.evaluate(() => { const g = __game.G; return __game.screen(g.paths[g.plan[0]].at(-1)); });
    const finger = { ...target, id: 20, radiusX: 7, radiusY: 7 };
    const released = { ...finger, x: finger.x + 22, y: finger.y + 14 };
    await send('touchStart', [held, finger]); await send('touchMove', [held, released]); await send('touchEnd', [released]);
    assert.equal(await page.evaluate(() => __game.G.taps), 1);
    assert.deepEqual(await page.evaluate(() => __game.G.camera), { zoom: 1, x: 0, y: 0 });
    await send('touchCancel', []); assert.equal(await page.evaluate(() => input.pointers.size), 0);
    await page.evaluate(() => __game.start(0));
    await send('touchStart', [{ ...finger, id: 30 }]); await send('touchEnd', []); assert.equal(await page.evaluate(() => __game.G.taps), 1);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('large-board Fit locks panning, zoom transitions smoothly, and game gestures are consumed without breaking menus', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); await page.addInitScript(() => { requestAnimationFrame = () => 0; });
    await page.goto(base + '?set=U1-H-100-100-1-N-TOUCH'); await ready(page);
    const result = await page.evaluate(() => {
      const g = __game.G; g.camera.x = 300; g.camera.y = -300; applyCamera(); const fit = { ...g.camera };
      zoomTo(2, undefined, true); const immediately = g.camera.zoom; __game.update(.05); const during = g.camera.zoom;
      for (let i = 0; i < 6; i++) __game.update(.05);
      g.camera.x = 80; g.camera.y = -100; applyCamera(); fitBoard(); const beforeFit = g.camera.zoom; __game.update(.05); const duringFit = g.camera.zoom;
      for (let i = 0; i < 6; i++) __game.update(.05);
      const board = document.querySelector('#board'), events = ['contextmenu', 'selectstart', 'touchstart', 'touchmove', 'touchend', 'gesturestart'];
      return { fit, immediately, during, beforeFit, duringFit, after: g.camera, consumed: events.map(type => !board.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }))), select: getComputedStyle(document.querySelector('#game')).userSelect };
    });
    assert.deepEqual(result.fit, { zoom: 1, x: 0, y: 0 }); assert.equal(result.immediately, 1); assert.ok(result.during > 1 && result.during < 2);
    assert.equal(result.beforeFit, 2); assert.ok(result.duringFit > 1 && result.duringFit < 2); assert.deepEqual(result.after, { zoom: 1, x: 0, y: 0 });
    assert.ok(result.consumed.every(Boolean)); assert.equal(result.select, 'none');
    await page.click('#levels'); await page.click('#custom'); await page.fill('#seed', 'EDITABLE'); assert.equal(await page.inputValue('#seed'), 'EDITABLE');
    assert.equal(await page.locator('#seed').evaluate(e => getComputedStyle(e).userSelect), 'text');
  } finally { await browser.close(); }
});

test('exit sounds fire when the entire rope clears the board and viewport, before the extended route ends', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage(); await page.addInitScript(() => { requestAnimationFrame = () => 0; });
    for (const grid of ['S', 'H']) {
      await page.goto(base + `?set=U1-${grid}-65-65-1-N-EXIT`); await ready(page);
      const result = await page.evaluate(() => {
        const g = __game.G, id = g.paths.findIndex((p, i) => p && MFGame.tap(g.level, g.paths, i)?.event === 'exit');
        let sounds = 0; sfx.pop = () => sounds++; __game.tap(id); const move = g.moves.get(id); let premature = false;
        for (let n = 0; n < 1000 && g.moves.has(id); n++) {
          __game.update(1 / 120);
          if (sounds) { g.moves.set(id, move); premature = !exitCleared(id); g.moves.delete(id); }
        }
        return { sounds, premature, early: move.progress < move.distance - 1, ended: !g.moves.has(id) };
      });
      assert.deepEqual(result, { sounds: 1, premature: false, early: true, ended: true });
    }
  } finally { await browser.close(); }
});
