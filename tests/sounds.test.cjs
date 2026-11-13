const test = require('node:test');
const assert = require('node:assert/strict');
const { createSoundPlayer } = require('../sounds');

function device() {
  const sources = [], filters = [];
  const param = () => ({ value: 0, events: [], setValueAtTime(value, time) { this.value = value; this.events.push([value, time]); }, exponentialRampToValueAtTime(value, time) { this.events.push([value, time]); } });
  const node = () => ({ connect() {}, disconnect() { this.disconnected = true; } });
  const source = () => { const s = { ...node(), start(time) { this.started = time; }, stop(time) { this.stopped = time ?? 'now'; } }; sources.push(s); return s; };
  const context = { currentTime: 0, state: 'suspended', sampleRate: 44100,
    createGain: () => ({ ...node(), gain: param() }),
    createOscillator: () => Object.assign(source(), { frequency: param() }),
    createBufferSource: source,
    createBuffer: (_, length, sampleRate) => { const data = new Float32Array(length); return { length, sampleRate, getChannelData: () => data }; },
    createBiquadFilter: () => { const f = { ...node(), frequency: param(), Q: param() }; filters.push(f); return f; }
  };
  return { context, sources, filters };
}
test('the first gesture queues the square-game swish with its noise envelope and rising pitch', () => {
  const { context, sources, filters } = device(), player = createSoundPlayer(context, {});
  assert.equal(player.slide(), true, 'schedule even while the device resumes');
  const noise = sources.find(s => s.buffer), pitch = sources.find(s => s.frequency), data = noise.buffer.getChannelData(0);
  assert.equal(noise.buffer.length, 13230); assert.equal(Math.abs(data[0]), 0); assert.ok(data.some(v => Math.abs(v) > .5));
  assert.equal(filters[0].type, 'bandpass'); assert.deepEqual(filters[0].frequency.events, [[500, 0], [2400, .3]]);
  assert.deepEqual(pitch.frequency.events, [[260, 0], [520, .2]]);
  assert.equal(player.slide(), false, 'rapid duplicate swishes are throttled');
  context.currentTime = .05; assert.equal(player.slide(), true);
});
test('muting immediately stops and disconnects effects, and cannot queue hidden sounds', () => {
  const { context, sources } = device(), player = createSoundPlayer(context, {});
  player.win(); assert.ok(player.state.voices > 0); player.setEnabled(false);
  assert.equal(player.state.voices, 0); assert.ok(sources.every(s => s.stopped === 'now' && s.disconnected));
  context.currentTime = 2; const count = sources.length;
  assert.equal(player.slide(), false); assert.equal(player.pop(5), false); assert.equal(sources.length, count);
  player.setEnabled(true); assert.equal(player.slide(), true);
});
test('mirror reflections use the current harmony, stay in the lower register, and respect mute and throttling', () => {
  const { context, sources, filters } = device(), player = createSoundPlayer(context, {}, { getChord: () => ({ bass: 55 }) });
  assert.equal(player.reflect(0), true);
  assert.deepEqual(sources.filter(s => s.frequency).map(s => s.frequency.value), [220, 440, 330]);
  assert.equal(filters[0].type, 'bandpass');
  assert.equal(player.reflect(1), false); context.currentTime = .05; assert.equal(player.reflect(1), true);
  assert.equal(sources.filter(s => s.frequency)[3].frequency.value, 275);
  player.setEnabled(false); assert.equal(player.reflect(2), false); assert.equal(player.state.voices, 0);
});
test('spring impacts make a damped low-pitch wobble and stop immediately when muted', () => {
  const { context, sources } = device(), player = createSoundPlayer(context, {});
  assert.equal(player.spring(), true);
  assert.deepEqual(sources[0].frequency.events, [[170, 0], [82, .04], [150, .09], [100, .16], [126, .25], [108, .38]]);
  assert.equal(player.spring(), false); player.setEnabled(false);
  assert.equal(player.state.voices, 0); assert.equal(player.spring(), false);
});
test('exit notes follow the selected song and concurrent sound voices stay bounded', () => {
  const { context, sources } = device(), player = createSoundPlayer(context, {}, { getChord: () => ({ melody: [300, 400, 500] }) });
  player.pop(2); assert.equal(sources[0].frequency.value, 400);
  for (let i = 0; i < 100; i++) { context.currentTime += .1; player.slide(); player.pop(i); }
  assert.equal(player.state.voices, 40); assert.equal(sources.length, 40);
  sources.forEach(s => s.onended()); assert.equal(player.state.voices, 0);
  context.currentTime += 1; assert.equal(player.thud(), true); assert.equal(player.state.voices, 2);
});

test('completion resolves softly in the bass register without the former high arpeggio', () => {
  const { context, sources } = device(), player = createSoundPlayer(context, {}, { getChord: () => ({ bass: 65 }) });
  assert.equal(player.win(), true); assert.equal(sources.length, 5);
  assert.ok(sources.every(s => s.type === 'sine' && s.frequency.value < 520));
  assert.ok(sources.slice(0, 3).every(s => s.frequency.value < 150));
  assert.deepEqual(sources.slice(3).map(s => s.frequency.value), [260, 390]);
  assert.deepEqual(sources[0].frequency.events, [[70.2, 0], [65, 1.1]]);
  assert.ok(sources.every(s => s.stopped - s.started >= .8));
  assert.equal(player.win(), false); player.setEnabled(false);
  assert.equal(player.state.voices, 0);
});
