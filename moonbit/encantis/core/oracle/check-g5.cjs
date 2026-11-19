// G5's oracle: full geometry and the routing to the kernels (mech.ents), and the hints
// (assist.ents), against game-engine.js, mechanics.js and hex/mechanics.js at 9e69e3a.
//
//   node moonbit/encantis/core/oracle/check-g5.cjs [test/g5.wasm]   the port
//   node moonbit/encantis/core/oracle/check-g5.cjs --js             the positive control
//   node moonbit/encantis/core/oracle/check-g5.cjs --controls       the negative controls
//   node moonbit/encantis/core/oracle/check-g5.cjs --moonbit        the JS against MoonBit's
//            dist/gen.wasm (guide, features) and dist/mf.wasm (bench_solve)
//   options: --only L30,C7 (boards), --frac 0.2 (a share of the positions), --reverse, --kinds
//            taps,solve (only these), --max-ropes 40, --fresh (compute the JS's answers again
//            instead of reading them from the cache), --no-random (plan positions only), --fill
//            (compute the JS's answers into the cache and stop), --all-positions (every position of
//            C13 and C14 too, not a sample)
//
// The cases: all 135 boards of reference.json (120 Journey, 15 custom; both grids, mirrors,
// springs (spinners) and both; 4x5 to 40x40, up to 152 ropes), at every position R.positions()
// gives: the start, every prefix of the plan, and 20 positions of random play (taps of the JS's
// own G.tap). Each position has a plan, which the hooks read in the place of the preferred order:
// the rest of the board's plan on a prefix, the board's plan on a random position.
//
// Per position, each against the JS on the same board and paths:
//   taps       for every rope, G.tap(b, paths, i): null (-1), or the event (0 exit, 1 bounce,
//              2 slide), the distance, the route in full, rope i's path after, and every path after
//              (as a hash of their words: the other ropes must be unchanged)
//   direction  G.direction(b, path) of every rope still there
//   free       G.allFree(b, paths) (routed: the kernels on boards without springs), and the
//              full-geometry allFree (mechanics.js / hex/mechanics.js) on every board
//   frozen     G.frozenRopes(b, paths)
//   solve      G.solve(b, paths, budget, plan) at budgets 40, 900 and 4000, and at 900 with no
//              preferred order: solved (1, 0, -1 for null), nodes, moves
//   solvefull  the full-geometry solve (M.solve / HM.solve) at 900 with the plan, on every board
//   replay     G.replay(b, plan, paths), and with the plan's first move left out: solved, taps,
//              events, and the paths after (hashed, and in full)
//   guide      G.guide(b, paths, budget, plan) at 40 and 900
//   features   G.reachableFeatures(b, paths, budget) at 500 and 10000, as feature indices
//              (mirrors first, then springs), in the order the JS gives its keys
// Per board, at the start only:
//   tracked    whether the board runs on the kernels (no springs, and its tracks compile)
//   minimum    G.minimumTaps(b, b.plan, 1200) and (5000): null where it throws, else par, exact,
//              nodes, plan. Only on the 128 boards of at most 40 ropes (not L107, L112, C11 to C15):
//              on the large ones the JS needs minutes and gigabytes (C14 at 1200: 116 s, 3.1 GB; C11
//              at 5000 runs out of 6 GB), and the generator calls it only on boards of at most 12
//              ropes (and on repeatedCore's 2)
//
// The JS's answers are deterministic, so they are kept in a cache (CACHE below, one file per
// board, keyed by REFERENCE and CACHE_VERSION): a run computes only what is missing. --fresh
// recomputes them; --js always runs the JS live, against the cache when there is one.
//
// --controls runs each kind again with its 3rd comparison's expected value spoiled, on a share
// of the positions, and requires exactly that comparison to fail, by name.
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const R = require('./ref.cjs'), W = require('./wasm.cjs');
const { readPosition } = require('./check-g1.cjs');

const args = process.argv.slice(2);
const VALUED = ['--only', '--frac', '--max-ropes', '--kinds'];
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const JS = args.includes('--js'), CONTROLS = args.includes('--controls'), MOONBIT = args.includes('--moonbit'), FRESH = args.includes('--fresh');
const WASM = args.find((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1])) || path.join(__dirname, '../test/g5.wasm');
const ONLY = opt('--only', null), FRAC = Number(opt('--frac', 1)), MAX_ROPES = Number(opt('--max-ropes', Infinity)), REVERSE = args.includes('--reverse');
const KINDS_ONLY = opt('--kinds', null), NO_RANDOM = args.includes('--no-random');
const { G, M, HM } = R.js();

