# The woven builder in Encantis

A port of the game's hardest kind of code, a board builder, to Encantis 0.2.1,
to find out what hurts and what works. The builder is `weave(rng, cfg)`: the
square woven builder of `levels.js` at 9e69e3a, which the game now runs as
`src/core/weave.mbt`. It builds a sliding level backwards from the solved
board. In MoonBit it is one function with 25 closures over shared state, on top
of growable arrays, arrays of arrays, optional values and a stable sort.

**The port is exact, 2.4x as fast as the JS, and the same size as the MoonBit.
What hurt most was the compiler, not the language: 15 problems, 5 of them
silent miscompiles.**

## Results

`node moonbit/encantis/builder/check-weave.cjs`, built with Encantis 0.2.1:

| | Result |
| --- | --- |
| The fixture: 249 cases from the real generator (16 give up), in order and in reverse | 0 mismatches: every rope cell for cell, taps, knots, traps, and the number of rng draws |
| 20 other seeds for each case's cfg, against the JS | 4,980 runs, 0 mismatches |
| Board sizes outside the fixture, 1x8 to 80x80, against the JS | 224 runs, 0 mismatches |
| Time for the 249 cases (Node, the call alone, best of 5) | Encantis 327 ms, JS 782 ms: 2.4x |
| ... boards up to 12x16 / 24x24 / 40x40 | 2.2x / 1.9x / 3.2x |
| ... first run of each case | Encantis about 350 ms, JS 850 to 940 ms |
| wasm | 18.0 KB, no GC |
| Peak of the 16 MB bump stack | 75 KB up to 12x16, 226 KB at 24x24, 605 KB at 40x40 |
| Source size (`node size.cjs`, tokens without comments and tests) | 11,802 against MoonBit's 11,030: 1.07x. Without the import declarations, 0.99x |
| Inline tests (`encantis test`) | 13, in the four files |

- **Speed** is without an optimizer. `encantis wasm -O` (wasm-opt) gives 292 ms
  and 33 KB; it also matches. The MoonBit build was not timed here: it exports
  the whole generator, not `weave`.
- **Size.** The Encantis side includes what MoonBit keeps elsewhere (reading
  the input words, writing the result, the draw trace). The MoonBit side
  includes its config and result types.

## Files

| File | What it is |
| --- | --- |
| `weave.ents` | The builder: shaping ropes, candidates, knots and traps, laying and packing, the core, the finished level. The exports of the contract |
| `board.ents` | The board it plays on: tracks and mirrors, `place`, `slide_to`, `relax`, and the replay of intentions (`tap`, `replay`, `trial`). Loops (Tarjan) |
| `rng.ents` | mulberry32, `below`, `chance`, and the trace of draws |
| `ints.ents` | Lists of i32 on the bump stack: `begin`, `push`, `since`, `ints`, `span`, `contains` |
| `weave.wasm` | Built from the above and `../stack/stack.ents` |
| `NOTES.md` | The log: every awkward place, with counts |
| `bugs/` | A minimal file for each compiler bug met, with how to see it in its header |
| `size.cjs` | The source size comparison |
| `check-weave.cjs`, `dump-weave.cjs`, `weave-expected.json` | The oracle (stage 1): the harness, the fixture's generator, the fixture |

## Build and check

With the Encantis 0.2.1 release binary:

```
encantis wasm moonbit/encantis/builder/weave.ents -o moonbit/encantis/builder/weave.wasm
node moonbit/encantis/builder/check-weave.cjs
for f in ints rng board weave; do encantis test moonbit/encantis/builder/$f.ents; done
```

The build takes about 15 s, nearly all of it for the 16 MB zero buffer of the
stack (`bugs/15`). The header of `check-weave.cjs` is the contract for the
buffers.

## How it is written

- **Shared state is module globals**, set up again by every call: 32 in
  `weave.ents` for the locals of the JS `weave()`, 28 in `board.ents` for the
  board. The 25 closures are top-level functions.
- **Memory is the bump stack, in three scopes**, each freed by `defer`:
  - the call: the board's tables and the ropes' tracks;
  - a step: what `survey()` finds, the places for a knot or trap;
  - a try: one candidate, with its lanes, its cells and its trial on the board.
