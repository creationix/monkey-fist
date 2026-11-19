// G4's review: branch coverage of H.build / intentions (hex/engine.js at 9e69e3a) over a set of build calls:
//   node cov-hexbuild.cjs fixture            the 250 recorded cases (check-hexbuild's)
//   node cov-hexbuild.cjs fixture-seeds N    and N other states each (check-hexbuild --seeds N)
//   node cov-hexbuild.cjs gen CODES PER      every call the generator makes for these codes (shadow's)
// The port mirrors the JS branch for branch, so a branch no call takes is one the exact oracle
// never checks.
'use strict';
const fs = require('fs'), path = require('path');
const O = __dirname;
const R = require(O + '/ref.cjs'), D = require(O + '/dump-hexbuild.cjs'), C = require(O + '/check-hexbuild.cjs');

let src = fs.readFileSync(path.join(R.dir, 'hex/engine.js'), 'utf8');
const swap = (from, to) => {
  const at = src.split(from).length - 1;
  if (at !== 1) throw Error(`appears ${at} times: ${from.slice(0, 70)}`);
  src = src.replace(from, to);
};
const K = [];
const c = k => { K.push(k); return `__c('${k}')`; };
swap('function intentions(level, stops, certificate) {', 'const __cov = {}; const __c = k => { __cov[k] = (__cov[k] || 0) + 1; return true; };\n  function intentions(level, stops, certificate) {');
swap("if (target === -2 || target === from) return false;", `if (target === -2 || target === from) return ${c('step: no move')} && false;`);
swap("if (stop != null ? target < 0 || b.tracks[i][target + b.lengths[i] - 1] !== stop : target !== -1) return false;",
  `if (stop != null ? target < 0 || b.tracks[i][target + b.lengths[i] - 1] !== stop : target !== -1) return (stop != null ? ${c('step: misses its stop')} : ${c('step: must leave, cannot')}) && false; if (stop != null) ${c('step: slides to its stop')};`);
swap("if (certificate) { for (const i of certificate) if (!step(i)) return null; }", `if (certificate) { ${c('intentions: with a certificate')}; for (const i of certificate) if (!step(i)) return ${c('intentions: certificate step fails')} && null; }`);
swap("return b.left ? null : { moves, cost, depth, slides };", `return b.left ? ${c('intentions: board not empty')} && null : { moves, cost, depth, slides };`);
swap("if (head < 0) return null;", `if (head < 0) return ${c('shape: no head in 24 tries')} && null;`);
swap("if (!free(second)) return null;", `if (!free(second)) return ${c('shape: second cell not free')} && null;`);
swap("ahead = bent.size ? rayTrack(level, head, dir, bent, [], turns) : ray(head, dir); if (!ahead) return null;", `ahead = bent.size ? rayTrack(level, head, dir, bent, [], turns) : ray(head, dir); if (!ahead) return ${c('shape: way out passes a cell twice')} && null;`);
swap("if (forward[second] === stamp) return null;", `if (forward[second] === stamp) return ${c('shape: second cell on the way out')} && null;`);
swap("if (!choices.length) break;", `if (!choices.length) { ${c('shape: no room, body cut short')}; break; }`);
swap("if (body.length < minimum) return null;", `if (body.length < minimum) return ${c('shape: shorter than minimum')} && null;`);
swap("if (path.length < 2 || path.some(p => !inside(level, p) || used.has(key(p)))) return null;", `if (path.length < 2 || path.some(p => !inside(level, p) || used.has(key(p)))) return ${c('core: a rope refused')} && null;`);
swap("result = intentions(level, stops, cfg.initialPlan);\n      if (!result) return null;", `${c('core: given')}; result = intentions(level, stops, cfg.initialPlan);\n      if (!result) return ${c('core: certificate fails')} && null;`);
swap("const a = shape(base + Math.floor(rng() * length)); if (!a) continue;", `const a = shape(base + Math.floor(rng() * length)); if (!a) { ${c('knot: first shape none')}; continue; }`);
swap("if (!b || !a.ray.some(c => b.ids.includes(c)) || !b.ray.some(c => a.ids.includes(c))) continue;",
  `if (!b) { ${c('knot: second shape none')}; continue; } if (!b.ray.some(c => a.ids.includes(c))) { ${c("knot: way out of the second misses the first (D1)")}; continue; } if (!a.ray.some(c => b.ids.includes(c))) { ${c("knot: way out of the first misses the second")}; continue; }`);
