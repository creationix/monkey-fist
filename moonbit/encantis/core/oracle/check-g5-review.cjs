// G5's review: check-g5's battery on 440 boards it never saw, at the budgets the game itself uses.
//
//   node moonbit/encantis/core/oracle/check-g5-review.cjs [test/g5.wasm]   the port against the cache
//   node moonbit/encantis/core/oracle/check-g5-review.cjs --fill [--part 0/3]   the JS's answers into the cache
//   node moonbit/encantis/core/oracle/check-g5-review.cjs --controls       one spoiled value per kind must fail
//   options: --sets g1,g2,g3,g5 (the fixtures below), --only <set>#<line>,..., --kinds taps,auto
//
// The boards (each with its plan, made by the JS game at 9e69e3a):
//   g1  fixtures/g1-extra-boards.jsonl    79: 4x4, 8x8 with mechanics, strips, 48x48 colossal square
//                                           and Hex with spinners (216 and 207 ropes), 60 random codes
//   g2  fixtures/g2-review-boards.jsonl  131 square boards of random codes (71 with spinners)
//   g3  fixtures/g3-review-boards.jsonl  160 Hex boards to 48x48 (224 ropes), no spinners
//   g5  fixtures/g5-review-boards.jsonl   70 boards with spinners, both grids: 8x8, strips, 24x24,
//                                           32x32 and 48x48/48x40 colossal, difficulty 1 to 100, and 40
//                                           random codes (gen-g5-review-boards.cjs)
// The positions are R.positions(b) (the start, each prefix of the plan, 20 of random play); on boards
// of more than 40 ropes a sample (the start, every 3rd; past 100 ropes every 8th prefix and every
// 10th random one).
//
// The steps: every step of check-g5 (taps, direction, allFree routed and full, frozen, solve 40, 900,
// 4000 and 900 with no prefer, the full solve 900, replay and replay without the first move, guide
// 40 and 900, reachableFeatures 500 and 10000), plus what the game calls that check-g5 does not:
//   auto      G.guide(b, paths, 5000, []): the auto-solve (app.js seekPlan([], 5000)), at the start
//             and every 10th position (past 40 ropes, the start and one more)
//   minimum   G.minimumTaps(b, b.plan, 1200) from the start on boards of at most 12 ropes (the
//             generator's call), and at 5000 on boards of at most 40
// The JS's answers are kept in CACHE (one file per board); the port's stack peak is reported.
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const R = require('./ref.cjs'), W = require('./wasm.cjs');
const C5 = require('./check-g5.cjs');

const args = process.argv.slice(2);
const VALUED = ['--sets', '--only', '--kinds', '--part'];
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const WASM = args.find((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1])) || path.join(__dirname, '../test/g5.wasm');
const SETS = opt('--sets', 'g1,g2,g3,g5').split(','), ONLY = opt('--only', null), KINDS = opt('--kinds', null);
const FILL = args.includes('--fill'), CONTROLS = args.includes('--controls');
const PART = opt('--part', '0/1').split('/').map(Number);
const CACHE = process.env.G5R_CACHE || '/home/user/mf-core-scratch/review-g5/cache';
const FILES = { g1: 'g1-extra-boards.jsonl', g2: 'g2-review-boards.jsonl', g3: 'g3-review-boards.jsonl', g5: 'g5-review-boards.jsonl' };
const { G } = R.js();

function boards() {
  const out = [];
  for (const set of SETS) {
    const f = path.join(__dirname, 'fixtures', FILES[set]);
    if (!fs.existsSync(f)) { console.log(`(no ${f})`); continue; }
    fs.readFileSync(f, 'utf8').trim().split('\n').forEach((l, k) => {
      const j = JSON.parse(l);
      out.push({ ...R.jsBoard(j), name: `${set}#${k + 1}`, code: j.code, index: j.index });
    });
  }
  return ONLY ? out.filter(b => ONLY.split(',').includes(b.name)) : out;
}

function sample(b, ps) {
  const n = b.ropes.length;
  if (n <= 40) return ps;
  if (n <= 100) return ps.filter((p, i) => i === 0 || i % 3 === 0);
  const plan = ps.filter(p => !p.from.startsWith('random')), random = ps.filter(p => p.from.startsWith('random'));
  return [...plan.filter((_, i) => i % 8 === 0), ...random.filter((_, i) => i % 10 === 0)];
}

