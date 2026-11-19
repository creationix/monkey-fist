// Node benchmarks: Journey generation per level and kernel micro-benchmarks, JS
// reference (a checkout of 9e69e3a) vs the MoonBit core on wasm-gc and JS.
// node bench-node.mjs <reference checkout dir> [levels=120] [reps=1]
//
// Other wasm builds of the core with the same numbers ABI (an Encantis port: see
// moonbit/encantis/core/oracle/README.md) join as more engines, and the engines can be
// timed in interleaved rounds instead of one after the other:
//   --enc <name>=<file.wasm>   one more engine (repeatable), driven through web/mf-core.js's wrap
//   --rounds R                 R rounds; each round generates the N levels on every engine in
//                              turn; round 1 is reported apart (first run) and the rest as the
//                              median and range of the round totals (steady state)
//   --kernel-reps K            repetitions of each kernel, engines interleaved (default 5)
//   --out <file>               where the JSON goes (default ../bench/node-results.json)
//   --cold <engine name>       first run only: load that one engine in this fresh process and
//                              time the load, level 1, and the first 12 levels; one JSON line
//                              appended to --out
// Without these flags the script does what it always did.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import { createRequire } from 'module';
import { loadWasm, loadJs } from '../web/mf-core.js';
const here = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
const argv = process.argv.slice(2), flags = {}, encs = [], pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--enc') { const [n, ...f] = argv[++i].split('='); encs.push([n, f.join('=')]); }
  else if (a.startsWith('--')) flags[a.slice(2)] = argv[++i];
  else pos.push(a);
}
const [refDir, levelArg = '120', repArg = '1'] = pos, N = +levelArg, reps = +repArg;
const interleaved = flags.rounds !== undefined, R = +(flags.rounds || 1), KR = +(flags['kernel-reps'] || 5);
const outFile = flags.out ? path.resolve(flags.out) : path.join(here, '../bench/node-results.json');
const ref = f => path.join(path.resolve(refDir), f);
const wasmFile = path.join(here, '../_build/wasm-gc/release/build/api/api.wasm'), jsFile = path.join(here, '../_build/js/release/build/api/api.js');
const stats = a => { const s = a.slice().sort((x, y) => x - y); return { total: a.reduce((x, y) => x + y, 0), mean: a.reduce((x, y) => x + y, 0) / a.length, median: s[s.length >> 1], max: s[s.length - 1] }; };
const time = f => { const t = performance.now(); const r = f(); return [performance.now() - t, r]; };

if (flags.cold) {
  // First run: one engine, a fresh process, nothing else loaded or warmed.
  const name = flags.cold, enc = encs.find(([n]) => n === name), line = { at: new Date().toISOString(), node: process.version, engine: name };
  const t0 = performance.now(); let gen;
  if (name === 'JS reference') { const G = require(ref('game-engine.js')); require(ref('grid-generator.js')); gen = i => G.generate({ kind: 'journey', index: i }); }
  else if (name === 'MoonBit wasm-gc') { const w = await loadWasm(fs.readFileSync(wasmFile)); gen = i => w.generate('J3-MONKEYFIST', i); }
  else if (name === 'MoonBit JS') { const m = await loadJs(jsFile); gen = i => m.generate('J3-MONKEYFIST', i); }
  else if (enc) { const w = await loadWasm(fs.readFileSync(enc[1])); gen = i => w.generate('J3-MONKEYFIST', i); }
  else throw Error('unknown engine ' + name);
  line.loadMs = performance.now() - t0;
  const per = []; for (let i = 0; i < 12; i++) { const [t, b] = time(() => gen(i)); if (!b) throw Error(`${name}: no level ${i}`); per.push(t); }
  line.firstLevelMs = per[0]; line.loadToFirstLevelMs = line.loadMs + per[0]; line.first12Ms = per.reduce((a, b) => a + b, 0); line.perLevel = per;
  console.log(`${name.padEnd(24)} load ${line.loadMs.toFixed(1)} ms  level 1 ${per[0].toFixed(1)} ms  first 12 levels ${line.first12Ms.toFixed(0)} ms`);
  fs.appendFileSync(outFile, JSON.stringify(line) + '\n');
  process.exit(0);
}

