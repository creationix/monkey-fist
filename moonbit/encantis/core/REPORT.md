# The Monkey Fist core in Encantis: report

For the owner's request of 18 Nov 2026: *"try to rewrite the core monkeyfist code using latest
encantis and see how it performs (both DX and runtime)"*.

Compiler: encantis origin/main **399ca7e** (Release 0.3.0, 19 Nov). It has `lib/vec.ents`, the
generics-across-modules work of #29 to #31, and #32 to #34 after them. The port was written against
four successive commits of main (03225bc, 8f459f1, 0c7737d, 399ca7e); at 399ca7e every wasm of the
port rebuilds byte for byte. The compiler was never edited. The JS reference is 9e69e3a. Node 22.23.4,
Chromium 153.0.8010.12, moon 0.1.20261104. Measured 19 Nov 14:40 to 15:40 on this 4-CPU machine, every
timing under the shared lock with the machine otherwise idle (load 0.3 to 1.5).

## The answer

**Yes: Encantis now does this job.** The whole generator core (MoonBit's `src/core`, `src/gen` and
the `bench_*` hooks of `src/api`, 37.6k MoonBit tokens) is ported. `core.wasm` (113,721 bytes, no
imports) drops in for MoonBit's `dist/gen.wasm`: the game's glue (`web/generator.js`) and MoonBit's
own tests drive it unchanged.

- **Correct.** Every rule of the game and every measurement of a given board (geometry, taps, tracks,
  solve, replay, par and fewest taps, minimum taps, frozen and free ropes, the hints, coverage,
  validity, score, feature stats, the interaction analysis, casual play) is bit for bit the JS's, on
  every board MoonBit is checked on and on thousands more. Generation keeps the JS's decisions
  everywhere except the Hex builder, which draws about a third fewer random numbers. So square
  levels are the JS's own, and Hex levels are new ones with the same qualities: 746
  distribution tests over 25 spec classes, 0 rejected, and 0 invalid levels among 5,207 checked.
- **Faster than MoonBit.** The 120 Journey levels take 4.2 s in Node against MoonBit wasm-gc's
  9.4 s (**2.2x**; 2.0x on the very same levels), MoonBit's JS build's 17.8 s and the JS game's
  72.9 s (17x). In Chromium the figures are 3.1 s against 7.9 s (**2.5x**), 14.9 s and 54.6 s.
  After a cold load, the first 12 levels are ready 1.8 to 1.9 times sooner than MoonBit's. The
  kernels run at 0.91x to 4.9x MoonBit's speed; the only one below 1x is square casual play on L118.
- **Smaller.** 113,721 bytes (43,535 gzipped) against gen.wasm's 137,415 (54,882), and 88,615
  (38,243) with `--release`. It needs no wasm-gc, so the reason for MoonBit's 588 KB JS fallback
  (Safari before 18.2) goes away.
- **The cost is in the source and the tools.** The port is **1.44x** MoonBit's tokens of code
  (**1.73x** counting the import declarations and restated types Encantis needs), down from the
  2 to 2.7x that ENCANTIS.md measured on two kernels. The main costs:
  - 54 closures written by hand as context structs or module globals;
  - 26 options and tags by hand;
  - 163 unchecked table reads;
  - 47 lists given their room up front;
  - 54 renames because `let` is function-scoped;
  - 423 i32/u32 casts;
  - a fixed 16 MiB stack that a few non-game inputs overflow;
  - 7 compiler and tooling bugs, two of them silent wrong code (avoided by rule, but for one latent
    site of bugs/02 in abi.ents that the verification found, harmless as called; no oracle caught
    either one).

  The edit-check loop is 8 to 25 times slower than MoonBit's: `check` takes 3.8 s on the whole
  program against moon's 0.15 to 0.2 s.
- **The Journey changes.** On the owner's decision, the Journey seeds were picked again by the
  game's own seed search, run on the port's generator (28 s, against 530 s for the JS's search).
  **82 of the 120 positions now show a level other than the JS game's**: 60 maps are new (every Hex
  level), and 22 square maps moved within their chapter. All 120 are valid, and their distributions
  match the JS Journey's. A fallback build (MoonBit's JS build or `grid-generator.js`) would generate
  the JS game's Journey instead. Freezing the port's 60 Hex levels as data closes that gap for
  15,202 packed bytes (7,384 gzipped), with the port's Journey table in place of grid-journey.js;
  all 120 levels would take 31,428 (15,354) (§1.4).

Whether to switch is the owner's call. The speed, the size and the parity are real, and a wasm-gc
browser floor is no longer needed. Against them stand a source 1.7x the MoonBit's, closures written
out by hand, a slower edit loop, and a young compiler whose two silent bugs the port avoids by rule (one
latent site excepted, §8).
§5 has the details.

## 1. Correctness

### 1.1 Exact parity: the rules and the measurements of a board

Every group was checked function by function against the JS at 9e69e3a before the next began, and
each check was then widened by an adversarial review. Counts are comparisons, each of one call's
whole output. Every row has 0 failures.

