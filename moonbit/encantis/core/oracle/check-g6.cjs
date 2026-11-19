// G6's oracle: measured play (play.ents) and the interaction analysis (metrics.ents), against
// grid-generator.js and dependency-metrics.js at 9e69e3a. All exact: these are rules and
// measurements of a given board (casual play's draws are counted too).
//
//   node moonbit/encantis/core/oracle/check-g6.cjs [test/g6.wasm]   the port
//   node moonbit/encantis/core/oracle/check-g6.cjs --js             the positive control (the JS
//            through the same words and hooks)
//   node moonbit/encantis/core/oracle/check-g6.cjs --controls       the negative controls
//   options: --parts direct,derived,mutated,calls,stored (default: all), --extra (direct and derived
//            on the 79 boards of fixtures/g1-extra-boards.jsonl too: 4x4 to 48x48), --only L30,C7,
//            --reverse, --fresh (compute the JS's answers again), --fill (compute them into the cache
//            and stop)
//
// The parts:
//   direct   on all 135 boards of reference.json, with their plans and par: F.coverage, F.valid,
//            regional, trivial, featuresUsed, F.featureStats(b, plan, manual, G) with manual = par, 0
//            and the plan's length, the slideStats generate() makes (manual slides, bounces,
//            repeated ropes, automatic exits, any slide), postpone(b, G, plan), F.score(b, G, false)
//            and (b, G, true) (par, exact, the plan, and nodes where the JS gives them),
//            F.casualRate(b, G, mulberry32(hashString('bench')), 100 and 1000) with its draws (10
//            games on the two boards with spinners and more than 100 ropes, C13 and C14, where the JS
//            needs 80 and 200 s for 100 games), and Q.analyze(b, plan, manual, G) with manual = par and
//            the plan's length (interaction, joins, mutualWaitRopes, revisitedRopes, branchingDepth,
//            largestCoupledGroup)
//   derived  boards made of the ropes still there after a prefix of each reference board's plan (every
//            quarter of the plan), with the rest of the plan: the generator never makes them, and they
//            are where trivial is true, regional false and featuresUsed false. Each unit as in direct
//            (manual = the replay's player taps; casual 100 games, 10 on C13 and C14; no score(true))
//   mutated  five broken copies of each reference board (a rope with a gap, a rope on another's
//            cell, a rope of one cell, a cell off the board, a rope on a mirror or spring): F.valid,
//            F.coverage and regional; and each board with its plan's last tap made again (of a rope
//            that has left: a tap that is not allowed): featuresUsed, featureStats (null),
//            slideStats, postpone, score with skip, and Q.analyze
//   calls    the calls of fixtures/g6-calls.json.gz (dump-g6.cjs: recorded while the real generator
//            made the 135 reference levels and the 70 of g5-review-boards.jsonl, rejected candidates
//            included, sampled by its rule), against what the JS answered then, draws included
//   stored   the measurements of the 120 Journey levels in scripts/grid-journey-measurements.json at
//            9e69e3a, from the reference boards (their layout keys equal): coverage, casualWins (games
//            seeded by 'journey/5/MONKEYFIST/measure/' + seed, 24 on spinner boards, 96 otherwise),
//            work, challenge, targetChallenge, slideStats, mechanicStats and the complexity's six
//            fields, each rounded as the build rounds it
//
// The JS's answers for direct and derived are cached per board (CACHE, keyed by REFERENCE and
// CACHE_VERSION). --controls spoils the 3rd comparison of each kind and requires exactly that one to
// fail, by name.
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const R = require('./ref.cjs'), W = require('./wasm.cjs'), C = require('./capture.cjs'), D = require('./dump-g6.cjs');
const { readPosition } = require('./check-g1.cjs');

