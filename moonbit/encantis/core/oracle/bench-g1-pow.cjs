// Run time of G1's pow (target_challenge = 0.5 + 9.5 * pow(d / 100, 1.3)) in the port,
// in the port with its bit access done by reinterpret, in MoonBit wasm-gc (dist/gen.wasm)
// and in the JS. Written by G1's review, to price the missing reinterpret builtin.
//
//   flock /home/user/enc-wt/stack-scratch/mergeup/bigjob.lock node moonbit/encantis/core/oracle/bench-g1-pow.cjs [processes]
//
// fmath.ents reads and writes the words of an f64 through an 8-byte scratch cell in memory
// (high, low, of_words: a store and a load each). The "reinterpret" build is test/g1.ents
// compiled to WAT with those three bodies replaced by i64.reinterpret_f64 and
// f64.reinterpret_i64, assembled by the compiler's own wat2wasm, and checked to give the
// same results. Each process times 5 interleaved rounds of 1M calls per build and keeps the
// best; the median of the processes is printed, in ns per call.
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync, execSync } = require('child_process');
const core = path.join(__dirname, '..'), repo = path.resolve(core, '../../..');
const W = require('./wasm.cjs');

if (process.argv[2] === '--child') {
  const R = require('./ref.cjs'), { F } = R.js();
  const port = W.load(path.join(core, 'test/g1.wasm')).x, rp = W.load(process.argv[3]).x;
  const mbt = W.load(path.join(repo, 'moonbit/dist/gen.wasm')).x;
  const N = 1000000, ds = Float64Array.from({ length: N }, (_, k) => (k % 10001) / 100);
  for (let k = 0; k <= 10000; k++) if (!Object.is(rp.t_target(k / 100), port.t_target(k / 100))) throw Error('the reinterpret build differs at ' + k / 100);
  const fns = { port: d => port.t_target(d), reinterpret: d => rp.t_target(d), moonbit: d => mbt.target_challenge(d), js: d => F.targetChallenge(d) };
  const best = {};
  for (let round = 0; round < 5; round++) for (const [name, f] of Object.entries(fns)) {
    let s = 0; const t = process.hrtime.bigint();
    for (let i = 0; i < N; i++) s += f(ds[i]);
    const ns = Number(process.hrtime.bigint() - t) / N;
    if (!(name in best) || ns < best[name]) best[name] = ns;
    if (s === 42) console.error('');
  }
  console.log(JSON.stringify(best));
  process.exit(0);
}

const cli = process.env.ENCANTIS || 'bun /home/user/enc-wt/main/packages/cli/src/cli.ts';
const wat2wasm = process.env.WAT2WASM || '/home/user/enc-wt/main/node_modules/.bin/wat2wasm';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'g1-pow-'));
let wat = execSync(`${cli} compile ${path.join(core, 'test/g1.ents')}`, { encoding: 'utf8', maxBuffer: 1 << 26 });
const body = {
  high: '(i32.wrap_i64 (i64.shr_u (i64.reinterpret_f64 (local.get $x)) (i64.const 32)))',
  low: '(i32.wrap_i64 (i64.reinterpret_f64 (local.get $x)))',
  of_words: '(f64.reinterpret_i64 (i64.or (i64.shl (i64.extend_i32_u (local.get $hi)) (i64.const 32)) (i64.extend_i32_u (local.get $lo))))',
};
for (const [name, b] of Object.entries(body)) {
  const re = new RegExp(`  \\(func \\$fmath\\$${name} (\\(param[^\\n]*)\\n[\\s\\S]*?\\n  \\)\\n`);
  if (!re.test(wat)) throw Error('no $fmath$' + name + ' in the WAT');
  wat = wat.replace(re, (_, sig) => `  (func $fmath$${name} ${sig}\n    ${b}\n  )\n`);
}
fs.writeFileSync(path.join(tmp, 'g1-reinterpret.wat'), wat);
execFileSync(wat2wasm, [path.join(tmp, 'g1-reinterpret.wat'), '-o', path.join(tmp, 'g1-reinterpret.wasm')]);
const runs = [];
for (let i = 0; i < +(process.argv[2] || 5); i++)
  runs.push(JSON.parse(execFileSync(process.execPath, [__filename, '--child', path.join(tmp, 'g1-reinterpret.wasm')], { encoding: 'utf8', timeout: 120000 })));
const median = k => { const v = runs.map(r => r[k]).sort((a, b) => a - b); return v[v.length >> 1]; };
for (const k of Object.keys(runs[0])) console.log(`${k.padEnd(12)} ${median(k).toFixed(1)} ns per target_challenge (median of ${runs.length} processes, best of 5 rounds of 1M)`);
fs.rmSync(tmp, { recursive: true });
