// G7's robustness checks of the core's exports (PORT-PLAN §5.1, G7's oracle part 4):
//   1. every export leaves the stack at its base (test/g7.wasm's stack_used() is 0 after each), in
//      both modes, and none uses more of the 16 MiB than stack_peak() says;
//   2. a trap does not break the next call: traps forced in in_push (past the 64 Ki words of input),
//      in guide and features (position words cut short, or with a count past the words), in
//      generate_spec (a seed with a code unit past a byte), and in measure (the same seed), each
//      followed by generate, measure, guide and the bench_* hooks, whose answers must equal those of
//      a fresh instance that never trapped;
//   3. invalid codes give 0 (parity.test.cjs's five, and more), and leave the current level and the
//      output words as they were; generate_spec of a board with no cells or past 48x48 gives 0;
//      measure and the bench_* hooks give -1 before the first level.
// Run on core.wasm and on test/g7.wasm (both modes):
//   node check-g7-robust.cjs [--wasm ../core.wasm]
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const WASMS = opt('--wasm', null) ? [opt('--wasm')] : [path.join(__dirname, '../core.wasm'), path.join(__dirname, '../test/g7.wasm')];
let fails = 0, checks = 0;
const ok = (cond, what) => { checks++; if (!cond) { fails++; console.log('FAIL', what); } };

function instance(file, js) {
  const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(file)), {}).exports;
  if (x.t_js_mode) x.t_js_mode(js ? 1 : 0);
  return x;
}
const text = (x, s) => { x.in_reset(); for (let i = 0; i < s.length; i++) x.in_push(s.charCodeAt(i)); };
const words = (x, ws) => { x.in_reset(); for (const w of ws) x.in_push(w | 0); };
const out = x => { const n = x.out_len(), o = new Array(n); for (let i = 0; i < n; i++) o[i] = x.out_get(i); return o; };
const traps = f => { try { f(); return false; } catch (e) { return e instanceof WebAssembly.RuntimeError; } };

// A run of every export after a level of the code: what a fresh instance must give too.
function session(x, code, i) {
  const r = {};
  text(x, code); r.generate = x.generate(i); r.level = out(x);
  r.f = [x.outf_get(0), x.outf_get(1), x.outf_get(2)];
  text(x, 'journey/5/MONKEYFIST/measure/X'); r.measure = x.measure(40);
  r.casual = x.bench_casual(50); r.par = x.bench_par(); r.solve = x.bench_solve(900);
  const b = R.boards()[R.boards().length - 3];
  words(x, R.position(b, b.ropes, b.plan)); x.guide(900); r.guide = out(x);
  words(x, R.position(b)); x.features(10000); r.features = out(x);
  return JSON.stringify(r);
}

