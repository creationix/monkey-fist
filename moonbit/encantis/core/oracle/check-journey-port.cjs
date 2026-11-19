// The port's own Journey (journey.ents's specs_port, chosen by journey-search.cjs on core.wasm):
// every level checked by the JS's exact rules at 9e69e3a, and against what the search measured.
//
//   node check-journey-port.cjs [--wasm ../core.wasm] [--measurements fixtures/journey-port-measurements.json]
//
// For each of the 120 levels:
//   1. generate(i) of the J3-MONKEYFIST set gives the board the search chose (layout key, par, ropes,
//      size), and generate_spec + measure give every field the search stored (the
//      measurements-wasm test, on the port's table);
//   2. the board is valid by the JS's own kernels: the spec's grid and size; ropes of 2 cells or more,
//      on the board, in steps, sharing no cell and on no mirror or spring; the plan replays to an
//      empty board (G.replay) with par player taps; F.score from that plan finds the same par (and
//      says whether it is exact the same way); coverage at least the generator's floor (0.8 up to 48
//      cells, else 0.85) and F.coverage equal to the stored one; every mirror and spring used by the
//      plan, at least the spec's minimum of each by hand (F.featureStats); par * 3 at least the
//      ropes; no map twice in the Journey; at most five ropes in chapter 1; a partial slide where the
//      spec requires one or the coverage is below 0.85; the stored challenge is work + 6 (1 - wins)
//      at the stored win rate (to the stored roundings).
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const WASM = path.resolve(opt('--wasm', path.join(__dirname, '../core.wasm')));
const M = JSON.parse(fs.readFileSync(path.resolve(opt('--measurements', path.join(__dirname, 'fixtures/journey-port-measurements.json'))), 'utf8'));
const { G, F } = R.js();
globalThis.MFGame = G;
const MF = require(path.join(__dirname, '../../../web/generator.js'));
const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(WASM)), {}).exports;
if (x.t_js_mode) x.t_js_mode(args.includes('--js-mode') ? 1 : 0);  // --js-mode: test/g7.wasm on the JS's Journey (the control)
const gen = MF.wrap(x, 'wasm');
const input = s => { x.in_reset(); for (let i = 0; i < s.length; i++) x.in_push(s.charCodeAt(i)); };
const read = () => { const n = x.out_len(), o = new Array(n); for (let i = 0; i < n; i++) o[i] = x.out_get(i); return o; };

const hexInside = (b, p) => p.r >= 0 && p.r < b.H && p.q + Math.floor(p.r / 2) >= 0 && p.q + Math.floor(p.r / 2) < b.W;
const near = (hex, a, c) => { const dq = c.q - a.q, dr = c.r - a.r; return hex ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]].some(([q, r]) => q === dq && r === dr) : Math.abs(dq) + Math.abs(dr) === 1; };

