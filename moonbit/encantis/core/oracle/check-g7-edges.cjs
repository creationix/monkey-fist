// G7's review: the branches of gridgen.ents that no recorded call takes, against the JS at 9e69e3a
// (test/g7.wasm in the JS's mode, through the same hooks and words as check-g7-units.cjs):
//   1. placeMirrors where the mirrors cannot all fit: tiny and crowded boards, counts up to 16, avoid
//      sets of none, a third, all but one and every interior cell, both grids. Of check-g7-units'
//      837 recorded calls none placed fewer mirrors than asked, so its tries limit (count x 40) and
//      the empty candidate list were never reached;
//   2. woven on boards of 2 to 6 cells a side, both grids, with and without mirrors, the core and
//      long ropes: a board with no interior cell (no mirror can be placed: woven gives up) and
//      sides of 3 (the rope length floor of 7) are never asked for by the game;
//   3. generate_spec at the area limit: 48x48 makes the JS's level (both grids, colossal), past it
//      (48x49, 0x5) gives 0 (departure G7-2).
// The JS's answer comes from capture.cjs's replay of a made-up record (the same raw functions the
// recorded calls run). Every answer is compared as words: the rng state after the call (so the draw
// count), then the result.
//
//   node check-g7-edges.cjs [--wasm ../test/g7.wasm] [--controls] [--no-generate]
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs'), C = require('./capture.cjs');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const WASM = opt('--wasm', path.join(__dirname, '../test/g7.wasm'));
const controls = args.includes('--controls');

const kindOf = (hex, m) => hex ? m.axis : m.slope === '\\' ? 1 : 0;
function boardWords(b) {
  const hex = b.grid === 'hex', out = [hex ? 1 : 0, b.W, b.H, b.ropes.length];
  for (const p of b.ropes) { out.push(p.length); for (const c of p) out.push(c.q, c.r); }
  out.push(b.mirrors.length); for (const m of b.mirrors) out.push(m.cell.q, m.cell.r, kindOf(hex, m));
  out.push(b.springs.length); for (const p of b.springs) out.push(p.q, p.r);
  out.push(b.plan.length, ...b.plan);
  return out;
}
const after = (s, n) => (s + Math.imul(n, 0x6D2B79F5)) | 0;
const hexIndex = (p, w) => p.r * w + p.q + Math.floor(p.r / 2);

const port = W.load(WASM);
if (port.x.t_js_mode) port.x.t_js_mode(1);
let cases = 0, bad = 0, jsThrew = 0, spoiled = 0;
const t0 = Date.now();
function compare(label, want, got) {
  cases++;
  if (controls && spoiled < 1 && cases % 97 === 0) { want = [...want]; want[want.length - 1] ^= 1; spoiled++; }
  if (JSON.stringify(want) !== JSON.stringify(got)) { bad++; if (bad <= 10) console.log(`DIFFERS ${label}: JS ${JSON.stringify(want).slice(0, 120)}, wasm ${JSON.stringify(got).slice(0, 120)}`); }
}
const seedOf = (...xs) => R.js().L.hashString('edges-g7/' + xs.join('/')) | 0;

// --- 1. placeMirrors, crowded ---
let fewer = 0, none = 0;
for (const grid of ['square', 'hex']) for (const [w, h] of [[3, 3], [4, 4], [4, 5], [5, 5], [6, 6], [8, 8], [5, 9]]) for (const count of [1, 2, 4, 8, 16]) for (const av of ['none', 'third', 'one', 'all']) for (let s = 0; s < 3; s++) {
  const hex = grid === 'hex', state = seedOf('pm', grid, w, h, count, av, s), rng = R.mulberry32(state ^ 0x5bd1e995);
  const interior = [];
  for (let r = 1; r < h - 1; r++) for (let col = 1; col < w - 1; col++) interior.push(hex ? r * w + col : r * w + col);
  let avoid = [];
  if (av === 'third') avoid = interior.filter(() => rng() < 1 / 3);
  else if (av === 'one') avoid = interior.slice(1);
  else if (av === 'all') avoid = interior.slice();
  const rec = { name: 'placeMirrors', args: [grid, w, h, count, { $rng: state }, { $set: avoid }], result: null, draws: 0 };
  const js = C.replay(rec);
  if (js.result.length < count) fewer++;
  if (js.result.length === 0) none++;
  const want = [after(state, js.draws), js.result.length, ...js.result.flatMap(m => [m.cell.q, m.cell.r, kindOf(hex, m)])];
  port.push(avoid);
  port.x.t_place_mirrors(state, hex ? 1 : 0, w, h, count);
  compare(`placeMirrors ${grid} ${w}x${h} count ${count} avoid ${av} #${s}`, want, port.out());
}
const pmCases = cases;
console.log(`placeMirrors: ${pmCases} calls (${fewer} placed fewer than asked, ${none} none), ${bad} differ`);