for (const file of WASMS) for (const js of file.endsWith('g7.wasm') ? [true, false] : [false]) {
  const name = path.basename(file) + (file.endsWith('g7.wasm') ? (js ? " (the JS's mode)" : " (the port's mode)") : '');
  const fresh = () => instance(file, js);
  let x = fresh();
  const used = () => x.stack_used ? x.stack_used() : 0;
  // 3: before any level
  text(x, 'seed'); ok(x.measure(10) === -1, `${name}: measure before a level`);
  ok(x.bench_casual(10) === -1 && x.bench_par() === -1 && x.bench_solve(100) === -1, `${name}: bench_* before a level`);
  // 1: every export leaves the stack at its base
  const calls = {
    generate: () => { text(x, 'J3-MONKEYFIST'); return x.generate(40); },
    generate_custom: () => { text(x, 'U3-M-1-100-12-12-10-MS-ROBUST'); return x.generate(7); },
    generate_colossal: () => { text(x, 'U3-H-1-100-32-32-3-MC-ROBUST'); return x.generate(1); },
    generate_spec: () => { text(x, 'ROBUSTSEED'); return x.generate_spec(1, 10, 12, 55.5, 1, 1, 0, 2, 1, 0); },
    measure: () => { text(x, 'journey/5/MONKEYFIST/measure/ROBUSTSEED'); return x.measure(96); },
    target_challenge: () => x.target_challenge(42.5), win_ceiling: () => x.win_ceiling(80),
    guide: () => { const b = R.boards()[59]; words(x, R.position(b, b.ropes, b.plan)); return x.guide(5000); },
    features: () => { const b = R.boards()[29]; words(x, R.position(b)); return x.features(10000); },
    bench_casual: () => x.bench_casual(100), bench_par: () => x.bench_par(), bench_solve: () => x.bench_solve(2000),
  };
  for (const [k, f] of Object.entries(calls)) {
    const v = f();
    ok(used() === 0, `${name}: ${k} leaves ${used()} bytes on the stack`);
    if (x.stack_peak) ok(x.stack_peak() > 0 && x.stack_peak() <= 16777216, `${name}: ${k}'s stack peak ${x.stack_peak()}`);
    ok(v !== undefined || ['guide', 'features'].includes(k), `${name}: ${k} answers`);
  }
  // 3: invalid codes give 0 and change nothing
  text(x, 'J3-MONKEYFIST'); x.generate(3);
  const before = out(x), wins = x.outf_get(0);
  text(x, 'journey/5/MONKEYFIST/measure/A'); const m0 = x.measure(30);
  for (const code of ['', 'J2-MONKEYFIST', 'U3-X-1-100-10-14-120-N-SEED', 'U3-S-1-100-6-6-10-M-SEED', 'U3-S-50-10-10-14-10-N-SEED',
    'U3-S-1-100-49-10-10-N-SEED', 'U3-S-1-100-3-10-10-N-SEED', 'U3-S-1-100-10-10-0-N-SEED', 'U3-S-1-100-10-10-10-Q-SEED', 'U3-S-1-100-10-10-10-N-', 'J3-', 'garbage\u0001￿']) {
    text(x, code);
    ok(x.generate(0) === 0, `${name}: invalid code ${JSON.stringify(code)} gives 0`);
    ok(used() === 0, `${name}: invalid code leaves the stack at its base`);
  }
  ok(JSON.stringify(out(x)) === JSON.stringify(before) && x.outf_get(0) === wins, `${name}: invalid codes leave the output words`);
  text(x, 'journey/5/MONKEYFIST/measure/A');
  ok(x.measure(30) === m0, `${name}: invalid codes leave the current level`);
  for (const [w, h] of [[0, 5], [5, 0], [-3, 4], [49, 48], [100, 100], [3000000, 3000000]]) {
    text(x, 'SEED'); ok(x.generate_spec(0, w, h, 50, 0, 0, 0, 0, 0, 0) === 0, `${name}: generate_spec ${w}x${h} gives 0`);
  }
  // 2: traps, then the next calls as on a fresh instance
  const want = session(fresh(), 'J3-MONKEYFIST', 77);
  const trapping = {
    'in_push past the input': () => { x.in_reset(); for (let i = 0; i < 70000; i++) x.in_push(1); },
    'guide on cut words': () => { const b = R.boards()[10]; words(x, R.position(b).slice(0, 25)); x.guide(900); },
    'features on a count past the words': () => { words(x, [0, 6, 6, 1000000, 2, 0, 0]); x.features(100); },
    'generate_spec with a seed past a byte': () => { text(x, 'SEĀD'); x.generate_spec(0, 10, 10, 50, 0, 0, 0, 0, 0, 0); },
    'measure with a seed past a byte': () => { text(x, 'J3-MONKEYFIST'); x.generate(2); text(x, 'm一'); x.measure(10); },
  };
  for (const [k, f] of Object.entries(trapping)) {
    ok(traps(f), `${name}: ${k} traps`);
    ok(session(x, 'J3-MONKEYFIST', 77) === want, `${name}: after a trap in ${k}, the next calls answer as a fresh instance's`);
    ok(used() === 0, `${name}: after a trap in ${k}, the stack is at its base again`);
  }
  console.log(`${name}: done`);
}
console.log(`robustness: ${checks} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
