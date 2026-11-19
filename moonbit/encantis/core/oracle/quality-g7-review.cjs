// G7's review: whole levels of the port's own generator (core.wasm's mode) against the JS
// generator's, on spec classes and seeds G4 and G7 never used, with every port level re-measured by
// the JS's exact kernels (the owner's decision of 19 Nov: the rules and the measurements of a given
// board stay exact; generation may differ if the levels keep the same qualities).
//
//   node quality-g7-review.cjs --levels <class> [--part k/n]   four sets per level, one JSON line a level
//   node quality-g7-review.cjs --spot <class> [--n 4]          the real JS's F.generate on set A's seeds
//   node quality-g7-review.cjs --report [--classes a,b]        the comparisons (fixtures/quality-g7-review-report.txt)
//
// The sets, made in one process level by level (interleaved, so that load affects them alike):
//   A, B  test/g7.wasm in the JS's mode, seeds spec.seed + 'RA' and + 'RB': the JS generator (that
//         mode is the JS's, level for level: 135 + 60 levels, 556,393 unit values; --spot checks it
//         again on these classes against F.generate itself). A against B is the yardstick for noise.
//   P     the port's own mode (t_js_mode(0), core.wasm's), seeds + 'RP';
//   Q     the JS's mode on P's seeds: check (c). A square level of P must equal Q's (nothing departs
//         on square); a Hex one may (counted, not failed).
//
// The rule, fixed before any level of these classes was made (19 Nov 2026, 13:25 UTC):
//   1. Every P level is valid and measures as it says, by the JS's kernels at 9e69e3a: the spec's grid
//      and size; ropes of two cells or more on the board, in steps, no cell twice (quality-hexbuild's
//      levelProblems); the plan replays to an empty board at par (G.replay); mirrors and spinners where
//      the spec asks; F.valid; F.coverage equal to the stored coverage and at least the floor;
//      manualSlides, manualBounces, repeatedRopes and automaticRopes equal to the replay's events; a
//      slide where the coverage is below 0.85; par * 3 at least the ropes; not all free at the start;
//      F.featureStats of the plan equal to the stored mechanicStats, every mirror and spinner used, the
//      spec's minimum by hand; the stored win rate equal, bit for bit, to F.casualRate at the seed
//      'casual/<seed>/<attempt>' of one of the ten attempts (32 games, 10 with spinners; colossal: 1);
//      the challenge work + 6 (1 - wins) to 3 places. Any problem fails the review (a rules mismatch).
//   2. Per class and metric, the two-sample Kolmogorov-Smirnov test of P against A and B pooled must
//      not reject at 1% (D < 1.628 sqrt((n + m) / (n m))); A against B is printed beside it. A rejection
//      is re-tested on a replicate: P2 (seeds + 'RP2') against A and B; it fails only if that rejects too.
//   3. The share of specs the generator gives up on, P against A and B pooled, by a two-sided test of
//      proportions at 1% (|z| < 2.576), with the same replicate rule.
//   4. Generation time (generate_spec alone, the four sets interleaved): P's class total and its median
//      per level must not both exceed 1.2 times A and B's (mean of the two). Printed per class.
//   5. --spot: F.generate on set A's first n specs of each class equals set A's level, field by field
//      (board, plan, par, exact, coverage, wins, challenge, stats); the JS's time is printed.
//   The 10th, 50th and 90th percentiles of every metric are printed for A, B and P.
// The metrics: quality-hexbuild's (par, exact, ropes, mean and longest rope, coverage, wins, work,
// challenge, its miss from the target, the excess over the win ceiling, manual slides, repeated,
// interleaved (0: the ABI does not say) and automatic ropes, knots, traps, depth and average depth of
// the Hex builder, mirrors, spinners, manual mirrors, interaction, joins, mutual waits, branching depth,
// largest coupled group), and bounces, manual spinners, turns, revisited ropes, edges and the
// dependency depth (Q.analyze of the JS, as the generator measures a level; colossal maps left out).
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs');
const QH = require('./quality-hexbuild.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const OUT = opt('--out', '/home/user/mf-core-scratch/review-g7/quality');
const WASM = opt('--wasm', path.join(__dirname, '../test/g7.wasm'));
const range = n => Array.from({ length: n }, (_, i) => i);

const CLASSES = {
  journey: { reps: 4, specs: [['J', range(120)]] },   // the Journey's 60 Hex specs, 4 seeds each
  hexS: { specs: [['U3-H-1-100-10-10-200-S-RV7A', range(200)]] },
  hexMS: { specs: [['U3-H-1-100-14-12-200-MS-RV7B', range(200)]] },
  strips: { specs: [['U3-H-1-100-24-8-100-M-RV7C', range(100)], ['U3-H-1-100-8-24-100-MS-RV7D', range(100)]] },
  thin: { specs: [['U3-H-1-100-24-4-100-N-RV7E', range(100)], ['U3-H-1-100-4-24-100-N-RV7F', range(100)]] },
  tiny: { specs: [['U3-H-1-100-4-4-100-N-RV7G', range(100)], ['U3-H-1-100-5-5-100-N-RV7H', range(100)]] },
  high: { specs: [['U3-H-80-100-18-18-200-M-RV7I', range(200)]] },
  low: { specs: [['U3-H-1-20-11-13-200-N-RV7J', range(200)]] },
  largeMS: { specs: [['U3-H-1-100-24-24-200-MS-RV7K', range(200)]] },
  colossalS: { specs: [['U3-H-1-100-32-32-100-MSC-RV7L', range(100)], ['U3-H-1-100-48-48-100-SC-RV7M', range(100)]] },
  colossalOdd: { specs: [['U3-H-1-100-40-40-100-C-RV7N', range(100)], ['U3-H-1-100-8-48-100-MC-RV7O', range(100)]] },
  mixedMS: { specs: [['U3-M-1-100-16-12-200-MS-RV7P', range(200)]] },
  square: { specs: [['U3-S-1-100-20-20-100-MS-RV7Q', range(100)], ['U3-S-1-100-6-7-100-N-RV7R', range(100)]] },
};

function levelsOf(name) {
  const { G } = R.js(), cls = CLASSES[name], out = [], reps = cls.reps || 1;
  for (const [code, idx] of cls.specs) {
    const o = code === 'J' ? G.DEFAULT : G.parseCode(code);
    if (!o) throw Error('invalid code ' + code);
    for (const i of idx) {
      const s = G.spec(o, i);
      if (code === 'J' && s.grid !== 'hex') continue;
      for (let r = 0; r < reps; r++) out.push({ key: `${code}#${i}${reps > 1 ? '/' + r : ''}`, spec: s, rep: reps > 1 ? String(r) : '' });
    }
  }
  return out;
}

// --- The wasm, in either mode ---
let W = null;
function load() {
  if (W) return W;
  const { G } = R.js();
  globalThis.MFGame = G;
  const MF = require(path.join(__dirname, '../../../web/generator.js'));
  const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(WASM)), {}).exports;
  W = { x, gen: MF.wrap(x, 'wasm') };
  return W;
}
const read = x => { const n = x.out_len(), o = new Array(n); for (let i = 0; i < n; i++) o[i] = x.out_get(i); return o; };

