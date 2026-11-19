// Verification: whole levels of set codes with seeds of my own, the JS game (G.generate at 9e69e3a)
// against an Encantis wasm through the game's own glue (web/generator.js wrap/generate).
//   node exact-gen.cjs <wasm> <mode: js|port> <code> <count> [<code> <count> ...]
// mode js:   every level must equal the JS's, field by field (board, plan, par, exact, layoutKey,
//            coverage, casual wins, challenge, slideStats, mechanicStats).
// mode port: square levels must equal the JS's; Hex levels are checked by the JS's kernels instead:
//            plan replays to an empty board, F.valid, F.coverage equals, win rate is one attempt's
//            F.casualRate, featureStats equal, challenge from work and wins.
'use strict';
const fs = require('fs'), path = require('path');
const ORA = '/home/user/mf-verify/moonbit/encantis/core/oracle';
const R = require(path.join(ORA, 'ref.cjs'));
const { G, F, L } = R.js();
globalThis.MFGame = G;
const MF = require('/home/user/mf-verify/moonbit/web/generator.js');
const [wasmFile, mode, ...rest] = process.argv.slice(2);
const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(wasmFile)), {}).exports;
if (WebAssembly.Module.imports(new WebAssembly.Module(fs.readFileSync(wasmFile))).length) throw Error('imports');
const gen = MF.wrap(x, 'wasm');
const pick = b => JSON.stringify({ grid: b.grid, W: b.W, H: b.H, ropes: b.ropes.map(p => p.map(c => [c.q, c.r])),
  mirrors: b.mirrors.map(m => [m.cell.q, m.cell.r, m.axis ?? m.slope]), springs: b.springs.map(p => [p.q, p.r]),
  plan: b.plan, par: b.par, exact: !!b.exact, layoutKey: b.layoutKey, coverage: b.coverage, wins: b.play.casualWins,
  challenge: b.play.challenge, work: b.play.work,
  ss: [b.slideStats.manualSlides, b.slideStats.manualBounces, b.slideStats.repeatedRopes, b.slideStats.automaticRopes],
  mech: b.mechanicStats || null });
const QH = require(path.join(ORA, 'quality-hexbuild.cjs'));
function problems(lv, spec) {
  const bad = [...QH.levelProblems(lv, spec)];
  if (!F.valid(lv)) bad.push('F.valid');
  const cov = F.coverage(lv); if (cov !== lv.coverage) bad.push('coverage');
  if (lv.mirrors.length || lv.springs.length) {
    const fs_ = F.featureStats(lv, lv.plan, lv.par, G);
    if (JSON.stringify(fs_) !== JSON.stringify(lv.mechanicStats)) bad.push('featureStats');
  }
  if (!spec.colossal) {
    let ok = false;
    for (let a = 0; a < 10 && !ok; a++) ok = F.casualRate(lv, G, L.mulberry32(L.hashString('casual/' + spec.seed + '/' + a)), lv.springs.length ? 10 : 32) === lv.play.casualWins;
    if (!ok) bad.push('casual wins');
  }
  const ch = Number(F.challengeOf(lv.play.work, lv.play.casualWins).toFixed(3));
  if (ch !== lv.play.challenge) bad.push('challenge');
  return bad;
}
let same = 0, diff = 0, hexChecked = 0, hexBad = 0, hexSame = 0, none = 0, msJ = 0, msW = 0;
for (let k = 0; k < rest.length; k += 2) {
  const code = rest[k], n = Number(rest[k + 1]), o = G.parseCode(code);
  if (!o) throw Error('bad code ' + code);
  for (let i = 0; i < n; i++) {
    let t = performance.now(), js = null, w = null;
    try { js = G.generate({ ...o, index: i }); } catch (e) { if (!/densely|No board/.test(e.message)) throw e; }
    msJ += performance.now() - t; t = performance.now();
    try { w = gen.generate({ ...o, index: i }); } catch (e) { if (!/No board fits/.test(e.message)) throw e; }
    msW += performance.now() - t;
    if (!js && !w) { none++; same++; continue; }
    const eq = js && w && pick(js) === pick(w);
    const hex = (w || js).grid === 'hex';
    if (mode === 'port' && hex) {
      if (eq) hexSame++;
      if (!w) { hexBad++; console.log('PORT NONE', code, i); continue; }
      const spec = G.spec(o, i); hexChecked++;
      const bad = problems(w, spec);
      if (bad.length) { hexBad++; console.log('HEX INVALID', code, i, bad.join(',')); }
      continue;
    }
    if (eq) same++; else { diff++; console.log('DIFFERS', code, i, js ? '' : 'js none', w ? '' : 'wasm none'); }
  }
}
console.log(JSON.stringify({ wasm: path.basename(wasmFile), mode, equal: same, differ: diff, noneBoth: none, hexChecked, hexInvalid: hexBad, hexEqualAnyway: hexSame,
  jsSeconds: +(msJ / 1000).toFixed(1), wasmSeconds: +(msW / 1000).toFixed(2) }));
process.exitCode = diff || hexBad ? 1 : 0;
