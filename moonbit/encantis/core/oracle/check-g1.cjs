// G1's oracle: the foundations of the Encantis core against the JS at 9e69e3a.
//
//   node moonbit/encantis/core/oracle/check-g1.cjs [test/g1.wasm]   the port
//   node moonbit/encantis/core/oracle/check-g1.cjs --js             the positive control
//   node moonbit/encantis/core/oracle/check-g1.cjs --controls       the negative controls
//
// The checks (PORT-PLAN.md, G1):
//   1 draws    1,000 seeds x 1,000 draws: next() bit for bit, below(n) for n = 1..64,
//              chance(p); draws() equals the calls made
//   2 hashes   hashString and its base 36 (lower and upper case) for the Journey seeds, the
//              cases.cjs codes, grid/3/<code>/<i>, casual/<seed>/<attempt> (0..30),
//              journey/5/MONKEYFIST/measure/<seed> and 10,000 random ASCII strings; the
//              streamed hashes against the whole string's
//   3 pow      Math.pow bit for bit: k/10000 ** 1.3, every Journey difficulty, 100,000 random
//              x in [0, 1], 10,000 wide pairs and the edge cases; then targetChallenge and
//              winCeiling for d = 0 to 100 in steps of 0.01, and some outside
//   4 rounding js_round against Math.round (with -0) on 1M doubles; to_fixed(x, 4) against
//              Number(x.toFixed(4)) on 1M ratios and products; floor_div against Math.floor
//   5 codes    parseCode (accepted or refused, every field, and code(normalize()) of it) on
//              the 5 invalid codes of parity.test, the cases.cjs codes, 2,000 random codes,
//              2,000 mutations and non-ASCII inputs; spec(parseCode(code), i), every field,
//              for the Journey and 2,000 random (code, i)
//   7 abi      every reference board as the position words web/generator.js pushes (taken
//              through its own wrap), back as put_level's words, then read back by
//              read_level and written again; decoded by generator.js's decode; positions
//              read back by read_position
//   6 layout   the JSON text and the layout key of the 135 reference boards
//   8 keys     KeyMap and KeySet against a JS Map over 200,000 operations; passing the
//              reserve traps, and the module works after the trap
//   +          SqMirrors of every square reference board against game-engine.js's map
//
// Where MoonBit and the JS differ, the port follows MoonBit (what ships) and the check
// counts the cases: codes with JS-only spaces or letters that only the JS upper-cases. In
// --js mode those cases expect the JS. Every comparison is exact (Object.is for doubles).
//
// --controls runs each kind of comparison again with one expected value corrupted, on a
// part of its cases, and requires exactly that case to fail, by name.
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs');

const args = process.argv.slice(2);
const JS = args.includes('--js'), CONTROLS = args.includes('--controls');
const WASM = args.find(a => !a.startsWith('--')) || path.join(__dirname, '../test/g1.wasm');
const { L, G, F, K } = R.js();
const repo = path.resolve(__dirname, '../../../..');
const cases = require(path.join(repo, 'moonbit/scripts/cases.cjs'));
const gen = require(path.join(repo, 'moonbit/web/generator.js'));

// --- comparing ---

let corrupt = null;          // { kind, at }: the at-th comparison of kind gets a wrong expected value
const seen = {};             // comparisons made, by kind
let failures = [];
function same(kind, name, want, got) {
  const k = seen[kind] = (seen[kind] || 0) + 1;
  if (corrupt && corrupt.kind === kind && corrupt.at === k) want = spoil(want);
  const ok = typeof want === 'object' ? JSON.stringify(want) === JSON.stringify(got) : Object.is(want, got);
  if (!ok) failures.push({ kind, name, want, got });
  return ok;
}
const spoil = v => typeof v === 'number' ? (Number.isInteger(v) ? v + 1 : v * (1 + 2 ** -50) || 1) : typeof v === 'string' ? v + '?' : Array.isArray(v) ? [...v, 99] : typeof v === 'boolean' ? !v : { ...v, spoiled: 1 };

// A deterministic generator for the cases (not the one under test).
function cases_rng(seed) { const r = R.mulberry32(seed); return () => r(); }

// --- the JS hooks, for --js ---

