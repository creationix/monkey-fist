// Dump the JS reference's boards (Journey and the custom sample) for parity checks.
// node dump-reference.cjs <reference checkout dir> <out.json>
const path = require('path');
const dir = path.resolve(process.argv[2] || path.join(__dirname, '../..'));
const G = require(path.join(dir, 'game-engine.js'));
const cases = require('./cases.cjs');
const pick = b => ({ grid: b.grid, W: b.W, H: b.H, ropes: b.ropes.map(p => p.map(c => [c.q, c.r])),
  mirrors: b.mirrors.map(m => [m.cell.q, m.cell.r, m.axis ?? m.slope]), springs: b.springs.map(p => [p.q, p.r]),
  plan: b.plan, par: b.par, exact: b.exact, layoutKey: b.layoutKey });
const out = { journey: [], custom: [] };
for (let i = 0; i < 120; i++) { const t = Date.now(); out.journey.push({ ...pick(G.generate({ kind: 'journey', index: i })), ms: Date.now() - t }); }
for (const c of cases) { const t = Date.now(); out.custom.push({ code: G.code(c.opts), index: c.index, ...pick(G.generate({ ...c.opts, index: c.index })), ms: Date.now() - t }); }
require('fs').writeFileSync(process.argv[3], JSON.stringify(out));
