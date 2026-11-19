// G7's review: the game's hints and auto-solve (guide) and the live features (reachableFeatures)
// on the boards only the port makes: the 120 levels of its own Journey (journey.ents's specs_port,
// 60 of them Hex maps the JS never made) and, with --codes, the levels of custom set codes made by
// core.wasm. Each answer of core.wasm through web/generator.js against game-engine.js at 9e69e3a,
// exactly (solved, moves, nodes; the feature keys), at every position of R.positions (each prefix of
// the plan and 20 of random play), guide at budgets 900 and 5000 with no preferred order and with
// the rest of the plan preferred, features at 10000.
//
//   node check-g7-review-assist.cjs [--wasm ../core.wasm] [--codes U3-H-1-100-14-12-6-MS-X,...] [--controls]
//
// --controls spoils one answer of each kind and must report each.
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const WASM = path.resolve(opt('--wasm', path.join(__dirname, '../core.wasm')));
const { G } = R.js();
globalThis.MFGame = G;
const MF = require(path.join(__dirname, '../../../web/generator.js'));
const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(WASM)), {}).exports;
if (x.t_js_mode) x.t_js_mode(0);
const gen = MF.wrap(x, 'wasm');
const controls = args.includes('--controls');

const boards = [];
for (let i = 0; i < 120; i++) boards.push({ name: 'J' + (i + 1), ...gen.generate({ kind: 'journey', index: i }) });
for (const code of (opt('--codes', '') || '').split(',').filter(Boolean)) {
  const o = G.parseCode(code);
  for (let i = 0; i < o.count; i++) boards.push({ name: code + '#' + i, ...gen.generate({ ...o, index: i }) });
}
let cmp = 0, bad = 0, positions = 0;
const t = Date.now();
const spoiled = { guide: false, features: false };
for (const b of boards) {
  for (const p of R.positions(b)) {
    positions++;
    const rest = b.plan.slice(p.taps.length);
    for (const budget of [900, 5000]) for (const prefer of [[], rest]) {
      const want = G.guide(b, p.paths, budget, prefer), got = gen.guide(b, p.paths, budget, prefer);
      let g = JSON.stringify([got.solved, got.moves, got.nodes]);
      if (controls && !spoiled.guide) { g = g.replace(/\d+\]$/, n => (parseInt(n) + 1) + ']'); spoiled.guide = true; }
      cmp++;
      if (g !== JSON.stringify([want.solved, want.moves, want.nodes])) { bad++; if (bad <= 10) console.log(`DIFFERS ${b.name} ${p.from} guide ${budget} prefer ${prefer.length}: wasm ${g}, JS ${JSON.stringify([want.solved, want.moves, want.nodes])}`); }
    }
    if (b.mirrors.length || b.springs.length) {
      const want = JSON.stringify([...G.reachableFeatures(b, p.paths, 10000)].sort());
      let got = JSON.stringify(gen.reachableFeatures(b, p.paths, 10000).sort());
      if (controls && !spoiled.features) { got = got.replace(/^\[/, '["0,0",'); spoiled.features = true; }
      cmp++;
      if (got !== want) { bad++; if (bad <= 10) console.log(`DIFFERS ${b.name} ${p.from} features: wasm ${got}, JS ${want}`); }
    }
  }
}
console.log(`${path.basename(WASM)}: ${boards.length} boards (${boards.filter(b => b.grid === 'hex').length} Hex, ${boards.filter(b => b.mirrors.length || b.springs.length).length} with mechanics), ${positions} positions, ${cmp} answers compared, ${bad} differ (${((Date.now() - t) / 1000).toFixed(1)} s)${controls ? ' [controls: must differ in 2]' : ''}`);
process.exitCode = controls ? (bad === 2 ? 0 : 1) : (bad ? 1 : 0);
