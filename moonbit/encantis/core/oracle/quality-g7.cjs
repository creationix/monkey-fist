// G7's quality oracle: whole levels made by the port's own generator (core.wasm's mode: test/g7.wasm
// with t_js_mode(0)) against the JS generator's own, as distributions over many seeds (the owner's
// decision of 19 Nov: generation may differ as long as the levels keep the same qualities).
//
//   node quality-g7.cjs --levels <class> --set G|C [--part k/n]   the port's levels, one JSON line each
//   node quality-g7.cjs --report                                    the comparisons
//
// The classes are G4's (quality-hexbuild.cjs's CLASSES): the Journey's Hex specifications 4 times,
// small (4x5 to 8x8, plain, mirrors, mirrors and spinners), medium (12x12 to 16x16), large (20x20 to
// 24x24), the 32x32 and 48x48 colossal maps, and mixed sets (square and Hex, 10x14 and 12x12 with
// mirrors), difficulties 1 to 100: 200 levels a class or more. Each class's specs are the game's own
// (game-engine.js spec()); a set S gives each spec the seed spec.seed + S. The JS's sets A and B
// are G4's (fixtures/quality-g4.jsonl.gz: F.generate at 9e69e3a, the same specs, seeds + 'A' and +
// 'B'), and their spread is the yardstick for noise. The port's set G has seeds + 'G'. The square
// levels of mixed are the JS's own on the same seeds (nothing departs there), so they enter the
// comparison as they are.
//
// Set C, beside it: seeds + 'C', the seeds of G4's set C, which G4 made with the JS generator and the
// port's hex_build (hybrid.cjs, the default mode). Every other part of the port draws as the JS
// does, so the whole port must make those very levels: the cheaper check (c) of the owner's
// decision, metric for metric. A difference there is reported, not failed.
//
// The rule, fixed before any set G was looked at (19 Nov, about 12:20), as G4's:
//   - every set-G level is valid by the JS's exact kernels: the spec's size and grid; ropes inside
//     the board, two cells or more, each step to a neighbour, no cell twice; the plan replays to an
//     empty board with G.replay at the stated par; mirrors and spinners where the spec asks for them
//     (quality-hexbuild.cjs's levelProblems);
//   - for each metric, a two-sample Kolmogorov-Smirnov test of G against A and B pooled must not
//     reject at the 1% level (D below 1.628 sqrt((n + m) / (n m))); A against B is printed beside it;
//     the builder's own counts (knots, depth, averageDepth) on Hex levels only, the square builder
//     not reporting them through the ABI;
//   - the failure rate (levels the generator gives up on), G against A and B pooled, by a two-sided
//     test of proportions at 1%;
//   - the 10th, 50th and 90th percentiles of every metric are printed for A, B and G;
//   - time is printed, not tested; a failure is looked at with a replicate set, not waived.
// The metrics are quality-hexbuild.cjs's metrics(): par, exact, ropes, rope lengths (mean, longest),
// coverage, the casual win rate, work, challenge, its distance from the target and the excess over
// the win ceiling, manual slides, repeated, interleaved and automatic ropes, the knots and traps
// built, the certificate's depth and average depth, mirrors, spinners, mirrors used by hand, and the
// interaction analysis (interaction, joins, mutual waits, branching depth, the largest coupled group;
// the JS's Q.analyze of the level, as the generator measures it, colossal maps left out).
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const R = require('./ref.cjs');
const QH = require('./quality-hexbuild.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const OUT = opt('--out', '/home/user/mf-core-scratch/g7/quality');
const WASM = opt('--wasm', path.join(__dirname, '../test/g7.wasm'));
const JS_ROWS = path.join(__dirname, 'fixtures/quality-g4.jsonl.gz');
const HEX_ONLY = ['knots', 'depth', 'averageDepth'];
const KEYS = ['par', 'exact', 'ropes', 'meanLength', 'longest', 'coverage', 'wins', 'work', 'challenge', 'offTarget', 'overCeiling', 'manualSlides', 'repeatedRopes', 'interleavedRopes',
  'automaticRopes', 'knots', 'traps', 'depth', 'averageDepth', 'mirrors', 'spinners', 'manualMirrors', 'interaction', 'joins', 'mutualWaitRopes', 'branchingDepth', 'largestCoupledGroup'];

let port = null;
function load() {
  if (port) return port;
  const { G } = R.js();
  globalThis.MFGame = G;
  const MF = require(path.join(__dirname, '../../../web/generator.js'));
  const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(WASM)), {}).exports;
  x.t_js_mode(0);
  port = { x, gen: MF.wrap(x, 'wasm') };
  return port;
}
const read = x => { const n = x.out_len(), o = new Array(n); for (let i = 0; i < n; i++) o[i] = x.out_get(i); return o; };

