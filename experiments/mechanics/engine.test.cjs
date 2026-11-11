const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../../levels.js');
const E = require('./engine.cjs');
const F = require('./fixtures.cjs');

// Independent small-board oracle: stores current paths, rebuilds occupancy, no tracks or pruning.
function brute(level) {
  const queue = [{ paths: level.ropes, flips: level.flips || 0 }], seen = new Set();
  for (let q = 0; q < queue.length; q++) {
    const s = queue[q];
    if (s.paths.every(p => !p)) return true;
    const key = JSON.stringify(s); if (seen.has(key)) continue; seen.add(key);
    const occupied = new Set(s.paths.filter(Boolean).flat().map(p => p.y * level.W + p.x));
    s.paths.forEach((path, i) => {
      if (!path) return;
      const h = path.at(-1); let [dx, dy] = L.headDir(path), x = h.x, y = h.y, dist = 0;
      const ahead = [], visited = new Set();
      const reflect = () => {
        const m = (level.mirrors || []).find(m => m.cell === y * level.W + x);
        if (m?.slope === '/') [dx, dy] = [-dy, -dx];
        if (m?.slope === '\\') [dx, dy] = [dy, dx];
      };
      reflect(); x += dx; y += dy;
      while (x >= 0 && y >= 0 && x < level.W && y < level.H) {
        const c = y * level.W + x;
        if (occupied.has(c) || (level.walls || []).includes(c) || (level.gates || []).some(g => g.cell === c && s.paths[g.key])) break;
        if (visited.has(c)) throw new Error('Oracle only supports simple mirror routes');
        visited.add(c); ahead.push({ x, y }); dist++; reflect(); x += dx; y += dy;
      }
      const exits = x < 0 || y < 0 || x >= level.W || y >= level.H;
      if (exits || dist) {
        const paths = s.paths.slice(); paths[i] = exits ? null : path.concat(ahead).slice(dist);
        queue.push({ paths, flips: s.flips });
      }
      if (s.flips) { const paths = s.paths.slice(); paths[i] = path.slice().reverse(); queue.push({ paths, flips: s.flips - 1 }); }
    });
  }
  return false;
}

test('a fixed wall blocks an exit forever; a direction flip can rescue it', () => {
  assert.equal(E.solve(F.wall).solved, false);
  const level = { ...F.wall, flips: 1 }, solution = E.solve(level);
  assert.equal(solution.solved, true);
  assert.ok(solution.moves.some(m => m.type === 'flip'));
  assert.equal(E.replay(level, solution.moves).solved, true);
  assert.equal(E.dead(E.board(level)), false, 'do not apply fixed-track deadlock proof while a flip remains');
});
test('key removal opens a gate and cyclic key dependencies are rejected', () => {
  const solution = E.solve(F.gate);
  assert.equal(solution.solved, true);
  assert.equal(E.replay(F.gate, solution.moves).solved, true);
  assert.equal(E.solve(F.gateCycle).solved, false);
  assert.equal(brute(F.gateCycle), false);
});
test('gate overlays preserve a known solution and actually introduce a dependency', () => {
  const level = { ...F.gate, gates: [], taps: [1, 0] };
  const candidate = E.gateCandidates(level).find(c => c.cell === 8 && c.key === 1);
  assert.ok(candidate);
  assert.equal(E.replay({ ...level, gates: [candidate] }, level.taps.map(rope => ({ type: 'tap', rope }))).solved, true);
  assert.equal(E.solve({ ...level, walls: [candidate.cell] }).solved, false);
  assert.equal(E.solve(level, { target: 0, keep: 1 }).solved, true, 'without the gate the target can leave before its key');
  assert.equal(E.solve({ ...level, gates: [candidate] }, { target: 0, keep: 1 }).solved, false, 'the gate introduces a new ordering requirement');
});
test('optimistic pruning agrees with exhaustive search on 360 seeded small boards', () => {
  const rng = L.mulberry32(0xdecafbad), W = 4, H = 3;
  let solvable = 0, impossible = 0;
  for (let k = 0; k < 120; k++) {
    const used = new Set(), ropes = [];
    while (ropes.length < 3) {
      const x = Math.floor(rng() * W), y = Math.floor(rng() * H), [dx, dy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][Math.floor(rng() * 4)];
      const nx = x + dx, ny = y + dy, cells = [y * W + x, ny * W + nx];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || cells.some(c => used.has(c))) continue;
      cells.forEach(c => used.add(c)); ropes.push([{ x, y }, { x: nx, y: ny }]);
    }
    const empty = Array.from({ length: W * H }, (_, c) => c).filter(c => !used.has(c)), c = empty[Math.floor(rng() * empty.length)];
    for (const features of [{ walls: [c] }, { gates: [{ cell: c, key: k % 3 }] }, { walls: [c], flips: 1 }]) {
      const level = { W, H, ropes, ...features }, expected = brute(level), result = E.solve(level, { budget: 100000 });
      assert.equal(result.solved, expected, JSON.stringify(level));
      if (expected) { solvable++; assert.equal(E.replay(level, result.moves).solved, true); } else impossible++;
    }
  }
  assert.ok(solvable && impossible, 'cover both successful and impossible boards');
});
test('tunnel head topology can turn a route, but must detect portal cycles', () => {
  const route = E.traceTunnelHead({ W: 5, H: 5, head: { x: 0, y: 1 }, direction: [1, 0], portals: [{ entry: { x: 2, y: 1 }, exit: { x: 3, y: 3 }, direction: [0, -1] }] });
  assert.equal(route.exits, true); assert.ok(route.cells.includes(18)); assert.ok(route.cells.includes(3));
  const loop = E.traceTunnelHead({ W: 5, H: 5, head: { x: 0, y: 1 }, direction: [1, 0], portals: [{ entry: { x: 2, y: 1 }, exit: { x: 0, y: 1 } }] });
  assert.equal(loop.loop, true); assert.equal(loop.exits, false);
});

