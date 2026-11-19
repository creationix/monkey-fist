// A global check over every class and metric: if P has the JS's law, the three samples A, B and P are
// exchangeable, so D(A,B) is the smallest of D(A,B), D(P,A), D(P,B) a third of the time (ties shared).
// Far more often would mean P stands apart. Also the mean of each D.
const fs = require('fs'), path = require('path');
const O = require('path').join(__dirname, '..');
const QH = require(O + '/quality-hexbuild.cjs');
const Q = require(O + '/quality-g7-review.cjs');
const DIR = '/home/user/mf-core-scratch/review-g7/quality';
const KEYS = ['par', 'exact', 'ropes', 'meanLength', 'longest', 'coverage', 'wins', 'work', 'challenge', 'offTarget', 'overCeiling', 'manualSlides', 'bounces', 'repeatedRopes',
  'automaticRopes', 'knots', 'traps', 'depth', 'averageDepth', 'mirrors', 'spinners', 'manualMirrors', 'manualSprings', 'turns', 'interaction', 'joins', 'mutualWaitRopes',
  'branchingDepth', 'largestCoupledGroup', 'revisited', 'edges', 'cxDepth'];
let n = 0, abSmallest = 0, sum = { AB: 0, PA: 0, PB: 0 }, perClass = {};
for (const c of Object.keys(Q.CLASSES)) {
  const rows = [];
  for (const f of fs.readdirSync(DIR)) if (f.startsWith(c + '-') && /-\dof3\.jsonl$/.test(f)) for (const l of fs.readFileSync(path.join(DIR, f), 'utf8').trim().split('\n')) if (l) rows.push(JSON.parse(l));
  if (!rows.length) continue;
  let cn = 0, cab = 0;
  for (const k of KEYS) {
    const v = s => rows.map(r => r.sets[s]).filter(r => r && r.ok && r[k] !== null && r[k] !== undefined).map(r => r[k]);
    const a = v('A'), b = v('B'), p = v('P');
    if (!a.length || !p.length) continue;
    const dAB = QH.ks(a, b), dPA = QH.ks(p, a), dPB = QH.ks(p, b);
    if (dAB === 0 && dPA === 0 && dPB === 0) continue;
    const m = Math.min(dAB, dPA, dPB), ties = [dAB, dPA, dPB].filter(d => d === m).length;
    const share = dAB === m ? 1 / ties : 0;
    n++; cn++; abSmallest += share; cab += share; sum.AB += dAB; sum.PA += dPA; sum.PB += dPB;
  }
  perClass[c] = `${cab.toFixed(1)} of ${cn}`;
}
const se = Math.sqrt(n * (1 / 3) * (2 / 3));
console.log(`(class, metric) pairs ${n}; D(A,B) the smallest in ${abSmallest.toFixed(1)} (expected ${(n / 3).toFixed(1)} +- ${se.toFixed(1)} if independent; z ${((abSmallest - n / 3) / se).toFixed(2)})`);
console.log(`mean D: A-B ${(sum.AB / n).toFixed(4)}, P-A ${(sum.PA / n).toFixed(4)}, P-B ${(sum.PB / n).toFixed(4)}`);
console.log('per class (D(A,B) smallest):', JSON.stringify(perClass));