const BASE = [['taps', '', []], ['direction', '', []], ['free', '', []], ['freefull', '', []], ['frozen', '', []],
  ['solve', ' budget 40', [40]], ['solve', ' budget 900', [900]], ['solve', ' budget 4000', [4000]], ['solve', ' budget 900, no prefer', [900, true], 'none'],
  ['solvefull', ' budget 900', [900]], ['replay', '', [false]], ['replay', ' (first move left out)', [true], 'drop'],
  ['guide', ' budget 40', [40]], ['guide', ' budget 900', [900]], ['features', ' budget 500', [500]], ['features', ' budget 10000', [10000]]];
const AUTO = ['auto', ' guide 5000, no prefer', [5000], 'none'];
function stepsOf(c, i) {
  const n = c.b.ropes.length, out = [];
  if (c.start) {
    if (n <= 12) out.push(['minimum', ' budget 1200', [1200], 'board']);
    if (n <= 40) out.push(['minimum', ' budget 5000', [5000], 'board']);
  }
  out.push(...BASE);
  if (c.start || (n <= 40 ? i % 10 === 0 : i === 1)) out.push(AUTO);
  return out.filter(s => !KINDS || KINDS.split(',').includes(s[0]));
}

function cases() {
  const out = [];
  for (const b of boards()) {
    const ps = sample(b, R.positions(b).map((p, k) => ({ ...p, k })));
    ps.forEach((p, i) => {
      const plan = p.from.startsWith('random') ? b.plan.slice() : b.plan.slice(p.taps.length);
      out.push({ b, paths: p.paths, plan, k: p.k, i, start: p.from === 'start', name: `${b.name} (${b.code} #${b.index}, ${b.grid} ${b.W}x${b.H}, ${b.ropes.length} ropes, ${b.springs.length} springs) ${p.from}` });
    });
  }
  return out;
}

// What the JS gives, and the hook, by kind: check-g5's, and auto (G.guide with no preferred order).
const WANT = { ...C5.WANT, auto: (c, budget) => C5.WANT.guide(c, budget) };
const CALL = { ...C5.CALL, auto: (x, budget) => x.t_guide(budget) };
const RETURNS = new Set(['free', 'freefull', 'tracked', 'minimum']);
const planOf = (c, s) => s[3] === 'none' ? [] : s[3] === 'drop' ? c.plan.slice(1) : s[3] === 'board' ? c.b.plan : c.plan;
// (check-g5's replay takes the whole plan and leaves out its first move itself)
const ctxFor = (c, s) => ({ b: { ...c.b, plan: [] }, paths: c.paths, plan: s[3] === 'drop' ? c.plan : planOf(c, s) });

// The cache.
const file = b => path.join(CACHE, `${R.REFERENCE}-${b.name.replace('#', '-')}.json.gz`);
const caches = new Map();
const cacheOf = b => {
  if (!caches.has(b.name)) caches.set(b.name, { b, dirty: false, want: fs.existsSync(file(b)) ? JSON.parse(zlib.gunzipSync(fs.readFileSync(file(b)))) : {} });
  return caches.get(b.name);
};
function flush() {
  fs.mkdirSync(CACHE, { recursive: true });
  for (const e of caches.values()) if (e.dirty) { fs.writeFileSync(file(e.b), zlib.gzipSync(JSON.stringify(e.want))); e.dirty = false; }
}
const jsMs = {};
function want(c, s) {
  const e = cacheOf(c.b), key = `${c.k} ${s[0]}${s[1]}`;
  if (e.want[key] === undefined) {
    const t = performance.now();
    if (s[0] === 'solve' && s[2][1]) e.want[key] = WANT.solve(ctxFor(c, s), s[2][0], true);
    else e.want[key] = WANT[s[0]](ctxFor(c, s), ...(s[0] === 'replay' ? s[2] : s[2].slice(0, 1)));
    jsMs[s[0]] = (jsMs[s[0]] || 0) + performance.now() - t;
    e.dirty = true;
  }
  return e.want[key];
}

