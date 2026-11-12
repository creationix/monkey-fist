const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../twists.js'), M = require('../mechanics.js'), L = require('../levels.js');

function check(level, index, kinds = T.featuresFor(index)) {
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
    assert.equal(!!b[kind].length, kinds.includes(kind));
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
  for (const seed of ['MONKEYFIST', 'ALPHA']) for (const big of [false, true]) {
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
  for (const count of [10, 12, 20, 30, 60, 120]) assert.equal(T.generateSet({ seed: 'ALPHA', count }).levels.length, count);
  const area = big => T.generateSet({ seed: 'SIZES', count: 20, big }).levels.reduce((sum, d) => {
    const b = T.levelFrom(d); return sum + b.W * b.H;
  }, 0);
  assert.ok(area(true) > area(false));
  const level = { W: 6, H: 3, springs: [6, 11], ropes: [[{ x: 2, y: 1 }, { x: 3, y: 1 }]] };
  assert.equal(M.allFree(level, level.ropes), false);
  assert.equal(M.solve(level).solved, false);
  assert.equal(M.solve(level, level.ropes, 1).solved, null);
});
test('Progressive keeps its opening and woven geometry, then adds locks without direction-changing blocks', () => {
  for (const seed of ['MONKEYFIST', 'BRAVO']) for (const big of [false, true]) {
    const plain = L.generateSet({ ...L.CAMPAIGN_SLIDE, seed, big }), set = T.integrate(plain);
    assert.deepEqual(set.levels.slice(0, 8), plain.levels.slice(0, 8));
    assert.deepEqual(set.levels[8].kinds, ['gates']);
    assert.deepEqual(set.levels[16].kinds, ['gates']);
    assert.deepEqual(set.levels[24].kinds, ['gates']);
    for (const i of [8, 16, 20, 24, 28, 32, 40, 50, 59]) {
      const d = set.levels[i], b = T.levelFrom(d); check(b, i, d.kinds);
      const original = L.weave(L.mulberry32(d.base.seed), { ...d.base, W: d.base.boardW, H: d.base.boardH });
      const offset = b.definition.offset || 0;
      assert.deepEqual(b.ropes.slice(0, original.ropes.length).map(path => path.map(p => ({ x: p.x - offset, y: p.y - offset }))), original.ropes, 'locks preserve the ordinary knots, traps, and geometry');
      if (i >= 50) { assert.ok(b.ropes.length >= 20); assert.ok(b.W * b.H >= 120); }
    }
    assert.equal(T.integrate(L.generateSet({ ...L.CAMPAIGN, seed, big })).levels.some(d => d.twist), false);
  }
  const huge = T.integrate(L.generateSet({ ...L.CAMPAIGN_SLIDE, count: 120, big: true }));
  assert.equal(huge.levels.length, 120);
  for (const i of [80, 100, 119]) {
    const b = T.levelFrom(huge.levels[i]); check(b, i, huge.levels[i].kinds);
    assert.ok(b.W * b.H >= 180); assert.ok(b.ropes.length >= 30);
  }
});
test('bounded fallback fills large boards with certified dependency chains, rather than replacing them with a tiny tutorial', () => {
  for (let seed = 0; seed < 5; seed++) {
    const rng = L.mulberry32(seed), kinds = ['springs', 'mirrors', 'gates'];
    const b = T.grow(T.construct(rng, kinds, true, { W: 16, H: 22 }), rng);
    assert.ok(b.ropes.length >= 30); assert.ok(b.ropes.flat().length / (b.W * b.H) > .65);
    assert.equal(M.replay(b, b.solution).solved, true);
    for (const kind of kinds) assert.ok(T.uses(b, b.solution, kind));
  }
});
test('Sliding Extreme uses the lock ramp on its own harder boards', () => {
  for (const seed of ['MONKEYFIST', 'E5DDK']) for (const big of [false, true]) for (const count of [10, 30, 60]) {
    const opts = { mode: 'X', seed, big, count, slide: true }, plain = L.generateSet(opts), set = T.integrate(plain);
    assert.equal(set.code, plain.code); assert.equal(set.levels.length, plain.levels.length);
    set.levels.forEach((d, index) => {
      const kinds = T.progressiveFeatures(index, set.levels.length);
      if (!kinds.length) assert.deepEqual(d, plain.levels[index]);
      else { assert.deepEqual(d.kinds, kinds); assert.deepEqual(d.base, plain.levels[index]); assert.equal(d.difficulty, plain.levels[index].difficulty); }
    });
    for (const index of [Math.floor(set.levels.length / 2), set.levels.length - 1]) {
      const d = set.levels[index], b = T.levelFrom(d); check(b, index, d.kinds);
      assert.ok(b.W * b.H >= d.base.W * d.base.H);
      if (index === set.levels.length - 1) {
        assert.equal(b.definition.construction, 'locks');
        assert.ok(!b.definition.mirrors.length && !b.definition.springs.length && b.definition.gates.length >= 2);
      }
    }
  }
  for (const mode of ['X', 'E', 'N', 'H']) {
    const set = L.generateSet({ mode, count: 10, big: false, seed: 'CONTROL', slide: false });
    assert.equal(T.integrate(set), set, 'original rules remain unchanged');
  }
});
test('Easy, Normal, and Hard also add locks while all reflectors remain exclusive to Twists', () => {
  for (const mode of ['E', 'N', 'H']) for (const seed of ['MONKEYFIST', 'ALPHA']) {
    const plain = L.generateSet({ mode, seed, count: 30, big: true, slide: true }), set = T.integrate(plain);
    assert.deepEqual(set.levels[0], plain.levels[0]);
    for (const index of [Math.floor(set.levels.length / 2), set.levels.length - 1]) {
      const b = T.levelFrom(set.levels[index]); check(b, index, ['gates']);
      assert.equal(b.definition.construction, 'locks');
    }
  }
});
