// Feasibility spike, deliberately isolated from levels.js and the shipped game.
// Keeps the production solver's track/offset representation and optimistic relaxation.
const L = require('../../levels.js');
const GONE = 32767;
const cell = (p, W) => p.y * W + p.x;

function track(path, W, H, mirrors = []) {
  const seq = path.map(p => cell(p, W)), h = path.at(-1), d = L.headDir(path);
  if (mirrors.length) {
    const routed = traceMirrorHead({ W, H, head: h, direction: d, mirrors });
    // The compact relaxation's at[cell] assumes each rope visits a cell at most once.
    // Exclude cyclic/self-crossing routes in this first experiment rather than unsoundly pruning.
    if (routed.loop || routed.selfCrossing || routed.cells.some(c => seq.includes(c))) throw new Error('Unsupported self-intersecting mirror track');
    return seq.concat(routed.cells);
  }
  for (let x = h.x + d[0], y = h.y + d[1]; x >= 0 && y >= 0 && x < W && y < H; x += d[0], y += d[1]) seq.push(y * W + x);
  return seq;
}
function board(level) {
  const { W, H, ropes } = level;
  return { W, H, mirrors: level.mirrors || [], seq: ropes.map(p => track(p, W, H, level.mirrors)), len: ropes.map(p => p.length), off: ropes.map(() => 0),
    walls: new Set(level.walls || []), gates: new Map((level.gates || []).map(g => [g.cell, g.key])), flips: level.flips || 0 };
}
function occupancy(b) {
  const occ = new Int16Array(b.W * b.H).fill(-1), at = new Int16Array(occ.length);
  b.off.forEach((off, i) => { if (off >= 0) for (let j = off; j < off + b.len[i]; j++) { occ[b.seq[i][j]] = i; at[b.seq[i][j]] = j; } });
  return { occ, at };
}
function slideTo(b, i, occ = occupancy(b).occ) {
  const seq = b.seq[i]; let p = b.off[i] + b.len[i];
  while (p < seq.length) {
    const c = seq[p], key = b.gates.get(c);
    if (b.walls.has(c) || (key !== undefined && b.off[key] >= 0) || occ[c] !== -1) break;
    p++;
  }
  return p === seq.length ? -1 : p - b.len[i];
}
function currentPath(b, i) {
  return b.seq[i].slice(b.off[i], b.off[i] + b.len[i]).map(c => ({ x: c % b.W, y: Math.floor(c / b.W) }));
}
// A direct adaptation of levels.js:relax. Gates open optimistically once their key could exit.
// With a flip still available, this proof is invalid: a rope can acquire a different track.
function dead(b) {
  if (b.flips) return false;
  const { occ, at } = occupancy(b), was = b.off.map(o => o < 0 ? GONE : o), now = was.slice();
  let waiting = was.filter(o => o !== GONE).length;
  for (let moved = true; moved && waiting;) {
    moved = false;
    for (let i = 0; i < b.off.length; i++) {
      if (was[i] === GONE) continue;
      const seq = b.seq[i]; let r = was[i];
      for (;;) {
        const p = r + b.len[i];
        if (p >= seq.length) { r = GONE; break; }
        const c = seq[p], z = occ[c], key = b.gates.get(c);
        if (b.walls.has(c) || (key !== undefined && was[key] !== GONE)) break;
        if (z !== -1 && (z === i || was[z] <= at[c])) break;
        r++;
      }
      if (r !== was[i]) { now[i] = r; moved = true; if (r === GONE) waiting--; }
    }
    was.splice(0, was.length, ...now);
  }
  return waiting > 0;
}
function apply(b, action) {
  const i = action.rope;
  if (!Number.isInteger(i) || !b.seq[i] || b.off[i] < 0) return false;
  if (action.type === 'flip') {
    if (!b.flips) return false;
    b.seq[i] = track(currentPath(b, i).reverse(), b.W, b.H, b.mirrors); b.off[i] = 0; b.flips--;
    return true;
  }
  if (action.type !== 'tap') return false;
  const to = slideTo(b, i);
  if (to === b.off[i]) return false;
  b.off[i] = to; return true;
}
function replay(level, actions) {
  const b = board(level);
  for (const action of actions) if (!apply(b, action)) return { solved: false, invalid: action, board: b };
  return { solved: b.off.every(o => o < 0), board: b };
}
function solve(level, { budget = 4000, prefer = [], prune = true, target = null, keep = null } = {}) {
  const b = board(level), hopeless = new Set(), moves = [], rank = new Map(), later = new Map();
  prefer.forEach((i, k) => { if (!rank.has(i)) rank.set(i, k); later.set(i, k); });
  let nodes = 0, gaveUp = false, pruned = 0;
  const search = () => {
    if (target === null ? b.off.every(o => o < 0) : b.off[target] < 0) return true;
    if (++nodes > budget) { gaveUp = true; return false; }
    // Track geometry must participate in memoization after a flip; offsets alone are not enough.
    const key = b.off.join(',') + (level.flips ? ':' + b.flips + ':' + b.seq.map(s => s.join(',')).join('|') : '');
    if (hopeless.has(key)) return false;
    if (target === null && prune && dead(b)) { hopeless.add(key); pruned++; return false; }
    const occ = occupancy(b).occ, tries = [];
    b.off.forEach((off, i) => {
      if (off < 0) return;
      const to = slideTo(b, i, occ);
      if (to !== off && !(i === keep && to < 0)) tries.push({ type: 'tap', rope: i, to });
    });
    const order = a => ((b.off[a.rope] ? later : rank).get(a.rope) ?? 1e6) * 2 + (a.to < 0 ? 0 : 1);
    tries.sort((a, z) => order(a) - order(z) || a.rope - z.rope);
    if (b.flips) b.off.forEach((off, i) => { if (off >= 0) tries.push({ type: 'flip', rope: i }); });
    for (const action of tries) {
      const i = action.rope, old = { seq: b.seq[i], off: b.off[i], flips: b.flips };
      apply(b, action); moves.push({ type: action.type, rope: i });
      if (search()) return true;
      moves.pop(); b.seq[i] = old.seq; b.off[i] = old.off; b.flips = old.flips;
      if (gaveUp) return false;
    }
    hopeless.add(key); return false;
  };
  const solved = search();
  return { solved: solved ? true : gaveUp ? null : false, moves: solved ? moves.slice() : [], nodes, pruned };
}

