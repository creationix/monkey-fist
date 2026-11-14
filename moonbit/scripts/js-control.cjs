// Control experiment: is the speed-up the language or the data representation?
// Re-implements the full-geometry tap in plain JS the way the MoonBit port does it
// (integer cells, a stamp array instead of a Set of "q,r" strings, a flat state key)
// and times casual playouts against grid-generator.js's casualRate on the same boards.
// node js-control.cjs <reference checkout dir>
const path = require('path'), ref = path.resolve(process.argv[2]);
const G = require(path.join(ref, 'game-engine.js')), F = require(path.join(ref, 'grid-generator.js')), L = require(path.join(ref, 'levels.js'));
const HD = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
function geo(b) {
  const hex = b.grid === 'hex', W = b.W, H = b.H, cell = hex ? p => p.r * W + p.q + Math.floor(p.r / 2) : p => p.r * W + p.q;
  const inside = hex ? p => p.r >= 0 && p.r < H && p.q + Math.floor(p.r / 2) >= 0 && p.q + Math.floor(p.r / 2) < W : p => p.q >= 0 && p.r >= 0 && p.q < W && p.r < H;
  const mirror = new Int8Array(W * H).fill(-1), spring = new Uint8Array(W * H), occ = new Int32Array(W * H);
  for (const m of b.mirrors) mirror[cell(m.cell)] = hex ? m.axis : m.slope === '/' ? 0 : 1;
  for (const p of b.springs) spring[cell(p)] = 1;
  return { hex, W, H, cell, inside, mirror, spring, occ, stamp: 0 };
}
const reflect = (d, a) => ((2 * a - d) % 6 + 6) % 6, dirIndex = (q, r) => HD.findIndex(d => d[0] === q && d[1] === r);
const turn = (s, dx, dy) => s === 0 ? [-dy, -dx] : [dy, dx];
function tap(g, paths, i) {
  const path = paths[i]; if (!path) return null;
  const s = ++g.stamp; for (const p of paths) if (p) for (const c of p) g.occ[g.cell(c)] = s;
  const route = path.slice(), h = path[path.length - 1], pr = path[path.length - 2];
  let dq = h.q - pr.q, dr = h.r - pr.r, m = g.mirror[g.cell(h)];
  if (m >= 0) { if (g.hex) [dq, dr] = HD[reflect(dirIndex(dq, dr), m)]; else [dq, dr] = turn(m, dq, dr); }
  let p = h, distance = 0, event = 'slide';
  const seen = [];
  if (g.hex) {
    let d = dirIndex(dq, dr);
    for (;;) {
      const next = { q: p.q + HD[d][0], r: p.r + HD[d][1] };
      if (!g.inside(next)) { for (let k = 0; k < path.length + 2; k++) { p = { q: p.q + HD[d][0], r: p.r + HD[d][1] }; route.push(p); distance++; } const r = paths.slice(); r[i] = null; return { paths: r, event: 'exit', distance, route }; }
      const c = g.cell(next); if (g.occ[c] === s) break;
      if (g.spring[c]) { route.push(next); distance++; const r = paths.slice(); r[i] = route.slice(-path.length).reverse(); return { paths: r, event: 'bounce', distance, route }; }
      if (seen.includes(c)) return null; seen.push(c); p = next; route.push(p); distance++;
      if (g.mirror[c] >= 0) d = reflect(d, g.mirror[c]);
    }
    if (!distance) return null;
    const r = paths.slice(); r[i] = route.slice(-path.length); return { paths: r, event: 'slide', distance, route };
  }
  for (;;) {
    const state = ((p.r * g.W + p.q) * 3 + dq + 1) * 3 + dr + 1; if (seen.includes(state)) return null; seen.push(state);
    const nq = p.q + dq, nr = p.r + dr;
    if (nq < 0 || nr < 0 || nq >= g.W || nr >= g.H) { event = 'exit'; for (let k = 0; k < path.length + 2; k++) { p = { q: p.q + dq, r: p.r + dr }; route.push(p); distance++; } break; }
    const c = nr * g.W + nq; if (g.occ[c] === s) break;
    p = { q: nq, r: nr }; route.push(p); distance++;
    if (g.spring[c]) { event = 'bounce'; break; }
    if (g.mirror[c] >= 0) [dq, dr] = turn(g.mirror[c], dq, dr);
  }
  if (event === 'slide' && !distance) return null;
  const r = paths.slice(); r[i] = event === 'exit' ? null : route.slice(-path.length); if (event === 'bounce') r[i] = r[i].reverse();
  return { paths: r, event, distance, route };
}
function casual(b, rng, games) { // grid-generator.js casualRate, full-geometry branch, with the int tap
  const g = geo(b); let wins = 0;
  for (let k = 0; k < games; k++) {
    let paths = b.ropes;
    for (let step = 0; step < b.ropes.length * 6 + 20; step++) {
      const moves = []; for (let i = 0; i < paths.length; i++) { const m = paths[i] && tap(g, paths, i); if (m) moves.push(m); }
      if (!moves.length) break;
      const exits = moves.filter(m => m.event === 'exit'), pool = exits.length ? exits : moves;
      paths = pool[Math.floor(rng() * pool.length)].paths;
      if (paths.every(p => !p)) { wins++; break; }
    }
  }
  return wins / Math.max(1, games);
}
const best = f => { let t = Infinity, v; for (let k = 0; k < 5; k++) { const s = performance.now(); v = f(); t = Math.min(t, performance.now() - s); } return [t, v]; };
console.log('level  kind                         casual x100: original JS | int-cell JS (same algorithm)');
for (const i of [29, 59, 88, 119]) {
  const b = G.generate({ kind: 'journey', index: i });
  const [a, va] = best(() => F.casualRate(b, G, L.mulberry32(L.hashString('bench')), 100));
  const [c, vc] = best(() => casual(b, L.mulberry32(L.hashString('bench')), 100));
  console.log(`L${i + 1}`.padEnd(6), `${b.grid} ${b.W}x${b.H} ${b.ropes.length} ropes`.padEnd(28), `${a.toFixed(1)} ms | ${c.toFixed(1)} ms`, va === vc ? 'same result' : `DIFFERENT ${va} ${vc}`);
}
