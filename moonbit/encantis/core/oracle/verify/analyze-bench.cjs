// Summaries of a bench session: node-steady.json / chromium-steady.json (interleaved), node-iso.jsonl, *-cold.jsonl.
//   node analyze-bench.cjs <dir>
const fs = require('fs'), path = require('path'), dir = process.argv[2];
const med = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const q = (a, p) => { const s = [...a].sort((x, y) => x - y), h = (s.length - 1) * p, lo = Math.floor(h); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (h - lo); };
const f0 = x => Math.round(x).toLocaleString('en-US');
function steady(file, label) {
  if (!fs.existsSync(file)) return;
  let o = JSON.parse(fs.readFileSync(file, 'utf8')); if (o.generation && o.generation.generation) o = o.generation;
  console.log(`\n${label}: steady median (range) of rounds 2..R | round 1 | MoonBit wasm-gc / it`);
  const mb = o.generation['MoonBit wasm-gc'].median;
  for (const [k, v] of Object.entries(o.generation)) console.log(`  ${k.padEnd(30)} ${f0(v.median)} (${f0(v.min)}-${f0(v.max)}) | ${f0(v.firstRound)} | ${(mb / v.median).toFixed(2)}x | same as JS ${v.levelsSameAsJs}`);
  const g7 = o.perLevel['Encantis g7 (JS mode)'], m = o.perLevel['MoonBit wasm-gc'], js = o.perLevel['JS reference'], core = o.perLevel['Encantis core.wasm'];
  const r = m.map((x, i) => x / g7[i]), rj = js.map((x, i) => x / g7[i]);
  console.log(`  per level (last round) MoonBit/g7: median ${med(r).toFixed(2)}x, p10 ${q(r, .1).toFixed(2)}x, p90 ${q(r, .9).toFixed(2)}x; JS/g7 median ${med(rj).toFixed(1)}x (p10 ${q(rj, .1).toFixed(1)}, p90 ${q(rj, .9).toFixed(1)})`);
  const mx = k => Math.max(...o.perLevel[k]).toFixed(0);
  console.log(`  slowest level ms: core ${mx('Encantis core.wasm')}, g7 ${mx('Encantis g7 (JS mode)')}, MoonBit wasm-gc ${mx('MoonBit wasm-gc')}, MoonBit JS ${mx('MoonBit JS')}, JS ${mx('JS reference')}`);
  const w12 = k => o.perLevel[k].slice(0, 12).reduce((a, b) => a + b, 0).toFixed(1);
  console.log(`  warm first 12 (last round): g7 ${w12('Encantis g7 (JS mode)')}, MoonBit wasm-gc ${w12('MoonBit wasm-gc')}, JS ${w12('JS reference')}`);
  if (o.kernels && o.kernels.length) for (const row of o.kernels) for (const [kk, c] of Object.entries(row)) if (c && c['MoonBit wasm-gc']) {
    const e = c['Encantis g7 (JS mode)'];
    console.log(`  L${row.level} ${kk.padEnd(12)} g7 ${e.median.toFixed(3)} g7-O ${c['Encantis g7 -O (JS mode)'].median.toFixed(3)} MB ${c['MoonBit wasm-gc'].median.toFixed(3)} MBJS ${c['MoonBit JS'].median.toFixed(3)} JS ${c['JS reference'].median.toFixed(2)}  MB/g7 ${(c['MoonBit wasm-gc'].median / e.median).toFixed(2)}x agree ${c.agree}`);
  }
}
function iso(file) {
  if (!fs.existsSync(file)) return;
  const rows = fs.readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse), by = {};
  for (const r of rows) (by[path.basename(r.engine)] ||= []).push(r);
  console.log('\nNode isolated (one engine per process): steady median (range) of rounds 2..R pooled over processes | round 1s');
  const res = {};
  for (const [k, rs] of Object.entries(by)) { const st = rs.flatMap(r => r.rounds.slice(1)); res[k] = med(st);
    console.log(`  ${k.padEnd(12)} ${f0(med(st))} (${f0(Math.min(...st))}-${f0(Math.max(...st))}) | ${rs.map(r => f0(r.rounds[0])).join(', ')} | keys ${[...new Set(rs.map(r => r.keysHash))].join(',')}`); }
  if (res.mbwasm) for (const k of Object.keys(res)) console.log(`  MoonBit wasm-gc / ${k}: ${(res.mbwasm / res[k]).toFixed(2)}x`);
  const g7 = by['g7.wasm'], mb = by.mbwasm;
  if (g7 && mb) { const a = g7[g7.length - 1].lastPerLevel, b = mb[mb.length - 1].lastPerLevel, r = b.map((x, i) => x / a[i]);
    console.log(`  per level MB/g7 (last round of last process): median ${med(r).toFixed(2)}x p10 ${q(r, .1).toFixed(2)} p90 ${q(r, .9).toFixed(2)}; slowest g7 ${Math.max(...a).toFixed(0)} MB ${Math.max(...b).toFixed(0)}`); }
}
function cold(file, label) {
  if (!fs.existsSync(file)) return;
  const rows = fs.readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse), by = {};
  for (const r of rows) (by[r.engine] ||= []).push(r);
  console.log(`\n${label}: median (range) over ${Object.values(by)[0].length} fresh processes: load | load + level 1 | first 12`);
  for (const [k, rs] of Object.entries(by)) { const l = rs.map(r => r.loadMs), a = rs.map(r => r.loadToFirstLevelMs ?? r.loadMs + r.firstLevelMs), b = rs.map(r => r.first12Ms);
    console.log(`  ${k.padEnd(28)} ${med(l).toFixed(1)} | ${med(a).toFixed(1)} (${Math.min(...a).toFixed(1)}-${Math.max(...a).toFixed(1)}) | ${med(b).toFixed(1)} (${Math.min(...b).toFixed(0)}-${Math.max(...b).toFixed(0)})`); }
}
steady(path.join(dir, 'node-steady.json'), 'Node interleaved'); iso(path.join(dir, 'node-iso.jsonl'));
cold(path.join(dir, 'node-cold.jsonl'), 'Node cold'); steady(path.join(dir, 'chromium-steady.json'), 'Chromium interleaved'); cold(path.join(dir, 'chromium-cold.jsonl'), 'Chromium cold');
