'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { SONGS, createMusicPlayer } = require('../music.js');

function audioClock() {
  const oscillators = [], gains = [];
  const param = value => ({ value, setValueAtTime(v) { this.value = v; }, linearRampToValueAtTime(v) { this.value = v; }, exponentialRampToValueAtTime(v) { this.value = v; }, cancelScheduledValues() {} });
  const context = {
    currentTime: 0, state: 'running',
    createGain() {
      const node = { gain: param(1), connect() {}, disconnect() { node.disconnected = true; } };
      gains.push(node); return node;
    },
    createOscillator() {
      const node = { frequency: param(440), connect() {}, disconnect() {}, start(t) { node.started = t; }, stop(t) { node.stopped = t; } };
      oscillators.push(node); return node;
    },
  };
  return { context, destination: { connect() {} }, oscillators, gains };
}

test('six distinct, fully arranged songs have different musical characters', () => {
  assert.equal(SONGS.length, 6);
  assert.equal(new Set(SONGS.map(s => s.title)).size, 6);
  assert.equal(new Set(SONGS.map(s => s.bpm)).size, 6);
  assert.equal(new Set(SONGS.map(s => s.voice)).size, 6);
  for (const song of SONGS) {
    assert.equal(song.bars.length, 16, song.title);
    assert.ok(song.bars.every(bar => bar.length === 8), song.title);
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
  assert.ok(oscillators.length - before < 12);
});
