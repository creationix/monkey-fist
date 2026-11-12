// Browser audio session shared by square and Hex. Games supply their own settings
// and menu rules; the synth, mix, mobile unlock, and scheduling live here.
(function (root) {
  'use strict';
  const SOUND_LEVELS = [
    { id: 'off', label: 'Off', gain: 0 },
    { id: 'low', label: 'Low', gain: .15 },
    { id: 'full', label: 'Full', gain: .6 },
  ];
  // Keep previous on/off preferences; new players start with the gentler mix.
  const soundSetting = value => SOUND_LEVELS.find(level => level.id === value) || SOUND_LEVELS[value === false ? 0 : value === true ? 2 : 1];
  const nextSound = value => SOUND_LEVELS[(SOUND_LEVELS.indexOf(soundSetting(value)) + 1) % SOUND_LEVELS.length].id;
  function createAudio(readState) {
    let context = null, music = null, sound = null, soundBus = null, soundGain = null;
    function sync() {
      const state = readState(), setting = soundSetting(state.sound);
      if (soundBus && setting.gain !== soundGain) {
        soundGain = setting.gain;
        soundBus.gain.setTargetAtTime(soundGain, context.currentTime, .015);
      }
      sound?.setEnabled(setting.id !== 'off' && !document.hidden);
      music?.setEnabled(!!state.music);
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
        const musicBus = context.createGain(); soundBus = context.createGain();
        soundGain = soundSetting(readState().sound).gain;
        musicBus.gain.value = .55; soundBus.gain.value = soundGain;
        musicBus.connect(limiter); soundBus.connect(limiter);
        music = MFMusic.createMusicPlayer(context, musicBus);
        sound = MFSound.createSoundPlayer(context, soundBus, { getChord: () => music.getChord() });
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
  root.MFAudio = { createAudio, soundSetting, nextSound };
})(globalThis);
