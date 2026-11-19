// G6's review: the JS generator of 9e69e3a with every call to G6's units shadowed by the port. Each
// call grid-generator.js makes to valid, coverage, regional, trivial, featuresUsed, featureStats,
// postpone, score and casualRate, and each Q.analyze, is answered by the JS as usual, and the same
// call is also put to test/g6.wasm (through the position words; casualRate with the rng's state
// before the JS draws), and the two answers are compared, casualRate's draws included. So every
// call of real generation is checked, the rejected candidates' too (hybrid-g6.cjs compares the
// levels that come out; a call whose answer changes nothing would pass there), and the level made
// is the JS's own, whatever the port answers.
//
//   node moonbit/encantis/core/oracle/shadow-g6.cjs --codes U3-...,U3-... --count N [--from K] [--out f.jsonl] [test/g6.wasm]
//   node moonbit/encantis/core/oracle/shadow-g6.cjs --journey 1-120 [--out f.jsonl]
//   --spoil KIND (valid, ..., casualRate, analyze): the negative control, one spoiled port answer
//
// Prints, per code: the calls compared by kind, the mismatches (the first few in full), the JS's and
// the port's time per kind, the port's stack peak, and the levels' qualities (p10/p50/p90). --out
// writes one line per level: its qualities, times and mismatches, for quality-g6-review.cjs.
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs'), C = require('./capture.cjs');

const args = process.argv.slice(2);
const VALUED = ['--codes', '--count', '--from', '--out', '--journey', '--spoil'];
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const SPOIL = opt('--spoil', null), CODES = opt('--codes', null), COUNT = Number(opt('--count', 20)), FROM = Number(opt('--from', 0)), OUT = opt('--out', null), JOURNEY = opt('--journey', null);
const WASM = args.find((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1])) || path.join(__dirname, '../test/g6.wasm');

const { F, m } = C.captured(), G = m.G, Q = m.Q;
const port = W.load(WASM);
const list = o => o.slice(1, 1 + o[0]);
const at = (b, plan) => port.push(R.position(b, b.ropes, plan || b.plan || []));

// The port's answer to each unit, in the JS's shape (the hybrid's UNITS), and what to compare.
const PORT = {
  valid: b => { at(b); return port.x.t_valid() === 1; },
  coverage: b => { at(b); return port.x.t_coverage(); },
  regional: b => { at(b); return port.x.t_regional() === 1; },
  trivial: b => { at(b); return port.x.t_trivial() === 1; },
  featuresUsed: b => { at(b); return port.x.t_features_used() === 1; },
  featureStats: (b, plan, manual) => {
    at(b, plan);
    if (!port.x.t_feature_stats(manual)) return null;
    const o = port.out();
    return { usedMirrors: o[0], usedSprings: o[1], manualMirrors: o[2], manualSprings: o[3] };
  },
  postpone: (b, G_, plan) => { at(b, plan); port.x.t_postpone(); return list(port.out()); },
  score: (b, G_, skip, budget) => {
    if (budget !== undefined && budget !== 2500) throw Error('shadow-g6: score with another budget');
    at(b); port.x.t_score(skip ? 1 : 0);
    const o = port.out();
    return { plan: o.slice(4, 4 + o[3]), par: o[0], exact: o[1] === 1, nodes: o[2] };
  },
  casualRate: (b, G_, rng, games) => { at(b); const v = port.x.t_casual(games, rng.state() | 0); return { rate: v, draws: port.x.draws() }; },
  analyze: (b, plan, manual) => {
    at(b, plan);
    const interaction = port.x.t_analyze(manual), o = port.out();
    return { interaction, joins: o[0], mutualWaitRopes: o[1], revisitedRopes: o[2], branchingDepth: o[3], largestCoupledGroup: o[4] };
  },
};
const SIX = ['interaction', 'joins', 'mutualWaitRopes', 'revisitedRopes', 'branchingDepth', 'largestCoupledGroup'];
// The JS's answer cut to what the port gives.
const CUT = {
  score: r => r && { plan: r.plan, par: r.par, exact: r.exact, ...(r.nodes !== undefined ? { nodes: r.nodes } : {}) },
  analyze: r => r && Object.fromEntries(SIX.map(k => [k, r[k]])),
};
const cutPort = (kind, want, got) => kind === 'score' && want && want.nodes === undefined ? { plan: got.plan, par: got.par, exact: got.exact } : got;

