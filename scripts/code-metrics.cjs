#!/usr/bin/env node
// Code size and complexity, with no dependencies. Lines alone mislead in this
// codebase, which packs a lot onto long lines, so the main size measure is tokens
// (after comments are removed). Complexity is counted as decision points: if, for,
// while, case, catch, ternary ?, &&, || and ??.
//
//   node scripts/code-metrics.cjs            the working tree, by area and by file
//   node scripts/code-metrics.cjs --history  the same totals at every commit on main
//   node scripts/code-metrics.cjs --check    fail if the game code exceeds the budget
//   node scripts/code-metrics.cjs --update   set the budget to the current size plus headroom
//
// The budget (scripts/code-budget.json) is a ratchet against bloat: growth past it
// has to be a deliberate --update, and shrinking code can lower it the same way.
'use strict';
const fs = require('node:fs'), path = require('node:path'), { execFileSync } = require('node:child_process');
const ROOT = path.join(__dirname, '..'), BUDGET = path.join(__dirname, 'code-budget.json'), HEADROOM = 1.02;

const PUNCT = ['>>>=', '...', '===', '!==', '**=', '<<=', '>>=', '>>>', '&&=', '||=', '??=', '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.',
  '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '**', '<<', '>>'];
const REGEX_AFTER_WORD = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
const DECISION_WORDS = new Set(['if', 'for', 'while', 'case', 'catch']), DECISION_PUNCT = new Set(['?', '&&', '||', '??']);

// Tokens with their line numbers; strings, templates and regular expressions are
// single tokens, comments are dropped (their lines are recorded).
function tokenize(src) {
  const tokens = [], commentLines = new Set(), braces = [];
  let i = 0, line = 1, prev = null;
  const push = (type, value, at) => { const t = { type, value, line: at }; tokens.push(t); prev = t; };
  const regexAllowed = () => !prev || prev.type === 'punct' && !/^[)\]}]$/.test(prev.value) || prev.type === 'word' && REGEX_AFTER_WORD.has(prev.value);
  function template() { // from just after ` or a closing } of ${...}, to the next ${ or closing `
    const at = line;
    while (i < src.length && src[i] !== '`') {
      if (src[i] === '\\') { i += 2; continue; }
      if (src[i] === '$' && src[i + 1] === '{') { i += 2; braces.push(0); push('string', 'template', at); return; }
      if (src[i] === '\n') line++;
      i++;
    }
    i++; push('string', 'template', at);
  }
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { commentLines.add(line); while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2), stop = end < 0 ? src.length : end + 2;
      for (; i < stop; i++) { if (src[i] === '\n') { commentLines.add(line); line++; } }
      commentLines.add(line); continue;
    }
    if (c === '"' || c === "'") {
      const at = line; i++;
      while (i < src.length && src[i] !== c && src[i] !== '\n') i += src[i] === '\\' ? 2 : 1;
      i++; push('string', 'string', at); continue;
    }
    if (c === '`') { i++; template(); continue; }
    if (c === '/' && regexAllowed()) {
      const at = line; let klass = false; i++;
      while (i < src.length && src[i] !== '\n' && (klass || src[i] !== '/')) {
        if (src[i] === '\\') i++; else if (src[i] === '[') klass = true; else if (src[i] === ']') klass = false;
        i++;
      }
      i++; while (/[a-z]/i.test(src[i] || '')) i++;
      push('regex', 'regex', at); continue;
    }
    if (/[A-Za-z_$\u0080-￿]/.test(c)) { const at = i; while (i < src.length && /[\w$\u0080-￿]/.test(src[i])) i++; push('word', src.slice(at, i), line); continue; }
    if (/[0-9]/.test(c) || c === '.' && /[0-9]/.test(src[i + 1])) { while (i < src.length && /[\w.]/.test(src[i])) i++; push('number', 'number', line); continue; }
    if (c === '}' && braces.length) {
      if (braces[braces.length - 1] === 0) { braces.pop(); i++; template(); continue; }
      braces[braces.length - 1]--;
    }
    if (c === '{' && braces.length) braces[braces.length - 1]++;
    const op = PUNCT.find(p => src.startsWith(p, i)) || c;
    push('punct', op, line); i += op.length;
  }
  return { tokens, commentLines };
}
const isDecision = t => t.type === 'word' ? DECISION_WORDS.has(t.value) : t.type === 'punct' && DECISION_PUNCT.has(t.value);

