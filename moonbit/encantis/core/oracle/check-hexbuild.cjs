// G4's oracle: the Hex woven builder of the Encantis core (hexbuild.ents) against H.build and
// intentions() of hex/engine.js at 9e69e3a.
//
//   node moonbit/encantis/core/oracle/check-hexbuild.cjs [test/g4.wasm]   the port, on the fixture
//   node moonbit/encantis/core/oracle/check-hexbuild.cjs --js             the positive control
//   node moonbit/encantis/core/oracle/check-hexbuild.cjs --controls       the negative controls
//   options: --reverse (the cases in reverse order), --seeds 20 (also that many other seeds per
//            cfg, against the live JS), --only 3,17 (case ids), --frac 0.2 (a share of the cases)
//
// The cases are fixtures/hexbuild-expected.json (dump-hexbuild.cjs: 250 H.build calls recorded
// while the real generator made the Hex Journey levels and custom Hex and mixed sets, each with
// the generator's state at entry and the cfg as plain numbers). Per case the port's
// t_build(state, coverage, tapDepth) is compared with the recorded result:
//   null      whether it built a board
//   ropes     every cell of every rope, from tail to head
//   stops     per rope the head cells it stops at (from a copy of hex/engine.js whose build also
//             returns its stops: the fixture does not keep them)
//   plan      the certificate
//   slides    the knots made; traps, the traps made
//   depth     the certified replay's deepest layer; cost, its summed exit layers
//   draws     the generator's draws, and its state after (draws and state must agree)
// Then intentions() itself, on each built board (the JS's ropes and stops), against the copy's
// intentions: with the plan as certificate (intent-cert), with none (intent-free, the fixpoint
// order), and with the last rope left out and its plan's moves dropped (intent-less: usually
// still a solution; a null where a stop needed it).
//
// With --seeds N, each cfg is also run from N other states (mulberry32 seeds made from the
// case's state), the port against the live JS, field for field as above (no fixture).
//
// intentions is not in hex/engine.js's api, and build does not return its stops. Both are read
// from a copy of it made at run time with two text substitutions, each checked to apply once;
// the copy draws as the original does, and every case checks that its build gives the fixture's
// result and draws.
//
// --controls runs each kind again with its 3rd comparison's expected value spoiled, on a share
// of the cases, and requires exactly that comparison to fail, by name.
//
// The port is put in its draw-exact mode first (t_draw_exact(1)): by default hex_build draws
// less than the JS where that cannot change what it builds (DX-LOG, G4's departures), and then
// only the quality oracle (quality-hexbuild.cjs) applies.
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs');
const D = require('./dump-hexbuild.cjs');

const args = process.argv.slice(2);
const VALUED = ['--only', '--frac', '--seeds'];
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const JS = args.includes('--js'), CONTROLS = args.includes('--controls'), REVERSE = args.includes('--reverse');
const WASM = args.find((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1])) || path.join(__dirname, '../test/g4.wasm');
const ONLY = opt('--only', null), FRAC = Number(opt('--frac', 1)), SEEDS = Number(opt('--seeds', 0));
R.js();

// --- The copy of hex/engine.js ---

function internals() {
  let src = fs.readFileSync(path.join(R.dir, 'hex/engine.js'), 'utf8');
  const swap = (from, to) => {
    const at = src.split(from).length - 1;
    if (at !== 1) throw Error(`hex/engine.js: the text to substitute appears ${at} times: ${from.slice(0, 60)}`);
    src = src.replace(from, to);
  };
  swap('return { ...level, plan: result.moves, slides: knots,', 'return { ...level, stops: stops.map(s => s == null ? [] : Array.isArray(s) ? s.slice() : [s]), plan: result.moves, slides: knots,');
  swap('cellIndex: cell, reflect, build, compile };', 'cellIndex: cell, reflect, build, compile, intentions };');
  const m = { exports: {} };
  new Function('module', src)(m);
  return m.exports;
}
const HI = internals();

// --- Comparing (check-g3's) ---

