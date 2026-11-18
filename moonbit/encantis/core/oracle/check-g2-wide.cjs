// G2's wider oracle (written by G2's review): the square kernel of test/g2.wasm against
// levels.js at 9e69e3a on boards and calls check-g2.cjs never makes.
//
//   node moonbit/encantis/core/oracle/check-g2-wide.cjs [test/g2.wasm]
//   options: --boards N (synthetic boards, default 400), --seed S (their seed, default 0x62),
//            --no-springs (skip the reference boards with springs), --no-generated, --fixture F
//            (the generated boards from F), --aimed N (boards with mirrors aimed at a way out,
//            default 150; 0 for none), --js (the
//            positive control), --controls (the negative controls), --only K (one kind)
//
// The kernels are pure functions of (paths, W, H, mirrors, ...), so any board is a fair
// input, not only one the generator would make. Three sets of boards:
//   synthetic  N random boards from a seeded mulberry32: 1 x 2 up to 48 x 48 (most 4 to 16
//              wide), no mirrors, a few, or a mirror on up to a third of the cells; ropes are
//              self-avoiding walks of 2 cells up, over mirrors or not, filling 20% to 100%.
//              Such boards reach what the generator's never do: ways out that loop forever
//              (rayCells' 2*W*H cap), that pass a cell twice (boardOf throws), heads on a
//              mirror, ropes whose own body is in their way, and 1-wide strips.
//   springs    the 33 square reference boards that have springs, springs ignored (the
//              kernels take no springs; game-engine.js sends these boards elsewhere, but the
//              kernels must still agree on them)
//   generated  the square boards of fixtures/g2-review-boards.jsonl, made by the JS game from
//              random codes (gen-extra-boards.cjs with 300 codes, less G1's boards): the start,
//              up to 6 plan prefixes and 3 positions of random play, each with the plan check-g2
//              gives (skip with --no-generated)
//   aimed      (G2's second review) N boards made as the synthetic ones, their mirrors
//              replaced by 1 (most), 2 or 3 placed on a rope's straight way out or on its head
//              (--aimed N, default 150, from their own seed). The other sets almost never make
//              a board with exactly one mirror, so self_blocked's mirror branch with a single
//              mirror went untried: a mutant that took `m.size() > 1` for `> 0` passed them all.
//   positions  on each synthetic and aimed board: the start, and up to 8 positions of random
//              legal play.
//
// Per position, with a plan drawn per position (a JS solution, a solution with a tap added,
// or random taps, all of in-range ropes):
//   tracks, free, frozen, dead, rays (as check-g2)
//   solve      budgets 0 (the default 20,000), 1, 2, 3, -1, a random 1..60, 300, 2000 with the
//              plan as prefer, and 2000 with a junk prefer (-1, n, n + 5, repeats)
//   taps, replay, postpone (as check-g2)
//   fewest     budgets 0 (the default 6,000), 1, 2, a random 1..40, 2500
//   casual     games 0, 1, -3, and a random 2..60 with a random seed: share and draws
// Where boardOf throws (a way out passes a cell twice), every kernel but rays must trap in the
// port: the JS throws. A plan with a rope index out of range must trap in taps, fewest, replay
// and postpone (the JS throws a TypeError), and is ignored by solve's prefer.
//
// The set check-g2 never reaches: boardOf throwing, a way out capped at 2 * W * H or passing a
// cell twice, selfBlocked true (with mirrors and without), a replay that ends unsolved, solve
// giving up at 2,000, budgets 0 and below, games 0 and below, junk in prefer, taps out of range.
//
// Known limits (PORT-PLAN, G2 as built and after its review), counted as "limit", not as a
// failure: solve's visited keys take room for the whole budget, 4 bytes per rope per node, so
// solve at budget 0 (20,000) traps on boards of many ropes (when the reserve passes 12 MB); and
// a hook whose output passes the ABI's 65,536 words traps in put().
// The limits the review added are checked to trap (not under --js, since the JS has none): a
// path with a cell off its board (sq_board), and self_blocked on a board with mirrors past
// max_area (2,304 cells).
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs');
const G2 = require('./check-g2.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const JS = args.includes('--js'), CONTROLS = args.includes('--controls');
const VALUED = ['--boards', '--seed', '--only', '--fixture', '--aimed'];
const WASM = args.find((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1])) || path.join(__dirname, '../test/g2.wasm');
const NBOARDS = Number(opt('--boards', 400)), SEED = Number(opt('--seed', 0x62)), ONLY = opt('--only', null);
const NAIMED = Number(opt('--aimed', 150));
const { L } = R.js();

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
function synthetic(r, k) {
  const int = rnd(r), u = r();
  let w, h;
  if (u < 0.12) { w = int(1, 4); h = int(1, 4); if (w * h < 2) w = 2; }
  else if (u < 0.80) { w = int(4, 16); h = int(4, 16); }
  else if (u < 0.95) { w = int(12, 24); h = int(12, 24); }
  else { w = int(25, 48); h = int(25, 48); }
  if (r() < 0.08) { if (r() < 0.5) w = 1; else h = 1; if (w * h < 2) { w = Math.max(w, 2); } }
  const area = w * h, mu = r();
  const nm = mu < 0.4 ? 0 : mu < 0.8 ? int(1, Math.max(1, Math.min(8, area >> 2))) : int(0, Math.floor(area / 3));
  const mirrorAt = new Map();
  for (let t = 0; t < nm * 3 && mirrorAt.size < nm; t++) { const c = int(0, area - 1); if (!mirrorAt.has(c)) mirrorAt.set(c, r() < 0.5 ? '/' : '\\'); }
  const avoidMirrors = r() < 0.5, fill = 0.2 + 0.8 * r(), maxLen = int(2, Math.max(2, Math.min(w + h, 30)));
  const taken = new Uint8Array(area), ropes = [];
  let covered = 0;
  for (let t = 0; t < area * 4 && covered < fill * area; t++) {
    const c0 = int(0, area - 1);
    if (taken[c0] || (avoidMirrors && mirrorAt.has(c0))) continue;
    const want = int(2, maxLen), cells = [c0];
    taken[c0] = 1;
    while (cells.length < want) {
      const c = cells[cells.length - 1], x = c % w, y = (c / w) | 0, opts = [];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nc = ny * w + nx;
        if (taken[nc] || (avoidMirrors && mirrorAt.has(nc))) continue;
        opts.push(nc);
      }
      if (!opts.length) break;
      const nc = opts[int(0, opts.length - 1)];
      taken[nc] = 1; cells.push(nc);
    }
    if (cells.length < 2) { taken[c0] = 0; continue; }
    ropes.push(cells.map(c => ({ q: c % w, r: (c / w) | 0 })));
    covered += cells.length;
  }
  const mirrors = [...mirrorAt].map(([c, s]) => ({ cell: { q: c % w, r: (c / w) | 0 }, slope: s }));
  return { grid: 'square', W: w, H: h, ropes, mirrors, springs: [], plan: [], name: `S${k + 1} (${w}x${h}, ${ropes.length} ropes, ${mirrors.length} mirrors)` };
}

