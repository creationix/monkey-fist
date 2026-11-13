const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loadGenerator } = require('../scripts/lib/revision-generator.cjs');
const G = require('../game-engine.js');

test('the published revision reproduces a tiny board', () => {
  const old = loadGenerator('ee2ec69');
  assert.match(old.ref, /^[a-f0-9]{40}$/);
  const options = { revision: 3, grid: 'square', width: 4, height: 5, min: 1, max: 1, count: 1, seed: 'REPEAT', index: 0 };
  const expected = G.generate(options), board = old.generate(options);
  assert.deepEqual(board, expected);
  assert.deepEqual(old.spec(options, 0), G.spec(options, 0));
  assert.equal(G.replay(board, board.plan).solved, true);
});

test('both research baselines load their own default campaign and emit current-rule boards', () => {
  for (const ref of ['90b522e', '0be7c3a']) {
    const old = loadGenerator(ref), board = old.generate({ ...old.DEFAULT, index: 0 });
    assert.equal(old.DEFAULT.kind, 'journey');
    assert.equal(old.DEFAULT.count, 120);
    assert.ok(board.ropes.length >= 2);
    assert.ok(board.ropes.flat().every(p => Number.isInteger(p.q) && Number.isInteger(p.r)));
    const replayed = G.replay(board, board.plan);
    assert.equal(replayed.solved, true); assert.equal(replayed.taps, board.par);
    assert.deepEqual(old.spec(old.DEFAULT, 0).grid, board.grid);
  }
});

test('historical dependencies and globals stay isolated from worktree files and live modules', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'monkey-generator-revision-'));
  const git = args => execFileSync('git', args, { cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    git(['init', '-q']);
    fs.writeFileSync(path.join(directory, 'game-engine.js'), "const a=require('./dependency.js'),b=require('./dependency.js');module.exports={DEFAULT:{seed:a.seed},spec:()=>({seed:a.seed}),generate:()=>({seed:a.seed,same:a===b,loads:globalThis.__revisionGeneratorLoads})};");
    fs.writeFileSync(path.join(directory, 'dependency.js'), "globalThis.__revisionGeneratorLoads=(globalThis.__revisionGeneratorLoads||0)+1;module.exports={seed:'COMMITTED'};");
    git(['add', '.']); git(['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'fixture']);
    fs.writeFileSync(path.join(directory, 'dependency.js'), "throw Error('Must not load worktree data');");
    const status = git(['status', '--porcelain']), head = git(['rev-parse', 'HEAD']);
    const before = globalThis.__revisionGeneratorLoads, old = loadGenerator('HEAD', { cwd: directory });
    assert.deepEqual(old.generate({}), { seed: 'COMMITTED', same: true, loads: 1 });
    assert.equal(globalThis.__revisionGeneratorLoads, before);
    assert.deepEqual(loadGenerator('HEAD', { cwd: directory }).generate({}), old.generate({}), 'a fresh snapshot owns fresh module caches');
    assert.equal(git(['status', '--porcelain']), status);
    assert.equal(git(['rev-parse', 'HEAD']), head);
    fs.writeFileSync(path.join(directory, 'game-engine.js'), "require('./missing.js');");
    git(['add', 'game-engine.js']); git(['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'missing dependency']);
    fs.writeFileSync(path.join(directory, 'missing.js'), "throw Error('Must not read an untracked dependency');");
    assert.throws(() => loadGenerator('HEAD', { cwd: directory }), /Cannot load generator dependency missing\.js at [a-f0-9]{40}/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('invalid revisions fail clearly before loading any generator', () => {
  assert.throws(() => loadGenerator('not-a-monkey-fist-revision'), /Cannot resolve generator Git revision/);
  assert.throws(() => loadGenerator('--help'), /Cannot resolve generator Git revision/);
  assert.throws(() => loadGenerator(''), /Git revision is required/);
});
