# The Monkey Fist core in Encantis

This directory is a rewrite of the Monkey Fist generator core (MoonBit's `src/core`, `src/gen` and
the `bench_*` hooks of `src/api`) in Encantis, with the compiler of encantis origin/main at
**399ca7e** (Release 0.3.0). It answers the owner's request of 18 Nov 2026: *"try to rewrite the
core monkeyfist code using latest encantis and see how it performs (both DX and runtime)"*.

`core.wasm` is a drop-in for MoonBit's `dist/gen.wasm` and `dist/mf.wasm`: the same exports, the
same signatures (i32 and f64 only), the same words, and no imports. The game's glue
(`web/generator.js`, `web/mf-core.js`) and every test and benchmark of `moonbit/` drive it
unchanged (`oracle/setup-harness.sh`).

## The short answer

- **Runtime: yes.** core.wasm generates the 120 Journey levels in **4.0 s** in Node against
  MoonBit wasm-gc's **8.7 s** (2.2x; 2.0x on the very same levels) and the JS's 62 s, and in
  **3.3 s** in Chromium against MoonBit's 8.5 s (2.6x) and the JS's 56 s. It is **113,721 bytes**
  (43,535 gzipped) against gen.wasm's 137,415 (54,882), and the whole Journey peaks at 0.64 MiB of
  its 16 MiB stack. Every kernel timed interleaved with MoonBit in G2 to G6 is as fast or faster
  (1.00x to 5.2x: full-geometry casual play 3.2 to 5.2x, solve 1.3 to 3.4x, par 1.2 to 1.5x).
- **Levels: the same rules, the same qualities.** Every rule of the game (geometry, taps, solve,
  par, replay, the hints, the measurements of a board) is bit for bit the JS's. Generation keeps
  the JS's decisions everywhere but the Hex builder, which draws a third less (G4's departures); so
  square levels are the JS's own and Hex levels are new ones of the same qualities (1,440 levels in
  seven classes, 0 invalid, 0 of 189 distribution tests failed). The Journey's seeds were re-picked
  by the game's own seed search run on this generator (the owner's decision): 60 of its 120 maps
  are new, all Hex, and its distributions match the JS Journey's (52 of 52 tests).
- **DX: workable, with real costs.** The port is 1.44x MoonBit's tokens of code (1.73x with the
  import declarations and type restatements Encantis needs), down from the 2 to 2.7x of the earlier
  kernels (ENCANTIS.md). Generics, method calls, `if let`, structs in memory and the container
  library made it idiomatic; the remaining costs are closures (53 sites), hand-made options (27),
  unchecked table reads (165), up-front reserves (47), restated types and imports (17% of all
  tokens), function-scoped `let`s, and seven compiler and tooling bugs (none caught producing wrong
  levels). Details, with counts: `DX-LOG.md`.

## Building and checking

```sh
moonbit/encantis/core/build.sh               # every inline test, every test/gN.wasm, core.wasm (46 s)
moonbit/encantis/core/oracle/check-all.sh    # every group's oracle against the JS at 9e69e3a (about 20 min)
```

`ENCANTIS` names the compiler's CLI (default `bun /home/user/enc-wt/main/packages/cli/src/cli.ts`).
The JS reference is a checkout of 9e69e3a made by `oracle/ref.cjs`. `PORT-PLAN.md` is the plan and
its record per group; `oracle/README.md` the ABI contract.

## Modules