let corrupt = null;
const seen = {};
let failures = [];
function same(kind, name, want, got) {
  const k = seen[kind] = (seen[kind] || 0) + 1;
  if (corrupt && corrupt.kind === kind && corrupt.at === k) want = spoil(want);
  const ok = typeof want === 'object' ? JSON.stringify(want) === JSON.stringify(got) : Object.is(want, got);
  if (!ok) failures.push({ kind, name, want, got });
  return ok;
}
const spoil = v => typeof v === 'number' ? (Number.isInteger(v) ? v + 1 : v * (1 + 2 ** -50) || 1) : Array.isArray(v) ? [...v, 99] : typeof v === 'boolean' ? !v : { ...v, spoiled: 1 };

// --- Words ---

const list = xs => [xs.length, ...xs];
const pts = path => [path.length, ...path.flatMap(p => [p.q, p.r])];
// A case's cfg as t_build reads it (the two doubles are arguments).
function cfgWords(cfg) {
  const w = [cfg.W, cfg.H, cfg.stage, cfg.length, cfg.knots, cfg.traps || 0];
  w.push(cfg.mirrors.length); for (const [q, r, a] of cfg.mirrors) w.push(q, r, a);
  w.push(cfg.initialRopes.length); for (const p of cfg.initialRopes) { w.push(p.length); for (const [q, r] of p) w.push(q, r); }
  w.push(cfg.initialStops.length); for (const s of cfg.initialStops) w.push(...list(s));
  if (cfg.initialPlan) w.push(1, ...list(cfg.initialPlan)); else w.push(0);
  return w;
}
// A replay as t_intentions reads it: the board, the stops (head cells), the certificate.
function intentWords(level, stops, cert) {
  const w = [level.W, level.H, (level.mirrors || []).length];
  for (const m of level.mirrors || []) w.push(m.cell.q, m.cell.r, m.axis);
  w.push(level.ropes.length); for (const p of level.ropes) w.push(...pts(p));
  w.push(stops.length); for (const s of stops) w.push(...list(s));
  if (cert) w.push(1, ...list(cert)); else w.push(0);
  return w;
}

// What t_build writes, read back: { ropes, stops, plan, slides, traps, depth, cost }.
function readBuilt(o) {
  let k = 0; const next = () => o[k++];
  const n = next(), ropes = [], stops = [];
  for (let i = 0; i < n; i++) { const l = next(), p = []; for (let j = 0; j < l; j++) p.push([next(), next()]); ropes.push(p); }
  for (let i = 0; i < n; i++) { const l = next(), s = []; for (let j = 0; j < l; j++) s.push(next()); stops.push(s); }
  const pl = next(), plan = []; for (let j = 0; j < pl; j++) plan.push(next());
  return { ropes, stops, plan, slides: next(), traps: next(), depth: next(), cost: next() };
}
function readIntent(o) {
  const n = o[0];
  return { moves: o.slice(1, 1 + n), cost: o[1 + n], depth: o[2 + n], slides: o[3 + n] };
}

// --- The JS side ---

// A case's arguments again (dump-hexbuild's argsOf), from a state.
function jsArgs(c, state) {
  const [, cfg] = D.argsOf(c);
  return [R.mulberry32(state), cfg];
}
// The copy's build: { out, draws, state } with out as t_build's fields (ropes as [q, r]).
function jsBuild(c, state) {
  const [rng, cfg] = jsArgs(c, state);
  const before = R.draws();
  const b = HI.build(rng, cfg);
  const draws = R.draws() - before;
  if (!b) return { out: null, draws, state: rng.state() };
  return { out: { ropes: b.ropes.map(p => p.map(x => [x.q, x.r])), stops: b.stops, plan: b.plan, slides: b.slides, traps: b.traps,
    depth: b.stats.depth, cost: Math.round(b.stats.averageDepth * b.ropes.length) }, draws, state: rng.state(), level: b };
}
const jsIntent = (level, stops, cert) => { const t = HI.intentions(level, stops, cert); return t ? { moves: t.moves, cost: t.cost, depth: t.depth, slides: t.slides } : null; };

