# The hint solver in Encantis

A port of the game's hint and auto-solve search (`guide` in
`src/core/assist.mbt`, plus `sq_solve` and the square offset kernel in
`square.mbt`) for square boards without spinners. It was chosen as the decisive
test of Encantis for this game. It is harder than the feature check: a
depth-first search with a set of hopeless positions, a sorted move list per
search frame, track building with mirror rays, and the relaxation that detects
ropes that can never leave. It is also the iPad's heaviest work after
generation.

It's written on the bump stack (`../stack/stack.ents`) with `defer`:
- the board's tables live for one call;
- each search frame's move list is freed when the frame returns;
- hopeless positions go in a pool reserved before the search starts, because
  they must outlive the frames that find them.

## Results

`node moonbit/encantis/solver/check.cjs`:

| | Result |
| --- | --- |
| Pinned JS results (`assist-expected.json`), square boards | 330 checks, 0 mismatches |
| Every square Journey board plus 18 custom boards: plan states and random states, budgets 40 / 900 / 5000 | 1,013 positions, 3,039 checks, 0 mismatches against MoonBit's wasm-gc and JS builds |
| Time for those 3,039 searches (Node) | Encantis 80 ms, MoonBit wasm-gc 192 ms, MoonBit JS build 365 ms |
| wasm | 4.3 KB (plain wasm, no GC) |
| Size against the MoonBit it replaces | 3,012 tokens against 2,493: 1.21× |

**Speed.** Encantis is 2.4× faster than MoonBit's wasm-gc build, and 4.6× faster
than its JS build. The JS build is what iOS 15 runs, so a plain-wasm Encantis
solver should be the biggest gain for the iPad mini 4 (not measured on Safari).

**Size.** The 1.21× uses no generics, closures or enums. Most of the extra is:
- typed views of the board's globals (`let off = off_at as [*]i32`, since
  globals can't hold pointer types yet);
- the hand-written hash set;
- an insertion sort in place of `ssort` with a comparator.

## What the port needed

- **Language:** `defer`, and the bump stack's `mark`, `alloc`, `extend` and
  `reset`.
  - `extend` was added for this port. A track's length isn't known until its ray
    reaches the edge, so it's built in place by growing the topmost allocation.
  - `alloc` aligns to 8, which would have left gaps between words. That was the
    one real bug in my port.
- **Compiler fixes,** all released in Encantis 0.1.0 (creationix/encantis
  #2–#5):
  - #2 `defer`.
  - #3 `continue` in `for i in n` skipped the increment.
  - #4 `[*]mut Slot` wasn't assignable to `[*]mut Slot`.
  - #5 a trailing `if` in a function with named results produced invalid wasm.
- **Still awkward in the language:**
  - **Globals can't hold pointer types** (the annotation is ignored, still so in
    0.1.0), so every function rebinds typed views of them.
  - **A call result can't be indexed and assigned to** (`f(x)[i] = v`).
  - **No closures:** the search's shared state is module globals. That is fine
    for a single-threaded kernel, but it's the opposite of reentrant.
- **Not ported:** Hex boards and spinner boards, which use other kernels in
  MoonBit (`hex_solve`, `solve_full`). The square kernel is the representative
  case.

## `solver.next.ents`: with pointer globals

The same solver with the board's arrays in pointer globals
(`global off: [*]mut i32 = 0`). It needs creationix/encantis#9, which isn't
released yet. It drops 39 lines of typed views and comes to 2,774 tokens,
**1.11× the MoonBit** (from 1.21×). It is equally exact (330 pinned and 3,039
compared checks, 0 mismatches) and equally fast. When #9 is released, it replaces
`solver.ents`. Check it with
`node moonbit/encantis/solver/check.cjs <path to solver.next.wasm>`.

To build, with the Encantis 0.1.0 release binary (or `bun packages/cli/src/cli.ts`
in a checkout of `v0.1.0`; both give byte-identical output):
`encantis wasm moonbit/encantis/solver/solver.ents -o moonbit/encantis/solver/solver.wasm`.