const units = io => String.fromCharCode(...io.input());
function jsHooks(io) {
  let rng = null, draws = 0, map = null, set = null, room = null;
  const pos = () => readPosition(io.input());
  return {
    draws: () => draws, stack_peak: () => 0,
    t_seed: s => { const r = R.plainMulberry32 ? null : null; rng = R.js().plainMulberry32(s >>> 0); draws = 0; },
    t_next: () => { draws++; return rng(); },
    t_below: n => { draws++; return Math.floor(rng() * n); },
    t_chance: p => { draws++; return rng() < p ? 1 : 0; },
    t_hash: () => L.hashString(units(io)) | 0,
    t_seed_hash: i => L.hashString('grid/3/' + units(io) + '/' + i) | 0,
    t_casual_hash: a => L.hashString('casual/' + units(io) + '/' + a) | 0,
    t_b36: (h, up) => { io.clear(); const t = (h >>> 0).toString(36); for (const c of up ? t.toUpperCase() : t) io.put(c.charCodeAt(0)); },
    t_pow: Math.pow, t_target: F.targetChallenge, t_win: F.winCeiling, t_round: Math.round,
    t_round_i: x => Math.round(x) | 0, t_to_fixed: (x, d) => Number(x.toFixed(d)), t_floor_div: (a, b) => Math.floor(a / b),
    t_parse: () => { io.clear(); const o = G.parseCode(units(io)); if (!o) return 0; for (const w of parseWords(o)) io.put(w); return 1; },
    t_spec: i => { io.clear(); const o = G.parseCode(units(io)); if (!o) return 0; const s = G.spec(o, i); for (const w of specWords(s)) io.put(w); io.putf(0, s.difficulty); return 1; },
    t_layout_json: () => { io.clear(); for (const c of layoutJson(pos().b)) io.put(c.charCodeAt(0)); },
    t_layout_key: () => { io.clear(); for (const c of G.layoutKey(pos().b)) io.put(c.charCodeAt(0)); },
    t_sq_mirrors: () => { io.clear(); const b = pos().b, m = new Map(b.mirrors.map(x => [x.cell.r * b.W + x.cell.q, x.slope === '\\' ? 1 : 0]));
      io.put(...m.keys()); for (let c = 0; c < b.W * b.H; c++) io.put(m.has(c) ? m.get(c) : -1); },
    t_paths: () => { io.clear(); const p = pos(); io.put(p.paths.length); for (const q of p.paths) { io.put(q ? q.length : 0); for (const c of q || []) io.put(c.q, c.r); } io.put(p.prefer.length, ...p.prefer); },
    t_level: (par, exact, again) => { io.clear(); const p = pos(); const b = { ...p.b, plan: p.prefer, par, exact: exact === 1 };
      io.put(...R.levelWords(b, G.layoutKey(b), [1, 2, 3, 4, 5, 6, 7, 8])); io.putf(0, 0.25); io.putf(1, 0.5); io.putf(2, 0.75); },
    t_keys_new: (keys, words) => { map = new Map(); set = new Set(); room = { keys, words, mapWords: 0, setWords: 0 }; },
    t_keys_set: v => { const k = io.input().join(); const fresh = !map.has(k); if (fresh) { if (map.size >= room.keys || room.mapWords + io.input().length > room.words) throw new WebAssembly.RuntimeError('unreachable'); room.mapWords += io.input().length; } map.set(k, v); return fresh ? 1 : 0; },
    t_keys_get: f => { const k = io.input().join(); return map.has(k) ? map.get(k) : f; },
    t_keys_count: () => map.size,
    t_set_add: () => { const k = io.input().join(); if (set.has(k)) return 0; if (set.size >= room.keys || room.setWords + io.input().length > room.words) throw new WebAssembly.RuntimeError('unreachable'); room.setWords += io.input().length; set.add(k); return 1; },
    t_set_has: () => set.has(io.input().join()) ? 1 : 0,
  };
}

// The board, paths and preferred order of position words (read_position's layout).
function readPosition(w) {
  let k = 0; const next = () => w[k++];
  const cells = () => Array.from({ length: next() }, () => ({ q: next(), r: next() }));
  const hex = next() === 1, W_ = next(), H_ = next();
  const ropes = Array.from({ length: next() }, cells);
  const mirrors = Array.from({ length: next() }, () => { const q = next(), r = next(), kind = next(); return hex ? { cell: { q, r }, axis: kind } : { cell: { q, r }, slope: kind ? '\\' : '/' }; });
  const springs = cells();
  const paths = Array.from({ length: next() }, () => { const p = cells(); return p.length ? p : null; });
  const prefer = Array.from({ length: next() }, next);
  return { b: { grid: hex ? 'hex' : 'square', W: W_, H: H_, ropes, mirrors, springs, plan: [] }, paths, prefer };
}

const layoutJson = b => JSON.stringify([b.grid, b.W, b.H, b.ropes.map(p => p.map(c => [c.q, c.r])), (b.mirrors || []).map(m => [m.cell.q, m.cell.r, m.axis ?? m.slope]), (b.springs || []).map(c => [c.q, c.r])]);
const textWords = t => [t.length, ...Array.from(t, c => c.charCodeAt(0))];
const GRID = { square: 'S', hex: 'H', mixed: 'M' };
// t_parse's words for opts o as game-engine.js gives them: journey, grid, min, max, W, H,
// count, mirrors, springs, colossal, the seed, then code(o).
const parseWords = o => [o.kind === 'journey' ? 1 : 0, GRID[o.grid].charCodeAt(0), o.min, o.max, o.width, o.height, o.count,
  o.mirrors ? 1 : 0, o.springs ? 1 : 0, o.colossal ? 1 : 0, ...textWords(o.seed), ...textWords(G.code(o))];
