// Generates the Hex levels of fixtures/g3-review-boards.jsonl (check-g3-review.cjs's "gen" set)
// with the JS game at 9e69e3a (through ref.cjs's checkout), one JSON line per level: 48x48
// colossal at difficulty 1, 50 and 100 with and without mirrors (the most ropes a code gives:
// 224), 4x4, 8x8, 4x30, 30x4, 8x48, 48x8, Hex levels of mixed codes, and 100 random Hex and
// mixed codes from a fixed seed (no springs: the offset kernels are for boards without them).
// Levels already in the output are kept, so a killed run carries on. About 60 s of JS.
//   node moonbit/encantis/core/oracle/gen-g3-review-boards.cjs out.jsonl [random count]
// The fixture is these 112 levels, then the 48 Hex levels without springs of G2's review's 300
// random codes (its gen300.jsonl, outside the repository), less any level of reference.json or
// of g1-extra-boards.jsonl (by layoutKey): 160 levels.
'use strict';
const fs = require('fs');
const R = require('./ref.cjs');
const { G } = R.js();
const out = process.argv[2], nrandom = +(process.argv[3] || 100);
if (!out) { console.error('usage: node gen-g3-review-boards.cjs out.jsonl [random count]'); process.exit(2); }
const pick = b => ({ grid: b.grid, W: b.W, H: b.H, ropes: b.ropes.map(p => p.map(c => [c.q, c.r])),
  mirrors: b.mirrors.map(m => [m.cell.q, m.cell.r, m.axis ?? m.slope]), springs: b.springs.map(p => [p.q, p.r]),
  plan: b.plan, par: b.par, exact: b.exact, layoutKey: b.layoutKey });
const fixed = [
  ['U3-H-1-1-48-48-1-C-LOW', 0], ['U3-H-100-100-48-48-1-C-HIGH', 0], ['U3-H-1-1-48-48-1-MC-LOWM', 0], ['U3-H-100-100-48-48-1-MC-HIGHM', 0],
  ['U3-H-50-50-48-48-1-MC-MID', 0], ['U3-H-1-100-4-4-20-N-TINY', 3], ['U3-H-1-100-4-4-20-N-TINY', 17], ['U3-H-1-100-8-8-20-M-SMALLM', 2],
  ['U3-H-1-100-8-8-20-M-SMALLM', 19], ['U3-H-1-100-4-30-10-C-TALL', 5], ['U3-H-1-100-30-4-10-C-WIDE', 5], ['U3-H-1-100-8-48-4-MC-TALLM', 3],
  ['U3-H-1-100-48-8-4-MC-WIDEM', 3], ['U3-M-1-100-12-12-10-M-MIXED', 1], ['U3-M-1-100-12-12-10-M-MIXED', 7],
];
const r = R.mulberry32(0x6E3);
const rp = a => a[Math.floor(r() * a.length)];
const codes = [...fixed];
for (let i = 0; i < nrandom; i++) {
  const mirrors = r() < 0.6, colossal = r() < 0.15;
  const lo = mirrors ? 8 : 4, hi = colossal ? 36 : 16;
  const min = 1 + Math.floor(r() * 100), max = min + Math.floor(r() * (101 - min)), count = 1 + Math.floor(r() * 30);
  const seed = Array.from({ length: 1 + Math.floor(r() * 12) }, () => rp('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')).join('');
  const flags = (mirrors ? 'M' : '') + (colossal ? 'C' : '') || 'N';
  const grid = r() < 0.85 ? 'H' : 'M';
  let index = Math.floor(r() * count);
  if (grid === 'M') index = index | 1;   // mixed: odd indexes are Hex
  if (index >= count) continue;
  const code = ['U3', grid, min, max, lo + Math.floor(r() * (hi - lo + 1)), lo + Math.floor(r() * (hi - lo + 1)), count, flags, seed].join('-');
  codes.push([code, index]);
}
const done = new Set();
if (fs.existsSync(out)) for (const l of fs.readFileSync(out, 'utf8').split('\n')) if (l) { const j = JSON.parse(l); done.add(j.code + '#' + j.index); }
for (const [code, index] of codes) {
  if (done.has(code + '#' + index)) continue;
  const o = G.parseCode(code); if (!o) { console.error('invalid', code); continue; }
  const t = Date.now();
  let b;
  try { b = G.generate({ ...o, index }); } catch (e) { console.error(code, index, e.message); continue; }
  if (!b) { console.error('no board', code, index); continue; }
  if (b.grid !== 'hex' || b.springs.length) { console.error('not a hex board without springs', code, index); continue; }
  fs.appendFileSync(out, JSON.stringify({ code, index, ...pick(b), ms: Date.now() - t }) + '\n');
  console.log(code, index, b.W + 'x' + b.H, b.ropes.length + ' ropes', b.mirrors.length + ' mirrors', Date.now() - t, 'ms');
}
