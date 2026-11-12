const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../hex/engine');
const p = (q, r) => ({ q, r });

test('hex neighbours have equal spacing; all six directions slide, collide, and animate full exits', () => {
  const board = { W: 11, H: 11, locks: [] }, center = p(2, 5);
  for (const d of H.DIRS) {
    const a = H.project(center), b = H.project(H.add(center, d));
    assert.ok(Math.abs(Math.hypot(a.x - b.x, a.y - b.y) - 1) < 1e-10);
    const rope = [H.add(center, d, -2), H.add(center, d, -1), center];
    const blocker = [H.add(center, d, 3), H.add(center, d, 4)];
    const level = { ...board, ropes: [rope, blocker] }, move = H.tap(level, level.ropes, 0);
    assert.equal(move.event, 'slide'); assert.equal(move.distance, 2);
    assert.deepEqual(move.paths[0].at(-1), H.add(center, d, 2));
    assert.equal(H.tap(level, move.paths, 0), null);
    const out = H.tap(level, [rope, null], 0); assert.equal(out.event, 'exit');
    assert.ok(out.route.slice(-rope.length).every(p => !H.inside(level, p)), 'tail exits fully');
    assert.deepEqual(level.ropes[0], rope, 'transition is pure');
  }
});

test('matching key exit opens a lock, partial key slides keep it shut, and restored paths relock', () => {
  const level = { W: 8, H: 7, ropes: [[p(0, 3), p(1, 3)], [p(0, 0), p(1, 0)], [p(4, 0), p(5, 0)]], locks: [{ cell: p(3, 3), key: 1 }] };
  assert.equal(H.tap(level, level.ropes, 0).event, 'slide');
  const partial = H.tap(level, level.ropes, 1); assert.equal(partial.event, 'slide');
  assert.equal(H.tap(level, partial.paths, 0).event, 'slide');
  const cleared = H.tap(level, H.tap(level, partial.paths, 2).paths, 1);
  assert.equal(cleared.paths[1], null); assert.equal(H.tap(level, cleared.paths, 0).event, 'exit');
  assert.equal(H.tap(level, level.ropes, 0).event, 'slide');
});

test('generated sets are deterministic, woven, solvable, and locks create real dependencies', { timeout: 120000 }, () => {
  const directions = new Set(), signatures = new Set();
  for (let seed = 0; seed < 20; seed++) for (const index of [0, 2, 4, 25, 59]) {
    const opts = { seed: 'HEXTEST' + seed, index, big: !!(seed % 2) }, b = H.generate(opts);
    const replay = H.replay(b, b.plan); assert.equal(replay.solved, true); assert.equal(replay.taps, b.par);
    assert.ok(b.ropes.flat().length / (b.W * b.H) >= .7);
    assert.equal(new Set(b.ropes.flat().map(H.key)).size, b.ropes.flat().length);
    for (const rope of b.ropes) {
      assert.ok(rope.every(cell => H.inside(b, cell)));
      directions.add(H.direction(rope).join(','));
      for (let i = 1; i < rope.length; i++) assert.ok(H.DIRS.some(d => H.key(H.add(rope[i - 1], d)) === H.key(rope[i])));
    }
    assert.ok(!('mirrors' in b) && !('springs' in b));
    if (index === 0) assert.equal(b.locks.length, 0);
    if (index >= 2) assert.ok(b.slides >= 1, 'sliding knots introduced');
    if (index >= 4) assert.ok(b.locks.length >= 1, 'locks introduced');
    if (index === 59) {
      assert.ok(replay.events.filter(e => e === 'slide').length >= 3);
      assert.ok(b.locks.length >= 10); assert.ok(b.W * b.H >= 768);
      assert.ok(b.stats.averageLength >= 8, 'longer ropes throughout the board');
      assert.ok(b.stats.longest >= 30 && b.stats.longestBends >= 12, 'long winding strands');
      assert.ok(b.stats.averageDepth >= 8 && b.stats.depth >= 20, 'deep connected dependencies: ' + JSON.stringify(b.stats));
      assert.ok(b.stats.lockDepth >= 3, 'chains of locks');
      let paths = b.ropes;
      for (const i of b.plan) { const move = H.tap(b, paths, i); assert.ok(move, 'certificate matches reference geometry'); paths = move.paths; }
      assert.ok(paths.every(p => !p));
    }
    for (const lock of b.locks) {
      assert.ok(!b.ropes.flat().some(p => H.key(p) === H.key(lock.cell)));
      const alone = b.ropes.map((p, i) => i === lock.target || i === lock.key ? p : null);
      assert.notEqual(H.tap(b, alone, lock.target)?.event, 'exit');
      assert.equal(H.tap({ ...b, locks: [] }, alone, lock.target)?.event, 'exit');
    }
    if (index === 59) signatures.add(JSON.stringify(b.ropes));
    if (seed === 0) {
      delete require.cache[require.resolve('../hex/engine')];
      assert.deepEqual(require('../hex/engine').generate(opts), b, 'reconstructed without the cache');
    }
  }
  assert.equal(directions.size, 6); assert.equal(signatures.size, 20);
});

