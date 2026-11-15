# Encantis instead of MoonBit for the compute core?

**Short answer: don't switch, and don't add Encantis as an iOS 15 fallback either.**

Encantis does produce what old Safari needs. Both kernels I ported compile to
plain wasm MVP: no GC, SIMD, bulk memory or multi-value. Both match the JS bit for
bit and run fast. But the language is missing too much of what this workload is
written in:

- no closures or callable function pointers;
- enums that parse but don't compile;
- no generics, growable arrays, hash maps or runtime strings;
- no `memory-grow`.

The ported code came out **2–2.7× the size of the MoonBit**. The compiler's newest
branch had no commits in the six months to this review, and code written for the
`fts` branch doesn't parse on the newer one.

Porting the whole core (about 35k MoonBit tokens) would mean about 90k tokens of
hand-specialized code plus a runtime written from scratch. A fallback-only hybrid
would mean keeping two complete cores in parity.

What is worth taking from this experiment is a representation idea. The Encantis
`reachableFeatures` keys states by hashed integer cells, not joined strings, and
it is about 5× faster than the current MoonBit wasm-gc version; the state keys are
the likely reason. That change
can be made in MoonBit (§8).

Everything below is marked **[ran]** (I executed it), **[read]** (I read it in
source or docs) or **[inferred]** (reasoned, not checked).

## 1. What Encantis is today

The clone at `/home/user/creationix/encantis` is shallow: one commit per branch, so
there's no history. `git ls-remote` shows that the remote has nothing newer than
the clone **[ran]**.

| Branch | Last commit | State |
| --- | --- | --- |
| `main` | 2026-01-14 | — |
| `fts` | 2026-02-17 | 329 unit tests pass, 18 skip. **None of the 10 examples compiles to valid wasm**: errors include undefined locals, redefined locals and type mismatches **[ran]**. |
| `challenge-prep` | 2026-04-28 | `fts` plus 3 planning documents (a crypto-library challenge for coding agents). |
| `prep/section-9-10-queries` | 2026-04-29 | — |
| `prep/finalize` | 2026-05-05 | The newest work. 538 tests pass, 6 skip. **30 of 36 examples compile and validate.** The failures are `crit-bit`, `trie`, `tee`, two SIMD files and a codegen crash **[ran]**. |

I used `prep/finalize` for the kernels, because `fts` can't compile even its own
examples. Code moves between these branches with churn. `fts` has no `data`
keyword: memory buffers were `def`. So the kernels below don't parse on `fts`
**[ran]**.

The compiler is about 14k lines of TypeScript (ohm-js grammar, checker, WAT
codegen), run with Bun and assembled with wabt **[read]**. The `wasm -O` option
shells out to `npx wasm-opt` **[ran]**.

What exists and works, as I used it **[ran]**:

- i32/u32/i64/f64 types;
- functions, `inline func` and named returns;
- `loop`/`while`/`for i in n`, and `break when` and `return when`;
- globals;
- static `data` buffers;
- typed pointer access (`buf.u32[i]`, `[*]T`);
- struct fields through pointers (`p[i].score = s`);
- imports of host functions;
- inline `test` blocks.

What is missing or broken:

| Feature | Status | How I know |
| --- | --- | --- |
| Closures | "Future additions" only | [read] `docs/encantis.md` §12 |
| Generics | "Future additions" only | [read] `docs/encantis.md` §12 |
| Function pointers | Documented, but calling one emits `call $f` on a parameter, which is invalid WAT | [ran] a 3-line test |
| Enums / ADTs | `enum` parses, but the checker and codegen have no enum code. `Step.Slide(1)` is a parse error. | [ran], [read] |
| Struct literal stored into memory | `p[i] = Cand(s, r, 0)` crashes codegen ("Missing type for integer literal") | [ran] |
| `memory-grow` | "Not yet implemented" | [read] `docs/memory.md`, and no codegen for it |
| Allocator | None. `examples/alloc/` has sample heap (first-fit, no coalescing) and arena allocators to copy. | [read] |
| Strings | Compile-time byte literals only; no runtime string type, builder or formatting. `write-float.ents` is a toy. | [read] |
| Integer `[i]` on fixed arrays | Bounds-checked: it must use `if let`/`??`, or the unchecked `.u8[i]` form | [ran] |
| Scoping | `let` and loop variables are function-scoped. A second `for c in …` in the same function is "already declared". | [ran] |
| Logical operators | `&&`/`||`. `and` gives a 60-alternative "Expected …" parse error. | [ran] |

## 2. The kernels I ported (`moonbit/encantis/`)

Both kernels are plain wasm. JS writes the board as i32 words into exported memory
and reads the results back through typed-array views.

- **`layout.ents`**: mulberry32, `Math.floor(rng() * n)`, FNV-1a `hashString`,
  `toString(36)`, the `layoutKey` JSON text and its two hashes, `Math.round`, and
  `Number(x.toFixed(4))`.
