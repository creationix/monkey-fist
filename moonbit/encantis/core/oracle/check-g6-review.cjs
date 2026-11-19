// G6's review: check-g6's battery on 361 boards it never saw, and on plans that are not solutions.
//
//   node moonbit/encantis/core/oracle/check-g6-review.cjs [test/g6.wasm]          the port against the cache
//   node moonbit/encantis/core/oracle/check-g6-review.cjs --fill [--part 0/3]     the JS's answers into the cache
//   node moonbit/encantis/core/oracle/check-g6-review.cjs --controls              one spoiled value per kind must fail
//   options: --sets g1,g2,g3,g5 (default g2,g3,g5), --only <set>#<line>,...
//
// The boards (each with its plan, made by the JS game at 9e69e3a; check-g6 saw none of them whole):
//   g2  fixtures/g2-review-boards.jsonl  131 square boards of random codes (71 with spinners)
//   g3  fixtures/g3-review-boards.jsonl  160 Hex boards to 48x48 (224 ropes), no spinners
//   g5  fixtures/g5-review-boards.jsonl   70 boards with spinners, both grids, 8x8 to 48x48
//   g1  fixtures/g1-extra-boards.jsonl    79 (check-g6 --extra runs them; here only with --sets g1)
//
// On each board:
//   own      the board's plan and par: coverage, valid, regional, trivial, featuresUsed, featureStats
//            (manual par, 0, all), slideStats, postpone, score and score with skip, casualRate at a new
//            seed (hashString('review-g6/' + name)): x100 and x1000 without spinners, x32 with spinners
//            and at most 60 ropes, x10 past 60, x4 past 150; casualRate with 0, 1 and -2 games;
//            Q.analyze (manual par, all)
//   seq      a random legal sequence of taps from the start (each tap uniform among the legal ones,
//            drawn from a mulberry32 seeded by the board's name; at most min(3n, 90) taps, ending
//            early when the board is clear or nothing is legal): not a solution, so the relations,
//            revisits and mutual waits differ from a plan's. Q.analyze (manual all, half, -1),
//            featureStats (manual half), slideStats (par half), featuresUsed, postpone, score with skip
//   derived  the board of the ropes left after half the plan, with the rest of the plan: the own
//            battery (casual x32 or x10 at the same seed; no score with skip)
//   mutated  check-g6's five broken copies: valid, coverage, regional
//   junk     the plan with a tap of no rope (-1, n, n + 7) after its first quarter: Q.analyze (all),
//            featureStats (all), featuresUsed, slideStats (par all), postpone, score with skip
// The sequences and the JS's answers are kept in CACHE (one file per board).
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const R = require('./ref.cjs'), W = require('./wasm.cjs');
const C6 = require('./check-g6.cjs');

const args = process.argv.slice(2);
const VALUED = ['--sets', '--only', '--part'];
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const WASM = args.find((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1])) || path.join(__dirname, '../test/g6.wasm');
const SETS = opt('--sets', 'g2,g3,g5').split(','), ONLY = opt('--only', null);
const FILL = args.includes('--fill'), CONTROLS = args.includes('--controls');
const PART = opt('--part', '0/1').split('/').map(Number);
const CACHE = process.env.G6R_CACHE || '/home/user/mf-core-scratch/review-g6/cache';
const FILES = { g1: 'g1-extra-boards.jsonl', g2: 'g2-review-boards.jsonl', g3: 'g3-review-boards.jsonl', g5: 'g5-review-boards.jsonl' };
const { G, L } = R.js();
const { SHAPE, JSCALL } = C6;

function boards() {
  const out = [];
  for (const set of SETS) {
    const f = path.join(__dirname, 'fixtures', FILES[set]);
    fs.readFileSync(f, 'utf8').trim().split('\n').forEach((l, k) => {
      const j = JSON.parse(l);
      out.push({ ...R.jsBoard(j), name: `${set}#${k + 1}`, code: j.code, index: j.index });
    });
  }
  return ONLY ? out.filter(b => ONLY.split(',').includes(b.name)) : out;
}

// --- The cache: the sequence and the JS's answers, per board ---

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