const CACHE = process.env.G5_CACHE || '/home/user/mf-core-scratch/g5/cache';
const CACHE_VERSION = 1;
const MIN_ROPES = 40;   // minimum: only on boards of at most this many ropes

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
const spoil = v => typeof v === 'number' ? v + 1 : Array.isArray(v) ? [...v, 99] : { ...v, spoiled: 1 };

// --- The JS side ---

// mechanics.js's board (game-engine.js's native(), which it does not export).
const nativeOf = b => ({ W: b.W, H: b.H, mirrors: (b.mirrors || []).map(m => ({ cell: m.cell.r * b.W + m.cell.q, slope: m.slope })),
  springs: (b.springs || []).map(p => p.r * b.W + p.q), gates: [] });
const xy = paths => paths.map(p => p && p.map(c => ({ x: c.q, y: c.r })));

// FNV-1a over words, as test/g5.ents hashes the paths.
const mix = (h, w) => Math.imul((h ^ w) >>> 0, 0x01000193) >>> 0;
const pathWords = paths => { const w = []; for (const p of paths) { w.push(p ? p.length : 0); for (const c of p || []) w.push(c.q, c.r); } return w; };
const hashWords = words => words.reduce(mix, 0x811c9dc5) | 0;
const list = xs => [xs.length, ...xs];
const bit = b => b ? 1 : 0;
const EVENT = { exit: 0, bounce: 1, slide: 2 };
const solvedWord = s => s === true ? 1 : s === null ? -1 : 0;
const catching = f => { try { return f(); } catch (e) { if (e instanceof RangeError) throw e; return undefined; } };

// The feature index of each key the JS gives: mirrors first, then springs (web/generator.js's order).
function featureIndex(b, keys) {
  const cells = [...(b.mirrors || []).map(m => m.cell), ...(b.springs || [])].map(c => c.q + ',' + c.r);
  return keys.map(k => cells.indexOf(k));
}

// Each kind: what the JS gives on a case { b, paths, plan }, as { ret?, out? }.
const WANT = {
  taps: c => {
    const out = [];
    c.paths.forEach((_, i) => {
      const m = G.tap(c.b, c.paths, i);
      if (!m) { out.push(-1); return; }
      out.push(EVENT[m.event], m.distance, m.route.length);
      for (const p of m.route) out.push(p.q, p.r);
      out.push(...pathWords([m.paths[i]]), hashWords(pathWords(m.paths)));
    });
    return { out };
  },
  direction: c => { const out = []; for (const p of c.paths) if (p) { const d = G.direction(c.b, p); out.push(d[0], d[1]); } return { out }; },
  free: c => ({ ret: bit(G.allFree(c.b, c.paths)) }),
  freefull: c => ({ ret: bit(c.b.grid === 'hex' ? HM.allFree(c.b, c.paths) : M.allFree(nativeOf(c.b), xy(c.paths))) }),
  frozen: c => ({ out: list(G.frozenRopes(c.b, c.paths)) }),
  solve: (c, budget, noPrefer) => { const s = G.solve(c.b, c.paths, budget, noPrefer ? [] : c.plan); return { out: [solvedWord(s.solved), s.nodes, ...list(s.moves)] }; },
  solvefull: (c, budget) => {
    const s = c.b.grid === 'hex' ? HM.solve(c.b, c.paths, budget, c.plan) : M.solve(nativeOf(c.b), xy(c.paths), budget, c.plan);
    return { out: [solvedWord(s.solved), s.nodes, ...list(s.moves)] };
  },
  replay: (c, drop) => {
    const plan = drop ? c.plan.slice(1) : c.plan, r = G.replay(c.b, plan, c.paths);
    return { out: [bit(r.solved), r.taps, ...list(r.events.map(e => EVENT[e])), hashWords(pathWords(r.paths)), ...pathWords(r.paths)] };
  },
  guide: (c, budget) => { const s = G.guide(c.b, c.paths, budget, c.plan); return { out: [solvedWord(s.solved), s.nodes, ...list(s.moves)] }; },
  features: (c, budget) => ({ out: list(featureIndex(c.b, G.reachableFeatures(c.b, c.paths, budget))) }),
  tracked: c => {
    // tracked(b) is not exported: it is whether G.allFree on the start takes the kernels, read from
    // a board whose springs are absent and whose tracks compile (game-engine.js's own test)
    if (c.b.springs.length) return { ret: 0 };
    const ok = catching(() => { if (c.b.grid === 'hex') R.js().H.compile(c.b, c.b.ropes); else R.js().L.tracksOf(xy(c.b.ropes), c.b.W, c.b.H, new Map((c.b.mirrors || []).map(m => [m.cell.r * c.b.W + m.cell.q, m.slope]))); return true; });
    return { ret: bit(ok === true) };
  },
  minimum: (c, budget) => {
    let m;
    try { m = G.minimumTaps(c.b, c.plan, budget); } catch (e) { if (e instanceof RangeError) throw e; return { ret: 0, out: [] }; }
    return { ret: 1, out: [m.par, bit(m.exact), m.nodes, ...list(m.plan)] };
  },
};

