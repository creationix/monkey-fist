const test = require('node:test'), assert = require('node:assert/strict');
const { createSoundPlayer } = require('../sounds');
const { base, launch, ready, playFixture } = require('./browser-helpers.cjs');
const { FLIP } = require('./fixtures.cjs');

test('accepted-tap ticks are brief, low, quiet and obey mute and their own duplicate limit', () => {
  const sources = [], gains = [], parameter = () => ({ events: [], setValueAtTime(value, at) { this.events.push([value, at]); }, exponentialRampToValueAtTime(value, at) { this.events.push([value, at]); } });
  const context = { currentTime: 0, state: 'running', createGain() { const gain = { gain: parameter(), connect() {}, disconnect() {} }; gains.push(gain); return gain; },
    createOscillator() { const source = { frequency: parameter(), connect() {}, disconnect() {}, start(at) { this.started = at; }, stop(at) { this.stopped = at; } }; sources.push(source); return source; } };
  const player = createSoundPlayer(context, {});
  assert.equal(player.activate(), true); assert.equal(sources.length, 2);
  assert.ok(sources.every(source => source.type === 'sine' && source.frequency.events[0][0] <= 360));
  assert.ok(sources.every(source => source.stopped - source.started < .09));
  const tickGain = Math.max(...gains.slice(1).flatMap(gain => gain.gain.events.map(event => event[0])));
  assert.ok(tickGain <= .04);
  const gainsBeforeClick = gains.length; player.click();
  const clickGain = Math.max(...gains.slice(gainsBeforeClick).flatMap(gain => gain.gain.events.map(event => event[0])));
  assert.ok(tickGain < clickGain / 3, 'rope acceptance is subtler than a normal menu click');
  assert.equal(player.activate(), false); context.currentTime = .03; assert.equal(player.activate(), true);
  player.setEnabled(false); assert.equal(player.state.voices, 0);
  context.currentTime = .1; assert.equal(player.activate(), false); assert.equal(sources.length, 5);
});

test('queued acceptance flashes the visible rope without repainting the resting board, then expires', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
    await page.addInitScript(() => { requestAnimationFrame = () => 0; });
    await page.goto(base); await ready(page);
    const result = await page.evaluate(() => {
      const p = (q,r) => ({q,r}); cancelGuide(); cancelFeatureCheck();
      const paths = [[p(2,3),p(3,3),p(4,3)],[p(3,5),p(3,4)],[p(5,0),p(6,0)],[p(7,9),p(7,8)],[p(6,7),p(7,7)]];
      Object.assign(G,{ level:{grid:'square',W:12,H:12,mirrors:[],springs:[],locks:[],par:5},paths,plan:[0,1,2,4,3],moves:new Map(),activations:new Map(),history:[],auto:false,ended:false,lost:false,loading:false,hint:-1,selected:-1,bump:null,camera:{zoom:1,x:0,y:0}});
      G.level.ropes=G.paths;resetFeatures(); resize();
      let ticks=0,swishes=0; sfx.activate=()=>ticks++;sfx.slide=()=>swishes++;
      for(const name of ['reflect','spring','pop','thud','win'])sfx[name]=()=>{};
      tap(0);tap(1);tap(2);
      const immediate={ticks,swishes,flashes:[...G.activations.keys()],waiting:G.moves.get(1).waiting};
      const flashes=new Map(G.activations);G.activations.clear();
      let paints=0;const original=drawRestingBoard;drawRestingBoard=(...args)=>{paints++;return original(...args);};
      draw(0);const initialPaints=paints,at=screen(p(3,4.7));
      const pixel=()=>Array.from(mainContext.getImageData(Math.round(at.x),Math.round(at.y),1,1).data);
      const baseline=pixel();G.activations=flashes;draw(0);const flashed=pixel(),flashPaints=paints;
      update(.2);draw(0);const expired=pixel(),left=G.activations.size,expiryPaints=paints;
      drawRestingBoard=original;cancelGuide();
      return {immediate,baseline,flashed,expired,left,initialPaints,flashPaints,expiryPaints};
    });
    assert.deepEqual(result.immediate,{ticks:3,swishes:0,flashes:[0,1,2],waiting:true});
    assert.ok(result.flashed.slice(0,3).reduce((a,b)=>a+b)>result.baseline.slice(0,3).reduce((a,b)=>a+b),'the accepted waiting rope brightens immediately');
    assert.deepEqual(result.expired,result.baseline,'the brief overlay leaves no permanent highlight');
    assert.equal(result.left,0);assert.equal(result.flashPaints,result.initialPaints);assert.equal(result.expiryPaints,result.initialPaints,'flash animation reuses the cached board');
  } finally { await browser.close(); }
});

