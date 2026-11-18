# The woven builder in Encantis, second version

`weave(rng, cfg)`, the square woven builder of `levels.js` at 9e69e3a (the game
runs it as `src/core/weave.mbt`), written again for the Encantis compiler of
creationix/encantis at 57d6e1ad00e6145bf4bb17408ec872949d06d702 (branch
`claude/generics-modules`): the same exports, the same contract as
`../builder/check-weave.cjs` reads, the same boards and the same rng draws.
`../builder/` (v1) is the port to Encantis 0.2.1 and stays as it was: the
record of 0.2.1. This one uses what the compiler has now wherever it made the
code simpler or clearer: `Vec(T)` and a sort with a comptime comparator from
the container library (`lib/`), structs stored in memory, optional pointers
resolved with `if let`, loop-scoped names, method calls, generics of its own.

**v2 is exact on every oracle v1 had. It is 1,426 lines against v1's 1,611
(MoonBit's 1,664), and 1.02x MoonBit's tokens against v1's 1.07x. Its stack
peaks at 0.54x to 0.62x of v1's. It is 5% slower than v1 (13% when both are
built with `-O`). The compiler made no wrong code: two bugs met, both reported
by `encantis check`, against v1's 20 (5 of them silent). What hurts now is the
language: an optional has no guard, so each one nests; indexing still wants a
fallback, so the tables stay unchecked; and lifetimes on the bump stack are
still decided by hand, with one new way to get them wrong.**

## Results

| | v1 (Encantis 0.2.1) | v2 | Reference JS |
| --- | --- | --- | --- |
| The fixture: 249 cases, in order and in reverse, cell for cell, taps, knots, traps, rng draws (`check-weave.cjs`) | 0 mismatches | 0 mismatches | is the fixture |
| 20 other seeds per case (`other-seeds.cjs`) | 4,980 runs, 45 null, 0 mismatches | 4,980 runs, 45 null, 0 mismatches | |
| Board sizes 1x8 to 80x80 (`other-sizes.cjs`) | 224 runs, 65 null, 0 mismatches | 224 runs, 65 null, 0 mismatches | |
| v1's verifier's own harness: the fixture fresh (996 runs), 3,000 random cfgs, 4,000 wider ones | 0 mismatches | 0 mismatches | |
| Time for the 249 cases, best of 5 rounds: median (range) of 5 processes | 278.5 ms (275.8 to 290.6); rebuilt with this compiler 275.8 (270.2 to 278.8) | 289.4 ms (286.4 to 293.8) | 635.3 ms (623.8 to 679.2), 25 processes |
| ... median of 5 rounds | 291.3 ms (285.8 to 306.9); rebuilt 278.4 (272.7 to 285.8) | 303.8 ms (289.2 to 314.3) | 670.9 ms (642.7 to 726.0) |
| ... with `encantis wasm -O`, best of 5 | rebuilt 245.1 ms (241.7 to 249.0) | 276.2 ms (274.2 to 278.4) | |
| wasm (gzipped) | 17,950 (7,608); rebuilt 18,000 (7,709) | 18,384 (7,926) | |
| ... with `-O` | rebuilt 33,545 (8,395) | 17,362 (7,348) | |
| Peak of the bump stack, boards up to 12x16 / 24x24 / 40x40 (`peak.cjs`) | 75,040 / 225,580 / 605,360 bytes | 42,528 / 138,944 / 327,440 bytes | |
| Source (`size.cjs`: code lines and tokens, without comments and tests) | 1,611 lines, 11,802 tokens: 1.07x MoonBit's tokens | 1,426 lines, 11,303 tokens: 1.02x | MoonBit: 1,664 lines, 11,030 tokens |
| ... of it, import declarations | 84 lines, 836 tokens | 78 lines, 925 tokens | |
| Inline tests (`encantis test` on each file) | 13, in four files | 14, in three files (and lib/'s 10) | |
| Build (`encantis wasm`) | 15 s on 0.2.1; 1.0 s with this compiler | 1.0 s | |
| Compiler bugs met | 20, 5 of them silent | 2, both reported by `check` | |

- **v1 builds unchanged** with this compiler, and is exact: "rebuilt" above.
  So the speed of v2 against v1 is a matter of how v2 is written, not of the
  compiler. MoonBit's wasm-gc build of the builder is 39,006 bytes (16,335
  gzipped) and took 383 ms in v1's measurements; it was not measured again.
