// The last test of moonbit/tests/generator.test.cjs ("every Journey specification
// regenerates with the stored play measurements"), run on dist/gen.wasm instead of
// the JS build that MFMoonBit.local() loads. It checks generate_spec, measure,
// target_challenge and the slide/mechanic stats and doubles that generate() returns.
// MF_MEASUREMENTS names another measurements file: the port's own Journey
// (encantis/core/oracle/fixtures/journey-port-measurements.json) for core.wasm.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
globalThis.MFGame = require('../../game-engine.js');
const MFMoonBit = require('../web/generator.js');
const journey = require(process.env.MF_MEASUREMENTS || '../../scripts/grid-journey-measurements.json');
test('wasm: every Journey specification regenerates with the stored play measurements', { timeout: 600000 }, async () => {
  const { instance } = await WebAssembly.instantiate(fs.readFileSync(path.join(__dirname, '../dist/gen.wasm')), {});
  const gen = MFMoonBit.wrap(instance.exports, 'wasm-gc'), bad = [];
  for (const [i, m] of journey.entries()) {
    const b = gen.generateSpec(m), wins = gen.measure('journey/5/MONKEYFIST/measure/' + b.seed, b.springs.length ? 24 : 96);
    const { manualSlides, manualBounces, repeatedRopes, automaticRopes } = m.slideStats;
    const got = [b.par, b.layoutKey, Number(b.coverage.toFixed(4)), Number(wins.toFixed(4)), b.play.work, Number((b.play.work + 6 * (1 - wins)).toFixed(3)), b.slideStats, b.mechanicStats, Number(gen.targetChallenge(m.difficulty).toFixed(3))];
    const want = [m.par, m.layoutKey, m.coverage, m.play.casualWins, m.play.work, m.play.challenge, { manualSlides, manualBounces, repeatedRopes, automaticRopes }, m.mechanicStats, m.targetChallenge];
    if (JSON.stringify(got) !== JSON.stringify(want)) bad.push(i + 1);
  }
  assert.deepStrictEqual(bad, []);
});
