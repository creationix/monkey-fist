// Sample automatic reversing blocks as overlays on existing generated puzzles.
const L = require('../../levels.js');
const E = require('./engine.cjs');
const S = require('./springs.cjs');
const assert = require('node:assert/strict');
const rows = [];
for (const mode of ['N', 'H', 'X']) {
  const set = L.generateSet({ seed: 'ALPHA', mode, count: 10, big: mode === 'X', slide: true });
  for (const index of [0, 4, 9]) {
    const d = set.levels[index], level = L.weave(L.mulberry32(d.seed), { ...d, W: d.boardW, H: d.boardH });
    const b = E.board(level), occupied = new Set(level.ropes.flat().map(p => p.y * level.W + p.x));
    const cells = [...new Set(b.seq.flatMap((s, i) => s.slice(b.len[i])))].filter(c => !occupied.has(c)).slice(0, 4);
    for (const cell of cells) {
      const variant = { ...level, springs: [cell] }, start = performance.now();
      const result = S.solve(variant, { prefer: level.taps });
      let bounces = null;
      if (result.solved) {
        const replay = S.replay(variant, result.moves);
        assert.equal(replay.solved, true);
        bounces = replay.events.filter(e => e === 'bounce').length;
        assert.ok(bounces > 0, 'a successful generated example must actually use the spring');
      }
      rows.push({ mode, level: index + 1, cell, ropes: level.ropes.length, solved: result.solved,
        nodes: result.nodes, bounces, ms: +(performance.now() - start).toFixed(3) });
    }
  }
}
console.log(JSON.stringify({ budget: 4000, summary: {
  candidates: rows.length, solved: rows.filter(r => r.solved === true).length,
  impossible: rows.filter(r => r.solved === false).length, unknown: rows.filter(r => r.solved === null).length,
  boardsWithSolution: new Set(rows.filter(r => r.solved).map(r => r.mode + r.level)).size,
}, rows }, null, 2));