// Overlay generation: find empty cells a known successful replay traverses, then choose a key
// that has already exited before that first traversal. This preserves the solution by construction.
function gateCandidates(level) {
  const b = board(level), initiallyOccupied = new Set(level.ropes.flat().map(p => cell(p, level.W)));
  const firstUse = new Map(), exits = [];
  for (let step = 0; step < level.taps.length; step++) {
    const i = level.taps[step], from = b.off[i];
    if (from < 0) continue;
    const to = slideTo(b, i), seq = b.seq[i];
    const end = to < 0 ? seq.length : to + b.len[i];
    for (let p = from + b.len[i]; p < end; p++) if (!initiallyOccupied.has(seq[p]) && !firstUse.has(seq[p])) firstUse.set(seq[p], { step, rope: i });
    b.off[i] = to;
    if (to < 0) exits.push({ step, rope: i });
  }
  const candidates = [];
  for (const [c, use] of firstUse) for (const key of exits) {
    if (key.step < use.step && key.rope !== use.rope) candidates.push({ cell: c, key: key.rope, firstUse: use.step, affected: use.rope });
  }
  return candidates;
}

// Topology probe only, NOT a tunnel movement engine. Track offsets can describe a routed head,
// but body collision, self-crossings, rendering, and reverse construction need separate work.
function traceTunnelHead({ W, H, head, direction, portals }) {
  const byEntry = new Map(portals.map(p => [cell(p.entry, W), p]));
  const seen = new Set(), cells = []; let { x, y } = head, [dx, dy] = direction;
  for (;;) {
    x += dx; y += dy;
    if (x < 0 || y < 0 || x >= W || y >= H) return { exits: true, loop: false, cells };
    const state = [x, y, dx, dy].join(',');
    if (seen.has(state)) return { exits: false, loop: true, cells };
    seen.add(state); cells.push(y * W + x);
    const portal = byEntry.get(y * W + x);
    if (portal) {
      x = portal.exit.x; y = portal.exit.y; [dx, dy] = portal.direction || [dx, dy];
      cells.push(y * W + x);
    }
  }
}

function traceMirrorHead({ W, H, head, direction, mirrors }) {
  const byCell = new Map(mirrors.map(m => [m.cell, m.slope])), seen = new Set(), visited = new Set(), cells = [];
  let { x, y } = head, [dx, dy] = direction, selfCrossing = false;
  for (;;) {
    const state = [x, y, dx, dy].join(',');
    if (seen.has(state)) return { exits: false, loop: true, selfCrossing, cells };
    seen.add(state);
    const slope = byCell.get(y * W + x);
    if (slope === '/') [dx, dy] = [-dy, -dx];
    else if (slope === '\\') [dx, dy] = [dy, dx];
    x += dx; y += dy;
    if (x < 0 || y < 0 || x >= W || y >= H) return { exits: true, loop: false, selfCrossing, cells };
    const c = y * W + x;
    if (visited.has(c)) selfCrossing = true;
    visited.add(c); cells.push(c);
  }
}
module.exports = { board, occupancy, slideTo, currentPath, apply, replay, solve, dead, gateCandidates, traceTunnelHead, traceMirrorHead };
