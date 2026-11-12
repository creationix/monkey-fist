/* global MFHex, MFMusic */
'use strict';
const H = MFHex, $ = id => document.getElementById(id), canvas = $('board'), ctx = canvas.getContext('2d');
const PALETTE = ['#37d5ac', '#f9bd4a', '#a987f5', '#f785ac', '#58b7ef', '#f7a251', '#e8dca1', '#f46f73', '#73d677'];
const STORAGE = 'monkey-fist-hex-v1';
let save; try { save = JSON.parse(localStorage.getItem(STORAGE)) || {}; } catch { save = {}; }
const persist = () => { try { localStorage.setItem(STORAGE, JSON.stringify(save)); } catch { /* Play still works without storage. */ } };
const params = new URLSearchParams(location.search);
let opts = H.parseCode(params.get('set')) || H.parseCode(save.code) || { seed: 'MONKEYFIST', count: 60, big: false };
save.sets ||= {};
const G = { level: null, paths: [], plan: [], moves: new Map(), get moving() { return this.moves.size > 0; }, taps: 0, undos: 3, history: [], auto: false, ended: false, hint: -1, selected: -1, lockOpen: [], view: {}, bump: null };
let noticeTimer, musicPlayer = null, audioContext = null, lastTime = 0, width = 1, height = 1;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const color = i => PALETTE[i % PALETTE.length];
function notice(text) { $('notice').textContent = text; $('notice').classList.add('show'); clearTimeout(noticeTimer); noticeTimer = setTimeout(() => $('notice').classList.remove('show'), 2400); }
function syncMusic() { $('music').textContent = save.music ? '♫ Music on' : '♫ Music off'; $('music').setAttribute('aria-pressed', !!save.music); musicPlayer?.setEnabled(!!save.music && !document.hidden && !$('chooser').open && !$('result').open); }
function audio() {
  if (!audioContext) {
    const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) return;
    audioContext = new Audio(); const gain = audioContext.createGain(); gain.gain.value = .7; gain.connect(audioContext.destination);
    musicPlayer = MFMusic.createMusicPlayer(audioContext, gain); musicPlayer.setLevel(G.index + 1);
  }
  audioContext.resume().catch(() => {}); syncMusic();
}
function tone(exit) {
  if (!audioContext || !save.music) return;
  const o = audioContext.createOscillator(), g = audioContext.createGain(), t = audioContext.currentTime;
  o.type = 'sine'; o.frequency.value = exit ? 660 : 190; g.gain.setValueAtTime(.03, t); g.gain.exponentialRampToValueAtTime(.0001, t + .14);
  o.connect(g); g.connect(audioContext.destination); o.start(); o.stop(t + .15); o.onended = () => { o.disconnect(); g.disconnect(); };
}
function updateURL() {
  const u = new URL(location.href); u.searchParams.set('set', H.code(opts)); u.searchParams.set('level', G.index + 1); history.replaceState(null, '', u);
  save.code = H.code(opts); save.level = G.index + 1; persist();
}
function start(index) {
  G.index = Math.max(0, Math.min(opts.count - 1, Number(index) || 0));
  G.level = H.generate({ ...opts, index: G.index }); G.paths = G.level.ropes; G.plan = G.level.plan.slice();
  G.moves.clear();
  Object.assign(G, { taps: 0, undos: 3, history: [], auto: false, ended: false, hint: -1, hintTime: 0, selected: -1, bump: null, lost: false, lockOpen: G.level.locks.map(() => 0) });
  $('chooser').close(); $('result').close(); updateURL(); resize(); hud(); syncMusic(); musicPlayer?.setLevel(G.index + 1); draw(0);
}
function hud() {
  const l = G.level, left = G.paths.filter(Boolean).length;
  $('levelName').innerHTML = 'Level ' + (G.index + 1) + ' <span>/ ' + opts.count + '</span>';
  $('chapter').textContent = l.locks.length ? 'UNDER LOCK & KEY' : l.slides ? 'SLIDE TO UNTANGLE' : 'SIX DIRECTIONS';
  const locks = l.locks.filter(g => G.paths[g.key]).length;
  $('remaining').textContent = left + ' ropes' + (locks ? ' · ' + locks + (locks === 1 ? ' lock' : ' locks') : ' left');
  $('score').textContent = G.taps + (G.taps === 1 ? ' tap' : ' taps') + ' · par ' + l.par;
  $('score').title = l.exact ? 'Fewest possible player taps' : 'Verified solution score; fewer taps may be possible';
  $('undos').textContent = G.undos;
  $('undo').disabled = !G.undos || !G.history.length || G.auto || G.ended;
  $('hint').disabled = G.auto || G.ended || G.lost || G.moves.has(G.plan[0]);
  $('tip').textContent = G.lost ? 'Knotted. Undo or restart to try another route.' : G.auto ? 'All clear! These ropes release for free.' : l.locks.length ? 'Free a lettered rope to open its matching lock.' : l.slides ? 'A slide can pull a tail out of another rope’s way.' : 'Tap a rope. Follow its arrow in one of six directions.';
}
function tap(i, automatic = false) {
  if (!G.paths[i] || G.moves.has(i) || G.ended || (G.auto && !automatic)) return;
  if (!automatic) { audio(); G.taps++; G.hint = -1; }
  const m = H.tap(G.level, G.paths, i);
  if (!m) { G.bump = { i, time: .25 }; tone(false); if (!automatic) notice('Blocked'); hud(); return; }
  if (!automatic) G.history.push({ paths: G.paths, plan: G.plan.slice(), lost: G.lost });
  if (G.bump?.i === i) G.bump = null;
  G.moves.set(i, { ...m, path: G.paths[i], i, progress: 0, automatic, speed: 0 });
  commit(G.moves.get(i));
  hud();
}
function commit(m) {
  G.paths = m.paths;
  if (!m.automatic) {
    if (G.plan[0] === m.i) G.plan.shift();
    else {
      // Keep a still-valid certificate; only search after a move changes it.
      const plan = G.plan.filter(i => G.paths[i]);
      if (H.replay(G.level, plan, G.paths).solved) G.plan = plan;
      else { const answer = H.solve(G.level, G.paths, 900, plan); G.plan = answer.moves; G.lost = answer.solved === false; }
    }
    G.auto = H.allFree(G.level, G.paths);
  }
  if (G.paths.some(Boolean) && !G.paths.some((p, i) => p && H.tap(G.level, G.paths, i))) G.lost = true;
  hud();
}
function undo() {
  if (!G.undos || !G.history.length || G.auto || G.ended) return;
  const state = G.history.pop(); Object.assign(G, state); G.moves.clear(); G.bump = null; G.undos--; G.taps++; G.hint = -1;
  notice('Undo · +1 tap'); hud(); draw(0);
}
function hint() {
  if (G.auto || G.ended || G.lost || G.moves.has(G.plan[0])) return;
  if (!G.plan.length) {
    const answer = H.solve(G.level, G.paths, 5000); G.plan = answer.moves;
    if (!G.plan.length) { if (answer.solved === false) G.lost = true; notice(G.lost ? 'Knotted. Try undo.' : 'No route found yet. Try undo.'); hud(); return; }
  }
  if (G.hint === G.plan[0] && G.hintTime > 0) { G.hintTime = 3; return; }
  G.hint = G.plan[0]; G.hintTime = 3; G.taps += 2; notice('Hint · +2 taps'); hud();
}
function finish() {
  G.ended = true; const stars = G.taps <= G.level.par ? 3 : G.taps <= G.level.par + 2 ? 2 : 1;
  const code = H.code(opts), scores = save.sets[code] ||= {}, old = scores[G.index];
  if (!old || G.taps < old.taps) scores[G.index] = { taps: G.taps, stars }; persist();
  $('stars').innerHTML = '★'.repeat(stars) + '<span>' + '★'.repeat(3 - stars) + '</span>'; $('stars').setAttribute('aria-label', stars + ' out of 3 stars');
  $('resultText').textContent = G.taps + (G.taps === 1 ? ' tap' : ' taps') + ' · par ' + G.level.par + '. Automatic releases are free.';
  $('next').hidden = G.index + 1 >= opts.count; $('result').showModal(); syncMusic();
}
function update(dt) {
  if (!G.level || $('chooser').open) return;
  if (G.hintTime > 0) { G.hintTime -= dt; if (G.hintTime <= 0) G.hint = -1; }
  if (G.bump) { G.bump.time -= dt; if (G.bump.time <= 0) G.bump = null; }
  G.level.locks.forEach((g, i) => { const target = G.paths[g.key] ? 0 : 1; G.lockOpen[i] += (target - G.lockOpen[i]) * Math.min(1, dt * 12); });
  let settled = false;
  for (const [id, m] of G.moves) {
    m.speed = Math.min(38, m.speed + dt * 100);
    m.progress = Math.min(m.distance, m.progress + (reduced ? m.distance * dt * 12 : m.speed * dt));
    if (m.progress >= m.distance - .001) { G.moves.delete(id); settled = true; tone(m.event === 'exit'); }
  }
  if (!G.ended && G.paths.every(p => !p) && !G.moving) finish();
  else if (G.auto && !G.ended) tap(G.paths.findIndex((p, i) => p && !G.moves.has(i)), true);
  if (settled) hud();
}
function raw(p, rotated) { const v = H.project(p); return rotated ? { x: -v.y, y: v.x } : v; }
function screen(p) { const v = raw(p, G.view.rotated); return { x: G.view.ox + v.x * G.view.scale, y: G.view.oy + v.y * G.view.scale }; }
function polygon(p, radius = 1 / Math.sqrt(3)) {
  const center = H.project(p), points = [];
  for (let k = 0; k < 6; k++) { const a = (30 + k * 60) * Math.PI / 180, x = center.x + Math.cos(a) * radius, y = center.y + Math.sin(a) * radius;
    const v = G.view.rotated ? { x: -y, y: x } : { x, y }; points.push({ x: G.view.ox + v.x * G.view.scale, y: G.view.oy + v.y * G.view.scale }); }
  return points;
}
function resize() {
  const rect = $('boardWrap').getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2.5); width = rect.width; height = rect.height;
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!G.level) return;
  const points = H.cells(G.level).map(H.project), minX = Math.min(...points.map(p => p.x)) - .5, maxX = Math.max(...points.map(p => p.x)) + .5;
  const minY = -1 / Math.sqrt(3), maxY = Math.max(...points.map(p => p.y)) + 1 / Math.sqrt(3), w = maxX - minX, h = maxY - minY;
  const normal = Math.min((width - 24) / w, (height - 24) / h), rotated = Math.min((width - 24) / h, (height - 24) / w);
  const rot = rotated > normal, scale = Math.max(1, Math.min(90, rot ? rotated : normal));
  G.view = { rotated: rot, scale, ox: width / 2 - (rot ? -(maxY + minY) : maxX + minX) * scale / 2, oy: height / 2 - (rot ? maxX + minX : maxY + minY) * scale / 2 };
  draw(0);
}
function path(ctx, points, close = false) { ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); if (close) ctx.closePath(); }
function pointAt(route, t) {
  const i = Math.min(route.length - 2, Math.floor(t)), f = t - i, a = route[i], b = route[i + 1];
  return { q: a.q + (b.q - a.q) * f, r: a.r + (b.r - a.r) * f };
}
function visiblePath(i) {
  if (!G.moves.has(i)) return G.paths[i];
  const m = G.moves.get(i), start = m.progress, end = start + m.path.length - 1, points = [pointAt(m.route, start)];
  for (let k = Math.floor(start) + 1; k < end; k++) points.push(m.route[k]);
  points.push(pointAt(m.route, end)); return points;
}
function badge(p, letter, size, col) {
  ctx.save(); ctx.translate(p.x, p.y); ctx.fillStyle = '#c58e45'; ctx.strokeStyle = '#5a422a'; ctx.lineWidth = size * .12;
  ctx.beginPath(); ctx.arc(0, 0, size * .5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#f6dba0'; ctx.lineWidth = size * .06; ctx.stroke(); ctx.fillStyle = col || '#283339'; ctx.font = '800 ' + size * .64 + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(letter, 0, size * .025); ctx.restore();
}
function drawRope(i, time) {
  const rope = visiblePath(i); if (!rope) return; const s = G.view.scale, points = rope.map(screen), c = color(i);
  ctx.save();
  if (G.bump?.i === i) { const d = H.direction(G.paths[i]), a = screen(G.paths[i].at(-1)), b = screen(H.add(G.paths[i].at(-1), d)), t = Math.sin(G.bump.time / .25 * Math.PI) * .1; ctx.translate((b.x - a.x) * t, (b.y - a.y) * t); }
  ctx.lineJoin = ctx.lineCap = 'round';
  if (G.hint === i || G.selected === i) { path(ctx, points); ctx.strokeStyle = '#fff1b4'; ctx.globalAlpha = .4 + .25 * Math.sin(time * 7); ctx.lineWidth = s * .57; ctx.stroke(); ctx.globalAlpha = 1; }
  path(ctx, points); ctx.strokeStyle = '#03151dc0'; ctx.lineWidth = s * .46; ctx.stroke();
  ctx.strokeStyle = c; ctx.lineWidth = s * .36; ctx.stroke();
  ctx.strokeStyle = '#ffffff30'; ctx.lineWidth = s * .12; ctx.stroke();
  // Cross-strands follow all six directions, so the diagonal ropes keep their weave.
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1], b = points[k], length = Math.hypot(b.x - a.x, b.y - a.y); if (!length) continue;
    const dx = (b.x - a.x) / length, dy = (b.y - a.y) / length;
    ctx.lineWidth = s * .055; ctx.lineCap = 'butt';
    for (let at = s * .07; at < length; at += s * .14) {
      const x = a.x + dx * at, y = a.y + dy * at;
      ctx.strokeStyle = '#061c2933'; path(ctx, [{ x: x - dy * s * .16, y: y + dx * s * .16 }, { x: x + dy * s * .16, y: y - dx * s * .16 }]); ctx.stroke();
    }
  }
  const tip = points.at(-1), prev = points.at(-2), len = Math.hypot(tip.x - prev.x, tip.y - prev.y), dx = (tip.x - prev.x) / len, dy = (tip.y - prev.y) / len;
  path(ctx, [{ x: tip.x + dx * s * .39, y: tip.y + dy * s * .39 }, { x: tip.x - dx * s * .16 - dy * s * .29, y: tip.y - dy * s * .16 + dx * s * .29 }, { x: tip.x - dx * s * .16 + dy * s * .29, y: tip.y - dy * s * .16 - dx * s * .29 }], true);
  ctx.fillStyle = c; ctx.strokeStyle = '#061c2955'; ctx.lineWidth = s * .055; ctx.lineJoin = 'miter'; ctx.fill(); ctx.stroke();
  const lock = G.level.locks.findIndex(g => g.key === i); if (lock >= 0) badge(points[0], String.fromCharCode(65 + lock), s * .42);
  ctx.restore();
}
function drawLock(g, i) {
  const s = G.view.scale, p = screen(g.cell), open = G.lockOpen[i] || 0, letter = String.fromCharCode(65 + i);
  ctx.save(); path(ctx, polygon(g.cell, .44)); ctx.fillStyle = '#233e43'; ctx.strokeStyle = '#9c8053'; ctx.lineWidth = s * .05; ctx.globalAlpha = 1 - open * .8; ctx.fill(); ctx.stroke();
  if (open < .98) {
    ctx.translate(p.x, p.y); ctx.scale(1 - open * .55, 1 - open * .55); ctx.strokeStyle = '#f3d294'; ctx.lineWidth = s * .075;
    ctx.beginPath(); ctx.arc(0, -s * .09, s * .13, Math.PI, 0); ctx.lineTo(s * .13, s * .09); ctx.moveTo(-s * .13, -s * .09); ctx.lineTo(-s * .13, s * .09); ctx.stroke();
    ctx.fillStyle = color(g.key); ctx.strokeStyle = '#5f543c'; ctx.lineWidth = s * .04; ctx.beginPath(); ctx.roundRect(-s * .23, -s * .025, s * .46, s * .31, s * .07); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#122b34'; ctx.font = '800 ' + s * .23 + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(letter, 0, s * .13);
  }
  ctx.restore();
}
function draw(time) {
  ctx.clearRect(0, 0, width, height); if (!G.level) return;
  const board = new Path2D();
  for (const p of H.cells(G.level)) {
    const vertices = polygon(p); vertices.forEach((v, i) => i ? board.lineTo(v.x, v.y) : board.moveTo(v.x, v.y)); board.closePath();
  }
  ctx.fillStyle = '#8bbdb909'; ctx.fill(board); ctx.strokeStyle = '#86b6b218'; ctx.lineWidth = 1; ctx.stroke(board);
  ctx.save(); ctx.clip(board);
  G.level.locks.forEach(drawLock);
  for (let i = 0; i < G.paths.length; i++) if (G.paths[i] && !G.moves.has(i)) drawRope(i, time);
  for (const i of G.moves.keys()) drawRope(i, time);
  ctx.restore();
}
function distanceTo(p, a, b) { const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy))); return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t); }
canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0 || G.auto) return;
  const rect = canvas.getBoundingClientRect(), p = { x: e.clientX - rect.left, y: e.clientY - rect.top }; let best = -1, distance = G.view.scale * .43;
  G.paths.forEach((rope, i) => { if (!rope || G.moves.has(i)) return; const points = rope.map(screen), d = H.direction(rope); points.push(screen(H.add(rope.at(-1), d, .35)));
    for (let j = 1; j < points.length; j++) { const v = distanceTo(p, points[j - 1], points[j]); if (v < distance) { distance = v; best = i; } }
  });
  if (best >= 0) { e.preventDefault(); G.selected = -1; tap(best); }
});
canvas.addEventListener('keydown', e => {
  const ropes = G.paths.flatMap((p, i) => p ? [i] : []); if (!ropes.length) return;
  if (e.key.startsWith('Arrow')) { e.preventDefault(); const step = ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 1; G.selected = ropes[(ropes.indexOf(G.selected) + step + ropes.length) % ropes.length]; }
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (G.selected >= 0) tap(G.selected); }
});
function renderChooser() {
  $('seed').value = opts.seed; $('count').value = opts.count; $('big').checked = opts.big; $('share').textContent = H.code(opts);
  const scores = save.sets[H.code(opts)] || {}; $('grid').replaceChildren();
  for (let i = 0; i < opts.count; i++) {
    const button = document.createElement('button'); button.className = i === G.index ? 'current' : ''; button.innerHTML = (i + 1) + '<small>' + (scores[i] ? '★'.repeat(scores[i].stars) : '') + '</small>';
    button.setAttribute('aria-label', 'Level ' + (i + 1) + (scores[i] ? ', ' + scores[i].stars + ' stars' : '')); button.onclick = () => { audio(); start(i); }; $('grid').append(button);
  }
}
function chooser() { $('result').close(); renderChooser(); $('chooser').showModal(); syncMusic(); }
function settings() { opts = H.parseCode($('seed').value) || { seed: H.cleanSeed($('seed').value), count: +$('count').value, big: $('big').checked }; renderChooser(); }
$('levels').onclick = chooser; $('resultLevels').onclick = chooser;
$('closeLevels').onclick = () => { if (H.code(opts) !== save.code) start(0); else { $('chooser').close(); syncMusic(); } };
$('chooser').addEventListener('cancel', e => { e.preventDefault(); $('closeLevels').click(); });
$('result').addEventListener('cancel', e => { e.preventDefault(); chooser(); });
$('restart').onclick = () => start(G.index); $('again').onclick = () => start(G.index); $('next').onclick = () => start(G.index + 1);
$('undo').onclick = undo; $('hint').onclick = hint;
$('seed').onchange = settings; $('count').onchange = settings; $('big').onchange = settings;
$('dice').onclick = () => { const n = new Uint32Array(2); crypto.getRandomValues(n); opts.seed = (n[0].toString(36) + n[1].toString(36)).slice(0, 10).toUpperCase(); renderChooser(); };
$('defaultSeed').onclick = () => { opts.seed = 'MONKEYFIST'; renderChooser(); };
$('share').onclick = async () => { const u = new URL(location.href); u.searchParams.set('set', H.code(opts)); u.searchParams.delete('level'); try { await navigator.clipboard.writeText(u.href); notice('Set link copied'); } catch { notice(H.code(opts)); } };
$('music').onclick = () => { save.music = !save.music; audio(); persist(); syncMusic(); };
document.addEventListener('visibilitychange', syncMusic);
new ResizeObserver(resize).observe($('boardWrap'));
start(Math.max(0, Number(params.get('level') || (save.code === H.code(opts) && save.level) || 1) - 1));
function frame(time) { const dt = Math.min(.05, (time - lastTime) / 1000); lastTime = time; update(dt); draw(time / 1000); musicPlayer?.tick(); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('../sw.js').catch(() => {});
window.__hex = { G, start, tap, undo, hint, update, draw, screen, get options() { return opts; }, save };
