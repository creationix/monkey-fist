const test=require('node:test'),assert=require('node:assert/strict');
const {base,launch,ready}=require('./browser-helpers.cjs');
test('colossal mode extends sliders only after opting in and survives a shared link',{timeout:60000},async()=>{
 const browser=await launch();try{const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
 await page.goto(base+'?set=U3-S-1-100-10-14-1-N-SIZES');await ready(page);await page.click('#levels');
 assert.equal(await page.isChecked('#colossal'),false);assert.equal(await page.getAttribute('#gridWidth','max'),'24');
 await page.check('#colossal');assert.equal(await page.getAttribute('#gridWidth','max'),'48');assert.ok(await page.isVisible('#colossalHint'));
 await page.locator('#gridWidth').evaluate(e=>{e.value=32;e.dispatchEvent(new Event('input',{bubbles:true}))});
 await page.locator('#gridHeight').evaluate(e=>{e.value=32;e.dispatchEvent(new Event('input',{bubbles:true}))});
 await page.click('[data-level="1"]');await ready(page);assert.deepEqual(await page.evaluate(()=>[__game.G.level.W,__game.G.level.H]),[32,32]);assert.match(await page.evaluate(()=>location.search),/-C-/);
 await page.reload();await ready(page);assert.ok(await page.evaluate(()=>__game.options.colossal));
 await page.click('#levels');await page.uncheck('#colossal');assert.equal(await page.getAttribute('#gridWidth','max'),'24');assert.equal(await page.inputValue('#gridWidth'),'24');assert.equal(await page.inputValue('#gridHeight'),'24');
 }finally{await browser.close()}
});
