// G4's review: departure D2's invariant, checked where it is used. D2 draws a shape's random head
// from a list of the free cells kept as ropes are laid (hexbuild.ents: open_cells, open_at,
// open_n, held), which the exact oracle never sees (draw-exact mode does not use it) and the
// quality oracle sees only through distributions. This builds a probe of the port with asserts
// added at every random head, in the default mode: every free cell is listed once at its place,
// the list holds nothing else but the cells a knot's first rope holds, and the head drawn is free;
// then runs it on the fixture's cfgs from other states. A broken list traps (unreachable).
//
//   node check-hexbuild-d2.cjs [--seeds 2] [--dir scratch]   the probe must not trap
//   node check-hexbuild-d2.cjs --control                      a probe with the kept gaps left on
//                                                             the list must trap
// The probe is made from the current sources by text substitution (each must apply once) in a
// copy of the core under --dir (default /home/user/mf-core-scratch/review-g4/probes/d2), with
// ENCANTIS (default: bun /home/user/enc-wt/main/packages/cli/src/cli.ts).
'use strict';
const fs = require('fs'), path = require('path');
const { execSync } = require('child_process');
const W = require('./wasm.cjs'), D = require('./dump-hexbuild.cjs'), C = require('./check-hexbuild.cjs');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const CORE = path.join(__dirname, '..');
const DIR = opt('--dir', '/home/user/mf-core-scratch/review-g4/probes/d2');
const SEEDS = Number(opt('--seeds', 2)), CONTROL = args.includes('--control');
const ENCANTIS = process.env.ENCANTIS || 'bun /home/user/enc-wt/main/packages/cli/src/cli.ts';

function probe() {
  fs.rmSync(DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(DIR, 'test'), { recursive: true });
  fs.cpSync(path.join(CORE, 'lib'), path.join(DIR, 'lib'), { recursive: true });
  for (const f of fs.readdirSync(CORE)) if (f.endsWith('.ents')) fs.copyFileSync(path.join(CORE, f), path.join(DIR, f));
  fs.copyFileSync(path.join(CORE, 'test/g4.ents'), path.join(DIR, 'test/g4.ents'));
  let src = fs.readFileSync(path.join(DIR, 'hexbuild.ents'), 'utf8');
  const swap = (from, to) => {
    const at = src.split(from).length - 1;
    if (at !== 1) throw Error(`hexbuild.ents: the text to substitute appears ${at} times: ${from.slice(0, 60)}`);
    src = src.replace(from, to);
  };
  swap('  let open = open_n - held\n  return -1 when open <= 0', `  let open = open_n - held
  let count = 0  // probe: the open list is exactly the free cells, each at its place
  for c in area {
    if free(c as i32) {
      count += 1
      assert open_at[c] >= 0 && open_at[c] < open_n
    }
  }
  assert count == open
  for k in open_n as u32 {
    assert open_at[open_cells[k]] == k as i32
  }
  return -1 when open <= 0`);
  swap("    return c when occupied[c] != 9999  // the cells a knot's first rope holds are not free", `    if occupied[c] != 9999 {
      assert free(c)  // probe
      return c
    }`);
  if (CONTROL) swap('          kept[x] = 1\n          shut(x)\n', '          kept[x] = 1\n');
  fs.writeFileSync(path.join(DIR, 'hexbuild.ents'), src);
  const out = path.join(DIR, 'g4-probe.wasm');
  execSync(`${ENCANTIS} wasm ${path.join(DIR, 'test/g4.ents')} -o ${out}`, { stdio: 'pipe' });
  return out;
}

const port = W.load(probe());
port.x.t_draw_exact(0);
let n = 0, built = 0, traps = 0;
const t0 = Date.now();
for (const c of D.read().cases) for (let k = 0; k < SEEDS; k++) {
  port.push(C.cfgWords(c.cfg));
  try { built += port.x.t_build(C.otherSeed(c.state, 500 + k) | 0, c.cfg.coverage, c.cfg.tapDepth); } catch (e) { traps++; if (traps <= 3) console.log('TRAP', c.id, c.from, String(e)); }
  n++;
}
console.log(`${CONTROL ? 'control (kept gaps left on the list): ' : ''}${n} default-mode builds, ${built} built, ${traps} trapped, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
process.exit(CONTROL ? (traps ? 0 : 1) : (traps ? 1 : 0));
