const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.MF_TEST_URL || 'http://127.0.0.1:4173/';

test('the sound button cycles actual mix levels and persists offline', { timeout: 60000 }, async () => {
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
      const button = page.locator('#sound'), storage = 'monkey-fist-unified-v1';
      await page.goto(base); await ready();
      await page.keyboard.press('Shift');
      await page.click('#levels');
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
        assert.equal(await page.evaluate(() => __game.save.sound), mode);
      };
      await verify('low', .15);
      await page.screenshot({ path: '/tmp/monkey-fist-sound.png' });
      for (const [mode, gain] of [['full', .6], ['off', 0], ['low', .15]]) {
        await button.click(); await verify(mode, gain);
        assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).sound, storage), mode);
      }
      await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      await context.setOffline(true); await page.reload(); await ready(); await page.keyboard.press('Shift'); await page.click('#levels');
      await verify('low', .15);
      assert.deepEqual(errors, []); await context.close();
    }
  } finally { await browser.close(); }
});
