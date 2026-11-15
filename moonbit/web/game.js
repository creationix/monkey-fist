// Browser glue for the MoonBit game: Canvas2D drawing of the display list, Web Audio
// playback of the voice list, DOM events and localStorage. Game state, animation,
// camera, hit-testing, scoring and sound design all live in MoonBit.
import { wrap } from './mf-core.js';

const $ = id => document.getElementById(id), canvas = $('board'), ctx = canvas.getContext('2d');
const PALETTE = ['#37d5ac', '#f9bd4a', '#a987f5', '#f785ac', '#58b7ef', '#f7a251', '#e8dca1', '#f46f73', '#73d677'];
const dim = c => '#' + c.slice(1).match(/../g).map(x => Math.round(parseInt(x, 16) * .45).toString(16).padStart(2, '0')).join('');
const STORAGE = 'monkey-fist-moonbit-v1';
let save; try { save = JSON.parse(localStorage.getItem(STORAGE)) || {}; } catch { save = {}; }
const persist = () => { try { localStorage.setItem(STORAGE, JSON.stringify(save)); } catch { /* play works without storage */ } };
const params = new URLSearchParams(location.search), CODE = 'J3-MONKEYFIST';

async function load() {
  // wasm-gc first (Chrome 119+, Firefox 120+, Safari 18.2+); the JS build otherwise or on request.
  if (params.get('engine') !== 'js' && typeof WebAssembly === 'object') {
    try {
      const { instance } = await WebAssembly.instantiateStreaming(fetch('dist/mf.wasm?v=1'), {});
      return [wrap(instance.exports), 'wasm-gc'];
    } catch (e) { console.warn('wasm-gc unavailable, using the JS build', e); }
  }
  return [wrap(await import('../dist/mf.js?v=1')), 'js'];
}
const [mf, engine] = await load(), X = mf.raw;
window.mf = mf; // for tests and benchmarks

let index = Math.max(0, Math.min(119, (parseInt(params.get('level')) || save.level || 1) - 1)), level = null, width = 1, height = 1;
for (let i = 0; i < 120; i++) $('levelSelect').append(new Option('Level ' + (i + 1), i));

function bands() {
  const r = canvas.getBoundingClientRect(), boxes = sel => [...document.querySelectorAll(sel)].map(e => e.getBoundingClientRect()).filter(b => b.width);
  const top = Math.max(14, ...boxes('.brand, .readout').map(b => b.bottom - r.top)) + 8;
  const bottom = Math.max(14, ...boxes('.actions, #picker').map(b => r.bottom - b.top)) + 8;
  return [top, bottom];
}
function resize() {
  const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2.5);
  width = r.width; height = r.height; canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  X.game_resize(width, height, ...bands());
}
function start(i) {
  index = i; $('levelSelect').value = i; $('result').close();
  const u = new URL(location.href); u.searchParams.set('level', i + 1); history.replaceState(null, '', u); save.level = i + 1; persist();
  const t = performance.now(); level = mf.generate(CODE, i); const ms = performance.now() - t;
  X.game_start(); resize();
  $('levelName').innerHTML = 'Level ' + (i + 1) + ' <span>/ 120</span>';
  $('gridType').textContent = level.grid === 'hex' ? 'HEX · MOONBIT' : 'SQUARE · MOONBIT'; $('gridMark').textContent = level.grid === 'hex' ? '⬡' : '◇';
  $('engine').textContent = `MoonBit ${engine} · woven in ${ms.toFixed(0)} ms · best ${save.best?.[i] ? '★'.repeat(save.best[i]) : '–'}`;
  shown = false;
}

