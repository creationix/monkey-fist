// The port's Journey against the JS's, as distributions (the owner's decision of 19 Nov: the levels
// may change as long as they keep the same qualities; and on Journey: re-pick the seeds with the
// port's generator, by the game's own seed search).
//
//   node quality-journey.cjs [--seeds MONKEYFIST,QJTWO,QJTHREE,QJFOUR] [--out <dir>] [--report]
//
// For each master seed the seed search (journey-search.cjs) runs twice: on test/g7.wasm in the JS's
// mode, which is the JS's own search (its control reproduces grid-journey.js seed for seed), and on
// core.wasm, the port. A master seed changes the plan (kinds, sizes) as well as the map seeds, so
// the two sides of a seed share every specification. Every level of every port Journey is checked
// valid by the JS's kernels (check-journey-port.cjs's rules, through generate_spec).
//
// The rule, fixed before any of these Journeys was looked at (19 Nov, 12:00):
//   - every port level valid;
//   - for each metric below, the two-sample Kolmogorov-Smirnov test of the port's levels (all seeds
//     pooled) against the JS's must not reject at the 1% level (D < 1.628 sqrt((n + m) / (n m)));
//     the same on the Hex levels alone (the square levels are the JS's, only reordered). Discrete
//     metrics make the test conservative. The largest D between two JS master seeds (120 against
//     120) is printed beside it as the yardstick for noise;
//   - the share of candidates the generator gives up on (none), port against JS, by a two-sided
//     test of proportions at 1%;
//   - the 10th, 50th and 90th percentiles of every metric, both sides, are printed;
//   - a failure is looked at with more seeds, not waived.
'use strict';
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
const R = require('./ref.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const SEEDS = opt('--seeds', 'MONKEYFIST,QJTWO,QJTHREE,QJFOUR').split(',');
const OUT = path.resolve(opt('--out', '/home/user/mf-core-scratch/g7/quality-journey'));
const G7 = path.join(__dirname, '../test/g7.wasm'), CORE = path.join(__dirname, '../core.wasm');

const METRICS = {
  par: m => m.par, ropes: m => m.ropeCount, area: m => m.W * m.H, coverage: m => m.coverage,
  casualWins: m => m.play.casualWins, work: m => m.play.work, challenge: m => m.play.challenge,
  miss: m => Math.abs(m.play.challenge - m.targetChallenge), over: m => m.over,
  seedAttempt: m => m.seedAttempt,
  slides: m => m.slideStats.manualSlides, bounces: m => m.slideStats.manualBounces,
  repeated: m => m.slideStats.repeatedRopes, automatic: m => m.slideStats.automaticRopes,
  interaction: m => m.complexity.interaction, joins: m => m.complexity.joins, mutual: m => m.complexity.mutualWaitRopes,
  revisited: m => m.complexity.revisitedRopes, branching: m => m.complexity.branchingDepth, largest: m => m.complexity.largestCoupledGroup,
  edges: m => m.complexity.edges, depth: m => m.complexity.depth,
  usedMirrors: m => m.mechanicStats ? m.mechanicStats.usedMirrors : null, usedSprings: m => m.mechanicStats ? m.mechanicStats.usedSprings : null,
  ropeLength: m => m.meanLength, turns: m => m.turns,
};

function search(seed, port) {
  const dir = path.join(OUT, (port ? 'port-' : 'js-') + seed);
  const meas = path.join(dir, 'journey-port-measurements.json');
  if (!fs.existsSync(meas)) {
    const out = execFileSync('node', [path.join(__dirname, 'journey-search.cjs'), '--wasm', port ? CORE : G7, ...(port ? [] : ['--js-mode']), '--seed', seed, '--out', dir],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 });
    fs.writeFileSync(path.join(dir, 'search.log'), out);
  }
  return { levels: JSON.parse(fs.readFileSync(meas, 'utf8')), log: fs.readFileSync(path.join(dir, 'search.log'), 'utf8') };
}

// Each level's board again (generate_spec on the side's wasm), for what the measurements lack (rope
// lengths, the cells where a rope turns) and for validity.
function boards(levels, port) {
  const { G, F } = R.js();
  globalThis.MFGame = G;
  const MF = require(path.join(__dirname, '../../../web/generator.js'));
  const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(port ? CORE : G7)), {}).exports;
  if (x.t_js_mode) x.t_js_mode(port ? 0 : 1);
  const gen = MF.wrap(x, 'wasm'), bad = [];
  for (const [i, m] of levels.entries()) {
    const b = gen.generateSpec(m);
    if (b.layoutKey !== m.layoutKey) bad.push(`L${i + 1}: not the board the search chose`);
    const played = G.replay(b, b.plan);
    if (!played.solved || played.taps !== b.par) bad.push(`L${i + 1}: the plan does not clear the board at par`);
    const cells = b.ropes.reduce((s, p) => s + p.length, 0);
    m.meanLength = cells / b.ropes.length;
    let turns = 0;
    for (const p of b.ropes) for (let k = 2; k < p.length; k++) if (p[k].q - p[k - 1].q !== p[k - 1].q - p[k - 2].q || p[k].r - p[k - 1].r !== p[k - 1].r - p[k - 2].r) turns++;
    m.turns = turns;
    m.over = Math.max(0, m.play.casualWins - F.winCeiling(m.difficulty));
    if (!(F.coverage(b) >= (b.W * b.H <= 48 ? 0.8 : 0.85))) bad.push(`L${i + 1}: coverage below the floor`);
  }
  return bad;
}

