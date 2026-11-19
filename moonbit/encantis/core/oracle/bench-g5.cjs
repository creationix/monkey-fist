// Times G5 against MoonBit's wasm-gc builds and the JS:
//
//   solve 2000   bench_solve(2000) of src/api on the four bench boards with springs (L30, L60,
//                L89, L120: square, so the full-geometry search): the board's tables, then the
//                search from the start with no preferred order (nodes). Port: t_bench_solve(2000),
//                which also reads the position words; MoonBit: dist/mf.wasm's bench_solve on its
//                current level; JS: G.solve(b, b.ropes, 2000, []).
//   assist       the 2,084 checks of moonbit/tests/assist.test.cjs (521 positions on 20 boards:
//                guide at the two budgets and reachableFeatures at the two budgets of each), each
//                through the game's own glue (web/generator.js's wrap, which writes the position
//                words and reads the answer): the port's test/g5.wasm against MoonBit's
//                dist/gen.wasm, and the JS (G.guide, G.reachableFeatures). One pass is all 2,084.
//
//   node moonbit/encantis/core/oracle/bench-g5.cjs [test/g5.wasm] [--rounds 5]   one process, one JSON line
//   node moonbit/encantis/core/oracle/bench-g5.cjs --summary <file.jsonl>        median and range over processes
//
// Each round runs every kernel on the port, then on MoonBit, then on the JS, interleaved, with the
// clock round the calls alone (a solve is repeated within its timing to last a few milliseconds,
// and the time given is per call); the results are checked to agree, and the assist answers to
// equal assist-expected.json's. Round 0 warms up and is not counted. (bench-g3.cjs's shape.)
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
    console.log(`  ${key.padEnd(16)} port ${fmt(port)}   MoonBit wasm-gc ${fmt(mbt)}   JS ${fmt(js)}   MoonBit/port ${(median(mbt) / median(port)).toFixed(2)}x, JS/port ${(median(js) / median(port)).toFixed(2)}x`);
  }
  process.exit(0);
}

const WASM = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--rounds') || path.join(__dirname, '../test/g5.wasm');
const rounds = Number(opt('--rounds', 5));
const repo = path.resolve(__dirname, '../../../..');
const { G } = R.js();
const port = W.load(WASM);
const mf = W.load(path.join(repo, 'moonbit/dist/mf.wasm'));
const MF = require(path.join(repo, 'moonbit/web/generator.js'));
const portGen = MF.wrap(port.x, 'port'), mbtGen = MF.wrap(W.load(path.join(repo, 'moonbit/dist/gen.wasm')).x, 'wasm-gc');

const kernels = {};
// --- solve 2000 on the four spring boards ---
for (const name of ['L30', 'L60', 'L89', 'L120']) {
  const b = R.boards().find(x => x.name === name), words = R.position(b, b.ropes, []);
  const reps = name === 'L60' ? 2 : 40;
  const repeat = f => () => { let v; for (let i = 0; i < reps; i++) v = f(); return v; };
  kernels[`${name} solve 2000`] = { b: name, reps, before: () => port.push(words),
    port: repeat(() => port.x.t_bench_solve(2000)), moonbit: repeat(() => mf.x.bench_solve(2000)), js: repeat(() => G.solve(b, b.ropes, 2000, []).nodes),
    times: { port: [], moonbit: [], js: [] } };
}
// --- the assist checks ---
const expected = require(path.join(repo, 'moonbit/tests/assist-expected.json'));
const made = new Map(), checks = [];
for (const e of expected) {
  const id = JSON.stringify(e.options); if (!made.has(id)) made.set(id, G.generate(e.options));
  const b = made.get(id); let paths = b.ropes;
  for (const i of e.taps) paths = G.tap(b, paths, i).paths;
  for (const g of e.guide) checks.push({ kind: 'guide', b, paths, budget: g.budget, prefer: e.prefer, want: JSON.stringify([g.solved, g.moves, g.nodes]) });
  for (const f of e.features) checks.push({ kind: 'features', b, paths, budget: f.budget, want: JSON.stringify(f.keys) });
}
const pass = backend => () => {
  const out = [];
  for (const c of checks) {
    if (c.kind === 'guide') { const s = backend.guide(c.b, c.paths, c.budget, c.prefer); out.push(JSON.stringify([s.solved, s.moves, s.nodes])); }
    else out.push(JSON.stringify(backend.reachableFeatures(c.b, c.paths, c.budget).sort()));
  }
  return out.join('\n');
};
const jsBackend = { guide: G.guide, reachableFeatures: G.reachableFeatures };
const wantAll = checks.map(c => c.want).join('\n');
kernels[`assist (${checks.length})`] = { b: null, reps: 1, before: () => {}, port: pass(portGen), moonbit: pass(mbtGen), js: pass(jsBackend), times: { port: [], moonbit: [], js: [] }, want: wantAll };

const time = f => { const t = performance.now(); const v = f(); return [performance.now() - t, v]; };
// MoonBit's current level is the last one generated: generate again before its board's kernels.
let current = null;
const use = name => { if (!name || current === name) return; mf.pushText('J3-MONKEYFIST'); if (!mf.x.generate(Number(name.slice(1)) - 1)) throw Error('no level ' + name); current = name; };
for (let r = 0; r < rounds + 1; r++) {
  for (const [name, k] of Object.entries(kernels)) {
    k.before();
    const [tp, vp] = time(k.port);
    use(k.b);
    const [tm, vm] = time(k.moonbit);
    const [tj, vj] = time(k.js);
    const values = [vp, vm, vj];
    if (!values.every(v => Object.is(v, values[0]))) throw Error(`${name}: the port, MoonBit and the JS disagree`);
    if (k.want !== undefined && vp !== k.want) throw Error(`${name}: the answers differ from assist-expected.json`);
    k.value = typeof vp === 'number' ? vp : `${checks.length} checks equal`;
    if (r > 0) { k.times.port.push(tp / k.reps); k.times.moonbit.push(tm / k.reps); k.times.js.push(tj / k.reps); }
  }
}
const out = { wasm: path.relative(process.cwd(), WASM), rounds, node: process.version, kernels: {} };
for (const [name, k] of Object.entries(kernels)) {
  out.kernels[name] = { value: k.value };
  for (const side of ['port', 'moonbit', 'js']) out.kernels[name][side] = { best: Math.min(...k.times[side]), median: median(k.times[side]) };
}
console.log(JSON.stringify(out));
