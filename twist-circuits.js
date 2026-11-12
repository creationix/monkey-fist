// Route-first puzzles. The keys themselves must navigate the machine, and ordinary
// ropes are inserted between its moves, not just cleared before it is used.
(function (root) {
  'use strict';
  const M = typeof module !== 'undefined' && module.exports ? require('./mechanics.js') : root.MFMechanics;
  const { shuffle } = typeof module !== 'undefined' && module.exports ? require('./random.js') : root.MFRandom;
  const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const cell = (p, W) => p.y * W + p.x;
  const inside = (p, b) => p.x >= 0 && p.y >= 0 && p.x < b.W && p.y < b.H;
  const pick = (a, r) => a[Math.floor(r() * a.length)];
  function trace(b, moves) {
    let paths = b.ropes;
    const states = [paths], firstUse = new Map(), steps = [];
    for (const i of moves) {
      const next = M.tap(b, paths, i); if (!next) return null;
      for (const p of next.route.slice(paths[i].length)) if (inside(p, b) && !firstUse.has(cell(p, b.W))) firstUse.set(cell(p, b.W), steps.length);
      steps.push({ i, ...next }); paths = next.paths; states.push(paths);
    }
    return { states, firstUse, steps, solved: paths.every(p => !p) };
  }
  function hook(rng) {
    const gap = 1 + Math.floor(rng() * 2), length = 2 + Math.floor(rng() * 3), path = [];
    for (let x = length; x >= -1; x--) path.push({ x, y: -gap - 1 });
    for (let y = -gap; y <= 1; y++) path.push({ x: -1, y });
    path.push({ x: 0, y: 1 }, { x: 0, y: 0 });
    return { path, spring: { x: 0, y: -gap } };
  }
  function spawn(b, rng, spring) {
    const local = spring ? hook(rng) : { path: Array.from({ length: 3 + Math.floor(rng() * 3) }, (_, x) => ({ x, y: 0 })) };
    const turn = Math.floor(rng() * 4), rotate = p => {
      let { x, y } = p; for (let k = 0; k < turn; k++) [x, y] = [-y, x]; return { x, y };
    };
    const pts = local.path.map(rotate), s = local.spring && rotate(local.spring), all = s ? pts.concat(s) : pts;
    const x0 = Math.min(...all.map(p => p.x)), y0 = Math.min(...all.map(p => p.y));
    const w = Math.max(...all.map(p => p.x)) - x0 + 1, h = Math.max(...all.map(p => p.y)) - y0 + 1;
    if (w > b.W - 1 || h > b.H - 1) return null;
    const ox = Math.floor(rng() * (b.W - w + 1)) - x0, oy = Math.floor(rng() * (b.H - h + 1)) - y0;
    const point = p => ({ x: p.x + ox, y: p.y + oy });
    return { path: pts.map(point), spring: s && cell(point(s), b.W) };
  }
  // Random bounded orthogonal routing, with mirrors placed at its turns. Existing
  // mirrors can be shared; new mirrors may not silently reroute an earlier key.
  function route(b, path, reserved, rng, turns) {
    const bodies = new Set(path.map(p => cell(p, b.W))), solids = new Set(b.springs), mirrors = new Map(b.mirrors.map(m => [m.cell, m.slope]));
    const seen = new Set(bodies), start = path.at(-1), dir = M.direction(b, path);
    let nodes = 0;
    function walk(p, dx, dy, bends, added, cells) {
      if (++nodes > 350) return null;
      const q = { x: p.x + dx, y: p.y + dy }, c = cell(q, b.W);
      if (!inside(q, b)) return bends >= turns ? { mirrors: added, cells } : null;
      if (seen.has(c) || solids.has(c)) return null;
      seen.add(c);
      const old = mirrors.get(c);
      let choices = old ? [old] : !turns || bends >= turns + 1 ? [''] : shuffle(['', '', '/', '\\'], rng);
      if (reserved.has(c) && !old) choices = [''];
      for (const slope of choices) {
        const nx = slope === '/' ? -dy : slope === '\\' ? dy : dx, ny = slope === '/' ? -dx : slope === '\\' ? dx : dy;
        const next = walk(q, nx, ny, bends + (slope ? 1 : 0), slope && !old ? added.concat({ cell: c, slope }) : added, cells.concat(c));
        if (next) { seen.delete(c); return next; }
      }
      seen.delete(c); return null;
    }
    return walk(start, ...dir, 0, [], []);
  }
  function skeleton(rng, W, H, kinds, count) {
    let b = { W, H, ropes: [], mirrors: [], springs: [], gates: [], solution: [] };
    const reserved = new Set(), taken = new Set();
    for (let i = 0; i < count; i++) {
      let found = false;
      for (let attempt = 0; attempt < 180; attempt++) {
        const s = spawn(b, rng, kinds.includes('springs')); if (!s) continue;
        const body = s.path.map(p => cell(p, W)), tiles = [...b.springs, ...b.mirrors.map(m => m.cell), ...b.gates.map(g => g.cell)];
        if (body.some(c => taken.has(c) || reserved.has(c) || tiles.includes(c)) ||
            s.spring !== undefined && s.spring !== null && (taken.has(s.spring) || reserved.has(s.spring) || tiles.includes(s.spring))) continue;
        let v = { ...b, ropes: b.ropes.concat([s.path]), springs: s.spring === undefined || s.spring === null ? b.springs : b.springs.concat(s.spring) };
        const paths = Array(i).fill(null).concat([s.path]), actions = [];
        let current = s.path;
        if (s.spring !== undefined && s.spring !== null) {
          const bounce = M.tap(v, paths, i);
          if (!bounce || bounce.event !== 'bounce') continue;
          current = bounce.paths[i]; actions.push(i);
        }
        const noNewTurn = new Set([...reserved, ...taken, ...tiles, ...body]);
        const r = route(v, current, noNewTurn, rng, kinds.includes('mirrors') ? 2 : 0); if (!r) continue;
        v = { ...v, mirrors: v.mirrors.concat(r.mirrors) };
        if (i && kinds.includes('gates')) {
          const occupied = new Set([...body, ...tiles, ...v.mirrors.map(m => m.cell), ...v.springs]);
          const options = r.cells.filter(c => !reserved.has(c) && !taken.has(c) && !occupied.has(c));
          if (!options.length) continue;
          v = { ...v, gates: v.gates.concat({ cell: pick(options, rng), key: i - 1 }) };
          const held = Array(i).fill(null).concat([current]);
          held[i - 1] = b.ropes[i - 1];
          if (kinds.includes('springs')) held[i - 1] = M.tap(b, Array(i - 1).fill(null).concat([b.ropes[i - 1]]), i - 1).paths[i - 1];
          const open = M.tap({ ...v, gates: v.gates.slice(0, -1) }, held, i), closed = M.tap(v, held, i);
          if (!open || open.event !== 'exit' || closed && closed.event === 'exit') continue;
        }
        const solution = b.solution.concat(actions, i);
        const t = trace(v, solution); if (!t || !t.solved) continue;
        b = { ...v, solution }; for (const c of body) taken.add(c);
        for (const c of t.firstUse.keys()) reserved.add(c);
        found = true; break;
      }
      if (!found) return null;
    }
    return b;
  }
  // Insert ordinary ropes where they can leave *during* the key sequence. Their
  // bodies may obstruct later routes but never an earlier certified move. This
  // preserves a proof while building dependencies in both directions.
  function populate(b, rng) {
    const ropes = b.ropes.slice(), moves = b.solution.slice(), core = ropes.length;
    const occupied = new Set(ropes.flat().map(p => cell(p, b.W)));
    const tiles = new Set([...b.springs, ...b.mirrors.map(m => m.cell), ...b.gates.map(g => g.cell)]);
    let t = trace(b, moves), followers = 0, early = 0;
    for (let attempt = 0; attempt < b.W * b.H * 14 && occupied.size < b.W * b.H * .78; attempt++) {
      const dependent = rng() < .85;
      let head, dir;
      if (dependent) {
        const target = pick([...occupied], rng); dir = pick(dirs, rng);
        head = { x: target % b.W - dir[0], y: Math.floor(target / b.W) - dir[1] };
      } else { head = { x: Math.floor(rng() * b.W), y: Math.floor(rng() * b.H) }; dir = pick(dirs, rng); }
      const backward = [head], previous = { x: head.x - dir[0], y: head.y - dir[1] };
      const free = p => inside(p, b) && !occupied.has(cell(p, b.W)) && !tiles.has(cell(p, b.W)) && !backward.some(q => q.x === p.x && q.y === p.y);
      if (!inside(head, b) || occupied.has(cell(head, b.W)) || tiles.has(cell(head, b.W)) || !free(previous)) continue;
      backward.push(previous);
      const want = 3 + Math.floor(rng() * 5);
      while (backward.length < want) {
        const p = backward.at(-1), options = dirs.map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy })).filter(free);
        if (!options.length) break; backward.push(pick(options, rng));
      }
      if (backward.length < 3) continue;
      const path = backward.reverse(), deadline = Math.min(moves.length, ...path.map(p => t.firstUse.get(cell(p, b.W)) ?? moves.length));
      const i = ropes.length, v = { ...b, ropes: ropes.concat([path]) };
      let at = -1;
      for (let k = 0; k <= deadline; k++) {
        const n = M.tap(v, t.states[k].concat([path]), i);
        if (n && n.event === 'exit') { at = k; break; }
      }
      if (at < 0 || at === 0 && early >= Math.max(3, followers / 2)) continue;
      if (at) followers++; else early++;
      ropes.push(path); moves.splice(at, 0, i); for (const p of path) occupied.add(cell(p, b.W));
      b = { ...b, ropes, solution: moves }; t = trace(b, moves);
      if (!t || !t.solved) throw Error('Invalid interleaved circuit certificate');
    }
    return { ...b, circuit: { core, followers, early }, construction: 'circuits' };
  }
  function generate(rng, W, H, kinds) {
    const count = Math.max(2, Math.min(5, 1 + Math.floor(W * H / 70)));
    for (let attempt = 0; attempt < 8; attempt++) {
      const b = skeleton(rng, W, H, kinds, count);
      if (!b) continue;
      const puzzle = populate(b, rng), quality = audit(puzzle);
      // Count only exits strictly between the first and last mechanic moves;
      // ordinary ropes following other ordinary ropes in the opening do not qualify.
      if (quality && quality.interleaved >= Math.min(6, count * 2 - 2)) {
        puzzle.circuit.interleaved = quality.interleaved; return puzzle;
      }
    }
    return null;
  }
  function audit(b, moves = b.solution) {
    const t = trace(b, moves); if (!t || !t.solved) return null;
    const mirrors = new Set(), springs = new Set(), gates = new Set(), turned = new Set(), bounced = new Set();
    const firstCore = t.steps.findIndex(step => step.i < b.circuit.core);
    const lastCore = t.steps.reduce((last, step, i) => step.i < b.circuit.core ? i : last, -1);
    let interleaved = 0;
    for (let k = 0; k < t.steps.length; k++) {
      const step = t.steps[k], before = t.states[k][step.i], hit = new Set();
      if (step.i >= b.circuit.core && k > firstCore && k < lastCore) interleaved++;
      for (const p of step.route.slice(before.length)) if (inside(p, b)) {
        const c = cell(p, b.W);
        if (b.mirrors.some(m => m.cell === c)) { mirrors.add(c); hit.add(c); }
        if (b.gates.some(g => g.cell === c)) gates.add(c);
      }
      if (hit.size >= 2) turned.add(step.i);
      if (step.event === 'bounce') {
        const p = step.route.at(-1), [dx, dy] = M.direction(b, step.route);
        springs.add(cell({ x: p.x + dx, y: p.y + dy }, b.W)); bounced.add(step.i);
      }
    }
    const keyRopes = new Set(b.gates.map(g => g.key));
    return { mirrors, springs, gates, interleaved, multiTurnRopes: turned.size,
      routedKeys: [...keyRopes].filter(i => turned.has(i) && bounced.has(i)).length };
  }
  const api = { generate, skeleton, populate, trace, audit };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MFTwistCircuits = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