| Group | What | Exact checks (0 failed) |
| --- | --- | --- |
| G1 | draws, hashes, base 36, fdlibm `pow` (V8's variant), `toFixed`, rounding, set codes and specs, the layout key, the ABI's words, word-keyed sets | 4.4M + 21.5M (wide: 10,000 seeds, 3.8M `pow` pairs over every branch of e_pow.c, every UTF-16 code unit in a code, 79 more boards) |
| G2 | square kernel: tracks, free, frozen, dead, solve, fewest, replay, postpone, casual, rays; the square woven builder | 22,106 (1.54M values) on 1,579 positions; 423,000 on 714 boards x 4 seeds; weave 249 + 4,980 + 224 runs |
| G3 | Hex kernel: compile, rays, turning, solve, replay, postpone, casual, fewest | 16,224 (2.24M values) + 41,175 geometry + 48,589 wide + 40,640 review (generated Hex levels to 48x48) |
| G4 | the Hex woven builder, draw-exact mode | 250 recorded builds + 5,250 from other states + 3,538 shadowed in real generation + 128 edge cfgs: 116,000 comparisons over 1.5M words |
| G5 | full geometry (every tap of every rope), routing, solve, replay, minimum taps, the hints, the repeated-slide core | 93,527 (3.86M values) on all 135 reference boards + 291,464 on 440 more + 103,992 at odd budgets + 63,282 core calls |
| G6 | coverage, valid, regional, trivial, feature stats, slide stats, postpone, score, casual rate, the interaction analysis | 13,813 + 26,241 + 183,888 (fuzz) + 114,740 calls shadowed in the generation of 1,938 levels |
| G7 | mirrors, the woven candidate, spinners, `grid_generate` (the JS's mode) | 2,821 recorded calls (556,393 values) + 1,352 edge cases + 26 levels where rare rules decide |

**Through the game's own glue and MoonBit's own tests, unchanged** (`oracle/setup-harness.sh` puts the
wasm where `dist/gen.wasm` was):

| Test or script (MoonBit's, unchanged) | MoonBit gen.wasm | Encantis g7.wasm (the JS's mode), plain and `-O` | Encantis core.wasm (the port's own levels), plain and `-O` |
| --- | --- | --- | --- |
| `scripts/parity.mjs`: the 135 reference levels (120 Journey, 15 custom), field by field | 135 of 135 | **135 of 135** | 46 of 135: the 38 Journey positions and 8 custom levels that are square; the 89 that differ are Hex levels, by design |
| `tests/assist.test.cjs`: guide and features at 521 positions (2,084 checks) | pass | **pass** | **pass** |
| `tests/generator.test.cjs`: every Journey level and every custom set equals the JS generator's | pass | **pass** | fails by design: the Hex levels are new |
| `tests/parity.test.cjs`: the 120 Journey levels and the custom sample against the stored JS | pass | **pass** | fails by design, as above |
| the stored play measurements of every Journey spec (`measurements-wasm.test.cjs`, on `dist/gen.wasm`) | pass | **pass** (the JS's table) | **pass** (the port's table, `fixtures/journey-port-measurements.json`) |

So in the JS's mode the port passes everything MoonBit's build passes. In its own mode it passes
everything that does not ask for the JS's Hex levels: every rule and measurement check passes, and
the identity checks differ exactly where its Hex builder departs.

The game's Chromium tests (`tests/game.test.cjs`) exercise MoonBit's playable slice (`src/game`), which
is not part of the core and was not ported.

**On the port's own boards** (Hex maps the JS never made), the rules stay exact:

- 34,151 hint answers (guide at 900 and 5,000, and reachable features) at 7,012 positions of 168 of
  the port's levels: 0 differ.
- Every one of 3,767 class levels and 1,000 replicates, re-measured by the JS's kernels: the plan
  replays at par; validity, coverage, slide stats and feature stats; and the stored casual win rate,
  bit for bit. 0 problems.

**This measurement reran** `build.sh` (42.7 s; every wasm byte for byte) and `oracle/check-all.sh`
(every group's oracle, G1 to G7, with the reviews' checks): **every check passed** (40 checks,
23 min 46 s, under the lock; `oracle/fixtures/measure/check-all.log`). The optimized builds (`wasm
-O`, `--release` and `wasm-opt -O3`) pass too: those of `test/g7.ents` the unit oracle in both modes
(556,393 values each), those of `core.ents` the port's Journey check, and all of them the robustness
checks.

### 1.2 Generation: the same qualities

Generation may differ (the owner's decision of 19 Nov), so its oracle is quality equivalence.

- **(a) Every level the port makes is valid**, checked by the exact kernels: solvable, its par and
  plan replay to a win, and the spec's size, grid, mirrors and spinners respected.
- **(b) Its distributions match the JS generator's**, with the spread between two JS seed sets as
  the yardstick.

The rule was fixed before each set was made: a two-sample KS test at 1% of the port against the JS's
two sets pooled, for every metric of every class, and a test of proportions for the levels given up
on.

**25 classes, 5,240 specs, 3 sets each** (`oracle/fixtures/quality-summary.txt`, from
`quality-summary.cjs`). The classes:

- the Journey's Hex specs on 14 new seeds (the square Journey levels are the JS's own);
- 4x4 to 8x8, 12x12 to 16x16, 20x20 to 24x24, and 24x4 to 8x24 strips;
- 32x32 and 48x48 colossal, and 40x40 and 8x48 colossal;
- square, Hex and mixed sets;
- plain, mirrors, spinners, and mirrors with spinners;
- difficulties 1 to 100, and four classes at a single difficulty (25, 60, 85 and 100).

The results:

- **0 invalid** port levels: 1,440 from G7 and 3,767 from its review.
- **0 of 746 KS tests reject.** The largest distance between the port and the JS is 0.92 of its
  critical value (offTarget on the mixed class). Between the JS's own two sets the largest is 0.95.
- **Failure rates are no different.** The Journey's Hex specs gave up on 19, 12 and 9 (JS A, JS B,
  port) of 240; 11, 16 and 12 of 240; and 17, 21 and 21 of 360. Every other class gave up on 0 or 1.
- **Check (c), cheaper.**
  - On the same seeds, the port's square levels equal the JS's: 300 of 300 in the review's classes.
  - The JS generator running the port's Hex builder makes exactly the port's levels: 1,440 of 1,440,
    metric for metric. So every decision outside `hex_build` is the JS's.

Both distributions for every metric are in `fixtures/quality-g7-report.txt` (7 classes) and
`fixtures/quality-g7-review-report.txt` (18 classes): p10, p50 and p90 of JS A, JS B and the port,
D(A,B), D(port, A+B) and the critical value. Pooled over the review's 18 classes (3,800 specs a set;
the three sets share every spec), p10 / p50 / p90 and the mean:

| Quality | JS, seed set A | JS, seed set B | Encantis port | D(A,B) | D(port, A+B) (1% critical) |
| --- | --- | --- | --- | ---: | ---: |
| par (fewest player taps) | 9 / 17 / 73 (31.8) | 9 / 17 / 73.6 (32.0) | 8.6 / 17 / 74 (31.9) | 0.008 | 0.006 (0.032) |
| measured challenge | 1.00 / 6.06 / 10.8 (6.11) | 1.00 / 6.00 / 11.0 (6.10) | 1.00 / 6.13 / 10.9 (6.10) | 0.009 | 0.011 (0.032) |
| miss from targetChallenge | 0.17 / 0.95 / 4.68 (1.77) | 0.16 / 0.95 / 4.64 (1.77) | 0.15 / 0.94 / 4.61 (1.75) | 0.010 | 0.011 (0.032) |
| excess over winCeiling | 0 / 0 / 0.080 (0.027) | 0 / 0 / 0.093 (0.029) | 0 / 0 / 0.090 (0.028) | 0.009 | 0.003 (0.032) |
| casual win rate | 0.094 / 0.594 / 1 (0.596) | 0.100 / 0.594 / 1 (0.599) | 0.100 / 0.594 / 1 (0.597) | 0.009 | 0.006 (0.032) |
| coverage | 0.877 / 0.920 / 0.961 | 0.878 / 0.921 / 0.960 | 0.877 / 0.920 / 0.961 | 0.016 | 0.010 (0.032) |
| ropes | 10 / 18 / 72 (31.8) | 10 / 18 / 72.8 (31.9) | 10 / 17 / 75 (32.0) | 0.012 | 0.010 (0.032) |
| mean rope length | 5.50 / 7.75 / 9.73 | 5.50 / 7.77 / 9.78 | 5.33 / 7.78 / 9.80 | 0.019 | 0.018 (0.032) |
| knots | 1 / 3 / 4 (2.92) | 1 / 3 / 5 (2.93) | 1 / 3 / 5 (2.93) | 0.009 | 0.003 (0.034) |
| traps | 0 / 1 / 3 (1.16) | 0 / 1 / 3 (1.13) | 0 / 1 / 3 (1.13) | 0.014 | 0.004 (0.032) |
| mirrors | 0 / 2 / 5 (2.02) | 0 / 2 / 5 (2.01) | 0 / 2 / 5 (1.99) | 0.007 | 0.011 (0.032) |
| spinners | 0 / 0 / 1 (0.520) | 0 / 0 / 1 (0.517) | 0 / 0 / 1 (0.518) | 0.002 | 0.000 (0.032) |
| turns | 29 / 61 / 251 (125.1) | 29 / 61 / 253 (125.4) | 30 / 61 / 251 (125.1) | 0.010 | 0.012 (0.032) |
| interaction | 1.08 / 3.43 / 5.12 (3.25) | 1.04 / 3.51 / 5.20 (3.29) | 1.06 / 3.40 / 5.18 (3.25) | 0.030 | 0.017 (0.034) |
| mutual-wait ropes | 0.2 / 5 / 12 (6.35) | 0 / 6 / 12 (6.36) | 2 / 6 / 12 (6.41) | 0.012 | 0.007 (0.034) |
| largest coupled group | 7 / 15 / 38 (19.0) | 6 / 15 / 38 (19.0) | 7 / 15 / 39 (19.0) | 0.015 | 0.010 (0.034) |
| dependency edges | 10 / 23 / 62 (29.9) | 10 / 22 / 64 (30.1) | 10 / 22 / 63 (30.0) | 0.010 | 0.010 (0.034) |
| levels given up on | 28 of 3,800 | 37 of 3,800 | 33 of 3,800 | | |
| generation time, ms a level | 4.7 / 60.6 / 260 (104) | 4.7 / 60.7 / 267 (102) | 3.5 / 51.2 / 244 (91.8) | | the port's own mode is 12% faster |

The other 15 metrics are in the summary file, all 32 within the JS's spread. In the table "JS" is
`test/g7.wasm` in the JS's mode. 68 of 68 spot levels across 16 classes equal `F.generate` itself,
and 135 + 60 levels equal it through the glue. G7's 7 classes used the real JS at 9e69e3a.

Generation time is a quality the port keeps: in its own mode it takes 0.75x to 1.03x the JS's-mode
time in every class (§2 has the JS itself).

### 1.3 Departures from the JS's exact behaviour

| | Where | What, and what it saved |
| --- | --- | --- |
| D1, D2 (G4) | `hex_build` | A knot attempt gives up as soon as its second rope's way out misses the first. A shape's 24 tries at a free cell become one draw over a kept list of free cells. Together they make 35% fewer draws (30.2M to 19.5M over the fixture) for 16% of the builder's time, with the same law. **This is the only reason any level differs.** |
| G7-1 | the Journey | its own seeds, picked by the game's search on the port (§1.4) |
| G7-2 | `generate_spec` | gives 0 for no cells or more than 48x48 cells: the static tables are sized for the game's largest board |
| G7-3, G4 | small | `add_spinners`'s seen set is a byte table, not a `Map` of keys. A core whose compile fails gives none where the JS throws (the generator catches the throw either way). No level changes |
| S1 to S5, W1 to W5 | searches and casual play | stamping a position once for all its taps, seen-state tables, no route copies: these change time and memory, not answers |

`set_draw_exact(true)` (test/g7.wasm's mode) restores the JS's draws: with it, the whole generator is
the JS's, level for level.

### 1.4 The Journey, and the JS fallback

- **The search.** `oracle/journey-search.cjs` is `scripts/build-grid-journey.cjs` with only
  `F.generate` and `F.casualRate` replaced by the wasm. Everything else is the same: the plan of 120
  positions, the candidates, the size step-up, the acceptance rules (the generator's, no map twice, at
  most five ropes in chapter 1), the measurement (96 casual games, 24 with spinners), the choice
  closest to the target and the chapter order.
  - It took 28.1 s on core.wasm (805 candidates); the JS's own search takes 530 s.
  - Its control, the JS's mode, gives `grid-journey.js` back seed for seed, with every measurement.
  - The table is `oracle/fixtures/journey-port.js`, in grid-journey.js's format;
    `gen-journey-ents.cjs` writes it into `journey.ents`. The game's `grid-journey.js` is untouched.
- **What changed.** 60 of the 120 maps are new: every Hex level. The 60 square maps are the JS's own,
  but 22 of them sit at another position, because each chapter is ordered by measured challenge.
  **82 of the 120 positions show a level other than the JS game's.** 74 rows of the table differ in
  seed or size.
- **Every new level was checked**:
  - valid by the exact kernels and the search's rules;
  - measured as stored (`check-journey-port.cjs`, 120 of 120);
  - its hints exact (24,226 answers).
- **Distributions.** Against the JS's own search on 16 master seeds (480 levels a side for each
  group of four), 208 of 208 KS tests pass, and 0 levels are invalid. A paired test of the Hex
  interaction, fixed before its 8 seeds ran, was not rejected (t -0.30). Between the two MONKEYFIST
  tables every distance is below its critical value. The chapter means of challenge, wins and par
  follow the JS's, and neither table has a level above its win ceiling.

**The fallback.** `web/generator.js` loads `dist/gen.wasm`, then MoonBit's JS build, then
`grid-generator.js`. Both fallbacks make the JS game's Journey. With core.wasm as `gen.wasm`, a
device on a fallback would show another level at 82 of the 120 positions (and its saved scores would
point at other levels). Two things make this smaller than it was with MoonBit:

- core.wasm needs no wasm-gc, so MoonBit's JS build, which existed for Safari before 18.2, has no
  reason left. A fallback would happen only where WebAssembly itself is unavailable (for example
  iOS Lockdown Mode, inferred, not tested).
- The JS generator given the port's table (`journey-port.js` in place of `grid-journey.js`, the same
  format and size: 14,229 against 14,183 bytes) makes the port's 60 square levels itself, because
  square generation is the JS's draw for draw.

