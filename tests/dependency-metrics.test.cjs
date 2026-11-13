const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../game-engine');
const Q = require('../dependency-metrics');
const p = (q, r) => ({ q, r });
const board = (ropes, other = {}) => ({ grid: 'square', W: 8, H: 8, ropes, mirrors: [], springs: [], locks: [], ...other });

function measured(b, plan) {
  const played = G.replay(b, plan);
  assert.equal(played.solved, true, 'the fixture must have a complete playable solution');
  return Q.analyze(b, plan, played.taps, G);
}
function chain() {
  return board([[p(3,1),p(3,0)], [p(0,1),p(1,1)], [p(1,4),p(1,3)], [p(4,4),p(3,4)]]);
}
function fan() {
  return board([Array.from({ length: 6 }, (_, r) => p(5,5-r)), ...[1,2,3,4].map(r => [p(1,r),p(2,r),p(3,r)])]);
}
function diamond() {
  return board([[p(5,1),p(4,1),p(3,1)], [p(3,4),p(3,3)], [p(5,4),p(5,3)], [p(0,4),p(1,4)]]);
}
function zipper() {
  const length = 3, a = [], b = [];
  for (let r = 1; r <= length; r++) a.push(p(0,r));
  for (let q = -1; q >= -length-3; q--) a.push(p(q,length));
  for (let r = length-1; r >= 0; r--) a.push(p(-length-3,r));
  a.push(p(-length-2,0));
  for (let q = -length; q <= -1; q++) b.push(p(q,0));
  b.push(p(-1,-1),p(-1,-2),p(0,-2),p(0,-1));
  const shift = path => path.map(v => p(v.q+length+4,v.r+3));
  return board([shift(a),shift(b)], { W: length+12, H: length+6 });
}

test('long chains and one-key fans do not earn join or interleaving difficulty', () => {
  const c = measured(chain(), [0,1,2,3]);
  assert.equal(c.edges, 3); assert.equal(c.depth, 4);
  assert.equal(c.joins, 0); assert.equal(c.forks, 0); assert.equal(c.branchingDepth, 0);
  assert.equal(c.interaction, 0); assert.equal(c.initialExitFraction, 1/4);
  const f = measured(fan(), [0,1,2,3,4]);
  assert.equal(f.edges, 4); assert.equal(f.forks, 1); assert.equal(f.joins, 0);
  assert.equal(f.interaction, 0); assert.equal(f.initialExitFraction, 1/5);
});

test('transitive contacts cannot turn a simple chain into a fork-join puzzle', () => {
  const plain = Q.graphMetrics([[0,1],[1,2],[2,3]], 4);
  const shortcuts = Q.graphMetrics([[0,1],[1,2],[2,3],[0,2],[0,3],[1,3]], 4);
  assert.equal(shortcuts.edges, 6); assert.equal(shortcuts.essentialEdges, 3);
  for (const field of ['joins','forks','depth','branchingDepth','interaction']) assert.equal(shortcuts[field], plain[field]);
  const actual = board([
    [p(3,1),p(2,1),p(2,2),p(1,2),p(1,1),p(1,0)], [p(3,0),p(2,0)],
    [p(0,3),p(1,3),p(2,3),p(3,3),p(3,2)], [p(3,4),p(2,4),p(1,4),p(0,4)], [p(0,2),p(0,1),p(0,0)],
  ], { W: 4, H: 5 });
  const result = measured(actual, [4,0,1,2,3]);
  assert.equal(result.edges, 3); assert.equal(result.essentialEdges, 2);
  assert.equal(result.joins, 0); assert.equal(result.branchingDepth, 0); assert.equal(result.interaction, 0);
});

test('independent prerequisites and causal revisits distinguish real interaction', () => {
  const joined = measured(diamond(), [0,1,2,3]);
  assert.equal(joined.joins, 1); assert.equal(joined.forks, 1); assert.equal(joined.branchingDepth, 1);
  assert.ok(joined.interaction > measured(chain(), [0,1,2,3]).interaction);
  assert.ok(joined.interaction > measured(fan(), [0,1,2,3,4]).interaction);
  const interleaved = measured(zipper(), [0,1,0,1,0]);
  assert.equal(interleaved.mutualWaitGroups, 1); assert.equal(interleaved.mutualWaitRopes, 2);
  assert.equal(interleaved.revisitedRopes, 2); assert.equal(interleaved.partialSlides, 3);
  assert.equal(interleaved.initialExitFraction, 0); assert.ok(interleaved.interaction > 0);
});

test('cycles stay finite and redundant SCC-to-DAG shortcuts add no fake joins', () => {
  const cycle = Q.graphMetrics([[0,1],[1,2],[2,0]], 3);
  assert.equal(cycle.mutualWaitGroups, 1); assert.equal(cycle.mutualWaitRopes, 3);
  assert.equal(cycle.depth, 3); assert.equal(cycle.joins, 0); assert.ok(Number.isFinite(cycle.interaction));
  assert.ok(cycle.interaction > 0);
  const base = [[0,1],[1,0],[1,2],[2,3]], a = Q.graphMetrics(base, 4), b = Q.graphMetrics([...base,[0,3]], 4);
  for (const field of ['essentialEdges','joins','forks','depth','branchingDepth','interaction']) assert.equal(a[field], b[field]);
});

