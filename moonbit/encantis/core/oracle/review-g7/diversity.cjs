// Distinct maps per set (layout keys), the port's mode against the JS's, on the smallest classes.
const fs = require('fs'), path = require('path');
const O = require('path').join(__dirname, '..');
const R = require(O + '/ref.cjs'); const { G } = R.js(); globalThis.MFGame = G;
const MF = require(require('path').join(__dirname, '../../../../web/generator.js'));
const Q = require(O + '/quality-g7-review.cjs');
const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(O + '/../test/g7.wasm')), {}).exports;
const gen = MF.wrap(x, 'wasm');
for (const c of process.argv.slice(2)) {
  const out = {};
  for (const [set, sfx, mode] of [['A', 'RA', 1], ['B', 'RB', 1], ['P', 'RP', 0], ['P2', 'RP2', 0]]) {
    x.t_js_mode(mode); const keys = new Map(); let n = 0;
    for (const { spec, rep } of Q.levelsOf(c)) { try { const lv = gen.generateSpec({ ...spec, seed: spec.seed + sfx + rep }); n++; keys.set(lv.layoutKey, (keys.get(lv.layoutKey) || 0) + 1); } catch (e) {} }
    out[set] = `${keys.size} distinct of ${n} (most repeated ${Math.max(...keys.values())})`;
  }
  console.log(c, JSON.stringify(out));
}
