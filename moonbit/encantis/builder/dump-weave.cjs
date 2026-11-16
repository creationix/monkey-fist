// The oracle for the Encantis port of the square woven builder, weave(rng, cfg).
//
// Regenerates weave-expected.json from the JS the MoonBit core was ported from
// (levels.js at commit 9e69e3a, read out of git history):
//
//   node moonbit/encantis/builder/dump-weave.cjs            write weave-expected.json
//   node moonbit/encantis/builder/dump-weave.cjs --verify   regenerate and compare with the file
//   node moonbit/encantis/builder/dump-weave.cjs --stats    also print what the cases cover
//   node moonbit/encantis/builder/dump-weave.cjs --trace N [FROM [TO]]
//                                                           print case N's rng draws, one per line:
//                                                           its number, the call site, the bound
//
// Nothing here invents a cfg. The script runs the real generator of 9e69e3a
// (game-engine.js generate -> grid-generator.js generate -> woven) over real
// specifications, with levels.js's weave wrapped so that every call is recorded:
// the state of the generator's mulberry32 as weave is entered (mulberry32's
// whole state is one 32-bit word, so mulberry32(state) continues the sequence),
// the cfg woven built, and what weave returned. The specifications are
//   - every square board of the Journey (grid-journey.js), and
//   - custom sets (U3 codes) from 4x4 to 12x16, at difficulties 1 to 100, plain,
//     with mirrors, with spinners and with both, then 24x24 and one 40x40
//     colossal map (long ropes).
// One generate() makes up to ten attempts, each a weave call. At difficulty 60
// and over, alternate attempts pass the repeated-slide core as initial ropes,
// stops and plan. A fixed, documented selection of the recorded calls is kept
// (see select below). Each kept case is then run again from its plain-number
// form alone, with an untouched mulberry32(seed), and must give the recorded
// result: that proves the fixture's input is all weave depends on.
//
// The file. { reference, cases: [...] }, one case per line:
//   id      the case's index
//   from    where it came from: the specification, the attempt, the difficulty, the style
//   seed    mulberry32 seed (unsigned 32-bit): weave(mulberry32(seed), cfg)
//   cfg     every field weave reads, as plain numbers:
//             W, H, lenLo, lenHi, minLen, tie, bait, pull           integers
//             ropeCount (0: not set), keepBounds (1: true)         integers, the same in every case
//             straight, cover, tapDepth                            doubles
//             bends, lo, hi, wantAvg, floor                        doubles; with tapDepth set and
//                                                                  lo 0, hi 1000000, floor 0 they decide nothing
//             mirrors       [cell, kind] pairs in the Map's own order (aimed() depends on it);
//                           cell is y * W + x, kind 0 for '/' and 1 for '\'
//             initialRopes  the core's ropes, each a list of cells y * W + x from tail to head ([] without a core)
//             initialStops  per core rope, the offsets it is meant to stop at, in order
//             initialPlan   the order to tap the core in, or null
//   draws   how many times weave called rng()
//   out     null, or { ropes, taps, knots, traps }: ropes as lists of cells y * W + x from tail to
//           head, in rope order; taps the solution (ropes in the order to tap them); knots and
//           traps as finished() counts them on the finished board (ropes meant to slide that
//           start in a loop; slides open at the start that leave a rope that can never get out).
//           (keepBounds is always set, so the board is never trimmed or turned: W and H are cfg's.)
//
// check-weave.cjs runs a wasm build of the port against this file, with the helpers
// exported from here. What a port has to reproduce exactly is listed below, beside
// SITES (every place the builder draws from the rng).
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');

const REFERENCE = '9e69e3a';
const FIXTURE = path.join(__dirname, 'weave-expected.json');
const REPO = path.join(__dirname, '../../..');
// levels.js and random.js are the builder; the rest is what its caller, the generator, loads.
const FILES = ['levels.js', 'random.js', 'grid-generator.js', 'game-engine.js', 'mechanics.js', 'hex/engine.js', 'hex/mechanics.js', 'dependency-metrics.js', 'grid-journey.js'];

// The reference JS, read from git into a temporary directory and loaded from there.
// `all` also loads the generator (game-engine.js); otherwise only levels.js and random.js.
function reference(all) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'weave-ref-'));
  process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
  for (const f of all ? FILES : FILES.slice(0, 2)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), execFileSync('git', ['-C', REPO, 'show', `${REFERENCE}:${f}`], { maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'pipe'] }));
  }
  const L = require(path.join(dir, 'levels.js'));
  return { L, G: all ? require(path.join(dir, 'game-engine.js')) : null, dir };
}