- **Lists are `[]i32`**, built in place at the top of the stack or in room taken
  first. Arrays of lists are `[*]mut []i32`.
- **A candidate is a struct value in registers** (`Cand`, 16 wasm values). The
  one a step chooses is copied to buffers that last for the call (`keep`), so
  that it outlives the scope it was tried in.
- **`commit()` asserts that only the call's scope is open**, because the track
  it adds must not be freed by a step or a try.
- **Optional values are structs with an `ok` field.**

Like the MoonBit port, it leaves out what the generator never asks for:
`ropeCount`, trimming and turning the board, and the fallback for a missing
`tapDepth`. A way out that loops traps (an `assert`), where the JS throws.

## Findings, ranked

### What hurt

1. **Silent miscompiles in ordinary expressions.** `abs(a - b)` loses its `abs`.
   Integer `max` evaluates its arguments twice. Arithmetic on the right of a
   comparison is compiled with the wrong type (`a < b / c` divides unsigned).
   A whole struct stored to memory goes to a wrong address. All three of the
   first were in the port as first written. The oracle would have caught them;
   without one they would have been wrong boards. After that I read the WAT of
   every `min`, `max`, `abs` and comparison.
2. **Structs cannot live in memory as values.** Storing, loading, a field
   through `*T`, and a slice inside a nested struct are all broken (4 bugs).
   Arrays of structs are written and read field by field, through two helpers
   per struct type.
3. **Lifetimes on the bump stack are decided by hand.** The chosen candidate
   must outlive its try; a track must outlive every scope but the call's; a list
   that ropes are committed under must be allocated before the first rope. That
   took `keep`, two functions that exist only to close a scope (there is no
   bare block), and six capacity bounds worked out from the algorithm, with no
   bounds check behind them. No bug came of it, with asserts watching.
4. **Lists that grow in turns.** Only one list can grow at the top of the stack.
   4 places needed room taken in advance or a counting pass; `knot_spots`
   reserves 3 x 4 x area spots for the worst case.
5. **Signed and unsigned.** Loop variables and lengths are u32, everything
   stored is i32: 52 `as i32` and 14 `as u32`, none of them interesting. Indexing
   a slice of i32 is only practical as `xs.ptr[i]`, unchecked (15 sites).
6. **No closures: cheap here, with a standing cost.** No closure of `weave` is
   passed as a value, so globals and top-level functions did it in about the
   same number of lines. The cost is that each global is reset by hand, the
   module is not reentrant, and a function's signature hides what it touches.
   The one comparator became a hand-written sort; 6 lambdas became loops.
7. **Function-scoped names.** `let x` in two sibling blocks is an error; a `for`
   variable silently takes over an earlier `let` of the same name.
8. **Optional values by convention:** an `ok` field, 33 `no_...()` returns, and
   nothing to stop reading a value that is not there.
9. **The toolchain around the bugs.** The checker passes code that then fails
   to build (8 bugs), reported with the WAT's line under the source file's
   name. Every build waits 15 s on a zero buffer. Imports restate each
   signature (70 lines) and the restatement is not checked.

### What worked

1. **Exactness for free.** Wrapping u32, explicit conversions and plain f64 gave
   the JS's numbers at once: the first build that validated matched all 249
   cases, draws included.
2. **`defer` with scopes.** 14 scopes and 75 early exits, no leak, and no
   thought spent on the ways out of a function.
3. **Struct values in registers**, slices included, as arguments and results.
   They carried the whole "candidate" vocabulary of the builder with no
   allocation.
4. **Slices and element loops** for reading lists and lists of lists; the
   `when` suffix on `return`, `break` and `continue`.
5. **Modules with shared globals and inline tests**, which let the board be
   built and tested before the builder.
6. **One element type.** Every list holds i32, so the lack of generics cost
   nothing for lists. It would cost for the two struct lists (`Spot`, `Option`)
   and for a sort.
7. **The result:** small, fast wasm with no GC, and a stack that peaks at
   605 KB on the largest board.

`NOTES.md` has each of these with what I wanted to write, what I had to write,
and the counts.