// --- 2. woven on tiny boards ---
let wovenNull = 0;
const badBefore = bad;
for (const grid of ['square', 'hex']) for (const [w, h] of [[2, 2], [3, 3], [2, 5], [3, 6], [5, 2], [6, 3], [4, 4]]) for (const d of [10, 50, 90]) for (const mirrors of [0, 2, 4]) for (const core of [false, true]) for (const longRopes of [false, true]) {
  const state = seedOf('wv', grid, w, h, d, mirrors, core, longRopes), style = Math.abs(state) % 3;
  const rec = { name: 'woven', args: [grid, w, h, d, { $rng: state }, { $ref: 'L.STYLES.' + style }, longRopes ? { longRopes: true } : {}, { $G: 1 }, { mirrors, core }], result: null, draws: 0 };
  let js;
  try { js = C.replay(rec); } catch (e) { jsThrew++; continue; }
  if (!js.result) wovenNull++;
  const want = [after(state, js.draws), ...(js.result ? boardWords(js.result) : [-1])];
  port.x.t_woven(state, grid === 'hex' ? 1 : 0, w, h, d, style, longRopes ? 1 : 0, mirrors, core ? 1 : 0);
  compare(`woven ${grid} ${w}x${h} d ${d} mirrors ${mirrors} core ${core} long ${longRopes}`, want, port.out());
}
console.log(`woven: ${cases - pmCases} calls on boards of 2 to 6 a side (${wovenNull} none; the JS threw on ${jsThrew}, skipped), ${bad - badBefore} differ`);

// --- 3. generate_spec at the area limit ---
if (!args.includes('--no-generate')) {
  const { G, F } = R.js();
  globalThis.MFGame = G;
  const MF = require(path.join(__dirname, '../../../web/generator.js'));
  const gen = MF.wrap(port.x, 'wasm');
  const fp = lv => JSON.stringify([lv.grid, lv.W, lv.H, lv.ropes, lv.mirrors, lv.springs, lv.plan, lv.par, !!lv.exact, lv.coverage, lv.play.casualWins, lv.play.challenge]);
  for (const grid of ['square', 'hex']) {
    const spec = { grid, W: 48, H: 48, difficulty: 70, seed: 'EDGES48' + grid.toUpperCase(), colossal: true, mirrors: true };
    let a; try { a = fp(gen.generateSpec(spec)); } catch (e) { a = 'none'; }
    let b; try { b = fp(F.generate(spec, G)); } catch (e) { b = 'none'; }
    compare(`generate_spec ${grid} 48x48 colossal`, [b], [a]);
  }
  for (const [w, h] of [[48, 49], [49, 48], [0, 5], [5, 0], [-1, 5], [2305, 1]]) {
    port.pushText('EDGES');
    compare(`generate_spec ${w}x${h} gives 0`, [0], [port.x.generate_spec(0, w, h, 50, 0, 0, 0, 0, 0, 1)]);
  }
}
console.log(`${path.basename(WASM)}: ${cases} cases, ${bad} differ (${((Date.now() - t0) / 1000).toFixed(1)} s)${controls ? ` [controls: ${spoiled} spoiled, must differ in ${spoiled}]` : ''}`);
process.exitCode = controls ? (bad === spoiled && spoiled > 0 ? 0 : 1) : (bad ? 1 : 0);
