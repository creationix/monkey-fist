// G3's review oracle: the Hex offset kernel of test/g3.wasm against hex/engine.js at 9e69e3a,
// with the calls the game and the generator make that check-g3.cjs and check-g3-wide.cjs do not,
// on more boards (Hex levels the JS generator made from 100+ codes).
//
//   node moonbit/encantis/core/oracle/check-g3-review.cjs [test/g3.wasm]
//   options: --js (the positive control), --controls (the negative controls), --set ref,extra,gen
//            (default all three), --frac F (a share of the positions), --max-ropes N
//
// Boards:
//   ref    the 33 Hex boards of reference.json without springs (check-g3's)
//   extra  the 21 Hex boards without springs of fixtures/g1-extra-boards.jsonl (check-g3 --extra's)
//   gen    fixtures/g3-review-boards.jsonl: Hex levels without springs from the JS generator at
//          9e69e3a (game-engine.js generate of a code), none of them in reference.json or in
//          g1-extra: 48x48 colossal at difficulty 1 and 100 with and without mirrors (the most
//          ropes a code gives), 4x4, 8x8, 4x30, 30x4, 8x48, 48x8, Hex levels of mixed codes, and
//          random codes from a fixed seed (made by the G3 review's gen-hex.cjs; the Hex boards
//          without springs of G2's review's 300 codes are added)
// Positions on each board: the start, prefixes of its plan evenly spread (at most 8), and 4 of
// random play (check-g3 --extra's sample of R.positions(b)), each with check-g3's plan.
//
// Calls (C is a call no other G3 oracle makes; the rest are check-g3's, made here on the gen set):
//   solve 5000   C  solve(level, paths, 5000, plan) and with no preferred order: the auto-solve
//                   budget of app.js (seekPlan([], 5000)) and of MoonBit's game.mbt
//   par          C  the generator's score(): postponeExits(level, plan), then
//                   fewestPlayerTaps(level, its plan, or the plan where it is null, 2500): the
//                   postponed plan and taps, then par, exact, nodes and plan (bench_par's whole
//                   output, on every position)
//   fewest       C  fewestPlayerTaps(level, plan, 30) and (…, 300): budgets that run out on real
//                   boards (check-g3's 2500 and 6000 seldom do)
//   casual x32   C  casualWins(level, mulberry32(hashString('casual/' + seed + '/' + attempt)), 32)
//                   for attempts 0, 1 and 2: the generator's games and seeds (check-g3 uses one
//                   seed, 'bench')
//   gen set only: compile, rays, turning, solve 40, 900, 2000 and 2000 with no prefer, replay,
//                   postpone, casual x200 ('bench'), fewest 6000 and 2500, as check-g3
// The stack peak is reported per kind, against the stack's 16 MiB.
//
// --controls spoils the 3rd comparison of each kind on a share of the positions, and requires
// exactly that comparison to fail, by name.
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs');
const G3 = require('./check-g3.cjs');
const { readPosition } = require('./check-g1.cjs');

const args = process.argv.slice(2);
const VALUED = ['--set', '--frac', '--max-ropes'];
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const JS = args.includes('--js'), CONTROLS = args.includes('--controls');
const WASM = args.find((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1])) || path.join(__dirname, '../test/g3.wasm');
const SETS = opt('--set', 'ref,extra,gen').split(','), FRAC = Number(opt('--frac', 1)), MAX_ROPES = Number(opt('--max-ropes', Infinity));
const { H, L } = R.js();
const BENCH_SEED = L.hashString('bench') | 0;
const STACK = 16777216;

// --- comparing ---

let corrupt = null;
const seen = {};
let failures = [];
const spoil = v => typeof v === 'number' ? (Number.isInteger(v) ? v + 1 : v * (1 + 2 ** -50) || 1) : Array.isArray(v) ? [...v, 99] : typeof v === 'boolean' ? !v : { ...v, spoiled: 1 };
function same(kind, name, want, got) {
  const k = seen[kind] = (seen[kind] || 0) + 1;
  if (corrupt && corrupt.kind === kind && corrupt.at === k) want = spoil(want);
  const ok = JSON.stringify(want) === JSON.stringify(got) && (typeof want !== 'object' || want === null || !('ret' in want) || Object.is(want.ret, got.ret));
  if (!ok) failures.push({ kind, name, want, got });
  return ok;
}

// --- boards and positions ---