const ks = (a, b) => {
  a = a.filter(v => v !== null).sort((x, y) => x - y); b = b.filter(v => v !== null).sort((x, y) => x - y);
  if (!a.length || !b.length) return { d: 0, crit: 1, n: a.length, m: b.length };
  let i = 0, j = 0, d = 0;
  while (i < a.length && j < b.length) {
    const v = Math.min(a[i], b[j]);
    while (i < a.length && a[i] === v) i++;
    while (j < b.length && b[j] === v) j++;
    d = Math.max(d, Math.abs(i / a.length - j / b.length));
  }
  return { d, crit: 1.628 * Math.sqrt((a.length + b.length) / (a.length * b.length)), n: a.length, m: b.length };
};
const pct = (xs, p) => { xs = xs.filter(v => v !== null).sort((x, y) => x - y); return xs.length ? xs[Math.min(xs.length - 1, Math.floor(p * xs.length))] : NaN; };
const f = v => Number.isInteger(v) ? String(v) : v.toFixed(3);

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const sides = { js: [], port: [] }, perSeed = { js: {}, port: {} }, counts = { js: { made: 0, none: 0 }, port: { made: 0, none: 0 } };
  let invalid = 0;
  const t = Date.now();
  for (const seed of SEEDS) for (const port of [false, true]) {
    const side = port ? 'port' : 'js', { levels, log } = search(seed, port);
    const bad = boards(levels, port);
    if (port && bad.length) { invalid += bad.length; for (const b of bad) console.log(`INVALID ${seed} ${b}`); }
    const mm = log.match(/candidates (\d+) made, (\d+) none/);
    counts[side].made += +mm[1]; counts[side].none += +mm[2];
    for (const m of levels) m.seed_ = seed;
    sides[side].push(...levels);
    perSeed[side][seed] = levels;
  }
  console.log(`Journeys: ${SEEDS.length} master seeds x (JS, port), ${sides.js.length} + ${sides.port.length} levels; ${invalid} invalid port levels (${((Date.now() - t) / 1000).toFixed(0)} s)`);
  // candidates the generator gives up on
  const p1 = counts.js.none / (counts.js.made + counts.js.none), p2 = counts.port.none / (counts.port.made + counts.port.none);
  const n1 = counts.js.made + counts.js.none, n2 = counts.port.made + counts.port.none, pp = (counts.js.none + counts.port.none) / (n1 + n2);
  const z = (p2 - p1) / Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2));
  const noneOk = Math.abs(z) < 2.576;
  console.log(`candidates given up on: JS ${counts.js.none} of ${n1} (${(100 * p1).toFixed(1)}%), port ${counts.port.none} of ${n2} (${(100 * p2).toFixed(1)}%); z ${z.toFixed(2)} ${noneOk ? 'ok' : 'FAIL'}`);
  let fails = 0, tests = 0;
  for (const subset of ['all', 'hex']) {
    const pick = xs => subset === 'all' ? xs : xs.filter(m => m.grid === 'hex');
    console.log(`\n${subset === 'all' ? 'All levels' : 'Hex levels'}: metric | JS p10 p50 p90 | port p10 p50 p90 | D (crit) | JS seeds' largest D`);
    for (const [name, get] of Object.entries(METRICS)) {
      const a = pick(sides.js).map(get), b = pick(sides.port).map(get);
      const r = ks(a, b);
      let yard = 0;
      for (let i = 0; i < SEEDS.length; i++) for (let j = i + 1; j < SEEDS.length; j++) yard = Math.max(yard, ks(pick(perSeed.js[SEEDS[i]]).map(get), pick(perSeed.js[SEEDS[j]]).map(get)).d);
      const ok = r.d < r.crit; tests++; if (!ok) fails++;
      console.log(`  ${name.padEnd(12)} | ${[0.1, 0.5, 0.9].map(p => f(pct(a, p))).join(' ')} | ${[0.1, 0.5, 0.9].map(p => f(pct(b, p))).join(' ')} | ${r.d.toFixed(3)} (${r.crit.toFixed(3)}) ${ok ? 'ok' : 'FAIL'} | ${yard.toFixed(3)}`);
    }
  }
  console.log(`\nKS: ${tests - fails} of ${tests} pass; given-up share ${noneOk ? 'passes' : 'FAILS'}; port levels invalid: ${invalid}`);
  process.exit(fails || !noneOk || invalid ? 1 : 0);
}
main();
