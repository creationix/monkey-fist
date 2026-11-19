const fs=require('fs'); const ref=require('./reference-mine.json');
const MF=require('/home/user/mf-verify/moonbit/web/generator.js');
globalThis.MFGame=require('/home/user/mf-core-scratch/verify/ref-9e69e3a/game-engine.js');
const x=new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync('/home/user/mf-verify/moonbit/encantis/core/core.wasm')),{}).exports;
const gen=MF.wrap(x,'wasm');
const key=b=>JSON.stringify([b.grid,b.W,b.H,b.ropes.map(p=>p.map(c=>Array.isArray(c)?c:[c.q,c.r])),b.mirrors.map(m=>Array.isArray(m)?m:[m.cell.q,m.cell.r,m.axis??m.slope]),b.springs.map(p=>Array.isArray(p)?p:[p.q,p.r]),b.plan,b.par]);
const jsKeys=ref.journey.map(key); const jsIndex=new Map(jsKeys.map((k,i)=>[k,i]));
let differ=0,hexPos=0,hexNew=0,sqMoved=0,sqSame=0,sqNew=0;
for(let i=0;i<120;i++){const b=gen.generate({kind:'journey',index:i}); const k=key(b); const same=k===jsKeys[i];
 if(!same) differ++;
 if(b.grid==='hex'){hexPos++; if(!jsIndex.has(k)) hexNew++;}
 else { if(same) sqSame++; else if(jsIndex.has(k)) sqMoved++; else sqNew++; }
}
console.log({differ, hexPositions:hexPos, hexMapsNotInJsJourney:hexNew, squareSamePos:sqSame, squareMoved:sqMoved, squareNew:sqNew, jsHexPositions:ref.journey.filter(b=>b.grid==='hex').length});
