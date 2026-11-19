// G5's review: the distributions of the qualities of the levels hybrid-g5.cjs --codes made, by the JS
// alone and with G5's units on the port (one JSON line per level, both boards and their times), with
// the two-sample Kolmogorov-Smirnov D of each metric and its 1% critical value.
//
//   node moonbit/encantis/core/oracle/quality-g5-report.cjs class-a.jsonl [class-b.jsonl ...]
'use strict';
const fs = require('fs');
const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
function ks(a, b) {
  const xs = [...new Set([...a, ...b])].sort((x, y) => x - y), sa = [...a].sort((x, y) => x - y), sb = [...b].sort((x, y) => x - y);
  let d = 0, i = 0, j = 0;
  for (const x of xs) { while (i < sa.length && sa[i] <= x) i++; while (j < sb.length && sb[j] <= x) j++; d = Math.max(d, Math.abs(i / sa.length - j / sb.length)); }
  return d;
}
const METRICS = {
  par: b => b.par, exact: b => b.exact ? 1 : 0, ropes: b => b.ropes.length, 'mean rope length': b => b.ropes.reduce((s, p) => s + p.length, 0) / b.ropes.length,
  coverage: b => b.coverage, challenge: b => b.play?.challenge, casualWins: b => b.play?.casualWins, work: b => b.play?.work,
  knots: b => b.constructionStats?.knots, traps: b => b.constructionStats?.traps, 'repeated depth': b => b.constructionStats?.repeatedDepth ?? 0,
  interaction: b => b.complexity?.interaction, 'complexity depth': b => b.complexity?.depth, mirrors: b => b.mirrors.length, springs: b => b.springs.length,
  'manual slides': b => b.slideStats?.manualSlides, 'used mirrors': b => b.mechanicStats?.usedMirrors ?? 0, 'used springs': b => b.mechanicStats?.usedSprings ?? 0,
};
for (const f of process.argv.slice(2)) {
  const rows = fs.readFileSync(f, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const n = rows.length, same = rows.filter(r => r.same).length, nullJs = rows.filter(r => !r.js).length, nullPort = rows.filter(r => !r.port).length;
  const crit = 1.628 * Math.sqrt(2 / n);
  console.log(`${f}: ${n} levels of ${[...new Set(rows.map(r => r.code))].join(', ')}; ${same} the same in every field; null: JS ${nullJs}, port ${nullPort}; KS 1% critical D ${crit.toFixed(3)}`);
  console.log(`  ${'metric'.padEnd(18)} ${'JS p10 / p50 / p90'.padEnd(28)} ${'port p10 / p50 / p90'.padEnd(28)} KS D`);
  const ok = rows.filter(r => r.js && r.port);
  for (const [name, f2] of Object.entries(METRICS)) {
    const a = ok.map(r => f2(r.js)).filter(Number.isFinite), b = ok.map(r => f2(r.port)).filter(Number.isFinite);
    const fmt = xs => [0.1, 0.5, 0.9].map(p => +q(xs, p).toFixed(3)).join(' / ');
    console.log(`  ${name.padEnd(18)} ${fmt(a).padEnd(28)} ${fmt(b).padEnd(28)} ${ks(a, b).toFixed(3)}`);
  }
  const tj = rows.map(r => r.msJs), tp = rows.map(r => r.msPort), ratio = rows.map(r => r.msPort / Math.max(1, r.msJs));
  console.log(`  ${'ms a level'.padEnd(18)} ${[0.1, 0.5, 0.9].map(p => q(tj, p)).join(' / ').padEnd(28)} ${[0.1, 0.5, 0.9].map(p => q(tp, p)).join(' / ').padEnd(28)} (port/JS median ${q(ratio, 0.5).toFixed(2)}; totals ${(tj.reduce((s, x) => s + x, 0) / 1000).toFixed(1)} s and ${(tp.reduce((s, x) => s + x, 0) / 1000).toFixed(1)} s)`);
}