// mulberry32 exactly as random.js has it, with its state readable.
function mulberry32(a) {
  const rng = function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  rng.state = () => a >>> 0;
  return rng;
}

// ---- plain numbers <-> what weave takes and returns ----
const INTS = ['W', 'H', 'lenLo', 'lenHi', 'minLen', 'tie', 'bait', 'pull'];
const DOUBLES = ['straight', 'cover', 'tapDepth', 'bends', 'lo', 'hi', 'wantAvg', 'floor'];
const KNOWN = new Set([...INTS, ...DOUBLES, 'ropeCount', 'keepBounds', 'mirrors', 'initialRopes', 'initialStops', 'initialPlan',
  'style', 'slide', 'corePar', 'coreExact', 'depth']); // the last five are never read by weave

// A cfg as woven built it -> the fixture's plain form.
function plainCfg(cfg) {
  for (const k of Object.keys(cfg)) if (!KNOWN.has(k)) throw Error('weave was given a cfg field this script does not know: ' + k);
  const W = cfg.W, out = {};
  for (const k of INTS) { if (!Number.isInteger(cfg[k])) throw Error(k + ' is not an integer'); out[k] = cfg[k]; }
  out.ropeCount = cfg.ropeCount || 0; out.keepBounds = cfg.keepBounds ? 1 : 0;
  for (const k of DOUBLES) { if (typeof cfg[k] !== 'number' || !Number.isFinite(cfg[k])) throw Error(k + ' is not a number'); out[k] = cfg[k]; }
  out.mirrors = [...cfg.mirrors].map(([cell, slope]) => [cell, slope === '/' ? 0 : 1]);
  out.initialRopes = (cfg.initialRopes || []).map(p => p.map(c => c.y * W + c.x));
  out.initialStops = (cfg.initialRopes || []).map((_, i) => (cfg.initialStops?.[i] || []).slice());
  out.initialPlan = cfg.initialRopes?.length && cfg.initialPlan ? cfg.initialPlan.slice() : null;
  return out;
}
// The fixture's plain form -> a cfg for the reference weave.
function cfgOf(plain) {
  const W = plain.W, cfg = {};
  for (const k of INTS) cfg[k] = plain[k];
  for (const k of DOUBLES) cfg[k] = plain[k];
  if (plain.ropeCount) cfg.ropeCount = plain.ropeCount;
  cfg.keepBounds = !!plain.keepBounds;
  cfg.mirrors = new Map(plain.mirrors.map(([cell, kind]) => [cell, kind ? '\\' : '/']));
  if (plain.initialRopes.length) {
    cfg.initialRopes = plain.initialRopes.map(p => p.map(c => ({ x: c % W, y: Math.floor(c / W) })));
    cfg.initialStops = plain.initialStops.map(s => s.slice());
    if (plain.initialPlan) cfg.initialPlan = plain.initialPlan.slice();
  }
  return cfg;
}
// What weave returned -> the fixture's plain form.
function plainOut(raw, cfg) {
  if (!raw) return null;
  if (raw.W !== cfg.W || raw.H !== cfg.H) throw Error('weave changed the board size');
  return { ropes: raw.ropes.map(p => p.map(c => c.y * raw.W + c.x)), taps: raw.taps.slice(), knots: raw.knots, traps: raw.traps };
}
// Run the reference weave on a case's plain input. Returns { out, draws }.
function run(L, c) {
  const base = L.mulberry32(c.seed); let draws = 0;
  const cfg = cfgOf(c.cfg), raw = L.weave(() => { draws++; return base(); }, cfg);
  return { out: plainOut(raw, cfg), draws };
}

