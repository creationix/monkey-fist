// G1's oracle, wider (written by G1's review): the same comparisons as check-g1.cjs,
// with more seeds and inputs, 79 more boards, and the limits.
//
//   node moonbit/encantis/core/oracle/check-g1-wide.cjs [test/g1.wasm]   the port
//   node moonbit/encantis/core/oracle/check-g1-wide.cjs --js             the positive control
//   node moonbit/encantis/core/oracle/check-g1-wide.cjs --controls       the negative controls
//
// The checks, against the JS at 9e69e3a:
//   1 draws    10,000 seeds (0, 2^31, 2^32-1, the seed whose first state is 0, ...) x 1,000
//              draws: next(), below(n) for n = 1..64 and up to 2^31-1, chance(p) for
//              random p and 0, 1, -0.5, 1.5, NaN; draws() equals the calls made
//   2 hashes   100,000 random strings of 0 to 300 code units below 256, 300 of 1,000 to
//              5,000; grid/3/<code>/<i> and casual/<seed>/<i> streamed for 20,000 (text, i),
//              i negative too; base 36 of 200,000 random words
//   3 pow      3.2M pairs: x in [0, 1] to 1.3, random bit patterns, x in [0.5, 2] with |y| up
//              to 2,000, x within 2^-20 of 1 with |y| over 2^31, negative x with integer y up
//              to 2^60, results near overflow and in the subnormal range; targetChallenge and
//              winCeiling on 300,000 d
//   4 rounding Math.round on 2M doubles; Number(x.toFixed(d)) for d = 0..8 on 1.4M doubles
//              (up to 1e21, and x * 10^d around 2^52 and 2^53), d = 3 and 4 on 600,000 values
//              shaped like challenge and interaction; floor_div on 1M pairs over all of i32
//   5 codes    every UTF-16 code unit at 7 places in a valid code (458,752 codes), 20,000
//              random valid codes and 20,000 mutations; the spec of 20,000 (code, i), with i
//              anywhere in i32. Divergences from the JS are checked against dist/gen.wasm
//   6 boards   the 79 boards of fixtures/g1-extra-boards.jsonl (gen-extra-boards.cjs): 4x4,
//              8x8 with mirrors and springs, strips, 48x48 colossal square and Hex (up to 223
//              ropes), random codes. Each: JSON text, layout key (stored and game-engine.js's),
//              level words both ways and through generator.js's decode, read_position on
//              the plan's prefixes and 20 random-play positions, SqMirrors on square boards
//   7 keys     the reserve exactly used (keys and words) for 10 sizes, then one more traps;
//              300,000 operations over 30,000 keys of up to 400 words, the empty key
//              included; reserves whose byte sizes pass 2^32 trap at once (port only)
//   8 limits   (port only) the ABI's 65,536 input words: the last fits and the next traps;
//              the largest board's words against that room; the stack's room, and blocks
//              whose end passes 2^32; negative counts in position words; a code unit past
//              255 in text that is hashed traps
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs');
const C = require('./check-g1.cjs');
const { same, layoutJson, parseWords, specWords, moonbitParse, glueWords, randomCode, mutate, cases_rng } = C;
const { L, G, F } = R.js();
const args = process.argv.slice(2);
const JS = args.includes('--js'), CONTROLS = args.includes('--controls');
const repo = path.resolve(__dirname, '../../../..');
const gen = require(path.join(repo, 'moonbit/web/generator.js'));
const FIXTURE = path.join(__dirname, 'fixtures/g1-extra-boards.jsonl');

// A port-only check: skipped by --js, where the hooks are the JS itself.
const portOnly = () => !JS;

function trapped(f) { try { f(); } catch (e) { return e instanceof WebAssembly.RuntimeError; } return false; }

// --- 1 draws ---

