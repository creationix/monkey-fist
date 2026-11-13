const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../game-engine');
const { evaluateSearch } = require('../scripts/lib/puzzle-search.cjs');
const p = ([q,r]) => ({q,r});
const board = (W,H,ropes,extra = {}) => ({grid:'square',W,H,ropes:ropes.map(r=>r.map(p)),mirrors:[],springs:[],locks:[],...extra});
const stopper = () => board(8,6,[
  [[5,1],[4,1],[3,1],[2,1],[1,1],[0,1],[0,2],[1,2]],
  [[4,2],[4,3]],
  [[6,2],[6,3],[6,4],[5,4],[5,3]],
],{plan:[1,2,0,2,0]});
function replayResult(b, result) {
  assert.equal(result.solved,true); assert.ok(result.bestPlan);
  const replay = G.replay(b,result.bestPlan); assert.equal(replay.solved,true);
  const value = result.objective === 'manualTaps' ? replay.taps : replay.events.filter(e=>e!=='exit').length;
  assert.equal(value,result.upperBound);
}

test('a free rope remains available as a stopper in both exact objectives', () => {
  const b = stopper(), before = JSON.stringify(b);
  for (const [objective,value] of [['manualTaps',3],['nonExitMoves',1]]) {
    const answer = evaluateSearch(b,G,{objective});
    assert.equal(answer.status,'optimal'); assert.equal(answer.exact,true);
    assert.equal(answer.lowerBound,value); assert.equal(answer.upperBound,value);
    assert.equal(answer.bestPlan[0],0,'the first move retains the initially clear rope');
    replayResult(b,answer);
  }
  assert.equal(JSON.stringify(b),before);
});

test('full-path visited states terminate a mirror-only cycle as exhaustively unsolvable', () => {
  const b = board(6,6,[[[2,1],[3,1]]],{mirrors:[
    {cell:p([1,1]),slope:'/'},{cell:p([4,1]),slope:'\\'},
    {cell:p([4,4]),slope:'/'},{cell:p([1,4]),slope:'\\'},
  ]});
  for (const objective of ['manualTaps','nonExitMoves']) {
    const answer = evaluateSearch(b,G,{objective,nodeBudget:6});
    assert.equal(answer.status,'unsolvable'); assert.equal(answer.solved,false); assert.equal(answer.exact,true);
    assert.equal(answer.nodes,6); assert.equal(answer.lowerBound,null); assert.equal(answer.upperBound,null); assert.equal(answer.bestPlan,null);
  }
});

test('spinner cycles also retain full path states and exhaust without hanging', () => {
  const b = board(5,3,[[[1,1],[2,1]]],{springs:[p([0,1]),p([4,1])]});
  const answer = evaluateSearch(b,G,{objective:'nonExitMoves',nodeBudget:20});
  assert.equal(answer.status,'unsolvable'); assert.equal(answer.exact,true); assert.equal(answer.nodes,3);
});

test('an automatic suffix is free on both grids, but an initially free board still needs its first player tap', () => {
  for (const grid of ['square','hex']) {
    const b = board(6,2,[[[0,0],[1,0]],[[3,0],[4,0]]],{grid,plan:[1,0]});
    const manual = evaluateSearch(b,G,{objective:'manualTaps',nodeBudget:0});
    assert.deepEqual([manual.status,manual.lowerBound,manual.upperBound],['optimal',1,1]); replayResult(b,manual);
    const slides = evaluateSearch(b,G,{objective:'nonExitMoves',nodeBudget:0});
    assert.deepEqual([slides.status,slides.lowerBound,slides.upperBound],['optimal',0,0]); replayResult(b,slides);
    const free = board(4,2,[[[0,0],[1,0]]],{grid});
    const first = evaluateSearch(free,G,{objective:'manualTaps',nodeBudget:0});
    assert.equal(first.upperBound,1); assert.equal(first.bestPlan.length,1); replayResult(free,first);
    const empty = evaluateSearch({...free,ropes:[]},G,{objective:'manualTaps',nodeBudget:0});
    assert.equal(empty.upperBound,0); assert.deepEqual(empty.bestPlan,[]);
  }
});

test('budget exhaustion returns honest bounds and distinguishes a known solution from unknown solvability', () => {
  for (const objective of ['manualTaps','nonExitMoves']) {
    const b = stopper(), answer = evaluateSearch(b,G,{objective,nodeBudget:0});
    assert.equal(answer.status,'budget-exhausted'); assert.equal(answer.exact,false); assert.equal(answer.solved,true);
    assert.equal(answer.nodes,0); assert.equal(answer.lowerBound,objective === 'manualTaps' ? 1 : 0);
    assert.equal(answer.upperBound,objective === 'manualTaps' ? 4 : 2); replayResult(b,answer);
    const unknown = evaluateSearch({...b,plan:undefined},G,{objective,nodeBudget:0});
    assert.equal(unknown.status,'budget-exhausted'); assert.equal(unknown.solved,null); assert.equal(unknown.upperBound,null); assert.equal(unknown.bestPlan,null);
  }
});

