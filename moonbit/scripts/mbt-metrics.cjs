// Code size for the MoonBit port, comparable with scripts/code-metrics.cjs: tokens
// after comments are removed, functions, and decision points. For MoonBit, decisions
// are if, for, while, guard, catch, && and ||, plus each match arm (like a JS case);
// functions are fn plus lambdas (like JS function and =>).
//   node scripts/mbt-metrics.cjs [reference checkout dir]
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), ref = path.resolve(process.argv[2] || path.join(root, '..'));
// The repository's own JS measure (its script prints a report when loaded; silence it).
const log = console.log; console.log = () => {};
const { measure } = require(path.join(root, '../scripts/code-metrics.cjs'));
console.log = log;
const OPS = ['..<', '..=', '=>', '->', '==', '!=', '<=', '>=', '&&', '||', '+=', '-=', '*=', '/=', '%=', '::', '<<', '>>', '|>'];
function tokenize(src) {
  const tokens = []; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (src.startsWith('//', i)) { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '"' || c === "'") { // strings (interpolations count as one token, like JS templates) and chars
      let j = i + 1; while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1;
      tokens.push({ type: 'string' }); i = j + 1; continue;
    }
    const word = /^[A-Za-z_][A-Za-z0-9_]*[!?]?/.exec(src.slice(i, i + 64));
    if (word) { tokens.push({ type: 'word', value: word[0] }); i += word[0].length; continue; }
    const num = /^\d[\d_]*(\.\d+)?([eE][-+]?\d+)?[A-Za-z]*/.exec(src.slice(i, i + 64));
    if (num) { tokens.push({ type: 'number' }); i += num[0].length; continue; }
    const op = OPS.find(o => src.startsWith(o, i)) || c;
    tokens.push({ type: 'punct', value: op }); i += op.length;
  }
  return tokens;
}
function measureMbt(src) {
  const tokens = tokenize(src), lines = src.split('\n');
  let decisions = 0, functions = 0;
  // Match arms: '=>' directly inside a match block's own braces.
  const stack = []; // entries: 'match' or other
  let pendingMatch = false;
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k], v = t.value;
    if (t.type === 'word' && ['if', 'for', 'while', 'guard', 'catch'].includes(v)) decisions++;
    if (t.type === 'word' && v === 'fn') functions++;
    if (v === '&&' || v === '||') decisions++;
    if (t.type === 'word' && v === 'match') pendingMatch = true;
    if (v === '{' || v === '(' || v === '[') { stack.push(v === '{' && pendingMatch ? 'match' : v); if (v === '{') pendingMatch = false; }
    else if (v === '}' || v === ')' || v === ']') stack.pop();
    else if (v === '=>') { if (stack[stack.length - 1] === 'match') decisions++; else functions++; }
  }
  return { lines: lines.length, code: lines.filter(l => l.trim() && !l.trim().startsWith('//')).length, tokens: tokens.length, functions, decisions };
}
const sum = list => list.reduce((a, m) => { for (const k of ['files', 'lines', 'code', 'tokens', 'functions', 'decisions']) a[k] = (a[k] || 0) + (m[k] ?? 1); return a; }, {});
const mbt = dir => fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith('.mbt') && !f.endsWith('_test.mbt')).map(f => ({ file: dir + '/' + f, ...measureMbt(fs.readFileSync(path.join(root, dir, f), 'utf8')) }));
const js = (base, files) => files.map(f => ({ file: f, ...measure(fs.readFileSync(path.join(base, f), 'utf8')) }));
const groups = {
  'JS core replaced (9e69e3a)': js(ref, ['random.js', 'levels.js', 'mechanics.js', 'hex/engine.js', 'hex/mechanics.js', 'grid-generator.js', 'dependency-metrics.js', 'game-engine.js']),
  'MoonBit core (src/core, excl. journey table)': mbt('src/core').filter(f => !f.file.endsWith('journey.mbt')),
  'JS Journey table (grid-journey.js)': js(ref, ['grid-journey.js']),
  'MoonBit Journey table (journey.mbt)': mbt('src/core').filter(f => f.file.endsWith('journey.mbt')),
  'JS app layer (app.js, input.js, rope-art.js, audio.js, sounds.js, music.js)': js(ref, ['app.js', 'input.js', 'rope-art.js', 'audio.js', 'sounds.js', 'music.js']),
  'MoonBit game layer (src/game)': mbt('src/game'),
  'MoonBit export surface (src/api)': mbt('src/api'),
  'JS glue kept (web/game.js, web/mf-core.js)': js(root, ['web/game.js', 'web/mf-core.js']),
};
console.log('Group'.padEnd(80), 'files  lines   code  tokens  funcs  decisions');
const out = {};
for (const [name, list] of Object.entries(groups)) {
  const s = sum(list); out[name] = { ...s, perFile: list.map(({ file, lines, code, tokens, functions, decisions }) => ({ file, lines, code, tokens, functions, decisions })) };
  console.log(name.padEnd(80), String(s.files).padStart(5), String(s.lines).padStart(6), String(s.code).padStart(6), String(s.tokens).padStart(7), String(s.functions).padStart(6), String(s.decisions).padStart(10));
}
fs.writeFileSync(path.join(root, 'bench/code-metrics.json'), JSON.stringify(out, null, 1));
