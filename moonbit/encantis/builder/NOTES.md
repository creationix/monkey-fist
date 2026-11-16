# Notes from porting `weave` to Encantis 0.2.1

A log of every place the language made the port awkward: what I wanted to write,
what I had to write, and how often. Counts are sites in `weave.ents` and
`board.ents` with their tests left out, unless a line says otherwise. Each
compiler bug has a minimal file in `bugs/`.

## How it went

1. Read the reference and probed the compiler with small files (structs in
   memory, slices, function pointers, imports, scoping). Most of the bugs below
   turned up here, before any of the port was written.
2. `ints.ents`, `rng.ents`, `board.ents`, each with inline tests: 8 tests, all
   passing on the first run.
3. `weave.ents`: the checker's one complaint was a missing `export`. The first
   build did not validate (bug 3 below, in its f64 form). Looking for its cause
   in the WAT, I found two silent miscompiles next to it (bugs 1 and 2).
4. The first build that validated passed all 249 cases, in order and in reverse,
   draws included. Another 4,980 runs (20 more seeds per case) and 224 runs on
   board sizes from 1x8 to 80x80 also match the JS.

So the oracle found nothing wrong in the port's logic. Everything below is
about what it took to write it.

## 1. Closures over mutable state

MoonBit's `weave` is one function with 25 local functions. Between them they
share about 30 names of the enclosing function: 10 `let mut` scalars and lists,
8 arrays, and the constants (`cfg`, `rng`, `w`, `h`, ...).

**What I wrote.** The shared names are module globals and the closures are
top-level functions.

