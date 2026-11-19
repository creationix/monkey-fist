// A deeper look at one class: more seed sets a side, the JS's mode against the port's, pooled.
//   node deep-class.cjs <class> <js suffixes, comma> <port suffixes, comma> [metrics, comma]
const O = require('path').join(__dirname, '..');
const Q = require(O + '/quality-g7-review.cjs'), QH = require(O + '/quality-hexbuild.cjs');
const fs = require('fs');
const argv = process.argv.slice(2), outIdx = argv.indexOf('--out'), OUT = outIdx >= 0 ? argv.splice(outIdx, 2)[1] : null;
const inIdx = argv.indexOf('--in'), IN = inIdx >= 0 ? argv.splice(inIdx, 2)[1].split(',') : null;
const [cls, jsS, portS, ks] = argv;
const keys = ks ? ks.split(',') : Q.KEYS;
const sides = { js: [], port: [] };
if (IN) for (const f of IN) for (const l of fs.readFileSync(f, 'utf8').trim().split('\n')) { const r = JSON.parse(l); sides[r.side].push(r); }
else for (const { spec, rep } of Q.levelsOf(cls)) {
  for (const [side, sfx, mode] of [...jsS.split(',').map(s => ['js', s, 1]), ...portS.split(',').map(s => ['port', s, 0])]) {
    const r = Q.row(spec, Q.make({ ...spec, seed: spec.seed + sfx + rep }, mode));
    sides[side].push(r);
    if (OUT) fs.appendFileSync(OUT, JSON.stringify({ side, sfx, ...r }) + '\n');
  }
}
const ok = s => s.filter(r => r.ok);
console.log(`${cls}: JS ${sides.js.length} (${sides.js.length - ok(sides.js).length} none), port ${sides.port.length} (${sides.port.length - ok(sides.port).length} none)`);
for (const k of keys) {
  const v = s => ok(s).filter(r => r[k] !== null && r[k] !== undefined).map(r => r[k]);
  const a = v(sides.js), b = v(sides.port); if (!a.length) continue;
  const d = QH.ks(a, b), c = QH.ksCritical(a.length, b.length), mean = x => x.reduce((s, y) => s + y, 0) / x.length;
  console.log(`  ${k.padEnd(20)} mean JS ${mean(a).toFixed(3)} port ${mean(b).toFixed(3)}  D ${d.toFixed(3)} crit ${c.toFixed(3)}${d >= c ? '  REJECT' : ''}`);
}
