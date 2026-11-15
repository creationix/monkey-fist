// Hints, auto-solve and feature checks (web/generator.js guide, reachableFeatures)
// must answer exactly as the JS they replaced did: assist-expected.json was dumped
// from game-engine.js before its guide and reachableFeatures moved to MoonBit.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const G = require('../../game-engine.js'), MFMoonBit = require('../web/generator.js');
const expected = require('./assist-expected.json');
const backends = {
  'wasm-gc': async () => MFMoonBit.wrap((await WebAssembly.instantiate(fs.readFileSync(path.join(__dirname, '../dist/gen.wasm')), {})).instance.exports, 'wasm-gc'),
  js: async () => MFMoonBit.local(),
};
for (const [name, load] of Object.entries(backends)) test(`${name}: ${expected.length} positions get the same plans and live features`, async () => {
  const m = await load(), boards = new Map(), bad = [];
  for (const [k, e] of expected.entries()) {
    const id = JSON.stringify(e.options); if (!boards.has(id)) boards.set(id, G.generate(e.options));
    const b = boards.get(id); let paths = b.ropes;
    for (const i of e.taps) paths = G.tap(b, paths, i).paths;
    for (const g of e.guide) {
      const got = m.guide(b, paths, g.budget, e.prefer);
      if (JSON.stringify([got.solved, got.moves, got.nodes]) !== JSON.stringify([g.solved, g.moves, g.nodes])) bad.push(k + ' guide ' + g.budget);
    }
    for (const f of e.features) if (JSON.stringify(m.reachableFeatures(b, paths, f.budget).sort()) !== JSON.stringify(f.keys)) bad.push(k + ' features ' + f.budget);
  }
  assert.deepStrictEqual(bad, []);
});
