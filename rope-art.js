// A continuous braid in rope coordinates, with detail scaled to readability.
(function (root) {
  'use strict';
  const cache = new Map();
  function shade(hex, amount) {
    const n = parseInt(hex.slice(1), 16), c = x => Math.round(amount < 0 ? x * (1 + amount) : x + (255 - x) * amount);
    return `rgb(${c(n >> 16)},${c(n >> 8 & 255)},${c(n & 255)})`;
  }
  function curve(input) {
    const points = input.filter((p, i) => !i || Math.hypot(p.x - input[i - 1].x, p.y - input[i - 1].y) > .0001);
    const segments = [], line = new Path2D(); let length = 0, end = points[0]; line.moveTo(end.x, end.y);
    function straight(b) {
      const n = Math.hypot(b.x - end.x, b.y - end.y);
      if (n > .0001) { segments.push({ a: end, x: (b.x - end.x) / n, y: (b.y - end.y) / n, start: length, end: length + n }); length += n; line.lineTo(b.x, b.y); }
      end = b;
    }
    for (let i = 1; i < points.length - 1; i++) {
      const a = points[i - 1], b = points[i], c = points[i + 1], before = Math.hypot(b.x - a.x, b.y - a.y), after = Math.hypot(c.x - b.x, c.y - b.y);
      const u = { x: (b.x - a.x) / before, y: (b.y - a.y) / before }, v = { x: (c.x - b.x) / after, y: (c.y - b.y) / after };
      const turn = Math.atan2(u.x * v.y - u.y * v.x, u.x * v.x + u.y * v.y);
      if (Math.abs(turn) < .001) continue;
      if (Math.abs(turn) > Math.PI - .001) { straight(b); continue; }
      // A true circular fillet: the same radius for square and hex turns.
      // Short endpoint segments constrain the radius without overshooting them.
      const tangent = Math.tan(Math.abs(turn) / 2), cut = Math.min(.7 * tangent, before * .48, after * .48), radius = cut / tangent, sign = Math.sign(turn);
      const entry = { x: b.x - u.x * cut, y: b.y - u.y * cut }, exit = { x: b.x + v.x * cut, y: b.y + v.y * cut };
      straight(entry);
      const center = { x: entry.x - u.y * sign * radius, y: entry.y + u.x * sign * radius }, angle = Math.atan2(entry.y - center.y, entry.x - center.x), n = radius * Math.abs(turn);
      segments.push({ center, radius, angle, sign, start: length, end: length + n }); length += n;
      line.arc(center.x, center.y, radius, angle, angle + turn, turn < 0); end = exit;
    }
    straight(points.at(-1));
    function at(s, normal = 0) {
      if (!segments.length) return { ...points[0] };
      let lo = 0, hi = segments.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (segments[mid].end < s) lo = mid + 1; else hi = mid; }
      const p = segments[lo], along = s - p.start;
      if (!p.center) return { x: p.a.x + along * p.x - normal * p.y, y: p.a.y + along * p.y + normal * p.x };
      const angle = p.angle + p.sign * along / p.radius, radius = p.radius - p.sign * normal;
      return { x: p.center.x + radius * Math.cos(angle), y: p.center.y + radius * Math.sin(angle) };
    }
    return { line, length, at };
  }
  function polyline(input) {
    const points = input.filter((p, i) => !i || Math.hypot(p.x - input[i - 1].x, p.y - input[i - 1].y) > .0001);
    const line = new Path2D(), segments = [], breaks = [0]; let length = 0; line.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], n = Math.hypot(b.x - a.x, b.y - a.y);
      segments.push({ a, x: (b.x - a.x) / n, y: (b.y - a.y) / n, start: length, end: length + n });
      length += n; breaks.push(length); line.lineTo(b.x, b.y);
    }
    const at = (s, normal = 0) => {
      if (!segments.length) return { ...points[0] };
      let lo = 0, hi = segments.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (segments[m].end < s) lo = m + 1; else hi = m; }
      const p = segments[lo], d = s - p.start;
      return { x: p.a.x + d * p.x - normal * p.y, y: p.a.y + d * p.y + normal * p.x };
    };
    return { points, line, length, at, breaks, segments };
  }
  function tileGeometry(points, width, moving) {
    const origin = points[0], normalized = points.map(p => ({ x: (p.x - origin.x) / width, y: (p.y - origin.y) / width }));
    const key = 'tiles/' + normalized.map(p => p.x.toFixed(3) + ',' + p.y.toFixed(3)).join(';');
    if (!moving && cache.has(key)) return cache.get(key);
    const g = polyline(normalized), left = [], right = [], outline = new Path2D(), ribs = new Path2D();
    for (let i = 0; i < g.points.length; i++) {
      const p = g.points[i], incoming = g.segments[Math.max(0, i - 1)], outgoing = g.segments[Math.min(i, g.segments.length - 1)];
      if (!incoming || !outgoing) continue;
      const cross = incoming.x * outgoing.y - incoming.y * outgoing.x, dot = incoming.x * outgoing.x + incoming.y * outgoing.y;
      for (const [sign, side] of [[1, left], [-1, right]]) {
        if (i > 0 && i < g.points.length - 1 && cross * sign > .001 && dot > -.999) {
          const scale = sign * .5 / (1 + dot);
          side.push({ x: p.x - (incoming.y + outgoing.y) * scale, y: p.y + (incoming.x + outgoing.x) * scale });
        } else {
          side.push({ x: p.x - incoming.y * sign * .5, y: p.y + incoming.x * sign * .5 });
          if (Math.abs(cross) > .001) side.push({ x: p.x - outgoing.y * sign * .5, y: p.y + outgoing.x * sign * .5 });
        }
      }
    }
    if (left.length) polygon(outline, left.concat(right.reverse()));
    if (width >= 5) for (let s = -.9; s < g.length + .9; s += .9) {
      const a = g.at(s - .18, -.5), b = g.at(s + .18, .5); ribs.moveTo(a.x, a.y); ribs.lineTo(b.x, b.y);
    }
    const result = { ...g, outline, ribs };
    if (!moving) { cache.set(key, result); if (cache.size > 240) cache.delete(cache.keys().next().value); }
    return result;
  }
  // Screen-space sampling of the same centerline used by the braid. Springs
  // follow it in reverse instead of cutting across a bent rope's shape.
  function trace(points, width, style = 'rope') {
    const origin = points[0], body = (style === 'tiles' ? polyline : curve)(points.map(p => ({ x: (p.x - origin.x) / width, y: (p.y - origin.y) / width })));
    return { length: body.length * width, breaks: body.breaks?.map(s => s * width), at(s, normal = 0) {
      const p = body.at(s / width, normal / width); return { x: origin.x + p.x * width, y: origin.y + p.y * width };
    } };
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
  function stroke(ctx, points, width, strokeWidth, color, moving = false, style = 'rope') {
    if (points.length < 2) return;
    const g = style === 'tiles' ? tileGeometry(points, width, moving) : geometry(points, width, 0, moving);
    ctx.save(); ctx.translate(points[0].x, points[0].y); ctx.scale(width, width);
    ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.lineWidth = strokeWidth / width;
    if (style === 'tiles') { ctx.lineWidth = Math.max(.08, (strokeWidth - width) / width); ctx.stroke(g.outline); }
    else ctx.stroke(g.line); ctx.restore();
  }
  function draw(ctx, points, width, color, head, moving = false, style = 'rope') {
    if (style === 'tiles') return drawTiles(ctx, points, width, color, head, moving);
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
  function drawTiles(ctx, points, width, color, head, moving) {
    if (points.length < 2) return;
    const g = tileGeometry(points, width, moving), alpha = ctx.globalAlpha;
    ctx.save(); ctx.translate(points[0].x, points[0].y); ctx.scale(width, width); ctx.lineJoin = 'bevel';
    ctx.globalAlpha = alpha * .42; ctx.fillStyle = color; ctx.fill(g.outline);
    ctx.globalAlpha = alpha * .9; ctx.strokeStyle = shade(color, -.25); ctx.lineWidth = .11; ctx.stroke(g.outline);
    ctx.save(); ctx.clip(g.outline); ctx.globalAlpha = alpha * .18; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = .035; ctx.stroke(g.ribs);
    ctx.globalAlpha = alpha * .06; ctx.lineWidth = .42; ctx.stroke(g.line); ctx.restore();
    ctx.globalAlpha = alpha * .35; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = .025; ctx.stroke(g.outline); ctx.restore();
    if (!head) return;
    const tip = points.at(-1), triangle = new Path2D(); polygon(triangle, [{ x: -.3, y: -.77 }, { x: 1.1, y: 0 }, { x: -.3, y: .77 }]);
    ctx.save(); ctx.translate(tip.x, tip.y); ctx.rotate(Math.atan2(head.y, head.x)); ctx.scale(width, width); ctx.lineJoin = 'bevel';
    ctx.globalAlpha = alpha * .42; ctx.fillStyle = color; ctx.fill(triangle);
    ctx.save(); ctx.clip(triangle); ctx.globalAlpha = alpha * .18; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = .035;
    ctx.beginPath(); for (let c = Math.floor((g.length - 1) / .9); c <= Math.ceil((g.length + 2) / .9); c++) {
      const x = c * .9 - g.length; ctx.moveTo(x - .18, -.8); ctx.lineTo(x + .18, .8);
    } ctx.stroke(); ctx.restore();
    ctx.globalAlpha = alpha * .95; ctx.strokeStyle = shade(color, -.25); ctx.lineWidth = .11;
    ctx.beginPath(); ctx.moveTo(-.3, -.49); ctx.lineTo(-.3, -.77); ctx.lineTo(1.1, 0); ctx.lineTo(-.3, .77); ctx.lineTo(-.3, .49); ctx.stroke();
    ctx.restore();
  }
  root.MFRopeArt = { draw, trace, stroke };
})(globalThis);
