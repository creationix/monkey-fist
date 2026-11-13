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
          let swishes = 0; sfx.slide = () => swishes++;
          for (const name of ['reflect', 'spring', 'pop', 'thud', 'win']) sfx[name] = () => {};
          tap(0); tap(1); tap(2); draw(0);
          const first = G.moves.get(0), follower = G.moves.get(1), separate = G.moves.get(2), queued = follower.waiting;
          const accepted = G.taps === 3 && G.paths.slice(0, 3).every(p => p === null), initialSwishes = swishes;
          update(1 / 60); const separateAdvances = separate.progress > 0 && follower.progress === 0;
          let closest = Infinity, resumedBeforeExit = false;
          for (let frame = 0; frame < 6000 && G.moving; frame++) {
            update(1 / 60); draw(frame / 60);
            if (follower.progress > 0 && G.moves.get(0) === first) resumedBeforeExit = true;
            if (G.moves.has(0) && G.moves.has(1)) {
              const a = visible(0), b = visible(1);
              for (let i = 1; i < a.length; i++) for (let j = 1; j < b.length; j++) closest = Math.min(closest, segmentDistance(a[i - 1], a[i], b[j - 1], b[j]) / G.view.scale);
            }
          }
          results.push({ grid, routed, accepted, queued, initialSwishes, swishes, separateAdvances, resumedBeforeExit, closest, drained: !G.moving });
        }
        cancelGuide(); return results;
      });
      for (const r of results) {
        assert.equal(r.accepted, true, JSON.stringify(r)); assert.equal(r.queued, true, JSON.stringify(r));
        assert.equal(r.initialSwishes, 2, 'the waiting rope stays quiet'); assert.equal(r.swishes, 3, JSON.stringify(r));
        assert.equal(r.separateAdvances, true);
        if (reducedMotion !== 'reduce') assert.equal(r.resumedBeforeExit, true, 'release as soon as the shared path clears: ' + JSON.stringify(r));
        assert.ok(r.closest > .25, 'visible strokes stay apart: ' + JSON.stringify(r)); assert.equal(r.drained, true);
      }
      assert.deepEqual(errors, []); await page.close();
    }
  } finally { await browser.close(); }
});