test('queued spring taps tick and flash the current flip; each move swishes only once after its own start', { timeout: 60000 }, async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({viewport:{width:1100,height:900}});await page.addInitScript(()=>{requestAnimationFrame=()=>0;});
    await page.goto(base);await ready(page);await playFixture(page,FLIP);
    const result=await page.evaluate(()=>{
      let ticks=0,swishes=0;sfx.activate=()=>ticks++;sfx.slide=()=>swishes++;
      for(const name of ['reflect','spring','pop','thud','win'])sfx[name]=()=>{};
      tap(1);tap(0);const root=G.moves.get(0);while(!root.impacted)update(.001);update(root.hold*.25);
      const before=swishes;tap(0);const queued=root.queued,flash=G.activations.get(0);
      const expected=springDrawing(0,springFlip(root)),after=ropeDrawing(0,true),record=[];
      const stroke=MFRopeArt.stroke;MFRopeArt.stroke=(...args)=>{record.push({points:args[1],head:args[7]});};
      const other=G.activations.get(1);G.activations.delete(1);drawActivations();MFRopeArt.stroke=stroke;if(other)G.activations.set(1,other);
      const actual=record.at(-1),same=JSON.stringify(actual.points)===JSON.stringify(expected.points),different=JSON.stringify(actual.points)!==JSON.stringify(after.points);
      const atQueue=swishes;let frames=0;while(!queued.swished&&frames++<10000)update(.001);
      const atStart=swishes;for(let n=0;n<100;n++)update(.001);
      const atLater=swishes;undo();const cleared=G.activations.size===0&&!G.moving;
      return {ticks,before,atQueue,atStart,atLater,flash,same,different,cleared};
    });
    assert.equal(result.ticks,3);assert.equal(result.before,2);assert.equal(result.atQueue,2);assert.equal(result.atStart,3);assert.equal(result.atLater,3);
    assert.ok(result.flash>0);assert.equal(result.same,true);assert.equal(result.different,true,'feedback must not jump to the queued final pose');assert.equal(result.cleared,true);
    await page.click('#restart');await ready(page);await page.evaluate(()=>{tap(1);});assert.equal(await page.evaluate(()=>G.activations.size),1);
    await page.click('#restart');await ready(page);assert.equal(await page.evaluate(()=>G.activations.size),0);
  }finally{await browser.close();}
});

test('blocked taps play a light error sound and no notice, while automatic releases have swishes without synthetic user ticks', { timeout:60000 }, async()=>{
  const browser=await launch();try{
    const page=await browser.newPage();await page.addInitScript(()=>{requestAnimationFrame=()=>0;});await page.goto(base);await ready(page);
    const result=await page.evaluate(()=>{
      const p=(q,r)=>({q,r});cancelGuide();cancelFeatureCheck();
      Object.assign(G,{level:{grid:'square',W:8,H:6,mirrors:[],springs:[],locks:[],par:1},paths:[[p(0,1),p(1,1)],[p(2,1),p(3,1)],[p(0,3),p(1,3)]],plan:[1,0,2],moves:new Map(),activations:new Map(),history:[],auto:false,ended:false,lost:false,loading:false,hint:-1,selected:-1,camera:{zoom:1,x:0,y:0}});G.level.ropes=G.paths;resetFeatures();resize();
      let ticks=0,swishes=0,errors=0;sfx.activate=()=>ticks++;sfx.slide=()=>swishes++;sfx.blocked=()=>errors++;sfx.win=sfx.pop=()=>{};
      tap(0);const blocked={ticks,swishes,errors,flashes:G.activations.size,notice:$('notice').classList.contains('show')};tap(1);
      const accepted={ticks,swishes,flashes:[...G.activations.keys()]};for(let n=0;n<3000&&!G.ended;n++)update(.02);
      return {blocked,accepted,ticks,swishes,ended:G.ended};
    });
    assert.deepEqual(result.blocked,{ticks:0,swishes:0,errors:1,flashes:0,notice:false});assert.deepEqual(result.accepted,{ticks:1,swishes:0,flashes:[1]});
    assert.equal(result.ticks,1);assert.equal(result.swishes,3);assert.equal(result.ended,true);
  }finally{await browser.close();}
});