// A level as the JS generator returns one, made by the wasm in mode js (1) or the port's (0); its
// generate_spec time; or null if no board fits.
function make(details, js) {
  const { x, gen } = load();
  x.t_js_mode(js);
  const d0 = x.draws(), t = performance.now();
  let lv;
  try { lv = gen.generateSpec(details); } catch (e) { if (!/No board fits/.test(e.message)) throw e; return { lv: null, ms: performance.now() - t }; }
  const ms = performance.now() - t, peak = x.stack_peak(), draws = (x.draws() - d0) | 0;
  x.t_built();
  const [knots, traps, depth, cost] = read(x);
  lv.slideStats.interleavedRopes = 0;
  lv.constructionStats = lv.grid === 'hex' ? { intendedSlides: knots, traps, depth, averageDepth: cost / lv.ropes.length } : { traps };
  return { lv, ms, peak, draws };
}

const turnsOf = lv => { let t = 0; for (const p of lv.ropes) for (let k = 2; k < p.length; k++) if (p[k].q - p[k - 1].q !== p[k - 1].q - p[k - 2].q || p[k].r - p[k - 1].r !== p[k - 1].r - p[k - 2].r) t++; return t; };
const fingerprint = lv => JSON.stringify({ grid: lv.grid, W: lv.W, H: lv.H, ropes: lv.ropes, mirrors: lv.mirrors, springs: lv.springs, plan: lv.plan, par: lv.par, exact: !!lv.exact,
  coverage: lv.coverage, wins: lv.play.casualWins, challenge: lv.play.challenge, work: lv.play.work,
  stats: [lv.slideStats.manualSlides, lv.slideStats.manualBounces, lv.slideStats.repeatedRopes, lv.slideStats.automaticRopes], mech: lv.mechanicStats || null });