function wideDraws(port, frac = 1) {
  const x = port.x, r = cases_rng(11); let n = 0;
  const seeds = [0, 1, 2, 0x7fffffff, 0x80000000, 0xffffffff, (0x100000000 - 0x6D2B79F5) >>> 0, 0x6D2B79F5];
  while (seeds.length < 10000) seeds.push(Math.floor(r() * 2 ** 32));
  const big = [65, 100, 1000, 2304, 65535, 65536, 1e6, 2 ** 24 + 1, 2 ** 30, 2 ** 31 - 1];
  const ps = [0, 1, -0.5, 1.5, NaN, 1e-300, 0.5];
  for (const seed of seeds.slice(0, Math.ceil(seeds.length * frac))) {
    const js = R.js().plainMulberry32(seed);
    x.t_seed(seed | 0);
    for (let k = 0; k < 1000; k++) {
      const name = `seed ${seed} draw ${k}`, m = k % 4;
      if (m === 0) same('next', name, js(), x.t_next());
      else if (m === 1) { const b = k % 8 === 1 ? big[(k >> 3) % big.length] : 1 + (k * 7 % 64); same('below', name + ` below(${b})`, Math.floor(js() * b), x.t_below(b)); }
      else if (m === 2) { const p = r(); same('chance', name + ` chance(${p})`, js() < p ? 1 : 0, x.t_chance(p)); }
      else { const p = ps[(k >> 2) % ps.length]; same('chance', name + ` chance(${p})`, js() < p ? 1 : 0, x.t_chance(p)); }
      n++;
    }
    same('draws', `seed ${seed} draws()`, 1000, x.draws()); n++;
  }
  return n;
}

// --- 2 hashes ---

function wideHashes(port, frac = 1) {
  const x = port.x, r = cases_rng(12); let n = 0;
  const str = (len, top) => String.fromCharCode(...Array.from({ length: len }, () => Math.floor(r() * top)));
  const strings = [];
  for (let i = 0; i < 100000; i++) strings.push(str(Math.floor(r() * 301), r() < 0.5 ? 128 : 256));
  for (let i = 0; i < 300; i++) strings.push(str(1000 + Math.floor(r() * 4001), 128));
  for (const s of strings.slice(0, Math.ceil(strings.length * frac))) {
    port.pushText(s);
    same('hash', `hashString(${JSON.stringify(s.slice(0, 40))}..., ${s.length} units)`, L.hashString(s) | 0, x.t_hash()); n++;
  }
  for (let i = 0; i < 20000 * frac; i++) {
    const s = str(Math.floor(r() * 40), 128), k = r() < 0.1 ? -Math.floor(r() * 2 ** 31) : Math.floor(r() * (r() < 0.5 ? 300 : 2 ** 31));
    port.pushText(s);
    same('hash', `streamed hashString('grid/3/' + ${JSON.stringify(s)} + '/' + ${k})`, L.hashString('grid/3/' + s + '/' + k) | 0, x.t_seed_hash(k));
    same('hash', `streamed hashString('casual/' + ${JSON.stringify(s)} + '/' + ${k})`, L.hashString('casual/' + s + '/' + k) | 0, x.t_casual_hash(k)); n += 2;
  }
  for (let i = 0; i < 200000 * frac; i++) {
    const h = i < 4 ? [0, 1, 35, 36][i] : i < 8 ? [2 ** 32 - 1, 2 ** 31, 36 ** 6, 36 ** 6 - 1][i - 4] : Math.floor(r() * 2 ** 32), up = i & 1;
    x.t_b36(h | 0, up);
    const t = h.toString(36);
    same('b36', `(${h}).toString(36)${up ? '.toUpperCase()' : ''}`, up ? t.toUpperCase() : t, port.text()); n++;
  }
  return n;
}

// --- 3 pow ---

const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
function bits(r) { u32[0] = Math.floor(r() * 2 ** 32); u32[1] = Math.floor(r() * 2 ** 32); return f64[0]; }