swap("const target = board.to(id); if (target <= 0) continue;", `const target = board.to(id); if (target <= 0) { ${c('knot: a rope cannot slide')}; continue; }`);
K.push('knot: first rope stops', 'knot: second rope stops');
swap("if (trial) break; stops[id] = null;", `if (trial) { __c(id === i ? 'knot: first rope stops' : 'knot: second rope stops'); break; } ${c('knot: replay fails with this stop')}; stops[id] = null;`);
swap("if (!trial) { level.ropes.length = stops.length = i; continue; }", `if (!trial) { ${c('knot: refused')}; level.ropes.length = stops.length = i; continue; }`);
swap("const idle = (level.mirrors || []).filter(m => !turnedBy.has(cell(m.cell, W))); if (!idle.length) return null;", `const idle = (level.mirrors || []).filter(m => !turnedBy.has(cell(m.cell, W))); if (!idle.length) return ${c('aim: no idle mirror')} && null;`);
swap("for (let k = 0, x = head; k < j && x >= 0; k++, x = neighbours[x][d]) if (!free(x)) return null;\n      return head >= 0 ? { head, dir: d } : null;",
  `for (let k = 0, x = head; k < j && x >= 0; k++, x = neighbours[x][d]) if (!free(x)) return ${c('aim: a cell before the mirror not free')} && null;\n      return head >= 0 ? ${c('aim: aimed')} && { head, dir: d } : ${c('aim: head off the board')} && null;`);
swap("const ahead = ray(c, d); if (!ahead) continue;", `const ahead = ray(c, d); if (!ahead) { ${c('trap: a way out passes a cell twice')}; continue; }`);
swap("const pool = deadly.length ? deadly : spots;", `const pool = deadly.length ? ${c('trap: deadly spots')} && deadly : spots.length ? ${c('trap: only other spots')} && spots : ${c('trap: no spot')} && spots;`);
swap("{ head: spot.c, dir: spot.d }); if (!shaped) continue;", `{ head: spot.c, dir: spot.d }); if (!shaped) { ${c('trap: shape none')}; continue; }`);
swap("if (trial) { const board = compile(level); if (board.to(id) === spot.gap) { board.place(id, spot.gap); fatal = board.dead(); } }",
  `if (trial) { const board = compile(level); if (board.to(id) === spot.gap) { board.place(id, spot.gap); fatal = board.dead(); if (!fatal) ${c('trap: slide into the gap not fatal')}; } else ${c('trap: would not stop in the gap')}; } else ${c('trap: replay fails')};`);
swap("traps++; return true;", `traps++; ${c('trap: laid')}; return true;`);
swap("      return false;\n    }\n    while (", `      ${c('trap: 16 tries, none laid')}; return false;\n    }\n    while (`);
swap("shapeResult = shape(want, undefined, aim && n < 4 ? aimAt() : null); if (!shapeResult) continue;", `shapeResult = shape(want, undefined, aim && n < 4 ? aimAt() : null); if (!shapeResult) { ${c('candidate: shape none')}; continue; }`);
swap("if (!trial) continue;\n        const gain", `if (!trial) { ${c('candidate: replay fails')}; continue; }\n        const gain`);
swap("if (!best || gain > best.gain) best = { ...shapeResult, trial, gain };", `if (best && gain === best.gain) ${c('candidate: ties the best (first kept)')}; if (!best || gain > best.gain) best = { ...shapeResult, trial, gain };`);
swap("if (!best) continue;", `if (!best) { ${c('step: no candidate replays')}; continue; }`);
swap("const certified = intentions(level, stops, result.moves);", `if (covered < area * cfg.coverage) ${c('main: stops at the attempt limit, under coverage')}; else ${c('main: coverage reached')}; if (knots < cfg.knots) ${c('knots: fewer than asked')}; if (traps < (cfg.traps || 0)) ${c('traps: fewer than asked')};\n    const certified = intentions(level, stops, result.moves);`);
swap("cellIndex: cell, reflect, build, compile };", "cellIndex: cell, reflect, build, compile, __cov };");
const m = { exports: {} };
new Function('module', src)(m);
const HC = m.exports;

const mode = process.argv[2] || 'fixture';
const cases = [];
if (mode === 'fixture' || mode === 'fixture-seeds') {
  const n = mode === 'fixture-seeds' ? Number(process.argv[3] || 2) : 0;
  for (const kase of D.read().cases) { cases.push(kase); for (let k = 0; k < n; k++) cases.push({ ...kase, state: C.otherSeed(kase.state, k) }); }
  for (const kase of cases) { const [rng, cfg] = D.argsOf(kase); try { HC.build(rng, cfg); } catch (e) { HC.__cov['(throws) ' + e.message.slice(0, 40)] = (HC.__cov['(throws) ' + e.message.slice(0, 40)] || 0) + 1; } }
} else if (mode === 'gen') {
  const { G, F, H } = R.js();
  H.build = HC.build;
  const per = Number(process.argv[4] || 5);
  for (const code of process.argv[3].split(',')) {
    const o = G.parseCode(code);
    for (let k = 0; k < per; k++) { const s = G.spec(o, Math.round(k * (o.count - 1) / Math.max(1, per - 1))); try { F.generate({ ...s, seed: s.seed + 'SH' }, G); } catch (e) { if (!/densely/.test(e.message)) throw e; } }
  }
}
const all = [...new Set(K)];
console.log(`${mode}: ${cases.length || '(generator)'} calls`);
for (const k of all) console.log(`  ${String(HC.__cov[k] || 0).padStart(10)}  ${k}${HC.__cov[k] ? '' : '   <- never'}`);
for (const k of Object.keys(HC.__cov)) if (!all.includes(k)) console.log(`  ${String(HC.__cov[k]).padStart(10)}  ${k}`);
