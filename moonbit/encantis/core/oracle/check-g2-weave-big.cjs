// Weave on boards builder's fixture lacks (written by G2's review): the fixture's largest board
// is 40x40, and builder-v2's other-sizes.cjs goes to 80x80 but only without mirrors or a core.
// This runs the real generator of 9e69e3a on colossal 48x48 maps (long ropes, mirrors, cores)
// and on 24x24 maps with mirrors, records every weave call it makes (as builder/dump-weave.cjs
// does), and runs each call again on the port through the buffer contract of test/weave.ents:
// the output words and the draw count must be the JS's.
//
//   node moonbit/encantis/core/oracle/check-g2-weave-big.cjs [test/g2.wasm] [--quick]
//
// --quick runs the first three specifications only.
'use strict';
const fs = require('fs'), path = require('path');
const D = require('../../builder/dump-weave.cjs');

const args = process.argv.slice(2);
const WASM = args.find(a => !a.startsWith('--')) || path.join(__dirname, '../test/g2.wasm');
const SPECS = [
  // [code, indices]: colossal square maps at 48x48 (long ropes, one attempt each), with and
  // without mirrors, at several seeds and difficulties
  ...['A', 'B', 'C', 'D'].flatMap(s => [[`U3-S-70-70-48-48-1-MC-BIG${s}`, [0]], [`U3-S-40-40-48-48-1-C-BIG${s}`, [0]], [`U3-S-95-95-48-48-1-MC-BIG${s}`, [0]]]),
  ['U3-S-60-100-48-40-3-MC-BIG3', [0, 1, 2]], ['U3-S-1-100-48-8-3-MC-STRIP', [0, 1, 2]],
  // 20x20 to 24x24 maps with mirrors (not colossal: up to ten attempts each, and at difficulty
  // 60 and over the repeated-slide core on alternate attempts)
  ['U3-S-60-100-24-24-3-M-BIG', [0, 1, 2]], ['U3-S-20-100-24-24-4-M-BIG', [0, 1, 2, 3]], ['U3-S-70-100-20-24-3-N-BIG', [0, 1, 2]],
];

function record(ref, specs) {
  const { L, G } = ref, weave = L.weave, calls = [];
  L.mulberry32 = D.mulberry32;
  let name = '';
  L.weave = (rng, cfg) => {
    const seed = rng.state(); let draws = 0, raw, error = null;
    try { raw = weave(() => { draws++; return rng(); }, cfg); } catch (e) { error = e; }
    calls.push({ from: name, seed, cfg, draws, raw, error: error && error.message });
    if (error) throw error;
    return raw;
  };
  for (const [code, indices] of specs) for (const index of indices) {
    const o = G.parseCode(code); if (!o) throw Error('bad code ' + code);
    name = `${code}#${index}`;
    try { G.generate({ ...o, index }); } catch (e) { if (!/Could not densely weave/.test(e.message)) throw e; }
  }
  L.weave = weave;
  return calls;
}

if (require.main === module) {
  const t0 = Date.now();
  const ref = D.reference(true);
  const specs = args.includes('--quick') ? SPECS.slice(0, 3) : SPECS;
  const calls = record(ref, specs);
  const t1 = Date.now();
  const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(WASM)), {}).exports;
  const IN = x.in_ptr() >>> 0, FIN = x.fin_ptr() >>> 0, OUT = x.out_ptr() >>> 0;
  let bad = 0, nulls = 0, cores = 0, mirrors = 0, maxArea = 0, errors = 0;
  for (const [k, c0] of calls.entries()) {
    if (c0.error) { errors++; continue; }
    // the fixture's plain form, as dump-weave.cjs keeps a case
    const plain = (() => {
      const cfg = c0.cfg, W = cfg.W, out = {};
      for (const f of ['W', 'H', 'lenLo', 'lenHi', 'minLen', 'tie', 'bait', 'pull']) out[f] = cfg[f];
      out.ropeCount = cfg.ropeCount || 0; out.keepBounds = cfg.keepBounds ? 1 : 0;
      for (const f of D.DOUBLES) out[f] = cfg[f];
      out.mirrors = [...cfg.mirrors].map(([cell, slope]) => [cell, slope === '/' ? 0 : 1]);
      out.initialRopes = (cfg.initialRopes || []).map(p => p.map(q => q.y * W + q.x));
      out.initialStops = (cfg.initialRopes || []).map((_, i) => (cfg.initialStops?.[i] || []).slice());
      out.initialPlan = cfg.initialRopes?.length && cfg.initialPlan ? cfg.initialPlan.slice() : null;
      return out;
    })();
    const c = { seed: c0.seed, cfg: plain };
    // the JS again from the plain form alone, as the fixture's cases are
    const ref2 = D.run(ref.L, c);
    const want = D.outWords(ref2.out);
    if (ref2.draws !== c0.draws || JSON.stringify(ref2.out) !== JSON.stringify(D.plainOut(c0.raw, c0.cfg))) { bad++; console.log(`call ${k} (${c0.from}): the plain form does not replay in the JS`); continue; }
    const input = D.words(c);
    new Int32Array(x.mem.buffer, IN, input.ints.length).set(input.ints);
    const f = new DataView(x.mem.buffer, FIN); input.doubles.forEach((v, i) => f.setFloat64(8 * i, v, true));
    let got;
    try { got = x.weave(); } catch (e) { bad++; console.log(`call ${k} (${c0.from}, ${plain.W}x${plain.H}): trap: ${e.message}`); continue; }
    const have = Array.from(new Int32Array(x.mem.buffer, OUT, want.length));
    if (!ref2.out) nulls++;
    if (plain.initialRopes.length) cores++;
    if (plain.mirrors.length) mirrors++;
    maxArea = Math.max(maxArea, plain.W * plain.H);
    if (!(want.every((v, i) => v === have[i]) && (x.draws() >>> 0) === ref2.draws)) { bad++; console.log(`call ${k} (${c0.from}, ${plain.W}x${plain.H}): differs (draws ${x.draws() >>> 0} vs ${ref2.draws})`); }
  }
  console.log(`${bad ? 'FAIL' : 'ok  '} weave on big boards: ${calls.length} calls from ${specs.length} specifications (${mirrors} with mirrors, ${cores} with a core, ${nulls} null, largest ${maxArea} cells, ${errors} JS errors), ${bad} mismatches (JS ${((t1 - t0) / 1000).toFixed(1)} s, all ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(bad ? 1 : 0);
}
