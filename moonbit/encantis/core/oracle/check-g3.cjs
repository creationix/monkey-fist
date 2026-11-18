// G3's oracle: the Hex offset kernel of the Encantis core (hex.ents) against hex/engine.js at
// 9e69e3a.
//
//   node moonbit/encantis/core/oracle/check-g3.cjs [test/g3.wasm]   the port
//   node moonbit/encantis/core/oracle/check-g3.cjs --js             the positive control
//   node moonbit/encantis/core/oracle/check-g3.cjs --controls       the negative controls
//   node moonbit/encantis/core/oracle/check-g3.cjs --moonbit        the JS against MoonBit's
//            dist/mf.wasm (bench_par, bench_solve, bench_casual) on the Journey Hex boards
//   options: --only L114,C12 (boards), --frac 0.2 (a share of the positions), --reverse
//            (the positions in reverse order), --max-ropes 30 (leave out larger boards: C15's
//            105 ropes take 80% of the JS's time), --extra: the Hex boards without springs of
//            fixtures/g1-extra-boards.jsonl instead (21: 4x4 to 48x48, up to 197 ropes), at
//            most 12 positions each (the start, plan prefixes evenly spread, 4 of random play),
//            casual play of 200 games
//
// The cases (PORT-PLAN.md, G3): every Hex board of reference.json without springs (33: 28
// Journey, 5 custom; 4x6 to 32x32, up to 105 ropes, up to 7 mirrors), at every position
// R.positions() gives: the start, every prefix of the plan, and 20 positions of random play
// (taps of the JS's own G.tap). Each position has a plan, which the hooks read in the place of
// the preferred order: the rest of the board's plan on a prefix; on a random position, the
// moves of solve(level, paths, 2000, the board's plan) where that solves it, else the board's
// plan (so that fewest, replay and postpone see a solution there too, where there is one).
//
// The JS functions take a level ({ W, H, ropes, mirrors }). Those that start from level.ropes
// (postponeExits, casualWins, fewestPlayerTaps) are given a level whose ropes are the
// position's paths, null where a rope has left, which every one of them takes; the port's
// kernels take the paths ([]?[]Pt) the same way.
//
// Per position, each against the JS on the same paths:
//   compile   compile(level, paths): null where it throws (a way out passes a cell twice);
//             else per rope its track, length, offset and to(i); to(-1) and to(n); free, dead,
//             frozen, relaxed() (the reach), left; occupied and at by cell; pathsNow (hashed)
//   rays      per rope: exitIndex, then rayTrack from its head along it into an empty list:
//             null or not, the list as left (also when null), and the turning cells
//   turning   turningMirrors(level, paths), in insertion order
//   solve     solve(level, paths, budget, plan) at budgets 40, 900 and 2000, and at 2000 with no
//             preferred order (bench_solve's): solved (true, false, null), nodes, moves
//   replay    replay(level, plan[0..k], paths) for every k: solved, taps, events, and the paths
//             after (as a hash of their words; in full after the whole plan)
//   postpone  postponeExits: null, or its taps and plan
//   casual    casualWins(level, mulberry32(hashString('bench')), 1000): the share won (bit for
//             bit) and the draws made
//   fewest    fewestPlayerTaps(level, plan, 6000), and at 2500 (the generator's budget): null
//             where it throws (the plan does not solve), or par, exact, nodes and the plan
// Then the geometry, once: point and cell on every board size to 12x12 and 48x48, cell and
// inside off the board (negative q and r), reflect for d and axis from -6 to 12, dirIndex for
// steps from -3 to 3, and DIRS[d] (hex_dir) for d from -3 to 9 (a trap outside 0 to 5).
//
// relaxed(), at, point, dirIndex, mirrorCells, rayTrack and exitIndex are not in hex/engine.js's
// api. They are read from a copy of it made at run time with two text substitutions (in
// `internals()` below: compile's result gains `at, relaxed`, the api gains the five
// functions), checked to apply once each; the copy draws nothing, and the cases compare its
// compile with the original's.
//
// --controls runs each kind again with its 3rd comparison's expected value spoiled, on a share
// of the positions, and requires exactly that comparison to fail, by name.
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs');
const { readPosition } = require('./check-g1.cjs');

