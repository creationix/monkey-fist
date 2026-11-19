// G4's review: the quality oracle of quality-hexbuild.cjs again, on seed sets and spec classes
// it did not use. Whole levels from the 9e69e3a generator (F.generate): sets F and G as the JS
// makes them, set H with H.build replaced by the port (hybrid.cjs, the default mode, as the core
// runs it). Replicate sets, if a test fails: K (the JS) and L (the port).
//
//   node quality-g4-review.cjs --levels <class> --set F|G|H|K|L [--part k/n] [--out dir] [--wasm w]
//   node quality-g4-review.cjs --report [--out dir] [--sets F,G,H]   (JS, JS, port)
//   node quality-g4-review.cjs --list                                the classes and their sizes
//
// The rule, fixed before any set H was looked at (19 Nov, the review):
//   (a) every set-H level is valid by the exact kernels: quality-hexbuild's levelProblems (size and
//       grid, rope shapes, the plan replays to an empty board with the stated par, mirrors and
//       spinners where the spec asks), and also no mirror or spinner under a rope, no two features
//       on one cell, every feature inside the board;
//   (b) for each metric of each class, a two-sample Kolmogorov-Smirnov test of H against F and G
//       pooled must not reject at 1%; F against G is printed beside it as the yardstick. With about
//       40 metrics in 9 classes some 3 or 4 rejections are expected by chance: each one is
//       replicated on fresh sets (K, the JS, and L, the port) for its class, and counts as a real
//       difference only if the port's pooled sets (H, L) still reject against the JS's (F, G, K);
//   (c) the rate of failed generations ("Could not densely weave") by a two-sided test of
//       proportions at 1%, H against F and G, replicated the same way;
//   (d) time: the port's levels must not take longer to generate, class by class (total and
//       median per level, H against the mean of F and G); printed with the hex_build share;
//   (e) the 10th, 50th and 90th percentiles of every metric are printed for F, G and H.
// Classes (each at least 200 levels a set; codes are the game's own, game-engine.js's spec()):
//   journey   the 60 Hex Journey specs x 4 seeds, from 4x6 to 12x14
//   thin      4x24 and 24x4 (no mechanics), 8x24 and 24x8 with mirrors: edge aspect ratios
//   tiny      4x4, 5x4, 4x6, 7x5: the smallest boards
//   spin      spinners at 10x14, 12x12, 16x16 (mirrors and spinners) and 20x20
//   colossalx the colossal rules away from 32 and 48: 12x12, 48x16 with mirrors, 16x48, and
//             20x20 with mirrors and spinners
//   extremes  difficulty 1 to 10 and 90 to 100, 10x14 and 14x14 with mirrors
//   mixed     mixed sets: 14x10 with mirrors and spinners, 18x18 plain (half of them Hex)
//   large     18x22, 22x18 with mirrors, 24x20, 20x24 with mirrors
//   colossal48 48x48 with and without mirrors, again on new seeds
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs');
const Q = require('./quality-hexbuild.cjs');
const Y = require('./hybrid.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const OUT = opt('--out', '/home/user/mf-core-scratch/review-g4/quality');
const WASM = opt('--wasm', path.join(__dirname, '../test/g4.wasm'));
const PORT_SETS = new Set(['H', 'L']);

const range = n => Array.from({ length: n }, (_, i) => i);
const CLASSES = {
  journey: { reps: 4, specs: [['J', range(120)]] },
  thin: { reps: 1, specs: [['U3-H-1-100-4-24-50-N-RA', range(50)], ['U3-H-1-100-24-4-50-N-RB', range(50)], ['U3-H-1-100-8-24-50-M-RC', range(50)], ['U3-H-1-100-24-8-50-M-RD', range(50)]] },
  tiny: { reps: 1, specs: [['U3-H-1-100-4-4-50-N-RE', range(50)], ['U3-H-1-100-5-4-50-N-RF', range(50)], ['U3-H-1-100-4-6-50-N-RG', range(50)], ['U3-H-1-100-7-5-50-N-RH', range(50)]] },
  spin: { reps: 1, specs: [['U3-H-1-100-10-14-50-S-RI', range(50)], ['U3-H-1-100-12-12-50-S-RJ', range(50)], ['U3-H-1-100-16-16-50-MS-RK', range(50)], ['U3-H-1-100-20-20-50-S-RL', range(50)]] },
  colossalx: { reps: 1, specs: [['U3-H-1-100-12-12-50-C-RM', range(50)], ['U3-H-1-100-48-16-50-MC-RN', range(50)], ['U3-H-1-100-16-48-50-C-RO', range(50)], ['U3-H-1-100-20-20-50-MSC-RP', range(50)]] },
  extremes: { reps: 1, specs: [['U3-H-1-10-10-14-50-N-RQ', range(50)], ['U3-H-90-100-10-14-50-N-RR', range(50)], ['U3-H-1-10-14-14-50-M-RS', range(50)], ['U3-H-90-100-14-14-50-M-RT', range(50)]] },
  mixed: { reps: 1, specs: [['U3-M-1-100-14-10-100-MS-RU', range(100)], ['U3-M-1-100-18-18-100-N-RV', range(100)]] },
  large: { reps: 1, specs: [['U3-H-1-100-18-22-50-N-RW', range(50)], ['U3-H-1-100-22-18-50-M-RX', range(50)], ['U3-H-1-100-24-20-50-N-RY', range(50)], ['U3-H-1-100-20-24-50-M-RZ', range(50)]] },
  colossal48: { reps: 1, specs: [['U3-H-1-100-48-48-100-C-RC1', range(100)], ['U3-H-1-100-48-48-100-MC-RC2', range(100)]] },
};
// quality-hexbuild's levelsOf reads its own table: these names are added to it.
for (const [k, v] of Object.entries(CLASSES)) Q.CLASSES['review-' + k] = v;
const levelsOf = name => Q.levelsOf('review-' + name);

// --- Validity, beyond levelProblems ---

const key = p => p.q + ',' + p.r;
function featureProblems(lv) {
  const bad = [], rope = new Set(lv.ropes.flat().map(key)), at = new Set();
  const inside = lv.grid === 'hex' ? p => p.r >= 0 && p.r < lv.H && p.q + Math.floor(p.r / 2) >= 0 && p.q + Math.floor(p.r / 2) < lv.W
    : p => p.q >= 0 && p.r >= 0 && p.q < lv.W && p.r < lv.H;
  for (const p of [...lv.mirrors.map(m => m.cell), ...lv.springs]) {
    if (!inside(p)) bad.push(`a feature off the board at ${key(p)}`);
    if (rope.has(key(p))) bad.push(`a feature under a rope at ${key(p)}`);
    if (at.has(key(p))) bad.push(`two features at ${key(p)}`);
    at.add(key(p));
  }
  return bad;
}

// --- Metrics: quality-hexbuild's, and more ---

function bendsOf(path) {
  let n = 0;
  for (let j = 2; j < path.length; j++) {
    const a = path[j - 2], b = path[j - 1], c = path[j];
    if (c.q - b.q !== b.q - a.q || c.r - b.r !== b.r - a.r) n++;
  }
  return n;
}
function metrics(lv, spec) {
  const m = Q.metrics(lv, spec), q = lv.complexity || {}, bends = lv.ropes.map(bendsOf);
  return { ...m, shortest: Math.min(...lv.ropes.map(p => p.length)), bends: bends.reduce((a, b) => a + b, 0), longestBends: Math.max(...bends),
    parRatio: lv.par / lv.ropes.length, edges: q.edges ?? 0, essentialEdges: q.essentialEdges ?? 0, forks: q.forks ?? 0, dependencyDepth: q.depth ?? 0,
    mutualWaitGroups: q.mutualWaitGroups ?? 0, coupledGroups: q.coupledGroups ?? 0, manualBounces: lv.slideStats.manualBounces ?? 0 };
}
const KEYS = [...['par', 'exact', 'ropes', 'meanLength', 'longest', 'coverage', 'wins', 'work', 'challenge', 'offTarget', 'overCeiling', 'manualSlides', 'repeatedRopes', 'interleavedRopes',
  'automaticRopes', 'knots', 'traps', 'depth', 'averageDepth', 'mirrors', 'spinners', 'manualMirrors', 'interaction', 'joins', 'mutualWaitRopes', 'branchingDepth', 'largestCoupledGroup'],
  'shortest', 'bends', 'longestBends', 'parRatio', 'edges', 'essentialEdges', 'forks', 'dependencyDepth', 'mutualWaitGroups', 'coupledGroups', 'manualBounces', 'builds', 'nullBuilds'];

// --- Levels ---

// Counts H.build's calls (whoever answers them) without changing what they return.
let counter = null;
function countBuilds() {
  const { H } = R.js(), inner = H.build;
  counter = { calls: 0, nulls: 0, ms: 0 };
  H.build = (rng, cfg) => {
    counter.calls++;
    const t = performance.now();
    try { const r = inner(rng, cfg); if (!r) counter.nulls++; return r; } finally { counter.ms += performance.now() - t; }
  };
}

function levelsPart(name, set, part) {
  const { F, G } = R.js();
  const PORT = PORT_SETS.has(set);
  if (PORT) Y.install(WASM, { exact: false });
  countBuilds();
  const all = levelsOf(name);
  const [k, n] = (part || '0/1').split('/').map(Number);
  const mine = all.filter((_, i) => i % n === k);
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${name}-${set}-${k}of${n}.jsonl`);
  const done = new Set(fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l).key) : []);
  for (const { key: lk, spec, rep } of mine) {
    if (done.has(lk)) continue;   // resumable after a restart
    const details = { ...spec, seed: spec.seed + set + (rep || '') };
    const before = { ...counter };
    const t = performance.now();
    let row;
    try {
      const lv = F.generate(details, G);
      const ms = performance.now() - t;
      row = { key: lk, ok: 1, grid: spec.grid, d: spec.difficulty, ms, ...metrics(lv, spec) };
      const why = [...Q.levelProblems(lv, spec), ...featureProblems(lv)];
      if (why.length) row.invalid = why;
    } catch (e) {
      if (!/Could not densely weave/.test(e.message)) throw e;
      row = { key: lk, ok: 0, grid: spec.grid, d: spec.difficulty, ms: performance.now() - t };
    }
    row.builds = counter.calls - before.calls; row.nullBuilds = counter.nulls - before.nulls; row.buildMs = counter.ms - before.ms;
    fs.appendFileSync(file, JSON.stringify(row) + '\n');
  }
}

function readSet(name, set) {
  const rows = [];
  for (const f of fs.existsSync(OUT) ? fs.readdirSync(OUT) : []) if (f.startsWith(name + '-' + set + '-') && f.endsWith('.jsonl'))
    for (const l of fs.readFileSync(path.join(OUT, f), 'utf8').trim().split('\n')) if (l) rows.push(JSON.parse(l));
  return rows;
}

// --- Report ---

const quantile = (xs, p) => { const s = [...xs].sort((a, b) => a - b); if (!s.length) return NaN; const h = (s.length - 1) * p, lo = Math.floor(h); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (h - lo); };
function proportions(k1, n1, k2, n2) { const p = (k1 + k2) / (n1 + n2), se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2)); return se ? (k1 / n1 - k2 / n2) / se : 0; }
const fmt = v => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(3));

// js: [set rows, set rows, ...] (the first two give the yardstick), port: [rows, ...]. The failures.
function compare(title, js, port, keys) {
  const fails = [], J = js.flat(), P = port.flat(), ok = s => s.filter(r => r.ok);
  const z = proportions(P.length - ok(P).length, P.length, J.length - ok(J).length, J.length);
  const zJJ = proportions(js[0].length - ok(js[0]).length, js[0].length, js[1].length - ok(js[1]).length, js[1].length);
  console.log(`\n${title}: ${js.map(s => s.length).join(' / ')} JS, ${port.map(s => s.length).join(' / ')} port; failed: ${js.map(s => s.length - ok(s).length).join(' / ')} JS, ${port.map(s => s.length - ok(s).length).join(' / ')} port (z port vs JS ${z.toFixed(2)}, JS vs JS ${zJJ.toFixed(2)})${Math.abs(z) >= 2.576 ? '  FAIL' : ''}`);
  if (Math.abs(z) >= 2.576) fails.push(title + ' failure rate');
  console.log('  metric'.padEnd(22) + 'JS1 p10 / p50 / p90'.padEnd(26) + 'JS2 p10 / p50 / p90'.padEnd(26) + 'port p10 / p50 / p90'.padEnd(26) + 'KS JS-JS  KS port-JS  crit');
  for (const k of keys) {
    const v1 = ok(js[0]).map(r => r[k]), v2 = ok(js[1]).map(r => r[k]), vj = ok(J).map(r => r[k]), vp = ok(P).map(r => r[k]);
    if (!v1.length || !vp.length || vp.some(x => x === undefined)) continue;
    const q3 = v => [0.1, 0.5, 0.9].map(p => fmt(quantile(v, p))).join(' / ');
    const dJJ = Q.ks(v1, v2), dP = Q.ks(vp, vj), crit = Q.ksCritical(vp.length, vj.length), critJJ = Q.ksCritical(v1.length, v2.length);
    const fail = dP >= crit;
    if (fail) fails.push(`${title} ${k}`);
    console.log(`  ${k.padEnd(20)}${q3(v1).padEnd(26)}${q3(v2).padEnd(26)}${q3(vp).padEnd(26)}${dJJ.toFixed(3)}${dJJ >= critJJ ? '*' : ' '}    ${dP.toFixed(3)}      ${crit.toFixed(3)}${fail ? '  FAIL' : ''}`);
  }
  const sum = (s, f) => s.reduce((a, r) => a + (r[f] || 0), 0), med = (s, f) => quantile(s.map(r => r[f]), 0.5);
  const jsMs = js.reduce((a, s) => a + sum(s, 'ms'), 0) / js.length, pMs = port.reduce((a, s) => a + sum(s, 'ms'), 0) / port.length;
  const jsMed = js.reduce((a, s) => a + med(s, 'ms'), 0) / js.length, pMed = port.reduce((a, s) => a + med(s, 'ms'), 0) / port.length;
  const jsB = js.reduce((a, s) => a + sum(s, 'buildMs'), 0) / js.length, pB = port.reduce((a, s) => a + sum(s, 'buildMs'), 0) / port.length;
  const slow = pMs > jsMs || pMed > jsMed;
  console.log(`  time a set: the JS ${(jsMs / 1000).toFixed(1)} s (H.build ${(jsB / 1000).toFixed(1)} s), median ${jsMed.toFixed(0)} ms a level; with the port ${(pMs / 1000).toFixed(1)} s (hex_build ${(pB / 1000).toFixed(1)} s), median ${pMed.toFixed(0)} ms: ${(pMs / jsMs * 100).toFixed(0)}% of the JS's${slow ? '  FAIL (slower)' : ''}`);
  if (slow) fails.push(title + ' time');
  return fails;
}

if (require.main === module) {
  if (args.includes('--list')) {
    for (const name of Object.keys(CLASSES)) console.log(name, levelsOf(name).length);
  } else if (args.includes('--levels')) {
    levelsPart(opt('--levels'), opt('--set'), opt('--part', '0/1'));
  } else if (args.includes('--report')) {
    const [s1, s2, ...rest] = opt('--sets', 'F,G,H').split(',');
    const jsSets = [s1, s2, ...rest.filter(s => !PORT_SETS.has(s))], portSets = rest.filter(s => PORT_SETS.has(s));
    let fails = [], invalid = 0, total = 0;
    for (const name of Object.keys(CLASSES)) {
      const want = levelsOf(name).length;
      const js = jsSets.map(s => readSet(name, s)), port = portSets.map(s => readSet(name, s));
      if ([...js, ...port].some(s => s.length < want)) { console.log(`\n${name}: incomplete (${[...js, ...port].map(s => s.length).join(' / ')} of ${want})`); continue; }
      for (const s of port) for (const r of s) { total++; if (r.invalid) { invalid++; if (invalid <= 10) console.log('INVALID', name, r.key, r.invalid.join('; ')); } }
      for (const s of js) for (const r of s) if (r.invalid) console.log('JS INVALID (the rule itself?)', name, r.key, r.invalid.join('; '));
      fails.push(...compare(name, js, port, KEYS));
      if (name === 'mixed') fails.push(...compare(name + ' (Hex levels only)', js.map(s => s.filter(r => r.grid === 'hex')), port.map(s => s.filter(r => r.grid === 'hex')), KEYS));
    }
    console.log(`\nport levels invalid: ${invalid} of ${total}; ${fails.length} tests failed: ${fails.join(', ') || 'none'}`);
  }
}

module.exports = { CLASSES, levelsOf, metrics, featureProblems, readSet, compare, KEYS };
