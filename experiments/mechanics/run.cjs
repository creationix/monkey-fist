// Reproducible feasibility measurements; emits JSON to stdout (no game changes).
const L = require('../../levels.js');
const E = require('./engine.cjs');
const assert = require('node:assert/strict');
const timed = fn => { const start = performance.now(), value = fn(); return { ...value, ms: +(performance.now() - start).toFixed(3) }; };
const asActions = taps => taps.map(rope => ({ type: 'tap', rope }));
const rows = [];
for (const seed of ['ALPHA', 'BRAVO', 'E5DDK']) for (const mode of ['N', 'H', 'X']) {
  const generated = timed(() => ({ set: L.generateSet({ seed, mode, count: 10, big: mode === 'X', slide: true }) }));
  for (const index of [0, 4, 9]) {
    const d = generated.set.levels[index]; if (!d) continue;
    // Same constructor as levelFrom, excluding the separate optional par search.
    const level = L.weave(L.mulberry32(d.seed), { ...d, W: d.boardW, H: d.boardH });
    assert.ok(level); assert.ok(L.play(level.ropes, level.W, level.H, level.taps).every(p => !p));
    const baseline = timed(() => L.solve(level.ropes, level.W, level.H, 4000, level.taps));
    const prototype = timed(() => E.solve(level, { prefer: level.taps }));
    assert.notEqual(prototype.solved, false);
    if (prototype.solved) assert.equal(E.replay(level, prototype.moves).solved, true);
    const b = E.board(level), occupied = new Set(level.ropes.flat().map(p => p.y * level.W + p.x));
    const empty = Array.from({ length: level.W * level.H }, (_, c) => c).filter(c => !occupied.has(c));
    const lanes = new Set(b.seq.flatMap((s, i) => s.slice(b.len[i])));
    const wallCells = [empty.find(c => lanes.has(c)), empty.find(c => !lanes.has(c))];
    const walls = wallCells.map(c => c === undefined ? null : timed(() => ({ cell: c, onExitLane: lanes.has(c), ...E.solve({ ...level, walls: [c] }, { prefer: level.taps }) })));
    const candidates = E.gateCandidates(level), gates = [];
    for (const candidate of candidates) if (!gates.some(g => g.cell === candidate.cell)) { gates.push(candidate); if (gates.length === 2) break; }
    let gated = null, gateDependency = null;
    if (gates.length) {
      const variant = { ...level, gates };
      assert.equal(E.replay(variant, asActions(level.taps)).solved, true);
      gated = timed(() => E.solve(variant, { prefer: level.taps }));
      assert.notEqual(gated.solved, false);
      if (gated.solved) assert.equal(E.replay(variant, gated.moves).solved, true);
      // Can this rope exit BEFORE the proposed key in the original puzzle? If yes, the gate
      // adds an ordering restriction that was absent before. Unknown is not counted as proof.
      gateDependency = timed(() => E.solve(level, { target: gates[0].affected, keep: gates[0].key, prefer: [gates[0].affected, ...level.taps] }));
    }
    // Try one fixed mirror on an empty exit-lane tile. Solver validation replaces the original
    // replay certificate because rerouting can change every later collision along that track.
    const mirrorProbe = { tried: 0, unsupported: 0, solved: 0, impossible: 0, unknown: 0, example: null };
    for (const c of empty.filter(c => lanes.has(c)).slice(0, 8)) for (const slope of ['/', '\\']) {
      const variant = { ...level, mirrors: [{ cell: c, slope }] }; mirrorProbe.tried++;
      try { E.board(variant); } catch { mirrorProbe.unsupported++; continue; }
      const result = timed(() => E.solve(variant, { prefer: level.taps }));
      if (result.solved === true) {
        mirrorProbe.solved++; assert.equal(E.replay(variant, result.moves).solved, true);
        if (!mirrorProbe.example) mirrorProbe.example = { cell: c, slope, nodes: result.nodes, ms: result.ms };
      } else if (result.solved === false) mirrorProbe.impossible++;
      else mirrorProbe.unknown++;
    }
    // Turn one original arrow around, then ask if a flip is NECESSARY, not merely available.
    let flipped = null, flipTrials = 0;
    for (let i = 0; i < Math.min(8, level.ropes.length); i++) {
      flipTrials++;
      const ropes = level.ropes.map((p, j) => j === i ? p.slice().reverse() : p), variant = { ...level, ropes };
      const without = E.solve(variant, { prefer: level.taps });
      if (without.solved !== false) continue; // unknown is not evidence of necessity
      const witness = [{ type: 'flip', rope: i }, ...asActions(level.taps)];
      assert.equal(E.replay({ ...variant, flips: 1 }, witness).solved, true);
      const result = timed(() => E.solve({ ...variant, flips: 1 }, { prefer: level.taps }));
      if (result.solved) assert.equal(E.replay({ ...variant, flips: 1 }, result.moves).solved, true);
      flipped = { rope: i, witnessVerified: true, without: without.solved, ...result }; break;
    }
    const trim = result => result && Object.fromEntries(Object.entries(result).filter(([k]) => k !== 'moves'));
    rows.push({ seed, mode, level: index + 1, size: `${level.W}x${level.H}`, ropes: level.ropes.length, generationMs: generated.ms,
      baseline: trim(baseline), prototype: trim(prototype), walls: walls.map(trim), gateCandidates: candidates.length, gates,
      gated: trim(gated), gateDependency: trim(gateDependency), mirrorProbe, flipTrials, flipped: trim(flipped) });
  }
}
const summary = {
  boards: rows.length,
  baselineSolved: rows.filter(r => r.baseline.solved === true).length,
  prototypeSolved: rows.filter(r => r.prototype.solved === true).length,
  exitWallsRejected: rows.filter(r => r.walls[0]?.solved === false).length,
  exitWallsTested: rows.filter(r => r.walls[0]).length,
  inertWallsSolved: rows.filter(r => r.walls[1]?.solved === true).length,
  inertWallsTested: rows.filter(r => r.walls[1]).length,
  gatedBoards: rows.filter(r => r.gated).length,
  gatedSolved: rows.filter(r => r.gated?.solved === true).length,
  firstGateProvenNewDependency: rows.filter(r => r.gateDependency?.solved === true).length,
  firstGateRedundant: rows.filter(r => r.gateDependency?.solved === false).length,
  firstGateDependencyUnknown: rows.filter(r => r.gateDependency?.solved === null).length,
  flipRequiredBoards: rows.filter(r => r.flipped).length,
  flipSolved: rows.filter(r => r.flipped?.solved === true).length,
  flipUnknown: rows.filter(r => r.flipped?.solved === null).length,
  mirrorBoardsWithSolution: rows.filter(r => r.mirrorProbe.solved).length,
  mirrorCandidates: rows.reduce((n, r) => n + r.mirrorProbe.tried, 0),
  mirrorSolved: rows.reduce((n, r) => n + r.mirrorProbe.solved, 0),
  mirrorUnsupported: rows.reduce((n, r) => n + r.mirrorProbe.unsupported, 0),
  mirrorImpossible: rows.reduce((n, r) => n + r.mirrorProbe.impossible, 0),
  mirrorUnknown: rows.reduce((n, r) => n + r.mirrorProbe.unknown, 0),
};
console.log(JSON.stringify({ node: process.version, budget: 4000, summary, rows }, null, 2));
