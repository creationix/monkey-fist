// G2's oracle: the square offset kernel of the Encantis core (square.ents) against
// levels.js at 9e69e3a, and the woven builder (weave.ents) against builder's fixture.
//
//   node moonbit/encantis/core/oracle/check-g2.cjs [test/g2.wasm]   the port
//   node moonbit/encantis/core/oracle/check-g2.cjs --js             the positive control
//   node moonbit/encantis/core/oracle/check-g2.cjs --controls       the negative controls
//   options: --only L107,C11 (boards), --frac 0.2 (a share of the positions), --no-weave,
//            --extra: the square boards without springs of fixtures/g1-extra-boards.jsonl
//            instead (25: 4x4 to 48x48, up to 223 ropes), at most 12 positions each (the
//            start, plan prefixes evenly spread, 4 of random play) and casual play of 200
//            games: the boards where the stack's reserves are largest
//
// The cases (PORT-PLAN.md, G2): every square board of reference.json without springs
// (35: 31 Journey, 4 custom; 4x5 to 16x20, up to 63 ropes, up to 7 mirrors), at every
// position R.positions() gives: the start, every prefix of the plan, and 20 positions of
// random play. Each position has a plan, which the hooks read in the place of the
// preferred order: the rest of the board's plan on a prefix; on a random position, the
// moves of solve(paths, budget 2000, the board's plan) where that solves it, else the
// board's plan (so that fewest, replay and postpone see a solution there too).
//
// Per position, each against the JS on the same paths (as game-engine.js passes them):
//   tracks    tracksOf: every rope's track (or the throw of a way out that passes a cell twice)
//   free      free;  frozen  frozenRopes;  dead  deadRopes
//   solve     solve(paths, W, H, budget, plan) at budgets 40, 900 and 2000, and at 2000 with
//             no preferred order (bench_solve's): solved (true, false, null), nodes, moves
//   taps      playerTapCount(plan)
//   fewest    fewestPlayerTaps(paths, W, H, plan, 2500): null, or count, exact, nodes, taps
//   replay    replay(paths, plan[0..k]) for every k: solved, taps, events, and the paths after
//             (as a hash of their words; in full after the whole plan)
//   postpone  postponeExits(plan): null, or count and taps
//   casual    casualWins(paths, W, H, mulberry32(hashString('bench')), 1000): the share won
//             (bit for bit) and the draws made
//   rays      per rope: selfBlocked, and rayCells from its head along its way out (exitDir),
//             into an empty list and after its body's cells: null or not, and the list
// Then what the generator takes beside weave: knotsWanted(d) for d = 0 to 400 and knotsFor(d)
// (grid-generator.js) for d = -5 to 105, in steps of 0.01, and the rope styles (STYLES:
// minLen, straight, lenLo, lenHi(w) for w = 1 to 60).
// Then the weave, unless --no-weave: builder's check-weave.cjs on this wasm (G2's entry
// exports the same contract as test/weave.wasm), so that the builder is checked where it
// shares the stack with the square kernel.
//
// --controls runs each kind again with its 3rd comparison's expected value spoiled, on a
// share of the positions, and requires exactly that comparison to fail, by name.
'use strict';
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
const R = require('./ref.cjs'), W = require('./wasm.cjs');
const { readPosition } = require('./check-g1.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const JS = args.includes('--js'), CONTROLS = args.includes('--controls');
const WASM = args.find((a, i) => !a.startsWith('--') && !['--only', '--frac'].includes(args[i - 1])) || path.join(__dirname, '../test/g2.wasm');
const ONLY = opt('--only', null), FRAC = Number(opt('--frac', 1)), EXTRA = args.includes('--extra');
const { L } = R.js();
const BENCH_SEED = L.hashString('bench');

// --- comparing (check-g1's) ---

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

// --- the JS side ---

// What a hook sees: the board's size, its mirrors as the JS Map, the paths as levels.js
// takes them ({x, y}, null for a rope that has left), and the plan.
function context(b, paths, plan) {
  return { W: b.W, H: b.H, mirrors: new Map((b.mirrors || []).map(m => [m.cell.r * b.W + m.cell.q, m.slope])),
    paths: paths.map(p => p && p.map(c => ({ x: c.q, y: c.r }))), plan };
}

// FNV-1a over words, as t_replay hashes the paths.
const mix = (h, w) => Math.imul((h ^ w) >>> 0, 0x01000193) >>> 0;
const pathWords = paths => { const w = []; for (const p of paths) { w.push(p ? p.length : 0); for (const c of p || []) w.push(c.x, c.y); } return w; };
const hashWords = words => words.reduce(mix, 0x811c9dc5) | 0;
const list = xs => [xs.length, ...xs];
const solvedWord = s => s === true ? 1 : s === null ? -1 : 0;
const turn = (slope, dx, dy) => slope === '/' ? [-dy, -dx] : [dy, dx];
function exitDir(path, W_, mirrors) {
  const h = path[path.length - 1], d = L.headDir(path), m = mirrors.get(h.y * W_ + h.x);
  return m === undefined ? d : turn(m, d[0], d[1]);
}

// Each hook: what it returns and writes, from the JS. { ret, out, draws }.
const WANT = {
  tracks: c => { try { return { ret: 1, out: L.tracksOf(c.paths, c.W, c.H, c.mirrors).flatMap(list) }; } catch { return { ret: 0, out: [] }; } },
  free: c => ({ ret: L.free(c.paths, c.W, c.H, c.mirrors) ? 1 : 0 }),
  frozen: c => ({ out: list(L.frozenRopes(c.paths, c.W, c.H, c.mirrors)) }),
  dead: c => ({ out: list(L.deadRopes(c.paths, c.W, c.H, c.mirrors)) }),
  solve: (c, budget) => { const s = L.solve(c.paths, c.W, c.H, budget, c.plan, c.mirrors); return { out: [solvedWord(s.solved), s.nodes, ...list(s.moves)] }; },
  taps: c => ({ ret: L.playerTapCount(c.paths, c.W, c.H, c.plan, c.mirrors) ?? -1 }),
  fewest: (c, budget) => { const f = L.fewestPlayerTaps(c.paths, c.W, c.H, c.plan, budget, c.mirrors);
    return f ? { ret: 1, out: [f.count, f.exact ? 1 : 0, f.nodes, ...list(f.taps)] } : { ret: 0, out: [] }; },
  replay: c => {
    const out = [];
    for (let k = 0; k <= c.plan.length; k++) {
      const r = L.replay(c.paths, c.W, c.H, c.plan.slice(0, k), c.mirrors);
      out.push(r.solved ? 1 : 0, r.taps, ...list(r.events.map(e => e === 'exit' ? 0 : 2)), hashWords(pathWords(r.paths)));
      if (k === c.plan.length) out.push(...pathWords(r.paths));
    }
    return { out };
  },
  postpone: c => { const p = L.postponeExits(c.paths, c.W, c.H, c.plan, c.mirrors); return p ? { ret: 1, out: [p.count, ...list(p.taps)] } : { ret: 0, out: [] }; },
  casual: (c, games, seed) => { const rng = R.mulberry32(seed >>> 0), before = R.draws(); const v = L.casualWins(c.paths, c.W, c.H, rng, games, c.mirrors); return { ret: v, draws: R.draws() - before }; },
  rays: c => {
    const out = [];
    for (const p of c.paths) {
      if (!p) { out.push(-1); continue; }
      out.push(L.selfBlocked(p, c.W, c.H, c.mirrors) ? 1 : 0);
      const h = p[p.length - 1], d = exitDir(p, c.W, c.mirrors);
      const ahead = [], a = L.rayCells(h.x, h.y, d[0], d[1], c.W, c.H, c.mirrors, ahead);
      out.push(a ? 1 : 0, ...list(ahead));
      const track = p.map(q => q.y * c.W + q.x), t = L.rayCells(h.x, h.y, d[0], d[1], c.W, c.H, c.mirrors, track);
      out.push(t ? 1 : 0, ...list(track));
    }
    return { out };
  },
};

// knotsFor of grid-generator.js at 9e69e3a.
const knotsFor = d => L.knotsWanted(300 * Math.pow(Math.max(0, d) / 100, 1.3));

// knotsWanted, knotsFor and the styles: the parts of the generator weave_run's caller uses.
function checkChoices(port, only) {
  let n = 0;
  if (!only || only === 'knots') {
    for (let k = 0; k <= 40000; k++) { const d = k / 100; same('knots', `knotsWanted(${d})`, L.knotsWanted(d), port.x.t_knots_wanted(d)); n++; }
    for (let k = -500; k <= 10500; k++) { const d = k / 100; same('knots', `knotsFor(${d})`, knotsFor(d), port.x.t_knots_for(d)); n++; }
  }
  if (!only || only === 'styles') {
    for (let k = 0; k < 3; k++) for (let w = 1; w <= 60; w++) {
      port.x.t_style(k, w);
      const st = L.STYLES[k];
      same('styles', `STYLES[${k}] (${st.name}), w ${w}`, [k, st.minLen, st.lenLo, st.name === 'twisty' ? 1 : 0, st.lenHi(w), st.straight], [...port.out(), port.outf(0)]); n++;
    }
  }
  return n;
}

// The hooks of test/g2.wasm, by kind: how to call each and read what it gives.
const CALL = {
  tracks: x => x.t_tracks(), free: x => x.t_free(), frozen: x => x.t_frozen(), dead: x => x.t_dead(),
  solve: (x, budget) => x.t_solve(budget), taps: x => x.t_player_taps(), fewest: (x, budget) => x.t_fewest(budget),
  replay: x => x.t_replay(), postpone: x => x.t_postpone(), casual: (x, games, seed) => x.t_casual(games, seed), rays: x => x.t_rays(),
};
const RETURNS = new Set(['tracks', 'free', 'taps', 'fewest', 'postpone', 'casual']);
const WRITES = new Set(['tracks', 'frozen', 'dead', 'solve', 'fewest', 'replay', 'postpone', 'rays']);
function call(port, kind, ...a) {
  const ret = CALL[kind](port.x, ...a);
  const got = {};
  if (RETURNS.has(kind)) got.ret = ret;
  if (WRITES.has(kind)) got.out = port.out();
  if (kind === 'casual') got.draws = port.x.draws();
  return got;
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
  const hooks = { draws: () => draws, stack_peak: () => 0, t_knots_wanted: L.knotsWanted, t_knots_for: knotsFor,
    t_style: (k, w) => { io.clear(); const st = L.STYLES[k]; if (!st) return; io.put(k, st.minLen, st.lenLo, st.name === 'twisty' ? 1 : 0, st.lenHi(w)); io.putf(0, st.straight); } };
  for (const kind of Object.keys(CALL)) hooks[CALL[kind].toString().match(/x\.(t_\w+)/)[1]] = hook(kind);
  return hooks;
}

// --- the cases ---

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
  let boards = (EXTRA ? extraBoards() : R.boards()).filter(b => b.grid === 'square' && !b.springs.length);
  if (ONLY) boards = boards.filter(b => ONLY.split(',').includes(b.name.split(' ')[0]));
  for (const b of boards) {
    const ps = EXTRA ? sample(R.positions(b)) : R.positions(b);
    const mirrors = new Map(b.mirrors.map(m => [m.cell.r * b.W + m.cell.q, m.slope]));
    ps.forEach((p, k) => {
      let plan;
      if (!p.from.startsWith('random')) plan = b.plan.slice(p.taps.length);
      else {
        const s = L.solve(p.paths.map(q => q && q.map(c => ({ x: c.q, y: c.r }))), b.W, b.H, 2000, b.plan, mirrors);
        plan = s.solved ? s.moves : b.plan.slice();
      }
      out.push({ b, p, plan, k, name: `${b.name} ${p.from}` });
    });
  }
  return out;
}