const args = process.argv.slice(2);
const VALUED = ['--only', '--parts'];
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const JS = args.includes('--js'), CONTROLS = args.includes('--controls'), FRESH = args.includes('--fresh'), REVERSE = args.includes('--reverse');
const EXTRA = args.includes('--extra'), ONLY = opt('--only', null);
const PARTS = opt('--parts', 'direct,derived,mutated,calls,stored').split(',');
const WASM = args.find((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1])) || path.join(__dirname, '../test/g6.wasm');
const { G, F, L, Q } = R.js();
C.captured();
const raw = globalThis.__mfCaptureRaw;

const CACHE = process.env.G6_CACHE || '/home/user/mf-core-scratch/g6/cache';
const CACHE_VERSION = 1;
const BENCH = L.hashString('bench') >>> 0;
const MEASURE = 'journey/5/MONKEYFIST/measure/';

// --- Comparing ---

let corrupt = null;
const seen = {};
let failures = [];
function same(kind, name, want, got) {
  const k = seen[kind] = (seen[kind] || 0) + 1;
  if (corrupt && corrupt.kind === kind && corrupt.at === k) want = spoil(want);
  const ok = JSON.stringify(want) === JSON.stringify(got);
  if (!ok) failures.push({ kind, name, want, got });
  return ok;
}
const spoil = v => typeof v === 'number' ? v + 1 : Array.isArray(v) ? [...v, 99] : v && typeof v === 'object' ? { ...v, spoiled: 1 } : 'spoiled';
const bit = b => b ? 1 : 0;
const list = xs => [xs.length, ...xs];
const EVENTS = { exit: 0, bounce: 1, slide: 2 };

// --- The JS's answers, in the words the hooks give ---

// Each kind: the JS's call, and its answer in the hooks' shape ({ ret?, out?, nodes?, draws? }).
const SHAPE = {
  coverage: r => ({ ret: r }),
  valid: r => ({ ret: bit(r) }), regional: r => ({ ret: bit(r) }), trivial: r => ({ ret: bit(r) }), featuresUsed: r => ({ ret: bit(r) }),
  featureStats: r => r ? { ret: 1, out: [r.usedMirrors, r.usedSprings, r.manualMirrors, r.manualSprings] } : { ret: 0, out: [] },
  slideStats: r => ({ out: r }),
  postpone: r => ({ out: list(r) }),
  score: r => ({ out: [r.par, bit(r.exact), ...list(r.plan)], nodes: r.nodes }),
  casual: (r, draws) => ({ ret: r, draws }),
  analyze: r => ({ ret: r.interaction, out: [r.joins, r.mutualWaitRopes, r.revisitedRopes, r.branchingDepth, r.largestCoupledGroup] }),
};
// The slideStats of generate() (grid-generator.js, the lines after `const played`), and whether any
// tap of the replay slid.
function slideStats(b, plan, par) {
  const played = G.replay(b, plan), manualEvents = played.events.slice(0, par), actions = new Uint16Array(b.ropes.length);
  manualEvents.forEach((event, step) => { if (event === 'slide') actions[plan[step]]++; });
  return [manualEvents.filter(e => e === 'slide').length, manualEvents.filter(e => e === 'bounce').length,
    Array.from(actions).filter(n => n >= 2).length, played.events.slice(par).filter(e => e === 'exit').length, bit(played.events.includes('slide'))];
}
// c: { b, plan }; the board's own plan is c.plan where a function reads b.plan.
const JSCALL = {
  coverage: c => F.coverage(c.b), valid: c => F.valid(c.b), regional: c => raw.regional(c.b), trivial: c => raw.trivial(c.b, G),
  featuresUsed: c => raw.featuresUsed({ ...c.b, plan: c.plan }, G),
  featureStats: (c, manual) => F.featureStats(c.b, c.plan, manual, G),
  slideStats: (c, par) => slideStats(c.b, c.plan, par),
  postpone: c => raw.postpone(c.b, G, c.plan),
  score: (c, skip) => F.score({ ...c.b, plan: c.plan }, G, skip),
  casual: (c, games, state) => F.casualRate(c.b, G, R.mulberry32(state), games),
  analyze: (c, manual) => Q.analyze(c.b, c.plan, manual, G),
};
function jsWant(kind, c, a) {
  const before = R.draws();
  const r = JSCALL[kind](c, ...a);
  return JSON.parse(JSON.stringify(SHAPE[kind](r, R.draws() - before)));
}

