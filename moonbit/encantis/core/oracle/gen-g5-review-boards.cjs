// G5's review: writes fixtures/g5-review-boards.jsonl with the JS game at 9e69e3a (through ref.cjs's
// checkout): boards with springs (spinners), where taps, solve, replay, frozen and the hints run on full
// geometry, at the sizes the earlier fixtures lack: 8x8 with springs only, strips, 24x24 and 32x32
// with springs, 48x48 and 48x40 colossal with springs on both grids, difficulty 1 to 100; then 40
// random codes that always have springs (up to 24x24, or 48x48 colossal). One JSON line per board,
// as gen-extra-boards.cjs writes them. Lines already in the file are kept, so a killed run carries on.
//   node moonbit/encantis/core/oracle/gen-g5-review-boards.cjs [out.jsonl] [random count]
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs');
const { G } = R.js();
const out = process.argv[2] || path.join(__dirname, 'fixtures/g5-review-boards.jsonl'), nrandom = +(process.argv[3] || 40);
const pick = b => ({ grid: b.grid, W: b.W, H: b.H, ropes: b.ropes.map(p => p.map(c => [c.q, c.r])),
  mirrors: b.mirrors.map(m => [m.cell.q, m.cell.r, m.axis ?? m.slope]), springs: b.springs.map(p => [p.q, p.r]),
  plan: b.plan, par: b.par, exact: b.exact, layoutKey: b.layoutKey });
const fixed = [
  ['U3-S-1-100-8-8-10-S-SPRUNG', 0], ['U3-S-1-100-8-8-10-S-SPRUNG', 9], ['U3-H-1-100-8-8-10-S-SPRUNG', 0], ['U3-H-1-100-8-8-10-S-SPRUNG', 9],
  ['U3-S-1-100-8-8-10-MS-SPRUNG', 4], ['U3-H-1-100-8-8-10-MS-SPRUNG', 7],
  ['U3-S-1-100-8-24-6-S-STRIP', 5], ['U3-H-1-100-24-8-6-S-STRIP', 5], ['U3-M-1-100-24-8-6-MS-STRIP', 2], ['U3-M-1-100-8-24-6-MS-STRIP', 3],
  ['U3-S-100-100-12-16-1-MS-DEEP', 0], ['U3-H-100-100-12-16-1-MS-DEEP', 0], ['U3-S-100-100-16-12-1-S-DEEP', 0], ['U3-H-100-100-16-12-1-S-DEEP', 0],
  ['U3-S-1-1-24-24-1-S-WIDE', 0], ['U3-H-1-1-24-24-1-S-WIDE', 0], ['U3-S-50-50-24-24-1-MS-WIDE', 0], ['U3-H-50-50-24-24-1-MS-WIDE', 0],
  ['U3-S-100-100-24-24-1-S-WIDE', 0], ['U3-H-100-100-24-24-1-S-WIDE', 0],
  ['U3-S-60-60-32-32-1-MSC-BIG', 0], ['U3-H-60-60-32-32-1-MSC-BIG', 0], ['U3-S-20-20-32-32-1-SC-BIG', 0], ['U3-H-20-20-32-32-1-SC-BIG', 0],
  ['U3-S-30-30-48-48-1-SC-HUGE', 0], ['U3-H-30-30-48-48-1-SC-HUGE', 0], ['U3-S-95-95-48-48-1-MSC-HUGE', 0], ['U3-H-95-95-48-48-1-MSC-HUGE', 0],
  ['U3-S-80-80-48-40-1-MSC-HUGE', 0], ['U3-H-80-80-40-48-1-MSC-HUGE', 0],
];
// random codes with springs, from a fixed seed
const r = R.mulberry32(0x65E5);
const rp = a => a[Math.floor(r() * a.length)];
const codes = [...fixed];
for (let i = 0; i < nrandom; i++) {
  const mirrors = r() < 0.5, colossal = r() < 0.2;
  const lo = 8, hi = colossal ? 48 : 24;
  const min = 1 + Math.floor(r() * 100), max = min + Math.floor(r() * (101 - min)), count = 1 + Math.floor(r() * 30);
  const seed = Array.from({ length: 1 + Math.floor(r() * 12) }, () => rp('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')).join('');
  const flags = (mirrors ? 'M' : '') + 'S' + (colossal ? 'C' : '');
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
  console.log(code, index, b.grid, b.W + 'x' + b.H, 'ropes', b.ropes.length, 'springs', b.springs.length, Date.now() - t, 'ms');
}
