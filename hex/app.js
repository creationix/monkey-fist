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
function resize() {
  const rect = $('boardWrap').getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2.5); width = rect.width; height = rect.height;
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!G.level) return;
  const points = H.cells(G.level).map(H.project), minX = Math.min(...points.map(p => p.x)) - .5, maxX = Math.max(...points.map(p => p.x)) + .5;
  const minY = -1 / Math.sqrt(3), maxY = Math.max(...points.map(p => p.y)) + 1 / Math.sqrt(3), w = maxX - minX, h = maxY - minY;
  const normal = Math.min((width - 24) / w, (height - 24) / h), rotated = Math.min((width - 24) / h, (height - 24) / w);
  const rot = rotated > normal, scale = Math.max(1, Math.min(90, rot ? rotated : normal));
  G.view = { rotated: rot, scale, ox: width / 2 - (rot ? -(maxY + minY) : maxX + minX) * scale / 2, oy: height / 2 - (rot ? maxX + minX : maxY + minY) * scale / 2 };
  const bw = (rot ? h : w) * scale, bh = (rot ? w : h) * scale, pad = Math.max(0, Math.min(8, (width - bw) / 2 - 2, (height - bh) / 2 - 2));
  G.view.panel = { x: (width - bw) / 2 - pad, y: (height - bh) / 2 - pad, w: bw + pad * 2, h: bh + pad * 2 };
  draw(0);
}
function path(ctx, points, close = false) { ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); if (close) ctx.closePath(); }
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16), channel = x => Math.round(amount < 0 ? x * (1 + amount) : x + (255 - x) * amount);
  return `rgb(${channel(n >> 16)},${channel(n >> 8 & 255)},${channel(n & 255)})`;
}
// One continuous strand treatment for ropes and lock bindings. Dash phase follows
// the material as a rope slides, rather than restarting at every hex-grid segment.
function cord(points, width, col, phase = 0) {
  const dark = shade(col, -.55), opacity = ctx.globalAlpha;
  ctx.lineCap = ctx.lineJoin = 'round'; ctx.setLineDash([]);
  path(ctx, points); ctx.strokeStyle = dark; ctx.lineWidth = width * 1.3; ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = width; ctx.stroke();
  ctx.lineCap = 'butt'; ctx.setLineDash([width * .175, width * .325]); ctx.lineDashOffset = phase;
  ctx.lineWidth = width * .92; ctx.strokeStyle = dark; ctx.globalAlpha = opacity * .24; ctx.stroke();
  ctx.setLineDash([]); ctx.lineDashOffset = 0; ctx.lineCap = 'round';
  ctx.lineWidth = width * .26; ctx.strokeStyle = shade(col, .7); ctx.globalAlpha = opacity * .35; ctx.stroke(); ctx.globalAlpha = opacity;
}
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
  ctx.save(); ctx.translate(p.x, p.y);
  const r = size * .5, gold = ctx.createLinearGradient(-r, -r, r, r);
  gold.addColorStop(0, '#fff1bc'); gold.addColorStop(.48, '#ddb867'); gold.addColorStop(1, '#a57337');
  ctx.fillStyle = '#503b28'; ctx.beginPath(); ctx.arc(0, size * .055, r * 1.12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = gold; ctx.strokeStyle = '#72502e'; ctx.lineWidth = size * .07;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = shade(col, -.5); ctx.beginPath(); ctx.arc(0, 0, r * .74, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff3cc'; ctx.font = '900 ' + size * .65 + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(letter, 0, size * .025); ctx.restore();
}
function drawRope(i, time) {
  const rope = visiblePath(i); if (!rope) return; const s = G.view.scale, points = rope.map(screen), col = color(i), dark = shade(col, -.55);
  ctx.save();
  if (G.bump?.i === i) { const d = H.direction(G.paths[i]), a = screen(G.paths[i].at(-1)), b = screen(H.add(G.paths[i].at(-1), d)), t = Math.sin(G.bump.time / .25 * Math.PI) * .1; ctx.translate((b.x - a.x) * t, (b.y - a.y) * t); }
  ctx.lineJoin = ctx.lineCap = 'round';
  const tip = points.at(-1), prev = points.at(-2), len = Math.hypot(tip.x - prev.x, tip.y - prev.y), dx = (tip.x - prev.x) / len, dy = (tip.y - prev.y) / len;
  const arrow = (grow, fill) => {
    const reach = s * .44 + grow, back = s * .12, half = s * .32 + grow;
    path(ctx, [{ x: tip.x + dx * reach, y: tip.y + dy * reach }, { x: tip.x - dx * back - dy * half, y: tip.y - dy * back + dx * half }, { x: tip.x - dx * back + dy * half, y: tip.y - dy * back - dx * half }], true);
    ctx.fillStyle = fill; ctx.fill();
  };
  if (G.hint === i || G.selected === i) {
    const pulse = .5 + .5 * Math.sin(time * 7); ctx.shadowColor = '#fff0b0'; ctx.shadowBlur = s * (.22 + .13 * pulse);
    path(ctx, points); ctx.strokeStyle = '#fff1b4'; ctx.lineWidth = s * .56; ctx.stroke(); arrow(s * .09, '#fff1b4'); ctx.shadowBlur = 0;
  }
  // Match the square game's colored contour, woven ribs, and soft central light.
  cord(points, s * .4, col, (G.moves.get(i)?.progress || 0) * s);
  arrow(s * .065, dark); arrow(0, col);
  // Carry the central highlight into the arrow so its head and body read as one rope.
  ctx.strokeStyle = shade(col, .7); ctx.lineWidth = s * .10; ctx.globalAlpha = .35;
  path(ctx, [{ x: tip.x - dx * s * .16, y: tip.y - dy * s * .16 }, { x: tip.x + dx * s * .22, y: tip.y + dy * s * .22 }]); ctx.stroke(); ctx.globalAlpha = 1;
  const lock = G.level.locks.findIndex(g => g.key === i); if (lock >= 0) badge(points[0], String.fromCharCode(65 + lock), s * .4, col);
  ctx.restore();
}
function drawLock(g, i) {
  const s = G.view.scale, p = screen(g.cell), open = G.lockOpen[i] || 0, letter = String.fromCharCode(65 + i), col = color(g.key);
  if (open > .995) return; // An open lane should look empty, not like a faded obstacle.
  ctx.save(); ctx.translate(p.x, p.y - open * s * .12); ctx.scale(1 - open * .25, 1 - open * .25);
  ctx.globalAlpha = 1 - open;
  const round = (x, y, w, h, radius, fill, stroke, lineWidth) => {
    ctx.beginPath(); ctx.roundRect(x * s, y * s, w * s, h * s, radius * s); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth * s; ctx.stroke(); }
  };
  // Rounded brass shackle, with separate dark edge, metal and reflected light.
  const shackle = () => { ctx.beginPath(); ctx.moveTo(-s * .16, s * .02); ctx.lineTo(-s * .16, -s * .16); ctx.arc(0, -s * .16, s * .16, Math.PI, 0); ctx.lineTo(s * .16, s * (.02 - open * .15)); };
  ctx.save(); ctx.translate(-s * .16, 0); ctx.rotate(-open * .5); ctx.translate(s * .16, 0);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  shackle(); ctx.strokeStyle = '#6c5838'; ctx.lineWidth = s * .14; ctx.stroke();
  const metal = ctx.createLinearGradient(-s * .2, -s * .3, s * .2, s * .1);
  metal.addColorStop(0, '#fff2bf'); metal.addColorStop(.45, '#daba77'); metal.addColorStop(1, '#9c713b');
  ctx.strokeStyle = metal; ctx.lineWidth = s * .09; ctx.stroke(); ctx.restore();
  // Wood grain and rope bindings echo the square game's lashed gate posts.
  round(-.32, -.035, .64, .42, .09, '#081b2470');
  const wood = ctx.createLinearGradient(-s * .3, -s * .1, s * .3, s * .3);
  wood.addColorStop(0, '#e9bf7c'); wood.addColorStop(.35, '#c49153'); wood.addColorStop(1, '#93623a');
  round(-.31, -.075, .62, .42, .085, wood, '#705035', .035);
  ctx.strokeStyle = '#ffdfa060'; ctx.lineWidth = s * .017;
  for (const row of [.01, .105, .24]) { path(ctx, [{ x: -s * .25, y: s * row }, { x: s * .25, y: s * (row + .025) }]); ctx.stroke(); }
  for (const side of [-1, 1]) cord([{ x: side * s * .21, y: -s * .07 }, { x: side * s * .21, y: s * .34 }], s * .065, col);
  badge({ x: 0, y: s * .13 }, letter, s * .38, col);
  ctx.restore();
}
function draw(time) {
  ctx.clearRect(0, 0, width, height); if (!G.level) return;
  const board = new Path2D(), b = G.view.panel, s = G.view.scale;
  board.roundRect(b.x, b.y, b.w, b.h, Math.min(22, s * .4));
  const surface = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  surface.addColorStop(0, '#ffffff0c'); surface.addColorStop(1, '#ffffff06');
  ctx.fillStyle = surface; ctx.fill(board); ctx.strokeStyle = '#ffffff14'; ctx.lineWidth = 1.5; ctx.stroke(board);
  ctx.save(); ctx.clip(board);
  ctx.fillStyle = '#b3d7d91c';
  for (const p of H.cells(G.level)) { const at = screen(p); ctx.beginPath(); ctx.arc(at.x, at.y, Math.max(1.2, s * .035), 0, Math.PI * 2); ctx.fill(); }
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