// --spoil KIND: the negative control, the port's 3rd answer of that kind changed (must be the one failure).
const spoil = v => typeof v === 'number' ? v + 1 : typeof v === 'boolean' ? !v : Array.isArray(v) ? [...v, 99] : v && typeof v === 'object' ? { ...v, spoiled: 1 } : 'spoiled';
let calls = {}, bad = [], ms = {}, peak = { bytes: 0, where: '' }, current = '';
const time = (kind, side, t) => { const k = ms[kind] = ms[kind] || { js: 0, port: 0 }; k[side] += t; };
function compare(kind, a, jsAnswer) {
  calls[kind] = (calls[kind] || 0) + 1;
  let got, t = performance.now();
  try { got = PORT[kind](...a); } catch (e) { if (!(e instanceof WebAssembly.RuntimeError)) throw e; got = { trap: e.message }; }
  time(kind, 'port', performance.now() - t);
  const p = port.x.stack_peak(); if (p > peak.bytes) peak = { bytes: p, where: `${current} ${kind}` };
  t = performance.now();
  const before = R.draws(), w = jsAnswer(), draws = R.draws() - before;
  time(kind, 'js', performance.now() - t);
  let want = CUT[kind] ? CUT[kind](w) : w;
  if (kind === 'casualRate') want = { rate: w, draws };
  want = JSON.parse(JSON.stringify(want ?? null));
  let g = JSON.parse(JSON.stringify(cutPort(kind, want, got) ?? null));
  if (SPOIL === kind && calls[kind] === 3) g = spoil(g);
  if (JSON.stringify(want) !== JSON.stringify(g)) bad.push({ where: current, kind, n: calls[kind], want, got: g, board: a[0] });
  return w;
}
const hook = (name, f, a) => PORT[name] ? compare(name, a, () => f(...a)) : f(...a);
const plainAnalyze = Q.analyze;
const shadow = on => {
  globalThis.__mfCapture = on ? hook : null;
  Q.analyze = on ? (b, plan, manual, G_) => compare('analyze', [b, plan, manual], () => plainAnalyze(b, plan, manual, G_)) : plainAnalyze;
};

// The qualities of a level (null for none).
function qualities(l, spec) {
  if (!l) return null;
  const lens = l.ropes.map(p => p.length);
  const d = spec.difficulty ?? l.difficulty;
  const target = F.targetChallenge(d), ceiling = F.winCeiling(d);
  const kinds = l.mirrors.length || l.springs.length ? l.mechanicStats : null;
  return {
    grid: l.grid, W: l.W, H: l.H, d, ropes: l.ropes.length, ropeMean: lens.reduce((a, b) => a + b, 0) / lens.length, ropeMax: Math.max(...lens),
    par: l.par, exact: l.exact ? 1 : 0, parRatio: l.par / l.ropes.length, coverage: l.coverage, mirrors: l.mirrors.length, springs: l.springs.length,
    knots: l.constructionStats?.knots ?? null, casualWins: l.play?.casualWins ?? null, work: l.play?.work ?? null, challenge: l.play?.challenge ?? null,
    target, miss: l.play ? Math.abs(l.play.challenge - target) : null, overCeiling: l.play ? Math.max(0, l.play.casualWins - ceiling) : null,
    ...(l.complexity ? Object.fromEntries(SIX.map(k => [k, l.complexity[k]])) : {}),
    manualSlides: l.slideStats?.manualSlides ?? null, manualBounces: l.slideStats?.manualBounces ?? null, repeatedRopes: l.slideStats?.repeatedRopes ?? null,
    automaticRopes: l.slideStats?.automaticRopes ?? null,
    usedMirrors: kinds?.usedMirrors ?? null, usedSprings: kinds?.usedSprings ?? null, manualMirrors: kinds?.manualMirrors ?? null, manualSprings: kinds?.manualSprings ?? null,
  };
}

