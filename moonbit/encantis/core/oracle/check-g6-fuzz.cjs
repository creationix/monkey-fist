// G6's review: random small boards dense with mirrors (a third of the cells; springs on two boards in
// five), two to eight ropes of 2 or 3 cells, and a random legal tap sequence of each (up to 30 taps):
// Q.analyze (manual all and random), featureStats, featuresUsed, slideStats (random manual), valid,
// trivial and casual x3 against the JS at 9e69e3a. Generated boards have simple ways out, so their
// rays never cross themselves; here they do, which is where the JS's Hex loop rule (a cell seen twice,
// whatever the way) differs from square's (a cell and a way): a port that keys Hex states by cell and
// way passes check-g6 and check-g6-review, and fails here (the review's mutant 16).
//
//   node moonbit/encantis/core/oracle/check-g6-fuzz.cjs [test/g6.wasm] [--boards 1000] [--seed 1] [--controls]
'use strict';
const path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs'), C6 = require('./check-g6.cjs');
const { G } = R.js();
const args = process.argv.slice(2), opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const N = Number(opt('--boards', 1000)), SEED = Number(opt('--seed', 1)), CONTROLS = args.includes('--controls');
const WASM = args.find((a, i) => !a.startsWith('--') && !['--boards', '--seed'].includes(args[i - 1])) || path.join(__dirname, '../test/g6.wasm');
const wasms = [WASM].map(p => ({ p, x: W.load(p), bad: 0, first: null }));
const rnd = R.mulberry32(SEED), ri = n => Math.floor(rnd() * n), P = (q, r) => ({ q, r });
const HEX = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]], SQ = [[1, 0], [0, 1], [-1, 0], [0, -1]];
let n = 0, boards = 0, crossings = 0;
function inside(b, p) { return b.grid === 'hex' ? p.r >= 0 && p.r < b.H && p.q + (p.r >> 1) >= 0 && p.q + (p.r >> 1) < b.W : p.q >= 0 && p.r >= 0 && p.q < b.W && p.r < b.H; }
function cellsOf(b) { const out = []; for (let r = 0; r < b.H; r++) for (let c = 0; c < b.W; c++) out.push(b.grid === 'hex' ? P(c - (r >> 1), r) : P(c, r)); return out; }
for (let t = 0; t < N; t++) {
  const grid = t % 2 ? 'hex' : 'square', W_ = 4 + ri(6), H_ = 4 + ri(6), b = { grid, W: W_, H: H_, ropes: [], mirrors: [], springs: [], plan: [] };
  const cells = cellsOf(b), used = new Set(), k = p => p.q + ',' + p.r;
  for (const p of cells) if (rnd() < 0.3) { used.add(k(p)); b.mirrors.push(grid === 'hex' ? { cell: p, axis: ri(3) } : { cell: p, slope: rnd() < .5 ? '/' : '\\' }); }
  if (rnd() < 0.4) for (const p of cells) if (!used.has(k(p)) && rnd() < 0.05) { used.add(k(p)); b.springs.push(p); }
  const dirs = grid === 'hex' ? HEX : SQ;
  for (let tries = 0; tries < 60 && b.ropes.length < 8; tries++) {
    const s = cells[ri(cells.length)]; if (used.has(k(s))) continue;
    const path = [s], len = 2 + ri(2);
    while (path.length < len) { const d = dirs[ri(dirs.length)], q = P(path.at(-1).q + d[0], path.at(-1).r + d[1]); if (!inside(b, q) || used.has(k(q)) || path.some(x => k(x) === k(q))) break; path.push(q); }
    if (path.length < 2) continue;
    for (const p of path) used.add(k(p)); b.ropes.push(path);
  }
  if (b.ropes.length < 2) continue;
  boards++;
  let paths = b.ropes; const seq = [];
  for (let s = 0; s < 30; s++) { const legal = []; for (let i = 0; i < b.ropes.length; i++) if (paths[i] && G.tap(b, paths, i)) legal.push(i); if (!legal.length) break; const i = legal[ri(legal.length)]; seq.push(i); paths = G.tap(b, paths, i).paths; if (paths.every(p => !p)) break; }
  b.plan = seq;
  const c = { b, plan: seq }, steps = [['analyze', [seq.length]], ['analyze', [ri(seq.length + 1)]], ['featureStats', [ri(seq.length + 1)]], ['featuresUsed', []], ['slideStats', [ri(seq.length + 1)]], ['valid', []], ['trivial', []], ['casual', [3, 77 + t]]];
  for (const [kind, a] of steps) {
    let w; try { const before = R.draws(); w = JSON.parse(JSON.stringify(C6.SHAPE[kind](C6.JSCALL[kind](c, ...a), R.draws() - before))); } catch (e) { w = { throws: e.message }; }
    for (const m of wasms) {
      m.x.push(R.position(b, b.ropes, seq)); let got; const x = m.x.x;
      try {
        if (kind === 'analyze') got = { ret: x.t_analyze(a[0]), out: m.x.out() };
        else if (kind === 'featureStats') { const r = x.t_feature_stats(a[0]); got = { ret: r, out: m.x.out() }; }
        else if (kind === 'slideStats') { x.t_slide_stats(a[0]); got = { out: m.x.out() }; }
        else if (kind === 'casual') got = { ret: x.t_casual(a[0], a[1]), draws: x.draws() };
        else got = { ret: { featuresUsed: x.t_features_used, valid: x.t_valid, trivial: x.t_trivial }[kind]() };
      } catch (e) { got = { trap: e.message }; }
      if (CONTROLS && n === 3) w = { ...w, spoiled: 1 };
      const ok = w.throws ? !!got.trap : JSON.stringify(w) === JSON.stringify(got);
      if (!ok) { m.bad++; if (!m.first) m.first = `${grid} ${W_}x${H_} board #${t} ${kind} ${a}: want ${JSON.stringify(w).slice(0, 150)} got ${JSON.stringify(got).slice(0, 150)}`; }
    }
    n++;
  }
}
const m = wasms[0];
if (CONTROLS) { console.log(m.bad === 1 ? 'ok   control: the one spoiled value failed' : `FAIL control: ${m.bad} failures`); process.exit(m.bad === 1 ? 0 : 1); }
console.log(`${m.bad ? 'FAIL' : 'ok  '} fuzz (seed ${SEED}): ${boards} boards, ${n} comparisons, ${m.bad} differ${m.first ? '; first: ' + m.first : ''}`);
process.exit(m.bad ? 1 : 0);
