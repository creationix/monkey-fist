// G5's review: the full-geometry solve and guide at the budgets the other oracles never pass (0, -5,
// 1, 2, 3, 7 and 25), with the plan and with no preferred order, against the JS live (M.solve /
// HM.solve, G.guide): the edges of solve_full's reserve (one key; the one position past the budget)
// after the review's fix. At the start, every plan prefix and 6 positions of random play of the 133
// reference boards of at most 60 ropes: 103,992 comparisons, about 30 s.
//
//   node moonbit/encantis/core/oracle/check-g5-budgets.cjs [test/g5.wasm]
const O = __dirname + '/';
const R = require(O + 'ref.cjs'), W = require(O + 'wasm.cjs'), C5 = require(O + 'check-g5.cjs');
const port = W.load(process.argv[2] || O + '../test/g5.wasm');
let n = 0, bad = 0;
for (const b of R.boards().filter(b => b.ropes.length <= 60)) {
  for (const p of R.positions(b, 6)) {
    const plan = p.from.startsWith('random') ? b.plan : b.plan.slice(p.taps.length);
    for (const budget of [0, -5, 1, 2, 3, 7, 25]) for (const prefer of [plan, []]) {
      const c = { b: { ...b, plan: [] }, paths: p.paths, plan: prefer };
      for (const kind of ['solvefull', 'guide']) {
        const want = C5.WANT[kind](c, budget).out;
        port.push(R.position(b, p.paths, prefer));
        C5.CALL[kind](port.x, budget);
        const got = port.out();
        n++;
        if (JSON.stringify(want) !== JSON.stringify(got)) { bad++; if (bad < 5) console.log('DIFF', b.name, p.from, kind, budget, JSON.stringify(want).slice(0, 80), JSON.stringify(got).slice(0, 80)); }
      }
    }
  }
}
console.log(`${bad ? 'FAIL' : 'ok  '} small budgets: ${n} comparisons, ${bad} failed`);
process.exit(bad ? 1 : 0);
