// Square boards without spinners: the woven builder (weave) and the compact offset
// kernels that replay, check and search them. Pure logic, no DOM, and deterministic: the
// same inputs give the same boards on every device, which is what makes a set shareable.
//
// A tapped rope slides forward until it meets something and stays there, or leaves the
// board; that makes knots that only the right slide undoes. Fixed mirrors bend a rope's
// way out but never change it, so each rope still has one track.
'use strict';
const MFLevels = (() => {

  const { mulberry32, hashString } = typeof module !== 'undefined' && module.exports ? require('./random.js') : MFRandom;

  // ---------- rope geometry ----------
  // A rope is a path of cells from tail to head. It leaves in the direction of its last segment.
  const headDir = path => { const h = path[path.length - 1], p = path[path.length - 2]; return [h.x - p.x, h.y - p.y]; };

  // Walk forward from the head. Reports the first rope in the way, if any.
  function ray(path, occ, W, H) {
    const h = path[path.length - 1], d = headDir(path);
    let x = h.x + d[0], y = h.y + d[1], dist = 0;
    while (x >= 0 && y >= 0 && x < W && y < H) {
      const o = occ[y * W + x];
      if (o !== -1) return { clear: false, dist, blocker: o };
      x += d[0]; y += d[1]; dist++;
    }
    return { clear: true, dist, blocker: -1 };
  }
  const turn = (slope, dx, dy) => slope === '/' ? [-dy, -dx] : [dy, dx];
  function exitDir(path, W, mirrors) {
    const h = path[path.length - 1], d = headDir(path), m = mirrors.get(h.y * W + h.x);
    return m === undefined ? d : turn(m, d[0], d[1]);
  }
  // Append to `out` the cells a head at (x, y) passes moving (dx, dy), up to the edge. Null if that
  // way out would enter a cell twice: in the game such a tap overlaps itself or never settles.
  function rayCells(x, y, dx, dy, W, H, mirrors, out = []) {
    const start = out.length; let turned = false;
    for (;;) {
      x += dx; y += dy;
      if (x < 0 || y < 0 || x >= W || y >= H) break;
      const c = y * W + x, m = mirrors.get(c);
      out.push(c);
      if (m !== undefined) { [dx, dy] = turn(m, dx, dy); turned = true; if (out.length - start > 2 * W * H) return null; }
    }
    if (turned && new Set(out.slice(start)).size !== out.length - start) return null;
    return out;
  }
  function occupancy(paths, W, H) {
    const occ = new Int16Array(W * H).fill(-1);
    paths.forEach((path, id) => { for (const p of path) occ[p.y * W + p.x] = id; });
    return occ;
  }


  // ---------- sliding ----------
  // The sliding game: a tapped rope slides forward, arrow first, following its own bends and
  // then straight on, until its head meets another rope or it has left the board. Where it stops
  // it stays. Ropes only ever go forwards, so a careless slide can tie the board in a knot, and
  // some boards start with knots that only the right slide will undo.

  // The same rope after sliding forward k cells.
  function advance(path, k) {
    const h = path[path.length - 1], d = headDir(path), out = path.slice();
    for (let j = 1; j <= k; j++) out.push({ x: h.x + d[0] * j, y: h.y + d[1] * j });
    return out.slice(k);
  }
  // A board in compact form, for the analysis and the solver. A rope can only ever occupy the
  // cells of its own track: its body as first laid, then the straight line ahead of its head
  // to the edge. seq[i] is that track, len[i] the rope's length, and off[i] how far along it has
  // slid (so it sits on seq[i][off[i]] ... seq[i][off[i] + len[i] - 1]); off[i] is -1 once it has left.
  // With mirrors, the track after the head follows them (see rayCells).
  function boardOf(paths, W, H, mirrors) {
    const n = paths.length, occ = new Int16Array(W * H).fill(-1), at = new Int16Array(W * H), seq = [], len = new Int16Array(n);
    const bent = mirrors && mirrors.size;
    paths.forEach((path, i) => {
      if (!path) { seq.push(new Int16Array(0)); return; } // a rope that has left (offset -1 below)
      const h = path[path.length - 1], d = bent ? exitDir(path, W, mirrors) : headDir(path), s = path.map(p => p.y * W + p.x);
      if (bent) { if (!rayCells(h.x, h.y, d[0], d[1], W, H, mirrors, s)) throw Error('A rope’s way out passes a cell twice'); }
      else for (let x = h.x + d[0], y = h.y + d[1]; x >= 0 && y >= 0 && x < W && y < H; x += d[0], y += d[1]) s.push(y * W + x);
      seq.push(Int16Array.from(s)); len[i] = path.length;
      s.slice(0, path.length).forEach((c, j) => { occ[c] = i; at[c] = j; }); // at[cell]: where on its rope's track the cell is
    });
    const off = Int16Array.from(paths, path => path ? 0 : -1);
    return { n, left: paths.filter(Boolean).length, occ, at, seq, len, off, was: new Int16Array(n), now: new Int16Array(n) };
  }
  // Where rope i would stop if tapped: its new offset, or -1 if it would leave the board.
  function slideTo(b, i) {
    const s = b.seq[i]; let p = b.off[i] + b.len[i];
    while (p < s.length && b.occ[s[p]] === -1) p++;
    return p === s.length ? -1 : p - b.len[i];
  }
  // Put rope i at offset `to` (-1 takes it off the board). Also used to take a move back.
  function place(b, i, to) {
    const s = b.seq[i], L = b.len[i], from = b.off[i];
    if (from >= 0) { for (let p = from; p < from + L; p++) b.occ[s[p]] = -1; b.left--; }
    if (to >= 0) { for (let p = to; p < to + L; p++) { b.occ[s[p]] = i; b.at[s[p]] = p; } b.left++; }
    b.off[i] = to;
  }

  // Can the board still be solved? `relax` finds the ropes that certainly can never leave.
  //
  // It lets every rope move as freely as it ever could. In rounds, each rope pushes forward as
  // far as it could have got given what the others managed in the rounds before: through empty
  // cells freely, and through a cell another rope sits on once that rope has slid clear of it or
  // left. That is generous: it ignores that one rope sliding forward may get in another's way. So
  // a rope that does not get out here can never leave whatever is tapped: it is part of a knot
  // that cannot be undone, and the level is lost. (The reverse does not hold. A board that passes
  // may still be past saving, which takes `solve` to find out.)
  //
  // Returns how many such ropes there are. Cost: each rope's push only ever moves forward along
  // its track, so the work is the total length of the tracks plus one look per rope per round:
  // O(W*H + R * (max(W, H) + rounds)).
  const GONE = 32767;
  function relax(b) {
    const n = b.n, was = b.was, now = b.now;
    let waiting = 0;
    for (let i = 0; i < n; i++) { was[i] = now[i] = b.off[i] < 0 ? GONE : b.off[i]; if (b.off[i] >= 0) waiting++; }
    for (let moved = true; moved && waiting;) {
      moved = false;
      for (let i = 0; i < n; i++) {
        if (was[i] === GONE) continue;
        const s = b.seq[i], L = b.len[i];
        let r = was[i];
        for (;;) {
          const p = r + L;
          if (p >= s.length) { r = GONE; break; }
          const c = s[p], z = b.occ[c];
          if (z !== -1 && (z === i || was[z] <= b.at[c])) break; // still in the way (its own body always is)
          r++;
        }
        if (r !== was[i]) { now[i] = r; moved = true; if (r === GONE) waiting--; }
      }
      was.set(now);
    }
    return waiting;
  }
  // The ropes that can never move again, whatever is tapped. relax lets every rope get as far as
  // it ever could, each waiting on the others in turn, so a rope that gets nowhere even there is
  // truly fixed for good: it never names a rope that could still move. (It may miss one that is
  // fixed for a subtler reason.) A board with such a rope is lost, since that rope can never leave.
  // A lost board need not have one: ropes that can never leave can often still slide a little.
  function frozenRopes(paths, W, H, mirrors) {
    const b = boardOf(paths, W, H, mirrors), frozen = [];
    relax(b);
    for (let i = 0; i < b.n; i++) if (b.now[i] === b.off[i]) frozen.push(i);
    return frozen;
  }

  // ---------- solving ----------
  // Find an order of taps that clears the board. Because a slide cannot be taken back, this is a
  // search: try a tap, and if the board that leaves cannot be finished, take it back and try
  // another. Three things keep it short:
  //   - a board with a knot that cannot be undone (see relax) is given up on at once;
  //   - the most promising taps are tried first: those of `prefer`, a list of ropes in the order a
  //     known solution taps them (the level's own, or the last one found), then ropes that can
  //     leave, then ropes that can only slide;
  //   - every board found to be hopeless is remembered, so it is never explored twice.
  // `budget` caps the number of boards looked at. Returns { solved, moves, nodes }: solved is true
  // with `moves` the ropes to tap in order, false if there is certainly no way, or null if the
  // budget ran out first.
  function solve(paths, W, H, budget, prefer, mirrors) {
    const b = boardOf(paths, W, H, mirrors), n = b.n, hopeless = new Set(), moves = [], limit = budget || 20000;
    // rank[i]: where rope i first comes in the preferred order; later[i]: where it comes last (a
    // knot is tapped twice, to slide and then to leave), used once it has moved.
    const rank = new Int32Array(n).fill(1e6), later = new Int32Array(n).fill(1e6);
    (prefer || []).forEach((i, k) => { if (i >= 0 && i < n) { if (rank[i] === 1e6) rank[i] = k; later[i] = k; } });
    let nodes = 0, gaveUp = false;
    const search = () => {
      if (!b.left) return true;
      if (++nodes > limit) { gaveUp = true; return false; }
      const key = String.fromCharCode.apply(null, b.off.map(o => o + 1));
      if (hopeless.has(key)) return false;
      if (relax(b)) { hopeless.add(key); return false; }
      const tries = [];
      for (let i = 0; i < n; i++) {
        if (b.off[i] < 0) continue;
        const to = slideTo(b, i);
        if (to !== b.off[i]) tries.push({ i, to, order: (b.off[i] ? later[i] : rank[i]) * 2 + (to < 0 ? 0 : 1) });
      }
      tries.sort((x, y) => x.order - y.order || x.i - y.i);
      for (const t of tries) {
        const from = b.off[t.i];
        place(b, t.i, t.to); moves.push(t.i);
        if (search()) return true;
        moves.pop(); place(b, t.i, from);
        if (gaveUp) return false;
      }
      hopeless.add(key);
      return false;
    };
    const solved = search();
    return { solved: solved ? true : gaveUp ? null : false, moves, nodes };
  }

  // Only player taps count: once no rope blocks another, the game releases the remainder.
  // Keep a complete solution for hints/replay, but score only its prefix before auto-release.
  function playerTapCount(paths, W, H, taps, mirrors) {
    const b = boardOf(paths, W, H, mirrors);
    let count = 0, auto = false;
    for (const i of taps) {
      if (b.off[i] < 0) continue;
      const to = slideTo(b, i);
      if (to === b.off[i]) return null;
      if (!auto) count++;
      place(b, i, to);
      if (!auto && allFree(b)) auto = true;
    }
    return b.left ? null : count;
  }
  function allFree(b) {
    for (let i = 0; i < b.n; i++) if (b.off[i] >= 0 && slideTo(b, i) >= 0) return false;
    return true;
  }
  function fewestPlayerTaps(paths, W, H, known, budget, mirrors) {
    const count = playerTapCount(paths, W, H, known, mirrors);
    if (count === null) return null;
    const b = boardOf(paths, W, H, mirrors), limit = budget || 6000, moves = [], tried = new Map();
    const rank = new Int32Array(b.n).fill(1e6), later = new Int32Array(b.n).fill(1e6);
    known.forEach((i, k) => { if (rank[i] === 1e6) rank[i] = k; later[i] = k; });
    let nodes = 0, gaveUp = false;
    // Every distinct rope occupying another rope's exit ray must be moved before all-free.
    // This is a lower bound only: some ropes need more than one tap, and helpers may also move.
    const bound = () => {
      const blockers = new Uint8Array(b.n); let total = 0;
      for (let i = 0; i < b.n; i++) if (b.off[i] >= 0) {
        const seq = b.seq[i];
        for (let p = b.off[i] + b.len[i]; p < seq.length; p++) {
          const z = b.occ[seq[p]];
          if (z >= 0 && !blockers[z]) { blockers[z] = 1; total++; }
        }
      }
      return total;
    };
    const lower = Math.max(b.left ? 1 : 0, bound());
    const search = remaining => {
      if (allFree(b)) return true;
      if (!remaining || bound() > remaining) return false;
      if (++nodes > limit) { gaveUp = true; return false; }
      const key = String.fromCharCode.apply(null, b.off.map(o => o + 1));
      if (tried.get(key) >= remaining) return false;
      if (relax(b)) { tried.set(key, 1e6); return false; }
      const choices = [];
      for (let i = 0; i < b.n; i++) if (b.off[i] >= 0) {
        const to = slideTo(b, i);
        if (to !== b.off[i]) choices.push({ i, to, order: b.off[i] ? later[i] : rank[i] });
      }
      choices.sort((a, z) => a.order - z.order || a.i - z.i);
      for (const t of choices) {
        const from = b.off[t.i]; place(b, t.i, t.to); moves.push(t.i);
        if (search(remaining - 1)) return true;
        moves.pop(); place(b, t.i, from);
        if (gaveUp) return false;
      }
      tried.set(key, remaining); return false;
    };
    for (let k = lower; k < count && !gaveUp; k++) if (search(k)) {
      const manual = moves.length;
      // Each remaining rope is independently free; these taps are the automatic suffix.
      for (let i = 0; i < b.n; i++) if (b.off[i] >= 0) moves.push(i);
      return { taps: moves.slice(), count: manual, exact: true, nodes };
    }
    return { taps: known.slice(), count, exact: !gaveUp, nodes };
  }
  // Play a list of taps and report what is left: the paths still on the board (null where a rope
  // has gone). Used to check a solution, and by the tests.
  function play(paths, W, H, taps, mirrors) {
    const b = boardOf(paths, W, H, mirrors);
    for (const i of taps) if (b.off[i] >= 0) place(b, i, slideTo(b, i));
    return pathsOf(b, W);
  }
  const pathsOf = (b, W) => Array.from(b.seq, (s, i) => b.off[i] < 0 ? null : Array.from(s.subarray(b.off[i], b.off[i] + b.len[i]), c => ({ x: c % W, y: c / W | 0 })));
  // Replay taps as the game does: each tap must move its rope, and player taps are counted
  // until no rope blocks another (the rest is released automatically). Paths may hold null
  // for ropes that have left. Returns { solved, taps, events, paths }.
  function replay(paths, W, H, taps, mirrors) {
    const b = boardOf(paths, W, H, mirrors), events = []; let count = 0, auto = false;
    for (const i of taps) {
      const to = b.off[i] < 0 ? b.off[i] : slideTo(b, i);
      if (to === b.off[i]) return { solved: false, taps: count, events, paths: pathsOf(b, W) };
      if (!auto) count++;
      place(b, i, to); events.push(to < 0 ? 'exit' : 'slide');
      if (allFree(b)) auto = true;
    }
    return { solved: !b.left, taps: count, events, paths: pathsOf(b, W) };
  }
  // True when no rope blocks another: every rope still on the board can leave at once.
  const free = (paths, W, H, mirrors) => allFree(boardOf(paths, W, H, mirrors));
  // Each rope's whole track as cell indices (see boardOf).
  const tracksOf = (paths, W, H, mirrors) => boardOf(paths, W, H, mirrors).seq.map(s => Array.from(s));

  const total = a => a.reduce((x, y) => x + y, 0);










  return { mulberry32, hashString, headDir, ray, rayCells, tracksOf, occupancy, advance, frozenRopes, solve, fewestPlayerTaps, playerTapCount, play, replay, free };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = MFLevels;