const args = process.argv.slice(2);
const VALUED = ['--only', '--frac', '--max-ropes'];
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const JS = args.includes('--js'), CONTROLS = args.includes('--controls'), MOONBIT = args.includes('--moonbit');
const WASM = args.find((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1])) || path.join(__dirname, '../test/g3.wasm');
const ONLY = opt('--only', null), FRAC = Number(opt('--frac', 1)), MAX_ROPES = Number(opt('--max-ropes', Infinity)), EXTRA = args.includes('--extra'), REVERSE = args.includes('--reverse');
const { H, L } = R.js();
const BENCH_SEED = L.hashString('bench');

// --- The internals of hex/engine.js ---

function internals() {
  let src = fs.readFileSync(path.join(R.dir, 'hex/engine.js'), 'utf8');
  const swap = (from, to) => {
    const at = src.split(from).length - 1;
    if (at !== 1) throw Error(`hex/engine.js: the text to substitute appears ${at} times: ${from.slice(0, 60)}`);
    src = src.replace(from, to);
  };
  swap('return { tracks, lengths, offsets, occupied, to,', 'return { tracks, lengths, offsets, occupied, at, relaxed, to,');
  swap('cellIndex: cell, reflect, build, compile };', 'cellIndex: cell, reflect, build, compile, point, dirIndex, mirrorCells, rayTrack, exitIndex };');
  const m = { exports: {} };
  new Function('module', src)(m);
  return m.exports;
}
const HI = internals();

// --- Comparing (check-g1's) ---

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

// --- The JS side ---

// What a hook sees: the level (its ropes are the paths), the paths ({q, r}, null for a rope
// that has left) and the plan.
function context(b, paths, plan) {
  return { level: { W: b.W, H: b.H, ropes: paths, mirrors: b.mirrors || [] }, paths, plan };
}

// FNV-1a over words, as test/g3.ents hashes the paths.
const mix = (h, w) => Math.imul((h ^ w) >>> 0, 0x01000193) >>> 0;
const pathWords = paths => { const w = []; for (const p of paths) { w.push(p ? p.length : 0); for (const c of p || []) w.push(c.q, c.r); } return w; };
const hashWords = words => words.reduce(mix, 0x811c9dc5) | 0;
const list = xs => [xs.length, ...xs];
const bit = b => b ? 1 : 0;
const solvedWord = s => s === true ? 1 : s === null ? -1 : 0;