const specWords = s => [s.grid === 'hex' ? 1 : 0, s.W, s.H, s.mirrors ? 1 : 0, s.springs ? 1 : 0, s.requireSlide ? 1 : 0, s.minMirrors || 0, s.minSprings || 0, s.colossal ? 1 : 0, ...textWords(s.seed)];

// What MoonBit's parse_code does with a code: String::trim (tabs, line ends and spaces
// only), to_upper (ASCII only), then the same rules as the JS. Returns the JS opts or null.
function moonbitParse(text) {
  let a = 0, b = text.length;
  const space = c => c === 9 || c === 10 || c === 13 || c === 32;
  while (a < b && space(text.charCodeAt(a))) a++;
  while (b > a && space(text.charCodeAt(b - 1))) b--;
  const t = text.slice(a, b).replace(/[a-z]/g, c => c.toUpperCase());
  // a code unit past ASCII, or one the JS would still trim (\v, \f), is in some part: refused
  if (/[^\x00-\x7f]/.test(t) || t.trim() !== t) return null;
  return G.parseCode(t);   // t is trimmed and upper-cased already: the JS's own trim and upper change nothing
}

// --- the checks ---

function checkDraws(port, frac = 1) {
  const x = port.x, seeds = [];
  for (const l of K) seeds.push(L.hashString('grid/3/' + l.seed));
  const r = cases_rng(1);
  while (seeds.length < 1000) seeds.push(Math.floor(r() * 2 ** 32));
  let n = 0;
  for (const seed of seeds.slice(0, Math.ceil(1000 * frac))) {
    const js = R.js().plainMulberry32(seed);
    x.t_seed(seed | 0);
    for (let k = 0; k < 1000; k++) {
      const name = `seed ${seed} draw ${k}`;
      if (k % 3 === 0) same('next', name, js(), x.t_next());
      else if (k % 3 === 1) { const b = 1 + (k % 64); same('below', name + ` below(${b})`, Math.floor(js() * b), x.t_below(b)); }
      else { const p = (k % 10) / 10; same('chance', name + ` chance(${p})`, js() < p ? 1 : 0, x.t_chance(p)); }
      n++;
    }
    same('draws', `seed ${seed} draws()`, 1000, x.draws());
  }
  return n;
}

function checkHashes(port, frac = 1) {
  const x = port.x, strings = [];
  for (const l of K) strings.push(l.seed, 'journey/5/MONKEYFIST/measure/' + l.seed);
  const codes = cases.map(c => G.code(c.opts));
  strings.push(...codes);
  const r = cases_rng(2);
  for (let i = 0; i < 10000; i++) strings.push(String.fromCharCode(...Array.from({ length: Math.floor(r() * 41) }, () => 32 + Math.floor(r() * 95))));
  let n = 0;
  for (const s of strings.slice(0, Math.ceil(strings.length * frac))) {
    port.pushText(s);
    const h = L.hashString(s);
    same('hash', `hashString(${JSON.stringify(s)})`, h | 0, x.t_hash());
    x.t_b36(h | 0, 0); same('b36', `(${h}).toString(36)`, h.toString(36), port.text());
    x.t_b36(h | 0, 1); same('b36', `(${h}).toString(36).toUpperCase()`, h.toString(36).toUpperCase(), port.text());
    n += 3;
  }
  // streamed: grid/3/<code>/<i> for every case code, every level; casual/<seed>/<attempt>
  for (const [c, code] of codes.entries()) {
    port.pushText(code);
    for (let i = 0; i < Math.ceil(cases[c].opts.count * frac); i++) {
      const whole = 'grid/3/' + code + '/' + i, h = L.hashString(whole) | 0;
      same('hash', `streamed hashString(${JSON.stringify(whole)})`, h, x.t_seed_hash(i)); n++;
    }
    port.pushText('grid/3/' + code + '/0'); const whole = x.t_hash(); port.pushText(code);
    same('hash', `streamed equals whole for grid/3/${code}/0`, whole, x.t_seed_hash(0)); n++;
  }
  for (const l of K.slice(0, Math.ceil(120 * frac))) {
    port.pushText(l.seed);
    for (let a = 0; a <= 30; a++) { const s = 'casual/' + l.seed + '/' + a; same('hash', `streamed hashString(${JSON.stringify(s)})`, L.hashString(s) | 0, x.t_casual_hash(a)); n++; }
  }
  return n;
}

