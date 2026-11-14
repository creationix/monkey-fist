// Regenerate every Journey level and the custom sample with the MoonBit core and
// compare with the JS reference dump (scripts/dump-reference.cjs).
// node parity.mjs <reference.json> [js|wasm] [journey|custom|all] [from] [to]
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
import { loadWasm, loadJs } from '../web/mf-core.js';
const here = path.dirname(fileURLToPath(import.meta.url));
const [refFile, backend = 'wasm', which = 'all', from = '0', to = '120'] = process.argv.slice(2);
const ref = JSON.parse(fs.readFileSync(refFile, 'utf8'));
const mf = backend === 'js' ? await loadJs(path.join(here, '../_build/js/release/build/api/api.js'))
  : await loadWasm(fs.readFileSync(path.join(here, '../_build/wasm-gc/release/build/api/api.wasm')));
const pick = b => ({ grid: b.grid, W: b.W, H: b.H, ropes: b.ropes.map(p => p.map(c => [c.q, c.r])),
  mirrors: b.mirrors.map(m => [m.cell.q, m.cell.r, m.axis ?? m.slope]), springs: b.springs.map(p => [p.q, p.r]),
  plan: b.plan, par: b.par, exact: b.exact, layoutKey: b.layoutKey });
const fields = ['grid', 'W', 'H', 'ropes', 'mirrors', 'springs', 'plan', 'par', 'exact', 'layoutKey'];
let ok = 0, bad = 0; const times = [];
function check(label, expected, got, ms) {
  times.push(ms);
  const diff = got ? fields.filter(f => JSON.stringify(expected[f]) !== JSON.stringify(got[f])) : ['no board'];
  if (diff.length) { bad++; console.log('MISMATCH', label, diff.join(','), got ? '' : '', got && diff.includes('par') ? `par ${expected.par} vs ${got.par}` : ''); }
  else ok++;
}
if (which !== 'custom') for (let i = +from; i < Math.min(+to, ref.journey.length); i++) {
  const t = performance.now(), b = mf.generate('J3-MONKEYFIST', i), ms = performance.now() - t;
  check('journey ' + i, ref.journey[i], b && pick(b), ms);
}
if (which !== 'journey') for (const c of ref.custom) {
  const t = performance.now(), b = mf.generate(c.code, c.index), ms = performance.now() - t;
  check(c.code + ' #' + c.index, c, b && pick(b), ms);
}
console.log(`${backend}: ${ok} match, ${bad} differ; total ${(times.reduce((a, b) => a + b, 0) / 1000).toFixed(1)} s, max ${Math.max(...times).toFixed(0)} ms`);
