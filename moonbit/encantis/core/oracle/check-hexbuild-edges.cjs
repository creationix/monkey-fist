// G4's review: hex_build in its draw-exact mode against H.build of 9e69e3a on cfgs the generator
// never makes, for the branches and limits the recorded calls do not reach: every way a core is
// refused (a rope shorter than two cells, off the board, on another rope's cell; a way out that
// passes a cell twice, where the JS throws; a certificate that fails; stops off the track), a
// core replayed without a certificate, more knots or traps than fit (the attempt limits), full
// coverage, odd tapDepth, length and stage values, dense mirrors, and boards of one row or column
// and 2x2 to 3x3. Each cfg from several states; compared as check-hexbuild.cjs compares (null,
// ropes, stops, plan, knots, traps, depth, cost, draws, state), and intentions() three ways.
//
//   node check-hexbuild-edges.cjs [--states 4] [--wasm w] [--list]
'use strict';
const path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs'), C = require('./check-hexbuild.cjs'), D = require('./dump-hexbuild.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const WASM = opt('--wasm', path.join(__dirname, '../test/g4.wasm'));
const STATES = Number(opt('--states', 4));

const HI = C.internals();
// A cfg in the fixture's form (dump-hexbuild.cjs), with defaults.
const cfg = o => ({ W: 8, H: 8, stage: 30, length: 16, knots: 2, traps: 2, coverage: 0.99, tapDepth: 4, mirrors: [], initialRopes: [], initialStops: [], initialPlan: null, ...o });
// A small solved core (from the generator's repeatedCore on 8x8 at d=80): found below.
function generatorCore() {
  const { G, H } = R.js();
  let core = null;
  const inner = H.build;
  H.build = (rng, c) => { if (!core && c.initialRopes?.length) core = { W: c.W, H: c.H, ropes: c.initialRopes.map(p => p.map(x => [x.q, x.r])), stops: c.initialStops, plan: c.initialPlan }; return inner(rng, c); };
  for (let i = 40; i < 50 && !core; i++) { try { R.js().F.generate({ ...G.spec(G.parseCode('U3-H-60-100-8-8-50-N-EDGE'), i), seed: 'EDGE' + i }, G); } catch (e) { if (!/densely/.test(e.message)) throw e; } }
  H.build = inner;
  if (!core) throw Error('no core found');
  return core;
}
const core = generatorCore();
const coreCfg = o => cfg({ W: core.W, H: core.H, initialRopes: core.ropes, initialStops: core.stops, initialPlan: core.plan, ...o });
// A 2-cell rope and mirrors on 6x6 whose way out passes a cell twice (tools/find-loop.cjs).
const LOOP = { W: 6, H: 6, rope: [[1, 5], [1, 4]], mirrors: [[0, 2, 2], [0, 1, 2], [1, 2, 0], [0, 3, 0], [4, 1, 0], [-2, 5, 0]] };
// Dense mirrors: every third cell of the interior of 10x10, axes in turn.
const dense = [];
{ const { H } = R.js(); for (const p of H.cells({ W: 10, H: 10 })) { const col = p.q + Math.floor(p.r / 2); if (col > 0 && col < 9 && p.r > 0 && p.r < 9 && (col * 7 + p.r * 3) % 5 === 0) dense.push([p.q, p.r, (col + p.r) % 3]); } }

const CASES = [
  ['core: a rope of one cell', coreCfg({ initialRopes: [[core.ropes[0][0]], ...core.ropes.slice(1)] })],
  ['core: a rope off the board', coreCfg({ initialRopes: [core.ropes[0].map(([q, r]) => [q - 20, r]), ...core.ropes.slice(1)] })],
  ['core: two ropes on one cell', coreCfg({ initialRopes: [core.ropes[0], [core.ropes[0][0], ...core.ropes[1].slice(1)], ...core.ropes.slice(2)] })],
  ['core: a way out passing a cell twice (the JS throws)', cfg({ W: LOOP.W, H: LOOP.H, mirrors: LOOP.mirrors, initialRopes: [LOOP.rope], initialStops: [[]], initialPlan: [0] })],
  ['core: a certificate that fails', coreCfg({ initialPlan: [core.plan[core.plan.length - 1]] })],
  ['core: an empty certificate', coreCfg({ initialPlan: [] })],
  ['core: no certificate (the fixpoint)', coreCfg({ initialPlan: null })],
  ['core: stops off the track', coreCfg({ initialStops: core.stops.map(s => s.length ? [s[0], 99] : [99]) })],
  ['core: fewer stop lists than ropes', coreCfg({ initialStops: core.stops.slice(0, 1) })],
  ['core: no stops at all, no certificate', coreCfg({ initialStops: [], initialPlan: null })],
  ['core, then full coverage and many knots', coreCfg({ knots: 12, traps: 6, coverage: 1 })],
  ['knots: far more than fit (the attempt limit)', cfg({ W: 6, H: 6, knots: 40 })],
  ['traps: more than fit, full coverage', cfg({ W: 8, H: 8, knots: 0, traps: 30, coverage: 1 })],
  ['coverage 1 on 12x12', cfg({ W: 12, H: 12, coverage: 1, knots: 4, traps: 4 })],
  ['coverage 0', cfg({ coverage: 0 })],
  ['tapDepth 0', cfg({ tapDepth: 0 })],
  ['tapDepth 1', cfg({ tapDepth: 1 })],
  ['tapDepth 100', cfg({ tapDepth: 100, W: 10, H: 10 })],
  ['length 1', cfg({ length: 1 })],
  ['length 80 on 12x12', cfg({ length: 80, W: 12, H: 12 })],
  ['stage 0', cfg({ stage: 0 })],
  ['stage 200 (knot ropes 38 long)', cfg({ stage: 200, W: 12, H: 12 })],
  ['dense mirrors 10x10', cfg({ W: 10, H: 10, mirrors: dense })],
  ['dense mirrors 10x10, many traps', cfg({ W: 10, H: 10, mirrors: dense, knots: 6, traps: 10, coverage: 1 })],
  ['the looping mirrors without a core', cfg({ W: LOOP.W, H: LOOP.H, mirrors: LOOP.mirrors })],
  ['one row 12x1', cfg({ W: 12, H: 1 })],
  ['one column 1x12', cfg({ W: 1, H: 12 })],
  ['2x2', cfg({ W: 2, H: 2 })],
  ['3x3', cfg({ W: 3, H: 3, knots: 1, traps: 1 })],
  ['2x9', cfg({ W: 2, H: 9 })],
  ['24x24, d=100 as the game asks', cfg({ W: 24, H: 24, stage: 59, length: 48, knots: 9, traps: 13, tapDepth: 8 })],
  ['40x40 with traps (no game cfg has both)', cfg({ W: 40, H: 40, stage: 59, length: 80, knots: 20, traps: 20, tapDepth: 8 })],
];

