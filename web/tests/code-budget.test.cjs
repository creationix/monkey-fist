const test = require('node:test'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process'), path = require('node:path');
const { tokenize, measure } = require('../scripts/code-metrics.cjs');

test('the tokenizer skips comments, strings, templates and regular expressions', () => {
  const src = "// note\nconst a = `x ${b ? '}' : `${c}`} y`; /* if (z) */ const r = /[/]if/g.test(s) && d || e; // && ||\n";
  const { tokens } = tokenize(src);
  assert.deepEqual(tokens.filter(t => t.type === 'word').map(t => t.value), ['const', 'a', 'b', 'c', 'const', 'r', 'test', 's', 'd', 'e']);
  const m = measure(src);
  assert.equal(m.decisions, 3, 'the ternary inside the template, && and ||'); assert.equal(m.comments, 1); assert.equal(m.code, 1);
});

test('game code stays within its budget (node scripts/code-metrics.cjs --check)', () => {
  try { execFileSync(process.execPath, [path.join(__dirname, '../scripts/code-metrics.cjs'), '--check'], { encoding: 'utf8', stdio: 'pipe' }); }
  catch (error) { assert.fail(error.stdout + error.stderr); }
});
