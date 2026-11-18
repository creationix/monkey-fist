# Checking and timing an Encantis core against the MoonBit oracles

The MoonBit core is checked by `moonbit/tests/*.test.cjs` and `moonbit/scripts/*.mjs`,
and timed by `moonbit/scripts/bench-node.mjs` and `moonbit/bench/browser.mjs`. All of
them load a build through the numbers ABI of `src/gen` and `src/api` (`in_reset`,
`in_push`, `out_len`, `out_get`, ...), and instantiate it with no imports (`{}`).
An Encantis module that exports the same functions with the same output layout runs
under all of them **unchanged**: only the `.wasm` file is swapped.

`setup-harness.sh` does the swap without touching the repository. It lays out a copy of
the files the tests and scripts expect around the wasm you give it.

## The contract

- **No imports.** Six places instantiate with `{}`: `web/mf-core.js`, `web/game.js`,
  `web/generator.js`, `tests/assist.test.cjs`, `tests/generator.test.cjs` and
  `bench/browser.html`. In the game, `web/generator.js` catches the failure and
  silently uses the MoonBit JS build instead. So `Math.pow` must be computed in the
  module, or all six places must pass `{ Math: { pow: Math.pow } }`. The MoonBit builds
  ignore an extra import object, so that change is safe for them.
- **i32 and f64 only** in exported signatures. No i64, because JS would get a BigInt.
  Exporting memory is allowed and ignored.
- **The `gen` surface** (`src/gen/gen.mbt`, read by `web/generator.js`):

  | Export | Signature | Use |
  | --- | --- | --- |
  | `in_reset`, `in_push` | `() -> ()`, `(i32) -> ()` | input: UTF-16 code units of a set code or seed, or position words |
  | `out_len`, `out_get` | `() -> i32`, `(i32) -> i32` | the output words |
  | `outf_get` | `(i32) -> f64` | 0 casual wins, 1 challenge, 2 coverage of the last level |
  | `generate` | `(index: i32) -> i32` | 1 when a level of the set code in the input was made |
  | `generate_spec` | `(hex, w, h: i32, difficulty: f64, mirrors, springs, require_slide, min_mirrors, min_springs, colossal: i32) -> i32` | a level from a spec; the seed is in the input |
  | `measure` | `(games: i32) -> f64` | casual win rate of the last level; the seed is in the input |
  | `target_challenge`, `win_ceiling` | `(f64) -> f64` | |
  | `guide` | `(budget: i32) -> ()` | output: solved (1, 0, or -1 when the budget ran out), nodes, then the moves |
  | `features` | `(budget: i32) -> ()` | output: indices of reachable mirrors, then springs |

  Output words of a level: hex, W, H, par, exact, then counted ropes (each a counted list
  of q, r), counted mirrors (q, r, kind), counted springs (q, r), the counted plan, the
  counted layoutKey (code units), then slides, bounces, repeated, automatic,
  used_mirrors, used_springs, manual_mirrors, manual_springs (-1 for the last four
  where the board has no mechanics). The layout of a position for `guide` and
  `features` is in `read_position` of `src/gen/gen.mbt`.
- **The `api` surface** (`web/mf-core.js`): `parity.test.cjs` and `parity.mjs` need only
  `in_reset`, `in_push`, `out_len`, `out_get` and `generate`, and read the level up to
  its layoutKey. `bench-node.mjs` also calls `bench_casual(games: i32) -> f64`,
  `bench_par() -> i32` and `bench_solve(budget: i32) -> i32`, on the level made last
  (`src/api/api.mbt`).
- The `game_*` exports are the playable slice (`src/game`), not the core.
  `tests/game.test.cjs` and the frame half of `bench/browser.mjs` need them.

## Files

| File | What it does |
| --- | --- |
| `setup-harness.sh <dir> <gen.wasm> [api.wasm]` | Builds the harness: the JS game files as symlinks, copies of `tests/`, `web/`, `scripts/` and `bench/`, MoonBit's JS builds, and your wasm as `dist/gen.wasm`, `dist/mf.wasm` and `_build/wasm-gc/release/build/api/api.wasm` |
| `measurements-wasm.test.cjs` | The stored-measurements test of `generator.test.cjs` on `dist/gen.wasm`. The original runs on the JS build only. `setup-harness.sh` puts it in `tests/` |
| `browser-gen.mjs` | The generation half of `bench/browser.mjs`, for a build without `game_*` |
| `wasm-reps.mjs` | Journey generation in R rounds in one process, with the cost of the ABI apart |
| `custom-times.mjs` | Time per case of the 15-case custom sample, beside the JS's |

## Commands

Run these from the repository root. Wrap timings and whole suites in
`flock /home/user/enc-wt/stack-scratch/mergeup/bigjob.lock`.

```sh
H=/tmp/h  # any directory
moonbit/encantis/core/oracle/setup-harness.sh $H core.wasm
cd $H
node --test --test-name-pattern=wasm moonbit/tests/parity.test.cjs moonbit/tests/generator.test.cjs \
  moonbit/tests/assist.test.cjs moonbit/tests/measurements-wasm.test.cjs
node moonbit/scripts/dump-reference.cjs <checkout of 9e69e3a> ref.json      # once: about 2.5 min of JS
(cd moonbit/scripts && node parity.mjs ../../ref.json wasm all)             # field by field
(cd moonbit/scripts && node bench-node.mjs <checkout of 9e69e3a> 120 1)    # "MoonBit wasm-gc" row = your wasm
python3 -m http.server 4185 --bind 127.0.0.1 &                              # serve $H
python3 -m http.server 4184 --bind 127.0.0.1 --directory <checkout of 9e69e3a> &
CHROMIUM_PATH=/opt/pw-browsers/chromium node <repo>/moonbit/encantis/core/oracle/browser-gen.mjs \
  http://127.0.0.1:4185/ http://127.0.0.1:4184/ out.json
```

A checkout of 9e69e3a without a worktree: `git archive 9e69e3a | tar -x -C <dir>`.

**Checked on 18 Nov 2026.** With MoonBit's own `dist/gen.wasm` and `dist/mf.wasm`, every
wasm test passes (6 of 6), `parity.mjs` matches 135 of 135, and `browser-gen.mjs` runs.
With a 955-byte Encantis stub that exports the `gen` surface and answers every index
with Journey level 1, the same unchanged tests run, pass level 1 and report levels 2 to
120.
