// Node benchmarks: Journey generation per level and kernel micro-benchmarks, JS
// reference (a checkout of 9e69e3a) vs the MoonBit core on wasm-gc and JS.
// node bench-node.mjs <reference checkout dir> [levels=120] [reps=1]
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import { createRequire } from 'module';
import { loadWasm, loadJs } from '../web/mf-core.js';
const here = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
const [refDir, levelArg = '120', repArg = '1'] = process.argv.slice(2), N = +levelArg, reps = +repArg;
const G = require(path.join(path.resolve(refDir), 'game-engine.js')), F = require(path.join(path.resolve(refDir), 'grid-generator.js'));
const L = require(path.join(path.resolve(refDir), 'levels.js'));
const t0 = performance.now();
const wasm = await loadWasm(fs.readFileSync(path.join(here, '../_build/wasm-gc/release/build/api/api.wasm')));
const tWasm = performance.now() - t0, t1 = performance.now();
const mjs = await loadJs(path.join(here, '../_build/js/release/build/api/api.js'));
const tJs = performance.now() - t1;
const stats = a => { const s = a.slice().sort((x, y) => x - y); return { total: a.reduce((x, y) => x + y, 0), mean: a.reduce((x, y) => x + y, 0) / a.length, median: s[s.length >> 1], max: s[s.length - 1] }; };
const time = f => { const t = performance.now(); const r = f(); return [performance.now() - t, r]; };
const engines = {
  'JS reference': i => G.generate({ kind: 'journey', index: i }),
  'MoonBit wasm-gc': i => wasm.generate('J3-MONKEYFIST', i),
  'MoonBit JS': i => mjs.generate('J3-MONKEYFIST', i),
};
const result = { node: process.version, startup: { wasmInstantiateMs: tWasm, jsImportMs: tJs }, generation: {}, perLevel: {}, kernels: [] };
for (const [name, gen] of Object.entries(engines)) {
  let best = null;
  for (let r = 0; r < reps; r++) {
    const times = []; for (let i = 0; i < N; i++) times.push(time(() => gen(i))[0]);
    if (!best || stats(times).total < stats(best).total) best = times;
  }
  result.generation[name] = stats(best); result.perLevel[name] = best;
  console.log(name.padEnd(16), Object.entries(stats(best)).map(([k, v]) => `${k} ${v.toFixed(1)}`).join('  '));
}
// Kernel micro-benchmarks on fixed Journey boards.
const picks = [29, 59, 88, 119, 106, 113, 117, 115].filter(i => i < N);
for (const i of picks) {
  const b = G.generate({ kind: 'journey', index: i }); wasm.generate('J3-MONKEYFIST', i); mjs.generate('J3-MONKEYFIST', i);
  const kind = `${b.grid}${b.mirrors.length ? '+mirrors' : ''}${b.springs.length ? '+spinners' : ''} ${b.W}x${b.H} ${b.ropes.length} ropes`;
  const games = b.springs.length ? 100 : 1000, repeat = 5;
  const row = { level: i + 1, kind };
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
}
fs.writeFileSync(path.join(here, '../bench/node-results.json'), JSON.stringify(result, null, 1));
