// Source size of the Encantis core against the MoonBit it replaces, group by group:
//
//   node moonbit/encantis/core/oracle/size.cjs [G1 ...]     (all groups by default)
//
// The tokenizer and the rules are builder-v2/size.cjs's (and so v1's and
// scripts/mbt-metrics.cjs's): comments are left out, a word, a number, a string or an
// operator counts one; lines are lines with code. Tests are left out on both sides: on the
// Encantis side the `test` blocks and everything from a `// --- Tests` heading on.
//
// Each Encantis file is split into its code, its import declarations and its restated types
// (the lines of a copied canonical type block, and other `type` lines that restate a type
// another module declares), and these are counted apart. lib/ is listed, not counted.
// Each group adds its entry to GROUPS: its files, those with no MoonBit counterpart (new),
// generated ones, and the MoonBit declarations it replaces.
'use strict';
const fs = require('fs'), path = require('path');
const here = path.join(__dirname, '..'), core = path.join(__dirname, '../../../src');

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
const add = (a, b) => ({ lines: a.lines + b.lines, tokens: a.tokens + b.tokens });
const zero = () => ({ lines: 0, tokens: 0 });

// An Encantis file: { code, imports, types, tests } as source text. `declares` lists the
// types the file is the home of (they count as code there).
function ents(file, declares = []) {
  const [body, tests = ''] = fs.readFileSync(path.join(here, file), 'utf8').split(/\n(?=\/\/ --- Tests)/);
  const out = { code: '', imports: '', types: '', tests };
  let inBlock = false;
  const parts = body.split(/\n(?=(?:export )?(?:func|global|data|def|type|import|test|memory) |export memory|\/\/ --- The canonical type block|\/\/ --- end of the canonical)/);
  for (const p of parts) {
    const head = p.replace(/^(\s*\/\/.*\n)*/, '');
    if (p.startsWith('// --- The canonical type block')) inBlock = true;
    if (p.startsWith('// --- end of the canonical')) { inBlock = false; out.code += p.replace(/^.*\n?/, '') + '\n'; continue; }
    const typeName = (/^type ([A-Z]\w*)/.exec(head) || [])[1];
    if (/^test /.test(head)) out.tests += p + '\n';
    else if (/^import /.test(head)) out.imports += p + '\n';
    else if (typeName && !declares.includes(typeName)) out.types += p + '\n';
    else out.code += p + '\n';
  }
  return out;
}

// MoonBit: blocks are separated by ///|, and a block is named by what it declares.
function mbt(file, wanted = () => true) {
  const blocks = fs.readFileSync(path.join(core, file), 'utf8').split('///|').slice(1);
  const name = b => (/(?:fn(?:\[[^\]]*\])?|struct|let|const|type)\s+([A-Za-z_][A-Za-z0-9_:]*)/.exec(b.replace(/\/\/.*$/gm, '')) || [])[1];
  const keep = blocks.filter(b => wanted(name(b)) && !/^\s*test\s/.test(b.replace(/^(\s*\/\/.*\n)*/, '')));
  return { names: keep.map(name), src: keep.join('\n') };
}
const only = names => n => names.includes(n);
const except = names => n => !names.includes(n);