const SPECIAL = [0, -0, 1, -1, 0.5, -0.5, 2, -2, 3, -3, 1.5, 0.1, 1e-10, 1e10, Infinity, -Infinity, NaN, 5e-324, -5e-324, 2.2250738585072014e-308,
  1.7976931348623157e308, -1.7976931348623157e308, 1.0000001, 0.9999999, 1 + 2 ** -52, 1 - 2 ** -53, 2 ** 31, 2 ** 31 + 1, 2 ** 53, 2 ** 64, 1023, 1024, -1074, -1075, 0.3, 1.3, 7];
function checkPow(port, frac = 1) {
  const x = port.x; let n = 0;
  const pw = (a, b, why) => { same('pow', `pow(${a}, ${b}) ${why}`, Math.pow(a, b), x.t_pow(a, b)); n++; };
  for (let k = 0; k <= 10000 * frac; k++) pw(k / 10000, 1.3, `k/10000, k=${k}`);
  for (const l of K) { pw(l.difficulty / 100, 1.3, 'Journey difficulty'); pw(Math.max(0, Math.min(100, l.difficulty)) / 100, 1.3, 'targetChallenge'); }
  const r = cases_rng(3);
  for (let i = 0; i < 100000 * frac; i++) pw(r(), 1.3, 'random x');
  for (let i = 0; i < 10000 * frac; i++) {
    const a = (r() - 0.5) * 2 ** ((r() - 0.5) * 2100), b = (r() < 0.3 ? Math.round((r() - 0.5) * 80) : (r() - 0.5) * 2 ** ((r() - 0.5) * 70));
    pw(a, b, 'wide');
  }
  for (const a of SPECIAL) for (const b of SPECIAL) pw(a, b, 'edge');
  for (let k = 0; k <= 10000 * frac; k++) {
    const d = k / 100;
    same('target', `targetChallenge(${d})`, F.targetChallenge(d), x.t_target(d));
    same('win', `winCeiling(${d})`, F.winCeiling(d), x.t_win(d)); n += 2;
  }
  for (const d of [-5, -0, 100.5, 150, 1e9, -Infinity, Infinity, NaN, ...K.map(l => l.difficulty)]) {
    same('target', `targetChallenge(${d})`, F.targetChallenge(d), x.t_target(d));
    same('win', `winCeiling(${d})`, F.winCeiling(d), x.t_win(d)); n += 2;
  }
  return n;
}

function checkRounding(port, frac = 1) {
  const x = port.x, r = cases_rng(4); let n = 0;
  const xs = [0.49999999999999994, -0.49999999999999994, 2 ** 52 + 0.5, 2 ** 52 - 0.5, -(2 ** 52) + 0.5, -(2 ** 52) - 0.5, 2 ** 53, -0, 0, -0.5, 0.5, -0.3, Infinity, -Infinity, NaN, 1e300, -1e300, 5e-324, -5e-324];
  for (let k = -250000; k < 250000; k++) xs.push(k + 0.5);
  for (let i = 0; i < 250000; i++) xs.push((r() - 0.5) * 2 ** Math.floor(r() * 60));
  for (let i = 0; i < 250000; i++) xs.push(Math.round((r() - 0.5) * 2000) / 4 + (r() < 0.5 ? 2 ** -52 : -(2 ** -52)));
  for (const v of xs.slice(0, Math.ceil(xs.length * frac))) {
    same('round', `Math.round(${v})`, Math.round(v), x.t_round(v)); n++;
    if (Math.abs(v) < 2 ** 31 - 1) { same('round_i', `Math.round(${v}) as i32`, Math.round(v) | 0, x.t_round_i(v)); n++; }
  }
  // to_fixed: ratios a/b of small integers, the products the generator makes, halves
  const fx = [];
  for (let a = 0; a < 1000; a++) for (let b = 1; b <= 1000; b += a % 7 === 0 ? 1 : 3) fx.push(a / b);
  for (let i = 0; fx.length < 900000; i++) { const a = Math.floor(r() * 60), b = 1 + Math.floor(r() * 60), c = Math.floor(r() * 21); fx.push(a / b * (0.4 + 0.6 * c / 20)); }
  for (let k = 0; k < 100000; k++) fx.push((k + 0.5) / 10000);
  for (const v of [0, -0, 1e-7, -1e-7, 0.00005, 0.00015, 1.00005, 123456.78905, 1e15 + 0.3, 1e20, 1e21, 2e21, -1e21, Infinity, NaN, -0.00005, -2.5])
    fx.push(v);
  for (const v of fx.slice(0, Math.ceil(fx.length * frac))) { same('to_fixed', `Number((${v}).toFixed(4))`, Number(v.toFixed(4)), x.t_to_fixed(v, 4)); n++; }
  for (let i = 0; i < 20000 * frac; i++) { const v = r() * 20; same('to_fixed', `Number((${v}).toFixed(3))`, Number(v.toFixed(3)), x.t_to_fixed(v, 3)); n++; }
  for (let a = -1000; a <= 1000; a++) for (let b = 1; b <= 50 * frac; b++) { same('floor_div', `Math.floor(${a} / ${b})`, Math.floor(a / b), x.t_floor_div(a, b)); n++; }
  for (const [a, b] of [[-2147483647, 2], [2147483647, 2], [-1, 2147483647], [-48, 2], [-47, 2]]) { same('floor_div', `Math.floor(${a} / ${b})`, Math.floor(a / b), x.t_floor_div(a, b)); n++; }
  return n;
}

