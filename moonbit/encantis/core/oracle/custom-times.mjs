// Per-case time of the 15-case custom sample on a wasm build (generate() through
// web/mf-core.js), beside the JS reference's time from reference.json (one run each).
//   node custom-times.mjs <wasm> <reference.json>
import fs from 'fs';
import { loadWasm } from '../../../web/mf-core.js';
const [file, refFile] = process.argv.slice(2), ref = JSON.parse(fs.readFileSync(refFile, 'utf8'));
const mf = await loadWasm(fs.readFileSync(file));
for (const c of ref.custom) {
  const t = performance.now(), b = mf.generate(c.code, c.index), ms = performance.now() - t;
  console.log(`${c.code} #${c.index}`.padEnd(40), `JS ${String(c.ms).padStart(6)} ms`, `wasm ${ms.toFixed(0).padStart(5)} ms`, b && b.layoutKey === c.layoutKey ? 'same' : 'DIFFERENT');
}
