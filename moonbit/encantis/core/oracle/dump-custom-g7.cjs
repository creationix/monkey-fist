// G7's oracle part 3: 60 custom levels beyond the 15 of scripts/cases.cjs, dumped from the JS at
// 9e69e3a as scripts/dump-reference.cjs dumps its sample (a scratch copy of it, with more cases),
// so that scripts/parity.mjs can check a wasm on them:
//
//   node dump-custom-g7.cjs [--part k/n]          one JSON line a case into /home/user/mf-core-scratch/g7/custom/
//   node dump-custom-g7.cjs --join <out.json>     { journey: [], custom: [...] }, parity.mjs's input
//
// The cases: every size class from 4x5 to 24x24 (strips too), the 32x32, 40x40 and 48x48 colossal
// maps, square, Hex and mixed sets, plain, mirrors, spinners and both, difficulties 1 to 100, each a
// level of its set picked by a fixed rule (below), so that the list is the same on every run.
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const DIR = '/home/user/mf-core-scratch/g7/custom';

// [grid, min, max, W, H, count, flags, seed] -> 60 cases.
const SETS = [
  ['square', 1, 100, 4, 5, 10, '', 'G7A'], ['hex', 1, 100, 4, 5, 10, '', 'G7A'], ['square', 1, 100, 6, 6, 10, 'M', 'G7B'], ['hex', 1, 100, 6, 6, 10, 'M', 'G7B'],
  ['square', 20, 80, 8, 8, 8, 'S', 'G7C'], ['hex', 20, 80, 8, 8, 8, 'S', 'G7C'], ['square', 40, 100, 8, 8, 8, 'MS', 'G7D'], ['hex', 40, 100, 8, 8, 8, 'MS', 'G7D'],
  ['mixed', 1, 100, 5, 7, 12, '', 'G7E'], ['mixed', 1, 100, 7, 9, 12, 'M', 'G7E'],
  ['square', 1, 100, 10, 10, 20, '', 'G7F'], ['hex', 1, 100, 10, 10, 20, '', 'G7F'], ['square', 1, 100, 12, 12, 20, 'M', 'G7G'], ['hex', 1, 100, 12, 12, 20, 'M', 'G7G'],
  ['square', 10, 90, 12, 14, 10, 'S', 'G7H'], ['hex', 10, 90, 12, 14, 10, 'S', 'G7H'], ['square', 30, 100, 14, 14, 10, 'MS', 'G7I'], ['hex', 30, 100, 14, 14, 10, 'MS', 'G7I'],
  ['mixed', 1, 100, 16, 16, 10, '', 'G7J'], ['mixed', 1, 100, 16, 12, 10, 'M', 'G7J'], ['square', 60, 100, 16, 16, 6, '', 'G7K'], ['hex', 60, 100, 16, 16, 6, '', 'G7K'],
  ['square', 1, 100, 20, 20, 8, '', 'G7L'], ['hex', 1, 100, 20, 20, 8, '', 'G7L'], ['square', 1, 100, 24, 24, 8, 'M', 'G7M'], ['hex', 1, 100, 24, 24, 8, 'M', 'G7M'],
  ['mixed', 1, 100, 22, 22, 8, '', 'G7N'], ['square', 50, 50, 20, 20, 1, 'S', 'G7O'], ['hex', 50, 50, 20, 20, 1, 'S', 'G7O'],
  ['square', 1, 100, 24, 8, 6, 'M', 'G7P'], ['hex', 1, 100, 8, 24, 6, '', 'G7P'], ['mixed', 1, 100, 4, 20, 6, '', 'G7Q'],
  ['square', 1, 100, 32, 32, 4, 'C', 'G7R'], ['hex', 1, 100, 32, 32, 4, 'C', 'G7R'], ['square', 1, 100, 32, 32, 4, 'MC', 'G7S'], ['hex', 1, 100, 32, 32, 4, 'MC', 'G7S'],
  ['square', 1, 100, 40, 40, 2, 'SC', 'G7T'], ['hex', 1, 100, 40, 40, 2, 'MC', 'G7T'], ['square', 1, 100, 48, 48, 2, 'MSC', 'G7U'], ['hex', 1, 100, 48, 48, 2, 'C', 'G7U'],
];
// Two levels of each of the first 20 sets, one of the rest: 60 in all. The index is a hash of the set,
// so the difficulties spread over each set's range.
function cases() {
  const { L } = R.js(), out = [];
  SETS.forEach(([grid, min, max, W, H, count, flags, seed], k) => {
    const opts = { grid, min, max, width: W, height: H, count, seed, ...(flags.includes('M') ? { mirrors: true } : {}), ...(flags.includes('S') ? { springs: true } : {}), ...(flags.includes('C') ? { colossal: true } : {}) };
    const picks = k < 20 ? 2 : 1;
    for (let p = 0; p < picks; p++) out.push({ opts, index: (L.hashString(seed + '/' + k + '/' + p) % count + p * Math.ceil(count / 2)) % count });
  });
  return out;
}

const pick = b => ({ grid: b.grid, W: b.W, H: b.H, ropes: b.ropes.map(p => p.map(c => [c.q, c.r])),
  mirrors: b.mirrors.map(m => [m.cell.q, m.cell.r, m.axis ?? m.slope]), springs: b.springs.map(p => [p.q, p.r]),
  plan: b.plan, par: b.par, exact: b.exact, layoutKey: b.layoutKey });

if (args.includes('--join')) {
  const all = cases(), rows = new Map();
  for (const f of fs.readdirSync(DIR)) for (const l of fs.readFileSync(path.join(DIR, f), 'utf8').trim().split('\n')) if (l) { const r = JSON.parse(l); rows.set(r.n, r); }
  const custom = all.map((c, n) => rows.get(n)).filter(Boolean);
  if (custom.length !== all.length) throw Error(`only ${custom.length} of ${all.length} cases dumped`);
  const made = custom.filter(r => !r.none).map(({ n, ...r }) => r);
  fs.writeFileSync(opt('--join'), JSON.stringify({ journey: [], custom: made }));
  console.log(`wrote ${opt('--join')}: ${made.length} levels (${custom.length - made.length} the JS gives up on: ${custom.filter(r => r.none).map(r => r.code + ' #' + r.index).join(', ') || 'none'}); JS time ${(custom.reduce((s, r) => s + r.ms, 0) / 1000).toFixed(1)} s`);
} else {
  const { G } = R.js(), all = cases();
  const [k, n] = opt('--part', '0/1').split('/').map(Number);
  fs.mkdirSync(DIR, { recursive: true });
  const file = path.join(DIR, `part-${k}of${n}.jsonl`);
  const done = new Set(fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l).n) : []);
  all.forEach((c, i) => {
    if (i % n !== k || done.has(i)) return;
    const code = G.code(c.opts), t = Date.now();
    let row;
    try { row = { n: i, code, index: c.index, ...pick(G.generate({ ...c.opts, index: c.index })), ms: Date.now() - t }; }
    catch (e) { if (!/Could not densely weave/.test(e.message)) throw e; row = { n: i, code, index: c.index, none: true, ms: Date.now() - t }; }
    fs.appendFileSync(file, JSON.stringify(row) + '\n');
  });
}
