// Rebuild J3's seed/settings index. Maps and solutions are never stored.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process'), { createRequire } = require('node:module');
const G = require('../game-engine'), F = require('../grid-generator'), L = require('../levels');
const introSeeds = ['S35S00','2VR5EZ','1P3S0GT','QMYSAQ','G1XW18','1PVNBFB','14016LY','ESMK0X','PV3HC8','1QT5MJ7'];
const introDimensions = [[4,5],[4,5],[4,5],[4,5],[4,7],[4,5],[4,5],[5,6],[5,6],[6,7]];
const introDifficulty = [1,8,22,22,30,1,8,22,30,40];
const coverage = b => b.ropes.reduce((sum, rope) => sum + rope.length, 0) / (b.W * b.H);
const pick = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
const kindOf = b => b.mirrors && b.springs ? 'B' : b.mirrors ? 'M' : b.springs ? 'S' : 'P';
function shuffle(list, rng) {
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}
function chapterKinds(chapter) {
  const kinds = chapter === 1 ? 'PPPPMMMMBS' : chapter === 2 ? 'PPMMMSSBBB' : 'PMMSSBBBBB';
  return shuffle([...kinds], L.mulberry32(L.hashString('journey/3/mechanics/' + chapter)));
}
function plan() {
  const specs = introSeeds.map((seed, i) => ({ grid: i < 5 ? 'square' : 'hex', W: introDimensions[i][0], H: introDimensions[i][1],
    difficulty: introDifficulty[i], mirrors: false, springs: false, requireSlide: i >= 7, seed, introSource: i, chapter: 1 }));
  const base = [0,22,32,45,55,65,72,78,84,88,92,96], span = [0,8,8,10,10,10,8,8,6,6,6,4];
  for (let chapter = 1; chapter < 12; chapter++) {
    const kinds = chapterKinds(chapter);
    for (let slot = 0; slot < 10; slot++) {
      const rng = L.mulberry32(L.hashString('journey/3/chapter-size/' + chapter + '/' + slot));
      const kind = kinds[slot], mirrors = kind === 'M' || kind === 'B', springs = kind === 'S' || kind === 'B';
      let W, H;
      if (chapter === 1) { W = pick(rng, mirrors || springs ? 8 : 6, mirrors || springs ? 9 : 8); H = pick(rng, 8, 10); }
      else if (chapter === 2) { W = pick(rng, 8, 10); H = pick(rng, 10, 12); }
      else if (kind === 'P') { W = pick(rng, 8, 12); H = pick(rng, 10, 16); }
      else if (chapter >= 6 && springs) { W = 12; H = 16; }
      else if (chapter >= 6) { W = pick(rng, 10, 12); H = pick(rng, Math.max(13, Math.ceil(150 / W)), 16); }
      else { W = pick(rng, 10, 12); H = pick(rng, 12, 16); }
      if (W > 12 || H > 16) throw Error('Journey exceeds moderate grid bounds');
      const latePlain = kind === 'P' && chapter >= 4, richFeatured = (mirrors || springs) && chapter >= 6;
      const difficulty = latePlain ? Math.max(65, base[chapter] - 5) : base[chapter] + span[chapter] * slot / 9;
      specs.push({ grid: slot % 2 ? 'hex' : 'square', W, H, difficulty, mirrors, springs, chapter: chapter + 1,
        ...(mirrors ? { minMirrors: chapter === 1 ? kind === 'B' ? 2 : 1 : chapter === 2 ? 2 : 3 } : {}),
        ...(springs ? { minSprings: chapter < 3 ? 1 : 2 } : {}),
        ...(mirrors || springs ? { coreRopes: chapter >= 6 ? 3 : chapter >= 2 ? 2 : 1 } : {}),
        ...(latePlain ? { minParRatio: 1.05, minPartialSlides: 3, minRepeatedRopes: 1, minInterleavedRopes: 1 } : {}),
        ...(richFeatured ? { minParRatio: 1.05, minPartialSlides: 3, minRepeatedRopes: 2, minInterleavedRopes: 1 } : {}), seed: '' });
    }
  }
  return specs;
}
function balanced(b) {
  const cells = G.cells(b), occupied = new Set(b.ropes.flat().map(p => p.q + ',' + p.r));
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
    const region = cells.filter(p => Number(p.r >= b.H / 2) === y && Number((p.q + (b.grid === 'hex' ? Math.floor(p.r / 2) : 0)) >= b.W / 2) === x);
    if (region.filter(p => occupied.has(p.q + ',' + p.r)).length / region.length < .55) return false;
  }
  return true;
}
function inspectPlan(b) {
  let paths = b.ropes, manualSlides = 0, manualBounces = 0;
  const mirrorTiles = new Map(b.mirrors.map(m => [m.cell.q + ',' + m.cell.r, m])), springTiles = new Set(b.springs.map(p => p.q + ',' + p.r));
  const usedMirrors = new Set(), usedSprings = new Set(), manualMirrors = new Set(), manualSprings = new Set(), slidesByRope = new Map();
  for (const [step, id] of b.plan.entries()) {
    const before = paths[id], moved = G.tap(b, paths, id); if (!moved) throw Error('Invalid certified move');
    for (let j = before.length; j < moved.route.length; j++) {
      const a = moved.route[j - 1], p = moved.route[j], key = p.q + ',' + p.r, mirror = mirrorTiles.get(key);
      if (!mirror) continue;
      const dq = p.q - a.q, dr = p.r - a.r;
      let oq, or;
      if (b.grid === 'hex') {
        const incoming = G.DIRS.findIndex(d => d[0] === dq && d[1] === dr);
        [oq, or] = G.DIRS[(2 * mirror.axis - incoming + 6) % 6];
      } else [oq, or] = mirror.slope === '/' ? [-dr, -dq] : [dr, dq];
      if (oq !== dq || or !== dr) { usedMirrors.add(key); if (step < b.par) manualMirrors.add(key); }
    }
    if (moved.event === 'bounce') {
      const p = moved.route.at(-1), key = p.q + ',' + p.r;
      if (springTiles.has(key)) { usedSprings.add(key); if (step < b.par) manualSprings.add(key); }
      if (step < b.par) manualBounces++;
    }
    if (step < b.par && moved.event === 'slide') { manualSlides++; slidesByRope.set(id, (slidesByRope.get(id) || 0) + 1); }
    paths = moved.paths;
  }
  return { mirrors: usedMirrors.size, springs: usedSprings.size, manualMirrors: manualMirrors.size, manualSprings: manualSprings.size, manualSlides, manualBounces,
    repeatedSlideRopes: [...slidesByRope.values()].filter(n => n > 1).length };
}
function oneTapClears(b) {
  return b.ropes.length > 3 && b.ropes.some((_, i) => { const moved = G.tap(b, b.ropes, i); return moved && G.allFree(b, moved.paths); });
}
function introChallenge(b) {
  const c = b.complexity;
  return Number((b.par * 5 + c.interaction * 2 + c.branchingDepth * .5 + b.par / b.ropeCount * 2 + b.ropeCount * .15 + b.W * b.H * .01 - c.initialExitFraction * .4).toFixed(6));
}
function challenge(b) {
  const c = b.complexity;
  if (!c || !Number.isFinite(c.interaction) || !Number.isFinite(c.branchingDepth) || !Number.isFinite(c.initialExitFraction)) throw Error('Missing dependency metrics for ' + b.seed);
  return c.interaction * 10 + Math.min(c.branchingDepth, 6) * 1.5 + b.par * .3 + b.ropeCount * .08 + b.W * b.H * .003 - c.initialExitFraction * 3;
}
const compare = (a, b) => challenge(a) - challenge(b) || a.par * b.ropeCount - b.par * a.ropeCount || a.ropeCount - b.ropeCount || b.grid.localeCompare(a.grid) || a.seed.localeCompare(b.seed);
function orderChapter(chapter, cards) {
  if (chapter === 0) return cards.sort((a, b) => a.introChallenge - b.introChallenge || a.introSource - b.introSource);
  cards.sort(compare);
  if (chapter < 3) return cards;
  // Put each late plain-rules interlude between featured puzzles; the final
  // challenge in every advanced chapter still uses mirrors or spinners.
  const plain = cards.filter(b => kindOf(b) === 'P'), featured = cards.filter(b => kindOf(b) !== 'P');
  if (plain.length !== 1) throw Error('Expected one plain-rules interlude');
  featured.splice(3 + chapter % 4, 0, plain[0]); return featured;
}
const specs = plan();
if (process.argv.includes('--plan')) {
  console.log(JSON.stringify(Array.from({ length: 12 }, (_, i) => ({ chapter: i + 1, ...specs.slice(i * 10, i * 10 + 10).reduce((out, b) => {
    const kind = kindOf(b); out[kind] = (out[kind] || 0) + 1; return out;
  }, {}), specs: specs.slice(i * 10, i * 10 + 10) })), null, 2)); process.exit(0);
}
// Match the last published campaign by logical geometry, not by its old index.
// Keep this baseline with the GRID_VERSION4 migration; later migrations can
// choose a new published reference without touching the generated maps.
function previousLayouts() {
  const reference = '93688c4', cache = path.join(os.tmpdir(), 'monkey-old-layout-keys.json');
  if (fs.existsSync(cache)) {
    const saved = JSON.parse(fs.readFileSync(cache, 'utf8'));
    if (saved.reference === reference) return new Map(saved.entries.map(e => [e.layoutKey, e.index]));
  }
  const cwd = path.join(__dirname, '..'), requireAt = createRequire(path.join(cwd, 'grid-generator.js'));
  const load = filename => {
    const source = execFileSync('git', ['show', reference + ':' + filename], { cwd, encoding: 'utf8' }), m = { exports: {} };
    new Function('require', 'module', 'exports', source)(requireAt, m, m.exports); return m.exports;
  };
  const oldGenerator = load('grid-generator.js');
  const entries = load('grid-journey.js').map((metadata, index) => ({ index, layoutKey: G.layoutKey(oldGenerator.generate(metadata, G)) }));
  fs.writeFileSync(cache, JSON.stringify({ reference, entries }, null, 2));
  return new Map(entries.map(e => [e.layoutKey, e.index]));
}
const previous = previousLayouts(), levels = [];
// Resume validated metadata after a later seed fails. The cache contains no
// maps or plans, and is invalidated by any generator/kernel or source change.
const sourceFiles = ['scripts/build-grid-journey.cjs','grid-generator.js','dependency-metrics.js','game-engine.js','levels.js','mechanics.js','twist-circuits.js','hex/engine.js','hex/mirrors.js'];
const cacheHash = createHash('sha256'); for (const file of sourceFiles) cacheHash.update(fs.readFileSync(path.join(__dirname, '..', file)));
const cacheFile = path.join(os.tmpdir(), 'monkey-journey-build-' + cacheHash.digest('hex') + '.json');
const cached = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};