So freezing the 60 Hex levels is enough. What freezing costs (`oracle/journey-freeze-cost.cjs`; the
layout key and measurements are left out, since both follow from the board):

| Frozen as | Bytes | gzip -9 |
| --- | ---: | ---: |
| the 60 Hex levels, packed (a byte a value), for a JS fallback or a wasm data block | 15,202 | 7,384 |
| the 60 Hex levels as compact JSON (arrays of numbers) | 34,494 | 8,342 |
| all 120 levels, packed | 31,428 | 15,354 |
| all 120 levels as compact JSON / as the game's board objects in JSON | 70,095 / 211,106 | 17,171 / 22,702 |

Shipping the port's Journey also needs `grid-journey.js` replaced by `journey-port.js`, because
`web/generator.js` merges `E.spec(options)` into the board, and a `GRID_VERSION` bump so that saved
scores of old levels do not carry over. A JS build of core.wasm itself (`wasm2js`) is not available
today: binaryen 129 stops at the multi-value returns Encantis emits (`wasm2js cannot convert
(tuple.extract ...)`).

## 2. Runtime

The existing harnesses were extended for Encantis builds rather than replaced:
- `scripts/bench-node.mjs` takes `--enc <name>=<file>`, `--rounds R`, `--cold <engine>` and `--out`;
- `bench/browser.html` and `bench/browser.mjs` take `enc=`, `rounds=` and `cold=`, plus `GEN_ONLY` and
  `OUT`.

Without the new flags each still does what it did. Every engine runs through `web/mf-core.js`'s
`wrap`, so the ABI's in and out are included. The engines:

| Engine | What |
| --- | --- |
| **Encantis core.wasm** | the port as it ships: its own Hex builder and its own Journey |
| **Encantis g7.wasm** | the same code in the JS's mode (JS's draws, the JS's Journey): **the same 120 levels MoonBit and the JS make**, for a like-for-like comparison |
| `-O` | `encantis wasm -O` (binaryen `-Oz`) of each |
| core `wasm-opt -O3` | binaryen's speed setting, for reference (not an Encantis option) |
| MoonBit wasm-gc | `dist/mf.wasm` (the same core as `gen.wasm`) |
| MoonBit JS | `dist/mf.js` |
| JS game | the 9e69e3a reference |

