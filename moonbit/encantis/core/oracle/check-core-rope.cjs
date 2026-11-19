// G5's oracle for the repeated-slide core (core-rope.ents's repeated_core) against
// grid-generator.js's repeatedCore at 9e69e3a.
//
//   node moonbit/encantis/core/oracle/check-core-rope.cjs [test/g5.wasm]  the port
//   node moonbit/encantis/core/oracle/check-core-rope.cjs --js            the positive control
//   node moonbit/encantis/core/oracle/check-core-rope.cjs --controls      the negative controls
//   options: --dump (record the fixture again), --wide N (N more cases on random inputs, against
//            the live JS; default 3000), --levels K (record over the first K Journey levels)
//
// 1. Recorded calls (fixtures/core-rope-expected.json): every repeatedCore call the real generator
//    makes (capture.cjs, the rejected attempts' included) over the 120 Journey levels and the 15
//    custom codes of reference.json. Each is replayed in the port from its numbers alone (grid, W,
//    height, d, the generator's state at entry): null or not, the two ropes cell by cell, their
//    stops, the plan, par, exact and depth, the draws made and the generator's state after.
// 2. Wide (--wide N): N calls on inputs drawn at random (both grids, W and height 4 to 48, d from
//    0 to 100 with a third of them at 60 or more, any state), compared with the JS's function
//    called on the same numbers, the same fields.
//
// The owner's decision of 19 Nov lets generation differ from the JS where its qualities stay. The
// core costs nothing to keep exact, so this oracle stays exact; with every call equal, the
// distribution of what the core gives is the JS's own.
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs'), C = require('./capture.cjs');

const args = process.argv.slice(2);
const VALUED = ['--wide', '--levels'];
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const JS = args.includes('--js'), CONTROLS = args.includes('--controls'), DUMP = args.includes('--dump');
const WASM = args.find((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1])) || path.join(__dirname, '../test/g5.wasm');
const WIDE = Number(opt('--wide', 3000)), LEVELS = Number(opt('--levels', 120));
const FIXTURE = path.join(__dirname, 'fixtures/core-rope-expected.json');

// --- The fixture ---

function dump() {
  const { m } = C.captured(), G = m.G;
  const specs = [];
  for (let i = 0; i < LEVELS; i++) specs.push(G.spec({ kind: 'journey' }, i));
  for (const b of R.boards().filter(b => b.code)) specs.push(G.spec(G.parseCode(b.code), b.index));
  const t = Date.now();
  const recs = C.record(['repeatedCore'], specs);
  let bad = 0;
  for (const r of recs) if (!C.replay(r).same) bad++;
  if (bad) throw Error(`${bad} records do not replay from their numbers`);
  const out = recs.map(r => ({ n: r.n, grid: r.args[0], W: r.args[1], H: r.args[2], d: r.args[3], state: r.args[4].$rng, result: r.result, draws: r.draws }));
  fs.writeFileSync(FIXTURE, JSON.stringify({ reference: R.REFERENCE, specs: specs.length, made: new Date().toISOString().slice(0, 10), calls: out }));
  console.log(`recorded ${out.length} repeatedCore calls over ${specs.length} levels in ${((Date.now() - t) / 1000).toFixed(1)} s (${out.filter(c => c.result).length} gave a core); every one replays from its numbers`);
}

// --- Comparing ---

let corrupt = null, count = 0;
let failures = [];
function same(name, want, got) {
  count++;
  if (corrupt && corrupt.at === count) want = { ...want, [corrupt.field]: spoil(want[corrupt.field]) };
  const ok = JSON.stringify(want) === JSON.stringify(got);
  if (!ok) failures.push({ name, want, got });
  return ok;
}
const spoil = v => typeof v === 'number' ? v + 1 : Array.isArray(v) ? [...v, 99] : v === null ? 1 : !v;

// What a call gives, as fields to compare: from the JS's result, or from the port's words.
function fields(result, draws, stateAfter) {
  if (!result) return { core: null, draws, state: stateAfter };
  return { core: 1, ropes: result.initialRopes.map(p => p.flatMap(c => [c.q, c.r])), stops: result.initialStops, plan: result.initialPlan,
    par: result.corePar, exact: result.coreExact, depth: result.depth, draws, state: stateAfter };
}
const after = (state, draws) => (state + Math.imul(draws, 0x6D2B79F5)) >>> 0;
let peak = 0;
function portFields(port, c) {
  const got = port.x.t_core(c.grid === 'hex' ? 1 : 0, c.W, c.H, c.d, c.state | 0);
  peak = Math.max(peak, port.x.stack_peak());
  const draws = port.x.draws(), state = port.x.rng_state() >>> 0;
  if (!got) return { core: null, draws, state };
  const w = port.out(); let k = 0;
  const next = () => w[k++], list = () => Array.from({ length: next() }, next);
  const ropes = [0, 1].map(() => { const n = next(); return Array.from({ length: 2 * n }, next); });
  const stops = [list(), list()], plan = list();
  return { core: 1, ropes, stops, plan, par: next(), exact: next() === 1, depth: next(), draws, state };
}

