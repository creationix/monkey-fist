// What freezing the port's 120 Journey levels as data would cost, so that every build of the game (core.wasm,
// MoonBit's JS build, grid-generator.js) shows the same Journey: the port's Journey differs from the JS game's
// at 82 of 120 positions (60 of 120 maps, all Hex), and a fallback build generates the JS game's.
//
//   node journey-freeze-cost.cjs [--wasm ../core.wasm]
//
// The levels are made by core.wasm (generate(i) of J3-MONKEYFIST, decoded as web/generator.js does) and encoded:
//   1. JSON of the boards as the game holds them ({grid, W, H, par, exact, ropes, mirrors, springs, plan}),
//      what a JS file of frozen levels would carry for the fallbacks;
//   2. compact JSON: the same as arrays of numbers;
//   3. packed bytes: a byte a value (counts unsigned, coordinates signed: every Journey value fits), the form a data
//      block in the wasm would take;
//   4. the same for the 60 Hex levels alone: with the port's table (fixtures/journey-port.js) in place of
//      grid-journey.js, the JS generator makes the port's 60 square levels itself (square generation is the
//      JS's, draw for draw), so only the Hex levels need freezing.
// Each with gzip -9. The layout key and the stored measurements are left out: both follow from the board.
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const WASM = path.resolve(opt('--wasm', path.join(__dirname, '../core.wasm')));
const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(WASM)), {}).exports;
// The words are decoded as web/generator.js's decode reads them (its wrap is private to its closure).
const push = s => { x.in_reset(); for (let i = 0; i < s.length; i++) x.in_push(s.charCodeAt(i)); };
const read = () => { const n = x.out_len(), out = new Array(n); for (let i = 0; i < n; i++) out[i] = x.out_get(i); return out; };
function level(i) {
  push('J3-MONKEYFIST'); if (!x.generate(i)) throw Error('no level ' + i);
  const out = read(); let k = 0; const next = () => out[k++];
  const hex = next() === 1, W = next(), H = next(), par = next(), exact = next() === 1;
  const ropes = Array.from({ length: next() }, () => Array.from({ length: next() }, () => ({ q: next(), r: next() })));
  const mirrors = Array.from({ length: next() }, () => { const q = next(), r = next(), kind = next(); return hex ? { cell: { q, r }, axis: kind } : { cell: { q, r }, slope: kind ? '\\' : '/' }; });
  const springs = Array.from({ length: next() }, () => ({ q: next(), r: next() }));
  const plan = Array.from({ length: next() }, () => next());
  return { grid: hex ? 'hex' : 'square', W, H, par, exact, ropes, mirrors, springs, plan };
}
const levels = Array.from({ length: 120 }, (_, i) => level(i));
const compact = l => [l.grid === 'hex' ? 1 : 0, l.W, l.H, l.par, +l.exact, l.ropes.map(r => r.flatMap(c => [c.q, c.r])),
  l.mirrors.map(m => [m.cell.q, m.cell.r, l.grid === 'hex' ? m.axis : m.slope === '\\' ? 1 : 0]), l.springs.flatMap(c => [c.q, c.r]), l.plan];
function packed(ls) {
  const b = [];
  const u8 = v => { if (v < 0 || v > 255 || !Number.isInteger(v)) throw Error('not a byte: ' + v); b.push(v); };
  const i8 = v => u8(v + 128);  // a coordinate (Hex columns can be negative), as a signed byte
  for (const l of ls) {
    [l.grid === 'hex' ? 1 : 0, l.W, l.H, l.par, +l.exact, l.ropes.length].forEach(u8);
    for (const r of l.ropes) { u8(r.length); for (const c of r) { i8(c.q); i8(c.r); } }
    u8(l.mirrors.length); for (const m of l.mirrors) { i8(m.cell.q); i8(m.cell.r); u8(l.grid === 'hex' ? m.axis : m.slope === '\\' ? 1 : 0); }
    u8(l.springs.length); for (const c of l.springs) { i8(c.q); i8(c.r); }
    u8(l.plan.length); l.plan.forEach(u8);
  }
  return Buffer.from(b);
}
const gz = buf => zlib.gzipSync(buf, { level: 9 }).length;
const row = (what, buf) => console.log(`  ${what.padEnd(64)} ${String(buf.length).padStart(8)} ${String(gz(buf)).padStart(8)}`);
const hexOnly = levels.filter(l => l.grid === 'hex');
console.log(`${path.basename(WASM)}: the 120 Journey levels (${hexOnly.length} Hex); ropes ${levels.reduce((a, l) => a + l.ropes.length, 0)}, cells ${levels.reduce((a, l) => a + l.ropes.reduce((s, r) => s + r.length, 0), 0)}, plan moves ${levels.reduce((a, l) => a + l.plan.length, 0)}`);
console.log('  encoding'.padEnd(66) + '   bytes  gzip -9');
row('JSON of the boards (a JS file for the fallbacks), all 120', Buffer.from(JSON.stringify(levels)));
row('compact JSON (arrays of numbers), all 120', Buffer.from(JSON.stringify(levels.map(compact))));
row('packed bytes (a wasm data block), all 120', packed(levels));
row('compact JSON, the 60 Hex levels alone', Buffer.from(JSON.stringify(hexOnly.map(compact))));
row('packed bytes, the 60 Hex levels alone', packed(hexOnly));
const table = path.join(__dirname, 'fixtures/journey-port.js');
row("the port's Journey table (fixtures/journey-port.js, for grid-journey.js)", fs.readFileSync(table));
const ref = path.join(process.env.MF_REF || '/home/user/mf-core-scratch/ref-9e69e3a', 'grid-journey.js');
if (fs.existsSync(ref)) row("(the JS game's grid-journey.js, for scale)", fs.readFileSync(ref));
// Base64 of the packed bytes, as a JS string the fallback would decode.
row('packed bytes as base64 in a JS string, all 120', Buffer.from(packed(levels).toString('base64')));
