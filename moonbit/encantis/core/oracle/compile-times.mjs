// Compile times and the edit-check loop: the Encantis CLI on the port against moon on the MoonBit core,
// each command run R times, the commands interleaved round by round, wall clock of a fresh process.
//
//   node compile-times.mjs <a copy of moonbit/ with moon.mod and src/> [rounds=5] [--out file.json]
//
// Encantis (the CLI runs from source under bun; every run is a fresh process with no cache):
//   check on the largest file (weave.ents, 1,419 lines) and on the whole program (core.ents), `test` of one
//   module, `wasm` of the whole program plain and with -O, and `hover` (which checks the program first).
// MoonBit (moon 0.1.20261104, its build cache in the copy's _build): `moon check` and `moon build` for
//   wasm-gc and js, release, each cold (after `moon clean`) and after an edit (a comment appended to
//   hex.mbt, then removed), as one changes a file and checks again.
// The copy must be outside the repository (moon writes _build); the script edits its hex.mbt and restores it.
import { execFileSync } from 'child_process'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url)), core = path.join(here, '..');
const args = process.argv.slice(2), mbt = path.resolve(args[0]), R = +(args.find((a, i) => i > 0 && /^\d+$/.test(a)) || 5);
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;
const ENC = (process.env.ENCANTIS || 'bun /home/user/enc-wt/main/packages/cli/src/cli.ts').split(' ');
const MOON = process.env.MOON || path.join(process.env.HOME, '.moon/bin/moon');
const tmp = fs.mkdtempSync('/tmp/ct-');
const hex = path.join(mbt, 'src/core/hex.mbt'), hexText = fs.readFileSync(hex, 'utf8');
const run = (cmd, cwd) => { const t = performance.now(); execFileSync(cmd[0], cmd.slice(1), { cwd, stdio: 'pipe', maxBuffer: 1 << 28 }); return performance.now() - t; };
const enc = (...a) => () => run([...ENC, ...a], core);
const moon = (...a) => () => run([MOON, ...a], mbt);
const edited = f => () => { fs.writeFileSync(hex, hexText + '\n// edit\n'); try { return f(); } finally { fs.writeFileSync(hex, hexText); } };
const cold = f => () => { run([MOON, 'clean'], mbt); return f(); };
const steps = {
  'encantis check weave.ents (the largest file)': enc('check', 'weave.ents'),
  'encantis check hexbuild.ents': enc('check', 'hexbuild.ents'),
  'encantis check core.ents (the whole program)': enc('check', 'core.ents'),
  'encantis test hex.ents': enc('test', 'hex.ents'),
  'encantis wasm core.ents': enc('wasm', 'core.ents', '-o', path.join(tmp, 'c.wasm')),
  'encantis wasm core.ents -O': enc('wasm', 'core.ents', '-O', '-o', path.join(tmp, 'c-O.wasm')),
  'encantis hover hexbuild.ents:<line>:hex_build': enc('hover', `hexbuild.ents:${fs.readFileSync(path.join(core, 'hexbuild.ents'), 'utf8').split('\n').findIndex(l => /^export func hex_build\b/.test(l)) + 1}:hex_build`),
  'moon check, cold': cold(moon('check')),
  'moon check, after an edit of hex.mbt': edited(moon('check')),
  'moon build wasm-gc release, cold': cold(moon('build', '--target', 'wasm-gc', '--release')),
  'moon build wasm-gc release, after an edit': edited(moon('build', '--target', 'wasm-gc', '--release')),
  'moon build js release, cold': cold(moon('build', '--target', 'js', '--release')),
  'moon build js release, after an edit': edited(moon('build', '--target', 'js', '--release')),
};
// Warm both tools once (bun's and moon's first start), untimed.
run([...ENC, 'check', 'random.ents'], core); run([MOON, 'check'], mbt);
const times = Object.fromEntries(Object.keys(steps).map(k => [k, []]));
for (let r = 0; r < R; r++) for (const [k, f] of Object.entries(steps)) { times[k].push(f()); if (process.env.VERBOSE) console.error(`round ${r + 1} ${k}: ${(times[k][r] / 1000).toFixed(2)} s`); }
const med = a => { const s = [...a].sort((x, y) => x - y); return (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2; };
const result = { at: new Date().toISOString(), rounds: R, times: {} };
for (const [k, a] of Object.entries(times)) {
  result.times[k] = { median: med(a), min: Math.min(...a), max: Math.max(...a), all: a };
  console.log(`${k.padEnd(52)} median ${(med(a) / 1000).toFixed(2)} s  (${(Math.min(...a) / 1000).toFixed(2)} to ${(Math.max(...a) / 1000).toFixed(2)})`);
}
if (out) fs.writeFileSync(out, JSON.stringify(result, null, 1));
fs.rmSync(tmp, { recursive: true });
