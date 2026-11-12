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
test('all set styles share a canonical round-trippable code; procedural Twists supports counts and big boards', () => {
  for (const mode of ['C', 'E', 'N', 'H', 'X', 'T']) {
    const opts = S.normalize({ mode, count: 60, big: true, seed: 'ALPHA', slide: false });
    assert.deepEqual(L.parseCode(S.code(opts)), opts);
    if (mode === 'T') assert.deepEqual(opts, { mode: 'T', count: 60, big: true, slide: true, seed: 'ALPHA' });
  }
  for (const bad of ['T12-ALPHA', 'T15S-ALPHA', 'T20B-ALPHA']) assert.equal(L.parseCode(bad), null);
  assert.equal(L.parseCode('T12S-ALPHA').count, 12, 'legacy share codes still open a generated set');
});
test('only former curated Twists progress is archived, once', () => {
  const old = { max: 8, stars: { 1: 3, 7: 2 } }, normal = { max: 30, stars: { 1: 3 } };
  const save = { setUI: 1, custom: { mode: 'T', count: 12, seed: 'ALPHA' }, sets: { 'T12S-ALPHA': old, 'C60S-MONKEYFIST': normal } };
  S.migrate(save);
  assert.equal(save.sets['T12S-ALPHA'], undefined);
  assert.deepEqual(save.levelArchives['twists-curated']['T12S-ALPHA'], old);
  assert.equal(save.sets['C60S-MONKEYFIST'], normal);
  save.sets['T12S-ALPHA'] = { max: 3, stars: { 1: 2 } };
  S.migrate(save);
  assert.equal(save.sets['T12S-ALPHA'].max, 3, 'new generated progress survives reload');
  assert.equal(save.custom.mode, 'T');
});
test('mechanics upgrades archive only changed scores, keep genuine unlocks, and do not touch other modes', () => {
  const ordinary = { max: 12, stars: { 9: 3 } }, oldTwists = { max: 20, stars: { 1: 3 } };
  const save = { setUI: 1, twistsGen: 1, custom: S.defaults(true), sets: {
    'C60S-MONKEYFIST': { max: 40, stars: { 1: 3, 8: 2, 9: 3, 40: 3 } },
    'C60-MONKEYFIST': ordinary, 'N20S-ALPHA': ordinary, 'T60S-ALPHA': oldTwists
  } };
  S.migrate(save);
  assert.equal(save.sets['C60S-MONKEYFIST'].max, 40);
  assert.deepEqual(save.sets['C60S-MONKEYFIST'].stars, { 1: 3, 8: 2 });
  assert.equal(save.levelArchives['progressive-0']['C60S-MONKEYFIST'].stars[40], 3);
  assert.equal(save.levelArchives['twists-1']['T60S-ALPHA'], oldTwists);
  assert.equal(save.sets['N20S-ALPHA'], ordinary); assert.equal(save.sets['C60-MONKEYFIST'], ordinary);
  save.sets['C60S-MONKEYFIST'].stars[9] = 3; S.migrate(save);
  assert.equal(save.sets['C60S-MONKEYFIST'].stars[9], 3, 'migration must run only once');
});
test('route-first upgrade retains older archives and genuine unlocks, and runs once', () => {
  const save = { setUI: 1, twistsGen: 2, progressiveGen: 1, custom: S.defaults(true),
    twistsArchive: { legacy: { max: 5 } }, levelArchives: { 'progressive-0': { legacy: true } },
    sets: { 'C60S-MONKEYFIST': { max: 51, stars: { 1: 3, 8: 3, 60: 2 } }, 'T60BS-ALPHA': { max: 40, stars: { 4: 3 } } } };
  S.migrate(save);
  assert.equal(save.levelArchives['progressive-0'].legacy, true);
  assert.equal(save.twistsArchive.legacy.max, 5);
  assert.equal(save.levelArchives['progressive-1']['C60S-MONKEYFIST'].stars[60], 2);
  assert.equal(save.levelArchives['twists-2']['T60BS-ALPHA'].stars[4], 3);
  assert.equal(save.sets['C60S-MONKEYFIST'].max, 51);
  assert.deepEqual(save.sets['C60S-MONKEYFIST'].stars, { 1: 3, 8: 3 });
  save.sets['C60S-MONKEYFIST'].stars[60] = 3; S.migrate(save);
  assert.equal(save.sets['C60S-MONKEYFIST'].stars[60], 3);
});