**Steady state** is rounds 2 to 6 of one process (Node) or one page (Chromium), every engine
generating all 120 Journey levels in turn in each round: the median and range of the round totals.
**First run** is round 1 of the same run. **Cold start** uses a fresh process (Node) or a fresh browser
(Chromium) per sample: the load, then the first 12 levels, as median and range over 5 samples per
engine, interleaved. The raw data and the session's scripts are in `oracle/fixtures/measure/`.

### 2.1 The 120 Journey levels

| Engine | Node: steady median (range), ms | Node: round 1 | Chromium: steady median (range) | Chromium: round 1 | MoonBit wasm-gc / it (Node, Chromium) |
| --- | ---: | ---: | ---: | ---: | --- |
| **Encantis core.wasm** | **4,247** (4,145 to 4,304) | 4,240 | **3,143** (2,806 to 3,188) | 3,199 | **2.21x, 2.51x** |
| Encantis core.wasm, `-O` | 4,218 (4,052 to 4,433) | 4,409 | 3,124 (2,937 to 3,305) | 3,017 | 2.22x, 2.53x |
| **Encantis g7.wasm (the same levels)** | **4,628** (4,329 to 4,864) | 4,916 | **3,349** (3,288 to 3,607) | 3,526 | **2.03x, 2.36x** |
| Encantis g7.wasm, `-O` | 4,400 (4,134 to 4,589) | 4,819 | 3,431 (3,028 to 3,556) | 3,294 | 2.13x, 2.30x |
| Encantis core.wasm, `wasm-opt -O3` | 3,885 (3,516 to 3,955) | 4,066 | 3,160 (3,058 to 3,549) | 3,405 | 2.42x, 2.50x |
| MoonBit wasm-gc | 9,383 (9,131 to 9,663) | 9,229 | 7,894 (7,570 to 8,378) | 8,532 | 1 |
| MoonBit JS build | 17,821 (17,250 to 19,423) | 17,512 | 14,902 (14,286 to 15,395) | 15,949 | 0.53x, 0.53x |
| JS game | 72,926 (69,989 to 75,118) | 70,013 | 54,582 (53,512 to 56,804) | 55,394 | 0.13x, 0.14x |

- **Level by level, on the same levels** (g7.wasm against MoonBit wasm-gc, last round): MoonBit takes
  1.82x the port's time at the median (1.06x at the 10th percentile, 2.54x at the 90th) in Node, and
  2.26x in Chromium (1.22x to 3.31x). The JS takes 11 to 12x at the median (3x to 40x).
- **The slowest Journey level:**

  | | Encantis (core.wasm, g7.wasm) | MoonBit wasm-gc | MoonBit JS build | JS |
  | --- | ---: | ---: | ---: | ---: |
  | Node | 108 ms, 136 ms | 319 ms | 535 ms | 2,336 ms |
  | Chromium | 87 ms, 83 ms | 207 ms | 430 ms | 1,697 ms |

- **`-O`** (`-Oz`, for size) changes the time by -5% to +2%, within the rounds' range. `wasm-opt -O3`
  gains 9% in Node and nothing measurable in Chromium.
- **The custom sample** (the 15 custom levels of reference.json: 4x5 to 24x24, 40x40 and 32x32
  colossal, both grids; `oracle/bench-g7.mjs --custom`, 6 interleaved rounds, steady median and
  range):

  | | ms | MoonBit / it |
  | --- | ---: | ---: |
  | core.wasm | 1,517 (1,417 to 1,565) | 3.0x |
  | g7.wasm | 2,043 (2,022 to 2,209) | 2.2x |
  | MoonBit gen.wasm | 4,589 (4,420 to 4,760) | 1 |
  | the JS (G7's run) | 52.7 s | |

### 2.2 First run: the load and the first levels

Median (range) of 5 fresh processes or browsers. Encantis's first 12 levels on core.wasm are partly
other levels than the JS game's, so g7.wasm is the like-for-like row.

| Engine | Node: load | Node: load + level 1 | Node: first 12 levels | Chromium: fetch + compile + instantiate | Chromium: + level 1 | Chromium: first 12 levels |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Encantis core.wasm | 1.3 ms | 5.2 (4.9 to 5.5) | 84.5 (81 to 107) | 8.7 | 16.3 (11.6 to 18.7) | 83.7 (80 to 89) |
| Encantis g7.wasm | 1.3 | 6.6 (5.5 to 7.4) | 74.9 (64 to 95) | 9.9 | 17.8 (12.7 to 21.6) | 70.3 (65 to 88) |
| Encantis g7.wasm `-O` | 1.2 | 6.1 (5.2 to 6.8) | 61.6 (59 to 79) | 7.7 | 15.6 (10.9 to 20.1) | 82.9 (77 to 90) |
| MoonBit wasm-gc | 2.8 | 12.7 (11.1 to 14.6) | 137.1 (121 to 154) | 10.2 | 22.4 (16.9 to 24.2) | 136.7 (128 to 141) |
| MoonBit JS build | 19.3 | 42.6 (40.8 to 55.1) | 306.2 (287 to 343) | 25.2 | 55.2 (48.2 to 59.7) | 343.7 (318 to 413) |
| JS game | 7.2 | 28.9 (24.2 to 40.3) | 409.7 (399 to 481) | 41.9 | 62.4 (55.9 to 74.9) | 376.9 (347 to 453) |

Warm, the same 12 levels take 57.8 ms on g7.wasm, 78.0 on MoonBit wasm-gc and 331 on the JS (Node,
the last round). Encantis's first run costs about 1.3x its steady state, MoonBit wasm-gc's 1.8x, so
the port's lead is largest right after load.

### 2.3 Kernels (Node, the boards of bench-node.mjs, median of 5 interleaved repetitions, ms)

Encantis is g7.wasm, whose boards are MoonBit's and the JS's. Every engine returned the same value on
every row.

| Board (Journey level) | Kernel | Encantis | Encantis `-O` | MoonBit wasm-gc | MoonBit JS | JS | MoonBit / Encantis |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| L30 square, spinners, 22 ropes | casual x100 | 2.40 | 2.08 | 9.36 | 16.13 | 182.4 | 3.90x |
| | par | 0.180 | 0.204 | 0.283 | 0.479 | 4.37 | 1.57x |
| | solve 2000 | 0.044 | 0.040 | 0.105 | 0.257 | 1.27 | 2.37x |
| L60 square, mirrors, spinners | casual x100 | 2.10 | 1.80 | 5.72 | 11.20 | 171.0 | 2.72x |
| | par | 0.126 | 0.127 | 0.202 | 0.363 | 3.78 | 1.59x |
| | solve 2000 | 2.54 | 2.33 | 10.00 | 20.25 | 143.3 | 3.94x |
| L89 square, spinners | casual x100 | 2.05 | 1.84 | 7.43 | 14.76 | 195.8 | 3.61x |
| | par | 0.247 | 0.241 | 0.316 | 0.612 | 5.95 | 1.28x |
| | solve 2000 | 0.064 | 0.056 | 0.127 | 0.250 | 1.84 | 1.98x |
| L120 square, mirrors, spinners, 38 ropes | casual x100 | 6.11 | 5.19 | 29.88 | 58.38 | 890.7 | 4.89x |
| | par | 1.13 | 1.27 | 1.59 | 3.20 | 31.8 | 1.41x |
| | solve 2000 | 0.140 | 0.129 | 0.505 | 0.900 | 10.27 | 3.60x |
| L107 square, 50 ropes | casual x1000 | 16.76 | 16.92 | 17.31 | 30.99 | 29.22 | 1.03x |
| | par | 11.00 | 11.26 | 14.10 | 26.40 | 22.60 | 1.28x |
| | solve 2000 | 0.243 | 0.231 | 0.304 | 0.888 | 0.756 | 1.25x |
| L114 Hex, 18 ropes | casual x1000 | 4.12 | 3.61 | 6.66 | 12.45 | 25.07 | 1.62x |
| | par | 1.99 | 1.97 | 2.67 | 5.37 | 18.17 | 1.34x |
| | solve 2000 | 0.028 | 0.023 | 0.041 | 0.079 | 0.164 | 1.46x |
| L118 square, mirrors | casual x1000 | 11.41 | 11.23 | 10.34 | 20.62 | 19.23 | **0.91x** |
| | par | 6.80 | 7.23 | 9.46 | 15.04 | 14.00 | 1.39x |
| | solve 2000 | 0.087 | 0.089 | 0.123 | 0.263 | 0.280 | 1.41x |
| L116 Hex, mirrors | casual x1000 | 6.19 | 5.77 | 8.72 | 15.53 | 29.94 | 1.41x |
| | par | 3.40 | 3.51 | 4.22 | 8.19 | 27.86 | 1.24x |
| | solve 2000 | 0.060 | 0.052 | 0.086 | 0.176 | 0.321 | 1.42x |

Where the gap is large (full-geometry play on spinner boards, the Hex builder at 3.3x in G4), it comes
mostly from representation: integer cells, stamp tables, positions stamped once for all their taps.
MoonBit could take the same representations. Where both sides use the same representation (the square
and Hex offset kernels), Encantis is 0.9x to 1.6x MoonBit wasm-gc. Three hot loops reached that only
after hand-inlining, because Encantis has no inliner (§5).

### 2.4 Memory

One static 16 MiB bump stack. The Journey peaks at 0.64 MiB and the custom sample at 1.24 MiB. The
largest of the game-legal levels made in the quality classes peaks at 2.46 MiB (48x48 Hex colossal
with spinners). Limits past the game's own inputs:

- a one-row strip of 1,200 or 2,304 cells with spinners overflows it, where the JS makes no level
  either;
- the square solve's default budget of 20,000 on a 48x48 board would overflow it (the game uses 900,
  2,000 and 5,000).

