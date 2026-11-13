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
test('a GRID_VERSION 2 save archives rewoven Journey and moderate custom scores but keeps chapter access',{timeout:60000},async()=>{
 const browser=await launch();try{const page=await browser.newPage();await page.addInitScript(()=>{
  const key='monkey-fist-unified-v1';if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({gen:1,gridGen:2,chapterSets:{'J3-MONKEYFIST':5},sets:{
   'J3-MONKEYFIST':{0:{taps:2,stars:3},9:{taps:2,stars:3},30:{taps:20,stars:3}},
   'U3-S-1-100-10-14-100-N-OLD':{0:{taps:5,stars:3},99:{taps:30,stars:3}}}}));
 });await page.goto(base+'?set=J3-MONKEYFIST');await ready(page);
 const state=await page.evaluate(()=>__game.save);
 // Every introduction is now built from a derived seed, so none inherits an old score.
 assert.equal(state.sets['J3-MONKEYFIST'],undefined);assert.equal(state.sets['U3-S-1-100-10-14-100-N-OLD'],undefined);
 assert.deepEqual(Object.keys(state.archives['grid-gen-2']['J3-MONKEYFIST']).sort(),['0','30','9']);
 assert.deepEqual(Object.keys(state.archives['grid-gen-2']['U3-S-1-100-10-14-100-N-OLD']).sort(),['0','99']);
 assert.equal(state.chapterSets['J3-MONKEYFIST'],5);
 }finally{await browser.close()}
});

async function seedSave(page, data) {
  await page.addInitScript(data => {
    const key = 'monkey-fist-unified-v1';
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data));
  }, data);
}
// The builder records previousIndex for any board whose layout survived from the
// previous published campaign. Serve metadata with known values to test the mapping.
function withPrevious(assignments) {
  const journey = require('../grid-journey').map(level => { const { previousIndex, ...rest } = level; return rest; });
  for (const [index,previous] of Object.entries(assignments)) journey[index].previousIndex = previous;
  return journey;
}
async function serve(browser, journey) {
  const context = await browser.newContext({ serviceWorkers:'block' });
  await context.route('**/grid-journey.js*', route => route.fulfill({ contentType:'text/javascript',body:'globalThis.MFGridJourney='+JSON.stringify(journey)+';' }));
  return context.newPage();
}

test('untagged scores from the previous GRID_VERSION carry only when the published previous-layout map matches', { timeout: 60000 }, async () => {
  const journey = require('../grid-journey');
  const scores = Object.fromEntries(Array.from({length:120},(_,index)=>[index,{taps:index+1,stars:1+index%3}]));
  const expected = Object.fromEntries(journey.flatMap((level,index)=>Number.isInteger(level.previousIndex)?[[index,scores[level.previousIndex]]]:[]));
  const unchanged = new Set(journey.flatMap(level=>Number.isInteger(level.previousIndex)?[level.previousIndex]:[]));
  const changed = Object.fromEntries(Object.entries(scores).filter(([index])=>!unchanged.has(Number(index))));
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await seedSave(page,{ gen:1,gridGen:require('../game-engine').GRID_VERSION-1,chapters:2,chapterSets:{'J3-MONKEYFIST':7},sets:{'J3-MONKEYFIST':scores},sound:'off',music:false,moveSpeed:'fast',oled:true });
    await page.goto(base+'?set=J3-MONKEYFIST'); await ready(page);
    const state = await page.evaluate(() => __game.save);
    assert.equal(state.gridGen,require('../game-engine').GRID_VERSION);
    assert.equal(state.chapterSets['J3-MONKEYFIST'],7);
    assert.deepEqual(state.sets['J3-MONKEYFIST']||{},expected);
    assert.deepEqual(state.archives?.['grid-gen-'+(require('../game-engine').GRID_VERSION-1)]?.['J3-MONKEYFIST']||{},changed);
    assert.equal(state.moveSpeed,'fast'); assert.equal(state.oled,true); assert.equal(state.sound,'off');
    await page.click('#levels'); assert.equal(await page.locator('#grid button:enabled').count(),70);
    await page.reload(); await ready(page);
    assert.deepEqual(await page.evaluate(() => __game.save.sets),state.sets);
    assert.deepEqual(await page.evaluate(() => __game.save.archives),state.archives);
  } finally { await browser.close(); }
});

test('untagged scores follow a known previous-index map and the rest are archived', { timeout: 60000 }, async () => {
  const journey = withPrevious({ 0:17, 7:3, 44:90 });
  const scores = { 17:{ taps:3,stars:3 }, 3:{ taps:4,stars:2 }, 90:{ taps:30,stars:1 }, 11:{ taps:99,stars:2 } };
  const browser = await launch();
  try {
    const page = await serve(browser, journey);
    await seedSave(page,{ gen:1,gridGen:require('../game-engine').GRID_VERSION-1,chapters:2,chapterSets:{'J3-MONKEYFIST':7},sets:{'J3-MONKEYFIST':scores},sound:'off',music:false });
    await page.goto(base+'?set=J3-MONKEYFIST'); await ready(page);
    const state = await page.evaluate(() => __game.save);
    assert.deepEqual(state.sets['J3-MONKEYFIST'],{ 0:scores[17],7:scores[3],44:scores[90] });
    assert.deepEqual(state.archives['grid-gen-'+(require('../game-engine').GRID_VERSION-1)]['J3-MONKEYFIST'],{ 11:scores[11] },'changed maps do not inherit a previous level number’s stars');
  } finally { await browser.close(); }
});

