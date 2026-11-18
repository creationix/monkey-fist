// Several builds of weave and the reference JS timed in one process, interleaved,
// so that whatever else the machine is doing falls on all of them alike:
//   node moonbit/encantis/builder-v2/bench-mix.cjs [--rounds 5] name=path.wasm ...   one JSON line
//   node moonbit/encantis/builder-v2/bench-mix.cjs --summary <file.jsonl>            median and range over processes
// First each module's two passes over the fixture's 249 cases (in order, then in
// reverse; each result and draw count checked against weave-expected.json) and one
// pass of the JS. Then the rounds: each runs every case on every module and on the
// JS, case by case, starting with a different one for each case and round. The clock
// is round the call alone (the input is written before). Reports the best and the
// median of the rounds, overall and by board size. bench.cjs times one wasm per
// process instead.
'use strict';
const fs = require('fs');
const D = require('../builder/dump-weave.cjs');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const median = xs => { const s = [...xs].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const groups = [['all', () => true], ['up to 12x16', c => c.cfg.W * c.cfg.H <= 192], ['24x24', c => c.cfg.W === 24], ['40x40', c => c.cfg.W === 40]];

if (args.includes('--summary')) {
  const rows = fs.readFileSync(opt('--summary'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const fmt = xs => `${median(xs).toFixed(1)} (${Math.min(...xs).toFixed(1)} to ${Math.max(...xs).toFixed(1)})`;
  console.log(`${rows.length} processes, ${rows[0].rounds} rounds each: median (range) over the processes, ms for the 249 cases`);
  for (const name of Object.keys(rows[0].out)) {
    const b = rows.map(r => r.out[name].best), m = rows.map(r => r.out[name].median);
    console.log(`  ${name.padEnd(12)} best ${fmt(b.map(x => x.all))}   median ${fmt(m.map(x => x.all))}   [best by size: ${groups.slice(1).map(([g]) => `${g} ${median(b.map(x => x[g])).toFixed(1)}`).join(', ')}]`);
  }
  process.exit(0);
}

const rounds = Number(opt('--rounds', 5));
const cases = JSON.parse(fs.readFileSync(D.FIXTURE, 'utf8')).cases;
const L = D.reference(false).L;
const inputs = new Map(cases.map(c => [c, D.words(c)])), cfgs = new Map(cases.map(c => [c, D.cfgOf(c.cfg)]));
const runners = args.filter(a => a.includes('=')).map(a => a.split('=')).map(([name, file]) => {
  const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(file)), {}).exports;
  const IN = x.in_ptr() >>> 0, FIN = x.fin_ptr() >>> 0;
  return { name, run: c => {
    const input = inputs.get(c);
    new Int32Array(x.mem.buffer, IN, input.ints.length).set(input.ints);
    const f = new DataView(x.mem.buffer, FIN); input.doubles.forEach((v, i) => f.setFloat64(8 * i, v, true));
    const t = performance.now(), r = x.weave(), ms = performance.now() - t;
    if ((r === 1) !== !!c.out || (x.draws() >>> 0) !== c.draws) throw Error(`${name}: case ${c.id} differs from the fixture`);
    return ms;
  } };
});
for (const r of runners) { for (const c of cases) r.run(c); for (const c of [...cases].reverse()) r.run(c); }
runners.push({ name: 'js', run: c => { const rng = L.mulberry32(c.seed), cfg = cfgs.get(c), t = performance.now(); L.weave(rng, cfg); return performance.now() - t; } });
for (const c of cases) runners[runners.length - 1].run(c);
const totals = runners.map(() => []);
for (let round = 0; round < rounds; round++) {
  const sums = runners.map(() => Object.fromEntries(groups.map(([g]) => [g, 0])));
  cases.forEach((c, ci) => {
    for (let k = 0; k < runners.length; k++) {
      const i = (k + ci + round) % runners.length, ms = runners[i].run(c);
      for (const [g, test] of groups) if (test(c)) sums[i][g] += ms;
    }
  });
  sums.forEach((s, i) => totals[i].push(s));
}
const out = {};
runners.forEach((r, i) => { out[r.name] = { best: Object.fromEntries(groups.map(([g]) => [g, Math.min(...totals[i].map(t => t[g]))])), median: Object.fromEntries(groups.map(([g]) => [g, median(totals[i].map(t => t[g]))])) }; });
console.log(JSON.stringify({ rounds, out }));
