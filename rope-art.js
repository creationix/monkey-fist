// Braided climbing cord: a cached, cylindrical weave carried along each strand.
(function (root) {
  'use strict';
  const tiles = new Map(), patterns = new WeakMap();
  function shade(hex, amount) {
    const n = parseInt(hex.slice(1), 16), c = x => Math.round(amount < 0 ? x * (1 + amount) : x + (255 - x) * amount);
    return `rgb(${c(n >> 16)},${c(n >> 8 & 255)},${c(n & 255)})`;
  }
  function tile(color) {
    if (tiles.has(color)) return tiles.get(color);
    const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 64;
    const c = canvas.getContext('2d'); c.fillStyle = shade(color, -.3); c.fillRect(0, 0, 96, 64);
    for (let row = -1; row < 5; row++) for (let col = -2; col < 10; col++) {
      const x = col * 12 + (row % 2 ? 6 : 0), y = row * 16 + 8, sign = row % 2 ? -1 : 1;
      const tracer = ((col + row * 2) % 8 + 8) % 8;
      const strand = tracer === 0 ? '#d9dfc1' : tracer === 1 ? '#30494a' : color;
      c.save(); c.translate(x, y); c.rotate(sign * .65);
      const g = c.createLinearGradient(-5, 0, 5, 0); g.addColorStop(0, shade(strand, -.35)); g.addColorStop(.4, shade(strand, .2)); g.addColorStop(1, shade(strand, -.12));
      c.fillStyle = g; c.beginPath(); c.roundRect(-5.2, -8.5, 10.4, 17, 2.5); c.fill();
      c.strokeStyle = '#ffffff22'; c.lineWidth = .65;
      for (let t = -2; t <= 2; t += 2) { c.beginPath(); c.moveTo(t, -6); c.lineTo(t, 6); c.stroke(); }
      c.restore();
    }
    const volume = c.createLinearGradient(0, 0, 0, 64);
    volume.addColorStop(0, '#00000065'); volume.addColorStop(.35, '#ffffff16'); volume.addColorStop(.55, '#ffffff08'); volume.addColorStop(1, '#00000070');
    c.fillStyle = volume; c.fillRect(0, 0, 96, 64); tiles.set(color, canvas); return canvas;
  }
  function draw(ctx, points, width, color, phase = 0) {
    if (points.length < 2) return;
    ctx.save(); ctx.lineCap = ctx.lineJoin = 'round'; ctx.setLineDash([]);
    ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.strokeStyle = shade(color, -.65); ctx.lineWidth = width * 1.16; ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    const mask = new Path2D(), r = width / 2, segments = [];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy); if (length < .01) continue;
      const nx = -dy / length * r, ny = dx / length * r;
      mask.moveTo(a.x - nx, a.y - ny); mask.lineTo(b.x - nx, b.y - ny); mask.lineTo(b.x + nx, b.y + ny); mask.lineTo(a.x + nx, a.y + ny); mask.closePath();
      segments.push({ a, angle: Math.atan2(dy, dx), length });
    }
    for (const p of points) { mask.moveTo(p.x + r, p.y); mask.arc(p.x, p.y, r, 0, Math.PI * 2); mask.closePath(); }
    ctx.clip(mask);
    if (!patterns.has(ctx)) patterns.set(ctx, new Map());
    const cache = patterns.get(ctx); if (!cache.has(color)) cache.set(color, ctx.createPattern(tile(color), 'repeat'));
    const pattern = cache.get(color), scale = width / 64;
    let traveled = -phase;
    for (const { a, angle, length } of segments) {
      ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(angle); ctx.translate(0, -r); ctx.scale(scale, scale);
      const offset = traveled / scale; ctx.translate(-offset, 0); ctx.fillStyle = pattern;
      ctx.fillRect(offset - 32, 0, length / scale + 64, 64); ctx.restore(); traveled += length;
    }
    ctx.restore();
  }
  root.MFRopeArt = { draw };
})(globalThis);
