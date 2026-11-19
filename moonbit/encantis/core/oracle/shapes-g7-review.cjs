// G7's review: generate_spec on odd shapes: the port (core.wasm) against the JS, and whether a call leaves the
// instance answering later calls as a fresh one does.
//   node shapes-g7-review.cjs [wasm] [mode 0|1] [shapes as JSON [[W,H],...]] [--js]
const fs = require('fs'), path = require('path');
const O = __dirname;
const R = require(O + '/ref.cjs');
const { G, F } = R.js();
globalThis.MFGame = G;
const MF = require(path.join(__dirname, '../../../web/generator.js'));
const wasm = process.argv[2] || O + '/../core.wasm';
const inst = () => { const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(wasm)), {}).exports; if (x.t_js_mode) x.t_js_mode(+(process.argv[3] || 0)); return { x, gen: MF.wrap(x, 'wasm') }; };
const shapes = JSON.parse(process.argv[4] || '[[1,1],[1,5],[5,1],[2,2],[3,3],[2,7],[7,2],[3,12],[12,3],[4,4],[25,25],[49,47],[60,38],[2304,1],[1,2304],[96,24]]');
const kinds = [{}, { mirrors: true }, { springs: true }, { mirrors: true, springs: true }];
const ref = inst(), refLv = ref.gen.generate({ kind: 'journey', index: 57 });
const runJs = process.argv.includes('--js');
for (const [W, H] of shapes) for (const grid of ['square', 'hex']) for (const k of kinds) {
  const spec = { grid, W, H, difficulty: 50, seed: 'ODD' + W + 'X' + H, ...k, ...(W * H > 576 ? { colossal: true } : {}) };
  const p = inst();
  let port, t = Date.now();
  try { const lv = p.gen.generateSpec(spec); port = `level ${lv.ropes.length} ropes par ${lv.par}`; const r = G.replay(lv, lv.plan); if (!r.solved || r.taps !== lv.par) port += ' INVALID'; }
  catch (e) { port = /No board fits/.test(e.message) ? 'none' : 'TRAP ' + e.message.slice(0, 60); }
  const pms = Date.now() - t;
  // the instance afterwards: the same Journey level as a fresh one
  let after;
  try { const lv = p.gen.generate({ kind: 'journey', index: 57 }); after = lv.layoutKey === refLv.layoutKey && lv.par === refLv.par ? 'ok' : 'DIFFERS'; } catch (e) { after = 'TRAP ' + e.message; }
  let js = '-';
  if (runJs && W * H <= 200) { t = Date.now(); try { const lv = F.generate(spec, G); js = `level ${lv.ropes.length} ropes par ${lv.par}`; } catch (e) { js = /densely/.test(e.message) ? 'none' : 'THROWS ' + e.message.slice(0, 50); } js += ` (${Date.now() - t} ms)`; }
  console.log(`${grid} ${W}x${H} ${JSON.stringify(k)}: port ${port} (${pms} ms), after ${after}; JS ${js}`);
}