// --- codes ---

function randomCode(r) {
  const pick = a => a[Math.floor(r() * a.length)];
  const mirrors = r() < 0.5, springs = r() < 0.5, colossal = r() < 0.2;
  const lo = mirrors || springs ? 8 : 4, hi = colossal ? 48 : 24;
  const min = 1 + Math.floor(r() * 100), max = min + Math.floor(r() * (101 - min));
  const seed = Array.from({ length: 1 + Math.floor(r() * 12) }, () => pick('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')).join('');
  const flags = (mirrors ? 'M' : '') + (springs ? 'S' : '') + (colossal ? 'C' : '') || 'N';
  return ['U3', pick('SHM'), min, max, lo + Math.floor(r() * (hi - lo + 1)), lo + Math.floor(r() * (hi - lo + 1)), 1 + Math.floor(r() * 200), flags, seed].join('-');
}

// Mutations of a valid code: case, spaces, parts, numbers out of range, flags, seed characters.
function mutate(code, r) {
  const parts = code.split('-'), pick = a => a[Math.floor(r() * a.length)];
  switch (Math.floor(r() * 14)) {
    case 0: return code.toLowerCase();
    case 1: return pick([' ', '\t', '\n', '\r', '  ', ' \t\r\n']) + code + pick(['', ' ', '\n', '\t']);
    case 2: return parts.slice(0, parts.length - 1).join('-');
    case 3: return [...parts, 'X'].join('-');
    case 4: { const p = [...parts]; p[2 + Math.floor(r() * 5)] = String(pick([0, 101, 999, 1000, -1, 7, '07', '007', '0007', ''])); return p.join('-'); }
    case 5: { const p = [...parts]; p[7] = pick(['', 'X', 'SM', 'CM', 'MM', 'NM', 'n', 'msc', 'MSCX', 'N ']); return p.join('-'); }
    case 6: { const p = [...parts]; p[8] = pick(['', 'A-B', 'a_b', 'ABCDEFGHIJKLM', 'ÄB', 'A B', 'A.B', 'abc', 'Z9']); return p.join('-'); }
    case 7: { const p = [...parts]; p[1] = pick(['s', 'h', 'm', 'X', '', 'SS']); return p.join('-'); }
    case 8: { const p = [...parts]; p[0] = pick(['u3', 'U2', 'U33', 'J3', '']); return p.join('-'); }
    case 9: { const p = [...parts]; p[4] = String(pick([3, 4, 7, 8, 24, 25, 48, 49])); p[5] = String(pick([3, 4, 8, 24, 25, 48, 49])); return p.join('-'); }
    case 10: return code.replace('-', '--');
    case 11: return code + '-';
    case 12: { const p = [...parts]; p[2] = String(pick([1, 50, 100])); p[3] = String(pick([1, 49, 100])); return p.join('-'); }
    default: return pick(['j3-monkeyfist', ' J3-MONKEYFIST ', 'J3-MONKEYFIST-', 'J3-MONKEYFISH', 'J3MONKEYFIST']);
  }
}

// Codes with code units past ASCII: JS-only spaces around them, letters whose upper case
// is ASCII in the JS (dotless i, long s, the ligatures), other letters.
function nonAscii(r) {
  const out = [], base = ['U3-S-1-100-10-14-120-MS-SEED', 'J3-MONKEYFIST', 'U3-H-5-50-8-8-10-N-ABC'];
  const spaces = [' ', '﻿', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '　', '\u000b', '\u000c'];
  for (const b of base) for (const s of spaces) out.push(s + b, b + s, s + b + s);
  out.push('U3-S-1-100-10-14-120-MS-ı', 'U3-S-1-100-10-14-120-MS-SEıD', 'U3-S-1-100-10-14-120-Mſ-SEED', 'u3-s-1-100-10-14-120-ſ-x',
    'J3-MONKEYFıſT', 'U3-S-1-100-10-14-120-MS-ﬀ', 'U3-S-1-100-10-14-120-MS-STRAßE', 'U3-S-1-100-10-14-120-MS-ŉ', 'U3-S-1-100-10-14-120-MS-ǰ',
    'U3-S-1-100-10-14-120-MS-K', 'U3-S-1-100-10-14-120-MS-é', 'U3-S-1-100-10-14-120-MS-Ａ', 'U3-S-1١-100-10-14-120-N-X', '😀U3-S-1-100-10-14-120-N-X');
  for (let i = 0; i < 200; i++) { const b = base[i % 3], k = Math.floor(r() * (b.length + 1)); out.push(b.slice(0, k) + String.fromCharCode(128 + Math.floor(r() * 65000)) + b.slice(k)); }
  return out;
}

