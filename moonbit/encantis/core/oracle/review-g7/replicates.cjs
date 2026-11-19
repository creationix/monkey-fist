// The replicate sets P2 (seeds + 'RP2') of the classes that came nearest: P2 against A+B, and P+P2
// (400) against A+B (400), every metric, KS at 1%.
const fs = require('fs'), path = require('path');
const O = require('path').join(__dirname, '..');
const QH = require(O + '/quality-hexbuild.cjs');
const KEYS = ['par', 'exact', 'ropes', 'meanLength', 'longest', 'coverage', 'wins', 'work', 'challenge', 'offTarget', 'overCeiling', 'manualSlides', 'bounces', 'repeatedRopes',
  'automaticRopes', 'knots', 'traps', 'depth', 'averageDepth', 'mirrors', 'spinners', 'manualMirrors', 'manualSprings', 'turns', 'interaction', 'joins', 'mutualWaitRopes',
  'branchingDepth', 'largestCoupledGroup', 'revisited', 'edges', 'cxDepth'];
const read = (dir, c) => { const rows = []; for (const f of fs.readdirSync(dir)) if (f.startsWith(c + '-') && f.endsWith('.jsonl')) for (const l of fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n')) if (l) rows.push(JSON.parse(l)); return rows; };
for (const c of process.argv.slice(2)) {
  const main = read('/home/user/mf-core-scratch/review-g7/quality', c), rep = read('/home/user/mf-core-scratch/review-g7/quality-rep', c);
  const A = main.map(r => r.sets.A), B = main.map(r => r.sets.B), P = main.map(r => r.sets.P), P2 = rep.map(r => r.sets.P2);
  const inval = P2.filter(r => r.invalid).length;
  let worst2 = [0, ''], worstPool = [0, ''], rej2 = 0, rejPool = 0, tests = 0;
  for (const k of KEYS) {
    const v = s => s.filter(r => r && r.ok && r[k] !== null && r[k] !== undefined).map(r => r[k]);
    const ab = [...v(A), ...v(B)], p2 = v(P2), pp = [...v(P), ...v(P2)];
    if (!ab.length || !p2.length) continue;
    tests++;
    const d2 = QH.ks(p2, ab), c2 = QH.ksCritical(p2.length, ab.length), dp = QH.ks(pp, ab), cp = QH.ksCritical(pp.length, ab.length);
    if (d2 >= c2) rej2++; if (dp >= cp) rejPool++;
    if (d2 / c2 > worst2[0]) worst2 = [d2 / c2, `${k} ${d2.toFixed(3)} (${c2.toFixed(3)})`];
    if (dp / cp > worstPool[0]) worstPool = [dp / cp, `${k} ${dp.toFixed(3)} (${cp.toFixed(3)})`];
  }
  console.log(`${c}: P2 ${P2.length} levels (${P2.filter(r => !r.ok).length} none, ${inval} invalid); ${tests} metrics; P2 vs A+B rejected ${rej2}, largest ${worst2[1]}; P+P2 vs A+B rejected ${rejPool}, largest ${worstPool[1]}`);
}
