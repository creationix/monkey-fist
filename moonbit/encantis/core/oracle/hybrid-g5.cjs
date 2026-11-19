// The JS generator of 9e69e3a with G5's units replaced by the Encantis port: every call
// grid-generator.js and dependency-metrics.js make to G.tap, G.replay, G.solve, G.minimumTaps,
// G.allFree and G.direction goes to test/g5.wasm (through the position words, as web/generator.js
// sends them), and so does every repeatedCore call. Everything else (the builders, mirrors,
// spinners, scoring, casual play, the choice among attempts) stays the JS's. The levels made are
// compared with reference.json, which the JS made alone: ropes, mirrors, springs, plan, par, exact
// and the layout key, level by level.
//
//   node moonbit/encantis/core/oracle/hybrid-g5.cjs [test/g5.wasm] [--only L30,C7] [--js]
//   node moonbit/encantis/core/oracle/hybrid-g5.cjs --fixtures g1,g2,g3,g5 [--part 0/3]   (G5's review)
//   node moonbit/encantis/core/oracle/hybrid-g5.cjs --codes U3-...,U3-... --count N [--out f.jsonl] (G5's review)
//
// --fixtures regenerates the levels of fixtures/g1-extra-boards.jsonl (g1), g2-review-boards.jsonl
// (g2), g3-review-boards.jsonl (g3) and g5-review-boards.jsonl (g5) instead, each from its code and
// index, and compares them with the fixture's line (the JS's own level at 9e69e3a): 440 levels of
// codes the reference lacks, to 48x48, with spinners on both grids. --part i/n takes every n-th.
// --codes makes levels 0 to N-1 of each code twice in the same process, by the JS alone and with
// G5's units on the port, and compares the whole level the generator returns (its qualities too:
// par, exact, coverage, complexity, slideStats, play with casualWins and challenge, mechanicStats,
// constructionStats); --out writes both as JSON lines, with the time each took.
//
// --js runs the same patched generator with the plain G and the JS's repeatedCore: the positive
// control of the comparison with reference.json. The generator receives G as an argument (F.generate(spec,
// G)), so the port's G is an object of its own; repeatedCore is an internal function, reached
// through capture.cjs's patched copy of grid-generator.js. The generator's rng is handed to the
// port as its state; afterwards the JS's rng is drawn as often as the port drew, which brings it
// to the port's state, and that is checked.
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs'), C = require('./capture.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const JS = args.includes('--js'), ONLY = opt('--only', null), FIXTURES = opt('--fixtures', null), PART = opt('--part', '0/1').split('/').map(Number);
const CODES = opt('--codes', null), COUNT = Number(opt('--count', 100)), OUT = opt('--out', null);
const WASM = args.find((a, i) => !a.startsWith('--') && !['--only', '--fixtures', '--part', '--codes', '--count', '--out'].includes(args[i - 1])) || path.join(__dirname, '../test/g5.wasm');

const { F, m } = C.captured(), G = m.G;
const port = W.load(WASM);
const EVENTS = ['exit', 'bounce', 'slide'];
const calls = {};
const count = k => { calls[k] = (calls[k] || 0) + 1; };

// Reading words back.
function reader(o) {
  let k = 0;
  const next = () => o[k++];
  const path_ = () => { const n = next(); if (!n) return null; const p = []; for (let j = 0; j < n; j++) p.push({ q: next(), r: next() }); return p; };
  return { next, path: path_, list: () => Array.from({ length: next() }, next) };
}
const solvedOf = w => w === 1 ? true : w === -1 ? null : false;

// G's functions, on the port. The defaults are game-engine.js's.
const portG = {
  ...G,
  tap(b, paths, i) {
    count('tap');
    port.push(R.position(b, paths, []));
    if (!port.x.t_tap(i)) return null;
    const r = reader(port.out()), event = EVENTS[r.next()], distance = r.next(), n = r.next(), route = [];
    for (let j = 0; j < n; j++) route.push({ q: r.next(), r: r.next() });
    const next = paths.slice(); next[i] = r.path();
    return { paths: next, event, distance, route };
  },
  replay(b, moves, paths = b.ropes) {
    count('replay');
    port.push(R.position(b, paths, moves));
    port.x.t_replay();
    const r = reader(port.out()), solved = r.next() === 1, taps = r.next(), events = r.list().map(e => EVENTS[e]);
    r.next();  // the hash
    return { solved, taps, events, paths: paths.map(() => r.path()) };
  },
  solve(b, paths = b.ropes, budget = 900, prefer = []) {
    count('solve');
    port.push(R.position(b, paths, prefer));
    port.x.t_solve(budget);
    const r = reader(port.out()), solved = solvedOf(r.next()), nodes = r.next();
    return { solved, moves: r.list(), nodes };
  },
  minimumTaps(b, fallback = b.plan, budget = 5000) {
    count('minimumTaps');
    port.push(R.position(b, b.ropes, fallback));
    if (!port.x.t_minimum(budget)) throw Error('Par requires a complete solution');
    const r = reader(port.out()), par = r.next(), exact = r.next() === 1, nodes = r.next();
    return { plan: r.list(), par, exact, nodes };
  },
  allFree(b, paths) {
    count('allFree');
    port.push(R.position(b, paths, []));
    return port.x.t_free() === 1;
  },
  direction(b, p) {
    count('direction');
    port.push(R.position(b, [p], []));
    port.x.t_direction();
    const o = port.out();
    return [o[0], o[1]];
  },
};