function row(spec, made) {
  const { G, Q } = R.js();
  if (!made.lv) return { ok: 0, grid: spec.grid, ms: made.ms };
  const lv = made.lv;
  const cx = spec.colossal ? null : Q.analyze(lv, lv.plan, lv.par, G);
  lv.complexity = cx;
  const out = { ok: 1, grid: lv.grid, ms: made.ms, peak: made.peak, draws: made.draws, ...QH.metrics(lv, spec),
    bounces: lv.slideStats.manualBounces, manualSprings: lv.mechanicStats ? lv.mechanicStats.manualSprings : 0, turns: turnsOf(lv),
    revisited: cx ? cx.revisitedRopes : null, edges: cx ? cx.edges : null, cxDepth: cx ? cx.depth : null, fp: fingerprint(lv) };
  if (lv.grid !== 'hex') for (const h of ['knots', 'depth', 'averageDepth']) out[h] = null;
  if (spec.colossal) for (const h of ['interaction', 'joins', 'mutualWaitRopes', 'branchingDepth', 'largestCoupledGroup']) out[h] = null;
  return out;
}

// Rule 1: the port's level, re-measured by the JS's kernels. A list of problems.
function exactProblems(lv, details) {
  const { G, F, L } = R.js(), bad = [...QH.levelProblems(lv, details)];
  if (!F.valid(lv)) bad.push('F.valid fails');
  const cov = F.coverage(lv);
  if (cov !== lv.coverage) bad.push(`coverage ${lv.coverage}, F.coverage ${cov}`);
  if (cov < (lv.W * lv.H <= 48 ? 0.8 : 0.85)) bad.push('coverage below the floor');
  const played = G.replay(lv, lv.plan), ev = played.events || [];
  const manual = ev.slice(0, lv.par), counts = new Map();
  manual.forEach((e, k) => { if (e === 'slide') counts.set(lv.plan[k], (counts.get(lv.plan[k]) || 0) + 1); });
  const want = [manual.filter(e => e === 'slide').length, manual.filter(e => e === 'bounce').length, [...counts.values()].filter(n => n >= 2).length, ev.slice(lv.par).filter(e => e === 'exit').length];
  const got = [lv.slideStats.manualSlides, lv.slideStats.manualBounces, lv.slideStats.repeatedRopes, lv.slideStats.automaticRopes];
  if (JSON.stringify(want) !== JSON.stringify(got)) bad.push(`slide stats ${got}, the replay's ${want}`);
  if ((details.requireSlide || cov < 0.85) && !ev.includes('slide')) bad.push('no slide where one is needed');
  if (lv.par * 3 < lv.ropes.length) bad.push('par * 3 below the ropes');
  if (G.allFree(lv, lv.ropes)) bad.push('all free at the start');
  if (lv.mirrors.length || lv.springs.length) {
    const fs_ = F.featureStats(lv, lv.plan, lv.par, G);
    if (JSON.stringify(fs_) !== JSON.stringify(lv.mechanicStats)) bad.push(`mechanicStats ${JSON.stringify(lv.mechanicStats)}, F.featureStats ${JSON.stringify(fs_)}`);
    else if (fs_.usedMirrors !== lv.mirrors.length || fs_.usedSprings !== lv.springs.length) bad.push('a mirror or spinner unused');
    else if (fs_.manualMirrors < (details.minMirrors || 0) || fs_.manualSprings < (details.minSprings || 0)) bad.push('fewer by hand than the spec asks');
  } else if (lv.mechanicStats) bad.push('mechanicStats without mechanics');
  const wins = lv.play.casualWins;
  let attempt = -1;
  if (details.colossal) { if (wins !== 1) bad.push('a colossal win rate not 1'); }
  else {
    for (let a = 0; a < 10 && attempt < 0; a++) {
      const w = F.casualRate(lv, G, L.mulberry32(L.hashString('casual/' + details.seed + '/' + a)), lv.springs.length ? 10 : 32);
      if (w === wins) attempt = a;
    }
    if (attempt < 0) bad.push(`win rate ${wins} is no attempt's F.casualRate`);
  }
  const ch = Number(F.challengeOf(lv.play.work, wins).toFixed(3));
  if (ch !== lv.play.challenge || lv.play.work !== lv.slideStats.manualSlides + lv.slideStats.manualBounces) bad.push(`challenge ${lv.play.challenge}, work + 6 (1 - wins) ${ch}`);
  return { bad, attempt };
}

