// G4's review: the exact oracle of check-hexbuild.cjs on every H.build call the 9e69e3a generator
// makes for specs the fixture never saw. The generator runs as the JS does (each call answered by
// the JS's own build, so the levels and the next calls are the JS's); each call is also given to
// the port in its draw-exact mode from the same state, and compared field for field: null, ropes,
// stops, plan, knots, traps, depth, cost, draws and the state after. Then intentions() three ways
// on each built board (check-hexbuild's: with the plan, with none, without the last rope).
//
//   node check-hexbuild-shadow.cjs [--suffix S] [--per N] [--codes a,b,...] [--journey] [--wasm w]
//   node check-hexbuild-shadow.cjs --control ...   the negative control: the port in its default mode
//                                                  (departures D1, D2), which must fail (draws first)
//
// --per N: N levels of each code, spread over its indexes (default 10). --suffix: appended to
// every level's seed (default 'SH'), so the states are new. --journey: the 60 Hex Journey specs
// too, with the suffix. The default codes: the edge sizes (4x4 to 24x4 and 4x24), both kinds of
// Hex board (plain, mirrors), spinners (the builds before they are added), the colossal rules at
// sizes the fixture lacks (12x12, 48x16, 8x48 with mirrors, 48x48), difficulties 1 to 100, and a
// mixed set.
'use strict';
const path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs'), C = require('./check-hexbuild.cjs'), Y = require('./hybrid.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const WASM = opt('--wasm', path.join(__dirname, '../test/g4.wasm'));
const SUFFIX = opt('--suffix', 'SH'), PER = Number(opt('--per', 10));
const CODES = (opt('--codes', null) || [
  'U3-H-1-100-4-4-20-N-SA', 'U3-H-1-100-5-4-20-N-SB', 'U3-H-1-100-4-24-20-N-SC', 'U3-H-1-100-24-4-20-N-SD',
  'U3-H-1-100-7-9-20-N-SE', 'U3-H-1-100-13-11-20-N-SF', 'U3-H-1-100-8-8-20-M-SG', 'U3-H-1-100-8-24-20-M-SH',
  'U3-H-1-100-24-8-20-M-SI', 'U3-H-1-100-15-17-20-M-SJ', 'U3-H-1-100-10-14-20-S-SK', 'U3-H-1-100-12-12-20-MS-SL',
  'U3-H-1-100-18-18-20-N-SM', 'U3-H-1-100-22-24-20-M-SN', 'U3-H-1-100-12-12-20-C-SO', 'U3-H-1-100-48-16-20-MC-SP',
  'U3-H-1-100-8-48-20-MC-SQ', 'U3-H-1-100-48-48-20-C-SR', 'U3-H-1-100-20-20-20-MSC-SS', 'U3-H-90-100-14-14-20-M-ST',
  'U3-H-1-10-10-14-20-N-SU', 'U3-M-1-100-11-13-20-MS-SV'].join(',')).split(',');

const { G, F, H } = R.js();
const HI = C.internals();
const port = W.load(WASM);
const CONTROL = args.includes('--control');
port.x.t_draw_exact(CONTROL ? 0 : 1);

let comparisons = 0, failures = [], builds = 0, nulls = 0, throws = 0, intents = 0, values = 0, level = '';
const same = (kind, want, got, name) => {
  comparisons++;
  const ok = typeof want === 'object' ? JSON.stringify(want) === JSON.stringify(got) : Object.is(want, got);
  if (!ok) failures.push({ kind, name, want, got });
  return ok;
};

function intentWords(lv, stops, cert) { return C.intentWords(lv, stops, cert); }
function checkIntentions(lv, stops, plan, name) {
  const run = (kind, l, st, cert) => {
    port.push(intentWords(l, st, cert));
    const ok = port.x.t_intentions();
    const t = HI.intentions(l, st, cert), want = t && { moves: t.moves, cost: t.cost, depth: t.depth, slides: t.slides };
    if (same(kind + '-null', want === null, ok === 0, name) && want) same(kind, want, C.readIntent(port.out()), name);
    intents++;
  };
  run('intent-cert', lv, stops, plan);
  run('intent-free', lv, stops, null);
  const n = lv.ropes.length;
  if (n > 1) run('intent-less', { ...lv, ropes: lv.ropes.slice(0, n - 1) }, stops.slice(0, n - 1), plan.filter(i => i !== n - 1));
}