test('a bounce followed by its own release is not a causal revisit', () => {
  const b = board([[p(2,2),p(3,2)], [p(1,6),p(2,6)], [p(4,6),p(4,5)]], { springs: [p(5,2)] });
  const result = measured(b, [0,0,2,1]);
  assert.equal(result.bounces, 1); assert.equal(result.revisitedRopes, 0);
  assert.equal(result.interaction, 0);
});

test('only demonstrated manual dependencies count, including paths routed by mirrors', () => {
  const b = diamond(), plan = [0,1,2,3];
  assert.equal(Q.analyze(b, plan, 0, G).edges, 0);
  assert.equal(Q.analyze(b, plan, 1, G).joins, 0);
  assert.equal(Q.analyze(b, plan, 2, G).joins, 0);
  assert.equal(Q.analyze(b, plan, 3, G).joins, 1);
  const reflected = board([
    Array.from({ length: 7 }, (_, r) => p(6,6-r)), [p(3,4),p(4,4)], [p(3,2),p(4,2)], [p(0,6),p(1,6)],
  ], { mirrors: [{ cell: p(3,6), slope: '/' }] });
  assert.deepEqual(measured(reflected, plan), measured(b, plan));
});

test('larger empty viewports cannot manufacture interaction', () => {
  for (const b of [chain(), diamond(), zipper()]) {
    const plan = b.ropes.length === 2 ? [0,1,0,1,0] : [0,1,2,3];
    assert.deepEqual(measured({ ...b, W: b.W+5, H: b.H+5 }, plan), measured(b, plan));
  }
});

test('disconnected little puzzles score below a genuinely coupled tangle', () => {
  const diamondEdges = [[0,1],[0,2],[1,3],[2,3]];
  const islands = Q.graphMetrics([...diamondEdges,...diamondEdges.map(([a,b]) => [a+4,b+4])], 8);
  const coupled = Q.graphMetrics([...diamondEdges,[3,4],[3,5],[4,6],[5,6]], 7);
  assert.equal(islands.coupledGroups, 2); assert.equal(islands.largestCoupledGroup, 4);
  assert.equal(coupled.coupledGroups, 1); assert.equal(coupled.largestCoupledGroup, 7);
  assert.equal(islands.branchingDepth, 1); assert.equal(coupled.branchingDepth, 2);
  assert.ok(coupled.interaction > islands.interaction);
  assert.ok(Q.graphMetrics(diamondEdges, 8).interaction < Q.graphMetrics(diamondEdges, 4).interaction, 'adding unrelated free ropes cannot inflate interaction');
});

test('duplicate edges and isolated vertices cannot create evidence', () => {
  const unique = Q.graphMetrics([[0,1],[1,2]], 3);
  assert.deepEqual(Q.graphMetrics([[0,1],[0,1],[1,2],[1,2],[1,1]], 3), unique);
  assert.equal(Q.graphMetrics([], 0).interaction, 0);
  assert.equal(Q.graphMetrics([], 5).interaction, 0);
});

test('advanced generation adds causal interaction at the same moderate grid size', { timeout: 120000 }, () => {
  for (const grid of ['square', 'hex']) {
    let medium = 0, hard = 0, mediumRevisits = 0, hardRevisits = 0, improvements = 0;
    for (let seed = 0; seed < 8; seed++) {
      const scores = [];
      for (const difficulty of [50, 100]) {
        const b = G.generate({ revision: 3, grid, width: 10, height: 12, min: difficulty, max: difficulty, count: 1, seed: 'INTERACT'+seed });
        assert.deepEqual([b.W,b.H], [10,12]); assert.ok(b.coverage >= .85);
        const replayed = G.replay(b,b.plan); assert.equal(replayed.solved,true); assert.equal(replayed.taps,b.par);
        const metrics = Q.analyze(b,b.plan,b.par,G); scores.push(metrics);
        if (difficulty === 100) assert.ok(metrics.mutualWaitRopes > 0 || metrics.revisitedRopes > 0 || metrics.joins >= 2 && metrics.branchingDepth >= 2,
          'an advanced board needs mutual waits, causal interleaving, or essential converging prerequisites');
      }
      medium += scores[0].interaction; hard += scores[1].interaction;
      mediumRevisits += scores[0].revisitedRopes; hardRevisits += scores[1].revisitedRopes;
      improvements += Number(scores[1].interaction > scores[0].interaction);
    }
    assert.ok(hard / 8 > medium / 8 + .25, `${grid}: hard candidates should add genuine interaction, rather than only increasing taps or area`);
    assert.ok(hardRevisits > mediumRevisits, `${grid}: harder boards revisit more ropes after another blocker moves`);
    assert.ok(improvements >= 5, `${grid}: interaction should improve across a range of seeds`);
  }
});

test('the built-in Journey keeps all fixed grids moderate', () => {
  const levels = require('../grid-journey');
  assert.equal(levels.length, 120);
  assert.ok(levels.every(b => b.W <= 12 && b.H <= 16), 'larger boards belong in explicit custom generation');
});
