// G6's review: casual play's step limit (ropes * 6 + 20 taps, then a loss), which no casual game on the
// reference and fixture spinner boards reaches (5,696 games at 32 a board: 2,952 won, 2,744 ended with no
// legal tap, 0 at the limit), so no other oracle sees the bound. Six synthetic spinner boards, both grids,
// where a rope is shut between two springs and bounces for ever: F.casualRate against the port's
// t_casual (the rate and the draws, which count the taps of every game to the limit), at 1, 5 and 32
// games and three seeds; and the other G6 units on random tap sequences of these boards (ropes on
// spring cells, plans that never clear). A second or so.
//
// Then the stack at the worst board a 48x48 grid allows for the plan loops, which keep each step's
// position in the call's scope: 1,152 two-cell ropes (rows of dominoes heading right, the plan from the
// right end of each row), square and Hex, without and with a spinner. valid, trivial, featuresUsed,
// featureStats (manual all), slideStats (par all) and Q.analyze (manual all) against the JS (about 4 s
// of JS), and the port's peak for each (analyze 14.2 MB of the 16 MiB: n x n relation bytes, two k x k
// component tables and a position a step; the generator calls analyze only below colossal, 24x24 at
// most, where it is under 1 MB).
//
//   node moonbit/encantis/core/oracle/check-g6-limits.cjs [test/g6.wasm] [--controls]
'use strict';
const path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs');
const C6 = require('./check-g6.cjs');
const args = process.argv.slice(2), CONTROLS = args.includes('--controls');
const WASM = args.find(a => !a.startsWith('--')) || path.join(__dirname, '../test/g6.wasm');
const { G, F, L } = R.js();
const port = W.load(WASM);
const P = (q, r) => ({ q, r });
const sq = (W_, H_, ropes, springs, mirrors = []) => ({ grid: 'square', W: W_, H: H_, ropes, springs, mirrors, plan: [] });
const hx = (W_, H_, ropes, springs, mirrors = []) => ({ grid: 'hex', W: W_, H: H_, ropes, springs, mirrors, plan: [] });
const boards = {
  'square, one bouncer, one free': sq(7, 3, [[P(2, 0), P(3, 0)], [P(0, 2), P(1, 2)]], [P(0, 0), P(6, 0)]),
  'square, two bouncers': sq(8, 3, [[P(2, 0), P(3, 0)], [P(3, 2), P(4, 2)]], [P(0, 0), P(7, 0), P(0, 2), P(7, 2)]),
  'square, two bouncers, two free': sq(9, 5, [[P(2, 0), P(3, 0)], [P(3, 2), P(4, 2)], [P(1, 4), P(2, 4)], [P(8, 3), P(8, 4)]], [P(0, 0), P(8, 0), P(0, 2), P(8, 2)]),
  'square, long bouncer': sq(10, 2, [[P(2, 0), P(3, 0), P(4, 0)], [P(0, 1), P(1, 1)]], [P(0, 0), P(9, 0)]),
  'hex, one bouncer, one free': hx(8, 3, [[P(2, 0), P(3, 0)], [P(-1, 2), P(0, 2)]], [P(0, 0), P(7, 0)]),
  'hex, two bouncers': hx(9, 3, [[P(2, 0), P(3, 0)], [P(1, 2), P(2, 2)]], [P(0, 0), P(8, 0), P(-1, 2), P(7, 2)]),
};
let n = 0, bad = 0, limitGames = 0;
const same = (what, want, got) => { n++; if (CONTROLS && n === 3) want = [...[].concat(want), 'spoiled']; if (JSON.stringify(want) !== JSON.stringify(got)) { bad++; console.log('DIFF', what, '\n  want', JSON.stringify(want).slice(0, 200), '\n  got ', JSON.stringify(got).slice(0, 200)); } };
for (const [name, b] of Object.entries(boards)) {
  // the JS's own replay of casual games, counting the limit
  for (const games of [1, 5, 32]) for (const seed of [1, 2, 3]) {
    const before = R.draws(), w = F.casualRate(b, G, R.mulberry32(seed), games), draws = R.draws() - before;
    port.push(R.position(b, b.ropes, []));
    const v = port.x.t_casual(games, seed), d = port.x.draws();
    same(`${name} casual x${games} seed ${seed}`, [w, draws], [v, d]);
    if (games === 32 && seed === 1) { const limit = b.ropes.length * 6 + 20; console.log(`${name}: casual x32 = ${w}, ${draws} draws (limit ${limit} taps a game)`); if (draws >= limit) limitGames++; }
  }
  // random tap sequences: analyze, featureStats, slideStats, featuresUsed, postpone, score skip
  for (const seed of [1, 2, 3, 4]) {
    const rng = R.mulberry32(seed); let paths = b.ropes; const seq = [];
    for (let k = 0; k < 40; k++) {
      const legal = []; for (let i = 0; i < b.ropes.length; i++) if (paths[i] && G.tap(b, paths, i)) legal.push(i);
      if (!legal.length) break; const i = legal[Math.floor(rng() * legal.length)]; seq.push(i); paths = G.tap(b, paths, i).paths; if (paths.every(p => !p)) break;
    }
    const c = { b: { ...b, plan: seq }, plan: seq };
    for (const [kind, a] of [['analyze', [seq.length]], ['analyze', [7]], ['featureStats', [5]], ['slideStats', [3]], ['featuresUsed', []], ['postpone', []], ['score', [true]], ['valid', []], ['trivial', []]]) {
      const w = JSON.parse(JSON.stringify(C6.SHAPE[kind](C6.JSCALL[kind](c, ...a), 0)));
      port.push(R.position(b, b.ropes, seq));
      const x = port.x; let got;
      if (kind === 'analyze') got = { ret: x.t_analyze(a[0]), out: port.out() };
      else if (kind === 'featureStats') { const r = x.t_feature_stats(a[0]); got = { ret: r, out: port.out() }; }
      else if (kind === 'slideStats') { x.t_slide_stats(a[0]); got = { out: port.out() }; }
      else if (kind === 'postpone') { x.t_postpone(); got = { out: port.out() }; }
      else if (kind === 'score') { x.t_score(1); const o = port.out(); got = { out: [o[0], o[1], ...o.slice(3)] }; }
      else got = { ret: { featuresUsed: x.t_features_used, valid: x.t_valid, trivial: x.t_trivial }[kind]() };
      same(`${name} seq ${seed} ${kind} ${a}`, w, got);
    }
  }
}
// The domino boards.
const P2 = (q, r) => ({ q, r });
function dominoes(grid, spring) {
  const ropes = [], plan = [];
  for (let r = 0; r < 48; r++) {
    const off = grid === 'hex' ? -(r >> 1) : 0, row = [];
    for (let k = 0; k < 24; k++) { if (spring && r === 47 && k === 23) continue; row.push(ropes.length); ropes.push([P2(off + 2 * k, r), P2(off + 2 * k + 1, r)]); }
    plan.push(...row.reverse());
  }
  return { grid, W: 48, H: 48, ropes, mirrors: [], springs: spring ? [P2((grid === 'hex' ? -(47 >> 1) : 0) + 47, 47)] : [], plan };
}
let worst = { bytes: 0, where: '' };
for (const [grid, spring] of [['square', false], ['hex', false], ['square', true], ['hex', true]]) {
  const b = dominoes(grid, spring), c = { b, plan: b.plan }, all = b.plan.length, name = `${grid} 48x48 dominoes${spring ? ' + spring' : ''}`;
  for (const [kind, a, hook] of [['valid', [], x => ({ ret: x.t_valid() })], ['trivial', [], x => ({ ret: x.t_trivial() })], ['featuresUsed', [], x => ({ ret: x.t_features_used() })],
    ['featureStats', [all], x => ({ ret: x.t_feature_stats(all), out: port.out() })], ['slideStats', [all], x => { x.t_slide_stats(all); return { out: port.out() }; }],
    ['analyze', [all], x => ({ ret: x.t_analyze(all), out: port.out() })]]) {
    const w = JSON.parse(JSON.stringify(C6.SHAPE[kind](C6.JSCALL[kind](c, ...a), 0)));
    port.push(R.position(b, b.ropes, b.plan));
    let got; try { got = hook(port.x); } catch (e) { got = { trap: e.message }; }
    same(`${name} ${kind}`, w, got);
    const p = port.x.stack_peak(); if (p > worst.bytes) worst = { bytes: p, where: `${name} ${kind}` };
  }
}
console.log(`domino boards: the port's stack peak ${(worst.bytes / 1048576).toFixed(2)} MB of 16 MiB (${worst.where})`);
if (CONTROLS) { console.log(bad === 1 ? 'ok   control: the one spoiled value failed' : `FAIL control: ${bad} failures`); process.exit(bad === 1 ? 0 : 1); }
console.log(`${bad ? 'FAIL' : 'ok  '} limit boards: ${n} comparisons, ${bad} differ; boards whose x32 games ran to the limit: ${limitGames} of ${Object.keys(boards).length}`);
process.exit(bad || limitGames !== Object.keys(boards).length ? 1 : 0);
