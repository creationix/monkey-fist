// Monkey Fist level generation. Pure logic, no DOM, so it can be unit tested on its own
// (see tests/). Everything here is deterministic: the same inputs give the same levels on
// every device, which is what makes a level set shareable by its code.
//
// There are two games on the same kind of board. In the original, a tapped rope leaves if its
// way out is clear and otherwise bumps and springs back. In the sliding game it slides forward
// until it meets something and stays there, which makes knots that only the right slide undoes.
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
  function selfBlocked(path) {
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
  function blockersOf(paths, W, H) {
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
  // Block cost of each rope in the original game: how many layers of other ropes must be cleared before it can go.
  // A free rope costs 0. A rope whose way is blocked costs 1 more than the deepest rope
  // blocking it, so a chain "A waits for B waits for C ... 7 deep" gives A a cost of 7.
  // Returns null if the ropes block each other in a loop (the level cannot be solved).
  function blockCosts(paths, W, H) {
    const a = analyse(paths, W, H);
    return a.stuck.length ? null : a.cost;
  }
  // One pass that answers everything about a board: each rope's block cost, which ropes can
  // never leave, and which of those are the actual knot.
  //
  // It is a topological sort of the "waits for" graph (Kahn's algorithm): release every rope
  // nothing is blocking, which may free the ropes waiting on it, and so on. A rope's cost is
  // 1 + the largest cost among its blockers, settled at the moment its last blocker is released.
  //
  // Cost: finding blockers walks one straight line per rope, so with R ropes on a W x H board
  // this is O(W*H + R * max(W, H)) time and memory, and each rope and each "waits for" link is
  // handled once. No rope is ever re-scanned, however deep the chains go.
  function analyse(paths, W, H) {
    const blk = blockersOf(paths, W, H), n = paths.length;
    const waiting = blk.map(b => b.length), waitedBy = paths.map(() => []);
    blk.forEach((bs, i) => { for (const b of bs) waitedBy[b].push(i); });
    const cost = new Array(n).fill(0), queue = [];
    for (let i = 0; i < n; i++) if (!waiting[i]) queue.push(i);
    for (let q = 0; q < queue.length; q++) {
      const b = queue[q];
      for (const i of waitedBy[b]) {
        if (cost[b] + 1 > cost[i]) cost[i] = cost[b] + 1;
        if (--waiting[i] === 0) queue.push(i);
      }
    }
    const stuck = [];
    for (let i = 0; i < n; i++) if (waiting[i] > 0) stuck.push(i);
    if (!stuck.length) return { cost, stuck, knot: stuck };
    // Stuck ropes are either part of a loop or merely waiting behind one. Peel away the ones
    // nothing stuck is waiting on, repeatedly; what remains is the knot itself.
    const isStuck = new Uint8Array(n), holds = new Int32Array(n), peel = [];
    for (const i of stuck) isStuck[i] = 1;
    for (const i of stuck) for (const b of blk[i]) if (isStuck[b] && b !== i) holds[b]++;
    const selfLoop = i => blk[i].includes(i);
    for (const i of stuck) if (!holds[i] && !selfLoop(i)) peel.push(i);
    for (let q = 0; q < peel.length; q++) {
      const i = peel[q]; isStuck[i] = 0;
      for (const b of blk[i]) if (isStuck[b] && --holds[b] === 0 && !selfLoop(b)) peel.push(b);
    }
    return { cost, stuck, knot: stuck.filter(i => isStuck[i]) };
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
  function loopsOf(paths, W, H) {
    return groupsOf(blockersOf(paths, W, H)).filter(g => g.length > 1).map(g => g.sort((x, y) => x - y));
  }
  // A board in compact form, for the analysis and the solver. A rope can only ever occupy the
  // cells of its own track: its body as first laid, then the straight line ahead of its head
  // to the edge. seq[i] is that track, len[i] the rope's length, and off[i] how far along it has
  // slid (so it sits on seq[i][off[i]] ... seq[i][off[i] + len[i] - 1]); off[i] is -1 once it has left.
  function boardOf(paths, W, H) {
    const n = paths.length, occ = new Int16Array(W * H).fill(-1), at = new Int16Array(W * H), seq = [], len = new Int16Array(n);
    paths.forEach((path, i) => {
      const h = path[path.length - 1], d = headDir(path), s = path.map(p => p.y * W + p.x);
      for (let x = h.x + d[0], y = h.y + d[1]; x >= 0 && y >= 0 && x < W && y < H; x += d[0], y += d[1]) s.push(y * W + x);
      seq.push(Int16Array.from(s)); len[i] = path.length;
      s.slice(0, path.length).forEach((c, j) => { occ[c] = i; at[c] = j; }); // at[cell]: where on its rope's track the cell is
    });
    return { n, left: n, occ, at, seq, len, off: new Int16Array(n), was: new Int16Array(n), now: new Int16Array(n) };
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
  function deadRopes(paths, W, H) {
    const b = boardOf(paths, W, H), dead = [];
    if (relax(b)) for (let i = 0; i < b.n; i++) if (b.now[i] !== GONE) dead.push(i);
    return dead;
  }
  // The ropes that can never move again, whatever is tapped. relax lets every rope get as far as
  // it ever could, each waiting on the others in turn, so a rope that gets nowhere even there is
  // truly fixed for good: it never names a rope that could still move. (It may miss one that is
  // fixed for a subtler reason.) A board with such a rope is lost, since that rope can never leave.
  // A lost board need not have one: ropes that can never leave can often still slide a little.
  function frozenRopes(paths, W, H) {
    const b = boardOf(paths, W, H), frozen = [];
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
  function solve(paths, W, H, budget, prefer) {
    const b = boardOf(paths, W, H), n = b.n, hopeless = new Set(), moves = [], limit = budget || 20000;
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
  function fewestTaps(paths, W, H, known, budget) {
    const b = boardOf(paths, W, H), n = b.n, limit = budget || 20000;
    // the slides in the known solution, and where each rope first comes in it
    const sim = boardOf(paths, W, H), rank = new Int32Array(n).fill(1e6);
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
  function playerTapCount(paths, W, H, taps) {
    const b = boardOf(paths, W, H);
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
  function fewestPlayerTaps(paths, W, H, known, budget) {
    const count = playerTapCount(paths, W, H, known);
    if (count === null) return null;
    const b = boardOf(paths, W, H), limit = budget || 6000, moves = [], tried = new Map();
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
  function play(paths, W, H, taps) {
    const b = boardOf(paths, W, H);
    for (const i of taps) if (b.off[i] >= 0) place(b, i, slideTo(b, i));
    return paths.map((p, i) => (b.off[i] < 0 ? null : advance(p, b.off[i])));
  }

  // How many corners a rope turns.
  function bendsOf(path) {
    let n = 0;
    for (let i = 2; i < path.length; i++) if (path[i].x - path[i - 1].x !== path[i - 1].x - path[i - 2].x || path[i].y - path[i - 1].y !== path[i - 1].y - path[i - 2].y) n++;
    return n;
  }
  // A rope's score is its block cost plus one for each bend in it: a rope that winds around
  // is harder to follow and to plan around than a straight one, whether or not it is blocked.
  // So the total only reaches 0 on an empty board (or one of straight, unblocked ropes);
  // "nothing is blocked" is a separate question, answered by nothingBlocked().
  function ropeScores(paths, costs) { return paths.map((p, i) => costs[i] + bendsOf(p)); }
  function nothingBlocked(paths, W, H) { const costs = blockCosts(paths, W, H); return !!costs && costs.every(c => c === 0); }
  const total = a => a.reduce((x, y) => x + y, 0);
  // A level's difficulty (its "tangle") is the sum of its ropes' scores.
  function difficulty(paths, W, H) {
    const costs = blockCosts(paths, W, H);
    return costs ? total(ropeScores(paths, costs)) : Infinity;
  }

  // ---------- shaping ropes ----------
  // Ways to shape a new rope on a board, shared by both builders. `occ` is the board (-1 where a
  // cell is empty); cfg gives the rope lengths and how straight they run.
  function shaper(occ, W, H, rng, cfg) {
    const N = W * H, xy = c => ({ x: c % W, y: c / W | 0 });
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
    const wayOut = (x, y, d) => {
      const cells = [], ids = [];
      let free = 0;
      for (x += d[0], y += d[1]; x >= 0 && y >= 0 && x < W && y < H; x += d[0], y += d[1]) {
        const c = y * W + x, o = occ[c];
        cells.push(c);
        if (o === -1) free++; else if (o >= 0 && !ids.includes(o)) ids.push(o);
      }
      return { cells, free, ids };
    };
    // Shape a rope that includes `start`. Usually head-first: point the head from `start` (longer
    // ways out favoured: they cross more of the board) and lay the body out behind it. Otherwise
    // walk a body through `start` and take whichever end has the longer way out.
    const shape = (start, straight) => {
      const s = xy(start);
      if (rng() < 0.75) {
        const opts = []; let sum = 0;
        for (let d = 0; d < 4; d++) {
          const bx = s.x - DIRS[d][0], by = s.y - DIRS[d][1]; // the body's first cell sits behind the head
          if (bx < 0 || by < 0 || bx >= W || by >= H || occ[by * W + bx] !== -1) continue;
          const lane = wayOut(s.x, s.y, DIRS[d]);
          opts.push({ d, lane, w: lane.cells.length + 1 }); sum += lane.cells.length + 1;
        }
        if (opts.length) {
          let r = rng() * sum, o = opts[opts.length - 1];
          for (const cand of opts) { r -= cand.w; if (r < 0) { o = cand; break; } }
          const cells = grow(start, (o.d + 2) % 4, straight), path = cells.map(xy).reverse();
          if (cells.length >= cfg.minLen && !selfBlocked(path)) return { cells, path, lane: o.lane };
        }
      }
      const cells = grow(start, -1, straight);
      if (cells.length < cfg.minLen) return null;
      const a = cells.map(xy), b = a.slice().reverse(), ok = [];
      for (const p of [a, b]) if (!selfBlocked(p)) { const h = p[p.length - 1]; ok.push({ cells, path: p, lane: wayOut(h.x, h.y, headDir(p)) }); }
      if (!ok.length) return null;
      return ok.length === 2 && (ok[1].lane.cells.length > ok[0].lane.cells.length || (ok[1].lane.cells.length === ok[0].lane.cells.length && rng() < 0.5)) ? ok[1] : ok[0];
    };
    return { xy, grow, wayOut, shape };
  }

  // ---------- building one level for the original game ----------
  // Ropes are added one at a time under a single rule:
  //
  //     a new rope must never close a loop.
  //
  // A new rope waits on whatever stands in its way out, and every rope whose way out it lies
  // across now waits on it. Before it is placed, the builder follows the chain down from the
  // ropes it would wait on; if that reaches any rope that would wait on it, the placement is
  // refused. So the "waits for" links can never form a loop, and the board is solvable by
  // construction with nothing to untangle afterwards.
  //
  // That lets the builder do two things on purpose. It can lay a rope across the way out of a
  // rope at the bottom of a long chain, making every rope up that chain one deeper. And it can
  // drop a rope into an enclosed pocket, where it simply waits on the ropes around it, which is
  // what lets a board be packed full.
  //
  // Stage one lays ropes. Each rope's effect on the score is known before it is placed, so the
  // builder steers: it paces the score to arrive in the slot [lo, hi) about when the board is
  // full, keeps the average block cost per rope up near `wantAvg`, never adds more than the slot
  // allows, and never adds a rope the depth floor could not afford. It then goes round the cells
  // still empty and packs a rope into each gap that will take one.
  //
  // Stage two runs only if the board is still short of its slot: it turns ropes around, keeping
  // a turn when the board stays solvable and the total block cost rises without overshooting.
  //
  // Finally any empty outer rows and columns are trimmed off.
  //
  // cfg: { W, H, lenLo, lenHi, straight, minLen, lo, hi, wantAvg, floor, cover, bends }
  // Returns { W, H, ropes, costs, score, taps }, or null if the board is no good. `score` is the
  // difficulty: no higher than the slot's top but possibly below its bottom (the caller decides
  // what to do with it). `taps` is a solution: the ropes in the order to tap them.
  // (slides, knots and traps are always 0 here; they belong to the sliding game, built by weave.)
  //
  // Cost, with R ropes. Stage one tries a bounded number of placements per rope (6 while laying,
  // 3 per empty cell while packing); trying one walks the rope, a few ways out (a board side
  // each), the chain below it for the loop check and the ropes whose cost it would raise, each
  // at most R ropes and their links. Stage two makes at most 4R tries, each one topological sort
  // over lists worked out once. All of it is a few thousand simple steps per level.
  const TRIES_PER_STEP = 6, MAX_STUCK = 4;
  function construct(rng, cfg) {
    const W = cfg.W, H = cfg.H, N = W * H;
    const occ = new Int16Array(N).fill(-1);
    const lanes = new Array(N);  // lanes[cell]: the ropes whose way out passes through this cell
    // waiters[i]: ropes waiting on rope i. waitsOn[i]: ropes it waits on. up[i]: roughly how long the chain above it is. laneFree[i]: empty cells left on its way out.
    const paths = [], laneCells = [], laneFree = [], waiters = [], waitsOn = [], up = [];
    let cost = [], costSum = 0, bendSum = 0, covered = 0;
    const sMin = Math.ceil(cfg.lo), sMax = Math.ceil(cfg.hi) - 1; // the whole-number scores inside the slot
    const meanLen = (cfg.lenLo + cfg.lenHi) / 2 * 0.85, coverGoal = cfg.cover * N;
    const { xy, wayOut, shape } = shaper(occ, W, H, rng, cfg);

    // Pick an existing rope to lay the next one across. 'deep' favours ropes at the bottom of
    // long chains, 'leaf' is any rope nothing is blocking yet, 'inner' is any rope already blocked.
    const pickParent = kind => {
      let sum = 0;
      const w = paths.map((_, i) => { // only ropes that still have room on their way out for another to be laid across it
        const v = !laneFree[i] ? 0 : kind === 'inner' ? (cost[i] > 0 ? 1 : 0) : cost[i] > 0 ? 0 : kind === 'deep' ? (up[i] + 1) * (up[i] + 1) : 1;
        sum += v; return v;
      });
      if (!sum) return -1;
      let r = rng() * sum;
      for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i; }
      return w.length - 1;
    };
    // Would the ropes in `above` end up waiting, down some chain, on themselves? `blockers` are
    // the ropes the new one would wait on; follow everything they wait on in turn.
    const mark = new Int32Array(N + 1); let stamp = 0;
    const closesLoop = (blockers, above) => {
      if (!blockers.length || !above.size) return false;
      stamp++;
      const stack = blockers.slice();
      for (const b of stack) mark[b] = stamp;
      while (stack.length) { const x = stack.pop(); for (const y of waitsOn[x]) if (mark[y] !== stamp) { mark[y] = stamp; stack.push(y); } }
      for (const u of above) if (mark[u] === stamp) return true;
      return false;
    };
    // One possible next rope, with what it would do to the score. Null if it does not fit.
    // 'plain' is a straight rope anywhere: the kind least likely to move the score.
    const candidate = (kind, at) => {
      let start = at >= 0 ? at : -1;
      const parent = start >= 0 || kind === 'any' || kind === 'plain' ? -1 : pickParent(kind);
      if (parent >= 0) { const free = laneCells[parent].filter(c => occ[c] === -1); if (free.length) start = free[Math.floor(rng() * free.length)]; }
      for (let t = 0; start < 0 && t < 6; t++) { const c = Math.floor(rng() * N); if (occ[c] === -1) start = c; }
      if (start < 0) return null;
      const c = shape(start, kind === 'plain' ? 1 : cfg.straight);
      if (!c) return null;
      // The ropes whose way out this one would lie across (they would wait on it), and the ropes
      // standing in its own way out (it would wait on them). It must not close a loop.
      const above = new Set(), blockers = c.lane.ids;
      for (const cell of c.cells) if (lanes[cell]) for (const id of lanes[cell]) above.add(id);
      if (closesLoop(blockers, above)) return null;
      // Its own block cost, then the rise it causes in the ropes above it, passed up their chains.
      let own = 0;
      for (const b of blockers) if (cost[b] + 1 > own) own = cost[b] + 1;
      const next = cost.slice(), queue = [];
      let gain = own;
      for (const i of above) if (next[i] < own + 1) { gain += own + 1 - next[i]; next[i] = own + 1; queue.push(i); }
      for (let q = 0; q < queue.length; q++) {
        const i = queue[q];
        for (const j of waiters[i]) if (next[j] < next[i] + 1) { gain += next[i] + 1 - next[j]; next[j] = next[i] + 1; queue.push(j); }
      }
      return { path: c.path, lane: c.lane, cells: c.cells, above, blockers, own, next, gain, bends: bendsOf(c.path) };
    };
    const commit = c => {
      const id = paths.length;
      paths.push(c.path);
      for (const cell of c.cells) { occ[cell] = id; if (lanes[cell]) for (const i of lanes[cell]) laneFree[i]--; }
      covered += c.cells.length;
      cost = c.next; cost.push(c.own); costSum += c.gain; bendSum += c.bends;
      waitsOn.push(c.blockers); for (const b of c.blockers) waiters[b].push(id);
      waiters.push([...c.above]); for (const u of c.above) waitsOn[u].push(id); // the ropes it lies across now wait on it
      let u = 0; for (const i of c.above) if (up[i] + 1 > u) u = up[i] + 1;
      up.push(u);
      laneCells.push(c.lane.cells); laneFree.push(c.lane.free);
      for (const cell of c.lane.cells) if (occ[cell] === -1) (lanes[cell] || (lanes[cell] = [])).push(id);
    };

    let stuck = 0;
    for (let guard = 0; guard < 2 * N; guard++) {
      const n = paths.length, score = costSum + bendSum;
      if (score >= sMin && n >= MIN_ROPES && covered >= coverGoal) break;
      const budget = sMax - score; // the most this step may add
      // How much block cost should the next rope add? Two pulls, and the larger wins:
      //   pace  - spread what is still missing over the ropes there is still room for, so the
      //           score arrives in its slot about when the board is as full as planned;
      //   depth - keep the average block cost per rope up at `wantAvg`.
      const room = Math.max(1, (coverGoal - covered) / meanLen);
      const pace = ((sMin + sMax) / 2 - score) / room - cfg.bends, depth = cfg.wantAvg * (n + 1) - costSum;
      const desire = Math.max(0, Math.min(budget, Math.round(Math.max(pace, depth))));
      // What to try this step. Deep placements when the level needs depth, shallower ones as it
      // nears its slot (where a deep one would overshoot), and plain straight ropes when the score
      // must not move at all.
      const need = sMin - score;
      const kinds = !n ? ['any'] : budget < 1 ? ['plain'] : desire >= 2 ? ['deep', 'deep', 'leaf', 'inner', 'deep', 'any', 'leaf', 'inner'] : desire >= 1 ? ['leaf', 'inner', 'any', 'leaf', 'inner', 'plain', 'any', 'leaf'] : ['inner', 'any', 'plain', 'inner', 'any', 'plain', 'inner', 'any'];
      let best = null, bestMiss = Infinity;
      for (let k = 0; k < TRIES_PER_STEP; k++) {
        const c = candidate(kinds[k % kinds.length]);
        if (!c || c.gain + c.bends > budget) continue;
        // Never add a rope the depth floor cannot afford: with one more rope and its bends, the slot's
        // top score must still be able to cover the minimum average block cost for every rope.
        if (cfg.floor * (n + 1) + bendSum + c.bends > sMax) continue;
        // Closest to the cost wanted, with a little noise so equal choices vary. While the level still
        // needs to get deeper, favour ropes with a long way out: they leave room to extend the chain.
        // A rope that drops the score into its slot once the board is full enough beats any other.
        const lands = need > 0 && c.gain + c.bends >= need && covered + c.cells.length >= MIN_COVERAGE * N;
        const miss = Math.abs(c.gain - desire) + rng() * 0.6 - (desire >= 2 ? Math.min(c.lane.free, 4) * 0.2 : 0) - (lands ? 100 : 0);
        if (miss < bestMiss) { best = c; bestMiss = miss; }
      }
      if (!best) { if (++stuck > MAX_STUCK) break; continue; }
      stuck = 0; commit(best);
    }
    // Pack the gaps. Go round the cells still empty, in random order, and fit a rope into each
    // gap that will take one, under the same rules as before: a clear way out, no more score
    // than the slot allows, and no more ropes than the depth floor can afford. Two sweeps, three
    // tries per empty cell.
    for (let sweep = 0; sweep < 2; sweep++) {
      const empty = [];
      for (let c = 0; c < N; c++) if (occ[c] === -1) empty.push(c);
      for (let i = empty.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = empty[i]; empty[i] = empty[j]; empty[j] = t; }
      for (const cell of empty) {
        if (occ[cell] !== -1) continue;
        const n = paths.length, budget = sMax - costSum - bendSum;
        for (let t = 0; t < 3; t++) {
          const c = candidate(budget < 1 ? 'plain' : 'any', cell);
          if (!c || c.gain + c.bends > budget || cfg.floor * (n + 1) + bendSum + c.bends > sMax) continue;
          commit(c); break;
        }
      }
    }
    // Second stage, if the board filled up before the score reached its slot: turn ropes around.
    // Take them in random order and keep a turn only if the board is still solvable and the total
    // block cost rose without overshooting the slot. Turning a rope never changes its bends, so
    // only block cost moves.
    //
    // Turning a rope does not change which cells are occupied, so what every rope would wait on,
    // facing either way, can be worked out once up front. Each try is then just a topological sort
    // over those lists: O(R + links), with no walking of the board. At most four sweeps of R tries.
    if (costSum + bendSum < sMin) {
      const n = paths.length;
      const facing = path => { // the ropes standing in this path's way out; null if its own body is
        const h = path[path.length - 1], d = headDir(path), ids = [], me = occ[h.y * W + h.x];
        for (let x = h.x + d[0], y = h.y + d[1]; x >= 0 && y >= 0 && x < W && y < H; x += d[0], y += d[1]) {
          const o = occ[y * W + x];
          if (o === me) return null;
          if (o !== -1 && !ids.includes(o)) ids.push(o);
        }
        return ids;
      };
      const now = paths.map(facing), turned = paths.map(p => facing(p.slice().reverse())), flipped = new Uint8Array(n);
      const waiting = new Int16Array(n), by = paths.map(() => []), queue = new Int16Array(n);
      let trial = new Array(n);
      const evaluate = () => { // total block cost with the current lists, or -1 if they loop
        for (let i = 0; i < n; i++) { by[i].length = 0; trial[i] = 0; }
        for (let i = 0; i < n; i++) { waiting[i] = now[i].length; for (const b of now[i]) by[b].push(i); }
        let head = 0, tail = 0, sum = 0;
        for (let i = 0; i < n; i++) if (!waiting[i]) queue[tail++] = i;
        while (head < tail) {
          const b = queue[head++]; sum += trial[b];
          for (const i of by[b]) { if (trial[b] + 1 > trial[i]) trial[i] = trial[b] + 1; if (--waiting[i] === 0) queue[tail++] = i; }
        }
        return tail === n ? sum : -1;
      };
      for (let sweep = 0; sweep < 4 && costSum + bendSum < sMin; sweep++) {
        const order = paths.map((_, i) => i);
        for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
        let improved = false;
        for (const i of order) {
          if (costSum + bendSum >= sMin) break;
          if (!turned[i]) continue;
          const keep = now[i]; now[i] = turned[i]; turned[i] = keep;
          const s = evaluate();
          if (s > costSum && s + bendSum <= sMax) { costSum = s; const t = cost; cost = trial; trial = t.length === n ? t : new Array(n); flipped[i] ^= 1; improved = true; }
          else { turned[i] = now[i]; now[i] = keep; }
        }
        if (!improved) break;
      }
      for (let i = 0; i < n; i++) if (flipped[i]) paths[i] = paths[i].slice().reverse();
    }
    const n = paths.length;
    if (n < MIN_ROPES) return null;
    // Trim away empty outer rows and columns. Nothing depends on them (a way out that crossed
    // empty cells still crosses the same ropes), and it stops a level sitting in a half-empty board.
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (const p of paths) for (const c of p) { if (c.x < x0) x0 = c.x; if (c.x > x1) x1 = c.x; if (c.y < y0) y0 = c.y; if (c.y > y1) y1 = c.y; }
    let w = x1 - x0 + 1, h = y1 - y0 + 1;
    const tall = h >= w; // keep boards portrait: if trimming left it wider than tall, turn it on its side
    const ropes = paths.map(p => p.map(c => (tall ? { x: c.x - x0, y: c.y - y0 } : { x: c.y - y0, y: c.x - x0 })));
    if (!tall) { const t = w; w = h; h = t; }
    if (!goodEnough(ropes, w, h, cost)) return null;
    const taps = paths.map((_, i) => i).sort((a, b) => cost[a] - cost[b] || a - b); // in order of block cost, nothing is ever in the way
    return { W: w, H: h, ropes, costs: cost, score: costSum + bendSum, taps, slides: 0, knots: 0, traps: 0 };
  }

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
  // to everything waiting behind it. Difficulty is the sum of block costs plus bends, as before,
  // so each candidate's effect on the score is known exactly and the builder steers by it, just
  // as the original builder does.
  //
  // cfg: as for construct, plus tie (knots wanted), bait (traps wanted) and pull (longest slide).
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
  function weave(rng, cfg) {
    const W = cfg.W, H = cfg.H, N = W * H, KEPT = -3;
    const occ = new Int16Array(N).fill(-1); // the board as the level starts; KEPT marks a cell held empty in front of a trap
    const { xy, wayOut, shape } = shaper(occ, W, H, rng, cfg);
    const paths = [], stops = [];           // per rope: where it starts, and the offsets it is meant to slide to before leaving
    let order = [];                         // the ropes in the order the last replay first tapped them: the order to try them in next time
    // The board the replay runs on (see boardOf), able to take one more rope at a time.
    const b = { n: 0, left: 0, occ: new Int16Array(N), at: new Int16Array(N), seq: [], len: new Int16Array(N), off: new Int16Array(N), was: new Int16Array(N), now: new Int16Array(N) };
    const add = (path, st) => {
      const h = path[path.length - 1], d = headDir(path), q = path.map(c => c.y * W + c.x);
      for (let x = h.x + d[0], y = h.y + d[1]; x >= 0 && y >= 0 && x < W && y < H; x += d[0], y += d[1]) q.push(y * W + x);
      b.seq[b.n] = Int16Array.from(q); b.len[b.n] = path.length; paths[b.n] = path; stops[b.n] = st;
      return b.n++;
    };
    const drop = () => { b.n--; b.seq.length = paths.length = stops.length = b.n; };
    const setUp = () => { b.occ.fill(-1); b.left = 0; for (let i = 0; i < b.n; i++) { b.off[i] = -1; place(b, i, 0); } };
    // What the last replay found: each rope's block cost, the rope its last wait was for, the taps, and the total.
    const cost = new Int16Array(N), dep = new Int16Array(N), cellAt = new Int16Array(N), ropeAt = new Int16Array(N), cellBy = new Int16Array(N), done = new Uint8Array(N);
    let taps = [], costSum = 0;
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
      ropeAt[i] = lay; taps.push(i);
      if (to < 0) { cost[i] = lay; dep[i] = by; costSum += lay; } else done[i]++;
      return true;
    };
    // Play the board out. `list` is the order to try the ropes in; `fresh`, if given, is a rope
    // just added, which is tried again after every tap so that it goes as early as it can.
    const replay = (list, fresh) => {
      setUp();
      cellAt.fill(-1); ropeAt.fill(-1, 0, b.n); done.fill(0, 0, b.n);
      taps = []; costSum = 0;
      for (let moved = true; moved && b.left;) {
        moved = false;
        for (const i of list) {
          if (b.off[i] >= 0 && tap(i)) { moved = true; while (fresh >= 0 && b.off[fresh] >= 0 && tap(fresh)); }
        }
      }
      return b.left === 0;
    };
    // The total block cost if this rope were added, or -1 if the board would no longer play out.
    const trial = (path, st) => {
      const id = add(path, st), ok = replay([id].concat(order), id), sum = costSum;
      drop();
      return ok ? sum : -1;
    };
    let total0 = 0, bendSum = 0, covered = 0, knots = 0, traps = 0; // total0: the block cost total of the board as it stands
    const commit = c => {
      const id = add(c.first || c.path, c.first ? [c.pull] : NO_STOPS);
      replay([id].concat(order), id);
      total0 = costSum;
      order = []; for (const i of taps) if (!order.includes(i)) order.push(i);
      for (const p of paths[id]) occ[p.y * W + p.x] = id;
      covered += paths[id].length; bendSum += c.bends;
      if (c.first) { knots++; for (const cell of c.rest) rest[cell] = id; }
      if (c.gap) { traps++; for (const cell of c.gap) occ[cell] = KEPT; }
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
    const candidate = (kind, at) => {
      let start = at >= 0 ? at : -1;
      const parent = start >= 0 || kind === 'any' || kind === 'plain' ? -1 : pickParent(kind);
      if (parent >= 0) start = ahead[parent][Math.floor(rng() * ahead[parent].length)];
      for (let t = 0; start < 0 && t < 6; t++) { const c = Math.floor(rng() * N); if (occ[c] === -1) start = c; }
      if (start < 0) return null;
      const c = shape(start, kind === 'plain' ? 1 : cfg.straight);
      if (!c) return null;
      const sum = trial(c.path, NO_STOPS);
      if (sum < 0) return null;
      return { path: c.path, lane: c.lane, gain: sum - total0, bends: bendsOf(c.path) };
    };

    // Knots and traps. spots() lists where either could go: an empty cell for the head and a
    // direction, with something to stop against directly ahead (and how much straight room there
    // is behind), or a rope a gap ahead. `tight` spots are against a rope that is there now;
    // `chain` spots are against the place another knot will come to rest, so that the two have to
    // be slid in the right order; `gapped` spots have a rope a short gap ahead.
    const rest = new Int16Array(N).fill(-1); // rest[cell]: the knot that will come to rest on this cell, which is empty for now
    const spots = () => {
      const tight = [], chain = [], gapped = [];
      for (let c = 0; c < N; c++) {
        if (occ[c] !== -1) continue;
        const x = c % W, y = c / W | 0;
        for (let di = 0; di < 4; di++) {
          const d = DIRS[di], ax = x + d[0], ay = y + d[1];
          if (ax < 0 || ay < 0 || ax >= W || ay >= H) continue;
          const o = occ[ay * W + ax], against = o === -1 ? rest[ay * W + ax] : -1;
          if (o >= 0 || against >= 0) {
            let room = 0, bx = x - d[0], by = y - d[1];
            while (room <= cfg.pull && bx >= 0 && by >= 0 && bx < W && by < H && occ[by * W + bx] === -1) { room++; bx -= d[0]; by -= d[1]; }
            if (room >= 2) (o >= 0 ? tight : chain).push({ c, di, room, against });
            continue;
          }
          let gap = 0, nx = ax, ny = ay;
          while (gap <= cfg.pull && nx >= 0 && ny >= 0 && nx < W && ny < H && occ[ny * W + nx] === -1) { gap++; nx += d[0]; ny += d[1]; }
          if (gap && gap <= cfg.pull && nx >= 0 && ny >= 0 && nx < W && ny < H && occ[ny * W + nx] >= 0) gapped.push({ c, di, gap });
        }
      }
      return { tight, chain, gapped };
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
      occ[spot.c] = -2;
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
        occ[nc] = -2;
        if (body) cells.push(nc); else { tail.push(nc); if (tied(nc)) got = true; }
      }
      for (const c of cells) occ[c] = -1;
      for (const c of tail) occ[c] = -1;
      if (cells.length < Math.max(cfg.minLen, k + 2) || selfBlocked(cells.map(xy).reverse())) return null;
      if (k && (tail.length < k || !got || selfBlocked(cells.slice(k).concat(tail).map(xy).reverse()))) return null;
      return { cells, tail };
    };
    // A knot at a spot where there is something to stop against: shaped in the place it slides
    // to, and starting k cells back.
    const knot = spot => {
      const lane = wayOut(spot.c % W, spot.c / W | 0, DIRS[spot.di]);
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
      const lane = wayOut(spot.c % W, spot.c / W | 0, DIRS[spot.di]), gap = lane.cells.slice(0, spot.gap);
      below(lane.ids);
      if (tied(spot.c) || !gap.some(tied)) return null;
      const w = walk(spot, 0);
      if (!w) return null;
      const path = w.cells.map(xy).reverse(), sum = trial(path, NO_STOPS);
      if (sum < 0) return null;
      const id = add(path, NO_STOPS);
      setUp(); place(b, id, spot.gap);
      const dead = relax(b);
      drop();
      return dead ? { path, gap, gain: sum - total0, bends: bendsOf(path) } : null;
    };
    const sMin = Math.ceil(cfg.lo), sMax = Math.ceil(cfg.hi) - 1; // the whole-number scores inside the slot
    const meanLen = (cfg.lenLo + cfg.lenHi) / 2 * 0.85, coverGoal = cfg.cover * N;
    // Lay ropes, steering exactly as the original builder does: pace the score to arrive in its
    // slot about when the board is full, keep the average block cost up near wantAvg, never add
    // more than the slot allows, never add a rope the depth floor could not afford.
    let stuck = 0;
    for (let guard = 0; guard < 2 * N; guard++) {
      const n = b.n, score = total0 + bendSum;
      if (cfg.ropeCount && n >= cfg.ropeCount) break;
      if (!cfg.ropeCount && score >= sMin && n >= MIN_ROPES && covered >= coverGoal) break;
      const budget = sMax - score;
      const room = Math.max(1, (coverGoal - covered) / meanLen);
      const pace = ((sMin + sMax) / 2 - score) / room - cfg.bends, depth = cfg.wantAvg * (n + 1) - total0;
      const desire = cfg.tapDepth ?? Math.max(0, Math.min(budget, Math.round(Math.max(pace, depth))));
      const need = sMin - score;
      const kinds = !n ? ['any'] : budget < 1 ? ['plain'] : desire >= 2 ? ['deep', 'deep', 'leaf', 'inner', 'deep', 'any', 'leaf', 'inner'] : desire >= 1 ? ['leaf', 'inner', 'any', 'leaf', 'inner', 'plain', 'any', 'leaf'] : ['inner', 'any', 'plain', 'inner', 'any', 'plain', 'inner', 'any'];
      survey();
      const fits = c => c && c.gain + c.bends <= budget && cfg.floor * (n + 1) + bendSum + c.bends <= sMax;
      let best = null, bestMiss = Infinity;
      // While the level still wants knots or traps, try for one first, spreading them over the build.
      // Places for them are scarce, so one that fits is taken. Whichever kind the level is shorter of
      // gets the first tries.
      const wantKnots = cfg.tie - knots, wantTraps = cfg.bait - traps;
      if (n >= 2 && (wantKnots > 0 || wantTraps > 0) && rng() < 2 * (wantKnots + wantTraps) / room) {
        const sp = spots(), knotFirst = wantKnots > 0 && (wantTraps <= 0 || knots <= traps);
        for (let k = 0; k < 2 * KNOT_TRIES && !best; k++) {
          const isKnot = k < KNOT_TRIES ? knotFirst : !knotFirst;
          if ((isKnot ? wantKnots : wantTraps) <= 0) { k = k < KNOT_TRIES ? KNOT_TRIES - 1 : 2 * KNOT_TRIES; continue; }
          // A knot goes against another knot's resting place half the time, if there is one.
          const list = !isKnot ? sp.gapped : sp.chain.length && (rng() < 0.5 || !sp.tight.length) ? sp.chain : sp.tight;
          if (!list.length) continue;
          const spot = list[Math.floor(rng() * list.length)], c = isKnot ? knot(spot) : trap(spot);
          if (fits(c)) best = c;
        }
      }
      for (let k = best ? TRIES_PER_STEP : 0; k < TRIES_PER_STEP; k++) {
        const c = candidate(kinds[k % kinds.length], -1);
        if (!fits(c)) continue;
        const lands = need > 0 && c.gain + c.bends >= need && covered + c.path.length >= MIN_COVERAGE_SLIDE * N;
        const miss = Math.abs(c.gain - desire) + rng() * 0.6 - (desire >= 2 ? Math.min(c.lane.free, 4) * 0.2 : 0) - (lands ? 100 : 0);
        if (miss < bestMiss) { best = c; bestMiss = miss; }
      }
      if (!best) { if (++stuck > MAX_STUCK) break; continue; }
      stuck = 0; commit(best);
    }
    // Pack the gaps: go round the cells still empty and fit a rope into each that will take one.
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
    const n = b.n;
    if (n < (cfg.ropeCount ? 2 : MIN_ROPES) || cfg.ropeCount && n !== cfg.ropeCount || !replay(order, -1)) return null;
    const costs = Array.from(cost.subarray(0, n)), solution = taps.slice();
    // Trim away empty outer rows and columns, and keep the board portrait (see construct).
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (const p of paths) for (const c of p) { if (c.x < x0) x0 = c.x; if (c.x > x1) x1 = c.x; if (c.y < y0) y0 = c.y; if (c.y > y1) y1 = c.y; }
    let w = x1 - x0 + 1, h = y1 - y0 + 1;
    const tall = h >= w;
    const ropes = paths.map(p => p.map(c => (tall ? { x: c.x - x0, y: c.y - y0 } : { x: c.y - y0, y: c.x - x0 })));
    if (!tall) { const t = w; w = h; h = t; }
    if (!cfg.ropeCount && !goodEnough(ropes, w, h, costs, true)) return null;
    if (play(ropes, w, h, solution).some(Boolean)) return null; // cannot happen; but never hand out a level without its solution
    // Count the knots that really are one (a rope meant to slide that starts in a loop), and the
    // slides open at the start that would leave ropes that can never get out.
    const looped = new Set([].concat(...loopsOf(ropes, w, h))), fin = boardOf(ropes, w, h);
    let tiedUp = 0, fatal = 0;
    for (let i = 0; i < n; i++) {
      if (stops[i].length && looped.has(i)) tiedUp++;
      const to = slideTo(fin, i);
      if (to > 0) { place(fin, i, to); if (relax(fin)) fatal++; place(fin, i, 0); }
    }
    return { W: w, H: h, ropes, costs, score: total0 + bendSum, taps: solution, slides: solution.length - n, knots: tiedUp, traps: fatal };
  }
  // Each rope's block cost in a sliding level, given a solution: the layer of the tap that takes
  // it off the board (see weave). Null if the taps do not clear the board.
  function solutionCosts(paths, W, H, taps) {
    const b = boardOf(paths, W, H), cost = new Array(b.n).fill(0), cellAt = new Int16Array(W * H).fill(-1), ropeAt = new Int16Array(b.n).fill(-1);
    for (const i of taps) {
      if (b.off[i] < 0) continue;
      const q = b.seq[i], L = b.len[i], from = b.off[i];
      let p = from + L, lay = ropeAt[i];
      while (p < q.length && b.occ[q[p]] === -1) { if (cellAt[q[p]] > lay) lay = cellAt[q[p]]; p++; }
      const to = p === q.length ? -1 : p - L;
      if (to === from) continue;
      if (to >= 0 && ropeAt[b.occ[q[p]]] > lay) lay = ropeAt[b.occ[q[p]]];
      lay++;
      for (let c = from, end = to < 0 ? from + L : Math.min(from + L, to); c < end; c++) cellAt[q[c]] = lay;
      place(b, i, to); ropeAt[i] = lay;
      if (to < 0) cost[i] = lay;
    }
    return b.left ? null : cost;
  }

  // ---------- level sets ----------
  // Every difficulty setting is a difficulty range, and a set fills its range evenly.
  // (Difficulty = the sum of the ropes' scores, as above: block cost plus bends for every rope.)
  // Extreme runs right up to what a packed 12x16 board can reach.
  const MODES = {
    E: { name: 'Easy', range: [2, 40] },
    N: { name: 'Normal', range: [20, 80] },
    H: { name: 'Hard', range: [60, 150] },
    X: { name: 'Extreme', range: [150, 500] },
    C: { name: 'Built-in', range: [1, 300], ease: true }, // the built-in levels: a long span, starting gently
  };
  const PLAYER_MODES = ['E', 'N', 'H', 'X'];
  const COUNTS = [10, 20, 30];
  const SET_MODES = ['C', ...PLAYER_MODES, 'T'];
  const SET_COUNTS = [...COUNTS, 60, 120];
  // Keep the teaching pace consistent when a Progressive set has a different length.
  const progressiveStage = (index, count) => Math.floor(index * 60 / count);
  // With bigger boards allowed there is room for far more rope, so the top of every range doubles.
  const rangeFor = (mode, big) => { const r = MODES[mode].range; return big ? [r[0], r[1] * 2] : r; };

  // The depth floor: the least a level's average block cost per rope may be. It rises with
  // difficulty, so the more tangled a level is meant to be, the deeper its chains must run, and
  // a high score cannot be made from a crowd of ropes that barely block each other.
  // Each entry is [from this difficulty, minimum average block cost per rope].
  const FLOORS = [[400, 8], [250, 6.5], [150, 5], [100, 4], [60, 3], [40, 2.5], [20, 2], [10, 1.5]];
  const floorFor = d => { for (const f of FLOORS) if (d >= f[0]) return f[1]; return 0; };

  // The sliding game's knots. A level is built with about as many knots, and as many traps, as
  // knotsWanted says for its difficulty (fewer if the board will not take them), and must have
  // at least the knot floor: [from this difficulty, fewest knots].
  const knotsWanted = d => (d < 12 ? 0 : Math.round(0.6 * Math.sqrt(d)));
  const KNOT_FLOORS = [[250, 5], [150, 4], [80, 3], [40, 2], [15, 1]];
  const knotFloorFor = d => { for (const f of KNOT_FLOORS) if (d >= f[0]) return f[1]; return 0; };

  // Rope styles. Every level draws one at random, so within any set some levels are made of
  // short straight ropes and others of long twisty ones. `straight` is the chance a growing
  // rope carries straight on instead of turning.
  //
  // `full` and `ropes` are measurements used to choose a board: for boards 4 to 16 wide, the
  // difficulty a packed board of this style typically reaches when built as deep as it will go,
  // and how many ropes it holds. They only steer the choice, so they need not be exact.
  const STYLES = [
    { name: 'short', share: 0.4, minLen: 2, straight: 0.5, lenLo: 3, lenHi: () => 5, bends: 0.7,
      full: [16, 41, 56, 94, 159, 200, 353, 433, 574, 737, 1062, 1330, 1658], ropes: [6, 10, 13, 17, 20, 25, 32, 38, 44, 54, 61, 70, 80] },
    { name: 'medium', share: 0.33, minLen: 2, straight: 0.35, lenLo: 4, lenHi: () => 8, bends: 1.3,
      full: [12, 28, 47, 76, 111, 142, 216, 309, 379, 544, 619, 782, 1083], ropes: [4, 8, 10, 13, 15, 18, 23, 29, 33, 41, 46, 52, 61] },
    { name: 'twisty', share: 0.27, minLen: 3, straight: 0.2, lenLo: 6, lenHi: W => Math.max(8, W), bends: 2.4,
      full: [0, 0, 0, 52, 90, 120, 183, 231, 285, 368, 418, 520, 638], ropes: [1, 1, 1, 10, 13, 16, 20, 23, 26, 30, 33, 37, 42] },
  ];
  const TWISTY_W = 7; // long twisty ropes need a board at least this wide

  // Board sizes. `big` sets may use the larger ones.
  const WIDTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12];
  const BIG_WIDTHS = WIDTHS.concat([13, 14, 15, 16]);
  const heightFor = W => Math.min(22, Math.round(W * 1.35)); // 4x5 ... 12x16 ... 16x22

  // A board has to earn its size. Reject boards with too much empty space, and boards beyond
  // the smallest sizes where most ropes can simply leave without waiting for anything.
  const MIN_ROPES = 3;
  const MIN_COVERAGE = 0.78;        // share of cells that must hold rope
  const MIN_COVERAGE_SLIDE = 0.72;  // ... in the sliding game, where the gaps ropes slide into are part of the puzzle
  const MIN_COVERAGE_SMALL = 0.6;   // ... on the smallest boards, where a few ropes leave little room
  const MIN_BLOCKED_SHARE = 0.5;    // share of ropes that must be blocked, on boards 6 wide and up
  const SMALL_W = 5;                // boards this narrow may be simple and loose (they are the gentle start)
  function quality(ropes, W, H, knownCosts) {
    const costs = knownCosts || blockCosts(ropes, W, H) || [];
    const cells = ropes.reduce((a, p) => a + p.length, 0);
    return { coverage: cells / (W * H), blockedShare: ropes.length ? costs.filter(c => c > 0).length / ropes.length : 0 };
  }
  function goodEnough(ropes, W, H, knownCosts, slide) {
    if (ropes.length < MIN_ROPES) return false;
    const q = quality(ropes, W, H, knownCosts);
    return W <= SMALL_W ? q.coverage >= MIN_COVERAGE_SMALL : q.coverage >= (slide ? MIN_COVERAGE_SLIDE : MIN_COVERAGE) && q.blockedShare >= MIN_BLOCKED_SHARE;
  }

  // The slots a mode's range is cut into for `n` levels: slot j covers [edges[j], edges[j+1]).
  // Equal slices, except that the built-in set bunches its slots toward the easy end.
  function slotEdges(mode, n, big) {
    const r = rangeFor(mode, big), lo = r[0], width = r[1] - lo + 1, edges = [];
    for (let j = 0; j <= n; j++) { const t = j / n; edges.push(lo + width * (MODES[mode].ease ? (t + t * t) / 2 : t)); }
    return edges;
  }

  // Decide what kind of level to build for one slot: a rope style, and the smallest board that
  // style can pack full and still reach the slot's difficulty. `attempt` nudges the size on retries.
  const SIZE_NUDGE = [0, 0, 1, -1, 0, 1, 2, -1];
  function plan(rng, lo, hi, big, attempt, slide) {
    const target = (lo + hi) / 2, floor = floorFor(Math.ceil(hi) - 1);
    const widths = big ? BIG_WIDTHS : WIDTHS, top = widths[widths.length - 1];
    const u = rng();
    let s = u < STYLES[0].share ? 0 : u < STYLES[0].share + STYLES[1].share ? 1 : 2;
    if (s === 2 && target < 40) s = 1;                               // too small a puzzle for long twisty ropes
    while (s > 0 && STYLES[s].full[top - 4] < target * 1.05) s--;    // this style cannot get that tangled even on the largest board
    const st = STYLES[s], reach = target * (1 + rng() * 0.25);       // a little headroom, so it need not be built flat out
    let i = widths.findIndex(w => st.full[w - 4] >= reach); if (i < 0) i = widths.length - 1;
    const W = widths[Math.max(s === 2 ? widths.indexOf(TWISTY_W) : 0, Math.min(widths.length - 1, i + SIZE_NUDGE[attempt % SIZE_NUDGE.length]))];
    // How deep to build: about what it takes to reach the target with this board packed full.
    const wantAvg = Math.max(floor, target / st.ropes[W - 4] - st.bends);
    return { W, H: heightFor(W), lenLo: st.lenLo, lenHi: Math.max(st.lenLo, st.lenHi(W)), straight: st.straight, minLen: Math.max(st.minLen, W >= 8 ? 3 : 2), // no two-cell stubs on the larger boards
      lo, hi, wantAvg, floor, cover: 0.88 + rng() * 0.08, bends: st.bends, style: st.name, seed: Math.floor(rng() * 4294967296) >>> 0,
      slide: !!slide, tie: slide ? knotsWanted(target) : 0, bait: slide ? knotsWanted(target) : 0, pull: 3 };
  }

  // The algorithm, for a seed, a difficulty setting, a number of levels and a game (original or sliding):
  //   1. Cut the setting's difficulty range into one slot per level. One level per slot means
  //      the set is spread evenly over the range and no two levels can share a difficulty.
  //   2. Aim at the empty slots in turn: plan a level for that slot (rope style and board size)
  //      and build it, packed full, to land there (see construct).
  //   3. The level takes whichever empty slot its score falls in, provided it meets that
  //      difficulty's depth floor (and, in the sliding game, its knot floor). Usually that is the
  //      slot aimed at; a build that comes up short can still fill an easier one. Otherwise it is discarded.
  //   4. Stop when every slot is filled. Slots run from easiest to hardest, so the set comes out
  //      already sorted.
  // The work is bounded: at most count*60 builds, and it gives up if 600 builds in a row fill
  // nothing (the set then has fewer levels than asked for).
  // opts: { seed: string, mode: 'E'|'N'|'H'|'X', count: number, big: boolean, slide: boolean }
  function generateSet(opts) {
    const mode = MODES[opts.mode] ? opts.mode : 'N', seed = cleanSeed(opts.seed), big = !!opts.big, slide = !!opts.slide, range = rangeFor(mode, big);
    const count = Math.max(1, opts.count | 0), n = Math.min(count, range[1] - range[0] + 1);
    const rng = mulberry32(hashString('monkey-fist/9|' + mode + (big ? 'B' : '') + (slide ? 'S2|' : '|') + seed));
    const edges = slotEdges(mode, n, big), slots = new Array(n).fill(null);
    const slotOf = score => { let j = 0; while (j < n - 1 && score >= edges[j + 1]) j++; return j; };
    const maxBuilds = count * 60, maxStall = 600;
    let filled = 0, builds = 0, stall = 0, next = 0;
    while (filled < n && builds < maxBuilds && stall < maxStall) {
      builds++; stall++;
      while (slots[next % n]) next++;
      const aim = next++ % n, cfg = plan(rng, edges[aim], edges[aim + 1], big, builds, slide), L = (slide ? weave : construct)(mulberry32(cfg.seed), cfg);
      if (!L) continue;
      const costSum = total(L.costs), score = L.score, avgCost = costSum / L.ropes.length;
      if (score < range[0] || score > range[1] || avgCost < floorFor(score) || (slide && L.knots < knotFloorFor(score))) continue;
      const slot = slotOf(score); // a build that falls short of the slot it aimed at can still fill an easier one
      if (slots[slot]) continue;
      // W and H are the finished board; boardW and boardH are the one it was built on, which rebuilding needs.
      slots[slot] = Object.assign(cfg, { boardW: cfg.W, boardH: cfg.H, W: L.W, H: L.H, difficulty: score, ropes: L.ropes.length, avgCost, knots: L.knots, traps: L.traps });
      filled++; stall = 0;
    }
    const levels = slots.filter(Boolean);
    return { seed, mode, count, big, slide, levels, builds, code: encodeCode({ seed, mode, count, big, slide }) };
  }
  // Rebuild a level's ropes from its descriptor. A sliding level also gets `best`, a solution in
  // the fewest taps that could be found, and `par`, how many taps that is: exactly the fewest
  // possible if `parExact`, otherwise the best known (the search is capped so that a level opens promptly).
  const PAR_BUDGET = 6000;
  function levelFrom(d) {
    const L = (d.slide ? weave : construct)(mulberry32(d.seed), Object.assign({}, d, { W: d.boardW, H: d.boardH }));
    if (L && d.slide) { const f = fewestPlayerTaps(L.ropes, L.W, L.H, L.taps, PAR_BUDGET); L.best = f.taps; L.par = f.count; L.parExact = f.exact; }
    return L;
  }

  // ---------- share codes: mode + count (+ B for bigger boards) (+ S for the sliding game) + seed, e.g. "N20-K7F3Q" or "X30BS-K7F3Q" ----------
  const SEED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I to mix up
  function randomSeed(rand) {
    let s = '';
    for (let i = 0; i < 5; i++) s += SEED_CHARS[Math.floor((rand || Math.random)() * SEED_CHARS.length)];
    return s;
  }
  const cleanSeed = s => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  function encodeCode(o) { return o.mode + o.count + (o.big ? 'B' : '') + (o.slide ? 'S' : '') + '-' + cleanSeed(o.seed); }
  function parseCode(text) {
    const m = /^\s*([CENHXT])\s*(\d{1,3})\s*(B?)\s*(S?)\s*-\s*([A-Z0-9]{1,10})\s*$/i.exec(String(text));
    if (!m) return null;
    const count = +m[2];
    if (m[1].toUpperCase() === 'T') return (SET_COUNTS.includes(count) || count === 12) && !!m[4] ? { mode: 'T', count, big: !!m[3], slide: true, seed: m[5].toUpperCase() } : null;
    if (!SET_COUNTS.includes(count)) return null;
    return { mode: m[1].toUpperCase(), count, big: !!m[3], slide: !!m[4], seed: m[5].toUpperCase() };
  }

  // The built-in levels are simply one fixed set for each game, kept to boards that fit a phone.
  const CAMPAIGN = { seed: 'MONKEYFIST', mode: 'C', count: 60, big: false, slide: false };
  const CAMPAIGN_SLIDE = { seed: 'MONKEYFIST', mode: 'C', count: 60, big: false, slide: true };

  return { mulberry32, hashString, headDir, ray, selfBlocked, occupancy, advance, blockersOf, loopsOf, analyse, deadRopes, frozenRopes, blockCosts, solve, fewestTaps, fewestPlayerTaps, playerTapCount, play, bendsOf, ropeScores, nothingBlocked, difficulty,
    construct, weave, solutionCosts, plan, generateSet, levelFrom, slotEdges, rangeFor, randomSeed, cleanSeed, encodeCode, parseCode, quality, goodEnough, heightFor, FLOORS, floorFor, KNOT_FLOORS, knotFloorFor, knotsWanted,
    MODES, PLAYER_MODES, COUNTS, SET_MODES, SET_COUNTS, progressiveStage, STYLES, WIDTHS, BIG_WIDTHS, CAMPAIGN, CAMPAIGN_SLIDE, MIN_ROPES, MIN_COVERAGE, MIN_COVERAGE_SLIDE, MIN_COVERAGE_SMALL, MIN_BLOCKED_SHARE, SMALL_W, TWISTY_W };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = MFLevels;