// A synthetic board whose mirrors are replaced by 1 (60%), 2 or 3 aimed ones: each on a
// cell of a rope's straight way out (the line from its head to the edge, its own body
// included), or on its head (15%, or when the head is at the edge). The rope is the longer
// of two drawn, as long ropes are the ones that can turn into their own body.
function aimed(r, k) {
  const int = rnd(r), b = synthetic(r, k), w = b.W, h = b.H, ropes = b.ropes;
  const want = r() < 0.6 ? 1 : r() < 0.75 ? 2 : 3, at = new Map();
  for (let t = 0; t < 30 && at.size < want && ropes.length; t++) {
    const a = ropes[int(0, ropes.length - 1)], z = ropes[int(0, ropes.length - 1)], p = a.length >= z.length ? a : z;
    const hd = p[p.length - 1], pv = p[p.length - 2], dx = hd.q - pv.q, dy = hd.r - pv.r, line = [];
    for (let x = hd.q + dx, y = hd.r + dy; x >= 0 && y >= 0 && x < w && y < h; x += dx, y += dy) line.push(y * w + x);
    const c = !line.length || r() < 0.15 ? hd.r * w + hd.q : line[int(0, line.length - 1)];
    if (!at.has(c)) at.set(c, r() < 0.5 ? '/' : '\\');
  }
  const mirrors = [...at].map(([c, s]) => ({ cell: { q: c % w, r: (c / w) | 0 }, slope: s }));
  return { ...b, mirrors, name: `A${k + 1} (${w}x${h}, ${ropes.length} ropes, ${mirrors.length} mirrors)` };
}

const xy = paths => paths.map(p => p && p.map(c => ({ x: c.q, y: c.r })));
const qr = paths => paths.map(p => p && p.map(c => ({ q: c.x, r: c.y })));
const mirrorMap = b => new Map(b.mirrors.map(m => [m.cell.r * b.W + m.cell.q, m.slope]));
const throws = f => { try { f(); return false; } catch { return true; } };