| | |
| --- | ---: |
| Globals in `weave.ents` (cfg 10, build state 11, survey 4, marks 2, kept choice 4, `settled` 1) | 32 |
| Globals in `board.ents` (the JS's `ib` and `b` objects, and the geometry) | 28 |
| Functions in `weave.ents` | 52 |
| Lines that set the globals up again for each call (`start_build`, the top of `weave`, `new_board`) | about 60 |

**Cost in lines:** small. A global declaration and its reset replace a `let mut`.
`xy`, `blocked`, `dir_index`, `trial` and `to_path` disappeared (paths are lists
of cells here, not points).

**Cost in clarity:**
- A function's signature no longer says what it touches. `knot(spot)` also
  reads `pull`, `total0`, `order`, the grid, and the three tables `survey()`
  left behind.
- Every global has to be reset by hand at the start of a call. Forgetting one
  gives a module that works the first time. The harness's reverse pass is the
  only thing that checks it.
- The module is not reentrant.
- `ahead`, `blk` and `lanes` point into a step's scope, and dangle between steps.

None of the 25 closures is ever passed as a value, which is why this worked.
Where the JS does pass functions, it hurt:
- **A comparator.** `order.slice().sort((x, y) => cost[y] - cost[x])` became a
  hand-written stable insertion sort in `survey()` (9 lines). A function passed
  as an argument cannot be called at all (bug 10).
- **Lambdas in `filter`, `some`, `map`, `makei`:** 6 sites, each an explicit
  loop or a small named function (`any_tied`, `reaches_idle_mirror`,
  `parent_weight` called twice in place of a mapped array).

## 2. Growable arrays, and arrays of arrays

Every list in the builder holds i32 (cells, rope ids, directions), so one set of
helpers in `ints.ents` served all of them, and no generics were missed for
lists. A list travels as `[]i32`.

**Built in place** (`begin()`, `push(v)` ..., `since(start)`): 13 lists, where
the length is not known until the end (a track, a way out, the ropes in it).
This is pleasant, with one rule: nothing else may be allocated until the list is
finished.

**With a capacity** (`ints(n)` and a count in a local): 24 lists. `span(p, n)`
then makes the slice (22 sites). Each capacity is a bound I derived by hand
(see 9).

**Lists that grow in turns** cannot both be built in place. It came up 4 times:

| Where | What I wanted | What I wrote |
| --- | --- | --- |
| `grow`, `walk` | `opts.push(d)` inside the loop that grows `cells` | room for 4 options and for `want` cells, taken first |
| `survey`, per rope | `free.push(c)` or `ids.push(o)` per cell of the way out | `free` gets room for the whole way out; `ids` is pushed on top |
| `survey`, `lanes[cell].push(i)` | one push per crossing | count the crossings per cell, give each list its room, fill with `lanes[c].len += 1` |
| `knot_spots` | `tight.push`, `chain.push`, `gapped.push` | three arrays with room for every cell and direction: 3 x 4 x area x 20 bytes (384 KB at 40x40), freed with the step |

**Arrays of arrays** are `[*]mut []i32`: `seq`, `stops`, `ahead`, `blk`, `lanes`.
Reading them is as good as in MoonBit (`for id in lanes[cell]`). Two things got
in the way:
- `lists[k] = make()` crashes the compiler (bug 9): 5 sites take the slice into
  a local first.
- A slice cannot be a global (bug 8). `order` is a pointer global and a length
  global, paired by `order_list()` at 6 sites.

**Indexing a slice.** `xs[i]` on a `[]i32` must be resolved with `??` or
`if let`, which is no use for a list I know the length of. Every indexed read
goes through the unchecked pointer: `xs.ptr[i]` (15 sites). So slices gave me
the length and the element loop, and no bounds checks.

## 3. Maps and sets

Nothing hurt, because nothing needed hashing. Every Map and Set of the JS is
keyed by a cell or a rope, and MoonBit had already made them arrays:

| JS | Here |
| --- | --- |
| `mirrors` (Map, walked in insertion order) | `slope[cell]` and `mirror_at[k]` |
| `mirrorUsed` (Set, and its size) | `mirror_used[cell]` and a counter |
| `occupied` (Set) | flags, in a scope of their own (`core_fits`) |
| `[...new Set(ib.taps)]` | `note_order()`: a linear `contains`, as the JS's `includes` |
| `new Set(out.slice(start))` in `rayCells` | stamps per cell |

## 4. Sorts with comparators

One sort decides anything (`survey`). It is written out in place, because a
generic sort needs a callable comparator or generics, and Encantis has neither.
See 1.

## 5. Option values

MoonBit returns `Lane?`, `Shaped?`, `Cand?`, `(Int32, Int32)?` and
`(Array, Array)?`. Encantis has optionals only for pointers and slices.

**What I wrote.** An `ok: bool` field in 4 struct types (`Lane`, `Shaped`,
`Cand`, `Walked`) and a named `ok` result in `aimed()`; 4 constructors for the
empty value (`no_cand()` ...), used 33 times; 16 reads of `.ok`.

- **Lines:** about the same. `return no_cand() when !lane.ok` is one line where
  MoonBit has a 3-line `guard ... else`.
- **Clarity:** worse in one way. Nothing stops code from reading `c.path` of a
  candidate that is not ok. It never happened, but only by care.
- `-1` stands for "none" wherever the JS used it (`parent`, `start`, `against`).

## 6. Struct values, arrays of structs, structs with array fields

**In locals and as results: good.** `Cand` is 16 wasm values (three slices, a
nested `Lane`, five numbers). It is passed, returned and reassigned by value,
with no allocation and no surprises. This is what made `Option`-like returns and
`keep()` cheap to write.

**In memory: field by field only.** Four bugs (4, 5, 6, 7):

| What I wanted | What happens | What I wrote |
| --- | --- | --- |
| `tight[n] = Spot(c, d, room, against, 0)` | stores one field at a wrong address, silently | `put_spot(tight, n, ...)`: 5 field stores |
| `let spot = list[k]` | invalid wasm | `spot_at(list, k)`: `Spot(list.ptr[k].c, ...)` |
| `func f(p: *mut Spot) { p.c = 5 }` | undefined local in the WAT | a many-pointer and `p[0].c` |
| `opts[k].lane.cells` (a slice in a struct in a struct) | invalid wasm | `Option` repeats `Lane`'s fields |

Arrays of structs then work: `[*]mut Spot` to fill, `[]Spot` to pass, and
`sizeof(Spot)` to allocate.

## 7. Returning arrays from functions

A function returns a `[]i32` (or a struct holding some) whose cells sit at the
top of the bump stack, in the caller's scope. 9 functions do it (`grow`,
`way_out`, `lane_of`, `shape`, `walk`, `slid`, `knot_spots`, `reversed`,
`path_of`). It reads like returning an array.

The catch is that such a function cannot open a scope of its own, so its
scratch (the 4 options in `grow`) stays behind until the caller's scope resets.
Here every caller is inside a try's scope, so the waste is a few words per call.

## 8. Floats

The arithmetic itself needed nothing: f64 in wasm gave the JS's bits everywhere
(`rng() * sum`, `miss`, the coverage shares), with the operations in the JS's
order. Conversions are explicit (`f64(n)`, 17 sites), which suited a port that
must not round differently.

But three of the bugs sit exactly where the float code is:
- `abs(gain - desire)` compiled without the `abs` (bug 1);
- `covered >= 0.72 * area` compiled the product as `i32.mul` (bug 3);
- `max(1.0, x)` is rejected, and has to be `max(1.0:f64, x)` (bug 12).

