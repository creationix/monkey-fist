// Rebuild J3's sorted seed/settings index. Maps and solutions are never stored.
const fs = require('node:fs'), path = require('node:path');
const G = require('../game-engine'), F = require('../grid-generator'), L = require('../levels');
const levels = [];
// Keep the restored small introductions stable as later difficulty improves.
const introSeeds = ['S35S00','2VR5EZ','1P3S0GT','QMYSAQ','G1XW18','1PVNBFB','14016LY','ESMK0X','PV3HC8','1QT5MJ7'];
const coverage = b => b.ropes.reduce((sum, rope) => sum + rope.length, 0) / (b.W * b.H);
function balanced(b) {
  const cells = G.cells(b), occupied = new Set(b.ropes.flat().map(p => p.q + ',' + p.r));
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
    const region = cells.filter(p => Number(p.r >= b.H / 2) === y && Number((p.q + (b.grid === 'hex' ? Math.floor(p.r / 2) : 0)) >= b.W / 2) === x);
    if (region.filter(p => occupied.has(p.q + ',' + p.r)).length / region.length < .55) return false;
  }
  return true;
}
function hasSlide(b) {
  let paths = b.ropes;
  for (const i of b.plan) {
    const moved = G.tap(b, paths, i); if (!moved) return false;
    if (moved.event === 'slide') return true;
    paths = moved.paths;
  }
  return false;
}
function oneTapClears(b) {
  return b.ropes.length > 3 && b.ropes.some((_, i) => {
    const moved = G.tap(b, b.ropes, i);
    return moved && G.allFree(b, moved.paths);
  });
}
function introChallenge(b) {
  const c = b.complexity;
  return Number((b.par * 5 + c.interaction * 2 + c.branchingDepth * .5 + b.par / b.ropeCount * 2 + b.ropeCount * .15 + b.W * b.H * .01 - c.initialExitFraction * .4).toFixed(6));
}
for (let i = 0; i < 120; i++) {
  const rng = L.mulberry32(L.hashString('journey/3/dimensions/' + i));
  const tutorial = i < 10, basic = i < 30;
  const intro = [[4,5],[4,5],[4,5],[4,5],[4,7],[4,5],[4,5],[5,6],[5,6],[6,7]];
  const introDifficulty = [1,8,22,22,30,1,8,22,30,40];
  let W, H;
  if (tutorial) [W, H] = intro[i];
  else if (basic) { W = 8 + Math.floor(rng() * 5); H = 8 + Math.floor(rng() * 5); }
  else {
    const widths = [8,9,10,10,11,12]; W = widths[Math.floor(rng() * widths.length)];
    H = 10 + Math.floor(rng() * 7);
  }
  if (W > 12 || H > 16) throw Error('Journey exceeds moderate grid bounds');
  const spec = { grid: i < 5 ? 'square' : i < 10 ? 'hex' : i % 2 ? 'hex' : 'square', W, H,
    difficulty: tutorial ? introDifficulty[i] : basic ? 22 + 23 * (i - 10) / 19 : 35 + 65 * (i - 30) / 89,
    mirrors: i >= 35 && i % 10 >= 4, springs: i >= 60 && [2, 7].includes(i % 10), requireSlide: tutorial && i >= 7,
    seed: '' };
  let board;
  for (let attempt = 0; attempt < (tutorial ? 1 : 6); attempt++) {
    spec.seed = tutorial ? introSeeds[i] : L.hashString('journey/3/map/' + i + '/' + attempt).toString(36).toUpperCase();
    try {
      const candidate = F.generate(spec, G), replayed = G.replay(candidate, candidate.plan);
      const filled = coverage(candidate), slide = hasSlide(candidate);
      const minimum = spec.mirrors || spec.springs || W * H <= 48 && slide ? .8 : .85;
      if (candidate.W !== W || candidate.H !== H || !replayed.solved || replayed.taps !== candidate.par || candidate.par * 3 < candidate.ropes.length || spec.requireSlide && !slide || tutorial && candidate.ropes.length > 5 || oneTapClears(candidate) || filled < minimum || !balanced(candidate)) {
        process.stderr.write(`Retry ${i + 1}/${attempt + 1}: density ${(filled * 100).toFixed(1)}%, ${candidate.ropes.length} ropes / ${candidate.par} taps, slide ${slide}, replay ${replayed.solved}\n`); continue;
      }
      board = candidate; break;
    } catch (error) { process.stderr.write(`Retry ${i + 1}/${attempt + 1}: ${error.message}\n`); }
  }
  if (!board) throw Error('Could not create a dense Journey level: ' + JSON.stringify(spec));
  const metadata = { ...spec, par: board.par, ropeCount: board.ropes.length, coverage: coverage(board), ...(board.complexity ? { complexity: board.complexity } : {}) };
  if (tutorial) { metadata.introSource = i; metadata.introChallenge = introChallenge(metadata); }
  levels.push(metadata);
  process.stderr.write(`${i + 1}: ${board.grid} ${W}×${H}, ${board.ropes.length} ropes / ${board.par} taps, ${(coverage(board) * 100).toFixed(1)}% full\n`);
}
// Keep the same ten introductory maps, ordered by their actual unlocking work
// across both grids. Retain the following twenty small boards in place.
levels.splice(0, 10, ...levels.slice(0, 10).sort((a, b) => a.introChallenge - b.introChallenge || a.introSource - b.introSource));
// Structural interaction drives later difficulty; size and total taps remain
// modest workload signals. A plain long chain earns no branching-depth score.
const challenge = b => {
  const c = b.complexity;
  if (!c || !Number.isFinite(c.interaction) || !Number.isFinite(c.branchingDepth) || !Number.isFinite(c.initialExitFraction)) throw Error('Missing dependency metrics for ' + b.seed);
  return c.interaction * 10 + Math.min(c.branchingDepth, 6) * 1.5 + b.par * .3 + b.ropeCount * .08 + b.W * b.H * .003 - c.initialExitFraction * 3;
};
const compare = (a, b) => challenge(a) - challenge(b) || a.par * b.ropeCount - b.par * a.ropeCount || a.ropeCount - b.ropeCount || b.grid.localeCompare(a.grid) || a.seed.localeCompare(b.seed);
levels.splice(30, 90, ...levels.slice(30).sort(compare));
const output = '// Generated by scripts/build-grid-journey.cjs. Metadata only; maps are built from seeds.\n' +
  '(function(root){const levels=' + JSON.stringify(levels, null, 2) + ';if(typeof module!=="undefined"&&module.exports)module.exports=levels;else root.MFGridJourney=levels;})(globalThis);\n';
fs.writeFileSync(path.join(__dirname, '../grid-journey.js'), output);
process.stderr.write(`Built ${levels.length} levels; ${levels.filter(b => b.grid === 'square').length} square and ${levels.filter(b => b.grid === 'hex').length} Hex.\n`);