## Verification (stage 3)

An independent check of everything above, made on 2026-11-16 with the 0.2.1
binary. Nothing was taken from the report without running it again.

**The port is what it says it is. The build reproduces byte for byte and gives
the reference JS's board in every one of about 20,000 runs. The report's
numbers hold, with small corrections. It leaves out four things that matter to
the decision:**

- **Almost no array access in the port is checked** (295 of 305), where MoonBit
  checks every one.
- **Against the MoonBit build the game ships, the speed gain is 1.17x**, not the
  2.4x measured against the JS.
- **A trap leaves the module unusable**: `defer` does not run, so the stack is
  never given back.
- **The language already has `if` expressions**, `match` and multi-value
  `set`, which the port does not use.

### What was run again

| Check | Result |
| --- | --- |
| Rebuild `weave.ents` from source | 17,950 bytes, identical to the committed `weave.wasm`. `ints`, `rng` and `board` also build on their own |
| `check-weave.cjs` on the rebuilt wasm | 249 cases (16 null), in order and in reverse: 0 mismatches |
| Inline tests | 13 pass (ints 1, rng 2, board 5, weave 5), and the 2 of `stack.ents` |
| Does the harness compare every output? | A copy of the fixture corrupted in 12 ways (a cell, the first cell, two ropes swapped, a rope dropped, a tap, a tap missing, knots, traps, the draws of a board, the draws of a null, a board made null, the last case). Each one fails with exit 1 and names the case |
| Does the fixture regenerate? | `dump-weave.cjs --verify`: up to date |
| A second harness that shares no code with the first | The fixture against the stored results and against a fresh JS run; in order, in reverse, and on a fresh instance per case; the output buffer poisoned before each call. 996 runs, 0 mismatches |
| 20 other seeds for each case | 4,962 runs, 0 mismatches. The porter's script: 4,980 runs, 0 |
| Random cfgs: 1x1 to 40x40, rope lengths, knots, traps, mirrors, cores | 9,000 runs (1,361 null), 0 mismatches. The porter's sizes script: 224 runs, 0 |
| Peak of the bump stack | 75,040 / 225,580 / 605,360 bytes for boards up to 12x16 / 24x24 / 40x40, as reported. After each of the 249 calls the top is back where it began |
| How sharp is the oracle? 85 small changes to the port, each rebuilt and run | The fixture catches 61. Other seeds and random cfgs catch 7 more. I read the other 17: 15 cannot change a result inside the contract, and 2 need an exact tie between two doubles |

**The fixture alone is not enough.** The 7 changes it misses include an
unstable sort in `survey` (1 run in 1,242 on other seeds shows it), a
`tapDepth` of exactly 2.0, and a board 5 wide near the coverage limit. Keep the
seed run beside it, or add those cases.

### Wasm features

Two beyond the MVP. Found with wabt's `wasm-validate`, switching each feature
off in turn, and by reading the disassembly.

- **Multi-value.** 23 of the 40 function types return 2 to 16 values: structs
  and slices in registers. No block has a multi-value type.
- **Bulk memory.** One `memory.fill`, in `alloc_words` of `stack.ents`, which
  the builder never calls. (A range fill with a runtime value compiles to a
  loop.) The module needs bulk memory only because unused functions are kept.

Nothing else: no sign extension, saturating conversion, reference types,
tables, SIMD, exported globals or memory growth. Memory is 263 pages and never
grows. `below` uses `i32.trunc_f64_s`, which traps on overflow. With `-O` the
`memory.fill` goes, but wasm-opt writes a DataCount section, which is also
part of bulk memory.

The file also carries 3 functions and 172 bytes of data that only the inline
tests use.

### Size

My own counter: comments stripped; a token is a name, a number, a string or
one punctuation character; a line is a line with code on it. Tests are left out
on both sides.