// ---- what a port has to reproduce exactly ----
//
// The rng. mulberry32 gives k / 2^32 for a 32-bit k, and weave uses it in four ways:
//   below   Math.floor(rng() * n), an index or a count. Exact as (k * n) >> 32 in 64 bits,
//           or as floor(f64(k) / 4294967296.0 * f64(n)).
//   pick    r = rng() * sum, then r -= weight for each option in turn until r < 0 (the
//           last option if it never is). Weights and sum are integers; r is a double.
//   chance  rng() < p, with p a double (cfg.straight, 0.75, 0.5, or a quotient).
//   jitter  rng() * 0.6, added to a candidate's score.
// A draw happens only where the JS evaluates rng(): mind the short circuits. The
// conditions are written out per site below. Every draw is made even when it cannot
// change anything (a pick among one option, a chance with p = 1).
const SITES = [null,
  /*  1 */ ['grow: length', 'below', 'want = lenLo + below(lenHi - lenLo + 1). Once, on entry.'],
  /*  2 */ ['grow: straight on?', 'chance', 'rng() < straight. Only if this is not the forced first step, a step has been taken (last >= 0) and the last direction is still open.'],
  /*  3 */ ['grow: direction', 'below', 'opts[below(opts.length)]. If site 2 was not drawn or said no (never on the forced first step).'],
  /*  4 */ ['shape: head first?', 'chance', 'rng() < 0.75. Only if no direction is given (dir < 0).'],
  /*  5 */ ['shape: head direction', 'pick', 'rng() * sum over the open directions, each weighing its lane length + 1. Only if there is one.'],
  /*  6 */ ['shape: which end', 'chance', 'rng() < 0.5. Only if both ends are unblocked and their lanes are equally long.'],
  /*  7 */ ['pickParent', 'pick', 'rng() * sum over the ropes, by weight. Not drawn if every weight is 0.'],
  /*  8 */ ['aimed: mirror', 'below', 'idle[below(idle.length)]: idle is the unused mirrors in the order of cfg.mirrors.'],
  /*  9 */ ['aimed: direction', 'below', 'below(4)'],
  /* 10 */ ['aimed: distance', 'below', '1 + below(3). Sites 8, 9, 10 are always drawn together, in this order.'],
  /* 11 */ ['candidate: cell on the parent lane', 'below', 'ahead[parent][below(ahead[parent].length)]'],
  /* 12 */ ['candidate: random cell', 'below', 'below(W * H), up to 6 times, until one is empty. Only if there is no start yet.'],
  /* 13 */ ['walk: length', 'below', 'want = max(k + 2, lenLo + below(lenHi - lenLo + 1)). Once, on entry.'],
  /* 14 */ ['walk: straight on?', 'chance', 'rng() < cfg.straight. A body step past the forced straight run, if the last direction is open.'],
  /* 15 */ ['walk: body direction', 'below', 'opts[below(opts.length)]. If site 14 was not drawn or said no.'],
  /* 16 */ ['walk: tail direction, to a tied cell', 'below', 'ties[below(ties.length)]. A tail step with a tied neighbour, while none has been reached.'],
  /* 17 */ ['walk: tail direction', 'below', 'opts[below(opts.length)]. Any other tail step.'],
  /* 18 */ ['knot: pull', 'below', 'k = 1 + below(min(pull, room - 1)). After the lane and tied checks pass.'],
  /* 19 */ ['knotOrTrap: try for one?', 'chance', 'rng() < 2 * (wantKnots + wantTraps) / room. Only if n >= 2 and one is still wanted.'],
  /* 20 */ ['knotOrTrap: chain or tight', 'chance', 'rng() < 0.5. Each knot try while there is a chain spot (drawn even if there is no tight spot).'],
  /* 21 */ ['knotOrTrap: spot', 'below', 'list[below(list.length)]. Each try whose list is not empty.'],
  /* 22 */ ['bestRope: jitter', 'jitter', 'rng() * 0.6. Once for each candidate that fits, after it was shaped and tried.'],
  /* 23 */ ['packGaps: shuffle', 'below', 'j = below(i + 1) for i from the last index down to 1 (Fisher-Yates), in both sweeps.'],
];
// Doubles. All of it is plain IEEE arithmetic (+ - * / < >= abs min max floor), so f64 in
// wasm gives the same bits if the operations are kept in the JS's order:
//   meanLen = (lenLo + lenHi) / 2 * 0.85;  coverGoal = cover * N;  covered >= coverGoal;
//   room = max(1, (coverGoal - covered) / meanLen);  site 19's 2 * (wantKnots + wantTraps) / room;
//   desire = tapDepth, compared with 2 and 1 to choose the kinds;
//   miss = abs(gain - desire) + rng() * 0.6 - (desire >= 2 ? min(lane.free, 4) * 0.2 : 0) - (reaches ? 1.5 : 0),
//     kept if miss < bestMiss (strictly: the first of equals wins);
//   in finished: filled = cells / (w * h) against 0.6 (w <= 5) or 0.72, and blocked / n against 0.5.
//     Divide and compare as the JS does; do not cross-multiply.
// Math.round is not reached (tapDepth is always set), and nothing is formatted or parsed.
//
// Sorting. One sort decides anything: survey's order.slice().sort((x, y) => cost[y] - cost[x]),
// by cost, highest first, and it must be stable (equal costs keep the order of `order`).
// (loopsOf also sorts each loop, which changes nothing: only membership is used.)
//
// Order of Maps and Sets. Only two matter: cfg.mirrors is walked in insertion order by
// aimed() (site 8 picks by index: keep the fixture's order of mirrors), and
// [...new Set(ib.taps)] is the taps in order of first appearance, as is the loop that fills
// `order` in commit. Every other Map or Set is only asked has() or size. All lists that are
// picked from by index are in a fixed order: directions 0 to 3 = +x, +y, -x, -y; the empty
// cells of a lane (ahead[i]) along the track; ropes ascending; knotSpots by cell, then by
// direction; packGaps's empty cells ascending before the shuffle.
//
// State that outlives a step. ib.cost and ib.dep are whatever the last replay left, and a
// trial is a replay: pickParent reads cost while earlier candidates of the same step have
// already been tried, and survey reads cost and dep after a step that added nothing. A
// replay that fails part-way leaves the costs of the ropes that did not leave unchanged.
// dep may name the rope that was only being tried (index b.n; 47 surveys in the fixture
// meet one), so up[] is written at b.n: size the per-rope arrays by cells, as the JS does.
// trap() leaves the board with its rope slid into the gap: every replay sets the board up
// again first. Keep all of that as it is; do not tidy it.
//
// Branches of the JS that no case reaches (the generator never asks for them): ropeCount,
// trimming or turning the board (keepBounds is always set), the tapDepth fallback with
// pace, depth, bends and wantAvg, `lands` (sMin is 0), the 'plain'-only kinds (budget is
// about 1000000), a core that does not fit, and a way out that never ends.

