// G7's unit oracle: placeMirrors, woven and addSpinners of grid-generator.js at 9e69e3a, on the
// calls the real generator makes (capture.cjs records them, rejected candidates included), against
// gridgen.ents through test/g7.wasm's hooks (t_place_mirrors, t_woven, t_add_spinners).
//
//   node check-g7-units.cjs [--js] [--controls] [--reverse] [--port] [--fill] [--wasm test/g7.wasm]
//
// The fixture: every call of the three over the 120 Journey levels and 4 levels each of 8 custom
// codes (both grids, mirrors, spinners, mixed, colossal, difficulties 1 to 100), recorded once into
// fixtures/g7-units.json.gz (--fill, about 3 minutes of JS; 2,821 records, 450 KB) and pinned by its
// sha256 here; each record re-runs in the JS from its numbers alone (capture.replay) when filled.
//
// The modes:
//   default    the JS's mode (draw-exact hex_build): every result equals the JS's, mirror by
//              mirror and cell by cell, with the same number of draws (so the same rng state after);
//   --port     the port's own mode (core.wasm's): placeMirrors and addSpinners must still equal the
//              JS's (they do not depend on hex_build); woven's square results too; its Hex results
//              may differ (G4's departures) and must instead be valid: ropes of 2 cells or more, on
//              the board, in steps, no shared cell and none on a mirror, the plan replaying to an
//              empty board through the JS's own G.replay, and every mirror kept turning a rope;
//   --js       the JS against itself through the same converters (the positive control);
//   --controls one expected value spoiled per kind of output: each must fail and name the case.
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib'), crypto = require('crypto');
const R = require('./ref.cjs'), W = require('./wasm.cjs'), C = require('./capture.cjs');

const args = process.argv.slice(2), has = f => args.includes(f);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const FIXTURE = path.join(__dirname, 'fixtures/g7-units.json.gz');
const SHA = 'c93d0547a35159596c7d442788c167d257ec4918fce5cf3485d64b2053d24dd1';  // --fill prints the new one
const WASM = opt('--wasm', path.join(__dirname, '../test/g7.wasm'));

const CODES = ['U3-S-1-100-8-8-4-MS-UNITA', 'U3-H-1-100-8-8-4-MS-UNITB', 'U3-M-1-100-12-12-4-MS-UNITC', 'U3-S-60-100-16-16-4-S-UNITD',
  'U3-H-60-100-16-16-4-MS-UNITE', 'U3-M-1-100-10-14-4-M-UNITF', 'U3-S-1-100-32-32-4-MC-UNITG', 'U3-H-1-100-32-32-4-MSC-UNITH'];
const NAMES = ['placeMirrors', 'woven', 'addSpinners'];

function specs() {
  const { G } = R.js(), out = [];
  for (let i = 0; i < 120; i++) out.push(G.spec({ kind: 'journey' }, i));
  for (const code of CODES) {
    const o = G.parseCode(code);
    if (!o) throw Error('invalid code ' + code);
    for (let i = 0; i < 4; i++) out.push(G.spec(o, i));
  }
  return out;
}

function fill() {
  const t = Date.now(), all = specs(), recs = [];
  let gaveUp = 0;
  const label = (k, s) => k < 120 ? 'L' + (k + 1) : CODES[Math.floor((k - 120) / 4)] + '#' + s.index;
  for (const [k, s] of all.entries()) {
    let got;
    try { got = C.record(NAMES, [s]); }
    catch (e) { gaveUp++; console.log('the JS gives up on', label(k, s), '(its calls are not kept):', e.message); continue; }
    for (const r of got) recs.push({ ...r, level: label(k, s) });
  }
  let bad = 0;
  for (const r of recs) if (!C.replay(r).same) { bad++; console.log('replay differs', r.name, r.level, r.n); }
  if (bad) throw Error(bad + ' records do not replay from their numbers');
  const gz = zlib.gzipSync(JSON.stringify(recs));
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  fs.writeFileSync(FIXTURE, gz);
  const count = n => recs.filter(r => r.name === n).length;
  console.log(`filled ${FIXTURE}: ${recs.length} records (${NAMES.map(n => n + ' ' + count(n)).join(', ')}), all replay; ` +
    `${gz.length} bytes, sha256 ${crypto.createHash('sha256').update(gz).digest('hex')}; ${((Date.now() - t) / 1000).toFixed(0)} s`);
}