| File | What | MoonBit |
| --- | --- | --- |
| `lib/` | stack (16 MiB bump stack), vec, set, map, sort, text, fixedvec: encantis's library, copied | `Array`, `Map`, sort |
| `random.ents`, `fmath.ents` | mulberry32, FNV, base 36, rounding; V8's fdlibm `pow`, exact `toFixed` | `random.mbt`, `@math.pow` |
| `board.ents`, `keys.ents`, `codes.ents`, `journey.ents`, `abi.ents` | types, word-keyed sets, set codes and specs, the layout key, the two Journey tables, the ABI's buffers and level words | `types.mbt`, `engine.mbt`, `journey.mbt`, `gen.mbt` |
| `square.ents`, `hex.ents` | the square and Hex offset kernels and their searches | `square.mbt`, `hex.mbt` |
| `weave*.ents`, `hexbuild.ents` | the square woven builder (builder-v2's) and the Hex woven builder | `weave.mbt`, `hex.mbt` |
| `mech.ents`, `assist.ents`, `core-rope.ents` | full geometry, routing, the hints, the repeated-slide core | `mech.mbt`, `assist.mbt`, `gridgen.mbt` |
| `metrics.ents`, `play.ents` | the interaction analysis and the generator's measurements | `metrics.mbt`, `gridgen.mbt` |
| `gridgen.ents` | mirrors, the woven candidate, spinners, `grid_generate` | `gridgen.mbt` |
| `gen.ents`, `core.ents` | the exports, and the entry that makes core.wasm | `gen.mbt`, `api.mbt` |
| `test/gN.ents` | each group's oracle entry; `test/g7.wasm` is the core in the JS's mode | |

## Results

### Exactness and quality

| Oracle | Result |
| --- | --- |
| The 135 reference levels through the unchanged glue, the JS's mode (test/g7.wasm), field by field | 135 of 135 (parity.mjs); parity, generator, assist and measurements tests 6 of 6 |
| 60 more custom levels (4x5 to 48x48, both grids, every mechanic, difficulties 1 to 100) | the JS's mode 60 of 60 equal; core.wasm 30 square equal, 30 Hex new and valid |
| The rules and measurements of a board (G1 to G6: draws, codes, kernels, taps, solve, par, replay, hints, metrics) | exact against the JS, millions of comparisons, 0 failed (PORT-PLAN.md's table) |
| Generation units (placeMirrors, woven, addSpinners), 2,821 recorded calls | 556,393 values, 0 failed in the JS's mode; in core's mode only Hex woven departs, every result valid |
| Whole levels, core.wasm's mode, 1,440 levels in 7 classes against the JS's two seed sets | 0 invalid; 0 of 189 KS tests fail at 1%; failure rates no different |
| The same on the seeds G4 used with the JS generator and the port's Hex builder | 1,440 of 1,440 levels equal |
| The port's Journey (re-picked seeds) | 120 of 120 valid and as measured; 4 master seeds x 120: 52 of 52 KS tests pass |
| Robustness: stack at its base after every export, a trap never breaks the next call, invalid codes give 0 | 255 checks, 0 failed |

Journey levels that differ from the JS game's: **60 of 120 maps (every Hex level)**; with the
chapters ordered by measured challenge, **82 of 120 positions** show another level.

### Time (Node 22, under the lock, medians of the best of 5 rounds over 5 processes)

| | core.wasm | the port in the JS's mode | MoonBit wasm-gc | JS |
| --- | ---: | ---: | ---: | ---: |
| 120 Journey levels | 3,980 ms | 4,338 ms | 8,672 ms | 61.9 s |
| 15 custom levels | 1,323 ms | 1,821 ms | 4,293 ms | 52.7 s |
| 120 Journey levels, Chromium 153 (one run) | 3,333 ms | 3,315 ms | 8,490 ms | 55.7 s |
| The Journey's seed search (805 candidates) | 28.1 s | 32.3 s | | 530 s |

On the same levels MoonBit takes 1.96x the port's time per level at the median (1.32x to 2.54x from
the 10th to the 90th percentile). `wasm-opt -O3` gains another 9% (3,621 ms; 93,078 bytes).

### Size

| | Encantis | MoonBit |
| --- | ---: | ---: |
| wasm, bytes (gzip -9) | 113,721 (43,535) | 137,415 (54,882) |
| tokens of code (`oracle/size.cjs`) | 54,246 (1.44x) | 37,588 |
| with import declarations and restated types | 65,107 (1.73x) | |
| `check` / `wasm` of the whole program | 3.7 s / 3.8 s | |

## The verdict, in full

**Runtime.** On every measure the port is faster and smaller than the MoonBit wasm-gc build the
game ships: about 2x on whole levels, 3 to 4x on the full-geometry playouts that dominate spinner
boards, and 17% smaller (21% gzipped). It needs no wasm-gc, so it would also run where MoonBit
falls back to its 588 KB JS build (Safari before 18.2), which takes 15 to 16 s for the Journey. Its
memory is one 16 MiB bump stack, sized at build time; the generator uses under 1.3 MiB of it.

**DX.** The language of 18 Nov 2026 carried a 37.6k-token MoonBit core with oracles exact to the
bit, and from G2 on every group's port passed its exact oracle on its first build. What helped most: generics with
comptime type and function parameters (`Vec(T)`, `sort` with a comptime `before`, text and word
sinks), method-call syntax, `if let` and `??` on checked indexing, struct values in memory and in
globals, `defer` for scopes, fast whole-program checks (3.7 s), and no imports to manage at run time.
What it still costs, in order: closures (53 tagged sites: local functions turned into context
structs or module globals, lambdas turned into loops), restated types and import
signatures (17% of all tokens), options and tags by hand (27), unchecked many-pointer tables (165)
and reserves taken before a scope (47) that a growable arena would remove, function-scoped `let`s
(dozens of renames), no range loop, and seven bugs (two of them silent wrong code, avoided by rule).
Closures, enums with `let ... else`, and an arena or growth that survives scopes are the three
features that would remove most of the friction; run-time function values would remove nothing
here (0 sites).

**So:** for this core, Encantis now does the job MoonBit does, faster and smaller, with exact
parity where the game's rules are concerned. Whether to switch depends on how much the remaining
DX costs (above, and DX-LOG.md's per-group logs) weigh against the speed and size: a port is
written once, but its 1.7x source and the hand-written closures are maintained.
