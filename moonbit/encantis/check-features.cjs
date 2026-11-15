// Checks features.wasm (Encantis reachableFeatures, plain wasm MVP) against the JS
// reachableFeatures (game-engine.js at 134019d, copied below since deleted), the
// MoonBit build, and moonbit/tests/assist-expected.json:
// node moonbit/encantis/check-features.cjs
const fs = require('fs'), path = require('path');
globalThis.MFGame = require('../../game-engine.js');
const MFMoonBit = require('../web/generator.js'), H = require('../../hex/engine.js');
const pinned = require('../tests/assist-expected.json');

// game-engine.js at 134019d, verbatim.
function reachableFeatures(b, paths = b.ropes, budget = 10000) {
  const key = H.key, mirrors = new Map((b.mirrors || []).map(m => [key(m.cell), m])), springs = new Set((b.springs || []).map(key));
  const all = new Set([...mirrors.keys(), ...springs]), live = new Set(); let visited = 0;
  if (!all.size) return [];
  // Remove other ropes and allow stopping after every unit step. This is a
  // superset of actual play, including pauses on mirrors and later reversals.
  // A rope's trajectory is otherwise deterministic. Only a feature absent
  // from every optimistic trajectory can safely disappear. Budget exhaustion
  // keeps everything, rather than treating an unfinished search as proof.
  for (const original of paths) {
    if (!original) continue;
    let path = original; const seen = new Set();
    for (;;) {
      if (visited++ >= budget) return [...all];
      const cells = path.map(key), state = cells.join(';'); if (seen.has(state)) break; seen.add(state);
      const head = path.at(-1), previous = path.at(-2), mirror = mirrors.get(key(head));
      let dq = head.q - previous.q, dr = head.r - previous.r;
      if (mirror) {
        live.add(key(head));
        if (b.grid === 'hex') {
          const incoming = H.DIRS.findIndex(d => d[0] === dq && d[1] === dr);
          [dq, dr] = H.DIRS[(2 * mirror.axis - incoming + 6) % 6];
        } else if (mirror.slope === '/') [dq, dr] = [-dr, -dq];
        else [dq, dr] = [dr, dq];
      }
      const next = { q: head.q + dq, r: head.r + dr }, at = key(next);
      const inside = b.grid === 'hex' ? H.inside(b, next) : next.q >= 0 && next.r >= 0 && next.q < b.W && next.r < b.H;
      if (!inside || cells.includes(at)) break;
      if (all.has(at)) live.add(at);
      if (live.size === all.size) return [...all];
      path = path.slice(1).concat(next);
      if (springs.has(at)) path.reverse();
    }
  }
  return [...live];
}


(async () => {
  const { instance } = await WebAssembly.instantiate(fs.readFileSync(path.join(__dirname, 'features.wasm')), {});
  const x = instance.exports;
  const { instance: g } = await WebAssembly.instantiate(fs.readFileSync(path.join(__dirname, '../dist/gen.wasm')), {});
  const gen = MFMoonBit.wrap(g.exports, 'wasm-gc'), moon = typeof g.exports.features === 'function';
  const encantis = (b, paths, budget) => {
    const hex = b.grid === 'hex', mirrors = b.mirrors || [], springs = b.springs || [];
    const w = [hex ? 1 : 0, b.W, b.H, budget, mirrors.length];
    for (const m of mirrors) w.push(m.cell.q, m.cell.r, hex ? m.axis : m.slope === '/' ? 0 : 1);
    w.push(springs.length);
    for (const p of springs) w.push(p.q, p.r);
    w.push(paths.length);
    for (const p of paths) { w.push(p ? p.length : 0); if (p) for (const c of p) w.push(c.q, c.r); }
    new Int32Array(x.mem.buffer, x.in_ptr(), w.length).set(w);
    const n = x.reachable(), out = new Uint32Array(x.mem.buffer, x.out_ptr(), n);
    const cells = [...mirrors.map(m => m.cell), ...springs];
    return Array.from(out, i => cells[i].q + ',' + cells[i].r);
  };
  const time = (f, reps) => { const t = process.hrtime.bigint(); for (let i = 0; i < reps; i++) f(); return Number(process.hrtime.bigint() - t) / reps / 1e3; };
  let cases = 0, bad = 0, badMoon = 0, everything = 0; const us = { js: 0, enc: 0, moon: 0 };
  for (let i = 0; i < 120; i++) {
    const b = gen.generate({ kind: 'journey', index: i });
    if (!(b.mirrors || []).length && !(b.springs || []).length) continue;
    let paths = b.ropes;
    // Every position along the board's own plan, at the game's two budgets.
    for (const move of [null, ...b.plan]) {
      if (move !== null) { const m = MFGame.tap(b, paths, move); if (!m) break; paths = m.paths; }
      for (const budget of [500, 10000]) {
        const js = reachableFeatures(b, paths, budget), enc = encantis(b, paths, budget);
        cases++;
        if (js.length === (b.mirrors || []).length + (b.springs || []).length) everything++;
        if (JSON.stringify(js) !== JSON.stringify(enc)) { bad++; if (bad < 6) console.log('MISMATCH L' + (i + 1), budget, js, enc); }
        if (moon && JSON.stringify(gen.reachableFeatures(b, paths, budget)) !== JSON.stringify(js)) badMoon++;
        if (budget === 10000 && move === null) {
          us.js += time(() => reachableFeatures(b, paths, budget), 50);
          us.enc += time(() => encantis(b, paths, budget), 50);
          if (moon) us.moon += time(() => gen.reachableFeatures(b, paths, budget), 50);
        }
      }
    }
  }
  // The positions the MoonBit port pinned before the JS was deleted (keys sorted).
  let pinnedCases = 0, pinnedBad = 0;
  for (const c of pinned) {
    const b = gen.generate(c.options); let paths = b.ropes;
    for (const t of c.taps) paths = MFGame.tap(b, paths, t).paths;
    for (const f of c.features) { pinnedCases++; if (JSON.stringify(encantis(b, paths, f.budget).sort()) !== JSON.stringify(f.keys)) pinnedBad++; }
  }
  console.log(`assist-expected.json: ${pinnedCases} feature checks, ${pinnedBad} mismatches`);
  bad += pinnedBad;
  console.log(`${cases} positions: Encantis ${bad} mismatches vs JS` + (moon ? `, MoonBit ${badMoon}` : ' (MoonBit build has no features export)') + `; ${everything} returned every feature`);
  console.log(`summed over boards, start position, budget 10000 (us): JS ${us.js.toFixed(0)}, Encantis ${us.enc.toFixed(0)}` + (moon ? `, MoonBit wasm-gc ${us.moon.toFixed(0)}` : ''));
  process.exitCode = bad ? 1 : 0;
})();
