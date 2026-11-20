const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../random.js'), L = require('../levels.js');

test('shared randomness preserves the sequences used by existing level codes', () => {
  for (const [seed, expected] of [
    [0, [0.26642920868471265, 0.0003297457005828619, 0.2232720274478197, 0.1462021479383111]],
    [1, [0.6270739405881613, 0.002735721180215478, 0.5274470399599522, 0.9810509674716741]],
    [0xffffffff, [0.8964226141106337, 0.189478256739676, 0.7156526781618595, 0.9440599093213677]],
  ]) assert.deepEqual(Array.from({ length: 4 }, R.mulberry32(seed)), expected);
  assert.equal(L.mulberry32, R.mulberry32);
  assert.equal(L.hashString, R.hashString);
  for (const [text, hash] of [['', 2166136261], ['MONKEYFIST', 179956478], ['hello', 1335831723], ['🌴Cañopy', 2911282810]]) assert.equal(R.hashString(text), hash);
});

test('shuffle keeps its in-place contract and consumes only the original random draws', () => {
  const values = [0, 1, 2, 3, 4], draws = [0, .5, .9, .25]; let count = 0;
  assert.equal(R.shuffle(values, () => draws[count++]), values);
  assert.deepEqual(values, [1, 4, 3, 2, 0]); assert.equal(count, 4);
  for (const short of [[], [1]]) {
    assert.equal(R.shuffle(short, () => assert.fail('empty/singleton lists must not consume randomness')), short);
  }
});
