const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../twist-circuits.js'), L = require('../levels.js'), M = require('../mechanics.js');

test('advanced mechanics form working multi-turn key chains with interleaved ordinary ropes', () => {
  for (const [W, H] of [[12, 16], [16, 22]]) for (let seed = 0; seed < 40; seed++) {
    const b = C.generate(L.mulberry32(seed), W, H, ['springs', 'mirrors', 'gates']);
    assert.ok(b, 'bounded generation must succeed for seed ' + seed);
    const a = C.audit(b);
    assert.equal(a.mirrors.size, b.mirrors.length, 'every mirror must be on a certified route');
    assert.equal(a.springs.size, b.springs.length, 'every spring must be hit');
    assert.equal(a.gates.size, b.gates.length, 'every gate must be crossed');
    assert.ok(b.mirrors.length >= 2 && b.springs.length >= 3 && b.gates.length >= 2); // Mirrors may serve several ropes.
    assert.ok(a.multiTurnRopes >= b.circuit.core);
    assert.equal(a.routedKeys, b.gates.length, 'keys themselves must use springs and multiple mirrors');
    assert.ok(a.interleaved >= 4, 'ordinary ropes must leave between mechanic moves, not just before them');
    assert.ok(b.circuit.followers >= b.circuit.early);
    assert.ok(M.score(b, b.solution) > 0);
    // With all other ropes gone, each key is still self-locked without its spring.
    // This is a complete small-state proof, not a timeout or a visual hit counter.
    for (let i = 0; i < b.circuit.core; i++) {
      const alone = Array(b.ropes.length).fill(null); alone[i] = b.ropes[i];
      assert.equal(M.solve({ ...b, mirrors: [], springs: [], gates: [] }, alone, 100).solved, false);
    }
    // Each gate must actually prevent its linked rope leaving while its key is
    // held, even when every unrelated rope has been removed.
    for (let i = 1; i < b.circuit.core; i++) {
      const state = Array(b.ropes.length).fill(null); state[i] = b.ropes[i]; state[i - 1] = b.ropes[i - 1];
      state[i] = M.tap(b, state, i).paths[i]; state[i - 1] = M.tap(b, state, i - 1).paths[i - 1];
      const gate = b.gates.find(g => g.key === i - 1);
      assert.notEqual(M.tap(b, state, i)?.event, 'exit');
      assert.equal(M.tap({ ...b, gates: b.gates.filter(g => g !== gate) }, state, i)?.event, 'exit');
    }
  }
});
test('route-first generation respects introductory feature subsets', () => {
  for (const kinds of [['springs'], ['mirrors', 'gates'], ['springs', 'mirrors'], ['springs', 'gates']]) {
    const b = C.generate(L.mulberry32(42), 12, 16, kinds); assert.ok(b);
    for (const key of ['mirrors', 'springs', 'gates']) assert.equal(!!b[key].length, kinds.includes(key));
    assert.equal(M.replay(b, b.solution).solved, true);
  }
});
