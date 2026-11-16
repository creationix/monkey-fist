// Checks an Encantis build of the square woven builder, weave(rng, cfg), against
// weave-expected.json (the JS of commit 9e69e3a; see dump-weave.cjs), and times it
// against that JS:
//
//   node moonbit/encantis/builder/check-weave.cjs [weave.wasm]   default: weave.wasm beside this file
//     --case N      run only case N, and print what was expected and what came back
//     --show N      describe the first N failing cases (default 5)
//     --verbose     name each case before it runs (to find one that never returns)
//     --self-test   run the harness on a JS stand-in for the module instead of a wasm file
//
// Exits 0 only if every case matches. Exits 1 on any mismatch (or a stale
// fixture), 2 if the wasm is missing or lacks an export.
//
// ---- The interface the module implements ----
//
// Exports: the memory as "mem", and
//   in_ptr()  -> u32   address of the i32 input words (a multiple of 4)
//   fin_ptr() -> u32   address of the f64 input values (any alignment; little-endian)
//   out_ptr() -> u32   address of the i32 output words (a multiple of 4)
//   weave()   -> i32   builds one board from the input; returns output word 0
//   draws()   -> u32   optional: how many times the last weave() called the rng.
//                      If exported it is compared too (the generator goes on using the
//                      same rng after weave, so a port must consume exactly as many draws).
//   trace_ptr() -> u32 optional, for debugging (needs draws()): address of 65,536 u32 words
//                      (a multiple of 4). For draw number k of a call (from 0, while k < 65536)
//                      the module stores site << 24 | (n & 0xFFFFFF) at word k: site is the
//                      number of the rng call site in dump-weave.cjs's SITES (1 to 23), n the
//                      bound of a `below`, the sum of a `pick`, and 0 otherwise. For a failing
//                      case the harness then names the first draw that differs from the JS's.
//                      (`dump-weave.cjs --trace N` prints the JS's draws for case N.)
// The three addresses may not change between calls. Each call is independent: the
// harness runs the cases in order and then again in reverse, on one instance.
//
// Input, i32 words at in_ptr():
//    0  seed         seed of mulberry32 (its 32 bits; read it as u32)
//    1  W            board width
//    2  H            board height
//    3  lenLo        rope lengths wanted: lenLo to lenHi
//    4  lenHi
//    5  minLen       the shortest rope kept
//    6  tie          knots wanted
//    7  bait         traps wanted
//    8  pull         the longest slide
//    9  ropeCount    0: not set. 0 in every case of the fixture
//   10  keepBounds   1: never trim or turn the board. 1 in every case of the fixture
//   11  nMirrors
//   then nMirrors x (cell, kind)        cell = y * W + x; kind 0 for '/', 1 for '\'.
//                                       In the order of the JS Map (aimed() picks by index)
//   then nCore                          the repeated-slide core: cfg.initialRopes (0: none)
//   then nCore x (len, cell x len,      a core rope from tail to head, cells y * W + x,
//                 nStops, stop x nStops)  then cfg.initialStops for it: offsets to stop at, in order
//   then nPlan, tap x nPlan             cfg.initialPlan; nPlan is -1 for null (always, without a core)
//
// Input, f64 values at fin_ptr(), exactly the doubles of the JS cfg:
//    0  straight     the chance a growing rope carries straight on
//    1  cover        share of the cells to fill (0.99)
//    2  tapDepth     the block cost each new rope should add (difficulty / 100 * 8)
//    3  bends        \
//    4  lo            |  read by the JS only where the fixture never goes: with tapDepth set
//    5  hi            |  they decide nothing (lo 0, hi 1000000, floor 0 in every case).
//    6  wantAvg       |  The MoonBit port drops them: sMin = 0, sMax = 999999.
//    7  floor        /
//
// Output, i32 words at out_ptr():
//    0  result       1: a board follows. 0: weave returned null (nothing else is read)
//    1  knots        as finished() counts them
//    2  traps
//    3  nRopes
//   then nRopes x (len, cell x len)     each rope from tail to head, cells y * W + x, in rope order
//   then nTaps, tap x nTaps             the solution: ropes in the order to tap them
//
// Sizes in the fixture, for the module's buffers: at most 92 input words and 1,822 output
// words (the 40x40 board); boards up to 1,600 cells with up to 166 ropes of up to 64 cells
// and 175 taps; at most 7 mirrors; a core of 2 ropes with up to 4 stops each and a plan of
// up to 10 taps (a plan names a rope once per tap, so ropes repeat in it); at most 33,944
// rng draws in one call.
'use strict';
const fs = require('fs'), path = require('path');
const D = require('./dump-weave.cjs');

