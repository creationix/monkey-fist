const test = require('node:test'), assert = require('node:assert/strict');
const G = require('../game-engine.js');
const p = (q, r) => ({ q, r });

test('permanent knots are darker candidates, but temporary blockers and movable lost ropes are not', () => {
  for (const grid of ['square', 'hex']) for (const features of [false, true]) {
    const b = { grid, W: 6, H: 5, mirrors: [], springs: features ? [p(5, 0)] : [], locks: [] };
    const paths = [[p(0, 2), p(1, 2)], [p(4, 2), p(3, 2)], [p(0, 4), p(1, 4)]];
    assert.deepEqual(G.frozenRopes(b, paths), [], 'both opposing ropes can still slide');
    const trapped = G.tap(b, paths, 0).paths;
    assert.deepEqual(G.frozenRopes(b, trapped), [0, 1]);
    assert.deepEqual(G.frozenRopes(b, [paths[0], [p(2, 2), p(3, 2)], null]), [], 'removing a temporary blocker frees the rope');
    const self = [[p(1, 0), p(0, 0), p(0, 1), p(0, 2), p(1, 2), p(1, 1)]];
    assert.deepEqual(G.frozenRopes(b, self), [0], 'its own body permanently blocks its head');
  }
});

test('mirror and bouncer approaches do not confuse a parked tail with a permanent knot', () => {
  for (const grid of ['square', 'hex']) {
    const b = { grid, W: 8, H: 8, mirrors: [], springs: [p(5, 3)], locks: [] };
    const paths = [[p(5, 3), p(4, 3)], [p(7, 3), p(6, 3)]];
    assert.deepEqual(G.frozenRopes(b, paths), [], 'the occupying tail can leave, then the other rope can reach the bouncer');
    const mirror = { ...b, springs: [], mirrors: grid === 'square' ? [{ cell: p(2, 3), slope: '\\' }] : [{ cell: p(2, 3), axis: 1 }] };
    assert.deepEqual(G.frozenRopes(mirror, [[p(0, 3), p(1, 3)]]), []);
  }
});

test('exhaustive reachable states never move any rope certified as frozen on seeded small boards', () => {
  let checked = 0, seed = 123;
  const random = n => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % n; };
  for (const grid of ['square', 'hex']) for (const features of [false, true]) for (let k = 0; k < 30; k++) {
    const b = { grid, W: 4, H: 4, locks: [], mirrors: [], springs: [] }, cells = G.cells(b), occupied = new Set(), paths = [];
    const dirs = grid === 'hex' ? G.DIRS : [[1, 0], [0, 1], [-1, 0], [0, -1]];
    for (let tries = 0; tries < 100 && paths.length < 3; tries++) {
      const a = cells[random(cells.length)], d = dirs[random(dirs.length)], c = G.add(a, d), key = x => x.q + ',' + x.r;
      if (!cells.some(p => key(p) === key(c)) || occupied.has(key(a)) || occupied.has(key(c))) continue;
      paths.push([a, c]); occupied.add(key(a)); occupied.add(key(c));
    }
    if (features) {
      const free = cells.filter(p => !occupied.has(p.q + ',' + p.r));
      b.springs = [free[0]];
      b.mirrors = grid === 'hex' ? [{ cell: free[1], axis: random(3) }] : [{ cell: free[1], slope: random(2) ? '/' : '\\' }];
    }
    const frozen = G.frozenRopes(b, paths), queue = [paths], seen = new Set([JSON.stringify(paths)]);
    for (let j = 0; j < queue.length; j++) {
      assert.ok(j < 10000, 'small state space must exhaust');
      queue[j].forEach((path, i) => {
        if (!path) return;
        const move = G.tap(b, queue[j], i); if (!move) return;
        assert.ok(!frozen.includes(i), 'a certified frozen rope never has a legal move in any reachable state');
        const key = JSON.stringify(move.paths); if (!seen.has(key)) { seen.add(key); queue.push(move.paths); }
      });
    }
    checked++;
  }
  assert.equal(checked, 120);
});

test('knots darken after a fatal slide, reuse the resting cache, and brighten after undo on both grids', { timeout: 60000 }, async () => {
  const { base, launch, ready } = require('./browser-helpers.cjs'), browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => { requestAnimationFrame = () => 0; });
    await page.goto(base); await ready(page);
    for (const grid of ['square', 'hex']) for (const features of [false, true]) {
      const result = await page.evaluate(({ grid, features }) => {
        const p = (q, r) => ({ q, r }), paths = [[p(0, 2), p(1, 2)], [p(4, 2), p(3, 2)], [p(0, 4), p(1, 4)]];
        cancelGuide(); Object.assign(G, { level: { grid, W: 6, H: 5, mirrors: [], springs: features ? [p(5, 0)] : [], locks: [], par: 3 },
          paths, plan: [], moves: new Map(), history: [], undos: 3, loading: false, ended: false, lost: false, auto: false, frozen: new Set(), camera: { zoom: 1, x: 0, y: 0 } });
        resize(); refreshFrozen(); const before = color(0); tap(0);
        for (let i = 0; i < 1000 && G.moving; i++) update(.01);
        draw(0); const frozen = [...G.frozen], after = color(0), sample = screen(p(1.5, 2));
        const brightness = () => [...mainContext.getImageData(Math.round(sample.x), Math.round(sample.y), 1, 1).data].slice(0, 3).reduce((a, b) => a + b);
        const dark = brightness(), knots = G.frozen;
        G.frozen = new Set(); draw(0); const normal = brightness(); G.frozen = knots; draw(0);
        const original = drawRestingBoard; let rebuilt = 0; drawRestingBoard = (...args) => { rebuilt++; return original(...args); };
        for (let i = 0; i < 5; i++) draw(i / 60); drawRestingBoard = original;
        undo(); draw(0); const restored = color(0), thawed = [...G.frozen]; cancelGuide();
        return { before, after, restored, frozen, thawed, dark, normal, rebuilt };
      }, { grid, features });
      assert.deepEqual(result.frozen, [0, 1]); assert.deepEqual(result.thawed, []);
      assert.notEqual(result.before, result.after); assert.equal(result.restored, result.before);
      assert.ok(result.dark < result.normal * .9, 'the rendered braid is visibly darker');
      assert.equal(result.rebuilt, 0, 'classification does not force per-frame board rendering');
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
