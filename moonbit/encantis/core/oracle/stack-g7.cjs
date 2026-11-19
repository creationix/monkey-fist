// The stack peak of every level's generate() (stack_peak(), the most of the 16 MiB stack the call
// used), on the Journey and the 15 custom levels of reference.json, for core.wasm and test/g7.wasm
// in the JS's mode; and over the quality classes' levels (quality-g7.cjs records each peak).
//   node stack-g7.cjs
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ref = JSON.parse(fs.readFileSync('/home/user/mf-core-scratch/reference.json', 'utf8'));
const MiB = v => (v / 1048576).toFixed(2) + ' MiB';
for (const [name, file, js] of [['core.wasm', '../core.wasm', 0], ['g7.wasm (JS mode)', '../test/g7.wasm', 1]]) {
  const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(__dirname, file))), {}).exports;
  if (x.t_js_mode) x.t_js_mode(js);
  const run = (code, i) => { x.in_reset(); for (let k = 0; k < code.length; k++) x.in_push(code.charCodeAt(k)); x.generate(i); return x.stack_peak(); };
  const j = Array.from({ length: 120 }, (_, i) => [i, run('J3-MONKEYFIST', i)]).sort((a, b) => b[1] - a[1]);
  const c = ref.custom.map(r => [r.code + ' #' + r.index, run(r.code, r.index)]).sort((a, b) => b[1] - a[1]);
  const med = a => a[a.length >> 1][1];
  console.log(`${name}: Journey peak max ${MiB(j[0][1])} (L${j[0][0] + 1}), median ${MiB(med(j))}; custom max ${MiB(c[0][1])} (${c[0][0]}), median ${MiB(med(c))}`);
}
const rows = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures/quality-g7.jsonl.gz'))).toString().trim().split('\n').map(l => JSON.parse(l)).filter(r => r.peak);
const byClass = {};
for (const r of rows) { const k = r.key.split('#')[0].split('-').slice(0, 7).join('-'); byClass[k] = Math.max(byClass[k] || 0, r.peak); }
const top = Object.entries(byClass).sort((a, b) => b[1] - a[1]);
console.log(`quality classes: ${rows.length} levels, peak max ${MiB(top[0][1])} (${top[0][0]}); by set code: ${top.map(([k, v]) => k + ' ' + MiB(v)).join(', ')}`);