// ---- audio: the voice list from MoonBit, synthesized here ----
let audio = null, bus = null;
function unlock() {
  if (audio) { if (audio.state === 'suspended') audio.resume(); return; }
  const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
  audio = new A(); const limiter = audio.createDynamicsCompressor(); limiter.connect(audio.destination);
  bus = audio.createGain(); bus.gain.value = .15; bus.connect(limiter);
}
function play(v) {
  if (!audio || audio.state !== 'running') return;
  for (let k = 0; k < v.length; k += 8) {
    const time = audio.currentTime + v[k + 5], gain = audio.createGain();
    if (v[k] === 0) {
      const [, f, dur, wave, vol, , to, attack] = v.slice(k, k + 8), o = audio.createOscillator();
      o.type = wave ? 'triangle' : 'sine'; o.frequency.setValueAtTime(f, time); if (to) o.frequency.exponentialRampToValueAtTime(to, time + dur);
      gain.gain.setValueAtTime(.0001, time); gain.gain.exponentialRampToValueAtTime(vol, time + attack); gain.gain.exponentialRampToValueAtTime(.0001, time + dur);
      o.connect(gain); gain.connect(bus); o.start(time); o.stop(time + dur + .03);
    } else {
      const [, dur, vol, from, to] = v.slice(k, k + 5), n = Math.floor(audio.sampleRate * dur), buf = audio.createBuffer(1, n, audio.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / n);
      const s = audio.createBufferSource(), filter = audio.createBiquadFilter();
      filter.type = 'bandpass'; filter.Q.value = 1.2; filter.frequency.setValueAtTime(from, time); filter.frequency.exponentialRampToValueAtTime(to, time + dur);
      s.buffer = buf; gain.gain.value = vol; s.connect(filter); filter.connect(gain); gain.connect(bus); s.start(time);
    }
  }
}

// ---- drawing the display list ----
const floats = n => { const a = new Float64Array(n); for (let i = 0; i < n; i++) a[i] = X.f_get(i); return a; };
function hexagon(x, y, r) { ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); } ctx.closePath(); }
function draw(d) {
  ctx.clearRect(0, 0, width, height);
  for (let k = 0; k < d.length;) {
    const op = d[k];
    if (op === 1) {
      const [x, y, s, hex] = [d[k + 1], d[k + 2], d[k + 3], d[k + 4]]; k += 5;
      ctx.fillStyle = '#ffffff09'; ctx.strokeStyle = '#ffffff10';
      if (hex) { hexagon(x, y, s * .56); ctx.fill(); } else { ctx.beginPath(); ctx.roundRect(x - s * .46, y - s * .46, s * .92, s * .92, s * .14); ctx.fill(); }
    } else if (op === 2) {
      const [x, y, s, a] = [d[k + 1], d[k + 2], d[k + 3], d[k + 4]]; k += 5;
      const c = Math.cos(a) * s * .5, n = Math.sin(a) * s * .5;
      ctx.lineCap = 'round'; ctx.strokeStyle = '#9fd8e6'; ctx.lineWidth = s * .2; ctx.beginPath(); ctx.moveTo(x - c, y - n); ctx.lineTo(x + c, y + n); ctx.stroke();
      ctx.strokeStyle = '#e9fbff'; ctx.lineWidth = s * .06; ctx.stroke();
    } else if (op === 3) {
      const [x, y, s, spin] = [d[k + 1], d[k + 2], d[k + 3], d[k + 4]]; k += 5;
      ctx.strokeStyle = '#d58a4f'; ctx.lineWidth = s * .08; ctx.beginPath(); ctx.arc(x, y, s * .38, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); for (let t = 0; t < 1; t += .02) { const a = spin + t * Math.PI * 6, r = s * .32 * t; ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); } ctx.stroke();
    } else {
      const i = d[k + 1], flags = d[k + 2], n = d[k + 3], pts = []; k += 4;
      for (let j = 0; j < n; j++, k += 2) pts.push([d[k], d[k + 1]]);
      const hx = d[k], hy = d[k + 1]; k += 2;
      rope(pts, hx, hy, PALETTE[i % PALETTE.length], flags);
    }
  }
}
function rope(pts, hx, hy, col, flags) {
  const s = scale(pts), line = (w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], j) => j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); };
  const [tx, ty] = pts.at(-1), arrow = (grow, fill) => {
    const reach = s * .44 + grow, back = s * .12, half = s * .32 + grow;
    ctx.beginPath(); ctx.moveTo(tx + hx * reach, ty + hy * reach); ctx.lineTo(tx - hx * back - hy * half, ty - hy * back + hx * half); ctx.lineTo(tx - hx * back + hy * half, ty - hy * back - hx * half); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  };
  ctx.lineJoin = ctx.lineCap = 'round';
  const c = flags & 2 ? dim(col) : col;
  if (flags & 1) { ctx.shadowColor = '#fff0b0'; ctx.shadowBlur = s * .3; line(s * .95, '#fff1b4'); arrow(s * .09, '#fff1b4'); ctx.shadowBlur = 0; }
  if (flags & 4) line(s * 1.02, '#fff1b433');
  line(s * .78, '#06161dcc'); line(s * .62, flags & 8 ? '#ffffff' : c);
  ctx.setLineDash([s * .18, s * .16]); line(s * .16, '#ffffff38'); ctx.setLineDash([]);
  arrow(0, c);
}
let lastScale = 30; const scale = () => lastScale;

