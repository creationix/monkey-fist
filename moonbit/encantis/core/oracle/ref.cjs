// The JS reference of the Monkey Fist core (the game at 9e69e3a), for the oracles of
// the Encantis port. Every check-gN.cjs starts here.
//
//   const R = require('./ref.cjs')
//   const { L, G, F, H, HM, M, Q, K } = R.js()   // levels, game-engine, grid-generator,
//                                                // hex/engine, hex/mechanics, mechanics,
//                                                // dependency-metrics, grid-journey
//   R.mulberry32(seed)        the counting generator (below); R.draws(), R.resetDraws()
//   R.boards()                the 135 boards of reference.json, as JS boards (+ .ref, .name)
//   R.position(b, paths, prefer)   the words read_position reads (web/generator.js's layout)
//   R.levelWords(b, key, stats)    the words put_level writes for b
//   R.positions(b)            positions on b: every prefix of its plan, and 20 of random play
//
// The reference checkout is MF_REF, by default /home/user/mf-core-scratch/ref-9e69e3a. If it
// is missing it is made with `git archive 9e69e3a | tar -x` from the repository this file
// is in. Nothing in the repository is changed.
//
// The counting mulberry32. Before any reference module loads, random.js's mulberry32 is
// replaced by one that is the same function, bit for bit, but whose state can be read
// (rng.state()) and whose draws are counted, one counter for all generators. levels.js
// takes mulberry32 from random.js when it loads, and grid-generator.js calls
// L.mulberry32, so every generator the reference makes is a counting one. (dump-weave.cjs
// counts the same way, around one weave call.)
'use strict';
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');

const REFERENCE = '9e69e3a';
const REPO = path.resolve(__dirname, '../../../..');
const dir = process.env.MF_REF || '/home/user/mf-core-scratch/ref-9e69e3a';
const REFERENCE_JSON = process.env.MF_REFERENCE_JSON || '/home/user/mf-core-scratch/reference.json';

function ensure() {
  if (fs.existsSync(path.join(dir, 'game-engine.js'))) return;
  fs.mkdirSync(dir, { recursive: true });
  const tar = execFileSync('git', ['-C', REPO, 'archive', REFERENCE], { maxBuffer: 1 << 30 });
  execFileSync('tar', ['-x', '-C', dir], { input: tar });
}