## 3. Size

### 3.1 The wasm

| Build | Bytes | gzip -9 | brotli 11 |
| --- | ---: | ---: | ---: |
| **Encantis core.wasm** (as built: `encantis wasm`) | **113,721** | **43,535** | 37,404 |
| Encantis core.wasm, `wasm -O` | 89,053 | 38,493 | 33,337 |
| Encantis core.wasm, `wasm --release` | 88,615 | 38,243 | 33,117 |
| Encantis core.wasm, `wasm-opt -O3` | 93,078 | 38,665 | 33,530 |
| MoonBit `dist/gen.wasm` (the generator the game loads) | 137,415 | 54,882 | 46,409 |
| MoonBit `dist/gen.js` (its fallback) | 588,457 | 77,513 | 57,928 |
| MoonBit `dist/mf.wasm` / `mf.js` (core and playable slice) | 168,137 / 640,248 | 65,261 / 85,838 | 55,386 / 64,770 |
| The JS core at 9e69e3a (9 scripts, grid-journey.js included) | 156,623 | 44,570 | 36,992 |

core.wasm is 83% of gen.wasm (79% gzipped), and 64% (70%) with `--release`. It has no imports. It
needs multi-value returns and bulk memory (Safari 15 and later, by ENCANTIS.md's reading; not tested
here), not wasm-gc (Safari 18.2).

### 3.2 The source (`oracle/size.cjs`: scripts/mbt-metrics.cjs's tokenizer, comments and tests left out)

"Code" is what was ported. "+ imports, types" adds the import declarations (restated signatures) and
the restated types that Encantis modules need. Lines are lines with code.

| Group | MoonBit replaced: tokens (lines) | Encantis code: tokens (lines) | Ratio | + imports, types | Ratio |
| --- | ---: | ---: | ---: | ---: | ---: |
| G1 foundations (random, types, codes, layout key, ABI) | 3,609 (563) | 5,609 (553) | 1.55x | 6,427 | 1.78x |
| G1 new code: fdlibm `pow`, exact `toFixed`; word-keyed sets | none | 3,198 (376) | | | |
| G2 square kernel | 4,120 (662) | 5,116 (582) | 1.24x | 5,698 | 1.38x |
| G2 square woven builder (weave) | 8,656 (1,294) | 10,705 (1,367) | 1.24x | 11,763 | 1.36x |
| G3 Hex kernel | 3,772 (602) | 4,911 (548) | 1.30x | 5,611 | 1.49x |
| G4 Hex woven builder | 3,654 (548) | 5,912 (726) | 1.62x | 6,833 | 1.87x |
| G5 full geometry, hints, repeated-slide core | 5,370 (814) | 7,260 (837) | 1.35x | 9,767 | 1.82x |
| G6 measured play, interaction analysis | 4,140 (543) | 5,685 (660) | 1.37x | 7,254 | 1.75x |
| G7 generator, exports | 4,417 (675) | 5,850 (604) | 1.32x | 8,556 | 1.94x |
| **The whole core** | **37,588 (5,684)** | **54,246 (6,253)** | **1.44x** | **65,107 (7,032)** | **1.73x** |

- Line counts are about equal (1.10x code, 1.24x all): Encantis lines carry more tokens. MoonBit's
  formatter puts one statement per line, and Encantis's long import signatures fill theirs.
- G4 is the largest ratio because its speed-ups and departures added 932 tokens; the straight port
  was 1.36x.
- Import declarations and restated types are 17% of all the port's tokens (10,861).
- The generated Journey tables are apart: 11,100 tokens for two tables against journey.mbt's 5,651.
- The copied library (`lib/`: stack, vec, set, map, sort, text, fixedvec) is 4,172 tokens, not counted.
- For scale, the JS core replaced is 36,666 tokens (MoonBit REPORT §4), so the port is 1.48x the JS.

## 4. Compile time and the edit-check loop

`oracle/compile-times.mjs`: each command 5 times, interleaved, wall clock of a fresh process, median
(range), under the lock.

