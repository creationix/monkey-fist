// Which candidate cell wins in the JS's addSpinners (tryCells): over the JS generator's own calls on
// spinner specs, the index of the first withSpinner board that fits in each batch of up to 16, and
// of the first searchSpinner board in each batch of up to 8. Mutants m10 (15 cells) and m11 (7 cells)
// differ from the JS only where index 15 or 7 wins.
const O = require('path').join(__dirname, '..');
const R = require(O + '/ref.cjs'), C = require(O + '/capture.cjs');
const { G } = R.js();
const specs = [];
for (let i = 0; i < 120; i++) { const s = G.spec({ kind: 'journey' }, i); if (s.springs) specs.push(s); }
for (const code of process.argv.slice(2)) { const o = G.parseCode(code); for (let i = 0; i < o.count; i++) specs.push(G.spec(o, i)); }
const hist = { withSpinner: {}, searchSpinner: {} }, sizes = { withSpinner: {}, searchSpinner: {} };
let batches = 0, t = Date.now();
for (const s of specs) {
  let recs;
  try { recs = C.record(['withSpinner', 'searchSpinner'], [s], { keep: () => true }); } catch (e) { continue; }
  // group consecutive calls of one name on one board (a batch of tryCells)
  let i = 0;
  while (i < recs.length) {
    const name = recs[i].name, key = JSON.stringify(recs[i].args[0]);
    let j = i; while (j < recs.length && recs[j].name === name && JSON.stringify(recs[j].args[0]) === key) j++;
    const batch = recs.slice(i, j), win = batch.findIndex(r => r.result);
    hist[name][win] = (hist[name][win] || 0) + 1; sizes[name][batch.length] = (sizes[name][batch.length] || 0) + 1; batches++;
    i = j;
  }
}
console.log(`${specs.length} specs, ${batches} batches (${((Date.now() - t) / 1000).toFixed(0)} s)`);
console.log('winning index (-1: none fits):', JSON.stringify(hist));
console.log('batch sizes:', JSON.stringify(sizes));
