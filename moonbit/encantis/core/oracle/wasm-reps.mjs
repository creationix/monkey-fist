// Baseline for an Encantis core: MoonBit wasm-gc Journey generation, R rounds of all
// 120 levels in one process, per round total; and the cost of the numbers ABI
// (pushing the set code in, reading the board out) apart from generation.
//   node wasm-reps.mjs <path to gen.wasm or mf.wasm> [rounds=5] [levels=120]
import fs from 'fs';
const [file, roundsArg = '5', levelsArg = '120'] = process.argv.slice(2), R = +roundsArg, N = +levelsArg;
const t0 = performance.now();
const { instance } = await WebAssembly.instantiate(fs.readFileSync(file), {});
const tInst = performance.now() - t0, x = instance.exports;
const code = 'J3-MONKEYFIST';
const push = () => { x.in_reset(); for (let i = 0; i < code.length; i++) x.in_push(code.charCodeAt(i)); };
const read = () => { const n = x.out_len(), out = new Array(n); for (let i = 0; i < n; i++) out[i] = x.out_get(i); return out; };
const rounds = [], gen = [], abi = []; let words = 0;
for (let r = 0; r < R; r++) {
  let total = 0, g = 0, a = 0;
  for (let i = 0; i < N; i++) {
    const s = performance.now(); push(); const s1 = performance.now();
    if (!x.generate(i)) throw Error('no board ' + i);
    const s2 = performance.now(); const out = read(); const s3 = performance.now();
    words = Math.max(words, out.length); total += s3 - s; g += s2 - s1; a += (s1 - s) + (s3 - s2);
  }
  rounds.push(total); gen.push(g); abi.push(a);
}
const f = a => a.map(v => v.toFixed(0)).join(' ');
console.log(`${file}: instantiate ${tInst.toFixed(1)} ms; ${R} rounds of ${N} levels`);
console.log(`  round totals ms: ${f(rounds)}  (min ${Math.min(...rounds).toFixed(0)}, mean/level of best ${(Math.min(...rounds) / N).toFixed(1)})`);
console.log(`  generate() only: ${f(gen)};  ABI in+out: ${abi.map(v => v.toFixed(1)).join(' ')} ms per round; largest output ${words} words`);