// The start and up to 8 positions of random legal play (taps that move their rope).
function positionsOf(b, r) {
  const m = mirrorMap(b), out = [{ paths: b.ropes, from: 'start' }];
  if (throws(() => L.tracksOf(xy(b.ropes), b.W, b.H, m))) return out;
  let paths = b.ropes;
  const steps = Math.floor(r() * 9);
  for (let s = 0; s < steps * 3 && out.length <= steps; s++) {
    const legal = [];
    for (let i = 0; i < paths.length; i++) if (paths[i] && L.replay(xy(paths), b.W, b.H, [i], m).events.length === 1) legal.push(i);
    if (!legal.length) break;
    const i = legal[Math.floor(r() * legal.length)];
    paths = qr(L.play(xy(paths), b.W, b.H, [i], m));
    out.push({ paths, from: `random ${out.length}` });
  }
  return out;
}

// A plan for a position: a JS solution, a solution with a tap added, or random taps.
function planFor(b, paths, r) {
  const m = mirrorMap(b), n = paths.length, u = r();
  if (!n) return [];
  if (u < 0.6 && !throws(() => L.tracksOf(xy(paths), b.W, b.H, m))) {
    const s = L.solve(xy(paths), b.W, b.H, 2000, [], m);
    if (s.solved) {
      const plan = s.moves.slice();
      if (u < 0.15) plan.splice(Math.floor(r() * (plan.length + 1)), 0, Math.floor(r() * n));
      return plan;
    }
  }
  return Array.from({ length: Math.floor(r() * (2 * n + 1)) }, () => Math.floor(r() * n));
}

// --- the calls ---

function jsCall(kind, cx, a) {
  try { return G2.WANT[kind](cx, ...a); } catch (e) { return { throws: true }; }
}
function portCall(port, kind, a) {
  try {
    const ret = G2.CALL[kind](port.x, ...a), got = {};
    if (['tracks', 'free', 'taps', 'fewest', 'postpone', 'casual'].includes(kind)) got.ret = ret;
    if (['tracks', 'frozen', 'dead', 'solve', 'fewest', 'replay', 'postpone', 'rays'].includes(kind)) got.out = port.out();
    if (kind === 'casual') got.draws = port.x.draws();
    return got;
  } catch (e) {
    if (e instanceof WebAssembly.RuntimeError) return { throws: true };
    throw e;
  }
}

let values = 0;
const counts = {};
// Runs kind on the position words with args a; `room` is solve's reserve in bytes (limit check).
function step(port, c, kind, label, a, plan, room = 0) {
  if (ONLY && kind !== ONLY) return;
  const words = R.position(c.b, c.paths, plan), cx = G2.context(c.b, c.paths, plan);
  port.push(words);
  const want = jsCall(kind, cx, a), got = portCall(port, kind, a);
  const name = `${c.name} ${c.from}: ${kind}${label}`;
  counts[kind] = (counts[kind] || 0) + 1;
  values += want.out ? want.out.length + 1 : 1;
  if (got.throws && !want.throws && room > 12e6) { limits.push(name); return; }
  // the ABI's output buffer holds 65,536 words (abi.ents): a hook that would write more traps
  // in put() (rays on a board of long looping ways out: --seed 2's S276 writes 95,000)
  if (got.throws && !want.throws && want.out && want.out.length > 65536) { limits.push(`${name} (${want.out.length} words out)`); return; }
  same(kind, name, want, got);
}

function runPosition(port, c, r) {
  const n = c.paths.length, int = rnd(r);
  const plan = c.plan, junk = [-1, n, n + 5, ...plan.slice(0, 3), ...plan.slice(0, 3)];
  const bad = plan.length ? [...plan.slice(0, plan.length >> 1), r() < 0.5 ? n : -1, ...plan.slice(plan.length >> 1)] : [n];
  for (const kind of ['tracks', 'free', 'frozen', 'dead', 'rays']) step(port, c, kind, '', [], plan);
  for (const budget of [0, 1, 2, 3, -1, int(1, 60), 300, 2000]) step(port, c, 'solve', ` budget ${budget}`, [budget], plan, (budget || 20000) * 4 * n);
  step(port, c, 'solve', ' budget 2000, junk prefer', [2000], junk);
  step(port, c, 'taps', '', [], plan);
  for (const budget of [0, 1, 2, int(1, 40), 2500]) step(port, c, 'fewest', ` budget ${budget}`, [budget], plan);
  if (plan.length <= 300) step(port, c, 'replay', '', [], plan);
  step(port, c, 'postpone', '', [], plan);
  for (const games of [0, 1, -3, int(2, 60)]) step(port, c, 'casual', ` x${games}`, [games, (r() * 2 ** 32) | 0], plan);
  // a rope index out of range: the JS throws, the port must trap
  if (n) for (const kind of ['taps', 'fewest', 'replay', 'postpone']) step(port, c, kind, ' (a tap out of range)', kind === 'fewest' ? [2500] : [], bad);
}