function widePow(port, frac = 1) {
  const x = port.x, r = cases_rng(13); let n = 0;
  const pw = (a, b, why) => { same('pow', `pow(${a}, ${b}) ${why}`, Math.pow(a, b), x.t_pow(a, b)); n++; };
  const k = c => Math.ceil(c * frac);
  for (let i = 0; i < k(1000000); i++) pw(r(), 1.3, 'x in [0, 1]');
  for (let i = 0; i < k(1000000); i++) pw(bits(r), bits(r), 'bit patterns');
  for (let i = 0; i < k(500000); i++) pw(0.5 + 1.5 * r(), (r() - 0.5) * 4000, 'x in [0.5, 2]');
  for (let i = 0; i < k(200000); i++) pw(1 + (r() - 0.5) * 2 ** -19, (r() < 0.5 ? -1 : 1) * 2 ** (31 + r() * 34), '|1 - x| < 2^-20, |y| > 2^31');
  for (let i = 0; i < k(200000); i++) {
    const y = r() < 0.5 ? Math.round((r() - 0.5) * 200) : Math.round((r() - 0.5) * 2 ** (1 + Math.floor(r() * 60)));
    pw(-(r() * 4), y, 'negative x, integer y');
  }
  for (let i = 0; i < k(150000); i++) {
    const a = r() * 0.999 + 1e-3, target = -1022 - r() * 52;   // 2^target: the subnormal range
    pw(a, target / Math.log2(a), 'subnormal result');
  }
  for (let i = 0; i < k(150000); i++) {
    const a = 1 + r() * 9, target = 1022 + r() * 3;            // around 2^1024
    pw(a, target / Math.log2(a), 'near overflow');
  }
  for (let i = 0; i <= k(300000); i++) {
    const d = i % 2 ? (r() - 0.25) * 200 : i / 1000;
    same('target', `targetChallenge(${d})`, F.targetChallenge(d), x.t_target(d));
    same('win', `winCeiling(${d})`, F.winCeiling(d), x.t_win(d)); n += 2;
  }
  return n;
}

// --- 4 rounding ---

function wideRounding(port, frac = 1) {
  const x = port.x, r = cases_rng(14); let n = 0;
  const k = c => Math.ceil(c * frac);
  for (let i = 0; i < k(2000000); i++) {
    const v = i % 4 === 0 ? bits(r) : i % 4 === 1 ? (r() - 0.5) * 2 ** Math.floor(r() * 64) : Math.round((r() - 0.5) * 2 ** 24) / 2 + (i % 4 === 2 ? 0 : (r() - 0.5) * 2 ** -40);
    same('round', `Math.round(${v})`, Math.round(v), x.t_round(v)); n++;
    if (Math.abs(v) < 2 ** 31 - 1) { same('round_i', `Math.round(${v}) as i32`, Math.round(v) | 0, x.t_round_i(v)); n++; }
  }
  const tf = (v, d, why) => { same('to_fixed', `Number((${v}).toFixed(${d})) ${why}`, Number(v.toFixed(d)), x.t_to_fixed(v, d)); n++; };
  for (let i = 0; i < k(600000); i++) tf((r() - 0.3) * 10 ** (Math.floor(r() * 14) - 6), Math.floor(r() * 9), 'small');
  for (let i = 0; i < k(400000); i++) tf((r() < 0.5 ? -1 : 1) * r() * 10 ** (9 + r() * 12), Math.floor(r() * 9), 'up to 1e21');
  for (let d = 0; d <= 8; d++) for (let i = 0; i < k(40000); i++) { const lo = 2 ** 52 / 10 ** d; tf((r() < 0.5 ? -1 : 1) * lo * (1 + r() * 7), d, 'x * 10^d near 2^52 and 2^53'); }
  for (let i = 0; i < k(300000); i++) tf(0.5 + 9.5 * Math.pow(r(), 1.3) * (r() < 0.5 ? 1 : 0.4 + 0.6 * r()), 3, 'challenge-like');
  for (let i = 0; i < k(300000); i++) { const a = Math.floor(r() * 300), b = 1 + Math.floor(r() * 300); tf(a / b * (r() < 0.5 ? 1 : (1 + Math.floor(r() * 40)) / (1 + Math.floor(r() * 40))), 4, 'interaction-like'); }
  for (let i = 0; i < k(1000000); i++) {
    const a = i < 6 ? [-2147483648, -2147483647, -1, 0, 2147483647, -2147483648][i] : Math.floor(r() * 2 ** 32) - 2 ** 31;
    const b = i < 6 ? [1, 2147483647, 2147483647, 7, 1, 2147483647][i] : r() < 0.5 ? 1 + Math.floor(r() * 64) : 1 + Math.floor(r() * (2 ** 31 - 1));
    same('floor_div', `Math.floor(${a} / ${b})`, Math.floor(a / b), x.t_floor_div(a, b)); n++;
  }
  return n;
}

// --- 5 codes ---