| | Lines | Tokens |
| --- | ---: | ---: |
| MoonBit: `weave.mbt` without `knots_wanted` and the styles | 1,156 | 8,066 |
| MoonBit: 30 declarations of `square.mbt` (mirrors, `ray_cells`, `self_blocked`, `SqBoard` and its methods, `sq_board`, `sq_play`, `bends_of`, the loop finder) | 425 | 2,970 |
| MoonBit: 12 of `random.mbt` (`Rng`, `mulberry32`, `next`, `below`, `ssort`, `imin`, `imax`, `dmax`, `contains`, `unique` ...) and 5 of `types.mbt` | 83 | 572 |
| **MoonBit total** | **1,664** | **11,608** |
| Encantis: `weave.ents` 7,922, `board.ents` 2,773, `ints.ents` 444, `rng.ents` 239 | 1,527 | 11,378 |
| Encantis: the import declarations | 84 | 875 |
| **Encantis total** | **1,611** | **12,253** |

**1.06x the tokens and 0.97x the lines; 0.98x the tokens without the imports.**
That agrees with `size.cjs` (1.07x, counting `==` as one token). The MoonBit
list is what a reachability scan from `weave` and `finished` finds, plus the
three constructors their caller needs.

Two choices of the port move the count, and neither is about the language:

- **Paths are lists of cells, not points.** `xy`, `to_path` and `dir_index`
  have no counterpart, and `way_out` with `ray` is 0.55x its MoonBit.
- **`finished` reuses the replay board.** The JS and MoonBit build a second
  board from the paths. That is 737 MoonBit tokens (`sq_board`, `sq_board_exn`,
  `sq_play`, `SqBoard::paths`, `some_paths`, `all_gone`) with nothing on the
  Encantis side.

Against that, Encantis counts about 570 tokens of reading the input buffer,
writing the output and tracing draws, which MoonBit does not have. The two
roughly cancel. Function by function, Encantis is larger where it manages
lists by hand: `survey` 1.66x, `commit` with `keep` and `note_order` 1.62x,
`mark_below` 1.54x, `knot_spots` with its two helpers 1.23x.

Wasm: 17,950 bytes (7,601 gzipped). With `-O`: 33,473 (8,327). MoonBit's
wasm-gc build of the same builder behind a thin wrapper: 39,006 (16,335).

### Speed

Node 22 on a 4-core Xeon. The clock is round the call alone, over the 249
cases. Each figure is the median of 4 processes, each the median of 10 rounds
after 2 warm-up rounds. Within a process the spread is about 3% (sd 9 to 12 ms
for Encantis, 23 to 33 ms for the JS). MoonBit is `src/core` unchanged behind a
scratch wrapper with the same word interface; it also matches the fixture.

| | 249 cases | Per board | Time against Encantis |
| --- | ---: | ---: | ---: |
| Encantis wasm | 328 ms (325 to 331) | 1.32 ms | |
| Encantis wasm, `-O` | 287 ms | 1.15 ms | 0.88x |
| MoonBit wasm-gc (what the game ships) | 383 ms (377 to 396) | 1.54 ms | 1.17x |
| MoonBit JS backend | 672 ms | 2.70 ms | 2.05x |
| Reference JS | 773 ms (760 to 814) | 3.10 ms | 2.36x |

- **By board size**, Encantis / MoonBit wasm-gc / JS: up to 12x16 185 / 218 /
  414 ms; 24x24 66 / 78 / 125 ms; the 40x40 case 75 / 83 / 236 ms.
- **First round of a process:** Encantis 360 to 385 ms, MoonBit wasm-gc 420 to
  435 ms, JS 855 to 965 ms.
- An earlier batch on a busier machine gave 330 / 382 / 753 ms. So the JS
  ratio is 2.3x, give or take 0.1.

### The reported findings, checked

All nine pain points are real. The counts are right except where noted.