// --- The port's answers ---

const HOOK = {
  coverage: x => ({ ret: x.t_coverage() }), valid: x => ({ ret: x.t_valid() }), regional: x => ({ ret: x.t_regional() }),
  trivial: x => ({ ret: x.t_trivial() }), featuresUsed: x => ({ ret: x.t_features_used() }),
  featureStats: (x, manual) => ({ ret: x.t_feature_stats(manual), out: null }),
  slideStats: (x, par) => { x.t_slide_stats(par); return { out: null }; },
  postpone: x => { x.t_postpone(); return { out: null }; },
  score: (x, skip) => { x.t_score(skip ? 1 : 0); return { out: null, score: true }; },
  casual: (x, games, state) => ({ ret: x.t_casual(games, state | 0), draws: x.draws() }),
  analyze: (x, manual) => ({ ret: x.t_analyze(manual), out: null }),
};
function portGot(port, kind, c, a, want) {
  port.push(R.position(c.b, c.b.ropes, c.plan));
  let got;
  try { got = HOOK[kind](port.x, ...a); } catch (e) { if (!(e instanceof WebAssembly.RuntimeError)) throw e; return { trap: e.message }; }
  if (got.out === null) got.out = port.out();
  if (got.score) { const o = got.out; got = { out: [o[0], o[1], ...o.slice(3)], nodes: o[2] }; if (want.nodes === undefined) delete got.nodes; }
  return got;
}

// --- The cases ---

// The steps on a case: [kind, label, args].
function directSteps(c) {
  const big = c.b.springs.length && c.b.ropes.length > 100;
  return [['coverage', '', []], ['valid', '', []], ['regional', '', []], ['trivial', '', []], ['featuresUsed', '', []],
    ['featureStats', ' manual par', [c.par]], ['featureStats', ' manual 0', [0]], ['featureStats', ' manual all', [c.plan.length]],
    ['slideStats', '', [c.par]], ['postpone', '', []], ['score', '', [false]], ...(c.derived ? [] : [['score', ' skip', [true]]]),
    ...(big ? [['casual', ' x10', [10, BENCH]]] : c.derived ? [['casual', ' x100', [100, BENCH]]] : [['casual', ' x100', [100, BENCH]], ['casual', ' x1000', [1000, BENCH]]]),
    ['analyze', ' manual par', [c.par]], ['analyze', ' manual all', [c.plan.length]]];
}
const MUTATED_STEPS = [['valid', '', []], ['coverage', '', []], ['regional', '', []]];

function extraBoards() {
  return fs.readFileSync(path.join(__dirname, 'fixtures/g1-extra-boards.jsonl'), 'utf8').trim().split('\n')
    .map((l, k) => { const j = JSON.parse(l); return { ...R.jsBoard(j), name: `g1#${k + 1}` }; });
}
function boardsUsed() {
  let bs = R.boards().slice();
  if (EXTRA) bs = [...bs, ...extraBoards()];
  if (ONLY) bs = bs.filter(b => ONLY.split(',').includes(b.name));
  return bs;
}

// The board of the ropes still there after the first k taps of b's plan, and the rest of the plan,
// its ropes numbered again. Null where fewer than two ropes are left.
function derived(b, k) {
  let paths = b.ropes;
  for (const i of b.plan.slice(0, k)) { const m = G.tap(b, paths, i); if (!m) return null; paths = m.paths; }
  const keep = [], number = new Map();
  paths.forEach((p, i) => { if (p) { number.set(i, keep.length); keep.push(p); } });
  if (keep.length < 2) return null;
  const nb = { grid: b.grid, W: b.W, H: b.H, ropes: keep, mirrors: b.mirrors, springs: b.springs, plan: b.plan.slice(k).map(i => number.get(i)) };
  if (nb.plan.some(i => i === undefined)) return null;
  return nb;
}