let divergent = [];
function wideCodes(port, frac = 1) {
  const x = port.x, r = cases_rng(15); let n = 0;
  const base = 'U3-S-1-100-10-14-120-MS-SEED', journey = 'J3-MONKEYFIST';
  // every code unit, at 7 places
  const at = [[base, 0, 0], [base, 3, 0], [base, 22, 0], [base, 25, 1], [base, base.length, 0], [journey, 0, 0], [journey, 6, 0]];
  const texts = [];
  for (let u = 0; u < 65536 * frac; u++) for (const [b, k, cut] of at) texts.push(b.slice(0, k) + String.fromCharCode(u) + b.slice(k + cut));
  const valid = [];
  for (let i = 0; i < 20000; i++) valid.push(randomCode(r));
  for (let i = 0; i < 20000 * frac; i++) texts.push(r() < 0.3 ? valid[i].toLowerCase() : valid[i], mutate(valid[i], r));
  divergent = [];
  for (const t of texts) {
    const js = G.parseCode(t), mbt = moonbitParse(t);
    if (JSON.stringify(js) !== JSON.stringify(mbt)) divergent.push(t);
    const want = JS ? js : mbt;
    port.pushText(t);
    const ok = x.t_parse(), name = `parseCode(${JSON.stringify(t)})`;
    same('parse', name + ' accepted', !!want, ok === 1); n++;
    if (want && ok === 1) { same('parse', name + ' fields and code', parseWords(want), port.out()); n++; }
  }
  const edges = [-2147483648, -1, 0, 1, 199, 200, 2147483647];
  for (let i = 0; i < 20000 * frac; i++) {
    const c = valid[i], count = +c.split('-')[6];
    const idx = i < 7 * 100 ? edges[i % 7] : r() < 0.1 ? Math.floor(r() * 2 ** 32) - 2 ** 31 : Math.floor(r() * count);
    const s = G.spec(G.parseCode(c), idx);
    port.pushText(c);
    const name = `spec(parseCode(${JSON.stringify(c)}), ${idx})`;
    if (!same('spec', name + ' made', 1, x.t_spec(idx))) continue;
    same('spec', name + ' fields', specWords(s), port.out());
    same('spec', name + ' difficulty', s.difficulty, port.outf(0)); n += 2;
  }
  return n;
}

// The codes where the JS and MoonBit's model differ: dist/gen.wasm must refuse each one the
// model refuses (generate(0) of a refused code returns 0 without generating).
function divergences() {
  const mbt = W.load(path.join(repo, 'moonbit/dist/gen.wasm')).x;
  let refused = 0, modelRefuses = 0;
  const units = new Map();
  for (const t of divergent) {
    if (moonbitParse(t)) continue;
    modelRefuses++;
    mbt.in_reset(); for (let i = 0; i < t.length; i++) mbt.in_push(t.charCodeAt(i));
    if (mbt.generate(0) === 0) refused++;
    else same('parse', `dist/gen.wasm takes ${JSON.stringify(t)}, which MoonBit's model refuses`, 0, 1);
    for (const ch of t) if (ch.charCodeAt(0) > 127 || /\s/.test(ch)) units.set(ch.charCodeAt(0), (units.get(ch.charCodeAt(0)) || 0) + 1);
  }
  const list = [...units.keys()].sort((a, b) => a - b).map(u => 'U+' + u.toString(16).toUpperCase().padStart(4, '0'));
  return `codes the JS takes and MoonBit refuses: ${divergent.length}; dist/gen.wasm refuses ${refused} of the ${modelRefuses} the model refuses; ` +
    `the code units behind them (${list.length}): ${list.join(' ')}`;
}

// --- 6 boards ---

