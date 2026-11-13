// Routed Hex mirrors and springs. The ordinary generator and compact straight-track
// solver stay independent of this bounded, full-path solver.
(function (root) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const H = node ? require('./engine.js') : root.MFHex;
  const { shuffle } = node ? require('../random.js') : root.MFRandom;
  const { key, add, inside, DIRS } = H;
  const VERSION = 1, mod = n => (n % 6 + 6) % 6;
  // Mirror lines lie at 0°, 60°, or 120°. Reflection is angle_out = 2*line - angle_in.
  // This gives a 120° turn, or an unchanged direction for an edge-on approach.
  const reflect = (direction, axis) => mod(2 * axis - direction);
  const indexOf = d => DIRS.findIndex(v => v[0] === d[0] && v[1] === d[1]);
  function direction(level, path) {
    const d = indexOf(H.direction(path)), mirror = (level.mirrors || []).find(m => key(m.cell) === key(path.at(-1)));
    return DIRS[mirror ? reflect(d, mirror.axis) : d];
  }
  function tap(level, paths, i) {
    const path = paths[i]; if (!path) return null;
    const occupied = new Set(paths.filter(Boolean).flat().map(key));
    const mirrors = new Map((level.mirrors || []).map(m => [key(m.cell), m.axis]));
    const springs = new Set((level.springs || []).map(key));
    const route = path.slice(), seen = new Set(), turns = [];
    let p = path.at(-1), d = indexOf(direction(level, path)), distance = 0;
    for (;;) {
      const next = add(p, DIRS[d]), cell = key(next);
      if (!inside(level, next)) {
        for (let j = 0; j < path.length + 2; j++) { p = add(p, DIRS[d]); route.push(p); distance++; }
        const result = paths.slice(); result[i] = null;
        return { paths: result, event: 'exit', distance, route, turns };
      }
      if (occupied.has(cell)) break;
      if (springs.has(cell)) {
        route.push(next); distance++;
        const result = paths.slice(); result[i] = route.slice(-path.length).reverse();
        return { paths: result, event: 'bounce', distance, route, turns };
      }
      // A tap must settle. Reject looping/self-crossing routes instead of hanging
      // the animation or returning a rope with overlapping cells.
      if (seen.has(cell)) return null;
      seen.add(cell); p = next; route.push(p); distance++;
      if (mirrors.has(cell)) {
        const reflected = reflect(d, mirrors.get(cell));
        if (reflected !== d) turns.push(cell);
        d = reflected;
      }
    }
    if (!distance) return null;
    const result = paths.slice(); result[i] = route.slice(-path.length);
    return { paths: result, event: 'slide', distance, route, turns };
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
  function solve(level, paths = level.ropes, budget = 900, prefer = []) {
    const visited = new Set(), moves = []; let nodes = 0, exhausted = false;
    function search(current, preferred) {
      if (current.every(p => !p)) return true;
      const state = JSON.stringify(current); if (visited.has(state)) return false;
      if (++nodes > budget) { exhausted = true; return false; }
      visited.add(state);
      const tries = current.flatMap((p, i) => { const next = p && tap(level, current, i); return next ? [{ i, next }] : []; });
      tries.sort((a, b) => a.i === preferred[0] ? -1 : b.i === preferred[0] ? 1 : (a.next.event === 'exit' ? 0 : 1) - (b.next.event === 'exit' ? 0 : 1));
      for (const { i, next } of tries) {
        moves.push(i);
        if (search(next.paths, i === preferred[0] ? preferred.slice(1) : preferred)) return true;
        moves.pop(); if (exhausted) return false;
      }
      return false;
    }
    const solved = search(paths, prefer);
    return { solved: solved ? true : exhausted ? null : false, moves: solved ? moves.slice() : [], nodes };
  }
  function trace(level, moves) {
    let paths = level.ropes;
    const states = [paths], firstUse = new Map(), turns = new Set(); let multiTurn = 0;
    for (const [step, i] of moves.entries()) {
      const move = tap(level, paths, i); if (!move) return null;
      for (const p of move.route.slice(paths[i].length)) if (inside(level, p) && !firstUse.has(key(p))) firstUse.set(key(p), step);
      move.turns.forEach(c => turns.add(c)); if (new Set(move.turns).size >= 2) multiTurn++;
      paths = move.paths; states.push(paths);
    }
    return { states, firstUse, turns, multiTurn, solved: paths.every(p => !p) };
  }
  function route(level, path, reserved, rng, wanted) {
    const mirrors = new Map(level.mirrors.map(m => [key(m.cell), m.axis])), springs = new Set((level.springs || []).map(key)), seen = new Set(path.map(key)); let nodes = 0;
    function walk(p, d, bends, added) {
      if (++nodes > 500) return null;
      const next = add(p, DIRS[d]), c = key(next);
      if (!inside(level, next)) return bends >= wanted ? added : null;
      if (seen.has(c) || springs.has(c)) return null;
      seen.add(c);
      const choices = mirrors.has(c) ? [mirrors.get(c)] : reserved.has(c) || bends >= wanted ? [null] : shuffle([null, null, 0, 1, 2], rng);
      for (const axis of choices) {
        const out = axis === null ? d : reflect(d, axis);
        if (axis !== null && !mirrors.has(c) && out === d) continue;
        const result = walk(next, out, bends + Number(out !== d), axis !== null && !mirrors.has(c) ? added.concat({ cell: next, axis }) : added);
        if (result) { seen.delete(c); return result; }
      }
      seen.delete(c); return null;
    }
    return walk(path.at(-1), indexOf(H.direction(path)), 0, []);
  }
  const pick = (rng, list) => list[Math.floor(rng() * list.length)];
  function strand(level, head, dir, occupied, tiles, rng, length, minimum = 3) {
    const body = [], seen = new Set();
    const free = p => inside(level, p) && !occupied.has(key(p)) && !tiles.has(key(p)) && !seen.has(key(p));
    const previous = add(head, DIRS[mod(dir + 3)]);
    if (!free(head)) return null;
    body.push(head); seen.add(key(head));
    if (!free(previous)) return null;
    body.push(previous); seen.add(key(previous));
    while (body.length < length) {
      const choices = DIRS.map(d => add(body.at(-1), d)).filter(free); if (!choices.length) break;
      const p = pick(rng, choices); body.push(p); seen.add(key(p));
    }
    return body.length >= minimum ? body.reverse() : null;
  }
  function springStrand(level, rng, maxGap, forceShared, allowShared) {
    const sharing = allowShared && level.springs.length && (forceShared || rng() < .8);
    const gap = Math.max(2, 1 + Math.floor(rng() * maxGap)), path = [];
    let length = 2 + Math.floor(rng() * 3);
    const side = sharing ? 1 + Math.floor(rng() * 4) : 1, cap = sharing ? 1 + Math.floor(rng() * 4) : 1;
    if (sharing) length = Math.max(length, gap + cap + Math.floor(rng() * 3));
    for (let q = length; q >= -side; q--) path.push({ q, r: -gap - cap });
    for (let r = -gap - cap + 1; r <= 1; r++) path.push({ q: -side, r });
    for (let q = 1 - side; q <= 0; q++) path.push({ q, r: 1 });
    path.push({ q: 0, r: 0 });
    const turn = Math.floor(rng() * 6); let origin = pick(rng, H.cells(level));
    if (sharing) {
      let q = 0, r = -gap; for (let j = 0; j < turn; j++) [q, r] = [-r, q + r];
      const target = pick(rng, level.springs); origin = { q: target.q - q, r: target.r - r };
    }
    const transform = p => { let { q, r } = p; for (let j = 0; j < turn; j++) [q, r] = [-r, q + r]; return { q: q + origin.q, r: r + origin.r }; };
    return { path: path.map(transform), spring: transform({ q: 0, r: -gap }) };
  }
  function skeleton(rng, W, height, count, wanted, springs, maxGap, allowShared) {
    let level = { W, H: height, ropes: [], mirrors: [], springs: [], locks: [], plan: [] };
    const cells = H.cells(level), occupied = new Set(), reserved = new Set();
    for (let i = 0; i < count; i++) {
      let found = false;
      for (let attempt = 0; attempt < 180; attempt++) {
        const tiles = new Set([...reserved, ...level.mirrors.map(m => key(m.cell)), ...level.springs.map(key)]);
        const spring = springs ? springStrand(level, rng, maxGap, i > 0 && level.springs.length === i && attempt < 150, allowShared) : null;
        const shared = spring && level.springs.some(p => key(p) === key(spring.spring));
        const bodyTiles = shared ? new Set([...level.mirrors.map(m => key(m.cell)), ...level.springs.map(key)]) : tiles;
        const path = spring ? spring.path : strand(level, pick(rng, cells), Math.floor(rng() * 6), occupied, tiles, rng, 4 + Math.floor(rng() * 9));
        if (!path || path.some(p => !inside(level, p) || occupied.has(key(p)) || bodyTiles.has(key(p)))) continue;
        if (spring && (!inside(level, spring.spring) || occupied.has(key(spring.spring)) || tiles.has(key(spring.spring)) && !level.springs.some(p => key(p) === key(spring.spring)) || path.some(p => key(p) === key(spring.spring)))) continue;
        let variant = { ...level, ropes: level.ropes.concat([path]), springs: spring && !level.springs.some(p => key(p) === key(spring.spring)) ? level.springs.concat(spring.spring) : level.springs };
        const alone = Array(i).fill(null).concat([path]);
        if (spring && solve({ ...variant, mirrors: [], springs: [] }, alone, 100).solved !== false) continue;
        const bounce = spring && tap(variant, alone, i);
        if (spring && bounce?.event !== 'bounce') continue;
        const current = bounce ? bounce.paths[i] : path;
        const mirrors = route(variant, current, new Set([...reserved, ...occupied, ...path.map(key), ...(bounce?.route || []).map(key)]), rng, wanted); if (!mirrors) continue;
        variant = { ...variant, mirrors: level.mirrors.concat(mirrors), plan: level.plan.concat(spring ? [i, i] : [i]) };
        let result = trace(variant, variant.plan);
        if (!result?.solved && shared) {
          const interleaved = solve(variant, variant.ropes, 2000, variant.plan);
          if (interleaved.solved) { variant.plan = interleaved.moves; result = trace(variant, variant.plan); }
        }
        if (!result?.solved || result.turns.size !== variant.mirrors.length) continue;
        level = variant; path.forEach(p => occupied.add(key(p))); result.firstUse.forEach((v, c) => reserved.add(c));
        found = true; break;
      }
      if (!found) return null;
    }
    return level;
  }
  function populate(level, rng, stage, ropeCount, options = {}) {
    const core = level.ropes.length, occupied = new Set(level.ropes.flat().map(key)), tiles = new Set([...level.mirrors.map(m => key(m.cell)), ...level.springs.map(key)]);
    const cells = H.cells(level); let traced = trace(level, level.plan), followers = 0, early = 0;
    let paths = level.ropes; const approaches = [];
    for (const i of level.plan) {
      const move = tap(level, paths, i);
      if (move.event === 'bounce') approaches.push(...move.route.slice(paths[i].length));
      paths = move.paths;
    }
    for (let attempt = 0; attempt < cells.length * (options.attemptsMultiplier ?? 10) && (!ropeCount || level.ropes.length < ropeCount) && occupied.size < cells.length * (options.coverage ?? .76); attempt++) {
      const dir = Math.floor(rng() * 6), target = pick(rng, level.ropes.flat());
      const approach = approaches.length && (attempt < 100 || rng() < .5);
      const head = approach ? add(pick(rng, approaches), DIRS[dir]) : rng() < .8 ? add(target, DIRS[mod(dir + 3)]) : pick(rng, cells);
      const want = options.length == null ? 5 + Math.floor(rng() * (8 + stage / 3)) : Math.max(options.minLength || 2, Math.floor(options.length * (.5 + .5 * rng())));
      const path = strand(level, head, dir, occupied, tiles, rng, want, options.minLength ?? (approach ? 2 : 3)); if (!path) continue;
      const deadline = Math.min(level.plan.length, ...path.map(p => traced.firstUse.get(key(p)) ?? level.plan.length));
      const i = level.ropes.length, variant = { ...level, ropes: level.ropes.concat([path]) }; let at = -1;
      for (let k = 0; k <= deadline; k++) if (tap(variant, traced.states[k].concat([path]), i)?.event === 'exit') { at = k; break; }
      if (at < 0 || !options.allowEarly && at === 0 && early >= Math.max(3, followers / 2)) continue;
      const plan = level.plan.slice(); plan.splice(at, 0, i); variant.plan = plan;
      const checked = trace(variant, plan); if (!checked?.solved) continue;
      if (at) followers++; else early++;
      level = variant; traced = checked; path.forEach(p => occupied.add(key(p)));
    }
    return { ...level, core, stats: { coverage: occupied.size / cells.length, multiTurn: traced.multiTurn, usedMirrors: traced.turns.size, followers } };
  }
  const cache = new Map();
  function generate(options = {}) {
    const opts = { seed: H.cleanSeed(options.seed), count: [10, 30, 60, 120].includes(options.count) ? options.count : 60, big: !!options.big, mirrors: options.mirrors !== false };
    const springs = !!options.springs;
    const index = Math.max(0, Math.min(opts.count - 1, options.index | 0)), identity = H.code(opts) + '/' + index + '/' + Number(springs);
    if (cache.has(identity)) return cache.get(identity);
    const stage = Math.round(index * 59 / Math.max(1, opts.count - 1)), rng = H.random('mirrors/' + VERSION + '/' + identity);
    const W = 7 + Math.round(stage / 59 * (opts.big ? 13 : 7)), height = 8 + Math.round(stage / 59 * (opts.big ? 16 : 10));
    const count = Math.min(5, 1 + Math.floor(stage / 10)), wanted = opts.mirrors ? stage < 3 ? 1 : stage < 30 ? 2 : 3 : 0;
    let best = null;
    for (let attempt = 0; attempt < (springs ? 16 : 8); attempt++) {
      const core = skeleton(rng, W, height, count, wanted, springs, attempt < 8 ? 4 : 2, attempt < 8); if (!core) continue;
      const candidate = populate(core, rng, stage);
      if (springs && count > 1 && candidate.ropes.slice(0, candidate.core).every((p, i) => tap(candidate, candidate.ropes, i)?.event === 'bounce')) continue;
      const shared = springs && candidate.springs.length < count, bestShared = springs && best && best.springs.length < count;
      if (!best || shared && !bestShared || shared === !!bestShared && candidate.stats.coverage > best.stats.coverage) best = candidate;
      if (candidate.stats.coverage >= .65 && (!springs || count === 1 || shared)) break;
    }
    if (!best) throw Error('Could not weave a mirror tangle');
    const replayed = replay(best, best.plan);
    if (!replayed.solved || best.stats.usedMirrors !== best.mirrors.length) throw Error('Invalid mirror certificate');
    const result = { ...best, ...opts, mirrors: best.mirrors, index, stage, par: replayed.taps, exact: false, slides: 0 };
    cache.set(identity, result); if (cache.size > 16) cache.delete(cache.keys().next().value);
    return result;
  }
  const api = { VERSION, reflect, direction, tap, allFree, replay, solve, trace, generate, skeleton, populate };
  if (node) module.exports = api; else root.MFHexMirrors = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
