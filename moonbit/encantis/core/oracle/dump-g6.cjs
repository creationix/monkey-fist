// Records the calls of G6's units that the real generator makes (grid-generator.js and
// dependency-metrics.js at 9e69e3a), candidates it rejects included, for check-g6.cjs's "calls"
// part: fixtures/g6-calls.json.gz.
//
//   node moonbit/encantis/core/oracle/dump-g6.cjs [--check]    write the fixture (--check: only
//                                                               re-run it and compare)
//
// What is recorded: every call of valid, coverage, regional, trivial, featuresUsed, featureStats,
// postpone, score, casualRate (internal functions of grid-generator.js, reached through
// capture.cjs's patched copy) and Q.analyze, while the generator makes the 135 levels of
// reference.json (120 Journey, 15 custom: their specs) and the 70 levels of
// fixtures/g5-review-boards.jsonl (spinner boards of both grids, mirrors too, to 48x48: more
// full-geometry casual play, postponement and minimumTaps).
//
// The sampling rule (fixed before looking at any port result): per function and per source, the
// calls in the order made; every call whose answer is a rejection (false or null) is kept, and of
// the others every s-th, s = ceil(count / 150) (the first call kept, then every s-th after it).
// So each function has at most 150 accepted calls a source, plus all of its rejections.
//
// A record keeps the board once (boards are shared by the calls on one candidate: a table, by
// their JSON), and only the fields the functions read: grid, W, H, ropes, mirrors, springs, plan.
// Each record is re-run from its numbers alone, on that stripped board, by the JS (the unwrapped
// function, a fresh mulberry32 at the recorded state), and must give the same answer and draws;
// otherwise the dump fails.
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const R = require('./ref.cjs'), C = require('./capture.cjs');

const OUT = path.join(__dirname, 'fixtures/g6-calls.json.gz');
const NAMES = ['valid', 'coverage', 'regional', 'trivial', 'featuresUsed', 'featureStats', 'postpone', 'score', 'casualRate', 'Q.analyze'];
const PER = 150;

const { m } = C.captured(), G = m.G;
const kindOf = R.kindOf;

// A board as the fixture keeps it.
const strip = b => ({ grid: b.grid, W: b.W, H: b.H, ropes: b.ropes.map(p => p.map(c => [c.q, c.r])),
  mirrors: (b.mirrors || []).map(x => [x.cell.q, x.cell.r, kindOf(b, x)]), springs: (b.springs || []).map(c => [c.q, c.r]), plan: (b.plan || []).slice() });
// ... and back.
function board(s) {
  const hex = s.grid === 'hex';
  return { grid: s.grid, W: s.W, H: s.H, ropes: s.ropes.map(p => p.map(([q, r]) => ({ q, r }))),
    mirrors: s.mirrors.map(([q, r, k]) => hex ? { cell: { q, r }, axis: k } : { cell: { q, r }, slope: k ? '\\' : '/' }),
    springs: s.springs.map(([q, r]) => ({ q, r })), plan: s.plan.slice() };
}

// The calls of one source, sampled by the rule.
function sample(recs) {
  const by = {};
  for (const r of recs) (by[r.name] = by[r.name] || []).push(r);
  const out = [], counts = {};
  for (const [name, rs] of Object.entries(by)) {
    const reject = r => r.result === false || r.result === null;
    const ok = rs.filter(r => !reject(r)), s = Math.max(1, Math.ceil(ok.length / PER));
    const keep = new Set([...rs.filter(reject), ...ok.filter((_, i) => i % s === 0)]);
    const kept = rs.filter(r => keep.has(r));
    out.push(...kept);
    counts[name] = { made: rs.length, rejected: rs.filter(reject).length, kept: kept.length, stride: s };
  }
  return { out, counts };
}

// A record in the fixture's form: the board by index, the other arguments by name.
function entry(r, boards, index) {
  const key = JSON.stringify(strip(r.args[0]));  // a recorded board is plain data with q/r cells already
  if (!index.has(key)) { index.set(key, boards.length); boards.push(JSON.parse(key)); }
  const e = { name: r.name, n: r.n, b: index.get(key), result: r.result, draws: r.draws };
  const a = r.args;
  switch (r.name) {
    case 'featureStats': case 'Q.analyze': e.plan = a[1]; e.manual = a[2]; break;
    case 'postpone': e.plan = a[2]; break;
    case 'score': e.skip = !!a[2]; if (a.length > 3 && a[3] !== undefined) e.budget = a[3]; break;
    case 'casualRate': e.state = a[2].$rng; e.games = a[3]; break;
  }
  return e;
}

