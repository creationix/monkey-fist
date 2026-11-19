// The measurement's summary of generation quality: every spec class compared so far, the port's own
// generator (core.wasm's mode) against the JS generator on two seed sets, with the JS-against-JS
// spread as the yardstick (the owner's oracle for generation, 19 Nov 2026).
//
//   node quality-summary.cjs [--rows <dir of quality-g7-review rows>]      (fixtures/quality-summary.txt)
//
// Part 1 reads the two committed reports, fixtures/quality-g7-report.txt (G7: G4's 7 classes, sets A
// and B the JS at 9e69e3a, G the port) and fixtures/quality-g7-review-report.txt (G7's review: 18
// classes, A and B the JS's mode of test/g7.wasm, P the port), and gives per class: the specs, the
// levels each set gave up on, and for the tested metrics the largest KS distance of the port against
// the JS's two sets pooled as a share of its 1% critical value, beside the largest distance between
// the JS's own two sets as a share of theirs (the noise the yardstick allows).
// Part 2 reads the review's rows (fixtures/quality-g7-review.jsonl.gz, the review's
// /home/user/mf-core-scratch/review-g7/quality concatenated; or a directory of them with --rows) and pools the 18 review classes (the three sets share every spec, so the pooled mixtures are alike) and
// prints, per metric, both distributions (p10 / p50 / p90 and the mean of A, B and P), D(A,B),
// D(P, A+B) and its critical value.
'use strict';
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const ROWS = opt('--rows', null);
const crit = (n, m) => 1.628 * Math.sqrt((n + m) / (n * m));
const NOT_TESTED = ['ms', 'draws', 'peak'];

function parseReport(file, portSet) {
  const classes = [];
  let cur = null;
  for (const line of fs.readFileSync(path.join(__dirname, 'fixtures', file), 'utf8').split('\n')) {
    let m;
    if ((m = /^(\w+): (\d+) specs; given up on A (\d+), B (\d+), P (\d+)/.exec(line))) {
      cur = { name: m[1], n: +m[2], nA: +m[2], gA: +m[3], gB: +m[4], gP: +m[5], metrics: [] }; classes.push(cur);
    } else if ((m = /^(\w+): (\d+) \/ (\d+) \/ (\d+) levels \(A \/ B \/ G\); given up on: (\d+) \/ (\d+) \/ (\d+)/.exec(line))) {
      cur = { name: m[1], n: +m[2], nA: +m[2], gA: +m[5], gB: +m[6], gP: +m[7], metrics: [] }; classes.push(cur);
    } else if (cur && (m = /^  (\w+)\s.*\s(\d\.\d{3})\*?\s+(\d\.\d{3})\s+(\d\.\d{3})(?:\s{2}.*)?$/.exec(line)) && m[1] !== 'metric' && !NOT_TESTED.includes(m[1])) {
      cur.metrics.push({ k: m[1], dAB: +m[2], dP: +m[3], crit: +m[4] });
    }
  }
  for (const c of classes) {
    const nA = c.n - c.gA, nB = c.n - c.gB, cAB = crit(nA, nB);
    let worstP = null, worstAB = null, below = 0;
    for (const x of c.metrics) {
      if (!worstP || x.dP / x.crit > worstP.r) worstP = { k: x.k, d: x.dP, c: x.crit, r: x.dP / x.crit };
      if (!worstAB || x.dAB / cAB > worstAB.r) worstAB = { k: x.k, d: x.dAB, c: cAB, r: x.dAB / cAB };
      if (x.dP <= x.dAB) below++;
    }
    Object.assign(c, { worstP, worstAB, below, rejected: c.metrics.filter(x => x.dP >= x.crit).length, portSet });
  }
  return classes;
}

