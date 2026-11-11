// Tap-only spring-block experiment. No direct flip action or consumable resource.
// A spring is a solid cell: on contact, advance to it, reverse the WHOLE rope, then stop.
const L = require('../../levels.js');

function tap(level, paths, i) {
  const path = paths[i];
  if (!path) return null;
  const occupied = new Set(paths.filter(Boolean).flat().map(p => p.y * level.W + p.x));
  const springs = new Set(level.springs || []), walls = new Set(level.walls || []);
  const h = path.at(-1), [dx, dy] = L.headDir(path);
  let x = h.x + dx, y = h.y + dy, distance = 0, event;
  while (x >= 0 && y >= 0 && x < level.W && y < level.H) {
    const c = y * level.W + x;
    if (occupied.has(c) || walls.has(c)) break;
    if (springs.has(c)) { event = 'bounce'; break; }
    distance++; x += dx; y += dy;
  }
  const exits = x < 0 || y < 0 || x >= level.W || y >= level.H;
  if (!exits && !event && !distance) return null;
  const next = paths.slice();
  next[i] = exits ? null : L.advance(path, distance);
  if (event === 'bounce') next[i] = next[i].slice().reverse();
  return { paths: next, event: exits ? 'exit' : event || 'slide', distance };
}
function replay(level, moves) {
  let paths = level.ropes;
  const events = [];
  for (const i of moves) {
    const next = tap(level, paths, i);
    if (!next) return { solved: false, paths, events, invalid: i };
    paths = next.paths; events.push(next.event);
  }
  return { solved: paths.every(p => !p), paths, events };
}
// The fixed-track deadlock proof cannot be used here. Full current geometry is the state.
// Mark visited BEFORE recursion, since automatic reversal can create cycles between taps.
function solve(level, { budget = 4000, prefer = [] } = {}) {
  const seen = new Set(), moves = [], rank = new Map();
  prefer.forEach((i, k) => { if (!rank.has(i)) rank.set(i, k); });
  let nodes = 0, unknown = false;
  const search = paths => {
    if (paths.every(p => !p)) return true;
    const key = JSON.stringify(paths);
    if (seen.has(key)) return false;
    if (++nodes > budget) { unknown = true; return false; }
    seen.add(key);
    const choices = [];
    for (let i = 0; i < paths.length; i++) {
      const next = tap(level, paths, i);
      if (next) choices.push({ i, ...next });
    }
    choices.sort((a, b) => (rank.get(a.i) ?? 1e6) - (rank.get(b.i) ?? 1e6) || a.i - b.i);
    for (const next of choices) {
      moves.push(next.i);
      if (search(next.paths)) return true;
      moves.pop();
      if (unknown) return false;
    }
    return false;
  };
  const solved = search(level.ropes);
  return { solved: solved ? true : unknown ? null : false, moves: solved ? moves.slice() : [], nodes };
}
module.exports = { tap, replay, solve };