let divergent = [];
function checkCodes(port, frac = 1) {
  const x = port.x, r = cases_rng(5); let n = 0;
  const texts = ['', 'J2-MONKEYFIST', 'U3-X-1-100-10-14-120-N-SEED', 'U3-S-1-100-6-6-10-M-SEED', 'U3-S-50-10-10-14-10-N-SEED', 'J3-MONKEYFIST', ...cases.map(c => G.code(c.opts))];
  const valid = [];
  for (let i = 0; i < 2000; i++) valid.push(randomCode(r));
  texts.push(...valid);
  for (let i = 0; i < 2000; i++) texts.push(mutate(valid[i], r));
  texts.push(...nonAscii(r));
  divergent = [];
  for (const t of texts.slice(0, Math.ceil(texts.length * frac))) {
    const js = G.parseCode(t), mbt = moonbitParse(t);
    if (JSON.stringify(js) !== JSON.stringify(mbt)) divergent.push(t);
    const want = JS ? js : mbt;
    port.pushText(t);
    const ok = x.t_parse();
    const name = `parseCode(${JSON.stringify(t)})`;
    same('parse', name + ' accepted', !!want, ok === 1); n++;
    if (want && ok === 1) { same('parse', name + ' fields and code', parseWords(want), port.out()); n++; }
  }
  // spec(parseCode(code), i): the Journey, then random codes and indices (some out of range)
  const specs = [];
  for (let i = 0; i < 120; i++) specs.push(['J3-MONKEYFIST', i]);
  for (let k = 0; k < 2000; k++) { const c = valid[k], count = +c.split('-')[6]; specs.push([r() < 0.2 ? c.toLowerCase() : c, r() < 0.1 ? Math.floor(r() * 400) - 100 : Math.floor(r() * count)]); }
  for (const [c, i] of specs.slice(0, Math.ceil(specs.length * frac))) {
    const s = G.spec(G.parseCode(c), i);
    port.pushText(c);
    const name = `spec(parseCode(${JSON.stringify(c)}), ${i})`;
    if (!same('spec', name + ' made', 1, x.t_spec(i))) continue;
    same('spec', name + ' fields', specWords(s), port.out());
    same('spec', name + ' difficulty', s.difficulty, port.outf(0)); n += 2;
  }
  return n;
}

// --- layout, ABI, mirrors ---

function checkLayout(port, frac = 1) {
  const x = port.x; let n = 0;
  for (const b of R.boards().slice(0, Math.ceil(135 * frac))) {
    port.push(R.position(b));
    x.t_layout_json(); same('json', `${b.name} JSON text`, layoutJson(b), port.text());
    x.t_layout_key(); same('key', `${b.name} layoutKey`, b.layoutKey, port.text());
    same('key', `${b.name} layoutKey of game-engine.js`, b.layoutKey, G.layoutKey(b)); n += 3;
  }
  return n;
}

// The words web/generator.js pushes for a position, taken through its own wrap.
function glueWords(b, paths, prefer) {
  const words = [];
  const fakeX = { in_reset: () => { words.length = 0; }, in_push: w => words.push(w), guide: () => {}, out_len: () => 2, out_get: () => 0 };
  gen.wrap(fakeX, 'capture').guide(b, paths, 0, prefer);
  return words;
}