test('a truncated search settles each unique state at most once and never claims unsolvability', () => {
  const b = stopper();
  for (const objective of ['manualTaps','nonExitMoves']) {
    const answer = evaluateSearch(b,G,{objective,nodeBudget:1});
    assert.equal(answer.nodes,1); assert.equal(answer.status,'budget-exhausted'); assert.equal(answer.exact,false);
    const optimum = objective === 'manualTaps' ? 3 : 1;
    assert.ok(answer.lowerBound <= optimum && answer.upperBound >= optimum);
  }
});

test('an invalid certificate cannot supply a false upper bound or block a real search', () => {
  const b = {...stopper(),plan:[99]};
  const answer = evaluateSearch(b,G,{objective:'nonExitMoves'});
  assert.equal(answer.status,'optimal'); assert.equal(answer.upperBound,1); replayResult(b,answer);
  assert.throws(()=>evaluateSearch(b,G,{objective:'made-up'}),/Unknown search objective/);
  assert.throws(()=>evaluateSearch(b,G,{nodeBudget:-1}),/nodeBudget/);
});

// Independent oracle: enumerate the entire reachable graph, including actions
// after an all-free state, then propagate values backwards with Bellman–Ford.
// It shares movement rules, but no frontier, pruning, certificate or goal-suffix
// implementation with the evaluator being tested.
function fullGraph(b, limit = 10000) {
  const states = [b.ropes], indices = new Map([[JSON.stringify(b.ropes),0]]), edges = [];
  for (let at = 0; at < states.length; at++) {
    edges[at] = [];
    for (let id = 0; id < states[at].length; id++) if (states[at][id]) {
      const move = G.tap(b,states[at],id); if (!move) continue;
      const key = JSON.stringify(move.paths);
      if (!indices.has(key)) {
        assert.ok(states.length < limit, `tiny oracle exceeded its ${limit}-state limit`);
        indices.set(key,states.length); states.push(move.paths);
      }
      edges[at].push({to:indices.get(key),nonExit:Number(move.event !== 'exit')});
    }
  }
  return {states,edges};
}
function oracleValue(b, graph, objective) {
  const manual = objective === 'manualTaps';
  const values = graph.states.map(paths => (manual ? G.allFree(b,paths) : paths.every(p=>!p)) ? 0 : Infinity);
  let changed = true;
  for (let pass = 0; changed; pass++) {
    assert.ok(pass <= graph.states.length, 'nonnegative-cost oracle failed to converge');
    changed = false;
    for (let at = values.length - 1; at >= 0; at--) {
      let value = values[at];
      for (const edge of graph.edges[at]) value = Math.min(value,(manual ? 1 : edge.nonExit) + values[edge.to]);
      if (value < values[at]) { values[at] = value; changed = true; }
    }
  }
  return manual && b.ropes.some(Boolean) ? Math.max(1,values[0]) : values[0];
}

test('generated tiny boards match an independent full-graph oracle under both objectives', {timeout:30000}, () => {
  let boards = 0, objectives = 0, largestGraph = 0;
  for (const grid of ['square','hex']) for (let seed = 0; seed < 24; seed++) {
    const difficulty = 1 + seed * 4;
    // Generation failures must fail the test, rather than quietly shrinking
    // the sample and accidentally leaving no checked cases.
    const b = G.generate({revision:3,grid,width:4,height:5,min:difficulty,max:difficulty,count:1,seed:'EVAL'+seed});
    const graph = fullGraph(b); largestGraph = Math.max(largestGraph,graph.states.length); boards++;
    for (const objective of ['manualTaps','nonExitMoves']) {
      const expected = oracleValue(b,graph,objective);
      assert.ok(Number.isFinite(expected), `${grid}/${seed} must have a reachable solution`);
      const full = evaluateSearch(b,G,{objective,nodeBudget:10000});
      assert.equal(full.status,'optimal',`${grid}/${seed}/${objective}`); assert.equal(full.exact,true);
      assert.equal(full.lowerBound,expected); assert.equal(full.upperBound,expected); replayResult(b,full);
      const short = evaluateSearch(b,G,{objective,nodeBudget:1});
      assert.ok(short.nodes <= 1); assert.equal(short.solved,true);
      assert.ok(short.lowerBound <= expected && short.upperBound >= expected, `${grid}/${seed}/${objective}: budget bounds contain the optimum`);
      assert.equal(short.exact,short.status === 'optimal');
      if (short.exact) assert.deepEqual([short.lowerBound,short.upperBound],[expected,expected]);
      objectives++;
    }
  }
  assert.equal(boards,48); assert.equal(objectives,96);
  assert.ok(largestGraph > 1,'the oracle must cover moves beyond the initial state');
});
