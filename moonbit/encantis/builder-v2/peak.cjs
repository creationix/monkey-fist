// The peak of the bump stack while weave() runs, over the fixture's 249 cases:
//   ENCANTIS='bun <encantis>/packages/cli/src/cli.ts' node moonbit/encantis/builder-v2/peak.cjs [dir]
// Builds a copy of the builder (of `dir`, default this directory) whose lib/stack.ents
// records the highest top that alloc and extend reach, and runs every case on it,
// checking each result and draw count against weave-expected.json. Reports the peak
// by board size, in bytes above where the stack stood when weave() was called, and
// checks that the stack is back there after each call. The copy is made in a
// temporary directory; nothing beside this file is changed. It also measures v1:
// node moonbit/encantis/builder-v2/peak.cjs moonbit/encantis/builder
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { execSync } = require('child_process');
const D = require('../builder/dump-weave.cjs');
const src = path.resolve(process.argv[2] || __dirname), encantis = process.env.ENCANTIS || 'encantis';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'weave-peak-'));
const copy = (from, to) => { fs.mkdirSync(to, { recursive: true }); for (const f of fs.readdirSync(from)) {
  const p = path.join(from, f); if (fs.statSync(p).isDirectory()) copy(p, path.join(to, f)); else if (f.endsWith('.ents')) fs.copyFileSync(p, path.join(to, f)); } };
// (v1, ../builder, imports ../stack/stack: that is copied beside it.)
const dir = path.join(tmp, 'builder');
copy(src, dir);
if (fs.existsSync(path.join(src, '../stack/stack.ents'))) copy(path.join(src, '../stack'), path.join(tmp, 'stack'));
// The stack: a high-water mark, raised by alloc and extend.
const stackFile = fs.existsSync(path.join(dir, 'lib/stack.ents')) ? 'lib/stack.ents' : '../stack/stack.ents';
const stackPath = path.join(dir, stackFile);
if (!fs.existsSync(stackPath)) throw Error(`no stack at ${stackFile}`);
let stack = fs.readFileSync(stackPath, 'utf8');
const raised = stack.replace(/^(\s*)top \+= n$/gm, '$1top += n\n$1if top > peak {\n$1  peak = top\n$1}');
if ((raised.match(/peak = top/g) || []).length !== 2) throw Error('expected alloc and extend in ' + stackFile);
stack = raised.replace(/^global top: u32 = 0$/m, 'global top: u32 = 0\nglobal peak: u32 = 0\nexport func peak_top() -> u32 => peak\nexport func peak_clear() {\n  peak = top\n}\nexport func stack_top() -> u32 => top');
fs.writeFileSync(stackPath, stack);
// The builder: three exports that pass them on.
const weavePath = path.join(dir, 'weave.ents');
let weave = fs.readFileSync(weavePath, 'utf8');
const imp = /import "(\.\/lib\/stack|\.\.\/stack\/stack)" \(\n/;
if (!imp.test(weave)) throw Error('weave.ents does not import the stack');
weave = weave.replace(imp, m => m + '  "peak_top" func peak_top() -> u32\n  "peak_clear" func peak_clear()\n  "stack_top" func stack_top() -> u32\n');
weave += '\nexport func peak() -> u32 => peak_top()\nexport func clear_peak() {\n  peak_clear()\n}\nexport func probe_top() -> u32 => stack_top()\n';
fs.writeFileSync(weavePath, weave);
const wasm = path.join(tmp, 'weave-peak.wasm');
execSync(`${encantis} wasm ${weavePath} -o ${wasm}`, { stdio: 'inherit' });

const fixture = JSON.parse(fs.readFileSync(D.FIXTURE, 'utf8'));
const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(wasm)), {}).exports;
const IN = x.in_ptr() >>> 0, FIN = x.fin_ptr() >>> 0;
const groups = [['boards up to 12x16', c => c.cfg.W * c.cfg.H <= 192], ['24x24', c => c.cfg.W === 24], ['40x40', c => c.cfg.W === 40]];
const peak = groups.map(() => ({ bytes: 0, where: '' }));
for (const c of fixture.cases) {
  const input = D.words(c);
  new Int32Array(x.mem.buffer, IN, input.ints.length).set(input.ints);
  const f = new DataView(x.mem.buffer, FIN); input.doubles.forEach((v, i) => f.setFloat64(8 * i, v, true));
  x.clear_peak(); const base = x.probe_top() >>> 0;
  const r = x.weave();
  if ((r === 1) !== !!c.out || (x.draws() >>> 0) !== c.draws) throw Error(`case ${c.id} differs from the fixture`);
  if ((x.probe_top() >>> 0) !== base) throw Error(`case ${c.id}: the stack is not back where it was`);
  const g = groups.findIndex(([, test]) => test(c)), used = (x.peak() >>> 0) - base;
  if (used > peak[g].bytes) peak[g] = { bytes: used, where: `case ${c.id}, ${c.cfg.W}x${c.cfg.H}` };
}
console.log(`peak of the bump stack above its base during weave(), over the ${fixture.cases.length} cases (${path.relative(process.cwd(), src) || '.'}):`);
groups.forEach(([name], g) => console.log(`  ${name}: ${peak[g].bytes} bytes (${peak[g].where})`));
console.log(`memory: ${x.mem.buffer.byteLength / 65536} pages; every result and draw count matches, and the stack is back at its base after each call`);
fs.rmSync(tmp, { recursive: true, force: true });