function problems(b, m, i, keys) {
  const out = [], hex = b.grid === 'hex';
  if (b.grid !== m.grid || b.W !== m.W || b.H !== m.H) out.push('grid or size');
  const taken = new Set([...b.mirrors.map(x => x.cell), ...b.springs].map(p => p.q + ',' + p.r));
  for (const p of b.ropes) {
    if (p.length < 2) out.push('a rope of one cell');
    for (const [k, c] of p.entries()) {
      if (!(hex ? hexInside(b, c) : c.q >= 0 && c.r >= 0 && c.q < b.W && c.r < b.H)) out.push('a cell off the board');
      if (taken.has(c.q + ',' + c.r)) out.push('a cell taken twice');
      taken.add(c.q + ',' + c.r);
      if (k && !near(hex, p[k - 1], c)) out.push('a rope not in steps');
    }
  }
  const played = G.replay(b, b.plan);
  if (!played.solved) out.push('the plan does not clear the board');
  if (played.taps !== b.par) out.push(`the plan takes ${played.taps} player taps, par says ${b.par}`);
  const s = F.score({ ...b }, G, false);
  if (s.par !== b.par || s.exact !== b.exact) out.push(`F.score finds par ${s.par} exact ${s.exact}, the level says ${b.par} ${b.exact}`);
  const cov = F.coverage(b);
  if (cov < (b.W * b.H <= 48 ? 0.8 : 0.85)) out.push('coverage below the floor');
  if (Number(cov.toFixed(4)) !== m.coverage) out.push('coverage is not the stored one');
  if (b.mirrors.length || b.springs.length) {
    const st = F.featureStats(b, b.plan, b.par, G);
    if (!st) out.push('featureStats null');
    else {
      if (st.usedMirrors !== b.mirrors.length || st.usedSprings !== b.springs.length) out.push('a mirror or spring unused');
      if (st.manualMirrors < (m.minMirrors || 0) || st.manualSprings < (m.minSprings || 0)) out.push('too few used by hand');
    }
  }
  if (m.mirrors && !b.mirrors.length) out.push('no mirror');
  if (m.springs && !b.springs.length) out.push('no spring');
  if (b.mirrors.length < (m.minMirrors || 0) || b.springs.length < (m.minSprings || 0)) out.push('fewer mechanics than the spec asks');
  if (b.par * 3 < b.ropes.length) out.push('par under a third of the ropes');
  if (keys.has(b.layoutKey)) out.push('a map twice');
  keys.add(b.layoutKey);
  if (m.chapter === 1 && b.ropes.length > 5) out.push('more than five ropes in chapter 1');
  if ((m.requireSlide || cov < 0.85) && !played.events.includes('slide')) out.push('no partial slide');
  // (the stored win rate is rounded to 4 places, the challenge to 3 from the unrounded rate)
  if (Math.abs(m.play.work + 6 * (1 - m.play.casualWins) - m.play.challenge) > 0.0011) out.push('challenge is not work + 6 (1 - wins)');
  return out;
}

const t = Date.now(), keys = new Set();
let bad = 0, same = 0, measured = 0;
for (let i = 0; i < 120; i++) {
  const m = M[i];
  input('J3-MONKEYFIST');
  if (!x.generate(i)) { bad++; console.log(`L${i + 1}: generate made no level`); continue; }
  const b = MF.decode(read(), x.outf_get);
  const chosen = b.layoutKey === m.layoutKey && b.par === m.par && b.ropes.length === m.ropeCount && b.W === m.W && b.H === m.H;
  if (chosen) same++; else { bad++; console.log(`L${i + 1}: generate(${i}) is not the board the search chose`); }
  // the measurements-wasm test, on the port's table
  const s = gen.generateSpec(m), wins = gen.measure('journey/5/MONKEYFIST/measure/' + s.seed, s.springs.length ? 24 : 96);
  const { manualSlides, manualBounces, repeatedRopes, automaticRopes } = m.slideStats;
  const got = [s.par, s.layoutKey, Number(s.coverage.toFixed(4)), Number(wins.toFixed(4)), s.play.work, Number((s.play.work + 6 * (1 - wins)).toFixed(3)), s.slideStats, s.mechanicStats, Number(gen.targetChallenge(m.difficulty).toFixed(3))];
  const want = [m.par, m.layoutKey, m.coverage, m.play.casualWins, m.play.work, m.play.challenge, { manualSlides, manualBounces, repeatedRopes, automaticRopes }, m.mechanicStats, m.targetChallenge];
  if (JSON.stringify(got) === JSON.stringify(want)) measured++; else { bad++; console.log(`L${i + 1}: measurements differ: ${JSON.stringify(got)} vs ${JSON.stringify(want)}`); }
  const why = problems({ ...b, grid: b.grid }, m, i, keys);
  if (why.length) { bad++; console.log(`L${i + 1}: ${why.join('; ')}`); }
}
console.log(`${path.basename(WASM)}: ${same} of 120 Journey levels are the search's boards, ${measured} of 120 measure as stored; ` +
  `${bad ? bad + ' problems' : 'every level valid by the JS kernels and the search rules'} (${((Date.now() - t) / 1000).toFixed(1)} s)`);
process.exit(bad ? 1 : 0);
