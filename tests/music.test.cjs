'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { SONGS, createMusicPlayer } = require('../music.js');

function audioClock() {
  const oscillators = [], gains = [], sources = [], nodes = [], buffers = [];
  const param = value => ({ value, setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime(v) { this.value = v; }, exponentialRampToValueAtTime(v) { this.value = v; }, cancelScheduledValues() {} });
  const node = () => { const n = { connect() {}, disconnect() { n.disconnected = true; } }; nodes.push(n); return n; };
  const source = () => { const n = Object.assign(node(), { start(t) { n.started = t; }, stop(t) { n.stopped = t; } }); sources.push(n); return n; };
  const context = {
    currentTime: 0, state: 'running', sampleRate: 22050,
    createGain() {
      const n = Object.assign(node(), { gain: param(1) }); gains.push(n); return n;
    },
    createOscillator() {
      const n = Object.assign(source(), { frequency: param(440) }); oscillators.push(n); return n;
    },
    createBufferSource: source,
    createBuffer(channels, length, sampleRate) { const data = new Float32Array(length), buffer = { length, sampleRate, getChannelData: () => data }; buffers.push(buffer); return buffer; },
    createBiquadFilter: () => Object.assign(node(), { frequency: param(440), Q: param(1) }),
    createDelay: () => Object.assign(node(), { delayTime: param(0) }),
  };
  const advance = time => { context.currentTime = time; for (const s of sources) if (!s.ended && s.stopped <= time) { s.ended = true; s.onended?.(); } };
  return { context, destination: { connect() {} }, oscillators, sources, gains, nodes, buffers, advance };
}

test('six distinct, fully arranged songs have different musical characters', () => {
  assert.equal(SONGS.length, 6);
  assert.equal(new Set(SONGS.map(s => s.title)).size, 6);
  assert.equal(new Set(SONGS.map(s => s.bpm)).size, 6);
  assert.equal(new Set(SONGS.map(s => s.voice)).size, 6);
  assert.equal(new Set(SONGS.map(s => JSON.stringify(s.groove))).size, 6);
  for (const song of SONGS) {
    assert.equal(song.bars.length, 16, song.title);
    assert.ok(song.bars.every(bar => bar.length === 8), song.title);
    for (const kind of ['low', 'hand', 'wood', 'shaker', 'bass']) {
      assert.equal(song.groove[kind].length, 16);
      assert.ok(song.groove[kind].some(v => v !== null));
    }
  }
});

test('adjacent levels get different songs and retrying a level keeps its song', () => {
  const { context, destination } = audioClock(), player = createMusicPlayer(context, destination);
  const titles = [];
  for (let level = 1; level <= 8; level++) { player.setLevel(level); titles.push(player.state.title); }
  for (let i = 1; i < titles.length; i++) assert.notEqual(titles[i], titles[i - 1]);
  player.setLevel(4); const title = player.state.title; player.setLevel(4);
  assert.equal(player.state.title, title);
  assert.equal(titles[6], titles[0], 'playlist should wrap after all six songs');
});

test('muting stops scheduling voices and enabling starts the selected level song', () => {
  const { context, destination, oscillators } = audioClock(), player = createMusicPlayer(context, destination);
  player.setLevel(5); player.tick();
  assert.equal(oscillators.length, 0);
  player.setEnabled(true); player.tick();
  assert.ok(oscillators.length > 0);
  const before = oscillators.length;
  player.setEnabled(false); context.currentTime = 5; player.tick();
  assert.equal(oscillators.length, before);
  assert.equal(player.state.enabled, false);
});

test('a stalled audio clock resumes ahead of now instead of scheduling a catch-up burst', () => {
  const { context, destination, oscillators } = audioClock(), player = createMusicPlayer(context, destination);
  player.setEnabled(true); player.tick();
  const before = oscillators.length;
  context.currentTime = 100; player.tick();
  assert.ok(oscillators.length - before < 24, 'only the next quarter-second is scheduled');
});

test('muting and changing songs stop every source and clean up percussion, filters, and echo feedback', () => {
  const { context, destination, sources, gains, advance } = audioClock(), player = createMusicPlayer(context, destination);
  player.setEnabled(true); player.tick();
  const first = sources.slice(), firstGains = gains.slice();
  assert.ok(first.some(s => s.buffer), 'real noise percussion is scheduled');
  player.setLevel(2); advance(1);
  assert.ok(first.every(s => s.ended)); assert.ok(firstGains.every(g => g.disconnected));
  player.tick(); const second = sources.filter(s => !s.ended);
  player.setEnabled(false); advance(2); player.tick();
  assert.ok(second.every(s => s.ended)); assert.equal(player.state.voices, 0);
  player.setEnabled(true); player.tick(); player.dispose(); advance(3);
  assert.ok(sources.every(s => s.ended)); assert.ok(gains.every(g => g.disconnected));
});

test('a long session develops through all sections without growing the active voice pool or reallocating noise', () => {
  const { context, destination, buffers, advance } = audioClock(), player = createMusicPlayer(context, destination), sections = new Set();
  player.setEnabled(true); let peak = 0;
  for (let i = 0; i < 2000; i++) { advance(i * .05); player.tick(); sections.add(player.state.section); peak = Math.max(peak, player.state.voices); }
  assert.equal(sections.size, 4); assert.ok(peak > 10 && peak < 64, 'normal arranging stays well below the voice cap');
  assert.equal(buffers.length, 1, 'shakers and hand drums reuse one noise buffer');
  player.dispose(); advance(101); assert.equal(player.state.voices, 0);
});
