// Six-neighbour sliding ropes. Axial coordinates are independent of the view.
(function (root) {
  'use strict';
  const { mulberry32 } = typeof module !== 'undefined' && module.exports ? require('../random.js') : root.MFRandom;
  const VERSION = 3, DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
  const key = p => p.q + ',' + p.r;
  const add = (p, d, n = 1) => ({ q: p.q + d[0] * n, r: p.r + d[1] * n });
  const direction = path => { const a = path.at(-2), b = path.at(-1); return [b.q - a.q, b.r - a.r]; };
  const inside = (level, p) => p.r >= 0 && p.r < level.H && p.q + Math.floor(p.r / 2) >= 0 && p.q + Math.floor(p.r / 2) < level.W;
  const project = p => ({ x: p.q + p.r / 2, y: p.r * Math.sqrt(3) / 2 });
  const cells = level => Array.from({ length: level.W * level.H }, (_, i) => ({ q: i % level.W - Math.floor(Math.floor(i / level.W) / 2), r: Math.floor(i / level.W) }));
  function random(seed) {
    // Retain Hex's original code-point iteration, including for callers passing
    // non-ASCII text. Generated board identities themselves are normalized ASCII.
    let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return mulberry32(h >>> 0);
  }
  const pick = (rng, list) => list[Math.floor(rng() * list.length)];
  const cell = (p, W) => p.r * W + p.q + Math.floor(p.r / 2);
  const point = (c, W) => ({ q: c % W - Math.floor(Math.floor(c / W) / 2), r: Math.floor(c / W) });
  // A rope can only advance along its original body followed by its exit ray.
  // Search stores one offset per rope, instead of copying every body at every node.
  function compile(level, paths = level.ropes) {
    const n = paths.length, N = level.W * level.H, tracks = [], lengths = new Int32Array(n), offsets = new Int32Array(n).fill(-1);
    const occupied = new Int32Array(N).fill(-1), at = new Int32Array(N), gates = new Int32Array(N).fill(-1);
    for (const g of level.locks) gates[cell(g.cell, level.W)] = g.key;
    let left = 0;
    paths.forEach((path, i) => {
      if (!path) { tracks.push([]); return; }
      const track = path.map(p => cell(p, level.W)), d = direction(path);
      track.forEach((c, j) => { occupied[c] = i; at[c] = j; });
      for (let p = add(path.at(-1), d); inside(level, p); p = add(p, d)) track.push(cell(p, level.W));
      tracks.push(track); lengths[i] = path.length; offsets[i] = 0; left++;
    });
    function to(i) {
      if (!Number.isInteger(i) || i < 0 || i >= n || offsets[i] < 0) return -2;
      const track = tracks[i], length = lengths[i]; let p = offsets[i] + length;
      while (p < track.length && occupied[track[p]] < 0 && (gates[track[p]] < 0 || offsets[gates[track[p]]] < 0)) p++;
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
            const c = track[j], owner = occupied[c], gate = gates[c];
            if ((gate >= 0 && reach[gate] >= 0) || (owner >= 0 && reach[owner] >= 0 && (owner === i ? next : reach[owner]) <= at[c])) break;
            next++;
          }
          if (next !== reach[i]) { reach[i] = next; changed = true; }
        }
      }
      return reach;
    }
    const dead = () => relaxed().some(o => o >= 0);
    const frozen = () => Array.from(relaxed()).flatMap((o, i) => offsets[i] >= 0 && o === offsets[i] ? [i] : []);
    return { tracks, lengths, offsets, occupied, gates, to, place, free, pathsNow, dead, frozen, get left() { return left; } };
  }
  function tap(level, paths, i) {
    const path = paths[i]; if (!path) return null;
    const occupied = new Set(paths.filter(Boolean).flat().map(key));
    const locked = new Set(level.locks.filter(g => paths[g.key]).map(g => key(g.cell)));
    const route = path.slice(), d = direction(path); let p = path.at(-1), distance = 0;
    for (;;) {
      const next = add(p, d);
      if (!inside(level, next)) {
        // Animate the entire tail out, including along diagonal board edges.
        for (let j = 0; j < path.length + 2; j++) { p = add(p, d); route.push(p); distance++; }
        const result = paths.slice(); result[i] = null;
        return { paths: result, event: 'exit', distance, route };
      }
      if (occupied.has(key(next)) || locked.has(key(next))) break;
      p = next; route.push(p); distance++;
    }
    if (!distance) return null;
    const result = paths.slice(); result[i] = route.slice(-path.length);
    return { paths: result, event: 'slide', distance, route };
  }
  const allFree = (level, paths) => compile(level, paths).free();
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
  function minimum(level, fallback, budget = 800) {
    const queue = [{ paths: level.ropes, moves: [] }], seen = new Set([JSON.stringify(level.ropes)]);
    for (let n = 0; n < queue.length && n < budget; n++) {
      const { paths, moves } = queue[n];
      if (allFree(level, paths)) {
        const plan = moves.concat(paths.flatMap((p, i) => p ? [i] : []));
        return { plan, par: Math.max(1, moves.length), exact: true };
      }
      for (let i = 0; i < paths.length; i++) {
        const m = tap(level, paths, i); if (!m) continue;
        const k = JSON.stringify(m.paths); if (seen.has(k)) continue;
        seen.add(k); queue.push({ paths: m.paths, moves: moves.concat(i) });
      }
    }
    return { plan: fallback, par: replay(level, fallback).taps, exact: false };
  }
  // Exact manual-prefix search on compact offsets. Unlike greedily clearing
  // exits, this keeps useful temporary stoppers until the search chooses them.
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
      for (let j = from + b.lengths[i]; j < end; j++) {
        const c = track[j]; layer = Math.max(layer, released[c]);
        if (b.gates[c] >= 0) layer = Math.max(layer, movedAt[b.gates[c]]);
      }
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
  function profile(index, count, big) {
    const stage = Math.round(index * 59 / Math.max(1, count - 1)), t = stage / 59, growth = Math.pow(t, 1.18);
    const W = Math.max(stage >= 4 ? 6 : stage >= 2 ? 5 : 4, 4 + Math.round((big ? 36 : 20) * growth));
    const H = Math.max(stage >= 4 ? 7 : stage >= 2 ? 6 : 5, 5 + Math.round((big ? 49 : 27) * growth)), area = W * H;
    return { stage, W, H, length: 6 + Math.round(t * (big ? 58 : 40)),
      knots: stage < 2 ? 0 : Math.max(1, Math.round(area / 65 * (.3 + .7 * t))),
      coverage: .79 + .07 * t };
  }
  function build(rng, cfg) {
    const { W, H, stage } = cfg, area = W * H, points = cells({ W, H });
    const neighbours = points.map(p => DIRS.map(d => { const q = add(p, d); return inside({ W, H }, q) ? cell(q, W) : -1; }));
    const occupied = new Int32Array(area).fill(-1), seen = new Int32Array(area), forward = new Int32Array(area);
    const level = { W, H, ropes: [], locks: [] }, stops = []; let stamp = 0, covered = 0, knots = 0, result = { moves: [], cost: 0, depth: 0 };
    const ray = (head, d) => { const out = []; for (let c = neighbours[head][d]; c >= 0; c = neighbours[c][d]) out.push(c); return out; };
    function shape(want, minimum = Math.max(2, cfg.minLength || 3)) {
      let head = -1;
      for (let n = 0; n < 24; n++) { const c = Math.floor(rng() * area); if (occupied[c] < 0) { head = c; break; } }
      if (head < 0) return null;
      const dir = Math.floor(rng() * 6), back = (dir + 3) % 6, second = neighbours[head][back];
      if (second < 0 || occupied[second] >= 0) return null;
      stamp++; const body = [head, second]; seen[head] = seen[second] = stamp;
      const ahead = ray(head, dir); for (const c of ahead) forward[c] = stamp;
      let previous = back;
      while (body.length < want) {
        const choices = [];
        for (let d = 0; d < 6; d++) { const c = neighbours[body.at(-1)][d]; if (c >= 0 && occupied[c] < 0 && seen[c] !== stamp && forward[c] !== stamp) choices.push(d); }
        if (!choices.length) break;
        previous = choices.includes(previous) && rng() < .38 ? previous : pick(rng, choices);
        const c = neighbours[body.at(-1)][previous]; seen[c] = stamp; body.push(c);
      }
      if (body.length < minimum) return null;
      return { path: body.reverse().map(c => points[c]), ids: body, ray: ahead };
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
    while ((cfg.ropeCount ? level.ropes.length < cfg.ropeCount : covered < area * cfg.coverage) && attempts < area * 22) {
      let best = null;
      for (let n = 0; n < 12 && attempts++ < area * 22; n++) {
        const want = 4 + Math.floor((.45 + .55 * rng()) * cfg.length), shapeResult = shape(want); if (!shapeResult) continue;
        level.ropes.push(shapeResult.path); stops.push(null);
        const trial = intentions(level, stops); level.ropes.pop(); stops.pop();
        if (!trial) continue;
        const gain = (trial.cost - result.cost) * (cfg.tapDepth == null ? 1 : cfg.tapDepth - 1) + shapeResult.ids.length * 4;
        if (!best || gain > best.gain) best = { ...shapeResult, trial, gain };
      }
      if (!best) continue;
      const id = level.ropes.length; level.ropes.push(best.path); stops.push(null); result = best.trial;
      best.ids.forEach(c => occupied[c] = id); covered += best.ids.length;
    }
    const certified = intentions(level, stops, result.moves);
    if (!certified) throw Error('Hex weaving certificate failed');
    const bends = level.ropes.map(path => path.slice(2).reduce((sum, p, j) => sum + Number(p.q - path[j + 1].q !== path[j + 1].q - path[j].q || p.r - path[j + 1].r !== path[j + 1].r - path[j].r), 0));
    return { ...level, plan: result.moves, slides: knots, wantedSlides: cfg.knots,
      stats: { cells: area, coverage: covered / area, depth: certified.depth, averageDepth: certified.cost / level.ropes.length,
        averageLength: covered / level.ropes.length, longest: Math.max(...level.ropes.map(p => p.length)), bends: bends.reduce((a, b) => a + b, 0), longestBends: Math.max(...bends) } };
  }
  const cleanSeed = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'MONKEYFIST';
  function code(opts) { return 'H' + opts.count + (opts.big ? 'B' : '') + (opts.mirrors ? 'M' : '') + '-' + cleanSeed(opts.seed); }
  function parseCode(text) {
    const m = /^H(10|30|60|120)(B?)(M?)-([A-Z0-9]{1,12})$/.exec(String(text).trim().toUpperCase());
    return m ? { count: +m[1], big: !!m[2], ...(m[3] ? { mirrors: true } : {}), seed: m[4] } : null;
  }
  const cache = new Map();
  function generate({ seed = 'MONKEYFIST', index = 0, count = 60, big = false } = {}) {
    seed = cleanSeed(seed); count = [10, 30, 60, 120].includes(count) ? count : 60; index = Math.max(0, Math.min(count - 1, Math.floor(index)));
    const identity = [VERSION, seed, index, count, big].join('/'); if (cache.has(identity)) return cache.get(identity);
    const rng = random(identity), cfg = profile(index, count, big), stage = cfg.stage;
    let best = null;
    for (let attempt = 0; attempt < (stage < 10 ? 8 : 3); attempt++) {
      const b = build(rng, cfg);
      const quality = Math.min(b.slides, b.wantedSlides) * 20 + b.stats.averageDepth + b.stats.coverage * 20;
      if (!best || quality > best.quality) best = { ...b, quality };
      if (b.slides >= b.wantedSlides && b.stats.coverage >= .8) break;
    }
    const result = { ...best, ...minimum(best, best.plan, best.ropes.length <= 10 ? 1500 : 0), seed, index, stage };
    if (!replay(result, result.plan).solved) throw Error('Hex certificate failed');
    cache.set(identity, result); if (cache.size > 24) cache.delete(cache.keys().next().value);
    return result;
  }
  const api = { VERSION, DIRS, key, add, direction, inside, project, cells, random, tap, allFree, replay, solve, minimum, fewestPlayerTaps, generate, code, parseCode, cleanSeed, profile, build, compile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MFHex = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
