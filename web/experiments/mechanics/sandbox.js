(function () {
  'use strict';
  const $ = id => document.getElementById(id), logic = MFSandbox, levels = MFSandboxLevels;
  const canvas = $('board'), c = canvas.getContext('2d');
  const colors = ['#38d9a9', '#ffa94d', '#9775fa', '#ffd43b', '#4dabf7', '#f783ac', '#69db7c', '#f1e3b5', '#ff6b6b'];
  const game = { index: 0, paths: [], undo: [], taps: 0, animation: null, hint: -1, hintUntil: 0 };
  let level, view = {}, hintTimer;
  levels.forEach((l, i) => { const option = document.createElement('option'); option.value = i; option.textContent = `${i + 1}. ${l.title}`; $('puzzle').appendChild(option); });
  function message(text) { $('message').textContent = text; }
  function sync() {
    $('stats').textContent = `${game.paths.filter(Boolean).length} ropes · ${game.taps} taps`;
    $('undo').disabled = !game.undo.length;
    $('prev').disabled = !game.index;
    $('next').disabled = game.index === levels.length - 1;
  }
  function load(index) {
    clearTimeout(hintTimer);
    game.index = Math.max(0, Math.min(levels.length - 1, index | 0)); level = levels[game.index];
    Object.assign(game, { paths: level.ropes, undo: [], taps: 0, animation: null, hint: -1 });
    $('puzzle').value = game.index;
    $('count').textContent = `${game.index + 1} / ${levels.length}`; $('kind').textContent = level.kind;
    $('title').textContent = level.title; $('note').textContent = level.note;
    const url = new URL(location.href); url.searchParams.set('puzzle', game.index + 1); history.replaceState(null, '', url);
    message('Tap any rope to try a move.'); sync(); resize();
  }
  function resize() {
    const b = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(b.width * dpr); canvas.height = Math.round(b.height * dpr);
    const normal = Math.min((b.width - 36) / level.W, (b.height - 36) / level.H);
    const turned = Math.min((b.height - 36) / level.W, (b.width - 36) / level.H), rotated = turned > normal;
    const width = rotated ? b.height : b.width, height = rotated ? b.width : b.height;
    const cs = Math.max(1, Math.min(rotated ? turned : normal, 88));
    view = { width, height, cs, dpr, rotated, screenWidth: b.width, screenHeight: b.height, ox: (width - level.W * cs) / 2, oy: (height - level.H * cs) / 2 };
  }
  function tap(i) {
    if (game.animation || !game.paths[i]) return;
    const next = logic.tap(level, game.paths, i);
    game.hint = -1;
    if (!next) { message('That rope is blocked. Try another, or use Undo.'); return; }
    game.undo.push({ paths: game.paths, taps: game.taps }); game.taps++;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motion = reduced ? 0 : Math.min(1400, 260 + next.distance * 65);
    game.animation = { ...next, i, start: performance.now(), motion, duration: motion + (reduced ? 0 : next.event === 'bounce' ? 280 : 60), length: game.paths[i].length };
    message(next.event === 'bounce' ? 'Boing! The head and tail swap automatically.' : next.event === 'exit' ? 'Pulling free…' : 'A little room to slide.');
    sync();
  }
  function undo() {
    const before = game.undo.pop(); if (!before) return;
    game.paths = before.paths; game.taps = before.taps; game.animation = null; game.hint = -1;
    message('Move undone. Try a different order.'); sync();
  }
  function hint() {
    if (game.animation) return;
    const result = logic.solve(level, game.paths);
    if (result.solved && result.moves.length) { game.hint = result.moves[0]; game.hintUntil = performance.now() + 3000; message('Try the glowing rope.'); }
    else if (result.solved) message('Untangled! Try the next puzzle.');
    else message(result.solved === null ? 'No hint found yet. Try Undo to explore another route.' : 'This route is stuck. Undo a move or restart.');
  }
  const X = x => view.ox + (x + .5) * view.cs, Y = y => view.oy + (y + .5) * view.cs;
  function roundedRect(x, y, width, height, radius) {
    if (c.roundRect) c.roundRect(x, y, width, height, radius);
    else c.rect(x, y, width, height);
  }
  function pointAt(route, offset) {
    const j = Math.min(route.length - 2, Math.floor(offset)), f = Math.min(1, offset - j), a = route[j], b = route[j + 1];
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }
  function movingPath(a, progress) {
    const start = a.distance * progress, end = start + a.length - 1, path = [pointAt(a.route, start)];
    for (let i = Math.floor(start) + 1; i < end; i++) path.push(a.route[i]);
    path.push(pointAt(a.route, end)); return path;
  }
  function tile(cell, color, opacity = 1) {
    const x = X(cell % level.W), y = Y(Math.floor(cell / level.W)), s = view.cs;
    c.globalAlpha = opacity; c.fillStyle = '#163744'; c.strokeStyle = color; c.lineWidth = 2;
    c.beginPath(); roundedRect(x - s * .42, y - s * .42, s * .84, s * .84, s * .13); c.fill(); c.stroke();
    return [x, y, s];
  }
  function drawTiles() {
    for (const m of level.mirrors || []) {
      const [x, y, s] = tile(m.cell, '#7ce6ec');
      // A thin, symmetric strip communicates reflection from either side, not a solid wedge.
      c.lineCap = 'round'; c.strokeStyle = '#7ce6ec'; c.lineWidth = Math.max(3, s * .075);
      c.beginPath(); c.moveTo(x - s * .3, y + s * (m.slope === '/' ? .3 : -.3)); c.lineTo(x + s * .3, y + s * (m.slope === '/' ? -.3 : .3)); c.stroke();
      c.strokeStyle = '#d9ffff'; c.lineWidth = Math.max(1, s * .02); c.stroke();
    }
    for (const cell of level.springs || []) {
      const [x, y, s] = tile(cell, '#d4a5ff');
      c.strokeStyle = '#d4a5ff'; c.lineWidth = 3; c.beginPath();
      c.moveTo(x - s * .28, y - s * .26);
      for (let j = 0; j < 5; j++) c.lineTo(x + s * (j % 2 ? -.25 : .25), y - s * .2 + j * s * .1);
      c.lineTo(x + s * .28, y + s * .26); c.stroke();
    }
    const keys = [...new Set((level.gates || []).map(g => g.key))];
    for (const g of level.gates || []) {
      const closed = !!game.paths[g.key], color = colors[g.key % colors.length];
      const [x, y, s] = tile(g.cell, color, closed ? 1 : .25);
      if (closed) { c.strokeStyle = color; c.lineWidth = s * .055; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(x + k * s * .2, y - s * .32); c.lineTo(x + k * s * .2, y + s * .32); c.stroke(); } }
      c.fillStyle = '#0b202b'; c.fillRect(x - s * .13, y - s * .16, s * .26, s * .32);
      c.fillStyle = color; c.font = `900 ${s * .23}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String.fromCharCode(65 + keys.indexOf(g.key)), x, y);
      c.globalAlpha = 1;
    }
  }
  function drawRope(path, i, dir, time) {
    if (!path || path.length < 2) return;
    const s = view.cs, col = colors[i % colors.length], h = path[path.length - 1];
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(X(path[0].x), Y(path[0].y)); for (const p of path.slice(1)) c.lineTo(X(p.x), Y(p.y));
    if (game.hint === i && time < game.hintUntil) { c.shadowColor = '#fff'; c.shadowBlur = 10 + 7 * Math.sin(time / 150); }
    c.strokeStyle = '#081822'; c.lineWidth = s * .43; c.stroke();
    c.strokeStyle = col; c.lineWidth = s * .32; c.stroke(); c.shadowBlur = 0;
    c.strokeStyle = '#ffffff50'; c.lineWidth = s * .07; c.setLineDash([s * .06, s * .12]); c.stroke(); c.setLineDash([]);
    const [dx, dy] = dir, hx = X(h.x), hy = Y(h.y);
    c.fillStyle = col; c.beginPath(); c.moveTo(hx + dx * s * .35, hy + dy * s * .35);
    c.lineTo(hx - dx * s * .15 - dy * s * .27, hy - dy * s * .15 + dx * s * .27);
    c.lineTo(hx - dx * s * .15 + dy * s * .27, hy - dy * s * .15 - dx * s * .27); c.closePath(); c.fill();
    const keys = [...new Set((level.gates || []).map(g => g.key))];
    if (keys.includes(i)) {
      const tail = path[0], x = X(tail.x), y = Y(tail.y);
      c.fillStyle = '#10232f'; c.beginPath(); c.arc(x, y, s * .15, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff'; c.font = `900 ${s * .2}px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String.fromCharCode(65 + keys.indexOf(i)), x, y);
    }
  }
  function draw(time) {
    const a = game.animation;
    if (a && time - a.start >= a.duration) {
      game.paths = a.paths; game.animation = null; sync();
      message(game.paths.every(p => !p) ? 'Untangled! Try the next puzzle.' : a.event === 'bounce' ? 'The arrow is at the other end. Tap again to move it.' : 'What can you free next?');
    }
    c.setTransform(view.dpr, 0, 0, view.dpr, 0, 0); c.clearRect(0, 0, view.screenWidth, view.screenHeight);
    if (view.rotated) { c.translate(view.screenWidth, 0); c.rotate(Math.PI / 2); }
    c.fillStyle = '#ffffff12';
    for (let y = 0; y < level.H; y++) for (let x = 0; x < level.W; x++) { c.beginPath(); c.arc(X(x), Y(y), Math.max(1.5, view.cs * .035), 0, Math.PI * 2); c.fill(); }
    drawTiles();
    game.paths.forEach((path, i) => {
      if (!path) return;
      const a = game.animation;
      if (a && a.i === i) {
        const elapsed = time - a.start;
        if (elapsed >= a.motion && a.event === 'bounce') { drawRope(a.paths[i], i, logic.direction(level, a.paths[i]), time); return; }
        const t = a.motion ? Math.min(1, elapsed / a.motion) : 1, progress = t * t * (3 - 2 * t);
        const moving = movingPath(a, progress), headOffset = a.distance * progress + a.length - 1;
        const here = pointAt(a.route, headOffset), there = pointAt(a.route, Math.min(a.route.length - 1, headOffset + .02));
        let dx = there.x - here.x, dy = there.y - here.y, length = Math.hypot(dx, dy);
        if (!length) { [dx, dy] = logic.direction(level, moving); length = 1; }
        drawRope(moving, i, [dx / length, dy / length], time);
      } else drawRope(path, i, logic.direction(level, path), time);
    });
    requestAnimationFrame(draw);
  }
  canvas.addEventListener('pointerdown', e => {
    const b = canvas.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
    const gx = ((view.rotated ? y : x) - view.ox) / view.cs - .5, gy = ((view.rotated ? view.screenWidth - x : y) - view.oy) / view.cs - .5;
    let best = -1, distance = .6;
    game.paths.forEach((path, i) => { for (const p of path || []) { const d = Math.hypot(p.x - gx, p.y - gy); if (d < distance) { distance = d; best = i; } } });
    if (best >= 0) tap(best);
  });
  $('puzzle').onchange = () => load(+$('puzzle').value); $('undo').onclick = undo; $('hint').onclick = hint;
  $('restart').onclick = () => load(game.index); $('prev').onclick = () => load(game.index - 1); $('next').onclick = () => load(game.index + 1);
  load((Number(new URL(location.href).searchParams.get('puzzle')) || 1) - 1);
  new ResizeObserver(resize).observe($('board-wrap')); requestAnimationFrame(draw);
  window.__mfSandbox = { game, load, tap, undo, hint, get view() { return view; }, get level() { return level; } };
})();
