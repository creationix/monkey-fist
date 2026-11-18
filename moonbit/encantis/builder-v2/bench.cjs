// The time of the fixture's 249 cases, as check-weave.cjs measures it, with the median
// of its rounds beside their best:
//   node moonbit/encantis/builder-v2/bench.cjs <weave.wasm> [--rounds 5]      one process, one JSON line
//   node moonbit/encantis/builder-v2/bench.cjs --summary <file.jsonl>         median and range over processes
// One wasm per process. First what check-weave.cjs does before it times: every case in
// order and then in reverse on the module (each result and draw count checked against
// weave-expected.json), then the reference JS once per case (and once more traced, as
// check-weave's staleness check does). Then the rounds: each runs every case on the module
// and then on the JS, case by case, with the clock round the call alone (the input is
// written before). check-weave.cjs reports the best of 5 rounds; this reports the best
// and the median, overall and by board size, and the first pass (before anything is
// optimised) for both. Run several processes and summarise them with --summary.
'use strict';
const fs = require('fs'), path = require('path');
const D = require('../builder/dump-weave.cjs');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const median = xs => { const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const groups = [['all', () => true], ['up to 12x16', c => c.cfg.W * c.cfg.H <= 192], ['24x24', c => c.cfg.W === 24], ['40x40', c => c.cfg.W === 40]];

if (args.includes('--summary')) {
  const rows = fs.readFileSync(opt('--summary'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const by = new Map(); for (const r of rows) { if (!by.has(r.wasm)) by.set(r.wasm, []); by.get(r.wasm).push(r); }
  const fmt = xs => `${median(xs).toFixed(1)} (${Math.min(...xs).toFixed(1)} to ${Math.max(...xs).toFixed(1)})`;
  console.log(`median (range) over processes, ms for the 249 cases; best and median of ${rows[0].rounds} rounds within each process`);
  const line = (label, rs, side) => console.log(`  ${label.padEnd(44)} best ${fmt(rs.map(r => r[side].best.all))}   median ${fmt(rs.map(r => r[side].median.all))}   first ${fmt(rs.map(r => r[side].first))}   [${groups.slice(1).map(([g]) => `${g} ${median(rs.map(r => r[side].best[g])).toFixed(1)}`).join(', ')}]`);
  for (const [wasm, rs] of by) line(`${wasm} (${rs.length} processes)`, rs, 'module');
  line(`reference JS (${rows.length} processes)`, rows, 'js');
  process.exit(0);
}

const wasmPath = path.resolve(args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--rounds'));
const rounds = Number(opt('--rounds', 5));
const fixture = JSON.parse(fs.readFileSync(D.FIXTURE, 'utf8')), cases = fixture.cases;
const L = D.reference(false).L;
const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(wasmPath)), {}).exports;
const IN = x.in_ptr() >>> 0, FIN = x.fin_ptr() >>> 0;
const inputs = new Map(cases.map(c => [c, D.words(c)])), cfgs = new Map(cases.map(c => [c, D.cfgOf(c.cfg)]));
const runModule = c => {
  const input = inputs.get(c);
  new Int32Array(x.mem.buffer, IN, input.ints.length).set(input.ints);
  const f = new DataView(x.mem.buffer, FIN); input.doubles.forEach((v, i) => f.setFloat64(8 * i, v, true));
  const t = performance.now(), r = x.weave(), ms = performance.now() - t;
  if ((r === 1) !== !!c.out || (x.draws() >>> 0) !== c.draws) throw Error(`${wasmPath}: case ${c.id} differs from the fixture`);
  return ms;
};
const runJs = c => { const rng = L.mulberry32(c.seed), cfg = cfgs.get(c), t = performance.now(); L.weave(rng, cfg); return performance.now() - t; };
// check-weave's two passes, then its run of the reference
let firstModule = 0, firstJs = 0;
for (const c of cases) firstModule += runModule(c);
for (const c of [...cases].reverse()) runModule(c);
for (const c of cases) { firstJs += runJs(c); D.run(L, c); }
const totals = { module: [], js: [] };
for (let r = 0; r < rounds; r++) {
  const m = {}, j = {}; for (const [g] of groups) { m[g] = 0; j[g] = 0; }
  for (const c of cases) {
    const a = runModule(c), b = runJs(c);
    for (const [g, test] of groups) if (test(c)) { m[g] += a; j[g] += b; }
  }
  totals.module.push(m); totals.js.push(j);
}
const stats = (rows, first) => ({ first, best: Object.fromEntries(groups.map(([g]) => [g, Math.min(...rows.map(r => r[g]))])), median: Object.fromEntries(groups.map(([g]) => [g, median(rows.map(r => r[g]))])) });
console.log(JSON.stringify({ wasm: path.relative(process.cwd(), wasmPath), bytes: fs.statSync(wasmPath).size, rounds, module: stats(totals.module, firstModule), js: stats(totals.js, firstJs) }));
