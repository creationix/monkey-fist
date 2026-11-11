const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../twists.js'), M = require('../mechanics.js');

test('the twelve Twists levels introduce mirrors, gates, springs, then combinations', () => {
  assert.equal(T.PACK.length, 12);
  const has = (i, key) => !!T.PACK[i][key]?.length;
  for (const i of [0, 1]) assert.ok(has(i, 'mirrors') && !has(i, 'gates') && !has(i, 'springs'));
  for (const i of [2, 3]) assert.ok(has(i, 'gates') && !has(i, 'mirrors') && !has(i, 'springs'));
  for (const i of [4, 5]) assert.ok(has(i, 'springs') && !has(i, 'gates') && !has(i, 'mirrors'));
  for (const i of [9, 10, 11]) assert.ok(has(i, 'mirrors') && has(i, 'gates') && has(i, 'springs'));
});
test('all 96 seed transforms preserve their solution, tap-only interaction, and player-tap par', () => {
  for (let bits = 0; bits < 8; bits++) for (const base of T.PACK) {
    const level = T.transform(base, bits), replay = M.replay(level, level.solution);
    assert.equal(replay.solved, true, base.title + ' transform ' + bits);
    assert.equal(M.score(level, level.solution), level.par);
    assert.ok(level.solution.every(Number.isInteger));
    if (level.springs.length) assert.ok(replay.events.includes('bounce'), base.title);
  }
});
test('curated par is the fewest player taps on every teaching puzzle', () => {
  for (const level of T.PACK.slice(0, 11)) {
    const p = M.minimum(level, 10000, level.solution);
    assert.equal(p.exact, true); assert.equal(p.par, level.par, level.title);
  }
});
test('the default seed is the authored layout and every other seed is deterministic', () => {
  for (const seed of ['MONKEYFIST', 'ALPHA', 'BRAVO']) {
    const set = T.generateSet({ seed });
    assert.equal(set.code, 'T12S-' + seed);
    for (const d of set.levels) {
      const a = T.levelFrom(d), b = T.levelFrom(d);
      assert.deepEqual(a, b);
      assert.equal(M.replay(a.definition, a.best).solved, true);
    }
  }
});
test('endless spring bounces are not auto-free, and a solver timeout is not a proved loss', () => {
  const level = { W: 6, H: 3, springs: [6, 11], ropes: [[{ x: 2, y: 1 }, { x: 3, y: 1 }]] };
  assert.equal(M.allFree(level, level.ropes), false);
  assert.equal(M.solve(level).solved, false);
  assert.equal(M.solve(level, level.ropes, 1).solved, null);
});
