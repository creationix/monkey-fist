const { chromium } = require('playwright');
const base = process.env.MF_TEST_URL || 'http://127.0.0.1:4173/';
const launch = () => chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
const ready = page => page.waitForFunction(() => window.__game?.G.level && !__game.G.loading, null, { polling: 50 });
const settle = page => page.evaluate(() => { for (let n = 0; n < 2000 && (__game.G.moving || __game.G.auto) && !__game.G.ended; n++) __game.update(.05); __game.draw(0); });
async function clickNext(page) {
  const p = await page.evaluate(() => {
    const i = __game.G.plan[0]; focusRope(i); __game.draw(0);
    const at = __game.screen(__game.G.paths[i].at(-1)), box = document.querySelector('#board').getBoundingClientRect(); return { x: at.x + box.left, y: at.y + box.top };
  });
  await page.mouse.click(p.x, p.y);
}
async function solve(page) {
  for (let n = 0; n < 500 && !await page.evaluate(() => __game.G.ended); n++) { await clickNext(page); await settle(page); }
  return page.evaluate(() => ({ ended: __game.G.ended, taps: __game.G.taps, par: __game.G.level.par }));
}
module.exports = { base, launch, ready, settle, clickNext, solve };
