# Port plan: the Monkey Fist core in Encantis

The owner's request (18 Nov 2026): rewrite the core Monkey Fist code with the latest
Encantis, and find out how it performs, both for the developer and at run time.

This plan says how. The port is split into **seven groups**, G1 to G7. Each is one
engineer's work for a few hours, and each has an oracle of its own that runs on this
machine.

| | |
| --- | --- |
| Written | 18 Nov 2026, against origin/claude/moonbit-port at dbebdcc |
| Compiler | `/home/user/enc-wt/main` at **cb3fc4f3514fc834b4fb6c3e2ea5fcfd11a720da**, which is origin/claude/generics-modules. origin/main (584178d) has no `lib/vec.ents` yet, so the branch is used, as the task allows. The two maps used a84f5e6; cb3fc4f merges claude/language-decisions on top of it. builder-v2's `weave.ents` rebuilds byte for byte at cb3fc4f, and `check-weave.cjs` still finds 0 mismatches in 249 cases |
| Read first | `/home/user/mf-core-scratch/MAP-CORE.md`: the MoonBit core, module by module, with counts. `/home/user/mf-core-scratch/MAP-ORACLES.md`: how parity and time are measured, and the harness. `oracle/README.md`: the ABI contract. `../builder/README.md` and `../builder-v2/README.md`: how a port is checked and measured, and what hurt |
| Reference | `/home/user/enc-wt/main/docs/encantis.md` |
| Probes behind this plan | `/home/user/mf-core-scratch/plan-probes/` (p1 to p6; see §12) |

## 0. The short version

- **What is ported.** All of `src/core` except the playable slice:
  - types, random, engine, square, hex, mech, metrics, gridgen and assist;
  - the 120-level Journey table;
  - weave, which is reused from builder-v2 and not ported again;
  - the numbers ABI of `src/gen`, plus the three `bench_*` exports of `src/api`.

  That is about 36k MoonBit tokens. Earlier Encantis kernels cover about 12k of them
  (MAP-CORE §1).
- **One wasm, `core.wasm`.**
  - It exports the 12 `gen` functions and `bench_casual`, `bench_par` and `bench_solve`,
    with the same names, signatures and word layouts.
  - It has **no imports**: `Math.pow` is computed in the module, as fdlibm's `pow`.
  - So `oracle/setup-harness.sh` can drop it in as `dist/gen.wasm` and `dist/mf.wasm`, and
    every existing test and benchmark drives it unchanged. No adapter is needed.
- **Memory.**
  - There is one bump stack: `lib/stack`, copied and enlarged.
  - Each export starts by resetting the stack to its base.
  - Scopes nest: a call, then an attempt, then a candidate, then a search node.
  - Tables are many-pointers on the stack. Lists are `Vec(T)` from `lib/vec`.
  - Visited sets are a word-keyed set whose room is reserved before the search.
  - A level that must outlive its scope is written as the ABI's own level words into a
    static buffer. The board is then read back as zero-copy slices of those words.
- **Translation rules.**
  - The 42 local functions become top-level functions over a context struct behind
    `*mut`. Module globals are used only for singletons and for builder state.
  - The 7 comparators become `lib/sort` with a comptime `before`.
  - About 70 lambdas become loops.
  - `Option` becomes `?*T`, `?[]T` or a sentinel.
  - The enum-like ints (events, solved states, mirror kinds, styles) become `def`
    constants, matched as integers.
- **The groups, in order:**
  1. G1, foundations: lib, ABI, random, pow, codes and specs, layout key, Journey table,
     key sets, and the shared oracle tooling.
  2. G2, the square world: the square offset kernel and weave reused from builder-v2.
  3. G3, the hex offset kernel.
  4. G4, the Hex woven builder.
  5. G5, full geometry, routing, the repeated-slide core, and the hints.
  6. G6, measured play: metrics and the generator's measurements.
  7. G7, the generator and the API: the remaining generator code, the exports, the
     full parity run and every measurement.

  G2 and G3 can run in parallel after G1. G4 can run beside G5 and G6.
- **Every group's oracle is the JS at 9e69e3a**, called function by function in Node:
  - `levels.js`, `hex/engine.js`, `mechanics.js`, `hex/mechanics.js`,
    `dependency-metrics.js`, `grid-generator.js`, `game-engine.js` and `random.js`;
  - or calls recorded while the real generator runs, which is how
    `builder/dump-weave.cjs` made the weave fixture.

  The MoonBit builds are the controls for time.
- **What gets measured, and where.**
  - Parity: G7 runs it end to end, and each group checks its own units.
  - Time: each group times its kernels against MoonBit wasm-gc, and G7 times whole
    levels in Node and in Chromium.
  - Size: tokens against the MoonBit each group replaces.
  - Developer experience: `DX-LOG.md`, with counts.

## 1. Rules for every group

1. **Exact or nothing.** Every random draw happens in the JS's order. So does every
   short-circuit that guards a draw: `&&` and `||` short-circuit in Encantis
   **[ran, MAP-CORE §7]**. Every float operation happens in the JS's order too. Each
   oracle counts draws as well as comparing results.
   - **The owner's answer (relayed during G3's review, 19 Nov):** "why are we trying to do
     exact math? It's ok if we change the set of generated levels as long as they still have
     the same qualities." So exactness is how a port is tested, not what it must deliver.
     Keep it where it is free: integer kernels such as G3's, where it cost no line of code
     and gives the strongest oracle (one differing value names the board and the call).
     Where matching the JS costs code or speed (V8's `pow` bit for bit and `toFixed` on the
     exact product in `fmath.ents`, float order, draw order), a group may give it up. It then
     shows the same qualities instead: over many seeds per code, par, exact, coverage, wins
     and challenge distributed as the JS's within sampling error, and every level valid (it
     solves at its par). DX-LOG says which exactness was dropped and what that saved.
2. **Do not edit the compiler, the JS game or the MoonBit sources.**
   - When the compiler is wrong, write a minimal repro in `core/bugs/NN-name.ents`. Its
     header says how to see the bug and at which commit. Then work around the bug and
     record the cost.
   - Scratch copies of the JS reference and of the MoonBit tree are fine:
     `/home/user/mf-core-scratch/ref-9e69e3a` and `mbt-build`.
3. **Pin the compiler.** Record the compiler commit in every DX-LOG entry and every
   commit message. If `/home/user/enc-wt/main` has moved since the last group (main is
   gaining #29 to #31), rebuild, rerun every earlier group's oracle (`oracle/check-all.sh`,
   a few minutes), and log what changed.
4. **Write the oracle first.**
   - Write the fixture generator and the check script before the port.
   - Run the check against a positive control: the JS through the same converters
     (`--js`), and the MoonBit build where it exports the unit.
   - Run it against a negative control: one corrupted fixture field per kind of output,
     which must fail and name the case. Builder v1's fixture caught only 61 of 85 seeded
     changes, so beside the fixture keep a run on other seeds or other boards.
5. **Timing.**
   - Wrap every timing, every whole test suite and anything large in
     `flock /home/user/enc-wt/stack-scratch/mergeup/bigjob.lock …`.
   - Run anything that might not stop under `timeout`.
   - Report the median over 3 to 5 processes of the best of 5 rounds, with the clock
     round the call alone.
   - Compare against MoonBit wasm-gc in the same process or interleaved: the machine
     moves totals by ±6%.
6. **Size.**
   - Count with builder-v2's `size.cjs` tokenizer.
   - Count the group's `.ents` files, with comments and tests left out.
   - List `lib/` but do not count it. Count the restated import and type declarations
     separately.
   - Compare against the MoonBit declarations the group replaces, as the groups below
     list them.
7. **DX log.** Append a section to `core/DX-LOG.md`. Its parts:
   - each friction point: what you wanted to write, what you wrote, the minutes it cost,
     and the planned feature that would remove it (closures, function values, comptime
     values, enums);
   - each confusing message, verbatim;
   - each bug, with its repro;
   - tooling: `check`, `wasm`, `test`, `hover` and `fmt`;
   - what was pleasant.

   **Counts matter.** To make them greppable, put one tag in a comment at each site of a
   workaround:

   | Tag | Marks |
   | --- | --- |
   | `// closure:` | a local function made top-level, or a lambda made a loop |
   | `// fnvalue:` | something that needs a run-time function value |
   | `// enum:` | a tagged value or an option made by hand |
   | `// comptime-n:` | something `comptime n: u32` with `[n]T` would replace |
   | `// unchecked:` | a table read through a many-pointer with no bounds check |
   | `// reserve:` | room taken in advance so that a container never grows in an inner scope |

   Then `grep -c` gives the counts.
8. **Restarts.**
   - Keep `/home/user/mf-core-scratch/PROGRESS-gN.md` current: what is done (with commit
     ids and evidence), what is in progress, what is left, and what you learned.
   - Commit and push each finished step: before every push,
     `git fetch origin && git merge --no-edit origin/claude/moonbit-port`, then
     `git push origin HEAD:claude/moonbit-port`.
   - Use merge commits only: never rebase or force. Push no other branch.
   - A merge conflict in `DX-LOG.md` or `build.sh` is two appends: keep both, in time
     order.
   - Commit messages say what and why, and end with the two trailer lines the task
     gives.

## 2. Files and modules

Everything lives under `moonbit/encantis/core/`. Scratch goes in
`/home/user/mf-core-scratch/`.

