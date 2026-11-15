// Checks solver.wasm (Encantis guide for square boards without spinners) against
// MoonBit's guide (src/core/assist.mbt, both builds) and the JS results pinned
// in moonbit/tests/assist-expected.json, and times them:
//   node moonbit/encantis/solver/check.cjs
const fs = require('fs'), path = require('path');
const G = require('../../../game-engine.js'), L = require('../../../levels.js');
const MFMoonBit = require('../../web/generator.js');
const pinned = require('../../tests/assist-expected.json');

const square = b => b.grid === 'square' && !(b.springs || []).length;

function encantis(instance) {
  const x = instance.exports, mem = () => new Int32Array(x.mem.buffer);
  return (b, paths, budget, prefer = []) => {
    const words = [b.W, b.H, budget, b.mirrors.length];
    for (const m of b.mirrors) words.push(m.cell.q, m.cell.r, m.slope === '\\' ? 1 : 0);
    words.push(paths.length);
    for (const p of paths) { words.push(p ? p.length : 0); for (const c of p || []) words.push(c.q, c.r); }
    words.push(prefer.length, ...prefer);
    mem().set(words, x.in_ptr() / 4);
    if (x.guide() === 0xFFFFFFFF) throw Error('a way out passes a cell twice');
    const out = new Uint32Array(x.mem.buffer, x.out_ptr(), 3 + 20000);
    return { solved: out[0] === 1 ? true : out[0] === 0 ? false : null, nodes: out[1], moves: Array.from(out.subarray(3, 3 + out[2])) };
  };
}

(async () => {
  const enc = encantis((await WebAssembly.instantiate(fs.readFileSync(path.join(__dirname, 'solver.wasm')), {})).instance);
  const wasm = MFMoonBit.wrap((await WebAssembly.instantiate(fs.readFileSync(path.join(__dirname, '../../dist/gen.wasm')), {})).instance.exports, 'wasm-gc');
  const js = MFMoonBit.local();
  const same = (a, b) => JSON.stringify([a.solved, a.moves, a.nodes]) === JSON.stringify([b.solved, b.moves, b.nodes]);

  // 1. The pinned positions on square boards without spinners.
  const boards = new Map(); let pinnedChecks = 0, pinnedBad = 0;
  for (const e of pinned) {
    const id = JSON.stringify(e.options); if (!boards.has(id)) boards.set(id, G.generate(e.options));
    const b = boards.get(id); if (!square(b)) continue;
    let paths = b.ropes; for (const i of e.taps) paths = G.tap(b, paths, i).paths;
    for (const g of e.guide) { pinnedChecks++; if (!same(enc(b, paths, g.budget, e.prefer), g)) pinnedBad++; }
  }
  console.log(`assist-expected.json: ${pinnedChecks} square guide checks, ${pinnedBad} mismatches`);

  // 2. A wider sample: every square board in the Journey and some custom sets, at
  // states along the par plan and after random taps, at the game's budgets.
  const sample = [];
  for (let i = 0; i < 120; i++) sample.push({ kind: 'journey', index: i });
  for (const code of ['U3-S-30-90-8-10-6-M-SOLVE', 'U3-S-50-100-10-14-6-N-SOLVE', 'U3-S-60-100-12-16-4-M-SOLVE'])
    for (let i = 0; i < 6; i++) sample.push({ ...G.parseCode(code), index: i });
  const rng = L.mulberry32(11), cases = [];
  for (const o of sample) {
    const b = G.generate(o); if (!square(b)) continue;
    let paths = b.ropes; cases.push([b, paths, b.plan]);
    for (const [k, i] of b.plan.entries()) { const m = G.tap(b, paths, i); if (!m) break; paths = m.paths; if (k % 2 === 0) cases.push([b, paths, b.plan.slice(k + 1)]); }
    for (let w = 0; w < 6; w++) {
      let p = b.ropes;
      for (let s = 0; s < 5; s++) { const live = p.flatMap((x, i) => x ? [i] : []); if (!live.length) break; const m = G.tap(b, p, live[Math.floor(rng() * live.length)]); if (m) p = m.paths; }
      cases.push([b, p, []]);
    }
  }
  let bad = 0, checks = 0;
  const time = { encantis: 0, 'moonbit wasm-gc': 0, 'moonbit js': 0 };
  for (const [b, p, prefer] of cases) for (const budget of [40, 900, 5000]) {
    checks++;
    let t = performance.now(); const a = enc(b, p, budget, prefer); time.encantis += performance.now() - t;
    t = performance.now(); const c = wasm.guide(b, p, budget, prefer); time['moonbit wasm-gc'] += performance.now() - t;
    t = performance.now(); const d = js.guide(b, p, budget, prefer); time['moonbit js'] += performance.now() - t;
    if (!same(a, c) || !same(c, d)) { if (bad++ < 3) console.log('mismatch', b.W, b.H, budget, JSON.stringify(a).slice(0, 100), JSON.stringify(c).slice(0, 100)); }
  }
  console.log(`${cases.length} positions on ${new Set(cases.map(c => c[0])).size} square boards, ${checks} guide checks: ${bad} mismatches`);
  console.log('total time (ms):', Object.entries(time).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', '));
})();