// --- Words ---

const kindOf = (hex, m) => hex ? m.axis : m.slope === '\\' ? 1 : 0;
// A JS board as the hooks' words: hex, W, H, ropes, mirrors, springs, plan.
function boardWords(b) {
  const hex = b.grid === 'hex', out = [hex ? 1 : 0, b.W, b.H, b.ropes.length];
  for (const p of b.ropes) { out.push(p.length); for (const c of p) out.push(c.q, c.r); }
  out.push(b.mirrors.length); for (const m of b.mirrors) out.push(m.cell.q, m.cell.r, kindOf(hex, m));
  out.push(b.springs.length); for (const p of b.springs) out.push(p.q, p.r);
  out.push(b.plan.length, ...b.plan);
  return out;
}
// The rng state after n draws from s (mulberry32 adds 0x6D2B79F5 a draw).
const after = (s, n) => (s + Math.imul(n, 0x6D2B79F5)) | 0;
const styleIndex = ref => +ref.$ref.split('.').pop();

// What a record expects, as words: [state after, ...result words].
function expected(r) {
  const state = r.args[r.name === 'addSpinners' ? 2 : 4].$rng;
  if (r.name === 'placeMirrors') {
    const hex = r.args[0] === 'hex';
    return [after(state, r.draws), r.result.length, ...r.result.flatMap(m => [m.cell.q, m.cell.r, kindOf(hex, m)])];
  }
  return [after(state, r.draws), ...(r.result ? boardWords(r.result) : [-1])];
}

// Runs record r on port p (a wasm, or the fake): its output words.
function run(p, r) {
  const a = r.args;
  if (r.name === 'placeMirrors') {
    p.push(a[5].$set);
    p.x.t_place_mirrors(a[4].$rng, a[0] === 'hex' ? 1 : 0, a[1], a[2], a[3]);
  } else if (r.name === 'woven') {
    const extra = a[8] || {};
    p.x.t_woven(a[4].$rng, a[0] === 'hex' ? 1 : 0, a[1], a[2], a[3], styleIndex(a[5]), a[6].longRopes ? 1 : 0, extra.mirrors || 0, extra.core ? 1 : 0);
  } else {
    const b = a[0];
    p.push(R.position(b, b.ropes, b.plan));
    p.x.t_add_spinners(a[2].$rng, a[3]);
  }
  return p.out();
}

// The JS itself behind the hooks (--js): the recorded call run again through capture's replay.
function jsPort() {
  let cur = null;
  const p = W.fake(io => {
    const answer = () => { const got = C.replay(cur); io.clear(); for (const w of expected({ ...cur, result: got.result, draws: got.draws })) io.put(w); };
    return { t_place_mirrors: answer, t_woven: answer, t_add_spinners: answer, t_js_mode: () => {} };
  });
  p.set = r => { cur = r; };
  return p;
}

// Validity of a woven Hex board made in the port's mode (words as boardWords writes them).
function validWoven(r, words) {
  const { G } = R.js();
  let k = 1; const next = () => words[k++];
  const hex = next() === 1, Wd = next(), Hd = next();
  const ropes = Array.from({ length: next() }, () => Array.from({ length: next() }, () => ({ q: next(), r: next() })));
  const mirrors = Array.from({ length: next() }, () => { const q = next(), rr = next(), kind = next(); return hex ? { cell: { q, r: rr }, axis: kind } : { cell: { q, r: rr }, slope: kind ? '\\' : '/' }; });
  const springs = Array.from({ length: next() }, () => ({ q: next(), r: next() }));
  const plan = Array.from({ length: next() }, () => next());
  const b = { grid: hex ? 'hex' : 'square', W: Wd, H: Hd, ropes, mirrors, springs, plan };
  const a = r.args;
  if (b.W !== a[1] || b.H !== a[2] || (b.grid === 'hex') !== (a[0] === 'hex')) return 'size or grid';
  const seen = new Set(mirrors.map(m => m.cell.q + ',' + m.cell.r));
  const inside = p => hex ? p.r >= 0 && p.r < Hd && p.q + Math.floor(p.r / 2) >= 0 && p.q + Math.floor(p.r / 2) < Wd : p.q >= 0 && p.r >= 0 && p.q < Wd && p.r < Hd;
  const step = (p, q) => { const dq = q.q - p.q, dr = q.r - p.r; return hex ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]].some(([x, y]) => x === dq && y === dr) : Math.abs(dq) + Math.abs(dr) === 1; };
  for (const p of ropes) {
    if (p.length < 2) return 'a rope of one cell';
    for (const [i, c] of p.entries()) {
      if (!inside(c)) return 'a cell off the board';
      if (seen.has(c.q + ',' + c.r)) return 'a cell twice, or on a mirror';
      seen.add(c.q + ',' + c.r);
      if (i && !step(p[i - 1], c)) return 'a rope not in steps';
    }
  }
  const played = G.replay(b, plan);
  if (!played.solved) return 'the plan does not clear the board';
  return '';
}