| File | Group | Holds | From MoonBit | Reuses |
| --- | --- | --- | --- | --- |
| `lib/stack.ents`, `vec.ents`, `set.ents`, `map.ents`, `sort.ents` | G1 | The container library of encantis at cb3fc4f, copied. Each file's header names the commit. The stack is grown to 16 MiB and gains `clear()` (reset to the base) and `peak()` (the highest top reached) | (`Array`, `Map`, `ssort`) | `lib/` of the compiler |
| `random.ents` | G1 | `Rng = (a: u32)` used as `*mut Rng`, with `r.next()`, `r.below(n)` and `r.chance(p)`. Global draw counter and an optional trace of draws. FNV-1a streaming, base 36, decimal digits, `js_round`, `floor_div`. Generic `contains`, `index_from`, `unique` and `reverse` | `random.mbt` | `layout.ents`, `builder-v2/rng.ents` |
| `fmath.ents` | G1 | fdlibm `pow` (bit for bit with V8 and with MoonBit's `@math.pow`), `to_fixed` | `@math.pow` (library code MoonBit got for free), `metrics.to_fixed` | `layout.ents` (`to_fixed`) |
| `board.ents` | G1 | The canonical type block (below). `SqMirrors` (slope table plus keys in insertion order), `some_paths`, `all_gone`, `last`, the `marks` stamp table and `has_dup`, and `MAX_W`/`MAX_H`/`MAX_AREA` (48×48, from `parse_code`) | `types.mbt`, the shared parts of `square.mbt` | builder-v2 `board.ents` (lists) |
| `keys.ents` | G1 | `KeySet` and `KeyMap(V)`: open addressing over keys of n `u32` words, hashed in place. The words are copied into a pool reserved up front, and the table never grows; overflowing the reserve is an `assert`. Replaces the 7 string-keyed maps and sets | `key_of`, `Geo::key`, `offsets_key` and their `Map[String, _]` | `stack/features.ents`'s word-key set, `solver.ents`'s hopeless pool |
| `codes.ents` | G1 | `SetOpts`, `parse_code`, `set_code`, `level_spec`, the custom seed, the `layout_key` JSON writer and its key, `target_challenge`, `win_ceiling` | `engine.mbt` but `generate`, and those two of `gridgen.mbt` | `layout.ents` (JSON, keys), `lib/text.ents` (byte helpers) |
| `journey.ents` | G1 | `data journey: []Spec`, 120 rows, seeds as strings. Generated by `oracle/gen-journey-ents.cjs` from `grid-journey.js` at 9e69e3a | `journey.mbt` | the data-table probe (MAP-CORE §5) |
| `abi.ents` | G1 | The word buffers (`in_reset`, `in_push`, `out_len`, `out_get`, `outf_get` as plain functions), `next()` and `put()`, and the readers and writers: positions (`read_position`), level words (`put_level`), strings. The board views over the words are zero-copy | `gen.mbt` minus its exports | `abi-probe/probe.ents` |
| `square.ents` | G2 | The square offset kernel and its searches | `square.mbt` without weave's own part | `solver/solver.ents`, `builder-v2/board.ents` |
| `weave.ents`, `weave-board.ents`, `weave-rng.ents` | G2 | builder-v2's builder: its imports pointed at `core/lib`, its rng a shim over the current `*mut Rng`, and an entry `weave_run(r, cfg) -> ?*Woven` that takes the cfg as values and returns `Pt` paths | `weave.mbt`, and `sq_play`, `bends_of`, `sq_looped` of `square.mbt` | builder-v2, unchanged apart from that |
| `hex.ents` | G3 | Hex geometry, tracks, `HexBoard` and its searches | `hex.mbt` lines 1 to 668 | `features.ents` (geometry) |
| `hexbuild.ents` | G4 | `hex_intentions`, `hex_build` | `hex.mbt` lines 669 to 1238 | none |
| `mech.ents` | G5 | `Geo`, `Move`, the full-geometry tap, `solve_full`, routing to the kernels (`tracked`, `all_free`, `replay`, `solve`, `frozen`, `minimum_taps`) | `mech.mbt` | none |
| `assist.ents` | G5 | `guide`, `reachable_features` | `assist.mbt` | `features.ents`, `stack/features.ents`, `solver.ents` |
| `core-rope.ents` | G5 | `Core`, `repeated_core` | `gridgen.mbt` lines 89 to 246 | none |
| `metrics.ents` | G6 | `interaction` and its graph analysis | `metrics.mbt` | none |
| `play.ents` | G6 | `coverage`, `adjacent`, `valid`, `regional`, `trivial`, `features_used`, `feature_stats`, `postpone`, `score`, `casual_rate`, `casual_measure`, the bench hooks | `gridgen.mbt` lines 42 to 88, 666 to 894 and 1088 to 1100 | none |
| `gridgen.ents` | G7 | `place_mirrors`, `knots_for`, `woven`, `add_spinners` (with `ways_out`, `with_spinner`, `search_spinner`, `bounce_step`), `grid_generate` | the rest of `gridgen.mbt` | none |
| `core.ents` | G7 | The entry module: the exports of §5, `generate` and `generate_spec`, and the current level | `gen.mbt`, `api.mbt` (`bench_*`), `engine.generate` | `oracle/` harness |
| `test/gN.ents` | each | Each group's entry for its oracle: the ABI buffers, plus `t_*` hooks for its units | | |
| `build.sh` | G1, then each group | Builds `core.wasm` and every `test/gN.wasm` with `ENCANTIS` (default `bun /home/user/enc-wt/main/packages/cli/src/cli.ts`). Runs `encantis test` on each module | | `builder-v2` |
| `oracle/ref.cjs`, `oracle/wasm.cjs`, `oracle/capture.cjs` | G1 | Shared oracle tooling (§6) | | `builder/dump-weave.cjs` |
| `oracle/check-gN.cjs`, `oracle/dump-*.cjs`, `oracle/fixtures/` | each | Each group's oracle | | |
| `bugs/` | anyone | Compiler bug repros. `01-address-of-pointer-value.ents` was found writing this plan | | |

### Module order (no cycles)

Encantis refuses import cycles, so the layering of MAP-CORE §2 holds. `Spec` and `Level`
move down into `board.ents`. "→" means "imports".

```
lib/*
random → lib                       fmath (none)            board → lib, random
keys → lib                         codes → lib, random, fmath, board        journey (data only)
abi → lib, board
square → lib, random, board, keys
weave-rng → random;  weave-board → lib;  weave → lib, weave-rng, weave-board, board, fmath
hex → lib, random, board, keys            (SqMirrors and has_dup live in board, so hex needs no square)
hexbuild → lib, random, board, hex
mech → lib, board, keys, square, hex
assist → lib, board, mech
core-rope → lib, random, board, mech
metrics → lib, board, mech
play → lib, random, fmath, board, square, hex, mech, metrics
gridgen → lib, random, fmath, board, codes, weave, hexbuild, mech, core-rope, play
core → everything above, abi, journey
```

### Types are written again in each module

A `type` is not imported (reference §7.1): types are structural. So `board.ents` begins
with the **canonical type block**, and every module copies the lines it needs, unchanged:

```
type Pt = (q: i32, r: i32)
type Mirror = (cell: Pt, kind: i32)       // kind: the axis on Hex; 1 for '\', 0 for '/' on square
type Board = (hex: bool, w: i32, h: i32, ropes: [][]Pt, mirrors: []Mirror, springs: []Pt, plan: []i32)
type Spec = (hex: bool, w: i32, h: i32, difficulty: f64, mirrors: bool, springs: bool, seed: []u8,
             require_slide: bool, min_mirrors: i32, min_springs: i32, colossal: bool)
type Level = (board: Board, par: i32, exact: bool, coverage: f64, wins: f64, challenge: f64,
              slides: i32, bounces: i32, repeated: i32, automatic: i32,
              used_mirrors: i32, used_springs: i32, manual_mirrors: i32, manual_springs: i32)
// A position: per rope its path, or none once it has left.   []?[]Pt
```

- Field order matters for structural identity, so copy the block, never retype it.
- Count the copied lines as restatement, as v1 counted its import declarations (7% of
  that port).
- Import lists likewise restate each signature. Keep a module's public surface narrow,
  so that importers restate less.

## 3. The memory model

### 3.1 One bump stack, sized at build time

- `lib/stack.ents` is copied to `core/lib` with `capacity` = 16 MiB to start.
  `memory-grow` is not implemented (reference §10.3). Zeroed data now costs nothing to
  compile or to ship: builder-v2's 16 MiB stack builds in about a second, into an 18 KB
  wasm.
- `peak()` costs one compare per `alloc`. With it, G7 can report the peak for every
  level, with no separate build.
- Estimates for the largest users (MAP-CORE §8) are under 5 MB at the worst budgets.
  - If a colossal case overflows, the `assert` traps and the parity run shows it. Raise
    the size then, and log it.
  - With comptime value parameters this would be `Stack(comptime n)` and not a copied
    file (§10).
- **Static data** holds:
  - the ABI buffers: 64 Ki words in, 64 Ki words out, 64 doubles out, and two 64 Ki-word
    keep buffers (§3.3);
  - per-cell scratch sized for `MAX_AREA` = 2,304, such as `marks`.

  `generate_spec` takes any W and H (the Journey builder's path), so assert
  `w * h <= MAX_AREA` there.

### 3.2 Scopes

| Scope | Opened by | Freed |
| --- | --- | --- |
| The export call | each export: `clear()` first, so a trap in an earlier call never leaves the stack unusable (v1's verifier, finding 3) | at its end |
| An attempt | `grid_generate`, per attempt | after the attempt's best is written out (§3.3) |
| A candidate | `hex_build` and `weave` per try; `add_spinners` per candidate cell | after the try |
| A game | `sq_casual_wins` and `hex_casual_wins` per game; `casual_rate` per playout | after the game |
| A search node | the recursive searches, for their `tries` list | on return |

Every scope is `let s = mark()` followed by `defer reset(s)`. A function that returns a
list builds it in its caller's scope.

**The hazard that remains** (builder-v2, "What still hurts" 3): a `Vec`, `Set` or `Map`
that grows while it is not at the top of the stack moves to new room at the top. If an
inner scope is open, that room is freed with the inner scope, and nothing reports it.
Hence these rules:

- A container made in an outer scope and written in an inner one gets its room up front:
  `vec(T, cap)`, `KeySet` with a reserve. Assert that the room suffices
  (`assert v.len < v.cap`), and tag the site `// reserve:`.
- Examples:
  - `moves` in every search: reserve the budget plus 1;
  - the visited sets: reserve the budget;
  - the BFS queue of `minimum_taps`: reserve the budget;
  - `taps` in a replay.
- `lib/set` and `lib/map` double when half full. That is growth, so do not use them for
  sets written inside node scopes. `keys.ents` never grows.

### 3.3 What outlives a scope: levels kept as words

Probe p2 **[ran]**: a `[]Pt` and a `[]Mirror` can be zero-copy views over the ABI's own
level words (`len, q, r, q, r…` and `q, r, kind…`).

- The words *are* the memory layout of `Pt` (8 bytes) and `Mirror` (12 bytes). So:
  - a level that must outlive its scope is written once with `put_level`, into one of two
    static keep buffers;
  - its `Board` is then slices into those words.
- This serves three places:
  - `grid_generate`'s best-so-far across attempts: write the new best into the spare
    buffer and swap (its layout key is added once, at the end, as `engine` does);
  - the current level, which `measure` and `bench_*` read on later export calls;
  - `read_position` input, read in place from `in_push`'s words. Only the outer
    `[]?[]Pt` of a position is built (8 bytes per rope), because a count of 0 is a rope
    that has left.
- Where a candidate must outlive its try inside a builder, keep v1's and v2's `keep`
  pattern: copy it to lists that last for the call, reserved up front.
- **Pitfall [ran]:** a cast binds tighter than `&`. `&base[k] as [*]Pt` is
  `&(base[k] as [*]Pt)`, which takes the *value* of word k as the address, silently
  (`bugs/01`). Write `(&base[k]) as [*]Pt`. `abi.ents` provides `pts_at(k, n)` and
  `mirrors_at(k, n)` once, and nobody else writes the cast.

### 3.4 Strings

- Strings are bytes (`[]u8`). Seeds and codes are ASCII, so UTF-16 code units equal
  bytes (MAP-CORE §7). Journey seeds are string literals in `journey.ents`.
- `parse_code` is the one place where the input may not be ASCII. It works on the code
  units as `i32`s first: it trims the JS whitespace set and upper-cases, and only then
  narrows to bytes.
  - JS `toUpperCase` maps some non-ASCII letters to ASCII ones: U+0131 (dotless i) to
    `I`, and U+017F (long s) to `S`. So a code typed with them is valid in the JS.
  - G1's oracle sends such codes. Where the JS and MoonBit disagree, MoonBit is what
    ships: match it, and log the difference.
- Nothing concatenates. `hash("grid/3/" + code + "/" + i)` and
  `hash("casual/" + seed + "/" + attempt)` are streamed FNV: start, bytes, decimal
  digits, done.
- `layout_key` writes its JSON text into a `Vec(u8)` on the stack, then hashes it twice
  (plain, and with `"layout:"` first), as `layout.ents` does for all 120 Journey boards.
- Seeds and keys are output as code units (`put_string`).

### 3.5 Lists, tables, paths, positions

| MoonBit | Encantis |
| --- | --- |
| `Array[T]`, grown with `push` | `*mut Vec(T)`, passed on as `v.items()` (`[]T`) |
| `FixedArray[T]` of run-time size (board tables) | `[*]mut T` from `alloc` or `zeroed`, unchecked, as v1 and v2 did. Tag hot reads `// unchecked:` and count them. A fallback `?? 0` would hide a bug in a builder that never goes out of range |
| `Array[Array[T]]` frozen after it is built (tracks, stops) | `[*]mut []T`, or `Vec([]T)`: rows built at the top of the stack, then frozen |
| inner lists grown in turns (`lanes[c].push`, `dependents[id].push`, `arcs[a].push`) | count first and then fill (v1's lanes), or `[*]mut *mut Vec(T)` with reserved rows |
| `Path` | `[]Pt` at module boundaries (Board, Level, Move, positions), cells (`i32`) inside the kernels, as MoonBit does. The weave adapter converts builder-v2's cells to `Pt` |
| `Array[Path?]` (a position) | `[]?[]Pt` (compiles: MAP-CORE §4). A copy for a tap costs 8 bytes per rope |
| tuple lists (`tries`, `spots`, `opts`) | `Vec` of a named struct, stored and loaded whole |
| `.copy()`, `a[i:j]` | slices share. A copy is a loop, or `memcpy` on sized pointers |

### 3.6 Visited sets

The 7 string-keyed maps and sets are:

- `sq_solve` hopeless and `sq_fewest` tried (square);
- `hex_solve` seen and `hex_fewest` tried (hex);
- `solve_full` visited and `minimum_taps` seen (mech);
- assist's `Set[String]` (features).

They become `keys.ents`:

- The key is the words themselves: offsets, or cells per rope, with gone ropes marked.
- It is hashed with FNV over the words, in place, with no string built.
- On insert, it is copied into the pool.
- Equality compares words.
- Iteration order never matters for these (MAP-CORE §7: only `live` and
  `SqMirrors.keys` depend on insertion order, and both are plain lists).
- The 5 int-keyed maps become arrays by rope or by cell, with -1 for "none".

## 4. Translation rules: closures, functions as values, options, enums

### 4.1 Local functions (42 in all; 7 recursive)

- **Boards and searches** become a struct of tables behind `*mut`, used with method
  calls (`b.place(i, to)`, `s.search()`). This covers `SqBoard`, `HexBoard`, `Geo` and a
  `Search` for each recursive search. Several are alive at once: `gridgen` holds a board
  while `casual_wins` makes others, and `hex_build` compiles a board for each candidate.
  So module globals would be wrong there. The struct also puts what a function touches
  back in its signature (v1's verifier, recommendation 10).
  - A captured `let mut` becomes a field: `s.nodes += 1`, `s.gave_up = true`.
  - A recursive local function becomes a top-level recursive function on `s`.
- **Builder state** (`hex_build`, `weave`) stays module globals, reset at entry and
  listed in the module header, as in v1 and v2. One builder runs at a time.
- Tag each site `// closure:`. Closures would remove all 42, even without escape.

### 4.2 Lambdas (about 70) and comparators (7)

- Lambdas into `map`, `filter`, `makei`, `any` and `map_or` become loops (`// closure:`).
- A generic helper with a comptime function parameter (`count_if`, `any_of`) is worth
  writing only where the lambda captures nothing. Most of them capture.
- Comparators become `xs.sort(before)` (`lib/sort`, stable) with a top-level `before`:
  - MoonBit's `cmp -> Int` becomes `before -> bool`. Keep the tie-breaks exactly
    (`a.2 < b.2 || (a.2 == b.2 && a.0 < b.0)`).
  - **A captured run-time value becomes a precomputed key.** `hex_solve` and the
    `solve_full` branch rank by `p0`. Put the rank (-1 for `p0`, otherwise 0 or 1) into
    the tries element, then sort by it. A stable sort gives the same order, and no
    global is needed.
- Run-time function values are never needed. Nothing function-valued escapes or is
  stored (MAP-CORE §4). Tag `// fnvalue:` if one turns up.

### 4.3 Options and enums

| MoonBit | Encantis | Count (MAP-CORE) |
| --- | --- | ---: |
| `Path?`, `Array[Int32]?` | `?[]Pt`, `?[]i32` | 41 + 8 |
| `Board?`, `Level?`, `Move?`, `Cand?`, `HexIntent?` and other struct options | `?*T`, stored on the stack in the caller's scope, resolved with `if let`. There is no `let … else`, so each option nests one level (builder-v2, "What still hurts" 1) | about 35 uses |
| `Int32?`, `(Int32, Int32)?` | sentinel -1 | 5 |
| `Bool?` (`Solved.solved`) | `i32`: `def SOLVED = 1`, `UNSOLVED = 0`, `OUT_OF_BUDGET = -1`. These are the very words `guide` outputs | 1 |
| events (`EV_EXIT`, `EV_BOUNCE`, `EV_SLIDE`), `GONE`, mirror kinds | `def` constants, matched with `match` on ints | already ints |
| `Style.name` (a string match in weave) | an `i32` kind | 1 |
| `guard … else`, `is Some(x)` | `if let x = opt { } else { }`, `return v when …`, `?? fallback` | 41 + 59 |

Tag hand-made options and tags `// enum:`. Enums (reference §2.9, design only) would
replace them, mainly as `Option(T)` for any `T` and a `let … else` guard.

### 4.4 Numbers

- `f64` throughout, with the JS's order of operations.
- An `i32` next to an `f64` widens (builder-v2: 13 of 17 conversions went).
- `Math.round` is `js_round`, never `nearest`, which rounds halves to even
  (MAP-ORACLES §4.3).
- `floor_div` is used for Hex `r/2` with a negative `r`.
- `Math.pow` is fdlibm `pow` in `fmath.ents`. Port it from
  `/root/.moon/lib/core/math/pow_double_nonjs.mbt` (fdlibm's `e_pow.c`) and keep Sun's
  notice.
  - The f64 bits come from punning a scratch word: `scratch.f64[0] = x; hi =
    scratch.u32[1]` works **[ran: p1]**.
  - There are 2 call sites. A host import would break the six loaders that pass `{}`,
    silently in the game (MAP-ORACLES §4).
- Signed and unsigned: cells, ids and counts are `i32`; `Vec` lengths are `u32`. Count
  the casts (v2: 69).

## 5. The ABI

### 5.1 `core.wasm`: the exports of `src/gen`, plus the `bench_*` exports of `src/api`

| Export | Signature | Notes |
| --- | --- | --- |
| `in_reset`, `in_push` | `() -> ()`, `(i32) -> ()` | code units of a code or seed, or the words of a position |
| `out_len`, `out_get` | `() -> i32`, `(i32) -> i32` | |
| `outf_get` | `(i32) -> f64` | 0: wins; 1: challenge; 2: coverage |
| `generate` | `(index: i32) -> i32` | 0 for an invalid code (`parity.test.cjs` sends 5 of them) or no board |
| `generate_spec` | `(hex, w, h: i32, difficulty: f64, mirrors, springs, require_slide, min_mirrors, min_springs, colossal: i32) -> i32` | the seed is in the input |
| `measure` | `(games: i32) -> f64` | on the current level: -1 if there is none |
| `target_challenge`, `win_ceiling` | `(f64) -> f64` | |
| `guide`, `features` | `(budget: i32) -> ()` | position layout of `read_position` |
| `bench_casual` | `(games: i32) -> f64` | on the current level |
| `bench_par` | `() -> i32` | on the current level |
| `bench_solve` | `(budget: i32) -> i32` | on the current level |

- **Signatures.** `i32` and `f64` only, with **no imports**. Every check script asserts
  `WebAssembly.Module.imports(m).length === 0`.
- **Memory.** Exporting it is allowed and ignored. Exporting it lets the unit oracles
  bulk-copy words.
- **Output layout.**
  - The output words are `put_level`'s, in MAP-ORACLES §4: hex, W, H, par, exact; the
    ropes; mirrors; springs; plan; the layout key; then the 8 stats.
  - `guide` writes solved, nodes, then moves.
  - `features` writes the indices of the features in reach.
- **The current level** is its words, kept in a keep buffer (§3.3). It is not something
  on the stack.
- **Each export calls `clear()` first.**
- **The ABI costs nothing that matters.** It is 0.6 to 2.6 ms per 120 levels, against
  7.5 s of generation (MAP-ORACLES §4).
- **No adapter.** `oracle/setup-harness.sh <dir> core.wasm` installs it as
  `dist/gen.wasm`, `dist/mf.wasm` and `_build/…/api.wasm`. Then `parity.test`,
  `generator.test`, `assist.test`, `measurements-wasm.test`, `parity.mjs`,
  `bench-node.mjs`, `wasm-reps.mjs` and `browser-gen.mjs` run unchanged
  (MAP-ORACLES §4: proven with a stub).
- **Not ported.** The `game_*` exports and `f_len`/`f_get` belong to the playable slice,
  so `game.test.cjs` and the frame half of `bench/browser.mjs` do not apply.

### 5.2 The test entries

Each group's `test/gN.ents` imports the modules under test and exports:

- the ABI buffers;
- `draws()`;
- `stack_peak()`;
- its `t_*` hooks.

The conventions are the same throughout:

- A board comes in as **position words**, the `read_position` layout: hex, W, H, ropes,
  mirrors, springs, current paths (a count of 0 means the rope has left) and a preferred
  order.
- Extra scalars are parameters: budget, games and seed.
- Results come back as words through `out_get`, and doubles through `outf_get`.

So one JS converter serves every oracle.

## 6. Oracle tooling (built in G1, used by all)

| File | Does |
| --- | --- |
| `oracle/ref.cjs` | Loads the JS reference at 9e69e3a. It takes `MF_REF`, defaulting to `/home/user/mf-core-scratch/ref-9e69e3a`, and makes that with `git -C /home/user/mf-core archive 9e69e3a \| tar -x -C …` if it is missing. Before the modules load, it swaps `random.js`'s `mulberry32` for one whose state can be read and whose draws are counted, as `dump-weave.cjs` does. Gives converters between JS boards (`{q, r}`, mirrors with `axis` or `slope`) and words. Gives the board set and positions (below) |
| `oracle/wasm.cjs` | Instantiates with `{}` (and asserts no imports), pushes words, calls, reads words and doubles. Gives a `--js` mode in which the "port" is the JS function behind the same converters: the positive control |
| `oracle/capture.cjs` | Records calls made during real generation. **Module-object calls** are wrapped in place: `H.build`, `L.weave`, `L.fewestPlayerTaps`, `L.casualWins`, `H.casualWins`, `Q.analyze`, `M.tap`, and so on. **Internal functions** of `grid-generator.js` (`repeatedCore`, `addSpinners`, `woven`, `placeMirrors`, `postpone`, `regional`, `trivial`, `featuresUsed`, `valid`) are reached through a patched scratch copy, made at run time by a documented text substitution that routes each through a recorder. Each record holds the rng state at entry, the inputs, the outputs and the draws. Each fixture is checked by re-running its cases from the plain numbers alone, as `dump-weave.cjs` does |
| `oracle/check-all.sh` | Runs every group's check that exists, for regressions after a compiler change |
| `oracle/fixtures/` | Fixtures under about 2 MB are committed. Larger ones are regenerated by their `dump-*.cjs`, and the check script pins their sha256 |

### The board set

- **All 135 boards of `reference.json`.** These are 120 Journey and 15 custom; both
  grids; plain boards, mirrors, springs and both; 4×5 to 40×40. The file is in
  `/home/user/mf-core-scratch/`, and `dump-reference.cjs` regenerates it in 2.5 min.
- **Positions on each board:**
  - every prefix of the plan;
  - 20 random-play positions, from seeded taps of the JS's own `G.tap` and therefore
    always reachable.
- **The 8 bench boards** of `bench-node.mjs`:
  - L30, L60, L89 and L120: square with spinners, so full geometry;
  - L107, L118 (square) and L114, L116 (Hex): no spinners, so the offset kernels.

### Controls

Every check runs in three modes:

- `--js`: must pass;
- against a fixture with one field corrupted per kind of output: must fail and name the
  case;
- against the port.

Where MoonBit has an export for the unit, also run the check against the MoonBit build
(`dist/mf.wasm`'s `bench_*`, or a scratch MoonBit package in `mbt-build`), so that the
oracle is shown to agree with the build the game ships. Exporting a `pub fn` from a new
package in the scratch copy needs no edit to `src/`. moon is at `~/.moon/bin/moon`.

## 7. The groups

Token counts are MoonBit tokens to port, from MAP-CORE §1. Where a group takes part of
a file, the count is estimated from the line share.

### G1: Foundations (about 3.0k tokens by hand; the Journey table is generated)

- **Ports:**
  - `random.mbt`: all of it, with `ssort` becoming `lib/sort`;
  - `types.mbt`;
  - `engine.mbt` except `generate` and `generate_spec`;
  - `Spec`, `Level`, `target_challenge` and `win_ceiling` of `gridgen.mbt`;
  - `to_fixed`;
  - `SqMirrors` and `has_dup` of `square.mbt`;
  - the reading and writing half of `gen.mbt`;
  - `journey.mbt`, generated.
- **New:** fdlibm `pow`, which MoonBit took from `@math`; `keys.ents`; `lib/` copies;
  `build.sh`; the oracle tooling of §6.
- **Reuse:**
  - `layout.ents`: mulberry32, `below`, FNV, base 36, digit writers, the layout JSON,
    `js_round`, `to_fixed`;
  - `builder-v2/rng.ents`: `one_of` and the draw trace;
  - `stack/features.ents`: the word-key set;
  - the abi probe;
  - the `data` table probe.
- **Oracle: `check-g1.cjs`, against the JS at 9e69e3a, under a minute.**
  1. **Draws.** 1,000 seeds (the Journey seeds hashed, plus random `u32`s) × 1,000 draws:
     - `r.next()` is bit-identical to `mulberry32(seed)()`;
     - `r.below(n)` matches for n = 1 to 64;
     - `draws()` equals the number of calls.
  2. **Hashes.** `hashString` and its base-36 upper-case text match for:
     - every Journey seed;
     - every `cases.cjs` code;
     - `grid/3/<code>/<i>`, `casual/<seed>/<attempt>` for attempts 0 to 30, and
       `journey/5/MONKEYFIST/measure/<seed>`;
     - 10,000 random ASCII strings.

     The streamed hash must equal the whole-string hash.
  3. **pow, bit for bit against `Math.pow`:**
     - x = k/10,000 for k = 0 to 10,000, with y = 1.3;
     - every Journey difficulty;
     - 100,000 random x in [0, 1];
     - 10,000 random (x, y) over wide ranges, including the edge cases: 0, 1,
       subnormals, integer y and negative x.

     Then `targetChallenge` and `winCeiling` for d = 0 to 100 in steps of 0.01, against
     `grid-generator.js`.
  4. **Rounding:**
     - `js_round` against `Math.round` on 1M doubles, with halves, negatives,
       0.49999999999999994 and 2^52 ± 0.5;
     - `to_fixed(x, 4)` against `Number(x.toFixed(4))` on 1M ratios and products of
       small integers, the shapes the generator makes;
     - `floor_div` against `Math.floor(a / b)`.
  5. **Codes and specs:**
     - `parseCode`, accepted or refused, with the parsed fields: the 5 invalid codes of
       `parity.test`, every `cases.cjs` code, 2,000 random valid codes, and 2,000
       mutations (case, spaces, part counts, out-of-range numbers, flags, seed
       characters);
     - `code(normalize(opts))`;
     - `spec(parseCode(code), i)`, every field (difficulty bit for bit, and the seed
       text): Journey 0 to 119 and 2,000 random (code, i);
     - codes with non-ASCII code units: JS whitespace around them, U+0131, U+017F, and
       other letters whose upper case is ASCII (§3.4).
  6. **Layout key.** For the 135 reference boards, the JSON text equals
     `JSON.stringify` byte for byte (`t_layout_json`), and the key equals the stored
     layoutKey.
  7. **ABI.** Each reference board goes in as position words and comes back as level
     words. These must equal what `web/generator.js` would encode and decode.
  8. **`keys.ents`.**
     - A differential run against a JS `Map` keyed by `words.join()`: 200,000 random
       inserts and lookups, keys of 1 to 60 words, small value ranges for collisions.
     - Overflowing the reserve traps: a negative test.
     - Inline `encantis test`.
- **Measure:** `check`, `wasm` and `test` times; wasm bytes.
- **DX focus:**
  - the restated types and imports (count them);
  - the pow port: lines, and minutes;
  - bytes for strings;
  - the `&`/`as` precedence;
  - the Journey `data` table;
  - `fmt` and `hover` tried once.
- **Done when:** all 8 checks pass, the controls behave, and the work is committed.
  **About 4 to 5 hours.**
- **As built (what G2 to G7 import; the DX-LOG's G1 section has the why):**
  - `random.ents`: `rng(seed) -> *mut Rng` (on the stack), `r.next()`, `r.below(n)`,
    `r.chance(p)`, `r.one_of(T, xs)`; `draws()`, `reset_draws(on)` and `traced(k)` (the bound of
    each draw, with tracing on). Text goes to a sink given as a comptime function:
    `fnv().text("casual/", hash_byte).text(seed, hash_byte).text("/", hash_byte).dec(attempt,
    hash_byte)` is `hashString('casual/' + seed + '/' + attempt)`; `base36(s, u, upper, put)`;
    `collect` is the sink into a `Vec(u8)`. `js_round(x) -> f64` (keeps -0), `round_i(x) ->
    i32` (random.mbt's `js_round`), `floor_div`, and generic `index_from`, `contains`,
    `unique`, `reverse`. `min`/`max` are the builtins.
  - `fmath.ents`: `pow` is **V8's** fdlibm (not textbook fdlibm, which MoonBit has: they
    differ by one ulp on 3% of inputs); `to_fixed(x, digits)` is exact `Number(x.toFixed(d))`
    (metrics.mbt's scale-and-round is not).
  - `board.ents`: the canonical type block; `gone()` (the none of a `?[]Pt`), `some_paths`,
    `all_gone`, `last`; `SqMirrors` with `no_mirrors()`, `sq_mirrors(b: *Board)`,
    `m.set_at(c, s)` (`set` is a keyword), `m.at(c)` (MoonBit's `get`), `m.has(c)`, `m.size()`,
    keys in `m.keys`; `has_dup(cells: []i32)`; `max_w`, `max_h`, `max_area` (a `def` is lower
    case).
  - `keys.ents`: `keyset(W, keys, words)`, `s.add_key(k)`, `s.has_key(k)`; `keymap(W, V, keys,
    words)`, `m.set_key(k, v)`, `m.get_key(k, fallback)`, `m.ref_key(k) -> ?*mut V`. Import
    `"KeySet" func KeySet(comptime W: type) -> type` and `KeyMap` likewise: no fields to
    restate. Passing the reserve traps.
  - `codes.ents`: `parse_code(units: []i32) -> ?*SetOpts`, `level_spec(o, i) -> Spec`,
    `code(s, o, put)`, `layout_json(s, b: Board, put)`, `layout_key(s, b: Board, put)`,
    `target_challenge`, `win_ceiling`. `journey.ents`: `journey() -> []Spec`.
  - `abi.ents`: the buffers (`in_reset`, `in_push`, `out_len`, `out_get`, `outf_get`: an entry
    imports them under other local names and exports its own), `input()`, `input_bytes()`,
    `put`, `putf`, `put_byte` (a sink), `begin_count()`/`end_count(at)`, `put_string`,
    `pts_at`/`mirrors_at` (the one cast), `read_position()`, `read_level(words)`,
    `put_level(l: *Level)` (the key is computed from the board).
  - `oracle/`: `ref.cjs` (the reference with a counting `mulberry32`, `boards()`,
    `position()`, `levelWords()`, `positions()`), `wasm.cjs` (`load` asserts no imports;
    `fake` for `--js`), `capture.cjs` (records and replays real calls), `size.cjs` (add your
    group to `GROUPS`), `check-all.sh`. `check-g1.cjs` shows the `--js` and `--controls`
    pattern (spoil the k-th expected value of each kind).
- **After G1's review** (DX-LOG, "review of G1"; commits 6294c9d and 01e6707):
  - Limits that now trap instead of wrapping: `alloc`/`extend` past the room left;
    `keyset` past 2^26 keys or 2^30 bytes of words; a negative or oversized count in
    position words; `sq_mirrors` of a negative area; `input_bytes` of a code unit past 255.
    `to_fixed` is exact for every x (it returns x once x * 10^d >= 2^53).
  - `check-g1-wide.cjs` and `fixtures/g1-extra-boards.jsonl` (79 more boards: 4x4, 8x8 with
    mechanics, strips, 48x48 colossal) are there to reuse: the 48x48 boards are the ones that
    reach the limits.
  - **A memory risk for G2 and G5.** The 48x48 colossal boards have up to 223 ropes. A
    visited set keyed by one offset per rope, at `sq_solve`'s default budget of 20,000, needs
    20,000 x 223 x 4 bytes = 17.8 MB of pool, more than the 16 MiB stack (it now traps
    cleanly). MAP-CORE §8 assumed 50 ropes. Size such reserves from the board, or raise the
    stack, and measure the peak on those boards.
  - `pow` costs 140 ns a call against MoonBit's 50, of which a factor of 2 is the scratch
    cell that stands in for reinterpret (`oracle/bench-g1-pow.cjs`). That matters if weave's
    `knots_for` is hot.

### G2: The square world (square kernel, about 4.7k tokens, about 55% covered; weave reused)

- **Ports:**
  - from `square.mbt`: `turn`, `head_dir`, `exit_dir`, `ray_cells`, `self_blocked`;
  - `SqBoard` (`sq_board`, `sq_board_exn`, `slide_to`, `place`, `relax` with its
    `was`/`now` double buffer, `all_free`, `paths`);
  - `sq_frozen`, `Solved`, `sq_solve`, `sq_player_taps`, `Par`,
    `sq_fewest_player_taps` (iterative deepening with `bound` and `tried`), `EV_*`,
    `Replayed`, `sq_replay`, `sq_free`, `sq_tracks`, `sq_postpone_exits`,
    `sq_casual_wins`.
- **Not ported:** `sq_play`, `bends_of`, `sq_blockers`, `groups_of` and `sq_looped`. Only
  weave uses them, and builder-v2 has them.
- **Weave**, taken from builder-v2, not ported again:
  - Copy `weave.ents` and `board.ents` (as `weave-board.ents`) from builder-v2 at its
    latest commit (721f6a3 or later), and record which.
  - Point their imports at `core/lib`. One stack: two copies of `lib/stack` would be two
    stacks.
  - Replace `rng.ents` with `weave-rng.ents`, which has the same API (`rng(site, n)`,
    `below`, `chance`, `one_of`) and draws from a global `cur: *mut Rng` that
    `weave_run` sets.
  - Add `weave_run(r: *mut Rng, cfg: WeaveCfg) -> ?*Woven` with `Pt` paths.
  - Add `knots_wanted`, `styles` (with `Style.name` as an int) and `knots_for`.
  - Keep the buffer contract export in `test/weave.ents`. Record the diff from
    builder-v2 in lines.
- **Decisions:**
  - `SqBoard` is behind `*mut`.
  - The searches go over a `*mut Search`, with a node scope for `tries`.
  - `hopeless` and `tried` are `keys.ents` reserved to the budget.
  - `tries` is a `Vec` of `(i, to, rank)` sorted by (rank, i).
  - `sq_casual_wins` resets its board per game, as MoonBit does.
- **Oracle: `check-g2.cjs`, against `levels.js` at 9e69e3a.**
  - **Cases.** Every square board of the reference set without springs, at every
    position of §6.
  - **Per position:**
    - `tracksOf`;
    - `free`, `frozenRopes` and `deadRopes`;
    - `solve(paths, W, H, budget, prefer)` at budgets 40, 900 and 2,000, with
      prefer = the plan: solved, moves, nodes;
    - `playerTapCount`;
    - `fewestPlayerTaps(paths, W, H, plan, 2500)`: par, plan, exact;
    - `replay(paths, plan)`: solved, taps, events, the paths after (the same board after
      every move);
    - `postponeExits`;
    - `casualWins(…, mulberry32(hashString('bench')), 1000)`: wins and draws;
    - `rayCells` and `selfBlocked` for every rope.
  - **Weave:**
    - `builder/check-weave.cjs` on `test/weave.wasm`: 249 cases, draws included, in
      order and in reverse;
    - `builder-v2/other-seeds.cjs` (4,980 runs) and `other-sizes.cjs` (224);
    - `t_weave` through `weave_run` with a core `Rng`: the same 249 cases and draws.
- **Measure:**
  - `t_par`, `t_casual` (×1000) and `t_solve` (2,000) on L107 and L118, against MoonBit
    `mf.wasm`'s `bench_par`, `bench_casual` and `bench_solve` on the same levels,
    interleaved;
  - weave through `builder-v2/bench.cjs`: it should equal builder-v2's 289 ms.
- **DX focus:**
  - how much of `solver.ents` and `board.ents` carried over unchanged;
  - the context struct against v1's globals;
  - the `// reserve:` sites;
  - the cost of the weave adapter.
- **About 3 to 4 hours.**
- **As built (what G5 to G7 import; the DX-LOG's G2 section has the why):**
  - `square.ents`: `turn(s, dx, dy)`, `head_dir(path)`, `exit_dir(path, w, m)`,
    `ray_cells(x, y, dx, dy, w, h, m, out: *mut Vec(i32))`, `self_blocked(path, w, h, m)`;
    `sq_board(paths, w, h, m) -> ?*mut SqBoard` and `sq_board_exn`, with `b.slide_to(i)`,
    `b.place(i, to)`, `b.relax()`, `b.all_free()`, `b.paths_of(w)` (not `paths`: every kernel's
    `paths` parameter would hide it). The kernels take `(paths: []?[]Pt, w, h, ..., m:
    *SqMirrors)` as MoonBit's do: `sq_frozen -> []i32`, `sq_free -> bool`, `sq_tracks ->
    ?[][]i32`, `sq_solve(..., budget, prefer, m) -> Solved` (`solved` is `solved_yes` 1,
    `solved_no` 0, `solved_unknown` -1), `sq_player_taps -> i32` (-1 for none),
    `sq_fewest_player_taps(..., known, budget, m) -> ?*Par` (`Par` has `nodes` too),
    `sq_postpone_exits -> ?[]i32`, `sq_replay -> Replayed` (events `ev_exit` 0, `ev_slide` 2),
    `sq_casual_wins(..., r: *mut Rng, games, m) -> f64`. Results that are lists are in the
    caller's scope; the others leave nothing on the stack. Restate `SqBoard`, `Solved`, `Par`,
    `Replayed` from the file's head.
  - **Limit:** the visited keys are reserved for the whole budget (4 bytes per rope per node):
    `sq_solve` at its default 20,000 on a 223-rope colossal board needs 17.8 MB and traps.
    Pass the game's budgets (900, 2,000, `12000 / ropes`), or raise the stack.
  - `weave.ents`: `weave_run(r: *mut Rng, cfg: WeaveCfg) -> ?*Woven` (`WeaveCfg` and `Woven`
    at the head of the file: `mirrors: *SqMirrors`, `initial_ropes: [][]Pt`, `initial_stops:
    [][]i32`, `initial_plan: ?[]i32`; the result's ropes are `Pt` paths), `knots_wanted(d)`,
    `knots_for(d)`, `styles() -> []Style` (`kind` 0 short, 1 medium, 2 twisty) and
    `len_hi_of(style, w)`. One builder runs at a time (module globals).
  - `oracle/check-g2.cjs` (its `WANT` and `context` are exported), `bench-g2.cjs`; `test/weave.ents`
    keeps builder-v2's buffer contract, and `test/g2.ents` re-exports it.
- **After G2's review** (DX-LOG, "review of G2"; commits 56f8116 and the ones after it):
  - `self_blocked` asserts `w * h <= 2304` once the board has a mirror. Past max_area its
    unchecked reads of `body_marks` ran on into the next data block (weave-rng's trace
    buffer) and answered from whatever was there; `has_dup` already trapped on such boards
    when a way out turned. The game's boards are 48 x 48 at most, so nothing it makes changes.
  - **The budgets the game passes**, for the limit above: `solve` at 900 (hints), 5,000
    (auto-solve: app.js `seekPlan([], 5000)`, MoonBit's `seek_plan([], 5000)`), 2,000 and
    `round(12000 / ropes)` (the generator); `fewest` at 2,500; casual play 32 games. On the
    223-rope colossal board `sq_solve` at 5,000 reserves 4.5 MB of keys (5.42 MB peak,
    measured) and matches the JS; only budget 0 (20,000) traps there.
  - **`sq_fewest_player_taps` returns `known` itself** as `Par.plan` when it finds nothing
    shorter (MoonBit and the JS copy it). G7's `score` passes `sq_postpone_exits(...) ??
    plan`: keep that list's scope open as long as the plan is used, or copy it.
  - **Paths must lie on their board: `sq_board` now traps on a body cell off it** (c < 0 or
    c >= w * h). `occ` and `at` are written at the body's cells unchecked, so before the
    review such a cell wrote over the stack around them and the kernels answered wrong
    (`free` 0 where the JS says 1); the JS ignores a write off a typed array and answers.
    `check-g2-wide.cjs` checks that both limits trap (34 calls). The game never sends one, and
    `read_position` does not check; a q/r swap on a board that is not square would.
  - `check-g2-wide.cjs` has an "aimed" set (boards with exactly 1 to 3 mirrors on the ways
    out) and takes `--seed`: run `check-all.sh` after any change to `square.ents`.
    `oracle/mutate-g2.sh` runs the review's 55 seeded changes of `square.ents` against the
    oracles: 51 fail them, and the other 4 cannot change an output or never did in 36,190
    tries (DX-LOG). A hook's output past the ABI's 65,536 words traps in `put` (`rays` on a
    48x45 board of 688 mirrors would write 96,537); the wide check counts that as a limit.

### G3: The hex offset kernel (about 4.0k tokens, uncovered apart from geometry)

- **Ports:** `hex.mbt` lines 1 to 668:
  - `hex_dq`/`hex_dr`, `hex_inside`, `hex_cell`, `hex_point`, `hex_reflect`,
    `hex_dir_index`;
  - `hex_mirrors`, `ray_track` (with its optional out-list as `?*mut Vec(i32)`),
    `exit_index`, `hex_turning`;
  - `HexBoard` (`hex_compile`, `hex_compile_exn`, `to`, `place`, `free`, `paths`,
    `relaxed`, `dead`, `frozen`);
  - `hex_replay`, `hex_solve`, `hex_postpone_exits`, `hex_casual_wins` (a compile per
    game, kept for the same work), `hex_fewest_player_taps`.
- **Reuse:** the geometry of `features.ents`, and G2's patterns.
- **Decisions:**
  - Keep the hex functions apart from the square twins. The algorithms differ in
    detail: `hex_solve` keeps a seen set and a preferred prefix, and counts its budget
    otherwise; `relaxed` works in place, where `relax` double-buffers.
  - Share only `keys.ents` and the table layout.
  - `p0` is a precomputed key (§4.2).
  - `preferred[1:]` is an offset into `prefer`.
  - `done` stays `i32`, as in MoonBit. The JS's `Uint8Array` wrap is latent (REPORT
    §5.3).
  - `neighbours` is a flat `[*]mut i32`, indexed `c * 6 + d`.
- **Oracle: `check-g3.cjs`, against `hex/engine.js` at 9e69e3a.**
  - **Cases.** Every Hex board without springs, at every position.
  - **Calls:**
    - `compile`: tracks, `reach`, exits;
    - `replay(level, plan)`;
    - `solve(level, paths, 40, 900 and 2,000, prefer)`;
    - `postponeExits`;
    - `casualWins(level, bench rng, 1000)`, with draws;
    - `fewestPlayerTaps(level, plan, 6000)`;
    - `turningMirrors`.
- **Measure:** par, casual and solve on L114 and L116, against MoonBit `bench_*`.
- **DX focus:**
  - whether a generic over the board type (overloads `place(b: *mut HexBoard)` and so
    on) would have shared anything;
  - the `// comptime-n:` sites (direction rows).
- **About 4 hours.**
- **As built (what G4 to G7 import; the DX-LOG's G3 section has the why):**
  - `hex.ents`, geometry: `hex_inside(w, h, p)`, `hex_cell(p, w)`, `hex_point(c, w)` (c >= 0),
    `hex_reflect(d, axis)`, `hex_dir_index(dq, dr)` (-1 for none) and `hex_dir(d) -> Pt`, which is
    MoonBit's `(hex_dq[d], hex_dr[d])` and traps outside 0 to 5. Ways out: `hex_mirrors(w, h,
    mirrors) -> *mut SqMirrors` (board.ents's type, keyed by Hex cell), `ray_track(w, h, head, d0,
    m, out: *mut Vec(i32), turns: ?*mut Vec(i32)) -> bool` (no list: `0 as ?*mut Vec(i32)`; each
    turning cell once, in order), `exit_index(w, path, m)`, `hex_turning(w, h, mirrors, paths) ->
    []i32`.
  - The board: `hex_compile(w, h, mirrors, paths: []?[]Pt) -> ?*mut HexBoard` and
    `hex_compile_exn`, with `b.to(i)` (-2: no such rope; -1: it leaves), `b.place(i, target)`,
    `b.free()`, `b.paths_now()` (not `paths`: a kernel's `paths` parameter would hide it),
    `b.relaxed()`, `b.dead()`, `b.frozen()`. Restate `HexBoard` from the file's head: `(w, n,
    left, tracks, lengths, offsets, occupied, at, reach)`, MoonBit's field names.
  - The kernels take the paths of a position (`[]?[]Pt`). MoonBit's `hex_postpone_exits`,
    `hex_casual_wins`, `hex_fewest_player_taps` and `hex_turning` take the ropes, so a caller
    with ropes passes `some_paths(ropes)`. `hex_replay(w, h, mirrors, moves, paths) -> Replayed`,
    `hex_solve(w, h, mirrors, paths, budget, prefer) -> Solved` (the budget as given: at 0 it
    looks at no position, where `sq_solve` takes 0 for its default 20,000), `hex_postpone_exits(w, h, mirrors, paths, plan) -> ?[]i32`,
    `hex_casual_wins(w, h, mirrors, paths, r, games) -> f64` (a compile per game, in a scope per
    game), `hex_fewest_player_taps(w, h, mirrors, paths, fallback, budget) -> ?*Par`: none where
    `fallback` does not clear the board (MoonBit aborts, the JS throws); where nothing shorter is
    found the plan is `fallback` itself, as with `sq_fewest_player_taps`. `Solved`, `Par` and
    `Replayed`, and the `solved_*` and `ev_*` constants, are square.ents's.
  - **Limits:** the visited keys are reserved for the whole budget, 4 bytes per rope per node:
    `fewest` at 6,000 on 197 ropes peaks at 5.3 MB (measured). A body cell off its board (cell
    index below 0 or past W * H) traps, where the JS's typed arrays ignore it; so does a turning
    way out on a board past max_area (`has_dup`), as in G2. The JS's `Uint8Array` `done` and the
    `neighbours` table are G4's (`hex_intentions`, `hex_build`), not in these lines.
  - `oracle/check-g3.cjs` (`--js`, `--controls`, `--moonbit`, `--extra`, `--reverse`,
    `--max-ropes`; its `WANT`, `CALL`, `context` and `internals()` are exported),
    `check-g3-wide.cjs` (synthetic and aimed boards, the limits), `bench-g3.cjs`, and
    `mutate-g3.sh` with `mutants-g3.cjs` (60 seeded changes: 55 killed, the other 5 shown unable
    to change an output). Run `check-all.sh` after any change to `hex.ents`.
- **After G3's review** (DX-LOG, "review of G3"; commit 15c5f93 and the ones after it):
  - Nothing in `hex.ents` changed: no output differed from the JS, and every limit that traps is
    one the game cannot reach. `oracle/check-g3-review.cjs` adds the calls the game makes that
    the G3 oracles did not: `solve` at the auto-solve budget 5,000, `par` as `score()` makes it
    (`fewest` at 2,500 from the plan `postpone` returns), casual play of 32 games at the
    generator's seeds, and `fewest` at budgets that run out, on 160 generated Hex levels besides
    the reference and extra boards. `check-all.sh` runs a quarter of it.
  - **The budgets the game passes, on the largest Hex level a code gives** (48x48 at difficulty
    100, 224 ropes): `solve` 5,000 peaks at 5.29 MiB of the 16 MiB stack, `fewest` 2,500 at 2.45
    MiB (6,000, the JS's default, which the game never passes, at 5.57). The stack runs out near
    800 ropes for `solve` 5,000. A budget past 2^26 traps in `reserve`; nothing passes one.
  - **For G7:** `hex_turning` is called in gridgen.mbt with `raw.ropes`: pass `some_paths(raw.ropes)`.
    `hex_fewest_player_taps` returns `fallback` itself as `Par.plan` when it finds nothing
    shorter, so `score` must keep the postponed plan's scope open while the plan is used (as for
    `sq_fewest_player_taps`). `hex_compile`, `hex_replay` and `b.paths_now()` leave what they make
    in the caller's scope: a caller that compiles per node (MoonBit's `minimum_taps` calls
    `all_free`, a `hex_compile_exn(...).free()`, on each of up to 20,000 BFS nodes) needs a scope
    per call.
  - **Build flags:** the CLI's `wasm -O` runs `wasm-opt -Oz` (a size setting): casual play 3% and
    7% faster. `wasm-opt -O3` on the same wasm (node_modules/.bin/wasm-opt, version 129) makes
    casual play 14% and 19% faster and the file 40% smaller (18,861 bytes), par 2 to 3%, and it
    passes the G3 oracles (DX-LOG). G7 can weigh building `core.wasm` that way.

### G4: The Hex woven builder (about 3.4k tokens; the hottest code, 50% of generation)

- **Ports:** `hex.mbt` lines 669 to 1238:
  - `HexIntent`;
  - `hex_intentions` (its `step` closure; `stops: Array[Array[Int32]]` becomes
    `[*]mut []i32`; `certificate: Array[Int32]?` becomes `?[]i32`);
  - `HexCfg`, `HexBuilt`, `HexShape`;
  - `hex_build`: about 440 lines, with the closures `free`, `ray`, `intent`, `shape`,
    `aim_at`, `note_turns` and `try_trap`, 20 lambdas, and 2 comparators (one ranking by
    `p0`).
- **Decisions:**
  - Builder state is module globals, reset at entry and listed, as in v1 and v2.
  - Scopes are the call, a step and a candidate. `intent` rebuilds the `HexBoard` in the
    candidate's scope: zeroed tables, no GC.
  - The chosen `best` is copied out with `keep`.
  - `choices` and `dirs` (at most 6 each) are a `*mut [6]i32` taken once per call, with
    a count, indexed by `k % 6`, which is proven in range **[ran: p5]**. Tag them
    `// comptime-n:`.
  - Keep the algorithm for parity. `shape` (13% self) and the per-candidate recompile
    are where speed comes from.
- **Oracle:**
  - `dump-hexbuild.cjs`, built like `dump-weave.cjs`. It runs the real 9e69e3a generator
    over:
    - every Hex Journey spec;
    - custom Hex and mixed sets: 4×5 to 24×24, the 32×32 colossal map, difficulties 1
      to 100, with and without mirrors.

    `H.build` is wrapped to record the rng state at entry, the cfg, the result and the
    draws. A documented selection of about 250 cases, nulls included, goes into
    `fixtures/hexbuild-expected.json`, and is checked by re-running it from numbers
    alone.
  - `check-hexbuild.cjs` compares every rope cell, the stops, the certificate and plan,
    and the draws, in order and in reverse.
  - 20 other seeds per cfg against the live JS.
  - `H.intentions(level, stops, certificate)` checked directly on each built board.
- **Measure:** the call alone over the fixture, against the JS and against MoonBit
  wasm-gc. For MoonBit, a scratch package in `mbt-build` exports `hex_build` behind the
  same word contract.
- **DX focus:**
  - 11 closures: the globals and context it took;
  - the depth of `if let` nesting;
  - the `keep` sizes.
- **About 5 hours. The hardest group.**
- **As built (what G7 imports; the DX-LOG's G4 section has the why):**
  - `hexbuild.ents`: `hex_intentions(w, h, mirrors, paths: []?[]Pt, stops: [][]i32, certificate:
    ?[]i32) -> ?*HexIntent`, with `HexIntent = (moves, cost, depth, slides)` (the JS's four; MoonBit
    keeps two), and `hex_build(r: *mut Rng, c: *HexCfg) -> ?*HexBuilt`. `HexCfg` is MoonBit's (w, h,
    stage, coverage, length, tap_depth, mirrors, knots, traps, initial_ropes, initial_stops,
    initial_plan: `?[]i32`); `minLength` is 2 in every call the generator makes, and is not a field.
    `HexBuilt = (ropes, stops, plan, slides, traps, depth, cost)`: what woven() reads (raw.slides,
    raw.traps, raw.stats.depth, and averageDepth as cost / ropes). All of it is in the caller's scope.
    Restate the three types from the file's head.
  - `hex_build` returns none where the core does not hold, a core way out passing a cell twice
    included (the JS throws "twice" there and woven() makes it null): G7 has nothing to catch.
  - **Draws: `set_draw_exact(on)`.** With true, `hex_build` draws exactly as the JS does and builds
    the JS's board from the same state. With false, the default, it departs in two places (D1, D2 in
    the DX-LOG) that draw about a third less and leave the law of what is built unchanged. **G7:
    call `set_draw_exact(true)` before Journey levels and for the parity run.** The Journey's seeds
    were chosen by build-grid-journey.cjs for the JS's draws: with the departures 6 of its 60 Hex
    levels cannot be generated at all (L32, L36, L37, L38, L46, L50) and the other 54 change. Custom
    codes may use the default (quality-hexbuild.cjs).
  - One `hex_build` runs at a time (33 module globals, reset at entry). Its stack peak over the
    fixture is 260 KB (24x24 at difficulty 100).
  - Oracles: `check-hexbuild.cjs` (exact, in draw-exact mode: `--seeds N`, `--reverse`, `--js`,
    `--controls`), `quality-hexbuild.cjs` (`--builder`; `--levels <class> --set A|B|C`, `--report`),
    `hybrid.cjs` (the JS generator with H.build replaced by the port: G5 to G7 can use it for any
    unit the generator calls through a module object), `bench-g4.cjs`. `check-all.sh` runs the first
    two on a few seeds.

### G5: Full geometry, routing, the repeated-slide core and the hints (about 4.6k tokens)

- **Ports:**
  - `mech.mbt`:
    - `Geo`, `new`/`geo`, `cell`, `inside`, `direction`;
    - `mark`, which restamps every rope;
    - `replace`, `tail`;
    - `Move` and `tap`;
    - `all_free_full`, `key`;
    - `solve_full`, with 2 recursive searches and `first`/`lastk` as arrays by rope;
    - `tracked`, `all_free`, `replay`, `replay_plan`, `solve`, `frozen`;
    - `minimum_taps`: a BFS whose queue is a `Vec` of (parent, move, depth) plus a
      `Vec([]?[]Pt)`, reserved to the budget.
  - `assist.mbt`:
    - `guide`: the preferred order replayed, then `Board::solve`;
    - `reachable_features`, from `features.ents`. Its `live` keeps insertion order as a
      list plus flags.
  - `gridgen.mbt`'s `Core` and `repeated_core`: two ropes laid by hand, rotated and
    flipped. The stops come from `solve`, `minimum_taps` and `tap`.
- **Decisions:**
  - `Move = (paths: []?[]Pt, event: i32, distance: i32, route: []Pt)`, returned as
    `?*Move` in the caller's scope.
  - A position is copied per tap.
  - The tap's linear `seen` search stays as it is (it is not observable). Any speed-up
    comes after parity, and is logged.
- **Oracle: `check-g5.cjs`, against `mechanics.js`, `hex/mechanics.js` and
  `game-engine.js` at 9e69e3a, on all 135 boards (spinners, both grids).**
  - From the start and from each plan prefix, every rope: `G.tap(b, paths, i)` gives
    null, or the paths, event, distance and route, field by field.
  - `G.solve` at budgets 40, 900 and 4,000; `G.replay(b, plan)`; `G.minimumTaps(b, plan,
    1200 and 5000)`; `G.frozenRopes`; `G.allFree`.
  - `repeatedCore` calls recorded with `capture.cjs`: ropes, stops, plan and draws.
  - **The hints through the real glue.** `test/g5.ents` exports the `gen` `guide` and
    `features`. Then `setup-harness.sh` with `test/g5.wasm` runs
    `assist.test.cjs --test-name-pattern=wasm`: 521 positions, 2,084 checks. Also run
    `encantis/solver/check.cjs` and `check-features.cjs`.
- **Measure:**
  - `t_solve(2000)` on L30, L60, L89 and L120 against MoonBit `bench_solve`;
  - the 2,084 assist checks timed against `dist/gen.wasm`.
- **About 4 to 5 hours.**
- **After G5's review** (DX-LOG, "review of G5"; commit 4f7de81 and the ones after it):
  - **`solve_full` keys a position by its ropes' path numbers.** G5 reserved (budget + 1) copies of
    the start's cells for the positions seen, before searching: at the game's auto-solve budget
    (app.js `seekPlan([], 5000)`, through `guide`) that passed the 16 MiB stack on C14 (40x40 with
    a spinner, a reference board), and on every 48x48 board with spinners already at 4,000.
    `check-g5.cjs` never asked for 5,000. Now each path a rope takes gets a number (a keys.ents
    map from the rope and its cells) and a position is n u32 words; the answers are the same, the
    peak on the 48x48 spinner boards at 5,000 is 7.5 MB, and the search is faster.
  - `oracle/check-g5-review.cjs` runs check-g5's battery on 440 boards of four fixtures (to
    48x48, 174 with spinners, both grids) with the auto-solve and the generator's minimumTaps;
    `hybrid-g5.cjs --fixtures` and `--codes` regenerate levels with G5's units on the port.
  - **For G6 and G7:** `tap`, `replay`, `frozen`, `minimum_taps` and `solve`'s moves are left in the
    caller's scope; a generator loop that calls them per candidate (addSpinners, the attempts)
    needs a scope per call, as G3's review said of the Hex kernels. `minimum_taps` holds every
    position it queues (not only the budget's): at 5,000 on L118 (40 ropes) 8.8 MB; the game calls
    it only on boards of at most 12 ropes (1,200) and on repeatedCore's two (20,000).

### G6: Measured play (about 4.0k tokens)

- **Ports:**
  - `metrics.mbt`:
    - `Snap`, with event -1 for "none";
    - `snapshot`;
    - `interaction`;
    - `graph_interaction`. Tarjan's `visit` becomes a top-level recursion over a
      context. Adjacency lists are built in two passes. `reach` is a k×k
      `[*]mut u8`. Nested `filter` and `any` become loops.
  - The measuring half of `gridgen.mbt`: `coverage`, `adjacent`, `valid`, `regional`,
    `trivial`, `features_used`, `FeatureStats`/`feature_stats`, `postpone`, `score`
    (which dispatches to the square or hex par search, or to `minimum_taps`),
    `casual_rate` (full-geometry playouts on spinner boards), `casual_measure`,
    `bench_casual` and `bench_par`.
- **Oracle: `check-g6.cjs`, against `grid-generator.js` and `dependency-metrics.js` at
  9e69e3a.**
  - **Direct exports, on all 135 boards with their plans:**
    - `F.coverage`, `F.valid`;
    - `F.featureStats(b, plan, par, G)`;
    - `F.score(b, G, false)`: par, plan, exact;
    - `F.casualRate(b, G, mulberry32(hashString('bench')), 100 and 1000)`, with draws;
    - `Q.analyze(b, plan, par, G)`.
  - **Recorded calls.** The internal functions, recorded during real generation with
    `capture.cjs`, *including the candidates the generator rejects*, so that the
    reject branches run. About 2,000 calls, sampled by a documented rule.
  - **Stored measurements.** The measurements of the 120 Journey levels
    (`grid-journey-measurements.json`: casualWins, work, challenge, coverage, slideStats,
    mechanicStats) computed by `t_measure` on the reference boards. This is
    `measurements-wasm.test`, at unit level.
- **Measure:** the kernel stage of `bench-node.mjs` on all 8 bench boards: casual ×100
  and ×1000, and par. Encantis and MoonBit wasm-gc are run interleaved.
- **About 4 hours.**

### G7: The generator, the API and full parity (about 4.4k tokens, plus the runs)

- **Ports:**
  - from `gridgen.mbt`:
    - `place_mirrors`;
    - `woven`: config, and dispatch to `hex_build` or `weave_run`. **Journey levels (and the
      parity runs against `reference.json`) call `set_draw_exact(true)` first; custom codes
      `set_draw_exact(false)`**, set per level since it is module state (G4's as-built and its
      review: with the departures 6 of the 60 Hex Journey levels cannot be generated with their
      seeds, and the other 54 lose the seed choice build-grid-journey.cjs made for them: their
      mean distance from the target challenge is 1.78, against 0.97 for the Journey's own levels
      and 1.64 to 1.72 for the JS on fresh seeds. In draw-exact mode all 120 levels are the JS's,
      every field);
    - `pt_key`;
    - `add_spinners` (keep the eager 16 + 8 candidates: REPORT §5.1), `ways_out`,
      `with_spinner`, `search_spinner`, `bounce_step`;
    - `grid_generate`: an attempt per scope, the best written as level words (§3.3),
      `rng_of` strings streamed.
  - `engine.generate` and `generate_spec`.
  - `core.ents`, with every export of §5.1.
- **Oracle, in order:**
  1. **Units.** `capture.cjs` records `placeMirrors`, `woven` and `addSpinners` (board
     and draws).
  2. **End to end.** `setup-harness.sh /home/user/mf-core-scratch/harness-enc core.wasm`,
     then:
     - `node --test --test-name-pattern=wasm` on `parity.test.cjs`,
       `generator.test.cjs`, `assist.test.cjs` and `measurements-wasm.test.cjs`;
     - `parity.mjs` with `reference.json`, field by field, plans and `exact` included:
       135 of 135.
  3. **Beyond the sample.** About 60 more custom codes, all sizes, both grids, mixed,
     colossal, difficulties 1 to 100. Dump them from the JS with a scratch copy of
     `dump-reference.cjs` given more cases (about 1 s each, minutes for the slow ones),
     then run `parity.mjs` on them.
  4. **Robustness:**
     - every export leaves the stack at its base;
     - a forced trap does not break the next call;
     - invalid codes give 0.
- **Measure, all under the lock:**
  - `oracle/wasm-reps.mjs`: 5 rounds of the Journey in one process, `core.wasm` and
    MoonBit `gen.wasm` interleaved. MoonBit's bar is 7.4 to 8.4 s for 120 levels.
  - `bench-node.mjs` in `harness-enc` and in `harness-moonbit`.
  - `custom-times.mjs`.
  - `browser-gen.mjs` in Chromium.
  - The stack peak per level, from `stack_peak()`.
  - wasm bytes and gzip, against `gen.wasm`'s 137,415 and 54,873.
  - Tokens of all `.ents` of the port, imports and types counted apart, against
    `src/core` + `src/gen` (37.6k).
  - `check` and `wasm` times for the whole program.
  - The DX summary, and `core/README.md` with the results and a verdict on both
    questions of the request.
- **About 5 to 6 hours.**

## 8. Order and parallelism

```
G1 ──┬── G2 (square, weave) ──┬──────────────── G5 (mech, assist, core rope) ── G6 (measured play) ──┐
     └── G3 (hex kernel) ─────┴── G4 (hex builder) ─────────────────────────────────────────────────┴── G7 (generator, API, parity)
```

- **G5 needs both kernels**, because it routes to them.
- **G4 needs G3**, for `hex_compile` in `intent`.
- **G6 needs G5**, and through it the kernels.
- **G7 needs everything.**
- **Up to three engineers can work at once:** G2 beside G3, then G4 beside G5 and then
  G6.

| Group | Engineer | Compiler commit | Status | Commit | Oracle result |
| --- | --- | --- | --- | --- | --- |
| G1 | Claude (port G1) | 03225bc (origin/main; the tree of cb3fc4f) | done | see the G1 commits of 18 Nov (`git log --grep 'core G1'`) | `check-g1.cjs`: 8 checks, 4.4M comparisons, 0 failed; `--js` passes; `--controls` 24 of 24 |
| G2 | Claude (port G2) | 03225bc (origin/main) | done | see the G2 commits of 18 Nov (`git log --grep 'core G2'`) | `check-g2.cjs`: 1,579 positions, 22,106 comparisons of 1.54M values, 0 failed; `--extra` (to 48x48) 275 positions, 0 failed; knots and styles 51,182 comparisons, 0 failed; `--js` passes; `--controls` 13 of 13; `check-weave.cjs` 249 cases, 0 mismatches on `test/weave.wasm` and `test/g2.wasm`; other seeds 4,980 and sizes 224, 0 mismatches |
| G3 | Claude (port G3) | 8f459f1 (origin/main, with #32 comptime values and #33) | done | see the G3 commits of 18 Nov (`git log --grep 'core G3'`) | `check-g3.cjs`: 1,352 positions, 16,224 comparisons of 2.24M values, 0 failed (in order and in reverse); geometry 41,175; `--extra` (to 48x48) 234 positions, 0 failed; `check-g3-wide.cjs` 2,112 positions on 550 synthetic boards, 48,589 comparisons of 2.63M values, 0 failed; `--js` passes; `--controls` 14 of 14 and 8 of 8; `--moonbit` 196, 0 failed; mutants 55 of 60 killed, 5 equivalent |
| G4 | Claude (port G4) | 8f459f1 (origin/main) | done | see the G4 commits of 19 Nov (`git log --grep 'core G4'`) | draw-exact mode: `check-hexbuild.cjs` 250 recorded builds, 4,000 comparisons, 0 failed (in order and in reverse), `--seeds 20` 5,250 builds, 0 failed, all 120 Journey levels regenerate through the JS generator (`hybrid.cjs`); default mode (departures D1, D2: the same law, a third fewer draws): `quality-hexbuild.cjs` 4,320 levels over 7 classes + a 480-level replicate, 0 invalid, every quality within the JS's own spread; 60 of 120 Journey levels differ (every Hex level; 6 cannot be generated with their seeds, so G7 generates the Journey in draw-exact mode); hex_build 3.31x MoonBit wasm-gc and 9.1x the JS over the fixture (2.73x and 7.4x draw-exact) |
| G5 | Claude (port G5) | 0c7737d (origin/main) | done | see the G5 commits of 19 Nov (`git log --grep 'core G5'`) | `check-g5.cjs`: 5,821 positions on all 135 boards (C13, C14 sampled), 93,527 comparisons of 3.86M values, 0 failed, first run, in order and in reverse (taps, direction, allFree routed and full, frozen, solve 40/900/4000 and no prefer, full solve, replay, guide, features, minimumTaps 1200/5000 on 128 boards); `--controls` 12 of 12; `--moonbit` 22,908, 0 failed; `check-core-rope.cjs` 282 recorded + 3,000 random calls, 0 failed; through the glue `assist.test` 521 positions, `solver/check` 3,369 and `check-features` 5,500 checks, 0 mismatches; `hybrid-g5.cjs` (the JS generator on the port's G.tap/replay/solve/minimumTaps/allFree/direction and repeatedCore) 135 of 135 levels the same; no departures, 0 of 120 Journey levels differ; solve 2000 1.9 to 3.4x MoonBit wasm-gc, the assist checks 1.73x. **Review** (399ca7e, 4f7de81 and after): the full search's reserve trapped at the game's auto-solve budget (5,000) on C14 and at 4,000 on every 48x48 spinner board; fixed (positions keyed by their ropes' path numbers), same answers; `check-g5-review.cjs` (check-g5's battery on 440 more boards, to 48x48, 174 with spinners, plus the auto-solve and the generator's minimumTaps): 18,070 positions, 291,464 comparisons, 0 failed (76 traps on the pre-fix wasm); `check-g5-budgets.cjs` 103,992, 0 failed; 60,000 more repeatedCore calls equal; 440 fixture, 300 new-seed and 135 reference levels regenerated through the port, all the same; solve 2000 2.8 to 4.4x MoonBit, the assist checks 2.1x; check-all passes |
| G6 | | | not started | | |
| G7 | | | not started | | |

Fill in your row when your group is done.

## 9. Planned language features against this port

These are the sites each would remove. The counts come from MAP-CORE; each group
confirms them with its tags.

| Feature | Removes | Tag |
| --- | --- | --- |
| Closures, even non-escaping | 42 local functions and their context structs or globals; about 70 lambda loops; the reset of builder globals by hand | `// closure:` |
| Run-time function values | nothing found: every function-valued use is a comparator (comptime today) or a closure called where it is made | `// fnvalue:` |
| Enums (`Option(T)`), and a `let … else` guard | about 35 struct options as `?*T` with nesting; 6 scalar sentinels; the tri-state `solved` | `// enum:` |
| Comptime values, `comptime n: u32` with `[n]T` | §10 | `// comptime-n:` |
| A trapping index | the unchecked tables (v2: 244 of 254 index operations) | `// unchecked:` |

## 10. Where `comptime n: u32` with `[n]T` would help: the containers first

The user asked about this. Comptime value parameters are not available yet
(reference §8.8: "`[n]T` … is a syntax error"). (G3's note: they landed on origin/main in 8f459f1, #32, with
`FixedVec(n, T)`, `Ring(n, T)` and a bitset in its `lib/`; a static arena per `n` works,
probe `p2` in the DX-LOG's G3 section.) The port does not wait for them. Instead
it marks where they would help, so that the gain can be counted, and later measured,
when they land. Probes p4 and p5 **[ran]** settle how small lists work today:

- A fixed array held by value cannot be indexed at run time:
  `dynamic index on value type [6]i32 — use a pointer or slice for dynamic access`.
  So a small list cannot live in registers, and `comptime n` alone would not put it
  there.
- A `*mut [6]i32` in memory, indexed by `k % 6`, is proven in range with no fallback.
  So a fixed-capacity list with its bound in its type works today, but only by writing
  the size out.

Where `comptime n` would help, in order of value to this port:

1. **The stack: `Stack(comptime n: u32)`.**
   - Today `lib/stack` is copied to change 256 KiB to 16 MiB (G1).
   - With the size as a parameter, the core could also have a second arena, a keep
     region that the scopes of the search do not reset, without copying the file again.
   - That arena is what the `// reserve:` hazard (§3.2) wants: lists that outlive an
     inner scope would grow in the arena instead of being reserved up front.
2. **Fixed-capacity lists: `Fixed(T, comptime n)`, an `*mut [n]T` plus a length.**
   - Every index is proven by its range (`u32#n`), with no `??`.
   - Sites:
     - `choices` and `dirs` in `hex_build` (6 each; `shape` is 13% of self time);
     - weave's `opts` and `ties` (4);
     - `regional`'s quadrants (4);
     - the two-element loops.
   - Today each size is written out by hand (`*mut [6]i32`).
3. **One grid kernel generic over `comptime D: u32` (4 or 6), with `[D]i32` direction
   rows and neighbour rows.**
   - This replaces the `sq_dx`/`hex_dq` twins.
   - The searches stay apart either way (§7, G3).
4. **Not the boards.** Every board-sized table is sized at run time, so `Vec` and
   `[*]mut T` stay.

Each group logs its `// comptime-n:` count, and G7 totals them. When the feature lands,
items 1 and 2 are each a one-file change: `lib/stack` and a `Fixed` in `board.ents`.
The time and size of the hex builder before and after are the measurement to take.

## 11. Risks

| Risk | Mitigation |
| --- | --- |
| A container grows inside an inner scope and dangles, silently | Reserve and assert (§3.2), `// reserve:` tags. `keys.ents` never grows. Every oracle also runs in reverse order and on a fresh instance |
| Draw order differs (short-circuits, eager evaluation, sort ties) | Every unit oracle counts draws. `random.ents` can trace the bound of every draw. Compare against a JS trace taken through `ref.cjs`'s counting `mulberry32`, to find the first divergent draw |
| The stack overflows on colossal maps | 16 MiB to start, `peak()`, and the 40×40 and 32×32 cases in the oracles of G2, G4 and G7 |
| The hex builder's speed (50% of generation) | Port it as it is first. Measure the call alone against MoonBit (G4). Optimise only after parity, with the oracle watching |
| The compiler moves under the port | Pin, rebuild, `check-all.sh` (rule 3) |
| `&`/`as` precedence makes a wrong view, silently (`bugs/01`) | One view helper in `abi.ents` |
| Restated types and imports drift | The canonical block, copied as it is. An import's written signature is documentation: calls are checked against what the module really exports (reference §7.1), so a stale restatement misleads the reader, not the build. Count restatements, and keep public surfaces narrow |
| Two engineers on one branch | Separate files per group. Appends only to `DX-LOG.md` and `build.sh`. Merge, never rebase |

## 12. Probes run for this plan

All are in `/home/user/mf-core-scratch/plan-probes/`, at cb3fc4f:

| Probe | Shows |
| --- | --- |
| p1 | `Rng` behind `*mut Rng` with method calls (`r.below(n)`) gives the JS's first draw. The f64 bits by punning (`scratch.f64[0] = x; scratch.u32[1]`) gives `0x3ff80000` for 1.5. 226 bytes, no imports |
| p2 | Zero-copy `[]Pt` and `[]Mirror` views over the ABI words give the right sum, once written `(&base[k]) as [*]Pt` |
| p2 as first written, and p6 | `&base[k] as [*]Pt` compiles and reads the word's value as an address (`bugs/01`). `&base[1] as u32` is an error, so the mistake is silent only for a cast to a pointer |
| p4 | `dynamic index on value type [6]i32 — use a pointer or slice for dynamic access` |
| p5 | `*[6]i32` indexed by `k % 6`, proven, no fallback |
| builder-v2 at cb3fc4f | `weave.ents` as of dbebdcc rebuilds to the committed 18,384 bytes, byte for byte. `check-weave.cjs`: 249 cases, 0 mismatches (not timed under the lock). builder-v2's review revised it after this plan was written (721f6a3: `[k]` for a knot's trial, one `f64()` per division; 18,385 bytes). G2 takes builder-v2 as it stands then, and records its commit |
