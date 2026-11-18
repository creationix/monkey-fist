// Recording the calls the real generator makes (grid-generator.js at 9e69e3a), so that a
// unit of the port can be checked on the inputs generation really gives it, the
// candidates the generator rejects included. builder/dump-weave.cjs did this for
// L.weave; this is the same, for any function.
//
//   const C = require('./capture.cjs')
//   const recs = C.record(['placeMirrors', 'valid', 'H.build'], specs, { keep, limit })
//   C.replay(rec)        // { same, result, draws }: run again from the record's numbers alone
//
//   node capture.cjs <name> [levels] [limit]   record <name> over the first Journey levels,
//                                              replay every record, and print what came out
//
// Two kinds of function are recorded:
// - Calls through a module object (`H.build`, `L.weave`, `L.fewestPlayerTaps`,
//   `L.casualWins`, `H.casualWins`, `Q.analyze`, `G.tap`, `G.solve`, ...: any
//   `<M>.<name>` with M one of L, H, Q, G, HM, M, F). The function is replaced in place,
//   on the module object grid-generator.js calls it through, for the time of record().
// - The internal functions of grid-generator.js, which no module object exposes
//   (repeatedCore, addSpinners, woven, placeMirrors, postpone, regional, trivial,
//   featuresUsed, featureStats, valid, coverage, score, casualRate, withSpinner,
//   searchSpinner, bounceStep, waysOut). They are reached through a patched copy,
//   grid-generator.captured.js, written beside the original in the reference checkout
//   (so that it shares the other modules) by one text substitution per name:
//     `  function NAME(` becomes `  function NAME__raw(`, or `  const NAME = ` becomes
//     `  const NAME__raw = `; then, before `  const api = {`, the line
//     `  const NAME = (...a) => __record('NAME', NAME__raw, a);`
//   __record calls the recorder when one is set, and the function alone otherwise.
//   record() then runs the patched copy's generate(spec, G).
//
// A record is { name, n, args, result, draws, state }: the arguments and the result as
// plain data (a generator argument as { $rng: its state when the call began }, the
// game-engine module as { $G: 1 }, a style of L.STYLES as { $ref: 'L.STYLES.i' }, other
// functions as { $fn: name }, which cannot be replayed), and the draws the
// call made, its inner calls' included. The generator is the counting mulberry32 of
// ref.cjs. replay(rec) builds the arguments again from that data alone, with a fresh
// mulberry32(state), calls the unwrapped function, and compares result and draws.
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs');

const INTERNAL = ['repeatedCore', 'addSpinners', 'woven', 'placeMirrors', 'postpone', 'regional', 'trivial', 'featuresUsed', 'featureStats',
  'valid', 'coverage', 'score', 'casualRate', 'withSpinner', 'searchSpinner', 'bounceStep', 'waysOut'];

let patched = null, raw = {}, recorder = null;
// The patched copy of grid-generator.js (made once per process).
function captured() {
  if (patched) return patched;
  const m = R.js();
  let src = fs.readFileSync(path.join(R.dir, 'grid-generator.js'), 'utf8');
  const lines = [];
  for (const name of INTERNAL) {
    const fn = new RegExp(`^  function ${name}\\(`, 'm'), cst = new RegExp(`^  const ${name} = `, 'm');
    if (fn.test(src)) src = src.replace(fn, `  function ${name}__raw(`);
    else if (cst.test(src)) src = src.replace(cst, `  const ${name}__raw = `);
    else throw Error(`capture: no ${name} in grid-generator.js`);
    lines.push(`  const ${name} = (...a) => __record('${name}', ${name}__raw, a);`);
    lines.push(`  __raw['${name}'] = ${name}__raw;`);
  }
  if (!src.includes('  const api = {')) throw Error('capture: no api line in grid-generator.js');
  src = src.replace('  const api = {', lines.join('\n') + '\n  const api = {');
  src = src.replace("  'use strict';", "  'use strict';\n  const __raw = globalThis.__mfCaptureRaw = {};\n  const __record = (n, f, a) => globalThis.__mfCapture ? globalThis.__mfCapture(n, f, a) : f(...a);");
  const file = path.join(R.dir, 'grid-generator.captured.js');
  fs.writeFileSync(file, src);
  const F = require(file);
  raw = globalThis.__mfCaptureRaw;
  patched = { F, m };
  return patched;
}

// Objects of the reference that are passed whole and hold functions: recorded by name.
function refs() {
  const { L } = R.js(), out = new Map();
  (L.STYLES || []).forEach((s, i) => out.set(s, 'L.STYLES.' + i));
  return out;
}
let REFS = null;
const refByName = name => { for (const [o, n] of REFS) if (n === name) return o; throw Error('capture: no reference object ' + name); };