| # | Finding | What the code shows |
| ---: | --- | --- |
| 1 | Silent miscompiles | The three workarounds are at `weave.ents:800`, `:1020`, `:1036`. The WAT has 9 `select`s, all with operands free of side effects and signed compares; 35 signed divisions and remainders and 1 unsigned (`since`, rightly); no division on the right of a comparison. Clean now. The cost is the risk |
| 2 | Structs cannot live in memory | `put_spot` and `spot_at` (`weave.ents:736`, `:744`), `Option` (`:230`): about 20 lines. Understated, see below |
| 3 | Lifetimes by hand | `keep` (`:411`), `spot_try` (`:937`), `gap_rope` (`:1076`), `spare` (`:1352`), `core_fits` (`:1172`); 14 `defer reset`; 7 asserts. The two functions were not forced: `if true { defer ... }` works as a bare block |
| 4 | Lists that grow in turns | 4 places. `knot_spots` reserves 384,000 bytes at 40x40: 63% of the peak |
| 5 | Signed against unsigned | 52 `as i32` (26 on `.len`, 26 on loop variables) and 14 `as u32` in the two files; 23 `as u32` with `ints.ents` and `rng.ents` |
| 6 | No closures | 32 + 28 globals, 52 + 18 functions. None of the 25 closures escapes. Cheap, as reported |
| 7 | Function-scoped names | bugs/11 reproduces. A sibling `let` is rejected |
| 8 | Optionals by convention | 5 `ok` fields (4 types and `aimed`), 4 constructors, 16 `.ok` reads. `no_...()` is used 33 times, 26 of them returns |
| 9 | Toolchain | 8 bugs pass `check` and fail the build. 70 restated import signatures: 84 lines, 875 tokens, 7% of the port. The checker ignores the restated types without a word (I imported a function with the wrong types and arity). A build is 15.7 s, 1.7 s with a 1 MB stack. But `check` is not slow: 0.7 s |

Of what worked: 14 scopes and 75 `when` exits, no leak; `Cand` as 16 values;
all as reported. Element loops are 38 of the 74 `for` loops in the two files,
not 25.

### What the report missed

1. **Nothing is bounds-checked.** Of 305 index operations in the four files,
   270 go through a many-pointer, 12 through `.ptr`, 10 through a type-punned
   buffer and 3 are range fills. 10 are checked, at compile time (`dir_x[d]`).
   The report counts the 15 `.ptr[i]` reads; the tables are the larger part.
   30 of the 60 globals are tables held as `[*]mut i32` with no length,
   because a slice cannot be a global (bugs/08). MoonBit traps on every one
   of these. Here a wrong capacity overwrites the next table, and the report
   counts 24 lists sized by hand. Outside the contract it already shows: with
   `minLen` 1 the JS throws in 282 of 300 runs; the wasm trapped in 280 of
   them and returned quietly in 2.
2. **Against MoonBit the gain is 1.17x.** See Speed. The report timed only the
   JS.
3. **A trap leaks the stack.** `defer` does not run when an assert traps, and
   `weave` resets to the mark it took, not to the base. After 21 calls that
   trap on a 100x100 board, a valid 4x4 board traps too. After one stack
   overflow, every call does. The harness works round it with a fresh instance.
   Resetting to the base on entry would fix it.
4. **A loop over a negative count runs four thousand million times.** `for i in
   n` compares unsigned, whatever the type of `n` (bugs/20). The two files have
   26 loops over an i32 count; two counts come straight from the input.
   MoonBit's loop runs zero times.
5. **`f64(n)` was not a choice.** The reference says i32 widens to f64. The
   checker accepts `r * n` and the build fails (bugs/16). The 17 conversions
   in `weave.ents` are a workaround.
6. **Idioms the port did not use**, each tried on 0.2.1:
   - **`if` expressions.** 15 places declare a default and then assign in an
     `if` (`row`, `kind`, `long`, `landing`, `reaching` in `best_rope`; `to`,
     `want`, `end` in `tap`). Rewritten in a scratch copy, the port is 53 lines
     shorter with the same tokens, and still matches the fixture. 5 of the 15
     need parentheses round the first branch (bugs/19).
   - **`set (dx, dy) = turn(s, dx, dy)`** works, so the 8 lines that turn a
     head at a mirror need not be written twice (`board.ents:154`, `:186`).
   - **`match`** on an integer works.
7. **The struct fault is wider than bugs 4 to 7.** The same missing load and
   store also breaks `p.* = Spot(...)` (silently, bugs/17), `let s = p.*`,
   `for s in list` over a `[]Spot` (bugs/18), and a struct global. So the
   element loop is not there for the two struct lists.

