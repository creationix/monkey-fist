// G7's oracle part 3, the port's mode: core.wasm's levels for the 60 custom cases of
// dump-custom-g7.cjs (its --join output), each checked valid by the JS's kernels
// (quality-hexbuild.cjs's levelProblems). parity.mjs compares them with the JS's.
//   node validate-custom-g7.cjs
const fs = require('fs'), path = require('path');
const O = __dirname + '/';
const R = require(O + 'ref.cjs'), QH = require(O + 'quality-hexbuild.cjs');
const { G } = R.js(); globalThis.MFGame = G;
const MF = require(O + '../../../web/generator.js');
const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(O + '../core.wasm')), {}).exports;
const ref = JSON.parse(fs.readFileSync('/home/user/mf-core-scratch/g7/custom-g7.json', 'utf8')).custom;
const input = s => { x.in_reset(); for (let i = 0; i < s.length; i++) x.in_push(s.charCodeAt(i)); };
const read = () => { const n = x.out_len(), o = new Array(n); for (let i = 0; i < n; i++) o[i] = x.out_get(i); return o; };
let bad = 0, n = 0;
for (const c of ref) {
  const spec = G.spec(G.parseCode(c.code), c.index);
  input(c.code); if (!x.generate(c.index)) { console.log('none', c.code, c.index); bad++; continue; }
  const lv = MF.decode(read(), x.outf_get); n++;
  const why = QH.levelProblems(lv, spec);
  if (why.length) { bad++; console.log(c.code, c.index, why.join('; ')); }
}
console.log(`${n} core.wasm levels of the 60 custom cases checked by the JS's kernels: ${bad} invalid`);