if (FILL) {
  const all = cases(), t0 = Date.now();
  const names = [...new Set(all.map(c => c.b.name))].filter((_, i) => i % PART[1] === PART[0]);
  for (const name of names) {
    const t = Date.now();
    for (const c of all.filter(c => c.b.name === name)) stepsOf(c, c.i).forEach(s => want(c, s));
    flush();
    console.log(`${name} ${((Date.now() - t) / 1000).toFixed(1)} s (total ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  console.log(`filled part ${PART.join('/')}: ${names.length} boards; ms by kind: ${Object.entries(jsMs).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', ')}`);
  process.exit(0);
}

let corrupt = null;
const seen = {}, failures = [];
const spoil = v => typeof v === 'number' ? v + 1 : Array.isArray(v) ? [...v, 99] : { ...v, spoiled: 1 };
function same(kind, name, w, got) {
  const k = seen[kind] = (seen[kind] || 0) + 1;
  if (corrupt && corrupt.kind === kind && corrupt.at === k) w = spoil(w);
  if (JSON.stringify(w) !== JSON.stringify(got)) failures.push({ kind, name, want: w, got });
}

function run(port, list, only) {
  let n = 0, values = 0, peak = { bytes: 0, where: '' };
  const counts = {}, last = { name: null };
  for (const c of list) {
    if (last.name && last.name !== c.b.name) flush();
    last.name = c.b.name;
    for (const s of stepsOf(c, c.i)) {
      if (only && s[0] !== only) continue;
      const w = want(c, s);
      port.push(R.position(c.b, c.paths, planOf(c, s)));
      let got = {};
      try {
        const ret = CALL[s[0]](port.x, ...(s[0] === 'replay' ? [] : s[2].slice(0, 1)));
        if (RETURNS.has(s[0])) got.ret = ret;
        if (s[0] !== 'free' && s[0] !== 'freefull' && s[0] !== 'tracked') got.out = port.out();
      } catch (e) { if (!(e instanceof WebAssembly.RuntimeError)) throw e; got = { trap: e.message }; }
      same(s[0], `${c.name}: ${s[0]}${s[1]}`, w, got);
      values += (w.out ? w.out.length : 0) + (w.ret !== undefined ? 1 : 0);
      const p = port.x.stack_peak();
      if (p > peak.bytes) peak = { bytes: p, where: `${c.name}: ${s[0]}${s[1]}` };
      counts[s[0]] = (counts[s[0]] || 0) + 1; n++;
    }
  }
  flush();
  return { n, values, counts, peak };
}

if (CONTROLS) {
  const port = W.load(WASM), all = cases(), part = all.filter((c, i) => c.start || i % 40 === 0);
  let bad = 0;
  for (const kind of [...Object.keys(WANT)].filter(k => k !== 'tracked')) {
    failures.length = 0; for (const k in seen) delete seen[k];
    corrupt = { kind, at: 3 };
    run(port, part, kind);
    const ok = failures.length === 1 && failures[0].kind === kind;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} control ${kind}: ${failures.length} failure(s)${failures[0] ? ', named: ' + failures[0].name : ''}`);
  }
  console.log(bad ? `${bad} control(s) did not fail as they should` : 'every control failed, and named its case');
  process.exit(bad ? 1 : 0);
}

const port = W.load(WASM), t0 = Date.now(), list = cases(), t1 = Date.now();
const { n, values, counts, peak } = run(port, list);
const nb = new Set(list.map(c => c.b.name)).size, springs = new Set(list.filter(c => c.b.springs.length).map(c => c.b.name)).size;
console.log(`${failures.length ? 'FAIL' : 'ok  '} G5 review: ${list.length} positions on ${nb} boards (${springs} with spinners; sets ${SETS.join(',')}), ${n} comparisons of ${values} values (${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}), ${failures.length} failed (${((Date.now() - t1) / 1000).toFixed(1)} s; cases ${((t1 - t0) / 1000).toFixed(1)} s)`);
if (Object.keys(jsMs).length) console.log(`  the JS's answers computed this run (ms): ${Object.entries(jsMs).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', ')}`);
const byKind = {};
for (const f of failures) byKind[f.kind] = (byKind[f.kind] || 0) + 1;
if (failures.length) console.log(`  failures by kind: ${JSON.stringify(byKind)}; traps: ${failures.filter(f => f.got.trap).length}`);
for (const f of failures.slice(0, 12)) console.log(`  ${f.kind}: ${f.name}\n    want ${JSON.stringify(f.want)?.slice(0, 300)}\n    got  ${JSON.stringify(f.got)?.slice(0, 300)}`);
console.log(`${WASM}: ${failures.length ? 'FAILED' : 'all passed'}; stack peak ${peak.bytes} bytes (${peak.where})`);
process.exit(failures.length ? 1 : 0);