const GROUPS = {
  G1: {
    ents: [['random.ents', ['Rng']], ['board.ents', ['Pt', 'Mirror', 'Board', 'Spec', 'Level', 'SqMirrors']], ['codes.ents', ['SetOpts', 'Two']], ['abi.ents', ['Reader']]],
    fresh: [['fmath.ents', []], ['keys.ents', ['Slot']]],
    generated: [['journey.ents', []]],
    moonbit: [
      ['core/random.mbt', () => true],
      ['core/types.mbt', () => true],
      ['core/engine.mbt', except(['generate', 'generate_spec'])],
      ['core/gridgen.mbt', only(['Spec', 'Level', 'target_challenge', 'win_ceiling'])],
      ['core/metrics.mbt', only(['to_fixed'])],
      ['core/square.mbt', only(['SqMirrors', 'SqMirrors::empty', 'SqMirrors::of_board', 'SqMirrors::set', 'SqMirrors::get', 'SqMirrors::has', 'SqMirrors::size', 'marks', 'mark_stamp', 'next_stamp', 'has_dup'])],
      ['gen/gen.mbt', only(['input', 'output', 'output_f', 'current', 'in_reset', 'in_push', 'out_len', 'out_get', 'input_string', 'put_string', 'put_level', 'outf_get', 'put', 'read_position'])],
    ],
    moonbitGenerated: [['core/journey.mbt', () => true]],
  },
  // G2: the square kernel. square.mbt but what G1 took (SqMirrors, has_dup and its marks)
  // and what only weave uses (sq_dx, sq_dy, sq_play, bends_of, sq_blockers, groups_of,
  // sq_looped: the woven builder below has its own).
  G2: {
    ents: [['square.ents', ['SqBoard', 'Solved', 'Par', 'Replayed', 'Try', 'Solve', 'Fewest']]],
    moonbit: [['core/square.mbt', except(['SqMirrors', 'SqMirrors::empty', 'SqMirrors::of_board', 'SqMirrors::set', 'SqMirrors::get', 'SqMirrors::has', 'SqMirrors::size',
      'marks', 'mark_stamp', 'next_stamp', 'has_dup', 'sq_dx', 'sq_dy', 'sq_play', 'bends_of', 'sq_blockers', 'groups_of', 'sq_looped'])]],
  },
  // G2's woven builder: builder-v2's, taken in (weave.ents and weave-board.ents), with its
  // rng shim (weave-rng.ents), against weave.mbt, what of square.mbt only it uses, and
  // knots_for of gridgen.mbt.
  'G2 weave': {
    ents: [['weave.ents', ['WeaveCfg', 'Woven', 'Lane', 'Shaped', 'Cand', 'Spot', 'Spots', 'Option', 'Walked', 'Style']], ['weave-board.ents', []], ['weave-rng.ents', []]],
    moonbit: [['core/weave.mbt', () => true], ['core/square.mbt', only(['sq_dx', 'sq_dy', 'sq_play', 'bends_of', 'sq_blockers', 'groups_of', 'sq_looped'])],
      ['core/gridgen.mbt', only(['knots_for'])]],
  },
  // G3: the Hex offset kernel, hex.mbt lines 1 to 668 (all of it before HexIntent: G4 has the
  // rest). Solved, Par and Replayed are square.mbt's types, restated in hex.ents.
  G3: {
    ents: [['hex.ents', ['HexBoard', 'Try', 'Solve', 'Fewest']]],
    moonbit: [['core/hex.mbt', only(['hex_dq', 'hex_dr', 'hex_inside', 'hex_cell', 'hex_point', 'hex_reflect', 'hex_dir_index', 'hex_mirrors', 'ray_track',
      'exit_index', 'hex_turning', 'HexBoard', 'hex_compile', 'hex_compile_exn', 'HexBoard::to', 'HexBoard::place', 'HexBoard::free', 'HexBoard::paths',
      'HexBoard::relaxed', 'HexBoard::dead', 'HexBoard::frozen', 'offsets_key', 'hex_replay', 'hex_solve', 'hex_postpone_exits', 'hex_casual_wins',
      'hex_fewest_player_taps'])]],
  },
  // G4: the Hex woven builder, hex.mbt lines 669 to 1238.
  G4: {
    ents: [['hexbuild.ents', ['HexBoard', 'SqMirrors']]],
    moonbit: [['core/hex.mbt', only(['HexIntent', 'hex_intentions', 'HexCfg', 'HexBuilt', 'HexShape', 'hex_build'])]],
  },
};

const row = (label, m) => console.log(`  ${label.padEnd(64)} ${String(m.lines).padStart(6)} ${String(m.tokens).padStart(7)}`);
function report(name, g) {
  console.log(`\n${name}\nMoonBit replaced`.padEnd(67), ' lines  tokens');
  let mt = zero();
  for (const [file, f] of g.moonbit) { const m = mbt(file, f), x = measure(m.src); row(`${file} (${m.names.length} declarations)`, x); mt = add(mt, x); }
  row('total', mt);
  let gm = zero(); for (const [file, f] of g.moonbitGenerated || []) gm = add(gm, measure(mbt(file, f).src));
  if (g.moonbitGenerated) row('(generated, apart)', gm);
  console.log('Encantis'.padEnd(67), ' lines  tokens');
  let et = zero(), imp = zero(), typ = zero(), tst = zero(), fr = zero(), ge = zero();
  for (const [file, decl] of g.ents) { const e = ents(file, decl), x = measure(e.code); row(file, x); et = add(et, x); imp = add(imp, measure(e.imports)); typ = add(typ, measure(e.types)); tst = add(tst, measure(e.tests)); }
  row('total, ported code', et);
  for (const [file, decl] of g.fresh || []) { const e = ents(file, decl), x = measure(e.code); row(file + ' (new: no MoonBit counterpart)', x); fr = add(fr, x); imp = add(imp, measure(e.imports)); typ = add(typ, measure(e.types)); tst = add(tst, measure(e.tests)); }
  for (const [file, decl] of g.generated || []) { const e = ents(file, decl), x = measure(e.code); row(file + ' (generated, apart)', x); ge = add(ge, x); typ = add(typ, measure(e.types)); }
  row('import declarations (restated signatures)', imp);
  row('restated types (copied canonical blocks and others)', typ);
  row('(inline tests, not counted)', tst);
  const all = add(add(et, imp), typ);
  console.log(`  ported code / MoonBit: ${(et.tokens / mt.tokens).toFixed(2)}x tokens; with its imports and restated types ${(all.tokens / mt.tokens).toFixed(2)}x; ` +
    `imports and types are ${(100 * (imp.tokens + typ.tokens) / (all.tokens + fr.tokens)).toFixed(0)}% of all non-generated tokens`);
  if (g.moonbitGenerated) console.log(`  generated table: ${ge.tokens} tokens against MoonBit's ${gm.tokens} (${(ge.tokens / gm.tokens).toFixed(2)}x)`);
  return { mt, et, imp, typ, fr, ge, tst };
}

const want = process.argv.slice(2);
for (const [name, g] of Object.entries(GROUPS)) if (!want.length || want.includes(name)) report(name, g);
console.log('\nlib/ (copied, not counted):');
for (const f of fs.readdirSync(path.join(here, 'lib')).filter(f => f.endsWith('.ents')).sort())
  row('lib/' + f, measure(fs.readFileSync(path.join(here, 'lib', f), 'utf8').split(/\ntest /)[0]));
