// Verification: generation quality of the shipping core.wasm against the real JS generator (G.generate
// at 9e69e3a), on set codes and seeds of my own (suffix VQ*), not those of G4/G7/the review.
//   node quality-verify.cjs --levels [--part k/n]     one JSON line per (class, index)
//   node quality-verify.cjs --report
// Sets: A = JS on code <stem>VQA, B = JS on <stem>VQB, P = core.wasm on <stem>VQP (its own mode), and
// C = core.wasm on <stem>VQA (check (c): a square level must equal A's; a Hex one may differ).
// Rule, fixed before any level was made (19 Nov 2026, about 16:00): every P level valid by the JS's
// kernels; per class and metric a two-sample KS test of P against A+B pooled must not reject at 1%
// (D < 1.628 sqrt((n+m)/(nm))); A against B printed as the yardstick; the share given up on compared by a
// two-proportion z (|z| < 2.576); every square C level equal to A's.
'use strict';
const fs = require('fs'), path = require('path');
const ORA = '/home/user/mf-verify/moonbit/encantis/core/oracle';
const R = require(path.join(ORA, 'ref.cjs'));
const QH = require(path.join(ORA, 'quality-hexbuild.cjs'));
const { G, F, L, Q } = R.js();
globalThis.MFGame = G;
const MF = require('/home/user/mf-verify/moonbit/web/generator.js');
const args = process.argv.slice(2);
const opt = (n, f) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : f; };
const OUT = opt('--out', '/home/user/mf-core-scratch/verify/quality');
const WASM = '/home/user/mf-verify/moonbit/encantis/core/core.wasm';

const CLASSES = {
  hexMS12: 'U3-H-1-100-12-12-200-MS-',
  hexN8x10: 'U3-H-1-100-8-10-200-N-',
  hexM18x16: 'U3-H-1-100-18-16-120-M-',
  hexS40: 'U3-H-40-100-10-14-150-S-',
  hexStrip: 'U3-H-1-100-20-6-120-N-',
  mixed: 'U3-M-1-100-14-12-160-MS-',
  square: 'U3-S-1-100-12-12-100-MS-',
};

let W = null;
function wasm() {
  if (W) return W;
  const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(WASM)), {}).exports;
  return (W = MF.wrap(x, 'wasm'));
}
function js(o, i) { try { return G.generate({ ...o, index: i }); } catch (e) { if (/densely|No board/.test(e.message)) return null; throw e; } }
function port(o, i) { try { return wasm().generate({ ...o, index: i }); } catch (e) { if (/No board fits/.test(e.message)) return null; throw e; } }

const turnsOf = lv => { let t = 0; for (const p of lv.ropes) for (let k = 2; k < p.length; k++) if (p[k].q - p[k - 1].q !== p[k - 1].q - p[k - 2].q || p[k].r - p[k - 1].r !== p[k - 1].r - p[k - 2].r) t++; return t; };
const fp = b => JSON.stringify([b.grid, b.W, b.H, b.ropes, b.mirrors, b.springs, b.plan, b.par, !!b.exact, b.layoutKey, b.coverage, b.play, b.slideStats.manualSlides,
  b.slideStats.manualBounces, b.slideStats.repeatedRopes, b.slideStats.automaticRopes, b.mechanicStats || null]);
function metrics(lv, spec) {
  if (!lv) return { ok: 0 };
  const lens = lv.ropes.map(p => p.length), cx = spec.colossal ? null : Q.analyze(lv, lv.plan, lv.par, G), ms = lv.mechanicStats || {};
  return { ok: 1, grid: lv.grid, par: lv.par, ropes: lv.ropes.length, meanLength: lens.reduce((a, b) => a + b, 0) / lens.length, longest: Math.max(...lens),
    coverage: lv.coverage, wins: lv.play.casualWins, challenge: lv.play.challenge, offTarget: Math.abs(lv.play.challenge - F.targetChallenge(spec.difficulty)),
    overCeiling: Math.max(0, lv.play.casualWins - F.winCeiling(spec.difficulty)), manualSlides: lv.slideStats.manualSlides, bounces: lv.slideStats.manualBounces,
    repeated: lv.slideStats.repeatedRopes, automatic: lv.slideStats.automaticRopes, mirrors: lv.mirrors.length, spinners: lv.springs.length,
    manualMirrors: ms.manualMirrors ?? 0, manualSprings: ms.manualSprings ?? 0, turns: turnsOf(lv),
    interaction: cx ? cx.interaction : null, mutualWait: cx ? cx.mutualWaitRopes : null, coupled: cx ? cx.largestCoupledGroup : null, edges: cx ? cx.edges : null };
}
function problems(lv, spec) {
  const bad = [...QH.levelProblems(lv, spec)];
  if (!F.valid(lv)) bad.push('F.valid');
  const cov = F.coverage(lv); if (cov !== lv.coverage) bad.push('coverage');
  if (cov < (lv.W * lv.H <= 48 ? 0.8 : 0.85)) bad.push('coverage floor');
  if (lv.mirrors.length || lv.springs.length) {
    const s = F.featureStats(lv, lv.plan, lv.par, G);
    if (JSON.stringify(s) !== JSON.stringify(lv.mechanicStats)) bad.push('featureStats');
    else if (s.usedMirrors !== lv.mirrors.length || s.usedSprings !== lv.springs.length) bad.push('unused feature');
  }
  if (G.allFree(lv, lv.ropes)) bad.push('all free');
  if (lv.par * 3 < lv.ropes.length) bad.push('par*3 < ropes');
  if (!spec.colossal) {
    let ok = false;
    for (let a = 0; a < 10 && !ok; a++) ok = F.casualRate(lv, G, L.mulberry32(L.hashString('casual/' + spec.seed + '/' + a)), lv.springs.length ? 10 : 32) === lv.play.casualWins;
    if (!ok) bad.push('casual wins');
  }
  if (Number(F.challengeOf(lv.play.work, lv.play.casualWins).toFixed(3)) !== lv.play.challenge) bad.push('challenge');
  return bad;
}

