const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../game-engine');
test('colossal sizes are explicit and remain out of the default settings',()=>{
 for(const flags of ['C','MC','SC','MSC']){
  const code=`U3-H-40-80-48-32-1-${flags}-GIANT`,o=G.parseCode(code);
  assert.equal(o.colossal,true);assert.equal(G.code(o),code);
 }
 assert.equal(G.parseCode('U3-H-1-100-48-48-1-N-GIANT'),null);
 assert.equal(G.parseCode('U3-H-1-100-49-48-1-C-GIANT'),null);
 assert.deepEqual([G.normalize({revision:3,width:48,height:48}).width,G.normalize({revision:3,width:48,height:48}).height],[24,24]);
 const big=G.normalize({revision:3,colossal:true,width:99,height:99});assert.deepEqual([big.width,big.height],[48,48]);
 assert.ok(!G.DEFAULT.colossal);
});
test('explicit colossal square and Hex grids remain dense and solvable without changing their size',{timeout:120000},()=>{
 for(const grid of ['square','hex']){
  const b=G.generate({revision:3,colossal:true,grid,width:32,height:32,min:80,max:80,count:1,seed:'COLOSSAL',mirrors:true,springs:true});
  assert.deepEqual([b.W,b.H],[32,32]);assert.ok(b.coverage>=.8);assert.ok(b.par*3>=b.ropes.length);
  const r=G.replay(b,b.plan);assert.ok(r.solved);assert.equal(r.taps,b.par);
 }
});
