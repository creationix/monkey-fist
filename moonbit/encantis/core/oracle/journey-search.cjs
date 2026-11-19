// The Journey's seed search (scripts/build-grid-journey.cjs at 9e69e3a) run on a wasm core
// instead of the JS generator: the same plan of 120 positions (kinds, sizes, difficulties, the map
// seeds of each attempt), the same candidates per position (6 + 10, chapter 1: 12 + 30), the same
// size step-up when no seed works, the same rules (the generator's own, then no map twice and at
// most five ropes in chapter 1), the same measurement (96 casual games, 24 with spinners, seeded
// by journey/5/<seed>/measure/<map seed>), the same choice (the candidate closest to the target
// challenge, one above the win ceiling only if none is below it) and the same order within each
// chapter. Only F.generate and F.casualRate are the wasm's: generate_spec and measure, through
// web/generator.js's own wrap (decode).
//
//   node journey-search.cjs [--wasm ../core.wasm] [--js-mode] [--out <dir>] [--seed MONKEYFIST]
//
// Writes <dir>/journey-port.js (grid-journey.js's runtime source: specifications and map seeds) and
// <dir>/journey-port-measurements.json (what the builder measured; complexity is the JS's
// Q.analyze of each chosen board, with its plan and par; slideStats.interleavedRopes is left out:
// the wasm does not say which ropes came from the core). Default dir: fixtures/.
//
// --js-mode (with test/g7.wasm, which has t_js_mode) runs the search on the JS's draws: the
// positive control, which must give grid-journey.js again, seed for seed, and its measurements.
'use strict';
const fs = require('fs'), path = require('path');
const R = require('./ref.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const WASM = path.resolve(opt('--wasm', path.join(__dirname, '../core.wasm')));
const OUT = path.resolve(opt('--out', path.join(__dirname, 'fixtures')));
const NAME = opt('--name', 'journey-port');

const { G, F, L, Q } = R.js();
globalThis.MFGame = G;
const MF = require(path.join(__dirname, '../../../web/generator.js'));
const { runtimeSource } = require(path.join(R.dir, 'scripts/lib/journey-files.cjs'));
const x = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(WASM)), {}).exports;
if (args.includes('--js-mode')) { if (!x.t_js_mode) throw Error('--js-mode needs test/g7.wasm'); x.t_js_mode(1); }
else if (x.t_js_mode) x.t_js_mode(0);
const gen = MF.wrap(x, 'wasm');

