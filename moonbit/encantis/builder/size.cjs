// Code size of the Encantis builder against the MoonBit it would replace:
//   node moonbit/encantis/builder/size.cjs
// Tokens after comments are removed, with the tokenizer of scripts/mbt-metrics.cjs
// (words, numbers, strings and operators each count one). Tests are left out on
// both sides. The MoonBit side is weave.mbt without the style table, and only
// those declarations of square.mbt, random.mbt and types.mbt that weave reaches.
'use strict';
const fs = require('fs'), path = require('path');
const here = __dirname, core = path.join(here, '../../src/core');

const OPS = ['..<', '..=', '=>', '->', '==', '!=', '<=', '>=', '&&', '||', '+=', '-=', '*=', '/=', '%=', '::', '<<', '>>', '|>', '..'];
function tokens(src) {
  let n = 0, i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (src.startsWith('//', i)) { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '"' || c === "'") { let j = i + 1; while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1; n++; i = j + 1; continue; }
    const word = /^[A-Za-z_][A-Za-z0-9_]*[!?]?/.exec(src.slice(i, i + 64));
    if (word) { n++; i += word[0].length; continue; }
    const num = /^\d[\d_]*(\.\d+)?([eE][-+]?\d+)?[A-Za-z]*/.exec(src.slice(i, i + 64));
    if (num) { n++; i += num[0].length; continue; }
    n++; i += (OPS.find(o => src.startsWith(o, i)) || c).length;
  }
  return n;
}
const code = src => src.split('\n').filter(l => l.trim() && !l.trim().startsWith('//')).length;
const measure = src => ({ lines: code(src), tokens: tokens(src) });

// ---- Encantis: each file, split into its top-level declarations ----
function ents(file) {
  // everything from a file's "// --- Tests" heading on is tests and their helpers
  const [body, tests = ''] = fs.readFileSync(path.join(here, file), 'utf8').split(/\n(?=\/\/ --- Tests)/);
  const parts = body.split(/\n(?=(?:export )?(?:func|global|data|def|type|import|test) |export "mem")/);
  const kind = p => /^test /.test(p) ? 'tests' : /^import /.test(p) ? 'imports' : 'code';
  const out = { code: '', imports: '', tests };
  for (const p of parts) out[kind(p.replace(/^(\s*\/\/.*\n)*/, ''))] += p + '\n';
  return out;
}
// ---- MoonBit: blocks are separated by ///| ; a block is named by what it declares ----
function mbt(file, wanted) {
  const blocks = fs.readFileSync(path.join(core, file), 'utf8').split('///|').slice(1);
  const name = b => (/(?:fn(?:\[[^\]]*\])?|struct|let|const|type)\s+([A-Za-z_][A-Za-z0-9_:]*)/.exec(b.replace(/\/\/.*$/gm, '')) || [])[1];
  const keep = blocks.filter(b => wanted(name(b)));
  return { names: keep.map(name), src: keep.join('\n') };
}
const square = ['sq_dx', 'sq_dy', 'SqMirrors', 'SqMirrors::empty', 'SqMirrors::set', 'SqMirrors::get', 'SqMirrors::has', 'SqMirrors::size', 'turn', 'head_dir', 'exit_dir',
  'marks', 'mark_stamp', 'next_stamp', 'has_dup', 'ray_cells', 'self_blocked', 'SqBoard', 'GONE', 'sq_board', 'sq_board_exn', 'SqBoard::slide_to', 'SqBoard::place',
  'SqBoard::relax', 'SqBoard::paths', 'sq_play', 'bends_of', 'sq_blockers', 'groups_of', 'sq_looped'];
const random = ['Rng', 'mulberry32', 'lsr', 'Rng::next', 'Rng::below', 'ssort', 'imin', 'imax', 'dmax', 'index_from', 'contains', 'unique'];
const types = ['Pt', 'Path', 'some_paths', 'all_gone', 'last'];
const moon = [
  ['weave.mbt (without knots_wanted and the styles)', mbt('weave.mbt', n => !['knots_wanted', 'Style', 'Style::len_hi', 'styles'].includes(n))],
  ['square.mbt (the board, rays, loops)', mbt('square.mbt', n => square.includes(n))],
  ['random.mbt (rng, sort, list helpers)', mbt('random.mbt', n => random.includes(n))],
  ['types.mbt', mbt('types.mbt', n => types.includes(n))],
];
for (const [label, m] of moon) for (const want of label.startsWith('square') ? square : label.startsWith('random') ? random : label.startsWith('types') ? types : [])
  if (!m.names.includes(want)) throw Error(`${label}: no declaration ${want}`);

const row = (label, m) => console.log(`  ${label.padEnd(56)} ${String(m.lines).padStart(6)} ${String(m.tokens).padStart(7)}`);
const add = (a, b) => ({ lines: a.lines + b.lines, tokens: a.tokens + b.tokens });
console.log('MoonBit'.padEnd(58), ' lines  tokens');
let mTotal = { lines: 0, tokens: 0 };
for (const [label, m] of moon) { const x = measure(m.src); row(label, x); mTotal = add(mTotal, x); }
row('total', mTotal);

console.log('\nEncantis'.padEnd(59), ' lines  tokens');
let eTotal = { lines: 0, tokens: 0 }, imports = { lines: 0, tokens: 0 }, tests = { lines: 0, tokens: 0 };
for (const file of ['weave.ents', 'board.ents', 'rng.ents', 'ints.ents']) {
  const e = ents(file), x = measure(e.code);
  row(file, x); eTotal = add(eTotal, x); imports = add(imports, measure(e.imports)); tests = add(tests, measure(e.tests));
}
row('import declarations, all four files', imports);
row('total', add(eTotal, imports));
row('(inline tests, not counted)', tests);
row('(../stack/stack.ents, shared, not counted)', measure(fs.readFileSync(path.join(here, '../stack/stack.ents'), 'utf8').split(/\ntest /)[0]));
const all = add(eTotal, imports);
console.log(`\nEncantis / MoonBit: ${(all.tokens / mTotal.tokens).toFixed(2)}x the tokens, ${(all.lines / mTotal.lines).toFixed(2)}x the lines`);
console.log(`without the import declarations: ${(eTotal.tokens / mTotal.tokens).toFixed(2)}x the tokens`);
