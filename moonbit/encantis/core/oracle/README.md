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

## The unit oracles of the port (G1 on)

Each group checks its units against the JS at 9e69e3a, function by function, with
`check-gN.cjs` on its `test/gN.wasm` (built by `../build.sh`). The shared tooling:

| File | What it does |
| --- | --- |
| `ref.cjs` | Loads the reference (`MF_REF`, default `/home/user/mf-core-scratch/ref-9e69e3a`, made with `git archive 9e69e3a` if missing) with random.js's `mulberry32` swapped for a counting one whose state can be read. Gives the 135 boards of `reference.json` as JS boards, the position words of `read_position`, the level words of `put_level`, and positions on a board (plan prefixes and random play through `G.tap`) |
| `wasm.cjs` | `load(path)`: instantiates with `{}` and throws if the module has imports. `fake(hooks)`: the same shape over JS functions, for `--js` |
| `capture.cjs` | Records calls during real generation, module-object calls (`H.build`, `L.weave`, ...) and grid-generator.js's internal functions (through a patched copy), and replays each from its numbers alone |
| `check-g1.cjs` | G1: draws, hashes, pow, rounding, codes and specs, the layout key, the ABI through web/generator.js's own `wrap` and `decode`, keys. `--js` (the positive control) and `--controls` (one spoiled expected value per kind of output must fail and name its case) |
| `check-g1-wide.cjs` | G1, wider (G1's review): 21.5M comparisons in about 15 s. 10,000 seeds; 3.8M pow pairs over the whole range; `to_fixed` for 0 to 8 decimals up to 1e21; every UTF-16 code unit at 7 places in a code; the 79 boards of `fixtures/g1-extra-boards.jsonl`; keys at their exact reserve; and the limits (the ABI's 65,536 words, the stack's room, reserves past 2^32, text past a byte). `--js` and `--controls` as in `check-g1.cjs` |
| `check-g2.cjs` | G2: the square kernel (`tracks`, `free`, `frozen`, `dead`, `solve` at 40, 900 and 2,000, `taps`, `fewest` at 2,500, `replay`, `postpone`, `casual` x1000, `rays`) at 1,579 positions of the 35 square reference boards without springs; `knots_wanted`, `knots_for` and the styles; then `../../builder/check-weave.cjs` on the same wasm. `--extra` runs the square boards of `fixtures/g1-extra-boards.jsonl` instead (to 48x48). `--js`, `--controls` |
| `check-g2-wide.cjs` | G2, wider (G2's review): every kernel on 400 synthetic boards (1x2 to 48x48, mirrors on up to a third of the cells, ways out that loop or pass a cell twice), the 33 square reference boards with springs (springs ignored), the 131 square boards of `fixtures/g2-review-boards.jsonl` (the JS game's, from 300 random codes) and 150 "aimed" boards (exactly 1 to 3 mirrors, placed on ways out); budgets 0 (the defaults) and below, games 0 and below, junk in prefer, taps out of range; the port must trap where the JS throws. `--seed S` for other boards, `--js`, `--controls` |
| `check-g2-weave-big.cjs` | G2's review: weave calls recorded from the real generator on 48x48 colossal maps (mirrors, cores), 24x24, 30x30, 48x40 and 48x8, replayed on the port through `test/weave.ents`'s contract: output words and draws |
| `mutate-g2.sh`, `mutants-g2.cjs` | G2's review: 55 seeded one-line changes of `square.ents`, each built in a copy of `core/` and run against `check-g2.cjs` and `check-g2-wide.cjs`; a measure of what the oracles see (about an hour; under the lock) |
| `bench-g2.cjs` | Times `casual` x1000, `par` and `solve` 2,000 on L107 and L118 in the port, MoonBit wasm-gc (`dist/mf.wasm`'s `bench_*`) and the JS, interleaved, one JSON line per process; `--summary` |
| `check-g3.cjs` | G3: the Hex kernel (`compile` with its tables, `rays`, `turning`, `solve` at 40, 900, 2,000 and 2,000 with no prefer, `replay` of every prefix, `postpone`, `casual` x1000 with its draws, `fewest` at 6,000 and 2,500) at the 1,352 positions of the 33 Hex reference boards without springs, then the geometry (41,175 values). `--extra` (the 21 Hex boards of `fixtures/g1-extra-boards.jsonl`, to 48x48), `--moonbit` (MoonBit's `dist/mf.wasm` against the JS), `--reverse`, `--js`, `--controls`. About 200 s, most of it the JS |
| `check-g3-wide.cjs` | G3, wider: 400 synthetic and 150 aimed Hex boards (1x2 to 48x48, mirrors on up to a third of the cells, ways out that pass a cell twice), plans that solve, plans with a tap added and random taps; budgets 0 and below, games 0 and below, junk in prefer; the port must trap where the JS throws, and on the limits (a body cell off the board, a turning way out past 2,304 cells). `--seed`, `--boards`, `--aimed`, `--js`, `--controls`. 8 s |
| `check-g3-review.cjs` | G3's review: the calls the game and the generator make that the two above do not: `solve` at the auto-solve budget 5,000 (with and without prefer), `par` (postpone, then `fewest` at 2,500 from its plan, as `score()`), `fewest` at 30 and 300, `casual` x32 at the generator's seeds (`'casual/' + seed + '/' + attempt`), on the reference, extra and generated Hex boards (`fixtures/g3-review-boards.jsonl`: 160 levels of the JS game, to 48x48 with 224 ropes), and every check-g3 call on the generated ones. The stack peak per call. `--set`, `--frac`, `--js`, `--controls`. About 400 s in full (`check-all.sh` runs a quarter) |
| `gen-g3-review-boards.cjs` | Writes the 112 generated levels of `fixtures/g3-review-boards.jsonl` with the JS at 9e69e3a (48x48 colossal at difficulty 1, 50 and 100, edge sizes, mixed codes, 100 random codes). About 60 s |
| `mutate-g3.sh`, `mutants-g3.cjs`, `mutants-g3-review.cjs` | G3: 60 seeded one-line changes of `hex.ents` against `check-g3.cjs` and `check-g3-wide.cjs` (about 35 minutes under the lock); the review's 15 more (`MUTANTS=mutants-g3-review.cjs`) |
| `bench-g3.cjs`, `bench-g3-big.cjs` | Time `casual` x1000, `par` and `solve` 2,000 on L114 and L116 (13 and 21 ropes), and (the review's) `par`, `solve` 5,000 and `casual` x100 on three 48x48 Hex levels of 212 to 224 ropes, in the port, MoonBit wasm-gc and the JS, interleaved, one JSON line per process; `bench-g3.cjs --summary` reads either |
| `dump-hexbuild.cjs`, `check-hexbuild.cjs` | G4: 250 H.build calls recorded from the real generator (`fixtures/hexbuild-expected.json`: the Hex Journey and 15 custom codes, 4x5 to 32x32) and the port's `hex_build` in its draw-exact mode against them: ropes, stops, plan, knots, traps, depth, cost, draws, state; `intentions` three ways on each board. `--seeds N` (other states against the live JS), `--reverse`, `--js`, `--controls`. 17 s |
| `hybrid.cjs` | G4: the JS generator with `H.build` answered by the port (its rng handed over as a state and caught up after), for whole-level oracles before G7 |
| `quality-hexbuild.cjs` | G4: the quality oracle (the default mode against the JS on other seeds): `--builder` (the fixture's cfgs) and `--levels <class> --set` A, B or C, with `--report` (7 classes, `fixtures/quality-g4-report.txt`) |
| `bench-g4.cjs`, `hbench/` | G4: `hex_build` over the fixture's cfgs in the port, MoonBit wasm-gc (the `hbench` package over the unchanged `src/core`) and the JS, interleaved; `--exact`, `--summary` |
| `check-hexbuild-shadow.cjs` | G4's review: every H.build call the generator makes for 22 codes the fixture lacks (and `--journey`), compared in place with the port in draw-exact mode, as check-hexbuild compares; `--per`, `--suffix`, `--control` (the default mode must fail). About 5 minutes at `--per 12` |
| `check-hexbuild-edges.cjs` | G4's review: 32 cfgs the generator never makes (every way a core is refused, the JS's "twice" throw, the attempt limits, 1xN, 2x2, dense mirrors, 40x40 with traps), draw-exact against the JS. `--states`. 40 s at 4 |
| `check-hexbuild-d2.cjs` | G4's review: departure D2's free-cell list, asserted at every random head in a probe build made from the sources (default mode, the fixture's cfgs); `--control` (a broken list) must trap |
| `quality-g4-review.cjs` | G4's review: the quality oracle on new seeds (F, G the JS, H the port) and 9 classes (thin, tiny, spinners, colossal rules at odd sizes, difficulty extremes, mixed, large, 48x48, the Journey specs); its rule in its header; `fixtures/quality-g4-review-report.txt` and `.jsonl.gz`. About 40 minutes with 3 workers |
| `quality-g4-paired.cjs` | G4's review: `hex_build` alone, paired by cfg (8 states a set per fixture cfg; a z per cfg, summed per size group); `--offset`, `--max-cells`. About 4 minutes |
| `cov-hexbuild.cjs`, `journey-g4.cjs` | G4's review: branch counts of H.build over the fixture (what the exact oracle never reaches), and the 120 Journey levels through the generator three ways (the JS, the port draw-exact, the port default), every field compared |
| `check-g5.cjs` | G5: full geometry, the routing to the kernels and the hints (`mech.ents`, `assist.ents`) against game-engine.js, mechanics.js and hex/mechanics.js: every `G.tap` of every rope (event, distance, route, the paths after), `direction`, `allFree` routed and full, `frozenRopes`, `solve` at 40, 900, 4,000 and 900 with no prefer, the full-geometry solve on every board, `replay` (and with a move left out), `guide` at 40 and 900, `reachableFeatures` at 500 and 10,000, at 5,821 positions of all 135 reference boards (C13 and C14 sampled, `--all-positions`), and `minimumTaps` at 1,200 and 5,000 from the start of the 128 boards of at most 40 ropes. The JS's answers are cached in `/home/user/mf-core-scratch/g5/cache` (about 10 minutes of JS to fill, `--fill`, `--fresh`). `--moonbit`, `--reverse`, `--kinds`, `--js`, `--controls`. 15 s with the cache |
| `check-core-rope.cjs` | G5: `repeated_core` on the 282 repeatedCore calls the generator makes over the 135 reference levels (`fixtures/core-rope-expected.json`, `--dump`) and 3,000 on random inputs against the live JS: ropes, stops, plan, par, exact, depth, draws, state. `--js`, `--controls`, `--wide N --seed S` (the review's: other random inputs). 2 s |
| `check-g5-harness.sh` | G5: the hints through the game's glue: `assist.test.cjs` (wasm), `encantis/solver/check.cjs` and `encantis/check-features.cjs` (a copy whose boards come from `MFGame.generate`) in a harness whose `dist/gen.wasm` is `test/g5.wasm` |
| `hybrid-g5.cjs` | G5: the JS generator with every `G.tap`, `G.replay`, `G.solve`, `G.minimumTaps`, `G.allFree`, `G.direction` and `repeatedCore` answered by the port; the 135 levels compared with `reference.json`. `--only`, `--js` |
| `bench-g5.cjs` | G5: `solve` 2,000 (bench_solve) on L30, L60, L89 and L120, and the 2,084 assist checks through the glue, in the port, MoonBit wasm-gc and the JS, interleaved, one JSON line per process; `--summary` |
| `check-g5-review.cjs` | G5's review: check-g5's battery on 440 boards it never saw (the fixtures g1-extra, g2-review, g3-review and g5-review: to 48x48, both grids, 174 with spinners), plus the calls the game makes that check-g5 does not: the auto-solve `G.guide(b, paths, 5000, [])` and minimumTaps at 1,200 on boards of at most 12 ropes; the port's stack peak. The JS's answers are cached in `/home/user/mf-core-scratch/review-g5/cache` (`--fill [--part i/n]`: about an hour of JS in 3 workers, most of it the 48x48 spinner boards); `--sets`, `--only`, `--kinds`, `--controls` |
| `gen-g5-review-boards.cjs` | G5's review: writes `fixtures/g5-review-boards.jsonl` with the JS at 9e69e3a: 70 boards that all have spinners (8x8, strips, 24x24, 32x32 and 48x48/48x40 colossal on both grids, difficulty 1 to 100, 40 random codes) |
| `hybrid-g5.cjs --fixtures`, `--codes` | G5's review: the fixtures' 440 levels regenerated with G5's units on the port and compared with the JS's lines; `--codes C,... --count N --out f.jsonl` makes each level twice in one process (the JS alone, the port) and compares the whole level, its measured qualities too, with the times |
| `quality-g5-report.cjs` | G5's review: the distributions (p10, p50, p90 and the two-sample KS D) of par, challenge, casual wins, coverage, ropes, knots, traps, interaction, mechanics and time, JS against port, from `hybrid-g5.cjs --out` files |
| `check-g5-budgets.cjs` | G5's review: the full-geometry solve and guide at budgets 0, -5, 1, 2, 3, 7 and 25, with and without the plan, against the live JS on the 133 reference boards of at most 60 ropes (the edges of solve_full's reserve): 103,992 comparisons, 30 s |
| `stress-g5-stack.cjs` | G5's review: the port alone (no JS) on the 23 fixture boards of at least 1,000 cells at random positions: the auto-solve guide(5000), solve(4000) with the plan, features(10000) and frozen; each board's stack peak, and any trap fails it |
| `check-g6.cjs` | G6: measured play (`play.ents`) and the interaction analysis (`metrics.ents`) against grid-generator.js and dependency-metrics.js. `direct`: on the 135 reference boards with their plans and par, `F.coverage`, `F.valid`, regional, trivial, featuresUsed, `F.featureStats` (manual = par, 0, all), generate()'s slideStats, postpone, `F.score` (and with skip), `F.casualRate` x100 and x1000 at hashString('bench') with draws (x10 on C13, C14), `Q.analyze` (manual = par, all; the interaction and five counts). `derived`: boards of the ropes left after each quarter of each plan (where trivial, regional and featuresUsed reject). `mutated`: five broken copies a board (valid rejects) and the plan with a tap not allowed (featureStats null). `calls`: `fixtures/g6-calls.json.gz`. `stored`: the 120 Journey measurements of grid-journey-measurements.json at 9e69e3a. The JS's answers are cached in `/home/user/mf-core-scratch/g6/cache` (`--fill`: about 4 minutes of JS; `--extra` adds the 79 g1-extra boards, to 48x48). `--parts`, `--only`, `--reverse`, `--js`, `--controls` |
| `dump-g6.cjs` | G6: records G6's units (valid, coverage, regional, trivial, featuresUsed, featureStats, postpone, score, casualRate, Q.analyze) while the generator makes the 135 reference levels and the 70 of g5-review-boards.jsonl, rejected candidates included, sampled by a fixed rule (every rejection, and every s-th other call, at most 150 a function and source); each record re-run from its numbers by the JS; `--check` re-runs the fixture |
| `hybrid-g6.cjs` | G6: the JS generator with those units answered by the port; the 135 levels compared with `reference.json`; `--codes C,... --count N` makes each level twice (the JS alone, the port) and compares the whole level, its measured qualities too. `--only`, `--js` |
| `bench-g6.cjs` | G6: the kernel stage of bench-node.mjs on its 8 boards (casual x100 and x1000, par: bench_casual and bench_par) in the port, MoonBit wasm-gc and the JS, interleaved, one JSON line per process; `--summary` |
| `gen-extra-boards.cjs` | Writes `fixtures/g1-extra-boards.jsonl` with the JS at 9e69e3a: 4x4, 8x8 with mechanics, strips, 48x48 colossal square and Hex (up to 223 ropes), 60 random codes. About 80 s |
| `bench-g1-pow.cjs` | Times `target_challenge` (G1's `pow`) in the port, in the port with reinterpret in place of its scratch cell (a WAT patch), in MoonBit wasm-gc and in the JS: 140, 69, 50 and 49 ns a call on 18 Nov |
| `check-all.sh` | Every `check-gN*.cjs` there is: run it after a compiler change |
| `size.cjs` | Tokens and lines against the MoonBit replaced, imports and restated types apart |
| `gen-journey-ents.cjs` | Writes `../journey.ents` from grid-journey.js |

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
