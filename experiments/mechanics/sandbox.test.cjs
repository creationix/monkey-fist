const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('./sandbox-logic.js');
const levels = require('./sandbox-levels.js');

test('all published examples have replay-verified tap-only solutions', () => {
  assert.equal(levels.length, 12);
  for (const level of levels) {
    const solution = S.solve(level);
    assert.equal(solution.solved, true, level.title);
    assert.ok(solution.moves.every(Number.isInteger), 'only rope indices, no special actions');
    const replay = S.replay(level, solution.moves);
    assert.equal(replay.solved, true, level.title);
    if (level.springs) assert.ok(replay.events.includes('bounce'), level.title + ' must use its spring');
  }
});
test('a rope can stop on a mirror, resume, bounce, and follow the mirror in reverse', () => {
  const level = levels[7], before = structuredClone(level.ropes);
  const first = S.tap(level, before, 0);
  assert.equal(first.event, 'slide');
  assert.deepEqual(first.paths[0].at(-1), { x: 3, y: 4 });
  assert.deepEqual(S.direction(level, first.paths[0]), [0, -1]);
  assert.equal(S.tap(level, first.paths, 0), null, 'gate remains closed');
  const key = S.tap(level, first.paths, 1);
  assert.equal(key.event, 'exit');
  // A rope enters the spring cell, then reverses: its tail now holds the spring
  // and its new head points back down the route it came up.
  const bounced = S.tap(level, key.paths, 0);
  assert.equal(bounced.event, 'bounce');
  assert.deepEqual(bounced.paths[0][0], { x: 3, y: 1 }, 'the reversed tail occupies the spring');
  assert.deepEqual(S.direction(level, bounced.paths[0]), [0, 1]);
  // Its next move meets the mirror from the other side and turns left to leave.
  const out = S.tap(level, bounced.paths, 0), after = out.route.slice(bounced.paths[0].length);
  assert.equal(out.event, 'exit');
  assert.deepEqual(after.slice(0, 2), [{ x: 3, y: 4 }, { x: 2, y: 4 }]);
  assert.deepEqual(before, level.ropes, 'pre-move snapshots are immutable for undo');
});
test('exiting ropes retain an animation route until their entire body clears the grid', () => {
  const level = levels[0], result = S.tap(level, level.ropes, 0);
  assert.equal(result.event, 'exit');
  assert.equal(result.paths[0], null);
  assert.ok(result.route.length > level.ropes[0].length + result.distance - 1);
  const tailAtEnd = result.route[result.distance];
  assert.ok(tailAtEnd.x < 0 || tailAtEnd.y < 0 || tailAtEnd.x >= level.W || tailAtEnd.y >= level.H);
});
