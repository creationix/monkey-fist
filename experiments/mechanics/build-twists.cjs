// Rebuild the curated pack data; emits JSON for review, never edits production files.
const P = require('./sandbox-levels.js'), S = require('../../mechanics.js'), E = require('./engine.cjs');
const clone = x => structuredClone(x);
const levels = P.slice(0, 6).map(clone);
levels[4].note = 'A spring swaps the rope’s head and tail on contact. Once every rope is free, the rest leave automatically.';
levels.push({ ...clone(P[7]), title: 'Turn the key', kind: 'Mirror + gate', note: 'Free the key rope to open the route around the mirror.', springs: [] },
  clone(P[6]), { W: 7, H: 6, title: 'A spring behind a gate', kind: 'Gate + spring', note: 'Open the gate, then use the spring to reverse the rope.',
    ropes: [[{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }], [{ x: 5, y: 4 }, { x: 5, y: 5 }]], gates: [{ cell: 18, key: 1 }], springs: [19] }, clone(P[7]));
for (const base of [P[10], P[11]]) {
  let found;
  const occupied = new Set(base.ropes.flat().map(p => p.y * base.W + p.x));
  const empty = Array.from({ length: base.W * base.H }, (_, c) => c).filter(c => !occupied.has(c) && !base.springs.includes(c));
  const known = S.solve(base, base.ropes, 10000), candidates = E.gateCandidates({ ...base, taps: known.moves });
  outer: for (const cell of empty) for (const slope of ['/', '\\']) for (const g of candidates.slice(0, 30)) {
    if (g.cell === cell || base.springs.includes(g.cell)) continue;
    const level = { ...clone(base), mirrors: [{ cell, slope }], gates: [{ cell: g.cell, key: g.key }] };
    const solution = S.solve(level, level.ropes, 2000);
    if (!solution.solved || !S.replay(level, solution.moves).events.includes('bounce')) continue;
    let paths = level.ropes, touched = false;
    for (const i of solution.moves) {
      const next = S.tap(level, paths, i);
      if (next.route.slice(paths[i].length).some(p => p.y * base.W + p.x === cell)) touched = true;
      paths = next.paths;
    }
    if (touched) { found = level; break outer; }
  }
  if (!found) throw Error('No verified combined puzzle');
  Object.assign(found, { title: levels.length === 10 ? 'The winding lock' : 'The final twist', kind: 'All three', note: 'Mirrors, gates, and springs share one board. Save taps by freeing the blockers first.' });
  levels.push(found);
}
for (const level of levels) {
  const known = S.solve(level, level.ropes, 20000);
  if (!known.solved) throw Error('No solution: ' + level.title);
  const best = S.minimum(level, 100000, known.moves);
  if (!best.exact || !S.replay(level, best.moves).solved) throw Error('Unverified par: ' + level.title);
  Object.assign(level, { solution: best.moves, par: best.par, parExact: true });
}
process.stdout.write(JSON.stringify(levels, null, 2));
