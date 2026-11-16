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
