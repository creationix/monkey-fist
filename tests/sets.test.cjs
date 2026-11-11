const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../levels.js'), S = require('../sets.js');

test('the default campaign is the same seeded set, including its original descriptors', () => {
  for (const slide of [false, true]) {
    const opts = S.defaults(slide), code = S.code(opts);
    assert.deepEqual(L.parseCode(code), opts);
    assert.deepEqual(L.generateSet(opts).levels, L.generateSet(slide ? L.CAMPAIGN_SLIDE : L.CAMPAIGN).levels);
  }
});
test('legacy default progress, stars, kid times, and custom progress survive migration', () => {
  const custom = { mode: 'X', count: 10, seed: 'E5DDK', big: true, slide: true };
  const save = { slide: true, sets: { slide: { max: 16, stars: { 1: 3, 4: 2 } }, campaign: { max: 5, stars: { 2: 2 }, times: { 1: 8.5 } }, 'X10BS-E5DDK': { max: 4, stars: { 1: 3 } } }, recent: ['X10BS-E5DDK'], custom };
  S.migrate(save);
  assert.equal(save.sets['C60S-MONKEYFIST'].max, 16);
  assert.equal(save.sets['C60S-MONKEYFIST'].stars[4], 2);
  assert.equal(save.sets['C60-MONKEYFIST'].times[1], 8.5);
  assert.equal(save.sets['X10BS-E5DDK'].max, 4);
  assert.deepEqual(save.custom, S.defaults(true));
  save.sets['C60S-MONKEYFIST'].max = 20;
  save.custom = { mode: 'T', count: 12, seed: 'BRAVO', slide: true, big: false };
  S.migrate(save);
  assert.equal(save.sets['C60S-MONKEYFIST'].max, 20);
  assert.equal(save.custom.seed, 'BRAVO', 'reloading must not reset the chosen set');
  save.sets['C60S-MONKEYFIST'] = { max: 1, stars: {} };
  S.migrate(save);
  assert.deepEqual(save.sets['C60S-MONKEYFIST'], { max: 1, stars: {} }, 'explicit resets must not resurrect migrated progress');
});
test('all set styles share a canonical round-trippable code; Twists has twelve sliding levels', () => {
  for (const mode of ['C', 'E', 'N', 'H', 'X', 'T']) {
    const opts = S.normalize({ mode, count: 60, big: true, seed: 'ALPHA', slide: false });
    assert.deepEqual(L.parseCode(S.code(opts)), opts);
    if (mode === 'T') assert.deepEqual(opts, { mode: 'T', count: 12, big: false, slide: true, seed: 'ALPHA' });
  }
  for (const bad of ['T12-ALPHA', 'T12BS-ALPHA', 'T20S-ALPHA']) assert.equal(L.parseCode(bad), null);
});