// A level of the port as the JS generator returns one: the board, play, slideStats (with
// interleavedRopes from the core's ropes), mechanicStats, constructionStats, complexity.
function portLevel(details) {
  const { G, Q } = R.js(), { x, gen } = load();
  const lv = gen.generateSpec(details);   // throws when no board fits
  x.t_built();
  const [knots, traps, depth, cost, seeded] = read(x);
  const plan = lv.plan.slice(0, lv.par), first = seeded ? plan.findIndex(i => i < seeded) : -1, last = seeded ? plan.findLastIndex(i => i < seeded) : -1;
  lv.slideStats.interleavedRopes = first < 0 ? 0 : new Set(plan.slice(first, last + 1).filter(i => i >= seeded)).size;
  lv.constructionStats = lv.grid === 'hex' ? { intendedSlides: knots, traps, depth, averageDepth: cost / lv.ropes.length } : { traps };
  lv.complexity = details.colossal ? null : Q.analyze(lv, lv.plan, lv.par, G);
  return lv;
}

function levelsPart(name, set, part) {
  const all = QH.levelsOf(name);
  const [k, n] = (part || '0/1').split('/').map(Number);
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${name}-${set}-${k}of${n}.jsonl`);
  const done = new Set(fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l).key) : []);
  for (const [i, { key, spec, rep }] of all.entries()) {
    if (i % n !== k || done.has(key)) continue;   // resumable after a restart
    const details = { ...spec, seed: spec.seed + set + (rep || '') };
    const t = performance.now();
    let row;
    try {
      const lv = portLevel(details);
      const ms = performance.now() - t;
      row = { key, ok: 1, grid: spec.grid, d: spec.difficulty, ms, peak: load().x.stack_peak(), ...QH.metrics(lv, spec) };
      if (lv.grid !== 'hex') for (const h of HEX_ONLY) row[h] = null;
      const why = QH.levelProblems(lv, spec);
      if (why.length) row.invalid = why;
    } catch (e) {
      if (!/No board fits/.test(e.message)) throw e;
      row = { key, ok: 0, grid: spec.grid, d: spec.difficulty, ms: performance.now() - t };
    }
    fs.appendFileSync(file, JSON.stringify(row) + '\n');
  }
}

function readSet(name, set) {
  if (set === 'A' || set === 'B' || set === 'C4') {
    const want = set === 'C4' ? 'C' : set;
    return zlib.gunzipSync(fs.readFileSync(JS_ROWS)).toString().trim().split('\n').map(l => JSON.parse(l)).filter(r => r.class === name && r.set === want);
  }
  const rows = [];
  for (const f of fs.existsSync(OUT) ? fs.readdirSync(OUT) : []) if (f.startsWith(name + '-' + set + '-')) for (const l of fs.readFileSync(path.join(OUT, f), 'utf8').trim().split('\n')) if (l) rows.push(JSON.parse(l));
  return rows;
}

function compare(name, A, B, Gs) {
  const fails = [], f = v => (v === null || Number.isNaN(v) ? '-' : Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(3));
  const ok = s => s.filter(r => r.ok);
  const z = (k1, n1, k2, n2) => { const p = (k1 + k2) / (n1 + n2), se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2)); return se ? (k1 / n1 - k2 / n2) / se : 0; };
  const zG = z(ok(Gs).length, Gs.length, ok(A).length + ok(B).length, A.length + B.length), zAB = z(ok(A).length, A.length, ok(B).length, B.length);
  console.log(`\n${name}: ${A.length} / ${B.length} / ${Gs.length} levels (A / B / G); given up on: ${A.length - ok(A).length} / ${B.length - ok(B).length} / ${Gs.length - ok(Gs).length} (z G vs AB ${zG.toFixed(2)}, A vs B ${zAB.toFixed(2)})${Math.abs(zG) >= 2.576 ? '  FAIL' : ''}`);
  if (Math.abs(zG) >= 2.576) fails.push(name + ' failure rate');
  console.log('  metric'.padEnd(22) + 'A p10 / p50 / p90'.padEnd(26) + 'B p10 / p50 / p90'.padEnd(26) + 'G p10 / p50 / p90'.padEnd(26) + 'KS A-B   KS G-AB  crit');
  for (const k of [...KEYS, 'ms']) {
    const keep = r => r.ok && r[k] !== null && r[k] !== undefined && (!HEX_ONLY.includes(k) || r.grid === 'hex');
    const va = A.filter(keep).map(r => r[k]), vb = B.filter(keep).map(r => r[k]), vg = Gs.filter(keep).map(r => r[k]);
    if (!va.length || !vg.length) continue;
    const q3 = v => [0.1, 0.5, 0.9].map(p => f(quantile(v, p))).join(" / ");
    const dAB = QH.ks(va, vb), dG = QH.ks(vg, [...va, ...vb]), crit = QH.ksCritical(vg.length, va.length + vb.length), critAB = QH.ksCritical(va.length, vb.length);
    const tested = k !== 'ms', fail = tested && dG >= crit;
    if (fail) fails.push(`${name} ${k}`);
    console.log(`  ${k.padEnd(20)}${q3(va).padEnd(26)}${q3(vb).padEnd(26)}${q3(vg).padEnd(26)}${dAB.toFixed(3)}${dAB >= critAB ? '*' : ' '}   ${dG.toFixed(3)}   ${crit.toFixed(3)}${fail ? '  FAIL' : tested ? '' : '  (not tested)'}`);
  }
  return fails;
}
const quantile = (xs, p) => { const s = [...xs].sort((a, b) => a - b); if (!s.length) return NaN; const h = (s.length - 1) * p, lo = Math.floor(h); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (h - lo); };

function report() {
  let fails = [], invalid = 0, total = 0, same = 0, compared = 0, diffs = [];
  for (const name of Object.keys(QH.CLASSES)) {
    const want = QH.levelsOf(name).length;
    const A = readSet(name, 'A'), B = readSet(name, 'B'), Gs = readSet(name, 'G');
    if ([A, B, Gs].some(s => s.length < want)) { console.log(`\n${name}: incomplete (${[A, B, Gs].map(s => s.length).join(' / ')} of ${want})`); continue; }
    const bad = Gs.filter(r => r.invalid); invalid += bad.length; total += Gs.length;
    for (const r of bad.slice(0, 5)) console.log('INVALID', name, r.key, r.invalid.join('; '));
    fails.push(...compare(name, A, B, Gs));
    const jsMs = (A.reduce((s, r) => s + r.ms, 0) + B.reduce((s, r) => s + r.ms, 0)) / 2, gMs = Gs.reduce((s, r) => s + r.ms, 0);
    const peak = Math.max(...Gs.filter(r => r.peak).map(r => r.peak));
    console.log(`  time: the JS ${(jsMs / 1000).toFixed(1)} s a set; the port ${(gMs / 1000).toFixed(1)} s (with the JS's Q.analyze of each level); stack peak ${(peak / 1048576).toFixed(2)} MiB`);
    // check (c): seeds + 'C', against G4's set C (the JS generator with the port's hex_build)
    const C7 = readSet(name, 'C'), C4 = new Map(readSet(name, 'C4').map(r => [r.key, r]));
    for (const r of C7) {
      const o = C4.get(r.key); if (!o) continue;
      compared++;
      const keys = ['ok', ...KEYS.filter(k => !HEX_ONLY.includes(k) || r.grid === 'hex')];
      const d = keys.filter(k => JSON.stringify(r[k] ?? null) !== JSON.stringify(o[k] ?? null) && !(typeof r[k] === 'number' && Math.abs(r[k] - o[k]) < 1e-9));
      if (d.length) diffs.push(`${r.key}: ${d.join(',')}`); else same++;
    }
  }
  console.log(`\nset-G levels invalid: ${invalid} of ${total}; ${fails.length} tests failed: ${fails.join(', ') || 'none'}`);
  console.log(`check (c), seeds + 'C': ${same} of ${compared} levels equal G4's set C in every metric${diffs.length ? '; differ: ' + diffs.slice(0, 8).join(' | ') : ''}`);
}

if (args.includes('--levels')) levelsPart(opt('--levels'), opt('--set'), opt('--part', '0/1'));
else if (args.includes('--report')) report();