for (const [i, source] of specs.entries()) {
  const spec = { ...source }, tutorial = i < 10, sourceKey = JSON.stringify(source);
  if (cached[sourceKey]) { levels.push(cached[sourceKey]); process.stderr.write('Resume ' + (i + 1) + '/120\n'); continue; }
  let board, used;
  for (let attempt = 0; attempt < (tutorial ? 1 : 8); attempt++) {
    if (!tutorial) spec.seed = L.hashString('journey/3/chapter-map/' + spec.chapter + '/' + (i % 10) + '/' + kindOf(spec) + '/' + attempt).toString(36).toUpperCase();
    try {
      const candidate = F.generate(spec, G), replayed = G.replay(candidate, candidate.plan), usage = inspectPlan(candidate);
      const filled = coverage(candidate), minimum = spec.mirrors || spec.springs || spec.W * spec.H <= 48 && usage.manualSlides ? .8 : .85;
      if (candidate.W !== spec.W || candidate.H !== spec.H || !replayed.solved || replayed.taps !== candidate.par || candidate.par * 3 < candidate.ropes.length ||
          spec.requireSlide && !usage.manualSlides || tutorial && candidate.ropes.length > 5 || oneTapClears(candidate) || filled < minimum || !balanced(candidate) ||
          usage.mirrors < (spec.minMirrors || 0) || usage.springs < (spec.minSprings || 0) ||
          usage.manualMirrors < (spec.minMirrors || 0) || usage.manualSprings < (spec.minSprings || 0) ||
          candidate.par / candidate.ropes.length < (spec.minParRatio || 0) || usage.manualSlides < (spec.minPartialSlides || 0) || usage.repeatedSlideRopes < (spec.minRepeatedRopes || 0) || (candidate.slideStats?.interleavedRopes || 0) < (spec.minInterleavedRopes || 0)) {
        process.stderr.write(`Retry ${i + 1}/${attempt + 1}: ${(filled * 100).toFixed(1)}% full, ${candidate.ropes.length} ropes / ${candidate.par} taps, ${JSON.stringify(usage)}\n`); continue;
      }
      board = candidate; used = usage; break;
    } catch (error) { process.stderr.write(`Retry ${i + 1}/${attempt + 1}: ${error.message}\n`); }
  }
  if (!board) throw Error('Could not create a dense Journey level: ' + JSON.stringify(spec));
  const metadata = { ...spec, par: board.par, ropeCount: board.ropes.length, coverage: coverage(board), featureUse: used,
    ...(board.complexity ? { complexity: board.complexity } : {}), ...(board.slideStats ? { slideStats: board.slideStats } : {}),
    ...(board.mechanicStats ? { mechanicStats: board.mechanicStats } : {}) };
  metadata.layoutKey = G.layoutKey(board);
  if (previous.has(metadata.layoutKey)) metadata.previousIndex = previous.get(metadata.layoutKey);
  if (tutorial) metadata.introChallenge = introChallenge(metadata);
  levels.push(metadata); cached[sourceKey] = metadata; fs.writeFileSync(cacheFile, JSON.stringify(cached));
  process.stderr.write(`${i + 1}: ${board.grid} ${spec.W}×${spec.H}, ${board.ropes.length} ropes / ${board.par} taps, M${used.mirrors}/S${used.springs}, slides${used.manualSlides}, bounces${used.manualBounces}\n`);
}
for (let chapter = 0; chapter < 12; chapter++) levels.splice(chapter * 10, 10, ...orderChapter(chapter, levels.slice(chapter * 10, chapter * 10 + 10)));
const report = [];
for (let chapter = 0; chapter < 12; chapter++) {
  const cards = levels.slice(chapter * 10, chapter * 10 + 10), expected = chapterKinds(chapter).reduce((a, k) => (a[k] = (a[k] || 0) + 1, a), {});
  const kinds = cards.reduce((a, b) => (a[kindOf(b)] = (a[kindOf(b)] || 0) + 1, a), {});
  if (chapter && JSON.stringify(Object.entries(kinds).sort()) !== JSON.stringify(Object.entries(expected).sort())) throw Error('Mechanic quotas changed after ordering');
  report.push({ chapter: chapter + 1, kinds, aboveRopePar: cards.filter(b => b.par > b.ropeCount).length,
    usedMirrors: cards.reduce((n, b) => n + b.featureUse.mirrors, 0), usedSprings: cards.reduce((n, b) => n + b.featureUse.springs, 0),
    manualSlides: cards.reduce((n, b) => n + b.featureUse.manualSlides, 0), repeatedSlideRopes: cards.reduce((n, b) => n + b.featureUse.repeatedSlideRopes, 0),
    meanParRatio: cards.reduce((n, b) => n + b.par / b.ropeCount, 0) / cards.length, manualBounces: cards.reduce((n, b) => n + b.featureUse.manualBounces, 0) });
}
const output = '// Generated by scripts/build-grid-journey.cjs. Metadata only; maps are built from seeds.\n' +
  '(function(root){const levels=' + JSON.stringify(levels, null, 2) + ';if(typeof module!=="undefined"&&module.exports)module.exports=levels;else root.MFGridJourney=levels;})(globalThis);\n';
fs.writeFileSync(path.join(__dirname, '../grid-journey.js'), output);
process.stderr.write(JSON.stringify(report, null, 2) + '\nBuilt 120 levels.\n');
