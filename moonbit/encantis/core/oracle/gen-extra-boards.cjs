// Generates the extra boards of check-g1-wide.cjs with the JS game at 9e69e3a (through
// ref.cjs's checkout), one JSON line per board: edge sizes (4x4, 8x8 with mechanics,
// strips), 48x48 colossal square and Hex, and 60 random codes: 79 boards, about 80 s of
// JS. Lines already in the file are kept, so a killed run carries on.
//   node moonbit/encantis/core/oracle/gen-extra-boards.cjs [out.jsonl] [random count]
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs');
const { G } = R.js();
const out = process.argv[2] || path.join(__dirname, 'fixtures/g1-extra-boards.jsonl'), nrandom = +(process.argv[3] || 60);
const pick = b => ({ grid: b.grid, W: b.W, H: b.H, ropes: b.ropes.map(p => p.map(c => [c.q, c.r])),
  mirrors: b.mirrors.map(m => [m.cell.q, m.cell.r, m.axis ?? m.slope]), springs: b.springs.map(p => [p.q, p.r]),
  plan: b.plan, par: b.par, exact: b.exact, layoutKey: b.layoutKey });
const fixed = [
  ['U3-S-1-100-4-4-10-N-EDGE', 0], ['U3-S-1-100-4-4-10-N-EDGE', 9], ['U3-H-1-100-4-4-10-N-EDGE', 0], ['U3-H-1-100-4-4-10-N-EDGE', 9],
  ['U3-S-1-100-8-8-10-MS-EDGE', 5], ['U3-H-1-100-8-8-10-MS-EDGE', 5], ['U3-S-1-100-8-8-10-M-EDGE', 9], ['U3-H-1-100-8-8-10-S-EDGE', 9],
  ['U3-S-1-100-24-4-10-N-THIN', 4], ['U3-H-1-100-4-24-10-N-THIN', 4], ['U3-M-1-100-24-8-4-MS-THIN', 1],
  ['U3-S-40-40-48-48-1-C-MAX', 0], ['U3-H-40-40-48-48-1-C-MAX', 0], ['U3-S-70-70-48-48-1-MSC-MAX', 0], ['U3-H-70-70-48-48-1-MSC-MAX', 0],
  ['U3-M-1-100-48-8-4-MC-STRIP', 1], ['U3-M-1-100-8-48-4-SC-STRIP', 2], ['U3-S-100-100-24-24-1-M-TOP', 0], ['U3-H-100-100-24-24-1-MS-TOP', 0],
];
// random codes, from a fixed seed (up to 16x16, or 30x30 colossal, so the run stays short)
const r = R.mulberry32(0xC0DE);
const rp = a => a[Math.floor(r() * a.length)];
const codes = [...fixed];
for (let i = 0; i < nrandom; i++) {
  const mirrors = r() < 0.5, springs = r() < 0.5, colossal = r() < 0.15;
  const lo = mirrors || springs ? 8 : 4, hi = colossal ? 30 : 16;
  const min = 1 + Math.floor(r() * 100), max = min + Math.floor(r() * (101 - min)), count = 1 + Math.floor(r() * 30);
  const seed = Array.from({ length: 1 + Math.floor(r() * 12) }, () => rp('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')).join('');
  const flags = (mirrors ? 'M' : '') + (springs ? 'S' : '') + (colossal ? 'C' : '') || 'N';
  const code = ['U3', rp('SHM'), min, max, lo + Math.floor(r() * (hi - lo + 1)), lo + Math.floor(r() * (hi - lo + 1)), count, flags, seed].join('-');
  codes.push([code, Math.floor(r() * count)]);
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
  fs.appendFileSync(out, JSON.stringify({ code, index, ...pick(b), ms: Date.now() - t }) + '\n');
  console.log(code, index, b.W + 'x' + b.H, Date.now() - t, 'ms');
}
