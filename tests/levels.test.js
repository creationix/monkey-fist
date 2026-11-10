// Unit tests for levels.js. Open tests/index.html in a browser to run them.
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
  const SEEDS = ['ALPHA', 'BRAVO', 'K7F3Q', 'ZZ999', 'TODDLER', '2', 'MONKEY', 'Q'];

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
  test('a chain 7 layers deep gives the first rope a block cost of 7', () => {
    const ropes = [];
    for (let k = 0; k < 4; k++) {
      ropes.push(rope([2 * k, 2 * k], [2 * k + 1, 2 * k]));          // heads right
      ropes.push(rope([2 * k + 2, 2 * k], [2 * k + 2, 2 * k + 1]));  // heads down
    }
    eq(L.blockCosts(ropes, 9, 9), [7, 6, 5, 4, 3, 2, 1, 0]);
    eq(L.difficulty(ropes, 9, 9), 28);
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

  // ---------- single level generation ----------
  const sampleBuilds = [];
  {
    const rng = L.mulberry32(12345);
    for (let i = 0; i < 300; i++) {
      const W = 4 + Math.floor(rng() * 7), H = Math.min(14, Math.round(W * 1.35));
      const cfg = { W, H, maxLen: 3 + Math.floor(rng() * 6), fill: 0.5 + rng() * 0.46 };
      sampleBuilds.push(L.build(L.mulberry32(Math.floor(rng() * 4294967296)), cfg));
    }
  }
  test('300 random levels: ropes are well formed and never overlap', () => {
    for (const b of sampleBuilds) {
      const seen = new Set();
      for (const p of b.ropes) {
        ok(p.length >= 2, 'rope shorter than 2');
        ok(!L.selfBlocked(p), 'rope blocks itself');
        p.forEach((c, i) => {
          ok(c.x >= 0 && c.y >= 0 && c.x < b.W && c.y < b.H, 'cell off the board');
          const k = c.y * b.W + c.x; ok(!seen.has(k), 'two ropes share a cell'); seen.add(k);
          if (i) ok(Math.abs(c.x - p[i - 1].x) + Math.abs(c.y - p[i - 1].y) === 1, 'rope is not connected');
        });
      }
    }
  });
  test('300 random levels: every one is solvable', () => {
    for (const b of sampleBuilds) ok(L.blockCosts(b.ropes, b.W, b.H) !== null && costsByPlaying(b.ropes, b.W, b.H) !== null);
  });
  test('300 random levels: block cost matches actually playing the level', () => {
    for (const b of sampleBuilds) eq(L.blockCosts(b.ropes, b.W, b.H), costsByPlaying(b.ropes, b.W, b.H));
  });
  test("the knot finder separates ropes in a loop from ropes merely waiting behind it", () => {
    const A = rope([1, 0], [2, 0]), B = rope([4, 0], [3, 0]); // A and B face each other: the knot
    const C = rope([1, 2], [1, 1]);                           // heads up into A: stuck, but not part of the knot
    const D = rope([0, 3], [1, 3]);                           // free
    const a = L.analyse([A, B, C, D], 5, 4);
    eq(a.stuck, [0, 1, 2]); eq(a.knot, [0, 1]);
  });
  test("analysing a board is linear in its size: 4x the ropes on a 16x larger board costs about 16x, where re-scanning every round would cost 64x", () => {
    // long chains are the worst case for a naive solver that re-scans every rope each round
    const chain = n => { const r = []; for (let k = 0; k < n; k++) { r.push(rope([2 * k, 2 * k], [2 * k + 1, 2 * k])); r.push(rope([2 * k + 2, 2 * k], [2 * k + 2, 2 * k + 1])); } return r; };
    const time = n => { const r = chain(n), S = 2 * n + 2; let best = 1e9; for (let i = 0; i < 5; i++) { const t = performance.now(); L.analyse(r, S, S); best = Math.min(best, performance.now() - t); } return best; };
    const small = time(100), big = time(400); // 200 ropes on 202x202, then 800 ropes on 802x802
    window.__scaling = { ropes200: small, ropes800: big };
    eq(L.blockCosts(chain(100), 202, 202)[0], 199);
    ok(big < Math.max(small, 0.05) * 40, "200 ropes took " + small.toFixed(2) + " ms, 800 ropes took " + big.toFixed(2) + " ms");
  });
  test("the same seed and settings always build the same level", () => {
    const cfg = { W: 7, H: 9, maxLen: 5, fill: 0.8 };
    eq(L.build(L.mulberry32(99), cfg), L.build(L.mulberry32(99), cfg));
    ok(JSON.stringify(L.build(L.mulberry32(99), cfg)) !== JSON.stringify(L.build(L.mulberry32(100), cfg)), 'different seeds gave the same level');
  });

  // ---------- level sets ----------
  const sets = {};
  const getSet = (seed, mode, count, twisty) => { const k = mode + count + (twisty ? 'T' : '') + '-' + seed; return sets[k] || (sets[k] = L.generateSet({ seed, mode, count, twisty })); };
  for (const seed of SEEDS.slice(0, 4)) for (const mode of 'ENH') getSet(seed, mode, 20, true); // twisty sets go through every check below too
  const thirdOf = (set, d) => { const r = set.poolScores.indexOf(d), P = set.pool; return r < Math.floor(P / 3) ? 0 : r < Math.floor(2 * P / 3) ? 1 : 2; };

  test('a set has the number of levels asked for', () => {
    for (const seed of SEEDS) for (const mode of 'ENH') for (const count of L.COUNTS) eq(getSet(seed, mode, count).levels.length, count, mode + count + '-' + seed);
  });
  test('the candidate pool is 3x the levels needed', () => {
    for (const seed of SEEDS) for (const count of L.COUNTS) eq(getSet(seed, 'N', count).pool, count * 3);
  });
  test('every level in a set has a unique difficulty', () => {
    for (const k in sets) { const d = sets[k].levels.map(l => l.difficulty); eq(new Set(d).size, d.length, k); }
    for (const k in sets) eq(new Set(sets[k].poolScores).size, sets[k].pool, k + ' pool');
  });
  test('levels run from simplest to hardest', () => {
    for (const k in sets) { const d = sets[k].levels.map(l => l.difficulty); for (let i = 1; i < d.length; i++) ok(d[i] > d[i - 1], k + ' is out of order at ' + i); }
  });
  test('each level rebuilds from its descriptor with the stated difficulty and rope count', () => {
    for (const seed of SEEDS.slice(0, 3)) for (const mode of 'ENH') for (const lv of getSet(seed, mode, 20).levels) {
      const b = L.levelFrom(lv);
      eq([b.W, b.H, b.ropes.length, L.difficulty(b.ropes, b.W, b.H)], [lv.W, lv.H, lv.ropes, lv.difficulty]);
    }
  });
  test('the same code always gives the same set; a different seed gives a different one', () => {
    for (const mode of 'ENH') eq(L.generateSet({ seed: 'K7F3Q', mode, count: 20 }), getSet('K7F3Q', mode, 20));
    ok(JSON.stringify(getSet('ALPHA', 'N', 20).levels) !== JSON.stringify(getSet('BRAVO', 'N', 20).levels));
  });
  test('each level is labelled with the third of the pool it came from', () => {
    for (const k in sets) for (const lv of sets[k].levels) eq(lv.third, thirdOf(sets[k], lv.difficulty), k);
  });
  const perThird = set => [0, 1, 2].map(t => set.levels.filter(l => l.third === t).length);
  test('Easy takes 70% from the easiest third, 20% middle, 10% hardest', () => {
    for (const seed of SEEDS) { eq(perThird(getSet(seed, 'E', 10)), [7, 2, 1]); eq(perThird(getSet(seed, 'E', 20)), [14, 4, 2]); eq(perThird(getSet(seed, 'E', 30)), [21, 6, 3]); }
  });
  test('Hard takes 70% from the hardest third, 20% middle, 10% easiest', () => {
    for (const seed of SEEDS) { eq(perThird(getSet(seed, 'H', 10)), [1, 2, 7]); eq(perThird(getSet(seed, 'H', 20)), [2, 4, 14]); eq(perThird(getSet(seed, 'H', 30)), [3, 6, 21]); }
  });
  test('Normal takes evenly from all three thirds', () => {
    for (const seed of SEEDS) for (const count of L.COUNTS) { const p = perThird(getSet(seed, 'N', count)); ok(Math.max(...p) - Math.min(...p) <= 1, JSON.stringify(p)); }
    eq(perThird(getSet('ALPHA', 'N', 30)), [10, 10, 10]);
    for (const k in sets) if (sets[k].mode === 'N') { const p = perThird(sets[k]); ok(Math.max(...p) - Math.min(...p) <= 1, k); }
  });
  test('for the same seed, Easy is easier than Normal is easier than Hard', () => {
    const mean = s => s.levels.reduce((a, l) => a + l.difficulty, 0) / s.levels.length;
    for (const seed of SEEDS) for (const count of L.COUNTS) {
      const e = mean(getSet(seed, 'E', count)), n = mean(getSet(seed, 'N', count)), h = mean(getSet(seed, 'H', count));
      ok(e < n && n < h, seed + ' ' + count + ': ' + [e, n, h].map(Math.round));
    }
  });
  test('quota splitting hands spare picks to the favoured thirds when a third runs short', () => {
    eq(L.quotas(20, L.MODES.E.weights, [20, 20, 20]), [14, 4, 2]);
    eq(L.quotas(20, L.MODES.E.weights, [5, 20, 20]), [5, 13, 2]);
    eq(L.quotas(20, L.MODES.H.weights, [20, 20, 5]), [2, 13, 5]);
    eq(L.quotas(9, L.MODES.N.weights, [3, 3, 3]), [3, 3, 3]);
    eq(L.quotas(4, L.MODES.N.weights, [1, 1, 2]), [1, 1, 2]);
  });

  // ---------- board quality ----------
  test('no level is a big board of ropes that mostly do not block each other', () => {
    for (const k in sets) for (const lv of sets[k].levels) {
      const b = L.levelFrom(lv), q = L.quality(b.ropes, b.W, b.H);
      ok(b.ropes.length >= L.MIN_ROPES, k + ': too few ropes');
      ok(q.coverage >= L.MIN_COVERAGE, k + ': a ' + b.W + 'x' + b.H + ' board is only ' + Math.round(q.coverage * 100) + '% rope');
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
  test('boards get bigger as the difficulty setting goes up', () => {
    const area = s => s.levels.reduce((a, l) => a + l.W * l.H, 0) / s.levels.length;
    let e = 0, h = 0;
    for (const seed of SEEDS) { e += area(getSet(seed, 'E', 20)); h += area(getSet(seed, 'H', 20)); }
    ok(e < h, 'Easy boards average ' + Math.round(e / SEEDS.length) + ' cells, Hard ' + Math.round(h / SEEDS.length));
  });

  // ---------- Extreme: aims at the difficulty range 100-200 ----------
  const X = {}, xSeeds = SEEDS.slice(0, 4);
  let xMs = 0;
  { const t0 = performance.now(); for (const seed of xSeeds) for (const count of L.COUNTS) X['X' + count + '-' + seed] = L.generateSet({ seed, mode: 'X', count }); xMs = performance.now() - t0; }
  test('Extreme: no level scores below 100 or above 200', () => {
    eq(L.MODES.X.range, [100, 200]);
    for (const k in X) for (const lv of X[k].levels) ok(lv.difficulty >= 100 && lv.difficulty <= 200, k + ' has a level of difficulty ' + lv.difficulty);
  });
  test('Extreme: a set has the number of levels asked for', () => {
    for (const k in X) eq(X[k].levels.length, X[k].count, k);
  });
  test('Extreme: every level has a unique difficulty and they run simplest to hardest', () => {
    for (const k in X) { const d = X[k].levels.map(l => l.difficulty); for (let i = 1; i < d.length; i++) ok(d[i] > d[i - 1], k + ' at ' + i + ': ' + d[i - 1] + ' then ' + d[i]); }
  });
  test('Extreme: the levels fill the range evenly, one per equal slice of 100-200', () => {
    for (const k in X) { const n = X[k].count, span = 101 / n; X[k].levels.forEach((lv, j) => eq(Math.min(n - 1, Math.floor((lv.difficulty - 100) / span)), j, k + ' level ' + (j + 1) + ' (difficulty ' + lv.difficulty + ')')); }
    const d = X['X10-ALPHA'].levels.map(l => l.difficulty);
    ok(d[0] <= 110 && d[9] >= 190, 'a 10-level set should start within 100-110 and end within 190-200, got ' + d[0] + ' and ' + d[9]);
  });
  test('Extreme: boards are at most 12x16, pass the quality rules, and rebuild from their descriptors', () => {
    for (const k in X) for (const lv of X[k].levels) {
      ok(lv.W <= 12 && lv.H <= 16, k + ' has a ' + lv.W + 'x' + lv.H + ' board');
      const b = L.levelFrom(lv);
      eq([b.ropes.length, L.difficulty(b.ropes, b.W, b.H)], [lv.ropes, lv.difficulty], k);
      ok(L.goodEnough(b.ropes, b.W, b.H), k + ' has a board that fails the quality rules');
    }
  });
  test('Extreme: the same code gives the same set, and the work is bounded', () => {
    eq(L.generateSet({ seed: 'ALPHA', mode: 'X', count: 20 }).levels, X['X20-ALPHA'].levels);
    ok(JSON.stringify(X['X20-ALPHA'].levels) !== JSON.stringify(X['X20-BRAVO'].levels));
    for (const k in X) ok(X[k].builds <= X[k].count * 60, k + ' took ' + X[k].builds + ' builds');
    window.__extreme = { sets: Object.keys(X).length, totalMs: Math.round(xMs), builds: Object.keys(X).map(k => k + ':' + X[k].builds) };
  });
  test('Extreme has no twisty variant: the option is ignored and dropped from the code', () => {
    const t = L.generateSet({ seed: 'ALPHA', mode: 'X', count: 10, twisty: true });
    eq(t.twisty, false); eq(t.code, 'X10-ALPHA'); eq(t.levels, X['X10-ALPHA'].levels);
    eq(L.parseCode('x10t-alpha'), { mode: 'X', count: 10, twisty: false, seed: 'ALPHA' });
    eq(L.parseCode('X20-K7F3Q'), { mode: 'X', count: 20, twisty: false, seed: 'K7F3Q' });
    eq(L.encodeCode({ mode: 'X', count: 30, twisty: true, seed: 'Q' }), 'X30-Q');
  });
  test('Extreme is harder than Hard', () => {
    const mean = s => s.levels.reduce((a, l) => a + l.difficulty, 0) / s.levels.length;
    for (const seed of xSeeds) for (const count of L.COUNTS) ok(mean(X['X' + count + '-' + seed]) > mean(getSet(seed, 'H', count)), seed + ' ' + count);
  });

  // ---------- long twisty ropes ----------
  const bends = p => { let n = 0; for (let i = 2; i < p.length; i++) if (p[i].x - p[i - 1].x !== p[i - 1].x - p[i - 2].x || p[i].y - p[i - 1].y !== p[i - 1].y - p[i - 2].y) n++; return n; };
  const ropeStats = (twisty) => { // over the larger boards of several Hard sets
    let ropes = 0, cells = 0, turns = 0, longest = 0;
    for (const seed of SEEDS.slice(0, 4)) for (const lv of getSet(seed, 'H', 20, twisty).levels) {
      if (lv.W < L.TWISTY_W) continue;
      for (const p of L.levelFrom(lv).ropes) { ropes++; cells += p.length; turns += bends(p); longest = Math.max(longest, p.length); }
    }
    return { len: cells / ropes, bends: turns / ropes, longest };
  };
  test('the twisty option gives longer ropes with more bends on larger boards', () => {
    const plain = ropeStats(false), twisty = ropeStats(true);
    window.__ropeStats = { plain, twisty };
    ok(twisty.len > plain.len * 1.3, 'average length ' + twisty.len.toFixed(1) + ' vs ' + plain.len.toFixed(1));
    ok(twisty.bends > plain.bends * 2, 'average bends ' + twisty.bends.toFixed(1) + ' vs ' + plain.bends.toFixed(1));
    ok(twisty.longest > plain.longest, 'longest rope ' + twisty.longest + ' vs ' + plain.longest);
  });
  test('twisty sets use only the larger boards, and plain sets are unaffected', () => {
    for (const k in sets) for (const lv of sets[k].levels) {
      if (sets[k].twisty) { ok(lv.W >= L.TWISTY_W, k + ' has a ' + lv.W + ' wide board'); eq([lv.straight, lv.minLen], [0.2, 4]); }
      else eq([lv.straight, lv.minLen], [0.5, 2]);
    }
    for (const k in sets) if (sets[k].twisty) for (const lv of sets[k].levels) for (const p of L.levelFrom(lv).ropes) ok(p.length >= 4, k + ' has a rope of length ' + p.length);
    ok(JSON.stringify(getSet('ALPHA', 'N', 20, true).levels) !== JSON.stringify(getSet('ALPHA', 'N', 20, false).levels));
  });

  test('a twisty set that runs out of distinct difficulties returns fewer levels rather than repeating one', () => {
    for (const seed of SEEDS.slice(0, 4)) {
      const s = L.generateSet({ seed, mode: 'N', count: 30, twisty: true });
      ok(s.levels.length >= 10 && s.levels.length <= 30, s.levels.length + ' levels');
      eq(new Set(s.levels.map(l => l.difficulty)).size, s.levels.length);
      ok(s.builds <= 30 * 60, s.builds + ' builds');
    }
  });

  // ---------- share codes ----------
  test('share codes round-trip', () => {
    for (const mode of 'ENH') for (const count of L.COUNTS) {
      const code = L.encodeCode({ mode, count, seed: 'K7F3Q' });
      eq(L.parseCode(code), { mode, count, twisty: false, seed: 'K7F3Q' });
      eq(L.parseCode(L.encodeCode({ mode, count, twisty: true, seed: 'K7F3Q' })), { mode, count, twisty: true, seed: 'K7F3Q' });
      eq(getSet('K7F3Q', mode, count).code, code);
    }
    eq(L.parseCode('  h30-abc12 '), { mode: 'H', count: 30, twisty: false, seed: 'ABC12' });
    eq(L.parseCode('n20t-abc12'), { mode: 'N', count: 20, twisty: true, seed: 'ABC12' });
    eq(getSet('K7F3Q', 'H', 20, true).code, 'H20T-K7F3Q');
  });
  test('bad share codes are rejected', () => {
    for (const bad of ['', 'hello', 'Z20-ABCDE', 'N20X-ABCDE', 'N15-ABCDE', 'N20-', 'N20ABCDE', 'N20-AB CD', 'N20-ABCDEFGHIJK']) eq(L.parseCode(bad), null, JSON.stringify(bad));
  });
  test('random seeds are five unambiguous characters', () => {
    for (let i = 0; i < 200; i++) ok(/^[A-HJ-NP-Z2-9]{5}$/.test(L.randomSeed()), 'bad seed');
  });

  // ---------- the built-in levels ----------
  let campaign, campaignMs;
  test('the built-in set has 60 levels, simplest first, all different', () => {
    const t0 = performance.now(); campaign = L.generateSet(L.CAMPAIGN); campaignMs = performance.now() - t0;
    eq(campaign.levels.length, 60);
    const d = campaign.levels.map(l => l.difficulty);
    for (let i = 1; i < d.length; i++) ok(d[i] > d[i - 1], 'out of order at ' + i);
    eq(L.generateSet(L.CAMPAIGN).levels, campaign.levels, 'not repeatable');
  });
  test('the built-in set starts gently on a small board and ends hard on a big one', () => {
    const first = campaign.levels[0], last = campaign.levels[59];
    ok(first.W <= L.SMALL_W && first.difficulty <= 3, 'level 1 is ' + first.W + 'x' + first.H + ' with difficulty ' + first.difficulty);
    ok(last.W >= 8 && last.difficulty > 20 * Math.max(1, first.difficulty), 'level 60 is ' + last.W + 'x' + last.H + ' with difficulty ' + last.difficulty);
  });
  test('generating the built-in set takes under 3 seconds', () => { ok(campaignMs < 3000, Math.round(campaignMs) + ' ms'); });

  // ---------- report ----------
  const failed = results.filter(r => !r.ok);
  window.__tests = { total: results.length, passed: results.length - failed.length, failed: failed.map(r => r.name + ' — ' + r.error), campaignMs: Math.round(campaignMs),
    campaign: campaign && campaign.levels.map(l => [l.W + 'x' + l.H, l.ropes, l.difficulty]) };
  document.title = (failed.length ? 'FAIL ' : 'PASS ') + window.__tests.passed + '/' + results.length;
  const out = document.getElementById('out');
  out.innerHTML = '<h1 class="' + (failed.length ? 'bad' : 'good') + '">' + document.title + '</h1>' +
    results.map(r => '<div class="' + (r.ok ? 'good' : 'bad') + '">' + (r.ok ? '✓ ' : '✗ ') + r.name + ' <small>' + Math.round(r.ms) + ' ms</small>' + (r.ok ? '' : '<pre></pre>') + '</div>').join('');
  [...out.querySelectorAll('pre')].forEach((el, i) => { el.textContent = failed[i].error; });
})();