// Each hook: what it returns and writes, from the JS. { ret, out, draws }.
const WANT = {
  compile: c => {
    let B;
    try { B = HI.compile(c.level, c.paths); } catch { return { ret: 0, out: [] }; }
    const n = c.paths.length, out = [];
    for (let i = 0; i < n; i++) out.push(...list(B.tracks[i]), B.lengths[i], B.offsets[i], B.to(i));
    out.push(B.to(-1), B.to(n), bit(B.free()), bit(B.dead()), ...list(B.frozen()), ...list(Array.from(B.relaxed())), B.left);
    out.push(...B.occupied, ...B.at, hashWords(pathWords(B.pathsNow())));
    return { ret: 1, out };
  },
  rays: c => {
    const bent = HI.mirrorCells(c.level), out = [];
    for (const p of c.paths) {
      if (!p) { out.push(-1); continue; }
      const d = HI.exitIndex(c.level, p, bent), cells = [], turns = new Set();
      const ok = HI.rayTrack(c.level, H.cellIndex(p.at(-1), c.level.W), d, bent, cells, turns);
      out.push(d, bit(ok), ...list(cells), ...list([...turns]));
    }
    return { out };
  },
  turning: c => ({ out: list([...H.turningMirrors(c.level, c.paths)]) }),
  solve: (c, budget) => { const s = H.solve(c.level, c.paths, budget, c.plan); return { out: [solvedWord(s.solved), s.nodes, ...list(s.moves)] }; },
  replay: c => {
    const out = [];
    for (let k = 0; k <= c.plan.length; k++) {
      const r = H.replay(c.level, c.plan.slice(0, k), c.paths);
      out.push(bit(r.solved), r.taps, ...list(r.events.map(e => e === 'exit' ? 0 : 2)), hashWords(pathWords(r.paths)));
      if (k === c.plan.length) out.push(...pathWords(r.paths));
    }
    return { out };
  },
  postpone: c => { const p = H.postponeExits(c.level, c.plan); return p ? { ret: 1, out: [p.taps, ...list(p.plan)] } : { ret: 0, out: [] }; },
  casual: (c, games, seed) => { const rng = R.mulberry32(seed >>> 0), before = R.draws(); const v = H.casualWins(c.level, rng, games); return { ret: v, draws: R.draws() - before }; },
  fewest: (c, budget) => {
    let f;
    try { f = H.fewestPlayerTaps(c.level, c.plan, budget); } catch { return { ret: 0, out: [] }; }
    return { ret: 1, out: [f.par, bit(f.exact), f.nodes, ...list(f.plan)] };
  },
};

// The hooks of test/g3.wasm, by kind: how to call each and read what it gives.
const CALL = {
  compile: x => x.t_compile(), rays: x => x.t_rays(), turning: x => x.t_turning(), solve: (x, budget) => x.t_solve(budget),
  replay: x => x.t_replay(), postpone: x => x.t_postpone(), casual: (x, games, seed) => x.t_casual(games, seed), fewest: (x, budget) => x.t_fewest(budget),
};
const RETURNS = new Set(['compile', 'postpone', 'casual', 'fewest']);
const WRITES = new Set(['compile', 'rays', 'turning', 'solve', 'replay', 'postpone', 'fewest']);
function call(port, kind, ...a) {
  const ret = CALL[kind](port.x, ...a);
  const got = {};
  if (RETURNS.has(kind)) got.ret = ret;
  if (WRITES.has(kind)) got.out = port.out();
  if (kind === 'casual') got.draws = port.x.draws();
  return got;
}

// --- The geometry ---

const SIZES = [];
for (let w = 1; w <= 12; w++) for (let h = 1; h <= 12; h++) SIZES.push([w, h]);
SIZES.push([48, 48], [48, 8], [4, 48]);
const GEO = {
  point: () => { const out = []; for (const [w, h] of SIZES) for (let c = 0; c < w * h; c++) { const p = HI.point(c, w); out.push([`point(${c}, ${w})`, [p.q, p.r], x => [x.t_point_q(c, w), x.t_point_r(c, w)]]); } return out; },
  cell: () => {
    const out = [];
    for (const [w, h] of SIZES) for (let c = 0; c < w * h; c++) { const p = HI.point(c, w); out.push([`cell(point(${c}), ${w})`, H.cellIndex(p, w), x => x.t_cell(p.q, p.r, w)]); }
    for (let w = 1; w <= 8; w++) for (let q = -6; q <= 6; q++) for (let r = -6; r <= 6; r++) out.push([`cell(${q}, ${r}, ${w})`, H.cellIndex({ q, r }, w), x => x.t_cell(q, r, w)]);
    return out;
  },
  inside: () => {
    const out = [];
    for (const [w, h] of SIZES.filter(([w, h]) => w <= 8 && h <= 8).concat([[48, 48]])) for (let q = -5 - h; q <= w + 4; q++) for (let r = -4; r <= h + 3; r++)
      out.push([`inside(${w}, ${h}, ${q}, ${r})`, bit(H.inside({ W: w, H: h }, { q, r })), x => x.t_inside(w, h, q, r)]);
    return out;
  },
  reflect: () => { const out = []; for (let d = -6; d <= 12; d++) for (let a = -6; a <= 12; a++) out.push([`reflect(${d}, ${a})`, H.reflect(d, a), x => x.t_reflect(d, a)]); return out; },
  dir_index: () => { const out = []; for (let dq = -3; dq <= 3; dq++) for (let dr = -3; dr <= 3; dr++) out.push([`dirIndex(${dq}, ${dr})`, HI.dirIndex([dq, dr]), x => x.t_dir_index(dq, dr)]); return out; },
  // DIRS[d]; outside 0 to 5 the JS has undefined (and throws on its use) and the port traps
  dir: () => { const out = []; for (let d = -3; d <= 9; d++) out.push([`DIRS[${d}]`, H.DIRS[d] ? [...H.DIRS[d]] : 'trap', x => { try { return [x.t_dir_q(d), x.t_dir_r(d)]; } catch (e) { if (e instanceof WebAssembly.RuntimeError) return 'trap'; throw e; } }]); return out; },
};
function checkGeometry(port, only) {
  let n = 0;
  for (const [kind, cases] of Object.entries(GEO)) {
    if (only && only !== kind) continue;
    for (const [name, want, got] of cases()) { same(kind, name, want, got(port.x)); n++; }
  }
  return n;
}

