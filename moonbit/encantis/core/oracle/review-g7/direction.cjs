// Is there a consistent direction? Per class and metric: P's mean against the mean of A and B, as a
// share of the A-B noise; the sign of P - (A+B)/2 across classes against the sign of A - B.
const fs = require('fs'), path = require('path');
const O = require('path').join(__dirname, '..');
const Q = require(O + '/quality-g7-review.cjs'), QH = require(O + '/quality-hexbuild.cjs');
const DIR = '/home/user/mf-core-scratch/review-g7/quality';
const metrics = (process.argv[2] || 'interaction,edges,joins,cxDepth,largestCoupledGroup,mutualWaitRopes,par,ropes,wins,challenge,coverage,meanLength').split(',');
const hexClasses = Object.keys(Q.CLASSES).filter(c => !['square', 'colossalS', 'colossalOdd'].includes(c));
const pooled = {};
for (const k of metrics) {
  let below = 0, above = 0, abBelow = 0, abAbove = 0; const per = [];
  pooled[k] = { A: [], B: [], P: [] };
  for (const c of hexClasses) {
    const rows = [];
    for (const f of fs.readdirSync(DIR)) if (f.startsWith(c + '-') && /-\dof3\.jsonl$/.test(f)) for (const l of fs.readFileSync(path.join(DIR, f), 'utf8').trim().split('\n')) if (l) rows.push(JSON.parse(l));
    const v = s => rows.map(r => r.sets[s]).filter(r => r && r.ok && r.grid === 'hex' && r[k] !== null && r[k] !== undefined).map(r => r[k]);
    const a = v('A'), b = v('B'), p = v('P'); if (!a.length) continue;
    pooled[k].A.push(...a); pooled[k].B.push(...b); pooled[k].P.push(...p);
    const m = x => x.reduce((s, y) => s + y, 0) / x.length, d = m(p) - (m(a) + m(b)) / 2, dab = m(a) - m(b);
    if (d < 0) below++; else if (d > 0) above++;
    if (dab < 0) abBelow++; else if (dab > 0) abAbove++;
    per.push(`${c} ${d >= 0 ? '+' : ''}${d.toFixed(3)}`);
  }
  const A = pooled[k].A, B = pooled[k].B, P = pooled[k].P, mean = x => x.reduce((s, y) => s + y, 0) / x.length;
  const dP = QH.ks(P, [...A, ...B]), cP = QH.ksCritical(P.length, A.length + B.length), dAB = QH.ks(A, B), cAB = QH.ksCritical(A.length, B.length);
  console.log(`${k.padEnd(20)} classes P below/above (A+B)/2: ${below}/${above}; A below/above B: ${abBelow}/${abAbove}; pooled Hex: mean A ${mean(A).toFixed(3)} B ${mean(B).toFixed(3)} P ${mean(P).toFixed(3)}, D(P,A+B) ${dP.toFixed(3)} (crit ${cP.toFixed(3)}), D(A,B) ${dAB.toFixed(3)} (crit ${cAB.toFixed(3)})`);
}
