const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../app.js'), 'utf8');
const weaveSource = source.slice(source.indexOf('function weave(options) {'), source.indexOf('\nlet guideVersion'));
const level = { W: 4, H: 5, ropes: [[{q:0,r:0},{q:1,r:0}]], plan: [0] };
function harness(behavior, generate = () => { throw Error('Unexpected main-thread fallback'); }) {
  const calls = [], local = [], context = {setTimeout,clearTimeout,Date,Array,Error,Promise,
    H:{code:()=> 'J3-MONKEYFIST',generate:options=>{local.push(options);return generate(options);}},
    levelCache:new Map(),pendingGeneration:null,workersWork:true,WORKER:'generator-worker.js?v=21',local};
  context.Worker = class {
    constructor(url) {this.url=url;this.terminated=false;calls.push(this);behavior(this,calls.length,'construct');}
    postMessage(data) {this.data=data;behavior(this,calls.length,'post');}
    terminate() {this.terminated=true;}
  };
  vm.createContext(context);vm.runInContext(weaveSource,context);
  return {context,calls};
}
for(const failure of ['load','message','construct','incomplete']) test(`one transient ${failure} failure retries with a fresh worker and caches only a complete board`,async()=>{
  const {context,calls}=harness((worker,attempt,stage)=>{
    if(attempt===1 && stage==='construct' && failure==='construct')throw Error('Constructor unavailable');
    if(stage!=='post')return;
    setTimeout(()=>{
      if(attempt===1){
        if(failure==='load')worker.onerror?.({message:'Failed import',preventDefault(){}});
        else worker.onmessage?.({data:failure==='incomplete'?{}:{error:'Temporary generator mismatch'}});
      }else worker.onmessage?.({data:{level}});
    },0);
  });
  assert.equal(await context.weave({index:10}),level);
  assert.equal(calls.length,2);assert.match(calls[1].url,/&retry=/);assert.ok(calls.slice(failure === 'construct' ? 1 : 0).every(w=>w.terminated));
  assert.equal(context.pendingGeneration,null);assert.equal(await context.weave({index:10}),level);assert.equal(calls.length,2);
});
test('cancellation during retry delay resolves quietly and never creates the stale retry',async()=>{
  let failed;
  const firstFailed = new Promise(resolve=>failed=resolve);
  const {context,calls}=harness((worker,attempt,stage)=>{if(stage==='post')setTimeout(()=>{worker.onerror?.({message:'Offline',preventDefault(){}});failed();},0)});
  const pending=context.weave({index:10});await firstFailed;context.pendingGeneration();
  assert.equal(await pending,null);await new Promise(resolve=>setTimeout(resolve,220));
  assert.equal(calls.length,1);assert.equal(context.pendingGeneration,null);assert.equal(context.levelCache.size,0);
});
test('deterministic errors stop after two worker attempts and one main-thread attempt without poisoning the cache',async()=>{
  const {context,calls}=harness((worker,attempt,stage)=>{if(stage==='post')setTimeout(()=>worker.onmessage?.({data:{error:'Unsatisfiable seed'}}),0)},()=>{throw Error('Unsatisfiable seed')});
  await assert.rejects(context.weave({index:10}),/Unsatisfiable seed/);
  assert.equal(calls.length,2);assert.equal(context.local.length,1);assert.equal(context.levelCache.size,0);assert.equal(context.pendingGeneration,null);
  assert.equal(context.workersWork,true,'a generator error does not disable workers');
});
for(const failure of ['load','construct']) test(`workers that keep failing to ${failure} fall back to the main thread, and later boards skip them`,async()=>{
  const {context,calls}=harness((worker,attempt,stage)=>{
    if(stage==='construct'&&failure==='construct')throw Error('Worker blocked');
    if(stage==='post'&&failure==='load')setTimeout(()=>worker.onerror?.({message:'Failed import',preventDefault(){}}),0);
  },()=>level);
  assert.equal(await context.weave({index:10}),level);
  assert.equal(calls.length,2);assert.equal(context.local.length,1);assert.equal(context.workersWork,false);
  assert.equal(await context.weave({index:11}),level);
  assert.equal(calls.length,2,'no new worker once workers failed');assert.equal(context.local.length,2);
});
test('service worker falls back to cached assets on 5xx, but preserves 404 and uncached server errors',async()=>{
  const handlers={},cacheHit={cached:true}; let response,hit;
  const context={URL,Response:{error:()=>({networkError:true})},self:{location:new URL('https://example.test/game/sw.js'),addEventListener:(name,fn)=>handlers[name]=fn},
    fetch:async()=>response,caches:{match:async()=>hit,open:async()=>({put(){}})}};
  vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../sw.js'),'utf8'),context);
  const request={method:'GET',url:'https://example.test/game/generator-worker.js?v=13',mode:'same-origin'};
  async function run(status,cached){response={ok:false,status};hit=cached;let promise;handlers.fetch({request,respondWith:p=>promise=p});return promise;}
  assert.equal(await run(503,cacheHit),cacheHit);
  assert.equal((await run(503,undefined)).status,503);
  assert.equal((await run(404,cacheHit)).status,404);
});
test('the real level 11 recovers from its first worker asset request failing',{timeout:60000},async()=>{
  const {base,launch,ready}=require('./browser-helpers.cjs'),browser=await launch();
  try{
    const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{localStorage.setItem('monkey-fist-unified-v1',JSON.stringify({gen:1,gridGen:3,chapterSets:{'J3-MONKEYFIST':2}}));});
    let requests=0;
    await context.route('**/generator-worker.js*',route=>{requests++;return requests===1?route.abort('failed'):route.continue();});
    await page.goto(base+'?set=J3-MONKEYFIST&level=11');await ready(page);
    assert.ok(requests>=2);assert.equal(await page.evaluate(()=>__game.G.index),10);
    assert.equal(await page.evaluate(()=>MFGame.replay(__game.G.level,__game.G.plan).solved),true);
    assert.deepEqual(errors,[]);
  }finally{await browser.close()}
});
