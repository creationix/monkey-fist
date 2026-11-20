const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../game-engine');
const { evaluatePlayers } = require('../scripts/lib/puzzle-players.cjs');
const p = ([q,r]) => ({q,r});
const board = (W,H,ropes,mirrors=[]) => ({ grid:'square',W,H,ropes:ropes.map(r=>r.map(p)),mirrors,springs:[],locks:[] });
function fatalChoice() {
  return { ...board(6,6,[ [[0,2],[1,2]], [[4,2],[4,3],[4,4],[3,4],[2,4],[2,3]] ]), plan:[1,0],par:1 };
}

test('seeded policies distinguish an exit-only solution from a fatal partial slide without claiming universal safety', () => {
  const b = fatalChoice(), before = JSON.stringify(b);
  const result = evaluatePlayers(b,G,{ seed:'PLAYTEST',trials:128 });
  assert.deepEqual(result,evaluatePlayers(b,G,{ seed:'PLAYTEST',trials:128 }));
  assert.equal(JSON.stringify(b),before);
  assert.equal(result.referenceTaps,1);
  const { exitFirst,randomLegal,cautious } = result.policies;
  assert.equal(exitFirst.wins,128); assert.equal(exitFirst.losses,0); assert.equal(exitFirst.meanManualTaps,1);
  assert.equal(exitFirst.meanExcessTaps,0);
  assert.ok(exitFirst.winRate95.low < 1 && exitFirst.winRate95.high === 1,'all observed wins still have uncertainty');
  assert.ok(randomLegal.wins > 0 && randomLegal.losses > 0,'a policy that tries partial slides can choose a fatal option');
  assert.equal(randomLegal.censored,0);
  assert.equal(cautious.wins,128); assert.ok(cautious.fatalChoices > 0);
  assert.equal(cautious.restarts,0);
});

test('a repeated mirror configuration is censored as a loop rather than labelled an unsolvable loss', () => {
  const b = board(6,6,[[[2,1],[3,1]]],[
    {cell:p([1,1]),slope:'/'},{cell:p([4,1]),slope:'\\'},
    {cell:p([4,4]),slope:'/'},{cell:p([1,4]),slope:'\\'},
  ]);
  for (const policy of Object.values(evaluatePlayers(b,G,{trials:3,maxSteps:20}).policies)) {
    assert.equal(policy.wins,0); assert.equal(policy.losses,0); assert.equal(policy.loops,3);
    assert.equal(policy.censored,3); assert.equal(policy.timeouts,0); assert.equal(policy.completedWinRate,null);
    assert.equal(policy.meanSteps,6); assert.equal(policy.meanManualTaps,null); assert.equal(policy.meanExcessTaps,null);
  }
});

test('tap accounting matches initial all-free production behavior, automatic suffixes and empty boards', () => {
  const free = { ...board(4,4,[[[0,0],[1,0]],[[2,2],[3,2]]]),plan:[0,1],par:1 };
  assert.equal(G.allFree(free,free.ropes),true);
  for (const policy of Object.values(evaluatePlayers(free,G,{trials:3}).policies)) {
    assert.equal(policy.wins,3); assert.equal(policy.meanManualTaps,1); assert.equal(policy.meanExcessTaps,0);
  }
  for (const policy of Object.values(evaluatePlayers(board(4,4,[]),G,{trials:3,maxSteps:0}).policies)) {
    assert.equal(policy.wins,3); assert.equal(policy.meanManualTaps,0);
  }
  for (const policy of Object.values(evaluatePlayers(fatalChoice(),G,{trials:3,maxSteps:0,lookaheadBudget:0}).policies)) {
    assert.equal(policy.wins,0); assert.equal(policy.losses,0); assert.equal(policy.timeouts,3); assert.equal(policy.censored,3);
  }
});

test('a sound immediate dead end counts as a loss and invalid or missing certificates do not create a tap target', () => {
  const b = fatalChoice(), paths = G.tap(b,b.ropes,0).paths;
  const lost = { ...b,ropes:paths,plan:[] };
  const result = evaluatePlayers(lost,G,{trials:2}); assert.equal(result.referenceTaps,null);
  for (const policy of Object.values(result.policies)) {
    assert.equal(policy.losses,2); assert.equal(policy.censored,0); assert.equal(policy.meanSteps,0);
  }
  const noCertificate = { ...b }; delete noCertificate.plan;
  assert.equal(evaluatePlayers(noCertificate,G,{trials:1}).referenceTaps,null);
  assert.throws(()=>evaluatePlayers(b,G,{trials:0}),RangeError);
  assert.throws(()=>evaluatePlayers(b,G,{lookaheadBudget:-1}),RangeError);
});
