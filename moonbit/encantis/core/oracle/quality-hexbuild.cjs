// G4's quality oracle: the levels made with the Encantis hex_build against the JS's own, as
// distributions over many seeds (the owner's decision of 19 Nov: generation may differ as long
// as the levels keep the same qualities). Two parts:
//
//   node quality-hexbuild.cjs --builder [--seeds 10]
//        hex_build alone, on the cfgs of fixtures/hexbuild-expected.json from other states: the
//        JS on seed sets A and B, the port (as the core runs it) on set C. Each port build is
//        checked valid by the JS's own kernels; the outputs' distributions are compared.
//   node quality-hexbuild.cjs --levels <class> --set A|B|C [--part k/n] [--out dir]
//        whole levels from the 9e69e3a generator (F.generate): sets A and B as the JS makes them,
//        set C with H.build replaced by the port (hybrid.cjs). One JSON line per level.
//   node quality-hexbuild.cjs --report [--out dir]
//        the comparisons of every class whose three sets are complete.
//
// Seeds. Each class is a list of specs (game-engine.js's spec(), so every size, difficulty
// and mechanic is the game's own); set S gives each spec the seed spec.seed + S (+ the repeat),
// so the three sets share every spec and differ only in their seeds, and the spread between A
// and B, both the JS, is the yardstick for noise.
//
// The rule, fixed before any set C was looked at:
//   - every set-C level is valid by the exact kernels (below), and every port build too;
//   - for each metric, a two-sample Kolmogorov-Smirnov test of C against A and B pooled must not
//     reject at the 1% level (D below 1.628 * sqrt((n + m) / (n m))). The same test of A against
//     B is reported beside it, as the yardstick. With some 25 metrics per class about one in four
//     classes may fail one metric by chance at that level; a failure is then looked at, not
//     waived;
//   - the failure rate (levels the generator gives up on) by a two-sided test of proportions at
//     1%, C against A and B pooled;
//   - the 10th, 50th and 90th percentiles of every metric are printed for A, B and C;
//   - draws and time are printed but not tested: they are what the departures change.
// Validity of a set-C level: the size and grid of its spec; ropes inside the board, two cells or
// more, each step to a neighbour, no cell twice; the plan replays to an empty board with G.replay
// and its player taps are the stated par (exact or not); mirrors where the spec asks for them,
// spinners where it asks for them. Validity of a port build: the same rope checks, no rope on a
// mirror, the core's ropes first and as given, and intentions(level, stops, plan) of the JS
// replays it, with the depth and cost it states.
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs');
const D = require('./dump-hexbuild.cjs');
const Y = require('./hybrid.cjs');
const C = require('./check-hexbuild.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const OUT = opt('--out', '/home/user/mf-core-scratch/g4/quality');
const WASM = opt('--wasm', path.join(__dirname, '../test/g4.wasm'));

// --- Classes ---

// [code, indexes] lists; 'J' is the Journey. Each class has 200 levels or more per set.
const range = n => Array.from({ length: n }, (_, i) => i);
const CLASSES = {
  journey: { reps: 4, specs: [['J', range(120)]] },   // its 60 Hex levels, 4 seeds each
  small: { reps: 1, specs: [['U3-H-1-100-4-5-50-N-QA', range(50)], ['U3-H-1-100-6-6-50-N-QB', range(50)], ['U3-H-1-100-8-8-50-M-QC', range(50)], ['U3-H-1-100-8-8-50-MS-QD', range(50)]] },
  medium: { reps: 1, specs: [['U3-H-1-100-12-12-50-N-QE', range(50)], ['U3-H-1-100-12-12-50-M-QF', range(50)], ['U3-H-1-100-16-10-50-N-QG', range(50)], ['U3-H-1-100-16-16-50-M-QH', range(50)]] },
  large: { reps: 1, specs: [['U3-H-1-100-20-20-50-N-QI', range(50)], ['U3-H-1-100-20-20-50-M-QJ', range(50)], ['U3-H-1-100-24-24-50-N-QK', range(50)], ['U3-H-1-100-24-24-50-M-QL', range(50)]] },
  colossal32: { reps: 1, specs: [['U3-H-1-100-32-32-100-C-QM', range(100)], ['U3-H-1-100-32-32-100-MC-QN', range(100)]] },
  colossal48: { reps: 1, specs: [['U3-H-1-100-48-48-100-C-QO', range(100)], ['U3-H-1-100-48-48-100-MC-QP', range(100)]] },
  mixed: { reps: 1, specs: [['U3-M-1-100-10-14-100-N-QQ', range(100)], ['U3-M-1-100-12-12-100-M-QR', range(100)]] },
};

// The levels of a class: { key, spec } in a fixed order (Hex specs only, but for mixed sets).
function levelsOf(name) {
  const { G } = R.js(), cls = CLASSES[name], out = [];
  for (const [code, idx] of cls.specs) {
    const o = code === 'J' ? G.DEFAULT : G.parseCode(code);
    if (!o) throw Error('invalid code ' + code);
    for (const i of idx) {
      const s = G.spec(o, i);
      if (code === 'J' && s.grid !== 'hex') continue;
      for (let r = 0; r < cls.reps; r++) out.push({ key: `${code}#${i}${cls.reps > 1 ? '/' + r : ''}`, spec: s, rep: r });
    }
  }
  return out;
}

// --- Validity ---

const inside = (W_, H_, p) => p.r >= 0 && p.r < H_ && p.q + Math.floor(p.r / 2) >= 0 && p.q + Math.floor(p.r / 2) < W_;
const DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
const SQ = [[1, 0], [0, 1], [-1, 0], [0, -1]];
// Rope checks: inside, two cells or more, neighbour steps, no cell twice. A list of problems.
function ropeProblems(b, hex = true) {
  const bad = [], seen = new Set(), dirs = hex ? DIRS : SQ;
  const ins = hex ? p => inside(b.W, b.H, p) : p => p.q >= 0 && p.r >= 0 && p.q < b.W && p.r < b.H;
  b.ropes.forEach((path, i) => {
    if (path.length < 2) bad.push(`rope ${i} has ${path.length} cells`);
    path.forEach((p, j) => {
      if (!ins(p)) bad.push(`rope ${i} leaves the board at ${p.q},${p.r}`);
      const k = p.q + ',' + p.r; if (seen.has(k)) bad.push(`cell ${k} twice`); seen.add(k);
      if (j && !dirs.some(([dq, dr]) => p.q - path[j - 1].q === dq && p.r - path[j - 1].r === dr)) bad.push(`rope ${i} jumps at ${j}`);
    });
  });
  return bad;
}
function levelProblems(lv, spec) {
  const { G } = R.js(), bad = [];
  if (lv.W !== spec.W || lv.H !== spec.H || lv.grid !== spec.grid) bad.push('size or grid');
  bad.push(...ropeProblems(lv, lv.grid === 'hex'));
  const r = G.replay(lv, lv.plan);
  if (!r.solved) bad.push('the plan does not clear the board');
  else if (r.taps !== lv.par) bad.push(`the plan takes ${r.taps} player taps, par is ${lv.par}`);
  if (spec.mirrors && !lv.mirrors.length) bad.push('no mirrors');
  if (spec.springs && !lv.springs.length) bad.push('no spinners');
  return bad;
}

// --- Metrics of a level ---

const target = d => R.js().F.targetChallenge(d), ceiling = d => R.js().F.winCeiling(d);
function metrics(lv, spec) {
  const lens = lv.ropes.map(p => p.length), cs = lv.constructionStats || {}, q = lv.complexity || {}, ms = lv.mechanicStats || {};
  const challenge = lv.play.challenge, wins = lv.play.casualWins;
  return {
    par: lv.par, exact: lv.exact ? 1 : 0, ropes: lv.ropes.length, meanLength: lens.reduce((a, b) => a + b, 0) / lens.length, longest: Math.max(...lens),
    coverage: lv.coverage, wins, work: lv.play.work, challenge, offTarget: Math.abs(challenge - target(spec.difficulty)), overCeiling: Math.max(0, wins - ceiling(spec.difficulty)),
    manualSlides: lv.slideStats.manualSlides, repeatedRopes: lv.slideStats.repeatedRopes, interleavedRopes: lv.slideStats.interleavedRopes, automaticRopes: lv.slideStats.automaticRopes,
    knots: cs.intendedSlides ?? 0, traps: cs.traps ?? 0, depth: cs.depth ?? 0, averageDepth: cs.averageDepth ?? 0,
    mirrors: lv.mirrors.length, spinners: lv.springs.length, manualMirrors: ms.manualMirrors ?? 0,
    interaction: q.interaction ?? 0, joins: q.joins ?? 0, mutualWaitRopes: q.mutualWaitRopes ?? 0, branchingDepth: q.branchingDepth ?? 0, largestCoupledGroup: q.largestCoupledGroup ?? 0,
  };
}

// --- Statistics ---

const quantile = (xs, p) => { const s = [...xs].sort((a, b) => a - b); if (!s.length) return NaN; const h = (s.length - 1) * p, lo = Math.floor(h); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (h - lo); };
function ks(a, b) {
  const x = [...a].sort((p, q) => p - q), y = [...b].sort((p, q) => p - q);
  let i = 0, j = 0, d = 0;
  while (i < x.length && j < y.length) {
    const v = Math.min(x[i], y[j]);
    while (i < x.length && x[i] === v) i++;
    while (j < y.length && y[j] === v) j++;
    d = Math.max(d, Math.abs(i / x.length - j / y.length));
  }
  return d;
}
const ksCritical = (n, m, c = 1.628) => c * Math.sqrt((n + m) / (n * m));
// Two-sided test of proportions at 1%: |z| < 2.576.
function proportions(k1, n1, k2, n2) { const p = (k1 + k2) / (n1 + n2), se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2)); return se ? (k1 / n1 - k2 / n2) / se : 0; }

