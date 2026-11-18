// G3's wider oracle: the Hex offset kernel of test/g3.wasm against hex/engine.js at 9e69e3a on
// boards and calls check-g3.cjs never makes (check-g2-wide.cjs's shape, for Hex).
//
//   node moonbit/encantis/core/oracle/check-g3-wide.cjs [test/g3.wasm]
//   options: --boards N (synthetic boards, default 400), --aimed N (boards with mirrors aimed
//            at a way out, default 150), --seed S (default 0x63), --js (the positive control),
//            --controls (the negative controls), --only K (one kind)
//
// The kernels are pure functions of (W, H, mirrors, paths, ...), so any board is a fair input,
// not only one the generator would make:
//   synthetic  N random boards from a seeded mulberry32: 1 x 2 up to 48 x 48 (most 4 to 16 wide),
//              no mirrors, a few, or a mirror (axis 0 to 2) on up to a third of the cells; ropes
//              are self-avoiding walks over the six Hex neighbours, 2 cells and up, over mirrors
//              or not, filling 20% to 100%. They reach what the generator's boards never do: ways
//              out that pass a cell twice (compile throws), that turn back through the rope's own
//              head and would loop forever (rayTrack's 2*W*H cap), heads on a mirror, 1-wide strips.
//   aimed      N boards made as the synthetic ones, their mirrors replaced by 1 (most), 2 or 3
//              placed on a rope's straight way out or on its head: the other sets seldom make a
//              board with exactly one mirror (G2's review found a mutant only these catch).
//   positions  on each board: the start, and up to 8 positions of random legal play (taps that
//              move their rope, through the JS's own compile).
//
// Per position, with a plan drawn per position (a JS solution, one with a tap added, or random
// taps, some of them out of range):
//   compile, rays, turning, replay, postpone (as check-g3)
//   solve      budgets 0, 1, 2, 3, -1, a random 1..60, 300 and 2000 with the plan as prefer, and
//              2000 with a junk prefer (-1, n, n + 5, repeats)
//   fewest     budgets 0, 1, 2, a random 1..40 and 2500 (null where the plan does not solve)
//   casual     games 0, 1, -3, and a random 2..60 with a random seed: share and draws
// Where compile throws (a way out passes a cell twice), every kernel that compiles must trap in
// the port, as the JS throws (casual play of 0 games compiles nothing); compile itself, rays and
// turning answer.
//
// Known limits, counted as "limit", not as a failure: a hook whose output passes the ABI's 65,536
// words traps in put(). The limits of hex.ents are checked to trap (not under --js: the JS has
// none): a path with a cell off its board (cell index below 0 or past W * H) through every
// kernel that compiles, and a turning way out on a board past max_area (has_dup's 2,304 cells).
'use strict';
const path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs');
const G3 = require('./check-g3.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const JS = args.includes('--js'), CONTROLS = args.includes('--controls');
const VALUED = ['--boards', '--seed', '--only', '--aimed'];
const WASM = args.find((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1])) || path.join(__dirname, '../test/g3.wasm');
const NBOARDS = Number(opt('--boards', 400)), SEED = Number(opt('--seed', 0x63)), ONLY = opt('--only', null);
const NAIMED = Number(opt('--aimed', 150));
const { H } = R.js();
const HI = G3.internals();

// --- comparing ---

let corrupt = null;
const seen = {};
let failures = [], limits = [];
const spoil = v => typeof v === 'number' ? (Number.isInteger(v) ? v + 1 : v * (1 + 2 ** -50) || 1) : Array.isArray(v) ? [...v, 99] : typeof v === 'boolean' ? !v : { ...v, spoiled: 1 };
function same(kind, name, want, got) {
  const k = seen[kind] = (seen[kind] || 0) + 1;
  if (corrupt && corrupt.kind === kind && corrupt.at === k) want = spoil(want);
  const ok = JSON.stringify(want) === JSON.stringify(got) && (typeof want !== 'object' || want === null || !('ret' in want) || Object.is(want.ret, got.ret));
  if (!ok) failures.push({ kind, name, want, got });
  return ok;
}

