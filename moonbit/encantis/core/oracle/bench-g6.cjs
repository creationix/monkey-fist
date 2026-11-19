// Times G6 against MoonBit's wasm-gc build and the JS: the kernel stage of moonbit/scripts/bench-node.mjs
// on its 8 bench boards (L30, L60, L89, L120: square with spinners, so casual play is the
// full-geometry playout; L107, L118: square, and L114, L116: Hex, on the offset kernels):
//
//   casual x100, x1000   bench_casual(games) of src/api: casualRate(b, G, mulberry32(hashString('bench')),
//                        games). Port: t_bench_casual(games) (the board's tables made from its words,
//                        then the games); MoonBit: dist/mf.wasm's bench_casual on its current level;
//                        JS: F.casualRate. The JS is not run at x1000 on the spinner boards (8 s a call
//                        on L120): bench-node.mjs itself plays 100 games there. On the spinner boards a JS
//                        call is timed once a round (0.2 to 0.9 s each), the wasm calls 40 times.
//   par                  bench_par: F.score(b, G, false).par (the fewest-taps search; on spinner boards
//                        the postponement, then minimumTaps where there are at most 12 ropes).
//
//   node moonbit/encantis/core/oracle/bench-g6.cjs [test/g6.wasm] [--rounds 5]   one process, one JSON line
//   node moonbit/encantis/core/oracle/bench-g6.cjs --summary <file.jsonl>        median and range over processes
//
// Each round runs every kernel on the port, then on MoonBit, then on the JS, with the clock round the
// calls alone (a call is repeated within its timing to last a few milliseconds; the time given is per
// call); the values are checked to agree. Round 0 warms up and is not counted. (bench-g5.cjs's shape.)
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const median = xs => { const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

if (args.includes('--summary')) {
  const rows = fs.readFileSync(opt('--summary'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const fmt = xs => xs.length ? `${median(xs).toFixed(3)} (${Math.min(...xs).toFixed(3)} to ${Math.max(...xs).toFixed(3)})` : 'n/a';
  console.log(`${rows.length} processes; ms, best of ${rows[0].rounds} rounds in each: median (range) over processes`);
  for (const key of Object.keys(rows[0].kernels)) {
    const k = rows.map(r => r.kernels[key]);
    const port = k.map(x => x.port.best), mbt = k.map(x => x.moonbit.best), js = k.filter(x => x.js).map(x => x.js.best);
    console.log(`  ${key.padEnd(20)} port ${fmt(port)}   MoonBit wasm-gc ${fmt(mbt)}   JS ${fmt(js)}   MoonBit/port ${(median(mbt) / median(port)).toFixed(2)}x` + (js.length ? `, JS/port ${(median(js) / median(port)).toFixed(1)}x` : ''));
  }
  process.exit(0);
}

const WASM = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--rounds') || path.join(__dirname, '../test/g6.wasm');
const rounds = Number(opt('--rounds', 5));
const repo = path.resolve(__dirname, '../../../..');
const { G, F, L } = R.js();
const port = W.load(WASM);
const mf = W.load(path.join(repo, 'moonbit/dist/mf.wasm'));

const kernels = {};
const BENCH = ['L30', 'L60', 'L89', 'L120', 'L107', 'L118', 'L114', 'L116'];
for (const name of BENCH) {
  const b = R.boards().find(x => x.name === name), words = R.position(b, b.ropes, b.plan), springs = b.springs.length > 0;
  const add = (label, reps, p, mb, js, jsReps = reps) => { kernels[`${name} ${label}`] = { b: name, reps, jsReps, before: () => port.push(words), port: p, moonbit: mb, js, times: { port: [], moonbit: [], js: [] } }; };
  const repeat = (reps, f) => () => { let v; for (let i = 0; i < reps; i++) v = f(); return v; };
  for (const games of [100, 1000]) {
    const reps = Math.max(1, Math.round((springs ? 40 : 4) * 100 / games));
    const jsReps = springs ? 1 : reps, js = springs && games === 1000 ? null : repeat(jsReps, () => F.casualRate(b, G, L.mulberry32(L.hashString('bench')), games));
    add(`casual x${games}`, reps, repeat(reps, () => port.x.t_bench_casual(games)), repeat(reps, () => mf.x.bench_casual(games)), js, jsReps);
  }
  const reps = springs ? 20 : 4;
  add('par', reps, repeat(reps, () => port.x.t_bench_par()), repeat(reps, () => mf.x.bench_par()), repeat(reps, () => F.score(b, G, false).par));
}

const time = f => { const t = performance.now(); const v = f(); return [performance.now() - t, v]; };
// MoonBit's current level is the last one generated: generate again before its board's kernels.
let current = null;
const use = name => { if (current === name) return; mf.pushText('J3-MONKEYFIST'); if (!mf.x.generate(Number(name.slice(1)) - 1)) throw Error('no level ' + name); current = name; };
for (let r = 0; r < rounds + 1; r++) {
  for (const [name, k] of Object.entries(kernels)) {
    k.before();
    const [tp, vp] = time(k.port);
    use(k.b);
    const [tm, vm] = time(k.moonbit);
    const [tj, vj] = k.js ? time(k.js) : [0, vp];
    const values = [vp, vm, vj];
    if (!values.every(v => Object.is(v, values[0]))) throw Error(`${name}: the port, MoonBit and the JS disagree: ${values}`);
    k.value = vp;
    if (r > 0) { k.times.port.push(tp / k.reps); k.times.moonbit.push(tm / k.reps); if (k.js) k.times.js.push(tj / k.jsReps); }
  }
}
const out = { wasm: path.relative(process.cwd(), WASM), rounds, node: process.version, kernels: {} };
for (const [name, k] of Object.entries(kernels)) {
  out.kernels[name] = { value: k.value };
  for (const side of ['port', 'moonbit', 'js']) if (k.times[side].length) out.kernels[name][side] = { best: Math.min(...k.times[side]), median: median(k.times[side]) };
}
console.log(JSON.stringify(out));