const args = process.argv.slice(2), flag = name => args.includes(name);
const option = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? Number(args[i + 1]) : fallback; };
const positional = args.filter((a, i) => !a.startsWith('--') && !['--case', '--show'].includes(args[i - 1]));
const wasmPath = path.resolve(positional[0] || path.join(__dirname, 'weave.wasm'));
const fail = (code, message) => { console.error(message); process.exit(code); };
const TRACE_WORDS = 65536;

// A JS stand-in for the module, for --self-test: it reads the buffers exactly as laid
// out above, runs the reference weave, and writes the result as a module must.
function standIn(tracer) {
  const mem = new WebAssembly.Memory({ initial: 8 }), IN = 1024, FIN = 65537, OUT = 131072, TRACE = 196608; // FIN is deliberately unaligned
  let draws = 0;
  return { mem, in_ptr: () => IN, fin_ptr: () => FIN, out_ptr: () => OUT, draws: () => draws, trace_ptr: () => TRACE,
    weave() {
      const w = new Int32Array(mem.buffer, IN), f = new DataView(mem.buffer, FIN); let k = 0;
      const seed = w[k++] >>> 0, plain = {};
      for (const name of ['W', 'H', 'lenLo', 'lenHi', 'minLen', 'tie', 'bait', 'pull', 'ropeCount', 'keepBounds']) plain[name] = w[k++];
      D.DOUBLES.forEach((name, i) => { plain[name] = f.getFloat64(8 * i, true); });
      plain.mirrors = Array.from({ length: w[k++] }, () => [w[k++], w[k++]]);
      plain.initialRopes = []; plain.initialStops = [];
      for (let n = w[k++]; n > 0; n--) {
        plain.initialRopes.push(Array.from({ length: w[k++] }, () => w[k++]));
        plain.initialStops.push(Array.from({ length: w[k++] }, () => w[k++]));
      }
      const nPlan = w[k++]; plain.initialPlan = nPlan < 0 ? null : Array.from({ length: nPlan }, () => w[k++]);
      const r = tracer({ seed, cfg: plain }); draws = r.draws;
      new Int32Array(mem.buffer, TRACE).set(r.trace.slice(0, TRACE_WORDS));
      const out = D.outWords(r.out); new Int32Array(mem.buffer, OUT).set(out);
      return out[0];
    } };
}