## 9. Manual memory decisions

Lifetimes on the bump stack, in the order I had to decide them:

1. **A rope's track must last for the call, but a candidate is tried in a scope.**
   `commit()` therefore runs only after the try and the step have closed, on a
   candidate copied out by `keep()` to buffers that last for the call. The copy
   needs a bound on a candidate's rope: `max(len_hi, pull + 2)` cells, from
   reading `walk`.
2. **No bare block**, so a scope needs a function, a loop body or an `if`.
   `spot_try` and `gap_rope` exist as functions only because a try must close
   its scope before its result is committed or the next try begins.
3. **`pack_gaps` commits ropes while it walks its shuffled list of cells**, so
   that list is allocated before the first rope (`spare` in `weave`) and passed
   in.
4. **`seed_core` adds tracks while it checks the core**, so its `occupied` flags
   could not be freed after. The check became a pass of its own (`core_fits`),
   with a scope. The result is the same: the JS draws nothing in between.
5. **A knot's stop** (one word) must live as long as its rope: pushed just
   before the track in `commit`, in the try's scope in `knot`. Core ropes' stops
   and paths are used where they lie in the input buffer.
6. **Sizes without bounds checks.** Per-rope tables have one entry per cell
   (`dep[]` can name the dropped trial rope, index `n`). `taps` holds
   `area + 2 + core stops`. `order` holds `max(area, plan length)`.
   `mark_below`'s stack holds `blockers + 1 + n`. Each is a bound I worked out,
   and getting one wrong corrupts memory silently.

