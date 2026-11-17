const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.MF_TEST_URL || 'http://127.0.0.1:4173/';

test('the sound and music settings choose actual mix levels and persist offline', { timeout: 60000 }, async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } }), page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        const original = AudioContext.prototype.createGain;
        AudioContext.prototype.createGain = function () {
          const gain = original.call(this), connect = gain.connect.bind(gain);
          gain.connect = (destination, ...args) => {
            if (destination instanceof DynamicsCompressorNode) {
              if (Math.abs(gain.gain.value - .55) < .0001) window.__musicGain = gain.gain;
              else window.__effectsGain = gain.gain;
            }
            return connect(destination, ...args);
          };
          return gain;
        };
      });
      const ready = () => page.waitForFunction(() => window.__game?.G.level && !__game.G.loading);
      const choice = (name, mode) => `[name=${name}][value=${mode}]`, storage = 'monkey-fist-unified-v1';
      await page.goto(base); await ready();
      await page.keyboard.press('Shift');
      await page.click('#openSettings');
      const verify = async (mode, gain) => {
        assert.equal(await page.isChecked(choice('sound', mode)), true);
        // Muting stops all sources immediately; an inactive Web Audio branch may
        // stop rendering its gain automation until another source is connected.
        if (mode !== 'off') {
          await page.evaluate(() => gameAudio.sfx.slide());
          await page.waitForFunction(gain => Math.abs(__effectsGain.value - gain) < .001, gain);
        } else assert.equal(await page.evaluate(() => gameAudio.sound.state.voices), 0);
        assert.equal(await page.evaluate(() => gameAudio.sound.state.enabled), mode !== 'off');
        assert.ok(Math.abs(await page.evaluate(() => __musicGain.value) - .55) < .0001, 'sound level must not alter the music bus');
        assert.equal(await page.evaluate(() => __game.save.sound), mode);
      };
      await verify('soft', .15);
      await page.screenshot({ path: '/tmp/monkey-fist-sound.png' });
      for (const [mode, gain] of [['full', .6], ['off', 0], ['soft', .15]]) {
        await page.check(choice('sound', mode)); await verify(mode, gain);
        assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).sound, storage), mode);
      }
      // Music: Off, then Soft at the original level, then Full at about twice it. It plays
      // only outside Settings, so each level is checked with Settings closed.
      assert.equal(await page.isChecked(choice('music', 'off')), true);
      for (const [mode, gain] of [['soft', .55], ['full', 1.15], ['off', null]]) {
        await page.check(choice('music', mode));
        assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).music, storage), mode);
        assert.equal(await page.evaluate(() => gameAudio.music.state.enabled), false, 'music pauses while Settings is open');
        await page.click('#closeSettings');
        await page.waitForFunction(on => gameAudio.music.state.enabled === on, mode !== 'off');
        if (gain) await page.waitForFunction(gain => Math.abs(__musicGain.value - gain) < .001, gain);
        await page.click('#openSettings');
      }
      await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      await context.setOffline(true); await page.reload(); await ready(); await page.keyboard.press('Shift'); await page.click('#openSettings');
      await verify('soft', .15);
      assert.deepEqual(errors, []); await context.close();
    }
  } finally { await browser.close(); }
});