// The JS on the same numbers (repeatedCore as capture.cjs reaches it), through the same fields.
function jsCall(c) {
  const rec = { name: 'repeatedCore', args: [c.grid, c.W, c.H, c.d, { $rng: c.state >>> 0 }, { $G: 1 }] };
  const r = C.replay(rec);
  return fields(r.result, r.draws, after(c.state >>> 0, r.draws));
}

// The positive control: t_core answered by the JS.
function jsHooks(io) {
  let draws = 0, state = 0;
  return { draws: () => draws, rng_state: () => state, stack_peak: () => 0,
    t_core: (hex, w, h, d, s) => {
      io.clear();
      const f = jsCall({ grid: hex ? 'hex' : 'square', W: w, H: h, d, state: s >>> 0 });
      draws = f.draws; state = f.state;
      if (!f.core) return 0;
      for (const p of f.ropes) io.put(p.length / 2, ...p);
      for (const s2 of f.stops) io.put(s2.length, ...s2);
      io.put(f.plan.length, ...f.plan, f.par, f.exact ? 1 : 0, f.depth);
      return 1;
    } };
}

// Inputs at random: both grids, 4 to 48 a side, any difficulty (a third at 60 or more, where the
// core is deeper), any state.
function wideCases(n) {
  const rng = R.mulberry32(0xC0DE5);
  const out = [];
  for (let i = 0; i < n; i++) {
    const grid = rng() < 0.5 ? 'hex' : 'square', W_ = 4 + Math.floor(rng() * 45), H_ = 4 + Math.floor(rng() * 45);
    const d = rng() < 1 / 3 ? 60 + rng() * 40 : rng() * 100, state = Math.floor(rng() * 4294967296);
    out.push({ name: `wide ${i + 1}: ${grid} ${W_}x${H_} d ${d.toFixed(3)} state ${state}`, grid, W: W_, H: H_, d, state });
  }
  return out;
}

function run(port, list) {
  let cores = 0;
  for (const c of list) {
    const want = c.want || jsCall(c), got = portFields(port, c);
    same(c.name, want, got);
    if (want.core) cores++;
  }
  return cores;
}

if (require.main === module) {
  if (DUMP || !fs.existsSync(FIXTURE)) dump();
  const fx = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  const recorded = fx.calls.map((c, i) => ({ ...c, name: `call ${i + 1} (#${c.n}: ${c.grid} ${c.W}x${c.H} d ${c.d})`, want: fields(c.result, c.draws, after(c.state, c.draws)) }));
  const port = JS ? W.fake(jsHooks) : W.load(WASM);
  if (CONTROLS) {
    const FIELDS = ['core', 'ropes', 'stops', 'plan', 'par', 'exact', 'depth', 'draws', 'state'];
    let bad = 0;
    for (const field of FIELDS) {
      failures = []; count = 0;
      const at = recorded.findIndex(c => c.want.core) + 1;
      corrupt = { at, field };
      run(port, recorded);
      const ok = failures.length === 1 && failures[0].name === recorded[at - 1].name;
      if (!ok) bad++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} control ${field}: ${failures.length} failure(s)${failures[0] ? ', named: ' + failures[0].name : ''}`);
    }
    console.log(bad ? `${bad} control(s) did not fail as they should` : 'every control failed, and named its case');
    process.exit(bad ? 1 : 0);
  }
  const t0 = Date.now();
  const cores = run(port, recorded);
  const t1 = Date.now();
  console.log(`${failures.length ? 'FAIL' : 'ok  '} repeatedCore, recorded: ${recorded.length} calls over ${fx.specs} levels (${cores} gave a core), ${failures.length} failed (${t1 - t0} ms)`);
  const before = failures.length;
  const wide = wideCases(WIDE), wc = run(port, wide);
  console.log(`${failures.length > before ? 'FAIL' : 'ok  '} repeatedCore, wide: ${wide.length} calls on random inputs (${wc} gave a core), ${failures.length - before} failed (${Date.now() - t1} ms)`);
  for (const f of failures.slice(0, 8)) console.log(`  ${f.name}\n    want ${JSON.stringify(f.want).slice(0, 300)}\n    got  ${JSON.stringify(f.got).slice(0, 300)}`);
  console.log(`${port.name}: ${failures.length ? 'FAILED' : 'all passed'}` + (JS ? ' (--js: the JS against itself)' : `; stack peak ${peak} bytes; no imports`));
  process.exit(failures.length ? 1 : 0);
}