// --- Builder part ---

function builderPart(seeds) {
  const { H } = R.js();
  const HI = C.internals();
  const port = W.load(WASM); port.x.t_draw_exact(0);
  const cases = D.read().cases;
  const sets = { A: [], B: [], C: [] }, bad = [];
  const seedOf = (c, set, k) => C.otherSeed(c.state, { A: 1000, B: 2000, C: 3000 }[set] + k);
  const row = (b, ms, draws) => b ? { ok: 1, ropes: b.ropes.length, cells: b.ropes.reduce((s, p) => s + p.length, 0), meanLength: b.ropes.reduce((s, p) => s + p.length, 0) / b.ropes.length,
    slides: b.slides, traps: b.traps, depth: b.depth, cost: b.cost, plan: b.plan.length, draws, ms } : { ok: 0, draws, ms };
  for (const c of cases) for (let k = 0; k < seeds; k++) {
    for (const set of ['A', 'B']) {
      const [, cfg] = D.argsOf(c), rng = R.mulberry32(seedOf(c, set, k)), before = R.draws(), t = performance.now();
      const b = H.build(rng, cfg);
      const ms = performance.now() - t;
      sets[set].push(row(b && { ropes: b.ropes, slides: b.slides, traps: b.traps, depth: b.stats.depth, cost: Math.round(b.stats.averageDepth * b.ropes.length), plan: b.plan }, ms, R.draws() - before));
    }
    port.push(C.cfgWords(c.cfg));
    const t = performance.now();
    const ok = port.x.t_build(seedOf(c, 'C', k) | 0, c.cfg.coverage, c.cfg.tapDepth);
    const ms = performance.now() - t, draws = port.x.draws();
    if (!ok) { sets.C.push(row(null, ms, draws)); continue; }
    const got = C.readBuilt(port.out());
    const b = { W: c.cfg.W, H: c.cfg.H, ropes: got.ropes.map(p => p.map(([q, r]) => ({ q, r }))) };
    const why = ropeProblems(b);
    const mirrorCells = new Set(c.cfg.mirrors.map(([q, r]) => q + ',' + r));
    for (const p of b.ropes) for (const x of p) if (mirrorCells.has(x.q + ',' + x.r)) why.push('a rope on a mirror');
    c.cfg.initialRopes.forEach((p, i) => { if (JSON.stringify(got.ropes[i]) !== JSON.stringify(p)) why.push(`core rope ${i} changed`); });
    const level = { ...b, ...(c.cfg.mirrors.length ? { mirrors: c.cfg.mirrors.map(([q, r, axis]) => ({ cell: { q, r }, axis })) } : {}) };
    const t2 = HI.intentions(level, got.stops, got.plan);
    if (!t2) why.push('intentions(level, stops, plan) fails');
    else if (t2.depth !== got.depth || t2.cost !== got.cost) why.push('depth or cost');
    if (why.length) bad.push({ id: c.id, from: c.from, why });
    sets.C.push(row(got, ms, draws));
  }
  return { sets, bad };
}