// A random legal sequence of taps from the start of b.
function sequence(b) {
  const e = cacheOf(b);
  if (e.want.seq) return e.want.seq;
  const r = R.mulberry32(L.hashString('review-g6/seq/' + b.name));
  const n = b.ropes.length, seq = [];
  let paths = b.ropes;
  for (let k = 0; k < Math.min(3 * n, 90); k++) {
    const legal = [];
    for (let i = 0; i < n; i++) if (paths[i] && G.tap(b, paths, i)) legal.push(i);
    if (!legal.length) break;
    const i = legal[Math.floor(r() * legal.length)];
    seq.push(i);
    paths = G.tap(b, paths, i).paths;
    if (paths.every(p => !p)) break;
  }
  e.want.seq = seq; e.dirty = true;
  return seq;
}

// The board of the ropes left after the first k taps of b's plan, with the rest of the plan (check-g6's derived).
function derived(b, k) {
  let paths = b.ropes;
  for (const i of b.plan.slice(0, k)) { const m = G.tap(b, paths, i); if (!m) return null; paths = m.paths; }
  const keep = [], number = new Map();
  paths.forEach((p, i) => { if (p) { number.set(i, keep.length); keep.push(p); } });
  if (keep.length < 2) return null;
  const nb = { grid: b.grid, W: b.W, H: b.H, ropes: keep, mirrors: b.mirrors, springs: b.springs, plan: b.plan.slice(k).map(i => number.get(i)) };
  return nb.plan.some(i => i === undefined) ? null : nb;
}
// check-g6's five broken copies.
function mutated(b) {
  const out = [], copy = () => ({ ...b, ropes: b.ropes.map(p => p.map(c => ({ ...c }))) });
  const longest = b.ropes.reduce((a, p, i) => p.length > b.ropes[a].length ? i : a, 0);
  let m = copy(); if (m.ropes[longest].length >= 3) { m.ropes[longest].splice(1, 1); out.push(['gap', m]); }
  m = copy(); m.ropes[1][m.ropes[1].length - 1] = { ...m.ropes[0][0] }; out.push(['on another rope', m]);
  m = copy(); m.ropes[0] = m.ropes[0].slice(0, 1); out.push(['one cell', m]);
  m = copy(); m.ropes[0][0] = { q: b.W, r: 0 }; out.push(['off the board', m]);
  const feature = (b.mirrors || []).length ? b.mirrors[0].cell : (b.springs || [])[0];
  if (feature) { m = copy(); m.ropes[0][0] = { ...feature }; out.push(['on a feature', m]); }
  return out;
}

// --- The steps ---

const half = x => Math.floor(x / 2);
function casualSteps(b, state, derivedBoard) {
  const n = b.ropes.length, out = [];
  if (!b.springs.length) { out.push(['casual', ' x100', [100, state]]); if (!derivedBoard) out.push(['casual', ' x1000', [1000, state]]); }
  else out.push(['casual', n > 150 ? ' x4' : n > 60 ? ' x10' : ' x32', [n > 150 ? 4 : n > 60 ? 10 : 32, state]]);
  return out;
}
function ownSteps(c, state, derivedBoard) {
  return [['coverage', '', []], ['valid', '', []], ['regional', '', []], ['trivial', '', []], ['featuresUsed', '', []],
    ['featureStats', ' manual par', [c.par]], ['featureStats', ' manual 0', [0]], ['featureStats', ' manual all', [c.plan.length]],
    ['slideStats', '', [c.par]], ['postpone', '', []], ['score', '', [false]], ...(derivedBoard ? [] : [['score', ' skip', [true]]]),
    ...casualSteps(c.b, state, derivedBoard), ...(derivedBoard ? [] : [['casual', ' x0', [0, state]], ['casual', ' x1', [1, state]], ['casual', ' x-2', [-2, state]]]),
    ['analyze', ' manual par', [c.par]], ['analyze', ' manual all', [c.plan.length]]];
}
const seqSteps = s => [['analyze', ' manual all', [s.length]], ['analyze', ' manual half', [half(s.length)]], ['analyze', ' manual -1', [-1]],
  ['featureStats', ' manual half', [half(s.length)]], ['slideStats', ' par half', [half(s.length)]], ['featuresUsed', '', []], ['postpone', '', []], ['score', ' skip', [true]]];