// Named functions (function NAME, or NAME = ... => / function) with braced bodies.
// Each token counts toward the innermost named function around it.
function functionsOf(tokens) {
  const spans = [];
  for (let k = 0; k < tokens.length; k++) {
    let name = null, start = k;
    if (tokens[k].value === 'function' && tokens[k + 1]?.type === 'word') name = tokens[k + 1].value;
    else if (tokens[k].type === 'word' && tokens[k + 1]?.value === '=' && !['let', 'const', 'var'].includes(tokens[k].value)) {
      // NAME = function (...) {  or  NAME = (...) => {  or  NAME = x => {
      let j = k + 2, depth = 0;
      if (tokens[j]?.value === 'function') name = tokens[k].value;
      else for (; j < tokens.length; j++) {
        const v = tokens[j].value;
        if (v === '(') depth++; else if (v === ')') depth--;
        else if (depth === 0 && v === '=>') { if (tokens[j + 1]?.value === '{') name = tokens[k].value; break; }
        else if (depth === 0 && (v === ';' || v === ',' || v === '{' || v === '}')) break;
        if (depth < 0) break;
      }
    }
    if (!name || name.startsWith('MF')) continue; // MF* names are the module wrappers
    let j = k; while (j < tokens.length && tokens[j].value !== '{') j++;
    let depth = 0, end = j;
    for (; end < tokens.length; end++) { if (tokens[end].value === '{') depth++; else if (tokens[end].value === '}' && --depth === 0) break; }
    spans.push({ name, start, end, line: tokens[start].line, tokens: 0, decisions: 0 });
  }
  const stack = [];
  tokens.forEach((t, k) => {
    while (stack.length && k > stack[stack.length - 1].end) stack.pop();
    for (const span of spans) if (span.start === k) stack.push(span);
    const owner = stack[stack.length - 1]; if (!owner) return;
    owner.tokens++; if (isDecision(t)) owner.decisions++;
  });
  return spans;
}