// Prints the comparison of three sets of rows on the given metrics; returns the failures.
// `free` are reported but not tested: what the departures change on purpose (draws, time).
function compare(title, sets, keys, okKey = 'ok', free = []) {
  const fails = [];
  const A = sets.A, B = sets.B, Cs = sets.C;
  const okRate = s => s.filter(r => r[okKey]).length;
  const z = proportions(okRate(Cs), Cs.length, okRate(A) + okRate(B), A.length + B.length);
  const zAB = proportions(okRate(A), A.length, okRate(B), B.length);
  console.log(`\n${title}: ${A.length} / ${B.length} / ${Cs.length} (A / B / C); failed or null: ${A.length - okRate(A)} / ${B.length - okRate(B)} / ${Cs.length - okRate(Cs)} (z C vs AB ${z.toFixed(2)}, A vs B ${zAB.toFixed(2)})${Math.abs(z) >= 2.576 ? '  FAIL' : ''}`);
  if (Math.abs(z) >= 2.576) fails.push(title + ' failure rate');
  console.log('  metric'.padEnd(22) + 'A p10 / p50 / p90'.padEnd(26) + 'B p10 / p50 / p90'.padEnd(26) + 'C p10 / p50 / p90'.padEnd(26) + 'KS A-B   KS C-AB  crit');
  const f = v => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(3));
  for (const k of [...keys, ...free]) {
    const va = A.filter(r => r[okKey]).map(r => r[k]), vb = B.filter(r => r[okKey]).map(r => r[k]), vc = Cs.filter(r => r[okKey]).map(r => r[k]);
    if (!va.length || !vc.length) continue;
    const q3 = v => [0.1, 0.5, 0.9].map(p => f(quantile(v, p))).join(' / ');
    const dAB = ks(va, vb), dC = ks(vc, [...va, ...vb]), crit = ksCritical(vc.length, va.length + vb.length), critAB = ksCritical(va.length, vb.length);
    const fail = dC >= crit && !free.includes(k);
    if (fail) fails.push(`${title} ${k}`);
    console.log(`  ${k.padEnd(20)}${q3(va).padEnd(26)}${q3(vb).padEnd(26)}${q3(vc).padEnd(26)}${dAB.toFixed(3)}${dAB >= critAB ? '*' : ' '}   ${dC.toFixed(3)}   ${crit.toFixed(3)}${fail ? '  FAIL' : free.includes(k) ? '  (not tested)' : ''}`);
  }
  return fails;
}

