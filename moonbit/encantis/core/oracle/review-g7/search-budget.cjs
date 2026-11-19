// searchSpinner's budget: round(12000 / ropes) nodes. Over the JS generator's own searchSpinner
// calls, how many nodes the solve used, against the budget; m14 (11000) differs only where a solve
// that succeeds needs more than round(11000 / ropes), or one that ran out would ... not change.
const O = require('path').join(__dirname, '..');
const R = require(O + '/ref.cjs'), C = require(O + '/capture.cjs');
const { G } = R.js();
const specs = [];
for (let i = 0; i < 120; i++) { const s = G.spec({ kind: 'journey' }, i); if (s.springs) specs.push(s); }
for (const code of process.argv.slice(2)) { const o = G.parseCode(code); for (let i = 0; i < o.count; i++) specs.push(G.spec(o, i)); }
let calls = 0, solved = 0, outOfBudget = 0, between = 0, maxShare = 0;
for (const s of specs) {
  let recs;
  try { recs = C.record(['G.solve'], [s]); } catch (e) { continue; }
  for (const r of recs) {
    const b = r.args[0], budget = r.args[2], n = b.ropes.length;
    if (!b.springs || !b.springs.length || budget !== Math.round(12000 / n) || !r.args[3]) continue;   // searchSpinner's calls only
    calls++;
    const res = r.result;
    if (res.solved === true) { solved++; if (res.nodes > Math.round(11000 / n)) between++; maxShare = Math.max(maxShare, res.nodes / budget); }
    else if (res.solved === null) outOfBudget++;
  }
}
console.log(`searchSpinner solves: ${calls}; solved ${solved} (most nodes used ${(100 * maxShare).toFixed(1)}% of the budget; ${between} needed more than round(11000 / ropes)); ran out ${outOfBudget}`);