test('untagged scores from before the previous published Journey are archived, not remapped', { timeout: 60000 }, async () => {
  const journey = withPrevious({ 0:17 }), scores = { 17:{ taps:3,stars:3 } };
  const browser = await launch();
  try {
    const page = await serve(browser, journey);
    await seedSave(page,{ gen:1,gridGen:4,chapterSets:{'J3-MONKEYFIST':2},sets:{'J3-MONKEYFIST':scores} });
    await page.goto(base+'?set=J3-MONKEYFIST'); await ready(page);
    const state = await page.evaluate(() => __game.save);
    assert.equal(state.sets['J3-MONKEYFIST'],undefined,'previousIndex names the previous GRID_VERSION positions, not older ones');
    assert.deepEqual(state.archives['grid-gen-4']['J3-MONKEYFIST'],scores);
  } finally { await browser.close(); }
});

test('previousIndex migration follows a metadata reorder instead of retaining old slot numbers', { timeout: 60000 }, async () => {
  const journey = require('../grid-journey'), reordered = journey.map(level=>{ const copy={...level}; delete copy.previousIndex; return copy; });
  reordered[0] = {...reordered[1],previousIndex:97};
  reordered[1] = {...journey[0],previousIndex:7};
  const first = { taps:4,stars:2 }, second = { taps:5,stars:1 };
  const browser = await launch();
  try {
    const page = await serve(browser, reordered);
    await seedSave(page,{ gen:1,gridGen:require('../game-engine').GRID_VERSION-1,chapterSets:{'J3-MONKEYFIST':3},sets:{'J3-MONKEYFIST':{ 7:first,97:second }} });
    await page.goto(base+'?set=J3-MONKEYFIST'); await ready(page);
    const state = await page.evaluate(() => __game.save);
    assert.deepEqual(state.sets['J3-MONKEYFIST'][0],second);
    assert.deepEqual(state.sets['J3-MONKEYFIST'][1],first);
    assert.equal(state.chapterSets['J3-MONKEYFIST'],3);
    assert.equal(await page.evaluate(() => __game.G.level.layoutKey),reordered[0].layoutKey,'the remapped score belongs to the actual reordered board');
  } finally { await browser.close(); }
});

test('tagged Journey scores follow layout identity even when their old index names a different map', { timeout: 60000 }, async () => {
  const journey = require('../grid-journey'), destination = 0, level = journey[destination];
  assert.equal(typeof level.layoutKey,'string');
  const earned = { taps:5,stars:2,layoutKey:level.layoutKey }, obsolete = { taps:8,stars:3,layoutKey:'retired-layout-key' };
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await seedSave(page,{ gen:1,gridGen:3,chapterSets:{'J3-MONKEYFIST':6},sets:{'J3-MONKEYFIST':{ 119:earned,0:obsolete }} });
    await page.goto(base+'?set=J3-MONKEYFIST'); await ready(page);
    const state = await page.evaluate(() => __game.save);
    assert.deepEqual(state.sets['J3-MONKEYFIST'],{ [destination]:earned });
    assert.deepEqual(state.archives['grid-gen-3']['J3-MONKEYFIST'][0],obsolete);
    assert.equal(state.chapterSets['J3-MONKEYFIST'],6);
  } finally { await browser.close(); }
});

test('custom scores from grid 3 to 5 keep colossal and legacy sets while archiving rewoven moderate layouts', { timeout: 60000 }, async () => {
  for (const previous of [3, 4, 5]) {
    const mixed = 'U3-S-1-100-10-14-100-N-MIGRATE', colossal = 'U3-H-80-100-32-40-20-C-COLOSSAL', hard = 'U3-H-80-100-12-16-10-MS-KEEP';
    const legacy = 'U1-H-1-100-20-N-LEGACY', archive = { keep:'earlier migration' };
    const sets = {
      [mixed]:{ 0:{taps:3,stars:3},58:{taps:20,stars:2},99:{taps:30,stars:3} },
      [colossal]:{ 0:{taps:80,stars:1},19:{taps:100,stars:2} },
      [hard]:{ 0:{taps:18,stars:3,layoutKey:'custom-layout'} },
      [legacy]:{ 3:{taps:7,stars:3} }, 'J1-MONKEYFIST':{ 3:{taps:7,stars:3} },
    };
    const browser = await launch();
    try {
      const page = await browser.newPage();
      await seedSave(page,{ gen:1,gridGen:previous,chapterSets:{'J3-MONKEYFIST':4},sets,archives:{'grid-gen-1':archive} });
      await page.goto(base+'?set=J3-MONKEYFIST'); await ready(page);
      const state = await page.evaluate(() => __game.save);
      assert.equal(state.sets[mixed],undefined); assert.equal(state.sets[hard],undefined);
      assert.deepEqual(state.sets[colossal],sets[colossal]); assert.deepEqual(state.sets[legacy],sets[legacy]);
      assert.deepEqual(state.sets['J1-MONKEYFIST'],sets['J1-MONKEYFIST']);
      assert.deepEqual(state.archives['grid-gen-'+previous][mixed],sets[mixed]);
      assert.deepEqual(state.archives['grid-gen-'+previous][hard],sets[hard]);
      assert.deepEqual(state.archives['grid-gen-1'],archive);
      assert.equal(state.chapterSets['J3-MONKEYFIST'],4);
    } finally { await browser.close(); }
  }
});
