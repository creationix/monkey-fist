// A continuous braid in rope coordinates, with detail scaled to readability.
(function (root) {
  'use strict';
  const cache = new Map();
  function shade(hex, amount) {
    const n = parseInt(hex.slice(1), 16), c = x => Math.round(amount < 0 ? x * (1 + amount) : x + (255 - x) * amount);
    return `rgb(${c(n >> 16)},${c(n >> 8 & 255)},${c(n & 255)})`;
  }
  function curve(points) {
    const out = [points[0]];
    for (let i = 1; i < points.length - 1; i++) {
      const a = points[i - 1], b = points[i], c = points[i + 1], before = Math.hypot(b.x - a.x, b.y - a.y), after = Math.hypot(c.x - b.x, c.y - b.y);
      if (before < .001 || after < .001) continue;
      const u = { x: (b.x - a.x) / before, y: (b.y - a.y) / before }, v = { x: (c.x - b.x) / after, y: (c.y - b.y) / after };
      if (u.x * v.x + u.y * v.y > .999) continue;
      const radius = Math.min(.7, before * .48, after * .48), p = { x: b.x - u.x * radius, y: b.y - u.y * radius }, q = { x: b.x + v.x * radius, y: b.y + v.y * radius };
      out.push(p);
      for (let j = 1; j <= 6; j++) { const t = j / 6, s = 1 - t; out.push({ x: s * s * p.x + 2 * s * t * b.x + t * t * q.x, y: s * s * p.y + 2 * s * t * b.y + t * t * q.y }); }
    }
    out.push(points.at(-1));
    const segments = [], line = new Path2D(); line.moveTo(out[0].x, out[0].y); let length = 0;
    for (let i = 1; i < out.length; i++) {
      const a = out[i - 1], b = out[i], n = Math.hypot(b.x - a.x, b.y - a.y); if (n < .0001) continue;
      segments.push({ a, x: (b.x - a.x) / n, y: (b.y - a.y) / n, start: length, end: length + n }); length += n; line.lineTo(b.x, b.y);
    }
    function at(s, normal) {
      let lo = 0, hi = segments.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (segments[mid].end < s) lo = mid + 1; else hi = mid; }
      const p = segments[lo], along = s - p.start;
      return { x: p.a.x + along * p.x - normal * p.y, y: p.a.y + along * p.y + normal * p.x };
    }
    return { line, length, at };
  }
  function polygon(path, points) { path.moveTo(points[0].x, points[0].y); for (let i = 1; i < points.length; i++) path.lineTo(points[i].x, points[i].y); path.closePath(); }
  function weave(at, length, detail, offset = 0, head = false) {
    const paths = Array.from({ length: 3 }, () => new Path2D()); if (!detail) return paths;
    const rows = detail === 2 ? 4 : 2, pitch = detail === 2 ? .5 : .85, lane = 1 / rows;
    const from = head ? -.4 : 0, to = head ? 1.15 : length;
    for (let col = Math.floor((from + offset) / pitch) - 1; col <= Math.ceil((to + offset) / pitch) + 1; col++) {
      for (let row = head ? -rows / 2 : 0; row < (head ? rows * 1.5 : rows); row++) {
        const n = (row - (rows - 1) / 2) * lane, sign = row % 2 ? -1 : 1;
        const s = col * pitch - offset + (row % 2 ? pitch / 2 : 0), half = pitch * .38, skew = pitch * .18 * sign;
        const tracer = ((col + row * 2) % 10 + 10) % 10, group = detail === 2 && tracer < 2 ? tracer + 1 : 0;
        const lo = Math.max(from, s - half), hi = Math.min(to, s + half); if (lo >= hi) continue;
        polygon(paths[group], [at(lo - skew, n - lane * .43), at(hi - skew, n - lane * .43), at(hi + skew, n + lane * .43), at(lo + skew, n + lane * .43)]);
      }
    }
    return paths;
  }
  function geometry(points, width, detail, moving) {
    const origin = points[0], normalized = points.map(p => ({ x: (p.x - origin.x) / width, y: (p.y - origin.y) / width }));
    const key = detail + '/' + normalized.map(p => p.x.toFixed(3) + ',' + p.y.toFixed(3)).join(';');
    if (!moving && cache.has(key)) return cache.get(key);
    const body = curve(normalized), result = { ...body, braid: weave(body.at, body.length, detail), head: weave((x, y) => ({ x, y }), 0, detail, body.length, true) };
    if (!moving) { cache.set(key, result); if (cache.size > 240) cache.delete(cache.keys().next().value); }
    return result;
  }
  function ink(ctx, paths, color) {
    for (const [i, path] of paths.entries()) { ctx.fillStyle = i === 1 ? shade(color, .38) : i === 2 ? shade(color, -.35) : shade(color, .12); ctx.fill(path); }
  }
  function draw(ctx, points, width, color, head, moving = false) {
    if (points.length < 2) return;
    // At Fit on mega maps, color and silhouette matter more than tiny stitches.
    const detail = width < 7 ? 0 : width < 14 ? 1 : 2, g = geometry(points, width, detail, moving);
    ctx.save(); ctx.translate(points[0].x, points[0].y); ctx.scale(width, width); ctx.lineCap = ctx.lineJoin = 'round';
    ctx.strokeStyle = shade(color, -.55); ctx.lineWidth = 1.15; ctx.stroke(g.line);
    ctx.strokeStyle = shade(color, -.12); ctx.lineWidth = 1; ctx.stroke(g.line);
    ink(ctx, g.braid, color);
    ctx.strokeStyle = '#ffffff20'; ctx.lineWidth = .28; ctx.stroke(g.line); ctx.restore();
    if (!head) return;
    const tip = points.at(-1), triangle = new Path2D(); polygon(triangle, [{ x: -.3, y: -.77 }, { x: 1.1, y: 0 }, { x: -.3, y: .77 }]);
    ctx.save(); ctx.translate(tip.x, tip.y); ctx.rotate(Math.atan2(head.y, head.x)); ctx.scale(width, width); ctx.lineJoin = 'round';
    ctx.fillStyle = shade(color, -.12); ctx.fill(triangle);
    ctx.clip(triangle); ink(ctx, g.head, color);
    const volume = ctx.createLinearGradient(0, -.8, 0, .8); volume.addColorStop(0, '#00000025'); volume.addColorStop(.45, '#ffffff22'); volume.addColorStop(1, '#00000030');
    ctx.fillStyle = volume; ctx.fill(triangle); ctx.restore();
    // Outline the wings, leaving the neck joined to the cord rather than drawing
    // a dark bar across it. The outline is painted after the weave for a clean tip.
    ctx.save(); ctx.translate(tip.x, tip.y); ctx.rotate(Math.atan2(head.y, head.x)); ctx.scale(width, width);
    ctx.beginPath(); ctx.moveTo(-.3, -.49); ctx.lineTo(-.3, -.77); ctx.lineTo(1.1, 0); ctx.lineTo(-.3, .77); ctx.lineTo(-.3, .49);
    ctx.strokeStyle = shade(color, -.55); ctx.lineWidth = .13; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
  }
  root.MFRopeArt = { draw };
})(globalThis);
