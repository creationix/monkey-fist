const fs=require('fs'); const MF=require('/home/user/mf-verify/moonbit/web/generator.js');
globalThis.MFGame=require('/home/user/mf-core-scratch/verify/ref-9e69e3a/game-engine.js');
const ref=require('./reference-mine.json');
for (const js of [0,1]) {
  const x=new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync('/home/user/mf-verify/moonbit/encantis/core/test/g7.wasm')),{}).exports;
  x.t_js_mode(js); const g=MF.wrap(x,'wasm'); let peak=0;
  for (let i=0;i<120;i++){ g.generate({kind:'journey',index:i}); peak=Math.max(peak,x.stack_peak()); }
  let pc=0; const E=globalThis.MFGame;
  for (const c of ref.custom){ const o=E.parseCode(c.code); g.generate({...o,index:c.index}); pc=Math.max(pc,x.stack_peak()); }
  console.log(js?'JS mode':'port mode','Journey peak MiB',(peak/1048576).toFixed(2),'after custom',(pc/1048576).toFixed(2));
}
