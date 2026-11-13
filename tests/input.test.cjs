const test = require('node:test'), assert = require('node:assert/strict');
const Input = require('../input.js');
function setup(overrides = {}) {
  let time = 0, cam = { zoom: 1, x: 0, y: 0 };
  const view = { width: 800, height: 600, zoomable: false, panX: false, panY: false, bw: 500, bh: 400, usableW: 700, usableH: 500, ...overrides }, taps = [];
  const input = Input.create({ view: () => view, camera: () => cam, change: next => { cam = Input.constrain(next, view); }, pick: p => p.x < 50 ? -1 : Math.floor(p.x / 100), tap: id => taps.push(id), now: () => time });
  const point = (id, x, y = 200, extra = {}) => ({ id, x, y, type: 'touch', width: 12, height: 12, ...extra });
  return { input, point, taps, view, get camera() { return cam; }, tick: t => { time += t; } };
}
test('a wobbly tap stays on the rope picked at touch-down', () => {
  const { input, point, taps } = setup(); input.down(point(1, 190)); input.move(point(1, 220, 220)); input.up(point(1, 220, 220)); assert.deepEqual(taps, [1]);
});
test('reported contact size never vetoes an otherwise valid finger tap', () => {
  for (const size of [1, 14, 40, 60, 100]) {
    const s = setup(), contact = (x, width = size) => s.point(1, x, 200, { width, height: width });
    s.input.down(contact(200)); s.input.move(contact(215, size * 2)); s.tick(120); s.input.up(contact(215));
    assert.deepEqual(s.taps, [2], `contact width ${size}`);
  }
});
test('a held edge and broad palm do not block independent fingers or create zoom', () => {
  const s = setup({ zoomable: true }); s.input.down(s.point(1, 5)); s.tick(800);
  s.input.down(s.point(2, 300, 400, { width: 65, height: 50 }));
  s.tick(2500);
  for (let i = 3; i < 8; i++) { s.input.down(s.point(i, 200)); s.input.move(s.point(i, 225, 212)); s.input.up(s.point(i, 225, 212)); }
  s.input.up(s.point(1, 5)); s.input.up(s.point(2, 300, 400, { width: 65, height: 50 }));
  assert.deepEqual(s.taps, [2, 2, 2, 2, 2]); assert.deepEqual(s.camera, { zoom: 1, x: 0, y: 0 });
});
test('simultaneous taps work independently and canceling one never cancels another', () => {
  const s = setup({ zoomable: true }); s.input.down(s.point(1, 200)); s.input.down(s.point(2, 400));
  s.input.move(s.point(1, 210)); s.input.move(s.point(2, 410)); s.input.up(s.point(2, 410)); s.input.up(s.point(1, 210));
  assert.deepEqual(s.taps, [4, 2]); s.input.down(s.point(3, 300)); s.input.down(s.point(4, 400)); s.input.cancel(3); s.input.up(s.point(4, 405)); assert.deepEqual(s.taps, [4, 2, 4]);
});
test('pinching requires two fresh, moving contacts; a third resting contact is irrelevant', () => {
  const s = setup({ zoomable: true }); s.input.down(s.point(0, 5)); s.tick(1000);
  s.input.down(s.point(1, 250)); s.input.down(s.point(2, 550));
  s.input.move(s.point(1, 220)); assert.equal(s.camera.zoom, 1);
  s.input.move(s.point(2, 580)); assert.equal(s.camera.zoom, 1, 'recognition does not jump the camera');
  s.input.move(s.point(1, 180)); s.input.move(s.point(2, 620)); assert.ok(s.camera.zoom > 1);
  s.input.up(s.point(1, 180)); s.input.up(s.point(2, 620)); assert.deepEqual(s.taps, []);
  s.input.down(s.point(3, 400)); s.input.up(s.point(3, 405)); assert.deepEqual(s.taps, [4]);
});
test('small boards ignore pinches; Fit forbids panning; deliberate overflow drags still pan', () => {
  const s = setup(); s.input.down(s.point(1, 200)); s.input.down(s.point(2, 500));
  s.input.move(s.point(1, 100)); s.input.move(s.point(2, 600)); assert.deepEqual(s.camera, { zoom: 1, x: 0, y: 0 });
  s.input.reset(); s.view.zoomable = true; s.input.down(s.point(3, 200)); s.input.move(s.point(3, 350)); assert.equal(s.camera.x, 0);
  s.input.reset(); Object.assign(s.view, { bw: 1000, panX: true }); s.input.down(s.point(4, 200)); s.input.move(s.point(4, 260)); s.input.move(s.point(4, 310)); assert.equal(s.camera.x, 50); s.input.up(s.point(4, 310)); assert.deepEqual(s.taps, []);
});
test('camera limits smoothly collapse to a centered fit, independently on each axis', () => {
  const view = { zoomable: true, bw: 600, bh: 400, usableW: 600, usableH: 500 };
  let previous = 1000;
  for (let zoom = 2; zoom >= 1; zoom -= .01) { const c = Input.constrain({ zoom, x: 1000, y: 1000 }, view); assert.ok(c.x <= previous + .001); previous = c.x; if (zoom <= 1.25) assert.equal(c.y, 0); }
  assert.deepEqual(Input.constrain({ zoom: 1, x: 20, y: -20 }, view), { zoom: 1, x: 0, y: 0 });
  assert.deepEqual(Input.constrain({ zoom: 8, x: 20, y: -20 }, { ...view, zoomable: false }), { zoom: 1, x: 0, y: 0 });
});
