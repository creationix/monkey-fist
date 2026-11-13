const test = require('node:test'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const C = require('../twist-circuits'), R = require('../hex/mirrors'), L = require('../levels'), G = require('../game-engine');
const key = p => p.q + ',' + p.r;
const dense = { coverage: .98, attemptsMultiplier: 24, allowEarly: true, minLength: 2 };
function skeleton(grid, W, H, count, seed, mode = 'MS', options) {
  const rng = L.mulberry32(seed * 1717);
  const raw = grid === 'square' ? C.skeleton(rng, W, H, [...(mode.includes('M') ? ['mirrors'] : []), ...(mode.includes('S') ? ['springs'] : [])], count, options) :
    R.skeleton(rng, W, H, count, mode.includes('M') ? 2 : 0, mode.includes('S'), 4, true, options);
  return { raw, rng };
}
function populated(grid, W, H, count, seed) {
  const { raw, rng } = skeleton(grid, W, H, count, seed, 'MS', { minDistinctSprings: 2 });
  assert.ok(raw, `${grid} ${W}×${H} has room for ${count} routed core ropes`);
  const options = { ...dense, length: Math.round(Math.min(W, H) * 1.5) };
  if (grid === 'hex') return { ...R.populate(raw, rng, 50, undefined, options), grid };
  const b = C.populate(raw, rng, undefined, options), point = cell => ({ q: cell % W, r: Math.floor(cell / W) });
  return { ...b, grid, ropes: b.ropes.map(path => path.map(p => ({ q: p.x, r: p.y }))),
    mirrors: b.mirrors.map(m => ({ ...m, cell: point(m.cell) })), springs: b.springs.map(point), locks: [], plan: b.solution };
}
function verify(b) {
  const played = G.replay(b, b.plan); assert.equal(played.solved, true);
  assert.ok(b.ropes.flat().length / (b.W * b.H) >= .84, 'multiple features must not require a larger or sparse board');
  const mirrors = new Map(b.mirrors.map(m => [key(m.cell), m])), reflected = new Set();
  const springUsers = new Map(b.springs.map(p => [key(p), new Set()]));
  let paths = b.ropes;
  for (const id of b.plan) {
    const before = paths[id], move = G.tap(b, paths, id); assert.ok(move);
    for (let j = before.length; j < move.route.length; j++) {
      const p = move.route[j], mirror = mirrors.get(key(p)); if (!mirror) continue;
      const previous = move.route[j - 1], dq = p.q - previous.q, dr = p.r - previous.r;
      const out = b.grid === 'hex' ? G.DIRS[(2 * mirror.axis - G.DIRS.findIndex(d => d[0] === dq && d[1] === dr) + 6) % 6] : mirror.slope === '/' ? [-dr, -dq] : [dr, dq];
      if (out[0] !== dq || out[1] !== dr) reflected.add(key(p));
    }
    if (move.event === 'bounce') springUsers.get(key(move.route.at(-1))).add(id);
    paths = move.paths;
    const occupied = new Set();
    for (const path of paths.filter(Boolean)) for (const p of path) { assert.ok(!occupied.has(key(p))); occupied.add(key(p)); }
  }
  assert.equal(reflected.size, b.mirrors.length, 'every mirror must actually turn a rope');
  assert.ok([...springUsers.values()].every(users => users.size), 'every distinct spinner must actually bounce a rope');
  return springUsers;
}
test('two distinct spinners and multiple turning mirrors fit dense moderate boards on both grids', () => {
  for (const grid of ['square', 'hex']) for (const [W, H] of [[10, 12], [12, 16]]) {
    const b = populated(grid, W, H, 2, 1);
    assert.deepEqual([b.W, b.H], [W, H]); assert.equal(b.springs.length, 2); assert.ok(b.mirrors.length >= 4);
    verify(b);
  }
});
test('later routed ropes can still share a spinner after the distinct minimum is established', () => {
  for (const [grid, seed] of [['square', 7], ['hex', 4]]) {
    const b = populated(grid, 12, 16, 3, seed), users = verify(b);
    assert.equal(b.springs.length, 2);
    assert.ok([...users.values()].some(group => group.size >= 2), 'one of two distinct spinners remains shared');
    assert.ok(b.mirrors.length >= 6);
  }
});
// Published seeded core arrangements are part of the old share-link contract.
// Omitting the opt-in setting, or explicitly choosing zero, must retain them.
test('the distinct-spinner option leaves published default seeded cores unchanged', () => {
  const fixtures = [
    ['square', 'M', 1, 'c8af16d8d3fa37f4322624db2046b5b0a53c3dfcb2e6e1675c98610fa52fbf65'],
    ['square', 'S', 1, 'ad43df834ec9dee823ea6c7dd67da1565caa1111cf1798de042e801bfacdfe05'],
    ['square', 'MS', 1, '9b2cedb384d1fe75dc12bc64b5a39cfe963604ca7cdd65d3e63439aaa0ed52e7'],
    ['hex', 'M', 1, 'e886891a301464eee625f8a7292c6d278f2a48a7f59eb955892de70c1e426f1d'],
    ['hex', 'S', 1, 'f1abac9fc7f247f7aeb0b37c242d7ad740f66b2dfad5b8f54e0bd7bb294dd04b'],
    ['hex', 'MS', 2, 'e96fa8524777441b01bb992f4f0ac43b454560876876cb2ba3dff4bdc783c183'],
  ];
  for (const [grid, mode, seed, expected] of fixtures) for (const options of [undefined, { minDistinctSprings: 0 }]) {
    const { raw } = skeleton(grid, 12, 16, 2, seed, mode, options); assert.ok(raw);
    const hash = createHash('sha256').update(JSON.stringify(raw)).digest('hex');
    assert.equal(hash, expected, `${grid} ${mode} must retain its original seeded core`);
  }
});
