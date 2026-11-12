const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.MF_TEST_URL || 'http://127.0.0.1:4173/';

test('square locks and Hex accept overlapping taps, settle out of order, and undo only the latest move', { timeout: 60000 }, async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    for (const hex of [false, true]) for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport }), errors = [];
      page.on('pageerror', e => errors.push(String(e))); page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
      // Freeze animation time, not pointer input. Both clicks precede completion.
      await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
      await page.goto(base + (hex ? 'hex/' : ''));
      await page.evaluate(hex => {
        const coordinates = [[[0, 0], [1, 0]], [[0, 2], [1, 2]], [[0, 4], [1, 4]], [[0, 6], [1, 6]], [[4, 5], [4, 6]]];
        const paths = coordinates.map(rope => rope.map(([a, b]) => hex ? { q: a, r: b } : { x: a, y: b }));
        if (hex) {
          const g = __hex.G; g.level = { W: 8, H: 8, ropes: paths, locks: [{ cell: { q: 3, r: 2 }, key: 0 }], par: 4 };
          Object.assign(g, { paths, plan: [0, 1, 2, 4, 3], lockOpen: [0] }); resize(); hud(); __hex.draw(0);
        } else {
          __mf.useSet('C60S-MONKEYFIST'); __mf.startLevel(9);
          const g = __mf.G; Object.assign(g, { W: 8, H: 8, left: 5, paths, plan: [0, 1, 2, 4, 3], par: 4, clear: false, auto: false,
            features: { W: 8, H: 8, ropes: paths, gates: [{ cell: 19, key: 0 }], mirrors: [], springs: [] } });
          if (!g.concurrent) throw Error('Lock boards must allow concurrent taps');
          g.noodles = paths.map((path, id) => ({ id, path, cur: path, off: 0, d: MFLevels.headDir(path), color: '#37d5ac', state: 'idle', s: 0, v: 0, flash: 0, appear: 1 }));
          syncTwistOccupancy(); resize(); hud(); __mf.draw(0);
        }
      }, hex);
      const click = async id => {
        const point = await page.evaluate(({ hex, id }) => {
          const g = hex ? __hex.G : __mf.G, p = g.paths[id].at(-1), b = document.querySelector('#board').getBoundingClientRect();
          if (hex) { const at = __hex.screen(p); return { x: b.left + at.x, y: b.top + at.y }; }
          const x = g.ox + (p.x + .5) * g.cs, y = g.oy + (p.y + .5) * g.cs;
          return { x: b.left + (g.rotated ? b.width - y : x), y: b.top + (g.rotated ? x : y) };
        }, { hex, id }); await page.mouse.click(point.x, point.y);
      };
      await click(0); const afterKey = await page.evaluate(hex => JSON.stringify((hex ? __hex : __mf).G.paths), hex);
      await click(1);
      assert.deepEqual(await page.evaluate(hex => {
        const g = (hex ? __hex : __mf).G; return { taps: g.taps, key: g.paths[0], follower: g.paths[1], moving: hex ? g.moves.size : g.noodles.filter(n => n.state === 'twist').length };
      }, hex), { taps: 2, key: null, follower: null, moving: 2 });
      const early = await page.evaluate(hex => {
        const api = hex ? __hex : __mf, g = api.G;
        if (hex) g.moves.get(1).progress = g.moves.get(1).distance - .001;
        else g.noodles[1].s = g.noodles[1].move.distance - .001;
        api.update(.01);
        return { key: g.paths[0], follower: g.paths[1], keyMoving: hex ? g.moves.has(0) : g.noodles[0].state === 'twist' };
      }, hex);
      assert.deepEqual(early, { key: null, follower: null, keyMoving: true });
      await page.locator(hex ? '#undo' : '#undoBtn').click({ force: true });
      assert.equal(await page.evaluate(hex => JSON.stringify((hex ? __hex : __mf).G.paths), hex), afterKey);
      assert.deepEqual(await page.evaluate(hex => { const g = (hex ? __hex : __mf).G; return [g.taps, g.undos]; }, hex), [3, 2]);
      for (const id of [1, 2, 4]) { await click(id); await page.evaluate(hex => { const api = hex ? __hex : __mf; for (let n = 0; n < 400 && !api.G.ended; n++) api.update(.05); }, hex); }
      assert.deepEqual(await page.evaluate(hex => { const g = (hex ? __hex : __mf).G; return { ended: g.ended, taps: g.taps, left: g.paths.filter(Boolean).length }; }, hex), { ended: true, taps: 6, left: 0 });
      assert.deepEqual(errors, []); await page.close();
    }
  } finally { await browser.close(); }
});