// Five broken copies of b, for valid.
function mutated(b) {
  const out = [], copy = () => ({ ...b, ropes: b.ropes.map(p => p.map(c => ({ ...c }))) });
  const longest = b.ropes.reduce((a, p, i) => p.length > b.ropes[a].length ? i : a, 0);
  let m = copy(); if (m.ropes[longest].length >= 3) { m.ropes[longest].splice(1, 1); out.push(['gap', m]); }
  m = copy(); m.ropes[1][m.ropes[1].length - 1] = { ...m.ropes[0][0] }; out.push(['on another rope', m]);
  m = copy(); m.ropes[0] = m.ropes[0].slice(0, 1); out.push(['one cell', m]);
  m = copy(); m.ropes[0][0] = { q: b.W, r: 0 }; out.push(['off the board', m]);
  const feature = (b.mirrors || []).length ? b.mirrors[0].cell : (b.springs || [])[0];
  if (feature) { m = copy(); m.ropes[0][0] = { ...feature }; out.push(['on a feature', m]); }
  return out.map(([what, mb]) => [what, mb, MUTATED_STEPS]);
}
// b with one more tap at the end of its plan, of the rope its plan taps last (which has left by
// then): the plan's units on a plan with a tap that is not allowed.
const BAD_PLAN_STEPS = [['featuresUsed', '', []], ['featureStats', ' manual par', ['par']], ['slideStats', '', ['par']], ['postpone', '', []],
  ['score', ' skip', [true]], ['analyze', ' manual all', ['all']]];
function badPlan(b) {
  return { ...b, plan: [...b.plan, b.plan[b.plan.length - 1]] };
}

function cases() {
  const out = [];
  for (const b of boardsUsed()) {
    const c = { b, plan: b.plan.slice(), par: b.par, board: b.name };
    if (PARTS.includes('direct')) for (const s of directSteps(c)) out.push({ ...c, part: 'direct', step: s, name: `${b.name}: ${s[0]}${s[1]}` });
    if (PARTS.includes('derived')) {
      const q = Math.max(1, Math.ceil(b.plan.length / 4));
      for (let k = q; k < b.plan.length; k += q) {
        const nb = derived(b, k);
        if (!nb) continue;
        const taps = G.replay(nb, nb.plan).taps;
        const d = { b: nb, plan: nb.plan, par: taps, board: b.name, derived: true, key: `after ${k}` };
        for (const s of directSteps(d)) out.push({ ...d, part: 'derived', step: s, name: `${b.name} after ${k}: ${s[0]}${s[1]}` });
      }
    }
    if (PARTS.includes('mutated') && !b.name.startsWith('g1#')) {
      for (const [what, mb, steps] of mutated(b)) {
        for (const s of steps) out.push({ b: mb, plan: b.plan, board: b.name, part: 'mutated', key: what, step: s, name: `${b.name} (${what}): ${s[0]}` });
      }
      const bb = badPlan(b), what = 'a tap of a rope that has left';
      for (const s of BAD_PLAN_STEPS) {
        const step = [s[0], s[1], s[2].map(a => a === 'par' ? b.par : a === 'all' ? bb.plan.length : a)];
        out.push({ b: bb, plan: bb.plan, board: b.name, part: 'mutated', key: what, step, name: `${b.name} (${what}): ${s[0]}${s[1]}` });
      }
    }
  }
  return REVERSE ? out.reverse() : out;
}

// --- The cache of the JS's answers ---

