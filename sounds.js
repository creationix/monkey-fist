// The same synthesized effects for square and hex Monkey Fist.
(function (root) {
  'use strict';
  const GAPS = { click: 50, slide: 45, reflect: 40, spring: 80, pop: 45, bump: 110, thud: 60, undo: 80, hint: 250, win: 1500, lose: 1500 };
  function createSoundPlayer(context, destination, options = {}) {
    const bus = context.createGain(); bus.connect(destination);
    const active = new Set(), lastAt = {}, now = options.now || (() => context.currentTime * 1000);
    let enabled = true;
    function track(source, nodes) {
      active.add(source);
      source.onended = () => { active.delete(source); source.disconnect(); nodes.forEach(n => n.disconnect()); };
    }
    function tone(frequency, duration, type, volume, delay = 0, to, attack = .008) {
      if (active.size >= 40) return;
      const time = context.currentTime + delay, oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.type = type || 'sine'; oscillator.frequency.setValueAtTime(frequency, time);
      if (Array.isArray(to)) for (const [offset, pitch] of to) oscillator.frequency.exponentialRampToValueAtTime(pitch, time + offset);
      else if (to) oscillator.frequency.exponentialRampToValueAtTime(to, time + duration);
      gain.gain.setValueAtTime(.0001, time); gain.gain.exponentialRampToValueAtTime(volume, time + attack); gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
      oscillator.connect(gain); gain.connect(bus); track(oscillator, [gain]); oscillator.start(time); oscillator.stop(time + duration + .03);
    }
    function noise(duration, volume, from, to, delay = 0) {
      if (active.size >= 40) return;
      const time = context.currentTime + delay, length = Math.floor(context.sampleRate * duration);
      const buffer = context.createBuffer(1, length, context.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / length);
      const source = context.createBufferSource(), gain = context.createGain(), filter = context.createBiquadFilter();
      filter.type = 'bandpass'; filter.Q.value = 1.2; filter.frequency.setValueAtTime(from, time); filter.frequency.exponentialRampToValueAtTime(to, time + duration);
      source.buffer = buffer; gain.gain.value = volume; source.connect(filter); filter.connect(gain); gain.connect(bus);
      track(source, [filter, gain]); source.start(time);
    }
    function pluck(frequency, volume, delay = 0, duration = .5) {
      tone(frequency, duration, 'sine', volume, delay);
      tone(frequency * 4, .09, 'sine', volume * .35, delay);
      tone(frequency * 2, duration * .5, 'triangle', volume * .25, delay);
    }
    // Preserve the square game's waveforms, envelopes, pitches, and timings.
    const effects = {
      click() { tone(520, .06, 'sine', .22, 0, 700); },
      slide() { noise(.3, .3, 500, 2400); tone(260, .2, 'sine', .1, 0, 520); },
      reflect(turn = 0) {
        // A hollow, low pluck with a soft answering note, tuned to the music.
        const bass = options.getChord?.().bass || 65.41, frequency = bass * [4, 5, 6][Math.abs(turn | 0) % 3];
        tone(frequency, .22, 'sine', .23, 0, frequency * .96);
        tone(frequency * 2, .07, 'sine', .035);
        tone(frequency * 1.5, .14, 'triangle', .07, .035);
        noise(.045, .06, 750, 260);
      },
      spring() {
        tone(170, .38, 'sine', .28, 0, [[.04, 82], [.09, 150], [.16, 100], [.25, 126], [.38, 108]]);
        tone(340, .13, 'triangle', .055, 0, 150);
        noise(.045, .06, 500, 120);
      },
      pop(streak) {
        streak = Math.max(1, streak | 0);
        const chord = options.getChord?.() || { bass: 65.41, melody: [523.25, 587.33, 659.25, 783.99] };
        const step = (streak - 1) % 10, index = step < 6 ? step : 10 - step, lift = Math.floor((streak - 1) / 10) % 2 ? .5 : 1;
        pluck(chord.melody[index % chord.melody.length] * lift, .3 + Math.random() * .06, 0, .45);
        if (streak % 3 === 0) pluck(chord.melody[(index + 2) % chord.melody.length] * lift, .16, .09, .4);
        if (streak % 10 === 0) chord.melody.forEach((f, i) => pluck(f * 2, .12, .05 + i * .06, .5));
      },
      bump() { tone(140, .28, 'sine', .6, 0, 55); noise(.16, .35, 300, 90); tone(110, .2, 'triangle', .2, .01, 70); },
      thud() { tone(170, .14, 'sine', .3, 0, 90); noise(.07, .14, 420, 160); },
      undo() { tone(620, .16, 'sine', .2, 0, 330); },
      hint() { pluck(880, .35, 0, .25); pluck(1318.5, .35, .09, .4); },
      win() {
        // A quiet bass resolution with a soft onset and a lingering fifth.
        const bass = Math.max(50, Math.min(85, options.getChord?.().bass || 65.41));
        tone(bass * 1.08, 1.1, 'sine', .18, 0, bass, .045);
        tone(bass * 1.5, 1.35, 'sine', .055, .06, undefined, .07);
        tone(bass * 2, .8, 'sine', .025, .02, undefined, .035);
        // A gentle upper layer carries the resolution through phone speakers.
        tone(bass * 4, 1.15, 'sine', .055, .035, undefined, .05);
        tone(bass * 6, .95, 'sine', .025, .07, undefined, .08);
      },
      lose() { [392, 349.23, 311.13, 261.63].forEach((f, i) => { tone(f, .45, 'triangle', .4, i * .22); tone(f / 2, .45, 'sine', .3, i * .22); }); }
    };
    const api = {
      setEnabled(value) {
        enabled = !!value; bus.gain.setValueAtTime(enabled ? 1 : 0, context.currentTime);
        if (!enabled) for (const source of [...active]) { try { source.stop(); } catch { /* Already ended. */ } source.onended(); }
      },
      get state() { return { enabled, voices: active.size }; }
    };
    for (const [name, play] of Object.entries(effects)) api[name] = (...args) => {
      // The first user gesture may still be resuming a suspended context. Queue
      // its swish now so it plays as soon as the audio device is unlocked.
      if (!enabled || context.state === 'closed') return false;
      const time = now(); if (time - (lastAt[name] ?? -Infinity) < GAPS[name]) return false;
      lastAt[name] = time;
      try { play(...args); return true; } catch (error) { console.error(error); return false; }
    };
    return api;
  }
  const api = { createSoundPlayer, EFFECTS: Object.keys(GAPS) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MFSound = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