function levels(part) {
  const [k, n] = (part || '0/1').split('/').map(Number);
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `rows-${k}of${n}.jsonl`);
  const done = new Set(fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l).key) : []);
  let j = 0;
  for (const [name, stem] of Object.entries(CLASSES)) {
    const oA = G.parseCode(stem + 'VQA'), oB = G.parseCode(stem + 'VQB'), oP = G.parseCode(stem + 'VQP');
    if (!oA || !oB || !oP) throw Error('bad code ' + stem);
    for (let i = 0; i < oA.count; i++, j++) {
      const key = name + '#' + i;
      if (j % n !== k || done.has(key)) continue;
      const a = js(oA, i), b = js(oB, i), p = port(oP, i), c = port(oA, i);
      const sA = G.spec(oA, i), sB = G.spec(oB, i), sP = G.spec(oP, i);
      const row = { key, cls: name, d: sP.difficulty, A: metrics(a, sA), B: metrics(b, sB), P: metrics(p, sP) };
      if (p) { const bad = problems(p, sP); if (bad.length) row.P.invalid = bad; }
      row.C = { grid: (c || a || {}).grid, same: a && c ? Number(fp(a) === fp(c)) : Number(!a && !c) };
      fs.appendFileSync(file, JSON.stringify(row) + '\n');
    }
  }
}

const ks = QH.ks, crit = QH.ksCritical;
const quantile = (xs, p) => { const s = [...xs].sort((a, b) => a - b); const h = (s.length - 1) * p, lo = Math.floor(h); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (h - lo); };
const z2 = (k1, n1, k2, n2) => { const p = (k1 + k2) / (n1 + n2), se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2)); return se ? (k1 / n1 - k2 / n2) / se : 0; };
function report() {
  const rows = [];
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.jsonl')) for (const l of fs.readFileSync(path.join(OUT, f), 'utf8').trim().split('\n')) if (l) rows.push(JSON.parse(l));
  const KEYS = ['par', 'ropes', 'meanLength', 'longest', 'coverage', 'wins', 'challenge', 'offTarget', 'overCeiling', 'manualSlides', 'bounces', 'repeated', 'automatic',
    'mirrors', 'spinners', 'manualMirrors', 'manualSprings', 'turns', 'interaction', 'mutualWait', 'coupled', 'edges'];
  let tests = 0, rejected = 0, maxRatio = 0, maxAB = 0, maxAt = '', invalid = 0, made = 0, sq = 0, sqSame = 0, hexC = 0, hexSame = 0;
  for (const name of Object.keys(CLASSES)) {
    const rs = rows.filter(r => r.cls === name);
    if (!rs.length) continue;
    const ok = s => rs.filter(r => r[s].ok).length;
    for (const r of rs) { if (r.P.ok) made++; if (r.P.invalid) { invalid++; console.log('INVALID', r.key, r.P.invalid.join(',')); }
      if (r.C.grid === 'square') { sq++; sqSame += r.C.same; if (!r.C.same) console.log('CHECK C square differs', r.key); } else { hexC++; hexSame += r.C.same; } }
    const z = z2(ok('P'), rs.length, ok('A') + ok('B'), 2 * rs.length);
    console.log(`\n${name}: ${rs.length} specs; given up on A ${rs.length - ok('A')}, B ${rs.length - ok('B')}, P ${rs.length - ok('P')} (z ${z.toFixed(2)})${Math.abs(z) >= 2.576 ? ' REJECTED' : ''}`);
    if (Math.abs(z) >= 2.576) rejected++;
    for (const k of KEYS) {
      const v = s => rs.filter(r => r[s].ok && r[s][k] !== null && r[s][k] !== undefined).map(r => r[s][k]);
      const a = v('A'), b = v('B'), p = v('P');
      if (!a.length || !p.length) continue;
      const dP = ks(p, [...a, ...b]), c = crit(p.length, a.length + b.length), dAB = ks(a, b), cAB = crit(a.length, b.length);
      tests++; if (dP >= c) rejected++;
      if (dP / c > maxRatio) { maxRatio = dP / c; maxAt = name + ' ' + k; }
      maxAB = Math.max(maxAB, dAB / cAB);
      const q = x => [0.1, 0.5, 0.9].map(t => +quantile(x, t).toFixed(3)).join('/');
      console.log(`  ${k.padEnd(14)} A ${q(a).padEnd(22)} B ${q(b).padEnd(22)} P ${q(p).padEnd(22)} D(A,B) ${dAB.toFixed(3)}  D(P,AB) ${dP.toFixed(3)}  crit ${c.toFixed(3)}${dP >= c ? '  REJECTED' : ''}`);
    }
  }
  console.log(`\nP levels made ${made}, invalid ${invalid}; KS tests ${tests} (+ failure-rate z per class), rejected ${rejected}; largest D/crit port ${maxRatio.toFixed(2)} (${maxAt}), JS-JS ${maxAB.toFixed(2)}; check (c): square ${sqSame} of ${sq} equal, Hex ${hexSame} of ${hexC} equal anyway`);
}
if (args.includes('--levels')) levels(opt('--part'));
else if (args.includes('--report')) report();
else console.log('usage: --levels [--part k/n] | --report');
