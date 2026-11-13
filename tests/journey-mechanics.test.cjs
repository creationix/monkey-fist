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

test('the opening is seeded, varied, compact and nontrivial without pinned layout identities', { timeout: 60000 }, () => {
  const levels = require('../grid-journey'), opening = levels.slice(0,10);
  assert.equal(new Set(opening.map(b=>b.grid)).size,2);
  assert.ok(new Set(opening.map(b=>b.W+'x'+b.H)).size>=2);
  assert.equal(new Set(opening.map(b=>b.layoutKey)).size,10);
  for (let index = 0; index < 10; index++) {
    const metadata = opening[index], b = G.generate({ ...G.DEFAULT,index });
    assert.equal(metadata.journeySeed,G.DEFAULT.seed);
    assert.equal(Object.hasOwn(metadata,'introSource'),false);
    assert.ok(b.ropes.length<=5); assert.ok(b.W*b.H<=48);
    assert.equal(b.mirrors.length,0); assert.equal(b.springs.length,0);
    assert.equal(G.allFree(b,b.ropes),false,'an opening board starts with an actual blocked rope');
    assert.ok(b.par*3>=b.ropes.length);
    assert.equal(G.replay(b,b.plan).solved,true);
    assert.equal(b.layoutKey,metadata.layoutKey); assert.equal(G.layoutKey(b),metadata.layoutKey);
    if(metadata.requireSlide) assert.ok(b.slideStats.manualSlides>0);
  }
  const again=G.generate({...G.DEFAULT,index:0});
  assert.equal(again.layoutKey,opening[0].layoutKey);
});

test('the master seed deterministically derives every Journey slot, including the opening', () => {
  const {execFileSync}=require('node:child_process'),path=require('node:path');
  const script=path.join(__dirname,'../scripts/build-grid-journey.cjs');
  const plan=seed=>JSON.parse(execFileSync(process.execPath,[script,'--seed',seed,'--plan'],{encoding:'utf8'}));
  const first=plan('MONKEYFIST'),same=plan('MONKEYFIST'),different=plan('ANOTHERSEED');
  assert.deepEqual(first,same);
  const specs=first.flatMap(chapter=>chapter.specs),other=different.flatMap(chapter=>chapter.specs);
  assert.equal(specs.length,120);assert.equal(other.length,120);
  for(let i=0;i<120;i++) {
    assert.equal(specs[i].journeySeed,'MONKEYFIST');assert.equal(other[i].journeySeed,'ANOTHERSEED');
    assert.notEqual(specs[i].seed,other[i].seed,'changing the master seed changes every slot’s initial map seed');
    assert.equal(Object.hasOwn(specs[i],'introSource'),false);
  }
  const levels=require('../grid-journey');
  for(let chapter=1;chapter<=12;chapter++) {
    const cards=levels.filter(b=>b.chapter===chapter);
    assert.equal(cards.length,10);
    assert.deepEqual(cards.map(b=>b.slot).sort((a,b)=>a-b),Array.from({length:10},(_,i)=>i));
    assert.ok(cards.every(b=>b.journeySeed==='MONKEYFIST'));
    assert.ok(cards.every(b=>Number.isInteger(b.seedAttempt)&&b.seedAttempt>=0));
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