// The reference weave with every rng() call numbered, for comparing draw by draw.
// Returns c => { out, draws, trace }: trace[k] is site << 24 | (n & 0xFFFFFF) for draw k,
// where n is the bound of a below, the sum of a pick, and 0 for a chance or the jitter.
function traced(ref) {
  const file = path.join(ref.dir, 'levels.js'), source = fs.readFileSync(file, 'utf8');
  let text = '', from = 0, site = -1; // the first two rng() in the file are casualWins's
  for (let at = source.indexOf('rng()'); at >= 0; at = source.indexOf('rng()', from)) {
    let n = '0';
    if (source.startsWith(' * ', at + 5) && (source.slice(at - 11, at) === 'Math.floor(' || source.startsWith(' * sum', at + 5))) {
      let end = at + 8;
      for (let depth = 0; depth || !/[),;]/.test(source[end]); end++) depth += source[end] === '(' ? 1 : source[end] === ')' ? -1 : 0;
      n = source.slice(at + 8, end);
    }
    text += source.slice(from, at) + (site >= 1 ? `rng(${site}, ${n})` : 'rng()'); from = at + 5; site++;
  }
  if (site !== SITES.length) throw Error(`levels.js has ${site - 1} rng() calls in the builder, not the ${SITES.length - 1} listed in SITES`);
  const copy = path.join(ref.dir, 'levels-traced.js'); fs.writeFileSync(copy, text + source.slice(from));
  const L = require(copy);
  return c => {
    const base = L.mulberry32(c.seed), trace = [], cfg = cfgOf(c.cfg);
    const raw = L.weave((s, n) => { trace.push(s << 24 | n & 0xFFFFFF); return base(); }, cfg);
    return { out: plainOut(raw, cfg), draws: trace.length, trace };
  };
}
const siteName = word => { const s = SITES[word >>> 24], n = word & 0xFFFFFF; return s ? `${s[0]}${s[1] === 'below' ? `, of ${n}` : s[1] === 'pick' ? `, sum ${n}` : ''} [site ${word >>> 24}]` : `site ${word >>> 24}?`; };

