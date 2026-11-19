// G7's review: a paired test of the port's Journey against the JS's, spec for spec. For each master
// seed, journey-search.cjs runs on both sides with the same plan (kinds, sizes, difficulties, map
// seeds); a Hex position (chapter, slot) has a JS level and a port level of the same specification.
// The difference port - JS of each metric is paired by position.
//
//   node journey-paired-g7-review.cjs <dir with js-SEED/ and port-SEED/ (quality-journey.cjs --out)> [SEED,...]
//
// Why: in G7's quality-journey run (4 master seeds) and the review's (4 more) the Hex interaction of
// the port's chosen levels came out lower both times (KS D 0.100 and 0.071, both under the critical
// 0.149 and the JS seeds' own spread 0.183); pooled over those 8 seeds the paired mean difference is
// -0.167 (t -2.04), which is post hoc and one metric of 26. The generator alone shows no such shift
// (quality-g7-review.cjs, 600 Journey Hex specs and 3,000 Hex levels a set).
//
// The rule, fixed (19 Nov, 14:02) before the 8 new master seeds QJX1 to QJX8 were run: on their Hex
// positions (480 pairs), the paired two-sided t-test of interaction (port - JS) must not reject at 1%
// (|t| < 2.576); the other complexity measures, challenge, casual wins, par and ropes are printed with
// their t, and a rejection of one of them at 1% is reported. The 16 seeds pooled are printed beside.
'use strict';
const fs = require('fs'), path = require('path');
const [dir, list] = process.argv.slice(2);
const seeds = (list || 'QJX1,QJX2,QJX3,QJX4,QJX5,QJX6,QJX7,QJX8').split(',');
const M = {
  interaction: m => m.complexity.interaction, joins: m => m.complexity.joins, mutual: m => m.complexity.mutualWaitRopes,
  revisited: m => m.complexity.revisitedRopes, branching: m => m.complexity.branchingDepth, largest: m => m.complexity.largestCoupledGroup,
  edges: m => m.complexity.edges, depth: m => m.complexity.depth, challenge: m => m.play.challenge, casualWins: m => m.play.casualWins,
  work: m => m.play.work, par: m => m.par, ropes: m => m.ropeCount, coverage: m => m.coverage,
};
const pairs = [];
for (const s of seeds) {
  const js = JSON.parse(fs.readFileSync(path.join(dir, 'js-' + s, 'journey-port-measurements.json'), 'utf8'));
  const po = JSON.parse(fs.readFileSync(path.join(dir, 'port-' + s, 'journey-port-measurements.json'), 'utf8'));
  const key = m => m.chapter + '/' + m.slot, P = new Map(po.map(m => [key(m), m]));
  for (const m of js) if (m.grid === 'hex') pairs.push([m, P.get(key(m))]);
}
let rejected = [];
console.log(`${seeds.length} master seeds, ${pairs.length} Hex pairs`);
for (const [k, f] of Object.entries(M)) {
  const d = pairs.map(([a, b]) => f(b) - f(a)), n = d.length, mean = d.reduce((x, y) => x + y, 0) / n;
  const sd = Math.sqrt(d.reduce((x, y) => x + (y - mean) ** 2, 0) / (n - 1)), t = sd ? mean / (sd / Math.sqrt(n)) : 0;
  const ma = pairs.reduce((x, [a]) => x + f(a), 0) / n, mb = pairs.reduce((x, [, b]) => x + f(b), 0) / n;
  if (Math.abs(t) >= 2.576) rejected.push(k);
  console.log(`  ${k.padEnd(12)} JS ${ma.toFixed(3)}  port ${mb.toFixed(3)}  mean difference ${mean >= 0 ? '+' : ''}${mean.toFixed(3)}  t ${t.toFixed(2)}${Math.abs(t) >= 2.576 ? '  REJECTED at 1%' : ''}`);
}
console.log(rejected.includes('interaction') ? 'interaction: REJECTED (a quality differs)' : 'interaction: not rejected');
console.log(`rejected at 1%: ${rejected.join(', ') || 'none'}`);
process.exitCode = rejected.includes('interaction') ? 1 : 0;
