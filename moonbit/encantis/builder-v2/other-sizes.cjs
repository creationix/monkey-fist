// Board sizes outside the fixture, 1x8 to 80x80, a build of weave against the reference JS:
//   node moonbit/encantis/builder-v2/other-sizes.cjs [weave.wasm]
// Default: builder-v2/weave.wasm. Four of the fixture's cfgs without mirrors or a core
// (short ropes with knots, medium, twisty, none wanted), each on 11 sizes, 6 seeds a
// size (1 above 2,000 cells): 224 runs. Each run compares the output words and the
// draw count. Exits 1 on any mismatch.
//
// This is v1's script, which was run from a scratch directory and never committed
// (v1's README: "Board sizes outside the fixture, 1x8 to 80x80, against the JS: 224
// runs"), with its paths made relative and an exit code; what it runs is the same.
'use strict';
const fs = require('fs'), path = require('path');
const B = path.join(__dirname, '../builder');
const D = require(B + '/dump-weave.cjs');
const fixture = JSON.parse(fs.readFileSync(D.FIXTURE, 'utf8'));
const L = D.reference(false).L;
const wasm = process.argv[2] || path.join(__dirname, 'weave.wasm');
const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(wasm)), {}).exports;
const IN = x.in_ptr() >>> 0, FIN = x.fin_ptr() >>> 0, OUT = x.out_ptr() >>> 0;
const plain = fixture.cases.filter(c => !c.cfg.mirrors.length && !c.cfg.initialRopes.length);
const pick = [plain.find(c => /short/.test(c.from) && c.cfg.tie > 3), plain.find(c => /medium/.test(c.from) && c.cfg.tie > 5), plain.find(c => /twisty/.test(c.from) && c.cfg.tie > 5), plain.find(c => c.cfg.tie === 0)];
let bad = 0, total = 0, nulls = 0;
for (const [W, H] of [[1, 8], [2, 2], [2, 7], [3, 3], [3, 9], [5, 5], [7, 3], [16, 9], [30, 50], [64, 64], [80, 80]]) {
  for (const base of pick) for (let k = 0; k < (W * H > 2000 ? 1 : 6); k++) {
    const c = { ...base, seed: (base.seed + Math.imul(k + 1, 0x85EBCA6B) + W * 131 + H) >>> 0, cfg: { ...base.cfg, W, H } };
    let ref; try { ref = D.run(L, c); } catch (e) { ref = { error: e.message }; }
    const input = D.words(c);
    new Int32Array(x.mem.buffer, IN, input.ints.length).set(input.ints);
    const f = new DataView(x.mem.buffer, FIN); input.doubles.forEach((v, i) => f.setFloat64(8 * i, v, true));
    let got; try { got = x.weave(); } catch (e) { got = 'trap: ' + e.message; }
    total++;
    if (ref.error || typeof got === 'string') { bad++; console.log(`${W}x${H} case ${base.id} seed ${c.seed}: JS ${ref.error || 'ok'}, wasm ${got}`); continue; }
    const want = D.outWords(ref.out), have = Array.from(new Int32Array(x.mem.buffer, OUT, want.length));
    if (!ref.out) nulls++;
    if (!(want.every((v, i) => v === have[i]) && (x.draws() >>> 0) === ref.draws)) { bad++; console.log(`${W}x${H} case ${base.id} seed ${c.seed}: differs`); }
  }
}
console.log(`${path.relative(process.cwd(), wasm)}: ${total} runs, ${nulls} null, ${bad} mismatches`);
process.exit(bad ? 1 : 0);