function measure(src) {
  const lines = src.split('\n'), { tokens, commentLines } = tokenize(src), codeLines = new Set(tokens.map(t => t.line));
  return { lines: lines.length, code: codeLines.size, comments: [...commentLines].filter(n => !codeLines.has(n)).length,
    tokens: tokens.length, functions: tokens.filter(t => t.value === 'function' || t.value === '=>').length,
    decisions: tokens.filter(isDecision).length, longLines: lines.filter(l => l.length > 160).length, spans: functionsOf(tokens) };
}
// Inline <script> blocks of an HTML page (early versions kept code there).
const scriptsOf = html => [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');

// Areas: game (what the page and its worker run), data (generated tables),
// tools, tests and experiments.
function areaOf(file, src) {
  if (/^experiments\//.test(file)) return 'experiments';
  if (/^tests\//.test(file)) return 'tests';
  if (/^scripts\//.test(file)) return 'tools';
  if (/^\/\/ Generated by/.test(src) || /(^|\/)(grid-)?journey\.js$/.test(file)) return 'data';
  return /^(hex\/)?[^/]+\.(js|html)$/.test(file) ? 'game' : null;
}
const wanted = file => /\.(c?js|html)$/.test(file) && !/^docs\//.test(file);
const sourceOf = (file, text) => file.endsWith('.html') ? scriptsOf(text) : text;

function summarize(files) { // files: [{ file, area, m }]
  const areas = {};
  for (const { area, m } of files) {
    const a = areas[area] ||= { files: 0, lines: 0, code: 0, tokens: 0, functions: 0, decisions: 0, longLines: 0 };
    a.files++; for (const k of ['lines', 'code', 'tokens', 'functions', 'decisions', 'longLines']) a[k] += m[k];
  }
  const spans = files.filter(f => f.area === 'game').flatMap(f => f.m.spans.map(s => ({ ...s, file: f.file })));
  const largest = spans.reduce((best, s) => !best || s.decisions > best.decisions ? s : best, null);
  return { areas, spans, largest };
}

function workingTree() {
  const list = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(f => f && wanted(f) && fs.existsSync(path.join(ROOT, f)));
  return list.flatMap(file => {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8'), area = areaOf(file, text);
    if (!area || area === 'game' && file.endsWith('.html') && !scriptsOf(text).trim()) return [];
    return [{ file, area, m: measure(sourceOf(file, text)) }];
  });
}

const pad = (v, n) => String(v).padStart(n);
function report() {
  const files = workingTree(), { areas, spans, largest } = summarize(files);
  console.log('Area          files   lines    code  tokens  funcs  decisions  >160 chars');
  for (const name of ['game', 'data', 'tools', 'tests', 'experiments']) {
    const a = areas[name]; if (!a) continue;
    console.log(name.padEnd(12), pad(a.files, 6), pad(a.lines, 7), pad(a.code, 7), pad(a.tokens, 7), pad(a.functions, 6), pad(a.decisions, 10), pad(a.longLines, 11));
  }
  console.log('\nGame files                 lines    code  tokens  funcs  decisions  decisions/kTok');
  for (const f of files.filter(f => f.area === 'game').sort((a, b) => b.m.tokens - a.m.tokens))
    console.log(f.file.padEnd(24), pad(f.m.lines, 7), pad(f.m.code, 7), pad(f.m.tokens, 7), pad(f.m.functions, 6), pad(f.m.decisions, 10), pad((f.m.decisions / f.m.tokens * 1000).toFixed(0), 15));
  console.log('\nMost decisions in one function (game code)');
  for (const s of spans.sort((a, b) => b.decisions - a.decisions).slice(0, 10))
    console.log(pad(s.decisions, 4), 'decisions', pad(s.tokens, 6), 'tokens  ', s.file + ':' + s.line, s.name);
  return { areas, largest };
}

function history() {
  const commits = execFileSync('git', ['log', '--first-parent', '--reverse', '--format=%H %ad %s', '--date=format:%m-%d %H:%M', 'main'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n');
  const blobs = new Map(), trees = commits.map(row => {
    const [hash, day, time, ...subject] = row.split(' ');
    const entries = execFileSync('git', ['ls-tree', '-r', hash], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').map(l => { const [meta, file] = l.split('\t'); return { blob: meta.split(' ')[2], file }; }).filter(e => wanted(e.file));
    for (const e of entries) blobs.set(e.blob, null);
    return { hash: hash.slice(0, 7), when: day + ' ' + time, subject: subject.join(' '), entries };
  });
  // Read every distinct blob once.
  const ids = [...blobs.keys()], out = execFileSync('git', ['cat-file', '--batch'], { cwd: ROOT, input: ids.join('\n') + '\n', maxBuffer: 1 << 30 });
  for (let at = 0, k = 0; k < ids.length; k++) {
    const header = out.indexOf(10, at), size = Number(out.toString('latin1', at, header).split(' ')[2]);
    blobs.set(ids[k], out.toString('utf8', header + 1, header + 1 + size)); at = header + 1 + size + 1;
  }
  const measured = new Map();
  console.log('| Commit | When | Game tokens | Game code lines | Decisions | Largest function | Tests tokens | Change |');
  console.log('| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |');
  let last = null;
  for (const t of trees) {
    const files = t.entries.flatMap(e => {
      const text = blobs.get(e.blob), area = areaOf(e.file, text); if (!area) return [];
      const key = e.blob + (e.file.endsWith('.html') ? ':html' : '');
      if (!measured.has(key)) measured.set(key, measure(sourceOf(e.file, text)));
      return [{ file: e.file, area, m: measured.get(key) }];
    });
    const { areas, largest } = summarize(files), g = areas.game || { tokens: 0, code: 0, decisions: 0 };
    const row = [t.hash, t.when, g.tokens, g.code, g.decisions, largest ? largest.decisions + ' (' + largest.name + ')' : '', areas.tests?.tokens || 0];
    if (last && row[2] === last[2] && row[6] === last[6]) continue; // no code change
    console.log('| ' + row.join(' | ') + ' | ' + t.subject.slice(0, 60) + ' |'); last = row;
  }
}

function budgetOf(areas, largest) {
  const g = areas.game;
  return { gameTokens: g.tokens, gameDecisions: g.decisions, largestFunctionDecisions: largest.decisions };
}
const args = process.argv.slice(2);
if (args.includes('--history')) history();
else {
  const quiet = args.includes('--check');
  const { areas, largest } = quiet ? summarize(workingTree()) : report(), now = budgetOf(areas, largest);
  if (args.includes('--update')) {
    const budget = Object.fromEntries(Object.entries(now).map(([k, v]) => [k, Math.ceil(v * HEADROOM)]));
    fs.writeFileSync(BUDGET, JSON.stringify({ note: 'Written by node scripts/code-metrics.cjs --update: current game code plus 2% headroom.', ...budget }, null, 2) + '\n');
    console.log('\nBudget updated:', JSON.stringify(budget));
  } else if (quiet) {
    const budget = JSON.parse(fs.readFileSync(BUDGET, 'utf8')), over = Object.keys(now).filter(k => now[k] > budget[k]);
    for (const k of Object.keys(now)) console.log(k.padEnd(26), pad(now[k], 7), 'of', pad(budget[k], 7), now[k] > budget[k] ? 'OVER' : '');
    if (over.length) { console.error('\nGame code grew past its budget (' + over.join(', ') + '). Simplify, or run node scripts/code-metrics.cjs --update if the growth is deliberate.'); process.exit(1); }
  }
}
module.exports = { tokenize, measure };
