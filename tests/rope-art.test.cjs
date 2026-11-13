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
