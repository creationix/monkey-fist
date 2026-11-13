/* global MFGame, MFHex, MFAudio, MFRopeArt, MFInput */
'use strict';
const H = MFGame, $ = id => document.getElementById(id), canvas = $('board'), mainContext = canvas.getContext('2d');
let ctx = mainContext;
const restingCanvas = document.createElement('canvas'), restingContext = restingCanvas.getContext('2d');
let restingKey = [];
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
function syncDisplay() {
  document.documentElement.classList.toggle('oled', !!save.oled);
  $('oled').setAttribute('aria-pressed', !!save.oled); $('oled').textContent = 'Dark mode: ' + (save.oled ? 'on' : 'off');
  document.querySelector('meta[name="theme-color"]').content = save.oled ? '#000000' : '#0b1f2a';
}
syncDisplay();
const G = { level: null, loading: false, solving: false, paths: [], plan: [], moves: new Map(), get moving() { return this.moves.size > 0; }, taps: 0, undos: 3, history: [], auto: false, ended: false, hint: -1, selected: -1, view: {}, camera: { zoom: 1, x: 0, y: 0 }, bump: null };
const rules = () => H;
const headDirection = path => H.direction(G.level, path);
let noticeTimer, lastTime = 0, width = 1, height = 1, drawNext = true, cameraTween = null;
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
    const worker = new Worker('generator-worker.js?v=2');
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
let guideVersion = 0, guideWorker = null;
function cancelGuide() { guideVersion++; guideWorker?.terminate(); guideWorker = null; G.solving = false; G.hintRequested = false; }
function seekPlan(prefer = [], budget = 900, wantHint = false) {
  cancelGuide(); const request = guideVersion, level = G.level, paths = G.paths;
  G.solving = true; G.hintRequested = wantHint;
  const done = answer => {
    if (request !== guideVersion || paths !== G.paths) return;
    guideWorker?.terminate(); guideWorker = null; G.solving = false;
    G.plan = answer.moves; G.lost = answer.solved === false;
    if (G.lost) sfx.bump(); hud();
    if (G.hintRequested) {
      G.hintRequested = false;
      if (G.plan.length) hint(); else notice(G.lost ? 'Knotted. Try undo.' : 'No route found yet. Try undo.');
    }
  };
  if (typeof Worker === 'undefined') {
    // Keep the optional main-thread fallback bounded much more tightly.
    setTimeout(() => { if (request === guideVersion) done(H.guide(level, paths, Math.min(40, budget), prefer)); }, 0);
  } else {
    guideWorker = new Worker('generator-worker.js?v=2');
    guideWorker.onmessage = ({ data }) => done(data.solution || { solved: null, moves: [] });
    guideWorker.onerror = () => done({ solved: null, moves: [] });
    guideWorker.postMessage({ type: 'guide', level, paths, prefer, budget });
  }
}
async function start(index) {
  const request = ++generation; pendingGeneration?.(); pendingGeneration = null;
  cancelGuide();
  resetInput(); cameraTween = null;
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
  const reflections = mirrorCrossings(m.route, G.paths[i].length);
  if (m.event === 'exit') {
    const last = m.route.at(-1), previous = m.route.at(-2), d = [last.q - previous.q, last.r - previous.r];
    const extra = Math.ceil(Math.max(width, height) * 2 / G.view.scale) + 4;
    for (let n = 1; n <= extra; n++) m.route.push(H.add(last, d, n));
    m.distance += extra;
  }
  const bounceDuration = m.event === 'bounce' ? reduced ? .12 : .58 : 0;
  const spring = m.event === 'bounce' ? H.add(m.route.at(-1), headDirection(m.route.slice(-G.paths[i].length))) : null;
  G.moves.set(i, { ...m, path: G.paths[i], i, progress: 0, automatic, speed: 0, hold: bounceDuration, bounceDuration, spring, impacted: false,
    popNote: m.event === 'exit' ? ++G.clearNo : 0, reflections, nextReflection: 0 });
  commit(G.moves.get(i));
  sfx.slide();
  if (!automatic) {
    if (G.assisted.has(i)) G.combo = 0;
    else if (m.event === 'exit' && ++G.combo % 5 === 0) notice(G.combo + ' in a row!');
  }
  hud();
}
function commit(m) {
  const wasLost = G.lost, previousPlan = G.plan; cancelGuide();
  G.paths = m.paths;
  if (!m.automatic) {
    G.plan = previousPlan[0] === m.i ? previousPlan.slice(1) : [];
    G.lost = false;
    G.auto = rules().allFree(G.level, G.paths);
  }
  if (G.level.grid === 'hex' && !G.level.mirrors.length && !G.level.springs.length) {
    const board = MFHex.compile(G.level, G.paths);
    if (board.left && !G.paths.some((p, i) => p && board.to(i) !== board.offsets[i])) G.lost = true;
  } else if (G.paths.some(Boolean) && !G.paths.some((p, i) => p && H.tap(G.level, G.paths, i))) G.lost = true;
  if (!m.automatic && !G.auto && !G.lost && !G.plan.length) seekPlan(previousPlan.filter(i => G.paths[i]));
  if (G.lost && !wasLost) sfx.bump();
  hud();
}
function undo() {
  if (G.loading || !G.undos || !G.history.length || G.auto || G.ended) return;
  cancelGuide(); const state = G.history.pop(); Object.assign(G, state); G.moves.clear(); G.bump = null; G.undos--; G.taps++; G.hint = -1; G.combo = 0;
  if (!G.plan.length && !G.lost) seekPlan();
  sfx.undo(); notice('Undo · +1 tap'); hud(); draw(0);
}
function hint() {
  if (G.loading || !G.level || G.auto || G.ended || G.lost || G.moves.has(G.plan[0])) return;
  if (!G.plan.length) {
    if (G.solving) G.hintRequested = true;
    else seekPlan([], 900, true);
    notice('Finding a route…'); return;
  }
  if (G.hint === G.plan[0] && G.hintTime > 0) { G.hintTime = 3; focusRope(G.hint); return; }
  G.hint = G.plan[0]; G.hintTime = 3; G.taps += 2; G.combo = 0; G.assisted.add(G.hint); focusRope(G.hint); sfx.hint(); notice('Hint · +2 taps'); hud();
}
function finish() {
  cancelGuide(); G.ended = true; const stars = G.taps <= G.level.par ? 3 : G.taps <= G.level.par + 2 ? 2 : 1;
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
  if (cameraTween) {
    const t = cameraTween; t.time = Math.min(1, t.time + dt / .22); const ease = 1 - Math.pow(1 - t.time, 3);
    G.camera = Object.fromEntries(['zoom', 'x', 'y'].map(k => [k, t.from[k] + (t.to[k] - t.from[k]) * ease]));
    if (t.time === 1) cameraTween = null;
    applyCamera(); drawNext = true;
  }
  if (G.hintTime > 0) { G.hintTime -= dt; if (G.hintTime <= 0) { G.hint = -1; drawNext = true; } }
  if (G.bump) { G.bump.time -= dt; if (G.bump.time <= 0) { G.bump = null; drawNext = true; } }
  let settled = false;
  for (const [id, m] of G.moves) {
    m.speed = Math.min(38, m.speed + dt * 100);
    m.progress = Math.min(m.distance, m.progress + (reduced ? m.distance * dt * 12 : m.speed * dt));
    while (m.nextReflection < m.reflections.length && m.progress >= m.reflections[m.nextReflection]) sfx.reflect(m.nextReflection++);
    if (m.progress >= m.distance - .001 || m.event === 'exit' && exitCleared(id)) {
      if (m.event === 'bounce' && !m.impacted) { m.impacted = true; sfx.spring(); }
      m.hold -= dt;
      if (m.hold <= 0) {
        G.moves.delete(id); settled = true;
        if (m.event === 'exit') sfx.pop(m.popNote);
        else if (m.event !== 'bounce' && m.reflections.at(-1) !== m.distance) sfx.thud();
      }
    }
  }
  if (!G.ended && G.paths.every(p => !p) && !G.moving) finish();
  else if (G.auto && !G.ended) tap(G.paths.findIndex((p, i) => p && !G.moves.has(i)), true);
  if (settled) hud();
}
function raw(p, rotated) { const v = H.project(p, G.level); return rotated ? { x: -v.y, y: v.x } : v; }
function screen(p) { const v = raw(p, G.view.rotated); return { x: G.view.ox + v.x * G.view.scale, y: G.view.oy + v.y * G.view.scale }; }
function resize() {
  resetInput(); cameraTween = null;
  const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2.5); width = rect.width; height = rect.height;
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  restingCanvas.width = canvas.width; restingCanvas.height = canvas.height; restingContext.setTransform(dpr, 0, 0, dpr, 0, 0); restingKey = [];
  if (!G.level) return;
  const points = H.cells(G.level).map(p => H.project(p, G.level)), minX = Math.min(...points.map(p => p.x)) - .6, maxX = Math.max(...points.map(p => p.x)) + .6;
  const minY = Math.min(...points.map(p => p.y)) - .6, maxY = Math.max(...points.map(p => p.y)) + .6, w = maxX - minX, h = maxY - minY;
  // Fit leaves the corner controls clear. Zooming/panning still uses the entire screen.
  const wide = width > height * 1.2, usableW = width - (wide ? 300 : 24), usableH = height - (wide ? 28 : 220);
  const normal = Math.min(usableW / w, usableH / h), rotated = Math.min(usableW / h, usableH / w);
  const rot = rotated > normal, scale = Math.max(1, Math.min(110, rot ? rotated : normal));
  G.view = { rotated: rot, fit: scale, zoomable: scale < 56, usableW, usableH, cx: (rot ? -(maxY + minY) : maxX + minX) / 2, cy: (rot ? maxX + minX : maxY + minY) / 2, bw: (rot ? h : w) * scale, bh: (rot ? w : h) * scale };
  applyCamera();
  draw(0);
}
function applyCamera() {
  if (!G.level) return;
  const v = G.view; G.camera = MFInput.constrain(G.camera, v);
  const c = G.camera, bw = v.bw * c.zoom, bh = v.bh * c.zoom;
  v.panX = bw > v.usableW + 1; v.panY = bh > v.usableH + 1;
  v.scale = v.fit * c.zoom; v.ox = width / 2 + c.x - v.cx * v.scale; v.oy = height / 2 + c.y - v.cy * v.scale;
  v.panel = { x: (width - bw) / 2 + c.x - 8, y: (height - bh) / 2 + c.y - 8, w: bw + 16, h: bh + 16 };
  $('zoomFit').textContent = 'Fit'; $('zoomFit').title = 'Fit and center the board · ' + Math.round(c.zoom * 100) + '%';
  $('zoomOut').disabled = c.zoom <= 1; $('zoomIn').disabled = c.zoom >= 8;
  for (const id of ['zoomOut', 'zoomIn', 'zoomFit']) $(id).hidden = !v.zoomable;
  $('zoomControls').querySelector('span').textContent = !v.zoomable ? '' : v.panX || v.panY ? 'Drag to explore · pinch to zoom' : 'Pinch or + to zoom';
  canvas.setAttribute('aria-label', (G.level.grid === 'hex' ? 'Hexagonal' : 'Square') + ' rope puzzle. Tap a rope to slide it. ' + (v.zoomable ? 'Pinch or scroll to zoom; drag when zoomed in. ' : '') + 'Arrow keys select ropes; Enter slides the selected rope.');
  canvas.classList.toggle('zoomed', c.zoom > 1);
  canvas.classList.toggle('pannable', v.panX || v.panY);
}
function setCamera(camera, smooth = false) {
  const target = MFInput.constrain(camera, G.view);
  if (smooth && !reduced) cameraTween = { from: { ...G.camera }, to: target, time: 0 };
  else { cameraTween = null; G.camera = target; applyCamera(); drawNext = true; }
}
function zoomTo(zoom, p = { x: width / 2, y: height / 2 }, smooth = false) {
  if (!G.level || !G.view.zoomable) return;
  const c = G.camera, next = Math.max(1, Math.min(8, zoom)), ratio = next / c.zoom;
  setCamera({ zoom: next, x: p.x - width / 2 - (p.x - width / 2 - c.x) * ratio, y: p.y - height / 2 - (p.y - height / 2 - c.y) * ratio }, smooth);
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
function mirrorTurn(route, index) {
  const p = route[index], before = route[index - 1];
  if (!p || !before || !G.level.mirrors.some(m => m.cell.q === p.q && m.cell.r === p.r)) return null;
  const incoming = [p.q - before.q, p.r - before.r], outgoing = headDirection([before, p]);
  return incoming[0] === outgoing[0] && incoming[1] === outgoing[1] ? null : { incoming, outgoing };
}
function mirrorCrossings(route, length) {
  const crossings = [];
  // A head already resting on a mirror has reflected on its previous move.
  for (let i = length; i < route.length; i++) if (mirrorTurn(route, i)) crossings.push(i - length + 1);
  return crossings;
}
function ropeDrawing(i, settled = false) {
  const rope = settled ? G.paths[i] : visiblePath(i); if (!rope) return null;
  const points = rope.map(screen), tip = points.at(-1), moving = settled ? null : G.moves.get(i);
  const end = moving ? moving.progress + moving.path.length - 1 : rope.length - 1, route = moving?.route || rope;
  const previous = moving ? screen(pointAt(route, end - .001)) : screen(H.add(rope.at(-1), headDirection(rope), -1));
  const length = Math.hypot(tip.x - previous.x, tip.y - previous.y);
  let head = { x: (tip.x - previous.x) / length, y: (tip.y - previous.y) / length };
  const index = Math.round(end), turn = mirrorTurn(route, index), proximity = Math.abs(end - index);
  if (turn && proximity < .5) {
    const center = screen(route[index]), a = screen(H.add(route[index], turn.incoming)), b = screen(H.add(route[index], turn.outgoing));
    const ax = a.x - center.x, ay = a.y - center.y, bx = b.x - center.x, by = b.y - center.y;
    const t = Math.max(0, Math.min(1, (end - index + .35) / .35)), ease = t * t * (3 - 2 * t);
    const angle = Math.atan2(ay, ax) + Math.atan2(ax * by - ay * bx, ax * bx + ay * by) * ease;
    head = { x: Math.cos(angle), y: Math.sin(angle) };
    // Lead the arrow out of the bend so its neck follows the reflected cord.
    // The lead fades on either side, keeping stopped and moving poses continuous.
    const next = H.add(route[index], turn.outgoing), neighbor = G.paths.find((p, j) => j !== i && p && p.at(-1).q === next.q && p.at(-1).r === next.r);
    let clearance = .26;
    if (neighbor) {
      const at = screen(next), toward = screen(H.add(next, headDirection(neighbor))), nx = toward.x - at.x, ny = toward.y - at.y;
      // Leave room for the arrowhead of a facing neighbor, not just its cord.
      if ((nx * bx + ny * by) / (Math.hypot(nx, ny) * Math.hypot(bx, by)) < .51) clearance = .03;
    }
    const lead = G.view.scale * clearance * (1 - proximity / .5);
    points.push({ x: tip.x + head.x * lead, y: tip.y + head.y * lead });
  }
  return { points, head };
}
function springFlip(move) {
  if (!move?.impacted || !move.bounceDuration) return null;
  const t = Math.max(0, Math.min(1, 1 - move.hold / move.bounceDuration));
  const turn = reduced ? t : Math.max(0, (t - .16) / .84);
  return { t, turn, reversed: turn >= .5, squash: reduced ? 1 : Math.max(.015, Math.abs(Math.cos(Math.PI * turn))),
    lift: reduced ? 0 : Math.sin(Math.PI * turn) * G.view.scale * .45 };
}
function exitCleared(i) {
  const points = visiblePath(i).map(screen), margin = G.view.scale * .52;
  const minX = Math.min(...points.map(p => p.x)) - margin, maxX = Math.max(...points.map(p => p.x)) + margin;
  const minY = Math.min(...points.map(p => p.y)) - margin, maxY = Math.max(...points.map(p => p.y)) + margin;
  const outside = b => maxX < b.x || minX > b.x + b.w || maxY < b.y || minY > b.y + b.h;
  return outside({ x: 0, y: 0, w: width, h: height }) && outside(G.view.panel);
}
function drawRope(i, time) {
  const moving = G.moves.get(i), flip = springFlip(moving), drawing = ropeDrawing(i, flip?.reversed); if (!drawing) return;
  const { points, head } = drawing, s = G.view.scale, col = color(i);
  if (moving?.spring && !reduced && !flip?.reversed) {
    const tip = points.at(-1), spring = screen(moving.spring);
    const reach = moving.impacted ? Math.max(0, 1 - flip.t / .16) : Math.max(0, 1 - (moving.distance - moving.progress) / .35);
    const gap = ((spring.x - tip.x) * head.x + (spring.y - tip.y) * head.y) / s - .78;
    const stretch = s * Math.max(0, Math.min(.2 * reach, gap));
    tip.x += head.x * stretch; tip.y += head.y * stretch;
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  if (maxX < -s || minX > width + s || maxY < -s || minY > height + s) return;
  ctx.save();
  if (flip) {
    if (reduced) ctx.globalAlpha = Math.abs(Math.cos(Math.PI * flip.turn));
    else {
      // The cached board remains untouched. Only this rope turns edge-on; the
      // reverse face is revealed while it is thin, then lands on the same cells.
      path(ctx, points); ctx.lineCap = ctx.lineJoin = 'round';
      ctx.strokeStyle = '#00000014'; ctx.lineWidth = s * .6; ctx.stroke();
      ctx.strokeStyle = '#00000024'; ctx.lineWidth = s * .46; ctx.stroke();
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, lift = Math.sin(Math.PI * flip.turn);
      ctx.translate(cx, cy - flip.lift); ctx.rotate(lift * .04); ctx.scale(1 + lift * .03, flip.squash); ctx.translate(-cx, -cy);
    }
  }
  if (G.bump?.i === i) { const d = headDirection(G.paths[i]), a = screen(G.paths[i].at(-1)), b = screen(H.add(G.paths[i].at(-1), d)), t = Math.sin(G.bump.time / .25 * Math.PI) * .1; ctx.translate((b.x - a.x) * t, (b.y - a.y) * t); }
  ctx.lineJoin = ctx.lineCap = 'round';
  const tip = points.at(-1);
  const { x: dx, y: dy } = head;
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
  MFRopeArt.draw(ctx, points, s * .4, col, { x: dx, y: dy }, !!moving && moving.progress < moving.distance);
  ctx.restore();
}
function drawSpring(spring, move) {
  const s = G.view.scale, p = screen(spring), flip = springFlip(move);
  ctx.save(); ctx.translate(p.x, p.y);
  if (flip && !reduced) {
    const from = screen(move.route.at(-1)), angle = Math.atan2(p.y - from.y, p.x - from.x);
    const squash = Math.sin(flip.t * Math.PI * 3) * Math.exp(-flip.t * 3) * .4;
    ctx.rotate(angle); ctx.scale(1 - squash, 1 + squash * .22); ctx.rotate(-angle);
  }
  ctx.beginPath(); ctx.arc(0, s * .025, s * .34, 0, Math.PI * 2); ctx.fillStyle = '#00000055'; ctx.fill();
  const cushion = ctx.createRadialGradient(-s * .1, -s * .12, s * .02, 0, 0, s * .32);
  cushion.addColorStop(0, '#6c5138'); cushion.addColorStop(1, '#2d3029');
  ctx.beginPath(); ctx.arc(0, 0, s * .3, 0, Math.PI * 2); ctx.fillStyle = cushion; ctx.fill();
  const rim = Array.from({ length: 25 }, (_, i) => ({ x: Math.cos(i * Math.PI / 12) * s * .285, y: Math.sin(i * Math.PI / 12) * s * .285 }));
  MFRopeArt.draw(ctx, rim, s * .085, '#b69b6c', null);
  const coil = new Path2D();
  for (let t = 0; t <= Math.PI * 5; t += .14) {
    const r = s * (.035 + .0115 * t), x = Math.cos(t) * r, y = Math.sin(t) * r;
    if (!t) coil.moveTo(x, y); else coil.lineTo(x, y);
  }
  ctx.lineCap = 'round'; ctx.strokeStyle = '#211e1a'; ctx.lineWidth = s * .09; ctx.stroke(coil);
  const copper = ctx.createLinearGradient(-s * .2, -s * .2, s * .2, s * .2);
  copper.addColorStop(0, '#efc78b'); copper.addColorStop(.45, '#ce9454'); copper.addColorStop(1, '#94603c');
  ctx.strokeStyle = copper; ctx.lineWidth = s * .058; ctx.stroke(coil);
  ctx.translate(-s * .008, -s * .012); ctx.strokeStyle = '#ffe0aa66'; ctx.lineWidth = s * .016; ctx.stroke(coil);
  ctx.restore();
}
function drawMirrors(activeSprings) {
  const s = G.view.scale;
  for (const mirror of G.level.mirrors || []) {
    const d = G.level.grid === 'hex' ? H.DIRS[mirror.axis] : mirror.slope === '/' ? [1, -1] : [1, 1];
    const a = screen(H.add(mirror.cell, d, -.37)), b = screen(H.add(mirror.cell, d, .37));
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    ctx.save(); ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2); ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
    ctx.lineCap = ctx.lineJoin = 'round';
    // Soft glass in a rounded, cord-bound frame. Both faces remain identical.
    path(ctx, [{ x: -length / 2, y: 0 }, { x: length / 2, y: 0 }]);
    ctx.strokeStyle = '#091e27'; ctx.lineWidth = s * .22; ctx.stroke();
    ctx.strokeStyle = '#766f58'; ctx.lineWidth = s * .17; ctx.stroke();
    const glass = ctx.createLinearGradient(0, -s * .06, 0, s * .06);
    glass.addColorStop(0, '#688c87'); glass.addColorStop(.45, '#a1b7a5'); glass.addColorStop(1, '#517d7d');
    ctx.strokeStyle = glass; ctx.lineWidth = s * .105; ctx.stroke();
    for (const sign of [-1, 1]) {
      const x = sign * (length / 2 - s * .035);
      path(ctx, [{ x: x - s * .04, y: -s * .06 }, { x: x + s * .04, y: s * .06 }]);
      ctx.strokeStyle = '#b4a17c'; ctx.lineWidth = s * .055; ctx.stroke();
      if (s > 24) {
        path(ctx, [{ x: x - s * .06, y: -s * .02 }, { x: x + s * .02, y: s * .07 }]);
        ctx.strokeStyle = '#dcc49a88'; ctx.lineWidth = s * .018; ctx.stroke();
      }
    }
    ctx.restore();
  }
  for (const spring of G.level.springs || []) if (!activeSprings.has(spring.q + ',' + spring.r)) drawSpring(spring);
}
function drawGrid() {
  const v = G.view, s = v.scale;
  if (!v.grid || v.grid.ox !== v.ox || v.grid.oy !== v.oy || v.grid.scale !== s) {
    const cells = H.cells(G.level), points = new Map(cells.map(p => [p.q + ',' + p.r, screen(p)]));
    const directions = G.level.grid === 'hex' ? H.DIRS.slice(0, 3) : [[1, 0], [0, 1]];
    const lines = new Path2D(), dots = new Path2D(), radius = Math.max(1.2, s * .035);
    for (const p of cells) {
      const at = points.get(p.q + ',' + p.r);
      dots.moveTo(at.x + radius, at.y); dots.arc(at.x, at.y, radius, 0, Math.PI * 2);
      // One half of the directions draws each valid neighbor link exactly once.
      for (const [dq, dr] of directions) {
        const next = points.get((p.q + dq) + ',' + (p.r + dr));
        if (next) { lines.moveTo(at.x, at.y); lines.lineTo(next.x, next.y); }
      }
    }
    v.grid = { ox: v.ox, oy: v.oy, scale: s, lines, dots };
  }
  ctx.strokeStyle = save.oled ? '#b3d7d940' : '#b3d7d913';
  ctx.lineWidth = Math.max(.6, Math.min(1, s * .025)); ctx.stroke(v.grid.lines);
  ctx.fillStyle = save.oled ? '#b3d7d95c' : '#b3d7d91c'; ctx.fill(v.grid.dots);
}
function drawRestingBoard(activeSprings) {
  ctx.clearRect(0, 0, width, height);
  const board = new Path2D(), b = G.view.panel, s = G.view.scale;
  board.roundRect(b.x, b.y, b.w, b.h, Math.min(22, s * .4));
  const surface = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  surface.addColorStop(0, save.oled ? '#ffffff04' : '#ffffff0c'); surface.addColorStop(1, save.oled ? '#ffffff02' : '#ffffff06');
  ctx.fillStyle = surface; ctx.fill(board); ctx.strokeStyle = '#ffffff14'; ctx.lineWidth = 1.5; ctx.stroke(board);
  ctx.save(); ctx.clip(board);
  drawGrid();
  drawMirrors(activeSprings);
  for (let i = 0; i < G.paths.length; i++) if (G.paths[i] && !G.moves.has(i) && i !== G.hint && i !== G.selected && i !== G.bump?.i) drawRope(i, 0);
  ctx.restore();
}
function draw(time) {
  drawNext = false;
  if (!G.level) { ctx.clearRect(0, 0, width, height); return; }
  const activeSprings = new Map();
  for (const move of G.moves.values()) if (move.spring) activeSprings.set(move.spring.q + ',' + move.spring.r, move);
  // Reuse the rasterized stationary scene, not hundreds of texture paths on
  // every frame. Logical moves use fresh arrays, so undo/settling invalidate it.
  const key = [G.level, G.paths, G.view.ox, G.view.oy, G.view.scale, G.hint, G.selected, G.bump?.i, [...G.moves.keys()].join(','), !!save.oled];
  if (key.some((v, i) => v !== restingKey[i])) {
    ctx = restingContext;
    try { drawRestingBoard(activeSprings); restingKey = key; } finally { ctx = mainContext; }
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(restingCanvas, 0, 0); ctx.restore();
  for (const move of activeSprings.values()) drawSpring(move.spring, move);
  for (const i of new Set([G.hint, G.selected, G.bump?.i])) if (i >= 0 && G.paths[i] && !G.moves.has(i)) drawRope(i, time);
  // Departing ropes stay visible all the way off-screen, including rotated boards.
  for (const i of G.moves.keys()) drawRope(i, time);
}
function distanceTo(p, a, b) { const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy))); return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t); }
function pickRope(p, padding = 0) {
  if (!G.level || G.auto) return -1;
  let best = -1, distance = Math.max(G.view.scale * .43, padding);
  G.paths.forEach((rope, i) => { if (!rope || G.moves.has(i)) return; const points = rope.map(screen), d = headDirection(rope); points.push(screen(H.add(rope.at(-1), d, .35)));
    for (let j = 1; j < points.length; j++) { const v = distanceTo(p, points[j - 1], points[j]); if (v < distance) { distance = v; best = i; } }
  });
  return best;
}
const pointerPosition = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
const input = MFInput.create({ view: () => ({ ...G.view, width, height }), camera: () => G.camera, change: camera => setCamera(camera),
  pick: pickRope, tap: i => { G.selected = -1; tap(i); } });