const all = [...parseReport('quality-g7-report.txt', 'G'), ...parseReport('quality-g7-review-report.txt', 'P')];
console.log('Part 1: every class (KS at 1%: D(port, JS A+B) against its critical value; D(JS A, JS B) against its own)\n');
console.log('class'.padEnd(13) + 'specs  given up A/B/port  metrics  rejected  largest D(port,A+B)/crit           largest D(A,B)/crit                D(port) <= D(A,B)');
let tests = 0, rej = 0, maxP = 0, maxAB = 0;
for (const c of all) {
  tests += c.metrics.length; rej += c.rejected; maxP = Math.max(maxP, c.worstP.r); maxAB = Math.max(maxAB, c.worstAB.r);
  console.log(`${c.name.padEnd(13)}${String(c.n).padStart(5)}  ${`${c.gA} / ${c.gB} / ${c.gP}`.padEnd(18)}${String(c.metrics.length).padStart(7)}  ${String(c.rejected).padStart(8)}  ` +
    `${`${c.worstP.k} ${c.worstP.d.toFixed(3)}/${c.worstP.c.toFixed(3)} = ${c.worstP.r.toFixed(2)}`.padEnd(35)}${`${c.worstAB.k} ${c.worstAB.d.toFixed(3)}/${c.worstAB.c.toFixed(3)} = ${c.worstAB.r.toFixed(2)}`.padEnd(35)}${c.below} of ${c.metrics.length}`);
}
const specs = all.reduce((a, c) => a + c.n, 0);
console.log(`\n${all.length} classes, ${specs} specs a set, ${tests} KS tests, ${rej} rejected; the largest port distance is ${maxP.toFixed(2)} of its critical value, the largest JS-JS distance ${maxAB.toFixed(2)} of its own.`);

// Part 2: pooled distributions over the review's 18 classes.
const texts = ROWS ? fs.readdirSync(ROWS).filter(f => f.endsWith('.jsonl')).map(f => fs.readFileSync(path.join(ROWS, f), 'utf8'))
  : [require('zlib').gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures/quality-g7-review.jsonl.gz'))).toString('utf8')];
const byKey = new Map();
for (const text of texts)
  for (const l of text.trim().split('\n')) if (l) {
    const r = JSON.parse(l); if (r.sets.P2) continue;  // the replicates are apart
    const o = byKey.get(r.key) || { key: r.key, grid: r.grid, sets: {} }; Object.assign(o.sets, r.sets); byKey.set(r.key, o);
  }
const rows = [...byKey.values()].filter(r => r.sets.A && r.sets.B && r.sets.P);
const ks = (a, b) => {
  const x = [...a].sort((p, q) => p - q), y = [...b].sort((p, q) => p - q); let i = 0, j = 0, d = 0;
  while (i < x.length && j < y.length) { const v = Math.min(x[i], y[j]); while (i < x.length && x[i] <= v) i++; while (j < y.length && y[j] <= v) j++; d = Math.max(d, Math.abs(i / x.length - j / y.length)); }
  return d;
};
const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); const h = (s.length - 1) * p, lo = Math.floor(h); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (h - lo); };
const f = v => Math.abs(v) >= 1000 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(3);
const KEYS = ['par', 'exact', 'ropes', 'meanLength', 'longest', 'coverage', 'wins', 'work', 'challenge', 'offTarget', 'overCeiling', 'manualSlides', 'bounces', 'repeatedRopes',
  'automaticRopes', 'knots', 'traps', 'depth', 'averageDepth', 'mirrors', 'spinners', 'manualMirrors', 'manualSprings', 'turns', 'interaction', 'joins', 'mutualWaitRopes',
  'branchingDepth', 'largestCoupledGroup', 'revisited', 'edges', 'cxDepth', 'ms', 'draws', 'peak'];
const sets = { A: rows.map(r => r.sets.A), B: rows.map(r => r.sets.B), P: rows.map(r => r.sets.P) };
const gaveUp = k => sets[k].filter(s => !s.ok).length;
console.log(`\nPart 2: the review's 18 classes pooled: ${rows.length} specs a set; given up on A ${gaveUp('A')}, B ${gaveUp('B')}, P ${gaveUp('P')}`);
console.log('metric'.padEnd(20) + 'JS A p10 / p50 / p90 (mean)'.padEnd(36) + 'JS B p10 / p50 / p90 (mean)'.padEnd(36) + 'port p10 / p50 / p90 (mean)'.padEnd(36) + 'D(A,B)  D(P,A+B)  crit');
for (const k of KEYS) {
  const v = s => sets[s].filter(x => x.ok && x[k] !== null && x[k] !== undefined).map(x => x[k]);
  const a = v('A'), b = v('B'), p = v('P');
  if (!a.length || !p.length) continue;
  const show = xs => `${f(q(xs, 0.1))} / ${f(q(xs, 0.5))} / ${f(q(xs, 0.9))} (${f(xs.reduce((s, x) => s + x, 0) / xs.length)})`;
  console.log(`${k.padEnd(20)}${show(a).padEnd(36)}${show(b).padEnd(36)}${show(p).padEnd(36)}${ks(a, b).toFixed(3)}   ${ks(p, [...a, ...b]).toFixed(3)}    ${crit(p.length, a.length + b.length).toFixed(3)}${NOT_TESTED.includes(k) ? '  (not a quality: time in ms, draws, stack peak in bytes)' : ''}`);
}