const cacheFile = name => path.join(CACHE, `${R.REFERENCE}-v${CACHE_VERSION}-${name}.json.gz`);
const caches = new Map();
function cacheOf(name) {
  if (caches.has(name)) return caches.get(name);
  let entry = { dirty: false, want: {} };
  if (!FRESH && fs.existsSync(cacheFile(name))) entry.want = JSON.parse(zlib.gunzipSync(fs.readFileSync(cacheFile(name))));
  caches.set(name, entry);
  return entry;
}
function flush() {
  fs.mkdirSync(CACHE, { recursive: true });
  for (const [name, e] of caches) if (e.dirty) { fs.writeFileSync(cacheFile(name), zlib.gzipSync(JSON.stringify(e.want))); e.dirty = false; }
}
const jsTime = {};
function want(c) {
  const e = cacheOf(c.board), key = `${c.part} ${c.key || ''} ${c.step[0]}${c.step[1]}`;
  if (e.want[key] === undefined) {
    const t = performance.now();
    e.want[key] = jsWant(c.step[0], c, c.step[2]);
    jsTime[c.step[0]] = (jsTime[c.step[0]] || 0) + performance.now() - t;
    e.dirty = true;
  }
  return e.want[key];
}

// --- Running ---

let peak = { bytes: 0, where: '' }, values = 0;
const size = w => (w.out ? w.out.length : 0) + (w.ret !== undefined ? 1 : 0) + (w.draws !== undefined ? 1 : 0) + (w.nodes !== undefined ? 1 : 0);
function note(port, where) { const p = port.x.stack_peak(); if (p > peak.bytes) peak = { bytes: p, where }; }
function run(port, list, only) {
  const counts = {}; let lastBoard = null;
  for (const c of list) {
    if (only && c.step[0] !== only) continue;
    if (lastBoard && lastBoard !== c.board) flush();
    lastBoard = c.board;
    const w = want(c);
    same(c.step[0], `${c.part} ${c.name}`, w, portGot(port, c.step[0], c, c.step[2], w));
    values += size(w); note(port, c.name);
    const k = `${c.part} ${c.step[0]}`; counts[k] = (counts[k] || 0) + 1;
  }
  flush();
  return counts;
}

// The recorded calls.
function fixture() { return JSON.parse(zlib.gunzipSync(fs.readFileSync(D.OUT))); }
const CALL_KIND = { valid: 'valid', coverage: 'coverage', regional: 'regional', trivial: 'trivial', featuresUsed: 'featuresUsed', featureStats: 'featureStats',
  postpone: 'postpone', score: 'score', casualRate: 'casual', 'Q.analyze': 'analyze' };
function runCalls(port, only) {
  const fx = fixture(), boards = fx.boards.map(D.board), counts = {};
  const calls = REVERSE ? fx.calls.slice().reverse() : fx.calls;
  for (const e of calls) {
    const kind = CALL_KIND[e.name];
    if (only && kind !== only) continue;
    const b = boards[e.b], plan = e.plan || b.plan;
    const a = kind === 'featureStats' || kind === 'analyze' ? [e.manual] : kind === 'score' ? [e.skip] : kind === 'casual' ? [e.games, e.state] : [];
    if (kind === 'score' && e.budget !== undefined && e.budget !== 2500) throw Error('check-g6: a score call with another budget');
    const w = JSON.parse(JSON.stringify(SHAPE[kind](e.result, e.draws)));
    const c = { b, plan };
    same(kind, `calls ${e.source} ${e.name} #${e.n}`, w, portGot(port, kind, c, a, w));
    values += size(w); note(port, `calls ${e.source} ${e.name} #${e.n}`);
    const k = `calls ${kind}`; counts[k] = (counts[k] || 0) + 1;
  }
  return { counts, n: calls.length, rule: fx.rule };
}