function cases() {
  const out = [];
  for (const b of boards()) {
    const state = L.hashString('review-g6/' + b.name) >>> 0;
    const own = { b, orig: b, plan: b.plan.slice(), par: b.par, board: b.name, part: 'own' };
    for (const s of ownSteps(own, state, false)) out.push({ ...own, step: s });
    const seq = sequence(b), sq = { b, orig: b, plan: seq, board: b.name, part: 'seq' };
    for (const s of seqSteps(seq)) out.push({ ...sq, step: s });
    const nb = derived(b, half(b.plan.length));
    if (nb) {
      const d = { b: nb, orig: b, plan: nb.plan, par: G.replay(nb, nb.plan).taps, board: b.name, part: 'derived' };
      for (const s of ownSteps(d, state, true)) out.push({ ...d, step: s });
    }
    const q = Math.floor(b.plan.length / 4), n = b.ropes.length;
    for (const j of [-1, n, n + 7]) {
      const plan = [...b.plan.slice(0, q), j, ...b.plan.slice(q)], jk = { b, orig: b, plan, board: b.name, part: `junk ${j}` };
      for (const s of [['analyze', ' manual all', [plan.length]], ['featureStats', ' manual all', [plan.length]], ['featuresUsed', '', []],
        ['slideStats', ' par all', [plan.length]], ['postpone', '', []], ['score', ' skip', [true]]]) out.push({ ...jk, step: s });
    }
    for (const [what, mb] of mutated(b)) for (const s of [['valid', '', []], ['coverage', '', []], ['regional', '', []]]) out.push({ b: mb, orig: b, plan: b.plan, board: b.name, part: 'mutated ' + what, step: s });
  }
  return out;
}
const keyOf = c => `${c.part} ${c.step[0]}${c.step[1]}`;
const nameOf = c => `${c.board} (${c.b.grid} ${c.b.W}x${c.b.H}, ${c.b.ropes.length} ropes, ${c.b.springs.length} springs) ${keyOf(c)}`;

const jsMs = {};
function want(c) {
  const e = cacheOf(c.orig), key = keyOf(c);
  if (e.want[key] === undefined) {
    const t = performance.now(), before = R.draws();
    // a JS that throws (a junk tap in a kernel's replay) is matched by a port that traps
    try { const r = JSCALL[c.step[0]](c, ...c.step[2]); e.want[key] = JSON.parse(JSON.stringify(SHAPE[c.step[0]](r, R.draws() - before))); }
    catch (x) { if (!(x instanceof Error) || /check-g6-review/.test(x.message)) throw x; e.want[key] = { throws: x.message.slice(0, 80) }; }
    jsMs[c.step[0]] = (jsMs[c.step[0]] || 0) + performance.now() - t;
    e.dirty = true;
  }
  return e.want[key];
}

// --- The port's answers (check-g6's hooks) ---

const HOOK = {
  coverage: x => ({ ret: x.t_coverage() }), valid: x => ({ ret: x.t_valid() }), regional: x => ({ ret: x.t_regional() }),
  trivial: x => ({ ret: x.t_trivial() }), featuresUsed: x => ({ ret: x.t_features_used() }),
  featureStats: (x, manual) => ({ ret: x.t_feature_stats(manual), out: null }),
  slideStats: (x, par) => { x.t_slide_stats(par); return { out: null }; },
  postpone: x => { x.t_postpone(); return { out: null }; },
  score: (x, skip) => { x.t_score(skip ? 1 : 0); return { out: null, score: true }; },
  casual: (x, games, state) => ({ ret: x.t_casual(games, state | 0), draws: x.draws() }),
  analyze: (x, manual) => ({ ret: x.t_analyze(manual), out: null }),
};
function portGot(port, c, w) {
  port.push(R.position(c.b, c.b.ropes, c.plan));
  let got;
  try { got = HOOK[c.step[0]](port.x, ...c.step[2]); } catch (e) { if (!(e instanceof WebAssembly.RuntimeError)) throw e; return { trap: e.message }; }
  if (got.out === null) got.out = port.out();
  if (got.score) { const o = got.out; got = { out: [o[0], o[1], ...o.slice(3)], nodes: o[2] }; if (w.nodes === undefined) delete got.nodes; }
  return got;
}

