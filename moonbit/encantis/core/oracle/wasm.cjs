// Loading a wasm of the Encantis core (or a test entry) and talking to it through
// the numbers ABI of src/gen: words in (in_reset, in_push), words and doubles out
// (out_len, out_get, outf_get). Shared by every check-gN.cjs.
//
//   const W = require('./wasm.cjs')
//   const port = W.load('test/g1.wasm')       // asserts it has no imports
//   port.push([1, 4, 6, ...])                  // in_reset, then in_push of each word
//   port.pushText('U3-S-...')                  // the UTF-16 code units of a string
//   port.x.t_spec(3)                           // any export
//   port.out()  port.outf(0)  port.text()      // the output words, a double, the words as text
//
// The positive control (--js in a check): W.fake(hooks) is an object of the same
// shape whose exports are JS functions, given the same words and writing the same
// outputs through the same buffers. A check run against it compares the JS with
// itself through the converters, and must pass.
'use strict';
const fs = require('fs');

function wrap(x, name) {
  return {
    name, x,
    push(words) { x.in_reset(); for (const w of words) x.in_push(w | 0); },
    pushText(s) { x.in_reset(); for (let i = 0; i < s.length; i++) x.in_push(s.charCodeAt(i)); },
    out() { const n = x.out_len(), o = new Array(n); for (let i = 0; i < n; i++) o[i] = x.out_get(i); return o; },
    outf: k => x.outf_get(k),
    text() { return String.fromCharCode(...this.out()); },
  };
}

// The wasm at path, instantiated with {} as the game's six loaders do. Throws if it has
// imports.
function load(path) {
  const mod = new WebAssembly.Module(fs.readFileSync(path));
  const imports = WebAssembly.Module.imports(mod);
  if (imports.length) throw Error(`${path} has imports (${imports.map(i => i.module + '.' + i.name).join(', ')}): the core must have none`);
  return wrap(new WebAssembly.Instance(mod, {}).exports, path);
}

// An exports object for JS hooks: hooks(io) gets { input, put, putf, clear } and returns
// the t_* functions, which read io.input() and write with io.put / io.putf.
function fake(hooks) {
  let input = [], out = [], outf = [];
  const io = { input: () => input, put: (...w) => { for (const v of w) out.push(v | 0); }, putf: (k, v) => { outf[k] = v; }, clear: () => { out = []; } };
  const x = { in_reset: () => { input = []; }, in_push: w => { input.push(w | 0); }, out_len: () => out.length, out_get: i => out[i] ?? 0, outf_get: k => outf[k] ?? 0, ...hooks(io) };
  return wrap(x, 'js');
}

module.exports = { load, fake, wrap };