// ---- the memory interface of the Encantis module ----
// The i32 words and the f64 values the harness writes for a case (see check-weave.cjs
// for the layout, which is the contract the port implements).
function words(c) {
  const g = c.cfg, w = [c.seed | 0, g.W, g.H, g.lenLo, g.lenHi, g.minLen, g.tie, g.bait, g.pull, g.ropeCount, g.keepBounds, g.mirrors.length];
  for (const [cell, kind] of g.mirrors) w.push(cell, kind);
  w.push(g.initialRopes.length);
  g.initialRopes.forEach((p, i) => { const s = g.initialStops[i]; w.push(p.length, ...p, s.length, ...s); });
  if (g.initialPlan) w.push(g.initialPlan.length, ...g.initialPlan); else w.push(-1);
  return { ints: w, doubles: DOUBLES.map(k => g[k]) };
}

// ---- the specifications the generator is run on ----
function specifications(G) {
  const list = [];
  const K = G.DEFAULT.count;
  for (let i = 0; i < K; i++) if (G.spec({ kind: 'journey' }, i).grid === 'square') list.push({ name: 'J3#' + i, options: { kind: 'journey', index: i } });
  const custom = (code, indices) => {
    const o = G.parseCode(code); if (!o) throw Error('bad code ' + code);
    for (const index of indices || Array.from({ length: o.count }, (_, i) => i)) list.push({ name: code + '#' + index, options: { ...o, index } });
  };
  // Plain boards over the whole size range, five difficulties each (1, 25.75, 50.5, 75.25, 100).
  for (const [w, h] of [[4, 5], [4, 6], [5, 7], [6, 8], [7, 9], [8, 10], [9, 12], [10, 14], [12, 16]]) custom(`U3-S-1-100-${w}-${h}-5-N-WEAVE`);
  // Two more small sizes, ten difficulties each, for the ways weave gives up there: too few
  // ropes on 4x4 (the smallest board the game allows), too few blocked ropes on easy 6x6 boards.
  for (const [w, h] of [[4, 4], [6, 6]]) custom(`U3-S-1-100-${w}-${h}-10-N-WEAVE`);
  // Mirrors (the game allows them from 8 wide), spinners (placed after weave; they move the
  // generator's rng between attempts) and both.
  for (const [w, h] of [[8, 8], [8, 10], [9, 12], [10, 14], [12, 16]]) custom(`U3-S-1-100-${w}-${h}-5-M-WEAVE`);
  for (const [w, h] of [[8, 10], [10, 14]]) custom(`U3-S-20-90-${w}-${h}-3-S-WEAVE`);
  for (const [w, h] of [[9, 12], [12, 16]]) custom(`U3-S-20-90-${w}-${h}-3-MS-WEAVE`);
  // Large boards, and one colossal map.
  custom('U3-S-30-90-24-24-3-N-WEAVE'); custom('U3-S-60-60-24-24-1-M-WEAVE');
  custom('U3-S-70-70-40-40-1-MC-WEAVE');
  return list;
}

// Run the generator over the specifications and record every weave call.
function record(ref) {
  const { L, G } = ref, weave = L.weave, calls = [];
  let spec = null, attempt = 0;
  L.mulberry32 = mulberry32; // the generator makes its rng through L.mulberry32
  L.weave = (rng, cfg) => {
    const seed = rng.state(); let draws = 0, raw, error = null;
    try { raw = weave(() => { draws++; return rng(); }, cfg); } catch (e) { error = e; }
    calls.push({ spec: spec.name, attempt: attempt++, d: spec.d, style: cfg.style, seed, cfg: plainCfg(cfg), draws, out: error ? undefined : plainOut(raw, cfg), error: error && error.message });
    if (error) throw error;
    return raw;
  };
  for (const s of specifications(G)) {
    spec = { name: s.name, d: G.spec(s.options, s.options.index).difficulty }; attempt = 0;
    const t = Date.now();
    try { G.generate(s.options); } catch (e) { if (!/Could not densely weave/.test(e.message)) throw e; }
    if (process.argv.includes('--stats')) console.error(`${s.name}: ${attempt} weave calls, ${Date.now() - t} ms`);
  }
  L.weave = weave;
  return calls;
}

