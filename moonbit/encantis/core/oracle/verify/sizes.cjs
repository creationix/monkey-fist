const fs=require('fs'),zlib=require('zlib'),cp=require('child_process');
const gz=b=>cp.execFileSync('gzip',['-9c'],{input:b,maxBuffer:1<<30}).length;
const br=b=>zlib.brotliCompressSync(b,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:11,[zlib.constants.BROTLI_PARAM_LGWIN]:24, [zlib.constants.BROTLI_PARAM_SIZE_HINT]:b.length}}).length;
const C='/home/user/mf-verify/moonbit/encantis/core', B='/home/user/mf-core-scratch/verify/builds', D='/home/user/mf-verify/moonbit/dist', R='/home/user/mf-core-scratch/verify/ref-9e69e3a';
const rows=[['core.wasm',C+'/core.wasm'],['core -O',B+'/core-O.wasm'],['core --release',B+'/core-release.wasm'],['core O3',B+'/core-O3.wasm'],['g7.wasm',C+'/test/g7.wasm'],['g7 -O',B+'/g7-O.wasm'],
['gen.wasm',D+'/gen.wasm'],['gen.js',D+'/gen.js'],['mf.wasm',D+'/mf.wasm'],['mf.js',D+'/mf.js']];
for(const [n,f] of rows){const b=fs.readFileSync(f); const imp=n.endsWith('.js')?'':WebAssembly.Module.imports(new WebAssembly.Module(b)).length; console.log(n.padEnd(16),b.length,gz(b),br(b),'imports',imp);}
const js=['levels.js','game-engine.js','mechanics.js','random.js','grid-generator.js','grid-journey.js','hex/engine.js','hex/mechanics.js','dependency-metrics.js'];
const all=Buffer.concat(js.map(f=>fs.readFileSync(R+'/'+f)));
console.log('JS core 9 files',all.length,gz(all),br(all));