// Calls the module on a case's input: { out, draws } as in the fixture, or { error }.
function caller(x) {
  for (const name of ['mem', 'in_ptr', 'fin_ptr', 'out_ptr', 'weave']) if (!x[name]) fail(2, `${wasmPath}: no export "${name}"`);
  const IN = x.in_ptr() >>> 0, FIN = x.fin_ptr() >>> 0, OUT = x.out_ptr() >>> 0;
  if (IN % 4 || OUT % 4) fail(2, 'in_ptr() and out_ptr() must be multiples of 4');
  const call = input => {
    const size = x.mem.buffer.byteLength;
    if (IN + 4 * input.ints.length > size || FIN + 8 * input.doubles.length > size) return { error: 'the input does not fit in the memory' };
    new Int32Array(x.mem.buffer, IN, input.ints.length).set(input.ints);
    const f = new DataView(x.mem.buffer, FIN); input.doubles.forEach((v, i) => f.setFloat64(8 * i, v, true));
    const t = performance.now(); let result;
    try { result = x.weave(); } catch (e) { return { error: `${e.constructor.name}: ${e.message}`, ms: performance.now() - t, trapped: true }; }
    return { result, ms: performance.now() - t };
  };
  const draws = () => { try { return x.draws ? x.draws() >>> 0 : null; } catch { return null; } };
  const read = result => {
    const w = new Int32Array(x.mem.buffer, OUT), end = w.length; let k = 0;
    const list = () => { const n = w[k++]; if (n < 0 || k + n > end) throw Error(`a length of ${n} at output word ${k - 1}`); const a = Array.from(w.subarray(k, k + n)); k += n; return a; };
    try {
      if (w[k++] !== result) throw Error(`weave() returned ${result} but output word 0 is ${w[0]}`);
      if (result === 0) return { out: null };
      if (result !== 1) throw Error(`result ${result} is neither 0 nor 1`);
      const knots = w[k++], traps = w[k++], n = w[k++];
      if (n < 0 || n > end) throw Error(`${n} ropes`);
      const ropes = Array.from({ length: n }, list), taps = list();
      return { out: { ropes, taps, knots, traps } };
    } catch (e) { return { error: 'unreadable output: ' + e.message }; }
  };
  const run = input => {
    const c = call(input); if (c.error) return { ...c, draws: draws() };
    return { ...read(c.result), ms: c.ms, draws: draws() };
  };
  // The sites of the last call's first n draws, if the module records them.
  run.trace = n => {
    if (!x.trace_ptr || n === null) return null;
    const at = x.trace_ptr() >>> 0, count = Math.min(n, TRACE_WORDS);
    return at % 4 || at + 4 * count > x.mem.buffer.byteLength ? null : Array.from(new Int32Array(x.mem.buffer, at, count));
  };
  return run;
}

// What differs between the expected result and the module's, as lines of text; [] if nothing.
function differences(c, got) {
  const W = c.cfg.W, at = cell => `${cell} (x ${cell % W}, y ${Math.floor(cell / W)})`, lines = [];
  const draws = () => { if (got.draws !== null && got.draws !== undefined && got.draws !== c.draws) lines.push(`rng draws: expected ${c.draws}, got ${got.draws}`); };
  if (got.error) return [got.error + (got.draws === null || got.draws === undefined ? '' : ` (after ${got.draws} rng draws; expected ${c.draws} in all)`)];
  if (!c.out || !got.out) {
    if (!!c.out !== !!got.out) lines.push(c.out ? `expected a board of ${c.out.ropes.length} ropes, got null` : `expected null, got a board of ${got.out.ropes.length} ropes`);
    draws(); return lines;
  }
  const e = c.out, g = got.out;
  for (let i = 0; i < Math.max(e.ropes.length, g.ropes.length); i++) {
    const a = e.ropes[i], b = g.ropes[i];
    if (a && b && a.length === b.length && a.every((cell, j) => cell === b[j])) continue;
    if (!a || !b) lines.push(`ropes: expected ${e.ropes.length}, got ${g.ropes.length} (the first ${i} are equal)`);
    else {
      const j = a.findIndex((cell, k) => cell !== b[k]);
      lines.push(`rope ${i}${i ? ` (the ${i} before it are equal)` : ''}: ` + (j < 0 || j >= b.length ? `expected ${a.length} cells, got ${b.length}` : `cell ${j}: expected ${at(a[j])}, got ${at(b[j])}`));
      lines.push(`  expected [${a.join(' ')}]`, `  got      [${b.join(' ')}]`);
    }
    break;
  }
  const t = e.taps.findIndex((v, k) => v !== g.taps[k]);
  if (t >= 0 || e.taps.length !== g.taps.length) lines.push(`taps: ` + (t >= 0 && t < g.taps.length ? `tap ${t}: expected rope ${e.taps[t]}, got ${g.taps[t]}` : `expected ${e.taps.length}, got ${g.taps.length}`) + ` (expected [${e.taps.join(' ')}], got [${g.taps.join(' ')}])`);
  if (e.knots !== g.knots) lines.push(`knots: expected ${e.knots}, got ${g.knots}`);
  if (e.traps !== g.traps) lines.push(`traps: expected ${e.traps}, got ${g.traps}`);
  draws(); return lines;
}

