// Times G2's square kernels against MoonBit's wasm-gc build (dist/mf.wasm) and the JS,
// on the two square bench boards of bench-node.mjs without spinners, L107 and L118:
//
//   casual x1000   bench_casual(1000): sq_casual_wins on the start, mulberry32(hashString('bench'))
//   par            bench_par: sq_postpone_exits of the plan, then sq_fewest_player_taps(2500)
//   solve 2000     bench_solve(2000): sq_solve from the start with no preferred order (nodes)
//
//   node moonbit/encantis/core/oracle/bench-g2.cjs [test/g2.wasm] [--rounds 5]   one process, one JSON line
//   node moonbit/encantis/core/oracle/bench-g2.cjs --summary <file.jsonl>        median and range over processes
//
// One process: MoonBit generates each level (generate(index) of J3-MONKEYFIST, which makes
// it its current level); the port is given the same board as position words, its plan in
// the place of the preferred order, before each timed call (t_casual, t_par, t_bench_solve
// read them, so the port's time includes reading the position: a few microseconds). Each
// round runs every kernel on the port, then on MoonBit, then on the JS, interleaved, with
// the clock round the call alone; the result of each call is checked to agree. The best
// and the median of the rounds are reported per kernel.
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const median = xs => { const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

if (args.includes('--summary')) {
  const rows = fs.readFileSync(opt('--summary'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const fmt = xs => `${median(xs).toFixed(3)} (${Math.min(...xs).toFixed(3)} to ${Math.max(...xs).toFixed(3)})`;
  console.log(`${rows.length} processes; ms, best of ${rows[0].rounds} rounds in each: median (range) over processes`);
  for (const key of Object.keys(rows[0].kernels)) {
    const k = rows.map(r => r.kernels[key]);
    const port = k.map(x => x.port.best), mbt = k.map(x => x.moonbit.best), js = k.map(x => x.js.best);
    console.log(`  ${key.padEnd(22)} port ${fmt(port)}   MoonBit wasm-gc ${fmt(mbt)}   JS ${fmt(js)}   MoonBit/port ${(median(mbt) / median(port)).toFixed(2)}x, JS/port ${(median(js) / median(port)).toFixed(2)}x`);
  }
  process.exit(0);
}

const WASM = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--rounds') || path.join(__dirname, '../test/g2.wasm');
const rounds = Number(opt('--rounds', 5));
const repo = path.resolve(__dirname, '../../../..');
const { L } = R.js();
const port = W.load(WASM);
const mbt = W.load(path.join(repo, 'moonbit/dist/mf.wasm'));
const seed = L.hashString('bench');

const boards = R.boards().filter(b => ['L107', 'L118'].includes(b.name));
const kernels = {};
for (const b of boards) {
  const index = Number(b.name.slice(1)) - 1;
  mbt.pushText('J3-MONKEYFIST');
  if (!mbt.x.generate(index)) throw Error(`MoonBit made no level ${b.name}`);
  const words = R.position(b, b.ropes, b.plan);
  const xy = b.ropes.map(p => p.map(c => ({ x: c.q, y: c.r }))), mirrors = new Map(b.mirrors.map(m => [m.cell.r * b.W + m.cell.q, m.slope]));
  const js = {
    casual: () => L.casualWins(xy, b.W, b.H, R.mulberry32(seed), 1000, mirrors),
    par: () => { const s = L.postponeExits(xy, b.W, b.H, b.plan, mirrors); return L.fewestPlayerTaps(xy, b.W, b.H, s ? s.taps : b.plan, 2500, mirrors).count; },
    solve: () => L.solve(xy, b.W, b.H, 2000, [], mirrors).nodes,
  };
  const ours = {
    casual: () => port.x.t_casual(1000, seed | 0),
    par: () => port.x.t_par(),
    solve: () => port.x.t_bench_solve(2000),
  };
  const theirs = { casual: () => mbt.x.bench_casual(1000), par: () => mbt.x.bench_par(), solve: () => mbt.x.bench_solve(2000) };
  for (const [k, label] of [['casual', 'casual x1000'], ['par', 'par'], ['solve', 'solve 2000']]) {
    kernels[`${b.name} ${label}`] = { b: b.name, k, words, port: ours[k], moonbit: theirs[k], js: js[k], times: { port: [], moonbit: [], js: [] }, values: null };
  }
}

const time = f => { const t = performance.now(); const v = f(); return [performance.now() - t, v]; };
// MoonBit's current level is the last one generated: generate again before its board's kernels.
let current = null;
const use = name => { if (current === name) return; mbt.pushText('J3-MONKEYFIST'); mbt.x.generate(Number(name.slice(1)) - 1); current = name; };
for (let r = 0; r < rounds + 1; r++) {   // round 0 warms up and is not counted
  for (const k of Object.values(kernels)) {
    port.push(k.words);
    const [tp, vp] = time(k.port);
    use(k.b);
    const [tm, vm] = time(k.moonbit);
    const [tj, vj] = time(k.js);
    const values = [vp, vm, vj];
    if (!values.every(v => Object.is(v, values[0]))) throw Error(`${k.b} ${k.k}: the port, MoonBit and the JS disagree: ${values}`);
    k.values = values[0];
    if (r > 0) { k.times.port.push(tp); k.times.moonbit.push(tm); k.times.js.push(tj); }
  }
}
const out = { wasm: path.relative(process.cwd(), WASM), rounds, node: process.version, kernels: {} };
for (const [name, k] of Object.entries(kernels)) {
  out.kernels[name] = { value: k.values };
  for (const side of ['port', 'moonbit', 'js']) out.kernels[name][side] = { best: Math.min(...k.times[side]), median: median(k.times[side]) };
}
console.log(JSON.stringify(out));
