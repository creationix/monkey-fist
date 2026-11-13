const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const { launch } = require('./browser-helpers.cjs');

test('the weave moves with a rope, with no extra phase sliding over the material', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage(); await page.addScriptTag({ path: path.join(__dirname, '../rope-art.js') });
    assert.equal(await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }), head = { x: 1, y: 0 };
      MFRopeArt.draw(ctx, [{ x: 60, y: 64 }, { x: 280, y: 64 }], 32, '#f7a251', head);
      const before = ctx.getImageData(80, 44, 150, 40).data; ctx.clearRect(0, 0, 512, 128);
      MFRopeArt.draw(ctx, [{ x: 92, y: 64 }, { x: 312, y: 64 }], 32, '#f7a251', head, true);
      const after = ctx.getImageData(112, 44, 150, 40).data;
      return before.every((value, i) => value === after[i]);
    }), true);
  } finally { await browser.close(); }
});

test('square and hex bends use circular fillets with continuous tangents and normal offsets', () => {
  const fs = require('node:fs'), vm = require('node:vm');
  const scope = { Path2D: class { moveTo() {} lineTo() {} arc() {} } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../rope-art.js'), 'utf8'), scope);
  const trace = scope.MFRopeArt.trace, distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  for (const degrees of [-120, -90, -60, 60, 90, 120]) {
    const angle = degrees * Math.PI / 180, sign = Math.sign(angle), radius = 14, cut = radius * Math.tan(Math.abs(angle) / 2);
    const rope = trace([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100 + 100 * Math.cos(angle), y: 100 * Math.sin(angle) }], 20);
    const entry = 100 - cut, arc = radius * Math.abs(angle), center = { x: entry, y: sign * radius };
    assert.ok(Math.abs(rope.length - (200 - 2 * cut + arc)) < 1e-8);
    for (let i = 0; i <= 20; i++) {
      const s = entry + arc * i / 20;
      assert.ok(Math.abs(distance(rope.at(s), center) - radius) < 1e-8, 'constant turn radius');
      assert.ok(Math.abs(distance(rope.at(s, 4), center) - (radius - sign * 4)) < 1e-8, 'the braid follows a smooth concentric arc');
    }
    for (const s of [entry, entry + arc]) {
      const a = rope.at(s - .001), b = rope.at(s), c = rope.at(s + .001);
      const before = { x: (b.x - a.x) / .001, y: (b.y - a.y) / .001 }, after = { x: (c.x - b.x) / .001, y: (c.y - b.y) / .001 };
      assert.ok(distance(before, after) < .001, 'no kink at a line/arc join');
    }
  }
  for (const points of [
    [{ x: 0, y: 0 }, { x: 0, y: 0 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: .001 }, { x: 2, y: 0 }],
    [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 0 }]
  ]) {
    const rope = trace(points, 20);
    for (let i = 0; i <= 10; i++) assert.ok(Object.values(rope.at(rope.length * i / 10, 5)).every(Number.isFinite));
  }
});
