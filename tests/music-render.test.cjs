const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const path = require('node:path');

test('all six arrangements render real audio with percussion, breathing room, and bounded voices', { timeout: 120000 }, async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    const page = await browser.newPage(); await page.addScriptTag({ path: path.join(__dirname, '../music.js') });
    const results = await page.evaluate(async () => {
      const results = [];
      for (let level = 1; level <= 6; level++) {
        const song = MFMusic.SONGS[level - 1], bar = 240 / song.bpm, duration = bar * 32 + 1, rate = 22050;
        const audio = new OfflineAudioContext(1, Math.ceil(duration * rate), rate), destination = audio.createGain();
        destination.gain.value = .55; destination.connect(audio.destination);
        // Offline rendering pauses in short blocks; let the ordinary scheduler fill
        // its lookahead while the render thread is paused, then continue rendering.
        const clock = new Proxy(audio, { get(target, key) { if (key === 'state') return 'running'; const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value; } });
        const player = MFMusic.createMusicPlayer(clock, destination); player.setLevel(level); player.setEnabled(true); player.tick();
        let peakVoices = 0;
        for (let t = .1; t < duration - .1; t += .1) audio.suspend(t).then(() => { player.tick(); peakVoices = Math.max(peakVoices, player.state.voices); audio.resume(); });
        const rendered = await audio.startRendering(), data = rendered.getChannelData(0);
        let peak = 0, finite = true, energy = 0;
        const sections = Array.from({ length: 8 }, () => ({ sum: 0, count: 0 }));
        for (let i = 0; i < data.length; i++) {
          const sample = data[i]; finite &&= Number.isFinite(sample); peak = Math.max(peak, Math.abs(sample)); energy += sample * sample;
          const section = Math.floor((i / rate - .05) / (bar * 4));
          if (sections[section]) { sections[section].sum += sample * sample; sections[section].count++; }
        }
        const rms = sections.map(s => Math.sqrt(s.sum / s.count));
        results.push({ title: song.title, peak, rms, finite, peakVoices, energy }); player.dispose();
      }
      return results;
    });
    for (const r of results) {
      assert.equal(r.finite, true, r.title);
      assert.ok(r.peak > .03 && r.peak < .45, r.title + ' leaves headroom for game effects: ' + r.peak);
      assert.ok(r.peakVoices > 10 && r.peakVoices < 64, r.title + ' voices: ' + r.peakVoices);
      assert.ok(r.rms.every(value => value > .003), r.title + ' has no silent sections');
      assert.ok(r.rms[2] < r.rms[1] * .94, r.title + ' river break is audibly lighter');
      assert.ok(r.rms[3] > r.rms[2] * 1.1, r.title + ' returns with a fuller groove');
      assert.notEqual(r.rms[0], r.rms[4], r.title + ' second pass varies');
      console.log(r.title, JSON.stringify({ peak: +r.peak.toFixed(3), rms: r.rms.map(v => +v.toFixed(4)), voices: r.peakVoices }));
    }
  } finally { await browser.close(); }
});
