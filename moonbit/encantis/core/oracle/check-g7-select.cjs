// G7's review: the generator's choices that no level of G7's oracles depends on, checked level for
// level against the JS at 9e69e3a (test/g7.wasm in the JS's mode, through web/generator.js, against
// F.generate). The mutation run (mutate-g7.sh) let through seeded changes of grid_generate's rules
// that the 135 reference levels, the 120 Journey levels and the unit calls never exercise; the review
// searched levels of many seeds for the specs where each change makes another level
// (probes/mutant-reach*.cjs in its scratch), and these are they:
//   - the casual win ceiling's penalty (x 4): 4 specs at difficulty 60 to 100 (m18);
//   - the coverage floor of boards of exactly 48 cells (0.8 at <= 48): 11 specs of 6x8, 8x6, 4x12 (m20);
//   - requireSlide (the Journey's chapter 1): 7 specs of 4x5 (m22);
//   {MORE}
// Each must be the JS's level, field by field (board, plan, par, exact, coverage, casual wins,
// challenge, stats).
//
//   node check-g7-select.cjs [--wasm ../test/g7.wasm]
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const WASM = opt('--wasm', path.join(__dirname, '../test/g7.wasm'));
const { G, F } = R.js();
globalThis.MFGame = G;
const MF = require(path.join(__dirname, '../../../web/generator.js'));
const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(WASM)), {}).exports;
x.t_js_mode(1);
const gen = MF.wrap(x, 'wasm');

// [code, index] of a set, or a generate_spec specification
const CASES = [
  // m18: the ceiling penalty
  ['U3-H-80-100-12-12-100-M-RV7MA', 71], ['U3-S-60-100-12-12-100-N-RV7MB', 52], ['U3-S-60-100-12-12-100-N-RV7MB', 66], ['U3-S-60-100-12-12-100-N-RV7MB', 87],
  // m20: the coverage floor at exactly 48 cells
  ['U3-H-1-100-6-8-100-N-RV7MD', 34], ['U3-H-1-100-6-8-100-N-RV7MD', 49], ['U3-H-1-100-6-8-100-N-RV7MD', 86], ['U3-S-1-100-8-6-100-N-RV7ME', 42],
  ['U3-S-1-100-8-6-100-N-RV7ME', 44], ['U3-S-1-100-8-6-100-N-RV7ME', 55], ['U3-S-1-100-8-6-100-N-RV7ME', 63], ['U3-S-1-100-8-6-100-N-RV7ME', 78],
  ['U3-M-1-100-4-12-100-N-RV7MF', 37], ['U3-M-1-100-4-12-100-N-RV7MF', 38], ['U3-M-1-100-4-12-100-N-RV7MF', 40],
  // m22: requireSlide
  ...[[30.25, 36], [30.25, 234], [40, 244], [40, 280], [30.25, 282], [40, 292], [40, 298]].map(([difficulty, k]) =>
    ({ grid: 'square', W: 4, H: 5, difficulty, seed: 'REACH' + k, requireSlide: true, mirrors: false, springs: false })),
  // {MORE CASES}
];

const fp = lv => JSON.stringify([lv.grid, lv.W, lv.H, lv.ropes, lv.mirrors, lv.springs, lv.plan, lv.par, !!lv.exact, lv.coverage, lv.play.casualWins, lv.play.challenge,
  lv.slideStats.manualSlides, lv.slideStats.manualBounces, lv.slideStats.repeatedRopes, lv.slideStats.automaticRopes, lv.mechanicStats || null]);
let same = 0, bad = 0;
const t = Date.now();
for (const c of CASES) {
  let details, label, make;
  if (Array.isArray(c)) { const o = G.parseCode(c[0]); details = G.spec(o, c[1]); label = c[0] + '#' + c[1]; make = () => gen.generate({ ...o, index: c[1] }); }
  else { details = c; label = JSON.stringify(c); make = () => gen.generateSpec(details); }
  let a, b;
  try { a = fp(make()); } catch (e) { a = /No board fits/.test(e.message) ? 'none' : 'TRAP ' + e.message; }
  try { const lv = F.generate(details, G); b = fp({ ...lv, play: { ...lv.play } }); } catch (e) { b = /densely/.test(e.message) ? 'none' : 'THROWS ' + e.message; }
  if (a === b) same++;
  else { bad++; console.log(`DIFFERS ${label}`); }
}
console.log(`${path.basename(WASM)}: ${CASES.length} levels where the generator's rarer choices decide, ${same} the JS's, ${bad} differ (${((Date.now() - t) / 1000).toFixed(1)} s)`);
process.exitCode = bad ? 1 : 0;