function jsonl(file, tag) {
  return fs.readFileSync(path.join(__dirname, file), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
    .map((r, i) => ({ ...R.jsBoard(r), seed: r.code ? `${r.code}#${r.index}` : `${tag}${i + 1}`, name: `${tag}${i + 1} (${r.W}x${r.H}, ${r.ropes.length} ropes, ${r.mirrors.length} mirrors)` }));
}
function boards(set) {
  let list;
  if (set === 'ref') list = R.boards().map(b => ({ ...b, seed: b.name }));
  else if (set === 'extra') list = jsonl('fixtures/g1-extra-boards.jsonl', 'X');
  else if (set === 'gen') list = jsonl('fixtures/g3-review-boards.jsonl', 'N');
  else throw Error('no set ' + set);
  return list.filter(b => b.grid === 'hex' && !b.springs.length && b.ropes.length <= MAX_ROPES).map(b => ({ ...b, set }));
}
// check-g3 --extra's: the start, prefixes evenly spread, and 4 of random play.
function sample(ps) {
  const plan = ps.filter(p => !p.from.startsWith('random')), random = ps.filter(p => p.from.startsWith('random'));
  const step = Math.max(1, Math.ceil(plan.length / 8));
  return [...plan.filter((_, i) => i % step === 0), ...random.filter((_, i) => i % 5 === 0)];
}
function cases() {
  const out = [];
  for (const set of SETS) for (const b of boards(set)) {
    for (const p of sample(R.positions(b))) {
      let plan;
      if (!p.from.startsWith('random')) plan = b.plan.slice(p.taps.length);
      else {
        const s = H.solve(G3.context(b, p.paths, []).level, p.paths, 2000, b.plan);
        plan = s.solved ? s.moves : b.plan.slice();
      }
      out.push({ b, p, plan, name: `${b.name} ${p.from}` });
    }
  }
  return out;
}

// --- the calls ---

// What the JS gives for the generator's score() and what the port gives for the same two calls.
function wantPar(cx) {
  const p = H.postponeExits(cx.level, cx.plan);
  const start = p ? p.plan : cx.plan;
  let f;
  try { f = H.fewestPlayerTaps(cx.level, start, 2500); } catch { f = null; }
  return { postpone: p ? [1, p.taps, ...p.plan] : [0], fewest: f ? [1, f.par, f.exact ? 1 : 0, f.nodes, ...f.plan] : [0] };
}
function gotPar(port, c) {
  port.push(R.position(c.b, c.p.paths, c.plan));
  const ret = port.x.t_postpone(), o = port.out();
  const start = ret ? o.slice(2) : c.plan;
  port.push(R.position(c.b, c.p.paths, start));
  const fr = port.x.t_fewest(2500), f = port.out();
  return { postpone: ret ? [1, o[0], ...o.slice(2)] : [0], fewest: fr ? [1, f[0], f[1], f[2], ...f.slice(4)] : [0] };
}

// [kind, label, args, prefer, gen set only]
const casualSeed = (c, attempt) => L.hashString(`casual/${c.b.seed}/${attempt}`) | 0;
const STEPS = [
  ['solve', ' budget 5000', [5000]], ['solve', ' budget 5000, no prefer', [5000], 'none'],
  ['par', ' (postpone, then fewest 2500)', []],
  ['fewest', ' budget 30', [30]], ['fewest', ' budget 300', [300]],
  ['casual', ' x32 attempt 0', [32, c => casualSeed(c, 0)]], ['casual', ' x32 attempt 1', [32, c => casualSeed(c, 1)]], ['casual', ' x32 attempt 2', [32, c => casualSeed(c, 2)]],
  ['compile', '', [], null, true], ['rays', '', [], null, true], ['turning', '', [], null, true],
  ['solve', ' budget 40', [40], null, true], ['solve', ' budget 900', [900], null, true], ['solve', ' budget 2000', [2000], null, true],
  ['solve', ' budget 2000, no prefer', [2000], 'none', true],
  ['replay', '', [], null, true], ['postpone', '', [], null, true], ['casual', ' x200 (bench)', [200, BENCH_SEED], null, true],
  ['fewest', ' budget 6000', [6000], null, true], ['fewest', ' budget 2500', [2500], null, true],
];
const KINDS = [...new Set(STEPS.map(s => s[0]))];

let values = 0;
const peaks = {};
function run(port, list, only) {
  const counts = {}; let n = 0;
  for (const c of list) {
    const words = R.position(c.b, c.p.paths, c.plan), noPrefer = R.position(c.b, c.p.paths, []);
    const cx = G3.context(c.b, c.p.paths, c.plan), cxNone = G3.context(c.b, c.p.paths, []);
    let compiled = true;
    try { H.compile(cx.level, c.p.paths); } catch { compiled = false; }
    for (const [kind, label, a0, prefer, genOnly] of STEPS) {
      if (only && kind !== only) continue;
      if (genOnly && c.b.set !== 'gen') continue;
      if (!compiled && kind !== 'compile' && kind !== 'rays' && kind !== 'turning') continue;
      const a = a0.map(x => typeof x === 'function' ? x(c) : x);
      let want, got;
      if (kind === 'par') { want = wantPar(cx); got = gotPar(port, c); values += want.postpone.length + want.fewest.length; }
      else {
        port.push(prefer === 'none' ? noPrefer : words);
        want = G3.WANT[kind](prefer === 'none' ? cxNone : cx, ...a);
        const ret = G3.CALL[kind](port.x, ...a);
        got = {};
        if (['compile', 'postpone', 'casual', 'fewest'].includes(kind)) got.ret = ret;
        if (kind !== 'casual') got.out = port.out();
        if (kind === 'casual') got.draws = port.x.draws();
        values += (want.out ? want.out.length : 0) + (want.ret !== undefined ? 1 : 0) + (want.draws !== undefined ? 1 : 0);
      }
      same(kind, `${c.name}: ${kind}${label}`, want, got);
      const p = port.x.stack_peak(), key = kind + label;
      if (!peaks[key] || p > peaks[key].bytes) peaks[key] = { bytes: p, where: c.name };
      counts[kind] = (counts[kind] || 0) + 1; n++;
    }
  }
  return { n, counts };
}

// The positive control: hooks that read the same words and answer with the JS (check-g3's).
function jsPort() {
  return W.fake(io => {
    let draws = 0;
    const ctx = () => { const p = readPosition(io.input()); return G3.context(p.b, p.paths, p.prefer); };
    const hooks = { draws: () => draws, stack_peak: () => 0 };
    for (const kind of Object.keys(G3.CALL)) hooks[G3.CALL[kind].toString().match(/x\.(t_\w+)/)[1]] = (...a) => {
      io.clear();
      const w = G3.WANT[kind](ctx(), ...a);
      if (w.out) io.put(...w.out);
      if (w.draws !== undefined) draws = w.draws;
      return w.ret;
    };
    return hooks;
  });
}

if (require.main === module && CONTROLS) {
  const port = W.load(WASM);
  const part = cases().filter((_, i) => i % 20 === 0);
  let bad = 0;
  for (const kind of KINDS) {
    failures = []; for (const k in seen) delete seen[k];
    corrupt = { kind, at: 3 };
    run(port, part, kind);
    const ok = failures.length === 1 && failures[0].kind === kind;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} control ${kind}: ${failures.length} failure(s)${failures[0] ? ', named: ' + failures[0].name : ''}`);
  }
  console.log(bad ? `${bad} control(s) did not fail as they should` : 'every control failed, and named its case');
  process.exit(bad ? 1 : 0);
}

if (require.main === module) {
  const port = JS ? jsPort() : W.load(WASM);
  const t0 = Date.now();
  let list = cases();
  if (FRAC < 1) list = list.filter((_, i) => i % Math.round(1 / FRAC) === 0);
  const t1 = Date.now();
  const { n, counts } = run(port, list);
  const bySet = SETS.map(s => `${s} ${new Set(list.filter(c => c.b.set === s).map(c => c.b.name)).size} boards / ${list.filter(c => c.b.set === s).length} positions`).join(', ');
  console.log(`${failures.length ? 'FAIL' : 'ok  '} hex kernel, review: ${bySet}; ${n} comparisons of ${values} values (${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}), ${failures.length} failed (${((Date.now() - t1) / 1000).toFixed(1)} s; cases ${((t1 - t0) / 1000).toFixed(1)} s)`);
  for (const f of failures.slice(0, 12)) console.log(`  ${f.kind}: ${f.name}\n    want ${JSON.stringify(f.want)?.slice(0, 400)}\n    got  ${JSON.stringify(f.got)?.slice(0, 400)}`);
  if (!JS) {
    const top = Object.entries(peaks).sort((a, b) => b[1].bytes - a[1].bytes);
    console.log(`stack peak by call (of ${STACK} bytes): ` + top.map(([k, v]) => `${k} ${(v.bytes / 1048576).toFixed(2)} MiB (${v.where})`).join('; '));
  }
  console.log(`${port.name}: ${failures.length ? 'FAILED' : 'all passed'} in ${((Date.now() - t0) / 1000).toFixed(1)} s` + (JS ? ' (--js: the JS against itself)' : ''));
  process.exit(failures.length ? 1 : 0);
}

module.exports = { boards, cases, sample };
