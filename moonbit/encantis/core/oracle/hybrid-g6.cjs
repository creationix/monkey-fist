// The JS generator of 9e69e3a with G6's units replaced by the Encantis port: every call
// grid-generator.js makes to valid, coverage, regional, trivial, featuresUsed, featureStats,
// postpone, score and casualRate (its internal functions, reached through capture.cjs's patched
// copy), and to Q.analyze, goes to test/g6.wasm (through the position words). Everything else (the
// builders, mirrors, spinners, the taps and searches of G.*, the choice among attempts) stays the
// JS's. The levels made are compared with reference.json, which the JS made alone: ropes, mirrors,
// springs, plan, par, exact and the layout key, level by level.
//
//   node moonbit/encantis/core/oracle/hybrid-g6.cjs [test/g6.wasm] [--only L30,C7] [--js] [--verbose]
//   node moonbit/encantis/core/oracle/hybrid-g6.cjs --codes U3-...,U3-... --count N [--out f.jsonl]
//
// --codes makes levels 0 to N-1 of each code twice in the same process, by the JS alone and with
// G6's units on the port, and compares the whole level the generator returns, its measured qualities
// included (par, exact, coverage, slideStats, play with casualWins and challenge, mechanicStats, and
// of the complexity the six fields the port computes: interaction, joins, mutualWaitRopes,
// revisitedRopes, branchingDepth, largestCoupledGroup).
//
// --js runs the same patched generator with the JS's own functions: the positive control. The
// generator's rng is handed to the port's casualRate as its state; afterwards the JS's rng is drawn
// as often as the port drew, which brings it to the port's state, and that is checked.
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs'), C = require('./capture.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const JS = args.includes('--js'), ONLY = opt('--only', null), CODES = opt('--codes', null), COUNT = Number(opt('--count', 100)), OUT = opt('--out', null);
const WASM = args.find((a, i) => !a.startsWith('--') && !['--only', '--codes', '--count', '--out'].includes(args[i - 1])) || path.join(__dirname, '../test/g6.wasm');

const { F, m } = C.captured(), G = m.G, Q = m.Q;
const port = W.load(WASM);
const calls = {};
const count = k => { calls[k] = (calls[k] || 0) + 1; };
const list = o => o.slice(1, 1 + o[0]);

// G6's units, on the port. Each pushes the board with the plan the unit reads.
const at = (b, plan) => port.push(R.position(b, b.ropes, plan || b.plan || []));
const UNITS = {
  valid: b => { count('valid'); at(b); return port.x.t_valid() === 1; },
  coverage: b => { count('coverage'); at(b); return port.x.t_coverage(); },
  regional: b => { count('regional'); at(b); return port.x.t_regional() === 1; },
  trivial: b => { count('trivial'); at(b); return port.x.t_trivial() === 1; },
  featuresUsed: b => { count('featuresUsed'); at(b); return port.x.t_features_used() === 1; },
  featureStats: (b, plan, manual) => {
    count('featureStats'); at(b, plan);
    if (!port.x.t_feature_stats(manual)) return null;
    const o = port.out();
    return { usedMirrors: o[0], usedSprings: o[1], manualMirrors: o[2], manualSprings: o[3] };
  },
  postpone: (b, G_, plan) => { count('postpone'); at(b, plan); port.x.t_postpone(); return list(port.out()); },
  score: (b, G_, skip) => {
    count('score'); at(b); port.x.t_score(skip ? 1 : 0);
    const o = port.out(), r = { plan: o.slice(4, 4 + o[3]), par: o[0], exact: o[1] === 1 };
    // minimumTaps's answer carries its nodes (spinner boards of at most 12 ropes)
    if (!skip && b.springs.length && b.ropes.length <= 12) r.nodes = o[2];
    return r;
  },
  casualRate: (b, G_, rng, games) => {
    count('casualRate'); at(b);
    const state = rng.state(), v = port.x.t_casual(games, state | 0), draws = port.x.draws();
    for (let k = 0; k < draws; k++) rng();
    if (rng.state() !== (state + Math.imul(draws, 0x6D2B79F5)) >>> 0) throw Error('hybrid-g6: the JS rng did not catch up with the port');
    return v;
  },
};
function analyze(b, plan, manual) {
  count('Q.analyze'); at(b, plan);
  const interaction = port.x.t_analyze(manual), o = port.out();
  return { interaction, joins: o[0], mutualWaitRopes: o[1], revisitedRopes: o[2], branchingDepth: o[3], largestCoupledGroup: o[4] };
}
const hook = (name, f, a) => UNITS[name] ? UNITS[name](...a) : f(...a);
const plainAnalyze = Q.analyze;
const usePort = on => { globalThis.__mfCapture = on ? hook : null; Q.analyze = on ? analyze : plainAnalyze; };

