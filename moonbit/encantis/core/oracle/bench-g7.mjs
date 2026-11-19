// G7's whole-level timing: the 120 Journey levels in rounds, the builds interleaved in one
// process, as wasm-reps.mjs times one build (the clock round generate() alone; the ABI's in and out
// apart):
//   core.wasm          the port's own generator and its own Journey (journey.ents's specs_port);
//   test/g7.wasm       the same core in the JS's mode: the JS game's Journey, the levels MoonBit makes;
//   MoonBit gen.wasm   the MoonBit wasm-gc build the game ships (dist/gen.wasm);
// and with --custom, the 15 custom levels of reference.json the same way.
//   node bench-g7.mjs [rounds=5] [--custom] [--out file.jsonl]
// One JSON line a process (best round of each build, and every round); run it 5 times under the lock
// and take the median of the bests (oracle/README.md's rule).
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), R = +(args.find(a => /^\d+$/.test(a)) || 5);
const outFile = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;
const ref = JSON.parse(fs.readFileSync('/home/user/mf-core-scratch/reference.json', 'utf8'));
const builds = {
  'core.wasm': path.join(here, '../core.wasm'),
  'g7.wasm (JS mode)': path.join(here, '../test/g7.wasm'),
  'MoonBit gen.wasm': path.join(here, '../../../dist/gen.wasm'),
};
const inst = {};
for (const [k, f] of Object.entries(builds)) {
  const t = performance.now();
  const { instance } = await WebAssembly.instantiate(fs.readFileSync(f), {});
  inst[k] = { x: instance.exports, instantiate: performance.now() - t };
  if (instance.exports.t_js_mode) instance.exports.t_js_mode(1);
}
const push = (x, s) => { x.in_reset(); for (let i = 0; i < s.length; i++) x.in_push(s.charCodeAt(i)); };
const cases = args.includes('--custom') ? ref.custom.map(c => [c.code, c.index]) : Array.from({ length: 120 }, (_, i) => ['J3-MONKEYFIST', i]);
const rounds = {}, perLevel = {}, peaks = {};
for (const k of Object.keys(builds)) { rounds[k] = []; perLevel[k] = null; }
for (let r = 0; r < R; r++) for (const [k, { x }] of Object.entries(inst)) {
  let total = 0; const per = [];
  for (const [code, i] of cases) {
    push(x, code);
    const t = performance.now();
    if (!x.generate(i)) throw Error(`${k}: no level ${code} ${i}`);
    const ms = performance.now() - t;
    total += ms; per.push(ms);
    if (x.stack_peak) peaks[k] = Math.max(peaks[k] || 0, x.stack_peak());
  }
  rounds[k].push(total);
  if (!perLevel[k] || total <= Math.min(...rounds[k])) perLevel[k] = per;
}
const best = Object.fromEntries(Object.entries(rounds).map(([k, v]) => [k, Math.min(...v)]));
const line = { at: new Date().toISOString(), cases: args.includes('--custom') ? 'custom' : 'journey', rounds, best, peaks, perLevel,
  instantiate: Object.fromEntries(Object.entries(inst).map(([k, v]) => [k, v.instantiate])) };
for (const k of Object.keys(builds)) console.log(`${k.padEnd(20)} best ${best[k].toFixed(0)} ms  rounds ${rounds[k].map(v => v.toFixed(0)).join(' ')}${peaks[k] ? `  stack peak ${(peaks[k] / 1048576).toFixed(2)} MiB` : ''}`);
if (outFile) fs.appendFileSync(outFile, JSON.stringify(line) + '\n');
