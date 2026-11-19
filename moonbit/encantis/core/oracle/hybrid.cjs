// The JS generator of 9e69e3a with its Hex woven builder replaced by the Encantis port: every
// H.build call grid-generator.js makes goes to test/g4.wasm's t_build instead, and everything
// else (mirrors, the core, spinners, scoring, the choice among attempts) stays the JS's. So a
// level generated this way differs from the JS's only by what hex_build does, which is what
// G4's quality oracle (quality-hexbuild.cjs) needs to see.
//
//   const Y = require('./hybrid.cjs')
//   Y.install(wasmPath, { exact })   // H.build now runs the port (exact: its draw-exact mode)
//   Y.uninstall()                    // the JS's own H.build again
//   Y.calls()                        // { builds, ms }: the port's calls and their time
//
// The generator's rng (a mulberry32 closure) is handed to the port as its state; afterwards the
// JS's rng is drawn as many times as the port drew, which brings it to the port's state (each
// draw adds 0x6D2B79F5), and is checked to be there. The result is built as H.build returns it:
// the ropes, the plan, slides, wantedSlides, traps and the stats woven() and the generator read.
'use strict';
const R = require('./ref.cjs'), W = require('./wasm.cjs');

let port = null, original = null, builds = 0, ms = 0;

// A cfg of H.build (objects) as t_build's words.
function words(cfg) {
  const w = [cfg.W, cfg.H, cfg.stage, cfg.length, cfg.knots, cfg.traps || 0];
  const ms = cfg.mirrors || [];
  w.push(ms.length); for (const m of ms) w.push(m.cell.q, m.cell.r, m.axis);
  const ropes = cfg.initialRopes || [];
  w.push(ropes.length); for (const p of ropes) { w.push(p.length); for (const c of p) w.push(c.q, c.r); }
  const stops = cfg.initialStops || [];
  w.push(stops.length); for (const s of stops) w.push(s.length, ...s);
  if (cfg.initialPlan) w.push(1, cfg.initialPlan.length, ...cfg.initialPlan); else w.push(0);
  return w;
}

function build(rng, cfg) {
  if (cfg.minLength !== 2 || cfg.ropeCount || cfg.tapDepth == null) throw Error('hybrid: a cfg the port does not take');
  const state = rng.state();
  port.push(words(cfg));
  const t = performance.now();
  const ok = port.x.t_build(state | 0, cfg.coverage, cfg.tapDepth);
  ms += performance.now() - t; builds++;
  const draws = port.x.draws(), after = port.x.rng_state() >>> 0;
  for (let k = 0; k < draws; k++) rng();
  if (rng.state() !== after) throw Error('hybrid: the JS rng did not catch up with the port');
  if (!ok) return null;
  const o = port.out(); let k = 0; const next = () => o[k++];
  const n = next(), ropes = [];
  for (let i = 0; i < n; i++) { const l = next(), p = []; for (let j = 0; j < l; j++) p.push({ q: next(), r: next() }); ropes.push(p); }
  for (let i = 0; i < n; i++) { const l = next(); k += l; }  // the stops: not in H.build's result
  const pl = next(), plan = []; for (let j = 0; j < pl; j++) plan.push(next());
  const slides = next(), traps = next(), depth = next(), cost = next();
  const area = cfg.W * cfg.H, covered = ropes.reduce((s, p) => s + p.length, 0);
  const bends = ropes.map(path => path.slice(2).reduce((sum, p, j) => sum + Number(p.q - path[j + 1].q !== path[j + 1].q - path[j].q || p.r - path[j + 1].r !== path[j + 1].r - path[j].r), 0));
  const level = { W: cfg.W, H: cfg.H, ropes, ...(cfg.mirrors?.length ? { mirrors: cfg.mirrors } : {}) };
  return { ...level, plan, slides, wantedSlides: cfg.knots, traps,
    stats: { cells: area, coverage: covered / area, depth, averageDepth: cost / ropes.length, averageLength: covered / ropes.length,
      longest: Math.max(...ropes.map(p => p.length)), bends: bends.reduce((a, b) => a + b, 0), longestBends: Math.max(...bends) } };
}

function install(wasm, { exact = false } = {}) {
  const { H } = R.js();
  port = W.load(wasm);
  port.x.t_draw_exact(exact ? 1 : 0);
  if (!original) original = H.build;
  H.build = build;
  builds = 0; ms = 0;
}
function uninstall() {
  const { H } = R.js();
  if (original) H.build = original;
  original = null; port = null;
}
const calls = () => ({ builds, ms });

module.exports = { install, uninstall, calls, words };
