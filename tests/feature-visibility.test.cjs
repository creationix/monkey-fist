const test = require('node:test'), assert = require('node:assert/strict'), G = require('../game-engine.js');
const p = (q, r) => ({ q, r }), key = p => p.q + ',' + p.r;

test('feature reachability preserves future turns, bounces, and temporarily blocked approaches', () => {
  for (const grid of ['square', 'hex']) {
    const turn = p(3, 2), spring = grid === 'hex' ? p(1, 4) : p(3, 4);
    const b = { grid, W: 8, H: 8, locks: [], mirrors: [{ cell: turn, ...(grid === 'hex' ? { axis: 1 } : { slope: '\\' }) }, { cell: p(6, 0), ...(grid === 'hex' ? { axis: 0 } : { slope: '/' }) }], springs: [spring, p(0, 7)] };
    const paths = [[p(0, 2), p(1, 2)], [p(2, 2), p(2, 1)]];
    const live = new Set(G.reachableFeatures(b, paths));
    assert.ok(live.has(key(turn))); assert.ok(live.has(key(spring)));
    // The other rope is allowed to move away: a temporary blocker isn't proof.
    const alone = new Set(G.reachableFeatures(b, [paths[0]]));
    assert.ok(alone.has(key(turn))); assert.ok(alone.has(key(spring)));
    assert.ok(!alone.has('6,0')); assert.ok(!alone.has('0,7'));
    assert.equal(G.reachableFeatures(b, [], 0).length, 0);
    assert.equal(G.reachableFeatures(b, paths, 0).length, 4, 'unfinished searches keep every feature');
    const behind = { grid, W: 8, H: 8, locks: [], mirrors: [{ cell: p(1, 3), ...(grid === 'hex' ? { axis: 1 } : { slope: '/' }) }], springs: [p(5, 3)] };
    assert.ok(G.reachableFeatures(behind, [[p(2, 3), p(3, 3)]]).includes('1,3'), 'a bounce can reach a mirror behind the original tail');
  }
});

test('features excluded by optimistic reachability are never hit in exhaustive small-state play', () => {
  let seed = 372;
  const rand = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  for (const grid of ['square', 'hex']) for (let sample = 0; sample < 30; sample++) {
    const b = { grid, W: 4, H: 4, locks: [], springs: [], mirrors: [] }, cells = G.cells(b), used = new Set(), paths = [];
    for (let tries = 0; tries < 100 && paths.length < 3; tries++) {
      const a = cells[rand(cells.length)], dirs = grid === 'hex' ? G.DIRS : [[1, 0], [0, 1], [-1, 0], [0, -1]], c = G.add(a, dirs[rand(dirs.length)]);
      if (!cells.some(p => key(p) === key(c)) || used.has(key(a)) || used.has(key(c))) continue;
      paths.push([a, c]); used.add(key(a)); used.add(key(c));
    }
    const free = cells.filter(p => !used.has(key(p)));
    b.springs = [free[0]]; b.mirrors = [{ cell: free[1], ...(grid === 'hex' ? { axis: rand(3) } : { slope: rand(2) ? '/' : '\\' }) }];
    const features = new Set([key(free[0]), key(free[1])]), live = new Set(G.reachableFeatures(b, paths));
    const queue = [paths], seen = new Set([JSON.stringify(paths)]);
    for (let j = 0; j < queue.length; j++) {
      assert.ok(j < 10000);
      queue[j].forEach((path, i) => {
        if (!path) return; const move = G.tap(b, queue[j], i); if (!move) return;
        for (const cell of move.route.slice(path.length)) if (features.has(key(cell))) assert.ok(live.has(key(cell)), 'no actual future hit can be hidden');
        const state = JSON.stringify(move.paths); if (!seen.has(state)) { seen.add(state); queue.push(move.paths); }
      });
    }
  }
});

test('unused features fade, in-flight bounces and queued tails retain them, and undo restores them', { timeout: 60000 }, async () => {
  const { base, launch, ready } = require('./browser-helpers.cjs'), browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => { requestAnimationFrame = () => 0; });
    await page.goto(base); await ready(page);
    const checked = () => page.waitForFunction(() => !featureWorker, null, { polling: 20 });
    for (const grid of ['square', 'hex']) {
      await page.evaluate(grid => {
        const p = (q, r) => ({ q, r }); cancelGuide(); $('result').close(); document.body.classList.remove('auto-solving');
        Object.assign(G, { level: { grid, W: 8, H: 8, locks: [], mirrors: [], springs: [p(5, 3), p(0, 0)], par: 1 }, paths: [[p(2, 3), p(3, 3)]],
          plan: [0, 0], moves: new Map(), history: [], auto: false, ended: false, loading: false, usedAutoSolve: false, camera: { zoom: 1, x: 0, y: 0 } });
        resetFeatures(); resize();
      }, grid); await checked();
      assert.deepEqual(await page.evaluate(() => { update(.2); draw(0); return [featureOpacity({ q: 5, r: 3 }), featureOpacity({ q: 0, r: 0 })]; }), [1, 0]);
      const result = await page.evaluate(() => {
        autoSolve(); const bounce = G.moves.get(0), coil = { q: 5, r: 3 };
        while (!bounce.impacted) update(.002);
        const impact = featureOpacity(coil);
        while (G.moves.get(0) === bounce) update(.002);
        const turning = featureOpacity(coil), leaving = G.moves.get(0);
        while (leaving.progress < 1) update(.002);
        const clearing = G.featureStates.get('5,3').target;
        for (let n = 0; n < 2000 && !G.ended; n++) { update(.01); draw(n / 100); }
        return { impact, turning, clearing, gone: featureOpacity(coil), ended: G.ended };
      });
      assert.deepEqual(result, { impact: 1, turning: 1, clearing: 0, gone: 0, ended: true });
      await page.evaluate(grid => {
        const p = (q, r) => ({ q, r }); cancelGuide(); $('result').close();
        Object.assign(G, { level: { grid, W: 8, H: 8, locks: [], springs: [], mirrors: [{ cell: p(5, 1), ...(grid === 'hex' ? { axis: 0 } : { slope: '/' }) }], par: 3 },
          paths: [[p(2, 1), p(3, 1)], [p(0, 5), p(1, 5)], [p(3, 5), p(2, 5)]], plan: [], moves: new Map(), history: [], undos: 3,
          auto: false, ended: false, loading: false, usedAutoSolve: false, camera: { zoom: 1, x: 0, y: 0 } });
        resetFeatures(); resize(); tap(0);
      }, grid); await checked();
      assert.equal(await page.evaluate(() => {
        for (let i = 0; i < 2000 && (G.moving || G.featuresFading); i++) { update(.01); draw(i / 100); }
        update(.2); draw(0); return featureOpacity({ q: 5, r: 1 });
      }), 0);
      assert.equal(await page.evaluate(() => { undo(); return featureOpacity({ q: 5, r: 1 }); }), 1);
      await checked();
      assert.equal(await page.evaluate(() => { update(.2); draw(0); return featureOpacity({ q: 5, r: 1 }); }), 1);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
