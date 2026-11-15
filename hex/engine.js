// Hex boards without spinners: the woven builder (build) and the compact offset kernels
// that replay, check and search them, as levels.js does for square boards. Axial q/r
// coordinates are independent of the view. Taps and spinners are in mechanics.js.
(function (root) {
  'use strict';
  const DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
  const key = p => p.q + ',' + p.r;
  const add = (p, d, n = 1) => ({ q: p.q + d[0] * n, r: p.r + d[1] * n });
  const direction = path => { const a = path.at(-2), b = path.at(-1); return [b.q - a.q, b.r - a.r]; };
  const inside = (level, p) => p.r >= 0 && p.r < level.H && p.q + Math.floor(p.r / 2) >= 0 && p.q + Math.floor(p.r / 2) < level.W;
  const project = p => ({ x: p.q + p.r / 2, y: p.r * Math.sqrt(3) / 2 });
  const cells = level => Array.from({ length: level.W * level.H }, (_, i) => ({ q: i % level.W - Math.floor(Math.floor(i / level.W) / 2), r: Math.floor(i / level.W) }));
  const cell = (p, W) => p.r * W + p.q + Math.floor(p.r / 2);
  const point = (c, W) => ({ q: c % W - Math.floor(Math.floor(c / W) / 2), r: Math.floor(c / W) });
  // Fixed mirrors (level.mirrors, { cell, axis }) bend a moving head exactly as in
  // hex/mechanics.js: entering a mirror cell, direction d becomes 2 * axis - d
  // (unchanged when met edge-on). A rope's future cells stay one fixed sequence.
  const reflect = (d, axis) => ((2 * axis - d) % 6 + 6) % 6;
  const dirIndex = v => DIRS.findIndex(d => d[0] === v[0] && d[1] === v[1]);
  function mirrorCells(level) {
    const out = new Map(); for (const m of level.mirrors || []) out.set(cell(m.cell, level.W), m.axis); return out;
  }
  // Append the cells ahead of `head` (a cell index) moving in direction d, to the
  // edge. Null if the way out would enter a cell twice (the game refuses that tap).
  function rayTrack(level, head, d, mirrors, out = [], turns = null) {
    const start = out.length; let p = point(head, level.W), turned = false;
    for (;;) {
      p = add(p, DIRS[d]); if (!inside(level, p)) break;
      const c = cell(p, level.W), axis = mirrors.get(c); out.push(c);
      if (axis !== undefined) { const e = reflect(d, axis); if (e !== d) { turned = true; turns?.add(c); } d = e; if (out.length - start > 2 * level.W * level.H) return null; }
    }
    if (turned && new Set(out.slice(start)).size !== out.length - start) return null;
    return out;
  }
  const exitIndex = (level, path, mirrors) => { const d = dirIndex(direction(path)), axis = mirrors.get(cell(path.at(-1), level.W)); return axis === undefined ? d : reflect(d, axis); };
  // A rope can only advance along its original body followed by its exit ray.
  // Search stores one offset per rope, instead of copying every body at every node.
  function compile(level, paths = level.ropes) {
    const n = paths.length, N = level.W * level.H, tracks = [], lengths = new Int32Array(n), offsets = new Int32Array(n).fill(-1);
    const occupied = new Int32Array(N).fill(-1), at = new Int32Array(N);
    const bent = mirrorCells(level);
    let left = 0;
    paths.forEach((path, i) => {
      if (!path) { tracks.push([]); return; }
      const track = path.map(p => cell(p, level.W));
      track.forEach((c, j) => { occupied[c] = i; at[c] = j; });
      if (bent.size) { if (!rayTrack(level, track.at(-1), exitIndex(level, path, bent), bent, track)) throw Error('A rope\u2019s way out passes a cell twice'); }
      else { const d = direction(path); for (let p = add(path.at(-1), d); inside(level, p); p = add(p, d)) track.push(cell(p, level.W)); }
      tracks.push(track); lengths[i] = path.length; offsets[i] = 0; left++;
    });
    function to(i) {
      if (!Number.isInteger(i) || i < 0 || i >= n || offsets[i] < 0) return -2;
      const track = tracks[i], length = lengths[i]; let p = offsets[i] + length;
      while (p < track.length && occupied[track[p]] < 0) p++;
      return p === track.length ? -1 : p - length;
    }
    function place(i, target) {
      const from = offsets[i], track = tracks[i], length = lengths[i];
      if (from >= 0) { for (let j = from; j < from + length; j++) occupied[track[j]] = -1; left--; }
      if (target >= 0) { for (let j = target; j < target + length; j++) { occupied[track[j]] = i; at[track[j]] = j; } left++; }
      offsets[i] = target;
    }
    function free() { for (let i = 0; i < n; i++) if (offsets[i] >= 0 && to(i) !== -1) return false; return true; }
    function pathsNow() { return tracks.map((track, i) => offsets[i] < 0 ? null : track.slice(offsets[i], offsets[i] + lengths[i]).map(c => point(c, level.W))); }
    // Optimistically let every rope use cells another could eventually vacate.
    // Anything still trapped under that relaxation is certainly unsolvable.
    function relaxed() {
      const reach = offsets.slice(); let changed = true;
      while (changed) {
        changed = false;
        for (let i = 0; i < n; i++) {
          if (reach[i] < 0) continue;
          const track = tracks[i], length = lengths[i]; let next = reach[i];
          for (;;) {
            const j = next + length;
            if (j >= track.length) { next = -1; break; }
            const c = track[j], owner = occupied[c];
            if ((owner >= 0 && reach[owner] >= 0 && (owner === i ? next : reach[owner]) <= at[c])) break;
            next++;
          }
          if (next !== reach[i]) { reach[i] = next; changed = true; }
        }
      }
      return reach;
    }
    const dead = () => relaxed().some(o => o >= 0);
    const frozen = () => Array.from(relaxed()).flatMap((o, i) => offsets[i] >= 0 && o === offsets[i] ? [i] : []);
    return { tracks, lengths, offsets, occupied, to, place, free, pathsNow, dead, frozen, get left() { return left; } };
  }
  function replay(level, moves, paths = level.ropes) {
    const board = compile(level, paths), events = []; let taps = 0, automatic = false;
    for (const i of moves) {
      const target = board.to(i);
      if (target === -2 || target === board.offsets[i]) return { solved: false, paths: board.pathsNow(), events, taps };
      if (!automatic) taps++;
      board.place(i, target); events.push(target < 0 ? 'exit' : 'slide');
      if (board.free()) automatic = true;
    }
    return { solved: !board.left, paths: board.pathsNow(), events, taps };
  }
  function solve(level, paths = level.ropes, budget = 2000, prefer = []) {
    const board = compile(level, paths), seen = new Set(), moves = []; let nodes = 0, exhausted = false;
    // Every move only advances a rope: there are no reversals or geometry cycles.
    function search(preferred) {
      if (!board.left) return true;
      const state = Array.from(board.offsets).join(','); if (seen.has(state)) return false;
      if (++nodes > budget) { exhausted = true; return false; }
      seen.add(state);
      if (board.dead()) return false;
      const tries = [];
      for (let i = 0; i < paths.length; i++) { const target = board.to(i); if (target !== -2 && target !== board.offsets[i]) tries.push({ i, target }); }
      tries.sort((a, b) => a.i === preferred[0] ? -1 : b.i === preferred[0] ? 1 : (a.target < 0 ? 0 : 1) - (b.target < 0 ? 0 : 1));
      for (const { i, target } of tries) {
        const from = board.offsets[i]; board.place(i, target);
        moves.push(i);
        if (search(i === preferred[0] ? preferred.slice(1) : preferred)) return true;
        board.place(i, from); moves.pop(); if (exhausted) break;
      }
      return false;
    }
    const solved = search(prefer);
    return { solved: solved ? true : exhausted ? null : false, moves: solved ? moves.slice() : [], nodes };
  }
  function fewestPlayerTaps(level, fallback, budget = 6000) {
    const verified = replay(level, fallback);
    if (!verified.solved) throw Error('Par requires a replayable Hex solution');
    const b = compile(level), moves = [], tried = new Map(), rank = new Int32Array(b.lengths.length).fill(1000000), later = new Int32Array(b.lengths.length).fill(1000000);
    fallback.forEach((id, step) => { if (rank[id] === 1000000) rank[id] = step; later[id] = step; });
    let nodes = 0, exhausted = false;
    const bound = () => {
      const blockers = new Uint8Array(b.lengths.length); let count = 0;
      for (let i = 0; i < b.lengths.length; i++) if (b.offsets[i] >= 0) {
        for (let k = b.offsets[i] + b.lengths[i]; k < b.tracks[i].length; k++) {
          const owner = b.occupied[b.tracks[i][k]];
          if (owner >= 0 && !blockers[owner]) { blockers[owner] = 1; count++; }
        }
      }
      return count;
    };
    function search(remaining) {
      if (b.free()) return true;
      if (!remaining || bound() > remaining) return false;
      if (++nodes > budget) { exhausted = true; return false; }
      const state = Array.from(b.offsets).join(',');
      if (tried.get(state) >= remaining) return false;
      if (b.dead()) { tried.set(state, 1000000); return false; }
      const choices = [];
      for (let i = 0; i < b.lengths.length; i++) {
        const to = b.to(i); if (to !== -2 && to !== b.offsets[i]) choices.push({ i, to });
      }
      choices.sort((a, c) => (b.offsets[a.i] ? later[a.i] : rank[a.i]) - (b.offsets[c.i] ? later[c.i] : rank[c.i]) || a.i - c.i);
      for (const { i, to } of choices) {
        const from = b.offsets[i]; b.place(i, to); moves.push(i);
        if (search(remaining - 1)) return true;
        moves.pop(); b.place(i, from); if (exhausted) return false;
      }
      tried.set(state, remaining); return false;
    }
    for (let taps = Math.max(1, bound()); taps < verified.taps && !exhausted; taps++) if (search(taps)) {
      const manual = moves.length;
      for (let i = 0; i < b.lengths.length; i++) if (b.offsets[i] >= 0) moves.push(i);
      return { plan: moves.slice(), par: manual, exact: true, nodes };
    }
    return { plan: fallback.slice(), par: verified.taps, exact: !exhausted, nodes };
  }
  const api = { DIRS, key, add, direction, inside, project, cells, replay, solve, fewestPlayerTaps, cellIndex: cell, reflect, compile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MFHex = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