// The positive control: hooks that read the same words and answer with the JS.
function jsHooks(io) {
  let draws = 0;
  const ctx = () => { const p = readPosition(io.input()); return context(p.b, p.paths, p.prefer); };
  const hook = kind => (...a) => {
    io.clear();
    const w = WANT[kind](ctx(), ...a);
    if (w.out) io.put(...w.out);
    if (w.draws !== undefined) draws = w.draws;
    return w.ret;
  };
  const hooks = { draws: () => draws, stack_peak: () => 0,
    t_point_q: (c, w) => HI.point(c, w).q, t_point_r: (c, w) => HI.point(c, w).r, t_cell: (q, r, w) => H.cellIndex({ q, r }, w),
    t_inside: (w, h, q, r) => bit(H.inside({ W: w, H: h }, { q, r })), t_reflect: H.reflect, t_dir_index: (dq, dr) => HI.dirIndex([dq, dr]),
    t_dir_q: d => { if (!H.DIRS[d]) throw new WebAssembly.RuntimeError('DIRS[d] is undefined'); return H.DIRS[d][0]; },
    t_dir_r: d => { if (!H.DIRS[d]) throw new WebAssembly.RuntimeError('DIRS[d] is undefined'); return H.DIRS[d][1]; } };
  for (const kind of Object.keys(CALL)) hooks[CALL[kind].toString().match(/x\.(t_\w+)/)[1]] = hook(kind);
  return hooks;
}

// --- The cases ---