function levelsPart(name, part) {
  const all = levelsOf(name);
  const [k, n] = (part || '0/1').split('/').map(Number);
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${name}-${k}of${n}.jsonl`);
  const done = new Set(fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l).key) : []);
  const replicate = args.includes('--replicate');
  for (const [i, { key, spec, rep }] of all.entries()) {
    if (i % n !== k || done.has(key)) continue;   // resumable after a restart
    const sets = {};
    const sfx = replicate ? { P2: 'RP2' } : { A: 'RA', B: 'RB', P: 'RP', Q: 'RP' };
    for (const [set, s] of Object.entries(sfx)) {
      const details = { ...spec, seed: spec.seed + s + rep };
      const made = make(details, set === 'P' || set === 'P2' ? 0 : 1);
      const r = row(spec, made);
      if ((set === 'P' || set === 'P2') && made.lv) {
        const t = performance.now(), { bad, attempt } = exactProblems(made.lv, details);
        r.checkMs = performance.now() - t; r.attempt = attempt;
        if (bad.length) r.invalid = bad;
      }
      sets[set] = r;
    }
    if (sets.Q) { sets.Q = { ok: sets.Q.ok, same: sets.P.ok ? Number(sets.P.fp === sets.Q.fp) : Number(!sets.Q.ok), ms: sets.Q.ms }; }
    for (const s of Object.values(sets)) delete s.fp;
    fs.appendFileSync(file, JSON.stringify({ key, grid: spec.grid, d: spec.difficulty, sets }) + '\n');
  }
}

function rowsOf(name, replicateToo) {
  const rows = [];
  if (!fs.existsSync(OUT)) return rows;
  for (const f of fs.readdirSync(OUT)) if (f.startsWith(name + '-') && f.endsWith('.jsonl')) for (const l of fs.readFileSync(path.join(OUT, f), 'utf8').trim().split('\n')) if (l) rows.push(JSON.parse(l));
  const byKey = new Map();
  for (const r of rows) { const o = byKey.get(r.key) || { key: r.key, grid: r.grid, d: r.d, sets: {} }; Object.assign(o.sets, r.sets); byKey.set(r.key, o); }
  return [...byKey.values()];
}

// Rule 5: the real JS on set A's first n specs.
function spot(name, n) {
  const { G, F } = R.js(), all = levelsOf(name).slice(0, n);
  const { x, gen } = load();
  let same = 0, none = 0, msJs = 0, msWasm = 0;
  for (const { key, spec, rep } of all) {
    const details = { ...spec, seed: spec.seed + 'RA' + rep };
    let t = performance.now(), js = null;
    try { js = F.generate(details, G); } catch (e) { if (!/Could not densely weave/.test(e.message)) throw e; }
    msJs += performance.now() - t;
    x.t_js_mode(1);
    t = performance.now();
    let w = null;
    try { w = gen.generateSpec(details); } catch (e) { if (!/No board fits/.test(e.message)) throw e; }
    msWasm += performance.now() - t;
    if (!js || !w) { if (!js && !w) { same++; none++; } else console.log(`SPOT DIFFERS ${name} ${key}: JS ${js ? 'a level' : 'none'}, wasm ${w ? 'a level' : 'none'}`); continue; }
    const a = fingerprint({ ...js, mechanicStats: js.mechanicStats || null }), b = fingerprint(w);
    if (a === b && G.layoutKey(js) === w.layoutKey) same++;
    else console.log(`SPOT DIFFERS ${name} ${key}`);
  }
  console.log(`spot ${name}: ${same} of ${all.length} equal (${none} none on both); JS ${(msJs / 1000).toFixed(1)} s, the JS's mode wasm ${(msWasm / 1000).toFixed(2)} s`);
  return same === all.length;
}

