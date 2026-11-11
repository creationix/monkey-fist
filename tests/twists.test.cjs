const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../twists.js'), M = require('../mechanics.js'), L = require('../levels.js');

function check(level, index) {
  const b = level.definition, occupied = new Set(), tiles = new Set();
  for (const path of b.ropes) {
    assert.ok(path.length >= 2);
    for (let i = 0; i < path.length; i++) {
      const p = path[i], cell = p.y * b.W + p.x;
      assert.ok(p.x >= 0 && p.y >= 0 && p.x < b.W && p.y < b.H);
      assert.ok(!occupied.has(cell), 'ropes must not overlap'); occupied.add(cell);
      if (i) assert.equal(Math.abs(p.x - path[i - 1].x) + Math.abs(p.y - path[i - 1].y), 1);
    }
  }
  for (const kind of ['mirrors', 'gates', 'springs']) {
    assert.equal(!!b[kind].length, T.featuresFor(index).includes(kind));
    if (b[kind].length) assert.ok(T.uses(b, level.best, kind), 'the solution must use ' + kind);
    for (const feature of b[kind]) {
      const cell = typeof feature === 'number' ? feature : feature.cell;
      assert.ok(cell >= 0 && cell < b.W * b.H && !occupied.has(cell) && !tiles.has(cell)); tiles.add(cell);
      if (kind === 'gates') assert.ok(b.ropes[feature.key]);
    }
  }
  assert.equal(M.replay(b, level.best).solved, true);
  assert.equal(M.score(b, level.best), level.par);
  assert.equal(M.allFree(b, b.ropes), false, 'a puzzle needs at least one player decision');
}
test('seeded Twists cover the whole set, introduce mechanics, and certify every generated board', () => {
  for (const seed of ['MONKEYFIST', 'ALPHA', 'BRAVO', 'E5DDK']) for (const big of [false, true]) {
    const set = T.generateSet({ seed, count: 60, big });
    assert.equal(set.levels.length, 60);
    assert.deepEqual(L.parseCode(set.code), { seed, mode: 'T', count: 60, big, slide: true });
    for (const d of set.levels) check(T.levelFrom(d), d.index);
  }
});
test('same seed reconstructs identical boards after cache eviction; other seeds change geometry, not just orientation', () => {
  const opts = { seed: 'REPEAT', count: 20 }, set = T.generateSet(opts);
  const first = JSON.stringify(set.levels.map(d => T.levelFrom(d)));
  for (const seed of ['EVICT1', 'EVICT2', 'EVICT3', 'EVICT4']) for (const d of T.generateSet({ seed, count: 20 }).levels) T.levelFrom(d);
  assert.equal(JSON.stringify(T.generateSet(opts).levels.map(d => T.levelFrom(d))), first);
  const canonical = b => Array.from({ length: 8 }, (_, bits) => {
    const t = T.transform(b, bits); return JSON.stringify([t.W, t.H, t.ropes]);
  }).sort()[0];
  for (const index of [0, 9]) {
    const boards = new Set();
    for (let i = 0; i < 20; i++) boards.add(canonical(T.levelFrom({ seed: 'VARIETY' + i, index }).definition));
    assert.equal(boards.size, 20);
  }
});
test('bounded constructive generation is itself procedural, verified, and preserves every orientation', () => {
  const geometries = new Set();
  for (let seed = 0; seed < 50; seed++) for (const index of [0, 2, 4, 6, 7, 8, 9]) {
    const b = T.construct(L.mulberry32(seed), T.featuresFor(index), seed % 2 === 0);
    geometries.add(JSON.stringify(b.ropes));
    for (let bits = 0; bits < 8; bits++) {
      const t = T.transform(b, bits);
      assert.equal(M.replay(t, t.solution).solved, true);
      assert.equal(M.score(t, t.solution), t.par);
    }
  }
  assert.ok(geometries.size >= 100, 'fallback builds new rope paths, never selects stored puzzles');
});
test('exact pars agree with a larger independent search; bounded results remain replay-verified', () => {
  for (const d of T.generateSet({ seed: 'PARS', count: 10 }).levels) {
    const level = T.levelFrom(d), p = M.minimum(level.definition, 12000, level.best);
    if (level.parExact) { assert.equal(p.exact, true); assert.equal(p.par, level.par); }
    else assert.ok(p.par <= level.par);
  }
});
test('counts are configurable, big boards expand the generated geometry, and endless bounces remain unknown on timeout', () => {
  for (const count of [10, 12, 20, 30, 60]) assert.equal(T.generateSet({ seed: 'ALPHA', count }).levels.length, count);
  const area = big => T.generateSet({ seed: 'SIZES', count: 20, big }).levels.reduce((sum, d) => {
    const b = T.levelFrom(d); return sum + b.W * b.H;
  }, 0);
  assert.ok(area(true) > area(false));
  const level = { W: 6, H: 3, springs: [6, 11], ropes: [[{ x: 2, y: 1 }, { x: 3, y: 1 }]] };
  assert.equal(M.allFree(level, level.ropes), false);
  assert.equal(M.solve(level).solved, false);
  assert.equal(M.solve(level, level.ropes, 1).solved, null);
});
