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
    song('Canopy Hop', 104, 'pluck',
      '48 52 55 59|45 48 52 57|53 57 60 64|55 59 62 65',
      '72 - 76 79 - 76 83 -|69 72 76 - 81 - 76 72|77 - 81 84 81 79 76 -|79 83 86 - 83 79 74 -',
      '84 - 83 79 76 - 79 83|81 79 76 - 72 76 81 -|77 81 84 86 84 - 81 77|79 - 74 79 83 81 79 -',
      '72 76 79 76 83 79 76 -|69 - 72 76 81 76 72 -|77 76 77 81 84 81 77 -|79 74 79 83 86 83 79 -'),
    song('Vine Swing', 118, 'marimba',
      '50 54 57 61|55 59 62 66|47 50 54 59|52 56 59 64',
      '74 78 81 - 78 74 69 -|79 83 86 83 81 79 74 -|71 74 78 - 83 78 74 -|76 80 83 80 76 - 71 -',
      '81 83 86 - 83 81 78 74|86 - 83 79 81 83 79 -|78 74 71 74 78 81 83 -|80 83 88 - 83 80 76 -',
      '74 - 78 81 85 81 78 -|79 83 86 - 90 86 83 -|71 74 78 83 81 78 74 -|76 80 83 88 83 80 76 -'),
    song('Temple Steps', 92, 'bell',
      '45 48 52 57|53 57 60 64|48 52 55 59|52 56 59 64',
      '76 - 81 - 84 81 76 -|77 - 81 84 - 81 77 -|72 76 79 - 83 - 79 76|80 - 83 88 83 - 80 -',
      '84 - 88 84 81 - 76 -|86 84 81 - 77 81 84 -|83 79 76 - 72 76 79 -|80 83 88 - 92 88 83 -',
      '76 81 84 - 88 - 84 81|77 - 81 84 89 84 81 -|79 76 72 76 83 79 76 -|80 - 83 88 83 80 76 -'),
    song('River Riddle', 80, 'warm',
      '50 53 57 60|46 50 53 58|43 47 50 55|48 52 55 59',
      '69 - 74 77 - 74 72 -|70 74 77 - 81 - 77 74|67 - 71 74 79 74 71 -|72 76 79 - 83 79 76 -',
      '77 81 84 - 81 77 74 -|82 - 81 77 74 - 70 74|79 74 71 - 67 71 74 -|76 79 84 83 79 - 76 -',
      '69 74 77 - 81 77 74 -|70 - 74 77 82 77 74 -|67 71 74 - 79 74 71 -|72 - 76 79 83 79 76 -'),
    song('Bamboo Dash', 136, 'pulse',
      '52 55 59 64|48 52 55 60|57 60 64 69|50 54 57 62',
      '76 79 83 88 83 79 76 71|72 76 79 84 79 76 72 67|81 84 88 93 88 84 81 76|74 78 81 86 81 78 74 69',
      '88 86 83 79 83 86 88 91|84 83 79 76 79 83 84 88|93 88 84 81 84 88 91 88|86 81 78 74 78 81 86 90',
      '76 83 79 88 83 91 88 83|72 79 76 84 79 88 84 79|81 88 84 93 88 96 93 88|74 81 78 86 81 90 86 81'),
    song('Moonlit Knot', 72, 'glass',
      '47 50 54 59|43 47 50 55|52 55 59 64|45 49 52 57',
      '74 - - 78 81 - 78 -|71 - 74 - 79 - 74 -|76 - - 79 83 - 79 -|69 - 73 - 76 - - -',
      '81 - 86 - 83 81 78 -|79 - 83 86 - 83 79 -|83 79 76 - 79 - 83 -|76 - 81 85 81 - 76 -',
      '74 - 78 - 81 - 86 -|71 74 - 79 - 74 71 -|76 - 79 83 - 88 83 -|73 - 76 81 76 - - -'),
  ];

  function createMusicPlayer(context, destination) {
    let enabled = false, selected = SONGS[0], level = 1, step = 0, nextTime = 0, bus = null;

    function makeBus(time) {
      const gain = context.createGain(); gain.connect(destination);
      gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(1, time + 0.18);
      return { gain, voices: new Set(), retired: false };
    }
    function retire(time, fade) {
      if (!bus) return;
      const old = bus; bus = null; old.retired = true; fade = fade === undefined ? 0.18 : fade;
      old.gain.gain.cancelScheduledValues(time);
      old.gain.gain.setValueAtTime(old.gain.gain.value, time);
      old.gain.gain.linearRampToValueAtTime(0, time + fade);
      for (const voice of old.voices) voice.osc.stop(Math.min(voice.end, time + fade + 0.02));
      if (!old.voices.size) old.gain.disconnect();
    }
    function oscillator(note, duration, type, volume, time, slide) {
      if (!bus) return;
      const target = bus, osc = context.createOscillator(), gain = context.createGain();
      osc.type = type; osc.frequency.setValueAtTime(hz(note), time);
      if (slide !== undefined) osc.frequency.exponentialRampToValueAtTime(hz(slide), time + duration);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(volume, time + Math.min(0.018, duration / 4));
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      osc.connect(gain); gain.connect(target.gain);
      const voice = { osc, end: time + duration + 0.02 }; target.voices.add(voice);
      osc.onended = () => {
        osc.disconnect(); gain.disconnect(); target.voices.delete(voice);
        if (target.retired && !target.voices.size) target.gain.disconnect();
      };
      osc.start(time); osc.stop(voice.end);
    }
    function schedule(time) {
      const eighth = 30 / selected.bpm, i = step & 7, barNo = (step >> 3) % selected.bars.length;
      const chord = selected.chords[barNo % selected.chords.length], note = selected.bars[barNo][i];
      if (note !== null && Number.isFinite(note)) {
        const type = selected.voice === 'pluck' || selected.voice === 'marimba' || selected.voice === 'pulse' ? 'triangle' : 'sine';
        oscillator(note, eighth * (selected.voice === 'bell' || selected.voice === 'glass' ? 1.7 : 0.85), type, 0.035, time);
        if (selected.voice === 'bell' || selected.voice === 'glass') oscillator(note + 19, eighth * 0.8, 'sine', 0.004, time);
      }
      if (i === 0) {
        oscillator(chord[0] - 12, eighth * 5.5, 'triangle', 0.035, time);
        chord.slice(0, 3).forEach(n => oscillator(n, eighth * 7.2, 'sine', 0.008, time));
      }
      if (selected.voice === 'pulse') {
        if (!(i & 1)) oscillator(chord[(i >> 1) % 3] - 12, eighth * 0.7, 'triangle', 0.025, time);
        if (i === 0 || i === 4) oscillator(36, 0.1, 'sine', 0.032, time, 24);
      } else if (selected.voice === 'marimba' && (i === 2 || i === 6)) {
        oscillator(chord[2] + 12, eighth * 0.55, 'sine', 0.014, time);
      } else if ((selected.voice === 'bell' || selected.voice === 'glass') && i === 6 && (barNo & 1)) {
        oscillator(chord[3] + 12, eighth * 1.8, 'sine', 0.009, time);
      } else if (i === 3 || i === 7) {
        oscillator(92, 0.025, 'triangle', 0.005, time);
      }
      return eighth;
    }
    function select(n, time) {
      level = Math.max(1, n | 0); selected = SONGS[(level - 1) % SONGS.length];
      retire(time); step = 0; nextTime = time;
      if (enabled) bus = makeBus(time);
    }

    return {
      setLevel(n) { select(n, context.currentTime + 0.05); },
      setEnabled(value) {
        value = !!value;
        if (enabled === value) return;
        enabled = value;
        if (!enabled) retire(context.currentTime, 0.08);
        else { step = 0; nextTime = context.currentTime + 0.05; bus = makeBus(nextTime); }
      },
      tick(now) {
        now = now === undefined ? context.currentTime : now;
        if (!enabled || context.state !== 'running') return;
        if (!bus) bus = makeBus(now + 0.05);
        if (nextTime < now) nextTime = now + 0.05;
        while (nextTime < now + 0.25) { nextTime += schedule(nextTime); step = (step + 1) % (selected.bars.length * 8); }
      },
      getChord() {
        const chord = selected.chords[((Math.max(0, step - 1) >> 3) % selected.chords.length)];
        return { bass: hz(chord[0] - 12), melody: chord.map(n => hz(n + 12)) };
      },
      get state() { return { title: selected.title, bpm: selected.bpm, level, enabled, step }; },
      dispose() { enabled = false; retire(context.currentTime, 0.05); },
    };
  }

  const api = { SONGS, createMusicPlayer };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MFMusic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