function checkAbi(port, frac = 1) {
  const x = port.x; let n = 0;
  for (const b of R.boards().slice(0, Math.ceil(135 * frac))) {
    const words = glueWords(b, b.ropes, b.plan);
    same('glue', `${b.name} position words: generator.js against ref.cjs`, R.position(b, b.ropes, b.plan), words); n++;
    for (const again of [0, 1]) {
      port.push(words);
      x.t_level(b.par, b.exact ? 1 : 0, again);
      const out = port.out(), name = `${b.name} level words${again ? ', written again from read_level' : ''}`;
      same('level', name, R.levelWords(b, b.layoutKey, [1, 2, 3, 4, 5, 6, 7, 8]), out);
      const d = gen.decode(out, port.outf);
      same('level', name + ', decoded by generator.js', { grid: b.grid, W: b.W, H: b.H, par: b.par, exact: b.exact, ropes: b.ropes, mirrors: b.mirrors, springs: b.springs, plan: b.plan, layoutKey: b.layoutKey, wins: 0.25, coverage: 0.75 },
        { grid: d.grid, W: d.W, H: d.H, par: d.par, exact: d.exact, ropes: d.ropes, mirrors: d.mirrors, springs: d.springs, plan: d.plan, layoutKey: d.layoutKey, wins: d.play.casualWins, coverage: d.coverage });
      n += 2;
    }
    // positions: the plan's prefixes and random play, read back by read_position
    for (const p of R.positions(b, 5)) {
      port.push(glueWords(b, p.paths, p.taps));
      x.t_paths();
      const want = [p.paths.length]; for (const q of p.paths) { want.push(q ? q.length : 0); for (const c of q || []) want.push(c.q, c.r); }
      want.push(p.taps.length, ...p.taps);
      same('paths', `${b.name} position ${p.from}`, want, port.out()); n++;
    }
  }
  return n;
}

function checkMirrors(port, frac = 1) {
  const x = port.x; let n = 0;
  for (const b of R.boards().filter(b => b.grid === 'square').slice(0, Math.ceil(68 * frac))) {
    port.push(R.position(b));
    x.t_sq_mirrors();
    const m = new Map(b.mirrors.map(x => [x.cell.r * b.W + x.cell.q, x.slope === '\\' ? 1 : 0]));
    const want = [...m.keys()]; for (let c = 0; c < b.W * b.H; c++) want.push(m.has(c) ? m.get(c) : -1);
    same('mirrors', `${b.name} SqMirrors`, want, port.out()); n++;
  }
  return n;
}

// --- keys ---

function checkKeys(port, frac = 1) {
  const x = port.x, r = cases_rng(6); let n = 0;
  // 20,000 distinct keys of 1 to 60 words over small values, so prefixes and hashes collide
  const keys = [], have = new Set();
  while (keys.length < 20000) {
    const len = 1 + Math.floor(r() * (r() < 0.5 ? 4 : 60)), k = Array.from({ length: len }, () => Math.floor(r() * (r() < 0.8 ? 4 : 5000)) - 1);
    if (!have.has(k.join())) { have.add(k.join()); keys.push(k); }
  }
  x.t_keys_new(20000, 1000000);
  const map = new Map(), set = new Set();
  const ops = Math.ceil(200000 * frac);
  for (let i = 0; i < ops; i++) {
    const k = keys[Math.floor(r() ** 2 * keys.length)], j = k.join(), op = Math.floor(r() * 5), name = `op ${i} on [${j}]`;
    port.push(k);
    if (op === 0) { const v = Math.floor(r() * 4); same('keys', name + ` set ${v}`, map.has(j) ? 0 : 1, x.t_keys_set(v)); map.set(j, v); }
    else if (op === 1) same('keys', name + ' get', map.has(j) ? map.get(j) : -7, x.t_keys_get(-7));
    else if (op === 2) { same('set', name + ' add', set.has(j) ? 0 : 1, x.t_set_add()); set.add(j); }
    else if (op === 3) same('set', name + ' has', set.has(j) ? 1 : 0, x.t_set_has());
    else same('keys', name + ' count', map.size, x.t_keys_count());
    n++;
  }
  // passing the reserve traps: keys, then words; and the module works after a trap
  const trap = (what, f) => { let t = null; try { f(); } catch (e) { t = e; } same('trap', what + ' traps', true, t instanceof WebAssembly.RuntimeError); n++; };
  x.t_keys_new(4, 1000);
  for (let i = 0; i < 4; i++) { port.push([i, i]); x.t_keys_set(1); }
  port.push([9, 9]);
  trap('a fifth key in a map of 4', () => x.t_keys_set(1));
  trap('a fifth key in a set of 4', () => { for (let i = 0; i < 5; i++) { port.push([i]); x.t_set_add(); } });
  x.t_keys_new(100, 10);
  port.push([1, 2, 3, 4, 5, 6]); x.t_keys_set(1);
  port.push([1, 2, 3, 4, 5]);
  trap('an 11th word in a pool of 10', () => x.t_keys_set(1));
  x.t_keys_new(8, 64);
  port.push([7, 7, 7]);
  same('trap', 'after a trap, a fresh map works', 1, x.t_keys_set(3));
  same('trap', 'after a trap, a fresh map reads back', 3, x.t_keys_get(0)); n += 2;
  return n;
}

const CHECKS = [['1 draws', checkDraws, ['next', 'below', 'chance', 'draws']], ['2 hashes', checkHashes, ['hash', 'b36']],
  ['3 pow', checkPow, ['pow', 'target', 'win']], ['4 rounding', checkRounding, ['round', 'round_i', 'to_fixed', 'floor_div']],
  ['5 codes', checkCodes, ['parse', 'spec']], ['6 layout', checkLayout, ['json', 'key']], ['7 abi', checkAbi, ['glue', 'level', 'paths']],
  ['8 keys', checkKeys, ['keys', 'set', 'trap']], ['+ mirrors', checkMirrors, ['mirrors']]];

