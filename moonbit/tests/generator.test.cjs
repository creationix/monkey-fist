// web/generator.js must hand the JS game exactly the boards grid-generator.js makes,
// with both builds: wasm-gc, and the plain JS build that older Safari falls back to.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
globalThis.MFGame = require('../../web/game-engine.js');
const MFMoonBit = require('../web/generator.js');
const journey = require('../../web/scripts/grid-journey-measurements.json');
const custom = require('./custom-expected.json');
const cases = require('../scripts/cases.cjs');

const backends = {
  'wasm-gc': async () => {
    const { instance } = await WebAssembly.instantiate(fs.readFileSync(path.join(root, 'dist/gen.wasm')), {});
    return MFMoonBit.wrap(instance.exports, 'wasm-gc');
  },
  js: async () => {
    if (!globalThis.MFCore) vm.runInThisContext(fs.readFileSync(path.join(root, 'dist/gen.js'), 'utf8'), { filename: 'gen.js' });
    return MFMoonBit.wrap(globalThis.MFCore, 'js');
  },
};
// The fields the game reads, plus the specification it was made from.
const FIELDS = ['grid', 'W', 'H', 'ropes', 'mirrors', 'springs', 'plan', 'par', 'layoutKey', 'index', 'seed', 'difficulty'];
const pick = b => Object.fromEntries(FIELDS.map(k => [k, b[k]]));
// A sample regenerated live by the JS generator and compared field by field.
const live = [...[0, 9, 10, 25, 39, 47, 58, 64, 77, 86, 99, 110, 119].map(index => ({ opts: { kind: 'journey' }, index })),
  ...cases.filter(c => !c.opts.colossal && c.opts.width * c.opts.height <= 300)];
const reference = new Map(live.map(c => [c, pick(MFGame.generate({ ...c.opts, index: c.index }))]));

for (const [name, load] of Object.entries(backends)) {
  test(`${name}: every Journey level matches the JS generator`, async () => {
    const gen = await load(), bad = [];
    assert.strictEqual(gen.backend, name);
    for (let i = 0; i < 120; i++) {
      const b = gen.generate({ kind: 'journey', index: i }), m = journey[i];
      if (b.layoutKey !== m.layoutKey || b.par !== m.par || b.ropes.length !== m.ropeCount || b.grid !== m.grid || b.W !== m.W || b.H !== m.H || b.index !== i) bad.push(i + 1);
    }
    assert.deepStrictEqual(bad, []);
  });
  test(`${name}: custom sets match, colossal maps included`, async () => {
    const gen = await load();
    cases.forEach((c, k) => {
      const b = gen.generate({ ...MFGame.normalize({ ...c.opts, kind: 'custom' }), index: c.index }), e = custom[k];
      assert.strictEqual(MFGame.code(MFGame.normalize({ ...c.opts, kind: 'custom' })), e.code);
      assert.deepStrictEqual({ layoutKey: b.layoutKey, par: b.par, ropes: b.ropes.length, plan: b.plan },
        { layoutKey: e.layoutKey, par: e.par, ropes: e.ropes, plan: e.plan }, e.code + ' #' + e.index);
    });
  });
  test(`${name}: boards are field for field the JS generator's`, async () => {
    const gen = await load();
    for (const [c, expected] of reference) assert.deepStrictEqual(pick(gen.generate({ ...c.opts, index: c.index })), expected, JSON.stringify(c));
  });
}
test('a set code that fits no board is an error, not a wrong board', async () => {
  const gen = await backends.js(), x = globalThis.MFCore;
  assert.throws(() => MFMoonBit.wrap({ ...x, generate: () => 0 }, 'js').generate({ kind: 'journey', index: 0 }), /No board fits J3-MONKEYFIST level 1/);
  assert.ok(gen.generate({ kind: 'journey', index: 0 }).ropes.length);
});
test('generate() falls back to the JS generator when neither build loads', async () => {
  // In Node there is no page to fetch moonbit/ from and no script loader, so load() fails.
  const fresh = require('vm').runInNewContext(fs.readFileSync(path.join(root, 'web/generator.js'), 'utf8') + ';MFMoonBit', { MFGame, Error, Promise, Array, String, Object });
  const made = [];
  assert.strictEqual(await fresh.generate({ index: 2 }, o => (made.push(o), 'fallback board')), 'fallback board');
  assert.deepStrictEqual(made, [{ index: 2 }]);
});