// Where the module's rng draws first part from the reference's, as lines of text.
function traceDifference(want, got, draws) {
  const n = Math.min(want.length, got.length), names = (a, from, to) => a.slice(Math.max(0, from), to).map(D.siteName).join(' | ');
  let k = 0; while (k < n && want[k] === got[k]) k++;
  const before = k ? [`  the draws before it: ${k > 4 ? '... | ' : ''}${names(want, k - 4, k)}`] : [];
  if (k < n) return [`rng draw ${k} differs (the ${k} before it agree, site and bound):`, `  expected ${D.siteName(want[k])}`, `  got      ${D.siteName(got[k])}`, ...before];
  if (got.length < draws) return [`the first ${k} rng draws agree, site and bound (the module records no more)`];
  if (want.length === got.length) return [`all ${k} rng draws agree, site and bound: the difference is in what happens between or after them`];
  return want.length > k ? [`the module's ${k} rng draws agree with the reference's first ${k}; the reference goes on with:`, `  ${names(want, k, k + 4)}`, ...before]
    : [`the reference's ${k} rng draws agree with the module's first ${k}; the module goes on with:`, `  ${names(got, k, k + 4)}`, ...before];
}

(async () => {
  const fixture = JSON.parse(fs.readFileSync(D.FIXTURE, 'utf8'));
  const only = option('--case', -1), show = option('--show', 5);
  const cases = only >= 0 ? fixture.cases.filter(c => c.id === only) : fixture.cases;
  if (!cases.length) fail(2, `no case ${only}`);
  const inputs = new Map(cases.map(c => [c, D.words(c)]));

  // The reference JS, from git. Without it the cases are still checked, but nothing is timed.
  let L = null, tracer = null;
  try { const ref = D.reference(false); L = ref.L; tracer = D.traced(ref); }
  catch (e) { if (flag('--self-test')) throw e; console.log(`(the reference JS of ${D.REFERENCE} could not be read from git, so no timing: ${e.message.split('\n')[0]})`); }

  let instantiate;
  if (flag('--self-test')) instantiate = async () => standIn(tracer);
  else {
    if (!fs.existsSync(wasmPath)) fail(2, `${wasmPath} does not exist: build it with\n  encantis wasm moonbit/encantis/builder/weave.ents -o moonbit/encantis/builder/weave.wasm`);
    const module = await WebAssembly.compile(fs.readFileSync(wasmPath));
    instantiate = async () => (await WebAssembly.instantiate(module, {})).exports;
  }
  let x = await instantiate(), run = caller(x);
  const name = flag('--self-test') ? 'stand-in' : 'Encantis';
  console.log(flag('--self-test') ? 'self-test: a JS stand-in for the module' : `${positional[0] || path.relative(process.cwd(), wasmPath)}: ${fs.statSync(wasmPath).size} bytes${x.draws ? '' : ', no draws() export (rng draws are not compared)'}${x.trace_ptr ? ', records its rng draws' : ''}`);

  // 1. Every case, in order and then in reverse (a module that leaves state behind between
  // calls shows up as cases that only fail in one of the passes).
  const failed = new Map(), passes = [0, 0]; let firstPass = 0;
  for (const pass of [0, 1]) {
    for (const c of pass ? cases.slice().reverse() : cases) {
      if (flag('--verbose')) console.log(`pass ${pass + 1}, case ${c.id}: ${c.from}`);
      const got = run(inputs.get(c)), lines = differences(c, got);
      if (!pass) firstPass += got.ms || 0;
      const trace = lines.length && tracer && failed.size < Math.max(show, 1) && !failed.has(c) ? run.trace(got.draws) : null;
      if (got.trapped) { x = await instantiate(); run = caller(x); } // a trap may leave the instance in any state
      if (!lines.length) continue;
      passes[pass]++;
      if (!failed.has(c)) failed.set(c, { lines: trace ? lines.concat(traceDifference(tracer(c).trace, trace, got.draws)) : lines, pass, got });
    }
    if (only >= 0) break;
  }
  const shown = [...failed].sort((a, b) => a[0].id - b[0].id);
  for (const [c, f] of shown.slice(0, show)) {
    console.log(`\ncase ${c.id}: ${c.from}; ${c.cfg.W}x${c.cfg.H}, seed ${c.seed}, ${c.cfg.mirrors.length} mirrors, ${c.cfg.initialRopes.length} core ropes${f.pass ? ' (failed only in the reverse pass)' : ''}`);
    for (const line of f.lines) console.log('  ' + line);
  }
  if (only >= 0) {
    const c = cases[0], got = failed.has(c) ? failed.get(c).got : run(inputs.get(c));
    console.log(`\ninput i32 words: [${inputs.get(c).ints.join(' ')}]\ninput f64 values: [${inputs.get(c).doubles.join(' ')}]`);
    console.log(`expected: ${JSON.stringify(c.out)}, ${c.draws} draws\ngot:      ${got.error || JSON.stringify(got.out)}${got.draws === null || got.draws === undefined ? '' : `, ${got.draws} draws`}`);
  }
  if (shown.length > show) console.log(`\nfailing cases: ${shown.slice(0, 40).map(([c]) => c.id).join(' ')}${shown.length > 40 ? ` and ${shown.length - 40} more` : ''}`);
  if (passes[0] !== passes[1] && only < 0) console.log(`\n${passes[0]} cases fail in order and ${passes[1]} in reverse: the module keeps state between calls`);
  console.log(`\n${cases.length} cases (${cases.filter(c => !c.out).length} null), ${only >= 0 ? 'one pass' : 'in order and in reverse'}: ${failed.size} mismatches`);

  // 2. The reference JS on the same cases: it must still give the fixture, and it is the time to beat.
  let stale = 0;
  if (L) {
    const cfgs = new Map(cases.map(c => [c, D.cfgOf(c.cfg)])), same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    let firstJs = 0; // the reference's first run in this process: what one board costs before the JS is optimised
    for (const c of cases) {
      const rng = L.mulberry32(c.seed), cfg = cfgs.get(c), t = performance.now(), raw = L.weave(rng, cfg); firstJs += performance.now() - t;
      const r = D.run(L, c);
      if (!same(D.plainOut(raw, cfg), c.out) || !same(r.out, c.out) || r.draws !== c.draws) stale++;
    }
    if (stale) console.log(`${stale} cases of weave-expected.json are not what the reference JS gives: regenerate it with dump-weave.cjs`);
    if (!failed.size && !stale) {
      const groups = [['boards up to 12x16', c => c.cfg.W * c.cfg.H <= 192], ['24x24', c => c.cfg.W === 24], ['40x40', c => c.cfg.W === 40]].filter(g => cases.some(g[1]));
      const rounds = 5, time = { module: [], js: [] };
      for (let r = 0; r < rounds; r++) {
        const m = groups.map(() => 0), j = groups.map(() => 0);
        for (const c of cases) {
          const g = groups.findIndex(group => group[1](c));
          m[g] += run(inputs.get(c)).ms;
          const rng = L.mulberry32(c.seed), cfg = cfgs.get(c), t = performance.now(); L.weave(rng, cfg); j[g] += performance.now() - t;
        }
        time.module.push(m); time.js.push(j);
      }
      const sum = a => a.reduce((p, q) => p + q, 0), best = (rows, g) => Math.min(...rows.map(row => g < 0 ? sum(row) : row[g]));
      const line = (label, m, j) => `  ${label}: ${name} ${m.toFixed(1)} ms, reference JS ${j.toFixed(1)} ms (${(j / m).toFixed(2)}x)`;
      console.log(`time to weave the ${cases.length} cases (the call alone, input already written), best of ${rounds} rounds:`);
      console.log(line('all', best(time.module, -1), best(time.js, -1)));
      if (groups.length > 1) groups.forEach((g, i) => console.log(line(`${g[0]}, ${cases.filter(g[1]).length} cases`, best(time.module, i), best(time.js, i))));
      if (!flag('--self-test') && only < 0) console.log(line('first run of each case, before anything is optimised', firstPass, firstJs));
    }
  }
  process.exit(failed.size || stale ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
