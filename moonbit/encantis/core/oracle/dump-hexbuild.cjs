// G4's fixture: the Hex woven builder's calls (H.build of hex/engine.js at 9e69e3a), recorded
// while the real generator makes levels, and kept as plain numbers.
//
//   node moonbit/encantis/core/oracle/dump-hexbuild.cjs            write fixtures/hexbuild-expected.json
//   node moonbit/encantis/core/oracle/dump-hexbuild.cjs --verify   record again and compare with the file
//   node moonbit/encantis/core/oracle/dump-hexbuild.cjs --stats    print what the kept cases cover
//
// Nothing here invents a cfg. capture.cjs wraps H.build on the module object grid-generator.js
// calls it through, and the generator (G.spec, then F.generate) runs over
//   - every Hex level of the Journey (60 specs: 4x6 to 12x14, mirrors, spinners, cores), and
//   - custom Hex and mixed sets (U3 codes, CUSTOM below): 4x5 to 24x24, the 32x32 colossal map
//     with and without mirrors, difficulties 1 to 100, with and without mirrors and spinners.
// One generate() makes up to ten attempts (three on a colossal map), each one woven() call and
// so one H.build call unless placeMirrors found no room. At difficulty 60 and over, alternate
// attempts pass the repeated-slide core (initialRopes, initialStops, initialPlan).
//
// The selection (select below), fixed and documented: every null result; for every spec its
// first call (attempt 0); for every spec its first call with a core, if any; then calls drawn
// with mulberry32(0x6B4) from the rest until there are TARGET in all. They are kept in the order
// they were made. Each kept case is then run again from its numbers alone (a fresh
// mulberry32(state) and the cfg rebuilt from the file) and must give the recorded result and
// draw count: that proves the fixture holds all that H.build depends on.
//
// The file: { reference, rule, cases: [...] }, one case per line:
//   id     the case's index
//   from   the spec it came from (Journey level, or code#index), the call's number in that
//          generate(), the grid size, the difficulty
//   state  mulberry32's state as H.build was entered (an unsigned 32-bit word)
//   cfg    every field H.build reads: W, H, stage, length, knots, traps (integers), coverage,
//          tapDepth (doubles), mirrors [q, r, axis] in the order given, initialRopes (each a list
//          of [q, r] from tail to head; [] without a core), initialStops (per core rope, the
//          offsets it stops at), initialPlan (the core's plan, or null). minLength is 2 in every
//          call (asserted), so it is not kept.
//   draws  how many times H.build called rng()
//   out    null, or { ropes, plan, slides, traps, depth, cost }: ropes as [q, r] lists from tail
//          to head; plan the certificate (rope indices); slides the knots made; traps the traps
//          made; depth and cost the certified replay's deepest layer and summed exit layers
//          (stats.depth, and stats.averageDepth times the rope count)
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs');
const C = require('./capture.cjs');

const FIXTURE = path.join(__dirname, 'fixtures', 'hexbuild-expected.json');
const TARGET = 250;
// Custom specs: [code, indexes]. Mixed sets are Hex at odd indexes.
const CUSTOM = [
  ['U3-H-1-100-4-5-12-N-G4A', [0, 4, 8, 11]],
  ['U3-H-1-100-6-6-10-N-G4B', [2, 6, 9]],
  ['U3-H-1-100-8-8-10-M-G4C', [1, 5, 9]],
  ['U3-H-1-100-8-8-10-S-G4D', [3, 8]],
  ['U3-H-1-100-12-12-10-N-G4E', [0, 4, 7, 9]],
  ['U3-H-1-100-12-12-10-M-G4F', [2, 6, 9]],
  ['U3-H-1-100-12-12-10-MS-G4G', [5, 9]],
  ['U3-H-1-100-16-16-6-M-G4H', [1, 5]],
  ['U3-H-1-100-16-10-6-N-G4I', [2, 5]],
  ['U3-H-1-100-24-24-5-N-G4J', [1, 4]],
  ['U3-H-1-100-24-24-5-M-G4K', [2, 4]],
  ['U3-H-1-100-32-32-3-C-G4L', [0, 2]],
  ['U3-H-1-100-32-32-3-MC-G4M', [1, 2]],
  ['U3-M-1-100-10-14-12-N-G4N', [1, 7, 11]],
  ['U3-M-1-100-12-12-12-M-G4O', [3, 9]],
];

// The specs: the 60 Hex Journey levels, then the custom ones.
function specs() {
  const { G } = R.js();
  const out = [];
  for (let i = 0; i < 120; i++) { const s = G.spec(G.DEFAULT, i); if (s.grid === 'hex') out.push({ label: 'L' + (i + 1), spec: s }); }
  for (const [code, idx] of CUSTOM) {
    const o = G.parseCode(code); if (!o) throw Error('invalid code ' + code);
    for (const i of idx) { const s = G.spec(o, i); if (s.grid !== 'hex') throw Error(code + '#' + i + ' is not Hex'); out.push({ label: code + '#' + i, spec: s }); }
  }
  return out;
}

const qr = path => path.map(p => [p.q, p.r]);
// A recorded call as a case (args are capture.cjs's plain data).
function toCase(rec, label, spec) {
  const [rng, cfg] = rec.args;
  if (cfg.minLength !== 2) throw Error('minLength is not 2 in ' + label);
  const c = {
    from: `${label} call ${rec.n} ${cfg.W}x${cfg.H} d=${spec.difficulty}`, state: rng.$rng,
    cfg: { W: cfg.W, H: cfg.H, stage: cfg.stage, length: cfg.length, knots: cfg.knots, traps: cfg.traps || 0, coverage: cfg.coverage, tapDepth: cfg.tapDepth,
      mirrors: (cfg.mirrors || []).map(m => [m.cell.q, m.cell.r, m.axis]), initialRopes: (cfg.initialRopes || []).map(qr),
      initialStops: cfg.initialStops || [], initialPlan: cfg.initialPlan || null },
    draws: rec.draws, out: outOf(rec.result),
  };
  return c;
}
function outOf(r) {
  if (!r) return null;
  return { ropes: r.ropes.map(qr), plan: r.plan, slides: r.slides, traps: r.traps, depth: r.stats.depth, cost: Math.round(r.stats.averageDepth * r.ropes.length) };
}

