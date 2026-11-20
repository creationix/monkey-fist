const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../game-engine.js');
const { FLIP } = require('./fixtures.cjs');

function verify(board) {
  assert.ok(board.ropes.length >= 2);
  const bouncers = new Set(board.springs.map(p => p.q + ',' + p.r));
  for (const path of board.ropes) {
    const next = G.add(path.at(-1), G.direction(board, path));
    assert.ok(!bouncers.has(next.q + ',' + next.r), 'starting arrows leave an empty space before bouncers');
  }
  assert.equal(G.allFree(board, board.ropes), false, 'every board starts with a blocked rope');
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

test('custom settings round-trip and generate across the range with every feature combination', { timeout: 120000 }, () => {
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
  assert.equal(G.normalize({ count: 999 }).count, 200);
  assert.equal(G.parseCode('U3-S-90-20-10-14-120-N-TEST'), null);
  assert.equal(G.parseCode('U1-S-20-90-120-N-TEST'), null, 'old set formats are gone');
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
  assert.equal(chapters, 12); assert.equal(G.available({ count: 137 }), 137);
});

test('Journey spinners have varied approaches and wait on another rope on both grids', { timeout: 300000 }, () => {
  const distances = { square: new Set(), hex: new Set() };
  for (let index = 0; index < G.DEFAULT.count; index++) {
    if (!G.spec(G.DEFAULT, index).springs) continue;
    const b = G.generate({ ...G.DEFAULT, index }); let paths = b.ropes, blocked = 0, bounces = 0; const users = new Map();
    for (const i of b.plan) {
      const move = G.tap(b, paths, i);
      if (move.event === 'bounce') {
        distances[b.grid].add(move.distance); bounces++;
        const spring = JSON.stringify(move.route.at(-1)); if (!users.has(spring)) users.set(spring, new Set()); users.get(spring).add(i);
        if (G.tap(b, b.ropes, i)?.event !== 'bounce') blocked++;
      }
      paths = move.paths;
    }
    assert.ok(paths.every(p => !p)); assert.ok(bounces >= b.springs.length);
    assert.ok(blocked > 0 || [...users.values()].some(ids => ids.size > 1), `level ${index + 1} needs an approach or shared-bouncer dependency`);
  }
  for (const grid of ['square', 'hex']) {
    assert.ok(distances[grid].size >= 2, grid + ' needs varied run-up lengths');
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
  const b = { ...FLIP, ...G.minimumTaps(FLIP, [5, 3, 1, 0, 4, 0, 2]) };
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

test('the pictured Hex bounce vacates the blue exit while parking the green tail in the spinner', () => {
  const b = FLIP;
  const paths = b.ropes.map((p, i) => [0, 2, 4].includes(i) ? p : null);
  assert.equal(G.tap(b, paths, 4), null);
  // Independent expected occupancy: three forward steps, then reverse the
  // twelve material points. The vacated cell is blue's first step (-1,4).
  const expected = paths[0].slice(3).concat([{ q: 2, r: 2 }, { q: 1, r: 3 }, { q: 0, r: 4 }]).reverse();
  const bounced = G.tap(b, paths, 0);
  assert.deepEqual(bounced.paths[0], expected);
  assert.deepEqual(expected[0], b.springs[0]);
  assert.ok(paths[0].some(p => p.q === -1 && p.r === 4));
  assert.ok(!expected.some(p => p.q === -1 && p.r === 4));
  assert.equal(G.tap(b, bounced.paths, 4).event, 'exit');
});

test('ropes share a spinner and must clear an occupying tail before using it', () => {
  const p = (q, r) => ({ q, r });
  for (const grid of ['square', 'hex']) {
    const spinner = p(5, 4), b = { grid, W: 10, H: 10, springs: [spinner], mirrors: [], locks: [] };
    const step = (d, n) => p(spinner.q + d[0] * n, spinner.r + d[1] * n), [east, , , north] = grid === 'hex' ? [G.DIRS[0], 0, 0, G.DIRS.find(d => d[0] === 0 && d[1] === -1)] : [[1, 0], 0, 0, [0, -1]];
    const ropes = [[step(east, -3), step(east, -2)], [step(north, -3), step(north, -2)]];
    const parked = G.tap(b, ropes, 0); assert.equal(parked.event, 'bounce');
    assert.deepEqual(parked.paths[0][0], spinner, 'the bounced tail rests on the spinner');
    assert.notEqual(G.tap(b, parked.paths, 1)?.event, 'bounce', 'an occupied spinner is unavailable');
    const reused = G.tap(b, [null, parked.paths[1]], 1); assert.equal(reused.event, 'bounce');
    assert.deepEqual(reused.route.at(-1), spinner, 'the second rope uses the same spinner after it clears');
  }
});
