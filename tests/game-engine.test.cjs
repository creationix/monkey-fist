const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../game-engine.js');

function verify(board) {
  assert.ok(board.ropes.length >= 2);
  assert.equal(G.allFree(board, board.ropes), false, 'every board starts with a blocked rope');
  assert.equal(board.locks.length, 0);
  const solution = G.replay(board, board.plan);
  assert.equal(solution.solved, true); assert.equal(solution.taps, board.par);
  let paths = board.ropes;
  for (const id of board.plan) {
    const move = G.tap(board, paths, id); assert.ok(move); paths = move.paths;
    const occupied = new Set();
    for (const rope of paths.filter(Boolean)) for (const p of rope) {
      const key = p.q + ',' + p.r; assert.ok(!occupied.has(key), 'ropes cannot overlap after a routed move'); occupied.add(key);
    }
  }
}

test('the complete 120-level journey is solvable, blocked, lock-free, and grows across both grids', { timeout: 120000 }, () => {
  const boards = Array.from({ length: 120 }, (_, index) => G.generate({ ...G.DEFAULT, index }));
  boards.forEach(verify);
  assert.deepEqual(boards.slice(0, 10).map(b => b.grid), [...Array(5).fill('square'), ...Array(5).fill('hex')]);
  assert.equal(boards.filter(b => b.grid === 'square').length, 60);
  assert.ok(boards.slice(0, 30).every(b => !b.mirrors.length && !b.springs.length));
  for (const grid of ['square', 'hex']) {
    const early = boards.filter(b => b.grid === grid).slice(0, 5), late = boards.filter(b => b.grid === grid).slice(-10);
    assert.ok(late.reduce((n, b) => n + b.W * b.H, 0) / late.length > early.reduce((n, b) => n + b.W * b.H, 0) / early.length * 4);
    assert.ok(late.some(b => b.mirrors.length > 2)); assert.ok(late.some(b => b.springs.length));
  }
});

test('custom settings round-trip and generate at both ends of the range with every feature combination', { timeout: 120000 }, () => {
  for (const grid of ['square', 'hex', 'mixed']) for (const mirrors of [false, true]) for (const springs of [false, true]) {
    const options = G.normalize({ grid, mirrors, springs, seed: 'BRAID', min: 1, max: 100, count: 30 });
    assert.deepEqual(G.parseCode(G.code(options)), options);
    for (const index of [0, 15, 29]) {
      const b = G.generate({ ...options, index }); verify(b);
      assert.equal(!!b.mirrors.length, mirrors); assert.equal(!!b.springs.length, springs);
      if (grid !== 'mixed') assert.equal(b.grid, grid);
      assert.deepEqual(G.generate({ ...G.parseCode(G.code(options)), index }), b);
    }
  }
  assert.equal(G.normalize({ count: 999 }).count, 500);
  assert.equal(G.parseCode('U1-S-90-20-120-N-TEST'), null);
  assert.equal(G.parseCode('H60BM-TEST').grid, 'hex');
});

test('the smallest random custom boards still contain a dependency', { timeout: 120000 }, () => {
  for (const grid of ['square', 'hex']) for (let seed = 0; seed < 35; seed++) verify(G.generate({ grid, min: 1, max: 1, count: 1, seed: 'SMALL' + seed, index: 0 }));
});

test('only a group’s last level opens the next ten; custom sets stay fully open', () => {
  let chapters = 1;
  for (let group = 0; group < 12; group++) {
    assert.equal(G.available(G.DEFAULT, chapters), (group + 1) * 10);
    for (let i = group * 10; i < group * 10 + 9; i++) assert.equal(G.unlock(chapters, i), chapters);
    chapters = G.unlock(chapters, group * 10 + 9);
    assert.equal(G.unlock(chapters, 9), chapters, 'replaying an earlier chapter cannot relock levels');
  }
  assert.equal(chapters, 12); assert.equal(G.available({ count: 237 }), 237);
});

test('Journey springs have varied approaches and require clearing another rope on both grids', () => {
  const distances = { square: new Set(), hex: new Set() };
  for (let index = 0; index < G.DEFAULT.count; index++) {
    if (!G.spec(G.DEFAULT, index).springs) continue;
    const b = G.generate({ ...G.DEFAULT, index }); let paths = b.ropes, blocked = 0, bounces = 0;
    for (const i of b.plan) {
      const move = G.tap(b, paths, i);
      if (move.event === 'bounce') {
        distances[b.grid].add(move.distance); bounces++;
        if (G.tap(b, b.ropes, i)?.event !== 'bounce') blocked++;
      }
      paths = move.paths;
    }
    assert.ok(paths.every(p => !p)); assert.ok(bounces >= b.springs.length);
    assert.ok(blocked > 0, `level ${index + 1} needs a dependency before a spring`);
  }
  for (const grid of ['square', 'hex']) {
    assert.ok(distances[grid].size >= 3, grid + ' needs varied run-up lengths');
    assert.ok([...distances[grid]].some(n => n >= 2), grid + ' needs space between rope and spring');
  }
});

test('spring reflections enter the tile completely and reverse with the tail on that tile', () => {
  const p = (q, r) => ({ q, r });
  for (const grid of ['square', 'hex']) {
    const b = { grid, W: 8, H: 8, springs: [p(5, 3)], mirrors: [], locks: [] };
    const paths = [[p(2, 3), p(3, 3)]];
    const move = G.tap(b, paths, 0);
    assert.equal(move.event, 'bounce'); assert.equal(move.distance, 2);
    assert.deepEqual(move.route.at(-1), p(5, 3));
    assert.deepEqual(move.paths[0], [p(5, 3), p(4, 3)]);
    assert.equal(G.replay({ ...b, ropes: paths }, [0, 0]).solved, true);
    assert.equal(G.tap(b, [paths[0], [p(5, 3), p(5, 4)]], 0).event, 'slide', 'occupied spring tiles still block entry');
  }
});

test('the small Hex spring regression gets a proven four-tap par, counting auto releases as free', () => {
  const b = G.generate({ ...G.parseCode('U1-H-1-1-1-S-FLIP0'), index: 0 });
  const canClear = (paths, taps) => {
    if (G.allFree(b, paths)) return true;
    if (!taps) return false;
    return paths.some((p, i) => {
      const move = p && G.tap(b, paths, i);
      return move && canClear(move.paths, taps - 1);
    });
  };
  assert.equal(canClear(b.ropes, 3), false, 'independent depth-limited search rules out three taps');
  assert.equal(canClear(b.ropes, 4), true);
  assert.equal(b.par, 4); assert.equal(b.exact, true);
  assert.equal(G.replay(b, b.plan).solved, true); assert.equal(G.replay(b, b.plan).taps, 4);
  const construction = [5, 3, 1, 0, 4, 0, 2];
  const bounded = G.minimumTaps(b, construction, 0);
  assert.equal(bounded.exact, false); assert.equal(bounded.par, 6);
  assert.equal(G.replay(b, bounded.plan).solved, true);
  assert.throws(() => G.minimumTaps(b, [], 5000), /complete solution/);
});