// The positive control: the copy behind the hooks, through the same words.
function fakePort() {
  let lastState = 0, lastDraws = 0;
  return W.fake(io => ({
    draws: () => lastDraws,
    rng_state: () => lastState | 0,
    stack_peak: () => 0,
    t_build(state, coverage, tapDepth) {
      const w = io.input(); let k = 0; const next = () => w[k++];
      const cfg = { W: next(), H: next(), stage: next(), length: next(), minLength: 2, knots: next(), traps: next(), coverage, tapDepth };
      const nm = next(); cfg.mirrors = []; for (let i = 0; i < nm; i++) cfg.mirrors.push({ cell: { q: next(), r: next() }, axis: next() });
      const nr = next(), ropes = []; for (let i = 0; i < nr; i++) { const l = next(), p = []; for (let j = 0; j < l; j++) p.push({ q: next(), r: next() }); ropes.push(p); }
      const ns = next(), st = []; for (let i = 0; i < ns; i++) { const l = next(), s = []; for (let j = 0; j < l; j++) s.push(next()); st.push(s); }
      const hasPlan = next(); let plan = null; if (hasPlan) { const l = next(); plan = []; for (let j = 0; j < l; j++) plan.push(next()); }
      if (nr) Object.assign(cfg, { initialRopes: ropes, initialStops: st, initialPlan: plan });
      const rng = R.mulberry32(state >>> 0), before = R.draws();
      const b = HI.build(rng, cfg);
      lastDraws = R.draws() - before; lastState = rng.state();
      io.clear();
      if (!b) return 0;
      io.put(b.ropes.length); for (const p of b.ropes) io.put(...pts(p));
      for (const s of b.stops) io.put(...list(s));
      io.put(...list(b.plan), b.slides, b.traps, b.stats.depth, Math.round(b.stats.averageDepth * b.ropes.length));
      return 1;
    },
    t_intentions() {
      const w = io.input(); let k = 0; const next = () => w[k++];
      const level = { W: next(), H: next() };
      const nm = next(), mirrors = []; for (let i = 0; i < nm; i++) mirrors.push({ cell: { q: next(), r: next() }, axis: next() });
      if (nm) level.mirrors = mirrors;
      const nr = next(); level.ropes = []; for (let i = 0; i < nr; i++) { const l = next(), p = []; for (let j = 0; j < l; j++) p.push({ q: next(), r: next() }); level.ropes.push(p); }
      const ns = next(), st = []; for (let i = 0; i < ns; i++) { const l = next(), s = []; for (let j = 0; j < l; j++) s.push(next()); st.push(s); }
      let cert = null; if (next()) { const l = next(); cert = []; for (let j = 0; j < l; j++) cert.push(next()); }
      io.clear();
      const t = HI.intentions(level, st, cert);
      if (!t) return 0;
      io.put(...list(t.moves), t.cost, t.depth, t.slides);
      return 1;
    },
  }));
}

// --- The checks ---

const MASK = 0x6D2B79F5;
// mulberry32's state after k draws from s: each draw adds 0x6D2B79F5.
const after = (s, k) => (s + Math.imul(MASK, k)) >>> 0;

// One build from `state`: the port against want ({ out, draws }, out null for none).
function checkBuild(port, c, state, want, name) {
  port.push(cfgWords(c.cfg));
  const built = port.x.t_build(state | 0, c.cfg.coverage, c.cfg.tapDepth);
  const draws = port.x.draws(), st = port.x.rng_state() >>> 0;
  same('draws', name, want.draws, draws);
  same('state', name, after(state, want.draws), st);
  if (!same('null', name, want.out === null, built === 0) || !want.out) return null;
  const got = readBuilt(port.out());
  for (const f of ['ropes', 'stops', 'plan', 'slides', 'traps', 'depth', 'cost']) same(f, name, want.out[f], got[f]);
  return got;
}

// intentions on a built board (the JS's level and stops), three ways.
function checkIntentions(port, level, stops, plan, name) {
  const run = (kind, lv, st, cert) => {
    port.push(intentWords(lv, st, cert));
    const ok = port.x.t_intentions();
    const want = jsIntent(lv, st, cert);
    if (same(kind + '-null', name, want === null, ok === 0) && want) same(kind, name, want, readIntent(port.out()));
  };
  run('intent-cert', level, stops, plan);
  run('intent-free', level, stops, null);
  const n = level.ropes.length;
  if (n > 1) run('intent-less', { ...level, ropes: level.ropes.slice(0, n - 1) }, stops.slice(0, n - 1), plan.filter(i => i !== n - 1));
}