test('both mirror slopes reflect all four incoming directions', () => {
  const expected = { '/': [[0, -1], [-1, 0], [0, 1], [1, 0]], '\\': [[0, 1], [1, 0], [0, -1], [-1, 0]] };
  for (const slope of ['/', '\\']) [[1, 0], [0, 1], [-1, 0], [0, -1]].forEach((direction, i) => {
    const route = E.traceMirrorHead({ W: 5, H: 5, head: { x: 2, y: 2 }, direction, mirrors: [{ cell: 12, slope }] });
    const [dx, dy] = expected[slope][i];
    assert.equal(route.cells[0], (2 + dy) * 5 + 2 + dx);
    assert.equal(route.exits, true);
  });
});
test('simple mirror tracks agree with an independent cell-by-cell exhaustive solver', () => {
  const rng = L.mulberry32(1945), W = 4, H = 4;
  let checked = 0, rejected = 0;
  for (let i = 0; i < 240; i++) {
    const ropes = [[{ x: 0, y: 1 }, { x: 1, y: 1 }], [{ x: 2, y: 3 }, { x: 2, y: 2 }], [{ x: 3, y: 0 }, { x: 2, y: 0 }]];
    const used = new Set(ropes.flat().map(p => p.y * W + p.x));
    const empty = Array.from({ length: W * H }, (_, c) => c).filter(c => !used.has(c));
    const mirrors = [];
    for (let j = 0; j < 2; j++) mirrors.push({ cell: empty.splice(Math.floor(rng() * empty.length), 1)[0], slope: rng() < .5 ? '/' : '\\' });
    const level = { W, H, ropes, mirrors };
    try { E.board(level); } catch { rejected++; continue; }
    const solution = E.solve(level, { budget: 100000 });
    assert.equal(solution.solved, brute(level), JSON.stringify(level));
    if (solution.solved) assert.equal(E.replay(level, solution.moves).solved, true);
    checked++;
  }
  assert.ok(checked > 100, `checked ${checked}, rejected ${rejected}`);
});
test('a mirror routes a rope around a wall using the compact solver', () => {
  const level = { ...F.wall, mirrors: [{ cell: 7, slope: '/' }] };
  const result = E.solve(level);
  assert.equal(result.solved, true);
  assert.equal(E.replay(level, result.moves).solved, true);
  assert.equal(E.solve(F.wall).solved, false);
});
test('a mirror loop is rejected during track compilation', () => {
  const mirrors = [{ cell: 6, slope: '/' }, { cell: 8, slope: '\\' }, { cell: 18, slope: '/' }, { cell: 16, slope: '\\' }];
  const route = E.traceMirrorHead({ W: 5, H: 5, head: { x: 2, y: 1 }, direction: [1, 0], mirrors });
  assert.equal(route.loop, true);
  assert.throws(() => E.board({ W: 5, H: 5, ropes: [[{ x: 1, y: 1 }, { x: 2, y: 1 }]], mirrors }), /self-intersecting/);
});