// The square boards of fixtures/g2-review-boards.jsonl (the JS game's own, from random codes),
// at the start, up to 6 plan prefixes evenly spread and 3 positions of random play, each with
// a plan as check-g2.cjs gives it (the rest of the board's plan, or a JS solution).
const FIXTURE = opt('--fixture', path.join(__dirname, 'fixtures/g2-review-boards.jsonl'));
function generated() {
  if (args.includes('--no-generated') || !fs.existsSync(FIXTURE)) return [];
  const rows = fs.readFileSync(FIXTURE, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const out = [];
  rows.forEach((row, i) => {
    const b = { ...R.jsBoard(row), name: `G${i + 1} (${row.W}x${row.H}, ${row.ropes.length} ropes, ${row.mirrors.length} mirrors${row.springs.length ? ', springs ignored' : ''})` };
    const ps = R.positions(b, 9), plan = ps.filter(p => !p.from.startsWith('random')), random = ps.filter(p => p.from.startsWith('random'));
    const step = Math.max(1, Math.ceil(plan.length / 6));
    for (const p of [...plan.filter((_, k) => k % step === 0), ...random.filter((_, k) => k % 3 === 0)]) {
      let pl;
      if (!p.from.startsWith('random')) pl = b.plan.slice(p.taps.length);
      else { const s = L.solve(xy(p.paths), b.W, b.H, 2000, b.plan, mirrorMap(b)); pl = s.solved ? s.moves : b.plan.slice(); }
      out.push({ b, paths: p.paths, from: p.from, name: b.name, plan: pl });
    }
  });
  return out;
}

function cases(r) {
  const boards = [];
  for (let k = 0; k < NBOARDS; k++) boards.push(synthetic(r, k));
  if (!args.includes('--no-springs')) boards.push(...R.boards().filter(b => b.grid === 'square' && b.springs.length).map(b => ({ ...b, name: `${b.name} (springs ignored)` })));
  const out = [];
  for (const b of boards) for (const p of positionsOf(b, r)) out.push({ b, paths: p.paths, from: p.from, name: b.name, plan: planFor(b, p.paths, r) });
  // the aimed boards draw from a generator of their own, so the sets before them are as they were
  const ra = R.mulberry32((SEED ^ 0xa1a1) >>> 0), more = [];
  for (let k = 0; k < NAIMED; k++) {
    const b = aimed(ra, k);
    for (const p of positionsOf(b, ra)) more.push({ b, paths: p.paths, from: p.from, name: b.name, plan: planFor(b, p.paths, ra) });
  }
  return [...out, ...generated(), ...more];
}

function run(port, list, r) {
  const t = Date.now();
  for (const c of list) runPosition(port, c, r);
  return Date.now() - t;
}

// The review's limits: where the JS answers and the port must trap. A path with a cell off its
// board (row -1, row H, and column -1 on row 0) through every kernel that builds a board, and
// t_rays on boards past max_area with one mirror away from the ways out.
function limitCases(port) {
  if (ONLY && ONLY !== 'limits') return;
  const off = [[{ q: 1, r: -1 }, { q: 1, r: 0 }, { q: 2, r: 0 }], [{ q: 1, r: 4 }, { q: 1, r: 3 }, { q: 2, r: 3 }], [{ q: -1, r: 0 }, { q: 0, r: 0 }]];
  const calls = [['tracks', []], ['free', []], ['frozen', []], ['dead', []], ['solve', [100]], ['taps', []], ['fewest', [100]], ['replay', []], ['postpone', []], ['casual', [3, 1]]];
  const cases = [];
  for (const rope of off) cases.push({ b: { grid: 'square', W: 4, H: 4, ropes: [rope, [{ q: 3, r: 2 }, { q: 3, r: 1 }]], mirrors: [], springs: [], plan: [] }, calls, what: `a cell at (${rope[0].q}, ${rope[0].r}) on 4x4` });
  for (const [w, h] of [[49, 48], [48, 49], [50, 50], [2, 1200]]) {
    const ropes = Array.from({ length: Math.min(w, 6) }, (_, x) => [{ q: x, r: 0 }, { q: x, r: 1 }]);
    cases.push({ b: { grid: 'square', W: w, H: h, ropes, mirrors: [{ cell: { q: w - 1, r: 0 }, slope: '/' }], springs: [], plan: [] }, calls: [['rays', []]], what: `${w}x${h} with a mirror` });
  }
  for (const c of cases) for (const [kind, a] of c.calls) {
    const plan = kind === 'solve' ? [] : [1, 0];
    port.push(R.position(c.b, c.b.ropes, plan));
    const got = portCall(port, kind, a);
    counts.limits = (counts.limits || 0) + 1; values++;
    same('limits', `${c.what}: ${kind} must trap`, { throws: true }, got.throws ? { throws: true } : got);
  }
}

const summary = list => {
  const dup = list.filter(c => c.from === 'start' && throws(() => L.tracksOf(xy(c.paths), c.b.W, c.b.H, mirrorMap(c.b)))).length;
  return `${new Set(list.map(c => c.name)).size} boards (${dup} whose ways out pass a cell twice), ${list.length} positions`;
};

module.exports = { synthetic, aimed, positionsOf, planFor, cases, mirrorMap, xy };

if (require.main === module && CONTROLS) {
  const port = W.load(WASM);
  const list = cases(R.mulberry32(SEED)).filter((_, i) => i % 10 === 0);
  let bad = 0;
  for (const kind of ['tracks', 'free', 'frozen', 'dead', 'rays', 'solve', 'taps', 'fewest', 'replay', 'postpone', 'casual']) {
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

// One kind of runPosition's calls, for the controls.
function runKind(port, c, kind) {
  if (kind === 'solve') for (const budget of [1, 40, 2000]) step(port, c, 'solve', ` budget ${budget}`, [budget], c.plan);
  else if (kind === 'fewest') step(port, c, 'fewest', ' budget 2500', [2500], c.plan);
  else if (kind === 'casual') step(port, c, 'casual', ' x7', [7, 12345], c.plan);
  else if (kind === 'replay') { if (c.plan.length <= 300) step(port, c, 'replay', '', [], c.plan); }
  else step(port, c, kind, '', [], c.plan);
}

if (require.main === module) {
  const port = JS ? W.fake(io => {
    // the JS through the same converters: check-g2's hooks, which throw where the JS throws
    const { readPosition } = require('./check-g1.cjs');
    let draws = 0;
    const ctx = () => { const p = readPosition(io.input()); return G2.context(p.b, p.paths, p.prefer); };
    const hook = kind => (...a) => { io.clear(); const w = G2.WANT[kind](ctx(), ...a); if (w.out) io.put(...w.out); if (w.draws !== undefined) draws = w.draws; return w.ret; };
    const hooks = { draws: () => draws, stack_peak: () => 0 };
    for (const kind of Object.keys(G2.CALL)) hooks[G2.CALL[kind].toString().match(/x\.(t_\w+)/)[1]] = (...a) => {
      try { return hook(kind)(...a); } catch (e) { throw new WebAssembly.RuntimeError('the JS threw: ' + e.message); }
    };
    return hooks;
  }) : W.load(WASM);
  const t0 = Date.now(), r = R.mulberry32(SEED);
  const list = cases(r);
  const t1 = Date.now();
  const ms = run(port, list, r);
  if (!JS) limitCases(port);
  const traps = failures.length;
  console.log(`${failures.length ? 'FAIL' : 'ok  '} square kernel, wide: ${summary(list)}; ${Object.values(counts).reduce((a, b) => a + b, 0)} comparisons of ${values} values (${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}), ${failures.length} failed, ${limits.length} limit traps (${(ms / 1000).toFixed(1)} s; cases ${((t1 - t0) / 1000).toFixed(1)} s)`);
  for (const f of failures.slice(0, 12)) console.log(`  ${f.kind}: ${f.name}\n    want ${JSON.stringify(f.want)?.slice(0, 400)}\n    got  ${JSON.stringify(f.got)?.slice(0, 400)}`);
  for (const l of limits.slice(0, 5)) console.log(`  limit: ${l}`);
  console.log(`${port.name}: ${failures.length ? 'FAILED' : 'all passed'} in ${((Date.now() - t0) / 1000).toFixed(1)} s` + (JS ? ' (--js: the JS against itself)' : `; stack peak ${port.x.stack_peak()} bytes after the last call`));
  process.exit(failures.length ? 1 : 0);
}
