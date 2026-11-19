// mutant-reach.cjs for generate_spec: specs of the Journey's chapter-1 kind (small, requireSlide).
const fs = require('fs'), path = require('path');
const O = require('path').join(__dirname, '..');
const R = require(O + '/ref.cjs'); const { G } = R.js(); globalThis.MFGame = G;
const MF = require(require('path').join(__dirname, '../../../../web/generator.js'));
const [mutant, n = '300'] = process.argv.slice(2);
const mk = f => { const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(f)), {}).exports; x.t_js_mode(1); return MF.wrap(x, 'wasm'); };
const a = mk(O + '/../test/g7.wasm'), b = mk(mutant);
const fp = lv => JSON.stringify([lv.ropes, lv.mirrors, lv.springs, lv.plan, lv.par, lv.play]);
let diff = 0; const ex = [];
for (let i = 0; i < +n; i++) {
  const grid = i % 2 ? 'hex' : 'square', W = 4 + (i % 3 === 2 ? 1 : 0), H = 5 + (i % 2);
  const spec = { grid, W, H, difficulty: [30.25, 40, 20.5][i % 3], seed: 'REACH' + i, requireSlide: true, mirrors: false, springs: false };
  let x, y;
  try { x = fp(a.generateSpec(spec)); } catch (e) { x = 'none'; }
  try { y = fp(b.generateSpec(spec)); } catch (e) { y = /No board/.test(e.message) ? 'none' : 'TRAP'; }
  if (x !== y) { diff++; ex.push(JSON.stringify(spec)); }
}
console.log(`${path.basename(mutant)}: ${diff} of ${n} requireSlide specs differ${ex.length ? '\n  ' + ex.join('\n  ') : ''}`);