H.build = (rng, cfg) => {
  if (cfg.minLength !== 2 || cfg.ropeCount || cfg.tapDepth == null) throw Error('shadow: a cfg the port does not take');
  const state = rng.state(), before = R.draws(), name = `${level} build ${builds}`;
  let b = null, thrown = null;
  try { b = HI.build(rng, cfg); } catch (e) { thrown = e; }
  const draws = R.draws() - before;
  builds++;
  port.push(Y.words(cfg));
  const ok = port.x.t_build(state | 0, cfg.coverage, cfg.tapDepth);
  // a throw draws what it drew before it: compare only when the JS returned
  if (thrown) {
    throws++;
    same('null', true, ok === 0, name);   // the port returns none where the JS throws (a core way out passing a cell twice)
    if (!/twice/.test(thrown.message)) failures.push({ kind: 'throw', name, want: 'twice', got: thrown.message });
    throw thrown;
  }
  same('draws', draws, port.x.draws(), name);
  same('state', rng.state(), port.x.rng_state() >>> 0, name);
  if (!same('null', b === null, ok === 0, name) || !b) { if (!b) nulls++; return b; }
  const got = C.readBuilt(port.out());
  const want = { ropes: b.ropes.map(p => p.map(x => [x.q, x.r])), stops: b.stops, plan: b.plan, slides: b.slides, traps: b.traps,
    depth: b.stats.depth, cost: Math.round(b.stats.averageDepth * b.ropes.length) };
  for (const f of ['ropes', 'stops', 'plan', 'slides', 'traps', 'depth', 'cost']) same(f, want[f], got[f], name);
  values += got.ropes.reduce((s, p) => s + 2 * p.length, 0) + got.plan.length;
  checkIntentions(b, b.stops, b.plan, name);
  const { stops, ...level_ } = b;   // the copy's extra field: H.build does not return it
  return level_;
};

const t0 = Date.now();
const jobs = [];
for (const code of CODES) {
  const o = G.parseCode(code); if (!o) throw Error('invalid code ' + code);
  for (let k = 0; k < PER; k++) jobs.push([code, G.spec(o, Math.round(k * (o.count - 1) / Math.max(1, PER - 1)))]);
}
if (args.includes('--journey')) for (let i = 0; i < 120; i++) { const s = G.spec(G.DEFAULT, i); if (s.grid === 'hex') jobs.push(['J', s]); }
let levels = 0, failed = 0;
for (const [code, s] of jobs) {
  level = `${code}#${s.index} ${s.grid} ${s.W}x${s.H} d=${s.difficulty.toFixed(0)}`;
  levels++;
  try { F.generate({ ...s, seed: s.seed + SUFFIX }, G); } catch (e) { if (!/densely/.test(e.message)) throw e; failed++; }
}
const kinds = {};
console.log(`${levels} levels (${failed} not generated), ${builds} builds (${nulls} null, ${throws} thrown), ${intents} intentions; ${comparisons} comparisons (${values} rope and plan words), ${failures.length} failed, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
for (const f of failures.slice(0, 12)) console.log('FAIL', f.kind, f.name, '\n  want', JSON.stringify(f.want).slice(0, 300), '\n  got ', JSON.stringify(f.got).slice(0, 300));
if (CONTROL) {
  const caught = failures.some(f => f.kind === 'draws');
  console.log(caught ? 'control: the default mode fails, on draws first' : 'control MISSED: the default mode passed');
  process.exit(caught ? 0 : 1);
}
process.exit(failures.length ? 1 : 0);
