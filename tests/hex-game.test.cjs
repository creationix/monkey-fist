const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = (process.env.MF_TEST_URL || 'http://127.0.0.1:4173/') + 'hex/';
const launch = () => chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
const ready = page => page.waitForFunction(() => window.__hex?.G.level && !__hex.G.loading);
async function clickRope(page, id) {
  const p = await page.evaluate(id => { const g = __hex.G, p = __hex.screen(g.paths[id].at(-1)), r = document.querySelector('#board').getBoundingClientRect(); return { x: r.left + p.x, y: r.top + p.y }; }, id);
  await page.mouse.click(p.x, p.y);
}
async function settle(page) { await page.evaluate(() => { for (let i = 0; i < 1200 && (__hex.G.moving || __hex.G.auto) && !__hex.G.ended; i++) __hex.update(.05); __hex.draw(0); }); }

test('hex puzzles play at par through real taps on phone and laptop, including large rope-only boards', { timeout: 120000 }, async () => {
  const browser = await launch();
  try {
    for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport }), errors = []; page.on('pageerror', e => errors.push(String(e)));
      await page.goto(base); await ready(page);
      for (const index of [0, 2, 4, 25, 59]) {
        await page.evaluate(i => __hex.start(i), index);
        for (let move = 0; move < 400 && !await page.evaluate(() => __hex.G.ended); move++) {
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

test('hint costs, three undos, slide restoration, resize, persistence, seed controls and offline play', { timeout: 90000 }, async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext(), page = await context.newPage({ viewport: { width: 1366, height: 900 } });
    await page.addInitScript(() => { if (!localStorage.getItem('monkey-fist')) localStorage.setItem('monkey-fist', '{"keep":"square progress"}'); });
    await page.goto(base + '?set=H60B-ALPHA&level=60'); await ready(page);
    const before = await page.evaluate(() => JSON.stringify(__hex.G.paths));
    await page.locator('#hint').click(); await page.locator('#hint').click(); assert.equal(await page.evaluate(() => __hex.G.taps), 2);
    const first = await page.evaluate(() => __hex.G.plan[0]); await clickRope(page, first); await page.locator('#undo').click();
    assert.equal(await page.evaluate(() => JSON.stringify(__hex.G.paths)), before); assert.equal(await page.evaluate(() => __hex.G.taps), 4);
    for (let n = 0; n < 2; n++) { await clickRope(page, first); await page.locator('#undo').click(); }
    assert.equal(await page.evaluate(() => __hex.G.undos), 0); assert.equal(await page.locator('#undo').isDisabled(), true);
    await page.locator('#restart').click(); await ready(page);
    let checkedSlide = false;
    for (let n = 0; n < 300; n++) {
      const state = await page.evaluate(() => { const g = __hex.G, id = g.plan[0], m = MFHex.tap(g.level, g.paths, id); return { id, slides: m.event === 'slide', paths: JSON.stringify(g.paths) }; });
      await clickRope(page, state.id); await settle(page);
      if (state.slides) {
        assert.notEqual(await page.evaluate(() => JSON.stringify(__hex.G.paths)), state.paths);
        await page.locator('#undo').click(); assert.equal(await page.evaluate(() => JSON.stringify(__hex.G.paths)), state.paths); checkedSlide = true; break;
      }
    }
    assert.ok(checkedSlide);
    const state = await page.evaluate(() => JSON.stringify(__hex.G.paths)); await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => JSON.stringify(__hex.G.paths)), state); await clickRope(page, await page.evaluate(() => __hex.G.plan[0])); await settle(page);
    await page.locator('#levels').click(); assert.equal(await page.locator('#grid button').count(), 60);
    await page.selectOption('#count', '120'); await page.locator('#dice').click(); assert.notEqual(await page.inputValue('#seed'), 'ALPHA');
    await page.locator('#defaultSeed').click(); assert.equal(await page.inputValue('#seed'), 'MONKEYFIST');
    await page.locator('#grid button').nth(119).click(); await ready(page); assert.equal(await page.evaluate(() => __hex.G.index), 119);
    assert.ok(await page.evaluate(() => __hex.G.level.W * __hex.G.level.H >= 2160));
    await page.reload(); await ready(page); assert.equal(await page.evaluate(() => __hex.G.index), 119); assert.equal(await page.evaluate(() => __hex.options.count), 120);
    assert.equal(await page.evaluate(() => localStorage.getItem('monkey-fist')), '{"keep":"square progress"}');
    await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true); await page.goto(base + '?set=H30-OFFLINE&level=30'); await ready(page);
    assert.equal(await page.evaluate(() => __hex.options.seed), 'OFFLINE'); assert.equal(await page.evaluate(() => __hex.G.index), 29);
    await page.locator('#hint').click(); assert.equal(await page.evaluate(() => __hex.G.taps), 2);
  } finally { await browser.close(); }
});

