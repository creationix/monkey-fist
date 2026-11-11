const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

async function fixture(page) {
  await page.evaluate(() => {
    __mf.useSet('slide'); __mf.startLevel(1);
    // Six independent free ropes, plus one blocked pair, so five manual clears do not auto-finish.
    const paths = Array.from({ length: 6 }, (_, y) => [{ x: 0, y }, { x: 1, y }]);
    paths.push([{ x: 0, y: 6 }, { x: 1, y: 6 }], [{ x: 5, y: 6 }, { x: 5, y: 7 }]);
    Object.assign(__mf.G, { W: 8, H: 8, left: 8, clear: false, auto: false, occ: MFLevels.occupancy(paths, 8, 8), plan: [0, 1, 2, 3, 4, 5, 7, 6] });
    __mf.G.noodles = paths.map((path, id) => ({ id, path, cur: path, off: 0, d: MFLevels.headDir(path), color: '#69db7c', state: 'idle', s: 0, v: 0, flash: 0, appear: 1, popped: false }));
    window.__announcements = [];
    if (!window.__originalToast) { window.__originalToast = toast; toast = text => { __announcements.push(text); __originalToast(text); }; }
    resize(); hud();
  });
}

test('hints cost two taps and cannot farm combos through expiry or undo', { timeout: 60000 }, async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', e => errors.push(String(e)));
    await page.goto(process.env.MF_TEST_URL || 'http://127.0.0.1:4173/');
    await page.waitForFunction(() => !!window.__mf);
    await fixture(page);
    const helped = await page.evaluate(() => {
      __mf.G.streak = 4;
      for (let id = 0; id < 5; id++) {
        __mf.G.plan = [id]; __mf.showHint();
        for (let t = 0; t < 60; t++) __mf.update(.05); // Highlight expiry cannot erase assistance.
        __mf.tap(__mf.G.noodles[id]);
        for (let t = 0; t < 120; t++) __mf.update(.05);
      }
      return { taps: __mf.G.taps, hints: __mf.G.hintsUsed, streak: __mf.G.streak, announcements: __announcements };
    });
    assert.equal(helped.taps, 15); assert.equal(helped.hints, 5); assert.equal(helped.streak, 0);
    assert.ok(!helped.announcements.some(text => /in a row/.test(text)));

    await fixture(page);
    const undo = await page.evaluate(() => {
      __mf.showHint(); __mf.showHint(); // Refreshing the visible hint does not double-charge.
      const hintCost = __mf.G.taps;
      __mf.tap(__mf.G.noodles[0]); for (let t = 0; t < 120; t++) __mf.update(.05);
      __mf.undo(); for (let t = 0; t < 120; t++) __mf.update(.05);
      __mf.tap(__mf.G.noodles[0]);
      return { hintCost, taps: __mf.G.taps, undos: __mf.G.undos, assisted: __mf.G.hintedRopes.has(0), streak: __mf.G.streak };
    });
    assert.deepEqual(undo, { hintCost: 2, taps: 5, undos: 2, assisted: true, streak: 0 });

    await fixture(page);
    const unassisted = await page.evaluate(() => {
      for (let id = 0; id < 5; id++) __mf.tap(__mf.G.noodles[id]);
      for (let t = 0; t < 300; t++) __mf.update(.05);
      return { taps: __mf.G.taps, streak: __mf.G.streak, announcements: __announcements };
    });
    assert.equal(unassisted.taps, 5); assert.equal(unassisted.streak, 5);
    assert.equal(unassisted.announcements.filter(text => text === '5 in a row!').length, 1, 'one milestone, not one per delayed pop');

    await fixture(page);
    const automatic = await page.evaluate(() => {
      __mf.tap(__mf.G.noodles[7]);
      for (let t = 0; t < 600; t++) __mf.update(.05);
      return { taps: __mf.G.taps, streak: __mf.G.streak, ended: __mf.G.ended, announcements: __announcements };
    });
    assert.equal(automatic.taps, 1); assert.equal(automatic.streak, 1); assert.equal(automatic.ended, true);
    assert.ok(!automatic.announcements.some(text => /in a row/.test(text)));

    await fixture(page);
    const limit = await page.evaluate(() => {
      for (let attempt = 0; attempt < 3; attempt++) {
        __mf.tap(__mf.G.noodles[0]); for (let t = 0; t < 120; t++) __mf.update(.05);
        __mf.undo(); for (let t = 0; t < 120; t++) __mf.update(.05);
      }
      __mf.tap(__mf.G.noodles[0]); for (let t = 0; t < 120; t++) __mf.update(.05);
      __mf.undo(); return { taps: __mf.G.taps, undos: __mf.G.undos };
    });
    assert.deepEqual(limit, { taps: 7, undos: 0 }, 'three undos remain the hard resource limit, with no hard tap cap');

    await page.evaluate(() => { __mf.useSet('T12S-MONKEYFIST'); __mf.startLevel(1); });
    await page.locator('#hintBtn').click();
    assert.equal(await page.evaluate(() => __mf.G.taps), 2);
    await page.evaluate(() => {
      const g = __mf.G, hinted = g.hint; __mf.tap(g.noodles[hinted]);
      for (let t = 0; t < 500 && g.noodles.some(n => n.state === 'twist'); t++) __mf.update(.05);
    });
    assert.equal(await page.evaluate(() => __mf.G.taps), 3);
    assert.equal(await page.evaluate(() => __mf.G.streak), 0);
    await page.evaluate(() => {
      const g = __mf.G;
      for (let k = 0; k < 60 && !g.ended; k++) {
        if (!g.auto) __mf.tap(g.noodles[g.plan[0]]);
        for (let t = 0; t < 600 && !g.ended; t++) { __mf.update(.05); if (!g.auto && !g.noodles.some(n => n.state === 'twist')) break; }
      }
    });
    assert.equal(await page.evaluate(() => __mf.G.taps - __mf.G.par), 2);
    await page.waitForFunction(() => document.querySelector('#scrResult').classList.contains('show'));
    assert.equal(await page.locator('#stars .on').count(), 2, 'the hint is reflected in the tap-based star score');
    assert.match(await page.locator('#resText').textContent(), new RegExp('^' + await page.evaluate(() => __mf.G.taps) + ' taps'));
    const original = await page.evaluate(() => {
      __mf.save.kid = false; __mf.useSet('campaign'); __mf.startLevel(1); __mf.G.streak = 4; __mf.showHint();
      return { hints: __mf.G.hintsUsed, hearts: __mf.G.hearts, streak: __mf.G.streak, label: document.querySelector('#hintBtn').title };
    });
    assert.equal(original.hints, 1); assert.equal(original.hearts, 3); assert.equal(original.streak, 0);
    assert.match(original.label, /1 star/);
    await page.evaluate(() => {
      for (let k = 0; k < 100 && !__mf.G.ended; k++) {
        if (!__mf.G.auto) { const n = __mf.G.noodles.find(n => n.state === 'idle' && __mf.ray(n.cur, __mf.G.occ, __mf.G.W, __mf.G.H).clear); if (n) __mf.tap(n); }
        for (let t = 0; t < 120; t++) __mf.update(.05);
      }
    });
    await page.waitForFunction(() => document.querySelector('#scrResult').classList.contains('show'));
    assert.equal(await page.locator('#stars .on').count(), 2, 'original-mode assistance costs a star, not a life');
    const kid = await page.evaluate(() => {
      __mf.save.kid = true; __mf.startLevel(1); __mf.showHint();
      return { time: __mf.G.time, hints: __mf.G.hintsUsed, streak: __mf.G.streak, assisted: __mf.G.hintedRopes.has(__mf.G.hint) };
    });
    assert.ok(kid.time >= 5); assert.equal(kid.hints, 1); assert.equal(kid.streak, 0); assert.equal(kid.assisted, true);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
