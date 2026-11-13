const test = require('node:test');
const assert = require('node:assert/strict');
const { base, launch, ready } = require('./browser-helpers.cjs');

// Dispatch an input event rather than change: moving a thumb must update its
// value and settings immediately, before the finger leaves the screen.
async function slide(page, id, value) {
  await page.locator('#' + id).evaluate((input, value) => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); }, String(value));
}

test('custom sliders update board dimensions live and the generated game queues a full solution', { timeout: 120000 }, async () => {
  const browser = await launch();
  try {
    for (const [grid, viewport] of [['S', { width: 1366, height: 768 }], ['H', { width: 390, height: 844 }]]) {
      const page = await browser.newPage({ viewport, hasTouch: true }), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => { requestAnimationFrame = () => 0; });
      await page.goto(base + `?set=U3-${grid}-1-100-10-14-3-N-SLIDERS`); await ready(page);
      await page.getByRole('button', { name: 'Menu', exact: true }).click();
      for (const id of ['gridWidth', 'gridHeight', 'count', 'minDifficulty', 'maxDifficulty']) assert.equal(await page.locator('#' + id).getAttribute('type'), 'range');
      await page.locator('#gridWidth').scrollIntoViewIfNeeded();
      const track = await page.locator('#gridWidth').boundingBox();
      await page.touchscreen.tap(track.x + track.width * .8, track.y + track.height / 2);
      assert.ok(Number(await page.inputValue('#gridWidth')) > 10, 'a finger tap on the native track changes grid width');
      await slide(page, 'gridWidth', 12); await slide(page, 'gridHeight', 10);
      await slide(page, 'count', 2); await slide(page, 'minDifficulty', 70); await slide(page, 'maxDifficulty', 90);
      assert.equal(await page.locator('#gridWidthValue').textContent(), '12');
      assert.equal(await page.locator('#gridHeightValue').textContent(), '10');
      assert.equal(await page.locator('#countValue').textContent(), '2');
      assert.equal(await page.locator('#minDifficultyValue').textContent(), '70');
      assert.equal(await page.locator('#maxDifficultyValue').textContent(), '90');
      assert.equal(await page.locator('#grid button:enabled').count(), 2);
      await page.locator('[data-level="1"]').click(); await ready(page);
      assert.deepEqual(await page.evaluate(() => [__game.G.level.W, __game.G.level.H]), [12, 10]);
      const shared = await page.evaluate(() => location.search); assert.match(shared, /set=U3-/);
      await page.reload(); await ready(page);
      assert.deepEqual(await page.evaluate(() => [__game.G.level.W, __game.G.level.H]), [12, 10]);
      await page.click('#autoSolve');
      assert.equal(await page.evaluate(() => __game.G.paths.every(p => !p)), true);
      await page.evaluate(() => { for (let n = 0; n < 10000 && !__game.G.ended; n++) __game.update(.05); __game.draw(0); });
      assert.equal(await page.evaluate(() => __game.G.ended), true);
      assert.equal(await page.locator('#resultText').textContent(), 'Auto-solved · 0 stars');
      assert.deepEqual(errors, []); await page.close();
    }
  } finally { await browser.close(); }
});

test('touch-friendly bounds keep difficulty ordered and reserve enough grid space for twists', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await page.goto(base + '?set=U3-S-1-100-4-4-1-N-LIMITS'); await ready(page);
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await slide(page, 'minDifficulty', 90); await slide(page, 'maxDifficulty', 20);
    const minimum = Number(await page.inputValue('#minDifficulty')), maximum = Number(await page.inputValue('#maxDifficulty'));
    assert.ok(minimum <= maximum, 'the From/To range cannot invert');
    await page.locator('#mirrors').check();
    assert.equal(await page.locator('#gridWidth').getAttribute('min'), '8');
    assert.equal(await page.locator('#gridHeight').getAttribute('min'), '8');
    assert.equal(await page.inputValue('#gridWidth'), '8'); assert.equal(await page.inputValue('#gridHeight'), '8');
    assert.equal(await page.locator('#gridSizeHint').isVisible(), true);
    const rects = await page.locator('#gridWidth, #gridHeight, #minDifficulty, #maxDifficulty, #count').evaluateAll(inputs => inputs.map(input => ({ height: input.getBoundingClientRect().height, width: input.getBoundingClientRect().width })));
    assert.ok(rects.every(rect => rect.height >= 40 && rect.width >= 180), 'slider tracks expose large finger targets on a phone');
    assert.equal(await page.locator('#gridWidth').getAttribute('max'), '24');
    assert.equal(await page.locator('#count').getAttribute('max'), '200');
  } finally { await browser.close(); }
});

test('published rope-count custom links upgrade to packed grid dimensions on reload', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => { requestAnimationFrame = () => 0; });
    await page.goto(base + '?set=U2-H-100-100-2-2-1-MS-PACKED'); await ready(page);
    assert.match(await page.evaluate(() => location.search), /set=U3-H-100-100-10-14-1-MS-PACKED/);
    const board = await page.evaluate(() => ({ W: __game.G.level.W, H: __game.G.level.H,
      density: __game.G.level.ropes.reduce((total, path) => total + path.length, 0) / (__game.G.level.W * __game.G.level.H) }));
    assert.deepEqual([board.W, board.H], [10, 14]); assert.ok(board.density >= .8);
    await page.reload(); await ready(page);
    assert.deepEqual(await page.evaluate(() => [__game.options.revision, __game.options.width, __game.options.height, __game.options.seed]), [3, 10, 14, 'PACKED']);
  } finally { await browser.close(); }
});
