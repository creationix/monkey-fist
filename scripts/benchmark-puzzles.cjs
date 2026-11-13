#!/usr/bin/env node
// Offline comparison only. Uses the production movement rules for every source.
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto'), { performance } = require('node:perf_hooks');
const ROOT = path.join(__dirname,'..'), G = require('../game-engine.js');
const { evaluateSearch } = require('./lib/puzzle-search.cjs');
const { evaluatePlayers } = require('./lib/puzzle-players.cjs');
const { loadGenerator } = require('./lib/revision-generator.cjs');
const key = p => p.q+','+p.r;
const HELP = `Usage: node scripts/benchmark-puzzles.cjs [options]
  --refs REF,REF       Git revisions to generate with (default: working tree)
  --generator FILE     CommonJS module exporting generate(options, {rules, spec})
  --boards FILE        JSON array of {id, board}, or raw board objects
  --cases FILE         JSON array of {id, options}; default scripts/benchmark-cases.json
  --nodes N            Expanded states per search objective (default 2000)
  --trials N           Seeded trials per player policy (default 32)
  --steps N            Maximum manual moves per trial (default 200)
  --max-area N         Skip evaluation above this cell count (default 192)
  --seed TEXT          Player-simulation seed (default MONKEY-BENCH-1)
  --out FILE           Write full JSON report (otherwise stdout)
  --help               Show help
Use exactly one source selector: --refs, --generator, or --boards.
Searches distinguish proven minima, certified upper bounds, and unknown results.
`;
function argumentsOf(argv) {
  const out = { nodes:2000,trials:32,steps:200,'max-area':192,seed:'MONKEY-BENCH-1' };
  const names = new Set(['refs','generator','boards','cases','nodes','trials','steps','max-area','seed','out']);
  for(let i=0;i<argv.length;i++) {
    const arg = argv[i]; if(arg === '--help') return {help:true};
    const name = arg.slice(2); if(!arg.startsWith('--') || !names.has(name) || argv[i+1] == null || argv[i+1].startsWith('--')) throw Error('Unknown or incomplete option: '+arg);
    out[name] = argv[++i];
  }
  if(['refs','generator','boards'].filter(k=>out[k]).length > 1) throw Error('Choose one of --refs, --generator, or --boards');
  for(const name of ['nodes','trials','steps','max-area']) { out[name] = Number(out[name]); if(!Number.isSafeInteger(out[name]) || out[name] < (name==='nodes'?0:1)) throw Error('--'+name+' must be a '+(name==='nodes'?'nonnegative':'positive')+' integer'); }
  return out;
}
function validate(board) {
  if(!board || !['square','hex'].includes(board.grid) || !Number.isInteger(board.W) || !Number.isInteger(board.H) || board.W<1 || board.H<1 || !Array.isArray(board.ropes)) throw Error('Board needs grid, positive integer W/H, and rope paths');
  board = {...board,mirrors:board.mirrors||[],springs:board.springs||[],locks:board.locks||[]};
  if(board.locks.length) throw Error('Locks are outside the shared benchmark rules');
  const cells = G.cells(board), inside = new Set(cells.map(key)), occupied = new Set(), features = new Set();
  const directions = board.grid==='hex'?G.DIRS:[[1,0],[0,1],[-1,0],[0,-1]];
  for(const rope of board.ropes) {
    if(!Array.isArray(rope) || rope.length<2) throw Error('Every rope must have at least two cells');
    for(let i=0;i<rope.length;i++) {
      const p=rope[i]; if(!Number.isInteger(p?.q)||!Number.isInteger(p?.r)||!inside.has(key(p))||occupied.has(key(p))) throw Error('Rope cells must be inside the grid and cannot overlap');
      if(i && !directions.some(([dq,dr])=>p.q-rope[i-1].q===dq&&p.r-rope[i-1].r===dr)) throw Error('Rope path contains nonadjacent cells');
      occupied.add(key(p));
    }
  }
  for(const feature of [...board.springs,...board.mirrors.map(m=>m.cell)]) {
    if(!Number.isInteger(feature?.q)||!Number.isInteger(feature?.r)||!inside.has(key(feature))||features.has(key(feature))) throw Error('Feature cells must be distinct and inside the grid');
    features.add(key(feature));
  }
  for(const mirror of board.mirrors) if(board.grid==='hex'?!Number.isInteger(mirror.axis)||mirror.axis<0||mirror.axis>2:!['/','\\'].includes(mirror.slope)) throw Error('Invalid mirror orientation');
  let certificate = null;
  if(board.plan != null) {
    if(!Array.isArray(board.plan) || board.plan.some(i=>!Number.isInteger(i)||i<0||i>=board.ropes.length)) throw Error('Invalid certificate rope index');
    const replayed=G.replay(board,board.plan); if(!replayed.solved) throw Error('Generator certificate does not solve under shared rules');
    certificate={manualTaps:replayed.taps,nonExitMoves:replayed.events.filter(e=>e!=='exit').length};
    // Check each resting configuration independently of the solver's assertions.
    let paths=board.ropes;
    for(const id of board.plan) {
      const move=G.tap(board,paths,id), seen=new Set(); if(!move) throw Error('Invalid certificate move');
      for(const rope of move.paths.filter(Boolean)) for(const p of rope) { if(!inside.has(key(p))||seen.has(key(p))) throw Error('Certificate leaves overlapping or out-of-grid ropes'); seen.add(key(p)); }
      paths=move.paths;
    }
  }
  const quarters = [0,1,2,3].map(zone=>{
    const region=cells.filter(p=>Number(p.q+(board.grid==='hex'?Math.floor(p.r/2):0)>=board.W/2)+2*Number(p.r>=board.H/2)===zone);
    return region.length?region.filter(p=>occupied.has(key(p))).length/region.length:null;
  });
  return {board,certificate,quality:{grid:board.grid,W:board.W,H:board.H,ropes:board.ropes.length,coverage:occupied.size/cells.length,quadrantCoverage:quarters,
    mirrors:board.mirrors.length,springs:board.springs.length,initiallyAllFree:board.ropes.length>0&&G.allFree(board,board.ropes),moderate:Math.min(board.W,board.H)<=12&&Math.max(board.W,board.H)<=16}};
}
function digest(files) {
  const hash=createHash('sha256'); for(const filename of files) hash.update(filename+'\0').update(fs.readFileSync(path.join(ROOT,filename))); return hash.digest('hex');
}
function gitHead() { return execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(); }
function sources(args) {
  if(args.refs) return args.refs.split(',').map(ref=>{ const loaded=loadGenerator(ref,{cwd:ROOT}); return {id:ref,ref:loaded.ref,engine:loaded.engine,generate:o=>loaded.generate(o)}; });
  if(args.generator) {
    const filename=path.resolve(args.generator), adapter=require(filename), generate=typeof adapter==='function'?adapter:adapter.generate;
    if(typeof generate!=='function') throw Error('Generator module must export a function or generate(options, context)');
    return [{id:filename,adapterHash:createHash('sha256').update(fs.readFileSync(filename)).digest('hex'),generate:o=>generate(o,{rules:G,spec:G.spec(o,o.index)})}];
  }
  return [{id:'working-tree',ref:gitHead(),generate:o=>G.generate(o),engine:G}];
}
async function run(args) {
  const settings={nodeBudget:args.nodes,trials:args.trials,maxSteps:args.steps,maxArea:args['max-area'],seed:args.seed};
  const report={schema:1,rules:{ref:gitHead(),hash:digest(['game-engine.js','mechanics.js','hex/engine.js','hex/mirrors.js'])},settings,results:[]};
  let jobs;
  if(args.boards) {
    const filename=path.resolve(args.boards), input=JSON.parse(fs.readFileSync(filename,'utf8'));
    if(!Array.isArray(input)) throw Error('--boards must contain a JSON array');
    jobs=input.map((entry,i)=>({source:{id:filename},id:entry.id||'board-'+(i+1),board:entry.board||entry}));
  } else {
    const cases=JSON.parse(fs.readFileSync(args.cases||path.join(__dirname,'benchmark-cases.json'),'utf8'));
    if(!Array.isArray(cases)||cases.some(c=>!c.id||!c.options)) throw Error('--cases must contain {id, options} entries');
    jobs=sources(args).flatMap(source=>cases.map(c=>({source,id:c.id,options:c.options})));
  }
  for(const job of jobs) {
    const {source,id,options}=job; const result={source:{id:source.id,...(source.ref?{ref:source.ref}:{}),...(source.adapterHash?{adapterHash:source.adapterHash}:{})},id,...(options?{options}:{})};
    try {
      if(options?.revision===3 && source.engine && source.engine.normalize(options).revision!==3) {
        result.status='unsupported';result.reason='This revision does not support independent grid-size settings';report.results.push(result);continue;
      }
      let at=performance.now();const raw=job.board||await source.generate(options);result.generateMs=performance.now()-at;
      const checked=validate(raw);
      if(options?.revision===3 && (checked.board.W!==options.width||checked.board.H!==options.height)) throw Error('Generator did not preserve the requested grid dimensions');
      if(options?.revision===3 && ['square','hex'].includes(options.grid) && checked.board.grid!==options.grid) throw Error('Generator did not preserve the requested grid type');
      Object.assign(result,{layoutKey:G.layoutKey(checked.board),quality:checked.quality,certificate:checked.certificate,declaredPar:raw.par??null});
      if(checked.board.W*checked.board.H>args['max-area']) { result.status='excluded';result.reason='Grid exceeds the evaluation area limit';report.results.push(result);continue; }
      at=performance.now();result.manualTaps=evaluateSearch(checked.board,G,{nodeBudget:args.nodes,objective:'manualTaps'});result.nonExitMoves=evaluateSearch(checked.board,G,{nodeBudget:args.nodes,objective:'nonExitMoves'});result.searchMs=performance.now()-at;
      at=performance.now();result.players=evaluatePlayers(checked.board,G,{trials:args.trials,maxSteps:args.steps,seed:args.seed+'/'+id});
      result.players.provenOptimalTaps=result.manualTaps.status==='optimal'?result.manualTaps.upperBound:null;
      for(const policy of Object.values(result.players.policies)) policy.meanTapRegret=result.players.provenOptimalTaps!=null&&policy.meanManualTaps!=null?policy.meanManualTaps-result.players.provenOptimalTaps:null;
      result.simulationMs=performance.now()-at;
      result.status='evaluated';
    } catch(error) { result.status='error';result.error=error.message; }
    report.results.push(result); process.stderr.write(`${source.id} ${id}: ${result.status}${result.quality?' '+result.quality.grid+' '+result.quality.W+'x'+result.quality.H:''}\n`);
  }
  report.summary=report.results.reduce((out,r)=>(out[r.status]=(out[r.status]||0)+1,out),{});
  return report;
}
if(require.main===module) {
  (async()=>{const args=argumentsOf(process.argv.slice(2));if(args.help){process.stdout.write(HELP);return;}const report=await run(args), output=JSON.stringify(report,null,2)+'\n';if(args.out)fs.writeFileSync(args.out,output);else process.stdout.write(output);if(report.summary.error)process.exitCode=1;})().catch(error=>{console.error(error.message);process.exitCode=1});
}
module.exports={argumentsOf,validate,run};