function info(port) {
  const lines = [];
  // MoonBit's builds against the JS, where the port and MoonBit differ
  const mbt = W.load(path.join(repo, 'moonbit/dist/gen.wasm')).x;
  let tc = 0, tcn = 0;
  for (let k = 0; k <= 10000; k++) { const d = k / 100; tcn++; if (!Object.is(mbt.target_challenge(d), F.targetChallenge(d))) tc++; }
  lines.push(`MoonBit dist/gen.wasm target_challenge differs from the JS on ${tc} of ${tcn} difficulties (fdlibm pow without V8's change); the port on 0`);
  let refused = 0;
  for (const t of divergent) { const m = moonbitParse(t); if (m) continue; mbt.in_reset(); for (let i = 0; i < t.length; i++) mbt.in_push(t.charCodeAt(i)); if (mbt.generate(0) === 0) refused++; }
  lines.push(`codes MoonBit and the JS read differently: ${divergent.length}; the JS takes them, MoonBit refuses them (by its model), and dist/gen.wasm refuses ${refused} of the ${divergent.filter(t => !moonbitParse(t)).length} the model refuses`);
  const ex = divergent.slice(0, 4).map(t => JSON.stringify(t)).join(', ');
  if (ex) lines.push(`  for instance ${ex}`);
  return lines;
}

function run(port, frac, only) {
  const out = [];
  for (const [name, f, kinds] of CHECKS) {
    if (only && !kinds.includes(only)) continue;
    const before = failures.length, t = Date.now();
    const n = f(port, frac);
    out.push({ name, n, failed: failures.length - before, ms: Date.now() - t });
  }
  return out;
}

if (CONTROLS) {
  // Each kind of comparison, with its 3rd comparison's expected value spoiled, on a part
  // of the cases: exactly that case must fail.
  const port = W.load(WASM);
  let bad = 0;
  for (const [, , kinds] of CHECKS) for (const kind of kinds) {
    failures = []; for (const k in seen) delete seen[k];
    corrupt = { kind, at: ['trap', 'glue', 'draws', 'mirrors'].includes(kind) ? 1 : 3 };
    run(port, 0.02, kind);
    const ours = failures.filter(f => f.kind === kind);
    const ok = failures.length === 1 && ours.length === 1;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} control ${kind}: ${failures.length} failure(s)${ours[0] ? ', named: ' + ours[0].name : ''}`);
  }
  console.log(bad ? `${bad} control(s) did not fail as they should` : 'every control failed, and named its case');
  process.exit(bad ? 1 : 0);
}

const port = JS ? W.fake(jsHooks) : W.load(WASM);
const t0 = Date.now();
const results = run(port, 1);
for (const r of results) console.log(`${r.failed ? 'FAIL' : 'ok  '} ${r.name}: ${r.n} comparisons, ${r.failed} failed (${r.ms} ms)`);
for (const f of failures.slice(0, 20)) console.log(`  ${f.kind}: ${f.name}\n    want ${JSON.stringify(f.want)?.slice(0, 300)}\n    got  ${JSON.stringify(f.got)?.slice(0, 300)}`);
if (!JS) for (const l of info(port)) console.log('note: ' + l);
// the inline tests of G1's modules (check 8 asks for keys.ents's), with the CLI in ENCANTIS
if (!JS && !args.includes('--no-inline')) {
  const { execSync } = require('child_process');
  const cli = process.env.ENCANTIS || 'bun /home/user/enc-wt/main/packages/cli/src/cli.ts';
  for (const f of ['lib/stack', 'random', 'fmath', 'board', 'keys', 'codes']) {
    let text;
    try { text = execSync(`${cli} test ${path.join(__dirname, '..', f + '.ents')}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 }); }
    catch (e) { text = (e.stdout || '') + (e.stderr || ''); }
    const last = text.trim().split('\n').pop();
    const okLine = /^\d+ passed, 0 failed$/.test(last);
    if (!okLine) failures.push({ kind: 'inline', name: `encantis test ${f}.ents`, want: 'no test failed', got: last });
    console.log(`${okLine ? 'ok  ' : 'FAIL'} inline tests of ${f}.ents: ${last}`);
  }
}
console.log(`${port.name}: ${failures.length ? failures.length + ' FAILED' : 'all passed'} in ${((Date.now() - t0) / 1000).toFixed(1)} s` + (JS ? ' (--js: the JS against itself)' : `; stack peak ${port.x.stack_peak()} bytes; no imports`));
process.exit(failures.length ? 1 : 0);
