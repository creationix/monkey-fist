// Browser audio session. The game supplies its settings and menu rules; the
// synth, mix, mobile unlock, and scheduling live here.
(function (root) {
  'use strict';
  // Sound effects and music each have Off, Soft and Full. New players start with soft
  // effects and no music. Full music is about twice Soft, still below the limiter.
  const LEVELS = [{ id: 'off', label: 'Off' }, { id: 'soft', label: 'Soft' }, { id: 'full', label: 'Full' }];
  const GAINS = { sound: { off: 0, soft: .15, full: .6 }, music: { off: 0, soft: .55, full: 1.15 } };
  const DEFAULTS = { sound: 'soft', music: 'off' };
  const setting = (kind, value) => { const level = LEVELS.find(l => l.id === value) || LEVELS.find(l => l.id === DEFAULTS[kind]); return { ...level, gain: GAINS[kind][level.id] }; };
  const nextSetting = (kind, value) => LEVELS[(LEVELS.findIndex(l => l.id === setting(kind, value).id) + 1) % LEVELS.length].id;
  function createAudio(readState) {
    let context = null, music = null, sound = null;
    const buses = {}, gains = {};
    // Follow a bus to its setting's gain; an Off setting leaves the gain and stops the source.
    function follow(kind, level) {
      if (!buses[kind] || level.id === 'off' || level.gain === gains[kind]) return;
      gains[kind] = level.gain; buses[kind].gain.setTargetAtTime(level.gain, context.currentTime, .015);
    }
    function sync() {
      const state = readState(), soundLevel = setting('sound', state.sound), musicLevel = setting('music', state.music);
      follow('sound', soundLevel); follow('music', musicLevel);
      sound?.setEnabled(soundLevel.id !== 'off' && !document.hidden);
      music?.setEnabled(musicLevel.id !== 'off');
    }
    function init() {
      if (!context) {
        const Audio = root.AudioContext || root.webkitAudioContext; if (!Audio) return;
        // iPhone's silent switch should not mute an explicitly enabled game.
        try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* Optional on iOS. */ }
        context = new Audio();
        const limiter = context.createDynamicsCompressor();
        limiter.threshold.value = -10; limiter.knee.value = 8; limiter.ratio.value = 8;
        limiter.attack.value = .003; limiter.release.value = .2; limiter.connect(context.destination);
        for (const kind of ['sound', 'music']) {
          buses[kind] = context.createGain();
          gains[kind] = buses[kind].gain.value = setting(kind, readState()[kind]).gain || GAINS[kind].soft;
          buses[kind].connect(limiter);
        }
        music = MFMusic.createMusicPlayer(context, buses.music);
        sound = MFSound.createSoundPlayer(context, buses.sound, { getChord: () => music.getChord() });
        music.setLevel(readState().level);
        // Both games use the same lookahead scheduler, independent of rendering.
        setInterval(() => music.tick(), 80);
        // Some phones need a silent source started inside the first gesture.
        try {
          const source = context.createBufferSource(); source.buffer = context.createBuffer(1, 1, 22050);
          source.connect(context.destination); source.onended = () => source.disconnect(); source.start(0);
        } catch { /* Resume still works without the unlock blip on other browsers. */ }
      }
      if (!document.hidden && context.state !== 'running') context.resume().catch(() => {});
      sync();
    }
    const sfx = Object.fromEntries(MFSound.EFFECTS.map(name => [name, (...args) => sound?.[name](...args)]));
    for (const event of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) root.addEventListener(event, init, true);
    document.addEventListener('click', event => { if (event.target.closest('button')) sfx.click(); });
    document.addEventListener('visibilitychange', () => {
      sync();
      if (context) (document.hidden ? context.suspend() : context.resume()).catch(() => {});
    });
    return { init, sync, sfx, get music() { return music; }, get sound() { return sound; } };
  }
  root.MFAudio = { createAudio, setting, nextSetting };
})(globalThis);
