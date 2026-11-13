// Rebuild J3's seed/settings index from the master seed. Maps and solutions are
// never stored: each entry is a specification and a seed, and the game rebuilds
// the board from them. Nothing is hand-picked, including the first ten levels.
//
// Each position has a planned kind, size and difficulty. Several seeds are tried
// for it; every candidate is replay-checked, measured by play (forced slides and
// bounces in the par solution, and how often a casual player loses), and the one
// closest to the position's target challenge is kept. See docs/research.
//
// Options: --seed SEED builds a different deterministic campaign, --out FILE
// writes it elsewhere, and --plan prints the seeded schedule without building.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { createHash } = require('node:crypto');
const G = require('../game-engine'), F = require('../grid-generator'), L = require('../levels');
function argumentsOf(argv) {
  const result = { seed: 'MONKEYFIST', out: path.join(__dirname, '../grid-journey.js'), plan: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--plan') result.plan = true;
    else if (['--seed', '--out'].includes(argv[i]) && argv[i + 1] && !argv[i + 1].startsWith('--')) { const key = argv[i].slice(2); result[key] = argv[++i]; }
    else throw Error('Unknown or incomplete option: ' + argv[i]);
  }
  result.seed = G.cleanSeed(result.seed);
  result.out = path.resolve(result.out);
  return result;
}
const options = argumentsOf(process.argv.slice(2)), BUILD = 'journey/5/' + options.seed;
// A map seed is a function of the master seed, the position and the attempt only.
const mapSeed = (spec, attempt) => L.hashString(BUILD + '/map/' + spec.chapter + '/' + spec.slot + '/' + attempt).toString(36).toUpperCase();
const pick = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
const kindOf = b => b.mirrors && b.springs ? 'B' : b.mirrors ? 'M' : b.springs ? 'S' : 'P';
const rngFor = label => L.mulberry32(L.hashString(BUILD + '/' + label));
function shuffle(list, rng) {
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}
// Displayed chapter (1-12) to its mechanic mix: P plain, M mirrors, S spinners, B both.
function chapterKinds(chapter) {
  const kinds = chapter === 1 ? 'PPPPPPPPPP' : chapter === 2 ? 'PPPPMMMMBS' : chapter === 3 ? 'PPMMMSSBBB' : 'PMMMSSBBBB';
  return chapter === 1 ? [...kinds] : shuffle([...kinds], rngFor('kinds/' + chapter));
}
// Difficulty rises smoothly over the whole Journey; within a chapter it rises with the slot.
const difficultyAt = i => i < 10 ? 1 + 39 * (i % 5) / 4 : 20 + 80 * Math.pow((i - 10) / 109, 1.05);
function sizeFor(chapter, slot, kind, grid) {
  const rng = rngFor('size/' + chapter + '/' + slot + '/' + kind + '/' + grid);
  if (chapter === 1) return grid === 'hex' ? [pick(rng, 4, 5), pick(rng, 5, 6)] : [4, pick(rng, 5, 6)]; // five ropes at most
  // Woven boards grow only gently; difficulty comes from knots, traps and mirrors.
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
        // The three hardest introductions must demonstrate a partial slide.
        ...(chapter === 1 && (slot === 4 || slot >= 8) ? { requireSlide: true } : {}),
        ...(mirrors ? { minMirrors: chapter === 2 ? kind === 'B' ? 2 : 1 : chapter === 3 ? 2 : 3 } : {}),
        ...(springs ? { minSprings: chapter < 4 ? 1 : 2 } : {}) };
      spec.seed = mapSeed(spec, 0); specs.push(spec);
    }
  }
  return specs;
}
// The build re-measures each candidate with more casual games than the generator's
// own candidate selection uses, so the stored challenge is a steadier estimate.
function measure(b) {
  const rng = L.mulberry32(L.hashString(BUILD + '/measure/' + b.seed)), wins = F.casualRate(b, G, rng, b.springs.length ? 24 : 96);
  return { casualWins: Number(wins.toFixed(4)), work: b.play.work, challenge: Number(F.challengeOf(b.play.work, wins).toFixed(3)) };
}
// Harder levels should be losable: a candidate whose casual win rate is above the
// generator's ceiling for its difficulty is kept only if no seed meets it, and then
// the most losable one is taken (see the build loop).
//
// The generator enforces every rule a board must meet (dimensions, coverage in each
// quarter, replayed par, mechanics used by hand, slide requirements). The Journey
// adds two of its own: no map appears twice, and introductions have at most five ropes.
function acceptable(spec, candidate, levels) {
  const key = G.layoutKey(candidate);
  return !levels.some(level => level.layoutKey === key) && !(spec.chapter === 1 && candidate.ropes.length > 5);
}
// Within a chapter, levels run from the lowest measured challenge to the highest.
// From chapter 4 the one plain-rules level sits between featured ones, so every
// chapter still ends on a featured puzzle.
const byChallenge = (a, b) => a.play.challenge - b.play.challenge || a.par - b.par || a.ropeCount - b.ropeCount || a.seed.localeCompare(b.seed);
function orderChapter(chapter, cards) {
  cards.sort(byChallenge);
  if (chapter < 4) return cards;
  const plain = cards.filter(b => kindOf(b) === 'P'), featured = cards.filter(b => kindOf(b) !== 'P');
  if (plain.length !== 1) throw Error('Expected one plain-rules interlude');
  featured.splice(3 + chapter % 4, 0, plain[0]); return featured;
}
const specs = plan();
if (options.plan) {
  console.log(JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ chapter: i + 1, ...specs.slice(i * 10, i * 10 + 10).reduce((out, b) => {
    const kind = kindOf(b); out[kind] = (out[kind] || 0) + 1; return out;
  }, {}), specs: specs.slice(i * 10, i * 10 + 10) })), null, 2)); process.exit(0);
}
const levels = [];
// Resume validated metadata after an interrupted build. The cache contains no
// maps or plans, and is invalidated by any generator/kernel or source change.
const sourceFiles = ['scripts/build-grid-journey.cjs','grid-generator.js','dependency-metrics.js','game-engine.js','levels.js','mechanics.js','hex/engine.js','hex/mechanics.js'];
const cacheHash = createHash('sha256'); for (const file of sourceFiles) cacheHash.update(fs.readFileSync(path.join(__dirname, '..', file)));
const cacheFile = path.join(os.tmpdir(), 'monkey-journey-build-' + cacheHash.digest('hex') + '.json');
const cached = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
const CANDIDATES = 6, EXTRA = 10;

