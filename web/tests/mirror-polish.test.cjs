const test = require('node:test'), assert = require('node:assert/strict');
const { base, launch, ready } = require('./browser-helpers.cjs');

test('mirror arrowheads have a joined neck and continuous poses when stopping and restarting on either grid', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage(); await page.addInitScript(() => { requestAnimationFrame = () => 0; });
    await page.goto(base); await ready(page);
    const results = await page.evaluate(() => {
      const results = [], p = (q, r) => ({ q, r }), center = p(4, 4);
      for (const grid of ['square', 'hex']) for (const axis of grid === 'hex' ? [0, 1, 2] : ['/', '\\']) {
        const directions = grid === 'hex' ? MFGame.DIRS : [[1, 0], [0, 1], [-1, 0], [0, -1]];
        for (const incoming of directions) {
          const level = { grid, W: 10, H: 10, mirrors: [grid === 'hex' ? { cell: center, axis } : { cell: center, slope: axis }], springs: [], par: 3 };
          const approach = [MFGame.add(center, incoming, -2), MFGame.add(center, incoming, -1)];
          const outgoing = MFGame.direction(level, [approach.at(-1), center]);
          if (outgoing[0] === incoming[0] && outgoing[1] === incoming[1]) continue;
          const paths = [approach, [MFGame.add(center, outgoing), MFGame.add(center, outgoing, 2)]];
          Object.assign(G, { level, paths, plan: [0, 1, 0], moves: new Map(), auto: false, ended: false, lost: false, loading: false, history: [], camera: { zoom: 1, x: 0, y: 0 } });
          resize(); tap(0); const move = G.moves.get(0); move.progress = move.distance - .000001;
          const near = ropeDrawing(0); update(.001); const stopped = ropeDrawing(0), at = screen(center), to = screen(MFGame.add(center, outgoing));
          const length = Math.hypot(to.x - at.x, to.y - at.y), head = stopped.points.at(-1), join = stopped.points.at(-2);
          const resting = G.paths[0]; G.paths = [resting, null]; G.plan = [0]; tap(0); const resumed = ropeDrawing(0);
          G.moves.clear(); G.paths = [resting, [MFGame.add(center, outgoing, 2), MFGame.add(center, outgoing)]];
          const facing = ropeDrawing(0).points.at(-1);
          results.push({ grid, axis, direction: incoming, joinError: Math.hypot(join.x - at.x, join.y - at.y),
            lead: Math.hypot(head.x - at.x, head.y - at.y) / G.view.scale,
            alignment: stopped.head.x * (to.x - at.x) / length + stopped.head.y * (to.y - at.y) / length,
            facingLead: Math.hypot(facing.x - at.x, facing.y - at.y) / G.view.scale,
            stopJump: Math.hypot(near.points.at(-1).x - head.x, near.points.at(-1).y - head.y),
            startJump: Math.hypot(resumed.points.at(-1).x - head.x, resumed.points.at(-1).y - head.y) });
        }
      }
      cancelGuide(); return results;
    });
    assert.equal(results.length, 20);
    for (const r of results) {
      assert.ok(r.joinError < .001 && Math.abs(r.lead - .26) < .001 && r.alignment > .999, JSON.stringify(r));
      assert.ok(r.stopJump < .01 && r.startJump < .01, JSON.stringify(r));
      assert.ok(r.facingLead + .44 + .44 < 1, 'arrowheads leave a gap: ' + JSON.stringify(r));
    }
  } finally { await browser.close(); }
});

test('reflection sounds follow head arrivals once, including a stop on a mirror, but ignore edge-on passes and resumes', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage(); await page.addInitScript(() => { requestAnimationFrame = () => 0; });
    await page.goto(base); await ready(page);
    const results = await page.evaluate(() => {
      const results = [], p = (q, r) => ({ q, r });
      sfx.thud = () => {}; sfx.pop = () => {}; sfx.win = () => {};
      function setup(grid, mirrors, paths, plan, springs = []) {
        cancelGuide(); $('result').close();
        Object.assign(G, { level: { grid, W: 9, H: 9, mirrors, springs, par: 3 }, paths, plan,
          moves: new Map(), auto: false, ended: false, lost: false, loading: false, history: [], camera: { zoom: 1, x: 0, y: 0 } }); resize();
      }
      for (const grid of ['square', 'hex']) {
        const mirrors = grid === 'square' ? [{ cell: p(3, 2), slope: '\\' }, { cell: p(3, 4), slope: '/' }] : [{ cell: p(3, 1), axis: 1 }, { cell: p(1, 3), axis: 0 }];
        setup(grid, mirrors, [grid === 'square' ? [p(1, 2), p(2, 2)] : [p(1, 1), p(2, 1)]], [0]);
        const sounds = []; sfx.reflect = n => sounds.push({ n, progress: G.moves.get(0).progress }); tap(0);
        const atTap = sounds.length;
        for (let i = 0; i < 2400 && G.moving; i++) update(1 / 120);
        results.push({ grid, atTap, sounds });
      }
      setup('square', [{ cell: p(3, 2), slope: '\\' }], [[p(1, 2), p(2, 2)], [p(3, 3), p(3, 4)]], [0, 1, 0]);
      let reflections = 0, thuds = 0; sfx.reflect = () => reflections++; sfx.thud = () => thuds++; tap(0);
      update(.08); const beforeArrival = reflections; update(.04); const atStop = reflections;
      G.paths = [G.paths[0], null]; G.plan = [0]; tap(0);
      for (let i = 0; i < 2400 && G.moving; i++) update(1 / 120);
      results.push({ beforeArrival, atStop, afterResume: reflections, thuds });
      setup('hex', [{ cell: p(3, 2), axis: 0 }], [[p(1, 2), p(2, 2)]], [0]);
      reflections = 0; tap(0); for (let i = 0; i < 2400 && G.moving; i++) update(1 / 120);
      results.push({ edgeOnSounds: reflections });
      setup('square', [{ cell: p(3, 2), slope: '\\' }], [[p(1, 2), p(2, 2)]], [0, 0], [p(3, 3)]);
      let springs = 0; sfx.spring = () => springs++; reflections = thuds = 0; tap(0);
      for (let i = 0; i < 2400 && G.moving; i++) update(1 / 120);
      results.push({ mirrorThenSpring: { reflections, springs, thuds } }); cancelGuide(); return results;
    });
    for (const r of results.slice(0, 2)) {
      assert.equal(r.atTap, 0); assert.deepEqual(r.sounds.map(s => s.n), [0, 1]);
      for (const [i, distance] of [1, 3].entries()) assert.ok(r.sounds[i].progress >= distance && r.sounds[i].progress < distance + .32, JSON.stringify(r));
    }
    assert.deepEqual(results[2], { beforeArrival: 0, atStop: 1, afterResume: 1, thuds: 0 });
    assert.deepEqual(results[3], { edgeOnSounds: 0 });
    assert.deepEqual(results[4], { mirrorThenSpring: { reflections: 1, springs: 1, thuds: 0 } });
  } finally { await browser.close(); }
});
