// Chromium generation benchmark alone: the first half of moonbit/bench/browser.mjs, for a
// build that has no game_* exports (an Encantis core), so no frame benchmark.
//   node browser-gen.mjs <base URL serving a harness root> <base URL of a 9e69e3a checkout> <out.json>
// moonbit/bench/browser.html times the JS reference, dist/mf.wasm and dist/mf.js, all 120
// Journey levels once each, in that order.
import { createRequire } from 'module'; import fs from 'fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [base, ref, out] = process.argv.slice(2);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
await page.goto(`${base}moonbit/bench/browser.html?ref=${encodeURIComponent(ref)}`);
await page.waitForFunction(() => window.results, null, { timeout: 900000 });
const result = { browser: browser.version(), generation: await page.evaluate(() => window.results) };
for (const [k, v] of Object.entries(result.generation.generation)) console.log(k.padEnd(18), `total ${v.total.toFixed(0)} ms  mean ${v.mean.toFixed(1)}  median ${v.median.toFixed(1)}  max ${v.max.toFixed(0)}`);
console.log('startup', result.generation.startup);
if (out) fs.writeFileSync(out, JSON.stringify(result, null, 1));
await browser.close();