| Step | Encantis (bun, from TypeScript source) | MoonBit (moon 0.1.20261104) |
| --- | ---: | ---: |
| check the largest file (`weave.ents`, 1,419 lines, with its imports) | 1.23 s (1.11 to 1.30) | |
| check `hexbuild.ents` (the hottest code) | 1.19 s | |
| check the whole program (`core.ents`: 27 modules, 1,058 declarations) / `moon check` | 3.77 s (3.53 to 3.81) | 0.21 s cold, **0.15 s after an edit** |
| build the whole program (`wasm core.ents`) / `moon build --target wasm-gc --release` | 3.85 s (3.79 to 4.11) | 0.44 s cold, 0.47 s after an edit |
| the same, optimized (`wasm -O`) / `moon build --target js --release` | 7.76 s (7.58 to 8.09) | 0.45 s cold, 0.41 s after an edit |
| run one module's inline tests (`test hex.ents`, 3 tests) | 0.90 s | |
| `hover` (checks the file's program first) | 1.45 s (hexbuild) to 4 s (gridgen) | |
| `build.sh`: every inline test (70 tests in 24 files) and 9 wasm | 42.7 s | |

Every Encantis command is a fresh process that parses and checks the whole import graph again: there
is no incremental mode or cache. An edit to a module costs a check of everything that imports it, 1.2
to 3.8 s, against moon's 0.15 s: 8 to 25 times as long. The editor's language server keeps state
between edits (not measured here); `hover` from the CLI pays the full check each time. Builds are
deterministic, which made "rebuilt byte for byte" a `git status` after each of the four compiler
updates.

## 5. Developer experience

Sources: `DX-LOG.md`, which covers the mapping, the plan, the seven groups, the seven adversarial
reviews and this measurement. Counts are sites in the port's files, with mentions in file headers
left out. The port was written by agents, one group at a time, between 18 Nov 07:57 and 19 Nov 13:08:
about 9 hours of wall clock for the seven groups in all, and about 10 more for the reviews.

### 5.1 What was easy

- **Exactness on the first build.** From G2 on, every group's port passed its exact oracle on the
  first build that compiled:
  - the square and Hex kernels;
  - the Hex builder;
  - full geometry and the hints;
  - the measurements;
  - the whole generator (135 reference levels, 60 custom levels, 556,393 unit values).

  No compiler bug ever produced a wrong answer that an oracle caught.
- **Generics and the library.** These replaced what ENCANTIS.md's kernels wrote by hand:
  - `Vec(T)`;
  - `lib/sort` with a comptime `before`, stable, so it keeps the JS's order;
  - `KeyMap` and `KeySet` over word keys;
  - `lib/set` over a key type with its own `hash` and `eq`;
  - one text writer over a comptime sink, which streams FNV-1a, fills a `Vec(u8)` or writes ABI words.

  A comparator that captured a run-time value became a rank stored in each element: 2 lines.
- **It reads like the MoonBit.**
  - Method calls: `b.place(t.i, t.to)`, `s.moves.push(t.i)`.
  - `if let` and `??` on checked indexing: `if let path = paths[i]` is exactly the JS's falsy test,
    out of range included.
  - Named results destructured with renames.
  - Struct values in memory, in globals and in fields.
  - `defer reset(scope)` at every search node; `return x when c`.
  - `FixedVec(6, i32)` in static data, its bound in its type. Comptime value parameters exist since
    #32 (60648b8; the port got them with its update to 8f459f1, #33), contrary to the brief.
- **The memory model held.**
  - One bump stack, with scopes per call, attempt, candidate and search node.
  - A level that outlives its scope is kept as its own ABI words and read back as zero-copy slices,
    so `grid_generate` never copies a board.
- **Speed work was cheap.** Each speed-up was one rebuild and one exact run (17 s for the builder),
  and the builds are deterministic. The hand-inlining, the laid board compiled once, the stamp and
  seen tables, and G5's stack fix all went this way.
- **No run-time imports, and a numbers-only ABI.** The existing glue and tests drove the port
  unchanged from G1's probe on.

### 5.2 What hurt, with counts

| Friction | Sites | What Encantis made us write | Removed by |
| --- | ---: | --- | --- |
| No closures | 54 | 42 local functions became top-level functions, either over a context struct (`Solve`, `Fewest`, `Full`, `Tarjan`, and `Attempts` with 12 fields) or over 33 module globals reset by hand in `hex_build`. About 70 lambdas (`map`, `filter`, `makei`, `any`) became loops. G7's review found these the slowest code to check against the JS | **closures**, even non-escaping ones |
| Options and tags by hand | 26 | `0 as ?*T` for none, `(0 as [*]T, 0:u32)` for an empty `?[]T`, -1 sentinels, a tri-state `solved`. MoonBit's `guard ... else` became nested `if let`s (3 deep in `knot_attempt`), and 2 `elif let`s became `else { if let }` | **enums** (`Option(T)`) with `let ... else` |
| Unchecked table reads | 163 | board tables read through `[*]mut i32` with no check, each audited by hand (two reviews added asserts) | a trapping index (not planned) |
| Room reserved before a scope | 47 | a list that grew inside a search node would be freed with the node, so lists are sized for the worst case up front | `memory.grow` (documented, not implemented), or a second arena that inner scopes do not reset (possible with comptime values, not written) |
| Restated types and imports | 17% of all tokens | a non-generic type cannot be imported, so `Geo` is written out seven times (its home, mech.ents, and six restatements). Every imported function's signature is restated. The two entries forward the same exports (bugs/04) | importing types by name; re-export |
| `let` is function-scoped | 54 renames | `c2`, `ta` to `td`, `up_first`. Also 11 clashes of a local with a function, global or field, and 3 reserved words used as names | block scope (not planned) |
| i32/u32 casts | 423 | `for i in n` gives a `u32` and lengths are `u32`, while the JS's numbers are `i32`: 206 `as u32` and 217 `as i32`. Sizes that wrap past 2^32 in silence needed 7 asserts (G1's review) | checked arithmetic, or an `i32` loop |
| No counted range loop | 14 | a count worked out by hand for `for k in count`, `while` loops counting down, or `if let rest = t[a..]` | a range loop (not planned) |
| No inliner | 4 | four hot spots inlined by hand (the square and the Hex casual play scans, the Hex builder's replay step, the builder's free-cell test), worth 10 to 20% each | `inline func` (parsed, not implemented) |
| No f64 bit casts | 23 calls | fdlibm `pow` reads a double's bits through a scratch memory cell, 2x slower than a reinterpret | a reinterpret builtin |
| `assert` does not narrow | 6 | `if k >= 6 { assert false; return 0 }`, so that `k` becomes `u32#6` | a narrowing assert |
| Comptime parameters passed by hand | about 49 | each nested writer call repeats its sink: `s.dec(o.min, put)` (codes.ents 30, random.ents 8, gridgen.ents 6, abi.ents 5; G1 counted 18) | a function value held by the writer |
| Smaller | 1 to 4 each | data blocks not aligned (G2 aligned its buffers by hand); no bare block for a scope; `memcpy` needs a sized array pointer; an empty slice range is optional | |

**Where the reserves bit.** A fixed stack with reserves is a failure mode MoonBit's GC does not have:

- G5's review found the full-geometry solve's seen set, reserved for the whole budget, overflowing the
  stack at the game's own auto-solve budget: on C14 and on every 48x48 spinner board, 9 of 23 large
  boards in all. Fixed, by keying positions by their paths' numbers.
- G1's review found reserves that wrapped past 2^32 without trapping, and a trap that left the
  instance's Journey table overwritten. Fixed.
- G7's review found one-row strips of 1,200 cells or more with spinners overflowing. These are past
  the game's sizes, and documented.

### 5.3 Error messages

- **Unsupported syntax** gives a parse error that lists 20 to 60 expected tokens (35 for a nested function, 60 for a lambda, 20 for a range loop) and never says "not
  supported". This covers a nested function, a lambda, a range loop, a bare block, `a ?? b ?? c`, a
  parenthesised cast as an assignment target, and a reserved word as a name. Met in every group.
- **A name clash** says `'c' is already declared: a loop variable cannot reuse the name of a variable
  in scope`. It does not say where the first declaration is, even when its block has ended. One clash
  cascades into type errors at later uses.