// The hooks of test/g5.wasm, by kind.
const CALL = {
  taps: x => x.t_taps(), direction: x => x.t_direction(), free: x => x.t_free(), freefull: x => x.t_free_full(), frozen: x => x.t_frozen(),
  solve: (x, budget) => x.t_solve(budget), solvefull: (x, budget) => x.t_solve_full(budget), replay: x => x.t_replay(),
  guide: (x, budget) => x.t_guide(budget), features: (x, budget) => x.t_features(budget), tracked: x => x.t_tracked(),
  minimum: (x, budget) => x.t_minimum(budget),
};
const RETURNS = new Set(['free', 'freefull', 'tracked', 'minimum']);
const WRITES = new Set(['taps', 'direction', 'frozen', 'solve', 'solvefull', 'replay', 'guide', 'features', 'minimum']);
function call(port, kind, ...a) {
  const ret = CALL[kind](port.x, ...a);
  const got = {};
  if (RETURNS.has(kind)) got.ret = ret;
  if (WRITES.has(kind)) got.out = port.out();
  return got;
}

// The steps on each case: [kind, label, args, words]. words: which plan the input carries
// ('plan', 'none' for no preferred order, 'drop' for the plan without its first move).
const POSITION_STEPS = [['taps', '', []], ['direction', '', []], ['free', '', []], ['freefull', '', []], ['frozen', '', []],
  ['solve', ' budget 40', [40]], ['solve', ' budget 900', [900]], ['solve', ' budget 4000', [4000]], ['solve', ' budget 900, no prefer', [900, true], 'none'],
  ['solvefull', ' budget 900', [900]], ['replay', '', [false]], ['replay', ' (first move left out)', [true], 'drop'],
  ['guide', ' budget 40', [40]], ['guide', ' budget 900', [900]], ['features', ' budget 500', [500]], ['features', ' budget 10000', [10000]]];
const START_STEPS = [['tracked', '', []], ['minimum', ' budget 1200', [1200]], ['minimum', ' budget 5000', [5000]]];
const KINDS = [...new Set([...POSITION_STEPS, ...START_STEPS].map(s => s[0]))];
const stepsOf = c => [...(c.start ? START_STEPS.filter(s => s[0] !== 'minimum' || c.b.ropes.length <= MIN_ROPES) : []), ...POSITION_STEPS]
  .filter(s => !KINDS_ONLY || KINDS_ONLY.split(',').includes(s[0]));
const stepName = s => s[0] + s[1];

// The positive control: hooks that read the same words and answer with the JS.
function jsHooks(io) {
  const ctx = () => { const p = readPosition(io.input()); const b = boardOf(p.b); return { b, paths: p.paths.map(q => q && q.length ? q : null), plan: p.prefer }; };
  const hook = (kind, mapArgs = a => a) => (...a) => {
    io.clear();
    const w = WANT[kind](ctx(), ...mapArgs(a));
    if (w.out) io.put(...w.out);
    return w.ret;
  };
  return { draws: () => 0, stack_peak: () => 0,
    t_taps: hook('taps'), t_direction: hook('direction'), t_free: hook('free'), t_free_full: hook('freefull'), t_frozen: hook('frozen'),
    t_solve: hook('solve'), t_solve_full: hook('solvefull'), t_replay: hook('replay'), t_guide: hook('guide'), t_features: hook('features'),
    t_tracked: hook('tracked'), t_minimum: hook('minimum') };
}
// readPosition's board (mirrors with axis or slope) as the reference has it, the ropes being the
// board's own: the JS's routing reads b.ropes and b.springs.
function boardOf(b) { return { ...b, plan: [] }; }

// --- The cases ---

// On the two boards of more than BIG ropes (C13, 24x24 with 145; C14, 40x40 with 152), the JS needs
// about 25 s a position (a solve there taps 150 ropes on each of its 150 nodes, with a Set of every
// cell for each tap), so they get a sample of their positions: the start, every 8th prefix of the
// plan and every 5th of random play (G3's --extra rule), 25 positions each. --all-positions takes
// them all (C13's are in the cache: 173 positions, 5 minutes of JS).
const BIG = 140, ALL_POSITIONS = args.includes('--all-positions');
function sample(ps) {
  const plan = ps.filter(p => !p.from.startsWith('random')), random = ps.filter(p => p.from.startsWith('random'));
  return [...plan.filter((_, i) => i % 8 === 0), ...random.filter((_, i) => i % 5 === 0)];
}