// The JS's answer to an entry, from its numbers alone.
function rerun(e, boards) {
  const raw = globalThis.__mfCaptureRaw, b = board(boards[e.b]);
  const before = R.draws();
  let v;
  switch (e.name) {
    case 'valid': v = raw.valid(b); break;
    case 'coverage': v = raw.coverage(b); break;
    case 'regional': v = raw.regional(b); break;
    case 'trivial': v = raw.trivial(b, G); break;
    case 'featuresUsed': v = raw.featuresUsed(b, G); break;
    case 'featureStats': v = raw.featureStats(b, e.plan, e.manual, G); break;
    case 'postpone': v = raw.postpone(b, G, e.plan); break;
    case 'score': v = e.budget === undefined ? raw.score(b, G, e.skip) : raw.score(b, G, e.skip, e.budget); break;
    case 'casualRate': v = raw.casualRate(b, G, R.mulberry32(e.state), e.games); break;
    case 'Q.analyze': v = m.Q.analyze(b, e.plan, e.manual, G); break;
    default: throw Error('dump-g6: no function ' + e.name);
  }
  return { result: JSON.parse(JSON.stringify(v === undefined ? null : v)), draws: R.draws() - before };
}

const specsOf = {
  reference: () => R.boards().map(b => b.code ? G.spec(G.parseCode(b.code), b.index) : G.spec({ kind: 'journey' }, Number(b.name.slice(1)) - 1)),
  g5: () => fs.readFileSync(path.join(__dirname, 'fixtures/g5-review-boards.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l)).map(j => G.spec(G.parseCode(j.code), j.index)),
};

if (require.main === module) {
  const check = process.argv.includes('--check');
  if (check) {
    const fx = JSON.parse(zlib.gunzipSync(fs.readFileSync(OUT)));
    let bad = 0;
    for (const e of fx.calls) { const r = rerun(e, fx.boards); if (JSON.stringify(r.result) !== JSON.stringify(e.result) || r.draws !== e.draws) bad++; }
    console.log(`${bad ? 'FAIL' : 'ok  '} ${fx.calls.length} recorded calls re-run by the JS from their numbers: ${fx.calls.length - bad} the same, ${bad} differ`);
    process.exit(bad ? 1 : 0);
  }
  const boards = [], index = new Map(), calls = [], counts = {};
  const t0 = Date.now();
  for (const [source, specs] of Object.entries(specsOf)) {
    const recs = C.record(NAMES, specs());
    const s = sample(recs);
    counts[source] = s.counts;
    for (const r of s.out) calls.push({ source, ...entry(r, boards, index) });
    console.log(`${source}: ${recs.length} calls made, ${s.out.length} kept (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  }
  // each entry, again from its numbers alone, on the stripped board
  let bad = 0;
  for (const e of calls) {
    const r = rerun(e, boards);
    if (JSON.stringify(r.result) !== JSON.stringify(e.result) || r.draws !== e.draws) { bad++; if (bad <= 5) console.log('re-run differs:', e.source, e.name, '#' + e.n); }
  }
  if (bad) { console.log(`FAIL: ${bad} records differ when re-run from their numbers`); process.exit(1); }
  const fx = { reference: R.REFERENCE, rule: `per function and source: every rejection (false or null), and every s-th other call, s = ceil(count / ${PER})`, counts, boards, calls };
  fs.writeFileSync(OUT, zlib.gzipSync(JSON.stringify(fx), { level: 9 }));
  console.log(`wrote ${path.relative(process.cwd(), OUT)}: ${calls.length} calls on ${boards.length} boards, ${fs.statSync(OUT).size} bytes; every one re-runs the same (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  for (const [source, c] of Object.entries(counts)) console.log(`  ${source}: ${Object.entries(c).map(([k, v]) => `${k} ${v.kept}/${v.made} (${v.rejected} rejected)`).join(', ')}`);
}

module.exports = { board, strip, rerun, OUT };