- **`features.ents`**: `reachableFeatures`, the feature fade-out the game runs after
  every tap, for square and Hex. It needed a hand-written seen-set: open
  addressing, generation-stamped slots, and an arena that stores each state's cells
  so equality is exact, not hash-only. It also needed a deque for the moving rope.
- `check.cjs` and `check-features.cjs` are the parity checks;
  `node moonbit/encantis/check.cjs` reproduces them. The `.wasm` files are
  committed builds. To rebuild, run
  `bun packages/cli/src/cli.ts wasm <file>.ents -o <file>.wasm` in a `bun install`ed
  copy of `prep/finalize`.

**Parity [ran]: all 0 mismatches.**

| Check | Cases |
| --- | --- |
| mulberry32 vs `random.js`, compared with `Object.is` | 2,000,000 draws |
| `rng_below` | 398,000 draws |
| FNV-1a | strings of every length 0–300 |
| `Math.round` | 200,000 values |
| `toFixed(4)` by scale-and-round vs V8 | 200,000 values in the score's range |
| `layoutKey` vs `game-engine.js`, MoonBit and `grid-journey-measurements.json` | all 120 Journey boards |
| `reachableFeatures` vs the deleted JS (copied from `134019d` into the check) and vs MoonBit's `assist.mbt` | 4,458 positions: every position along every mirror or spring board's own plan, at budgets 500 and 10,000 |
| `reachableFeatures` | the 1,042 feature checks pinned in `tests/assist-expected.json` |

One bug of my own came up, and it is the kind of bug this language invites. My
first `Math.round` returned `+0` for inputs in (−0.5, 0), where JS returns `−0`.
MoonBit's `js_round` returns an `Int`, so it never meets this case. In Encantis
every JS-semantics corner is yours to get right; I fixed it with `copysign`. Every
other result matched on the first compile, and I found no codegen bug in code that
compiled.

**Speed [ran]** (Node 22, V8; not Safari):

| Kernel | JS | Encantis (MVP) | MoonBit wasm-gc |
| --- | ---: | ---: | ---: |
| `layoutKey`, per board | 10.6 µs | 4.8 µs | — (not exported alone) |
| `reachableFeatures`, summed over the mirror and spring boards' start positions, budget 10,000 (ms; 2 runs) | 9.2–10.7 | 1.0–1.3 | 4.8–6.3 |

This isn't a language comparison. MoonBit's `reachable_features` and the JS key
each state with a joined string (`cells.join(';')`). The Encantis version hashes
integer cells. As `REPORT.md` §3 found for the generator, the representation buys
most of the gain.

**Size [ran]:**

| Artifact | Bytes | gzip -9 |
| --- | ---: | ---: |
| `layout.wasm` | 1,824 | 903 |
| `features.wasm` | 2,403 | 1,151 |
| MoonBit `dist/gen.wasm` (the whole generator), for scale | 137,415 | 54,882 |

**Source size [ran]** (tokens, comments excluded; same counting rules as `REPORT.md` §4):

| Kernel | JS | MoonBit | Encantis | Encantis / MoonBit |
| --- | ---: | ---: | ---: | ---: |
| mulberry32, hash, base 36, round, toFixed, layoutKey | ≈280 | ≈640 | 1,367 | 2.1× |
| `reachableFeatures` | 572 | 579 | 1,549 | 2.7× |

The extra code is all bookkeeping that MoonBit and JS get for free:

- byte-by-byte JSON writers in place of string interpolation;
- digit reversal;
- a hash set with an arena;
- deque compaction;
- three parallel arrays in place of `Array[Cell]`;
- buffer offsets that JS must agree on.

## 3. Memory model and old Safari

- **What Encantis emits [ran].** Validating with wabt, every post-MVP feature off:
  - `layout.wasm`, `features.wasm` and a `Math.pow` import test are **plain MVP**.
  - Across the compiler's 30 working examples, the only features used are bulk
    memory (`memset`/`memcpy` lower to `memory.fill`/`memory.copy`) and
    multi-value results (functions that return tuples).
  - SIMD appears only for `i128`/`u128` and up.
  - Nothing uses GC, tail calls or exceptions. Linear memory is all there is: the
    language "owns memory" (`docs/memory.md`).
- **iOS 15.8 [inferred, from memory; not verified here].** Safari 15 has wasm
  MVP, multi-value, sign extension, bulk memory, reference types and saturating
  float-to-int.
  - It lacks SIMD (Safari 16.4) and GC and tail calls (Safari 18.2).
  - So Encantis output runs on the iPad mini 4 as long as the code avoids 128-bit
    integers.
  - I could not run WebKit here, and V8 in Node 22 no longer lets wasm-gc be
    switched off.