let count = 0;
// mulberry32 exactly as random.js has it, with its state readable and its draws counted.
function mulberry32(seed) {
  let a = seed;
  const rng = function () { count++; a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  rng.state = () => a >>> 0;
  return rng;
}
const draws = () => count;
const resetDraws = () => { count = 0; };

let modules = null;
function js() {
  if (modules) return modules;
  ensure();
  const random = require(path.join(dir, 'random.js'));
  const plain = random.mulberry32;
  // the swap: the same numbers (checked here), counted
  const a = plain(12345), b = mulberry32(12345);
  for (let i = 0; i < 4; i++) if (a() !== b()) throw Error('counting mulberry32 differs from random.js');
  random.mulberry32 = mulberry32;
  count = 0;
  const req = f => require(path.join(dir, f));
  modules = { random, plainMulberry32: plain, L: req('levels.js'), G: req('game-engine.js'), F: req('grid-generator.js'), H: req('hex/engine.js'),
    HM: req('hex/mechanics.js'), M: req('mechanics.js'), Q: req('dependency-metrics.js'), K: req('grid-journey.js') };
  if (modules.L.mulberry32 !== mulberry32) throw Error('levels.js did not take the counting mulberry32');
  return modules;
}

// --- Boards ---

// A reference.json board as the JS game has it (q/r cells, mirrors with axis or slope).
function jsBoard(r) {
  const hex = r.grid === 'hex';
  return { grid: r.grid, W: r.W, H: r.H, ropes: r.ropes.map(p => p.map(([q, rr]) => ({ q, r: rr }))),
    mirrors: r.mirrors.map(([q, rr, k]) => hex ? { cell: { q, r: rr }, axis: k } : { cell: { q, r: rr }, slope: k }),
    springs: r.springs.map(([q, rr]) => ({ q, r: rr })), plan: r.plan.slice(), par: r.par, exact: r.exact, layoutKey: r.layoutKey };
}

let boardList = null;
// The 135 boards of reference.json: 120 Journey (name L1 to L120) and 15 custom (C1 to C15,
// with code and index). Each has .ref, the record as stored.
function boards() {
  if (boardList) return boardList;
  const ref = JSON.parse(fs.readFileSync(REFERENCE_JSON, 'utf8'));
  boardList = [...ref.journey.map((r, i) => ({ ...jsBoard(r), name: 'L' + (i + 1), ref: r })),
    ...ref.custom.map((r, i) => ({ ...jsBoard(r), name: 'C' + (i + 1), code: r.code, index: r.index, ref: r }))];
  return boardList;
}

// --- Words ---

const kindOf = (b, m) => b.grid === 'hex' ? m.axis : m.slope === '\\' ? 1 : 0;

// The words of a board and position, as web/generator.js's position() pushes them and
// read_position (src/gen/gen.mbt) reads them: hex, W, H, the ropes, the mirrors (q, r,
// kind), the springs, the current paths (a count of 0 is a rope that has left) and the
// preferred order.
function position(b, paths = b.ropes, prefer = []) {
  const list = [b.grid === 'hex' ? 1 : 0, b.W, b.H], cells = path => { list.push(path ? path.length : 0); for (const p of path || []) list.push(p.q, p.r); };
  list.push((b.ropes || []).length); (b.ropes || []).forEach(cells);
  list.push((b.mirrors || []).length); for (const m of b.mirrors || []) list.push(m.cell.q, m.cell.r, kindOf(b, m));
  cells(b.springs || []);
  list.push(paths.length); paths.forEach(cells);
  list.push(prefer.length, ...prefer);
  return list;
}

// The words put_level (src/gen/gen.mbt) writes for level b: hex, W, H, par, exact, the
// ropes, mirrors, springs, plan, the layout key's code units, then the 8 stats.
function levelWords(b, key = b.layoutKey, stats = [-1, -1, -1, -1, -1, -1, -1, -1]) {
  const out = [b.grid === 'hex' ? 1 : 0, b.W, b.H, b.par, b.exact ? 1 : 0, b.ropes.length];
  for (const p of b.ropes) { out.push(p.length); for (const c of p) out.push(c.q, c.r); }
  out.push(b.mirrors.length); for (const m of b.mirrors) out.push(m.cell.q, m.cell.r, kindOf(b, m));
  out.push(b.springs.length); for (const p of b.springs) out.push(p.q, p.r);
  out.push(b.plan.length, ...b.plan);
  out.push(key.length); for (let i = 0; i < key.length; i++) out.push(key.charCodeAt(i));
  out.push(...stats);
  return out;
}

// --- Positions ---

// Positions on b, all reachable: the start and every prefix of its plan (taps through
// G.tap), then 20 of random play (each tap a legal one picked by a mulberry32 seeded from
// the board's name). Each is { paths, taps, from }.
function positions(b, random = 20) {
  const { G, L } = js();
  const out = [{ paths: b.ropes, taps: [], from: 'start' }];
  let paths = b.ropes;
  for (let k = 0; k < b.plan.length; k++) {
    const m = G.tap(b, paths, b.plan[k]);
    if (!m) break;
    paths = m.paths;
    out.push({ paths, taps: b.plan.slice(0, k + 1), from: 'plan ' + (k + 1) });
  }
  const saved = count;
  const rng = mulberry32(L.hashString('positions/' + (b.name || '')));
  paths = b.ropes; let taps = [];
  for (let n = 0, guard = 0; n < random && guard < 10 * random; guard++) {
    const legal = [];
    for (let i = 0; i < paths.length; i++) if (paths[i]) { const m = G.tap(b, paths, i); if (m) legal.push([i, m]); }
    if (!legal.length) { paths = b.ropes; taps = []; continue; }
    const [i, m] = legal[Math.floor(rng() * legal.length)];
    paths = m.paths; taps = [...taps, i];
    out.push({ paths, taps, from: 'random ' + (n + 1) });
    n++;
  }
  count = saved;
  return out;
}

module.exports = { REFERENCE, dir, js, mulberry32, draws, resetDraws, jsBoard, boards, position, levelWords, positions, kindOf };
