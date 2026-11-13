const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../game-engine');
const F = require('../grid-generator');
const L = require('../levels');
const H = require('../hex/engine');
const Q = require('../dependency-metrics');

function options(grid, width = 8, height = 8) {
  return { revision: 3, grid, width, height, min: 100, max: 100, count: 1, seed: 'REPEAT' };
}
function manualWork(b) {
  const replayed = G.replay(b, b.plan); assert.equal(replayed.solved, true); assert.equal(replayed.taps, b.par);
  const partialByRope = new Map(); let paths = b.ropes, manualSlides = 0;
  const occupied = current => {
    const seen = new Set();
    for (const path of current.filter(Boolean)) for (const p of path) {
      const key = p.q+','+p.r; assert.ok(!seen.has(key), 'a partial-slide destination cannot overlap another rope'); seen.add(key);
      assert.ok(b.grid === 'hex' ? H.inside(b,p) : p.q >= 0 && p.r >= 0 && p.q < b.W && p.r < b.H);
    }
  };
  occupied(paths);
  for (const [step, id] of b.plan.entries()) {
    const move = G.tap(b,paths,id); assert.ok(move);
    if (step < b.par && move.event === 'slide') { manualSlides++; partialByRope.set(id,(partialByRope.get(id)||0)+1); }
    paths = move.paths; occupied(paths);
  }
  return { manualSlides, repeated: [...partialByRope.values()].filter(n => n >= 2).length,
    events: replayed.events, metrics: Q.analyze(b,b.plan,b.par,G) };
}
function prove(b) {
  const result = b.grid === 'square' ? L.fewestPlayerTaps(b.ropes.map(path => path.map(p => ({ x:p.q,y:p.r }))),b.W,b.H,b.plan,100000) :
    H.fewestPlayerTaps(b,b.plan,100000);
  assert.equal(result.exact,true,'the small regression needs a completed minimum-tap search');
  assert.equal(result.count ?? result.par,b.par,'extra taps must be required, not only present in a longer certificate');
  const plan = result.taps ?? result.plan;
  assert.equal(G.replay(b,plan).solved,true);
}

test('small dense square and Hex puzzles can provably need more taps than ropes', { timeout: 120000 }, () => {
  for (const [grid,count,par] of [['square',12,14],['hex',9,11]]) {
    const b = G.generate(options(grid)), before = JSON.stringify(b.ropes);
    assert.deepEqual([b.W,b.H],[8,8]); assert.equal(b.ropes.length,count); assert.equal(b.par,par); assert.ok(b.par > count);
    assert.ok(b.coverage >= .85); assert.equal(b.exact,true);
    const work = manualWork(b);
    assert.ok(work.manualSlides >= 4); assert.ok(work.repeated >= 1);
    assert.ok(work.metrics.revisitedRopes >= 1,'another blocker must free a rope between its required moves');
    assert.equal(work.manualSlides,b.slideStats.manualSlides); assert.equal(work.repeated,b.slideStats.repeatedRopes);
    assert.equal(b.slideStats.manualBounces,0,'plain-rule complexity comes from sliding, not artificial bounce taps');
    prove(b); assert.equal(JSON.stringify(b.ropes),before,'search and replay keep the initial generated layout intact');
  }
});

test('required partial-slide and interleaving work remains real on a larger fixed grid', { timeout: 120000 }, () => {
  for (const grid of ['square','hex']) {
    const requirements = { minPartialSlides:4,minRepeatedRopes:1,minInterleavedRopes:1,minParRatio:1.05 };
    const b = F.generate({ ...G.spec(options(grid,10,12),0), ...requirements },G);
    assert.deepEqual([b.W,b.H],[10,12]); assert.ok(b.coverage >= .85); assert.ok(b.par / b.ropes.length >= requirements.minParRatio);
    const work = manualWork(b);
    assert.ok(work.manualSlides >= requirements.minPartialSlides); assert.ok(work.repeated >= requirements.minRepeatedRopes);
    assert.ok(work.metrics.revisitedRopes >= 1);
    const core = b.constructionStats.seededRopes, manual = b.plan.slice(0,b.par);
    const first = manual.findIndex(id => id < core), last = manual.findLastIndex(id => id < core);
    const helpers = new Set(manual.slice(first,last+1).filter(id => id >= core));
    assert.ok(helpers.size >= requirements.minInterleavedRopes,'ordinary blockers move during the core, not only before or after it');
    assert.equal(helpers.size,b.slideStats.interleavedRopes);
    if (b.exact) prove(b); // Larger targets may explicitly remain best known.
  }
});

test('repeated-slide generation and proof searches do not contaminate later regenerations', { timeout: 120000 }, () => {
  for (const grid of ['square','hex']) {
    const settings = options(grid), b = G.generate(settings), original = JSON.stringify(b);
    prove(b); manualWork(b);
    G.generate({ ...settings, seed:'OTHERREPEAT' });
    const again = G.generate(G.parseCode(G.code(settings)));
    assert.equal(JSON.stringify(b),original);
    assert.equal(again.layoutKey,b.layoutKey); assert.deepEqual(again.ropes,b.ropes); assert.deepEqual(again.plan,b.plan); assert.equal(again.par,b.par);
  }
});
