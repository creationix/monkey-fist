const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {argumentsOf,validate,run}=require('../scripts/benchmark-puzzles.cjs');
const p=(q,r)=>({q,r});
const stopper=()=>({grid:'square',W:8,H:6,ropes:[[[5,1],[4,1],[3,1],[2,1],[1,1],[0,1],[0,2],[1,2]],[[4,2],[4,3]],[[6,2],[6,3],[6,4],[5,4],[5,3]]].map(r=>r.map(([q,r])=>p(q,r))),mirrors:[],springs:[],locks:[],plan:[0,1,2,0],par:4});

test('imported board validation rejects overlapping paths and invalid certificates',()=>{
 const b=stopper(),checked=validate(b);assert.equal(checked.certificate.manualTaps,3);assert.equal(checked.certificate.nonExitMoves,1);
 const bad=stopper();bad.ropes[1][0]=bad.ropes[0][0];assert.throws(()=>validate(bad),/overlap/);
 assert.throws(()=>validate({...b,plan:[1,0]}),/certificate/);
 assert.throws(()=>validate({...b,locks:[{}]}),/Locks/);
});
test('CLI report evaluates imported boards consistently and keeps declared par separate from proof',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'monkey-benchmark-'));
 try{
  const filename=path.join(dir,'boards.json');fs.writeFileSync(filename,JSON.stringify([{id:'stopper',board:stopper()}]));
  const args=argumentsOf(['--boards',filename,'--nodes','1000','--trials','16','--steps','30']);
  const a=await run(args),b=await run(args),r=a.results[0];
  assert.equal(r.status,'evaluated');assert.equal(r.declaredPar,4);assert.equal(r.certificate.manualTaps,3);
  assert.equal(r.manualTaps.upperBound,3);assert.equal(r.nonExitMoves.upperBound,1);assert.equal(r.nonExitMoves.exact,true);
  assert.deepEqual(r.players,b.results[0].players);assert.equal(r.players.provenOptimalTaps,3);
  for(const policy of Object.values(r.players.policies))assert.equal(policy.wins+policy.losses+policy.censored,16);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('generator adapter receives the common rules and specification, including custom cases',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'monkey-adapter-'));
 try{
  const filename=path.join(dir,'generator.cjs'),cases=path.join(dir,'cases.json');
  fs.writeFileSync(filename,"exports.generate=(o,{rules,spec})=>{if(typeof rules.tap!=='function'||spec.W!==o.width)throw Error('missing context');return {grid:o.grid,W:o.width,H:o.height,ropes:[[{q:0,r:0},{q:1,r:0}]],plan:[0]};};");
  fs.writeFileSync(cases,JSON.stringify([{id:'adapter',options:{revision:3,grid:'square',width:4,height:5,min:1,max:1,count:1,seed:'ADAPTER'}}]));
  const report=await run(argumentsOf(['--generator',filename,'--cases',cases,'--nodes','10','--trials','4'])),r=report.results[0];
  assert.equal(r.status,'evaluated');assert.equal(r.quality.initiallyAllFree,true);assert.equal(r.manualTaps.upperBound,1);assert.equal(r.players.policies.exitFirst.meanManualTaps,1);assert.equal(r.players.policies.exitFirst.meanTapRegret,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
