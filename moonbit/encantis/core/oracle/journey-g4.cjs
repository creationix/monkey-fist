// G4's review. node journey-g4.cjs [wasm]: the 120 Journey levels three ways: the JS (9e69e3a), the JS generator with the port's
// hex_build in draw-exact mode, and in the default mode. Compares whole levels (JSON of every field), and
// layoutKey + par against reference.json.
const R = require('./ref.cjs');
const Y = require('./hybrid.cjs');
const WASM = process.argv[2] || require('path').join(__dirname, '../test/g4.wasm');
const { G } = R.js();
const ref = R.boards().filter(b => b.name.startsWith('L'));
const run = mode => {
  if (mode === 'js') Y.uninstall(); else Y.install(WASM, { exact: mode === 'exact' });
  const out = [], t0 = Date.now();
  for (let i = 0; i < 120; i++) { try { out.push(G.generate({ ...G.DEFAULT, index: i })); } catch (e) { if (!/densely/.test(e.message)) throw e; out.push(null); } }
  return { out, ms: Date.now() - t0, calls: Y.calls() };
};
const js = run('js'), exact = run('exact'), lean = run('lean');
const strip = lv => lv && JSON.stringify(lv);
for (const [name, r] of [['js', js], ['exact', exact], ['lean', lean]]) {
  let refSame = 0, jsSame = 0, fails = [], differ = [];
  r.out.forEach((lv, i) => {
    if (!lv) { fails.push(ref[i].name); return; }
    if (lv.layoutKey === ref[i].layoutKey && lv.par === ref[i].par) refSame++;
    if (strip(lv) === strip(js.out[i])) jsSame++; else differ.push(ref[i].name + (lv.grid === 'hex' ? 'h' : 's'));
  });
  console.log(`${name}: ${refSame}/120 match reference.json (layoutKey, par); ${jsSame}/120 identical to the JS's level (every field); ` +
    `${fails.length} not generated ${fails.join(' ')}; differ ${differ.length}${differ.length ? ': ' + differ.join(' ') : ''}; ${r.ms} ms; port ${JSON.stringify(r.calls)}`);
  // the Journey's seeds were chosen for closeness to the target challenge: how close the Hex levels land
  const { F } = R.js(), hex = r.out.map((lv, i) => [lv, G.spec(G.DEFAULT, i)]).filter(([lv, s]) => s.grid === 'hex' && lv);
  const off = hex.map(([lv, s]) => Math.abs(lv.play.challenge - F.targetChallenge(s.difficulty)));
  const within = off.filter(x => x <= 0.5).length;
  console.log(`  ${name}: Hex levels generated ${hex.length}; mean |challenge - target| ${(off.reduce((a, b) => a + b, 0) / off.length).toFixed(3)}; within 0.5: ${within}`);
}