// --- boards ---

const rnd = r => (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const point = (c, w) => HI.point(c, w), cell = (p, w) => H.cellIndex(p, w);
function synthetic(r, k) {
  const int = rnd(r), u = r();
  let w, h;
  if (u < 0.12) { w = int(1, 4); h = int(1, 4); if (w * h < 2) w = 2; }
  else if (u < 0.80) { w = int(4, 16); h = int(4, 16); }
  else if (u < 0.95) { w = int(12, 24); h = int(12, 24); }
  else { w = int(25, 48); h = int(25, 48); }
  if (r() < 0.08) { if (r() < 0.5) w = 1; else h = 1; if (w * h < 2) { w = Math.max(w, 2); } }
  const area = w * h, mu = r(), level = { W: w, H: h };
  const nm = mu < 0.4 ? 0 : mu < 0.8 ? int(1, Math.max(1, Math.min(8, area >> 2))) : int(0, Math.floor(area / 3));
  const mirrorAt = new Map();
  for (let t = 0; t < nm * 3 && mirrorAt.size < nm; t++) { const c = int(0, area - 1); if (!mirrorAt.has(c)) mirrorAt.set(c, int(0, 2)); }
  const avoidMirrors = r() < 0.5, fill = 0.2 + 0.8 * r(), maxLen = int(2, Math.max(2, Math.min(w + h, 30)));
  const taken = new Uint8Array(area), ropes = [];
  let covered = 0;
  for (let t = 0; t < area * 4 && covered < fill * area; t++) {
    const c0 = int(0, area - 1);
    if (taken[c0] || (avoidMirrors && mirrorAt.has(c0))) continue;
    const want = int(2, maxLen), cells = [c0];
    taken[c0] = 1;
    while (cells.length < want) {
      const p = point(cells[cells.length - 1], w), opts = [];
      for (const d of H.DIRS) {
        const q = { q: p.q + d[0], r: p.r + d[1] };
        if (!H.inside(level, q)) continue;
        const nc = cell(q, w);
        if (taken[nc] || (avoidMirrors && mirrorAt.has(nc))) continue;
        opts.push(nc);
      }
      if (!opts.length) break;
      const nc = opts[int(0, opts.length - 1)];
      taken[nc] = 1; cells.push(nc);
    }
    if (cells.length < 2) { taken[c0] = 0; continue; }
    ropes.push(cells.map(c => point(c, w)));
    covered += cells.length;
  }
  const mirrors = [...mirrorAt].map(([c, axis]) => ({ cell: point(c, w), axis }));
  return { grid: 'hex', W: w, H: h, ropes, mirrors, springs: [], plan: [], name: `S${k + 1} (${w}x${h}, ${ropes.length} ropes, ${mirrors.length} mirrors)` };
}

// A synthetic board whose mirrors are replaced by 1 (60%), 2 or 3 aimed ones: each on a cell of a
// rope's straight way out (from its head to the edge), or on its head (15%, or when the head is at
// the edge). The rope is the longer of two drawn.
function aimed(r, k) {
  const int = rnd(r), b = synthetic(r, k), w = b.W, ropes = b.ropes, level = { W: b.W, H: b.H };
  const want = r() < 0.6 ? 1 : r() < 0.75 ? 2 : 3, at = new Map();
  for (let t = 0; t < 30 && at.size < want && ropes.length; t++) {
    const a = ropes[int(0, ropes.length - 1)], z = ropes[int(0, ropes.length - 1)], p = a.length >= z.length ? a : z;
    const hd = p[p.length - 1], pv = p[p.length - 2], dq = hd.q - pv.q, dr = hd.r - pv.r, line = [];
    for (let q = { q: hd.q + dq, r: hd.r + dr }; H.inside(level, q); q = { q: q.q + dq, r: q.r + dr }) line.push(cell(q, w));
    const c = !line.length || r() < 0.15 ? cell(hd, w) : line[int(0, line.length - 1)];
    if (!at.has(c)) at.set(c, int(0, 2));
  }
  const mirrors = [...at].map(([c, axis]) => ({ cell: point(c, w), axis }));
  return { ...b, mirrors, name: `A${k + 1} (${b.W}x${b.H}, ${ropes.length} ropes, ${mirrors.length} mirrors)` };
}

const levelOf = (b, paths) => ({ W: b.W, H: b.H, ropes: paths, mirrors: b.mirrors });
const throws = f => { try { f(); return false; } catch { return true; } };

// The start and up to 8 positions of random legal play.
function positionsOf(b, r) {
  const out = [{ paths: b.ropes, from: 'start' }];
  if (throws(() => H.compile(levelOf(b, b.ropes), b.ropes))) return out;
  let paths = b.ropes;
  const steps = Math.floor(r() * 9);
  for (let s = 0; s < steps * 3 && out.length <= steps; s++) {
    const B = H.compile(levelOf(b, paths), paths), legal = [];
    for (let i = 0; i < paths.length; i++) { const t = B.to(i); if (t !== -2 && t !== B.offsets[i]) legal.push([i, t]); }
    if (!legal.length) break;
    const [i, t] = legal[Math.floor(r() * legal.length)];
    B.place(i, t);
    paths = B.pathsNow();
    out.push({ paths, from: `random ${out.length}` });
  }
  return out;
}

// A plan for a position: a JS solution, a solution with a tap added (maybe out of range), or
// random taps (some out of range).
function planFor(b, paths, r) {
  const n = paths.length, u = r();
  if (!n) return [];
  if (u < 0.6 && !throws(() => H.compile(levelOf(b, paths), paths))) {
    const s = H.solve(levelOf(b, paths), paths, 2000, []);
    if (s.solved) {
      const plan = s.moves.slice();
      if (u < 0.15) plan.splice(Math.floor(r() * (plan.length + 1)), 0, Math.floor(r() * (n + 2)) - 1);
      return plan;
    }
  }
  return Array.from({ length: Math.floor(r() * (2 * n + 1)) }, () => r() < 0.05 ? n : Math.floor(r() * n));
}

// --- the calls ---

// fewestPlayerTaps throws both where compile does and where the plan does not solve, and
// check-g3's WANT reads any throw as the second (null): here a throw in compile is a throw.
function jsCall(kind, cx, a, bad) {
  if (bad && kind === 'fewest') return { throws: true };
  try { return G3.WANT[kind](cx, ...a); } catch (e) { return { throws: true }; }
}
function portCall(port, kind, a) {
  try {
    const ret = G3.CALL[kind](port.x, ...a), got = {};
    if (['compile', 'postpone', 'casual', 'fewest'].includes(kind)) got.ret = ret;
    if (['compile', 'rays', 'turning', 'solve', 'replay', 'postpone', 'fewest'].includes(kind)) got.out = port.out();
    if (kind === 'casual') got.draws = port.x.draws();
    return got;
  } catch (e) {
    if (e instanceof WebAssembly.RuntimeError) return { throws: true };
    throw e;
  }
}

let values = 0;
const counts = {};
function step(port, c, kind, label, a, plan) {
  if (ONLY && kind !== ONLY) return;
  const words = R.position(c.b, c.paths, plan), cx = G3.context(c.b, c.paths, plan);
  port.push(words);
  const want = jsCall(kind, cx, a, c.bad), got = portCall(port, kind, a);
  const name = `${c.name} ${c.from}: ${kind}${label}`;
  counts[kind] = (counts[kind] || 0) + 1;
  values += want.out ? want.out.length + 1 : 1;
  // the ABI's output buffer holds 65,536 words (abi.ents): a hook that would write more traps in put()
  if (got.throws && !want.throws && want.out && want.out.length > 65536) { limits.push(`${name} (${want.out.length} words out)`); return; }
  same(kind, name, want, got);
}

function runPosition(port, c, r) {
  const n = c.paths.length, int = rnd(r);
  const plan = c.plan, junk = [-1, n, n + 5, ...plan.slice(0, 3), ...plan.slice(0, 3)];
  for (const kind of ['compile', 'rays', 'turning']) step(port, c, kind, '', [], plan);
  for (const budget of [0, 1, 2, 3, -1, int(1, 60), 300, 2000]) step(port, c, 'solve', ` budget ${budget}`, [budget], plan);
  step(port, c, 'solve', ' budget 2000, junk prefer', [2000], junk);
  for (const budget of [0, 1, 2, int(1, 40), 2500]) step(port, c, 'fewest', ` budget ${budget}`, [budget], plan);
  if (plan.length <= 300) step(port, c, 'replay', '', [], plan);
  step(port, c, 'postpone', '', [], plan);
  for (const games of [0, 1, -3, int(2, 60)]) step(port, c, 'casual', ` x${games}`, [games, (r() * 2 ** 32) | 0], plan);
}

function cases(r) {
  const out = [];
  const add = (b, rr) => {
    for (const p of positionsOf(b, rr)) {
      const bad = throws(() => H.compile(levelOf(b, p.paths), p.paths));
      out.push({ b, paths: p.paths, from: p.from, name: b.name, plan: planFor(b, p.paths, rr), bad });
    }
  };
  for (let k = 0; k < NBOARDS; k++) add(synthetic(r, k), r);
  const ra = R.mulberry32((SEED ^ 0xa1a1) >>> 0);
  for (let k = 0; k < NAIMED; k++) add(aimed(ra, k), ra);
  return out;
}

// hex.ents' limits: where the JS answers and the port must trap.
function limitCases(port) {
  if (ONLY && ONLY !== 'limits') return;
  const off = [[{ q: 1, r: -1 }, { q: 1, r: 0 }, { q: 2, r: 0 }], [{ q: 1, r: 4 }, { q: 1, r: 3 }, { q: 2, r: 3 }], [{ q: -1, r: 0 }, { q: 0, r: 0 }]];
  const calls = [['compile', []], ['solve', [100]], ['fewest', [100]], ['replay', []], ['postpone', []], ['casual', [3, 1]]];
  const list = [];
  for (const rope of off) list.push({ b: { grid: 'hex', W: 4, H: 4, ropes: [rope, [{ q: 2, r: 2 }, { q: 2, r: 1 }]], mirrors: [], springs: [], plan: [] }, calls, what: `a cell at (${rope[0].q}, ${rope[0].r}) on 4x4` });
  // past max_area, a way out that turns: has_dup's stamps cover 2,304 cells
  // (a rope on the last row heading +q, then a mirror of axis 2 that turns its way out up)
  for (const [w, h] of [[49, 48], [50, 50], [3, 800]]) {
    const q0 = -Math.floor((h - 1) / 2), ropes = [[{ q: q0, r: h - 1 }, { q: q0 + 1, r: h - 1 }]];
    list.push({ b: { grid: 'hex', W: w, H: h, ropes, mirrors: [{ cell: { q: q0 + 2, r: h - 1 }, axis: 2 }], springs: [], plan: [] }, calls: [['rays', []], ['compile', []]], what: `${w}x${h} with a turning mirror` });
  }
  for (const c of list) for (const [kind, a] of c.calls) {
    const plan = [1, 0];
    port.push(R.position(c.b, c.b.ropes, plan));
    const got = portCall(port, kind, a);
    counts.limits = (counts.limits || 0) + 1; values++;
    same('limits', `${c.what}: ${kind} must trap`, { throws: true }, got.throws ? { throws: true } : got);
  }
}

const summary = list => `${new Set(list.map(c => c.name)).size} boards (${list.filter(c => c.from === 'start' && c.bad).length} whose ways out pass a cell twice), ${list.length} positions`;

module.exports = { synthetic, aimed, positionsOf, planFor, cases };

// One kind of runPosition's calls, for the controls.
function runKind(port, c, kind) {
  if (kind === 'solve') for (const budget of [1, 40, 2000]) step(port, c, 'solve', ` budget ${budget}`, [budget], c.plan);
  else if (kind === 'fewest') step(port, c, 'fewest', ' budget 2500', [2500], c.plan);
  else if (kind === 'casual') step(port, c, 'casual', ' x7', [7, 12345], c.plan);
  else if (kind === 'replay') { if (c.plan.length <= 300) step(port, c, 'replay', '', [], c.plan); }
  else step(port, c, kind, '', [], c.plan);
}

if (require.main === module && CONTROLS) {
  const port = W.load(WASM);
  const list = cases(R.mulberry32(SEED)).filter((_, i) => i % 10 === 0);
  let bad = 0;
  for (const kind of ['compile', 'rays', 'turning', 'solve', 'replay', 'postpone', 'casual', 'fewest']) {
    failures = []; limits = []; for (const k in seen) delete seen[k];
    corrupt = { kind, at: 5 };
    for (const c of list) runKind(port, c, kind);
    const ok = failures.length === 1 && failures[0].kind === kind;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} control ${kind}: ${failures.length} failure(s)${failures[0] ? ', named: ' + failures[0].name : ''}`);
  }
  console.log(bad ? `${bad} control(s) did not fail as they should` : 'every control failed, and named its case');
  process.exit(bad ? 1 : 0);
}

if (require.main === module) {
  const port = JS ? W.fake(io => {
    // the JS through the same converters: check-g3's hooks, which throw where the JS throws
    const { readPosition } = require('./check-g1.cjs');
    let draws = 0;
    const ctx = () => { const p = readPosition(io.input()); return G3.context(p.b, p.paths, p.prefer); };
    const hooks = { draws: () => draws, stack_peak: () => 0 };
    for (const kind of Object.keys(G3.CALL)) hooks[G3.CALL[kind].toString().match(/x\.(t_\w+)/)[1]] = (...a) => {
      io.clear();
      const cx = ctx();
      if (kind === 'fewest' && throws(() => H.compile(cx.level, cx.paths))) throw new WebAssembly.RuntimeError('the JS throws in compile');
      let w;
      try { w = G3.WANT[kind](cx, ...a); } catch (e) { throw new WebAssembly.RuntimeError('the JS threw: ' + e.message); }
      if (w.out) io.put(...w.out);
      if (w.draws !== undefined) draws = w.draws;
      return w.ret;
    };
    return hooks;
  }) : W.load(WASM);
  const t0 = Date.now(), r = R.mulberry32(SEED);
  const list = cases(r);
  const t1 = Date.now();
  for (const c of list) runPosition(port, c, r);
  const ms = Date.now() - t1;
  if (!JS) limitCases(port);
  console.log(`${failures.length ? 'FAIL' : 'ok  '} hex kernel, wide: ${summary(list)}; ${Object.values(counts).reduce((a, b) => a + b, 0)} comparisons of ${values} values (${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}), ${failures.length} failed, ${limits.length} limit traps (${(ms / 1000).toFixed(1)} s; cases ${((t1 - t0) / 1000).toFixed(1)} s)`);
  for (const f of failures.slice(0, 12)) console.log(`  ${f.kind}: ${f.name}\n    want ${JSON.stringify(f.want)?.slice(0, 400)}\n    got  ${JSON.stringify(f.got)?.slice(0, 400)}`);
  for (const l of limits.slice(0, 5)) console.log(`  limit: ${l}`);
  console.log(`${port.name}: ${failures.length ? 'FAILED' : 'all passed'} in ${((Date.now() - t0) / 1000).toFixed(1)} s` + (JS ? ' (--js: the JS against itself)' : `; stack peak ${port.x.stack_peak()} bytes after the last call`));
  process.exit(failures.length ? 1 : 0);
}