function cases() {
  const out = [];
  let boards = R.boards();
  if (ONLY) boards = boards.filter(b => ONLY.split(',').includes(b.name));
  boards = boards.filter(b => b.ropes.length <= MAX_ROPES);
  for (const b of boards) {
    const ps = R.positions(b).map((p, k) => ({ ...p, k })).filter(p => !NO_RANDOM || !p.from.startsWith('random'));
    for (const p of b.ropes.length > BIG && !ALL_POSITIONS ? sample(ps) : ps) {
      const plan = p.from.startsWith('random') ? b.plan.slice() : b.plan.slice(p.taps.length);
      out.push({ b, paths: p.paths, plan, k: p.k, start: p.from === 'start', name: `${b.name} ${p.from}` });
    }
  }
  return REVERSE ? out.reverse() : out;
}

// The words a step pushes.
const wordsFor = (c, s) => R.position(c.b, c.paths, s[3] === 'none' ? [] : s[3] === 'drop' ? c.plan.slice(1) : s[0] === 'minimum' ? c.b.plan : c.plan);
// The case the JS sees for a step.
const ctxFor = (c, s) => ({ b: c.b, paths: c.paths, plan: s[0] === 'minimum' ? c.b.plan : c.plan });

// --- The cache of the JS's answers ---

const cacheFile = b => path.join(CACHE, `${R.REFERENCE}-v${CACHE_VERSION}-${b.name}.json.gz`);
const caches = new Map();
function cacheOf(b) {
  if (caches.has(b.name)) return caches.get(b.name);
  let entry = { dirty: false, want: {} };
  if (!FRESH && fs.existsSync(cacheFile(b))) entry.want = JSON.parse(zlib.gunzipSync(fs.readFileSync(cacheFile(b))));
  caches.set(b.name, entry);
  return entry;
}
function flush() {
  fs.mkdirSync(CACHE, { recursive: true });
  for (const [name, e] of caches) if (e.dirty) {
    const b = R.boards().find(x => x.name === name);
    fs.writeFileSync(cacheFile(b), zlib.gzipSync(JSON.stringify(e.want)));
    e.dirty = false;
  }
}
const jsTime = {};
function want(c, s) {
  const e = cacheOf(c.b), key = `${c.k} ${stepName(s)}`;
  if (e.want[key] === undefined) {
    const t = performance.now();
    e.want[key] = WANT[s[0]](ctxFor(c, s), ...s[2]);
    jsTime[s[0]] = (jsTime[s[0]] || 0) + performance.now() - t;
    e.dirty = true;
  }
  return e.want[key];
}

// --- Running ---

let peak = { bytes: 0, where: '' }, values = 0;
const size = w => (w.out ? w.out.length : 0) + (w.ret !== undefined ? 1 : 0);
function run(port, list, only) {
  const counts = {}; let n = 0, lastBoard = null;
  for (const c of list) {
    if (lastBoard && lastBoard !== c.b.name) flush();
    lastBoard = c.b.name;
    for (const s of stepsOf(c)) {
      if (only && s[0] !== only) continue;
      const w = want(c, s);
      port.push(wordsFor(c, s));
      let got;
      try { got = call(port, s[0], ...(s[0] === 'replay' ? [] : s[2].slice(0, 1))); } catch (e) { if (!(e instanceof WebAssembly.RuntimeError)) throw e; got = { trap: e.message }; }
      same(s[0], `${c.name}: ${stepName(s)}`, w, got);
      values += size(w);
      const p = port.x.stack_peak();
      if (p > peak.bytes) peak = { bytes: p, where: `${c.name}: ${stepName(s)}` };
      counts[s[0]] = (counts[s[0]] || 0) + 1; n++;
    }
  }
  flush();
  return { n, counts };
}

// --- MoonBit's builds, against the JS (the oracle agrees with what the game ships) ---