const KEYS = ['par', 'exact', 'ropes', 'meanLength', 'longest', 'coverage', 'wins', 'work', 'challenge', 'offTarget', 'overCeiling', 'manualSlides', 'bounces', 'repeatedRopes',
  'automaticRopes', 'knots', 'traps', 'depth', 'averageDepth', 'mirrors', 'spinners', 'manualMirrors', 'manualSprings', 'turns', 'interaction', 'joins', 'mutualWaitRopes',
  'branchingDepth', 'largestCoupledGroup', 'revisited', 'edges', 'cxDepth'];
const quantile = (xs, p) => { const s = [...xs].sort((a, b) => a - b); if (!s.length) return NaN; const h = (s.length - 1) * p, lo = Math.floor(h); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (h - lo); };
const fmt = v => (v === null || Number.isNaN(v) ? '-' : Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(3));

function report() {
  const names = opt('--classes', Object.keys(CLASSES).join(',')).split(',');
  let fails = [], invalid = 0, total = 0, sqSame = 0, sqTotal = 0, hexSame = 0, hexTotal = 0;
  for (const name of names) {
    const rows = rowsOf(name), want = levelsOf(name).length;
    const full = rows.filter(r => r.sets.A && r.sets.B && r.sets.P && r.sets.Q);
    if (full.length < want) { console.log(`\n${name}: incomplete (${full.length} of ${want})`); continue; }
    const A = full.map(r => r.sets.A), B = full.map(r => r.sets.B), P = full.map(r => r.sets.P);
    const P2 = rows.filter(r => r.sets.P2).map(r => r.sets.P2);
    for (const r of [...full, ...rows.filter(x => x.sets.P2)]) for (const s of ['P', 'P2']) if (r.sets[s]) {
      if (r.sets[s].ok) total++;
      if (r.sets[s].invalid) { invalid++; console.log(`INVALID ${name} ${r.key} ${s}: ${r.sets[s].invalid.join('; ')}`); }
    }
    for (const r of full) {
      if (r.grid === 'square') { sqTotal++; sqSame += r.sets.Q.same; if (!r.sets.Q.same) console.log(`CHECK C: square ${name} ${r.key} differs from the JS's mode`); }
      else { hexTotal++; hexSame += r.sets.Q.same; }
    }
    const ok = s => s.filter(r => r.ok);
    const z = QH_proportions(ok(P).length, P.length, ok(A).length + ok(B).length, A.length + B.length);
    const zAB = QH_proportions(ok(A).length, A.length, ok(B).length, B.length);
    let line = `\n${name}: ${full.length} specs; given up on A ${A.length - ok(A).length}, B ${B.length - ok(B).length}, P ${P.length - ok(P).length} (z P vs AB ${z.toFixed(2)}, A vs B ${zAB.toFixed(2)})`;
    if (Math.abs(z) >= 2.576) {
      if (P2.length) { const z2 = QH_proportions(ok(P2).length, P2.length, ok(A).length + ok(B).length, A.length + B.length); line += `; replicate P2 ${P2.length - ok(P2).length} of ${P2.length} (z ${z2.toFixed(2)})`; if (Math.abs(z2) >= 2.576) fails.push(name + ' failure rate'); else line += ' passes'; }
      else { line += '  REJECTED (needs the replicate)'; fails.push(name + ' failure rate (no replicate yet)'); }
    }
    console.log(line);
    console.log('  metric'.padEnd(22) + 'A p10 / p50 / p90'.padEnd(26) + 'B p10 / p50 / p90'.padEnd(26) + 'P p10 / p50 / p90'.padEnd(26) + 'KS A-B   KS P-AB  crit');
    for (const k of [...KEYS, 'ms', 'draws', 'peak']) {
      const keep = r => r.ok && r[k] !== null && r[k] !== undefined;
      const va = A.filter(keep).map(r => r[k]), vb = B.filter(keep).map(r => r[k]), vp = P.filter(keep).map(r => r[k]);
      if (!va.length || !vp.length) continue;
      const q3 = v => [0.1, 0.5, 0.9].map(p => fmt(quantile(v, p))).join(' / ');
      const dAB = QH.ks(va, vb), dP = QH.ks(vp, [...va, ...vb]), crit = QH.ksCritical(vp.length, va.length + vb.length), critAB = QH.ksCritical(va.length, vb.length);
      const tested = !['ms', 'draws', 'peak'].includes(k);
      let note = tested ? '' : '  (not tested)';
      if (tested && dP >= crit) {
        const vp2 = P2.filter(keep).map(r => r[k]);
        if (vp2.length) { const d2 = QH.ks(vp2, [...va, ...vb]), c2 = QH.ksCritical(vp2.length, va.length + vb.length); note = `  rejected; replicate P2 D ${d2.toFixed(3)} (crit ${c2.toFixed(3)}) ${d2 >= c2 ? 'FAIL' : 'passes'}`; if (d2 >= c2) fails.push(`${name} ${k}`); }
        else { note = '  REJECTED (needs the replicate)'; fails.push(`${name} ${k} (no replicate yet)`); }
      }
      console.log(`  ${k.padEnd(20)}${q3(va).padEnd(26)}${q3(vb).padEnd(26)}${q3(vp).padEnd(26)}${dAB.toFixed(3)}${dAB >= critAB ? '*' : ' '}   ${dP.toFixed(3)}   ${crit.toFixed(3)}${note}`);
    }
    // Rule 4: time
    const tot = s => s.reduce((a, r) => a + r.ms, 0), med = s => quantile(s.map(r => r.ms), 0.5);
    const tJ = (tot(A) + tot(B)) / 2, mJ = (med(A) + med(B)) / 2, tP = tot(P), mP = med(P), q = full.map(r => r.sets.Q.ms);
    const slow = tP > 1.2 * tJ && mP > 1.2 * mJ;
    if (slow) fails.push(name + ' generation time');
    const chk = P.reduce((a, r) => a + (r.checkMs || 0), 0);
    console.log(`  time: generate_spec total A ${(tot(A) / 1000).toFixed(1)} s, B ${(tot(B) / 1000).toFixed(1)} s, P ${(tP / 1000).toFixed(1)} s (P / JS's mode ${(tP / tJ).toFixed(2)}x; median ${mP.toFixed(1)} ms against ${mJ.toFixed(1)}, ${(mP / mJ).toFixed(2)}x)${slow ? '  FAIL' : ''}; the JS's re-measure of P ${(chk / 1000).toFixed(1)} s`);
    console.log(`  check (c), P's seeds in the JS's mode: ${full.filter(r => r.grid === 'square' && r.sets.Q.same).length} of ${full.filter(r => r.grid === 'square').length} square levels equal, ${full.filter(r => r.grid === 'hex' && r.sets.Q.same).length} of ${full.filter(r => r.grid === 'hex').length} Hex`);
  }
  console.log(`\nP levels made ${total}, invalid ${invalid}; check (c): square ${sqSame} of ${sqTotal} equal, Hex ${hexSame} of ${hexTotal}; ${fails.length} failures: ${fails.join(', ') || 'none'}`);
  process.exitCode = fails.length || invalid || sqSame !== sqTotal ? 1 : 0;
}
function QH_proportions(k1, n1, k2, n2) { const p = (k1 + k2) / (n1 + n2), se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2)); return se ? (k1 / n1 - k2 / n2) / se : 0; }

if (require.main === module) {
  if (args.includes('--levels')) levelsPart(opt('--levels'), opt('--part'));
  else if (args.includes('--spot')) { if (!spot(opt('--spot'), Number(opt('--n', '4')))) process.exitCode = 1; }
  else if (args.includes('--report')) report();
  else { console.log('usage: --levels <class> [--part k/n] [--replicate] | --spot <class> [--n 4] | --report'); process.exitCode = 2; }
}
module.exports = { CLASSES, levelsOf };
