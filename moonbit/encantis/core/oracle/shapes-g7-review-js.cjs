// G7's review: Odd shapes past 48 a side (generate_spec accepts up to 2,304 cells): the JS's mode against the JS,
// field by field, to see that no table sized for 48 columns or rows overflows into a wrong level.
//   node shapes-g7-review-js.cjs '[{"grid":"hex","W":49,"H":47}, ...]'
const fs = require('fs'), path = require('path');
const O = __dirname;
const R = require(O + '/ref.cjs'); const { G, F } = R.js(); globalThis.MFGame = G;
const MF = require(path.join(__dirname, '../../../web/generator.js'));
const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(O + '/../test/g7.wasm')), {}).exports; x.t_js_mode(1);
const gen = MF.wrap(x, 'wasm');
const fp = lv => JSON.stringify([lv.grid, lv.W, lv.H, lv.ropes, lv.mirrors, lv.springs, lv.plan, lv.par, !!lv.exact, lv.coverage, lv.play.casualWins, lv.play.challenge]);
for (const s of JSON.parse(process.argv[2])) {
  const spec = { difficulty: 50, seed: 'BIGODD' + s.W + 'X' + s.H, colossal: true, ...s };
  let t = Date.now(), a, b;
  try { a = fp(gen.generateSpec(spec)); } catch (e) { a = e.message.slice(0, 40); }
  const tw = Date.now() - t; t = Date.now();
  try { b = fp(F.generate(spec, G)); } catch (e) { b = e.message.slice(0, 40); }
  console.log(`${s.grid} ${s.W}x${s.H} ${s.mirrors ? 'M' : ''}${s.springs ? 'S' : ''}: ${a === b ? 'EQUAL' : 'DIFFER'} (wasm ${tw} ms, JS ${Date.now() - t} ms)${a === b ? '' : ' ' + a.slice(0, 60) + ' | ' + b.slice(0, 60)}`);
}