// repeatedCore on the port: (grid, W, height, d, rng, G).
function portCore(grid, W_, height, d, rng) {
  count('repeatedCore');
  const state = rng.state();
  const ok = port.x.t_core(grid === 'hex' ? 1 : 0, W_, height, d, state | 0);
  const draws = port.x.draws(), after = port.x.rng_state() >>> 0;
  for (let k = 0; k < draws; k++) rng();
  if (rng.state() !== after) throw Error('hybrid-g5: the JS rng did not catch up with the port');
  if (!ok) return null;
  const r = reader(port.out());
  const ropes = [r.path(), r.path()], stops = [r.list(), r.list()], plan = r.list(), par = r.next(), exact = r.next() === 1, depth = r.next();
  return { initialRopes: ropes, initialStops: stops, initialPlan: plan, corePar: par, coreExact: exact, depth };
}

const kindOf = R.kindOf;
const level = b => JSON.stringify({ grid: b.grid, W: b.W, H: b.H, ropes: b.ropes.map(p => p.map(c => [c.q, c.r])), mirrors: (b.mirrors || []).map(x => [x.cell.q, x.cell.r, kindOf(b, x)]),
  springs: (b.springs || []).map(c => [c.q, c.r]), plan: b.plan, par: b.par, exact: b.exact, layoutKey: G.layoutKey(b) });
const refLevel = r => JSON.stringify({ grid: r.grid, W: r.W, H: r.H, ropes: r.ropes, mirrors: r.mirrors.map(([q, rr, k]) => [q, rr, r.grid === 'hex' ? k : k === '\\' ? 1 : 0]), springs: r.springs,
  plan: r.plan, par: r.par, exact: r.exact, layoutKey: r.layoutKey });

if (CODES) {
  const t0 = Date.now(), ms = { js: 0, port: 0 };
  let n = 0, bad = 0, none = 0;
  const hook = (name, f, a) => name === 'repeatedCore' ? portCore(...a) : f(...a);
  for (const code of CODES.split(',')) for (let i = 0; i < COUNT; i++) {
    const spec = G.spec(G.parseCode(code), i);
    globalThis.__mfCapture = null;
    let t = Date.now(); const want = F.generate(spec, G); const tj = Date.now() - t;
    globalThis.__mfCapture = hook;
    t = Date.now(); const got = F.generate(spec, portG); const tp = Date.now() - t;
    globalThis.__mfCapture = null;
    ms.js += tj; ms.port += tp; n++;
    if (!want) none++;
    const same = JSON.stringify(want) === JSON.stringify(got);
    if (!same) { bad++; console.log(`DIFFERS ${code} #${i}: ${JSON.stringify(got).slice(0, 200)}\n   want ${JSON.stringify(want).slice(0, 200)}`); }
    if (OUT) fs.appendFileSync(OUT, JSON.stringify({ code, index: i, same, msJs: tj, msPort: tp, js: want, port: got }) + '\n');
    if (args.includes('--verbose')) console.log(`${same ? 'same' : 'DIFF'} ${code} #${i} JS ${tj} ms, port ${tp} ms`);
  }
  console.log(`${bad ? 'FAIL' : 'ok  '} ${n} levels of ${CODES} made by the JS alone and with G5's units on the port: ${n - bad} the same (every field, the qualities too), ${none} null; JS ${(ms.js / 1000).toFixed(1)} s, port ${(ms.port / 1000).toFixed(1)} s; port calls: ${Object.entries(calls).map(([k, v]) => `${k} ${v}`).join(', ')} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  process.exit(bad ? 1 : 0);
}

const FILES = { g1: 'g1-extra-boards.jsonl', g2: 'g2-review-boards.jsonl', g3: 'g3-review-boards.jsonl', g5: 'g5-review-boards.jsonl' };
let boards = FIXTURES ? FIXTURES.split(',').flatMap(set => fs.readFileSync(path.join(__dirname, 'fixtures', FILES[set]), 'utf8').trim().split('\n')
  .map((l, k) => { const j = JSON.parse(l); return { name: `${set}#${k + 1}`, code: j.code, index: j.index, ref: j }; })).filter((_, i) => i % PART[1] === PART[0]) : R.boards();
if (ONLY) boards = boards.filter(b => ONLY.split(',').includes(b.name));
globalThis.__mfCapture = JS ? null : (name, f, a) => name === 'repeatedCore' ? portCore(...a) : f(...a);
const t0 = Date.now();
let bad = 0;
for (const b of boards) {
  const spec = b.code ? G.spec(G.parseCode(b.code), b.index) : G.spec({ kind: 'journey' }, Number(b.name.slice(1)) - 1);
  const t = Date.now();
  const made = F.generate(spec, JS ? G : portG);
  const same = level(made) === refLevel(b.ref);
  if (!same) { bad++; console.log(`DIFFERS ${b.name}: ${level(made).slice(0, 200)}\n   want ${refLevel(b.ref).slice(0, 200)}`); }
  if (args.includes('--verbose')) console.log(`${same ? 'same' : 'DIFF'} ${b.name} ${b.code || ''} ${Date.now() - t} ms (JS alone: ${b.ref.ms} ms)`);
}
globalThis.__mfCapture = null;
console.log(`${bad ? 'FAIL' : 'ok  '} the JS generator with ${JS ? 'the JS alone (--js)' : "G5's units on the port"}: ${boards.length - bad} of ${boards.length} ${FIXTURES ? 'fixture (' + FIXTURES + (PART[1] > 1 ? ' part ' + PART.join('/') : '') + ')' : 'reference'} levels the same (ropes, mirrors, springs, plan, par, exact, layout key), in ${((Date.now() - t0) / 1000).toFixed(1)} s` +
  (JS ? '' : `; port calls: ${Object.entries(calls).map(([k, v]) => `${k} ${v}`).join(', ')}`));
process.exit(bad ? 1 : 0);
