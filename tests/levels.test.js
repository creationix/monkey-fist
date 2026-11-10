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
  const bends = p => { let n = 0; for (let i = 2; i < p.length; i++) if (p[i].x - p[i - 1].x !== p[i - 1].x - p[i - 2].x || p[i].y - p[i - 1].y !== p[i - 1].y - p[i - 2].y) n++; return n; };
  const SEEDS = ['ALPHA', 'BRAVO', 'K7F3Q', 'ZZ999', 'TODDLER', '2'];

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

  // ---------- single level generation ----------
  const sampleBuilds = [];
  {
    const rng = L.mulberry32(12345);
    for (let i = 0; i < 300; i++) {
      const W = 4 + Math.floor(rng() * 13), st = L.STYLES[i % 3]; // every width up to 16 and every rope style
      const cfg = { W, H: L.heightFor(W), maxLen: st.lenLo + Math.floor(rng() * 4), fill: 0.5 + rng() * 0.47, straight: st.straight, minLen: st.minLen };
      sampleBuilds.push(Object.assign(L.build(L.mulberry32(Math.floor(rng() * 4294967296)), cfg), { cfg }));
    }
  }
  test('300 random levels: ropes are well formed and never overlap', () => {
    for (const b of sampleBuilds) {
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
  test('300 random levels: every one is solvable', () => {
    for (const b of sampleBuilds) ok(L.blockCosts(b.ropes, b.W, b.H) !== null && costsByPlaying(b.ropes, b.W, b.H) !== null);
  });
  test('300 random levels: block cost matches actually playing the level', () => {
    for (const b of sampleBuilds) { const c = costsByPlaying(b.ropes, b.W, b.H); eq(L.blockCosts(b.ropes, b.W, b.H), c); eq(b.costs, c); }
  });
  test('300 random levels: difficulty is block cost plus bends over every rope, never rises as free ropes leave, and ends at 0', () => {
    let zero = 0;
    for (const b of sampleBuilds) {
      const costs = costsByPlaying(b.ropes, b.W, b.H);
      let want = 0; b.ropes.forEach((p, i) => { want += costs[i] + bends(p); });
      eq(L.difficulty(b.ropes, b.W, b.H), want);
      eq(L.nothingBlocked(b.ropes, b.W, b.H), costs.every(c => c === 0));
      eq(want === 0, costs.every(c => c === 0) && b.ropes.every(p => bends(p) === 0));
      // play it out: the score never rises as free ropes leave, and ends at 0
      let ropes = b.ropes, last = want;
      for (let guard = 0; ropes.length && guard < 500; guard++) {
        const c = L.blockCosts(ropes, b.W, b.H); ropes = ropes.filter((_, i) => i !== c.indexOf(0));
        const now = ropes.length ? L.difficulty(ropes, b.W, b.H) : 0;
        ok(now <= last, 'removing a free rope raised the score from ' + last + ' to ' + now); last = now;
      }
      eq(last, 0); if (!want) zero++;
    }
    window.__zeroBoards = zero;
  });
  test('the same seed and settings always build the same level', () => {
    const cfg = { W: 7, H: 9, maxLen: 5, fill: 0.8, straight: 0.5, minLen: 2 };
    eq(L.build(L.mulberry32(99), cfg), L.build(L.mulberry32(99), cfg));
    ok(JSON.stringify(L.build(L.mulberry32(99), cfg)) !== JSON.stringify(L.build(L.mulberry32(100), cfg)), 'different seeds gave the same level');
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

  test('the difficulty ranges are Easy 2-40, Normal 20-80, Hard 60-130, Extreme 100-200', () => {
    eq(L.PLAYER_MODES.map(m => L.MODES[m].range), [[2, 40], [20, 80], [60, 130], [100, 200]]);
  });
  test('a set has the number of levels asked for', () => {
    for (const k in sets) eq(sets[k].levels.length, sets[k].count, k);
  });
  test('every level is inside its setting\'s difficulty range (Extreme never below 100)', () => {
    for (const k in sets) { const r = L.MODES[sets[k].mode].range; for (const lv of sets[k].levels) ok(lv.difficulty >= r[0] && lv.difficulty <= r[1], k + ' has a level of difficulty ' + lv.difficulty); }
  });
  test('every level in a set has a unique difficulty, and they run simplest to hardest', () => {
    for (const k in sets) { const d = sets[k].levels.map(l => l.difficulty); for (let i = 1; i < d.length; i++) ok(d[i] > d[i - 1], k + ' at ' + i + ': ' + d[i - 1] + ' then ' + d[i]); }
  });
  test('a set fills its range evenly: one level in each equal slice', () => {
    for (const k in sets) {
      const s = sets[k], e = L.slotEdges(s.mode, s.count);
      s.levels.forEach((lv, j) => ok(lv.difficulty >= e[j] && lv.difficulty < e[j + 1], k + ' level ' + (j + 1) + ' has difficulty ' + lv.difficulty + ', outside its slice ' + e[j].toFixed(1) + '-' + e[j + 1].toFixed(1)));
    }
    const d = getSet('ALPHA', 'X', 10).levels.map(l => l.difficulty);
    ok(d[0] <= 110 && d[9] >= 190, 'a 10-level Extreme set should start within 100-110 and end within 190-200, got ' + d[0] + ' and ' + d[9]);
  });
  test('each level rebuilds from its descriptor with the stated difficulty and rope count', () => {
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
    let worst = '';
    for (const k in sets) { ok(sets[k].builds <= sets[k].count * 60, k + ' took ' + sets[k].builds + ' builds'); if (!worst || sets[k].ms > sets[worst].ms) worst = k; }
    window.__sets = { count: Object.keys(sets).length, totalMs: Math.round(setMs), slowest: worst + ' ' + Math.round(sets[worst].ms) + ' ms, ' + sets[worst].builds + ' builds' };
    ok(sets[worst].ms < 3000, 'slowest set: ' + window.__sets.slowest);
  });
  test('harder settings mean harder levels and bigger boards', () => {
    const mean = (s, f) => s.levels.reduce((a, l) => a + f(l), 0) / s.levels.length;
    for (const seed of SEEDS) for (const count of L.COUNTS) {
      const d = L.PLAYER_MODES.map(m => mean(getSet(seed, m, count), l => l.difficulty)), a = L.PLAYER_MODES.map(m => mean(getSet(seed, m, count), l => l.W * l.H));
      ok(d[0] < d[1] && d[1] < d[2] && d[2] < d[3], seed + ' ' + count + ' difficulty: ' + d.map(Math.round));
      ok(a[0] < a[1] && a[1] < a[2] && a[2] < a[3], seed + ' ' + count + ' board cells: ' + a.map(Math.round));
    }
  });

  // ---------- board sizes ----------
  test('ordinary sets stay within 12x16; bigger-boards sets may go up to 16x22', () => {
    let biggest = 0;
    for (const k in sets) for (const lv of sets[k].levels) {
      eq(lv.H, L.heightFor(lv.W));
      if (sets[k].big) { ok(lv.W <= 16 && lv.H <= 22, k + ' has a ' + lv.W + 'x' + lv.H + ' board'); biggest = Math.max(biggest, lv.W); }
      else ok(lv.W <= 12 && lv.H <= 16, k + ' has a ' + lv.W + 'x' + lv.H + ' board');
    }
    ok(biggest > 12, 'no bigger-boards set actually used a board wider than 12');
  });

  // ---------- rope styles ----------
  test('rope style is random per board: every style turns up, and twisty boards have longer ropes with more bends', () => {
    const stat = { short: [0, 0, 0, 0], medium: [0, 0, 0, 0], twisty: [0, 0, 0, 0] }; // boards, ropes, cells, bends
    for (const k in sets) for (const lv of sets[k].levels) {
      const st = stat[lv.style]; st[0]++;
      if (lv.W < L.TWISTY_W) { ok(lv.style !== 'twisty', k + ' has a twisty ' + lv.W + ' wide board'); continue; }
      for (const p of L.levelFrom(lv).ropes) { st[1]++; st[2] += p.length; st[3] += bends(p); }
    }
    const len = s => stat[s][2] / stat[s][1], bnd = s => stat[s][3] / stat[s][1];
    window.__styles = { boards: [stat.short[0], stat.medium[0], stat.twisty[0]], avgLength: ['short', 'medium', 'twisty'].map(s => +len(s).toFixed(1)), avgBends: ['short', 'medium', 'twisty'].map(s => +bnd(s).toFixed(1)) };
    ok(stat.short[0] > 20 && stat.medium[0] > 20 && stat.twisty[0] > 20, 'boards per style: ' + window.__styles.boards);
    ok(len('twisty') > len('medium') && len('medium') > len('short'), 'average rope lengths ' + window.__styles.avgLength);
    ok(bnd('twisty') > bnd('short') * 2, 'average bends ' + window.__styles.avgBends);
  });
  test('Easy and Normal sets mix styles within a single set', () => {
    for (const seed of SEEDS) for (const mode of 'EN') { const kinds = new Set(getSet(seed, mode, 30).levels.map(l => l.style)); ok(kinds.size >= 2, mode + '30-' + seed + ' is all ' + [...kinds]); }
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

  // ---------- share codes ----------
  test('share codes round-trip', () => {
    for (const mode of L.PLAYER_MODES) for (const count of L.COUNTS) for (const big of [false, true]) {
      const code = L.encodeCode({ mode, count, big, seed: 'K7F3Q' });
      eq(L.parseCode(code), { mode, count, big, seed: 'K7F3Q' });
    }
    eq(getSet('K7F3Q', 'N', 20).code, 'N20-K7F3Q');
    eq(getSet('K7F3Q', 'X', 20, true).code, 'X20B-K7F3Q');
    eq(L.parseCode('  h30-abc12 '), { mode: 'H', count: 30, big: false, seed: 'ABC12' });
    eq(L.parseCode('x10b-abc12'), { mode: 'X', count: 10, big: true, seed: 'ABC12' });
  });
  test('bad share codes are rejected', () => {
    for (const bad of ['', 'hello', 'Z20-ABCDE', 'C60-MONKEYFIST', 'N20T-ABCDE', 'N15-ABCDE', 'N20-', 'N20ABCDE', 'N20-AB CD', 'N20-ABCDEFGHIJK']) eq(L.parseCode(bad), null, JSON.stringify(bad));
  });
  test('random seeds are five unambiguous characters', () => {
    for (let i = 0; i < 200; i++) ok(/^[A-HJ-NP-Z2-9]{5}$/.test(L.randomSeed()), 'bad seed');
  });

  // ---------- the built-in levels ----------
  let campaign, campaignMs;
  test('the built-in set has 60 levels covering difficulty 1-200, simplest first, all different', () => {
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
    ok(lv[9].difficulty <= 20, 'level 10 has difficulty ' + lv[9].difficulty);       // a sixth of the way through, a tenth of the way up
    ok(lv[29].difficulty <= 80, 'level 30 has difficulty ' + lv[29].difficulty);      // halfway through, well under halfway up
    ok(lv[59].difficulty >= 195, 'level 60 has difficulty ' + lv[59].difficulty);
    for (const l of lv) ok(l.W <= 12, 'a built-in level uses a ' + l.W + ' wide board');
  });
  test('generating the built-in set takes under 3 seconds', () => { ok(campaignMs < 3000, Math.round(campaignMs) + ' ms'); });

  // ---------- report ----------
  const failed = results.filter(r => !r.ok);
  window.__tests = { total: results.length, passed: results.length - failed.length, failed: failed.map(r => r.name + ' — ' + r.error), campaignMs: Math.round(campaignMs),
    campaign: campaign && campaign.levels.map(l => [l.W + 'x' + l.H, l.ropes, l.difficulty, l.style]) };
  document.title = (failed.length ? 'FAIL ' : 'PASS ') + window.__tests.passed + '/' + results.length;
  const out = document.getElementById('out');
  out.innerHTML = '<h1 class="' + (failed.length ? 'bad' : 'good') + '">' + document.title + '</h1>' +
    results.map(r => '<div class="' + (r.ok ? 'good' : 'bad') + '">' + (r.ok ? '✓ ' : '✗ ') + r.name + ' <small>' + Math.round(r.ms) + ' ms</small>' + (r.ok ? '' : '<pre></pre>') + '</div>').join('');
  [...out.querySelectorAll('pre')].forEach((el, i) => { el.textContent = failed[i].error; });
})();