test('colossal boards generate without blocking, cancel safely, archive old scores, and support zoom/pan/taps', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }), page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem('monkey-fist-hex-v1', JSON.stringify({ gen: 2, code: 'H60B-MONKEYFIST', level: 60, sound: false, sets: { 'H60B-MONKEYFIST': { 59: { stars: 3, taps: 30 } } } })));
    await page.goto(base);
    assert.equal(await page.evaluate(() => __hex.G.loading), true);
    await page.evaluate(async () => { const obsolete = __hex.start(58); await __hex.start(0); await obsolete; });
    assert.equal(await page.evaluate(() => __hex.G.index), 0);
    assert.equal(await page.evaluate(() => __hex.G.level.index), 0);
    assert.deepEqual(await page.evaluate(() => __hex.save.sets), {});
    assert.equal(await page.evaluate(() => __hex.save.archives['gen-2']['H60B-MONKEYFIST'][59].stars), 3);
    assert.equal(await page.evaluate(() => __hex.save.sound), 'off');
    const frames = await page.evaluate(async () => {
      let frames = 0, done = false; const frame = () => { frames++; if (!done) requestAnimationFrame(frame); }; requestAnimationFrame(frame);
      await __hex.start(59); done = true; return frames;
    });
    assert.ok(frames > 5, 'page keeps rendering while generation works');
    const paths = await page.evaluate(() => JSON.stringify(__hex.G.paths));
    await page.locator('#zoomIn').click(); await page.locator('#zoomIn').click();
    const box = await page.locator('#board').boundingBox(), center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(center.x, center.y); await page.mouse.down(); await page.mouse.move(center.x + 90, center.y + 70, { steps: 5 }); await page.mouse.up();
    assert.equal(await page.evaluate(() => __hex.G.taps), 0); assert.ok(await page.evaluate(() => __hex.G.camera.x > 0));
    assert.equal(await page.evaluate(() => JSON.stringify(__hex.G.paths)), paths);
    await page.locator('#zoomFit').click();
    assert.deepEqual(await page.evaluate(() => __hex.G.camera), { zoom: 1, x: 0, y: 0 });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: center.x - 30, y: center.y, id: 1 }, { x: center.x + 30, y: center.y, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: center.x - 90, y: center.y, id: 1 }, { x: center.x + 90, y: center.y, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.ok(await page.evaluate(() => __hex.G.camera.zoom > 2.5)); assert.equal(await page.evaluate(() => __hex.G.taps), 0);
    await page.locator('#hint').click(); const first = await page.evaluate(() => __hex.G.plan[0]);
    await clickRope(page, first); assert.equal(await page.evaluate(() => __hex.G.taps), 3);
    await page.locator('#undo').click(); assert.equal(await page.evaluate(() => JSON.stringify(__hex.G.paths)), paths);
    assert.equal(await page.evaluate(() => __hex.G.taps), 4);
  } finally { await browser.close(); }
});

test('the canvas fills the viewport while corner controls stay fixed through pan, zoom, and fullscreen', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.goto(base + '?set=H60B-MONKEYFIST&level=60'); await ready(page);
    const controls = ['.brand', '.readout', '.actions', '#audioControls', '#zoomControls'];
    for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 844, height: 390 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(viewport); await page.locator('#zoomFit').click();
      const canvas = await page.locator('#board').boundingBox();
      assert.deepEqual(canvas, { x: 0, y: 0, ...viewport });
      const before = await Promise.all(controls.map(s => page.locator(s).boundingBox()));
      for (const box of before) { assert.ok(box.x >= 0 && box.y >= 0); assert.ok(box.x + box.width <= viewport.width && box.y + box.height <= viewport.height); }
      const x = viewport.width / 2, y = viewport.height / 2;
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 45, y + 35, { steps: 5 }); await page.mouse.up();
      assert.equal(await page.evaluate(() => __hex.G.taps), 0);
      assert.ok(await page.evaluate(() => __hex.G.camera.x > 0 && __hex.G.camera.y > 0), 'can pan clear of controls without zooming');
      await page.locator('#zoomIn').click();
      assert.deepEqual(await Promise.all(controls.map(s => page.locator(s).boundingBox())), before);
      await page.locator('#zoomFit').click();
      assert.deepEqual(await page.evaluate(() => __hex.G.camera), { zoom: 1, x: 0, y: 0 });
    }
    for (let repeat = 0; repeat < 2; repeat++) {
      await page.evaluate(() => {
        const g = __hex.G, p = __hex.screen(g.paths[g.plan[0]].at(-1)), box = document.querySelector('.readout').getBoundingClientRect();
        g.camera.x += box.x + box.width / 2 - p.x; g.camera.y += box.y + box.height / 2 - p.y; applyCamera();
      });
      await page.locator('#hint').click();
      const head = await page.evaluate(() => __hex.screen(__hex.G.paths[__hex.G.plan[0]].at(-1)));
      assert.ok(Math.abs(head.x - 160) < 1 && Math.abs(head.y - 284) < 1, 'hint moves a rope out from under the noninteractive readout');
      assert.equal(await page.evaluate(() => __hex.G.taps), 2, 'refocusing the same active hint costs no additional taps');
    }
    await page.locator('#fullscreen').click(); await page.waitForFunction(() => !!document.fullscreenElement);
    assert.equal(await page.locator('#fullscreen').getAttribute('aria-pressed'), 'true');
    await page.locator('#fullscreen').click(); await page.waitForFunction(() => !document.fullscreenElement);
    assert.equal(await page.evaluate(() => __hex.G.taps), 2);
  } finally { await browser.close(); }
});