function main() {
  if (has('--fill')) return fill();
  if (!fs.existsSync(FIXTURE)) throw Error('no fixture: run with --fill first');
  const gz = fs.readFileSync(FIXTURE), sha = crypto.createHash('sha256').update(gz).digest('hex');
  if (SHA !== 'fill' && sha !== SHA) throw Error('fixture sha256 ' + sha + ' is not the pinned one');
  let recs = JSON.parse(zlib.gunzipSync(gz));
  if (has('--reverse')) recs = recs.reverse();
  const js = has('--js'), port = has('--port'), controls = has('--controls');
  const p = js ? jsPort() : W.load(WASM);
  if (!js) p.x.t_js_mode(port ? 0 : 1);
  const t = Date.now(), counts = {}, fails = {}, spoiled = {};
  let compared = 0, values = 0, valid = 0, departed = 0;
  for (const r of recs) {
    const kind = r.name;
    counts[kind] = (counts[kind] || 0) + 1;
    if (js) p.set(r);
    const want = expected(r), got = run(p, r);
    if (controls && !spoiled[kind] && want.length > 1) { want[want.length - 1] += 1; spoiled[kind] = r; }
    const same = JSON.stringify(want) === JSON.stringify(got);
    compared++; values += want.length;
    if (same) continue;
    if (port && !controls && kind === 'woven' && r.args[0] === 'hex') {
      departed++;
      if (got[1] === -1) { valid++; continue; }  // none: the generator skips the attempt, as for the JS's null
      const why = validWoven(r, got);
      if (!why) { valid++; continue; }
      fails[kind] = (fails[kind] || 0) + 1;
      console.log(`FAIL woven ${r.level} #${r.n}: the port's board is not valid: ${why}`);
      continue;
    }
    fails[kind] = (fails[kind] || 0) + 1;
    if (!controls && fails[kind] <= 3) console.log(`FAIL ${kind} ${r.level} #${r.n}: want ${JSON.stringify(want).slice(0, 160)}\n   got ${JSON.stringify(got).slice(0, 160)}`);
  }
  const s = ((Date.now() - t) / 1000).toFixed(1);
  if (controls) {
    let caught = 0;
    for (const k of Object.keys(spoiled)) {
      const ok = fails[k] === 1;
      if (ok) caught++;
      console.log(`${ok ? 'ok  ' : 'MISS'} control ${k}: spoiled ${spoiled[k].level} #${spoiled[k].n}, ${fails[k] || 0} failed`);
    }
    console.log(`controls: ${caught} of ${Object.keys(spoiled).length} kinds caught`);
    process.exit(caught === Object.keys(spoiled).length ? 0 : 1);
  }
  const failed = Object.values(fails).reduce((a, b) => a + b, 0);
  console.log(`${js ? 'js' : path.basename(WASM)} ${port ? "(the port's mode)" : "(the JS's mode)"}: ${compared} calls (${Object.entries(counts).map(([k, v]) => k + ' ' + v).join(', ')}), ` +
    `${values} values, ${failed} failed${port ? `; Hex woven departed from the JS on ${departed}, all ${valid} of them valid or none` : ''} (${s} s)`);
  process.exit(failed ? 1 : 0);
}
main();
