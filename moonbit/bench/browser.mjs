// Chromium benchmarks: generation (bench/browser.html), and main-thread cost per frame
// while an auto-solve animates, original game vs the MoonBit slice.
// node bench/browser.mjs <base URL of this repo> <base URL of a 9e69e3a checkout>
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), { chromium } = createRequire(import.meta.url)('playwright');
const [base = 'http://127.0.0.1:4173/', ref = 'http://127.0.0.1:4174/'] = process.argv.slice(2);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const out = { browser: browser.version() };
if (!process.env.FRAMES_ONLY) {
  const page = await browser.newPage();
  await page.goto(`${base}moonbit/bench/browser.html?ref=${encodeURIComponent(ref)}`);
  await page.waitForFunction(() => window.results, null, { timeout: 600000 });
  out.generation = await page.evaluate(() => window.results);
  for (const [k, v] of Object.entries(out.generation.generation)) console.log(k.padEnd(18), `total ${v.total.toFixed(0)} ms  mean ${v.mean.toFixed(1)}  median ${v.median.toFixed(1)}  max ${v.max.toFixed(0)}`);
  console.log('startup', out.generation.startup);
  await page.close();
}
// Frame cost: the same Journey level auto-solved in each page, at the same viewport.
async function frames(url, start, solve, ready, level) {
  const page = await browser.newPage({ viewport: { width: 420, height: 800 }, deviceScaleFactor: 2 });
  // The JS game locks Journey chapters; unlock them all so ?level= is honoured.
  await page.addInitScript(() => localStorage.setItem('monkey-fist-unified-v1', JSON.stringify({ gridGen: 8, chapterSets: { 'J3-MONKEYFIST': 12 } })));
  await page.goto(url); await page.waitForFunction(ready, level, { timeout: 60000 }); await page.waitForTimeout(500);
  await page.evaluate(start);
  const cdp = await page.context().newCDPSession(page); await cdp.send('Performance.enable');
  const metric = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  await page.evaluate(() => { window.__frames = 0; const f = () => { window.__frames++; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  const before = await metric(); const t0 = Date.now();
  await page.evaluate(solve);
  await page.waitForSelector('#result[open]', { timeout: 120000 });
  const after = await metric(), n = await page.evaluate(() => window.__frames), wall = Date.now() - t0;
  const split = await page.evaluate(() => window.mfFrameTimes && window.mfFrameTimes.slice());
  await page.close();
  const per = k => (after[k] - before[k]) * 1000 / n;
  out.levels ||= {}; out.levels[url] = level;
  return { frames: n, wallMs: wall, scriptMsPerFrame: per('ScriptDuration'), taskMsPerFrame: per('TaskDuration'), layoutMsPerFrame: per('LayoutDuration') + per('RecalcStyleDuration'),
    ...(split ? { moonbitMsPerFrame: split.reduce((a, s) => a + s[0], 0) / split.length, canvasGlueMsPerFrame: split.reduce((a, s) => a + s[1], 0) / split.length } : {}) };
}
out.frames = {};
for (const level of [60, 57, 119]) {
  const js = await frames(`${base}index.html?set=J3-MONKEYFIST&level=${level}`, () => {}, () => document.getElementById('autoSolve').click(),
    level => document.getElementById('score').textContent.includes('par') && G.index === level - 1, level);
  const mb = await frames(`${base}moonbit/index.html?level=${level}`, () => {}, () => document.getElementById('autoSolve').click(),
    () => window.mf && /woven/.test(document.getElementById('engine').textContent), level);
  out.frames[level] = { 'JS game': js, 'MoonBit slice': mb };
  console.log(`L${level} frame cost (ms/frame): JS game task ${js.taskMsPerFrame.toFixed(2)} script ${js.scriptMsPerFrame.toFixed(2)} | MoonBit slice task ${mb.taskMsPerFrame.toFixed(2)} script ${mb.scriptMsPerFrame.toFixed(2)}  (${js.frames} / ${mb.frames} frames); slice split: MoonBit ${mb.moonbitMsPerFrame.toFixed(3)} ms + canvas glue ${mb.canvasGlueMsPerFrame.toFixed(3)} ms`);
}
fs.writeFileSync(path.join(here, process.env.FRAMES_ONLY ? 'browser-frames.json' : 'browser-results.json'), JSON.stringify(out, null, 1));
await browser.close();
