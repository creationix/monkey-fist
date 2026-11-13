const test = require('node:test'), assert = require('node:assert/strict');
const H = require('../hex/engine'), M = require('../hex/mechanics');
const p = (q, r) => ({ q, r });

test('all six approaches reflect geometrically on both sides of all three mirror axes', () => {
  for (let axis = 0; axis < 3; axis++) for (let d = 0; d < 6; d++) {
    const u = H.project(H.add(p(0, 0), H.DIRS[axis])), v = H.project(H.add(p(0, 0), H.DIRS[d]));
    const reflected = H.project(H.add(p(0, 0), H.DIRS[M.reflect(d, axis)])), dot = u.x * v.x + u.y * v.y;
    assert.ok(Math.hypot(reflected.x - (2 * dot * u.x - v.x), reflected.y - (2 * dot * u.y - v.y)) < 1e-10);
    assert.equal(M.reflect(M.reflect(d, axis), axis), d, 'two-sided and reversible');
    const center = p(2, 5), path = [-2, -1].map(n => H.add(center, H.DIRS[d], n));
    const b = { W: 12, H: 12, mirrors: [{ cell: center, axis }], ropes: [path] }, move = M.tap(b, b.ropes, 0);
    assert.equal(move.event, 'exit'); assert.deepEqual(move.route[3], H.add(center, H.DIRS[M.reflect(d, axis)]));
    assert.ok(move.route.slice(-path.length).every(cell => !H.inside(b, cell)), 'tail leaves completely');
    assert.equal(move.turns.length, d % 3 === axis ? 0 : 1);
  }
});
test('a head stopped on a mirror resumes in the reflected direction; loops are bounded and never overlap the body', () => {
  const b = { W: 8, H: 8, mirrors: [{ cell: p(2, 3), axis: 1 }], ropes: [[p(0, 3), p(1, 3)], [p(1, 4), p(2, 4)]] };
  const moved = M.tap(b, b.ropes, 0);
  assert.equal(moved.event, 'slide'); assert.deepEqual(moved.paths[0].at(-1), p(2, 3));
  assert.deepEqual(M.direction(b, moved.paths[0]), H.DIRS[2]);
  assert.equal(M.tap(b, moved.paths, 0), null);
  const freed = [moved.paths[0], null], next = M.tap(b, freed, 0);
  assert.deepEqual(next.route[2], p(1, 4)); assert.equal(next.event, 'exit');
  const loop = { W: 6, H: 6, mirrors: [{ cell: p(2, 1), axis: 1 }, { cell: p(0, 3), axis: 0 }, { cell: p(0, 1), axis: 2 }], ropes: [[p(1, 1), p(2, 1)]] };
  assert.equal(M.solve(loop, loop.ropes, 100).solved, false);
  assert.equal(M.solve(loop, loop.ropes, 1).solved, null, 'budget exhaustion is not a proven loss');
  let paths = loop.ropes;
  for (let i = 0; i < 20; i++) { const move = M.tap(loop, paths, 0); if (!move) break; paths = move.paths; assert.equal(new Set(paths[0].map(H.key)).size, paths[0].length); }
});