// What to call on each position: [kind, label, args].
const STEPS = [['tracks', '', []], ['free', '', []], ['frozen', '', []], ['dead', '', []],
  ['solve', ' budget 40', [40]], ['solve', ' budget 900', [900]], ['solve', ' budget 2000', [2000]], ['solve', ' budget 2000, no prefer', [2000], 'none'],
  ['taps', '', []], ['fewest', ' budget 2500', [2500]], ['replay', '', []], ['postpone', '', []],
  ['casual', EXTRA ? ' x200' : ' x1000', [EXTRA ? 200 : 1000, BENCH_SEED | 0]], ['rays', '', []]];
const KINDS = [...new Set(STEPS.map(s => s[0])), 'knots', 'styles'];

let peak = { bytes: 0, where: '' }, values = 0;
const size = w => (w.out ? w.out.length : 0) + (w.ret !== undefined ? 1 : 0) + (w.draws !== undefined ? 1 : 0);
function run(port, list, only) {
  const counts = {}; let n = 0;
  for (const c of list) {
    const words = R.position(c.b, c.p.paths, c.plan), noPrefer = R.position(c.b, c.p.paths, []);
    const cx = context(c.b, c.p.paths, c.plan), cxNone = context(c.b, c.p.paths, []);
    let tracked = true;
    for (const [kind, label, a, prefer] of STEPS) {
      if (only && kind !== only) continue;
      if (!tracked) break;
      port.push(prefer === 'none' ? noPrefer : words);
      const want = WANT[kind](prefer === 'none' ? cxNone : cx, ...a);
      const got = call(port, kind, ...a);
      same(kind, `${c.name}: ${kind}${label}`, want, got);
      values += size(want);
      const p = port.x.stack_peak();
      if (p > peak.bytes) peak = { bytes: p, where: `${c.name}: ${kind}${label}` };
      if (kind === 'tracks' && want.ret === 0) tracked = false;  // the rest would throw in the JS, and trap
      counts[kind] = (counts[kind] || 0) + 1; n++;
    }
  }
  return { n, counts };
}