- **`elif let y = x`** gives `unknown identifier 'y' — did you mean 'a'?` (bugs/07), which reads as a
  typo.
- **Types are printed in full.** A wrong receiver printed 600 to 900 characters of `*mut (b: (hex:
  bool, w: i32, ...` where the source says `*Board`, and `hover` does the same.
- **A trap names nothing**: the wasm has no name section. A trap or profile says
  `wasm-function[416]`, mapped to a name by counting `(func` in the WAT, a script written again in
  at least four groups.
- **The good ones:**
  - `runtime index on []i32 requires 'if let' or '??'`;
  - a field that hides a function (`write tracked(...)`);
  - import cycles;
  - calling a function-typed parameter.

### 5.4 Compiler and tooling bugs (repros in `bugs/`, all reproduced again at 399ca7e)

| | What | Kind | What the port does |
| --- | --- | --- | --- |
| 01 | `&base[k] as [*]Pt` is `&(base[k] as [*]Pt)`: the address of a pointer value is accepted, and is the pointer itself | **silent wrong code** | one view helper in abi.ents |
| 02 | a parameter named like a module `def` is the def in the body, and the argument is ignored; an assignment to it is lost | **silent wrong code** | no parameter named like a def, but for one: `keep_level`'s `room` in abi.ents (§8), harmless as called |
| 03 | lib/stack's `alloc` wraps for n near 2^32 and hands out the stack itself | library | fixed in the port's copy |
| 04 | two modules that declare memory: `check` says OK and `wasm` crashes with a stack trace | crash | memory declared once |
| 05 | `hover file:line:name` finds the name as text, in `break` or in a comment | tooling | columns |
| 06 | `fmt` prints `[]?[]T` as `[] ? []T` and rewrites the house style (`n: u32` to `n:u32`) | tooling | `fmt` never used |
| 07 | `elif let` parses and binds nothing; unused, `check` passes and `wasm` emits invalid WAT | wrong acceptance | 2 sites as `else { if let }` |

Each silent bug was met once while writing (01 summed garbage; 02 surfaced as a type error) and
avoided by a rule from then on. No oracle ever caught either in the port's files. The rule for 02
was broken once and nobody noticed until the verification (§8): `keep_level(l, buf, room: u32)` in
abi.ents, whose module has `def room = 65536`, so the body stores 65536 whatever is passed; its one
caller passes `keep_room` = 65536, so no output changes. Also met here:
`encantis wasm <file>` without `-o` writes `<file>.wasm` beside the source, while the help says stdout.

### 5.5 What the planned features would remove

