# A bump stack with `defer`, for Encantis

A prototype of the smallest memory management the game's compute needs: one bump
stack in linear memory, freed by scope through `defer`. It includes a working
`defer` for the Encantis compiler and a real kernel rewritten on it, plus a draft of
comptime generics for the containers on top.

## Files

| File | What it is |
| --- | --- |
| `defer.patch` | The first version of `defer`, kept for the record. `defer` shipped in Encantis 0.1.0 (creationix/encantis#2) |
| `stack.ents` | The bump stack: `mark`, `alloc`, `extend`, `alloc_words`, `reset` (≈25 lines, plus tests) |
| `features.ents`, `.wasm` | `reachableFeatures` on the stack, with `defer` |
| `containers.draft.ents` | Draft syntax, not compiled: `Vec(T)` and `Set(K)` with comptime type parameters |

`../features.ents` is the same algorithm in today's Encantis. It uses 22 MB of
static buffers sized for the worst case: per-cell tables, the moving window, and a
seen-set arena. The stack version sizes every table from the board and budget it
is given, and frees it all on return.

## `defer`

```ents
let call = mark()
defer reset(call)
```

- `defer expr` runs `expr` when the enclosing block exits, newest first.
- It runs on every exit:
  - falling off the end of the block;
  - `break` and `continue`, which run the blocks they leave, up to the loop body;
  - `return`, which runs every open block.
- **Return order.** A `return`'s value is computed before the deferred expressions
  run. It stays on the wasm stack beneath them.
- **When the expression is evaluated.** The deferred expression is evaluated at
  exit, not when `defer` runs: `defer push(i)` uses `i` as it is at exit (Zig's
  rule, not Go's).
- **Only defers reached.** An early `return` runs only the defers registered
  before it.
- **Cost.** The deferred code is emitted inline at each exit, so there is no
  runtime overhead and no new wasm features. The output is still wasm MVP.

The change is about 120 lines of compiler code. All 907 compiler tests still pass.
A small program checks the order of output across `return`, `return when`,
`break when`, `continue when`, nested loops, and a `return` from inside a loop.

## The bump stack

```ents
export func mark() -> u32 => (space as u32) + top   // marks are addresses
export func reset(m: u32) { top = m - (space as u32) }
export func alloc(n: u32) -> (p: u32) { … }         // 8-aligned bump; traps when full
export func extend(n: u32) -> (p: u32) { … }        // grow the topmost allocation by exactly n
export func alloc_words(n: u32) -> (p: u32) { … }   // zeroed: w[0..n] = 0, one memory.fill
```

`extend` was added for the solver (`../solver/`). It builds an array whose length
isn't known in advance in place, from a mark.

Scopes nest. In `reachable()`:
- one scope covers the call: the per-cell tables;
- one scope covers each rope inside it: the moving window, the seen set, and every
  state the set copies.

A table the seen set outgrows stays behind until the rope's scope resets. That is
the general pattern for growable containers on a bump stack: wasted space is
bounded by the scope, never leaked.

## Results

`node moonbit/encantis/check-features.cjs stack/features.wasm`:

| | Static buffers (`../features.ents`) | Bump stack + `defer` |
| --- | ---: | ---: |
| Mismatches on 4,458 positions, vs the deleted JS and MoonBit | 0 | 0 |
| Mismatches on the 1,042 pinned checks | 0 | 0 |
| Time summed over the boards (budget 10,000) | 0.99 ms | 1.1 ms |
| Static data reserved | ≈22 MB | 16 MB stack, shared by any kernel |
| wasm | 2.4 KB | 2.6 KB |
| Lines | 258 | 298 |

**Speed.** The first stack version was 17× slower: it zeroed tables sized for the
whole budget on every rope. Two changes fixed that:
- the seen set now starts at 64 slots and doubles;
- the window is no longer zeroed, since every entry is written before it is read.

**Size.** The stack version is longer because its growable seen set (`probe`,
`grow`, `fill`, `see`) is written out by hand. That is what generics would remove.

## Comptime generics (the draft)

The draft is `containers.draft.ents`. Four rules:

1. `type` is a comptime-only type, and parameters can be marked `comptime`.
2. A generic type is a comptime function that returns a type: `Vec(T)`, `Set(K)`.
   There is no separate `<T>` syntax.
3. Each distinct set of comptime arguments produces one monomorphic copy. That
   means no boxing, and the output stays wasm MVP.
4. Requirements are duck-typed at instantiation: `Set(K)` calls `hash(k)` and
   `eq(a, b)`, resolved by UFCS for the concrete `K`. There are no traits.

**One mechanism, two jobs.** This is the "comptime evaluation" already in the
spec's future additions, used for generics too: `sizeof(T)`, lookup tables, and
generic types all come from it.

**What it would replace.** With it, `vec(u32, n)` and `set([]u32, 6)` replace about
80 lines of `features.ents`. A port of the generator would write `Vec`, `Set`,
`Map` and a stable sort once, instead of once per element type. That is where most
of the 2–2.7× size gap against MoonBit came from.

**Still open:**
- comptime arguments inferred from argument types, so `v.push(x)` works;
- how a function signature spells "a pointer to some `Vec(T)`";
- whether `sizeof` of a struct includes padding, so element layouts can be computed.

## Compiler issues found along the way

Both are fixed in Encantis 0.1.0:
- A `[*]mut Slot` value couldn't be passed as, or reassigned to, a `[*]mut Slot`
  (creationix/encantis#4).
- `continue` inside `for i in n` jumped past the increment and looped forever
  (creationix/encantis#3).

To build, with the Encantis 0.2.1 release binary (or a checkout of `v0.2.1`):
`encantis wasm moonbit/encantis/stack/features.ents -o moonbit/encantis/stack/features.wasm`.