if (FILL) {
  const t0 = Date.now(), all = boards().filter((_, i) => i % PART[1] === PART[0]);
  const names = new Set(all.map(b => b.name));
  let list = null;
  for (const b of all) {
    const t = Date.now();
    list = cases().filter(c => c.board === b.name);
    let saved = Date.now();
    for (const c of list) { want(c); if (Date.now() - saved > 60000) { flush(); saved = Date.now(); } }
    flush();
    console.log(`${b.name} (${b.grid} ${b.W}x${b.H}, ${b.ropes.length} ropes, ${b.springs.length} springs) ${((Date.now() - t) / 1000).toFixed(1)} s (total ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  console.log(`filled part ${PART.join('/')}: ${names.size} boards; ms by kind: ${Object.entries(jsMs).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', ')}`);
  process.exit(0);
}

let corrupt = null;
const seen = {}, failures = [];
const spoil = v => typeof v === 'number' ? v + 1 : Array.isArray(v) ? [...v, 99] : v && typeof v === 'object' ? { ...v, spoiled: 1 } : 'spoiled';
function same(kind, name, w, got) {
  const k = seen[kind] = (seen[kind] || 0) + 1;
  if (corrupt && corrupt.kind === kind && corrupt.at === k) w = spoil(w);
  if (w.throws !== undefined && !(corrupt && corrupt.kind === kind && corrupt.at === k)) { throwsSeen.n++; if (got.trap) return; }
  if (JSON.stringify(w) !== JSON.stringify(got)) failures.push({ kind, name, want: w, got });
}
const throwsSeen = { n: 0 };
function run(port, list, only) {
  let n = 0, values = 0, peak = { bytes: 0, where: '' }, last = null;
  const counts = {};
  for (const c of list) {
    if (only && c.step[0] !== only) continue;
    if (last && last !== c.board) flush();
    last = c.board;
    const w = want(c);
    same(c.step[0], nameOf(c), w, portGot(port, c, w));
    values += w.throws ? 1 : (w.out ? w.out.length : 0) + (w.ret !== undefined ? 1 : 0) + (w.draws !== undefined ? 1 : 0) + (w.nodes !== undefined ? 1 : 0);
    const p = port.x.stack_peak(); if (p > peak.bytes) peak = { bytes: p, where: nameOf(c) };
    const k = `${c.part.split(' ')[0]} ${c.step[0]}`; counts[k] = (counts[k] || 0) + 1; n++;
  }
  flush();
  return { n, values, counts, peak };
}

if (CONTROLS) {
  const port = W.load(WASM), list = cases();
  let bad = 0;
  for (const kind of Object.keys(SHAPE)) {
    failures.length = 0; for (const k in seen) delete seen[k];
    corrupt = { kind, at: 3 };
    run(port, list, kind);
    const ok = failures.length === 1 && failures[0].kind === kind;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} control ${kind}: ${failures.length} failure(s)${failures[0] ? ', named: ' + failures[0].name : ''}`);
  }
  console.log(bad ? `${bad} control(s) did not fail as they should` : 'every control failed, and named its case');
  process.exit(bad ? 1 : 0);
}

const port = W.load(WASM), t0 = Date.now(), list = cases(), t1 = Date.now();
const { n, values, counts, peak } = run(port, list);
const bs = [...new Set(list.map(c => c.board))], springs = new Set(list.filter(c => c.b.springs.length).map(c => c.board)).size;
const byPart = {};
for (const [k, v] of Object.entries(counts)) { const p = k.split(' ')[0]; byPart[p] = (byPart[p] || 0) + v; }
console.log(`${failures.length ? 'FAIL' : 'ok  '} G6 review: ${bs.length} boards (${springs} with spinners; sets ${SETS.join(',')}), ${n} comparisons of ${values} values (${Object.entries(byPart).map(([k, v]) => `${k} ${v}`).join(', ')}), ${failures.length} failed (${((Date.now() - t1) / 1000).toFixed(1)} s; cases ${((t1 - t0) / 1000).toFixed(1)} s)`);
console.log(`  the JS threw ${throwsSeen.n} times (each matched by a trap of the port, or failed)`);
console.log(`  by kind: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}`);
if (Object.keys(jsMs).length) console.log(`  the JS's answers computed this run (ms): ${Object.entries(jsMs).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', ')}`);
const byKind = {};
for (const f of failures) byKind[f.kind] = (byKind[f.kind] || 0) + 1;
if (failures.length) console.log(`  failures by kind: ${JSON.stringify(byKind)}; traps: ${failures.filter(f => f.got.trap).length}`);
for (const f of failures.slice(0, 12)) console.log(`  ${f.kind}: ${f.name}\n    want ${JSON.stringify(f.want)?.slice(0, 300)}\n    got  ${JSON.stringify(f.got)?.slice(0, 300)}`);
console.log(`${WASM}: ${failures.length ? 'FAILED' : 'all passed'}; stack peak ${peak.bytes} bytes (${peak.where})`);
process.exit(failures.length ? 1 : 0);