| Feature (status at 399ca7e) | Removes |
| --- | --- |
| **Closures** (future additions; non-escaping would be enough) | the 54 `// closure:` sites: the 42 lifted local functions with their context structs and 33 module globals, about 70 lambda loops, and the reviews' hardest reading |
| **Enums**, `Option(T)`, `let ... else`, `elif let` (design only) | the 26 `// enum:` sites, nested `if let`s, bugs/07 |
| **Run-time function values** (not implemented; a design awaits the owner) | **0 sites**: every function-valued use is a comparator or sink (comptime today) or a closure called where it is made |
| **Comptime value parameters** (available since #32, 60648b8) | already used (`FixedVec(n, T)` in 3 data blocks; 8 `// comptime-n:` notes). With them, a second arena `Stack(n)` that search nodes do not reset would let the 47 reserved lists grow as found, and the stack stop being a copied file |
| Not planned, but met in every group | block-scoped `let` (54 renames), a range loop (14), `inline` (4 hand-inlined spots), a trapping index (163), importing types (17% of tokens), a name section, `memory.grow`, f64 bit casts |

## 6. What Encantis would need next, for code like this

In order of what it would remove from this port:

1. **Closures**, even non-escaping ones (54 sites and the hardest code to review).
2. **Enums with `Option(T)` and `let ... else`** (26 sites, the nesting, `elif let`).
3. **Memory that survives scopes**: an arena that inner scopes do not reset, or `memory.grow`. This
   would remove the 47 up-front reserves and the stack-overflow failure modes the reviews found.
4. **Block-scoped `let` and a range loop** (54 renames and 14 loops). Neither is planned. They are
   small, but met in every group.
5. **Importing types and re-exporting** (10,861 tokens of restated signatures and types, and the
   forwarding entries).
6. **A faster edit loop**: an incremental or cached check. 3.8 s per whole-program check against
   moon's 0.15 s is the largest tooling gap.
7. **The compiler's own fixes**: bugs 01 and 02 (silent wrong code) first, then 04 and 07. Also
   `inline func`, a name section in the wasm, aligned data blocks, f64 bit casts, and type names in
   messages and hover.
8. **A JS fallback path**: either no multi-value returns when asked (so that `wasm2js` works), or a
   documented way to freeze data.

## 7. How ENCANTIS.md's findings changed

ENCANTIS.md (against Encantis 0.2.1, `prep/finalize`, May 2026) said "don't switch".

| ENCANTIS.md found | Now (399ca7e) |
| --- | --- |
| No closures or callable function pointers | **Still none.** Comptime function parameters cover comparators and sinks, so function values are needed at 0 sites; closures cost 54 |
| Enums parse but do not compile | **Still design only.** `?*T`, `?[]T`, `if let` and `??` cover most uses; 26 sites by hand |
| No generics, growable arrays or hash maps | **All there**: comptime type parameters, generic types across modules, `lib/vec`, `set`, `map` and `sort`, method calls, overloads. They carry the port |
| No runtime strings | Still none, and not needed: text writers over comptime sinks stream the hashes |
| No `memory-grow` | **Still none.** One static 16 MiB stack: 2.5 MiB at the game's largest boards, and overflows past them |
| Struct literal stored into memory crashed codegen | Works: struct, tuple and slice values in memory, globals and fields |
| Ported code 2 to 2.7x the MoonBit; a full port estimated at 75k to 95k tokens plus a runtime | **1.44x** (54,246 tokens), **1.73x** with imports and types (65,107); the runtime is the compiler's library (4,172 tokens, copied) |
| Kernel speed 5x MoonBit, from representation | The whole generator 2.2x MoonBit wasm-gc in Node and 2.5x in Chromium; 1.0x to 1.6x where the representations are the same |
| Size: a full generator "plausibly 40 to 80 KB" | 113,721 bytes (88,615 with `--release`) |
| `Math.pow` exact by importing it from the host | The loaders instantiate with `{}`, so fdlibm `pow` was ported (V8's variant, exact on 3.8M pairs), and `toFixed` decides halves exactly |
| Compiler quiet for 6 months; examples did not compile | Active: main moved four times during the port (a release, `--release`, comptime values, fixes), and every wasm rebuilt byte for byte each time. Found: 2 silent wrong-code bugs, 1 crash, 1 wrong acceptance |
| "Revisit Encantis once it has closures or callable function pointers, enum codegen, `memory-grow` and a vector/map story" | The vector/map story (generics) arrived; closures, enums and `memory-grow` did not. The port succeeded without them, at the costs in §5 |

## 8. Independent verification (19 Nov, 15:40 to 17:xx)

A second engineer rechecked this report from a fresh worktree of the pushed head (932bd00), with the
same compiler (399ca7e, still origin/main), a reference of its own (`git archive 9e69e3a`, with
`reference.json` dumped again from it: identical), seeds and set codes nobody had used, and scripts of
its own (`oracle/verify/`). Raw output is in `oracle/fixtures/verify/`. Where a number of this report
was wrong it has been corrected above; the corrections are listed at the end of this section.

### 8.1 Build and exact parity: confirmed

- `build.sh` under the lock: 49.4 s (the report: 42.7 s), 70 inline tests in 24 files pass, every wasm
  byte for byte. The `-O`, `--release` and `wasm-opt -O3` builds are byte-identical to the measurement's.
- **Whole levels on my own set codes** (`verify/exact-gen.cjs`: 11 codes, square, Hex and mixed, 4x5 to
  32x32 colossal, mirrors and spinners; the real `G.generate` at 9e69e3a against the wasm through
  `web/generator.js`, every field: board, plan, par, exact, layout key, coverage, casual wins,
  challenge, slide and mechanic stats):
  - `test/g7.wasm` in the JS's mode: **378 of 378 levels equal**;
  - `core.wasm` (the port's own mode): **184 of 184 square levels equal**, and all 194 Hex levels valid
    by the JS's kernels (the plan replays to an empty board at par, `F.valid`, the coverage, the
    feature stats, the casual win rate one attempt's `F.casualRate`, the challenge);
  - the negative control (core.wasm's Hex levels compared exactly) fails 5 of 5, as it must.
- **The units on new seeds**, against the live JS: `check-g1-wide` (21,504,078 comparisons),
  `check-g2-wide --seed 91357` and `check-g3-wide --seed 24680` (550 boards, 50,773 comparisons of
  3.09M values), `check-g6-fuzz` at seeds 7 and 8 (3,991 boards, 31,928 comparisons),
  `check-core-rope --wide 4000 --seed 777`, `check-hexbuild-shadow --suffix VF` (44 levels, 301 builds,
  4,814 comparisons), `check-g7-units` in both modes (556,393 values each), `check-g7-robust` (85 + 255
  checks), `check-journey-port` (120 of 120): **0 failed**.
- **The hints on the port's own boards**, with three Hex and mixed set codes of mine added to its
  Journey: 150 boards, 6,481 positions, **31,496 answers, 0 differ**.
- **MoonBit's tests through the glue**, unchanged: g7.wasm 6 of 6 and `parity.mjs` 135 of 135; core.wasm
  2 of 6 and 46 of 135 (the 4 tests and 89 levels that ask for the JS's Hex levels), as stated.
- **The Journey** (`verify/journey-diff.cjs`, core.wasm against my reference): 82 of 120 positions
  differ; the 60 Hex positions are 60 maps the JS's Journey does not have; of the 60 square ones 38
  are in place and 22 moved. As stated. The stack peaks at 0.64 MiB on the Journey and 1.24 MiB after
  the custom sample, as stated. `wasm2js` stops at `tuple.make`, as stated.

### 8.2 Bugs: all 7 repros reproduce; one bugs/02 site in the port

01 prints `8 12`, 02 `8 101 7`, 03 `16 0` (lib/stack's alloc at 399ca7e still bounds after adding),
04 `check` OK and `wasm` throws at codegen.ts:4148, 05 all six hovers as listed, 06 `fmt` writes
`[] ? []u8`, 07 `check` OK and invalid WAT.

The port broke its own rule for bug 02 once: `abi.ents:291` is `keep_level(l: *Level, buf: [*]mut i32,
room: u32)` in a module with `def room = 65536:u32` (line 36). The compiled body stores
`(i32.const 65536)` into the buffer's bound and never reads the parameter. Its one caller
(`gridgen.ents:684`) passes `keep_room`, also 65536, so nothing the game sees changes; a caller with a
smaller buffer would lose the bound check in silence. Renaming the parameter fixes it. The compiler
gives no warning (it refuses a `let` or loop variable named like a def, but not a parameter); a
10-line script found it (1 site in the port's 21 files, none in `lib/` or `test/`).

### 8.3 Size: confirmed

Every wasm size, gzip and brotli figure of §3.1 reproduces (gzip -9 of the file; through a pipe, without
the stored file name, each is 9 or 10 bytes smaller). The JS core's 44,570 / 36,992 are MoonBit's
REPORT's figures; gzip -9 of the 9 files concatenated gives 44,772 and brotli 37,145. `size.cjs`
reruns to the same output, byte for byte; the journey freeze cost and the quality summary scripts
too.

### 8.4 DX claims checked in the source

Ten claims of §5, recounted with grep by the report's own rule (sites, header mentions left out):

| Claim | The report | Recount |
| --- | ---: | ---: |
| `// closure:` sites | 53 | **54** |
| `// enum:` sites | 27 | **26** |
| `// unchecked:` sites | 165 | **163** (the 165 counted two header mentions) |
| `// reserve:` sites | 47 | 47 |
| i32/u32 casts (`as u32` + `as i32`, code only) | 423 (206 + 217) | 423 (206 + 217) |
| `Geo` written out | "four files" | **7 copies** (home and 6 restatements) |
| comptime sinks passed on by hand | 18 | **about 49** (18 was G1's count) |
| hand-inlined hot spots | 3 | **4** |
| scratch-cell bit accesses in `pow` | 32 calls | **23** (32 counted every occurrence, the declarations included) |
| `FixedVec` "5 sites" | 5 | **3 data blocks** (and 8 `// comptime-n:` notes) |

Also confirmed: `Attempts` has 12 fields; hexbuild has 33 module globals; 2 `elif let` sites are
`else { if let }`; 6 `assert false` are followed by a return; `wasm` without `-o` writes `<file>.wasm`
beside the source; the three error messages quoted in §5.3 are verbatim (the parse error lists 20 to 60
expected tokens, not "about 60"); a `type` is not importable (reference §7.1). `check core.ents` says
1,058 declarations (1,081 is `test/g7.ents`). Comptime value parameters came with #32 (60648b8);
8f459f1 is #33. The 54 renames are the groups' logged counts and leave no mark in the source.

<!-- 8.5 runtime and 8.6 generation quality: being rerun under the lock -->

## Reproducing

```sh
moonbit/encantis/core/build.sh                       # inline tests and every wasm (43 s)
moonbit/encantis/core/oracle/check-all.sh            # every group's exact and quality oracle (about 22 min)
node moonbit/encantis/core/oracle/quality-summary.cjs     # §1.2
node moonbit/encantis/core/oracle/journey-freeze-cost.cjs # §1.4
node moonbit/encantis/core/oracle/size.cjs                # §3.2
node moonbit/encantis/core/oracle/compile-times.mjs <copy of moonbit/ with moon.mod and src/>   # §4
# §2: in a harness (oracle/setup-harness.sh <dir> moonbit/dist/gen.wasm moonbit/dist/mf.wasm) with the
# Encantis builds copied to dist/enc/:
node scripts/bench-node.mjs <9e69e3a checkout> 120 --rounds 6 --enc "Encantis core.wasm=../dist/enc/core.wasm" ...
node scripts/bench-node.mjs <9e69e3a checkout> --cold "<engine>" --enc ... --out cold.jsonl   # 5 times each
GEN_ONLY=1 BENCH_QUERY="rounds=6&enc=..." CHROMIUM_PATH=/opt/pw-browsers/chromium node bench/browser.mjs <harness URL> <9e69e3a URL>
```

The session's scripts are `oracle/fixtures/measure/run-timing.sh` (every timing above) and
`run-harness.sh` (MoonBit's tests through the glue on each build).
