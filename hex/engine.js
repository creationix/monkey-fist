// Six-neighbour sliding ropes. Axial coordinates are independent of the view.
(function (root) {
  'use strict';
  const VERSION = 1, DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
  const key = p => p.q + ',' + p.r;
  const add = (p, d, n = 1) => ({ q: p.q + d[0] * n, r: p.r + d[1] * n });
  const direction = path => { const a = path.at(-2), b = path.at(-1); return [b.q - a.q, b.r - a.r]; };
  const inside = (level, p) => p.r >= 0 && p.r < level.H && p.q + Math.floor(p.r / 2) >= 0 && p.q + Math.floor(p.r / 2) < level.W;
  const project = p => ({ x: p.q + p.r / 2, y: p.r * Math.sqrt(3) / 2 });
  const cells = level => Array.from({ length: level.W * level.H }, (_, i) => ({ q: i % level.W - Math.floor(Math.floor(i / level.W) / 2), r: Math.floor(i / level.W) }));
  function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
  function random(seed) { let a = hash(seed); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const pick = (rng, list) => list[Math.floor(rng() * list.length)];
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
  function solve(level, paths = level.ropes, budget = 2000, prefer = []) {
    const seen = new Set(), moves = []; let nodes = 0, exhausted = false;
    // Every move only advances a rope: there are no reversals or geometry cycles.
    function search(current, preferred) {
      if (current.every(p => !p)) return true;
      const state = JSON.stringify(current); if (seen.has(state)) return false;
      if (++nodes > budget) { exhausted = true; return false; }
      seen.add(state);
      const tries = current.flatMap((p, i) => {
        const m = p && tap(level, current, i); return m ? [{ i, m }] : [];
      }).sort((a, b) => (a.i === preferred[0] ? -1 : b.i === preferred[0] ? 1 : (a.m.event === 'exit' ? 0 : 1) - (b.m.event === 'exit' ? 0 : 1)));
      for (const { i, m } of tries) {
        moves.push(i);
        if (search(m.paths, i === preferred[0] ? preferred.slice(1) : preferred)) return true;
        moves.pop(); if (exhausted) break;
      }
      return false;
    }
    const solved = search(paths, prefer);
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
  // Construct by replayable intentions: each rope either exits, or must first slide
  // to a particular head cell. New ropes can weave across earlier exit/slide routes.
  // Accept an addition only if ALL intentions still replay to an empty board.
  function intentions(level, stops) {
    let paths = level.ropes; const done = new Set(), moves = [];
    for (let changed = true; changed;) {
      changed = false;
      for (let i = paths.length - 1; i >= 0; i--) {
        const m = tap(level, paths, i); if (!m) continue;
        const stop = done.has(i) ? null : stops[i];
        if (stop ? m.event !== 'slide' || key(m.paths[i].at(-1)) !== stop : m.event !== 'exit') continue;
        paths = m.paths; moves.push(i); done.add(i); changed = true;
      }
    }
    return paths.every(p => !p) ? moves : null;
  }
  function shape(level, occupied, rng, length) {
    const available = cells(level).filter(p => !occupied.has(key(p)));
    if (available.length < 2) return null;
    const head = pick(rng, available), d = pick(rng, DIRS), back = [-d[0], -d[1]], second = add(head, back);
    if (!inside(level, second) || occupied.has(key(second))) return null;
    const path = [head, second], used = new Set(path.map(key)), ray = new Set();
    for (let p = add(head, d); inside(level, p); p = add(p, d)) ray.add(key(p));
    let previous = back;
    while (path.length < length) {
      const options = DIRS.filter(v => {
        const p = add(path.at(-1), v), k = key(p);
        return inside(level, p) && !occupied.has(k) && !used.has(k) && !ray.has(k);
      });
      if (!options.length) break;
      const straight = options.find(v => v[0] === previous[0] && v[1] === previous[1]);
      previous = straight && rng() < .6 ? straight : pick(rng, options);
      const next = add(path.at(-1), previous); path.push(next); used.add(key(next));
    }
    return path.reverse();
  }
  function build(rng, W, H, stage) {
    const level = { W, H, ropes: [], locks: [] }, occupied = new Set(), stops = [];
    let plan = [], slides = 0;
    const wantedSlides = stage < 2 ? 0 : 1 + Math.floor(stage / 15);
    // Lay mutually blocking pairs before filling their surrounding lanes. Both
    // shapes are random walks, with a verified slide that frees the other's exit.
    for (let attempt = 0; attempt < W * H * 35 && slides < wantedSlides; attempt++) {
      const a = shape(level, occupied, rng, 3 + Math.floor(rng() * 5)); if (!a) continue;
      const withA = new Set([...occupied, ...a.map(key)]);
      const b = shape(level, withA, rng, 3 + Math.floor(rng() * 5)); if (!b) continue;
      const i = level.ropes.length; level.ropes.push(a, b); stops.push(null, null);
      let candidate = null;
      if (!intentions(level, stops)) {
        for (const id of [i, i + 1]) {
          const m = tap(level, level.ropes, id); if (m?.event !== 'slide') continue;
          stops[id] = key(m.paths[id].at(-1)); candidate = intentions(level, stops);
          if (candidate) break;
          stops[id] = null;
        }
      }
      if (!candidate) { level.ropes.length = stops.length = i; continue; }
      plan = candidate; slides++; [...a, ...b].forEach(p => occupied.add(key(p)));
    }
    for (let attempt = 0; attempt < W * H * 16 && occupied.size < W * H * .79; attempt++) {
      const path = shape(level, occupied, rng, 3 + Math.floor(rng() * (3 + stage / 9))); if (!path) continue;
      const i = level.ropes.length; level.ropes.push(path); stops.push(null);
      let candidate = null;
      // First try a knot: no exit-only order exists, but a slide unties it.
      const first = tap(level, level.ropes, i);
      if (slides < wantedSlides && first?.event === 'slide') {
        stops[i] = key(first.paths[i].at(-1)); candidate = intentions(level, stops);
        if (candidate) {
          stops[i] = null;
          if (intentions(level, stops)) candidate = null; // Avoid cosmetic, unnecessary slides.
          else stops[i] = key(first.paths[i].at(-1));
        }
      }
      if (!candidate) { stops[i] = null; candidate = intentions(level, stops); }
      if (!candidate) { level.ropes.pop(); stops.pop(); continue; }
      plan = candidate; if (stops[i]) slides++;
      path.forEach(p => occupied.add(key(p)));
    }
    // Locks create new dependencies across open exit lanes. Keys must be able to
    // leave first, and the full sliding certificate must survive each placement.
    const wantedLocks = stage < 4 ? 0 : Math.min(6, 1 + Math.floor((stage - 4) / 9));
    const exitAt = new Map(); let current = level.ropes;
    plan.forEach((i, k) => { const m = tap(level, current, i); if (m.event === 'exit') exitAt.set(i, k); current = m.paths; });
    const choices = [];
    level.ropes.forEach((path, target) => {
      const d = direction(path);
      for (let p = add(path.at(-1), d); inside(level, p); p = add(p, d)) {
        if (occupied.has(key(p))) continue;
        for (let id = 0; id < level.ropes.length; id++) {
          if (id !== target && exitAt.get(id) < exitAt.get(target)) choices.push({ cell: p, key: id, target });
        }
      }
    });
    // Randomize lock placements while keeping distinct keys and target ropes.
    for (let i = choices.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [choices[i], choices[j]] = [choices[j], choices[i]]; }
    const targets = new Set(), keys = new Set();
    for (const g of choices) {
      if (level.locks.length >= wantedLocks) break;
      if (targets.has(g.target) || keys.has(g.key) || level.locks.some(l => key(l.cell) === key(g.cell))) continue;
      // The key's body must not already be the same obstacle on this lane.
      const alone = level.ropes.map((p, i) => i === g.target || i === g.key ? p : null);
      if (tap(level, alone, g.target)?.event !== 'exit') continue;
      level.locks.push(g);
      const next = intentions(level, stops);
      if (!next || tap(level, alone, g.target)?.event === 'exit') { level.locks.pop(); continue; }
      plan = next; targets.add(g.target); keys.add(g.key);
    }
    return { ...level, plan, slides, wantedLocks, wantedSlides };
  }
  const cleanSeed = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'MONKEYFIST';
  function code(opts) { return 'H' + opts.count + (opts.big ? 'B' : '') + '-' + cleanSeed(opts.seed); }
  function parseCode(text) {
    const m = /^H(10|30|60|120)(B?)-([A-Z0-9]{1,12})$/.exec(String(text).trim().toUpperCase());
    return m ? { count: +m[1], big: !!m[2], seed: m[3] } : null;
  }
  const cache = new Map();
  function generate({ seed = 'MONKEYFIST', index = 0, count = 60, big = false } = {}) {
    seed = cleanSeed(seed); count = [10, 30, 60, 120].includes(count) ? count : 60; index = Math.max(0, Math.min(count - 1, Math.floor(index)));
    const identity = [VERSION, seed, index, count, big].join('/'); if (cache.has(identity)) return cache.get(identity);
    const rng = random(identity), stage = Math.floor(index * 60 / count);
    const W = 4 + Math.floor(stage / (big ? 7 : 10)), H = 5 + Math.floor(stage / (big ? 5 : 7));
    let best = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const b = build(rng, W, H, stage);
      const quality = Math.min(b.slides, b.wantedSlides) * 20 + b.locks.length * 30 + b.ropes.flat().length / (W * H);
      if (!best || quality > best.quality) best = { ...b, quality };
      if (b.slides >= b.wantedSlides && b.locks.length === b.wantedLocks) break;
    }
    const result = { ...best, ...minimum(best, best.plan, best.ropes.length <= 10 ? 1500 : 100), seed, index, stage };
    if (!replay(result, result.plan).solved) throw Error('Hex certificate failed');
    cache.set(identity, result); if (cache.size > 24) cache.delete(cache.keys().next().value);
    return result;
  }
  const api = { VERSION, DIRS, key, add, direction, inside, project, cells, random, tap, allFree, replay, solve, minimum, generate, code, parseCode, cleanSeed };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MFHex = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