function moonbit() {
  const repo = path.resolve(__dirname, '../../../..');
  const MF = require(path.join(repo, 'moonbit/web/generator.js'));
  const gen = MF.wrap(W.load(path.join(repo, 'moonbit/dist/gen.wasm')).x, 'wasm-gc');
  const mf = W.load(path.join(repo, 'moonbit/dist/mf.wasm'));
  let n = 0;
  const t0 = Date.now();
  let cs = cases();
  if (FRAC < 1) cs = cs.filter((_, i) => i % Math.round(1 / FRAC) === 0);
  for (const c of cs) {
    for (const budget of [40, 900]) {
      const g = gen.guide(c.b, c.paths, budget, c.plan), w = want(c, ['guide', ` budget ${budget}`, [budget]]);
      same('moonbit', `${c.name}: guide ${budget}`, w.out, [solvedWord(g.solved), g.nodes, ...list(g.moves)]); n++;
    }
    for (const budget of [500, 10000]) {
      const f = gen.reachableFeatures(c.b, c.paths, budget), w = want(c, ['features', ` budget ${budget}`, [budget]]);
      same('moonbit', `${c.name}: features ${budget}`, w.out, list(featureIndex(c.b, f))); n++;
    }
  }
  flush();
  for (const b of R.boards().filter(b => b.name.startsWith('L') && (!ONLY || ONLY.split(',').includes(b.name)))) {
    mf.pushText('J3-MONKEYFIST');
    if (!mf.x.generate(Number(b.name.slice(1)) - 1)) throw Error(`MoonBit made no level ${b.name}`);
    for (const budget of [40, 900, 2000]) { same('moonbit', `${b.name}: bench_solve(${budget})`, G.solve(b, b.ropes, budget, []).nodes, mf.x.bench_solve(budget)); n++; }
  }
  return { n, ms: Date.now() - t0 };
}

// --fill: compute the JS's answers into the cache, and nothing else.
if (require.main === module && args.includes('--fill')) {
  const t0 = Date.now(), list = cases();
  let last = null;
  for (const c of list) {
    if (last && last !== c.b.name) { flush(); console.log(`${last} done (${((Date.now() - t0) / 1000).toFixed(0)} s)`); }
    last = c.b.name;
    for (const s of stepsOf(c)) want(c, s);
  }
  flush();
  console.log(`filled: ${list.length} positions in ${((Date.now() - t0) / 1000).toFixed(1)} s; ms by kind: ${Object.entries(jsTime).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', ')}`);
  process.exit(0);
}

if (require.main === module && MOONBIT) {
  const { n, ms } = moonbit();
  console.log(`${failures.length ? 'FAIL' : 'ok  '} MoonBit dist/gen.wasm (guide 40/900, features 500/10000 on every position) and dist/mf.wasm (bench_solve 40/900/2000 on the Journey) against the JS: ${n} comparisons, ${failures.length} failed (${ms} ms)`);
  for (const f of failures.slice(0, 12)) console.log(`  ${f.name}: want ${JSON.stringify(f.want).slice(0, 300)} got ${JSON.stringify(f.got).slice(0, 300)}`);
  process.exit(failures.length ? 1 : 0);
}

if (require.main === module && CONTROLS) {
  const port = W.load(WASM);
  const all = cases(), part = all.filter((c, i) => c.start || i % 25 === 0);
  let bad = 0;
  for (const kind of KINDS) {
    failures = []; for (const k in seen) delete seen[k];
    corrupt = { kind, at: 3 };
    run(port, part, kind);
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
  let list = cases();
  if (FRAC < 1) list = list.filter((c, i) => c.start || i % Math.round(1 / FRAC) === 0);
  const t1 = Date.now();
  const { n, counts } = run(port, list);
  const boards = new Set(list.map(c => c.b.name)).size;
  console.log(`${failures.length ? 'FAIL' : 'ok  '} mech and assist: ${list.length} positions on ${boards} boards${REVERSE ? ' (in reverse)' : ''}, ${n} comparisons of ${values} values (${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}), ${failures.length} failed (${((Date.now() - t1) / 1000).toFixed(1)} s; cases ${((t1 - t0) / 1000).toFixed(1)} s)`);
  if (Object.keys(jsTime).length) console.log(`  the JS's answers computed this run (ms): ${Object.entries(jsTime).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', ')}`);
  for (const f of failures.slice(0, 12)) console.log(`  ${f.kind}: ${f.name}\n    want ${JSON.stringify(f.want)?.slice(0, 400)}\n    got  ${JSON.stringify(f.got)?.slice(0, 400)}`);
  console.log(`${port.name}: ${failures.length ? 'FAILED' : 'all passed'} in ${((Date.now() - t0) / 1000).toFixed(1)} s` + (JS ? ' (--js: the JS against itself)' : `; stack peak ${peak.bytes} bytes (${peak.where}); no imports`));
  process.exit(failures.length ? 1 : 0);
}

module.exports = { WANT, CALL, cases, run, same, nativeOf, featureIndex, failures: () => failures };
