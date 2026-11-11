// Shared by the browser sandbox and its Node tests. Every move is one ordinary rope tap.
(function (root) {
  'use strict';
  const id = (p, W) => p.y * W + p.x;
  function direction(level, path) {
    const h = path[path.length - 1], p = path[path.length - 2];
    let dx = h.x - p.x, dy = h.y - p.y;
    const mirror = (level.mirrors || []).find(m => m.cell === id(h, level.W));
    if (mirror && mirror.slope === '/') [dx, dy] = [-dy, -dx];
    if (mirror && mirror.slope === '\\') [dx, dy] = [dy, dx];
    return [dx || 0, dy || 0];
  }
  function tap(level, paths, i) {
    const path = paths[i]; if (!path) return null;
    const occupied = new Set(paths.filter(Boolean).flat().map(p => id(p, level.W)));
    const walls = new Set(level.walls || []), springs = new Set(level.springs || []);
    const gates = new Map((level.gates || []).map(g => [g.cell, g.key]));
    const mirrors = new Map((level.mirrors || []).map(m => [m.cell, m.slope]));
    const route = path.slice(), h = path[path.length - 1];
    let [dx, dy] = direction(level, path), x = h.x, y = h.y, distance = 0, event = 'slide';
    const seen = new Set();
    for (;;) {
      const state = [x, y, dx, dy].join(',');
      if (seen.has(state)) return null; // Do not allow a tap that never settles.
      seen.add(state);
      const nx = x + dx, ny = y + dy, c = ny * level.W + nx;
      if (nx < 0 || ny < 0 || nx >= level.W || ny >= level.H) {
        event = 'exit';
        // Keep the whole exit route so the tail animates completely off the board.
        for (let k = 0; k < path.length + 2; k++) { x += dx; y += dy; route.push({ x, y }); distance++; }
        break;
      }
      const key = gates.get(c);
      if (occupied.has(c) || walls.has(c) || (key !== undefined && paths[key])) break;
      if (springs.has(c)) { event = 'bounce'; break; }
      x = nx; y = ny; route.push({ x, y }); distance++;
      if (mirrors.get(c) === '/') [dx, dy] = [-dy, -dx];
      else if (mirrors.get(c) === '\\') [dx, dy] = [dy, dx];
    }
    if (event === 'slide' && !distance) return null;
    const next = paths.slice();
    next[i] = event === 'exit' ? null : route.slice(-path.length);
    if (event === 'bounce') next[i] = next[i].slice().reverse();
    return { paths: next, event, distance, route };
  }
  function replay(level, moves) {
    let paths = level.ropes;
    const events = [];
    for (const i of moves) {
      const next = tap(level, paths, i);
      if (!next) return { solved: false, paths, events };
      paths = next.paths; events.push(next.event);
    }
    return { solved: paths.every(p => !p), paths, events };
  }
  function solve(level, paths = level.ropes, budget = 4000) {
    const visited = new Set(), moves = [];
    let nodes = 0, unknown = false;
    function search(current) {
      if (current.every(p => !p)) return true;
      const key = JSON.stringify(current);
      if (visited.has(key)) return false;
      if (++nodes > budget) { unknown = true; return false; }
      visited.add(key);
      for (let i = 0; i < current.length; i++) {
        const next = tap(level, current, i); if (!next) continue;
        moves.push(i);
        if (search(next.paths)) return true;
        moves.pop(); if (unknown) return false;
      }
      return false;
    }
    const solved = search(paths);
    return { solved: solved ? true : unknown ? null : false, moves: solved ? moves.slice() : [], nodes };
  }
  const api = { direction, tap, replay, solve };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MFSandbox = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
