// Checks layout.wasm (Encantis, plain wasm MVP) against random.js, game-engine.js and
// the shipped MoonBit generator: node moonbit/encantis/check.cjs [levels]
const fs = require('fs'), path = require('path');
globalThis.MFGame = require('../../game-engine.js');
const R = require('../../random.js'), MFMoonBit = require('../web/generator.js');
const journey = require('../../scripts/grid-journey-measurements.json');

(async () => {
  const wasm = fs.readFileSync(path.join(__dirname, 'layout.wasm'));
  const { instance } = await WebAssembly.instantiate(wasm, {});
  const x = instance.exports, mem = () => x.mem.buffer;
  let bad = 0; const fail = (...a) => { bad++; if (bad < 10) console.log('MISMATCH', ...a); };

  // mulberry32: 2,000 seeds x 1,000 draws, plus Math.floor(rng() * n).
  let draws = 0;
  for (let s = 0; s < 2000; s++) {
    const seed = R.hashString('grid/3/' + s), js = R.mulberry32(seed); x.rng_seed(seed);
    for (let i = 0; i < 1000; i++, draws++) { const a = js(), b = x.rng_next(); if (!Object.is(a, b)) fail('rng', s, i, a, b); }
    const jsb = R.mulberry32(seed); x.rng_seed(seed);
    for (let n = 1; n < 200; n++) { const a = Math.floor(jsb() * n), b = x.rng_below(n); if (a !== b) fail('below', s, n, a, b); }
  }

  // FNV-1a over ASCII strings of every length 0..300.
  const enc = new TextEncoder();
  for (let n = 0; n <= 300; n++) {
    let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(32 + ((i * 7919 + n) % 95));
    new Uint8Array(mem(), x.in_ptr(), n).set(enc.encode(s));
    if ((x.hash_bytes(n) >>> 0) !== R.hashString(s)) fail('hash', n);
  }

  // Math.round and Number(v.toFixed(4)) on 200,000 values in the range the score uses.
  let fixedDiff = 0, rnd = R.mulberry32(7);
  for (let i = 0; i < 200000; i++) {
    const v = rnd() * (i % 2 ? 1 : 100), r = (rnd() - 0.5) * 1000;
    if (!Object.is(Math.round(r), x.js_round(r))) fail('round', r);
    if (Number(v.toFixed(4)) !== x.to_fixed(v, 4)) fixedDiff++;
  }
  for (const r of [0.5, 1.5, 2.5, -0.5, -1.5, -2.5, -0.4]) if (Math.round(r) !== x.js_round(r)) fail('round', r);

  // layoutKey on real boards from the shipped MoonBit generator (wasm-gc in Node).
  const { instance: g } = await WebAssembly.instantiate(fs.readFileSync(path.join(__dirname, '../dist/gen.wasm')), {});
  const gen = MFMoonBit.wrap(g.exports, 'wasm-gc');
  const levels = +(process.argv[2] || 120), dec = new TextDecoder();
  let keyNs = 0, jsNs = 0, keys = 0;
  for (let i = 0; i < levels; i++) {
    const b = gen.generate({ kind: 'journey', index: i });
    const words = [b.grid === 'hex' ? 1 : 0, b.W, b.H, b.ropes.length];
    for (const p of b.ropes) { words.push(p.length); for (const c of p) words.push(c.q, c.r); }
    words.push((b.mirrors || []).length);
    for (const m of b.mirrors || []) words.push(m.cell.q, m.cell.r, b.grid === 'hex' ? m.axis : m.slope === '/' ? 0 : 1);
    words.push((b.springs || []).length);
    for (const p of b.springs || []) words.push(p.q, p.r);
    new Int32Array(mem(), x.in_ptr(), words.length).set(words);
    let t = process.hrtime.bigint(); let n;
    for (let k = 0; k < 200; k++) n = x.layout_key();
    keyNs += Number(process.hrtime.bigint() - t) / 200;
    const key = dec.decode(new Uint8Array(mem(), x.key_ptr(), n));
    t = process.hrtime.bigint(); let js;
    for (let k = 0; k < 200; k++) js = MFGame.layoutKey(b);
    jsNs += Number(process.hrtime.bigint() - t) / 200;
    keys++;
    if (key !== js || key !== b.layoutKey || key !== journey[i].layoutKey) fail('layoutKey', i + 1, key, js, b.layoutKey);
  }
  console.log(`mulberry32 draws ${draws}, hashes 301, rounds 200007, layout keys ${keys}: ${bad} mismatches`);
  console.log(`toFixed(4) by scale-and-round differs from V8 on ${fixedDiff} of 200000 values`);
  console.log(`layoutKey per board: Encantis ${(keyNs / keys / 1000).toFixed(1)} us, JS ${(jsNs / keys / 1000).toFixed(1)} us`);
  process.exitCode = bad ? 1 : 0;
})();