// Arguments and results as plain data.
function plain(v, G, depth = 0) {
  REFS = REFS || refs();
  if (typeof v === 'function') return typeof v.state === 'function' ? { $rng: v.state() } : { $fn: v.name || '?' };
  if (v === G) return { $G: 1 };
  if (REFS.has(v)) return { $ref: REFS.get(v) };
  if (v instanceof Map) return { $map: [...v.entries()].map(e => plain(e, G, depth + 1)) };
  if (v instanceof Set) return { $set: [...v].map(e => plain(e, G, depth + 1)) };
  if (Array.isArray(v)) return v.map(e => plain(e, G, depth + 1));
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = plain(v[k], G, depth + 1); return o; }
  return v;
}
function revive(v, G) {
  if (Array.isArray(v)) return v.map(e => revive(e, G));
  if (v && typeof v === 'object') {
    if ('$rng' in v) return R.mulberry32(v.$rng);
    if ('$G' in v) return G;
    if ('$ref' in v) return refByName(v.$ref);
    if ('$map' in v) return new Map(v.$map.map(e => revive(e, G)));
    if ('$set' in v) return new Set(v.$set.map(e => revive(e, G)));
    if ('$fn' in v) return () => { throw Error('capture: a function argument cannot be replayed: ' + v.$fn); };
    const o = {}; for (const k of Object.keys(v)) o[k] = revive(v[k], G); return o;
  }
  return v;
}

const MODULES = ['L', 'H', 'Q', 'G', 'HM', 'M', 'F'];
// Records calls of names (internal names, or 'M.name') while the patched generator makes
// the levels of specs (game-engine.js spec objects). keep(rec) decides which records are
// kept (all by default), and limit how many in all.
function record(names, specs, { keep = () => true, limit = Infinity } = {}) {
  const { F, m } = captured(), G = m.G;
  const out = [], counts = {}, undo = [];
  const rec = (name, f, a) => {
    const n = counts[name] = (counts[name] || 0) + 1;
    const before = R.draws(), args = plain(a, G);
    const result = f(...a);
    const r = { name, n, args, result: plain(result, G), draws: R.draws() - before };
    if (out.length < limit && keep(r)) out.push(r);
    return result;
  };
  for (const name of names) {
    if (INTERNAL.includes(name)) continue;
    const [mod, fn] = name.split('.');
    if (!MODULES.includes(mod) || typeof m[mod][fn] !== 'function') throw Error('capture: no function ' + name);
    const orig = m[mod][fn];
    m[mod][fn] = (...a) => rec(name, orig, a);
    undo.push(() => { m[mod][fn] = orig; });
  }
  const internal = new Set(names.filter(n => INTERNAL.includes(n)));
  globalThis.__mfCapture = (name, f, a) => internal.has(name) ? rec(name, f, a) : f(...a);
  try {
    for (const s of specs) F.generate(s, G);
  } finally {
    globalThis.__mfCapture = null;
    for (const u of undo) u();
  }
  return out;
}

// Runs rec again from its numbers alone.
function replay(rec) {
  const { m } = captured(), G = m.G;
  const [mod, fn] = rec.name.split('.');
  const f = fn ? m[mod][fn] : raw[rec.name];
  const before = R.draws();
  const result = plain(f(...revive(rec.args, G)), G);
  const draws = R.draws() - before;
  return { same: JSON.stringify(result) === JSON.stringify(rec.result) && draws === rec.draws, result, draws };
}

module.exports = { INTERNAL, record, replay, captured };

if (require.main === module) {
  const [name = 'placeMirrors', levels = '20', limit = '200'] = process.argv.slice(2);
  const { m } = captured();
  const specs = m.K.slice(0, +levels).map((l, i) => m.G.spec({ kind: 'journey' }, i));
  const t = Date.now();
  const recs = record([name], specs, { limit: +limit });
  let bad = 0;
  for (const r of recs) if (!replay(r).same) { bad++; if (bad <= 3) console.log('replay differs:', name, '#' + r.n); }
  const draws = recs.reduce((s, r) => s + r.draws, 0);
  // the patched copy makes the boards the original makes
  const { F } = captured();
  for (const sp of specs.slice(0, 3)) {
    const a = JSON.stringify(plain(F.generate(sp, m.G), m.G)), o = JSON.stringify(plain(m.F.generate(sp, m.G), m.G));
    if (a !== o) { bad++; console.log('the patched generator differs from the original on level', sp.index + 1); }
  }
  console.log(`${name}: ${recs.length} calls recorded over ${specs.length} levels in ${Date.now() - t} ms, ${draws} draws; replayed from their numbers: ${recs.length - bad} same, ${bad} differ`);
  process.exit(bad ? 1 : 0);
}
