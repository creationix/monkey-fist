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
