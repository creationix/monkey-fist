// G3's review: times the Hex kernels on the largest boards a code gives (48x48 colossal Hex, up
// to 224 ropes), where bench-g3.cjs's L114 and L116 (13 and 21 ropes) leave solve at a few
// dozen nodes. Port (test/g3.wasm) against MoonBit's wasm-gc build (dist/mf.wasm) and the JS.
//
//   node moonbit/encantis/core/oracle/bench-g3-big.cjs [test/g3.wasm] [--rounds 3]   one process, one JSON line
//   node moonbit/encantis/core/oracle/bench-g3.cjs --summary <file.jsonl>             median and range over processes
//
// Boards: the 48x48 Hex levels of fixtures/g3-review-boards.jsonl whose par search runs out of
// budget (difficulty 50 and 100, with and without mirrors), each made MoonBit's current level
// by generate(index) of its code (the same level as the JS's, checked through par).
//   par          bench_par: postponeExits of the plan, then fewestPlayerTaps(2500) (2,501 nodes)
//   solve 5000   bench_solve(5000): solve from the start with no preferred order, at the
//                auto-solve budget (5,001 nodes where it runs out)
//   casual x100  bench_casual(100) (the generator skips casual play on colossal boards; this is
//                the kernel at its largest)
// Each round runs every kernel on the port, then MoonBit, then the JS, the clock round the call
// alone, and checks the three agree (bench-g3.cjs's shape; its --summary reads these lines).
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const median = xs => { const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const WASM = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--rounds') || path.join(__dirname, '../test/g3.wasm');
const rounds = Number(opt('--rounds', 3));
const repo = path.resolve(__dirname, '../../../..');
const { L, H } = R.js();
const port = W.load(WASM);
const mbt = W.load(path.join(repo, 'moonbit/dist/mf.wasm'));
const seed = L.hashString('bench');

const CODES = ['U3-H-100-100-48-48-1-C-HIGH', 'U3-H-100-100-48-48-1-MC-HIGHM', 'U3-H-50-50-48-48-1-MC-MID'];
const rows = fs.readFileSync(path.join(__dirname, 'fixtures/g3-review-boards.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const kernels = {};
for (const code of CODES) {
  const row = rows.find(r => r.code === code);
  if (!row) throw Error(`no board of ${code} in the fixture`);
  const b = R.jsBoard(row), name = `${code.split('-').pop()} (${b.ropes.length} ropes)`;
  const words = R.position(b, b.ropes, b.plan);
  const level = { W: b.W, H: b.H, ropes: b.ropes, mirrors: b.mirrors };
  const js = {
    par: () => { const p = H.postponeExits(level, b.plan); return H.fewestPlayerTaps(level, p ? p.plan : b.plan, 2500).par; },
    solve: () => H.solve(level, b.ropes, 5000, []).nodes,
    casual: () => H.casualWins(level, R.mulberry32(seed), 100),
  };
  const ours = { par: () => port.x.t_par(), solve: () => port.x.t_bench_solve(5000), casual: () => port.x.t_bench_casual(100) };
  const theirs = { par: () => mbt.x.bench_par(), solve: () => mbt.x.bench_solve(5000), casual: () => mbt.x.bench_casual(100) };
  for (const [k, label] of [['par', 'par'], ['solve', 'solve 5000'], ['casual', 'casual x100']])
    kernels[`${name} ${label}`] = { code, index: row.index, k, words, port: ours[k], moonbit: theirs[k], js: js[k], times: { port: [], moonbit: [], js: [] }, values: null };
}

const time = f => { const t = performance.now(); const v = f(); return [performance.now() - t, v]; };
let current = null;
const use = k => { if (current === k.code) return; mbt.pushText(k.code); if (!mbt.x.generate(k.index)) throw Error(`MoonBit made no level ${k.code}`); current = k.code; };
for (let r = 0; r < rounds + 1; r++) {   // round 0 warms up and is not counted
  for (const k of Object.values(kernels)) {
    port.push(k.words);
    const [tp, vp] = time(k.port);
    use(k);
    const [tm, vm] = time(k.moonbit);
    const [tj, vj] = time(k.js);
    const values = [vp, vm, vj];
    if (!values.every(v => Object.is(v, values[0]))) throw Error(`${k.code} ${k.k}: the port, MoonBit and the JS disagree: ${values}`);
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