// --- Levels part ---

function levelsPart(name, set, part) {
  const { F, G } = R.js();
  if (set === 'C') Y.install(WASM, { exact: false });
  const all = levelsOf(name);
  const [k, n] = (part || '0/1').split('/').map(Number);
  const mine = all.filter((_, i) => i % n === k);
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${name}-${set}-${k}of${n}.jsonl`);
  const done = new Set(fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l).key) : []);
  for (const { key, spec, rep } of mine) {
    if (done.has(key)) continue;   // resumable after a restart
    const details = { ...spec, seed: spec.seed + set + (rep || '') };
    const t = performance.now();
    const before = set === 'C' ? Y.calls() : null;
    let row;
    try {
      const lv = F.generate(details, G);
      const ms = performance.now() - t;
      row = { key, ok: 1, grid: spec.grid, d: spec.difficulty, ms, ...metrics(lv, spec) };
      if (set === 'C') { const why = levelProblems(lv, spec); if (why.length) row.invalid = why; }
    } catch (e) {
      if (!/Could not densely weave/.test(e.message)) throw e;
      row = { key, ok: 0, grid: spec.grid, d: spec.difficulty, ms: performance.now() - t };
    }
    if (set === 'C') { const after = Y.calls(); row.buildMs = after.ms - before.ms; row.builds = after.builds - before.builds; }
    fs.appendFileSync(file, JSON.stringify(row) + '\n');
  }
}

function readSet(name, set) {
  const rows = [];
  for (const f of fs.existsSync(OUT) ? fs.readdirSync(OUT) : []) if (f.startsWith(name + '-' + set + '-')) for (const l of fs.readFileSync(path.join(OUT, f), 'utf8').trim().split('\n')) if (l) rows.push(JSON.parse(l));
  return rows;
}

const LEVEL_KEYS = ['par', 'exact', 'ropes', 'meanLength', 'longest', 'coverage', 'wins', 'work', 'challenge', 'offTarget', 'overCeiling', 'manualSlides', 'repeatedRopes', 'interleavedRopes',
  'automaticRopes', 'knots', 'traps', 'depth', 'averageDepth', 'mirrors', 'spinners', 'manualMirrors', 'interaction', 'joins', 'mutualWaitRopes', 'branchingDepth', 'largestCoupledGroup'];

if (require.main === module) {
  if (args.includes('--builder')) {
    const seeds = Number(opt('--seeds', 10)), t = Date.now();
    const { sets, bad } = builderPart(seeds);
    console.log(`builder part: ${seeds} seeds per cfg of the fixture (250 cfgs), ${((Date.now() - t) / 1000).toFixed(0)} s; port builds invalid: ${bad.length}`);
    for (const b of bad.slice(0, 10)) console.log('INVALID', b.id, b.from, b.why.join('; '));
    const fails = compare('hex_build outputs', sets, ['ropes', 'cells', 'meanLength', 'slides', 'traps', 'depth', 'cost', 'plan'], 'ok', ['draws', 'ms']);
    console.log(`\n${fails.length} failed: ${fails.join(', ') || 'none'}`);
    process.exit(bad.length ? 1 : 0);
  } else if (args.includes('--levels')) {
    levelsPart(opt('--levels'), opt('--set'), opt('--part', '0/1'));
  } else if (args.includes('--report')) {
    let fails = [], invalid = 0, total = 0;
    for (const name of Object.keys(CLASSES)) {
      const want = levelsOf(name).length;
      const sets = { A: readSet(name, 'A'), B: readSet(name, 'B'), C: readSet(name, 'C') };
      if (Object.values(sets).some(s => s.length < want)) { console.log(`\n${name}: incomplete (${Object.values(sets).map(s => s.length).join(' / ')} of ${want})`); continue; }
      const bad = sets.C.filter(r => r.invalid); invalid += bad.length; total += sets.C.length;
      for (const r of bad.slice(0, 5)) console.log('INVALID', name, r.key, r.invalid.join('; '));
      fails.push(...compare(name, sets, LEVEL_KEYS, 'ok', ['ms']));
      const buildMs = sets.C.reduce((s, r) => s + (r.buildMs || 0), 0), allMs = sets.C.reduce((s, r) => s + r.ms, 0);
      const jsMs = (sets.A.reduce((s, r) => s + r.ms, 0) + sets.B.reduce((s, r) => s + r.ms, 0)) / 2;
      console.log(`  time: the JS ${(jsMs / 1000).toFixed(1)} s a set; with the port ${(allMs / 1000).toFixed(1)} s, of which hex_build ${(buildMs / 1000).toFixed(1)} s`);
    }
    console.log(`\nset-C levels invalid: ${invalid} of ${total}; ${fails.length} metric tests failed: ${fails.join(', ') || 'none'}`);
  }
}

module.exports = { CLASSES, levelsOf, metrics, levelProblems, ropeProblems, ks, ksCritical };
