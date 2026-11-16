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

`node moonbit/encantis/solver/check.cjs`, built with Encantis 0.2.1:

| | Result |
| --- | --- |
| Pinned JS results (`assist-expected.json`), square boards | 330 checks, 0 mismatches |
| Every square Journey board plus 18 custom boards: plan states and random states, budgets 40 / 900 / 5000 | 1,013 positions, 3,039 checks, 0 mismatches against MoonBit's wasm-gc and JS builds |
| Time for those 3,039 searches (Node) | Encantis 57 ms, MoonBit wasm-gc 135 ms, MoonBit JS build 261 ms |
| wasm | 4.1 KB, no GC; `memory.fill` (bulk memory) is the one post-MVP instruction |
| Size against the MoonBit it replaces | 2,768 tokens against 2,493: 1.11× |

**Speed.** Encantis is about 2.4× faster than MoonBit's wasm-gc build, and 4.6×
faster than its JS build. The JS build is what iOS 15 runs, so a plain-wasm
Encantis solver should be the biggest gain for the iPad mini 4 (not measured on
Safari).

**Size.** The 1.11× uses no generics, closures or enums. Most of the extra is the
hand-written hash set, and an insertion sort in place of `ssort` with a comparator.

## How it got here

| Version | Tokens | × MoonBit |
| --- | ---: | ---: |
| First port, Encantis 0.1.0: board arrays as `u32` addresses, with typed views in every function | 3,011 | 1.21 |
| Pointer globals (`global off: [*]mut i32 = 0`, creationix/encantis#9, in 0.2.1) | 2,774 | 1.11 |
| Element loops over ranges (`for o in off[0..n]`, 0.2.0) | 2,768 | 1.11 |

All three versions are exact on every check and run at the same speed.

## What the port needed

- **Language:** `defer`, and the bump stack's `mark`, `alloc`, `extend` and
  `reset`.
  - `extend` was added for this port. A track's length isn't known until its ray
    reaches the edge, so it's built in place by growing the topmost allocation.
  - `alloc` aligns to 8, which would have left gaps between words. That was the
    one real bug in my port.
- **Compiler fixes** on creationix/encantis, all released:
  - In 0.1.0: #2 `defer`; #3 `continue` in `for i in n` skipped the increment;
    #4 `[*]mut Slot` wasn't assignable to `[*]mut Slot`; #5 a trailing `if` in a
    function with named results produced invalid wasm.
  - In 0.2.1: #9 pointer-typed globals; #10 destructuring inside tests; #11
    positional destructuring (`let a, b = f()`); #12 struct constructors.
- **Used from 0.2.0:** element loops over many-pointer ranges, and range fill
  (`w[0..n] = 0`, one `memory.fill`) in the stack's `alloc_words`.
- **Still awkward:**
  - **No closures:** the search's shared state is module globals. That is fine
    for a single-threaded kernel, but it isn't reentrant.
  - **No generics:** the hash set is written for this one key type.
  - **Copies with a runtime length** still need a loop or `memcpy` with sized
    pointers. Range copy needs both lengths known at compile time.
- **Not ported:** Hex boards and spinner boards, which use other kernels in
  MoonBit (`hex_solve`, `solve_full`). The square kernel is the representative
  case.

To build, with the Encantis 0.2.1 release binary (or `bun packages/cli/src/cli.ts`
in a checkout of `v0.2.1`):
`encantis wasm moonbit/encantis/solver/solver.ents -o moonbit/encantis/solver/solver.wasm`.