### Compiler bugs

All 15 reproduce from their files with 0.2.1, as described. One correction:
bugs/15 slows `compile`, `wasm` and `test`, not `check`.

Five more, each with a file:

| # | File | What happens |
| ---: | --- | --- |
| 16 | `16-implicit-widening-in-arithmetic.ents` | `f64 * i32` passes the checker and is invalid wasm |
| 17 | `17-struct-store-through-pointer.ents` | `p.* = Spot(...)` writes nothing. Silent |
| 18 | `18-element-loop-over-structs.ents` | `for s in list` over a slice of structs is invalid wasm |
| 19 | `19-if-expression-first-branch.ents` | `let v = if c { p - l } else { -1 }` is typed `()` and rejected. Parentheses fix it |
| 20 | `20-for-over-negative-count.ents` | `for i in n` with a negative i32 count runs until it wraps. Silent |

### What to add to Encantis, in order

Each line gives the evidence in this port and what it would remove.

1. **Correct code for ordinary expressions, and a `check` that builds.** Bugs
   1, 2 and 3 are silent, and all three were in the port as first written; 16
   and 19 are loud. Removes 3 workarounds, 17 conversions and the reading of
   WAT. If `check` validated the wasm, 10 of the 20 bugs would show at once.
2. **Structs and slices as values in memory and in globals.** Bugs 4 to 9, 13,
   17, 18: one missing piece, the load and store of a value wider than one
   word. Removes `put_spot`, `spot_at`, the second copy of `Lane`, 5 slices
   taken into a local first, and `order` / `norder` (7 uses): about 30 lines.
   More important, the 30 table globals can become slices, which makes item 3
   possible, and state can sit in one struct behind a pointer.
3. **Indexing a slice that traps when out of range.** Today the only checked
   forms want a fallback value (`??`, `if let`), so every read uses the
   unchecked pointer. With item 2 this puts a check on about 295 accesses and
   turns a wrong capacity into a trap. No lines saved; the largest risk
   removed. Keep `[*]T` as the way to opt out.
4. **A list that knows its capacity.** A slice of `(ptr, len, cap)` whose
   `push` traps when full. Some two dozen lists are a pointer and a count in a
   local, with 22 `span(p, n)` calls to pair them; 14 more are built with
   `begin`, `push` and `since`, a rule nothing enforces. Removes about 50
   lines. It does not settle lists that grow in turns (4 places): those need
   room reserved, or a second stack.
5. **Imports by name.** Take the signature from the module. Removes 84 lines
   and 875 tokens, all of the size gap to MoonBit, and text that can be wrong
   unnoticed.
6. **Optional values of any type**, or the enums of the reference (2.9, parsed
   only). Removes 5 `ok` fields, 4 constructors and 33 `no_...()`; 16 `.ok`
   reads become `if let`. About 15 lines, and reading a value that is not
   there stops compiling.
7. **A loop variable with the type of its count.** An i32 count gives an i32
   variable, compared signed. Removes the 26 casts on loop variables and the
   26 loops that go wrong below zero. A signed length would remove the other
   26 casts.
8. **Block scope for names, and a bare block.** Removes bugs/11, about a dozen
   renamed variables, and two functions or two `if true`.
9. **Function values that can be called (bugs/10), then generics.** In this
   port: one sort, 9 lines. Generics would pay for writing item 4 and a sort
   once in a library; the port itself would use them at three types (i32,
   `Spot`, `Option`).
10. **Closures: last.** None of the 25 escapes, and globals did the work at the
    same size. The 6 lambdas cost about 15 lines. What globals cost (a reset
    by hand, no reentrancy, signatures that hide what they touch) is better
    answered by a context struct behind a pointer, which item 2 allows.
11. **Nothing for multi-value returns.** They already work: 9 functions return
    lists and `Cand` travels as 16 values, with no allocation.
12. **Toolchain.** Drop unused functions and test data from `wasm` output
    (4 functions, 172 bytes, and the one reason for bulk memory). Make a zero
    buffer cost nothing to compile (15.7 s against 1.7 s). Give WAT errors
    their source line. Say in the reference that a trap skips `defer`.
