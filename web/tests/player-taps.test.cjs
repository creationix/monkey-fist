const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../levels.js');

function brute(ropes, W, H) {
  let queue = [{ paths: ropes, depth: 0 }]; const seen = new Set();
  for (let q = 0; q < queue.length; q++) {
    const { paths, depth } = queue[q], key = JSON.stringify(paths);
    if (seen.has(key)) continue; seen.add(key);
    const left = paths.filter(Boolean);
    if (!left.length) return depth;
    const occ = L.occupancy(left, W, H);
    if (left.every(p => L.ray(p, occ, W, H).clear)) return Math.max(1, depth);
    paths.forEach((p, i) => {
      if (!p) return;
      const r = L.ray(p, occ, W, H); if (!r.clear && !r.dist) return;
      const next = paths.slice(); next[i] = r.clear ? null : L.advance(p, r.dist);
      queue.push({ paths: next, depth: depth + 1 });
    });
  }
  return null;
}
test('free ropes cost one initiating tap, and optional early exits cost extra', () => {
  const ropes = [[{ x: 0, y: 0 }, { x: 1, y: 0 }], [{ x: 0, y: 2 }, { x: 1, y: 2 }]];
  const p = L.fewestPlayerTaps(ropes, 4, 3, [0, 1]);
  assert.equal(p.count, 1); assert.equal(p.exact, true);
  assert.equal(L.playerTapCount(ropes, 4, 3, [0, 1]), 1);
  assert.equal(L.fewestPlayerTaps(ropes, 4, 3, [0]), null, 'fallback must be a complete solution');
});
test('player-tap par agrees with exhaustive search on 160 seeded small boards', () => {
  const rng = L.mulberry32(7182), W = 4, H = 3; let checked = 0;
  for (let k = 0; k < 160; k++) {
    const ropes = [], occupied = new Set();
    while (ropes.length < 3) {
      const x = Math.floor(rng() * W), y = Math.floor(rng() * H), [dx, dy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][Math.floor(rng() * 4)];
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || occupied.has(y * W + x) || occupied.has(ny * W + nx)) continue;
      occupied.add(y * W + x); occupied.add(ny * W + nx); ropes.push([{ x, y }, { x: nx, y: ny }]);
    }
    const solution = L.solve(ropes, W, H, 100000);
    if (!solution.solved) continue;
    const p = L.fewestPlayerTaps(ropes, W, H, solution.moves, 100000);
    assert.equal(p.exact, true); assert.equal(p.count, brute(ropes, W, H), JSON.stringify(ropes));
    assert.ok(L.play(ropes, W, H, p.taps).every(p => !p)); checked++;
  }
  assert.ok(checked > 60);
});