// The stored measurements of the Journey.
function runStored(port, only) {
  const stored = JSON.parse(fs.readFileSync(path.join(R.dir, 'scripts/grid-journey-measurements.json'), 'utf8'));
  const counts = {}; let n = 0;
  const bs = R.boards().slice(0, 120);
  for (const [i, m] of stored.entries()) {
    const b = bs[i];
    if (ONLY && !ONLY.split(',').includes(b.name)) continue;
    if (m.layoutKey !== b.layoutKey || m.par !== b.par || m.ropeCount !== b.ropes.length) throw Error(`check-g6: the stored measurement ${i + 1} is not of the reference board ${b.name}`);
    const words = R.position(b, b.ropes, b.plan), name = `stored ${b.name}`;
    const check = (kind, w, got) => { if (only && kind !== only) return; same(kind, `${name}: ${kind}`, w, got); values += JSON.stringify(w).split(',').length; counts['stored ' + kind] = (counts['stored ' + kind] || 0) + 1; n++; };
    const games = b.springs.length ? 24 : 96;
    port.pushText(MEASURE + m.seed); port.x.t_seed();
    port.push(words);
    const wins = port.x.t_measure(b.par, games), challenge = port.outf(1);
    check('measure', [m.play.casualWins, m.play.challenge], [Number(wins.toFixed(4)), Number(challenge.toFixed(3))]);
    port.push(words); port.x.t_slide_stats(b.par);
    const s = port.out(), ss = m.slideStats;
    check('work', m.play.work, s[0] + s[1]);
    check('slideStats', [ss.manualSlides, ss.manualBounces, ss.repeatedRopes, ss.automaticRopes], s.slice(0, 4));
    port.push(words); check('coverage', m.coverage, Number(port.x.t_coverage().toFixed(4)));
    check('targetChallenge', m.targetChallenge, Number(port.x.t_target(m.difficulty).toFixed(3)));
    if (m.mechanicStats) {
      port.push(words); const ok = port.x.t_feature_stats(b.par), o = port.out(), ms = m.mechanicStats;
      check('mechanicStats', [1, ms.usedMirrors, ms.usedSprings, ms.manualMirrors, ms.manualSprings], [ok, ...o]);
    } else if (b.mirrors.length || b.springs.length) throw Error(`check-g6: ${b.name} has mechanics but no stored mechanicStats`);
    port.push(words); const inter = port.x.t_analyze(b.par), o = port.out(), cx = m.complexity;
    check('complexity', [cx.interaction, cx.joins, cx.mutualWaitRopes, cx.revisitedRopes, cx.branchingDepth, cx.largestCoupledGroup], [inter, ...o]);
    note(port, name);
  }
  return { counts, n };
}

// --- The positive control: the same hooks, answered by the JS ---

function jsHooks(io) {
  let seed = '', draws = 0;
  const ctx = () => { const p = readPosition(io.input()); return { b: { ...p.b, plan: p.prefer }, plan: p.prefer }; };
  const ask = (kind, a) => { const c = ctx(), before = R.draws(), r = JSCALL[kind](c, ...a); draws = R.draws() - before; return SHAPE[kind](JSON.parse(JSON.stringify(r ?? null)), draws); };
  const outOf = w => { io.clear(); if (w.out) io.put(...w.out); return w.ret; };
  return { draws: () => draws, stack_peak: () => 0,
    t_coverage: () => ask('coverage', []).ret, t_valid: () => ask('valid', []).ret, t_regional: () => ask('regional', []).ret,
    t_trivial: () => ask('trivial', []).ret, t_features_used: () => ask('featuresUsed', []).ret,
    t_feature_stats: manual => outOf(ask('featureStats', [manual])),
    t_slide_stats: par => { outOf(ask('slideStats', [par])); },
    t_postpone: () => { outOf(ask('postpone', [])); },
    t_score: skip => { const r = JSCALL.score(ctx(), skip === 1); io.clear(); io.put(r.par, bit(r.exact), r.nodes ?? 0, ...list(r.plan)); },
    t_casual: (games, state) => ask('casual', [games, state >>> 0]).ret,
    t_analyze: manual => outOf(ask('analyze', [manual])),
    t_seed: () => { seed = String.fromCharCode(...io.input()); },
    t_measure: (par, games) => {
      const c = ctx(), s = slideStats(c.b, c.plan, par), before = R.draws();
      const wins = F.casualRate(c.b, G, R.mulberry32(L.hashString(seed)), games); draws = R.draws() - before;
      io.putf(0, wins); io.putf(1, F.challengeOf(s[0] + s[1], wins)); return wins;
    },
    t_target: d => F.targetChallenge(d),
  };
}

