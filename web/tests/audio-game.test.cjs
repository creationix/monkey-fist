const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.MF_TEST_URL || 'http://127.0.0.1:4173/';

test('the game lazily shares one audio session across gestures, song changes, and backgrounding', { timeout: 60000 }, async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    {
      const context = await browser.newContext(), page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        window.__contexts = []; window.__unlocks = 0;
        const Original = AudioContext;
        window.AudioContext = class extends Original {
          constructor(...args) { super(...args); __contexts.push(this); }
          createBufferSource() {
            const source = super.createBufferSource(), start = source.start.bind(source);
            source.start = (...args) => { if (source.buffer?.length === 1) __unlocks++; start(...args); };
            return source;
          }
        };
        localStorage.setItem('monkey-fist-unified-v1', JSON.stringify({ music: 'soft', sound: 'full' }));
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => !!window.__testHidden });
      });
      await page.goto(base);
      await page.waitForFunction(() => window.__game?.G.level && !__game.G.loading);
      assert.equal(await page.evaluate(() => __contexts.length), 0, 'loading a page must not open an audio device');
      await page.keyboard.press('Shift');
      await page.waitForFunction(() => __contexts[0]?.state === 'running' && gameAudio.music.state.voices > 0);
      await page.evaluate(async () => {
        await __game.start(4);
        window.__selections = 0;
        const select = gameAudio.music.setLevel;
        gameAudio.music.setLevel = n => { __selections++; select(n); };
      });
      await page.keyboard.press('Shift'); await page.mouse.click(2, 2);
      assert.deepEqual(await page.evaluate(() => ({ contexts: __contexts.length, unlocks: __unlocks, selections: __selections, level: gameAudio.music.state.level })),
        { contexts: 1, unlocks: 1, selections: 0, level: 5 });
      for (const muted of [false, true]) {
        if (muted) await page.evaluate(() => { __game.save.music = 'off'; gameAudio.sync(); });
        await page.evaluate(() => { __testHidden = true; document.dispatchEvent(new Event('visibilitychange')); });
        await page.waitForFunction(() => __contexts[0].state === 'suspended');
        assert.equal(await page.evaluate(() => gameAudio.sound.state.enabled), false);
        await page.evaluate(() => { __testHidden = false; document.dispatchEvent(new Event('visibilitychange')); });
        await page.waitForFunction(() => __contexts[0].state === 'running');
        assert.deepEqual(await page.evaluate(() => ({ sound: gameAudio.sound.state.enabled, music: gameAudio.music.state.enabled, level: gameAudio.music.state.level })),
          { sound: true, music: !muted, level: 5 });
      }
      assert.deepEqual(errors, []); await context.close();
    }
  } finally { await browser.close(); }
});

test('the game remains playable without Web Audio', { timeout: 30000 }, async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    {
      const context = await browser.newContext(), page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => { window.AudioContext = window.webkitAudioContext = undefined; });
      await page.goto(base);
      await page.waitForFunction(() => window.__game?.G.level && !__game.G.loading);
      await page.keyboard.press('Shift');
      assert.equal(await page.evaluate(() => { __game.tap(__game.G.plan[0]); return __game.G.taps; }), 1);
      assert.deepEqual(errors, []); await context.close();
    }
  } finally { await browser.close(); }
});