const consume = e => { if (e.cancelable) e.preventDefault(); e.stopPropagation(); };
const contact = e => ({ ...pointerPosition(e), id: e.pointerId, type: e.pointerType, width: e.width, height: e.height });
function resetInput() {
  for (const id of input.pointers.keys()) { try { canvas.releasePointerCapture(id); } catch { /* A canceled pointer may already be released. */ } }
  input.reset();
}
canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !G.level || G.ended || G.loading) return;
  consume(e); cameraTween = null;
  if (e.pointerType === 'mouse') canvas.focus({ preventScroll: true });
  try { canvas.setPointerCapture(e.pointerId); } catch { /* Detached/synthetic pointers need no capture. */ }
  input.down(contact(e));
});
canvas.addEventListener('pointermove', e => {
  if (!input.pointers.has(e.pointerId)) return;
  consume(e); input.move(contact(e));
});
canvas.addEventListener('pointerup', e => { consume(e); input.up(contact(e)); });
for (const name of ['pointercancel', 'lostpointercapture']) canvas.addEventListener(name, e => input.cancel(e.pointerId));
for (const name of ['blur', 'pagehide']) window.addEventListener(name, resetInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) resetInput(); });
// Cancel browser gestures on the game surface, not scrolling/form controls in
// the menu. These cannot cancel gestures reserved by iOS or Android itself.
for (const name of ['touchstart', 'touchmove', 'touchend']) canvas.addEventListener(name, consume, { passive: false });
for (const name of ['contextmenu', 'selectstart', 'dragstart']) $('game').addEventListener(name, consume);
document.addEventListener('contextmenu', e => { if (e.target.closest('button')) consume(e); });
for (const name of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(name, e => {
  if (!$('chooser').open && !$('result').open) consume(e);
}, { passive: false });
canvas.addEventListener('wheel', e => { consume(e); zoomTo(G.camera.zoom * Math.exp(-e.deltaY * .002), pointerPosition(e)); }, { passive: false });
$('zoomIn').onclick = () => zoomTo(G.camera.zoom * 1.5, undefined, true);
$('zoomOut').onclick = () => zoomTo(G.camera.zoom / 1.5, undefined, true);
function fitBoard() { resetInput(); setCamera({ zoom: 1, x: 0, y: 0 }, true); }
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
function chooser() { resetInput(); cameraTween = null; $('result').close(); draft = { ...opts }; renderChooser(); $('chooser').showModal(); syncMusic(); }
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
$('oled').onclick = () => {
  save.oled = !save.oled; persist(); syncDisplay(); drawNext = true;
};
new ResizeObserver(resize).observe($('boardWrap'));
start(Math.max(0, Number(params.get('level') || (save.code === H.code(opts) && save.level) || 1) - 1));
function frame(time) { const dt = Math.min(.05, (time - lastTime) / 1000); lastTime = time; update(dt); if (drawNext || G.moving || G.hintTime > 0 || G.bump || G.selected >= 0) draw(time / 1000); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
window.__game = { G, start, tap, undo, hint, update, draw, screen, get options() { return opts; }, save, get sound() { return gameAudio.sound; }, get music() { return gameAudio.music; } };
