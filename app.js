/* global MFGame, MFHex, MFAudio, MFRopeArt */
'use strict';
const H = MFGame, $ = id => document.getElementById(id), canvas = $('board'), ctx = canvas.getContext('2d');
const PALETTE = ['#37d5ac', '#f9bd4a', '#a987f5', '#f785ac', '#58b7ef', '#f7a251', '#e8dca1', '#f46f73', '#73d677'];
const STORAGE = 'monkey-fist-unified-v1';
let save; try { save = JSON.parse(localStorage.getItem(STORAGE)) || {}; } catch { save = {}; }
// Different generated boards get fresh scores. Keep both previous saves intact,
// and carry over the player's audio preferences.
if (!save.gen) {
  for (const key of ['monkey-fist', 'monkey-fist-hex-v1']) {
    try { const old = JSON.parse(localStorage.getItem(key)); if (old) { save.sound ??= old.sound; save.music ??= old.music; } } catch { /* Optional legacy preferences. */ }
  }
}
const persist = () => { try { localStorage.setItem(STORAGE, JSON.stringify(save)); } catch { /* Play still works without storage. */ } };
const params = new URLSearchParams(location.search);
let opts = H.parseCode(params.get('set')) || H.parseCode(save.code) || { ...H.DEFAULT };
let draft = { ...opts };
save.sets ||= {};
if (save.gen !== H.VERSION) {
  if (Object.keys(save.sets).length) (save.archives ||= {})['gen-' + (save.gen || 1)] = save.sets;
  save.sets = {}; save.chapters = 1; save.gen = H.VERSION;
}
save.chapters = Math.max(1, Math.min(12, Number(save.chapters) || 1));
save.sound = MFAudio.soundSetting(save.sound).id;
const G = { level: null, loading: false, paths: [], plan: [], moves: new Map(), get moving() { return this.moves.size > 0; }, taps: 0, undos: 3, history: [], auto: false, ended: false, hint: -1, selected: -1, view: {}, camera: { zoom: 1, x: 0, y: 0 }, bump: null };
const rules = () => H;
const headDirection = path => H.direction(G.level, path);
let noticeTimer, lastTime = 0, width = 1, height = 1, drawNext = true;
const gameAudio = MFAudio.createAudio(() => ({
  sound: save.sound, music: !!save.music && !document.hidden && !$('chooser').open && !$('result').open, level: G.index + 1,
}));
const { init: audio, sfx } = gameAudio;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const color = i => PALETTE[i % PALETTE.length];
function notice(text) { $('notice').textContent = text; $('notice').classList.add('show'); clearTimeout(noticeTimer); noticeTimer = setTimeout(() => $('notice').classList.remove('show'), 2400); }
function syncMusic() {
  $('music').textContent = save.music ? '♫ Music on' : '♫ Music off'; $('music').setAttribute('aria-pressed', !!save.music);
  const sound = MFAudio.soundSetting(save.sound);
  $('sound').textContent = 'Sound: ' + sound.label; $('sound').setAttribute('aria-pressed', sound.id !== 'off');
  $('sound').setAttribute('aria-label', 'Sound effects: ' + sound.label);
  gameAudio.sync();
}
function updateURL() {
  const u = new URL(location.href); u.searchParams.set('set', H.code(opts)); u.searchParams.set('level', G.index + 1); history.replaceState(null, '', u);
  save.code = H.code(opts); save.level = G.index + 1; persist();
}
let generation = 0, pendingGeneration = null;
const levelCache = new Map();
function weave(options) {
  const key = H.code(options) + '/' + options.index;
  if (levelCache.has(key)) return Promise.resolve(levelCache.get(key));
  return new Promise((resolve, reject) => {
    if (typeof Worker === 'undefined') { setTimeout(() => { try { resolve(H.generate(options)); } catch (e) { reject(e); } }, 0); return; }
    const worker = new Worker('generator-worker.js?v=1');
    pendingGeneration = () => { worker.terminate(); resolve(null); };
    worker.onmessage = ({ data }) => {
      worker.terminate(); pendingGeneration = null;
      if (data.error) { reject(Error(data.error)); return; }
      levelCache.set(key, data.level); if (levelCache.size > 8) levelCache.delete(levelCache.keys().next().value);
      resolve(data.level);
    };
    worker.onerror = e => { worker.terminate(); pendingGeneration = null; reject(Error(e.message)); };
    worker.postMessage(options);
  });
}
async function start(index) {
  const request = ++generation; pendingGeneration?.(); pendingGeneration = null;
  pointers.clear(); gesture = null;
  G.index = Math.max(0, Math.min(H.available(opts, save.chapters) - 1, Math.floor(Number(index) || 0)));
  G.level = null; G.loading = true; G.paths = []; G.plan = []; G.auto = false;
  G.moves.clear();
  $('chooser').close(); $('result').close(); updateURL(); hud(); syncMusic(); gameAudio.music?.setLevel(G.index + 1); draw(0);
  try {
    const level = await weave({ ...opts, index: G.index }); if (request !== generation || !level) return;
    G.level = level; G.paths = level.ropes; G.plan = level.plan.slice(); G.loading = false;
    Object.assign(G, { taps: 0, undos: 3, history: [], auto: false, ended: false, hint: -1, hintTime: 0, selected: -1, bump: null, lost: false, clearNo: 0, combo: 0, assisted: new Set(), camera: { zoom: 1, x: 0, y: 0 } });
    resize(); hud(); draw(0);
  } catch {
    if (request !== generation) return;
    G.loading = false; hud(); notice('Couldn’t weave this board. Restart or try another seed.');
  }
}
function hud() {
  drawNext = true;
  const l = G.level, left = G.paths.filter(Boolean).length;
  $('levelName').innerHTML = 'Level ' + (G.index + 1) + ' <span>/ ' + opts.count + '</span>';
  $('loading').hidden = !G.loading; $('boardWrap').setAttribute('aria-busy', G.loading);
  $('zoomControls').hidden = !l;
  if (!l) {
    $('chapter').textContent = 'WEAVING YOUR TANGLE'; $('remaining').textContent = G.loading ? 'Weaving long ropes…' : 'Try another seed or restart.';
    $('score').textContent = ''; $('hint').disabled = $('undo').disabled = true; $('tip').textContent = 'Every seed weaves a different puzzle.'; return;
  }
  $('chapter').textContent = opts.kind === 'journey' ? 'JOURNEY · ' + (Math.floor(G.index / 10) + 1) + ' / 12' : 'YOUR CUSTOM SET';
  $('gridType').textContent = l.grid === 'hex' ? 'HEX' : 'SQUARE'; $('gridMark').textContent = l.grid === 'hex' ? '⬡' : '◇';
  canvas.setAttribute('aria-label', (l.grid === 'hex' ? 'Hexagonal' : 'Square') + ' rope puzzle. Tap a rope to slide it. Drag to explore; pinch or scroll to zoom. Arrow keys select ropes; Enter slides the selected rope.');
  $('remaining').textContent = left + ' ropes left';
  $('score').textContent = G.taps + (G.taps === 1 ? ' tap' : ' taps') + ' · par ' + l.par;
  $('undos').textContent = G.undos;
  $('undo').disabled = !G.undos || !G.history.length || G.auto || G.ended;
  $('hint').disabled = G.auto || G.ended || G.lost || G.moves.has(G.plan[0]);
  $('tip').textContent = G.lost ? 'Knotted. Undo or restart.' : G.auto ? 'All clear!' : l.springs?.length ? 'Springs reverse a rope.' : l.mirrors?.length ? 'Mirrors turn ropes.' : 'Tap a rope. Follow its arrow.';
}
function tap(i, automatic = false) {
  if (G.loading || !G.paths[i] || G.moves.has(i) || G.ended || (G.auto && !automatic)) return;
  if (!automatic) { audio(); G.taps++; G.hint = -1; }
  const m = rules().tap(G.level, G.paths, i);
  if (!m) { G.bump = { i, time: .25 }; G.combo = 0; sfx.thud(); if (!automatic) notice('Blocked'); hud(); return; }
  if (!automatic) G.history.push({ paths: G.paths, plan: G.plan.slice(), lost: G.lost });
  if (G.bump?.i === i) G.bump = null;
  if (m.event === 'exit') {
    const last = m.route.at(-1), previous = m.route.at(-2), d = [last.q - previous.q, last.r - previous.r];
    const extra = Math.ceil(Math.max(width, height) * 2 / G.view.scale) + 4;
    for (let n = 1; n <= extra; n++) m.route.push(H.add(last, d, n));
    m.distance += extra;
  }
  G.moves.set(i, { ...m, path: G.paths[i], i, progress: 0, automatic, speed: 0, hold: m.event === 'bounce' ? .16 : 0, popNote: m.event === 'exit' ? ++G.clearNo : 0 });
  commit(G.moves.get(i));
  sfx.slide();
  if (!automatic) {
    if (G.assisted.has(i)) G.combo = 0;
    else if (m.event === 'exit' && ++G.combo % 5 === 0) notice(G.combo + ' in a row!');
  }
  hud();
}
function commit(m) {
  const wasLost = G.lost;
  G.paths = m.paths;
  if (!m.automatic) {
    if (G.plan[0] === m.i) G.plan.shift();
    else {
      // Keep a still-valid certificate; only search after a move changes it.
      const plan = G.plan.filter(i => G.paths[i]);
      if (rules().replay(G.level, plan, G.paths).solved) G.plan = plan;
      else { const answer = rules().solve(G.level, G.paths, 900, plan); G.plan = answer.moves; G.lost = answer.solved === false; }
    }
    G.auto = rules().allFree(G.level, G.paths);
  }
  if (G.level.grid === 'hex' && !G.level.mirrors.length && !G.level.springs.length) {
    const board = MFHex.compile(G.level, G.paths);
    if (board.left && !G.paths.some((p, i) => p && board.to(i) !== board.offsets[i])) G.lost = true;
  } else if (G.paths.some(Boolean) && !G.paths.some((p, i) => p && H.tap(G.level, G.paths, i))) G.lost = true;
  if (G.lost && !wasLost) sfx.bump();
  hud();
}
function undo() {
  if (G.loading || !G.undos || !G.history.length || G.auto || G.ended) return;
  const state = G.history.pop(); Object.assign(G, state); G.moves.clear(); G.bump = null; G.undos--; G.taps++; G.hint = -1; G.combo = 0;
  sfx.undo(); notice('Undo · +1 tap'); hud(); draw(0);
}
function hint() {
  if (G.loading || !G.level || G.auto || G.ended || G.lost || G.moves.has(G.plan[0])) return;
  if (!G.plan.length) {
    const answer = rules().solve(G.level, G.paths, G.level.mirrors?.length ? 900 : 5000); G.plan = answer.moves;
    if (!G.plan.length) { if (answer.solved === false) G.lost = true; notice(G.lost ? 'Knotted. Try undo.' : 'No route found yet. Try undo.'); hud(); return; }
  }
  if (G.hint === G.plan[0] && G.hintTime > 0) { G.hintTime = 3; focusRope(G.hint); return; }
  G.hint = G.plan[0]; G.hintTime = 3; G.taps += 2; G.combo = 0; G.assisted.add(G.hint); focusRope(G.hint); sfx.hint(); notice('Hint · +2 taps'); hud();
}
function finish() {
  G.ended = true; const stars = G.taps <= G.level.par ? 3 : G.taps <= G.level.par + 2 ? 2 : 1;
  const code = H.code(opts), scores = save.sets[code] ||= {}, old = scores[G.index];
  if (!old || G.taps < old.taps) scores[G.index] = { taps: G.taps, stars };
  const previous = save.chapters;
  if (opts.kind === 'journey') save.chapters = H.unlock(save.chapters, G.index);
  persist();
  $('stars').innerHTML = '★'.repeat(stars) + '<span>' + '★'.repeat(3 - stars) + '</span>'; $('stars').setAttribute('aria-label', stars + ' out of 3 stars');
  $('resultText').textContent = G.taps + (G.taps === 1 ? ' tap' : ' taps') + ' · par ' + G.level.par;
  $('unlocked').textContent = save.chapters > previous ? 'Levels ' + (previous * 10 + 1) + '–' + (save.chapters * 10) + ' unlocked!' : opts.kind === 'journey' && G.index === 119 ? 'Journey complete. Make a new tangle in Custom.' : '';
  $('next').hidden = G.index + 1 >= H.available(opts, save.chapters); $('result').showModal(); syncMusic(); sfx.win();
}
function update(dt) {
  if (!G.level || $('chooser').open) return;
  if (G.hintTime > 0) { G.hintTime -= dt; if (G.hintTime <= 0) G.hint = -1; }
  if (G.bump) { G.bump.time -= dt; if (G.bump.time <= 0) G.bump = null; }
  let settled = false;
  for (const [id, m] of G.moves) {
    m.speed = Math.min(38, m.speed + dt * 100);
    m.progress = Math.min(m.distance, m.progress + (reduced ? m.distance * dt * 12 : m.speed * dt));
    if (m.progress >= m.distance - .001) { m.hold -= dt; if (m.hold <= 0) { G.moves.delete(id); settled = true; if (m.event === 'exit') sfx.pop(m.popNote); else sfx.thud(); } }
  }
  if (!G.ended && G.paths.every(p => !p) && !G.moving) finish();
  else if (G.auto && !G.ended) tap(G.paths.findIndex((p, i) => p && !G.moves.has(i)), true);
  if (settled) hud();
}
function raw(p, rotated) { const v = H.project(p, G.level); return rotated ? { x: -v.y, y: v.x } : v; }
function screen(p) { const v = raw(p, G.view.rotated); return { x: G.view.ox + v.x * G.view.scale, y: G.view.oy + v.y * G.view.scale }; }
function resize() {
  const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2.5); width = rect.width; height = rect.height;
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!G.level) return;
  const points = H.cells(G.level).map(p => H.project(p, G.level)), minX = Math.min(...points.map(p => p.x)) - .6, maxX = Math.max(...points.map(p => p.x)) + .6;
  const minY = Math.min(...points.map(p => p.y)) - .6, maxY = Math.max(...points.map(p => p.y)) + .6, w = maxX - minX, h = maxY - minY;
  // Fit leaves the corner controls clear. Zooming/panning still uses the entire screen.
  const wide = width > height * 1.2, usableW = width - (wide ? 300 : 24), usableH = height - (wide ? 28 : 220);
  const normal = Math.min(usableW / w, usableH / h), rotated = Math.min(usableW / h, usableH / w);
  const rot = rotated > normal, scale = Math.max(1, Math.min(110, rot ? rotated : normal));
  G.view = { rotated: rot, fit: scale, cx: (rot ? -(maxY + minY) : maxX + minX) / 2, cy: (rot ? maxX + minX : maxY + minY) / 2, bw: (rot ? h : w) * scale, bh: (rot ? w : h) * scale };
  applyCamera();
  draw(0);
}
function applyCamera() {
  if (!G.level) return;
  const c = G.camera, v = G.view, bw = v.bw * c.zoom, bh = v.bh * c.zoom;
  // Allow every part of the board to move clear of the fixed corner controls,
  // even at Fit. Clamp only when the entire board would leave the viewport.
  const limitX = (bw + width) / 2 - Math.min(bw, width) * .25, limitY = (bh + height) / 2 - Math.min(bh, height) * .25;
  c.x = Math.max(-limitX, Math.min(limitX, c.x)); c.y = Math.max(-limitY, Math.min(limitY, c.y));
  v.scale = v.fit * c.zoom; v.ox = width / 2 + c.x - v.cx * v.scale; v.oy = height / 2 + c.y - v.cy * v.scale;
  v.panel = { x: (width - bw) / 2 + c.x - 8, y: (height - bh) / 2 + c.y - 8, w: bw + 16, h: bh + 16 };
  $('zoomFit').textContent = 'Fit'; $('zoomFit').title = 'Fit and center the board · ' + Math.round(c.zoom * 100) + '%';
  $('zoomOut').disabled = c.zoom <= 1; $('zoomIn').disabled = c.zoom >= 8;
  canvas.classList.toggle('zoomed', c.zoom > 1);
}
function zoomTo(zoom, p = { x: width / 2, y: height / 2 }) {
  if (!G.level) return;
  const c = G.camera, next = Math.max(1, Math.min(8, zoom)), ratio = next / c.zoom;
  c.x = p.x - width / 2 - (p.x - width / 2 - c.x) * ratio;
  c.y = p.y - height / 2 - (p.y - height / 2 - c.y) * ratio; c.zoom = next;
  applyCamera(); draw(0);
}
function focusRope(i) {
  if (!G.paths[i]) return;
  const p = screen(G.paths[i].at(-1)), pad = Math.min(48, width / 4, height / 4);
  const r = canvas.getBoundingClientRect(), x = p.x + r.left, y = p.y + r.top;
  const covered = [...document.querySelectorAll('.brand, .readout, .actions, #audioControls, #tip, #zoomControls')].some(el => {
    const box = el.getBoundingClientRect(); return x >= box.left - 8 && x <= box.right + 8 && y >= box.top - 8 && y <= box.bottom + 8;
  });
  if (covered || p.x < pad || p.x > width - pad || p.y < pad || p.y > height - pad) {
    G.camera.x += width / 2 - p.x; G.camera.y += height / 2 - p.y; applyCamera();
  }
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
function drawRope(i, time) {
  const rope = visiblePath(i); if (!rope) return; const s = G.view.scale, points = rope.map(screen), col = color(i);
  ctx.save();
  if (G.bump?.i === i) { const d = headDirection(G.paths[i]), a = screen(G.paths[i].at(-1)), b = screen(H.add(G.paths[i].at(-1), d)), t = Math.sin(G.bump.time / .25 * Math.PI) * .1; ctx.translate((b.x - a.x) * t, (b.y - a.y) * t); }
  ctx.lineJoin = ctx.lineCap = 'round';
  const tip = points.at(-1), moving = G.moves.get(i);
  const ahead = screen(moving ? pointAt(moving.route, Math.min(moving.route.length - 1, moving.progress + moving.path.length - 1) - .001) : H.add(rope.at(-1), headDirection(rope)));
  if (moving) { ahead.x = 2 * tip.x - ahead.x; ahead.y = 2 * tip.y - ahead.y; }
  const len = Math.hypot(ahead.x - tip.x, ahead.y - tip.y), dx = (ahead.x - tip.x) / len, dy = (ahead.y - tip.y) / len;
  const arrow = (grow, fill) => {
    const reach = s * .44 + grow, back = s * .12, half = s * .32 + grow;
    path(ctx, [{ x: tip.x + dx * reach, y: tip.y + dy * reach }, { x: tip.x - dx * back - dy * half, y: tip.y - dy * back + dx * half }, { x: tip.x - dx * back + dy * half, y: tip.y - dy * back - dx * half }], true);
    ctx.fillStyle = fill; ctx.fill();
  };
  if (G.hint === i || G.selected === i) {
    const pulse = .5 + .5 * Math.sin(time * 7); ctx.shadowColor = '#fff0b0'; ctx.shadowBlur = s * (.22 + .13 * pulse);
    path(ctx, points); ctx.strokeStyle = '#fff1b4'; ctx.lineWidth = s * .56; ctx.stroke(); arrow(s * .09, '#fff1b4'); ctx.shadowBlur = 0;
  }
  // Texture coordinates start at the moving tail. Adding an animation phase
  // here would make the weave slip relative to the rope itself.
  MFRopeArt.draw(ctx, points, s * .4, col, { x: dx, y: dy }, !!moving);
  ctx.restore();
}
function drawMirrors() {
  const s = G.view.scale;
  for (const mirror of G.level.mirrors || []) {
    const d = G.level.grid === 'hex' ? H.DIRS[mirror.axis] : mirror.slope === '/' ? [1, -1] : [1, 1];
    const a = screen(H.add(mirror.cell, d, -.37)), b = screen(H.add(mirror.cell, d, .37));
    ctx.save(); ctx.lineCap = 'round';
    // A thin, symmetric silver/cyan blade: visibly reflective on both sides.
    path(ctx, [a, b]); ctx.strokeStyle = '#092631'; ctx.lineWidth = s * .22; ctx.stroke();
    ctx.strokeStyle = '#408c9a'; ctx.lineWidth = s * .15; ctx.stroke();
    ctx.strokeStyle = '#b5f4f1'; ctx.lineWidth = s * .075; ctx.stroke();
    for (const p of [a, b]) { ctx.beginPath(); ctx.arc(p.x, p.y, s * .075, 0, Math.PI * 2); ctx.fillStyle = '#e1ffff'; ctx.fill(); }
    ctx.restore();
  }
  for (const spring of G.level.springs || []) {
    const p = screen(spring); ctx.save(); ctx.translate(p.x, p.y);
    ctx.beginPath(); ctx.arc(0, 0, s * .34, 0, Math.PI * 2); ctx.fillStyle = '#183741'; ctx.fill();
    ctx.strokeStyle = '#ffcc7a'; ctx.lineWidth = s * .055; ctx.stroke();
    ctx.beginPath();
    for (let t = 0; t < Math.PI * 5.5; t += .12) { const r = s * (.035 + .011 * t); const x = Math.cos(t) * r, y = Math.sin(t) * r; if (!t) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.strokeStyle = '#ffb35a'; ctx.lineWidth = s * .052; ctx.stroke(); ctx.restore();
  }
}
function draw(time) {
  drawNext = false;
  ctx.clearRect(0, 0, width, height); if (!G.level) return;
  const board = new Path2D(), b = G.view.panel, s = G.view.scale;
  board.roundRect(b.x, b.y, b.w, b.h, Math.min(22, s * .4));
  const surface = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  surface.addColorStop(0, '#ffffff0c'); surface.addColorStop(1, '#ffffff06');
  ctx.fillStyle = surface; ctx.fill(board); ctx.strokeStyle = '#ffffff14'; ctx.lineWidth = 1.5; ctx.stroke(board);
  ctx.save(); ctx.clip(board);
  ctx.fillStyle = '#b3d7d91c';
  for (const p of H.cells(G.level)) { const at = screen(p); ctx.beginPath(); ctx.arc(at.x, at.y, Math.max(1.2, s * .035), 0, Math.PI * 2); ctx.fill(); }
  drawMirrors();
  for (let i = 0; i < G.paths.length; i++) if (G.paths[i] && !G.moves.has(i)) drawRope(i, time);
  ctx.restore();
  // Departing ropes stay visible all the way off-screen, including rotated boards.
  for (const i of G.moves.keys()) drawRope(i, time);
}
function distanceTo(p, a, b) { const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy))); return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t); }
function tapAt(p) {
  if (!G.level || G.auto) return;
  let best = -1, distance = G.view.scale * .43;
  G.paths.forEach((rope, i) => { if (!rope || G.moves.has(i)) return; const points = rope.map(screen), d = headDirection(rope); points.push(screen(H.add(rope.at(-1), d, .35)));
    for (let j = 1; j < points.length; j++) { const v = distanceTo(p, points[j - 1], points[j]); if (v < distance) { distance = v; best = i; } }
  });
  if (best >= 0) { G.selected = -1; tap(best); }
}
const pointers = new Map(); let gesture = null;
const pointerPosition = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
function beginGesture(dragged = false) {
  const points = [...pointers.values()], c = G.camera;
  if (points.length === 2) {
    const [a, b] = points; gesture = { pinch: true, distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, ...c };
  } else gesture = points.length ? { start: points[0], ...c, dragged } : null;
}
canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !G.level) return;
  e.preventDefault(); canvas.focus({ preventScroll: true }); canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, pointerPosition(e)); beginGesture(pointers.size > 1);
});
canvas.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId) || !gesture) return;
  const p = pointerPosition(e); pointers.set(e.pointerId, p);
  if (gesture.pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()], mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const zoom = Math.max(1, Math.min(8, gesture.zoom * Math.hypot(a.x - b.x, a.y - b.y) / gesture.distance)), ratio = zoom / gesture.zoom;
    G.camera = { zoom, x: mid.x - width / 2 - (gesture.mid.x - width / 2 - gesture.x) * ratio, y: mid.y - height / 2 - (gesture.mid.y - height / 2 - gesture.y) * ratio };
  } else {
    const dx = p.x - gesture.start.x, dy = p.y - gesture.start.y;
    gesture.dragged ||= Math.hypot(dx, dy) > 6;
    if (gesture.dragged) { G.camera.x = gesture.x + dx; G.camera.y = gesture.y + dy; }
  }
  applyCamera(); draw(0);
});
function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  const shouldTap = e.type === 'pointerup' && gesture && !gesture.pinch && !gesture.dragged;
  pointers.delete(e.pointerId); beginGesture(true);
  if (shouldTap) tapAt(pointerPosition(e));
}
canvas.addEventListener('pointerup', endPointer); canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', e => { e.preventDefault(); zoomTo(G.camera.zoom * Math.exp(-e.deltaY * .002), pointerPosition(e)); }, { passive: false });
$('zoomIn').onclick = () => zoomTo(G.camera.zoom * 1.5);
$('zoomOut').onclick = () => zoomTo(G.camera.zoom / 1.5);
function fitBoard() { G.camera = { zoom: 1, x: 0, y: 0 }; applyCamera(); draw(0); }
$('zoomFit').onclick = fitBoard;
$('fullscreen').hidden = !document.fullscreenEnabled;
$('fullscreen').onclick = async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
  catch { notice('Fullscreen is unavailable in this browser.'); }
};
document.addEventListener('fullscreenchange', () => {
  const active = !!document.fullscreenElement; $('fullscreen').setAttribute('aria-pressed', active);
  $('fullscreen').title = active ? 'Exit fullscreen' : 'Enter fullscreen'; resize();
});
canvas.addEventListener('keydown', e => {
  if (['+', '=', '-', '0'].includes(e.key)) { e.preventDefault(); if (e.key === '0') fitBoard(); else zoomTo(G.camera.zoom * (e.key === '-' ? 1 / 1.5 : 1.5)); }
});
canvas.addEventListener('keydown', e => {
  const ropes = G.paths.flatMap((p, i) => p ? [i] : []); if (!ropes.length) return;
  if (e.key.startsWith('Arrow')) { e.preventDefault(); const step = ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 1; G.selected = ropes[(ropes.indexOf(G.selected) + step + ropes.length) % ropes.length]; focusRope(G.selected); }
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (G.selected >= 0) tap(G.selected); }
});
function renderChooser() {
  const journey = draft.kind === 'journey', code = H.code(draft), available = H.available(draft, save.chapters);
  $('journey').setAttribute('aria-pressed', journey); $('custom').setAttribute('aria-pressed', !journey); $('customSettings').hidden = journey;
  $('seed').value = draft.seed; $('count').value = draft.count; $('gridChoice').value = draft.grid;
  $('minDifficulty').value = draft.min; $('maxDifficulty').value = draft.max;
  $('mirrors').checked = draft.mirrors; $('springs').checked = draft.springs;
  $('share').textContent = 'Copy set link'; $('share').title = code;
  $('setSummary').textContent = journey ? '120 tangles · square + hex' : draft.count + ' tangles · ' + ({ mixed: 'square + hex', square: 'square', hex: 'hex' }[draft.grid]);
  $('unlockRule').textContent = journey ? 'Clear each group’s last level to open the next ten. Play any open level.' : 'Every level is open. Higher difficulty weaves larger, more tangled boards.';
  const scores = save.sets[code] || {}; $('grid').replaceChildren();
  for (let i = 0; i < draft.count; i++) {
    if (i % 10 === 0) {
      const heading = document.createElement('h3'); heading.textContent = 'Levels ' + (i + 1) + '–' + Math.min(draft.count, i + 10);
      if (i >= available) heading.textContent += ' · clear ' + i + ' to open';
      $('grid').append(heading);
    }
    const button = document.createElement('button'), kind = H.spec(draft, i).grid;
    button.className = i === G.index && code === H.code(opts) ? 'current' : '';
    button.innerHTML = '<span class="level-icon" aria-hidden="true">' + (kind === 'hex' ? '⬡' : '◇') + '</span>' + (i + 1) + '<small>' + (scores[i] ? '★'.repeat(scores[i].stars) : '') + '</small>';
    button.dataset.level = i + 1; button.disabled = i >= available;
    button.setAttribute('aria-label', 'Level ' + (i + 1) + ', ' + kind + (button.disabled ? ', locked' : scores[i] ? ', ' + scores[i].stars + ' stars' : ''));
    button.onclick = () => { opts = { ...draft }; if (opts.kind === 'custom') save.custom = opts; audio(); start(i); }; $('grid').append(button);
  }
}
function chooser() { $('result').close(); draft = { ...opts }; renderChooser(); $('chooser').showModal(); syncMusic(); }
function settings() {
  draft = H.parseCode($('seed').value) || H.normalize({ seed: $('seed').value, count: $('count').value, grid: $('gridChoice').value, min: $('minDifficulty').value, max: $('maxDifficulty').value, mirrors: $('mirrors').checked, springs: $('springs').checked });
  if (draft.kind === 'custom') { save.custom = draft; persist(); } renderChooser();
}
$('levels').onclick = chooser; $('resultLevels').onclick = chooser;
$('closeLevels').onclick = () => { $('chooser').close(); syncMusic(); };
$('journey').onclick = () => { draft = { ...H.DEFAULT }; renderChooser(); };
$('custom').onclick = () => { draft = H.normalize(save.custom || { seed: 'MONKEYFIST', count: 120, grid: 'mixed', min: 1, max: 100 }); renderChooser(); };
$('chooser').addEventListener('cancel', e => { e.preventDefault(); $('closeLevels').click(); });
$('result').addEventListener('cancel', e => { e.preventDefault(); chooser(); });
$('restart').onclick = () => start(G.index); $('again').onclick = () => start(G.index); $('next').onclick = () => start(G.index + 1);
$('undo').onclick = undo; $('hint').onclick = hint;
for (const id of ['seed', 'count', 'gridChoice', 'minDifficulty', 'maxDifficulty', 'mirrors', 'springs']) $(id).onchange = settings;
$('dice').onclick = () => { const n = new Uint32Array(2); crypto.getRandomValues(n); $('seed').value = (n[0].toString(36) + n[1].toString(36)).slice(0, 10).toUpperCase(); settings(); };
$('defaultSeed').onclick = () => { $('seed').value = 'MONKEYFIST'; settings(); };
$('share').onclick = async () => { const u = new URL(location.href); u.searchParams.set('set', H.code(draft)); u.searchParams.delete('level'); try { await navigator.clipboard.writeText(u.href); notice('Set link copied'); } catch { notice(H.code(draft)); } };
$('music').onclick = () => { save.music = !save.music; audio(); persist(); syncMusic(); };
$('sound').onclick = () => { save.sound = MFAudio.nextSound(save.sound); persist(); syncMusic(); };
new ResizeObserver(resize).observe($('boardWrap'));
start(Math.max(0, Number(params.get('level') || (save.code === H.code(opts) && save.level) || 1) - 1));
function frame(time) { const dt = Math.min(.05, (time - lastTime) / 1000); lastTime = time; update(dt); if (drawNext || G.moving || G.hintTime > 0 || G.bump || G.selected >= 0) draw(time / 1000); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
window.__game = { G, start, tap, undo, hint, update, draw, screen, get options() { return opts; }, save, get sound() { return gameAudio.sound; }, get music() { return gameAudio.music; } };
