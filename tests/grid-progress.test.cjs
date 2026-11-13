const test = require('node:test'), assert = require('node:assert/strict');
const { base, launch, ready } = require('./browser-helpers.cjs');
test('changed woven boards archive only old grid scores and retain chapter access and new progress', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      const key = 'monkey-fist-unified-v1';
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({gen:1,gridGen:1,chapters:3,
        chapterSets:{'J3-MONKEYFIST':4},sets:{'J3-MONKEYFIST':{0:{taps:1,stars:3}},'U3-S-1-1-4-5-1-N-OLD':{0:{taps:1,stars:3}},'J1-MONKEYFIST':{2:{taps:3,stars:3}}},sound:'off',music:false}));
    });
    await page.goto(base + '?set=J3-MONKEYFIST'); await ready(page);
    const state = await page.evaluate(() => ({gen:__game.save.gridGen,sets:__game.save.sets,archives:__game.save.archives,chapters:__game.save.chapterSets}));
    assert.equal(state.gen,require('../game-engine').GRID_VERSION);
    assert.ok(!state.sets['J3-MONKEYFIST']); assert.ok(!state.sets['U3-S-1-1-4-5-1-N-OLD']);
    assert.deepEqual(state.sets['J1-MONKEYFIST'],{2:{taps:3,stars:3}});
    assert.equal(state.archives['grid-gen-1']['J3-MONKEYFIST'][0].stars,3);
    assert.equal(state.chapters['J3-MONKEYFIST'],4);
    await page.evaluate(() => { __game.save.sets['J3-MONKEYFIST']={0:{taps:2,stars:3}};persist(); });
    await page.reload(); await ready(page);
    assert.deepEqual(await page.evaluate(() => __game.save.sets['J3-MONKEYFIST']),{0:{taps:2,stars:3}});
    assert.equal(await page.evaluate(() => __game.save.chapterSets['J3-MONKEYFIST']),4);
  } finally { await browser.close(); }
});
test('deeper-dependency revision keeps the unchanged introduction and gentle custom results',{timeout:60000},async()=>{
 const browser=await launch();try{const page=await browser.newPage();await page.addInitScript(()=>{
  const key='monkey-fist-unified-v1';if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({gen:1,gridGen:2,chapterSets:{'J3-MONKEYFIST':5},sets:{
   'J3-MONKEYFIST':{0:{taps:2,stars:3},9:{taps:2,stars:3},30:{taps:20,stars:3}},
   'U3-S-1-100-10-14-100-N-OLD':{0:{taps:5,stars:3},99:{taps:30,stars:3}}}}));
 });await page.goto(base+'?set=J3-MONKEYFIST');await ready(page);
 const state=await page.evaluate(()=>__game.save);
 const journey=require('../grid-journey'), positions=[0,9].map(source=>journey.findIndex(level=>level.introSource===source));
 assert.deepEqual(Object.keys(state.sets['J3-MONKEYFIST']).map(Number).sort((a,b)=>a-b),positions.sort((a,b)=>a-b));
 for(const source of[0,9])assert.deepEqual(state.sets['J3-MONKEYFIST'][journey.findIndex(level=>level.introSource===source)],{taps:2,stars:3});assert.deepEqual(Object.keys(state.sets['U3-S-1-100-10-14-100-N-OLD']),['0']);
 assert.equal(state.archives['grid-gen-2']['J3-MONKEYFIST'][30].stars,3);assert.equal(state.chapterSets['J3-MONKEYFIST'],5);
 }finally{await browser.close()}
});
