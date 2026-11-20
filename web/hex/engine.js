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
  const pick = (rng, list) => list[Math.floor(rng() * list.length)];
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
  // Mirror cells (as cell indices) on which some rope's way out actually turns.
  function turningMirrors(level, paths = level.ropes) {
    const bent = mirrorCells(level), turns = new Set();
    for (const path of paths) if (path) rayTrack(level, cell(path.at(-1), level.W), exitIndex(level, path, bent), bent, [], turns);
    return turns;
  }
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
  // Exact manual-prefix search on compact offsets. Unlike greedily clearing
  // exits, this keeps useful temporary stoppers until the search chooses them.
  // Move exits the rest of a solution does not need to the automatic release.
  function postponeExits(level, plan) {
    let best = plan.slice(), result = replay(level, best);
    if (!result.solved) return null;
    for (let pass = 0; pass < 2; pass++) {
      let improved = false;
      for (let k = best.length - 1; k >= 0; k--) {
        const i = best[k]; if (best.indexOf(i, k + 1) >= 0) continue;
        const trial = best.slice(0, k).concat(best.slice(k + 1), i), r = replay(level, trial);
        if (r.solved && r.taps < result.taps) { best = trial; result = r; improved = true; }
      }
      if (!improved) break;
    }
    return { plan: best, taps: result.taps };
  }
  // The casual player of levels.js: an exit if one exists, otherwise any move, at random.
  function casualWins(level, rng, games) {
    let wins = 0; const exits = [], moves = [];
    for (let g = 0; g < games; g++) {
      const b = compile(level);
      for (;;) {
        exits.length = 0; moves.length = 0;
        for (let i = 0; i < level.ropes.length; i++) if (b.offsets[i] >= 0) { const t = b.to(i); if (t === -1) exits.push(i); else if (t !== b.offsets[i]) moves.push(i, t); }
        if (exits.length) b.place(exits[Math.floor(rng() * exits.length)], -1);
        else if (moves.length) { const k = 2 * Math.floor(rng() * moves.length / 2); b.place(moves[k], moves[k + 1]); }
        else break;
        if (!b.left) { wins++; break; }
      }
    }
    return wins / Math.max(1, games);
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
  // Replay exact slide destinations. Cell-release layers measure how deeply
  // ropes wait on one another, so candidate selection rewards connected tangles.
  function intentions(level, stops, certificate) {
    const b = compile(level), done = new Uint8Array(level.ropes.length), released = new Int32Array(level.W * level.H), movedAt = new Int32Array(level.ropes.length);
    const moves = []; let cost = 0, depth = 0, slides = 0;
    function step(i) {
      const from = b.offsets[i], target = b.to(i); if (target === -2 || target === from) return false;
      const expected = stops[i], stop = Array.isArray(expected) ? expected[done[i]] : done[i] ? null : expected;
      if (stop != null ? target < 0 || b.tracks[i][target + b.lengths[i] - 1] !== stop : target !== -1) return false;
      let layer = movedAt[i];
      const track = b.tracks[i], end = target < 0 ? track.length : target + b.lengths[i];
      for (let j = from + b.lengths[i]; j < end; j++) layer = Math.max(layer, released[track[j]]);
      if (target >= 0) { const owner = b.occupied[track[end]]; if (owner >= 0) layer = Math.max(layer, movedAt[owner]); slides++; }
      layer++; movedAt[i] = layer; depth = Math.max(depth, layer);
      for (let j = from; j < (target < 0 ? from + b.lengths[i] : Math.min(from + b.lengths[i], target)); j++) released[track[j]] = layer;
      b.place(i, target); done[i]++; moves.push(i); if (target < 0) cost += layer;
      return true;
    }
    if (certificate) { for (const i of certificate) if (!step(i)) return null; }
    else for (let changed = true; changed && b.left;) { changed = false; for (let i = level.ropes.length - 1; i >= 0; i--) if (step(i)) changed = true; }
    return b.left ? null : { moves, cost, depth, slides };
  }
  function build(rng, cfg) {
    const { W, H, stage } = cfg, area = W * H, points = cells({ W, H });
    const neighbours = points.map(p => DIRS.map(d => { const q = add(p, d); return inside({ W, H }, q) ? cell(q, W) : -1; }));
    const occupied = new Int32Array(area).fill(-1), seen = new Int32Array(area), forward = new Int32Array(area);
    const level = { W, H, ropes: [], ...(cfg.mirrors?.length ? { mirrors: cfg.mirrors } : {}) }, stops = []; let stamp = 0, covered = 0, knots = 0, result = { moves: [], cost: 0, depth: 0 };
    const bent = mirrorCells(level), tile = new Uint8Array(area); for (const c of bent.keys()) tile[c] = 1;
    const kept = new Uint8Array(area); // empty gaps in front of traps, which no rope may fill
    const free = c => c >= 0 && occupied[c] < 0 && !tile[c] && !kept[c];
    const ray = (head, d) => bent.size ? rayTrack(level, head, d, bent) : (() => { const out = []; for (let c = neighbours[head][d]; c >= 0; c = neighbours[c][d]) out.push(c); return out; })();
    // `aim`, if given, fixes the head and its direction (toward a mirror).
    function shape(want, minimum = Math.max(2, cfg.minLength || 3), aim = null) {
      let head = aim ? aim.head : -1;
      for (let n = 0; n < 24 && !aim; n++) { const c = Math.floor(rng() * area); if (free(c)) { head = c; break; } }
      if (head < 0) return null;
      const dir = aim ? aim.dir : Math.floor(rng() * 6), back = (dir + 3) % 6, second = neighbours[head][back];
      if (!free(second)) return null;
      const turns = new Set(), ahead = bent.size ? rayTrack(level, head, dir, bent, [], turns) : ray(head, dir); if (!ahead) return null;
      stamp++; const body = [head, second]; seen[head] = seen[second] = stamp;
      for (const c of ahead) forward[c] = stamp;
      if (forward[second] === stamp) return null;
      let previous = back;
      while (body.length < want) {
        const choices = [];
        for (let d = 0; d < 6; d++) { const c = neighbours[body.at(-1)][d]; if (free(c) && seen[c] !== stamp && forward[c] !== stamp) choices.push(d); }
        if (!choices.length) break;
        previous = choices.includes(previous) && rng() < .38 ? previous : pick(rng, choices);
        const c = neighbours[body.at(-1)][previous]; seen[c] = stamp; body.push(c);
      }
      if (body.length < minimum) return null;
      return { path: body.reverse().map(c => points[c]), ids: body, ray: ahead, turns };
    }
    // Optional repeated-slide core, replayed before any gap-filling additions.
    if (cfg.initialRopes?.length) {
      const used = new Set();
      for (const path of cfg.initialRopes) {
        if (path.length < 2 || path.some(p => !inside(level, p) || used.has(key(p)))) return null;
        path.forEach(p => used.add(key(p))); level.ropes.push(path.map(p => ({ ...p })));
      }
      const core = compile(level);
      for (let i = 0; i < level.ropes.length; i++) stops.push((cfg.initialStops?.[i] || []).map(offset => core.tracks[i][offset + core.lengths[i] - 1]));
      result = intentions(level, stops, cfg.initialPlan);
      if (!result) return null;
      level.ropes.forEach((path, i) => path.forEach(p => occupied[cell(p, W)] = i));
      covered = used.size; knots = stops.filter(stop => stop.length).length;
    }
    // Each accepted pair has a true mutual wait: at least one rope must slide.
    // Their long tails then become blockers for the rest of the generated board.
    for (let attempt = 0; attempt < Math.max(5000, area * 24) && knots < cfg.knots && (!cfg.ropeCount || level.ropes.length + 2 <= cfg.ropeCount); attempt++) {
      const length = Math.min(38, 7 + Math.floor(stage / 2)), base = 4 + Math.floor(stage / 14);
      const a = shape(base + Math.floor(rng() * length)); if (!a) continue;
      a.ids.forEach(c => occupied[c] = 9999);
      const b = shape(base + Math.floor(rng() * length));
      a.ids.forEach(c => occupied[c] = -1);
      if (!b || !a.ray.some(c => b.ids.includes(c)) || !b.ray.some(c => a.ids.includes(c))) continue;
      const i = level.ropes.length; level.ropes.push(a.path, b.path); stops.push(null, null);
      const board = compile(level); let trial = null;
      for (const id of [i, i + 1]) {
        const target = board.to(id); if (target <= 0) continue;
        stops[id] = board.tracks[id][target + board.lengths[id] - 1]; trial = intentions(level, stops);
        if (trial) break; stops[id] = null;
      }
      if (!trial) { level.ropes.length = stops.length = i; continue; }
      result = trial; knots++; a.ids.forEach(c => occupied[c] = i); b.ids.forEach(c => occupied[c] = i + 1); covered += a.ids.length + b.ids.length;
    }
    // Prefer long, winding additions that make many existing ropes wait. Evaluate
    // several candidates at each step, instead of accepting the first free exit.
    let attempts = 0;
    const turnedBy = new Set(); // mirrors some committed rope's way out turns on
    const aimAt = () => {
      const idle = (level.mirrors || []).filter(m => !turnedBy.has(cell(m.cell, W))); if (!idle.length) return null;
      const m = pick(rng, idle), c = cell(m.cell, W), d = pick(rng, [0, 1, 2, 3, 4, 5].filter(e => e % 3 !== m.axis % 3)), j = 1 + Math.floor(rng() * 3);
      let head = c; for (let k = 0; k < j && head >= 0; k++) head = neighbours[head][(d + 3) % 6];
      for (let k = 0, x = head; k < j && x >= 0; k++, x = neighbours[x][d]) if (!free(x)) return null;
      return head >= 0 ? { head, dir: d } : null;
    };
    const noteTurns = path => { if (bent.size) rayTrack(level, cell(path.at(-1), W), exitIndex(level, path, bent), bent, [], turnedBy); };
    for (const path of level.ropes) noteTurns(path);
    // Traps: a rope with a short empty gap ahead of its head, kept empty, such that
    // sliding into the gap leaves some rope that can never leave (checked with the
    // relaxation). A careless slide can then lose the board, as on square grids.
    let traps = 0;
    function tryTrap() {
      // A slide is fatal when the rope comes to rest on the way out of the rope it is
      // waiting behind: each then waits on the other for good. Prefer such gaps.
      const board = compile(level), wayOut = board.tracks.map((track, i) => new Set(track.slice(board.lengths[i])));
      const spots = [], deadly = [];
      for (let c = 0; c < area; c++) if (free(c)) for (let d = 0; d < 6; d++) {
        if (!free(neighbours[c][(d + 3) % 6])) continue;
        const ahead = ray(c, d); if (!ahead) continue;
        let gap = 0; while (gap < ahead.length && gap < 4 && occupied[ahead[gap]] < 0) gap++;
        if (gap >= 1 && gap <= 3 && gap < ahead.length && occupied[ahead[gap]] >= 0 && ahead.slice(0, gap).every(x => !kept[x])) {
          const spot = { c, d, gap, cells: ahead.slice(0, gap) }, blocker = occupied[ahead[gap]];
          spots.push(spot); if (blocker < wayOut.length && [c, ...spot.cells].some(x => wayOut[blocker].has(x))) deadly.push(spot);
        }
      }
      const pool = deadly.length ? deadly : spots;
      for (let t = 0; t < 16 && pool.length; t++) {
        const spot = pick(rng, pool), shaped = shape(3 + Math.floor(rng() * Math.max(2, cfg.length / 2)), 2, { head: spot.c, dir: spot.d }); if (!shaped) continue;
        const id = level.ropes.length; level.ropes.push(shaped.path); stops.push(null);
        const trial = intentions(level, stops); let fatal = false;
        if (trial) { const board = compile(level); if (board.to(id) === spot.gap) { board.place(id, spot.gap); fatal = board.dead(); } }
        if (!fatal) { level.ropes.pop(); stops.pop(); continue; }
        result = trial; noteTurns(shaped.path); shaped.ids.forEach(c => occupied[c] = id); covered += shaped.ids.length;
        for (const x of spot.cells) kept[x] = 1;
        traps++; return true;
      }
      return false;
    }
    while ((cfg.ropeCount ? level.ropes.length < cfg.ropeCount : covered < area * cfg.coverage) && attempts < area * 22) {
      if (traps < (cfg.traps || 0) && level.ropes.length >= 2 && rng() < .5 && tryTrap()) continue;
      let best = null;
      const aim = bent.size > turnedBy.size;
      for (let n = 0; n < 12 && attempts++ < area * 22; n++) {
        const want = 4 + Math.floor((.45 + .55 * rng()) * cfg.length), shapeResult = shape(want, undefined, aim && n < 4 ? aimAt() : null); if (!shapeResult) continue;
        level.ropes.push(shapeResult.path); stops.push(null);
        const trial = intentions(level, stops); level.ropes.pop(); stops.pop();
        if (!trial) continue;
        const gain = (trial.cost - result.cost) * (cfg.tapDepth == null ? 1 : cfg.tapDepth - 1) + shapeResult.ids.length * 4 +
          30 * [...shapeResult.turns].filter(c => !turnedBy.has(c)).length; // bring idle mirrors into play
        if (!best || gain > best.gain) best = { ...shapeResult, trial, gain };
      }
      if (!best) continue;
      const id = level.ropes.length; level.ropes.push(best.path); stops.push(null); result = best.trial; noteTurns(best.path);
      best.ids.forEach(c => occupied[c] = id); covered += best.ids.length;
    }
    const certified = intentions(level, stops, result.moves);
    if (!certified) throw Error('Hex weaving certificate failed');
    const bends = level.ropes.map(path => path.slice(2).reduce((sum, p, j) => sum + Number(p.q - path[j + 1].q !== path[j + 1].q - path[j].q || p.r - path[j + 1].r !== path[j + 1].r - path[j].r), 0));
    return { ...level, plan: result.moves, slides: knots, wantedSlides: cfg.knots, traps,
      stats: { cells: area, coverage: covered / area, depth: certified.depth, averageDepth: certified.cost / level.ropes.length,
        averageLength: covered / level.ropes.length, longest: Math.max(...level.ropes.map(p => p.length)), bends: bends.reduce((a, b) => a + b, 0), longestBends: Math.max(...bends) } };
  }
  const api = { DIRS, key, add, direction, inside, project, cells, replay, solve, fewestPlayerTaps, postponeExits, casualWins, turningMirrors, cellIndex: cell, reflect, build, compile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MFHex = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