function selected() {
  let cases = D.read().cases;
  if (ONLY) { const ids = new Set(ONLY.split(',').map(Number)); cases = cases.filter(c => ids.has(c.id)); }
  if (FRAC < 1) cases = cases.filter((c, k) => (k * 0.6180339887498949) % 1 < FRAC);
  if (REVERSE) cases = cases.slice().reverse();
  return cases;
}

// A seed for the k-th other run of a case.
const otherSeed = (state, k) => (Math.imul(state ^ 0x9E3779B9, 0x85EBCA6B) + Math.imul(k + 1, 0xC2B2AE35)) >>> 0;

function run(port) {
  const cases = selected();
  const t0 = Date.now();
  let builds = 0, intents = 0, values = 0;
  for (const c of cases) {
    const name = `case ${c.id} (${c.from})`;
    const js = jsBuild(c, c.state);
    // the copy is the original: the fixture's result and draws
    if (JSON.stringify(js.out && { ropes: js.out.ropes, plan: js.out.plan, slides: js.out.slides, traps: js.out.traps, depth: js.out.depth, cost: js.out.cost }) !== JSON.stringify(c.out) || js.draws !== c.draws)
      throw Error(`the copy of hex/engine.js does not give ${name}'s recorded result`);
    const want = { out: c.out && { ...c.out, stops: js.out.stops }, draws: c.draws };
    const got = checkBuild(port, c, c.state, want, name);
    builds++;
    if (got) values += got.ropes.reduce((s, p) => s + 2 * p.length, 0) + got.plan.length;
    if (js.out) { checkIntentions(port, js.level, js.out.stops, js.out.plan, name); intents += 3; }
    for (let k = 0; k < SEEDS; k++) {
      const s = otherSeed(c.state, k), o = jsBuild(c, s), nm = `${name} seed ${s}`;
      const g = checkBuild(port, c, s, o, nm);
      builds++;
      if (g) values += g.ropes.reduce((t, p) => t + 2 * p.length, 0) + g.plan.length;
    }
  }
  return { cases: cases.length, builds, intents, values, ms: Date.now() - t0, peak: port.x.stack_peak() };
}

function report(r) {
  const comparisons = Object.values(seen).reduce((a, b) => a + b, 0);
  console.log(`${r.cases} cases, ${r.builds} builds, ${r.intents} intentions; ${comparisons} comparisons (${r.values} rope and plan words), ${failures.length} failed, ${(r.ms / 1000).toFixed(1)} s; stack peak ${r.peak}`);
  console.log('per kind:', JSON.stringify(seen));
  for (const f of failures.slice(0, 12)) console.log('FAIL', f.kind, f.name, '\n  want', JSON.stringify(f.want).slice(0, 300), '\n  got ', JSON.stringify(f.got).slice(0, 300));
}

if (require.main === module && CONTROLS) {
  // Each kind with its 3rd comparison spoiled must fail there, and only there.
  const port = W.load(WASM);
  port.x.t_draw_exact(1);
  const kinds = ['draws', 'state', 'null', 'ropes', 'stops', 'plan', 'slides', 'traps', 'depth', 'cost', 'intent-cert-null', 'intent-cert', 'intent-free-null', 'intent-free', 'intent-less-null', 'intent-less'];
  let ok = 0;
  for (const kind of kinds) {
    for (const k in seen) delete seen[k];
    failures = []; corrupt = { kind, at: 3 };
    run(port);
    const named = failures.length === 1 && failures[0].kind === kind;
    console.log(named ? 'caught' : 'MISSED', kind, failures.length ? failures[0].name : '(no failure)', failures.length > 1 ? `(+${failures.length - 1} more)` : '');
    if (named) ok++;
  }
  console.log(`controls: ${ok} of ${kinds.length} kinds fail on one spoiled value and name its case`);
  process.exit(ok === kinds.length ? 0 : 1);
} else if (require.main === module) {
  const port = JS ? fakePort() : W.load(WASM);
  if (port.x.t_draw_exact) port.x.t_draw_exact(1);
  const r = run(port);
  report(r);
  process.exit(failures.length ? 1 : 0);
}

module.exports = { cfgWords, intentWords, readBuilt, readIntent, internals, otherSeed, after };