function weave(wasm) {
  const script = path.join(__dirname, '../../builder/check-weave.cjs');
  try { const out = execFileSync('node', [script, wasm], { encoding: 'utf8', timeout: 900000 }); return { ok: true, text: out }; }
  catch (e) { return { ok: false, text: (e.stdout || '') + (e.stderr || '') }; }
}

if (require.main === module && CONTROLS) {
  const port = W.load(WASM);
  const all = cases(), part = all.filter((_, i) => i % 25 === 0);
  let bad = 0;
  for (const kind of KINDS) {
    failures = []; for (const k in seen) delete seen[k];
    corrupt = { kind, at: 3 };
    if (kind === 'knots' || kind === 'styles') checkChoices(port, kind); else run(port, part, kind);
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
  console.log(`${failures.length ? 'FAIL' : 'ok  '} square kernel: ${list.length} positions on ${boards} boards, ${n} comparisons of ${values} values (${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}), ${failures.length} failed (${((Date.now() - t1) / 1000).toFixed(1)} s; cases ${((t1 - t0) / 1000).toFixed(1)} s)`);
  const before = failures.length, tc = Date.now(), nc = checkChoices(port);
  console.log(`${failures.length > before ? 'FAIL' : 'ok  '} knots and styles: ${nc} comparisons, ${failures.length - before} failed (${Date.now() - tc} ms)`);
  for (const f of failures.slice(0, 12)) console.log(`  ${f.kind}: ${f.name}\n    want ${JSON.stringify(f.want)?.slice(0, 400)}\n    got  ${JSON.stringify(f.got)?.slice(0, 400)}`);
  let weaveOk = true;
  if (!JS && !args.includes('--no-weave')) {
    const w = weave(WASM);
    weaveOk = w.ok;
    const lines = w.text.trim().split('\n');
    const result = lines.find(l => / cases \(/.test(l)) || lines.slice(-3).join(' | ');
    console.log(`${w.ok ? 'ok  ' : 'FAIL'} weave on ${path.basename(WASM)} (check-weave.cjs): ${result}`);
  }
  console.log(`${port.name}: ${failures.length || !weaveOk ? 'FAILED' : 'all passed'} in ${((Date.now() - t0) / 1000).toFixed(1)} s` + (JS ? ' (--js: the JS against itself)' : `; stack peak ${peak.bytes} bytes (${peak.where}); no imports`));
  process.exit(failures.length || !weaveOk ? 1 : 0);
}

module.exports = { WANT, CALL, context, cases, run, same, failures: () => failures };
