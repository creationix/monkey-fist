// The MoonBit core must regenerate every Journey level and the custom sample exactly
// as the JS reference (9e69e3a): same layoutKey, par, rope count (and plan for custom).
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const journey = require('../../scripts/grid-journey-measurements.json');
const custom = require('./custom-expected.json');
const backends = {
  wasm: async () => (await import('../web/mf-core.js')).loadWasm(fs.readFileSync(path.join(root, 'dist/mf.wasm'))),
  js: async () => (await import('../web/mf-core.js')).loadJs(path.join(root, 'dist/mf.js')),
};
for (const [name, load] of Object.entries(backends)) {
  test(`${name}: all 120 Journey levels match the JS reference`, async () => {
    const mf = await load(), bad = [];
    for (let i = 0; i < 120; i++) {
      const b = mf.generate('J3-MONKEYFIST', i), m = journey[i];
      if (!b || b.layoutKey !== m.layoutKey || b.par !== m.par || b.ropes.length !== m.ropeCount || b.grid !== m.grid || b.W !== m.W || b.H !== m.H) bad.push(i + 1);
    }
    assert.deepStrictEqual(bad, []);
  });
  test(`${name}: custom sample (square/Hex, mirrors, spinners, colossal) matches`, async () => {
    const mf = await load();
    for (const c of custom) {
      const b = mf.generate(c.code, c.index);
      assert.ok(b, c.code);
      assert.deepStrictEqual({ layoutKey: b.layoutKey, par: b.par, exact: b.exact, ropes: b.ropes.length, plan: b.plan },
        { layoutKey: c.layoutKey, par: c.par, exact: c.exact, ropes: c.ropes, plan: c.plan }, c.code + ' #' + c.index);
    }
  });
}
test('invalid set codes are refused', async () => {
  const mf = await backends.wasm();
  for (const code of ['', 'J2-MONKEYFIST', 'U3-X-1-100-10-14-120-N-SEED', 'U3-S-1-100-6-6-10-M-SEED', 'U3-S-50-10-10-14-10-N-SEED'])
    assert.strictEqual(mf.generate(code, 0), null, code);
});