**Bugs I hit from this:** none at run time. I credit two cheap checks more than
care: `assert mark() == settled` in `commit` (the stack must be exactly where
the call's scope left it), and asserts on `taps`, on the rope count and in
`keep`. None has ever fired. A test also checks that `weave()` returns with the
stack where it found it.

**Peak use** of the 16 MB stack: 75 KB for boards up to 12x16, 226 KB at 24x24,
605 KB at 40x40.

## 10. Compile errors and messages that misled

- **`encantis check` passing means little.** 8 of the bugs below pass the
  checker and fail when the wasm is built; 5 more pass everything and compute
  the wrong thing. I ran `encantis wasm` after every change, and read the WAT of
  every `min`, `max`, `abs` and float comparison once I knew.
- **WAT errors carry the source file's name and the WAT's line.**
  `weave.ents:1587:300: type mismatch in i32.mul` is line 1,587 of the output of
  `encantis compile`, in a 1,400-line source file. Sometimes the name ends in a
  stray byte (`08-slice-global.entsC:7:43`).
- **`func set(...)`** fails with a list of type names expected after `func`.
  `set` is a keyword.
- **`max requires a numeric type, got float(1)`** for `max(1.0, x)`.
- **`'d' is already declared in this scope`** is clear, but the rule behind it
  surprised me: see 12.
- **A build takes 15 s** (bug 15): the 16 MB zero buffer of `stack.ents` costs
  about 5 s in each of the three modules that import it. With a 1 MB stack the
  same build takes 1.6 s, and the fixture still passes.

## 11. What was pleasant

- **It was right the first time it ran.** Wrapping u32 arithmetic, explicit
  conversions and f64 mean the JS's numbers come out without thinking about it.
  No implicit conversion ever had to be hunted down.
- **`defer reset(scope)`.** 14 scopes, and 75 early exits (`return ... when`,
  `break when`, `continue when`) between them. Not one leak; I never thought
  about a path out of a function.
- **The `when` suffix.** `return no_cand() when sum < 0` reads better than the
  MoonBit it replaces.
- **Struct values in registers**, with slices in them, and multi-value returns
  (`let dx, dy = head_dir(path)`).
- **Element loops** (`for cell in seq[id]`, `for i, x in xs`): 25 of the 74
  loops, with no index arithmetic.
- **Arrays of slices** in memory, and `lanes[c].len += 1` on one.
- **Source imports** with shared globals (`export global`), so the board could
  be a module of its own, with its own inline tests.
- **`def` names in `data` literals** (the table of kinds), `sizeof(Spot)`, range
  fills (`p[0..n] = -1`).
- **The result:** 18 KB of wasm with no GC, 2.3x the speed of the JS before any
  optimizer runs.

## 12. Other things that got in the way

- **Signedness.** A `for i in n` variable is u32, `.len` is u32, and everything
  stored is i32 (ids and cells share arrays with -1 and the marks). Mixing them
  is an error, so there are 52 `as i32` (26 on `.len`, 26 on loop variables)
  and 14 `as u32`. None of them is interesting.
- **Names are function-scoped.** `let x` in two sibling blocks is an error, and
  so is `let d` after `for d in 4`. About a dozen variables are named around it
  (`gap` and `run` in `knot_spots`, `i` and `j` in `pick_parent`). Worse, a
  `for c in ...` after `let c` compiles and takes the variable over (bug 11).
- **Imports restate every signature:** 70 lines across the four files, 54 of
  them in `weave.ents`. The restated type is not checked against the real one
  (a global imported as `f64` stays the `i32` it is).
- **Fixed arrays need a ranged index.** `dir_x[d]` works inside `for d in 4`
  and nowhere else; `dir_x.i32[d]` is the unchecked form (`dx_of`, `kinds`).
- **`memcpy` wants sized pointers**, so a copy of a runtime length is a loop
  (`copy_to`).
- **Hyphens are legal in names**, so `count-1` is one identifier. I kept spaces
  round every minus.

## Compiler bugs (0.2.1), each with a file in `bugs/`

Silent: the program builds and computes something else.

| # | File | What happens |
| ---: | --- | --- |
| 1 | `01-abs-of-difference.ents` | `abs(a - b)` compiles to `a - b` |
| 2 | `02-min-max-evaluate-twice.ents` | integer `min` and `max` evaluate each argument twice |
| 3 | `03-arithmetic-right-of-comparison.ents` | `a < b / c` divides unsigned; `a < b + c` in i64 adds in 32 bits; with f64 it is invalid wasm |
| 4 | `04-struct-store-to-memory.ents` | `list[k] = Spot(...)` stores one field at a wrong address |
| 11 | `11-for-reuses-let.ents` | `for c in ...` takes over an earlier `let c` |

Reported, but only when the wasm is built (the checker passes):

| # | File | What happens |
| ---: | --- | --- |
| 5 | `05-struct-load-from-memory.ents` | `let s = list[k]` loads one field for all |
| 6 | `06-field-through-pointer.ents` | `p.c` with `p: *mut Spot` uses an undefined local |
| 7 | `07-slice-in-nested-struct-in-memory.ents` | a slice in a struct in a struct in memory cannot be read |
| 8 | `08-slice-global.ents` | a global cannot be a slice |
| 9 | `09-store-returned-slice.ents` | `lists[k] = make()` crashes the compiler |
| 10 | `10-call-function-parameter.ents` | a function passed as an argument cannot be called |
| 13 | `13-field-of-call-result.ents` | `f().chain.len` leaves values on the wasm stack |
| 14 | `14-bare-return-with-result.ents` | a bare `return` in a function with a result |

Others:

| # | File | What happens |
| ---: | --- | --- |
| 12 | `12-literal-first-in-max.ents` | `max(1.0, x)` is rejected by the checker |
| 15 | `15-large-zero-buffer-is-slow.ents` | a 16 MB zero buffer adds 5 s to every command |

Bugs 1, 2 and 3 were in the port as first written (`best_rope` twice, `walk`
once). The oracle would have caught each one: a wrong `miss` picks another
rope, and a second draw in `walk` shifts every draw after it. I found them
earlier only because bug 3 fails loudly for f64, and I read the WAT round it.
Bug 3 probably has one cause: the type of a binary expression seems to be
looked up by where it ends, and the right operand of a comparison ends where
the comparison does.

## What would have removed the most

Measured on this port only:

| If Encantis had | It would remove |
| --- | --- |
| Correct `abs`, `min`, `max` and comparisons (bugs 1 to 3) | the three workarounds, and the need to read the WAT |
| Struct values that can be stored and loaded (bugs 4 to 7) | `put_spot`, `spot_at`, the `Option` type that repeats `Lane` |
| Optional struct values (`?Cand`), or enums | 4 `ok` fields, 4 empty constructors, 33 `no_...()` returns, and the chance of reading a value that is not there |
| Block scope, and a bare block | 2 functions that only carry a scope; about a dozen names chosen to avoid a clash |
| Slice globals (bug 8) | the `order` / `norder` pair and `order_list()` |
| A signed loop variable, or signed lengths | most of the 52 `as i32` |
| A list that can grow while another does | the counting pass for `lanes`, the worst-case room in `knot_spots`, 6 hand-derived capacities |
| Callable function values (bug 10), or generics | the hand-written sort; with generics also a `push` for the two struct lists |
| Closures | 6 loops written out for `filter`, `some` and `map`. Not the 25 closures of `weave`: globals did those at no cost in lines |
| Imports by name alone | 70 lines |

