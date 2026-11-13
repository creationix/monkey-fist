// Square boards without spinners: the woven builder (weave) and the compact offset
// kernels that replay, check and search them. Pure logic, no DOM, and deterministic: the
// same inputs give the same boards on every device, which is what makes a set shareable.
//
// A tapped rope slides forward until it meets something and stays there, or leaves the
// board; that makes knots that only the right slide undoes. Fixed mirrors bend a rope's
// way out but never change it, so each rope still has one track.
'use strict';
const MFLevels = (() => {
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

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
  // Fixed two-sided mirrors, as a Map from cell (y * W + x) to '/' or '\'. A moving rope turns as it
  // enters a mirror's cell, exactly as in mechanics.js. A rope's future cells are therefore still
  // one fixed sequence: its body, then its way out as the mirrors bend it. Everything below that
  // works on that sequence (the replay, the relaxation and the searches) needs no other change.
  const NO_MIRRORS = new Map();
  const mirrorMap = m => m instanceof Map ? m : Array.isArray(m) ? new Map(m.map(x => [x.cell, x.slope])) : NO_MIRRORS;
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
  function selfBlocked(path, W, H, mirrors) {
    if (mirrors && mirrors.size) {
      const h = path[path.length - 1], d = exitDir(path, W, mirrors), ahead = rayCells(h.x, h.y, d[0], d[1], W, H, mirrors);
      if (!ahead) return true;
      const body = new Set(path.map(p => p.y * W + p.x));
      return ahead.some(c => body.has(c));
    }
    const h = path[path.length - 1], d = headDir(path);
    return path.some(p => (d[0] ? p.y === h.y && (p.x - h.x) * d[0] > 0 : p.x === h.x && (p.y - h.y) * d[1] > 0));
  }
  function occupancy(paths, W, H) {
    const occ = new Int16Array(W * H).fill(-1);
    paths.forEach((path, id) => { for (const p of path) occ[p.y * W + p.x] = id; });
    return occ;
  }

  // ---------- difficulty ----------
  // Every rope standing anywhere in a rope's way out: it cannot leave until each has got out of the way.
  function blockersOf(paths, W, H, mirrors) {
    if (mirrors && mirrors.size) {
      const b = boardOf(paths, W, H, mirrors);
      return b.seq.map((s, i) => { const seen = new Set(); for (let p = b.len[i]; p < s.length; p++) if (b.occ[s[p]] !== -1) seen.add(b.occ[s[p]]); return [...seen]; });
    }
    const occ = occupancy(paths, W, H);
    return paths.map((path, id) => {
      const h = path[path.length - 1], d = headDir(path), seen = new Set();
      for (let x = h.x + d[0], y = h.y + d[1]; x >= 0 && y >= 0 && x < W && y < H; x += d[0], y += d[1]) {
        const o = occ[y * W + x];
        if (o !== -1) seen.add(o); // a rope's own body in its path counts too: it can never leave
      }
      return [...seen];
    });
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
  // Group the ropes by the loops they are tied in. Ropes are in the same group when each waits
  // on the other, directly or round a circle of others; a rope in no loop is a group of its own.
  // (The strongly connected parts of the "waits for" links, by Tarjan's algorithm: O(R + links).)
  // Groups come out deepest first: every group a group waits on is listed before it.
  function groupsOf(blk) {
    const n = blk.length, index = new Int32Array(n).fill(-1), low = new Int32Array(n), on = new Uint8Array(n), stack = [], groups = [];
    let next = 0;
    for (let root = 0; root < n; root++) {
      if (index[root] >= 0) continue;
      const work = [[root, 0]]; index[root] = low[root] = next++; stack.push(root); on[root] = 1;
      while (work.length) {
        const top = work[work.length - 1], v = top[0];
        if (top[1] < blk[v].length) {
          const w = blk[v][top[1]++];
          if (index[w] < 0) { index[w] = low[w] = next++; stack.push(w); on[w] = 1; work.push([w, 0]); }
          else if (on[w] && index[w] < low[v]) low[v] = index[w];
        } else {
          work.pop();
          if (work.length) { const u = work[work.length - 1][0]; if (low[v] < low[u]) low[u] = low[v]; }
          if (low[v] === index[v]) {
            const group = []; let w;
            do { w = stack.pop(); on[w] = 0; group.push(w); } while (w !== v);
            groups.push(group);
          }
        }
      }
    }
    return groups;
  }
  // The loops on a board: each a list of ropes that wait on one another in a circle, so that none
  // of them can leave until one slides far enough to let another by.
  function loopsOf(paths, W, H, mirrors) {
    return groupsOf(blockersOf(paths, W, H, mirrors)).filter(g => g.length > 1).map(g => g.sort((x, y) => x - y));
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
  // The ropes that can never leave. Empty on any board that can still be solved.
  function deadRopes(paths, W, H, mirrors) {
    const b = boardOf(paths, W, H, mirrors), dead = [];
    if (relax(b)) for (let i = 0; i < b.n; i++) if (b.now[i] !== GONE) dead.push(i);
    return dead;
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
  // ---------- the fewest taps ----------
  // Every rope takes one tap to leave, so a level's solutions differ only in how many slides they
  // spend. This looks for a solution with as few as possible.
  //
  // It is a search that deepens one slide at a time: is there a solution with no slides? with
  // one? with two? The first that exists is the fewest. Between slides it takes out every rope
  // that can leave, since a rope leaving costs nothing extra and gets in nothing's way. Boards
  // with a knot that cannot be undone are dropped at once, and a board already tried with as
  // many slides in hand is not tried again.
  //
  // `known` is a solution already in hand (the builder's): the search need only look for better,
  // and tries its slides first. `budget` caps the boards looked at. Returns { taps, exact }: the
  // best solution's taps in order, and whether the search finished (so that nothing shorter
  // exists) or ran out of budget and fell back on the solution it was given. On every board small
  // enough to check by trying all possible play, a finished search has matched the true fewest.
  function fewestTaps(paths, W, H, known, budget, mirrors) {
    const b = boardOf(paths, W, H, mirrors), n = b.n, limit = budget || 20000;
    // the slides in the known solution, and where each rope first comes in it
    const sim = boardOf(paths, W, H, mirrors), rank = new Int32Array(n).fill(1e6);
    let knownSlides = 0;
    known.forEach((i, k) => { if (sim.off[i] < 0) return; if (rank[i] === 1e6) rank[i] = k; const to = slideTo(sim, i); if (to >= 0 && to !== sim.off[i]) knownSlides++; place(sim, i, to); });
    if (sim.left) return null; // not a solution
    const moves = [], tried = new Map();
    let nodes = 0, gaveUp = false;
    // Take out every rope that can leave, and say which went, so that it can be put back.
    const clear = () => {
      const gone = [];
      for (let moved = true; moved;) {
        moved = false;
        for (let i = 0; i < n; i++) if (b.off[i] >= 0 && slideTo(b, i) < 0) { gone.push(i, b.off[i]); place(b, i, -1); moves.push(i); moved = true; }
      }
      return gone;
    };
    const restore = gone => { for (let j = gone.length - 2; j >= 0; j -= 2) { place(b, gone[j], gone[j + 1]); moves.pop(); } };
    const search = k => { // the board has just been cleared of everything that can leave; k slides may still be spent
      if (!b.left) return true;
      if (!k) return false;
      if (++nodes > limit) { gaveUp = true; return false; }
      const key = String.fromCharCode.apply(null, b.off.map(o => o + 1));
      if (tried.get(key) >= k) return false;
      if (relax(b)) { tried.set(key, 1e6); return false; }
      const slides = [];
      for (let i = 0; i < n; i++) { if (b.off[i] < 0) continue; const to = slideTo(b, i); if (to !== b.off[i]) slides.push(i); }
      slides.sort((x, y) => rank[x] - rank[y] || x - y);
      for (const i of slides) {
        const from = b.off[i];
        place(b, i, slideTo(b, i)); moves.push(i);
        const gone = clear();
        if (search(k - 1)) return true;
        restore(gone); moves.pop(); place(b, i, from);
        if (gaveUp) return false;
      }
      tried.set(key, k);
      return false;
    };
    const first = clear();
    for (let k = 0; k < knownSlides && !gaveUp; k++) if (search(k)) return { taps: moves.slice(), exact: true, nodes };
    restore(first);
    return { taps: known.slice(), exact: !gaveUp, nodes };
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
  // Shorten a solution's player taps by moving exits the rest of the solution does not need to the
  // automatic release at the end. Every result is replay-checked; the best one found is returned.
  function postponeExits(paths, W, H, taps, mirrors) {
    let best = taps.slice(), count = playerTapCount(paths, W, H, best, mirrors);
    if (count === null) return null;
    for (let pass = 0; pass < 2; pass++) {
      let improved = false;
      for (let k = best.length - 1; k >= 0; k--) {
        const i = best[k]; if (best.indexOf(i, k + 1) >= 0) continue; // only a rope's last tap is its exit
        const trial = best.slice(0, k).concat(best.slice(k + 1), i), c = playerTapCount(paths, W, H, trial, mirrors);
        if (c !== null && c < count) { best = trial; count = c; improved = true; }
      }
      if (!improved) break;
    }
    return { taps: best, count };
  }
  // A casual player: tap a rope that can leave if there is one, otherwise any rope that can move, at
  // random. Returns the share of `games` it wins. It plays the original no-slide game perfectly and
  // guesses at every slide, so a low share means a board offers many wrong slides. A comparative
  // measure between boards, not a model of any particular person.
  function casualWins(paths, W, H, rng, games, mirrors) {
    const b = boardOf(paths, W, H, mirrors), exits = [], moves = [];
    let wins = 0;
    for (let g = 0; g < games; g++) {
      b.occ.fill(-1); b.left = 0;
      for (let i = 0; i < b.n; i++) { b.off[i] = -1; place(b, i, 0); }
      for (;;) {
        exits.length = 0; moves.length = 0;
        for (let i = 0; i < b.n; i++) if (b.off[i] >= 0) {
          const to = slideTo(b, i);
          if (to < 0) exits.push(i); else if (to !== b.off[i]) moves.push(i, to);
        }
        if (exits.length) place(b, exits[Math.floor(rng() * exits.length)], -1);
        else if (moves.length) { const k = 2 * Math.floor(rng() * moves.length / 2); place(b, moves[k], moves[k + 1]); }
        else break;
        if (!b.left) { wins++; break; }
      }
    }
    return wins / Math.max(1, games);
  }

  // How many corners a rope turns.
  function bendsOf(path) {
    let n = 0;
    for (let i = 2; i < path.length; i++) if (path[i].x - path[i - 1].x !== path[i - 1].x - path[i - 2].x || path[i].y - path[i - 1].y !== path[i - 1].y - path[i - 2].y) n++;
    return n;
  }
  const total = a => a.reduce((x, y) => x + y, 0);

  // ---------- shaping ropes ----------
  // Ways to shape a new rope on a board, shared by both builders. `occ` is the board (-1 where a
  // cell is empty); cfg gives the rope lengths and how straight they run.
  function shaper(occ, W, H, rng, cfg) {
    const N = W * H, xy = c => ({ x: c % W, y: c / W | 0 }), mirrors = mirrorMap(cfg.mirrors);
    const blocked = path => selfBlocked(path, W, H, mirrors);
    // A random walk through empty cells starting at `start`, optionally with its first step
    // forced in direction `first`. `straight` is the chance each step carries straight on.
    const grow = (start, first, straight) => {
      const want = cfg.lenLo + Math.floor(rng() * (cfg.lenHi - cfg.lenLo + 1)), cells = [start];
      let last = -1;
      occ[start] = -2;
      while (cells.length < want) {
        const c = cells[cells.length - 1], x = c % W, y = c / W | 0, opts = [];
        for (let d = 0; d < 4; d++) {
          const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
          if (nx >= 0 && ny >= 0 && nx < W && ny < H && occ[ny * W + nx] === -1) opts.push(d);
        }
        if (!opts.length || (cells.length === 1 && first >= 0 && !opts.includes(first))) break;
        const d = cells.length === 1 && first >= 0 ? first : last >= 0 && opts.includes(last) && rng() < straight ? last : opts[Math.floor(rng() * opts.length)];
        last = d;
        const nc = (y + DIRS[d][1]) * W + x + DIRS[d][0];
        cells.push(nc); occ[nc] = -2;
      }
      for (const c of cells) occ[c] = -1;
      return cells;
    };
    // The way out from (x, y) in direction d, not counting (x, y) itself: every cell to the edge,
    // how many of them are empty, and the ropes standing in it.
    // With mirrors the way out bends; null if it would pass a cell twice.
    const wayOut = (x, y, d) => {
      let cells = [];
      if (mirrors.size) { cells = rayCells(x, y, d[0], d[1], W, H, mirrors); if (!cells) return null; }
      else for (let a = x + d[0], b = y + d[1]; a >= 0 && b >= 0 && a < W && b < H; a += d[0], b += d[1]) cells.push(b * W + a);
      const ids = [];
      let free = 0;
      for (const c of cells) { const o = occ[c]; if (o === -1) free++; else if (o >= 0 && !ids.includes(o)) ids.push(o); }
      return { cells, free, ids };
    };
    // Shape a rope that includes `start`. Usually head-first: point the head from `start` (longer
    // ways out favoured: they cross more of the board) and lay the body out behind it. Otherwise
    // walk a body through `start` and take whichever end has the longer way out.
    const shape = (start, straight, dir = -1) => {
      const s = xy(start);
      if (dir >= 0 || rng() < 0.75) {
        const opts = []; let sum = 0;
        for (let d = 0; d < 4; d++) {
          if (dir >= 0 && d !== dir) continue;
          const bx = s.x - DIRS[d][0], by = s.y - DIRS[d][1]; // the body's first cell sits behind the head
          if (bx < 0 || by < 0 || bx >= W || by >= H || occ[by * W + bx] !== -1) continue;
          const lane = wayOut(s.x, s.y, DIRS[d]);
          if (!lane) continue;
          opts.push({ d, lane, w: lane.cells.length + 1 }); sum += lane.cells.length + 1;
        }
        if (opts.length) {
          let r = rng() * sum, o = opts[opts.length - 1];
          for (const cand of opts) { r -= cand.w; if (r < 0) { o = cand; break; } }
          const cells = grow(start, (o.d + 2) % 4, straight), path = cells.map(xy).reverse();
          if (cells.length >= cfg.minLen && !blocked(path)) return { cells, path, lane: o.lane };
        }
        if (dir >= 0) return null;
      }
      const cells = grow(start, -1, straight);
      if (cells.length < cfg.minLen) return null;
      const a = cells.map(xy), b = a.slice().reverse(), ok = [];
      for (const p of [a, b]) if (!blocked(p)) { const h = p[p.length - 1]; ok.push({ cells, path: p, lane: wayOut(h.x, h.y, headDir(p)) }); }
      if (!ok.length) return null;
      return ok.length === 2 && (ok[1].lane.cells.length > ok[0].lane.cells.length || (ok[1].lane.cells.length === ok[0].lane.cells.length && rng() < 0.5)) ? ok[1] : ok[0];
    };
    return { xy, grow, wayOut, shape, blocked, mirrors };
  }

  // While laying ropes: tries per step, and how many failed steps in a row end the stage.
  const TRIES_PER_STEP = 6, MAX_STUCK = 4;

  // ---------- building one level for the sliding game ----------
  // A sliding level is built backwards from the solved board, as a board together with a way to
  // solve it. The way to solve it is kept as intentions rather than as a fixed list of taps: for
  // each rope, the places it is meant to slide to and stop, in order, before it finally leaves.
  // `replay` plays those intentions out: it goes round the ropes tapping any whose tap would do
  // exactly what is meant for it next (stop on that very cell, or leave) until the board is empty
  // or nothing more can be done. A board whose intentions replay to an empty board is solvable,
  // and the taps the replay made are its solution.
  //
  // Every step of the build is one of three moves made in reverse, and is kept only if the board
  // still replays:
  //
  //   lay    - a rope appears on the board, meant simply to leave. It may lie anywhere there is
  //            room: across other ropes' ways out, in a pocket where it must wait its turn, or
  //            in the gap a knot is going to slide into, in which case it has to leave first.
  //   knot   - a rope appears already pulled back from the place it is meant to slide to, where
  //            its head will be hard against another rope. Its tail lies across the way out of
  //            a rope it is itself waiting on, so nothing in that loop can leave until it slides.
  //            The rope it comes to rest against may itself be a knot that has to slide into
  //            place first.
  //   trap   - a rope appears with a gap in front of it, kept empty, into which it must not be
  //            slid: checked directly, by sliding it there and finding ropes that can then never leave.
  //
  // Because the replay goes by what each tap would do, not by a remembered order, a new rope
  // re-times everything around it by itself. A rope laid in a knot's gap holds that slide back
  // until it has gone; a knot laid against another knot's resting place cannot slide until that
  // one has. That is what weaves slides and exits together.
  //
  // Block cost comes out of the same replay. Each tap is given a layer: one more than the latest
  // layer among the taps it had to wait for (those that emptied a cell it passes over, the one
  // that brought the rope it stops against into place, and the rope's own last slide), or 0 if it
  // waited for nothing. A rope's block cost is the layer of the tap that takes it off the board.
  // On a board with no slides that is exactly the original game's block cost; a knot adds a layer
  // to everything waiting behind it. Difficulty is the sum of block costs plus bends, so each
  // candidate's effect on the score is known exactly and the builder steers by it.
  //
  // cfg: { W, H, lenLo, lenHi, straight, minLen, bends, lo, hi, wantAvg, floor, cover } shape the
  // ropes and pace the score into [lo, hi); tie (knots wanted), bait (traps wanted) and pull
  // (longest slide) shape the sliding.
  // Returns { W, H, ropes, costs, score, taps, slides, knots, traps }, or null if the board is no good.
  //   ropes  - the level as it starts.         costs - each rope's block cost.
  //   taps   - the solution: ropes in the order to tap them. `slides` of them stop short of leaving.
  //   knots  - ropes that start tied in a loop and are meant to slide.
  //   traps  - slides open at the start that would leave ropes that can never get out.
  //
  // Cost. A replay is one or two passes over the ropes, each tap walking at most a board side:
  // O(R * max(W, H)) plus O(W*H) to set the board up. Each step tries a bounded number of
  // candidates (6 ropes, and up to 12 knots and 12 traps while those are wanted), so a level
  // costs a few hundred replays.
  const NO_STOPS = [], KNOT_TRIES = 12; // KNOT_TRIES: tries per step at a knot, and as many again at a trap
  // Marks on the starting board (occ) besides rope ids: a cell being walked, a cell held empty in
  // front of a trap, and a fixed mirror (passable for moving ropes, but no rope may start on one).
  const WALKED = -2, KEPT = -3, MIRROR = -4;

  // The board the replay runs on (see boardOf), taking one more rope at a time, each with its
  // intentions: the offsets it is meant to stop at, in order, before it leaves. replay() plays
  // them out (see above) and records each rope's block cost, the rope its last wait was for, the
  // taps made and their total block cost.
  function intentionBoard(W, H, mirrors) {
    const N = W * H;
    const b = { n: 0, left: 0, occ: new Int16Array(N), at: new Int16Array(N), seq: [], len: new Int16Array(N), off: new Int16Array(N), was: new Int16Array(N), now: new Int16Array(N) };
    const paths = [], stops = [], cost = new Int16Array(N), dep = new Int16Array(N);
    const cellAt = new Int16Array(N), ropeAt = new Int16Array(N), cellBy = new Int16Array(N), done = new Uint8Array(N);
    const self = { b, paths, stops, cost, dep, taps: [], costSum: 0 };
    self.add = (path, st) => {
      const h = path[path.length - 1], d = headDir(path), q = path.map(c => c.y * W + c.x);
      if (mirrors.size) { if (!rayCells(h.x, h.y, d[0], d[1], W, H, mirrors, q)) throw Error('Unchecked looping track'); }
      else for (let x = h.x + d[0], y = h.y + d[1]; x >= 0 && y >= 0 && x < W && y < H; x += d[0], y += d[1]) q.push(y * W + x);
      b.seq[b.n] = Int16Array.from(q); b.len[b.n] = path.length; paths[b.n] = path; stops[b.n] = st;
      return b.n++;
    };
    self.drop = () => { b.n--; b.seq.length = paths.length = stops.length = b.n; };
    self.setUp = () => { b.occ.fill(-1); b.left = 0; for (let i = 0; i < b.n; i++) { b.off[i] = -1; place(b, i, 0); } };
    // Tap rope i if that does what is meant for it next. True if it moved.
    const tap = i => {
      const q = b.seq[i], L = b.len[i], from = b.off[i];
      let p = from + L, lay = ropeAt[i], by = -1;
      while (p < q.length && b.occ[q[p]] === -1) { if (cellAt[q[p]] > lay) { lay = cellAt[q[p]]; by = cellBy[q[p]]; } p++; }
      const to = p === q.length ? -1 : p - L;
      if (to !== (done[i] < stops[i].length ? stops[i][done[i]] : -1)) return false;
      if (to >= 0) { const z = b.occ[q[p]]; if (ropeAt[z] > lay) { lay = ropeAt[z]; by = z; } } // what it stops against had to get there first
      lay++;
      for (let c = from, end = to < 0 ? from + L : Math.min(from + L, to); c < end; c++) { cellAt[q[c]] = lay; cellBy[q[c]] = i; }
      place(b, i, to);
      ropeAt[i] = lay; self.taps.push(i);
      if (to < 0) { cost[i] = lay; dep[i] = by; self.costSum += lay; } else done[i]++;
      return true;
    };
    // Play the board out. `list` is the order to try the ropes in; `fresh`, if given, is a rope
    // just added, which is tried again after every tap so that it goes as early as it can.
    self.replay = (list, fresh) => {
      self.setUp();
      cellAt.fill(-1); ropeAt.fill(-1, 0, b.n); done.fill(0, 0, b.n);
      self.taps = []; self.costSum = 0;
      for (let moved = true; moved && b.left;) {
        moved = false;
        for (const i of list) {
          if (b.off[i] >= 0 && tap(i)) { moved = true; while (fresh >= 0 && b.off[fresh] >= 0 && tap(fresh)); }
        }
      }
      return b.left === 0;
    };
    // The total block cost if this rope were added, tried first and then in `order`, or -1 if the
    // board would no longer play out.
    self.trial = (path, st, order) => {
      const id = self.add(path, st), ok = self.replay([id].concat(order), id), sum = self.costSum;
      self.drop();
      return ok ? sum : -1;
    };
    return self;
  }

  // Where a knot or trap could go on the starting board `occ`: an empty cell for the head and a
  // direction, with something to stop against directly ahead (and how much straight room there is
  // behind), or a rope a gap ahead. `tight` spots are against a rope that is there now; `chain`
  // spots are against the place another knot will come to rest (rest[cell]), so that the two have
  // to be slid in the right order; `gapped` spots have a rope a short gap ahead.
  function knotSpots(occ, rest, W, H, mirrors, pull) {
    const tight = [], chain = [], gapped = [];
    for (let c = 0; c < W * H; c++) {
      if (occ[c] !== -1) continue;
      const x = c % W, y = c / W | 0;
      for (let di = 0; di < 4; di++) {
        const d = DIRS[di], ax = x + d[0], ay = y + d[1];
        if (ax < 0 || ay < 0 || ax >= W || ay >= H) continue;
        const o = occ[ay * W + ax], against = o === -1 ? rest[ay * W + ax] : -1;
        if (o >= 0 || against >= 0) {
          let room = 0, bx = x - d[0], by = y - d[1];
          while (room <= pull && bx >= 0 && by >= 0 && bx < W && by < H && occ[by * W + bx] === -1) { room++; bx -= d[0]; by -= d[1]; }
          if (room >= 2) (o >= 0 ? tight : chain).push({ c, di, room, against });
          continue;
        }
        if (mirrors.size) { // the gap follows the bending way out; mirror cells in it stay passable
          const ahead = rayCells(x, y, d[0], d[1], W, H, mirrors); if (!ahead) continue;
          let gap = 0; while (gap < ahead.length && gap <= pull && (occ[ahead[gap]] === -1 || occ[ahead[gap]] === MIRROR)) gap++;
          if (gap && gap <= pull && gap < ahead.length && occ[ahead[gap]] >= 0) gapped.push({ c, di, gap });
          continue;
        }
        let gap = 0, nx = ax, ny = ay;
        while (gap <= pull && nx >= 0 && ny >= 0 && nx < W && ny < H && occ[ny * W + nx] === -1) { gap++; nx += d[0]; ny += d[1]; }
        if (gap && gap <= pull && nx >= 0 && ny >= 0 && nx < W && ny < H && occ[ny * W + nx] >= 0) gapped.push({ c, di, gap });
      }
    }
    return { tight, chain, gapped };
  }

  function weave(rng, cfg) {
    const W = cfg.W, H = cfg.H, N = W * H;
    const occ = new Int16Array(N).fill(-1); // the board as the level starts
    const { xy, wayOut, shape, blocked, mirrors } = shaper(occ, W, H, rng, cfg);
    for (const c of mirrors.keys()) occ[c] = MIRROR;
    const ib = intentionBoard(W, H, mirrors), { b, paths, stops, cost, dep } = ib;
    let order = [];                         // the ropes in the order the last replay first tapped them: the order to try them in next time
    const trial = (path, st) => ib.trial(path, st, order);
    let total0 = 0, bendSum = 0, covered = 0, knots = 0, traps = 0; // total0: the block cost total of the board as it stands
    const mirrorUsed = new Set();
    const rest = new Int16Array(N).fill(-1); // rest[cell]: the knot that will come to rest on this cell, which is empty for now
    const commit = c => {
      const id = ib.add(c.first || c.path, c.first ? [c.pull] : NO_STOPS);
      if (mirrors.size) for (const cell of b.seq[id]) if (mirrors.has(cell)) mirrorUsed.add(cell);
      ib.replay([id].concat(order), id);
      total0 = ib.costSum;
      order = []; for (const i of ib.taps) if (!order.includes(i)) order.push(i);
      for (const p of paths[id]) occ[p.y * W + p.x] = id;
      covered += paths[id].length; bendSum += c.bends;
      if (c.first) { knots++; for (const cell of c.rest) rest[cell] = id; }
      if (c.gap) { traps++; for (const cell of c.gap) if (occ[cell] === -1) occ[cell] = KEPT; }
    };

    // How the board stands as the level starts: ahead[i] the empty cells on rope i's way out,
    // blk[i] the ropes on it, lanes[cell] the ropes whose way out crosses an empty cell, and
    // up[i] roughly how long a chain of ropes is waiting on rope i.
    let ahead = [], blk = [], lanes = [];
    const up = new Int16Array(N);
    const survey = () => {
      ahead = []; blk = []; lanes = new Array(N);
      for (let i = 0; i < b.n; i++) {
        const q = b.seq[i], free = [], ids = [];
        for (let p = b.len[i]; p < q.length; p++) {
          const o = occ[q[p]];
          if (o === -1) { free.push(q[p]); (lanes[q[p]] || (lanes[q[p]] = [])).push(i); } else if (o >= 0 && !ids.includes(o)) ids.push(o);
        }
        ahead.push(free); blk.push(ids);
      }
      up.fill(0, 0, b.n);
      const byCost = order.slice().sort((x, y) => cost[y] - cost[x]);
      for (const i of byCost) if (dep[i] >= 0 && up[i] + 1 > up[dep[i]]) up[dep[i]] = up[i] + 1;
    };
    // Pick an existing rope to lay the next one across. 'deep' favours free ropes with long chains
    // waiting on them, 'leaf' is any free rope, 'inner' any rope already blocked.
    const pickParent = kind => {
      let sum = 0;
      const w = paths.map((_, i) => {
        const v = !ahead[i].length ? 0 : kind === 'inner' ? (cost[i] > 0 ? 1 : 0) : cost[i] > 0 ? 0 : kind === 'deep' ? (up[i] + 1) * (up[i] + 1) : 1;
        sum += v; return v;
      });
      if (!sum) return -1;
      let r = rng() * sum;
      for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i; }
      return w.length - 1;
    };
    // One possible next rope, with what it would do to the score. Null if it does not fit.
    const aimed = () => { // a head 1 to 3 cells before an unused mirror, pointing at it
      const idle = [...mirrors.keys()].filter(c => !mirrorUsed.has(c)); if (!idle.length) return null;
      const m = idle[Math.floor(rng() * idle.length)], di = Math.floor(rng() * 4), j = 1 + Math.floor(rng() * 3);
      const x = m % W - DIRS[di][0] * j, y = (m / W | 0) - DIRS[di][1] * j;
      if (x < 0 || y < 0 || x >= W || y >= H) return null;
      for (let k = 0; k < j; k++) { const c = (y + DIRS[di][1] * k) * W + x + DIRS[di][0] * k; if (occ[c] !== -1) return null; }
      return { start: y * W + x, di };
    };
    const candidate = (kind, at) => {
      let start = at >= 0 ? at : -1, dir = -1;
      if (kind === 'mirror') { const a = aimed(); if (!a) return null; start = a.start; dir = a.di; }
      const parent = start >= 0 || kind === 'any' || kind === 'plain' ? -1 : pickParent(kind);
      if (parent >= 0) start = ahead[parent][Math.floor(rng() * ahead[parent].length)];
      for (let t = 0; start < 0 && t < 6; t++) { const c = Math.floor(rng() * N); if (occ[c] === -1) start = c; }
      if (start < 0) return null;
      const c = shape(start, kind === 'plain' ? 1 : cfg.straight, dir);
      if (!c) return null;
      const sum = trial(c.path, NO_STOPS);
      if (sum < 0) return null;
      return { path: c.path, lane: c.lane, gain: sum - total0, bends: bendsOf(c.path) };
    };

    // Mark every rope the ropes in `blockers` are waiting on, directly or down a chain. A cell is
    // `tied` if one of them has its way out through it: a rope lying there would close a loop.
    const mark = new Int32Array(N + 1); let stamp = 0;
    const below = blockers => {
      stamp++;
      const stack = blockers.slice();
      for (const z of stack) mark[z] = stamp;
      while (stack.length) { const x = stack.pop(); for (const y of blk[x]) if (mark[y] !== stamp) { mark[y] = stamp; stack.push(y); } }
    };
    const tied = cell => { const l = lanes[cell]; if (l) for (const id of l) if (mark[id] === stamp) return true; return false; };
    // Walk out a rope for a spot: its body behind the head, keeping off tied cells so that it
    // closes no loop where it lies, and then, for a knot, k more cells of tail which must reach a
    // tied cell. A knot's first k + 2 cells run straight, so that it can start k cells back.
    // Returns the body cells (head first) and the tail cells, or null.
    const walk = (spot, k) => {
      const back = (spot.di + 2) % 4, want = Math.max(k + 2, cfg.lenLo + Math.floor(rng() * (cfg.lenHi - cfg.lenLo + 1))), cells = [spot.c], tail = [];
      let last = back, got = false;
      occ[spot.c] = WALKED;
      while (cells.length + tail.length < want + k) {
        const body = cells.length < want, c = body || !tail.length ? cells[cells.length - 1] : tail[tail.length - 1], x = c % W, y = c / W | 0, opts = [];
        for (let di = 0; di < 4; di++) {
          const nx = x + DIRS[di][0], ny = y + DIRS[di][1], nc = ny * W + nx;
          if (nx >= 0 && ny >= 0 && nx < W && ny < H && occ[nc] === -1 && (!body || !tied(nc))) opts.push(di);
        }
        if (!opts.length) break;
        let di;
        if (body) { // the first step is straight back, and a knot's first k + 1 are
          if (cells.length <= k + 1) { if (!opts.includes(back)) break; di = back; }
          else di = opts.includes(last) && rng() < cfg.straight ? last : opts[Math.floor(rng() * opts.length)];
        } else { // the tail of a knot heads for a tied cell if it has not found one yet
          const ties = got ? [] : opts.filter(o => tied((y + DIRS[o][1]) * W + x + DIRS[o][0]));
          di = ties.length ? ties[Math.floor(rng() * ties.length)] : opts[Math.floor(rng() * opts.length)];
        }
        last = di;
        const nc = (y + DIRS[di][1]) * W + x + DIRS[di][0];
        occ[nc] = WALKED;
        if (body) cells.push(nc); else { tail.push(nc); if (tied(nc)) got = true; }
      }
      for (const c of cells) occ[c] = -1;
      for (const c of tail) occ[c] = -1;
      if (cells.length < Math.max(cfg.minLen, k + 2) || blocked(cells.map(xy).reverse())) return null;
      if (k && (tail.length < k || !got || blocked(cells.slice(k).concat(tail).map(xy).reverse()))) return null;
      return { cells, tail };
    };
    // A knot at a spot where there is something to stop against: shaped in the place it slides
    // to, and starting k cells back.
    const knot = spot => {
      const lane = wayOut(spot.c % W, spot.c / W | 0, DIRS[spot.di]);
      if (!lane) return null;
      below(spot.against >= 0 ? lane.ids.concat([spot.against]) : lane.ids);
      if (tied(spot.c)) return null;
      const k = 1 + Math.floor(rng() * Math.min(cfg.pull, spot.room - 1)), w = walk(spot, k);
      if (!w) return null;
      const first = w.cells.slice(k).concat(w.tail).map(xy).reverse(), sum = trial(first, [k]);
      return sum < 0 ? null : { first, pull: k, rest: w.cells.slice(0, k), gain: sum - total0, bends: bendsOf(first) };
    };
    // A trap at a spot with a gap ahead. Sliding it into the gap must leave ropes that can never
    // get out, which is checked by doing it.
    const trap = spot => {
      const lane = wayOut(spot.c % W, spot.c / W | 0, DIRS[spot.di]);
      if (!lane) return null;
      const gap = lane.cells.slice(0, spot.gap);
      below(lane.ids);
      if (tied(spot.c) || !gap.some(tied)) return null;
      const w = walk(spot, 0);
      if (!w) return null;
      const path = w.cells.map(xy).reverse(), sum = trial(path, NO_STOPS);
      if (sum < 0) return null;
      const id = ib.add(path, NO_STOPS);
      ib.setUp(); place(b, id, spot.gap);
      const dead = relax(b);
      ib.drop();
      return dead ? { path, gap, gain: sum - total0, bends: bendsOf(path) } : null;
    };

    const sMin = Math.ceil(cfg.lo), sMax = Math.ceil(cfg.hi) - 1; // the whole-number scores inside the slot
    const meanLen = (cfg.lenLo + cfg.lenHi) / 2 * 0.85, coverGoal = cfg.cover * N;
    // Optional simultaneous core. Unlike the ordinary backwards additions, a core can prescribe
    // several successive stops for the same strand. False if the core does not fit or play out.
    function seedCore() {
      const occupied = new Set();
      for (let i = 0; i < cfg.initialRopes.length; i++) {
        const path = cfg.initialRopes[i];
        if (path.length < 2 || path.some(p => p.x < 0 || p.y < 0 || p.x >= W || p.y >= H || occupied.has(p.y * W + p.x))) return false;
        for (const p of path) occupied.add(p.y * W + p.x);
        ib.add(path.map(p => ({ x: p.x, y: p.y })), (cfg.initialStops?.[i] || []).slice());
      }
      order = cfg.initialPlan?.slice() || paths.map((_, i) => i);
      if (!ib.replay(order, -1)) return false;
      total0 = ib.costSum; bendSum = paths.reduce((sum, path) => sum + bendsOf(path), 0);
      covered = occupied.size; knots = stops.filter(stop => stop.length).length;
      for (let i = 0; i < paths.length; i++) {
        for (const p of paths[i]) occ[p.y * W + p.x] = i;
        for (const offset of stops[i]) for (let j = b.len[i]; j < b.len[i] + offset; j++) if (occ[b.seq[i][j]] === -1) rest[b.seq[i][j]] = i;
      }
      order = [...new Set(ib.taps)];
      return true;
    }
    // Lay ropes, steering the score: pace it to arrive in its slot about when the board is full,
    // keep the average block cost up near wantAvg, never add more than the slot allows, never add
    // a rope the depth floor could not afford.
    function layRopes() {
      for (let guard = 0, stuck = 0; guard < 2 * N; guard++) {
        const score = total0 + bendSum;
        if (cfg.ropeCount ? b.n >= cfg.ropeCount : score >= sMin && b.n >= MIN_ROPES && covered >= coverGoal) break;
        const best = nextAddition(score);
        if (!best) { if (++stuck > MAX_STUCK) break; continue; }
        stuck = 0; commit(best);
      }
    }
    // The next rope, knot or trap to add, or null if none fits.
    function nextAddition(score) {
      const n = b.n, budget = sMax - score, room = Math.max(1, (coverGoal - covered) / meanLen);
      const pace = ((sMin + sMax) / 2 - score) / room - cfg.bends, depth = cfg.wantAvg * (n + 1) - total0;
      const desire = cfg.tapDepth ?? Math.max(0, Math.min(budget, Math.round(Math.max(pace, depth))));
      survey();
      const fits = c => c && c.gain + c.bends <= budget && cfg.floor * (n + 1) + bendSum + c.bends <= sMax;
      return knotOrTrap(n, room, fits) || bestRope(n, budget, desire, sMin - score, fits);
    }
    // While the level still wants knots or traps, try for one first, spreading them over the build.
    // Places for them are scarce, so one that fits is taken. Whichever kind the level is shorter of
    // gets the first tries.
    function knotOrTrap(n, room, fits) {
      const wantKnots = cfg.tie - knots, wantTraps = cfg.bait - traps;
      if (n < 2 || wantKnots <= 0 && wantTraps <= 0 || !(rng() < 2 * (wantKnots + wantTraps) / room)) return null;
      const sp = knotSpots(occ, rest, W, H, mirrors, cfg.pull), knotFirst = wantKnots > 0 && (wantTraps <= 0 || knots <= traps);
      for (let k = 0; k < 2 * KNOT_TRIES; k++) {
        const isKnot = k < KNOT_TRIES ? knotFirst : !knotFirst;
        if ((isKnot ? wantKnots : wantTraps) <= 0) { k = k < KNOT_TRIES ? KNOT_TRIES - 1 : 2 * KNOT_TRIES; continue; }
        // A knot goes against another knot's resting place half the time, if there is one.
        const list = !isKnot ? sp.gapped : sp.chain.length && (rng() < 0.5 || !sp.tight.length) ? sp.chain : sp.tight;
        if (!list.length) continue;
        const spot = list[Math.floor(rng() * list.length)], c = isKnot ? knot(spot) : trap(spot);
        if (fits(c)) return c;
      }
      return null;
    }
    // The best of a few ropes for this step: closest to the wanted gain, preferring long lanes when
    // deep ropes are wanted, one that lands the score in its slot, and one that brings an idle
    // mirror into play (while any lies on no rope's way out, one try per step aims at it).
    function bestRope(n, budget, desire, need, fits) {
      const kinds = !n ? ['any'] : budget < 1 ? ['plain'] : desire >= 2 ? ['deep', 'deep', 'leaf', 'inner', 'deep', 'any', 'leaf', 'inner'] : desire >= 1 ? ['leaf', 'inner', 'any', 'leaf', 'inner', 'plain', 'any', 'leaf'] : ['inner', 'any', 'plain', 'inner', 'any', 'plain', 'inner', 'any'];
      const aim = mirrors.size > mirrorUsed.size && b.n >= 1;
      let best = null, bestMiss = Infinity;
      for (let k = 0; k < TRIES_PER_STEP; k++) {
        const c = candidate(aim && k === 0 ? 'mirror' : kinds[k % kinds.length], -1);
        if (!fits(c)) continue;
        const lands = need > 0 && c.gain + c.bends >= need && covered + c.path.length >= MIN_COVERAGE_SLIDE * N;
        const reaches = aim && c.lane.cells.some(cell => mirrors.has(cell) && !mirrorUsed.has(cell));
        const miss = Math.abs(c.gain - desire) + rng() * 0.6 - (desire >= 2 ? Math.min(c.lane.free, 4) * 0.2 : 0) - (lands ? 100 : 0) - (reaches ? 1.5 : 0);
        if (miss < bestMiss) { best = c; bestMiss = miss; }
      }
      return best;
    }
    // Pack the gaps: go round the cells still empty and fit a rope into each that will take one.
    function packGaps() {
      for (let sweep = 0; sweep < 2; sweep++) {
        const empty = [];
        for (let c = 0; c < N; c++) if (occ[c] === -1) empty.push(c);
        for (let i = empty.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = empty[i]; empty[i] = empty[j]; empty[j] = t; }
        for (const cell of empty) {
          if (cfg.ropeCount && b.n >= cfg.ropeCount) break;
          if (occ[cell] !== -1) continue;
          const n = b.n, budget = sMax - total0 - bendSum;
          for (let t = 0; t < 3; t++) {
            const c = candidate(budget < 1 ? 'plain' : 'any', cell);
            if (!c || c.gain + c.bends > budget || cfg.floor * (n + 1) + bendSum + c.bends > sMax) continue;
            commit(c); break;
          }
        }
      }
    }

    if (cfg.initialRopes?.length && !seedCore()) return null;
    layRopes();
    packGaps();
    const n = b.n;
    if (n < (cfg.ropeCount ? 2 : MIN_ROPES) || cfg.ropeCount && n !== cfg.ropeCount || !ib.replay(order, -1)) return null;
    return finished(cfg, W, H, mirrors, ib, total0 + bendSum);
  }
  // The finished level from a woven board that plays out: trimmed to its ropes (unless its
  // bounds are kept), checked, and measured. Null if it is too sparse or too loose.
  function finished(cfg, W, H, mirrors, ib, score) {
    const n = ib.b.n, paths = ib.paths, stops = ib.stops, costs = Array.from(ib.cost.subarray(0, n)), solution = ib.taps.slice();
    // Trim away empty outer rows and columns, and keep the board portrait.
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (const p of paths) for (const c of p) { if (c.x < x0) x0 = c.x; if (c.x > x1) x1 = c.x; if (c.y < y0) y0 = c.y; if (c.y > y1) y1 = c.y; }
    let w = x1 - x0 + 1, h = y1 - y0 + 1;
    const keep = cfg.keepBounds || mirrors.size > 0; // mirrors are fixed: never trim or turn their board
    if (keep) { x0 = 0; y0 = 0; w = W; h = H; }
    const tall = keep || h >= w;
    const ropes = paths.map(p => p.map(c => (tall ? { x: c.x - x0, y: c.y - y0 } : { x: c.y - y0, y: c.x - x0 })));
    if (!tall) { const t = w; w = h; h = t; }
    // Enough rope on the board and, beyond the narrowest boards, at least half the ropes blocked.
    const filled = ropes.reduce((a, p) => a + p.length, 0) / (w * h), blockedShare = costs.filter(c => c > 0).length / n;
    if (!cfg.ropeCount && (w <= SMALL_W ? filled < MIN_COVERAGE_SMALL : filled < MIN_COVERAGE_SLIDE || blockedShare < MIN_BLOCKED_SHARE)) return null;
    if (play(ropes, w, h, solution, mirrors).some(Boolean)) return null; // cannot happen; but never hand out a level without its solution
    // Count the knots that really are one (a rope meant to slide that starts in a loop), and the
    // slides open at the start that would leave ropes that can never get out.
    const looped = new Set([].concat(...loopsOf(ropes, w, h, mirrors))), fin = boardOf(ropes, w, h, mirrors);
    let tiedUp = 0, fatal = 0;
    for (let i = 0; i < n; i++) {
      if (stops[i].length && looped.has(i)) tiedUp++;
      const to = slideTo(fin, i);
      if (to > 0) { place(fin, i, to); if (relax(fin)) fatal++; place(fin, i, 0); }
    }
    return { W: w, H: h, ropes, costs, score, taps: solution, slides: solution.length - n, knots: tiedUp, traps: fatal, ...(cfg.initialRopes?.length ? { seededRopes: cfg.initialRopes.length, seededSlides: cfg.initialStops.reduce((sum, stops) => sum + stops.length, 0) } : {}) };
  }

  // Knots, and as many traps, a level is built with for its difficulty (fewer if the board will
  // not take them).
  const knotsWanted = d => (d < 12 ? 0 : Math.round(0.6 * Math.sqrt(d)));

  // Rope styles. Every level draws one at random, so some levels are made of short straight
  // ropes and others of long twisty ones. `straight` is the chance a growing rope carries
  // straight on instead of turning.
  const STYLES = [
    { name: 'short', minLen: 2, straight: 0.5, lenLo: 3, lenHi: () => 5, bends: 0.7 },
    { name: 'medium', minLen: 2, straight: 0.35, lenLo: 4, lenHi: () => 8, bends: 1.3 },
    { name: 'twisty', minLen: 3, straight: 0.2, lenLo: 6, lenHi: W => Math.max(8, W), bends: 2.4 },
  ];

  // A board has to earn its size: weave rejects boards with too much empty space, and boards
  // beyond the narrowest where most ropes can simply leave without waiting for anything.
  const MIN_ROPES = 3;
  const MIN_COVERAGE_SLIDE = 0.72;  // share of cells that must hold rope (the gaps ropes slide into are part of the puzzle)
  const MIN_COVERAGE_SMALL = 0.6;   // ... on the narrowest boards, where a few ropes leave little room
  const MIN_BLOCKED_SHARE = 0.5;    // share of ropes that must be blocked, on boards wider than SMALL_W
  const SMALL_W = 5;

  return { mulberry32, hashString, headDir, ray, selfBlocked, mirrorMap, rayCells, tracksOf, postponeExits, casualWins, occupancy, advance, blockersOf, loopsOf,
    deadRopes, frozenRopes, solve, fewestTaps, fewestPlayerTaps, playerTapCount, play, replay, free, bendsOf, weave, knotsWanted, STYLES };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = MFLevels;