// --- build-grid-journey.cjs, unchanged but for generate and casualRate ---
const options = { seed: G.cleanSeed(opt('--seed', 'MONKEYFIST')) }, BUILD = 'journey/5/' + options.seed;
const mapSeed = (spec, attempt) => L.hashString(BUILD + '/map/' + spec.chapter + '/' + spec.slot + '/' + attempt).toString(36).toUpperCase();
const pick = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
const kindOf = b => b.mirrors && b.springs ? 'B' : b.mirrors ? 'M' : b.springs ? 'S' : 'P';
const rngFor = label => L.mulberry32(L.hashString(BUILD + '/' + label));
function shuffle(list, rng) {
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}
function chapterKinds(chapter) {
  const kinds = chapter === 1 ? 'PPPPPPPPPP' : chapter === 2 ? 'PPPPMMMMBS' : chapter === 3 ? 'PPMMMSSBBB' : 'PMMMSSBBBB';
  return chapter === 1 ? [...kinds] : shuffle([...kinds], rngFor('kinds/' + chapter));
}
const difficultyAt = i => i < 10 ? 1 + 39 * (i % 5) / 4 : 20 + 80 * Math.pow((i - 10) / 109, 1.05);
function sizeFor(chapter, slot, kind, grid) {
  const rng = rngFor('size/' + chapter + '/' + slot + '/' + kind + '/' + grid);
  if (chapter === 1) return grid === 'hex' ? [pick(rng, 4, 5), pick(rng, 5, 6)] : [4, pick(rng, 5, 6)];
  const lo = 64 + 8 * (chapter - 2), hi = Math.min(192, 100 + 9 * (chapter - 2));
  for (let tries = 0; tries < 200; tries++) {
    const W = pick(rng, kind === 'P' ? 7 : 8, 12), H = pick(rng, Math.max(W, 8), 16);
    if (W * H >= lo && W * H <= hi) return [W, H];
  }
  return [10, 12];
}
function plan() {
  const specs = [];
  for (let chapter = 1; chapter <= 12; chapter++) {
    const kinds = chapterKinds(chapter);
    for (let slot = 0; slot < 10; slot++) {
      const i = (chapter - 1) * 10 + slot, kind = kinds[slot], mirrors = kind === 'M' || kind === 'B', springs = kind === 'S' || kind === 'B';
      const grid = chapter === 1 ? slot < 5 ? 'square' : 'hex' : slot % 2 ? 'hex' : 'square';
      const [W, H] = sizeFor(chapter, slot, kind, grid), difficulty = Number(difficultyAt(i).toFixed(3));
      if (W > 12 || H > 16) throw Error('Journey exceeds moderate grid bounds');
      const spec = { grid, W, H, difficulty, mirrors, springs, chapter, slot, journeySeed: options.seed, seedAttempt: 0,
        ...(chapter === 1 && (slot === 4 || slot >= 8) ? { requireSlide: true } : {}),
        ...(mirrors ? { minMirrors: chapter === 2 ? kind === 'B' ? 2 : 1 : chapter === 3 ? 2 : 3 } : {}),
        ...(springs ? { minSprings: chapter < 4 ? 1 : 2 } : {}) };
      spec.seed = mapSeed(spec, 0); specs.push(spec);
    }
  }
  return specs;
}
// F.casualRate(b, G, mulberry32(hashString(BUILD + '/measure/' + seed)), games) is the wasm's measure().
function measure(b) {
  const wins = gen.measure(BUILD + '/measure/' + b.seed, b.springs.length ? 24 : 96);
  return { casualWins: Number(wins.toFixed(4)), work: b.play.work, challenge: Number(F.challengeOf(b.play.work, wins).toFixed(3)) };
}
function acceptable(spec, candidate, levels) {
  const key = candidate.layoutKey;
  return !levels.some(level => level.layoutKey === key) && !(spec.chapter === 1 && candidate.ropes.length > 5);
}
const byChallenge = (a, b) => a.play.challenge - b.play.challenge || a.par - b.par || a.ropeCount - b.ropeCount || a.seed.localeCompare(b.seed);
function orderChapter(chapter, cards) {
  cards.sort(byChallenge);
  if (chapter < 4) return cards;
  const plain = cards.filter(b => kindOf(b) === 'P'), featured = cards.filter(b => kindOf(b) !== 'P');
  if (plain.length !== 1) throw Error('Expected one plain-rules interlude');
  featured.splice(3 + chapter % 4, 0, plain[0]); return featured;
}
const specs = plan(), levels = [];
const CANDIDATES = 6, EXTRA = 10;
const t0 = Date.now(), counts = { generated: 0, failed: 0, rejected: 0, measured: 0 };
let generateMs = 0, measureMs = 0;
for (const [i, source] of specs.entries()) {
  const target = F.targetChallenge(source.difficulty), wanted = CANDIDATES + (source.chapter === 1 ? 6 : 0), extra = EXTRA + (source.chapter === 1 ? 20 : 0);
  let chosen = null, tried = 0, attempt = 0;
  for (let size = [source.W, source.H], step = 0; !chosen && step < 3; size = [Math.min(12, size[0] + 1), Math.min(16, size[1] + 2)], step++) {
   if (step && size[0] === source.W && size[1] === source.H) break;
   for (let local = 0; local < wanted + extra && (tried < wanted || !chosen || chosen.over); local++, attempt++) {
    const spec = { ...source, W: size[0], H: size[1], seedAttempt: attempt, seed: mapSeed(source, attempt) };
    let candidate;
    const tg = performance.now();
    try { candidate = gen.generateSpec(spec); counts.generated++; }
    catch (error) { counts.failed++; continue; }
    finally { generateMs += performance.now() - tg; }
    if (!acceptable(spec, candidate, levels)) { counts.rejected++; continue; }
    tried++;
    const tm = performance.now();
    const play = measure(candidate), over = Math.max(0, play.casualWins - F.winCeiling(source.difficulty)), miss = Math.abs(play.challenge - target) + (over ? 10 + over * 20 : 0);
    measureMs += performance.now() - tm; counts.measured++;
    if (!chosen || miss < chosen.miss) chosen = { spec, candidate, play, miss, over: over > 0 };
   }
  }
  if (!chosen) throw Error('Could not create a dense Journey level: ' + JSON.stringify(source));
  const { spec, candidate: board, play } = chosen;
  // complexity: the JS's own analysis of the chosen board (the wasm does not report it)
  const complexity = Q.analyze(board, board.plan, board.par, G);
  const { interleavedRopes, ...slideStats } = { interleavedRopes: 0, ...board.slideStats };
  const metadata = { ...spec, par: board.par, ropeCount: board.ropes.length, coverage: Number(board.coverage.toFixed(4)), play, targetChallenge: Number(target.toFixed(3)),
    complexity, slideStats, ...(board.mechanicStats ? { mechanicStats: board.mechanicStats } : {}) };
  metadata.layoutKey = board.layoutKey;
  if (spec.chapter === 1) metadata.openingChallenge = play.challenge;
  levels.push(metadata);
  process.stderr.write(`${i + 1}: ${kindOf(spec)} ${board.grid} ${spec.W}x${spec.H} attempt ${spec.seedAttempt}, ${board.ropes.length} ropes / ${board.par} taps, challenge ${play.challenge} (target ${target.toFixed(2)}), casual ${(play.casualWins * 100).toFixed(0)}%\n`);
}
for (let chapter = 1; chapter <= 12; chapter++) levels.splice((chapter - 1) * 10, 10, ...orderChapter(chapter, levels.slice((chapter - 1) * 10, chapter * 10)));
for (let chapter = 1; chapter <= 12; chapter++) {
  const cards = levels.slice((chapter - 1) * 10, chapter * 10), expected = chapterKinds(chapter).reduce((a, k) => (a[k] = (a[k] || 0) + 1, a), {});
  const kinds = cards.reduce((a, b) => (a[kindOf(b)] = (a[kindOf(b)] || 0) + 1, a), {});
  if (JSON.stringify(Object.entries(kinds).sort()) !== JSON.stringify(Object.entries(expected).sort())) throw Error('Mechanic quotas changed after ordering');
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, NAME + '.js'), runtimeSource(levels, options.seed)
  .replace('// Generated by scripts/build-grid-journey.cjs', '// Generated by moonbit/encantis/core/oracle/journey-search.cjs (build-grid-journey.cjs on ' + path.basename(WASM) + (args.includes('--js-mode') ? ", the JS's mode" : '') + ')')
  .replace('scripts/grid-journey-measurements.json', NAME + '-measurements.json'));
fs.writeFileSync(path.join(OUT, NAME + '-measurements.json'), JSON.stringify(levels, null, 2) + '\n');
const s = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`${path.basename(WASM)}${args.includes('--js-mode') ? " (the JS's mode)" : ''}: 120 levels in ${s} s (generate_spec ${(generateMs / 1000).toFixed(1)} s, measure ${(measureMs / 1000).toFixed(1)} s); ` +
  `candidates ${counts.generated} made, ${counts.failed} none, ${counts.rejected} rejected (duplicate or too many ropes), ${counts.measured} measured; wrote ${path.join(OUT, NAME)}.js and -measurements.json`);
