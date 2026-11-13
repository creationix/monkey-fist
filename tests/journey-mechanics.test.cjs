const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../game-engine');
const F = require('../grid-generator');
const key = p => p.q+','+p.r;

function observedUse(b) {
  const mirrors = new Set(b.mirrors.map(m => key(m.cell))), springs = new Set(b.springs.map(key));
  const turned = new Set(), bounced = new Set(), manualTurns = new Set(), manualBounces = new Set();
  let paths = b.ropes, bounceActions = 0;
  for (const [step,id] of b.plan.entries()) {
    const before = paths[id], move = G.tap(b,paths,id); assert.ok(move);
    for (let at = before.length; at < move.route.length; at++) {
      const p = move.route[at]; if (!mirrors.has(key(p))) continue;
      const a = move.route[at-1], incoming = [p.q-a.q,p.r-a.r];
      const next = move.route[at+1], outgoing = next ? [next.q-p.q,next.r-p.r] : G.direction(b,move.paths[id]);
      if (incoming[0] !== outgoing[0] || incoming[1] !== outgoing[1]) { turned.add(key(p)); if (step < b.par) manualTurns.add(key(p)); }
    }
    if (move.event === 'bounce') {
      const at = key(move.route.at(-1)); assert.ok(springs.has(at)); bounced.add(at);
      if (step < b.par) { manualBounces.add(at); bounceActions++; }
    }
    paths = move.paths;
    const occupied = new Set();
    for (const path of paths.filter(Boolean)) for (const p of path) { assert.ok(!occupied.has(key(p)),'shared spinners cannot leave overlapping ropes'); occupied.add(key(p)); }
  }
  assert.ok(paths.every(p => !p));
  return { usedMirrors:turned.size, usedSprings:bounced.size, manualMirrors:manualTurns.size, manualSprings:manualBounces.size, bounceActions };
}
const originalIntroKeys = {
  0:'wc4klj-fsbag5', 1:'7ka4pd-11dvd6j', 2:'17nc4lr-l4lawt', 3:'32i8j9-prmp33', 4:'9jkn6z-pvi8bd',
  5:'1vd9cy1-rqv90v', 6:'nl7yuv-1y42v1l', 7:'14ezvae-stj7es', 8:'19up6wq-1kscun0', 9:'mznpy2-1688lh0',
};

test('mechanics appear early and remain represented in every later Journey chapter', () => {
  const levels = require('../grid-journey'); assert.equal(levels.length,120);
  const firstMirror = levels.findIndex(b => b.mirrors)+1, firstSpring = levels.findIndex(b => b.springs)+1;
  assert.ok(firstMirror >= 11 && firstMirror <= 20, 'mirrors are introduced in the second group');
  assert.ok(firstSpring >= 11 && firstSpring <= 30, 'spinners are introduced by the third group');
  for (let chapter = 4; chapter <= 12; chapter++) {
    const cards = levels.slice((chapter-1)*10,chapter*10);
    assert.ok(cards.filter(b => b.mirrors).length >= 5, `chapter ${chapter} keeps turning mirrors in play`);
    assert.ok(cards.filter(b => b.springs).length >= 5, `chapter ${chapter} keeps spinners in play`);
  }
});

test('later mechanic tiles are used by the final manual solution, not placed as decoration', { timeout: 180000 }, () => {
  const levels = require('../grid-journey');
  for (const [index,b] of levels.entries()) {
    if (b.minParRatio) assert.ok(b.par / b.ropeCount >= b.minParRatio);
    if (b.minPartialSlides) {
      assert.ok(b.slideStats.manualSlides >= b.minPartialSlides);
      assert.equal(b.slideStats.manualSlides,b.featureUse.manualSlides,'the packed plan trace agrees with the generator slide count');
    }
    if (b.minRepeatedRopes) assert.ok(b.slideStats.repeatedRopes >= b.minRepeatedRopes);
    if (b.minInterleavedRopes) assert.ok(b.slideStats.interleavedRopes >= b.minInterleavedRopes);
    if (index < 30) continue;
    if (b.mirrors || b.springs) assert.ok(b.mechanicStats,'late mechanic metadata records actual manual usage');
    if (b.mirrors) {
      assert.ok(b.minMirrors >= 3); assert.ok(b.mechanicStats.manualMirrors >= 3); assert.ok(b.mechanicStats.usedMirrors >= 3);
    }
    if (b.springs) {
      assert.ok(b.minSprings >= 2); assert.ok(b.mechanicStats.manualSprings >= 2); assert.ok(b.mechanicStats.usedSprings >= 2);
      assert.ok(b.featureUse.manualBounces >= 2);
    }
  }
  const selected = new Set([levels.findIndex(b => b.mirrors),levels.findIndex(b => b.springs)]);
  for (const grid of ['square','hex']) {
    const index = levels.findIndex((b,i) => i >= 60 && b.grid === grid && b.mirrors && b.springs);
    assert.ok(index >= 0, `later ${grid} levels mix the mechanics`); selected.add(index);
  }
  for (const index of selected) {
    const metadata = levels[index], b = G.generate({ ...G.DEFAULT,index });
    const replayed = G.replay(b,b.plan); assert.equal(replayed.solved,true); assert.equal(replayed.taps,b.par);
    assert.deepEqual([b.W,b.H],[metadata.W,metadata.H]); assert.ok(b.coverage >= .8);
    const observed = observedUse(b), reported = F.featureStats(b,b.plan,b.par,G);
    const { bounceActions,...distinct } = observed; assert.deepEqual(reported,distinct);
    assert.equal(observed.usedMirrors,b.mirrors.length,'every placed mirror changes an actual route direction');
    assert.equal(observed.usedSprings,b.springs.length,'every distinct spinner reverses a rope');
    assert.ok(observed.manualMirrors >= (metadata.minMirrors||0)); assert.ok(observed.manualSprings >= (metadata.minSprings||0));
    if (metadata.minSprings >= 2) assert.ok(bounceActions >= 2);
    assert.equal(G.layoutKey(b),metadata.layoutKey);
  }
});

test('the ten introductory maps keep their layout identities while later mechanics change', { timeout: 60000 }, () => {
  const levels = require('../grid-journey'), intro = levels.slice(0,10);
  assert.deepEqual(intro.map(b => b.introSource).sort((a,b) => a-b),[...Array(10).keys()]);
  for (let index = 0; index < 10; index++) {
    const metadata = intro[index], b = G.generate({ ...G.DEFAULT,index });
    assert.equal(metadata.layoutKey,originalIntroKeys[metadata.introSource]);
    assert.equal(b.layoutKey,metadata.layoutKey); assert.equal(G.layoutKey(b),metadata.layoutKey);
    assert.equal(b.mirrors.length,0); assert.equal(b.springs.length,0);
  }
});

test('later plain-rule interludes require real repeated sliding work', () => {
  const levels = require('../grid-journey');
  const plain = levels.filter((b,i) => i >= 40 && !b.mirrors && !b.springs); assert.ok(plain.length >= 4);
  for (const b of plain) {
    assert.ok(b.minParRatio > 1); assert.ok(b.par > b.ropeCount,'repeated work pushes the manual target above a single move per rope');
    assert.ok(b.minPartialSlides >= 3); assert.ok(b.slideStats.manualSlides >= b.minPartialSlides);
    assert.ok(b.slideStats.repeatedRopes >= 1); assert.ok(b.featureUse.repeatedSlideRopes >= 1);
  }
});
