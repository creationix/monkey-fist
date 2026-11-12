const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.MF_TEST_URL || 'http://127.0.0.1:4173/';

test('both sound buttons cycle actual mix levels, persist offline, and retain legacy mute settings', { timeout: 60000 }, async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    for (const hex of [false, true]) {
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
      const ready = () => page.waitForFunction(hex => hex ? window.__hex?.G.level && !__hex.G.loading : !!window.__mf, hex);
      const button = page.locator(hex ? '#sound' : '#tSound'), storage = hex ? 'monkey-fist-hex-v1' : 'monkey-fist';
      await page.goto(base + (hex ? 'hex/' : '')); await ready();
      await page.keyboard.press('Shift');
      const verify = async (mode, gain) => {
        assert.equal(await button.getAttribute('aria-label'), 'Sound effects: ' + mode[0].toUpperCase() + mode.slice(1));
        assert.equal(await button.getAttribute('aria-pressed'), String(mode !== 'off'));
        // Muting stops all sources immediately; an inactive Web Audio branch may
        // stop rendering its gain automation until another source is connected.
        if (mode !== 'off') {
          await page.evaluate(() => gameAudio.sfx.slide());
          await page.waitForFunction(gain => Math.abs(__effectsGain.value - gain) < .001, gain);
        } else assert.equal(await page.evaluate(() => gameAudio.sound.state.voices), 0);
        assert.equal(await page.evaluate(() => gameAudio.sound.state.enabled), mode !== 'off');
        assert.ok(Math.abs(await page.evaluate(() => __musicGain.value) - .55) < .0001, 'sound level must not alter the music bus');
        assert.equal(await page.evaluate(hex => (hex ? __hex : __mf).save.sound, hex), mode);
      };
      await verify('low', .15);
      await page.screenshot({ path: '/tmp/monkey-fist-sound-' + (hex ? 'hex' : 'square') + '.png' });
      for (const [mode, gain] of [['full', .6], ['off', 0], ['low', .15]]) {
        await button.click(); await verify(mode, gain);
        assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).sound, storage), mode);
      }
      await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      await context.setOffline(true); await page.reload(); await ready(); await page.keyboard.press('Shift');
      await verify('low', .15);
      for (const [legacy, mode, gain] of [[true, 'full', .6], [false, 'off', 0]]) {
        await page.evaluate(({ storage, legacy }) => {
          const save = JSON.parse(localStorage.getItem(storage)); save.sound = legacy; localStorage.setItem(storage, JSON.stringify(save));
        }, { storage, legacy });
        await page.reload(); await ready(); await page.keyboard.press('Shift'); await verify(mode, gain);
      }
      assert.deepEqual(errors, []); await context.close();
    }
  } finally { await browser.close(); }
});
