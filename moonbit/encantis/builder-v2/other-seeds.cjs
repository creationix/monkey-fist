// The fixture's cfgs on other seeds, a build of weave against the reference JS:
//   node moonbit/encantis/builder-v2/other-seeds.cjs [weave.wasm] [seeds per case]
// Default: builder-v2/weave.wasm and 20 seeds, 4,980 runs. Seed k of a case is its
// seed + k * 0x9E3779B1. Each run compares the output words and the draw count;
// where the JS throws, the wasm must trap. Exits 1 on any mismatch.
//
// This is v1's script, which was run from a scratch directory and never committed
// (v1's README: "20 other seeds for each case's cfg, against the JS: 4,980 runs"),
// with its paths made relative and an exit code; what it runs and compares is the same.
'use strict';
const fs = require('fs'), path = require('path');
const B = path.join(__dirname, '../builder');
const D = require(B + '/dump-weave.cjs');
const wasm = process.argv[2] || path.join(__dirname, 'weave.wasm'), per = Number(process.argv[3] || 20);
const fixture = JSON.parse(fs.readFileSync(D.FIXTURE, 'utf8'));
const L = D.reference(false).L;
const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(wasm)), {}).exports;
const IN = x.in_ptr() >>> 0, FIN = x.fin_ptr() >>> 0, OUT = x.out_ptr() >>> 0;
let bad = 0, total = 0, nulls = 0, errors = 0, tJs = 0, tW = 0;
for (const c of fixture.cases) {
  for (let k = 1; k <= per; k++) {
    const c2 = { ...c, seed: (c.seed + Math.imul(k, 0x9E3779B1)) >>> 0 };
    let ref;
    let t = performance.now();
    try { ref = D.run(L, c2); } catch (e) { ref = { error: e.message }; }
    tJs += performance.now() - t;
    const input = D.words(c2);
    new Int32Array(x.mem.buffer, IN, input.ints.length).set(input.ints);
    const f = new DataView(x.mem.buffer, FIN); input.doubles.forEach((v, i) => f.setFloat64(8 * i, v, true));
    let got;
    t = performance.now();
    try { got = x.weave(); } catch (e) { got = 'trap: ' + e.message; }
    tW += performance.now() - t;
    total++;
    if (ref.error) { errors++; if (typeof got !== 'string') { bad++; console.log(`case ${c.id} seed ${c2.seed}: JS threw (${ref.error}), wasm did not`); } continue; }
    if (typeof got === 'string') { bad++; console.log(`case ${c.id} seed ${c2.seed}: ${got}`); break; }
    const want = D.outWords(ref.out), have = Array.from(new Int32Array(x.mem.buffer, OUT, want.length));
    if (!ref.out) nulls++;
    const same = want.every((v, i) => v === have[i]) && (x.draws() >>> 0) === ref.draws;
    if (!same) { bad++; if (bad <= 10) console.log(`case ${c.id} seed ${c2.seed}: differs (draws ${ref.draws} vs ${x.draws() >>> 0})`); }
  }
}
console.log(`${path.relative(process.cwd(), wasm)}, ${per} seeds per case: ${total} runs, ${nulls} null, ${errors} JS errors, ${bad} mismatches; JS ${tJs.toFixed(0)} ms, wasm ${tW.toFixed(0)} ms`);
process.exit(bad ? 1 : 0);
