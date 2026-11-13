// Independent contacts: a resting hand must never own the next finger's tap.
(function (root) {
  'use strict';
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const palm = e => e.type === 'touch' && (Math.max(e.width || 0, e.height || 0) > 55 || Math.min(e.width || 0, e.height || 0) > 32);
  function constrain(camera, view) {
    const zoom = view.zoomable ? Math.max(1, Math.min(8, camera.zoom)) : 1;
    const limitX = Math.max(0, (view.bw * zoom - view.usableW) / 2), limitY = Math.max(0, (view.bh * zoom - view.usableH) / 2);
    return { zoom, x: limitX < .01 ? 0 : Math.max(-limitX, Math.min(limitX, camera.x)), y: limitY < .01 ? 0 : Math.max(-limitY, Math.min(limitY, camera.y)) };
  }
  function create({ view, camera, change, pick, tap, now = () => performance.now() }) {
    const pointers = new Map(); let pinch = null, pan = null;
    function down(e) {
      const v = view(), touch = e.type === 'touch';
      pointers.set(e.id, { ...e, start: { x: e.x, y: e.y }, at: { x: e.x, y: e.y }, time: now(), moved: 0,
        edge: touch && (e.x < 18 || e.x > v.width - 18 || e.y < 18 || e.y > v.height - 18),
        mode: palm(e) ? 'ignore' : 'tap', target: pick(e, touch ? 22 : 0) });
    }
    function eligible(p) { return p.type === 'touch' && !p.edge && ['tap', 'pan'].includes(p.mode) && now() - p.time < 1000; }
    function move(e) {
      const p = pointers.get(e.id); if (!p) return;
      p.at = { x: e.x, y: e.y }; p.moved = Math.max(p.moved, distance(p.at, p.start));
      if (palm(e)) { cancel(e.id); return; }
      if (p.mode === 'ignore' || p.mode === 'spent') return;
      const v = view();
      if (pinch) {
        if (!pinch.ids.includes(e.id)) return;
        const [a, b] = pinch.ids.map(id => pointers.get(id).at), mid = midpoint(a, b);
        const zoom = Math.max(1, Math.min(8, pinch.camera.zoom * distance(a, b) / pinch.distance)), ratio = zoom / pinch.camera.zoom;
        change({ zoom, x: mid.x - v.width / 2 - (pinch.mid.x - v.width / 2 - pinch.camera.x) * ratio,
          y: mid.y - v.height / 2 - (pinch.mid.y - v.height / 2 - pinch.camera.y) * ratio }); return;
      }
      if (v.zoomable && eligible(p) && p.moved >= 12) {
        const other = [...pointers.values()].find(q => q.id !== p.id && eligible(q) && q.moved >= 12 && Math.abs(p.time - q.time) <= 350 && distance(p.start, q.start) >= 48);
        if (other) {
          const d = distance(p.at, other.at), old = distance(p.start, other.start), mid = midpoint(p.at, other.at), initial = midpoint(p.start, other.start);
          if (Math.abs(d - old) >= 16 || distance(mid, initial) >= 24) {
            pinch = { ids: [p.id, other.id], distance: Math.max(1, d), mid, camera: { ...camera() } }; pan = null;
            p.mode = other.mode = 'pinch'; return;
          }
        }
      }
      // At Fit there is no pan gesture to steal a shaky tap. An edge grip is
      // never promoted into camera movement, even on a zoomed board.
      if ((!v.panX && !v.panY) || p.edge || now() - p.time > 1000 && p.mode !== 'pan') return;
      const threshold = p.type === 'touch' ? p.target >= 0 ? 54 : 30 : 8;
      if (!pan && p.moved > threshold) {
        pan = { id: p.id, start: { ...p.at }, camera: { ...camera() } }; p.mode = 'pan'; return;
      }
      if (pan?.id === p.id) change({ zoom: pan.camera.zoom, x: pan.camera.x + p.at.x - pan.start.x, y: pan.camera.y + p.at.y - pan.start.y });
    }
    function cancel(id) {
      if (pinch?.ids.includes(id)) { for (const peer of pinch.ids) { const p = pointers.get(peer); if (p) p.mode = 'spent'; } pinch = null; }
      if (pan?.id === id) pan = null;
      pointers.delete(id);
    }
    function up(e) {
      const p = pointers.get(e.id); if (!p) return;
      p.moved = Math.max(p.moved, distance(e, p.start));
      const duration = now() - p.time, slop = p.type === 'touch' ? 42 : p.type === 'pen' ? 18 : 7;
      const sameRope = p.target >= 0 && p.moved <= slop * 2 && pick(e, 0) === p.target;
      const accept = p.mode === 'tap' && !palm(e) && duration < 2000 && !(p.edge && duration > 500) && (p.moved <= slop || sameRope);
      cancel(e.id);
      if (accept) { const target = p.target >= 0 ? p.target : pick(e, p.type === 'touch' ? 22 : 0); if (target >= 0) tap(target); }
    }
    const reset = () => { pointers.clear(); pinch = pan = null; };
    return { down, move, up, cancel, reset, pointers };
  }
  const api = { create, constrain };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MFInput = api;
})(globalThis);
