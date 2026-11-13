const test = require('node:test'), assert = require('node:assert/strict');
const { base, launch, ready } = require('./browser-helpers.cjs');

test('queued exits yield at crossings while separate routes remain concurrent on both grids', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, reducedMotion }), errors = [];
      page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => { requestAnimationFrame = () => 0; });
      await page.goto(base); await ready(page);
      const results = await page.evaluate(() => {
        const results = [], p = (q, r) => ({ q, r });
        function pointDistance(p, a, b) {
          const x = b.x - a.x, y = b.y - a.y, d = x * x + y * y;
          const t = d ? Math.max(0, Math.min(1, ((p.x - a.x) * x + (p.y - a.y) * y) / d)) : 0;
          return Math.hypot(p.x - a.x - t * x, p.y - a.y - t * y);
        }
        function segmentDistance(a, b, c, d) {
          const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
          if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return 0;
          return Math.min(pointDistance(a, c, d), pointDistance(b, c, d), pointDistance(c, a, b), pointDistance(d, a, b));
        }
        const visible = i => { const { points, head } = ropeDrawing(i), tip = points.at(-1); return points.concat({ x: tip.x + head.x * G.view.scale * .44, y: tip.y + head.y * G.view.scale * .44 }); };
        for (const grid of ['square', 'hex']) for (const routed of [false, true]) {
          const mirrors = !routed ? [] : grid === 'square' ? [{ cell: p(3, 1), slope: '\\' }, { cell: p(3, 4), slope: '/' }] : [{ cell: p(3, 1), axis: 1 }];
          const paths = [routed ? [p(1, 1), p(2, 1)] : [p(2, 3), p(3, 3), p(4, 3)],
            !routed ? [p(3, 5), p(3, 4)] : grid === 'square' ? [p(5, 3), p(4, 3)] : [p(-1, 3), p(0, 3)],
            [p(5, 0), p(6, 0)], [p(7, 9), p(7, 8)], [p(6, 7), p(7, 7)]];
          const level = { grid, W: 12, H: 12, mirrors, springs: [], locks: [], par: 5 };
          Object.assign(G, { level, paths, plan: [0, 1, 2, 4, 3], taps: 0, moves: new Map(), auto: false, ended: false, lost: false, loading: false, history: [], camera: { zoom: 1, x: 0, y: 0 } }); resize();
          let swishes = 0, activations = 0; sfx.slide = () => swishes++; sfx.activate = () => activations++;
          for (const name of ['reflect', 'spring', 'pop', 'thud', 'win']) sfx[name] = () => {};
          tap(0); tap(1); tap(2); draw(0);
          const first = G.moves.get(0), follower = G.moves.get(1), separate = G.moves.get(2), queued = follower.waiting;
          const accepted = G.taps === 3 && G.paths.slice(0, 3).every(p => p === null), initialSwishes = swishes;
          update(1 / 60); const firstFrameSwishes = swishes, separateAdvances = separate.progress > 0 && follower.progress === 0;
          let closest = Infinity, resumedBeforeExit = false;
          for (let frame = 0; frame < 6000 && G.moving; frame++) {
            update(1 / 60); draw(frame / 60);
            if (follower.progress > 0 && G.moves.get(0) === first) resumedBeforeExit = true;
            if (G.moves.has(0) && G.moves.has(1)) {
              const a = visible(0), b = visible(1);
              for (let i = 1; i < a.length; i++) for (let j = 1; j < b.length; j++) closest = Math.min(closest, segmentDistance(a[i - 1], a[i], b[j - 1], b[j]) / G.view.scale);
            }
          }
          results.push({ grid, routed, accepted, queued, initialSwishes, swishes, activations, firstFrameSwishes, separateAdvances, resumedBeforeExit, closest, drained: !G.moving });
        }
        cancelGuide(); return results;
      });
      for (const r of results) {
        assert.equal(r.accepted, true, JSON.stringify(r)); assert.equal(r.queued, true, JSON.stringify(r));
        assert.equal(r.initialSwishes, 0, 'acceptance waits for visual motion before swishing'); assert.equal(r.activations, 3, 'accepted user taps get an immediate soft tick');
        assert.equal(r.firstFrameSwishes, 2, 'only the two independent routes start audibly'); assert.equal(r.swishes, 3, JSON.stringify(r));
        assert.equal(r.separateAdvances, true);
        if (reducedMotion !== 'reduce') assert.equal(r.resumedBeforeExit, true, 'release as soon as the shared path clears: ' + JSON.stringify(r));
        assert.ok(r.closest > .25, 'visible strokes stay apart: ' + JSON.stringify(r)); assert.equal(r.drained, true);
      }
      assert.deepEqual(errors, []); await page.close();
    }
  } finally { await browser.close(); }
});

test('four rapid pointer taps queue a spring release and solve the Hex regression at par', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { requestAnimationFrame = () => 0; });
    await page.goto(base + '?set=U1-H-1-1-1-S-FLIP0'); await ready(page);
    const points = await page.evaluate(() => [1, 0, 0, 5].map(i => {
      const p = screen(G.paths[i].at(-1)), rect = canvas.getBoundingClientRect(); return { x: p.x + rect.left, y: p.y + rect.top };
    }));
    for (const p of points) await page.mouse.click(p.x, p.y);
    assert.deepEqual(await page.evaluate(() => ({ taps: G.taps, par: G.level.par, queued: G.moves.get(0)?.queued?.event, progress: G.moves.get(0).progress })),
      { taps: 4, par: 4, queued: 'exit', progress: 0 });
    assert.equal(await page.evaluate(() => {
      for (let n = 0; n < 3000 && !G.ended; n++) { update(1 / 60); draw(n / 60); }
      return G.ended && G.taps === 4;
    }), true);
    // A tap on the moving head during the actual flip also queues its release.
    await page.reload(); await ready(page);
    const duringFlip = await page.evaluate(() => {
      tap(1); tap(0); const m = G.moves.get(0); while (!m.impacted) update(.001); update(m.hold * .25);
      draw(0); const p = springDrawing(0, springFlip(m)).points.at(-1), box = canvas.getBoundingClientRect();
      return { x: p.x + box.left, y: p.y + box.top };
    });
    await page.mouse.click(duringFlip.x, duringFlip.y);
    assert.equal(await page.evaluate(() => G.moves.get(0).queued?.event), 'exit');
    // Undo a queued release restores the post-bounce board and cancels both animations.
    await page.reload(); await ready(page);
    const undoResult = await page.evaluate(() => {
      tap(1); tap(0); const afterBounce = JSON.stringify(G.paths); tap(0); const queued = !!G.moves.get(0).queued;
      undo(); return { queued, restored: JSON.stringify(G.paths) === afterBounce, cancelled: !G.moving, taps: G.taps };
    });
    assert.deepEqual(undoResult, { queued: true, restored: true, cancelled: true, taps: 4 });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
