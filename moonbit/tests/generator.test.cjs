// web/generator.js, the game's only generator, must make the boards and measurements
// the Journey and custom sets were built and recorded with (grid-generator.js at
// 9e69e3a, since deleted), with both builds: wasm-gc, and the plain JS build that
// older Safari falls back to.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
globalThis.MFGame = require('../../game-engine.js');
const MFMoonBit = require('../web/generator.js');
const journey = require('../../scripts/grid-journey-measurements.json');
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
}
test('a set code that fits no board is an error, not a wrong board', async () => {
  const gen = await backends.js(), x = globalThis.MFCore;
  assert.throws(() => MFMoonBit.wrap({ ...x, generate: () => 0 }, 'js').generate({ kind: 'journey', index: 0 }), /No board fits J3-MONKEYFIST level 1/);
  assert.ok(gen.generate({ kind: 'journey', index: 0 }).ropes.length);
});
test('generate() rejects, not hangs, when neither build loads', async () => {
  // In Node there is no page to fetch moonbit/ from and no script loader, so load() fails.
  const fresh = require('vm').runInNewContext(fs.readFileSync(path.join(root, 'web/generator.js'), 'utf8') + ';MFMoonBit', { MFGame, Error, Promise, Array, String, Object, JSON, Number });
  await assert.rejects(fresh.generate({ index: 2 }));
});
// The Journey builder (scripts/build-grid-journey.cjs) makes candidates from
// specifications and re-measures them; this is what it stored for every level.
test('every Journey specification regenerates with the stored play measurements', { timeout: 300000 }, () => {
  const gen = MFMoonBit.local(), bad = [];
  for (const [i, m] of journey.entries()) {
    const b = gen.generateSpec(m), wins = gen.measure('journey/5/MONKEYFIST/measure/' + b.seed, b.springs.length ? 24 : 96);
    const { manualSlides, manualBounces, repeatedRopes, automaticRopes } = m.slideStats;
    const got = [b.par, b.layoutKey, Number(b.coverage.toFixed(4)), Number(wins.toFixed(4)), b.play.work, Number((b.play.work + 6 * (1 - wins)).toFixed(3)), b.slideStats, b.mechanicStats, Number(gen.targetChallenge(m.difficulty).toFixed(3))];
    const want = [m.par, m.layoutKey, m.coverage, m.play.casualWins, m.play.work, m.play.challenge, { manualSlides, manualBounces, repeatedRopes, automaticRopes }, m.mechanicStats, m.targetChallenge];
    if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(i + 1);
  }
  assert.deepStrictEqual(bad, []);
});
