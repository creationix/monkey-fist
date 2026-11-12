// Original, procedurally synthesised music for Monkey Fist. No recordings or network assets.
(function (root) {
  'use strict';

  const hz = note => 440 * Math.pow(2, (note - 69) / 12);
  const bar = text => text.trim().split(/\s+/).map(token => token === '-' ? null : Number(token));
  const phrase = text => text.split('|').map(bar);
  const song = (title, bpm, voice, chords, verse, bridge, beat) => ({
    title, bpm, voice,
    chords: chords.split('|').map(chord => chord.trim().split(/\s+/).map(Number)),
    bars: [...phrase(verse), ...phrase(verse), ...phrase(bridge), ...phrase(beat)],
  });

  // Notes are MIDI numbers and every bar has eight eighth-note steps. The four sections make each
  // tune long enough to develop instead of sounding like a short arpeggio repeated forever.
  const SONGS = [
    song('Canopy Hop', 108, 'pluck',
      '48 52 55 59|45 48 52 57|53 57 60 64|55 59 62 65',
      '72 - 76 79 - 76 83 -|69 72 76 - 81 - 76 72|77 - 81 84 81 79 76 -|79 83 86 - 83 79 74 -',
      '84 - 83 79 76 - 79 83|81 79 76 - 72 76 81 -|77 81 84 86 84 - 81 77|79 - 74 79 83 81 79 -',
      '72 76 79 76 83 79 76 -|69 - 72 76 81 76 72 -|77 76 77 81 84 81 77 -|79 74 79 83 86 83 79 -'),
    song('Vine Swing', 116, 'marimba',
      '50 54 57 61|55 59 62 66|47 50 54 59|52 56 59 64',
      '74 78 81 - 78 74 69 -|79 83 86 83 81 79 74 -|71 74 78 - 83 78 74 -|76 80 83 80 76 - 71 -',
      '81 83 86 - 83 81 78 74|86 - 83 79 81 83 79 -|78 74 71 74 78 81 83 -|80 83 88 - 83 80 76 -',
      '74 - 78 81 85 81 78 -|79 83 86 - 90 86 83 -|71 74 78 83 81 78 74 -|76 80 83 88 83 80 76 -'),
    song('Temple Steps', 96, 'bell',
      '45 48 52 57|53 57 60 64|48 52 55 59|52 56 59 64',
      '76 - 81 - 84 81 76 -|77 - 81 84 - 81 77 -|72 76 79 - 83 - 79 76|80 - 83 88 83 - 80 -',
      '84 - 88 84 81 - 76 -|86 84 81 - 77 81 84 -|83 79 76 - 72 76 79 -|80 83 88 - 92 88 83 -',
      '76 81 84 - 88 - 84 81|77 - 81 84 89 84 81 -|79 76 72 76 83 79 76 -|80 - 83 88 83 80 76 -'),
    song('River Riddle', 92, 'warm',
      '50 53 57 60|46 50 53 58|43 47 50 55|48 52 55 59',
      '69 - 74 77 - 74 72 -|70 74 77 - 81 - 77 74|67 - 71 74 79 74 71 -|72 76 79 - 83 79 76 -',
      '77 81 84 - 81 77 74 -|82 - 81 77 74 - 70 74|79 74 71 - 67 71 74 -|76 79 84 83 79 - 76 -',
      '69 74 77 - 81 77 74 -|70 - 74 77 82 77 74 -|67 71 74 - 79 74 71 -|72 - 76 79 83 79 76 -'),
    song('Bamboo Dash', 124, 'pulse',
      '52 55 59 64|48 52 55 60|57 60 64 69|50 54 57 62',
      '76 79 83 88 83 79 76 71|72 76 79 84 79 76 72 67|81 84 88 93 88 84 81 76|74 78 81 86 81 78 74 69',
      '88 86 83 79 83 86 88 91|84 83 79 76 79 83 84 88|93 88 84 81 84 88 91 88|86 81 78 74 78 81 86 90',
      '76 83 79 88 83 91 88 83|72 79 76 84 79 88 84 79|81 88 84 93 88 96 93 88|74 81 78 86 81 90 86 81'),
    song('Moonlit Knot', 84, 'glass',
      '47 50 54 59|43 47 50 55|52 55 59 64|45 49 52 57',
      '74 - - 78 81 - 78 -|71 - 74 - 79 - 74 -|76 - - 79 83 - 79 -|69 - 73 - 76 - - -',
      '81 - 86 - 83 81 78 -|79 - 83 86 - 83 79 -|83 79 76 - 79 - 83 -|76 - 81 85 81 - 76 -',
      '74 - 78 - 81 - 86 -|71 74 - 79 - 74 71 -|76 - 79 83 - 88 83 -|73 - 76 81 76 - - -'),
  ];


  // Original rainforest-inspired grooves.
  // Four groups of four sixteenths: digits are accents; bass digits select chord tones.
  const rhythm = text => [...text.replace(/\s/g, '')].map(c => c === '-' ? null : Number(c));
  const grooves = [
    ['9--- --6- 7--- --5-', '--5- 8--4 --6- 9--4', '8--5 --7- --6- 5---', '6-3- 5-3- 6-3- 5-4-', '0--- --2- 0--2 --3-', .06, 0],
    ['8--- ---6 7--5 ----', '-4-- 8-5- --4- 9--5', '7--5 --7- --5- --6-', '5-35 6-35 5-35 6-36', '0--2 --3- 0--- -2-3', .12, 0],
    ['9--- ---- 6--- --5-', '---4 8--- --5- 9---', '7--- --5- ---- 6---', '5--- 4-3- 5--- 4-3-', '0--- ---- 2--- --3-', .04, -12],
    ['8--- --5- 7--- --6-', '--4- 7--5 --4- 8-5-', '--6- ---4 --7- ---5', '4-3- 5-3- 4-3- 5-3-', '0--- -2-- 3--- --2-', .08, 0],
    ['9--5 --7- 8--5 --6-', '-5-4 9-6- --5- 8-69', '8--6 --7- -5-6 --7-', '6353 6354 6353 6356', '0--2 --3- 0--2 -3-2', .04, -12],
    ['7--- ---- 5--- ----', '---- 6--- --3- 7---', '5--- ---- --4- ----', '4--- 3--- 4-2- 3---', '0--- ---- 2--- ----', .1, 0],
  ];
  SONGS.forEach((s, i) => {
    const [low, hand, wood, shaker, bass, swing, register] = grooves[i];
    s.groove = { low: rhythm(low), hand: rhythm(hand), wood: rhythm(wood), shaker: rhythm(shaker), bass: rhythm(bass), swing, register: register - 12 };
  });
  const SECTIONS = ['canopy', 'groove', 'river break', 'celebration'];

  function createMusicPlayer(context, destination) {
    let enabled = false, selected = SONGS[0], level = 1, step = 0, nextTime = 0, bus = null;
    let audibleChord = selected.chords[0], chordQueue = [], noiseBuffer = null;
    const MAX_VOICES = 96;

    function cleanup(target) {
      if (target.retired && !target.voices.size) target.nodes.forEach(n => n.disconnect());
    }
    function makeBus(time) {
      const gain = context.createGain(), delay = context.createDelay(2), filter = context.createBiquadFilter();
      const feedback = context.createGain(), echo = context.createGain(), warmth = context.createBiquadFilter();
      warmth.type = 'lowpass'; warmth.frequency.value = 2000; warmth.Q.value = .5;
      gain.connect(warmth); warmth.connect(destination); gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(1, time + .18);
      delay.delayTime.value = 45 / selected.bpm; filter.type = 'lowpass'; filter.frequency.value = 1100;
      feedback.gain.value = .12; echo.gain.value = .08;
      delay.connect(filter); filter.connect(echo); echo.connect(gain); filter.connect(feedback); feedback.connect(delay);
      return { gain, delay, voices: new Set(), nodes: [gain, delay, filter, feedback, echo, warmth], retired: false };
    }
    function retire(time, fade = .18) {
      if (!bus) return;
      const old = bus; bus = null; old.retired = true;
      if (old.gain.gain.cancelAndHoldAtTime) old.gain.gain.cancelAndHoldAtTime(time);
      else { old.gain.gain.cancelScheduledValues(time); old.gain.gain.setValueAtTime(old.gain.gain.value, time); }
      old.gain.gain.linearRampToValueAtTime(0, time + fade);
      for (const voice of old.voices) voice.source.stop(Math.min(voice.end, time + fade + .02));
      cleanup(old);
    }
    function track(target, source, nodes, end) {
      const voice = { source, end }; target.voices.add(voice);
      source.onended = () => { source.disconnect(); nodes.forEach(n => n.disconnect()); target.voices.delete(voice); cleanup(target); };
      source.stop(end);
    }
    function envelope(gain, volume, time, duration, attack) {
      gain.gain.setValueAtTime(.0001, time);
      gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), time + Math.min(attack, duration / 4));
      gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    }
    function tone(frequency, duration, volume, time, { type = 'sine', to, glide = .12, attack = .004, echo = false } = {}) {
      if (!bus || bus.voices.size >= MAX_VOICES) return;
      const target = bus, source = context.createOscillator(), gain = context.createGain();
      source.type = type; source.frequency.setValueAtTime(frequency, time);
      if (to) source.frequency.exponentialRampToValueAtTime(to, time + Math.min(duration, glide));
      envelope(gain, volume, time, duration, attack);
      source.connect(gain); gain.connect(target.gain); if (echo) gain.connect(target.delay);
      source.start(time); track(target, source, [gain], time + duration + .02);
    }
    function noise(duration, volume, frequency, time, echo = false) {
      if (!bus || bus.voices.size >= MAX_VOICES) return;
      if (!noiseBuffer) {
        noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
        const data = noiseBuffer.getChannelData(0); let seed = 7391;
        for (let i = 0; i < data.length; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; data[i] = (seed >>> 0) / 2147483648 - 1; }
      }
      const target = bus, source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
      source.buffer = noiseBuffer; source.loop = true;
      filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = .7;
      envelope(gain, volume, time, duration, .003);
      source.connect(filter); filter.connect(gain); gain.connect(target.gain); if (echo) gain.connect(target.delay);
      source.start(time, (step * .071) % .9); track(target, source, [filter, gain], time + duration + .01);
    }
    function drum(kind, velocity, time) {
      if (kind === 'low') {
        tone(105, .36, .135 * velocity, time, { to: 52, glide: .09 });
        tone(178, .06, .014 * velocity, time);
        noise(.025, .008 * velocity, 1000, time);
      } else if (kind === 'hand') {
        const pitch = step % 3 ? 174 : 142;
        tone(pitch * 1.35, .2, .06 * velocity, time, { to: pitch, glide: .025 });
        tone(pitch * 2, .055, .008 * velocity, time);
        noise(.035, .012 * velocity, 1800, time);
      } else if (kind === 'wood') {
        tone(520, .055, .018 * velocity, time, { attack: .008 });
        tone(760, .03, .006 * velocity, time + .002);
      } else noise(.06, .02 * velocity, 2800, time);
    }
    function lead(note, time, duration, velocity = 1, answering = false) {
      const frequency = hz(note), volume = .028 * velocity, voice = answering ? 'marimba' : selected.voice;
      if (voice === 'bell' || voice === 'glass') {
        // Breathy flute voices take the place of the old bright, ringing bells.
        const length = duration * (voice === 'glass' ? 1.6 : 1.3);
        tone(frequency, length, volume * .8, time, { attack: .035, echo: true });
        tone(frequency * 2, length * .75, volume * .06, time, { attack: .025, echo: true });
        noise(length * .7, volume * .05, Math.min(1800, frequency * 2), time, true);
      } else {
        const length = duration * (voice === 'warm' ? 1.5 : .8);
        tone(frequency, length, volume, time, { attack: .012, echo: true });
        tone(frequency * 2, length * .3, volume * .07, time, { attack: .008, echo: true });
        if (voice === 'pulse') tone(frequency * 2, length * .6, volume * .06, time, { echo: true });
        if (voice === 'warm') tone(frequency * 3, length * .5, volume * .035, time, { echo: true });
      }
    }
    function schedule(time) {
      const sixteenth = 15 / selected.bpm, i = step % 16, barNo = Math.floor(step / 16) % 16, cycle = Math.floor(step / 256);
      const section = Math.floor(barNo / 4), groove = selected.groove, chord = selected.chords[barNo % selected.chords.length];
      const human = .94 + ((step * 37 + selected.bpm) % 13) / 100;
      if (i === 0) chordQueue.push({ time, chord });
      // Light opening, full groove, a spacious river break, then a fuller return.
      const energy = [.8, 1, .62, 1.05][section];
      for (const kind of ['low', 'hand', 'wood', 'shaker']) {
        let accent = groove[kind][i]; if (accent === null) continue;
        if (kind === 'shaker' && accent <= 3) continue;
        if (section === 2 && ((kind === 'low' && i !== 0 && i !== 8) || (kind === 'shaker' && i % 4) || kind === 'wood')) continue;
        if (section === 0 && kind === 'wood' && !(barNo & 1)) continue;
        if (cycle && kind === 'hand' && i === 7) accent *= .6;
        drum(kind, accent / 9 * energy * human, time + (kind === 'hand' ? .007 : kind === 'wood' ? .003 : 0));
      }
      // A different short hand-drum answer at the end of each four-bar phrase.
      if (barNo % 4 === 3 && i >= 12 && (i + cycle) % 3 !== 0) {
        drum('hand', (.42 + (i - 12) * .12) * energy, time + .012);
        if (section === 3 && i === 15) drum('wood', .65, time + sixteenth * .5);
      }
      const bass = groove.bass[i];
      if (bass !== null && (section !== 2 || i === 0 || i === 8)) {
        const anticipation = i >= 14 && (barNo & 1), nextChord = selected.chords[(barNo + 1) % selected.chords.length];
        const note = anticipation ? nextChord[0] - 12 : chord[bass] - 12, frequency = hz(note);
        tone(frequency, sixteenth * (i === 0 ? 3.5 : 2.2), .1 * energy, time, { type: 'triangle', attack: .016 });
        tone(frequency, sixteenth * 3, .065 * energy, time + .002, { attack: .016 });
      }
      if (!(i & 1)) {
        const note = selected.bars[barNo][i / 2], melodicTime = time + ((barNo & 1) ? .006 : 0);
        if (note !== null) lead(note + groove.register, melodicTime, sixteenth * 2, human * (section === 2 ? .8 : 1));
        else if (section !== 0 && (barNo & 1) && (i === 6 || i === 10 || i === 14)) {
          lead(chord[(i / 2 + cycle) % 3], melodicTime + sixteenth * .2, sixteenth * 1.5, .4, true);
        }
      }
      if (i === 0 && (section === 1 || section === 3)) {
        chord.slice(0, 3).forEach(n => tone(hz(n), sixteenth * 12, .005, time, { attack: .12 }));
      }
      // Swing moves only the intervening sixteenth; every beat and bar stays aligned.
      return sixteenth * (i % 2 ? 1 - groove.swing : 1 + groove.swing);
    }
    function select(n, time) {
      level = Math.max(1, n | 0); selected = SONGS[(level - 1) % SONGS.length];
      retire(time); step = 0; nextTime = time; chordQueue = []; audibleChord = selected.chords[0];
      if (enabled) bus = makeBus(time);
    }

    return {
      setLevel(n) { select(n, context.currentTime + .05); },
      setEnabled(value) {
        value = !!value; if (enabled === value) return;
        enabled = value;
        if (!enabled) retire(context.currentTime, .08);
        else { step = 0; nextTime = context.currentTime + .05; chordQueue = []; audibleChord = selected.chords[0]; bus = makeBus(nextTime); }
      },
      tick(now = context.currentTime) {
        if (!enabled || context.state !== 'running') return;
        if (!bus) bus = makeBus(now + .05);
        if (nextTime < now) nextTime = now + .05;
        while (nextTime < now + .25) { nextTime += schedule(nextTime); step = (step + 1) % 512; }
        while (chordQueue.length && chordQueue[0].time <= now) audibleChord = chordQueue.shift().chord;
      },
      getChord() {
        while (chordQueue.length && chordQueue[0].time <= context.currentTime) audibleChord = chordQueue.shift().chord;
        return { bass: hz(audibleChord[0] - 12), melody: audibleChord.map(n => hz(n + 12)) };
      },
      get state() { return { title: selected.title, bpm: selected.bpm, level, enabled, step, section: SECTIONS[Math.floor((step % 256) / 64)], voices: bus?.voices.size || 0 }; },
      dispose() { enabled = false; retire(context.currentTime, .05); chordQueue = []; },
    };
  }

  const api = { SONGS, createMusicPlayer };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MFMusic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
