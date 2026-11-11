const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('./springs.cjs');
const F = require('./fixtures.cjs');
const L = require('../../levels.js');

test('ordinary taps approach a spring, bounce end-for-end, then leave', () => {
  const level = { ...F.wall, walls: [], springs: F.wall.walls };
  const first = S.tap(level, level.ropes, 0);
  assert.equal(first.event, 'bounce'); assert.equal(first.distance, 1);
  assert.deepEqual(first.paths[0], [{ x: 2, y: 1 }, { x: 1, y: 1 }]);
  assert.deepEqual(L.headDir(first.paths[0]), [-1, 0]);
  assert.equal(S.tap(level, first.paths, 0).event, 'exit');
  assert.deepEqual(S.replay(level, [0, 0]).events, ['bounce', 'exit']);
  assert.equal(S.solve(level).solved, true);
  assert.deepEqual(S.solve(level).moves, [0, 0], 'the solution contains only rope indices to tap');
});
test('a spring directly ahead still bounces on a tap', () => {
  const level = { ...F.wall, walls: [], springs: [7] };
  const next = S.tap(level, level.ropes, 0);
  assert.equal(next.distance, 0); assert.equal(next.event, 'bounce');
  assert.deepEqual(next.paths[0], level.ropes[0].slice().reverse());
});
test('another rope blocks access to the spring until it is cleared', () => {
  const level = { W: 5, H: 4, springs: [9], ropes: [
    [{ x: 0, y: 1 }, { x: 1, y: 1 }], [{ x: 2, y: 2 }, { x: 2, y: 1 }],
  ] };
  assert.equal(S.tap(level, level.ropes, 0), null);
  const clear = S.tap(level, level.ropes, 1);
  assert.equal(clear.event, 'exit');
  assert.equal(S.tap(level, clear.paths, 0).event, 'bounce');
  const solution = S.solve(level);
  assert.equal(S.replay(level, solution.moves).solved, true);
});
test('a bent rope reverses its actual body, and undo can restore its pre-tap snapshot', () => {
  const level = { W: 5, H: 4, springs: [8], ropes: [[{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 1, y: 1 }]] };
  const before = structuredClone(level.ropes), next = S.tap(level, before, 0);
  assert.equal(next.event, 'exit'); // This arrow points up, so it must not react to an unrelated spring.
  level.springs = [1];
  const bounce = S.tap(level, before, 0);
  assert.equal(bounce.event, 'bounce');
  assert.deepEqual(bounce.paths[0], before[0].slice().reverse());
  assert.deepEqual(before, level.ropes, 'transition must leave the undo snapshot untouched');
});
test('two springs forming an endless bounce cycle are rejected, not recursed forever', () => {
  const level = { W: 6, H: 3, springs: [6, 11], ropes: [[{ x: 2, y: 1 }, { x: 3, y: 1 }]] };
  assert.equal(S.solve(level).solved, false);
  assert.ok(S.solve(level).nodes < 10);
  assert.equal(S.solve(level, { budget: 1 }).solved, null, 'exhaustion remains unknown');
});
