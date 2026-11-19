// G4's review: hex_build alone in its default mode against H.build of 9e69e3a, paired by cfg. The
// builder part of quality-hexbuild.cjs pools all 250 fixture cfgs into one distribution per
// output, which the differences between cfgs (4x5 to 32x32) dominate; a shift that is small
// against them but systematic would pass. Here each cfg is built from N new states by the JS
// twice (sets J1, J2) and by the port once (P), and each output is compared cfg by cfg:
//   z_c = (mean_P - mean_J1) / sqrt(var_P / N + var_J1 / N), and Z = sum of z_c / sqrt(cfgs),
// which is close to a standard normal if the port builds from the same law (the same for J2
// against J1: the yardstick). The rule, fixed before the port's numbers were looked at: |Z| below
// 3.29 (two-sided 0.1%: about 12 outputs in 5 groups) for every output and size group, and the
// rate of null builds likewise (a two-sample test of proportions). Every port build is checked
// valid as quality-hexbuild's builder part does (rope shapes, no rope on a mirror, the core
// kept, and the JS's intentions replays it with the depth and cost it states).
//
//   node quality-g4-paired.cjs [--seeds 8] [--wasm w] [--offset k] [--max-cells n]
// --offset k: other states (a replicate); --max-cells n: only the cfgs of n cells or fewer.
'use strict';
const path = require('path');
const R = require('./ref.cjs'), W = require('./wasm.cjs'), D = require('./dump-hexbuild.cjs'), C = require('./check-hexbuild.cjs'), Q = require('./quality-hexbuild.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const WASM = opt('--wasm', path.join(__dirname, '../test/g4.wasm'));
const N = Number(opt('--seeds', 8)), OFFSET = Number(opt('--offset', 0)), MAXC = Number(opt('--max-cells', Infinity));
const { H } = R.js();
const HI = C.internals();
const port = W.load(WASM); port.x.t_draw_exact(0);

const bendsOf = p => { let n = 0; for (let j = 2; j < p.length; j++) if (p[j][0] - p[j - 1][0] !== p[j - 1][0] - p[j - 2][0] || p[j][1] - p[j - 1][1] !== p[j - 1][1] - p[j - 2][1]) n++; return n; };
// The outputs of one build (ropes as [q, r] lists), or null.
function row(b, cells) {
  if (!b) return null;
  const lens = b.ropes.map(p => p.length), covered = lens.reduce((a, x) => a + x, 0), bends = b.ropes.map(bendsOf);
  return { ropes: b.ropes.length, coverage: covered / cells, meanLength: covered / b.ropes.length, longest: Math.max(...lens), shortest: Math.min(...lens),
    bends: bends.reduce((a, x) => a + x, 0), longestBends: Math.max(...bends), knots: b.slides, traps: b.traps, depth: b.depth, averageDepth: b.cost / b.ropes.length,
    plan: b.plan.length, extraMoves: b.plan.length - b.ropes.length };
}
const KEYS = ['ropes', 'coverage', 'meanLength', 'longest', 'shortest', 'bends', 'longestBends', 'knots', 'traps', 'depth', 'averageDepth', 'plan', 'extraMoves'];

const cases = D.read().cases.filter(c => c.cfg.W * c.cfg.H <= MAXC), sets = { J1: [], J2: [], P: [] }, bad = [];
const seedOf = (c, set, k) => C.otherSeed(c.state, { J1: 7000, J2: 7100, P: 7200 }[set] + 1000 * OFFSET + k);
const t0 = Date.now();
for (const c of cases) {
  const cells = c.cfg.W * c.cfg.H, per = { J1: [], J2: [], P: [] };
  for (let k = 0; k < N; k++) {
    for (const set of ['J1', 'J2']) {
      const [, cfg] = D.argsOf(c), b = H.build(R.mulberry32(seedOf(c, set, k)), cfg);
      per[set].push(row(b && { ropes: b.ropes.map(p => p.map(x => [x.q, x.r])), slides: b.slides, traps: b.traps, depth: b.stats.depth, cost: Math.round(b.stats.averageDepth * b.ropes.length), plan: b.plan }, cells));
    }
    port.push(C.cfgWords(c.cfg));
    const ok = port.x.t_build(seedOf(c, 'P', k) | 0, c.cfg.coverage, c.cfg.tapDepth);
    if (!ok) { per.P.push(null); continue; }
    const got = C.readBuilt(port.out());
    const b = { W: c.cfg.W, H: c.cfg.H, ropes: got.ropes.map(p => p.map(([q, r]) => ({ q, r }))) };
    const why = Q.ropeProblems(b);
    const mirrorCells = new Set(c.cfg.mirrors.map(([q, r]) => q + ',' + r));
    for (const p of b.ropes) for (const x of p) if (mirrorCells.has(x.q + ',' + x.r)) why.push('a rope on a mirror');
    c.cfg.initialRopes.forEach((p, i) => { if (JSON.stringify(got.ropes[i]) !== JSON.stringify(p)) why.push(`core rope ${i} changed`); });
    const level = { ...b, ...(c.cfg.mirrors.length ? { mirrors: c.cfg.mirrors.map(([q, r, axis]) => ({ cell: { q, r }, axis })) } : {}) };
    const t = HI.intentions(level, got.stops, got.plan);
    if (!t) why.push('intentions(level, stops, plan) fails'); else if (t.depth !== got.depth || t.cost !== got.cost) why.push('depth or cost');
    if (why.length) bad.push({ id: c.id, why });
    per.P.push(row(got, cells));
  }
  for (const s of Object.keys(sets)) sets[s].push({ c, rows: per[s] });
}

const groups = { 'up to 100 cells': a => a <= 100, '101 to 300': a => a > 100 && a <= 300, '301 to 600': a => a > 300 && a <= 600, 'over 600': a => a > 600, 'all': () => true };
const mean = xs => xs.reduce((a, x) => a + x, 0) / xs.length, vari = xs => { const m = mean(xs); return xs.reduce((a, x) => a + (x - m) ** 2, 0) / Math.max(1, xs.length - 1); };
// Z over the cfgs of a group, of set x against set y, for output k (cfgs where both have 2+ builds and some variance).
function Z(x, y, k, inGroup) {
  let sum = 0, n = 0;
  for (let i = 0; i < cases.length; i++) {
    if (!inGroup(cases[i].cfg.W * cases[i].cfg.H)) continue;
    const a = sets[x][i].rows.filter(Boolean).map(r => r[k]), b = sets[y][i].rows.filter(Boolean).map(r => r[k]);
    if (a.length < 2 || b.length < 2) continue;
    const se = Math.sqrt(vari(a) / a.length + vari(b) / b.length);
    if (!(se > 0)) continue;
    sum += (mean(a) - mean(b)) / se; n++;
  }
  return n ? sum / Math.sqrt(n) : 0;
}
let fails = [];
console.log(`paired builder comparison: ${cases.length} cfgs x ${N} states a set (J1, J2 the JS; P the port, default mode), ${((Date.now() - t0) / 1000).toFixed(0)} s; port builds invalid: ${bad.length}`);
for (const b of bad.slice(0, 5)) console.log('INVALID', b.id, b.why.join('; '));
for (const [g, f] of Object.entries(groups)) {
  const nC = cases.filter(c => f(c.cfg.W * c.cfg.H)).length;
  const nulls = s => sets[s].filter((x, i) => f(cases[i].cfg.W * cases[i].cfg.H)).reduce((a, x) => a + x.rows.filter(r => !r).length, 0);
  const tot = nC * N, zn = (() => { const p1 = nulls('P') / tot, p2 = nulls('J1') / tot, p = (p1 + p2) / 2, se = Math.sqrt(2 * p * (1 - p) / tot); return se ? (p1 - p2) / se : 0; })();
  console.log(`\n${g} (${nC} cfgs): null builds J1 ${nulls('J1')} / J2 ${nulls('J2')} / P ${nulls('P')} of ${tot} (z P-J1 ${zn.toFixed(2)})${Math.abs(zn) >= 3.29 ? '  FAIL' : ''}`);
  if (Math.abs(zn) >= 3.29) fails.push(g + ' nulls');
  console.log('  output'.padEnd(16) + 'mean J1 / J2 / P'.padEnd(34) + 'Z J2-J1   Z P-J1');
  for (const k of KEYS) {
    const m = s => mean(sets[s].filter((x, i) => f(cases[i].cfg.W * cases[i].cfg.H)).flatMap(x => x.rows.filter(Boolean).map(r => r[k])));
    const zJ = Z('J2', 'J1', k, f), zP = Z('P', 'J1', k, f);
    const fail = Math.abs(zP) >= 3.29;
    if (fail) fails.push(`${g} ${k}`);
    const v = x => (Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(3));
    console.log(`  ${k.padEnd(14)}${[m('J1'), m('J2'), m('P')].map(v).join(' / ').padEnd(34)}${zJ.toFixed(2).padStart(6)}${Math.abs(zJ) >= 3.29 ? '*' : ' '}  ${zP.toFixed(2).padStart(7)}${fail ? '  FAIL' : ''}`);
  }
}
console.log(`\n${fails.length} failed: ${fails.join(', ') || 'none'}`);
process.exit(bad.length || fails.length ? 1 : 0);
