// G6's review: the report of the shadow classes (shadow-g6.cjs --out). In shadow mode the levels are the
// JS's own and every call to G6's units is also answered by the port and compared; a class passes when
// no call differs. Then the levels the port would make are the JS's, call for call, so the two
// distributions of every quality are one and the same (two-sample KS D = 0), and the null rate is the
// same: this prints that one distribution per class (p10, p50, p90, and how many levels have the
// quality), the calls that differed, the null levels, and the generation time.
//
//   node moonbit/encantis/core/oracle/quality-g6-review.cjs <dir with *.jsonl>
'use strict';
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || '/home/user/mf-core-scratch/review-g6/classes';
const KEYS = ['ropes', 'ropeMean', 'ropeMax', 'par', 'exact', 'parRatio', 'coverage', 'mirrors', 'springs', 'casualWins', 'work', 'challenge', 'target', 'miss',
  'overCeiling', 'interaction', 'joins', 'mutualWaitRopes', 'revisitedRopes', 'branchingDepth', 'largestCoupledGroup', 'manualSlides', 'manualBounces',
  'repeatedRopes', 'automaticRopes', 'usedMirrors', 'usedSprings', 'manualMirrors', 'manualSprings', 'ms'];
const pct = (s, p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
const fmt = x => x === undefined ? '-' : Number.isInteger(x) ? String(x) : x.toFixed(3);
const rows = [];
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')).sort()) {
  const ls = fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
  const labels = [...new Set(ls.map(l => l.label))];
  const bad = ls.reduce((a, l) => a + l.mismatches, 0), nulls = ls.filter(l => !l.q).length;
  const grids = {}; for (const l of ls) if (l.q) grids[l.q.grid] = (grids[l.q.grid] || 0) + 1;
  const sizes = [...new Set(ls.filter(l => l.q).map(l => `${l.q.W}x${l.q.H}`))];
  console.log(`${bad ? 'FAIL' : 'ok  '} class ${f.replace('.jsonl', '')} (${labels.join(', ')}): ${ls.length} levels, ${nulls} null, calls that differ ${bad}; grids ${JSON.stringify(grids)}; sizes ${sizes.slice(0, 6).join(' ')}${sizes.length > 6 ? ' ...' : ''}; ` +
    `generation ${(ls.reduce((a, l) => a + l.ms, 0) / 1000).toFixed(1)} s`);
  console.log(`      JS = port (identical per call): quality  n  p10  p50  p90`);
  for (const k of KEYS) {
    const xs = ls.map(l => k === 'ms' ? l.ms : l.q && l.q[k]).filter(x => x !== null && x !== undefined).sort((a, b) => a - b);
    if (!xs.length) continue;
    console.log(`        ${k.padEnd(20)} ${String(xs.length).padStart(4)}  ${fmt(pct(xs, .1)).padStart(7)} ${fmt(pct(xs, .5)).padStart(7)} ${fmt(pct(xs, .9)).padStart(7)}`);
  }
  rows.push({ f, n: ls.length, bad, nulls });
}
const total = rows.reduce((a, r) => a + r.n, 0), bad = rows.reduce((a, r) => a + r.bad, 0);
console.log(`${bad ? 'FAIL' : 'ok  '} ${rows.length} classes, ${total} levels, ${bad} calls that differ, ${rows.reduce((a, r) => a + r.nulls, 0)} null levels (the same on both sides by construction)`);
process.exit(bad ? 1 : 0);