const kindOf = R.kindOf;
const level = b => JSON.stringify({ grid: b.grid, W: b.W, H: b.H, ropes: b.ropes.map(p => p.map(c => [c.q, c.r])), mirrors: (b.mirrors || []).map(x => [x.cell.q, x.cell.r, kindOf(b, x)]),
  springs: (b.springs || []).map(c => [c.q, c.r]), plan: b.plan, par: b.par, exact: b.exact, layoutKey: G.layoutKey(b) });
const refLevel = r => JSON.stringify({ grid: r.grid, W: r.W, H: r.H, ropes: r.ropes, mirrors: r.mirrors.map(([q, rr, k]) => [q, rr, r.grid === 'hex' ? k : k === '\\' ? 1 : 0]), springs: r.springs,
  plan: r.plan, par: r.par, exact: r.exact, layoutKey: r.layoutKey });
// A whole level, its complexity cut to the fields the port computes.
const SIX = ['interaction', 'joins', 'mutualWaitRopes', 'revisitedRopes', 'branchingDepth', 'largestCoupledGroup'];
const whole = l => l && JSON.stringify({ ...l, complexity: l.complexity ? Object.fromEntries(SIX.map(k => [k, l.complexity[k]])) : l.complexity });

if (CODES) {
  const t0 = Date.now(), ms = { js: 0, port: 0 };
  let n = 0, bad = 0, none = 0;
  for (const code of CODES.split(',')) for (let i = 0; i < COUNT; i++) {
    const spec = G.spec(G.parseCode(code), i);
    usePort(false);
    let t = Date.now(), want = null; try { want = F.generate(spec, G); } catch (e) { if (!/densely/.test(e.message)) throw e; } const tj = Date.now() - t;
    usePort(!JS);
    t = Date.now(); let got = null; try { got = F.generate(spec, G); } catch (e) { if (!/densely/.test(e.message)) throw e; } const tp = Date.now() - t;
    usePort(false);
    ms.js += tj; ms.port += tp; n++;
    if (!want) none++;
    const same = whole(want) === whole(got);
    if (!same) { bad++; console.log(`DIFFERS ${code} #${i}: ${whole(got)?.slice(0, 200)}\n   want ${whole(want)?.slice(0, 200)}`); }
    if (OUT) fs.appendFileSync(OUT, JSON.stringify({ code, index: i, same, msJs: tj, msPort: tp, js: want, port: got }) + '\n');
    if (args.includes('--verbose')) console.log(`${same ? 'same' : 'DIFF'} ${code} #${i} JS ${tj} ms, port ${tp} ms`);
  }
  console.log(`${bad ? 'FAIL' : 'ok  '} ${n} levels of ${CODES} made by the JS alone and with G6's units on the port: ${n - bad} the same (every field, the qualities too), ${none} null; JS ${(ms.js / 1000).toFixed(1)} s, port ${(ms.port / 1000).toFixed(1)} s; port calls: ${Object.entries(calls).map(([k, v]) => `${k} ${v}`).join(', ')} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  process.exit(bad ? 1 : 0);
}

let boards = R.boards();
if (ONLY) boards = boards.filter(b => ONLY.split(',').includes(b.name));
usePort(!JS);
const t0 = Date.now();
let bad = 0;
for (const b of boards) {
  const spec = b.code ? G.spec(G.parseCode(b.code), b.index) : G.spec({ kind: 'journey' }, Number(b.name.slice(1)) - 1);
  const t = Date.now();
  const made = F.generate(spec, G);
  const same = level(made) === refLevel(b.ref);
  if (!same) { bad++; console.log(`DIFFERS ${b.name}: ${level(made).slice(0, 200)}\n   want ${refLevel(b.ref).slice(0, 200)}`); }
  if (args.includes('--verbose')) console.log(`${same ? 'same' : 'DIFF'} ${b.name} ${b.code || ''} ${Date.now() - t} ms (JS alone: ${b.ref.ms} ms)`);
}
usePort(false);
console.log(`${bad ? 'FAIL' : 'ok  '} the JS generator with ${JS ? 'the JS alone (--js)' : "G6's units on the port"}: ${boards.length - bad} of ${boards.length} reference levels the same (ropes, mirrors, springs, plan, par, exact, layout key), in ${((Date.now() - t0) / 1000).toFixed(1)} s` +
  (JS ? '' : `; port calls: ${Object.entries(calls).map(([k, v]) => `${k} ${v}`).join(', ')}`));
process.exit(bad ? 1 : 0);
