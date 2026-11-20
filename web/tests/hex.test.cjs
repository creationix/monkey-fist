const test = require('node:test');
const assert = require('node:assert/strict');
const H = require('../hex/engine'), M = require('../hex/mechanics'), G = require('../game-engine'), { mulberry32, hashString } = require('../random');
// Small woven Hex boards from the current generator.
const small = (seed, difficulty = 30) => G.generate({ grid: 'hex', width: 4, height: 5, min: difficulty, max: difficulty, count: 1, seed, index: 0 });
const p = (q, r) => ({ q, r });

test('hex neighbours have equal spacing; all six directions slide, collide, and animate full exits', () => {
  const board = { W: 11, H: 11 }, center = p(2, 5);
  for (const d of H.DIRS) {
    const a = H.project(center), b = H.project(H.add(center, d));
    assert.ok(Math.abs(Math.hypot(a.x - b.x, a.y - b.y) - 1) < 1e-10);
    const rope = [H.add(center, d, -2), H.add(center, d, -1), center];
    const blocker = [H.add(center, d, 3), H.add(center, d, 4)];
    const level = { ...board, ropes: [rope, blocker] }, move = M.tap(level, level.ropes, 0);
    assert.equal(move.event, 'slide'); assert.equal(move.distance, 2);
    assert.deepEqual(move.paths[0].at(-1), H.add(center, d, 2));
    assert.equal(M.tap(level, move.paths, 0), null);
    const out = M.tap(level, [rope, null], 0); assert.equal(out.event, 'exit');
    assert.ok(out.route.slice(-rope.length).every(p => !H.inside(level, p)), 'tail exits fully');
    assert.deepEqual(level.ropes[0], rope, 'transition is pure');
  }
});

test('solver detects knots without treating exhausted search as a loss; auto releases are free', () => {
  const b = small('SOLVER', 60);
  const result = H.solve(b, b.ropes, 10000, b.plan); assert.equal(result.solved, true); assert.equal(H.replay(b, result.moves).solved, true);
  assert.equal(H.solve(b, b.ropes, 1).solved, null);
  const stuck = { W: 8, H: 5, ropes: [[p(0, 2), p(1, 2)], [p(3, 2), p(2, 2)]] };
  assert.equal(H.solve(stuck).solved, false);
  const free = { W: 5, H: 5, ropes: [[p(0, 0), p(1, 0)], [p(0, 2), p(1, 2)]] };
  assert.equal(H.replay(free, [0, 1]).taps, 1);
});

test('compact transitions, rollback, and deadlock pruning agree with the full-geometry kernel', () => {
  const rng = mulberry32(hashString('COMPACT-CROSSCHECK'));
  for (let seed = 0; seed < 20; seed++) {
    const b = small('SMALL' + seed), compact = H.compile(b);
    let paths = b.ropes;
    for (let step = 0; step < 20; step++) {
      const available = [];
      for (let i = 0; i < paths.length; i++) {
        const move = M.tap(b, paths, i), target = compact.to(i), from = compact.offsets[i];
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
        return state.some((p, i) => { const m = p && M.tap(b, state, i); return m && reference(m.paths); });
      }
      const possible = reference(paths), answer = H.solve(b, paths, 100000);
      assert.equal(answer.solved, possible);
      if (compact.dead()) assert.equal(possible, false, 'optimistic deadlock check never rejects a solution');
      if (!available.length) break;
      const choice = available[Math.floor(rng() * available.length)]; paths = choice.move.paths; compact.place(choice.i, choice.target);
    }
  }
});
