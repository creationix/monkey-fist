const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../game-engine');
const H = require('../hex/engine');

function options(grid, width, height, difficulty, features = {}) {
  return { revision: 3, grid, width, height, seed: 'PACKED', min: difficulty, max: difficulty, count: 1, ...features };
}
function coverage(board) {
  return board.ropes.reduce((total, path) => total + path.length, 0) / (board.W * board.H);
}
function verify(board, width, height, minimumCoverage) {
  assert.equal(board.W, width, 'the requested columns must survive generation');
  assert.equal(board.H, height, 'the requested rows must survive generation');
  assert.ok(board.ropes.length >= 2);
  assert.equal(G.allFree(board, board.ropes), false, 'a full grid must still contain a dependency');
  assert.ok(coverage(board) >= minimumCoverage, `${board.grid} ${width} × ${height}: ${(coverage(board) * 100).toFixed(1)}% rope coverage`);
  const replayed = G.replay(board, board.plan);
  assert.equal(replayed.solved, true);
  assert.equal(replayed.taps, board.par, 'the tap target includes only the manual prefix');
  const directions = board.grid === 'hex' ? H.DIRS : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function check(paths) {
    const occupied = new Set();
    for (const path of paths.filter(Boolean)) {
      assert.ok(path.length >= 2);
      for (let j = 0; j < path.length; j++) {
        const p = path[j], key = H.key(p);
        assert.ok(!occupied.has(key), 'every resting cell has at most one rope'); occupied.add(key);
        assert.ok(board.grid === 'hex' ? H.inside(board, p) : p.q >= 0 && p.r >= 0 && p.q < width && p.r < height, 'settled rope cells stay inside the chosen grid');
        if (j) assert.ok(directions.some(d => p.q - path[j - 1].q === d[0] && p.r - path[j - 1].r === d[1]), 'rope segments follow grid edges');
      }
    }
  }
  let paths = board.ropes; check(paths);
  for (const id of board.plan) { const move = G.tap(board, paths, id); assert.ok(move); paths = move.paths; check(paths); }
  assert.ok(paths.every(p => !p));
}

test('fixed grid sizes stay packed while difficulty changes the unlocking challenge', { timeout: 120000 }, () => {
  for (const grid of ['square', 'hex']) for (const [width, height] of [[8, 8], [12, 14], [14, 10]]) {
    const easy = G.generate(options(grid, width, height, 1));
    const hard = G.generate(options(grid, width, height, 100));
    verify(easy, width, height, .85); verify(hard, width, height, .85);
    const easyRatio = easy.par / easy.ropes.length, hardRatio = hard.par / hard.ropes.length;
    assert.ok(easyRatio < .25, `${grid}: easy boards should unlock most ropes automatically`);
    assert.ok(hardRatio > .5, `${grid}: hard boards need many individual unlocking taps`);
    assert.ok(hardRatio > easyRatio + .3);
  }
});

test('minimum grids and optional twists retain their exact dimensions and safe solutions', { timeout: 120000 }, () => {
  for (const grid of ['square', 'hex']) {
    verify(G.generate(options(grid, 4, 4, 1)), 4, 4, .85);
    verify(G.generate(options(grid, 4, 4, 100)), 4, 4, .85);
    for (const features of [{ mirrors: true }, { springs: true }, { mirrors: true, springs: true }]) {
      for (const difficulty of [1, 100]) {
        const board = G.generate(options(grid, 10, 12, difficulty, features));
        verify(board, 10, 12, .8);
        assert.equal(!!board.mirrors.length, !!features.mirrors);
        assert.equal(!!board.springs.length, !!features.springs);
      }
    }
  }
});

test('grid settings round-trip with sane bounds and do not reuse the rope-count format', () => {
  const settings = G.normalize({ revision: 3, grid: 'mixed', width: 10, height: 14, min: 25, max: 80, count: 40, seed: 'SLIDERS', mirrors: true, springs: true });
  assert.equal(G.code(settings), 'U3-M-25-80-10-14-40-MS-SLIDERS');
  assert.deepEqual(G.parseCode(G.code(settings)), settings);
  for (let index = 0; index < 10; index++) {
    const easy = G.spec({ ...settings, min: 1, max: 1 }, index), hard = G.spec({ ...settings, min: 100, max: 100 }, index);
    assert.deepEqual([easy.W, easy.H], [10, 14]); assert.deepEqual([hard.W, hard.H], [10, 14]);
  }
  const bounds = G.normalize({ revision: 3, width: 1, height: 100, count: 999 });
  assert.deepEqual([bounds.width, bounds.height, bounds.count], [4, 24, 200]);
  const features = G.normalize({ revision: 3, width: 4, height: 4, mirrors: true });
  assert.deepEqual([features.width, features.height], [8, 8]);
  assert.equal(G.parseCode('U3-S-1-100-3-14-10-N-SEED'), null);
  assert.equal(G.parseCode('U3-H-1-100-10-25-10-N-SEED'), null);
  assert.equal(G.parseCode('U3-S-1-100-4-4-10-M-SEED'), null);
  assert.equal(G.code(G.parseCode('U2-H-1-100-6-40-120-MS-MONKEYFIST')), 'U2-H-1-100-6-40-120-MS-MONKEYFIST');
});

test('a shared fixed-grid set regenerates the same board and solution', { timeout: 60000 }, () => {
  for (const grid of ['square', 'hex']) {
    const settings = options(grid, 10, 14, 75, { mirrors: true, springs: true });
    const first = G.generate(settings), shared = G.generate(G.parseCode(G.code(settings)));
    assert.deepEqual(shared, first);
  }
});
