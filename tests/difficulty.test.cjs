const test = require('node:test'), assert = require('node:assert/strict');
const G = require('../game-engine'), J = require('../journey');
function verify(b, n) {
  assert.equal(b.ropes.length, n); assert.equal(G.allFree(b, b.ropes), false);
  const result = G.replay(b, b.plan); assert.equal(result.solved, true); assert.equal(result.taps, b.par);
  let paths = b.ropes;
  function occupancy() {
    const seen = new Set();
    for (const path of paths.filter(Boolean)) {
      for (let i = 0; i < path.length; i++) {
        const p = path[i], key = p.q + ',' + p.r; assert.ok(!seen.has(key)); seen.add(key);
        if (i) { const a = path[i - 1], dq = p.q - a.q, dr = p.r - a.r;
          assert.ok((b.grid === 'hex' ? G.DIRS : [[1,0],[-1,0],[0,1],[0,-1]]).some(d => d[0] === dq && d[1] === dr), 'each body follows unit grid edges'); }
      }
    }
  }
  occupancy(); for (const id of b.plan) { paths = G.tap(b, paths, id).paths; occupancy(); }
}
test('size stays fixed while difficulty adds repeated unlocking, on either grid and with optional twists', { timeout: 120000 }, () => {
  for (const grid of ['square', 'hex']) for (const [mirrors, springs] of [[false,false],[true,false],[false,true],[true,true]]) {
    const pars = [];
    for (const d of [1, 45, 100]) {
      const o = { revision: 2, grid, seed: 'KNOBS', min: d, max: d, sizeMin: 10, sizeMax: 10, count: 1, mirrors, springs };
      const b = G.generate(o); verify(b, 10); pars.push(b.par);
      assert.equal(!!b.mirrors.length, mirrors); assert.equal(!!b.springs.length, springs);
      assert.deepEqual(G.parseCode(G.code(o)), G.normalize(o));
    }
    assert.ok(pars[0] <= 3); assert.ok(pars[2] >= 24, grid + ' needs many unlocking taps');
    assert.ok(pars[0] < pars[1] && pars[1] < pars[2]);
  }
});
test('sizes and counts are independent of the difficulty range and remain shareable', () => {
  const a = G.normalize({ revision: 2, seed: 'SIZE', min: 1, max: 10, sizeMin: 4, sizeMax: 25, count: 30 });
  const b = { ...a, min: 80, max: 100 };
  for (let i = 0; i < 30; i++) assert.equal(G.spec(a, i).size, G.spec(b, i).size);
  assert.equal(G.code(G.parseCode('U1-H-1-1-1-S-FLIP0')), 'U1-H-1-1-1-S-FLIP0');
  assert.equal(G.code(G.parseCode('J1-MONKEYFIST')), 'J1-MONKEYFIST');
  assert.equal(G.code(G.ROPE_DEFAULT), 'J2-MONKEYFIST');
  assert.equal(G.code(G.DEFAULT), 'J3-MONKEYFIST');
  assert.equal(G.parseCode('U2-S-1-100-20-2-5-N-TEST'), null);
  assert.equal(G.normalize({ revision: 2, sizeMin: 150 }).sizeMax, 150);
});
test('small, odd, and large counts all have safe solvable dependency paths', { timeout: 120000 }, () => {
  for (const grid of ['square', 'hex']) for (const size of [2,3,5,17,80]) for (const d of [1,100]) {
    verify(G.generate({ revision: 2, grid, seed: 'ODDS', min: d, max: d, sizeMin: size, sizeMax: size, count: 1, mirrors: true, springs: true }), size);
  }
});
test('legacy rope-count Journey uses random sizes and is sorted by measured taps per rope, then rope count', { timeout: 180000 }, () => {
  assert.equal(J.length, 120);
  for (let i = 0; i < 120; i++) {
    const b = G.generate({ ...G.ROPE_DEFAULT, index: i }); verify(b, J[i].size); assert.equal(b.par, J[i].par, 'metadata matches procedural replay');
    if (i) { const prev = J[i - 1], next = J[i]; assert.ok(prev.par * next.size <= next.par * prev.size);
      if (prev.par * next.size === next.par * prev.size) assert.ok(prev.size <= next.size); }
  }
  assert.equal(J.filter(b => b.grid === 'hex').length, 60);
  assert.ok(new Set(J.map(b => b.size)).size > 25);
  assert.ok(J.slice(80).some((b,i) => i && b.size < J[79+i].size), 'size is not a second difficulty ramp');
});
