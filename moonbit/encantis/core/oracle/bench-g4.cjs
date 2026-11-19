// Times G4's Hex woven builder (hex_build) against MoonBit's wasm-gc build and the JS
// (H.build of hex/engine.js at 9e69e3a), on the cfgs of fixtures/hexbuild-expected.json: the
// calls the real generator made, each from its recorded state.
//
//   node moonbit/encantis/core/oracle/bench-g4.cjs [test/g4.wasm] [--mbt hbench.wasm] [--rounds 5]
//        one process, one JSON line
//   node moonbit/encantis/core/oracle/bench-g4.cjs --summary <file.jsonl>   median and range over processes
//
// MoonBit's hex_build is not exported by dist/*.wasm. The control is a scratch MoonBit package
// (/home/user/mf-core-scratch/g4/mbt: src/core of the repository unchanged, plus src/hbench,
// whose t_bench(state, coverage, tapDepth, reps) reads the same cfg words as test/g4.ents and
// calls @core.hex_build), built with `moon build --target wasm-gc --release`. Its source is
// oracle/hbench/ (hbench.mbt, moon.pkg); to make the package again:
//   mkdir -p S/src && cp moonbit/moon.mod S/ && cp -r moonbit/src/core S/src/ && cp -r oracle/hbench S/src/
//   (cd S && moon build --target wasm-gc --release)   then --mbt S/_build/wasm-gc/release/build/hbench/hbench.wasm
//
// The cases are grouped by board size (cells: up to 100, 101 to 300, 301 to 600, over 600,
// and all). Each round runs every case once on the port, then MoonBit, then the JS,
// interleaved, with the clock round the call alone (the cfg's words are pushed before it; the
// port's and MoonBit's t_bench then read them, a few microseconds); a group's time is the sum
// over its cases. Each call's value (ropes plus plan length) is checked to agree. Round 0 warms
// up and is not counted. The best and the median of the rounds are reported per group.
// By default the port runs as the core does (drawing less than the JS where that cannot change
// what it builds, so its boards differ and only MoonBit's value is checked against the JS's);
// --exact puts it in its draw-exact mode, where its values must agree as well.
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs');
const D = require('./dump-hexbuild.cjs');
const { cfgWords } = require('./check-hexbuild.cjs');

const args = process.argv.slice(2);
const VALUED = ['--rounds', '--mbt', '--summary'];
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const median = xs => { const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

if (args.includes('--summary')) {
  const rows = fs.readFileSync(opt('--summary'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const fmt = xs => `${median(xs).toFixed(1)} (${Math.min(...xs).toFixed(1)} to ${Math.max(...xs).toFixed(1)})`;
  console.log(`${rows.length} processes; ms, best of ${rows[0].rounds} rounds in each: median (range) over processes`);
  for (const key of Object.keys(rows[0].groups)) {
    const g = rows.map(r => r.groups[key]);
    const port = g.map(x => x.port.best), mbt = g.map(x => x.moonbit.best), js = g.map(x => x.js.best);
    console.log(`  ${key.padEnd(24)} port ${fmt(port)}   MoonBit wasm-gc ${fmt(mbt)}   JS ${fmt(js)}   MoonBit/port ${(median(mbt) / median(port)).toFixed(2)}x, JS/port ${(median(js) / median(port)).toFixed(2)}x`);
  }
  process.exit(0);
}

const WASM = args.find((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1])) || path.join(__dirname, '../test/g4.wasm');
const MBT = opt('--mbt', '/home/user/mf-core-scratch/g4/mbt/_build/wasm-gc/release/build/hbench/hbench.wasm');
const rounds = Number(opt('--rounds', 5));
const { H } = R.js();
const port = W.load(WASM);
const mbt = W.load(MBT);
const EXACT = args.includes('--exact');   // the port in its draw-exact mode: its values must agree too
if (port.x.t_draw_exact) port.x.t_draw_exact(EXACT ? 1 : 0);

const cases = D.read().cases.map(c => ({ c, words: cfgWords(c.cfg), args: D.argsOf(c)[1] }));
const groups = {
  'up to 100 cells': x => x.c.cfg.W * x.c.cfg.H <= 100,
  '101 to 300 cells': x => { const a = x.c.cfg.W * x.c.cfg.H; return a > 100 && a <= 300; },
  '301 to 600 cells': x => { const a = x.c.cfg.W * x.c.cfg.H; return a > 300 && a <= 600; },
  'over 600 cells': x => x.c.cfg.W * x.c.cfg.H > 600,
  'all': () => true,
};
const time = f => { const t = performance.now(); const v = f(); return [performance.now() - t, v]; };
const sides = ['port', 'moonbit', 'js'];
const totals = cases.map(() => ({ port: [], moonbit: [], js: [] }));
for (let r = 0; r < rounds + 1; r++) {
  cases.forEach((x, k) => {
    const { c } = x;
    port.push(x.words);
    const [tp, vp] = time(() => port.x.t_bench(c.state | 0, c.cfg.coverage, c.cfg.tapDepth, 1));
    mbt.push(x.words);
    const [tm, vm] = time(() => mbt.x.t_bench(c.state | 0, c.cfg.coverage, c.cfg.tapDepth, 1));
    const [tj, vj] = time(() => { const b = H.build(R.mulberry32(c.state), x.args); return b ? b.ropes.length + b.plan.length : 0; });
    if (vm !== vj || (EXACT && vp !== vj) || !vp) throw Error(`case ${c.id}: the port, MoonBit and the JS disagree: ${vp} ${vm} ${vj}`);
    if (r > 0) { totals[k].port.push(tp); totals[k].moonbit.push(tm); totals[k].js.push(tj); }
  });
}
const out = { wasm: path.relative(process.cwd(), WASM), exact: EXACT, rounds, node: process.version, groups: {} };
for (const [name, f] of Object.entries(groups)) {
  const ks = cases.map((x, k) => f(x) ? k : -1).filter(k => k >= 0);
  out.groups[`${name} (${ks.length})`] = Object.fromEntries(sides.map(s => {
    const perRound = Array.from({ length: rounds }, (_, r) => ks.reduce((sum, k) => sum + totals[k][s][r], 0));
    return [s, { best: Math.min(...perRound), median: median(perRound) }];
  }));
}
console.log(JSON.stringify(out));