for (const [i, source] of specs.entries()) {
  const sourceKey = JSON.stringify(source);
  if (cached[sourceKey]) { levels.push(cached[sourceKey]); process.stderr.write('Resume ' + (i + 1) + '/120\n'); continue; }
  const target = F.targetChallenge(source.difficulty), wanted = CANDIDATES + (source.chapter === 1 ? 6 : 0), extra = EXTRA + (source.chapter === 1 ? 20 : 0);
  let chosen = null, tried = 0, attempt = 0;
  // If no seed works at the planned size, step the board up toward 12 × 16.
  for (let size = [source.W, source.H], step = 0; !chosen && step < 3; size = [Math.min(12, size[0] + 1), Math.min(16, size[1] + 2)], step++) {
   if (step && size[0] === source.W && size[1] === source.H) break;
   for (let local = 0; local < wanted + extra && (tried < wanted || !chosen || chosen.over); local++, attempt++) {
    const spec = { ...source, W: size[0], H: size[1], seedAttempt: attempt, seed: mapSeed(source, attempt) };
    let candidate;
    try { candidate = F.generate(spec, G); }
    catch (error) { process.stderr.write(`  ${i + 1}/${attempt + 1}: ${error.message}\n`); continue; }
    if (!acceptable(spec, candidate, levels)) { process.stderr.write(`  ${i + 1}/${attempt + 1}: rejected (duplicate map or too many ropes)\n`); continue; }
    tried++;
    const play = measure(candidate), over = Math.max(0, play.casualWins - F.winCeiling(source.difficulty)), miss = Math.abs(play.challenge - target) + (over ? 10 + over * 20 : 0);
    if (!chosen || miss < chosen.miss) chosen = { spec, candidate, play, miss, over: over > 0 };
   }
  }
  if (!chosen) throw Error('Could not create a dense Journey level: ' + JSON.stringify(source));
  const { spec, candidate: board, play } = chosen;
  const metadata = { ...spec, par: board.par, ropeCount: board.ropes.length, coverage: Number(board.coverage.toFixed(4)), play, targetChallenge: Number(target.toFixed(3)),
    ...(board.complexity ? { complexity: board.complexity } : {}), ...(board.slideStats ? { slideStats: board.slideStats } : {}),
    ...(board.mechanicStats ? { mechanicStats: board.mechanicStats } : {}) };
  metadata.layoutKey = G.layoutKey(board);
  if (spec.chapter === 1) metadata.openingChallenge = play.challenge;
  levels.push(metadata); cached[sourceKey] = metadata; fs.writeFileSync(cacheFile, JSON.stringify(cached));
  process.stderr.write(`${i + 1}: ${kindOf(spec)} ${board.grid} ${spec.W}×${spec.H}, ${board.ropes.length} ropes / ${board.par} taps, challenge ${play.challenge} (target ${target.toFixed(2)}), casual ${(play.casualWins * 100).toFixed(0)}%, M${board.mechanicStats?.usedMirrors || 0}/S${board.mechanicStats?.usedSprings || 0}, slides ${board.slideStats.manualSlides}, bounces ${board.slideStats.manualBounces}\n`);
}
for (let chapter = 1; chapter <= 12; chapter++) levels.splice((chapter - 1) * 10, 10, ...orderChapter(chapter, levels.slice((chapter - 1) * 10, chapter * 10)));
const report = [];
for (let chapter = 1; chapter <= 12; chapter++) {
  const cards = levels.slice((chapter - 1) * 10, chapter * 10), expected = chapterKinds(chapter).reduce((a, k) => (a[k] = (a[k] || 0) + 1, a), {});
  const kinds = cards.reduce((a, b) => (a[kindOf(b)] = (a[kindOf(b)] || 0) + 1, a), {});
  if (JSON.stringify(Object.entries(kinds).sort()) !== JSON.stringify(Object.entries(expected).sort())) throw Error('Mechanic quotas changed after ordering');
  const mean = f => Number((cards.reduce((n, b) => n + f(b), 0) / cards.length).toFixed(2));
  report.push({ chapter, kinds, meanChallenge: mean(b => b.play.challenge), meanCasualWins: mean(b => b.play.casualWins), meanWork: mean(b => b.play.work),
    aboveRopePar: cards.filter(b => b.par > b.ropeCount).length, meanArea: mean(b => b.W * b.H) });
}
const output = '// Generated by scripts/build-grid-journey.cjs from seed ' + options.seed + '. Metadata only; maps are built from seeds.\n' +
  '(function(root){const levels=' + JSON.stringify(levels, null, 2) + ';if(typeof module!=="undefined"&&module.exports)module.exports=levels;else root.MFGridJourney=levels;})(globalThis);\n';
fs.writeFileSync(options.out, output);
process.stderr.write(JSON.stringify(report, null, 2) + '\nBuilt 120 levels from seed ' + options.seed + '.\n');
