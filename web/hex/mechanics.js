// Full-geometry Hex movement: mirrors turn a rope as it slides, spinners reverse it.
// Every tap and its animated route come from here; boards with spinners also replay
// and search here, with a bounded full-path solver (the compact track kernels in
// engine.js cannot represent reversals).
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const H = node ? require('./engine.js') : root.MFHex;
  const { key, add, inside, DIRS } = H;
  const mod = n => (n % 6 + 6) % 6;
  // Mirror lines lie at 0°, 60°, or 120°. Reflection is angle_out = 2*line - angle_in.
  // This gives a 120° turn, or an unchanged direction for an edge-on approach.
  const reflect = (direction, axis) => mod(2 * axis - direction);
  const indexOf = d => DIRS.findIndex(v => v[0] === d[0] && v[1] === d[1]);
  function direction(level, path) {
    const d = indexOf(H.direction(path)), mirror = (level.mirrors || []).find(m => key(m.cell) === key(path.at(-1)));
    return DIRS[mirror ? reflect(d, mirror.axis) : d];
  }
  function tap(level, paths, i) {
    const path = paths[i]; if (!path) return null;
    const occupied = new Set(paths.filter(Boolean).flat().map(key));
    const mirrors = new Map((level.mirrors || []).map(m => [key(m.cell), m.axis]));
    const springs = new Set((level.springs || []).map(key));
    const route = path.slice(), seen = new Set(), turns = [];
    let p = path.at(-1), d = indexOf(direction(level, path)), distance = 0;
    for (;;) {
      const next = add(p, DIRS[d]), cell = key(next);
      if (!inside(level, next)) {
        for (let j = 0; j < path.length + 2; j++) { p = add(p, DIRS[d]); route.push(p); distance++; }
        const result = paths.slice(); result[i] = null;
        return { paths: result, event: 'exit', distance, route, turns };
      }
      if (occupied.has(cell)) break;
      if (springs.has(cell)) {
        route.push(next); distance++;
        const result = paths.slice(); result[i] = route.slice(-path.length).reverse();
        return { paths: result, event: 'bounce', distance, route, turns };
      }
      // A tap must settle. Reject looping/self-crossing routes instead of hanging
      // the animation or returning a rope with overlapping cells.
      if (seen.has(cell)) return null;
      seen.add(cell); p = next; route.push(p); distance++;
      if (mirrors.has(cell)) {
        const reflected = reflect(d, mirrors.get(cell));
        if (reflected !== d) turns.push(cell);
        d = reflected;
      }
    }
    if (!distance) return null;
    const result = paths.slice(); result[i] = route.slice(-path.length);
    return { paths: result, event: 'slide', distance, route, turns };
  }
  const allFree = (level, paths) => paths.every((p, i) => !p || tap(level, paths, i)?.event === 'exit');
  function replay(level, moves, paths = level.ropes) {
    const events = []; let taps = 0, automatic = false;
    for (const i of moves) {
      const move = tap(level, paths, i); if (!move) return { solved: false, paths, events, taps };
      if (!automatic) taps++;
      paths = move.paths; events.push(move.event);
      if (allFree(level, paths)) automatic = true;
    }
    return { solved: paths.every(p => !p), paths, events, taps };
  }
  function solve(level, paths = level.ropes, budget = 900, prefer = []) {
    const visited = new Set(), moves = []; let nodes = 0, exhausted = false;
    function search(current, preferred) {
      if (current.every(p => !p)) return true;
      const state = JSON.stringify(current); if (visited.has(state)) return false;
      if (++nodes > budget) { exhausted = true; return false; }
      visited.add(state);
      const tries = current.flatMap((p, i) => { const next = p && tap(level, current, i); return next ? [{ i, next }] : []; });
      tries.sort((a, b) => a.i === preferred[0] ? -1 : b.i === preferred[0] ? 1 : (a.next.event === 'exit' ? 0 : 1) - (b.next.event === 'exit' ? 0 : 1));
      for (const { i, next } of tries) {
        moves.push(i);
        if (search(next.paths, i === preferred[0] ? preferred.slice(1) : preferred)) return true;
        moves.pop(); if (exhausted) return false;
      }
      return false;
    }
    const solved = search(paths, prefer);
    return { solved: solved ? true : exhausted ? null : false, moves: solved ? moves.slice() : [], nodes };
  }
  const api = { reflect, direction, tap, allFree, replay, solve };
  if (node) module.exports = api; else root.MFHexMechanics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
