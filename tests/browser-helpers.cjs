const { chromium } = require('playwright');
const base = process.env.MF_TEST_URL || 'http://127.0.0.1:4173/';
const launch = () => chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
const ready = page => page.waitForFunction(() => window.__game?.G.level && !__game.G.loading, null, { polling: 50 });
const settle = page => page.evaluate(() => { for (let n = 0; n < 2000 && (__game.G.moving || __game.G.auto) && !__game.G.ended; n++) __game.update(.05); __game.draw(0); });
async function clickNext(page) {
  const p = await page.evaluate(() => {
    const i = __game.G.plan[0]; focusRope(i); __game.draw(0);
    // Tap the head, or the nearest rope cell not covered by a floating control.
    const board = document.querySelector('#board'), box = board.getBoundingClientRect();
    for (const cell of __game.G.paths[i].slice().reverse()) {
      const at = __game.screen(cell), x = at.x + box.left, y = at.y + box.top;
      if (document.elementFromPoint(x, y) === board) return { x, y };
    }
    __game.G.selected = i; board.focus(); return null; // wholly under a control: select it as the keyboard does
  });
  if (p) await page.mouse.click(p.x, p.y); else await page.keyboard.press('Enter');
}
async function solve(page) {
  for (let n = 0; n < 500 && !await page.evaluate(() => __game.G.ended); n++) { await clickNext(page); await settle(page); }
  return page.evaluate(() => ({ ended: __game.G.ended, taps: __game.G.taps, par: __game.G.level.par }));
}
// Play a fixed board in the real app, in place of the generated level.
async function playFixture(page, board) {
  await page.evaluate(board => { weave = async () => structuredClone(board); return start(0); }, board);
  await ready(page);
}
module.exports = { base, launch, ready, settle, clickNext, solve, playFixture };