// ---- HUD ----
let shown = false, noticeTimer = 0;
function hud() {
  X.game_status(); const n = X.out_len(), o = []; for (let i = 0; i < n; i++) o.push(X.out_get(i));
  const [taps, par, left, undos, stars, auto, lost] = o, len = o[8], text = String.fromCharCode(...o.slice(9, 9 + len));
  $('remaining').textContent = left + ' ropes left'; $('score').textContent = taps + (taps === 1 ? ' tap' : ' taps') + ' · par ' + par;
  $('undos').textContent = undos; $('undo').disabled = !undos || auto; $('hint').disabled = !!auto || !!lost; $('autoSolve').disabled = stars >= 0 || !left;
  if (text) { $('notice').textContent = text; $('notice').classList.add('show'); clearTimeout(noticeTimer); noticeTimer = setTimeout(() => $('notice').classList.remove('show'), 2400); }
  if (stars >= 0 && !shown) {
    shown = true; save.best ||= {}; if (stars > (save.best[index] || 0)) save.best[index] = stars; persist();
    $('stars').innerHTML = '★'.repeat(stars) + '<span>' + '★'.repeat(3 - stars) + '</span>';
    $('resultText').textContent = stars === 0 ? 'Auto-solved · 0 stars' : taps + ' taps · par ' + par; $('next').hidden = index >= 119;
    setTimeout(() => $('result').showModal(), 250);
  }
}

// ---- frame loop ----
let last = performance.now(); const frameTimes = []; window.mfFrameTimes = frameTimes; // [MoonBit ms, canvas ms]
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const t0 = performance.now();
  X.game_update(dt); const d = floats(X.game_draw()); const v = X.game_voices(), voices = v ? floats(v) : null;
  const t1 = performance.now();
  for (let k = 0; k < d.length;) { if (d[k] === 1) { lastScale = d[k + 3]; break; } k++; }
  draw(d); if (voices) play(voices);
  hud();
  frameTimes.push([t1 - t0, performance.now() - t1]); if (frameTimes.length > 2000) frameTimes.shift();
  requestAnimationFrame(frame);
}

// ---- input ----
let down = null;
canvas.addEventListener('pointerdown', e => { unlock(); down = { x: e.offsetX, y: e.offsetY, id: e.pointerId }; });
canvas.addEventListener('pointerup', e => {
  if (!down || down.id !== e.pointerId) return;
  if (Math.hypot(e.offsetX - down.x, e.offsetY - down.y) < 24) X.game_pointer(down.x, down.y);
  down = null;
});
$('undo').onclick = () => X.game_undo(); $('hint').onclick = () => { unlock(); X.game_hint(); };
$('autoSolve').onclick = () => { unlock(); X.game_auto(); }; $('restart').onclick = () => start(index);
$('prev').onclick = () => start(Math.max(0, index - 1)); $('nextLevel').onclick = () => start(Math.min(119, index + 1));
$('levelSelect').onchange = e => start(+e.target.value);
$('next').onclick = () => start(Math.min(119, index + 1)); $('again').onclick = () => start(index);
addEventListener('resize', resize);
start(index); requestAnimationFrame(frame);