function extraBoards() {
  const rows = fs.readFileSync(path.join(__dirname, 'fixtures/g1-extra-boards.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  return rows.map((r, i) => ({ ...R.jsBoard(r), name: `X${i + 1} (${r.W}x${r.H}, ${r.ropes.length} ropes)` }));
}
// At most 12 positions: the start, prefixes evenly spread, and 4 of random play.
function sample(ps) {
  const plan = ps.filter(p => !p.from.startsWith('random')), random = ps.filter(p => p.from.startsWith('random'));
  const step = Math.max(1, Math.ceil(plan.length / 8));
  return [...plan.filter((_, i) => i % step === 0), ...random.filter((_, i) => i % 5 === 0)];
}
function cases() {
  const out = [];
  let boards = (EXTRA ? extraBoards() : R.boards()).filter(b => b.grid === 'hex' && !b.springs.length);
  if (ONLY) boards = boards.filter(b => ONLY.split(',').includes(b.name.split(' ')[0]));
  boards = boards.filter(b => b.ropes.length <= MAX_ROPES);
  for (const b of boards) {
    const ps = EXTRA ? sample(R.positions(b)) : R.positions(b);
    ps.forEach((p, k) => {
      let plan;
      if (!p.from.startsWith('random')) plan = b.plan.slice(p.taps.length);
      else {
        const s = H.solve(context(b, p.paths, []).level, p.paths, 2000, b.plan);
        plan = s.solved ? s.moves : b.plan.slice();
      }
      out.push({ b, p, plan, k, name: `${b.name} ${p.from}` });
    });
  }
  return REVERSE ? out.reverse() : out;
}

// What to call on each position: [kind, label, args, prefer].
const GAMES = EXTRA ? 200 : 1000;
const STEPS = [['compile', '', []], ['rays', '', []], ['turning', '', []],
  ['solve', ' budget 40', [40]], ['solve', ' budget 900', [900]], ['solve', ' budget 2000', [2000]], ['solve', ' budget 2000, no prefer', [2000], 'none'],
  ['replay', '', []], ['postpone', '', []], ['casual', ` x${GAMES}`, [GAMES, BENCH_SEED | 0]],
  ['fewest', ' budget 6000', [6000]], ['fewest', ' budget 2500', [2500]]];
const KINDS = [...new Set(STEPS.map(s => s[0])), ...Object.keys(GEO)];

let peak = { bytes: 0, where: '' }, values = 0;
const size = w => (w.out ? w.out.length : 0) + (w.ret !== undefined ? 1 : 0) + (w.draws !== undefined ? 1 : 0);
function run(port, list, only) {
  const counts = {}; let n = 0;
  for (const c of list) {
    const words = R.position(c.b, c.p.paths, c.plan), noPrefer = R.position(c.b, c.p.paths, []);
    const cx = context(c.b, c.p.paths, c.plan), cxNone = context(c.b, c.p.paths, []);
    // the copy of hex/engine.js compiles as the original does
    if (!only || only === 'compile') {
      let a, b;
      try { a = H.compile(cx.level, c.p.paths); } catch { a = null; }
      try { b = HI.compile(cx.level, c.p.paths); } catch { b = null; }
      if (!a !== !b || (a && JSON.stringify([a.tracks, a.offsets, a.frozen()]) !== JSON.stringify([b.tracks, b.offsets, b.frozen()]))) throw Error(`${c.name}: the copy of hex/engine.js compiles otherwise`);
    }
    let compiled = true;
    for (const [kind, label, a, prefer] of STEPS) {
      if (only && kind !== only) continue;
      if (!compiled) break;
      port.push(prefer === 'none' ? noPrefer : words);
      const want = WANT[kind](prefer === 'none' ? cxNone : cx, ...a);
      const got = call(port, kind, ...a);
      same(kind, `${c.name}: ${kind}${label}`, want, got);
      values += size(want);
      const p = port.x.stack_peak();
      if (p > peak.bytes) peak = { bytes: p, where: `${c.name}: ${kind}${label}` };
      if (kind === 'compile' && want.ret === 0) compiled = false;  // the rest would throw in the JS, and trap
      counts[kind] = (counts[kind] || 0) + 1; n++;
    }
  }
  return { n, counts };
}

// --- MoonBit's build, against the JS (the oracle agrees with what the game ships) ---

function moonbit() {
  const repo = path.resolve(__dirname, '../../../..');
  const mbt = W.load(path.join(repo, 'moonbit/dist/mf.wasm'));
  const boards = R.boards().filter(b => b.grid === 'hex' && !b.springs.length && b.name.startsWith('L') && (!ONLY || ONLY.split(',').includes(b.name)));
  let n = 0;
  const t0 = Date.now();
  for (const b of boards) {
    mbt.pushText('J3-MONKEYFIST');
    if (!mbt.x.generate(Number(b.name.slice(1)) - 1)) throw Error(`MoonBit made no level ${b.name}`);
    const level = { W: b.W, H: b.H, ropes: b.ropes, mirrors: b.mirrors };
    const p = H.postponeExits(level, b.plan);
    same('moonbit', `${b.name}: bench_par`, H.fewestPlayerTaps(level, p ? p.plan : b.plan, 2500).par, mbt.x.bench_par());
    for (const budget of [40, 900, 2000]) same('moonbit', `${b.name}: bench_solve(${budget})`, H.solve(level, b.ropes, budget, []).nodes, mbt.x.bench_solve(budget));
    for (const games of [1, 100, 1000]) same('moonbit', `${b.name}: bench_casual(${games})`, H.casualWins(level, R.mulberry32(BENCH_SEED), games), mbt.x.bench_casual(games));
    n += 7;
  }
  return { n, boards: boards.length, ms: Date.now() - t0 };
}

if (require.main === module && MOONBIT) {
  const { n, boards, ms } = moonbit();
  console.log(`${failures.length ? 'FAIL' : 'ok  '} MoonBit dist/mf.wasm against hex/engine.js: ${boards} Journey Hex boards without springs, ${n} comparisons (bench_par, bench_solve at 40, 900, 2000, bench_casual x1, x100, x1000), ${failures.length} failed (${ms} ms)`);
  for (const f of failures.slice(0, 12)) console.log(`  ${f.name}: want ${JSON.stringify(f.want)} got ${JSON.stringify(f.got)}`);
  process.exit(failures.length ? 1 : 0);
}

if (require.main === module && CONTROLS) {
  const port = W.load(WASM);
  const all = cases(), part = all.filter((_, i) => i % 25 === 0);
  let bad = 0;
  for (const kind of KINDS) {
    failures = []; for (const k in seen) delete seen[k];
    corrupt = { kind, at: 3 };
    if (GEO[kind]) checkGeometry(port, kind); else run(port, part, kind);
    const ours = failures.filter(f => f.kind === kind);
    const ok = failures.length === 1 && ours.length === 1;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} control ${kind}: ${failures.length} failure(s)${ours[0] ? ', named: ' + ours[0].name : ''}`);
  }
  console.log(bad ? `${bad} control(s) did not fail as they should` : 'every control failed, and named its case');
  process.exit(bad ? 1 : 0);
}

if (require.main === module) {
  const port = JS ? W.fake(jsHooks) : W.load(WASM);
  const t0 = Date.now();
  let list = cases();
  if (FRAC < 1) list = list.filter((_, i) => i % Math.round(1 / FRAC) === 0);
  const t1 = Date.now();
  const { n, counts } = run(port, list);
  const boards = new Set(list.map(c => c.b.name)).size;
  console.log(`${failures.length ? 'FAIL' : 'ok  '} hex kernel: ${list.length} positions on ${boards} boards${REVERSE ? ' (in reverse)' : ''}, ${n} comparisons of ${values} values (${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}), ${failures.length} failed (${((Date.now() - t1) / 1000).toFixed(1)} s; cases ${((t1 - t0) / 1000).toFixed(1)} s)`);
  const before = failures.length, tg = Date.now(), ng = checkGeometry(port);
  console.log(`${failures.length > before ? 'FAIL' : 'ok  '} geometry: ${ng} comparisons (point, cell, inside, reflect, dirIndex, DIRS), ${failures.length - before} failed (${Date.now() - tg} ms)`);
  for (const f of failures.slice(0, 12)) console.log(`  ${f.kind}: ${f.name}\n    want ${JSON.stringify(f.want)?.slice(0, 400)}\n    got  ${JSON.stringify(f.got)?.slice(0, 400)}`);
  console.log(`${port.name}: ${failures.length ? 'FAILED' : 'all passed'} in ${((Date.now() - t0) / 1000).toFixed(1)} s` + (JS ? ' (--js: the JS against itself)' : `; stack peak ${peak.bytes} bytes (${peak.where}); no imports`));
  process.exit(failures.length ? 1 : 0);
}

module.exports = { WANT, CALL, context, cases, run, same, internals, failures: () => failures };