- **Speed.** v2 is 5% slower than v1 rebuilt (289.4 against 275.8 ms, best of
  5), and 13% slower when both are built with `-O` (276.2 against 245.1). The
  table under "What each step cost" shows where: the lists as `Vec`s (4%) and
  the library's sort (2%). The JS takes 2.2x v2's time.
- **wasm-opt.** `-O` (wasm-opt `-Oz`) nearly doubles v1 (18,000 to 33,545
  bytes): it inlines most of the builder into `weave`, which becomes one
  function of 20,866 bytes, and that is where v1's 11% gain from `-O` comes
  from. It makes v2 6% smaller, and 5% faster. Why it treats the two so
  differently was not looked into; one difference is that v1 passes a
  candidate as 16 wasm values and v2 as a pointer.
- **The peak** halves because `knot_spots` no longer reserves room for every
  cell and direction (384 KB at 40x40 in v1): its three lists are `Vec`s.

How each was measured is under [Measurements](#measurements).

## Files

| File | What it is |
| --- | --- |
| `weave.ents` | The builder: shaping ropes, candidates, knots and traps, laying and packing, the core, the finished level. The exports of the contract |
| `board.ents` | The lists and tables both files use (`new`, `table`, `part`, `contains`, `push_all`, `push_reversed`, `reversed`); then the board: tracks and mirrors, `place`, `slide_to`, `relax`, the replay of intentions (`tap`, `replay`, `trial`), loops (Tarjan) |
| `rng.ents` | mulberry32, `below`, `chance`, `one_of`, and the trace of draws |
| `lib/stack.ents`, `lib/vec.ents`, `lib/sort.ents` | The container library of encantis at 57d6e1a, copied (the stack grown from 256 KiB to 16 MiB); each names the commit in its header |
| `weave.wasm` | Built from the above |
| `bugs/` | A minimal file for each compiler bug met, with how to see it in its header |
| `other-seeds.cjs`, `other-sizes.cjs` | The oracles beside the fixture: v1's scripts, which were never committed |
| `bench.cjs`, `peak.cjs`, `size.cjs` | Time, the stack's peak, source size |

The fixture and its harness are v1's: `../builder/check-weave.cjs`,
`dump-weave.cjs` and `weave-expected.json`.

## Build and check

With the CLI of encantis at 57d6e1a (`bun <encantis>/packages/cli/src/cli.ts`
for `encantis`):

```
encantis wasm moonbit/encantis/builder-v2/weave.ents -o moonbit/encantis/builder-v2/weave.wasm
node moonbit/encantis/builder/check-weave.cjs moonbit/encantis/builder-v2/weave.wasm
node moonbit/encantis/builder-v2/other-seeds.cjs
node moonbit/encantis/builder-v2/other-sizes.cjs
for f in rng board weave; do encantis test moonbit/encantis/builder-v2/$f.ents; done
```

The build takes about a second. `peak.cjs` builds its own copy and needs the
CLI in `ENCANTIS` (`ENCANTIS='bun <encantis>/packages/cli/src/cli.ts'`).

## How it is written

What changed from v1:

- **Lists are `Vec(T)`** (`lib/vec`): `Vec(i32)` for cells, ropes and
  directions, `Vec(Spot)` and `Vec(Option)` for the two lists of structs. A
  list travels as the slice its `items()` give. 34 `vec(...)` calls replace
  v1's lists built in place (`begin`, `push`, `since`) and its lists in room
  taken first with a count beside them.
- **What may be missing is an optional pointer.** `way_out`, `lane_of`,
  `shape`, `candidate`, `walk`, `knot`, `trap` and the functions that pass a
  candidate on return `?*T`: the value stored on the stack in the caller's
  scope (`new(x)`), or 0. Callers resolve it with `if let` (17 of them).
- **Structs live in memory as values**: `tight.push(Spot(...))`, `for opt in
  opts.items()` over a list of `Option(d, lane: *Lane)`, `kept.* = Cand(...)`.
- **The sort** is `by_cost.items_mut().sort(costlier)` with the comparator
  `costlier(a, b) => cost[a] > cost[b]` (`lib/sort`, stable).
- **Generics of its own:** `table(T, n, v)`, `new(T, x)`, `contains`,
  `push_all`, `push_reversed` (in `board.ents`) and `one_of(site, xs)`, the
  JS's `xs[below(xs.length)]` (in `rng.ents`).

What did not change: shared state is module globals, reset by every call (31
in `weave.ents`, 25 in `board.ents`), and the 25 closures of the JS are
top-level functions. Memory is the bump stack in three scopes (the call, a
step, a try), each freed by `defer`; a step's choice is copied out of its try
(`keep`); `commit()` asserts that only the call's scope is open. The board is
not trimmed or turned, and `ropeCount` is left out, as in v1 and MoonBit.

## What got simpler

Each line of v1's "What would have removed the most" (`../builder/NOTES.md`),
with v1's count and what is left. Counts are of `weave.ents` and `board.ents`
without tests, as v1's were.

| v1 wanted | v1 had | Now |
| --- | --- | --- |
| Correct `abs`, `min`, `max` and comparisons (bugs 1 to 3) | 3 workarounds, and the WAT read for every `min`, `max`, `abs` and comparison | **Removed.** `abs(c.gain - desire)`, `max(k + 2, len_lo + below(...))` and the coverage comparison are written as meant. With them went `max(1.0:f64, x)` (bug 12) and 13 of the 17 `f64(...)` conversions (bug 16: an i32 beside an f64 widens). The 4 left are in the two divisions of one integer by another |
| Struct values that can be stored and loaded (bugs 4 to 7) | `put_spot`, `spot_at`, and `Option` repeating `Lane`'s fields | **Removed.** `list.push(Spot(...))`, `for opt in opts.items()`, `Option = (d, lane)` |
| Optional struct values, or enums | 4 `ok` fields, 4 empty constructors, 37 `no_...()`, 16 `.ok` reads, and nothing to stop reading a value that is not there | **Removed**, with optional pointers: 0 `ok` fields and constructors, 17 `if let`. A value that is not there cannot be read. `aimed()` returns a start of -1 for none, as the rest of the builder does for cells. The cost is nesting: see below |
| Block scope, and a bare block | 2 functions that only carry a scope; about a dozen names chosen round a clash | **Smaller.** A loop's and an `if let`'s names are their body's: `pick_parent`'s and `relax`'s loops are all `i` again (v1: `i`, `j`, `k`). `spot_try` is gone: its body is the loop body of `knot_or_trap`, which is the try's scope, and `return keep(c)` keeps before `defer` frees. Still there: a `let` is the function's (`gap` and `run` in `gap_ahead`), and `gap_rope` stays a function, because its caller commits after the scope has closed |
| Slice globals (bug 8) | `order` / `norder` and `order_list()` (6 uses) | **Removed**, and with them the pairs `taps` / `ntaps` / `tap_room` and `mirror_at` / `mirrors`: each is a global `*mut Vec(i32)`. Slices work as globals now, but the tables did not become slices: see "Indexing" below |
| A signed loop variable, or signed lengths | 52 `as i32`, 14 `as u32` | **Still there, moved.** 41 `as i32` and 28 `as u32`: a `Vec`'s length is a `u32` too, and so is its capacity (`vec(i32, want as u32)`, `cells.len < want as u32`). A negative count now runs a loop zero times (v1's bugs/20 is fixed) |
| A list that can grow while another does | the counting pass for `lanes`, the worst-case room in `knot_spots`, room taken first in `grow` and `walk`, `spare` taken before the first rope, 6 hand-derived capacities | **Removed**, but for 4 capacities: `taps` and the kept candidate's three lists are written inside a try and must not grow there (below), so they keep v1's bounds and assert them. `order`'s and `mark_below`'s bounds are gone, and so is `start_build`'s need of the plan's length |
| Callable function values, or generics | the sort written out; with generics also a push for the two struct lists | **Removed** with generics: `lib/sort` takes the comparator at compile time, and `Vec(Spot)` and `Vec(Option)` push. Calling a function value is still not supported (v1's bugs/10 is now an error that says so); nothing here needs it |
| Closures | 6 loops written out for `filter`, `some` and `map`; the 25 closures as globals | **Still there**, and still cheap: the same loops, 56 globals and 73 functions in the two files (v1: 60 and 70) |
| Imports by name alone | 70 restated signatures, 84 lines, 836 tokens (7% of the port) | **Still there**: 64 signatures, 78 lines, 925 tokens (8%). A generic's signature is longer (`"push" func push(comptime T: type, v: *mut Vec(T), x: T)`); merging `ints.ents` into `board.ents` saved some |

Beyond that list, the idioms v1's verifier found unused are used: 18 `if`
expressions where a default was declared and then assigned, and `set (dx, dy)
= turn(...)` for the mirror turn written once.

### What each step cost

The steps are the commits of `builder-v2/`; each was exact on the fixture.
Time: best of 5 rounds, median of 3 processes (`bench.cjs`).

| Step | Commit | Lines | Tokens | wasm | Time |
| --- | --- | ---: | ---: | ---: | ---: |
| v1, copied, on `lib/stack` | 184cbbb | 1,611 | 11,802 | 17,994 | 274.8 ms |
| The workarounds for 0.2.1's expressions gone; `if` expressions | cbea785 | 1,524 | 11,764 | 17,888 | 271.6 |
| Structs stored and loaded whole | 4afbeff | 1,510 | 11,564 | 17,764 | 274.8 |
| Lists are `Vec(T)` | 8a5242b | 1,437 | 11,563 | 18,627 | 286.6 |
| `lib/sort` with a comparator | a906a9f | 1,435 | 11,567 | 19,145 | 292.9 |
| Optional pointers for the `ok` fields | 4a5c5ee | 1,446 | 11,506 | 18,483 | 288.9 |
| Loop-scoped names; no function for a try's scope | 6d409eb | 1,440 | 11,466 | 18,427 | 291.6 |
| `one_of`; method calls | 57879ac | 1,442 | 11,484 | 18,384 | 286.1 |
| Three files: `lists.ents` into `board.ents` | 7c51e21 | 1,426 | 11,303 | 18,384 | 289.3 |

The time is in two steps: `Vec` (+12 ms, 4%: a call for every push, and a
list per cell for `survey`'s lanes, made every step) and the library's sort
(+6 ms, 2%: the comparator is a call per comparison, and a list of more than
16 is merged through scratch). The rest is within the spread of the
processes, which is about 5 ms.

## What still hurts

1. **An optional has no guard.** `if let` is the only way to read one: there
   is no `let x = f() else { return 0 }`, no `?? return`, and `x == 0` does not
   narrow `x`. So each optional that the rest of a function needs is one more
   level: `knot` and `trap` are two levels deeper than in v1, and `best_rope`'s
   scoring sits three deep (`for`, `if let c`, `if let lane`). It cost 11 lines
   where it removed the `ok` fields (1,435 to 1,446), against 61 fewer tokens.
2. **Indexing still wants a fallback, so the tables stay unchecked.** A slice
   can be a global now, but reading one is `xs[i] ?? 0` or `if let`, and a write
   is `if let p = &xs[i] { p.* = v }`: no form traps. A fallback in a builder
   that never goes out of range would hide a bug, not catch one, so the tables
   (24 in globals, and 9 that a function makes for itself) are many-pointers
   as in v1, and of 254 index operations in the two files 10 are checked
   (`dir_x[d]` in `for d in 4`, at compile time). v1 had 10 of 298. `one_of`
   took 7 unchecked `.ptr[below(...)]` reads out of the builder's sight, but
   they are no more checked than before.
3. **Lifetimes are still decided by hand, and a `Vec` adds a way to get them
   wrong.** A `Vec` that grows where it is not at the top of the stack moves
   to new room at the top, which belongs to whatever scope is open: if that
   is a scope inside the one the `Vec` was made in, the room is freed with it
   and the `Vec` points at memory the next allocation reuses. Nothing reports
   it: given room for 4 taps and without its assert, `taps` makes 179 of the
   249 cases weave another board, and none of them traps. So `taps` (written
   by every replay, inside tries) and the three lists a kept candidate is
   copied to are given their room up front, and assert it
   (`assert taps.len < taps.cap`, `assert xs.len <= to.cap`); `knot_spots`'s
   gap check moved into a function of its own (`gap_ahead`) so that no list
   grows inside its scope. The rest is as in v1: `keep`, `gap_rope` as a
   function that carries a scope, `commit()`'s assert on `settled`.
4. **Signed and unsigned**: 69 casts, as above.
5. **Imports restate every signature**, and a local cannot have the name of an
   imported function: `last` (the last direction) clashed with `lib/vec`'s
   `last` and is `went`.
6. **The module is not reentrant**, and its 56 globals are reset by hand.
7. **A trap still leaks the stack**: `defer` does not run when an assert traps,
   and `weave` resets to the mark it took, not to the base (v1's verifier's
   finding 3).
8. **A runtime value in an array literal is stored in one cell for that place
   in the source** (reference 1.5), so `trial(path, [k], order)` would hand
   every knot the same stop list. A stop list is a `Vec` of one.

## Compiler bugs

Both are loud: `encantis check` reports them, and neither compiles to anything
wrong. Each has a file in `bugs/` with how to see it.

| # | File | What happens |
| ---: | --- | --- |
| 1 | `01-array-literal-branch-without-type.ents` | `let ys = if c { xs } else { [] }` is refused (`cannot convert [] to []i32 implicitly: convert its fields`) where `let ys: []i32 = ...` is accepted. Met in `weave()` |
| 2 | `02-range-fill-with-struct-or-slice.ents` | `p[0..n] = v` fills when `v` is a number, and is refused as a copy when it is a struct or a slice (`cannot copy []i32 into a range of []i32`). Met in the generic `table(T, n, v)`, which fills with a loop |

v1's 20 bugs, each file of `../builder/bugs/` run with this compiler: 17 are
fixed (all 5 silent ones among them); 3 are errors by design now: calling a
function parameter (10: `calling a function value is not supported yet`), a
`for` reusing a `let`'s name (11: refused), a bare `return` in a function with
a result (14: refused by `check`). bugs/15, the 16 MB zero buffer that took 5 s
per command, is gone: v2's build with the same 16 MiB stack takes about a
second (0.96 to 1.15 s over 5 builds), and so does v1's with this compiler.

## Measurements

Node 22 (v22.23.4) on a 4-core machine that other jobs share. Every timing ran
under a lock that the other long jobs take too (`flock`), so no two overlap.

- **Time** (`bench.cjs`): check-weave.cjs's timing in a process of its own
  for each wasm: its two passes over the cases (each result and draw count
  checked) and its run of the reference JS first, then 5 rounds, each running
  every case on the module and then on the JS, the clock round the call alone.
  check-weave.cjs reports the best of the 5 rounds; `bench.cjs` reports the
  best and the median. 5 processes for each wasm, interleaved (v1 as
  committed, v1 rebuilt, v2, v2 `-O`, v1 rebuilt `-O`), so the JS has 25. The
  tables give the median and range of the processes. By board size, v2 / v1
  rebuilt / JS (best of 5): up to 12x16 164.6 / 157.9 / 334.8 ms, 24x24 59.3 /
  54.6 / 104.1, the 40x40 case 64.7 / 58.6 / 190.6.
- **wasm size**: `encantis wasm` with and without `-O` (wasm-opt `-Oz`, via
  npx), and `gzip -9`. Every `-O` build is exact on the fixture.
- **Source** (`size.cjs`): v1's `size.cjs` with its tokenizer and MoonBit side
  unchanged, counting every `.ents` file of this directory; `lib/` is listed
  and not counted, as v1 did not count `../stack/stack.ents` (sort 762 tokens,
  stack 171, vec 465, without their tests).
- **Peak** (`peak.cjs`): a copy whose stack records the highest top that
  `alloc` and `extend` reach. It is the same in every run, and it gives v1's
  reported numbers for v1 exactly.
- **Counts** in this file: of the code of `weave.ents` and `board.ents`
  without comments and tests, by pattern (`as i32`, `if let`, `[` after an
  expression ...), for v1 and v2 alike.
