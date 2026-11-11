// Unit tests for levels.js. Open tests/index.html in a browser to run them.
// The first part covers the original game; the sliding game's tests are marked as such.
'use strict';
(() => {
  const L = MFLevels, results = [];
  const test = (name, fn) => {
    const t0 = performance.now();
    try { fn(); results.push({ name, ok: true, ms: performance.now() - t0 }); }
    catch (e) { results.push({ name, ok: false, ms: performance.now() - t0, error: String(e && e.message || e) }); }
  };
  const ok = (cond, msg) => { if (!cond) throw new Error(msg || 'assertion failed'); };
  const eq = (a, b, msg) => { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) throw new Error((msg ? msg + ': ' : '') + 'expected ' + y + ', got ' + x); };
  // rope([x,y], [x,y], ...) from tail to head
  const rope = (...cells) => cells.map(([x, y]) => ({ x, y }));
  const sum = a => a.reduce((x, y) => x + y, 0);

  // An independent way to get block costs: actually play the level. Each round, every rope
  // with a clear path leaves at once; a rope's cost is the round it leaves in.
  function costsByPlaying(ropes, W, H) {
    const occ = L.occupancy(ropes, W, H), cost = new Array(ropes.length).fill(-1);
    let left = ropes.length;
    for (let round = 0; left > 0; round++) {
      const free = [];
      ropes.forEach((p, i) => { if (cost[i] < 0 && L.ray(p, occ, W, H).clear) free.push(i); });
      if (!free.length) return null;
      for (const i of free) { cost[i] = round; for (const c of ropes[i]) occ[c.y * W + c.x] = -1; left--; }
    }
    return cost;
  }
  const bends = p => { let n = 0; for (let i = 2; i < p.length; i++) if (p[i].x - p[i - 1].x !== p[i - 1].x - p[i - 2].x || p[i].y - p[i - 1].y !== p[i - 1].y - p[i - 2].y) n++; return n; };
  const SEEDS = ['ALPHA', 'BRAVO', 'K7F3Q', 'ZZ999', 'TODDLER', '2'];
  const CAMPAIGN_FINGERPRINT = 3458906560; // hashString of the original game's 60 built-in levels (see the test that uses it)

  // ---------- block cost ----------
  test('a rope with a clear path costs 0', () => {
    eq(L.blockCosts([rope([0, 1], [1, 1])], 3, 3), [0]);
    eq(L.difficulty([rope([0, 1], [1, 1])], 3, 3), 0);
  });
  test('a three-rope chain costs 2, 1, 0', () => {
    const A = rope([0, 0], [1, 0]);  // heads right, into B
    const B = rope([3, 0], [3, 1]);  // heads down, into C
    const C = rope([4, 2], [3, 2]);  // heads left, clear
    eq(L.blockCosts([A, B, C], 5, 3), [2, 1, 0]);
    eq(L.difficulty([A, B, C], 5, 3), 3);
  });
  const chain = n => { const r = []; for (let k = 0; k < n; k++) { r.push(rope([2 * k, 2 * k], [2 * k + 1, 2 * k])); r.push(rope([2 * k + 2, 2 * k], [2 * k + 2, 2 * k + 1])); } return r; };
  test('a chain 7 layers deep gives the first rope a block cost of 7', () => {
    eq(L.blockCosts(chain(4), 9, 9), [7, 6, 5, 4, 3, 2, 1, 0]);
    eq(L.difficulty(chain(4), 9, 9), 28);
  });
  test('with several blockers the deepest one decides, and blockers need not be adjacent', () => {
    const A = rope([0, 0], [1, 0]);  // heads right: B and C are both in the way
    const B = rope([3, 1], [3, 0]);  // heads up, clear
    const C = rope([5, 0], [5, 1]);  // heads down, into D
    const D = rope([5, 2], [6, 2]);  // heads right, into E
    const E = rope([7, 2], [7, 3]);  // heads down, clear
    eq(L.blockCosts([A, B, C, D, E], 8, 5), [3, 0, 2, 1, 0]);
  });
  test('ropes that block each other in a loop are reported unsolvable', () => {
    const A = rope([0, 0], [1, 0]), B = rope([3, 0], [2, 0]); // facing each other
    eq(L.blockCosts([A, B], 4, 1), null);
    eq(L.difficulty([A, B], 4, 1), Infinity);
  });
  test('a rope whose own body is in its path is unsolvable', () => {
    const U = rope([2, 0], [2, 1], [1, 1], [0, 1], [0, 0], [1, 0]); // curls round and points at its own tail
    ok(L.selfBlocked(U), 'selfBlocked should spot it');
    eq(L.blockCosts([U], 3, 2), null);
  });
  test('the knot finder separates ropes in a loop from ropes merely waiting behind it', () => {
    const A = rope([1, 0], [2, 0]), B = rope([4, 0], [3, 0]); // A and B face each other: the knot
    const C = rope([1, 2], [1, 1]);                           // heads up into A: stuck, but not part of the knot
    const D = rope([0, 3], [1, 3]);                           // free
    const a = L.analyse([A, B, C, D], 5, 4);
    eq(a.stuck, [0, 1, 2]); eq(a.knot, [0, 1]);
  });
  test('the score falls to 0 as ropes are removed in a valid order (the live tangle score)', () => {
    let ropes = chain(4), last = L.difficulty(ropes, 9, 9);
    eq(last, 28);
    while (ropes.length) {
      const costs = L.blockCosts(ropes, 9, 9), free = costs.indexOf(0);
      ropes = ropes.filter((_, i) => i !== free);
      const now = ropes.length ? L.difficulty(ropes, 9, 9) : 0;
      ok(now < last || (now === 0 && last === 0), 'removing a free rope took the score from ' + last + ' to ' + now);
      last = now;
    }
    eq(last, 0);
  });

  // ---------- bends ----------
  test('bends are counted per rope: straight 0, an L 1, a Z or U 2', () => {
    eq(L.bendsOf(rope([0, 0], [1, 0])), 0);
    eq(L.bendsOf(rope([0, 0], [1, 0], [2, 0], [3, 0])), 0);
    eq(L.bendsOf(rope([0, 0], [1, 0], [1, 1])), 1);
    eq(L.bendsOf(rope([0, 0], [1, 0], [1, 1], [2, 1])), 2); // Z
    eq(L.bendsOf(rope([0, 0], [0, 1], [1, 1], [1, 0])), 2); // U
    eq(L.bendsOf(rope([0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2])), 4); // staircase
  });
  test('every rope scores its block cost plus its bends, blocked or free', () => {
    const A = rope([0, 2], [0, 1], [1, 1], [1, 0], [2, 0]); // 3 bends, heads right along the top row, into B
    const B = rope([4, 0], [4, 1], [3, 1], [3, 2]);         // 2 bends, heads down off the board: free
    eq(L.blockCosts([A, B], 5, 3), [1, 0]);
    eq(L.ropeScores([A, B], [1, 0]), [4, 2]);   // A: cost 1 + 3 bends. B: free, but still 2 bends
    eq(L.difficulty([A, B], 5, 3), 6);
    eq(L.difficulty([B], 5, 3), 2);             // once A is gone nothing is blocked, but B's bends still count
    ok(!L.nothingBlocked([A, B], 5, 3) && L.nothingBlocked([B], 5, 3), 'nothingBlocked should be false with A on the board and true without');
    eq(L.difficulty([rope([0, 0], [1, 0])], 5, 3), 0); // only straight, unblocked ropes score 0
  });
  test('bends add to a chain: the same three-rope chain scores more when the waiting ropes wind around', () => {
    const C = rope([4, 2], [3, 2]);                         // heads left, clear
    const straight = [rope([0, 0], [1, 0]), rope([3, 0], [3, 1]), C];           // costs 2, 1, 0 and no bends
    const bendy = [rope([0, 1], [0, 0], [1, 0]), rope([4, 0], [3, 0], [3, 1]), C]; // same heads, one bend each
    eq(L.blockCosts(bendy, 5, 3), [2, 1, 0]);
    eq(L.difficulty(straight, 5, 3), 3);
    eq(L.difficulty(bendy, 5, 3), 5);
  });
  test('analysing a board is linear in its size: 4x the ropes on a 16x larger board costs about 16x, where re-scanning every round would cost 64x', () => {
    // long chains are the worst case for a naive solver that re-scans every rope each round
    const time = n => { const r = chain(n), S = 2 * n + 2; let best = 1e9; for (let i = 0; i < 5; i++) { const t = performance.now(); L.analyse(r, S, S); best = Math.min(best, performance.now() - t); } return best; };
    const small = time(100), big = time(400); // 200 ropes on 202x202, then 800 ropes on 802x802
    window.__scaling = { ropes200: small, ropes800: big };
    eq(L.blockCosts(chain(100), 202, 202)[0], 199);
    ok(big < Math.max(small, 0.05) * 40, '200 ropes took ' + small.toFixed(2) + ' ms, 800 ropes took ' + big.toFixed(2) + ' ms');
  });

  // ---------- building one level (rope by rope without ever closing a loop, then turning ropes) ----------
  // 300 boards across every setting, slot and rope style, with and without bigger boards.
  const boards = [];
  {
    const rng = L.mulberry32(12345);
    for (let i = 0; boards.length < 300 && i < 3000; i++) {
      const mode = L.PLAYER_MODES[i % 4], r = L.MODES[mode].range, lo = r[0] + Math.floor(rng() * (r[1] - r[0] - 3)), hi = lo + 3.4;
      const cfg = L.plan(rng, lo, hi, i % 5 === 0, i), b = L.construct(L.mulberry32(cfg.seed), cfg);
      if (b) boards.push(Object.assign(b, { cfg }));
    }
  }
  test('300 built boards were produced', () => { eq(boards.length, 300); });
  test('300 built boards: ropes are well formed and never overlap', () => {
    for (const b of boards) {
      const seen = new Set();
      for (const p of b.ropes) {
        ok(p.length >= b.cfg.minLen, 'rope shorter than the minimum');
        ok(!L.selfBlocked(p), 'rope blocks itself');
        p.forEach((c, i) => {
          ok(c.x >= 0 && c.y >= 0 && c.x < b.W && c.y < b.H, 'cell off the board');
          const k = c.y * b.W + c.x; ok(!seen.has(k), 'two ropes share a cell'); seen.add(k);
          if (i) ok(Math.abs(c.x - p[i - 1].x) + Math.abs(c.y - p[i - 1].y) === 1, 'rope is not connected');
        });
      }
    }
  });
  test('300 built boards: every one is solvable, with nothing needing to be untangled', () => {
    for (const b of boards) ok(L.blockCosts(b.ropes, b.W, b.H) !== null && costsByPlaying(b.ropes, b.W, b.H) !== null);
  });
  test('300 built boards: the block costs the builder tracked as it went match actually playing the level', () => {
    for (const b of boards) { const c = costsByPlaying(b.ropes, b.W, b.H); eq(L.blockCosts(b.ropes, b.W, b.H), c); eq(b.costs, c); }
  });
  test('300 built boards: the score never goes over the top of the slot it was built for', () => {
    let inSlot = 0;
    for (const b of boards) {
      const s = L.difficulty(b.ropes, b.W, b.H), top = Math.ceil(b.cfg.hi) - 1;
      ok(s <= top, 'built for a slot topping out at ' + top + ' but scored ' + s);
      if (s >= Math.ceil(b.cfg.lo)) inSlot++;
    }
    window.__aim = { landedInSlot: inSlot + '/300' };
    ok(inSlot >= 60, 'only ' + inSlot + ' of 300 boards landed in the slot they were built for'); // the rest fall short, and can still fill an easier slot
  });
  test('300 built boards: trimmed to their ropes, and never wider than tall', () => {
    for (const b of boards) {
      const xs = b.ropes.flat().map(c => c.x), ys = b.ropes.flat().map(c => c.y);
      eq([Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)], [0, b.W - 1, 0, b.H - 1], 'an empty outer row or column was left on');
      ok(b.H >= b.W, 'a ' + b.W + 'x' + b.H + ' board is wider than tall');
      ok(b.W <= b.cfg.H && b.H <= b.cfg.H, 'a board grew beyond the one it was built on');
    }
  });
  test('300 built boards: difficulty is block cost plus bends over every rope, never rises as free ropes leave, and ends at 0', () => {
    for (const b of boards) {
      const costs = costsByPlaying(b.ropes, b.W, b.H);
      let want = 0; b.ropes.forEach((p, i) => { want += costs[i] + bends(p); });
      eq(L.difficulty(b.ropes, b.W, b.H), want);
      eq(L.nothingBlocked(b.ropes, b.W, b.H), costs.every(c => c === 0));
      let ropes = b.ropes, last = want;
      for (let guard = 0; ropes.length && guard < 500; guard++) {
        const c = L.blockCosts(ropes, b.W, b.H); ropes = ropes.filter((_, i) => i !== c.indexOf(0));
        const now = ropes.length ? L.difficulty(ropes, b.W, b.H) : 0;
        ok(now <= last, 'removing a free rope raised the score from ' + last + ' to ' + now); last = now;
      }
      eq(last, 0);
    }
  });
  test('built boards come with their own solution: the ropes in order of block cost', () => {
    for (const b of boards) { eq(b.taps.length, b.ropes.length); eq(b.slides, 0); eq(b.knots, 0); ok(L.play(b.ropes, b.W, b.H, b.taps).every(p => p === null), 'the solution left ropes on the board'); }
  });
  test('the same plan and seed always build the same level', () => {
    const b = boards[7], again = L.construct(L.mulberry32(b.cfg.seed), b.cfg);
    eq([again.W, again.H, again.ropes, again.costs], [b.W, b.H, b.ropes, b.costs]);
    ok(JSON.stringify(L.construct(L.mulberry32(b.cfg.seed + 1), b.cfg) || {}) !== JSON.stringify({ W: b.W, H: b.H, ropes: b.ropes, costs: b.costs }), 'a different seed gave the same level');
  });

  // ---------- level sets: every setting fills its difficulty range ----------
  const sets = {};
  let setMs = 0;
  const getSet = (seed, mode, count, big) => {
    const k = L.encodeCode({ seed, mode, count, big });
    if (!sets[k]) { const t0 = performance.now(); sets[k] = L.generateSet({ seed, mode, count, big }); sets[k].ms = performance.now() - t0; setMs += sets[k].ms; }
    return sets[k];
  };
  for (const seed of SEEDS) for (const mode of L.PLAYER_MODES) for (const count of L.COUNTS) getSet(seed, mode, count, false);
  for (const seed of SEEDS.slice(0, 3)) for (const mode of L.PLAYER_MODES) getSet(seed, mode, 20, true); // "bigger boards" sets go through every check too

  test('the difficulty ranges are Easy 2-40, Normal 20-80, Hard 60-150, Extreme 150-500, and bigger boards double the top', () => {
    eq(L.PLAYER_MODES.map(m => L.rangeFor(m, false)), [[2, 40], [20, 80], [60, 150], [150, 500]]);
    eq(L.PLAYER_MODES.map(m => L.rangeFor(m, true)), [[2, 80], [20, 160], [60, 300], [150, 1000]]);
  });
  test('a set has the number of levels asked for', () => {
    for (const k in sets) eq(sets[k].levels.length, sets[k].count, k);
  });
  test('every level is inside its setting\'s difficulty range (Extreme never below 150)', () => {
    for (const k in sets) { const r = L.rangeFor(sets[k].mode, sets[k].big); for (const lv of sets[k].levels) ok(lv.difficulty >= r[0] && lv.difficulty <= r[1], k + ' has a level of difficulty ' + lv.difficulty); }
  });
  test('every level in a set has a unique difficulty, and they run simplest to hardest', () => {
    for (const k in sets) { const d = sets[k].levels.map(l => l.difficulty); for (let i = 1; i < d.length; i++) ok(d[i] > d[i - 1], k + ' at ' + i + ': ' + d[i - 1] + ' then ' + d[i]); }
  });
  test('a set fills its range evenly: one level in each equal slice', () => {
    for (const k in sets) {
      const s = sets[k], e = L.slotEdges(s.mode, s.count, s.big);
      s.levels.forEach((lv, j) => ok(lv.difficulty >= e[j] && lv.difficulty < e[j + 1], k + ' level ' + (j + 1) + ' has difficulty ' + lv.difficulty + ', outside its slice ' + e[j].toFixed(1) + '-' + e[j + 1].toFixed(1)));
    }
    const d = getSet('ALPHA', 'X', 10).levels.map(l => l.difficulty);
    ok(d[0] <= 185 && d[9] >= 465, 'a 10-level Extreme set should start within 150-185 and end within 465-500, got ' + d[0] + ' and ' + d[9]);
  });
  test('each level rebuilds from its descriptor with the stated size, difficulty and rope count', () => {
    for (const k in sets) for (const lv of sets[k].levels) {
      const b = L.levelFrom(lv);
      eq([b.W, b.H, b.ropes.length, L.difficulty(b.ropes, b.W, b.H)], [lv.W, lv.H, lv.ropes, lv.difficulty], k);
    }
  });
  test('the same code always gives the same set; a different seed gives a different one', () => {
    for (const mode of L.PLAYER_MODES) eq(L.generateSet({ seed: 'K7F3Q', mode, count: 20 }).levels, getSet('K7F3Q', mode, 20).levels);
    ok(JSON.stringify(getSet('ALPHA', 'N', 20).levels) !== JSON.stringify(getSet('BRAVO', 'N', 20).levels));
    ok(JSON.stringify(getSet('ALPHA', 'X', 20, true).levels) !== JSON.stringify(getSet('ALPHA', 'X', 20, false).levels), 'bigger boards should give a different set');
  });
  test('the work is bounded: never more than 60 builds per level asked for', () => {
    let worst = '', builds = 0;
    for (const k in sets) { ok(sets[k].builds <= sets[k].count * 60, k + ' took ' + sets[k].builds + ' builds'); builds += sets[k].builds; if (!worst || sets[k].ms > sets[worst].ms) worst = k; }
    window.__sets = { count: Object.keys(sets).length, totalMs: Math.round(setMs), totalBuilds: builds, slowest: worst + ' ' + Math.round(sets[worst].ms) + ' ms, ' + sets[worst].builds + ' builds' };
    ok(sets[worst].ms < 3000, 'slowest set: ' + window.__sets.slowest);
  });
  test('harder settings mean harder levels with more ropes', () => {
    const mean = (s, f) => sum(s.levels.map(f)) / s.levels.length;
    for (const seed of SEEDS) for (const count of L.COUNTS) {
      const d = L.PLAYER_MODES.map(m => mean(getSet(seed, m, count), l => l.difficulty)), r = L.PLAYER_MODES.map(m => mean(getSet(seed, m, count), l => l.ropes));
      ok(d[0] < d[1] && d[1] < d[2] && d[2] < d[3], seed + ' ' + count + ' difficulty: ' + d.map(Math.round));
      ok(r[0] < r[1] && r[1] < r[2] && r[2] < r[3], seed + ' ' + count + ' ropes per level: ' + r.map(x => x.toFixed(1)));
    }
  });

  // ---------- depth: minimum average block cost per rope ----------
  const avgCostOf = lv => { const b = L.levelFrom(lv), c = L.blockCosts(b.ropes, b.W, b.H); return sum(c) / c.length; };
  test('the depth floor rises with difficulty, from 1.5 at tangle 10 up to 8 at tangle 400', () => {
    eq([0, 9, 10, 19, 20, 39, 40, 59, 60, 99, 100, 149, 150, 249, 250, 399, 400, 1000].map(L.floorFor), [0, 0, 1.5, 1.5, 2, 2, 2.5, 2.5, 3, 3, 4, 4, 5, 5, 6.5, 6.5, 8, 8]);
  });
  test('every level meets the minimum average block cost per rope for its difficulty', () => {
    const seen = { E: [], N: [], H: [], X: [] };
    for (const k in sets) for (const lv of sets[k].levels) {
      const avg = avgCostOf(lv), need = L.floorFor(lv.difficulty);
      ok(Math.abs(avg - lv.avgCost) < 1e-9, k + ': stored average ' + lv.avgCost + ' but rebuilt level has ' + avg);
      ok(avg >= need, k + ' has a level of difficulty ' + lv.difficulty + ' averaging ' + avg.toFixed(2) + ' per rope, below the minimum of ' + need);
      seen[sets[k].mode].push(avg);
    }
    const mean = a => sum(a) / a.length;
    window.__depth = { avgCost: L.PLAYER_MODES.map(m => +mean(seen[m]).toFixed(2)), lowest: L.PLAYER_MODES.map(m => +Math.min(...seen[m]).toFixed(2)) };
    ok(mean(seen.E) < mean(seen.N) && mean(seen.N) < mean(seen.H) && mean(seen.H) < mean(seen.X), 'average cost per rope by setting: ' + window.__depth.avgCost);
  });

  // ---------- packed boards ----------
  test('boards are packed: at least 78% rope past the smallest sizes, and typically about 85-90%', () => {
    const cov = { E: [], N: [], H: [], X: [] };
    for (const k in sets) for (const lv of sets[k].levels) { const b = L.levelFrom(lv); cov[sets[k].mode].push(L.quality(b.ropes, b.W, b.H).coverage); }
    const median = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
    window.__coverage = L.PLAYER_MODES.map(m => Math.round(median(cov[m]) * 100));
    for (const m of 'NHX') ok(median(cov[m]) >= 0.82, m + ' median coverage is ' + Math.round(median(cov[m]) * 100) + '%');
  });
  test('the hardest Extreme level is a big, full, deep board', () => {
    const tops = [];
    for (const seed of SEEDS) {
      const lv = getSet(seed, 'X', 30).levels[29], b = L.levelFrom(lv), c = L.blockCosts(b.ropes, b.W, b.H), q = L.quality(b.ropes, b.W, b.H);
      const deepest = Math.max(...c), free = c.filter(x => x === 0).length;
      tops.push(lv.W + 'x' + lv.H + ' ' + lv.ropes + ' ropes ' + Math.round(q.coverage * 100) + '% tangle ' + lv.difficulty + ' deepest ' + deepest + ' free ' + free);
      ok(lv.difficulty >= 480, seed + ': tangle ' + lv.difficulty);
      ok(lv.W >= 11 && lv.ropes >= 35, seed + ': ' + lv.W + 'x' + lv.H + ' with ' + lv.ropes + ' ropes');
      ok(deepest >= 15, seed + ': deepest chain only ' + deepest);
      ok(free <= lv.ropes * 0.25, seed + ': ' + free + ' of ' + lv.ropes + ' ropes are free at the start');
    }
    window.__hardest = tops;
  });
  test('a rope may sit in a pocket and wait on older ropes, but a loop is never closed', () => {
    // On packed boards most ropes are blocked from the start, yet every board must still play out.
    let waitingAtOnce = 0, ropes = 0;
    for (const b of boards) { const c = costsByPlaying(b.ropes, b.W, b.H); ok(c !== null, 'a built board cannot be solved'); ropes += c.length; waitingAtOnce += c.filter(x => x > 0).length; }
    ok(waitingAtOnce > ropes * 0.6, 'only ' + Math.round(waitingAtOnce / ropes * 100) + '% of ropes are blocked at the start');
  });

  // ---------- board sizes ----------
  test('ordinary sets stay within 12x16; bigger-boards sets may go up to 16x22; none is wider than tall', () => {
    let biggest = 0;
    for (const k in sets) for (const lv of sets[k].levels) {
      ok(lv.H >= lv.W, k + ' has a ' + lv.W + 'x' + lv.H + ' board');
      if (sets[k].big) { ok(lv.W <= 16 && lv.H <= 22, k + ' has a ' + lv.W + 'x' + lv.H + ' board'); biggest = Math.max(biggest, lv.W); }
      else ok(lv.W <= 12 && lv.H <= 16, k + ' has a ' + lv.W + 'x' + lv.H + ' board');
    }
    ok(biggest > 12, 'no bigger-boards set actually used a board wider than 12');
  });

  // ---------- rope styles ----------
  test('rope style is random per level: every style turns up, and twisty levels have longer ropes with more bends', () => {
    const stat = { short: [0, 0, 0, 0], medium: [0, 0, 0, 0], twisty: [0, 0, 0, 0] }; // levels, ropes, cells, bends
    for (const k in sets) for (const lv of sets[k].levels) {
      const st = stat[lv.style]; st[0]++;
      ok(lv.style !== 'twisty' || lv.boardW >= L.TWISTY_W, k + ' built a twisty level on a ' + lv.boardW + ' wide board');
      for (const p of L.levelFrom(lv).ropes) { st[1]++; st[2] += p.length; st[3] += bends(p); }
    }
    const len = s => stat[s][2] / stat[s][1], bnd = s => stat[s][3] / stat[s][1];
    window.__styles = { levels: [stat.short[0], stat.medium[0], stat.twisty[0]], avgLength: ['short', 'medium', 'twisty'].map(s => +len(s).toFixed(1)), avgBends: ['short', 'medium', 'twisty'].map(s => +bnd(s).toFixed(1)) };
    ok(stat.short[0] > 20 && stat.medium[0] > 20 && stat.twisty[0] > 20, 'levels per style: ' + window.__styles.levels);
    ok(len('twisty') > len('medium') && len('medium') > len('short'), 'average rope lengths ' + window.__styles.avgLength);
    ok(bnd('twisty') > bnd('short') * 2, 'average bends ' + window.__styles.avgBends);
  });
  test('sets mix styles within a single set', () => {
    for (const seed of SEEDS) for (const mode of L.PLAYER_MODES) { const kinds = new Set(getSet(seed, mode, 30).levels.map(l => l.style)); ok(kinds.size >= 2, mode + '30-' + seed + ' is all ' + [...kinds]); }
  });

  // ---------- board quality ----------
  test('no level is a board with much empty space, or a big board of ropes that mostly do not block each other', () => {
    for (const k in sets) for (const lv of sets[k].levels) {
      const b = L.levelFrom(lv), q = L.quality(b.ropes, b.W, b.H);
      ok(b.ropes.length >= L.MIN_ROPES, k + ': too few ropes');
      ok(q.coverage >= (b.W > L.SMALL_W ? L.MIN_COVERAGE : L.MIN_COVERAGE_SMALL), k + ': a ' + b.W + 'x' + b.H + ' board is only ' + Math.round(q.coverage * 100) + '% rope');
      if (b.W > L.SMALL_W) ok(q.blockedShare >= L.MIN_BLOCKED_SHARE, k + ': only ' + Math.round(q.blockedShare * 100) + '% of ropes on a ' + b.W + 'x' + b.H + ' board are blocked');
    }
  });
  test('the quality gate rejects sparse and trivial boards', () => {
    const free = [rope([0, 0], [1, 0]), rope([0, 2], [1, 2]), rope([0, 4], [1, 4])]; // three ropes that just leave
    ok(!L.goodEnough(free, 8, 11), 'a nearly empty 8x11 board passed');
    ok(!L.goodEnough(free.slice(0, 2), 4, 5), 'a two-rope board passed');
    const rows = []; for (let y = 0; y < 8; y++) rows.push(rope([0, y], [1, y], [2, y], [3, y], [4, y], [5, y]));
    ok(!L.goodEnough(rows, 6, 8), 'a full 6x8 board where nothing blocks anything passed');
  });

  // ---------- the sliding game: rules ----------
  test('a sliding rope follows its own bends, then carries straight on', () => {
    const r = rope([0, 2], [0, 1], [0, 0], [1, 0], [2, 0]); // up the left side, then heading right along the top
    eq(L.advance(r, 0), r);
    eq(L.advance(r, 1), rope([0, 1], [0, 0], [1, 0], [2, 0], [3, 0]));
    eq(L.advance(r, 3), rope([1, 0], [2, 0], [3, 0], [4, 0], [5, 0]));
    eq(L.bendsOf(L.advance(r, 1)), 1); eq(L.bendsOf(L.advance(r, 3)), 0); // it straightens out as it goes
    eq(L.advance(rope([0, 0], [0, 1]), 2), rope([0, 2], [0, 3]));
  });
  // A knot. X heads right along the top with a gap before B; B heads down and is blocked by J;
  // J heads left along the bottom and is blocked by X's tail.
  const X = rope([0, 2], [0, 1], [0, 0], [1, 0], [2, 0]), KB = rope([5, 0], [5, 1]), KJ = rope([6, 2], [5, 2]), KNOT = [X, KB, KJ];
  test('a knot: ropes waiting on each other in a loop, which the original game cannot solve and a slide undoes', () => {
    eq(L.loopsOf(KNOT, 7, 3), [[0, 1, 2]]);
    eq(L.blockCosts(KNOT, 7, 3), null);                       // in the original game nothing here can ever leave
    eq(L.deadRopes(KNOT, 7, 3), []);                          // in the sliding game nothing is lost
    const after = L.play(KNOT, 7, 3, [0]);                     // tap X: it slides until it meets B, drawing its tail off J's way out
    eq(after[0], rope([0, 0], [1, 0], [2, 0], [3, 0], [4, 0])); eq(after[1], KB); eq(after[2], KJ);
    eq(L.loopsOf(after, 7, 3), []);
    eq(L.blockCosts(after, 7, 3), [2, 1, 0]);                 // now an ordinary chain: J, then B, then X
    ok(L.play(KNOT, 7, 3, [0, 2, 1, 0]).every(p => p === null), 'slide X, then J, B and X leave');
    ok(L.play(KNOT, 7, 3, [0, 1]).some(Boolean), 'tapping B while J is in its way does not get it out');
  });
  test('tapping a rope that is hard against another moves nothing', () => {
    const after = L.play(KNOT, 7, 3, [1, 1, 1]); // B's head is right against J
    eq(after, KNOT);
  });
  // A trap. Y heads right with a gap before B; B heads up and waits on J; J heads down, through that gap.
  const TY = rope([0, 2], [1, 2]), TB = rope([3, 2], [3, 1]), TJ = rope([3, 0], [2, 0], [2, 1]), TRAP = [TY, TB, TJ];
  test('a trap: a slide that ties the board for good', () => {
    eq(L.loopsOf(TRAP, 4, 4), []); eq(L.blockCosts(TRAP, 4, 4), [2, 1, 0]); // as it stands: J, B, Y
    ok(L.play(TRAP, 4, 4, [2, 1, 0]).every(p => p === null));
    const after = L.play(TRAP, 4, 4, [0]);                                  // but slide Y first and it lies across J's way out, hard against B
    eq(after[0], rope([1, 2], [2, 2]));
    eq(L.deadRopes(after, 4, 4), [0, 1, 2]);
    eq(L.solve(after, 4, 4).solved, false);
    eq(L.deadRopes(TRAP, 4, 4), []);
  });
  test('ropes facing each other can never leave, however much room there is between them', () => {
    const A = rope([0, 0], [1, 0]), B = rope([7, 0], [6, 0]);
    eq(L.solve([A, B], 8, 1).solved, false);
    eq(L.deadRopes([A, B], 8, 1), []);                  // the quick check is generous: each could get past if the other were not coming
    eq(L.deadRopes(L.play([A, B], 8, 1, [0, 1]), 8, 1), [0, 1]); // once they meet it sees it
    eq(L.deadRopes([rope([0, 0], [1, 0]), rope([3, 0], [2, 0])], 4, 1), [0, 1]);
    eq(L.deadRopes([rope([2, 0], [2, 1], [1, 1], [0, 1], [0, 0], [1, 0])], 3, 2), [0]); // nor can a rope pointing at itself
  });
  test('the solver finds the taps, says so when there are none, and stops at its budget', () => {
    const s = L.solve(KNOT, 7, 3);
    eq(s.solved, true); ok(L.play(KNOT, 7, 3, s.moves).every(p => p === null), 'the taps it gave do not clear the board');
    eq(L.solve(TRAP, 4, 4).solved, true); eq(L.solve(TRAP, 4, 4).moves[0] !== 0, true);
    eq(L.solve([], 3, 3).solved, true);
    eq(L.solve(chain(40), 82, 82, 5).solved, null); // 80 ropes cannot be cleared in 5 looks
    eq(L.solve(chain(40), 82, 82).moves.length, 80);
  });

  // ---------- the sliding game: levels ----------
  const slideSets = {};
  let slideMs = 0;
  const slideSet = (seed, mode, count, big) => {
    const k = L.encodeCode({ seed, mode, count, big, slide: true });
    if (!slideSets[k]) { const t0 = performance.now(); slideSets[k] = L.generateSet({ seed, mode, count, big, slide: true }); slideSets[k].ms = performance.now() - t0; slideMs += slideSets[k].ms; }
    return slideSets[k];
  };
  for (const seed of SEEDS.slice(0, 4)) for (const mode of L.PLAYER_MODES) for (const count of [10, 30]) slideSet(seed, mode, count, false);
  for (const mode of L.PLAYER_MODES) slideSet('ALPHA', mode, 20, true);
  const eachSlide = fn => { for (const k in slideSets) for (const lv of slideSets[k].levels) fn(lv, k, L.levelFrom(lv)); };
  const cleared = left => left.every(p => p === null);

  test('sliding sets fill the same difficulty ranges: the number asked for, one level per slice, simplest first', () => {
    for (const k in slideSets) {
      const s = slideSets[k], e = L.slotEdges(s.mode, s.count, s.big);
      eq(s.levels.length, s.count, k); ok(s.slide, k + ' is not marked as a sliding set');
      s.levels.forEach((lv, j) => ok(lv.difficulty >= e[j] && lv.difficulty < e[j + 1], k + ' level ' + (j + 1) + ' has difficulty ' + lv.difficulty + ', outside its slice'));
    }
  });
  test('every sliding level comes with a solution that clears the board', () => {
    eachSlide((lv, k, b) => {
      eq([b.W, b.H, b.ropes.length, b.score, b.knots, b.traps], [lv.W, lv.H, lv.ropes, lv.difficulty, lv.knots, lv.traps], k);
      ok(cleared(L.play(b.ropes, b.W, b.H, b.taps)), k + ': a level of difficulty ' + lv.difficulty + ' is not cleared by its own solution');
    });
  });
  test('a sliding level\'s difficulty is that of the board once its knots are undone, and it meets the depth floor', () => {
    eachSlide((lv, k, b) => {
      const undone = L.play(b.ropes, b.W, b.H, b.taps.slice(0, b.slides)); // just the slides
      ok(undone.every(Boolean), k + ': a rope left the board during the slides');
      eq(L.loopsOf(undone, b.W, b.H), [], k + ': still knotted after the slides');
      eq(L.difficulty(undone, b.W, b.H), lv.difficulty, k);
      eq(L.blockCosts(undone, b.W, b.H), b.costs, k);
      ok(Math.abs(sum(b.costs) / b.costs.length - lv.avgCost) < 1e-9 && lv.avgCost >= L.floorFor(lv.difficulty), k + ': difficulty ' + lv.difficulty + ' averages ' + lv.avgCost);
    });
  });
  test('the knot floor rises with difficulty, and every sliding level has at least that many knots', () => {
    eq([0, 14, 15, 39, 40, 79, 80, 149, 150, 249, 250, 1000].map(L.knotFloorFor), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    const per = { E: [], N: [], H: [], X: [] };
    eachSlide((lv, k) => { ok(lv.knots >= L.knotFloorFor(lv.difficulty), k + ': difficulty ' + lv.difficulty + ' has only ' + lv.knots + ' knots'); per[slideSets[k].mode].push(lv.knots); });
    const mean = a => sum(a) / a.length, m = L.PLAYER_MODES.map(x => +mean(per[x]).toFixed(1));
    window.__slide = { knotsPerLevel: m, mostKnots: L.PLAYER_MODES.map(x => Math.max(...per[x])) };
    ok(m[0] < m[1] && m[1] < m[2] && m[2] < m[3], 'knots per level by setting: ' + m);
  });
  test('a knotted level cannot be solved the old way: tapping only ropes that can leave gets stuck', () => {
    let knotted = 0;
    eachSlide((lv, k, b) => {
      if (!lv.knots) return;
      knotted++;
      ok(L.loopsOf(b.ropes, b.W, b.H).length > 0 && L.blockCosts(b.ropes, b.W, b.H) === null, k + ': a level with ' + lv.knots + ' knots has no loop');
      ok(costsByPlaying(b.ropes, b.W, b.H) === null, k + ': a level with knots was cleared by ropes leaving one after another');
      ok(b.slides >= lv.knots, k + ': fewer slides than knots');
    });
    ok(knotted > 300, 'only ' + knotted + ' knotted levels were made');
  });
  test('no sliding level starts with a rope that can never leave, and none turns up along its solution', () => {
    eachSlide((lv, k, b) => {
      for (let i = 0; i <= b.taps.length; i += Math.max(1, b.taps.length >> 3)) {
        const left = L.play(b.ropes, b.W, b.H, b.taps.slice(0, i)).filter(Boolean);
        eq(L.deadRopes(left, b.W, b.H), [], k + ': dead ropes ' + i + ' taps into the solution of a level of difficulty ' + lv.difficulty);
      }
    });
  });
  test('the traps counted in a level are real: each is a slide open at the start after which the board cannot be solved', () => {
    let traps = 0, slides = 0, levels = 0, withTrap = 0;
    eachSlide((lv, k, b) => {
      const occ = L.occupancy(b.ropes, b.W, b.H); let n = 0; levels++;
      b.ropes.forEach((p, i) => {
        const r = L.ray(p, occ, b.W, b.H);
        if (r.clear || !r.dist) return;
        slides++;
        const next = b.ropes.slice(); next[i] = L.advance(p, r.dist);
        if (L.deadRopes(next, b.W, b.H).length) { n++; eq(L.solve(next, b.W, b.H, 2000).solved, false, k); }
      });
      eq(n, lv.traps, k); traps += n; if (n) withTrap++;
    });
    Object.assign(window.__slide, { slidesOpenAtStart: +(slides / levels).toFixed(1), trapsPerLevel: +(traps / levels).toFixed(1), levelsWithATrap: withTrap + '/' + levels });
    ok(withTrap > levels * 0.4, 'only ' + withTrap + ' of ' + levels + ' sliding levels have a trap open at the start');
  });
  test('the solver clears every sliding level, guided by the level\'s own solution or not', () => {
    let worst = 0, unguided = 0, levels = 0;
    eachSlide((lv, k, b) => {
      const s = L.solve(b.ropes, b.W, b.H, 4000, b.taps); levels++;
      eq(s.solved, true, k); ok(cleared(L.play(b.ropes, b.W, b.H, s.moves)), k + ': the solver\'s taps do not clear the board');
      worst = Math.max(worst, s.nodes);
      const u = L.solve(b.ropes, b.W, b.H, 4000);
      if (u.solved) { unguided++; ok(cleared(L.play(b.ropes, b.W, b.H, u.moves)), k + ': the unguided taps do not clear the board'); } else ok(u.solved === null, k + ': the solver called a solvable level unsolvable');
    });
    Object.assign(window.__slide, { guidedWorstNodes: worst, unguidedSolved: unguided + '/' + levels });
    ok(worst < 200, 'following a known solution took ' + worst + ' looks');
  });
  test('the solver keeps finding a way after a player wanders off the known one', () => {
    // A careless player makes any legal move; a move that loses the board is taken back. After every
    // move the solver is asked for a way out, given the last one it found.
    const rng = L.mulberry32(31); let calls = 0, found = 0, lost = 0, gaveUp = 0, finished = 0, games = 0;
    for (const code of ['N10S-ALPHA', 'H10S-ALPHA', 'X10S-ALPHA']) for (const lv of slideSets[code].levels) {
      const b = L.levelFrom(lv); let cur = b.ropes.slice(), plan = b.taps.slice(), left = cur.length; games++;
      for (let guard = 0; guard < 400 && left; guard++) {
        const live = cur.map((p, i) => (p ? i : -1)).filter(i => i >= 0), ps = live.map(i => cur[i]), occ = L.occupancy(ps, b.W, b.H), pool = [];
        ps.forEach((p, j) => { const r = L.ray(p, occ, b.W, b.H); if (r.clear) pool.push([live[j], -1]); else if (r.dist > 0) pool.push([live[j], r.dist]); });
        if (!pool.length) break;
        const m = pool[Math.floor(rng() * pool.length)], next = cur.slice(); next[m[0]] = m[1] < 0 ? null : L.advance(cur[m[0]], m[1]);
        const live2 = next.map((p, i) => (p ? i : -1)).filter(i => i >= 0), ps2 = live2.map(i => next[i]);
        if (!ps2.length) { left = 0; break; }
        const at = new Map(live2.map((i, j) => [i, j])), s = L.solve(ps2, b.W, b.H, 4000, plan.filter(i => at.has(i)).map(i => at.get(i))); calls++;
        if (s.solved) { found++; ok(cleared(L.play(ps2, b.W, b.H, s.moves)), 'a way out that does not work'); cur = next; left = ps2.length; plan = s.moves.map(j => live2[j]); }
        else if (s.solved === false) lost++; else gaveUp++;
      }
      if (!left) finished++;
    }
    Object.assign(window.__slide, { wandering: { asked: calls, wayFound: found, lostForGood: lost, gaveUp, gamesFinished: finished + '/' + games } });
    eq(finished, games); ok(lost > 0, 'no careless move ever lost a board'); ok(gaveUp < calls * 0.05, 'the solver gave up on ' + gaveUp + ' of ' + calls + ' boards');
  });
  test('sliding boards: at least 72% rope past the smallest sizes, within the size limits, never wider than tall', () => {
    eachSlide((lv, k, b) => {
      const q = L.quality(b.ropes, b.W, b.H, b.costs), big = slideSets[k].big;
      ok(b.H >= b.W && b.W <= (big ? 16 : 12) && b.H <= (big ? 22 : 16), k + ' has a ' + b.W + 'x' + b.H + ' board');
      ok(q.coverage >= (b.W > L.SMALL_W ? L.MIN_COVERAGE_SLIDE : L.MIN_COVERAGE_SMALL), k + ': a ' + b.W + 'x' + b.H + ' board is only ' + Math.round(q.coverage * 100) + '% rope');
    });
  });
  test('the same code always gives the same sliding set, and it is not the original game\'s set', () => {
    for (const mode of L.PLAYER_MODES) eq(L.generateSet({ seed: 'ALPHA', mode, count: 10, slide: true }).levels, slideSet('ALPHA', mode, 10).levels);
    ok(JSON.stringify(slideSet('ALPHA', 'N', 30).levels) !== JSON.stringify(getSet('ALPHA', 'N', 30).levels), 'N30S-ALPHA and N30-ALPHA are the same levels');
    ok(JSON.stringify(slideSet('ALPHA', 'N', 30).levels) !== JSON.stringify(slideSet('BRAVO', 'N', 30).levels));
  });
  test('generating a sliding set is bounded too, and quick', () => {
    let worst = '';
    for (const k in slideSets) { ok(slideSets[k].builds <= slideSets[k].count * 60, k + ' took ' + slideSets[k].builds + ' builds'); if (!worst || slideSets[k].ms > slideSets[worst].ms) worst = k; }
    Object.assign(window.__slide, { sets: Object.keys(slideSets).length, totalMs: Math.round(slideMs), slowest: worst + ' ' + Math.round(slideSets[worst].ms) + ' ms, ' + slideSets[worst].builds + ' builds' });
    ok(slideSets[worst].ms < 5000, 'slowest sliding set: ' + window.__slide.slowest);
  });

  // ---------- share codes ----------
  test('share codes round-trip', () => {
    for (const mode of L.PLAYER_MODES) for (const count of L.COUNTS) for (const big of [false, true]) {
      for (const slide of [false, true]) {
        const code = L.encodeCode({ mode, count, big, slide, seed: 'K7F3Q' });
        eq(L.parseCode(code), { mode, count, big, slide, seed: 'K7F3Q' });
      }
    }
    eq(getSet('K7F3Q', 'N', 20).code, 'N20-K7F3Q');
    eq(getSet('K7F3Q', 'X', 20, true).code, 'X20B-K7F3Q');
    eq(slideSet('K7F3Q', 'N', 20).code, 'N20S-K7F3Q');
    eq(slideSet('K7F3Q', 'X', 20, true).code, 'X20BS-K7F3Q');
    eq(L.parseCode('  h30-abc12 '), { mode: 'H', count: 30, big: false, slide: false, seed: 'ABC12' });
    eq(L.parseCode('x10b-abc12'), { mode: 'X', count: 10, big: true, slide: false, seed: 'ABC12' });
    eq(L.parseCode('x10bs-abc12'), { mode: 'X', count: 10, big: true, slide: true, seed: 'ABC12' });
    eq(L.parseCode(' n20 s - abc12'), { mode: 'N', count: 20, big: false, slide: true, seed: 'ABC12' });
  });
  test('bad share codes are rejected', () => {
    for (const bad of ['', 'hello', 'Z20-ABCDE', 'C60-MONKEYFIST', 'N20T-ABCDE', 'N20SB-ABCDE', 'N20SS-ABCDE', 'N15-ABCDE', 'N20-', 'N20ABCDE', 'N20-AB CD', 'N20-ABCDEFGHIJK']) eq(L.parseCode(bad), null, JSON.stringify(bad));
  });
  test('random seeds are five unambiguous characters', () => {
    for (let i = 0; i < 200; i++) ok(/^[A-HJ-NP-Z2-9]{5}$/.test(L.randomSeed()), 'bad seed');
  });

  // ---------- the built-in levels ----------
  let campaign, campaignMs;
  test('the built-in set has 60 levels covering difficulty 1-300, simplest first, all different', () => {
    const t0 = performance.now(); campaign = L.generateSet(L.CAMPAIGN); campaignMs = performance.now() - t0;
    eq(campaign.levels.length, 60);
    const d = campaign.levels.map(l => l.difficulty), e = L.slotEdges('C', 60);
    for (let i = 1; i < d.length; i++) ok(d[i] > d[i - 1], 'out of order at ' + i);
    d.forEach((x, j) => ok(x >= e[j] && x < e[j + 1], 'level ' + (j + 1) + ' has difficulty ' + x + ', outside its slice'));
    eq(L.generateSet(L.CAMPAIGN).levels, campaign.levels, 'not repeatable');
  });
  test('the built-in set starts gently on a small board, climbs slowly at first, and ends hard', () => {
    const lv = campaign.levels;
    ok(lv[0].W <= L.SMALL_W && lv[0].difficulty <= 3, 'level 1 is ' + lv[0].W + 'x' + lv[0].H + ' with difficulty ' + lv[0].difficulty);
    ok(lv[9].difficulty <= 31, 'level 10 has difficulty ' + lv[9].difficulty);       // a sixth of the way through, a tenth of the way up
    ok(lv[29].difficulty <= 114, 'level 30 has difficulty ' + lv[29].difficulty);     // halfway through, well under halfway up
    ok(lv[59].difficulty >= 290, 'level 60 has difficulty ' + lv[59].difficulty);
    for (const l of lv) ok(l.W <= 12 && l.H <= 16, 'a built-in level uses a ' + l.W + 'x' + l.H + ' board');
  });
  test('the built-in levels meet the depth floor for their difficulty', () => {
    for (const lv of campaign.levels) { const avg = avgCostOf(lv); ok(avg >= L.floorFor(lv.difficulty), 'a built-in level of difficulty ' + lv.difficulty + ' averages only ' + avg.toFixed(2)); }
  });
  test('generating the built-in set takes under 3 seconds', () => { ok(campaignMs < 3000, Math.round(campaignMs) + ' ms'); });

  // The original game was not regenerated when the sliding game was added, so players keep their
  // progress in it. That only holds while its levels stay exactly as they were.
  test('the original game\'s built-in levels are exactly the ones players already have progress in', () => {
    eq(L.hashString(JSON.stringify(campaign.levels.map(l => L.levelFrom(l).ropes))), CAMPAIGN_FINGERPRINT);
  });
  let slideCampaign, slideCampaignMs;
  test('the sliding game has its own 60 built-in levels over the same range, simplest first, all different', () => {
    const t0 = performance.now(); slideCampaign = L.generateSet(L.CAMPAIGN_SLIDE); slideCampaignMs = performance.now() - t0;
    eq(slideCampaign.levels.length, 60); eq(slideCampaign.slide, true);
    const d = slideCampaign.levels.map(l => l.difficulty), e = L.slotEdges('C', 60);
    d.forEach((x, j) => ok(x >= e[j] && x < e[j + 1], 'level ' + (j + 1) + ' has difficulty ' + x + ', outside its slice'));
    eq(L.generateSet(L.CAMPAIGN_SLIDE).levels, slideCampaign.levels, 'not repeatable');
    ok(slideCampaignMs < 5000, Math.round(slideCampaignMs) + ' ms');
  });
  test('the sliding built-in levels start without knots, bring them in early, and end with many', () => {
    const lv = slideCampaign.levels, firstKnot = lv.findIndex(l => l.knots > 0);
    for (const l of lv) { const b = L.levelFrom(l); ok(cleared(L.play(b.ropes, b.W, b.H, b.taps)), 'a built-in sliding level of difficulty ' + l.difficulty + ' is not cleared by its solution'); ok(l.knots >= L.knotFloorFor(l.difficulty) && l.W <= 12 && l.H <= 16); }
    ok(lv[0].knots === 0 && lv[1].knots === 0 && lv[0].W <= L.SMALL_W, 'level 1 has ' + lv[0].knots + ' knots on a ' + lv[0].W + ' wide board');
    ok(firstKnot >= 2 && firstKnot <= 9, 'the first knot is in level ' + (firstKnot + 1));
    ok(lv[59].knots >= 5 && lv[59].difficulty >= 290, 'level 60 has ' + lv[59].knots + ' knots at difficulty ' + lv[59].difficulty);
    Object.assign(window.__slide, { campaignMs: Math.round(slideCampaignMs), campaign: lv.map(l => [l.W + 'x' + l.H, l.ropes, l.difficulty, l.knots, l.traps]) });
  });

  // ---------- report ----------
  const failed = results.filter(r => !r.ok);
  window.__tests = { total: results.length, passed: results.length - failed.length, failed: failed.map(r => r.name + ' — ' + r.error), campaignMs: Math.round(campaignMs),
    campaign: campaign && campaign.levels.map(l => [l.W + 'x' + l.H, l.ropes, l.difficulty, l.style, +l.avgCost.toFixed(1)]) };
  document.title = (failed.length ? 'FAIL ' : 'PASS ') + window.__tests.passed + '/' + results.length;
  const out = document.getElementById('out');
  out.innerHTML = '<h1 class="' + (failed.length ? 'bad' : 'good') + '">' + document.title + '</h1>' +
    results.map(r => '<div class="' + (r.ok ? 'good' : 'bad') + '">' + (r.ok ? '✓ ' : '✗ ') + r.name + ' <small>' + Math.round(r.ms) + ' ms</small>' + (r.ok ? '' : '<pre></pre>') + '</div>').join('');
  [...out.querySelectorAll('pre')].forEach((el, i) => { el.textContent = failed[i].error; });
})();