test('solver detects knots without treating exhausted search as a loss; auto releases are free', () => {
  const b = H.generate({ seed: 'SOLVER', index: 4 });
  const result = H.solve(b, b.ropes, 10000, b.plan); assert.equal(result.solved, true); assert.equal(H.replay(b, result.moves).solved, true);
  assert.equal(H.solve(b, b.ropes, 1).solved, null);
  const stuck = { W: 8, H: 5, locks: [], ropes: [[p(0, 2), p(1, 2)], [p(3, 2), p(2, 2)]] };
  assert.equal(H.solve(stuck).solved, false);
  const free = { W: 5, H: 5, locks: [], ropes: [[p(0, 0), p(1, 0)], [p(0, 2), p(1, 2)]] };
  assert.equal(H.replay(free, [0, 1]).taps, 1); assert.equal(H.minimum(free, [0, 1]).par, 1);
});

test('hex share codes round trip and larger/count settings change the deterministic board', () => {
  for (const count of [10, 30, 60, 120]) for (const big of [false, true]) {
    const opts = { count, big, seed: 'ALPHA' }; assert.deepEqual(H.parseCode(H.code(opts)), opts);
    const last = H.generate({ ...opts, index: count - 1 }); assert.equal(H.replay(last, last.plan).solved, true); assert.ok(last.locks.length >= 5);
  }
  assert.equal(H.parseCode('C60S-MONKEYFIST'), null);
  assert.ok(H.generate({ index: 59, big: true }).ropes.flat().length > H.generate({ index: 59 }).ropes.flat().length);
});

test('compact transitions, rollback, and deadlock pruning agree with the geometry kernel', () => {
  const rng = H.random('COMPACT-CROSSCHECK');
  for (let seed = 0; seed < 20; seed++) {
    const b = H.generate({ seed: 'SMALL' + seed, index: 4 }), compact = H.compile(b);
    let paths = b.ropes;
    for (let step = 0; step < 20; step++) {
      const available = [];
      for (let i = 0; i < paths.length; i++) {
        const move = H.tap(b, paths, i), target = compact.to(i), from = compact.offsets[i];
        assert.equal(!!move, target !== -2 && target !== from);
        if (!move) continue;
        compact.place(i, target); assert.deepEqual(compact.pathsNow(), move.paths);
        compact.place(i, from); assert.deepEqual(compact.pathsNow(), paths);
        available.push({ i, target, move });
      }
      // Exhaust this small state space independently, without compact deadlock pruning.
      const seen = new Set();
      function reference(state) {
        if (state.every(p => !p)) return true;
        const key = JSON.stringify(state); if (seen.has(key)) return false; seen.add(key);
        return state.some((p, i) => { const m = p && H.tap(b, state, i); return m && reference(m.paths); });
      }
      const possible = reference(paths), answer = H.solve(b, paths, 100000);
      assert.equal(answer.solved, possible);
      if (compact.dead()) assert.equal(possible, false, 'optimistic deadlock check never rejects a solution');
      if (!available.length) break;
      const choice = available[Math.floor(rng() * available.length)]; paths = choice.move.paths; compact.place(choice.i, choice.target);
    }
  }
});