// --fill: compute the JS's answers into the cache, and nothing else.
if (require.main === module && args.includes('--fill')) {
  const t0 = Date.now(), list = cases();
  let last = null;
  for (const c of list) {
    if (last && last !== c.board) { flush(); console.log(`${last} done (${((Date.now() - t0) / 1000).toFixed(0)} s)`); }
    last = c.board;
    want(c);
  }
  flush();
  console.log(`filled: ${list.length} steps in ${((Date.now() - t0) / 1000).toFixed(1)} s; ms by kind: ${Object.entries(jsTime).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', ')}`);
  process.exit(0);
}

const KINDS = Object.keys(SHAPE);
function all(port, only) {
  const counts = run(port, cases(), only);
  let calls = { n: 0, counts: {} }, stored = { n: 0, counts: {} };
  if (PARTS.includes('calls')) calls = runCalls(port, only);
  if (PARTS.includes('stored')) stored = runStored(port, only);
  return { counts: { ...counts, ...calls.counts, ...stored.counts }, calls, stored };
}

if (require.main === module && CONTROLS) {
  const port = W.load(WASM);
  let bad = 0;
  for (const kind of [...KINDS, 'measure', 'work', 'targetChallenge', 'mechanicStats', 'complexity']) {
    failures = []; for (const k in seen) delete seen[k];
    corrupt = { kind, at: 3 };
    all(port, kind);
    const ours = failures.filter(f => f.kind === kind);
    const ok = failures.length === 1 && ours.length === 1;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} control ${kind}: ${failures.length} failure(s)${ours[0] ? ', named: ' + ours[0].name : ''}`);
  }
  console.log(bad ? `${bad} control(s) did not fail as they should` : 'every control failed, and named its case');
  process.exit(bad ? 1 : 0);
}

if (require.main === module) {
  const port = JS ? W.fake(jsHooks) : W.load(WASM);
  const t0 = Date.now();
  const { counts } = all(port);
  const n = Object.values(counts).reduce((a, b) => a + b, 0);
  const byPart = {};
  for (const [k, v] of Object.entries(counts)) { const p = k.split(' ')[0]; byPart[p] = (byPart[p] || 0) + v; }
  console.log(`${failures.length ? 'FAIL' : 'ok  '} measured play and the interaction analysis${REVERSE ? ' (in reverse)' : ''}${EXTRA ? ' (with the g1 extra boards)' : ''}: ${n} comparisons of ${values} values (${Object.entries(byPart).map(([k, v]) => `${k} ${v}`).join(', ')}), ${failures.length} failed`);
  console.log(`  by kind: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  if (Object.keys(jsTime).length) console.log(`  the JS's answers computed this run (ms): ${Object.entries(jsTime).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', ')}`);
  for (const f of failures.slice(0, 12)) console.log(`  ${f.kind}: ${f.name}\n    want ${JSON.stringify(f.want)?.slice(0, 400)}\n    got  ${JSON.stringify(f.got)?.slice(0, 400)}`);
  console.log(`${port.name}: ${failures.length ? 'FAILED' : 'all passed'} in ${((Date.now() - t0) / 1000).toFixed(1)} s` + (JS ? ' (--js: the JS against itself)' : `; stack peak ${peak.bytes} bytes (${peak.where}); no imports`));
  process.exit(failures.length ? 1 : 0);
}

module.exports = { SHAPE, JSCALL, slideStats, cases };
