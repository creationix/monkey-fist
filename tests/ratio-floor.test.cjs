const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../game-engine');

function verify(board) {
  const count = board.ropes.length;
  assert.ok(board.par * 3 >= count, `${board.grid}: ${board.par} taps for ${count} ropes falls below the difficulty floor`);
  const played = G.replay(board, board.plan);
  assert.equal(played.solved, true); assert.equal(played.taps, board.par);
  const minimum = board.W * board.H <= 48 && played.events.includes('slide') ? .8 : .85;
  assert.ok(board.coverage >= minimum, 'the ratio floor must not be bought by making the grid sparse');
  if (count > 3) for (let i = 0; i < count; i++) {
    const move = G.tap(board, board.ropes, i);
    assert.ok(!move || !G.allFree(board, move.paths), 'a longer certificate must not conceal a one-tap solution');
  }
  return played;
}

// Ignore rope IDs, translation, rotations and reflections. A seed must change
// the woven arrangement, rather than just mirror the same opening template.
function shape(board) {
  const choices = [];
  for (const flip of [false, true]) for (let turn = 0; turn < (board.grid === 'hex' ? 6 : 4); turn++) {
    const ropes = board.ropes.map(path => path.map(p => {
      let q = p.q, r = p.r;
      if (flip) [q, r] = [r, q];
      for (let k = 0; k < turn; k++) [q, r] = board.grid === 'hex' ? [-r, q + r] : [-r, q];
      return [q, r];
    }));
    const points = ropes.flat(), q0 = Math.min(...points.map(p => p[0])), r0 = Math.min(...points.map(p => p[1]));
    choices.push(ropes.map(path => path.map(([q, r]) => `${q - q0},${r - r0}`).join(';')).sort().join('|'));
  }
  return choices.sort()[0];
}

test('twenty low-difficulty seeds per grid retain the ratio floor and varied dense geometry', { timeout: 120000 }, () => {
  for (const grid of ['square', 'hex']) {
    const dimensions = [[4, 5], [6, 8], [8, 8], [12, 14]];
    const signatures = dimensions.map(() => new Set());
    for (let seed = 0; seed < 20; seed++) {
      const slot = seed % dimensions.length, [width, height] = dimensions[slot];
      const board = G.generate({ revision: 3, grid, width, height, min: 1, max: 1, count: 1, seed: 'FLOOR' + seed });
      assert.deepEqual([board.W, board.H], [width, height]); verify(board);
      signatures[slot].add(shape(board));
    }
    for (let i = 0; i < dimensions.length; i++) assert.ok(signatures[i].size >= 4, `${grid} ${dimensions[i].join('×')} needs genuinely different opening arrangements`);
  }
});

test('the opening Journey has no below-floor or concealed one-tap fan levels', { timeout: 120000 }, () => {
  const metadata = require('../grid-journey');
  assert.ok(metadata.every(level => level.par * 3 >= level.ropeCount), 'all Journey targets satisfy the same minimum ratio');
  const intro = metadata.slice(0, 10);
  assert.deepEqual(intro.map(level => level.slot).sort((a,b)=>a-b), [...Array(10).keys()], 'each seeded opening slot is represented once');
  assert.ok(intro.some(level=>level.requireSlide),'some opening puzzles require a partial slide');
  assert.equal(intro.filter(level => level.grid === 'square').length, 5);
  assert.ok(intro.every(level => Number.isFinite(level.openingChallenge)));
  for (let i = 1; i < intro.length; i++) assert.ok(intro[i-1].openingChallenge <= intro[i].openingChallenge, 'changing grid geometry does not restart the difficulty curve');
  for (let index = 0; index < 10; index++) {
    const board = G.generate({ ...G.DEFAULT, index }), played = verify(board);
    assert.equal(board.seed,intro[index].seed);
    assert.equal(board.journeySeed,G.DEFAULT.seed);
    assert.equal(G.allFree(board,board.ropes),false);
    const rebuilt=require('../grid-generator').generate(intro[index],G);
    assert.deepEqual(rebuilt.ropes,board.ropes,'the stored seeded settings regenerate each opening board');
    assert.equal(G.layoutKey(rebuilt),intro[index].layoutKey);
    assert.ok(board.ropes.length <= 5, 'introductory boards keep the number of ropes manageable');
    if (intro[index].requireSlide) assert.ok(played.events.includes('slide'), 'designated introductions demonstrate a partial slide before release');
    assert.equal(board.par, metadata[index].par);
    assert.equal(board.ropes.length, metadata[index].ropeCount);
  }
});

test('legacy shared one-tap puzzles retain their original rules and targets', () => {
  for (const [code, count] of [['U1-H-1-1-1-N-FLOOR', 2], ['U2-H-1-1-10-10-1-N-FLOOR', 10]]) {
    const board = G.generate(G.parseCode(code));
    assert.equal(board.ropes.length, count); assert.equal(board.par, 1);
    assert.equal(G.replay(board, board.plan).solved, true);
  }
});