const G = require(ref('game-engine.js')), F = require(ref('grid-generator.js'));
const L = require(ref('levels.js'));
const t0 = performance.now();
const wasm = await loadWasm(fs.readFileSync(wasmFile));
const tWasm = performance.now() - t0, t1 = performance.now();
const mjs = await loadJs(jsFile);
const tJs = performance.now() - t1;
const encLoaded = [], tEnc = {};
for (const [name, file] of encs) { const t = performance.now(); encLoaded.push([name, await loadWasm(fs.readFileSync(file))]); tEnc[name] = performance.now() - t; }
const engines = {
  'JS reference': i => G.generate({ kind: 'journey', index: i }),
  'MoonBit wasm-gc': i => wasm.generate('J3-MONKEYFIST', i),
  'MoonBit JS': i => mjs.generate('J3-MONKEYFIST', i),
  ...Object.fromEntries(encLoaded.map(([name, w]) => [name, i => w.generate('J3-MONKEYFIST', i)])),
};
const result = { node: process.version, startup: { wasmInstantiateMs: tWasm, jsImportMs: tJs, ...(encs.length ? { encInstantiateMs: tEnc } : {}) }, generation: {}, perLevel: {}, kernels: [] };
if (!interleaved) {
  for (const [name, gen] of Object.entries(engines)) {
    let best = null;
    for (let r = 0; r < reps; r++) {
      const times = []; for (let i = 0; i < N; i++) times.push(time(() => gen(i))[0]);
      if (!best || stats(times).total < stats(best).total) best = times;
    }
    result.generation[name] = stats(best); result.perLevel[name] = best;
    console.log(name.padEnd(16), Object.entries(stats(best)).map(([k, v]) => `${k} ${v.toFixed(1)}`).join('  '));
  }
} else {
  // Interleaved rounds: every engine makes the N levels once per round, in turn.
  const rounds = Object.fromEntries(Object.keys(engines).map(k => [k, []])), keys = {};
  result.rounds = rounds; result.layoutKeys = keys;
  for (let r = 0; r < R; r++) {
    for (const [name, gen] of Object.entries(engines)) {
      const times = [], lk = [];
      for (let i = 0; i < N; i++) { const [t, b] = time(() => gen(i)); if (!b) throw Error(`${name}: no level ${i}`); times.push(t); lk.push(b.layoutKey); }
      rounds[name].push(times.reduce((a, b) => a + b, 0)); keys[name] = lk;
      if (r === 0) result.perLevel[name + ' (round 1)'] = times;
      if (r === R - 1) result.perLevel[name] = times;
    }
    console.log(`round ${r + 1}:`, Object.entries(rounds).map(([k, v]) => `${k} ${v[r].toFixed(0)}`).join(' | '));
  }
  for (const [name, v] of Object.entries(rounds)) {
    const steady = R > 1 ? v.slice(1) : v, s = steady.slice().sort((a, b) => a - b);
    result.generation[name] = { firstRound: v[0], steadyRounds: steady.length, median: s[(s.length - 1) >> 1] / 2 + s[s.length >> 1] / 2, min: s[0], max: s[s.length - 1], lastRoundPerLevel: stats(result.perLevel[name]) };
    const sameAsJs = keys[name].filter((k, i) => k === keys['JS reference'][i]).length;
    result.generation[name].levelsSameAsJs = sameAsJs;
    console.log(name.padEnd(28), `first round ${v[0].toFixed(0)} ms  steady median ${result.generation[name].median.toFixed(0)} (${s[0].toFixed(0)} to ${s[s.length - 1].toFixed(0)}) over ${s.length} rounds  levels as the JS's ${sameAsJs}/${N}`);
  }
}
// Kernel micro-benchmarks on fixed Journey boards.
const picks = [29, 59, 88, 119, 106, 113, 117, 115].filter(i => i < N);
for (const i of picks) {
  const b = G.generate({ kind: 'journey', index: i }); wasm.generate('J3-MONKEYFIST', i); mjs.generate('J3-MONKEYFIST', i);
  const encKeys = encLoaded.map(([, w]) => w.generate('J3-MONKEYFIST', i).layoutKey);
  const kind = `${b.grid}${b.mirrors.length ? '+mirrors' : ''}${b.springs.length ? '+spinners' : ''} ${b.W}x${b.H} ${b.ropes.length} ropes`;
  const games = b.springs.length ? 100 : 1000, repeat = 5;
  const row = { level: i + 1, kind };
  if (!interleaved) {
    const bench = (label, js, mb, mj) => {
      const run = f => { let best = Infinity, v; for (let k = 0; k < repeat; k++) { const [t, r] = time(f); v = r; best = Math.min(best, t); } return [best, v]; };
      const a = run(js), w = run(mb), j = run(mj);
      row[label] = { js: a[0], wasm: w[0], mbjs: j[0], agree: String(a[1]) === String(w[1]) && String(w[1]) === String(j[1]), values: [a[1], w[1], j[1]] };
    };
    bench(`casual x${games}`, () => F.casualRate(b, G, L.mulberry32(L.hashString('bench')), games), () => wasm.benchCasual(games), () => mjs.benchCasual(games));
    bench('par search', () => F.score(b, G, false).par, () => wasm.benchPar(), () => mjs.benchPar());
    bench('solve 2000', () => G.solve(b, b.ropes, 2000).nodes, () => wasm.benchSolve(2000), () => mjs.benchSolve(2000));
    result.kernels.push(row);
    console.log(`L${i + 1} ${kind}:`, Object.entries(row).filter(([k]) => k !== 'level' && k !== 'kind').map(([k, v]) => `${k} js ${v.js.toFixed(2)} wasm ${v.wasm.toFixed(2)} mbjs ${v.mbjs.toFixed(2)} ms${v.agree ? '' : ' DISAGREE ' + v.values}`).join(' | '));
    continue;
  }
  // Interleaved: each repetition runs every engine once; min, median and max of the K times.
  // An Encantis engine whose level i is another board (its own Journey) is timed but marked.
  row.otherBoard = Object.fromEntries(encLoaded.map(([name], k) => [name, encKeys[k] !== b.layoutKey]));
  const bench = (label, fs_) => {
    const t = Object.fromEntries(Object.keys(fs_).map(k => [k, []])), v = {};
    for (let k = 0; k < KR; k++) for (const [name, f] of Object.entries(fs_)) { const [ms, r] = time(f); t[name].push(ms); v[name] = r; }
    const cell = {};
    for (const [name, a] of Object.entries(t)) { const s = a.slice().sort((x, y) => x - y); cell[name] = { min: s[0], median: s[(s.length - 1) >> 1] / 2 + s[s.length >> 1] / 2, max: s[s.length - 1], value: v[name] }; }
    cell.agree = Object.entries(v).every(([name, x]) => row.otherBoard[name] || String(x) === String(v['JS reference']));
    row[label] = cell;
  };
  const encF = kernel => Object.fromEntries(encLoaded.map(([name, w]) => [name, () => kernel(w)]));
  // (bench_* run on the level each engine made last: level i, made above on every engine.)
  bench(`casual x${games}`, { 'JS reference': () => F.casualRate(b, G, L.mulberry32(L.hashString('bench')), games), 'MoonBit wasm-gc': () => wasm.benchCasual(games), 'MoonBit JS': () => mjs.benchCasual(games), ...encF(w => w.benchCasual(games)) });
  bench('par search', { 'JS reference': () => F.score(b, G, false).par, 'MoonBit wasm-gc': () => wasm.benchPar(), 'MoonBit JS': () => mjs.benchPar(), ...encF(w => w.benchPar()) });
  bench('solve 2000', { 'JS reference': () => G.solve(b, b.ropes, 2000).nodes, 'MoonBit wasm-gc': () => wasm.benchSolve(2000), 'MoonBit JS': () => mjs.benchSolve(2000), ...encF(w => w.benchSolve(2000)) });
  result.kernels.push(row);
  console.log(`L${i + 1} ${kind}:`, Object.entries(row).filter(([k]) => !['level', 'kind', 'otherBoard'].includes(k)).map(([k, c]) => `${k}: ` + Object.entries(c).filter(([n]) => n !== 'agree').map(([n, x]) => `${n} ${x.median.toFixed(2)}${row.otherBoard[n] ? '*' : ''}`).join(', ') + (c.agree ? '' : ' DISAGREE')).join(' | '));
}
fs.writeFileSync(outFile, JSON.stringify(result, null, 1));
