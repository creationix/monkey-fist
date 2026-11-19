// Verification bench: ONE engine per fresh process (no other engine's garbage in the heap), R rounds of
// the 120 Journey levels; prints one JSON line: round totals, and per-level times of the last round.
//   node iso-bench.mjs <engine> <rounds> <out.jsonl>
// engines: js (the reference at 9e69e3a), mbwasm (MoonBit dist/mf.wasm), mbjs (dist/mf.js), or a path to an Encantis wasm
import fs from 'fs'; import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const H = '/home/user/mf-core-scratch/verify/hbench/moonbit', REF = '/home/user/mf-core-scratch/verify/ref-9e69e3a';
const { loadWasm, loadJs } = await import(H + '/web/mf-core.js');
const [engine, roundsArg, out] = process.argv.slice(2), R = +roundsArg;
let gen;
const t0 = performance.now();
if (engine === 'js') { const G = require(REF + '/game-engine.js'); require(REF + '/grid-generator.js'); gen = i => G.generate({ kind: 'journey', index: i }); }
else if (engine === 'mbwasm') { const w = await loadWasm(fs.readFileSync(H + '/dist/mf.wasm')); gen = i => w.generate('J3-MONKEYFIST', i); }
else if (engine === 'mbjs') { const m = await loadJs(H + '/_build/js/release/build/api/api.js'); gen = i => m.generate('J3-MONKEYFIST', i); }
else { const w = await loadWasm(fs.readFileSync(engine)); gen = i => w.generate('J3-MONKEYFIST', i); }
const loadMs = performance.now() - t0, rounds = []; let per = [], keys = [];
for (let r = 0; r < R; r++) {
  per = []; keys = [];
  for (let i = 0; i < 120; i++) { const t = performance.now(), b = gen(i); per.push(performance.now() - t); if (!b) throw Error('no level ' + i); keys.push(b.layoutKey); }
  rounds.push(per.reduce((a, b) => a + b, 0));
}
const line = { engine, node: process.version, at: new Date().toISOString(), loadMs, rounds, lastPerLevel: per, keysHash: require('crypto').createHash('sha1').update(keys.join('|')).digest('hex').slice(0, 12) };
fs.appendFileSync(out, JSON.stringify(line) + '\n');
console.log(engine, rounds.map(x => x.toFixed(0)).join(' '), line.keysHash);
