// Is a surviving mutant's branch reachable by the generator? Levels of set codes (and the Journey)
// made by test/g7.wasm and by the mutant, both in the JS's mode (or the port's with --port): the
// specs where they differ.
const fs = require('fs'), path = require('path');
const O = require('path').join(__dirname, '..');
const R = require(O + '/ref.cjs'); const { G } = R.js(); globalThis.MFGame = G;
const MF = require(require('path').join(__dirname, '../../../../web/generator.js'));
const args = process.argv.slice(2), port = args.includes('--port');
const [mutant, ...codes] = args.filter(a => a !== '--port');
const mk = f => { const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(f)), {}).exports; x.t_js_mode(port ? 0 : 1); return MF.wrap(x, 'wasm'); };
const a = mk(O + '/../test/g7.wasm'), b = mk(mutant);
const fp = lv => JSON.stringify([lv.ropes, lv.mirrors, lv.springs, lv.plan, lv.par, lv.play]);
let n = 0, diff = 0; const ex = [];
for (const code of codes) {
  const o = code === 'J' ? G.DEFAULT : G.parseCode(code);
  for (let i = 0; i < o.count; i++) {
    let x, y;
    try { x = fp(a.generate({ ...o, index: i })); } catch (e) { x = 'none'; }
    try { y = fp(b.generate({ ...o, index: i })); } catch (e) { y = /No board/.test(e.message) ? 'none' : 'TRAP'; }
    n++; if (x !== y) { diff++; ex.push(code + "#" + i); }
  }
}
console.log(`${path.basename(mutant)}${port ? ' (port mode)' : ''}: ${diff} of ${n} levels differ${ex.length ? ': ' + ex.join(' ') : ''}`);
