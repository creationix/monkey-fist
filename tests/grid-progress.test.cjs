const test = require('node:test'), assert = require('node:assert/strict');
const { base, launch, ready } = require('./browser-helpers.cjs');
const { GRID_VERSION } = require('../game-engine');

async function load(data) {
  const browser = await launch(), page = await browser.newPage();
  await page.addInitScript(data => {
    const key = 'monkey-fist-unified-v1';
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data));
  }, data);
  await page.goto(base + '?set=J3-MONKEYFIST'); await ready(page);
  return { browser, page };
}

test('scores from another generator version are cleared, but Journey chapter access stays', { timeout: 60000 }, async () => {
  const { browser, page } = await load({ gridGen: GRID_VERSION - 1, chapterSets: { 'J3-MONKEYFIST': 4 },
    sets: { 'J3-MONKEYFIST': { 0: { taps: 1, stars: 3 } }, 'U3-S-1-1-4-5-1-N-OLD': { 0: { taps: 1, stars: 3 } } }, sound: 'off', music: false });
  try {
    const state = await page.evaluate(() => __game.save);
    assert.equal(state.gridGen, GRID_VERSION);
    assert.deepEqual(state.sets, {});
    assert.equal(state.chapterSets['J3-MONKEYFIST'], 4);
    await page.evaluate(() => { __game.save.sets['J3-MONKEYFIST'] = { 0: { taps: 2, stars: 3 } }; persist(); });
    await page.reload(); await ready(page);
    assert.deepEqual(await page.evaluate(() => __game.save.sets['J3-MONKEYFIST']), { 0: { taps: 2, stars: 3 } }, 'current scores survive a reload');
  } finally { await browser.close(); }
});