const pct = (xs, p) => { const s = xs.filter(x => x !== null && x !== undefined && !Number.isNaN(x)).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
const fmt = x => x === null ? '-' : Number.isInteger(x) ? String(x) : x.toFixed(3);
function summary(label, rows, nulls, t) {
  const qs = rows.filter(Boolean), keys = qs.length ? Object.keys(qs[0]).filter(k => typeof qs[0][k] === 'number' || qs.some(q => typeof q[k] === 'number')) : [];
  console.log(`${label}: ${rows.length} levels, ${nulls} null, ${(t / 1000).toFixed(1)} s`);
  for (const k of keys) { const xs = qs.map(q => q[k]); if (xs.every(x => x === null)) continue; console.log(`    ${k.padEnd(20)} p10 ${fmt(pct(xs, .1))}  p50 ${fmt(pct(xs, .5))}  p90 ${fmt(pct(xs, .9))}`); }
}

function run(label, specs) {
  calls = {}; bad = []; ms = {}; peak = { bytes: 0, where: '' };
  const rows = []; let nulls = 0; const t0 = Date.now();
  for (const { spec, name } of specs) {
    current = name;
    shadow(true);
    const t = Date.now(); let l = null, err = null;
    try { l = F.generate(spec, G); } catch (e) { if (!/densely/.test(e.message)) err = e; }
    shadow(false);
    if (err) throw err;
    const tl = Date.now() - t, q = qualities(l, spec);
    if (!l) nulls++;
    rows.push(q);
    if (OUT) fs.appendFileSync(OUT, JSON.stringify({ label, name, ms: tl, q, mismatches: bad.filter(x => x.where === name).length }) + '\n');
  }
  const n = Object.values(calls).reduce((a, b) => a + b, 0);
  console.log(`${bad.length ? 'FAIL' : 'ok  '} ${label}: ${specs.length} levels, ${n} calls shadowed, ${bad.length} differ (${((Date.now() - t0) / 1000).toFixed(0)} s); stack peak ${peak.bytes} (${peak.where})`);
  console.log(`  calls: ${Object.entries(calls).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  console.log(`  ms JS/port: ${Object.entries(ms).map(([k, v]) => `${k} ${v.js.toFixed(0)}/${v.port.toFixed(0)}`).join(', ')}`);
  for (const x of bad.slice(0, 6)) console.log(`  DIFF ${x.where} ${x.kind} #${x.n}\n    want ${JSON.stringify(x.want).slice(0, 300)}\n    got  ${JSON.stringify(x.got).slice(0, 300)}`);
  summary(`  qualities ${label}`, rows, nulls, Date.now() - t0);
  return bad.length;
}

let failed = 0;
if (JOURNEY) {
  const [a, b] = JOURNEY.split('-').map(Number);
  const specs = [];
  for (let i = a; i <= (b || a); i++) specs.push({ spec: G.spec({ kind: 'journey' }, i - 1), name: `L${i}` });
  failed += run(`journey ${JOURNEY}`, specs);
}
if (CODES) for (const code of CODES.split(',')) {
  const o = G.parseCode(code); if (!o) throw Error(`shadow-g6: not a code: ${code}`);
  const specs = [];
  for (let i = FROM; i < FROM + COUNT; i++) specs.push({ spec: G.spec(o, i), name: `${code}#${i}` });
  failed += run(code, specs);
}
process.exit(failed ? 1 : 0);