let extra = null;
function extraBoards() {
  if (extra) return extra;
  extra = fs.readFileSync(FIXTURE, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
    .map(j => ({ ...R.jsBoard(j), name: `${j.code}#${j.index}`, code: j.code, index: j.index }));
  return extra;
}

function wideBoards(port, frac = 1) {
  const x = port.x; let n = 0;
  for (const b of extraBoards().slice(0, Math.ceil(extraBoards().length * frac))) {
    port.push(R.position(b));
    x.t_layout_json(); same('json', `${b.name} JSON text`, layoutJson(b), port.text());
    x.t_layout_key(); same('key', `${b.name} layoutKey`, b.layoutKey, port.text());
    same('key', `${b.name} layoutKey of game-engine.js`, b.layoutKey, G.layoutKey(b)); n += 3;
    const words = glueWords(b, b.ropes, b.plan);
    same('glue', `${b.name} position words: generator.js against ref.cjs`, R.position(b, b.ropes, b.plan), words); n++;
    for (const again of [0, 1]) {
      port.push(words);
      x.t_level(b.par, b.exact ? 1 : 0, again);
      const out = port.out(), name = `${b.name} level words${again ? ', written again from read_level' : ''}`;
      same('level', name, R.levelWords(b, b.layoutKey, [1, 2, 3, 4, 5, 6, 7, 8]), out);
      const d = gen.decode(out, port.outf);
      same('level', name + ', decoded by generator.js', { grid: b.grid, W: b.W, H: b.H, par: b.par, exact: b.exact, ropes: b.ropes, mirrors: b.mirrors, springs: b.springs, plan: b.plan, layoutKey: b.layoutKey },
        { grid: d.grid, W: d.W, H: d.H, par: d.par, exact: d.exact, ropes: d.ropes, mirrors: d.mirrors, springs: d.springs, plan: d.plan, layoutKey: d.layoutKey });
      n += 2;
    }
    for (const p of R.positions(b, 20)) {
      port.push(glueWords(b, p.paths, p.taps));
      x.t_paths();
      const want = [p.paths.length]; for (const q of p.paths) { want.push(q ? q.length : 0); for (const c of q || []) want.push(c.q, c.r); }
      want.push(p.taps.length, ...p.taps);
      same('paths', `${b.name} position ${p.from}`, want, port.out()); n++;
    }
    if (b.grid === 'square') {
      port.push(R.position(b));
      x.t_sq_mirrors();
      const m = new Map(b.mirrors.map(x => [x.cell.r * b.W + x.cell.q, x.slope === '\\' ? 1 : 0]));
      const want = [...m.keys()]; for (let c = 0; c < b.W * b.H; c++) want.push(m.has(c) ? m.get(c) : -1);
      same('mirrors', `${b.name} SqMirrors`, want, port.out()); n++;
    }
  }
  return n;
}

// --- 7 keys ---

function wideKeys(port, frac = 1) {
  const x = port.x, r = cases_rng(16); let n = 0;
  const trap = (what, f) => { same('trap', what + ' traps', true, trapped(f)); n++; };
  const noTrap = (what, f) => { same('trap', what + ' does not trap', false, trapped(f)); n++; };
  // the reserve used exactly: keys and words, then one more of either traps
  for (const K of [1, 2, 3, 5, 8, 13, 64, 1000, 4096, 30000].slice(0, frac < 1 ? 3 : 10)) {
    const keys = Array.from({ length: K + 1 }, (_, i) => Array.from({ length: i === 1 ? 0 : 1 + i % 4 }, (_, j) => i * 10 + j));   // key 1 is the empty key
    const words = keys.slice(0, K).reduce((a, k) => a + k.length, 0);
    x.t_keys_new(K, words);
    noTrap(`${K} keys of ${words} words in a map and a set of exactly that room`, () => {
      for (const k of keys.slice(0, K)) { port.push(k); x.t_keys_set(k.length + 1); x.t_set_add(); }
    });
    let bad = 0;
    for (const k of keys.slice(0, K)) { port.push(k); if (x.t_keys_get(-1) !== k.length + 1 || x.t_set_has() !== 1) bad++; }
    same('keys', `${K} keys at full room read back`, 0, bad); same('keys', `${K} keys counted`, K, x.t_keys_count()); n += 2;
    port.push(keys[0]); same('keys', `${K} keys: setting a key kept again at full room`, 0, x.t_keys_set(9)); n++;
    port.push(keys[K]); trap(`key ${K + 1} in a map of ${K}`, () => x.t_keys_set(1));
    port.push(keys[K]); trap(`key ${K + 1} in a set of ${K}`, () => x.t_set_add());
  }
  x.t_keys_new(10, 6);
  for (const k of [[1, 2], [3, 4], [5, 6]]) { port.push(k); x.t_keys_set(1); }
  port.push([7]); trap('a 7th word in a pool of 6', () => x.t_keys_set(1));
  port.push([]); noTrap('the empty key, with the pool full', () => x.t_keys_set(5));
  port.push([]); same('keys', 'the empty key reads back', 5, x.t_keys_get(0)); n++;
  // 300,000 operations over 30,000 keys of up to 400 words, against a JS Map
  const all = [], have = new Set();
  while (all.length < 30000) {
    const u = r(), len = u < 0.01 ? 0 : u < 0.7 ? 1 + Math.floor(r() * 20) : u < 0.98 ? 21 + Math.floor(r() * 80) : 101 + Math.floor(r() * 300);
    const k = Array.from({ length: len }, () => r() < 0.9 ? Math.floor(r() * 3) - 1 : Math.floor(r() * 2 ** 32) - 2 ** 31);
    if (!have.has(k.join())) { have.add(k.join()); all.push(k); }
  }
  const room = all.reduce((a, k) => a + k.length, 0);
  x.t_keys_new(30000, room);
  const map = new Map(), set = new Set();
  for (let i = 0; i < 300000 * frac; i++) {
    const k = all[Math.floor(r() ** 1.5 * all.length)], j = k.join(), op = Math.floor(r() * 4), name = `op ${i} on [${j.slice(0, 60)}] (${k.length} words)`;
    port.push(k);
    if (op === 0) { const v = Math.floor(r() * 2 ** 32) - 2 ** 31; same('keys', name + ` set ${v}`, map.has(j) ? 0 : 1, x.t_keys_set(v)); map.set(j, v); }
    else if (op === 1) same('keys', name + ' get', map.has(j) ? map.get(j) : -7, x.t_keys_get(-7));
    else if (op === 2) { same('set', name + ' add', set.has(j) ? 0 : 1, x.t_set_add()); set.add(j); }
    else same('set', name + ' has', set.has(j) ? 1 : 0, x.t_set_has());
    n++;
  }
  same('keys', 'count after the run', map.size, x.t_keys_count()); n++;
  if (portOnly()) {
    // reserves whose sizes in bytes pass 2^32: they must trap when made, not wrap
    trap('a reserve of 2^28 + 1 keys (2^30 slots of 12 bytes)', () => x.t_keys_new(2 ** 28 + 1, 16));
    trap('a reserve of 2^30 + 1 words (4 bytes each)', () => x.t_keys_new(100, 2 ** 30 + 1));
    trap('a reserve of 2^31 keys', () => x.t_keys_new(-(2 ** 31), 16));
    trap('a reserve of 2^32 - 1 keys', () => x.t_keys_new(-1, 16));
    x.t_keys_new(8, 64); port.push([7, 7, 7]);
    same('trap', 'after those traps, a fresh map works', 1, x.t_keys_set(3)); n++;
  }
  return n;
}

// --- 8 limits (port only) ---

function wideLimits(port) {
  const x = port.x; let n = 0;
  if (!portOnly()) return 0;
  // the input buffer: 65,536 words fit, the next traps
  x.in_reset();
  let fits = true;
  try { for (let i = 0; i < 65536; i++) x.in_push(i); } catch (e) { fits = false; }
  same('limits', 'in_push of 65,536 words', true, fits);
  same('limits', 'in_push of word 65,537 traps', true, trapped(() => x.in_push(1))); n += 2;
  // the largest board's words, against the room of 65,536
  let most = 0, which = '';
  for (const b of [...R.boards(), ...extraBoards()]) {
    const w = Math.max(R.position(b, b.ropes, b.plan).length + R.position(b).length, R.levelWords(b).length);
    if (w > most) { most = w; which = b.name; }
  }
  same('limits', `the largest board's words (${which}: ${most}) fit in 65,536`, true, most <= 65536); n++;
  // the stack: a block of exactly the room left fits; one byte more traps, and so does a
  // block whose end passes 2^32 (alloc once added n to the top first, and that wrapped)
  const capacity = 16777216;
  same('limits', 'alloc of the room left fits', false, trapped(() => x.t_alloc(16, capacity - 16)));
  same('limits', 'alloc of a byte more than the room left traps', true, trapped(() => x.t_alloc(16, capacity - 15)));
  same('limits', 'alloc of 2^32 - 16 bytes traps', true, trapped(() => x.t_alloc(16, -16)));
  same('limits', 'alloc of 2^32 - 8 bytes traps', true, trapped(() => x.t_alloc(0, -8))); n += 4;
  // counts read from the words: a negative one traps at once (its count * 8 wrapped)
  port.push([0, 4, 4, -1]); same('limits', 'a negative rope count traps', true, trapped(() => x.t_paths()));
  port.push([0, 4, 4, 0, 0, 0, 0x20000000]); same('limits', 'a path count of 2^29 traps', true, trapped(() => x.t_paths()));
  port.push([0, -1, 4, 0, 0, 0, 0, 0]); same('limits', 'SqMirrors of a board of negative area traps', true, trapped(() => x.t_sq_mirrors()));
  const b = R.boards()[1]; port.push(R.position(b)); x.t_layout_key();
  same('limits', 'after those traps, a layout key is right', b.layoutKey, port.text());
  // (G1's alloc wrapped on the last of them, and the loop that followed wrote -1 over the
  // data after the stack: every Journey spec read wrong from then on)
  let wrong = 0;
  for (let i = 0; i < 120; i++) {
    const s = G.spec(G.parseCode('J3-MONKEYFIST'), i);
    port.pushText('J3-MONKEYFIST'); x.t_spec(i);
    if (JSON.stringify(port.out()) !== JSON.stringify(specWords(s)) || !Object.is(port.outf(0), s.difficulty)) wrong++;
  }
  same('limits', 'after those traps, the 120 Journey specs are right', 0, wrong); n += 5;
  // text that is hashed is bytes: a code unit past 255 must trap, not hash differently
  port.pushText('SEEDĀ');
  same('limits', 'hashing a code unit past 255 traps', true, trapped(() => x.t_hash()));
  port.pushText('SEEDÿ');
  same('limits', 'hashing code unit 255 is hashString', L.hashString('SEEDÿ') | 0, x.t_hash()); n += 2;
  return n;
}

const CHECKS = [['1 draws', wideDraws, ['next', 'below', 'chance', 'draws']], ['2 hashes', wideHashes, ['hash', 'b36']],
  ['3 pow', widePow, ['pow', 'target', 'win']], ['4 rounding', wideRounding, ['round', 'round_i', 'to_fixed', 'floor_div']],
  ['5 codes', wideCodes, ['parse', 'spec']], ['6 boards', wideBoards, ['json', 'key', 'glue', 'level', 'paths', 'mirrors']],
  ['7 keys', wideKeys, ['keys', 'set', 'trap']], ['8 limits', wideLimits, ['limits']]];

function run(port, frac, only) {
  const out = [];
  for (const [name, f, kinds] of CHECKS) {
    if (only && !kinds.includes(only)) continue;
    const before = C.failures().length, t = Date.now();
    const n = f(port, frac);
    out.push({ name, n, failed: C.failures().length - before, ms: Date.now() - t });
  }
  return out;
}

if (CONTROLS) {
  // Each kind of comparison, with one expected value spoiled, on a part of the cases:
  // exactly that case must fail.
  const port = W.load(C.WASM);
  let bad = 0;
  for (const [, , kinds] of CHECKS) for (const kind of kinds) {
    C.failures().length = 0; for (const k in C.seen) delete C.seen[k];
    C.setCorrupt({ kind, at: ['draws', 'glue', 'mirrors', 'limits', 'json', 'key'].includes(kind) ? 1 : 3 });
    run(port, 0.01, kind);
    const all = C.failures(), ours = all.filter(f => f.kind === kind);
    const ok = all.length === 1 && ours.length === 1;
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} control ${kind}: ${all.length} failure(s)${ours[0] ? ', named: ' + ours[0].name.slice(0, 120) : ''}`);
  }
  console.log(bad ? `${bad} control(s) did not fail as they should` : 'every control failed, and named its case');
  process.exit(bad ? 1 : 0);
}

const port = JS ? W.fake(C.jsHooks) : W.load(C.WASM);
const t0 = Date.now();
const results = run(port, 1);
for (const r of results) console.log(`${r.failed ? 'FAIL' : 'ok  '} ${r.name}: ${r.n} comparisons, ${r.failed} failed (${r.ms} ms)`);
const failures = C.failures();
for (const f of failures.slice(0, 20)) console.log(`  ${f.kind}: ${f.name}\n    want ${JSON.stringify(f.want)?.slice(0, 300)}\n    got  ${JSON.stringify(f.got)?.slice(0, 300)}`);
if (!JS) console.log('note: ' + divergences());
const total = results.reduce((a, r) => a + r.n, 0);
console.log(`${port.name} (wide): ${failures.length ? failures.length + ' FAILED' : 'all passed'}, ${total} comparisons in ${((Date.now() - t0) / 1000).toFixed(1)} s` +
  (JS ? ' (--js: the JS against itself)' : `; stack peak ${port.x.stack_peak()} bytes`));
process.exit(failures.length ? 1 : 0);