// H.build's arguments again, from a case alone.
function argsOf(c) {
  const cfg = c.cfg, pt = ([q, r]) => ({ q, r });
  const o = { W: cfg.W, H: cfg.H, stage: cfg.stage, coverage: cfg.coverage, length: cfg.length, minLength: 2, tapDepth: cfg.tapDepth,
    mirrors: cfg.mirrors.map(([q, r, axis]) => ({ cell: { q, r }, axis })), knots: cfg.knots, traps: cfg.traps };
  if (cfg.initialRopes.length) Object.assign(o, { initialRopes: cfg.initialRopes.map(p => p.map(pt)), initialStops: cfg.initialStops, initialPlan: cfg.initialPlan });
  return [R.mulberry32(c.state), o];
}
// Runs a case on the JS: { out, draws }.
function runJS(c) {
  const { H } = R.js();
  const [rng, cfg] = argsOf(c);
  const before = R.draws();
  const out = outOf(H.build(rng, cfg));
  return { out, draws: R.draws() - before };
}

// Every H.build call of every spec, in order.
function recordAll(log) {
  const all = [];
  for (const { label, spec } of specs()) {
    const t = Date.now();
    const recs = C.record(['H.build'], [spec]);
    recs.forEach(rec => all.push({ label, spec, rec }));
    if (log) console.error(label, recs.length, 'calls', Date.now() - t, 'ms');
  }
  return all;
}

function select(all) {
  const keep = new Set();
  all.forEach((x, k) => { if (!x.rec.result) keep.add(k); });
  const firstOf = new Map(), coreOf = new Map();
  all.forEach((x, k) => {
    if (!firstOf.has(x.label)) firstOf.set(x.label, k);
    if (!coreOf.has(x.label) && x.rec.args[1].initialRopes?.length) coreOf.set(x.label, k);
  });
  for (const k of firstOf.values()) keep.add(k);
  for (const k of coreOf.values()) keep.add(k);
  const rest = all.map((_, k) => k).filter(k => !keep.has(k)), r = R.mulberry32(0x6B4);
  while (keep.size < TARGET && rest.length) keep.add(rest.splice(Math.floor(r() * rest.length), 1)[0]);
  return [...keep].sort((a, b) => a - b).map(k => all[k]);
}

function build(log) {
  const all = recordAll(log);
  const chosen = select(all);
  const cases = chosen.map((x, id) => ({ id, ...toCase(x.rec, x.label, x.spec) }));
  // run each again from its numbers alone
  for (const c of cases) {
    const { out, draws } = runJS(c);
    if (JSON.stringify(out) !== JSON.stringify(c.out) || draws !== c.draws) throw Error('case ' + c.id + ' does not replay from its numbers: ' + c.from);
  }
  return { all: all.length, nulls: all.filter(x => !x.rec.result).length, cores: all.filter(x => x.rec.args[1].initialRopes?.length).length, cases };
}

function stats(cases) {
  const by = f => { const m = {}; for (const c of cases) { const k = f(c); m[k] = (m[k] || 0) + 1; } return m; };
  const ws = cases.map(c => c.cfg.W * c.cfg.H);
  return { cases: cases.length, nulls: cases.filter(c => !c.out).length, cores: cases.filter(c => c.cfg.initialRopes.length).length,
    mirrors: cases.filter(c => c.cfg.mirrors.length).length, traps: by(c => c.out ? c.out.traps : 'null'), knotsMade: by(c => c.out ? c.out.slides + '/' + c.cfg.knots : 'null'),
    areas: [Math.min(...ws), Math.max(...ws)], draws: [Math.min(...cases.map(c => c.draws)), Math.max(...cases.map(c => c.draws))],
    ropes: cases.filter(c => c.out).map(c => c.out.ropes.length).reduce((a, b) => Math.max(a, b), 0) };
}

const line = c => JSON.stringify(c);
function write(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '{"reference":"9e69e3a","rule":' + JSON.stringify('every null; per spec its first call and its first call with a core; then mulberry32(0x6B4) draws to ' + TARGET) +
    ',"recorded":' + data.all + ',"cases":[\n' + data.cases.map(line).join(',\n') + '\n]}\n');
}
const read = (file = FIXTURE) => JSON.parse(fs.readFileSync(file, 'utf8'));

module.exports = { FIXTURE, CUSTOM, specs, argsOf, runJS, outOf, read, stats };

if (require.main === module) {
  const arg = process.argv[2];
  const t = Date.now();
  if (arg === '--stats') { console.log(JSON.stringify(stats(read().cases), null, 1)); process.exit(0); }
  const data = build(true);
  console.error(`recorded ${data.all} calls (${data.nulls} null, ${data.cores} with a core), kept ${data.cases.length}, each replayed from its numbers: ${Date.now() - t} ms`);
  if (arg === '--verify') {
    const old = read().cases, same = old.length === data.cases.length && old.every((c, k) => line(c) === line(data.cases[k]));
    console.log(same ? 'fixture verified: the same ' + old.length + ' cases' : 'fixture DIFFERS');
    process.exit(same ? 0 : 1);
  }
  write(FIXTURE, data);
  console.log('wrote', FIXTURE, JSON.stringify(stats(data.cases)));
}