if (args.includes('--list')) { CASES.forEach(([n], i) => console.log(i, n)); process.exit(0); }

const port = W.load(WASM);
port.x.t_draw_exact(1);
let peak = 0, comparisons = 0, failures = [], builds = 0, built = 0, nulls = 0, throws = 0, intents = 0;
const same = (kind, want, got, name) => {
  comparisons++;
  const ok = typeof want === 'object' ? JSON.stringify(want) === JSON.stringify(got) : Object.is(want, got);
  if (!ok) failures.push({ kind, name, want, got });
  return ok;
};
const t0 = Date.now();
CASES.forEach(([title, c], ci) => {
  for (let k = 0; k < STATES; k++) {
    const state = C.otherSeed(0xED6E + ci, k), name = `${ci} ${title} (state ${state})`;
    const kase = { state, cfg: c };
    const [rng, jcfg] = D.argsOf(kase);
    const before = R.draws();
    let b = null, thrown = null;
    try { b = HI.build(rng, jcfg); } catch (e) { thrown = e; }
    const draws = R.draws() - before;
    builds++;
    port.push(C.cfgWords(c));
    let ok;
    try { ok = port.x.t_build(state | 0, c.coverage, c.tapDepth); } catch (e) { failures.push({ kind: 'port trap', name, want: thrown ? 'throw: ' + thrown.message : 'a result', got: String(e) }); continue; }
    peak = Math.max(peak, port.x.stack_peak());
    if (thrown) {
      throws++;
      if (/twice/.test(thrown.message)) same('null (JS throws twice)', true, ok === 0, name);
      else failures.push({ kind: 'JS throws', name, want: '', got: thrown.message });
      continue;
    }
    same('draws', draws, port.x.draws(), name);
    same('state', rng.state(), port.x.rng_state() >>> 0, name);
    if (!same('null', b === null, ok === 0, name) || !b) { if (!b) nulls++; continue; }
    built++;
    const got = C.readBuilt(port.out());
    const want = { ropes: b.ropes.map(p => p.map(x => [x.q, x.r])), stops: b.stops, plan: b.plan, slides: b.slides, traps: b.traps, depth: b.stats.depth, cost: Math.round(b.stats.averageDepth * b.ropes.length) };
    for (const f of ['ropes', 'stops', 'plan', 'slides', 'traps', 'depth', 'cost']) same(f, want[f], got[f], name);
    const run = (kind, l, st, cert) => {
      port.push(C.intentWords(l, st, cert));
      const okI = port.x.t_intentions();
      const t = HI.intentions(l, st, cert), w = t && { moves: t.moves, cost: t.cost, depth: t.depth, slides: t.slides };
      if (same(kind + '-null', w === null, okI === 0, name) && w) same(kind, w, C.readIntent(port.out()), name);
      intents++;
    };
    run('intent-cert', b, b.stops, b.plan);
    run('intent-free', b, b.stops, null);
    if (b.ropes.length > 1) run('intent-less', { ...b, ropes: b.ropes.slice(0, -1) }, b.stops.slice(0, -1), b.plan.filter(i => i !== b.ropes.length - 1));
  }
});
console.log(`${CASES.length} cfgs x ${STATES} states: ${builds} builds (${built} built, ${nulls} null, ${throws} thrown by the JS), ${intents} intentions; ${comparisons} comparisons, ${failures.length} failed, ${((Date.now() - t0) / 1000).toFixed(1)} s; build stack peak ${peak} bytes`);
for (const f of failures.slice(0, 20)) console.log('FAIL', f.kind, f.name, '\n  want', JSON.stringify(f.want).slice(0, 200), '\n  got ', JSON.stringify(f.got).slice(0, 200));
process.exit(failures.length ? 1 : 0);
