const test = require('node:test'), assert = require('node:assert/strict');
const { base, launch, ready } = require('./browser-helpers.cjs');
test('hard custom boards fill their fixed grid and their complete animation queues settle', { timeout: 120000 }, async () => {
  const browser = await launch();
  try {
    for (const [grid, viewport] of [['S',{width:1366,height:768}],['H',{width:390,height:844}]]) {
      const page = await browser.newPage({viewport}), errors=[]; page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>{requestAnimationFrame=()=>0;});
      await page.goto(base + `?set=U3-${grid}-100-100-10-14-1-MS-KNOBS`); await ready(page);
      await page.click('#levels');
      assert.equal(await page.inputValue('#gridWidth'),'10'); assert.equal(await page.inputValue('#gridHeight'),'14');
      assert.equal(await page.locator('#playLabel').textContent(), 'Continue level 1'); await page.click('#play');
      assert.deepEqual(await page.evaluate(()=>[__game.G.level.W,__game.G.level.H,(b=>b.ropes.reduce((n,p)=>n+p.length,0)/(b.W*b.H-b.mirrors.length-b.springs.length))(__game.G.level) >= .8]),[10,14,true]);
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