// The cases kept, of all the calls recorded:
//   - the first attempt of every specification (at difficulty 60 and over it carries the
//     repeated-slide core wherever the board has room for one);
//   - the second attempt too at difficulty 60 and over: the same kind of board without the core;
//   - every call, at any attempt, where weave returned null.
function select(calls) {
  return calls.filter(c => c.out === null || c.attempt === 0 || c.attempt === 1 && c.d >= 60)
    .map((c, id) => ({ id, from: `${c.spec} attempt ${c.attempt}, d ${c.d}, ${c.style}`, seed: c.seed, cfg: c.cfg, draws: c.draws, out: c.out }));
}
// One case per line, so that a changed case is one changed line.
function serialize(cases) {
  return `{"reference":"${REFERENCE}","about":"weave(mulberry32(seed), cfg) of levels.js at ${REFERENCE}; see dump-weave.cjs","cases":[\n` +
    cases.map(c => JSON.stringify(c)).join(',\n') + '\n]}\n';
}
function stats(cases) {
  const count = f => cases.filter(f).length, tally = f => { const t = {}; for (const c of cases) { const k = f(c); t[k] = (t[k] || 0) + 1; } return Object.entries(t).map(([k, v]) => `${k} ${v}`).join(', '); };
  const w = cases.map(words);
  console.log(`${cases.length} cases: ${count(c => !c.out)} null, ${count(c => c.cfg.mirrors.length)} with mirrors, ${count(c => c.cfg.initialRopes.length)} with the core, ${count(c => c.cfg.mirrors.length && c.cfg.initialRopes.length)} with both`);
  console.log('styles (lenLo-lenHi):', tally(c => `${c.from.split(', ')[2]} ${c.cfg.lenLo}-${c.cfg.lenHi}`));
  console.log('sizes:', tally(c => `${c.cfg.W}x${c.cfg.H}`));
  console.log('difficulty:', tally(c => { const d = +c.from.split(', ')[1].slice(2); return d < 20 ? 'under 20' : d < 40 ? '20-40' : d < 60 ? '40-60' : d < 80 ? '60-80' : '80-100'; }));
  console.log('tie:', tally(c => c.cfg.tie), '| knots made:', tally(c => c.out ? c.out.knots : 'null'), '| traps made:', tally(c => c.out ? c.out.traps : 'null'));
  console.log(`rng draws per case: ${Math.min(...cases.map(c => c.draws))} to ${Math.max(...cases.map(c => c.draws))}`);
  console.log(`largest input: ${Math.max(...w.map(x => x.ints.length))} i32 words; largest output: ${Math.max(...cases.map(c => outWords(c.out).length))} i32 words`);
}
// The i32 words the module writes for a result (the layout is in check-weave.cjs).
function outWords(out) {
  if (!out) return [0];
  const w = [1, out.knots, out.traps, out.ropes.length];
  for (const p of out.ropes) w.push(p.length, ...p);
  w.push(out.taps.length, ...out.taps);
  return w;
}

module.exports = { REFERENCE, FIXTURE, SITES, reference, mulberry32, cfgOf, plainOut, run, traced, siteName, words, outWords, DOUBLES };
if (require.main !== module) return;

if (process.argv.includes('--trace')) {
  const [id, from = 0, to = Infinity] = process.argv.slice(process.argv.indexOf('--trace') + 1).map(Number);
  const c = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')).cases[id]; if (!c) throw Error('no such case');
  const r = traced(reference(false))(c);
  if (JSON.stringify(r.out) !== JSON.stringify(c.out) || r.draws !== c.draws) throw Error('the traced reference does not give the fixture');
  console.log(`case ${id}: ${c.from}; ${r.draws} draws`);
  r.trace.forEach((word, k) => { if (k >= from && k <= to) console.log(`${k}\t${siteName(word)}`); });
  return;
}

const ref = reference(true), calls = record(ref), cases = select(calls);
// Every kept case must come out the same from its plain numbers alone, on an untouched rng.
const pristine = reference(false).L;
for (const c of cases) {
  const again = run(pristine, c);
  if (JSON.stringify(again.out) !== JSON.stringify(c.out) || again.draws !== c.draws) throw Error(`case ${c.id} (${c.from}) does not replay from its plain form`);
}
const text = serialize(cases);
console.log(`${calls.length} weave calls recorded, ${cases.length} kept, each replayed from its plain form`);
if (process.argv.includes('--stats')) stats(cases);
if (process.argv.includes('--verify')) {
  const same = fs.existsSync(FIXTURE) && fs.readFileSync(FIXTURE, 'utf8') === text;
  console.log(same ? 'weave-expected.json is up to date' : 'weave-expected.json DIFFERS from what the reference gives');
  process.exit(same ? 0 : 1);
}
fs.writeFileSync(FIXTURE, text);
console.log(`wrote ${path.relative(process.cwd(), FIXTURE)} (${(text.length / 1024).toFixed(0)} KB)`);