- **MoonBit's own linear-memory backend (`--target wasm`) doesn't fill this gap
  [ran].**
  - It builds the unchanged generator (186 KB) and matches all 120 Journey keys.
  - Its runtime uses SIMD (`i16x8.eq` and `v128.load` in string routines), so the
    module won't even compile on Safari before 16.4.
  - In Node it is also the slowest MoonBit build: 474 ms per level, against 88 ms
    for wasm-gc and 190 ms for the JS build.
  - The JS build stays MoonBit's only iOS 15 path.
- **Cost of manual memory [read], [inferred].**
  - Without `memory-grow`, every buffer is a fixed static reservation. My
    `features.wasm` starts at 235 pages (15 MB).
  - The host could grow exported memory from JS, as a workaround.
  - Compile time grows with static size: 9.7 s for 16 MB of zeroed `data`,
    against 1.0 s for the same file with 64 KB buffers **[ran]**.
  - The generator allocates candidate boards freely. A port would want a bump
    arena that resets per `generate()` (or per candidate) and assumes nothing is
    live across calls. That fits, because generation is a pure function. But peak
    memory per level is unmeasured.

## 4. Language features the workload needs

| Need (count in `src/core`) | MoonBit | Encantis today | Port cost |
| --- | --- | --- | --- |
| Dynamic arrays (≈190 `Array[...]`, ≈146 `push`) | `Array[T]` | None; no generics, so one hand-written vector per element type (i32, f64, and paths of cells) | High |
| Arrays of arrays (`Array[Path]`, `Array[Path?]`) | Native | Offsets into an arena plus length tables | High |
| Hash maps and sets keyed by state (9 `Map[...]`, 6 of them `String`-keyed visited sets) | Insertion-ordered `Map` | Hand-written: my seen-set is about 50 lines; an insertion-ordered map is more | Medium per site |
| Stable sort with comparators (7 sites) | `stable_sort_by` | No callable function pointers, so a sort per site, or a sort on (key, index) | Medium |
| Closures capturing mutable locals (≈25 local fns in `weave.mbt`, 11 in `hex.mbt`) | Native | None; lift each to top level with state in globals or a context struct in memory | High, and error-prone |
| `Option` (≈155 uses) | Native | `?T`, `??` and `if let` exist (`optional.ents` works) | Low |
| ADTs | Some | Enums don't compile | Medium (tag and fields by hand) |
| Strings (seeds, set codes, layout keys) | `String`, `StringBuilder` | Bytes only; ASCII is enough here (seeds and keys are ASCII, so bytes equal UTF-16 code units) | Medium (writers as in `layout.ents`) |

**Estimate [inferred].** The two kernels ran 2.1–2.7× MoonBit's size. Applied to
the 35k-token core, a port comes to roughly 75–95k tokens. On top of that comes a
2–4k-token runtime: vectors, an arena, hash maps, sorts and number formatting. The
builders (`weave`, the Hex builder, `gridgen`) are where closures and nested
arrays are densest, so they would be the worst of it.

## 5. Exact numeric parity with JS

- **i32 wrapping [ran].** u32 `*`, `+` and `^` compile to `i32.mul` and the like,
  which equals `Math.imul`. `>>` on u32 is `shr_u`, which equals `>>>`. `f64(u32)`
  is `convert_i32_u`. mulberry32 matched 2M draws on the first build.
- **`toString(36)` [ran].** About 20 lines of digit writing.
- **`Math.pow` [ran].** Encantis can import it from the host:
  `import "Math" "pow" func pow(x: f64, y: f64) -> f64`, instantiated with `{ Math }`.
  - This is **exact by construction**: the same engine's `Math.pow`.
  - MoonBit wasm-gc uses its own fdlibm port, which matched on tested values but
    carries no guarantee.
  - The cost is a host call per `pow`. That's negligible: two call sites in
    `gridgen`.
- **`toFixed` [ran].** The same scale-and-round as MoonBit matched V8 on 200,000
  values. It could also be imported as a tiny JS helper, to be exact by
  construction.
- **`Math.round` and `Math.floor` of negatives.** Both are yours to write, and
  `−0` will bite (§2). Integer `/` is truncating `div_s`, so Hex `floor(r / 2)`
  needs care. My kernel relies on `r ≥ 0`.

On parity, Encantis is at least as good as MoonBit, because host imports give exact
`Math` functions.

## 6. JS interop and glue

- **MoonBit wasm-gc** can't share memory with JS. Strings need JS String Builtins,
  which Node 22 lacks. So `src/gen` pushes one code unit per call in and reads one
  int per call out (`in_push`, `out_get`) **[read]**.
- **Encantis exports linear memory.** The glue writes a whole board with one
  `new Int32Array(mem.buffer, in_ptr(), n).set(words)` and reads results through a
  `Uint32Array` or `TextDecoder` view **[ran]**. That is simpler and faster than
  the per-element calls.
