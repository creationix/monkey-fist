const test = require('node:test'), assert = require('node:assert/strict');
const { base, launch, ready } = require('./browser-helpers.cjs');
test('custom size controls generate fixed-count difficult maps and their complete animation queues settle', { timeout: 120000 }, async () => {
  const browser = await launch();
  try {
    for (const [grid, viewport] of [['S',{width:1366,height:768}],['H',{width:390,height:844}]]) {
      const page = await browser.newPage({viewport}), errors=[]; page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{requestAnimationFrame=()=>0;});
      await page.goto(base + `?set=U2-${grid}-100-100-10-10-1-MS-KNOBS`); await ready(page);
      await page.click('#levels');
      assert.equal(await page.inputValue('#minSize'),'10'); assert.equal(await page.inputValue('#maxSize'),'10');
      await page.click('#closeLevels');
      assert.deepEqual(await page.evaluate(()=>[__game.G.paths.length,__game.G.level.par>=24]),[10,true]);
      await page.click('#autoSolve');
      assert.equal(await page.evaluate(()=>__game.G.paths.every(p=>!p)),true);
      assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('auto-solving')),true);
      await page.evaluate(()=>{for(let i=0;i<5000&&!__game.G.ended;i++)__game.update(.05);__game.draw(0);});
      assert.equal(await page.evaluate(()=>__game.G.ended),true);
      assert.equal(await page.locator('#resultText').textContent(),'Auto-solved · 0 stars');
      assert.deepEqual(errors,[]); await page.close();
    }
  } finally { await browser.close(); }
});
