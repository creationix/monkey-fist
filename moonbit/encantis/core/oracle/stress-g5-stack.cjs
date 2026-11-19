// G5's review: the port's stack on the largest boards, at the game's own budgets, with no JS (so it
// needs no cache; a few minutes at the default): on every board of at least 1,000 cells of the fixtures
// g1-extra, g5-review and g3-review (23 boards, 44x41 to 48x48, most with spinners), at random
// positions reached by the port's own taps (t_tap), the auto-solve guide(5000) with no preferred
// order, solve(4000) with the plan, features(10000) and frozen; it prints each board's peak and any
// trap. Before the review's fix of solve_full (4f7de81) 9 of the 23 boards trapped; after it none,
// worst 7.46 MB (44.5% of the 16 MiB stack).
//
//   node moonbit/encantis/core/oracle/stress-g5-stack.cjs [test/g5.wasm] [positions a board, default 30]
// Port only (no JS answers): it looks for traps and for how close the stack comes to its 16 MiB.
const O = __dirname + '/';
const fs = require('fs');
const R = require(O + 'ref.cjs'), W = require(O + 'wasm.cjs');
const port = W.load(process.argv[2] || O + '../test/g5.wasm');
const per = +(process.argv[3] || 30);
let allTraps = 0;
const boards = [];
for (const [set, f] of [['g1', 'g1-extra-boards.jsonl'], ['g5', 'g5-review-boards.jsonl'], ['g3', 'g3-review-boards.jsonl']])
  fs.readFileSync(O + 'fixtures/' + f, 'utf8').trim().split('\n').forEach((l, k) => { const j = JSON.parse(l); if (j.W * j.H >= 1000) boards.push({ ...R.jsBoard(j), name: `${set}#${k + 1} ${j.code}` }); });
const rng = R.mulberry32(0x5EED);
let worst = { peak: 0 };
const peaks = [];
for (const b of boards) {
  let bpeak = 0, traps = 0, where = '';
  for (let p = 0; p < per; p++) {
    let paths = b.ropes;
    const steps = Math.floor(rng() * b.ropes.length * 1.5);
    for (let s = 0; s < steps; s++) {
      const legal = [];
      for (let i = 0; i < paths.length; i++) if (paths[i]) legal.push(i);
      if (!legal.length) break;
      const i = legal[Math.floor(rng() * legal.length)];
      port.push(R.position(b, paths, []));
      if (!port.x.t_tap(i)) continue;
      const o = port.out(); let k = 3 + 2 * o[2];
      const n = o[k++]; const np = n ? Array.from({ length: n }, (_, j) => ({ q: o[k + 2 * j], r: o[k + 2 * j + 1] })) : null;
      paths = paths.slice(); paths[i] = np;
    }
    for (const [hook, arg, prefer] of [['t_guide', 5000, []], ['t_solve', 4000, b.plan], ['t_features', 10000, []], ['t_frozen', undefined, []]]) {
      port.push(R.position(b, paths, prefer));
      try { port.x[hook](arg); } catch (e) { traps++; where = `${hook} ${e.message}`; }
      const pk = port.x.stack_peak();
      if (pk > bpeak) { bpeak = pk; }
      if (pk > worst.peak) worst = { peak: pk, where: `${b.name} position ${p} (${steps} random taps) ${hook}`, out: port.out().slice(0, 2) };
    }
  }
  peaks.push(bpeak); allTraps += traps;
  console.log(`${b.name} ${b.grid} ${b.W}x${b.H} ropes ${b.ropes.length} springs ${b.springs.length}: peak ${bpeak}${traps ? ' TRAPS ' + traps + ' ' + where : ''}`);
}
console.log(`${allTraps ? 'FAIL' : 'ok  '} ${boards.length} boards, ${per} positions each, ${allTraps} traps; worst ${worst.peak} bytes (${(worst.peak / 16777216 * 100).toFixed(1)}% of the stack) at ${worst.where} -> ${JSON.stringify(worst.out)}`);
process.exit(allTraps ? 1 : 0);