- **The trade.** The buffer layout is an unchecked contract between the `.ents`
  file and the JS: there is no generated binding, and offsets are by convention.
- **Board size.** The game's boards are small, so interop cost doesn't decide
  anything here. `REPORT.md` measured MoonBit's glue at about 0.07 ms per frame.

## 7. Performance and binary size for a full port [inferred]

- **Speed.** With the same representation, linear-memory wasm with no GC should
  run at least as fast as wasm-gc. It could be faster on allocation-heavy builders
  if arenas replace GC. On iOS 15 it would replace MoonBit's JS build, which is
  about 2× slower than wasm-gc in Chromium (199 vs 93 ms per board). The likely
  gain on the iPad is around 2× on generation. I haven't measured JSC on an A8.
- **Representation matters more.** My `reachableFeatures` was 5× faster than
  MoonBit wasm-gc, and how it keys states is the likely reason: string keys there,
  hashed integer cells here.
- **Size.** Small. The kernels are 1–2 KB, and a full generator would plausibly
  be 40–80 KB, below `gen.wasm`'s 137 KB. There's no runtime or GC to ship, but
  the hand-written runtime adds some back.

## 8. Tooling maturity and risk

| | MoonBit | Encantis |
| --- | --- | --- |
| Compiler status | Complete; builds the whole core on three backends **[ran]** | Two-thirds of examples compile on the newest branch, none on `fts`; closures, enums, generics, `memory-grow` and function-pointer calls are missing |
| Activity | Weekly releases, with breaking churn (`REPORT.md` §5) | No commits in the ~6 months to this review; newest branch is a crypto-challenge prep branch, not `main` |
| Errors | Good | Mixed: clear for type, bounds and `def` misuse; parse errors list every alternative; codegen bugs surface as invalid WAT or a TS stack trace |
| Testing | `moon test` | Inline `test` blocks, run in-process (`examples.test.ts` silently skips files that don't compile) |
| Users | Small but growing | One author; editor support (LSP, VS Code) is surprisingly complete |

Betting the only generator on Encantis means also owning its compiler.

## 9. Code size and clarity

For the same algorithms, Encantis is 2–2.7× MoonBit's size, and MoonBit is
already about the size of the JS (§2). Some of it reads well:

- the hot loops are easy to read;
- `break when` and `return when` keep control flow flat;
- there is no hidden allocation or GC.

The bookkeeping isn't clear, though. Parallel arrays, buffer offsets, a hand-rolled
hash set and function-scoped names that must stay unique all obscure what the code
does. The `weave` builder, which leans on closures over mutable state, would get
much worse.

## 10. Recommendation

**Don't switch, and don't build an Encantis fallback for iOS 15.**

- **A full switch** costs a 2–2.7× rewrite of a parity-critical core, on a compiler
  missing closures, enums, generics and growable memory, that has been quiet for
  six months.
- **A fallback-only hybrid** (Encantis MVP on iOS 15, MoonBit wasm-gc elsewhere)
  has all of that cost plus a second full core to keep bit-identical. The prize is
  about 2× on one device that already works through the JS build.

Instead:

1. **Take the representation win in MoonBit.** `assist.mbt` keys
   `reachable_features` states with `cells.map(c => c.to_string()).join(";")`.
   Hashing integer cells into a set with exact comparison is what made the
   Encantis version 5× faster than wasm-gc. The fix helps the iOS 15 JS build too.
   The solver visited sets in `square.mbt`, `hex.mbt` and `mech.mbt` already use
   compact `key_of` strings (one char per value), so there is less to gain there
   [read].
2. **Use host `Math.pow` if fdlibm parity ever worries you.** MoonBit can import
   `Math.pow` through FFI on wasm-gc as well, which makes `pow` exact by
   construction on both backends **[inferred]**.
3. **Revisit Encantis** once it has closures or at least callable function
   pointers, enum codegen, `memory-grow`, and a vector/map story (generics or
   comptime). It would make sense as the single core for all browsers: one
   MVP build that runs everywhere, with no JS fallback. At that point
   `moonbit/encantis/` is a ready parity harness to start from.

## What I could not check

- **Real WebKit or iOS.** Safari feature support is from memory. I verified the MVP
  claim by validating the binaries with wabt, but couldn't run them on JSC.
  V8 in Node 22 can't disable wasm-gc, so I couldn't simulate the no-GC path either.
- **Encantis history.** The clone is shallow, so I can't see commit rates. I can
  only say the remote has nothing newer than 2026-05-05.
- **A fair language-only benchmark.** The MoonBit and Encantis `reachableFeatures`
  use different state representations.
- **A full-generator port.** The size and speed figures for a full generator are
  extrapolations from two kernels.
