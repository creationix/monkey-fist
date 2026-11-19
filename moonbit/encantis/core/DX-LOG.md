# Developer experience log: the Encantis port of the MoonBit core

Every engineer on the port appends here. Each entry records:

- each friction point: what you wanted to write, what Encantis made you write, what it
  cost, and whether a planned feature (closures, function values, comptime values, enums)
  would remove it;
- each confusing or wrong error message, verbatim;
- each compiler bug, with its repro under `bugs/`;
- tooling: check speed, hover, the test runner, the formatter;
- what was pleasant.

Counts matter: say how many times each workaround occurs.

## 18 Nov: mapping the core (no port code yet)

- **Compiler:** a84f5e64d434f6cebc937ecfe946c4790e4a70bd (origin/claude/generics-modules).
  origin/main had no `lib/vec.ents` yet.
- **Probes:** small files, not committed, kept in the mapper's scratch
  (`/home/user/mf-core-scratch/probes`).
- **The map:** `/home/user/mf-core-scratch/MAP-CORE.md`.

### Counts from the map: what the port will have to work around

| Workaround | Sites in `src/core` (without the Journey table) | Removed by |
| --- | ---: | --- |
| A local function capturing and mutating its enclosing locals becomes a top-level function over module globals (or a context struct) | 42: weave 23, hex 11, square 3, mech 2, gridgen 2, metrics 1. 7 are recursive | closures (non-escaping is enough) |
| A lambda passed to `map`, `filter`, `makei`, `iter().any` or `map_or` becomes a loop | about 70 | closures |
| A comparator lambda becomes a top-level `before` for `lib/sort`; a captured run-time `p0` becomes a global | 7 comparators, 2 of them capturing | closures (capture only); function values are not needed |
| `T?` of a struct becomes `?*T` on the stack; `Int32?`, `Bool?` and `(Int32,Int32)?` become sentinels | about 35 struct option uses; 6 scalar options | enums, or optionals of any type |
| `Path?` becomes `?[]Pt`; `Array[Int32]?` becomes `?[]i32` | 41 and 8 | nothing needed: this works |
| An index read with a run-time index on a slice needs `?? x` or `if let`; a write needs `if let p = &s[i]`. The alternative is a `[*]mut` table (unchecked) | about 720 reads and 170 writes | a trapping index (not planned) |
| A string-keyed visited set becomes `Map([]u32, i32)`/`Set([]u32)` with arena-copied keys, or a hand hash | 7 | — |
| String building for hashing becomes streamed FNV-1a; `layout_key` needs digit and base-36 writers | 9 concatenations | — |

### Error messages met (verbatim)

1. **A nested function** gives a parse error that lists every alternative and does not say
   that functions are declared at module level. It took 1 minute, because the reason was
   known in advance. Closures would remove it.
   ```
   > 3 |   func inner(k: i32) -> i32 => k + total
   Expected "}", not a keyword, "false", "true", "'", "b\"", "x\"", "\"", a digit, "0d", ... (about 60 alternatives) ... or "??"
   ```
2. **A lambda** (`xs.map(|x| x + 1)`) gives the same kind of 60-alternative parse error.
3. **Calling a function-typed parameter** gives a clear message that names the way out:
   `calling a function value is not supported yet: only a function named directly, or a
   comptime function parameter (comptime f: (i32) -> i32), can be called`.
4. **`func zeros(comptime n: u32) -> [n]i32`** gives `Expected "?", "!", a digit, or "_"`.
   This is correct per reference §8.8, which says it is a syntax error, but terse: it does
   not say that comptime value parameters are not supported yet. The message for
   `comptime n: u32` without `[n]` does say so.
5. **Index reads and writes.** Both messages are clear:
   - `runtime index on []i32 requires 'if let' or '??' (no optional type for i32)`;
   - `writing to an element of a slice needs its index checked: use if let on its address
     (&s[i])`.
6. **An empty range of a slice.** `let gone: []Pt = path.items()[0..0]` gives
   `cannot assign ?[]Pt to []Pt`. This is correct per reference §4.8 (on a slice, any
   range but `s[..]` is optional), but surprising for an empty range, which cannot fail.
   It cost 2 minutes. Written `path.items()[0..0] ?? path.items()`.
7. **`a ?? b ?? c`** gives a parse error at the second `??`, listing alternatives that end
   `... "|", "||", or "&&"`. It does not say whether `??` chains. Written as one `??`.
8. **An `enum` that nothing uses** passes `check` ("OK: 2 declarations"), although enums
   are design only (reference §2.9). This is not wrong, but nothing warns until one is
   used.

### Tooling

- `check` of a probe that imports 5 library modules (93 declarations): 0.66 s wall.

### Pleasant

The first probe built and ran correctly on its second compile (the first was the range
above). It used:

- a `Vec` of structs;
- `lib/sort` with a comptime comparator;
- `Map([]u32, i32)` through `lib/set`'s `hash_words`;
- a `?*T` result;
- a `[]?[]Pt` parameter;
- a host import of `Math.pow`.

These also work:

- a `data` table of structs with string fields;
- `&&` and `||` short-circuit;
- import cycles are refused with a message that names the files:
  `Import cycle detected: a.ents → b.ents → a.ents`.

## 18 Nov: mapping the oracles and the measurements (no port code yet)

- **Compiler:** a84f5e64d434f6cebc937ecfe946c4790e4a70bd (origin/claude/generics-modules).
- **The map:** `/home/user/mf-core-scratch/MAP-ORACLES.md`. The harness to check and time
  an Encantis core with the existing tests, unchanged: `oracle/` (see its README).
- **Probe:** a 40-line module with the 12 exports of `src/gen` (scratch:
  `/home/user/mf-core-scratch/abi-probe/probe.ents`).

### Pleasant

- **The ABI ports as it is.** Exports of `i32` and `f64` with the MoonBit names build to
  a 955-byte module with no imports. `web/generator.js` and the unchanged tests drive
  it: level 1 passes, levels 2 to 120 are reported. No JS shim is needed.
- **Tooling speed.** `check` of the probe: 0.12 s. `check` of builder-v2's `weave.ents`
  (240 declarations, 6 modules): 0.99 s; `wasm`: 1.10 s.

### Friction

1. **Run-time indexes, 4 of 4 in the probe.** Wanted `inbuf[n] = c` and `outbuf[i]`.
   Wrote `if let p = &inbuf[n] { p.* = c }` (2 writes) and `outbuf[i] ?? 0` (2 reads).
   It cost 2 minutes. The messages were clear and named the fix:
   ```
   writing to an element needs an index known to be in range: use a constant or ranged index, or if let on its address (&xs[i])
   runtime index on *[65536]i32 requires 'if let' or '??' (no optional type for i32)
   ```
   A trapping index would remove it (not planned).
2. **A host import breaks the glue, silently in the game.** `import "Math" "pow"` builds
   and is exact against V8. But every loader instantiates with `{}` (6 places: see
   `oracle/README.md`), and that throws
   `TypeError: WebAssembly.instantiate(): Import #0 module="Math": module is not an object or function`.
   The tests fail loudly. In the game, `web/generator.js` catches the error and quietly
   loads the MoonBit JS build instead. So there are two choices: port fdlibm `pow` into
   the module (2 call sites), or change the 6 loaders. The MoonBit builds ignore the
   extra import object.
3. **No memory growth.** `memory-grow` is "not yet implemented" (reference §10.3), and
   `lib/stack` is a fixed 256 KiB. The core needs a stack sized at compile time for its
   largest case, the colossal maps (40x40 square, 32x32 Hex); builder v1 alone peaked at
   605 KB on 40x40. Resizing today means copying `stack.ents`. Comptime value
   parameters (`comptime n: u32` with `[n]T`) would make the size a parameter instead of
   a copy.

## 18 Nov: writing the port plan (no port code yet)

- **Compiler:** cb3fc4f3514fc834b4fb6c3e2ea5fcfd11a720da (origin/claude/generics-modules,
  which merges claude/language-decisions on top of the maps' a84f5e6). origin/main
  (584178d) still had no `lib/vec.ents`.
- **The plan:** `PORT-PLAN.md`.
- **Probes:** `/home/user/mf-core-scratch/plan-probes/`, p1 to p6.

### Pleasant

- **A random generator held by pointer reads like MoonBit.** `type Rng = (a: u32)` used
  through a `*mut Rng`, with `r.below(n)` and `r.next()` as method calls. It built to
  226 bytes with no imports and gave the JS's first draw (p1).
- **The f64 bits for an fdlibm `pow` come from punning a scratch word.**
  `scratch.f64[0] = x; scratch.u32[1]` gives `0x3ff80000` for 1.5 (p1).
- **The ABI's words are the board's memory layout.** A `[]Pt` and a `[]Mirror` are
  zero-copy views over the level words that `in_push` fills (p2). So a level that must
  outlive its scope is kept as its own output words, and read back with no copy
  (PORT-PLAN §3.3).
- **A fixed-size list in memory is checked without a fallback.** A `*[6]i32` indexed by
  `k % 6` is proven in range: no `??`, no `if let` (p5).
- **builder-v2 rebuilds byte for byte at cb3fc4f** (18,384 bytes) and is still exact:
  249 cases, 0 mismatches.
- **Tooling.**
  - `check` of a one-module probe: 0.12 s.
  - `wasm` of builder-v2's `weave.ents` (6 modules): 0.89 s.

### Friction

1. **A cast binds tighter than `&`, and `&` of a pointer value is accepted: a silent wrong
   address.**
   - Wanted: a view of the words from index k on, written
     `&base[k] as [*]Pt`. That is `&(base[k] as [*]Pt)`: the *value* of word k cast to
     a pointer, then `&` of the pointer, which is the pointer.
   - It compiled and summed garbage: 386132480 where 1009 was expected.
   - Wrote `(&base[k]) as [*]Pt`. It cost 5 minutes.
   - The same mistake with an integer cast, `&base[1] as u32`, is an error, so only a
     cast to a pointer type is silent. That is exactly the cast a zero-copy view needs.
   - Repro: `bugs/01-address-of-pointer-value.ents`.
   - The precedence is as documented (reference, Precedence: unary 11, cast 12). The
     reference's `&` (4.7) names a literal or an element, not a pointer value. The
     checker's own message names "a pointer":
     ```
     & requires a literal, a pointer, or an element of an array, slice or many-pointer
     ```
   - The plan confines the cast to one helper in `abi.ents`.
2. **A small list cannot live in registers.**
   - Wanted: `(len: u32, items: [6]i32)` as a local, for `hex_build`'s `choices` and
     `dirs`, so that the hottest loop (`shape`, 13% self time) does not allocate.
   - Got (p4), twice:
     ```
     dynamic index on value type [6]i32 — use a pointer or slice for dynamic access
     ```
   - The plan takes a `*mut [6]i32` once per call, indexed by `k % 6`.
   - Comptime value parameters (`comptime n: u32` with `[n]T`) would not put such a list
     in registers. They would make one `Fixed(T, n)` with a proven index stand for every
     size, where today each size is written out (PORT-PLAN §10).
3. **`origin/main` does not have the container library yet.** The port has to pin a
   branch commit and copy `lib/` into the port, as builder-v2 did. The stack is copied
   anyway, to make it larger: 256 KiB is too small for this core. A `Stack(comptime n)`
   would make that a parameter.

## 18 Nov: G1, foundations (lib, random, pow, codes, layout key, Journey table, keys, ABI)

- **Compiler:** 03225bc441cf37ce1b109e7839ecedd7470dab34 (origin/main, which now merges
  #29 to #31 and has `lib/vec.ents`). Its tree is cb3fc4f's (`git diff cb3fc4f 03225bc` is
  empty), so the plan's pin holds; builder-v2's `weave.wasm` rebuilds byte for byte.
- **Files:** `lib/` (copies; stack 16 MiB with `clear()` and `peak()`), `random.ents`,
  `fmath.ents`, `board.ents`, `keys.ents`, `codes.ents`, `journey.ents` (generated),
  `abi.ents`, `test/g1.ents`, `build.sh`; `oracle/ref.cjs`, `wasm.cjs`, `capture.cjs`,
  `check-g1.cjs`, `check-all.sh`, `size.cjs`, `gen-journey-ents.cjs`.
- **Oracle:** `check-g1.cjs`: 8 checks, 4.4M comparisons, all pass (2.2 s; 3.9 s with the
  inline tests). `--js` passes; `--controls`: 24 of 24 kinds of output fail on one spoiled
  value and name the case.
- **Size** (`oracle/size.cjs`, comments and tests left out): the ported code is 540 lines and
  5,290 tokens against MoonBit's 563 and 3,609 (1.47x tokens); with its 55 lines of import
  declarations (506 tokens) and 13 lines of restated types (292 tokens), 1.69x. Imports and
  types are 9% of the group's tokens. New, with no MoonBit counterpart: `fmath.ents` (284
  lines, 2,139 tokens) and `keys.ents` (89, 1,026). The generated Journey table: 5,542 tokens
  against MoonBit's 5,651.

### Friction

1. **A comptime function parameter is passed on by hand at every call.** The text writers
   take their sink as `comptime put: (S, u8) -> S`, and each nested writer call repeats it:
   `s.dec(o.min, put)`, `s.text(o.seed, put)`. 18 times in `codes.ents`. A run-time function
   value held by a writer, or a closure, would let it be given once. 0 minutes lost; it is
   only noise.
2. **`parse_code` without split or a regex.** MoonBit: `t.split("-")` and nine `guard digits(...)
   is Some(x) else { return None }`. Encantis: a `part(t, k) -> (s, next)` helper called nine
   times with named destructuring, `digits` returning -1 for none (`// enum:`), and
   `return 0 as ?*SetOpts when ...` 7 times (there is no `none` to write). Enums with a
   `let … else` guard would make it MoonBit's shape. 15 minutes.
3. **No literal for an empty optional slice.** `let n: ?[]Pt = 0` gives `cannot assign int(0)
   to ?[]Pt`, and `0 as ?[]Pt` gives `cannot cast int(0) to ?[]Pt`. Wrote
   `(0 as [*]Pt, 0:u32)` once, in `board.gone()` (`// enum:`). 5 minutes. `0 as ?*T` works
   for pointers. Enums (`Option(T)`) would remove it.
4. **Writes after an `assert` are not proven.** `assert n < room` does not narrow `n`, so
   `inbuf[n] = c` after it is refused. Wrote `if let p = &inbuf[in_n] { p.* = c } else {
   assert false }`: 4 sites in `abi.ents` (`in_push`, `put`, `putf`, `end_count`). A trapping
   index, or narrowing by `assert`, would remove them. 3 minutes.
5. **Reserved words met as names:** `func int(...)` (the decimal writer), `m.set(c, s)`
   (`SqMirrors::set`) and `let set = keyset(...)`. 3 sites, 4 minutes; the messages did not
   say a keyword was the cause (below).
6. **`def` names are lower case.** The plan's `MAX_W`, `MAX_H`, `MAX_AREA` became `max_w`,
   `max_h`, `max_area`. 3 sites, 1 minute.
7. **No address of a field.** `put_level(l: *Level)` wanted `layout_key(&l.board)`. The
   writers take the `Board` by value (11 wasm values) instead. 1 site, 3 minutes.
8. **`set` destructures into variables only.** `set (slides: l.slides, ...) = stats4(r)` is a
   parse error. `read_level` builds the `Level` with eight `r.next()` arguments, relying on a
   constructor computing its values in the order written (reference 2.8). 1 site, 3 minutes.
9. **A value array literal is not iterable.** `for v in [o.min, o.max, o.w, o.h, o.count]`
   gives `cannot iterate over [5]i32: use a count, a slice, or a pointer to a fixed-size
   array`, and, in the generic instance, a second error, `argument 1: cannot assign u32 to
   i32`. Unrolled. 1 site, 2 minutes.
10. **A `let` belongs to its function.** `let c = units[lo + i] ?? 0` in one loop body, then
    `for c in seed` later: `'c' is already declared: a loop variable cannot reuse the name of
    a variable in scope`. And a local named like an imported function (`let at = ...` beside
    the imported `at` of SqMirrors): `'at' is already declared in this scope`. 2 sites,
    2 minutes.
11. **fdlibm `pow` needs the bits of an f64.** There is no reinterpret builtin: five helpers
    over an 8-byte scratch cell (`high`, `low`, `of_words`, `with_low`, `with_high`), 16 lines,
    as the plan's probe p1 found. There are no hex float literals, so `0x1.0p1023` and
    `0x1.0p-1022` are written as decimals. The port itself: 284 lines with the constants and
    Sun's notice, about 25 minutes, and it compiled and matched a JS transliteration of the
    same fdlibm on 210,001 inputs at once. The hour after went to V8 (below).
12. **The canonical type block, and imports.** Each module copies the lines of the block it
    needs: `codes.ents` 4 types, `abi.ents` 4, `journey.ents` 1 (13 lines, 292 tokens). The
    test entry restates 11 type lines and 74 import lines, not counted. `KeySet(W)` and
    `KeyMap(W, V)` are generic, which makes them importable as `"KeyMap" func KeyMap(...) ->
    type`: a non-generic type cannot be imported, and a module using it would restate its
    fields.
13. **The `&` and `as` precedence** (bugs/01) cost nothing this time: the plan warned of it,
    and the cast is written twice, in `abi.ents`'s `pts_at` and `mirrors_at`.

### Error messages (verbatim)

1. A function named `int` (a reserved word): the message does not say so.
   ```
   > 102 | export func int(comptime S: type, s: S, v: i32, comptime put: (S, u8) -> S) -> S {
   Expected a digit, "0d", "0o", "0b", or "0x"
   ```
2. A method named `set`, and a variable named `set`:
   ```
   > 92 |     m.set(x.cell.r * b.w + x.cell.q, x.kind)
   Expected not a keyword, "bool", "f64", "f32", "u8", ... "i512", "*", or a digit
   > 106 |   let set = keyset(W, keys, words)
   Expected not a keyword or "("
   ```
3. A `def` with an upper-case name: `Expected "a".."z"` at the `M` of `def MAX_W = 48`.
4. Inference that a typed element cannot help: `r.one_of([10:i32, 20, 30, 40, 50])` gives
   `cannot infer T for 'one_of' from untyped literals: write r.one_of(i32, ...) or give a
   literal its type`. A literal was given its type; an array literal is untyped as a whole
   (reference 8.2), which the message's second remedy does not allow for.
5. A parenthesised cast as an assignment target, `(cell as *mut Rng).* = Rng(seed)`: a parse
   error at `=` that lists 60 alternatives.
6. A parameter named like a `def`, with another type: `no field 'ptr' on type u32` at
   `words.ptr` (bugs/02). With the same type there is no message at all.

### Bugs

- **bugs/02-parameter-named-like-a-def.ents (silent wrong code).** With `def limit = 7`,
  `func f(limit: i32) -> i32 => limit + 1` returns 8 for `f(100)`: the def replaces the
  parameter in the body. A parameter named like a global wins, as it should (101). A `let` or
  a loop variable of a def's name is an error; a parameter is neither an error nor itself.
  Met in `abi.ents` as a type error (`def words` beside a `words: []i32` parameter); worked
  around by renaming the def to `room`. 5 minutes.

### Found beyond the language (parity hazards for later groups)

- **V8's `Math.pow` is not textbook fdlibm.** Its last step is `r = z*t1 / ((t1-2) -
  (w+z*w))` where fdlibm has `z*t1/(t1-2) - (w+z*w)` (V8 12.4, `src/base/ieee754.cc`), and it
  returns NaN for `pow(1, NaN)` and `pow(+-1, +-Infinity)`. `fmath.ents` follows V8: 0 of
  230,530 differ, and 0 of check 3's 141,868. MoonBit's `@math.pow` is textbook fdlibm, so
  `dist/gen.wasm`'s `target_challenge` is one ulp off the JS's on 316 of 10,001 difficulties,
  and `knots_for`'s product on 392. Parity holds because both are rounded before they decide
  anything; G7 should know it.
- **`metrics.mbt`'s `to_fixed` is not `toFixed`.** Scale-and-round rounds the product first,
  so 3/160 = 0.0187499999999999993 gives 0.0188 where `toFixed(4)` gives 0.0187: 60 of 90,300
  ratios, 312 of 76,860 products. `fmath.ents` decides the half on the exact product (Dekker's
  two-product) and matches `Number(x.toFixed(4))` on 1M values. G6's `interaction` uses it.
- **`floor_div`** of random.mbt overflows for `a` below `-(2^31 - b)`; `~(~a / b)` does not.
- **Codes.** The JS trims every JS space and upper-cases U+0131 and U+017F (and the
  ligatures) to ASCII; MoonBit trims `\t\n\r ` only and upper-cases ASCII only. Of check 5's
  codes, 115 are taken by the JS and refused by MoonBit; `dist/gen.wasm` refuses all of them.
  The port follows MoonBit.

### Tooling

- `check test/g1.ents` (10 modules): 1.0 to 1.1 s. `wasm`: 1.0 to 1.1 s, 23,804 bytes (10,741
  gzipped), the same bytes every time. `wasm -O`: 2.3 s and larger, 25,071 bytes.
  `test` of one module: 0.3 to 0.8 s. `build.sh` (11 modules tested, one wasm): 5.5 s.
- `hover` works by `file:line:col` and `file:line:name`; the `file:name` the help offers gives
  `Error: expected <file>:<line>:<col>`. Over a generic call it names the instance
  (`calls base36(S = *mut Vec(u8), put = collect)`), which helps. Types are shown written out
  in full: `*SetOpts` is `*(journey: bool, grid: u8, min: i32, ..., seed: []u8)`, and
  `*mut Vec(u8)` is `*mut (ptr: [*]mut u8, len: u32, cap: u32)`.
- `fmt` was tried once and not used: it writes `n:u32` where the library and this port write
  `n: u32`, and `fmt --check` flags the compiler's own `lib/vec.ents`, `sort.ents` and
  `stack.ents` (102 of the lines of `codes.ents` would change).

### Pleasant

- **One writer, three sinks.** The set code, the custom seed and the layout JSON are each
  written once, generic over a comptime sink: `hash_byte` streams FNV-1a,
  `collect` fills a `Vec(u8)`, `put_byte` writes ABI words. A method call works on the
  comptime parameter itself: `s.put('[').dec(p.q, put).put(',')`. The layout key hashes both
  ways in one pass through a tuple sink, `Two(plain, prefixed)`: no text is built, where
  `layout.ents` wrote the JSON into a 1 MB buffer and hashed it twice.
- **fdlibm compiled and was exact on first build**, against a JS transliteration.
- **The Journey `data` table** of 120 structs with string seeds built and read back on the
  first try (`data specs: *[120]Spec = [...]`, generated).
- **Zero-copy views of the ABI words**: positions and levels are read as `[]Pt` and
  `[]Mirror` over the words; `read_level` gives back a `Level` over a kept copy of
  `put_level`'s words, which G7's best-so-far and current level need.
- **Generic types across modules**: `KeyMap(i32, i32)` is used from the test entry with a
  three-line import.
- **The bump stack with `clear()` and `peak()`**: every hook starts at the base; check 8
  traps the reserve on purpose and the next call works.

### Where `comptime n: u32` with `[n]T` would help G1

The containers, as PORT-PLAN §10 says, and in G1 only one of them so far:

- **The stack.** `lib/stack.ents` is copied to change two numbers (`capacity` and the size of
  `space`, which must agree) and to add `clear()` and `peak()`. As `Stack(comptime n)` the size
  would be an argument, and the copy would hold only what the core adds; a second arena (a
  keep region the search scopes do not reset) would be one more instance, not a second copy.
- **Not the keys.** `keyset(W, keys, words)` is sized by a search's budget, which is known only
  at run time, so its reserve stays a run-time argument.
- **Not the ABI buffers.** `inbuf`, `outbuf` (65,536 words) and `outf` (64 doubles) are three
  `data` arrays whose writes are checked at run time (`if let p = &outbuf[out_n]`): the
  index is a count that grows, so a ranged type would not prove it either.

### Counts (tags in G1's files)

| Tag | Sites |
| --- | ---: |
| `// closure:` | 0 |
| `// fnvalue:` | 0 |
| `// enum:` | 3 (`gone()`; `digits` returning -1; `parse_code`, with 7 returns of `0 as ?*SetOpts`) |
| `// comptime-n:` | 1 (`lib/stack.ents`: the copied stack, 16 MiB) |
| `// unchecked:` | 10 (`one_of`, `index_from`, `last`, 3 of the `SqMirrors` slope table, `has_dup`, 2 in `keys` probing, the `abi` reader) |
| `// reserve:` | 3 (`sq_mirrors`'s keys, `keyset`, `keymap`) |
| casts (`as i32`, `as u32`, `as u8`, `f64(...)`, `i32(...)`) | 69 (fmath 20, abi 18, board 9, random 10, keys 6, codes 6) |

## 18 Nov: review of G1 (adversarial)

- **Compiler:** 03225bc441cf37ce1b109e7839ecedd7470dab34, unchanged (origin/main had not moved).
  Reviewed head 790a83e. The fixes are in 6294c9d and the commit after it.
- **Reran first:** `build.sh` gave G1's `test/g1.wasm` byte for byte (23,804 bytes), and
  `check-all.sh` passed (4.4 s). `bugs/01` prints "8 12" and `bugs/02` "8 101", as their
  headers say.
- **Extended:** `oracle/check-g1-wide.cjs` (15 s, 21.5M comparisons; `--js` passes; `--controls`
  25 of 25). It has 10,000 seeds, 3.8M `pow` pairs over the whole range, and `to_fixed` for 0
  to 8 decimals. It puts every UTF-16 code unit at 7 places in a code. It adds 79 boards from
  the JS at 9e69e3a (`fixtures/g1-extra-boards.jsonl`): 4x4, 8x8 with mechanics, strips,
  48x48 colossal square and Hex with up to 223 ropes, and random codes, each checked by JSON,
  key, level words, decode, 20 random-play positions and SqMirrors. It also fills keys to
  their exact reserve and tests the limits. It needed one new hook, `t_alloc`; the rest are
  G1's hooks and converters (`check-g1.cjs` is now `require`-able).
- **What it found in G1's wasm:** 54,206 failed comparisons and one hang.
  - `to_fixed`: 54,199 values, all with x * 10^d >= 2^53, e.g. `67215938362.95128` to 7
    decimals gave `...95129`. The generator's own values (challenge to 3 decimals,
    interaction to 4) are far below that and were never wrong; the function's comment
    promised every x below 1e21.
  - `keys`: a reserve whose byte size passes 2^32 wrapped. 2^28 + 1 keys gave a table of 0
    bytes; 2^30 + 1 words gave a pool of 4 bytes, after which the map's own header was
    overwritten (count 16,711,680). A reserve of 2^32 - 1 keys looped for ever in `keyset`.
  - `lib/stack`: `alloc` and `extend` add n to the top before the bound, so a sum past 2^32
    passed (`bugs/03`; upstream's `lib/stack.ents` has it too). Through it, a position whose
    W is -1 made `sq_mirrors` write -1 over all memory after the stack before the access out
    of bounds. From then on all 120 Journey specs read wrong in that instance. G1's claim
    that "the module works after a trap" held only for traps that are asserts.
  - `input_bytes`: code units past 255 were narrowed in silence, so hashing them would differ
    from `hashString`.
- **Fixed:**
  - `to_fixed` returns x from 2^53 up.
  - `alloc` and `extend` bound n by the room left.
  - `keyset` and `keymap` assert their sizes.
  - `input_bytes` asserts bytes.
  - `read_position` and `layout` bound the counts they read, and `sq_mirrors` asserts a
    non-negative area.

  `g1.wasm` is 23,976 bytes now (+172). All of `check-all.sh` passes: `check-g1.cjs`, then
  the wide check. The old wasm fails the new limits, Journey integrity after a trap
  included.
- **Agreed with the JS everywhere else:** draws (10M), hashes, base 36, `pow` (3.8M, every
  branch of e_pow.c reached by design: |y| > 2^64, |1 - x| < 2^-20, subnormal x and
  results, overflow, odd and even integer y up to 2^60), `Math.round`, `floor_div` over all
  of i32, codes and specs (with i anywhere in i32), and all 79 boards.
- **Codes, more exactly than G1 said:** the JS takes, and MoonBit (and the port) refuse,
  codes with any of 31 code units. These are the 25 spaces `trim` removes that MoonBit's
  does not (U+000B, U+000C, U+00A0, U+1680, U+2000 to U+200A, U+2028, U+2029, U+202F, U+205F,
  U+3000, U+FEFF), plus 6 letters whose JS upper case is ASCII: U+0131, U+017F, U+00DF
  (`ß` is `SS`, two letters), U+FB00 to U+FB06 (ligatures). `dist/gen.wasm` refuses all 83
  such codes of the run. The game never sends one: `web/generator.js` passes
  `E.code(options)`, a code the JS has already normalised.

### Friction

1. **No reinterpret between f64 and its bits costs run time, not only lines.**
   `target_challenge` (one `pow`) takes 140 ns in the port, 69 ns with the three scratch-cell
   helpers replaced by `i64.reinterpret_f64` in the WAT, 50 ns in MoonBit wasm-gc and 49 ns in
   the JS (`oracle/bench-g1-pow.cjs`, median of 5 processes). So the scratch cell is 2.0x of
   the port's 2.8x. The helpers are called 32 times in `fmath.ents` (`high` 8, `low` 5,
   `of_words` 8, `with_low` 8, `with_high` 3), each a store and a load through memory. `pow`
   runs once a level in `target_challenge`, but also in weave's `knots_for` (G2 and G4). None
   of the planned features (closures, function values, comptime values, enums) removes it: it
   needs a builtin, `bits(x: f64) -> u64` and `f64_bits(u: u64) -> f64`, or `as` between
   types of one size. The other 1.4x is the rest of the generated code; not looked into.
2. **u32 sizes wrap in silence.** `keys * 2`, `size * sizeof(Slot)`, `words * sizeof(W)`,
   `nr * 8`, `np * 8`, `cells * 4` and the stack's `top + n` wrap with no trap. The review added
   7 asserts (`alloc`, `extend`, `keyset`, `keymap`, `layout`, `read_position`, `sq_mirrors`)
   at about 5 minutes each, once the failure was understood (the keys one took 20 minutes to
   understand). A trapping (checked) multiply and add would remove them. No planned feature
   does.
3. **A trap names nothing.** `RuntimeError: unreachable at wasm-function[92]:0x2333`: the
   wasm has no name section, and the CLI has no option for one. To find which `assert` fired:
   `encantis compile` to WAT, then the compiler's own `node_modules/.bin/wat2wasm
   --debug-names`, and run that. About 5 minutes the first time.
4. **The copied `lib/stack` carries upstream's bug, and the fix does not go back.** That is the
   `comptime n` case in G1. As `Stack(comptime n)` there would be one file to fix (upstream).
   With the copy, the core's stack is fixed and `lib/stack.ents` is not (bugs/03 shows it).

### Bugs

- **bugs/02, a variant (silent wrong code).** An assignment to a parameter named like a def
  compiles and writes the parameter (`local.set $limit`), but a read is still the def:
  `func h(limit: i32) -> i32 { limit = 50; return limit }` returns 7. `limit += 5` does the
  same. Outside such a function `limit = x` is refused ("cannot assign to 'limit': it is not a
  variable"). A parameter named like a `data` block, a named result named like a def, and a
  local are all fine. The scan of G1's files finds no parameter named like a def, so G1 is not
  hit.
- **bugs/03, `lib/stack` alloc wraps (the library that ships with the compiler).** See above.
  Prints "16 0" at 03225bc: `alloc(16)` then `alloc(0xFFFFFFF0)` returns offset 16 and leaves
  the top at 0.

### Tooling

- `check-g1-wide.cjs`: 21.5M comparisons in 14 to 15 s, about 0.7 us each, most of it the
  JS-to-wasm call per comparison. The 79 extra boards took 77 s of JS to make; the 48x48 square
  board with mirrors and springs took 14 s.
- `encantis check test/g1.ents`: 1.2 s now (G1 said 1.0 to 1.1). The fixes compiled and passed
  the first time.
- `hover`: the help says `<file>:<line>:<col|name>`; `keys.ents:keyset` gives "Error: expected
  <file>:<line>:<col>", and `keys.ents:46:assert` gives "'assert' not found on line 46" (a
  keyword is not a name). G1 counted the first as a `file:name` form the help offers; the help
  offers `file:line:name`.
- `capture.cjs` (not run by `check-all.sh`): `valid` and `H.build` record and replay; 20 of 20
  records with a spoiled result or draw count are caught; a spoiled `$rng` state is caught.
  Its header listed a `state` field that records do not have (corrected).

### Pleasant

- G1's oracle was easy to widen. The hooks take words and give words, `same()` names every
  case, and the `--js` and `--controls` pattern carried over unchanged. The wide check needed
  one new hook.
- An `assert` with `sizeof(W)` in a generic (`assert words <= 0x40000000 / sizeof(W)`)
  compiles per instance with nothing more to write.
- `encantis compile` gives WAT plain enough to edit by hand for an experiment (the reinterpret
  build): three function bodies replaced by a regular expression.

### Where `comptime n: u32` with `[n]T` would help (the review's view)

G1's assessment holds: in G1 only the stack is a container sized at build time. The review
adds two points:

- The cost of the copy is real. `bugs/03` was fixed in the copy and is still in upstream's
  `lib/stack.ents`.
- None of the four defects above is something a comptime size would catch. They are run-time
  sizes (a reserve from a budget, counts read from the input words, a board's W and H).
  `Stack(comptime n)` needs the same overflow-proof bound.

### Counts (review)

| What | Sites |
| --- | ---: |
| asserts added against u32 wraps | 7 (`alloc`, `extend`, `keyset`, `keymap`, `layout`, `read_position`, `sq_mirrors`) |
| asserts added against narrowing | 1 (`input_bytes`) |
| scratch-cell bit accesses in `pow` (no reinterpret) | 32 calls of 5 helpers |
| tags (`grep -c "// tag:"`, after the review made `enum:` and `reserve:` greppable) | enum 3, reserve 3, unchecked 10, comptime-n 1 |
| minutes | about 45 reading, 30 widening the oracle, 25 fixing, 20 measuring |

## 18 Nov: G2, the square world (square kernel; weave reused from builder-v2)

- **Compiler:** 03225bc441cf37ce1b109e7839ecedd7470dab34 (origin/main, as for G1; it has not
  moved). `build.sh` rebuilds G1's `test/g1.wasm` byte for byte (23,976 bytes).
- **Files:** `square.ents`; `weave.ents`, `weave-board.ents` (builder-v2's `weave.ents` and
  `board.ents` at 721f6a3, the latest that changed them; the branch is at e41a984),
  `weave-rng.ents`; `test/g2.ents`, `test/weave.ents`; `oracle/check-g2.cjs`,
  `oracle/bench-g2.cjs`; `bugs/04`.
- **Oracle** (`check-g2.cjs`, against `levels.js` at 9e69e3a):
  - the 35 square boards of `reference.json` without springs, at 1,579 positions (the start,
    every plan prefix, 20 of random play): 11 kinds, 22,106 comparisons of 1,536,938 values,
    **0 failed** (26 s). `--js` passes (32 s); `--controls` 13 of 13 kinds (the 11, and the
    two below) fail on one spoiled value and name it.
  - what the generator takes beside weave: `knots_wanted(d)` for d = 0 to 400 and
    `knots_for(d)` (with `pow`) for d = -5 to 105, in steps of 0.01, and the 3 styles with
    `len_hi_of(w)` for w = 1 to 60, against `L.knotsWanted`, grid-generator.js's `knotsFor`
    and `L.STYLES`: 51,182 comparisons, 0 failed.
  - `--extra`: the 25 square boards without springs of G1's `g1-extra-boards.jsonl` (4x4 to
    48x48, up to 223 ropes), 275 positions: 3,850 comparisons of 647,544 values, 0 failed.
  - weave: `check-weave.cjs` on `test/weave.wasm` and on `test/g2.wasm` (where weave shares
    the stack with the square kernel): 249 cases, in order and in reverse, draws included,
    0 mismatches. `other-seeds.cjs` 4,980 runs (45 null), `other-sizes.cjs` 224 runs (65
    null): 0 mismatches.
  - **The port was exact on its first run**, square and weave both: no fix was needed after
    the first `wasm` that built. `check-all.sh` (G1, G1-wide, G2) passes.
- **Stack peak:** 809,980 bytes on the reference set (C11, `fewest` at 2,500), 2,872,348 on the
  48x48 board (X12, the same). Almost all of it is the `tried` keys, reserved for the budget.
- **Time** (`bench-g2.cjs` under the lock: 5 processes, best of 5 rounds each, the median over
  processes; port, MoonBit `dist/mf.wasm` and the JS interleaved in each round, values checked
  to agree; load average 2.3 to 2.8, so not a quiet machine):

  | Kernel | port | MoonBit wasm-gc | JS | MoonBit / port |
  | --- | ---: | ---: | ---: | ---: |
  | L107 casual x1000 | 13.94 ms | 15.44 | 23.79 | 1.11x |
  | L107 par (postpone, fewest 2500) | 9.21 | 11.79 | 16.78 | 1.28x |
  | L107 solve 2000 | 0.196 | 0.263 | 0.373 | 1.34x |
  | L118 casual x1000 | 9.88 | 9.89 | 16.20 | 1.00x |
  | L118 par | 5.99 | 7.87 | 11.10 | 1.31x |
  | L118 solve 2000 | 0.097 | 0.127 | 0.212 | 1.30x |

  Before `slide_to` was inlined by hand into casual play's scan (friction 1), casual was
  slower than MoonBit: 17.30 against 15.35 ms on L107 (0.89x), 11.69 against 9.89 on L118
  (0.85x) (3 processes, interleaved, under the lock).
  Weave (`builder-v2/bench.cjs`, 5 processes each, alternated): `test/weave.wasm` 295.1 ms
  (290.9 to 301.4), builder-v2's `weave.wasm` 290.1 (287.4 to 292.6), `test/g2.wasm` 299.5
  (294.1 to 301.6), the JS 664.7. The shim costs 2%, within the noise of this machine.
- **Size** (`oracle/size.cjs G2 'G2 weave'`): `square.ents` 579 lines and 5,096 tokens against
  the 29 declarations of `square.mbt` it replaces (662 lines, 4,120 tokens): **1.24x**; 1.38x
  with its 39 lines of imports (537 tokens) and 3 of restated types. The weave files: 10,705
  tokens against 8,656 for `weave.mbt`, `knots_for` and the parts of `square.mbt` only weave
  uses (1.24x; builder-v2's 1.02x counted `square.mbt`'s board on MoonBit's side). wasm:
  `test/g2.wasm` 51,186 bytes (21,750 gzipped); `test/weave.wasm` 24,945 (11,016), against
  builder-v2's 18,385 (7,923): it carries `random`, `board` and `fmath` (pow, for
  `knots_for`) whole, as every importer of a module does.
- **What carried over.** Of `square.ents`'s 582 code lines, 198 are the same line as one of
  `solver/solver.ents` or `builder-v2/board.ents` (67 of them more than a brace or a `break`).
  By function: `relax`, `slide_to`, `place`, `ray_cells` (board.ents's `ray`) and
  `self_blocked` came from board.ents with the globals made fields (`b.occ`); `sq_solve`'s
  search has solver.ents's shape, but its insertion sort (14 lines) is `tries.items_mut().sort(first)`,
  its hand-written hash set (40 lines) is `keys.ents`, and its globals are a `Solve` struct.
  New, with no earlier kernel: `sq_frozen`, `sq_tracks`, `paths_of`, `sq_player_taps`,
  `sq_fewest_player_taps` (`bound`, `deepen`), `sq_postpone_exits`, `sq_replay`,
  `sq_casual_wins`: about half of the file.
- **The weave adapter's diff** from builder-v2: `weave-board.ents` none (identical);
  `weave.ents` 104 code lines out and 147 in, of 1,053 (comments and blank lines left out;
  `git diff --stat`: 131 deletions, 208 insertions): the imports and two types, `weave_run` in
  place of the buffer-reading `weave()` with the result copied out as `Pt` paths, `seed_core`
  and `core_fits` taking `[][]Pt`, `finished()` returning its counts, `knots_wanted`,
  `knots_for` and the styles (25 lines), and the last test written with a `WeaveCfg`.
  `weave-rng.ents` against `rng.ents`: 33 out, 61 in. The buffer contract moved to
  `test/weave.ents` (171 lines). About 35 minutes, and it was exact on its first run.

### Friction

1. **No inliner: a struct behind `*mut` costs a load per field per call.** Casual play scans
   every rope with `b.slide_to(i)` at every tap; each call loads `b.seq`, `b.len`, `b.off` and
   `b.occ` again, because nothing tells V8 that the board's fields do not change (MoonBit's
   are immutable GC fields). That made casual 11 to 15% slower than MoonBit. Wrote the scan
   with the four tables in locals and `slide_to`'s loop inlined: 20% faster, and faster than
   MoonBit. 1 site (`// inline:`), 15 minutes to measure and write. `inline func` is "parsed
   but not yet implemented" (reference 3.5); it would remove this. None of closures, function
   values, enums or comptime values would. `-O` (wasm-opt) did not change the time.
2. **Data is not aligned.** The weave contract needs its word buffers at a multiple of 4, and
   `data inbuf = mut [0:i32; 16384]` landed at 17,311,119 in `test/weave.wasm`: data is laid out
   byte by byte after the data of every imported module (reference 9.0 and 9.6: "no padding
   and no alignment"). Wrote the buffers as `u8` arrays 4 bytes longer, with the words at the
   next multiple of 4 (`aligned(p)`), and reads through a many-pointer with an `assert` (2
   buffers, 8 lines, 10 minutes). The stack is aligned only because `lib/stack` is imported
   first: its `space` happens to come first in memory, at 8. An alignment for a data block
   would remove this; no planned feature does.
3. **A parameter hides an imported global, silently.** `seed_core(ropes, stops, ...)` named a
   parameter `stops`, which `weave.ents` imports as a global (`[*]mut []i32`). The function's
   later uses of the global then meant the parameter (`[][]i32`), and the errors came from the
   types, at the uses: `cannot use .len on ?[]i32: it may be none`. A `let`, a loop variable
   and an `if let` may not shadow (so the "bindings never shadow" rule is what one expects
   here too), but a parameter may (bugs/02's notes: "a parameter named like a global wins").
   1 site, 5 minutes.
4. **A parameter hides a function of the same name, and the message says the function does
   not exist.** In `sq_replay(paths, ...)`, `b.paths(w)` gave `no field 'paths' on type *mut
   SqBoard, and no function 'paths' accepts (*mut SqBoard, i32)`. There is such a function; the
   parameter `paths` hides it (reference 5.2: "a loop variable of its name hides it", and so
   does a parameter). Renamed the function `paths_of`: 2 sites, 3 minutes. Every kernel takes
   `paths`, as MoonBit's do, so the method could not keep its MoonBit name.
5. **A `let` is the function's** (as G1 found): `let c` in one loop body and `for c in` after
   it; `let dx, dy` in an `if` branch and again after it. 2 sites, 2 minutes.
6. **No counted loop over a range.** `for j in k + 1..n` is a parse error; wrote element loops
   over slices (`for j, x in best[(k + 1) as u32..n]`). 2 sites, 3 minutes.
7. **Precedence and targets.** `assert a == xs[i] ?? 0` is a parse error at `??` (`??` binds
   loosest; write `(xs[i] ?? 0)`), 3 sites; `outbuf()[k] = w` is a parse error (the target of
   an assignment cannot be an index of a call), 2 sites; 3 minutes.
8. **Options by hand** (`// enum:`): 7 sites in `square.ents`, 1 in `test/weave.ents`.
   `return 0 as ?*mut SqBoard`, `0 as ?*Par`; `(0 as [*][]i32, 0:u32)` and `(0 as [*]i32, 0:u32)`
   for the none of `?[][]i32` and `?[]i32` (there is no literal for it, as G1 found);
   `sq_player_taps` returns -1 for none (2 returns); `Solved.solved` is the tri-state
   `solved_yes`/`solved_no`/`solved_unknown`. An optional slice cannot be compared with none
   either: `cfg.initial_plan != 0` gives `'!=' cannot be applied to ?[]i32 and int(0)`, so the
   "planned" test is an `if let` with the call written in both branches. Enums (`Option(T)`)
   would remove all of them.
9. **Closures** (`// closure:`): 6 sites. MoonBit's 3 local functions (`search` of `sq_solve`,
   `bound` and `search` of `sq_fewest_player_taps`) are top-level functions over a context
   struct behind `*mut` (`Solve`, `Fewest`: 2 type declarations, 4 lines, and 35 `s.`
   prefixes); the 2 comparator lambdas are one top-level `first`; `path.map` and two
   `Array::makei` are loops. Against v1's globals (solver.ents), the struct makes the search
   reentrant (several boards are alive at once in the generator) and shows in each signature
   what it touches; the cost is the prefixes. Closures would remove all 6.
10. **Reserves** (`// reserve:`): 6 sites: the moves of both searches and the `fewest` plan
    (3), the keys of both searches (2), and weave's result (1). The keys are reserved for the
    whole budget: 4 bytes per rope per node, plus the slots. That is 2.2 MB at `fewest`'s
    2,500 on the 223-rope 48x48 board (measured: a 2.87 MB peak), and **17.8 MB at `sq_solve`'s
    default budget of 20,000 there, past the 16 MiB stack: it traps.** The game's budgets are
    900 (hints) and 2,000 (the generator), so this is a limit for G5 and G7 to keep, not a
    failure today. The 2 key reserves are also `// comptime-n:` sites (below).
11. **Unchecked tables** (`// unchecked:`): 16 sites in `square.ents`, every one a read or
    write through a board table (`[*]mut i32`) or a track's `.ptr`.
12. **Casts:** 23 `as i32`, 32 `as u32`, 3 `f64(...)`, 1 `i32(...)` in `square.ents`. 12 of the
    `as i32` are a loop variable (`for i in b.n` gives a `u32`) passed to `slide_to(i as i32)`
    or pushed into an `i32` list.
13. **Two memory declarations** (bugs/04, below): 3 minutes.

### Error messages (verbatim)

1. The function hidden by a parameter (friction 4):
   `no field 'paths' on type *mut SqBoard, and no function 'paths' accepts (*mut SqBoard, i32)`.
2. The global hidden by a parameter (friction 3), at the uses, not at the parameter:
   `cannot use .len on ?[]i32: it may be none — resolve it with 'if let' or '??' first` and
   `cannot iterate over ?[]i32: it may be none — resolve it with 'if let' or '??' first`.
3. `for j in k as u32 + 1..n`: `Expected "a".."z", "bool", "f64", ... "*", or a digit` at `..`.
4. `assert rope.len as i32 == case_lens[i] ?? 0`, and `outbuf()[k.*] = w`: each a parse error
   listing about 60 alternatives.
5. `'!=' cannot be applied to ?[]i32 and int(0)` (clear; there is no other way to ask).
6. Good ones: `'c' is already declared: a loop variable cannot reuse the name of a variable
   in scope`; `'dx' is already declared in this scope`.

### Bugs

- **bugs/04-two-memory-declarations.ents** (and its `-lib` half). `test/g2.ents` declared
  `export memory` and imports `test/weave.ents`, which declares `export "mem" memory`.
  `encantis check` says `OK`; `encantis wasm` dies with a Bun stack trace through
  `codegen.ts:4063`, whose message is right ("Multiple memory declarations ... At most one
  module may declare memory"). Not wrong code: the error is missed by `check` and reported as
  a crash. Worked around by declaring memory in `test/weave.ents` only. 3 minutes.
- No wrong code was met. bugs/01 (the `&`/`as` precedence) did not come up: the views are
  `abi.ents`'s.

### Tooling

- `check square.ents` (7 modules, 182 declarations): 0.9 s; `check test/g2.ents` (17 modules,
  599 declarations): 2.0 s; `wasm test/g2.ents`: 2.6 s, the same bytes every time; `test
  square.ents`: 1.2 s (on a loaded machine). `build.sh` (G1 and G2: 15 modules tested, 3
  wasm): 11 s.
- `check` found what was wrong with `square.ents` in two passes: the range loop's parse error,
  then 5 errors at once, all names (3 clashes of a function's `let`s, 2 uses of the hidden
  function), then OK.
- `hover square.ents:467:moves` gives `field moves: *mut (ptr: [*]mut i32, len: u32, cap: u32)`;
  over `search` it prints the `Solve` struct spelled out in full, about 600 characters on one
  line: a named type is never shown by its name.
- `encantis test`: square 3, weave 6, weave-board 6, weave-rng 2, all pass. A test may build a
  board and run a whole solve and replay in a few lines.

### Pleasant

- **Exact on the first run**, both halves: 1.5M values of the square kernel and the 249 weave
  cases, and the compiler made no wrong code. What `check` let through was right.
- **The library did the work the earlier kernels wrote by hand**: `lib/sort` with a top-level
  comparator (stable, as `ssort` is) for the tries, `keys.ents` for the visited sets, `Vec`
  for every list, `defer reset(scope)` for each search node.
- **Method calls read like MoonBit**: `b.place(t.i, t.to)`, `s.moves.push(t.i)`,
  `return true when s.search()`, `r.one_of(exits.items())`. `let dx, dy = head_dir(path)` and
  `set (dx, dy) = turn(s, dx, dy)` read like the JS.
- **The weave reuse worked as planned**: one stack, the rng a shim of 37 code lines, builder-v2's board
  untouched, and the buffer contract kept in a test entry so that v1's and v2's scripts run on
  the core unchanged.
- **Speed**: the searches are 1.3x MoonBit's wasm-gc, and 1.8x to 2.2x the JS.

### Where `comptime n: u32` with `[n]T` would help G2

The containers, again, and only there:

- **A second arena (`Stack(comptime n)`)**: 2 sites, the visited keys of `sq_solve` and
  `sq_fewest_player_taps`. Today they are reserved for the whole budget because a search node
  frees its scope, and a set that grew there would be freed with it. In an arena of their own,
  which the node scopes never reset, the keys could grow as found: the peak would follow the
  nodes actually seen, not the budget, and the 20,000-node default would no longer pass the
  stack on a colossal board. Today a second arena means copying `lib/stack.ents` again.
- **No fixed-size small lists here.** The square kernel's lists are sized by the board (`n`
  ropes, `2n` moves) or by the budget, at run time; `[n]T` would not prove them.

### Counts (tags in G2's files, sites; header mentions left out)

| Tag | square | weave, weave-board, weave-rng | test entries |
| --- | ---: | ---: | ---: |
| `// closure:` | 6 | 0 (builder-v2 wrote its 25 closures as globals and functions without tags) | 0 |
| `// fnvalue:` | 0 | 0 | 0 |
| `// enum:` | 7 | 0 | 1 |
| `// comptime-n:` | 2 | 0 | 0 |
| `// unchecked:` | 16 | 3 | 2 |
| `// reserve:` | 6 | 1 | 0 |
| `// inline:` (new: a function inlined by hand) | 1 | 0 | 0 |

Minutes, roughly: 60 reading the plan, the MoonBit, the JS and the earlier kernels; 40 writing
`square.ents` (5 to clear `check`); 35 the weave adapter; 35 the oracle and its controls; 30
timing (with the inlining); 30 the log, sizes and counts.

## 18 Nov: review of G2 (adversarial)

- **Compiler:** 03225bc441cf37ce1b109e7839ecedd7470dab34, as G2 used. origin/main moved during
  the review to 8f459f1 (#32 comptime value parameters, #33 fix round 3). Built with that one
  too, from a worktree of its own (`ENCANTIS=... build.sh`): every inline test passes, and
  `g1.wasm`, `g2.wasm` and `weave.wasm` come out byte for byte as with 03225bc. Reviewed head
  c8ea862. The machine restarted once in the middle of the review; the second half picked up
  from the progress file.
- **Reran first:** `build.sh` (11 s) gave G2's three wasm files byte for byte, and
  `check-all.sh` passed: G2 22,106 comparisons, `--extra` 3,850, weave 249, 4,980 and 224, 0
  mismatches. `check-g2 --controls` failed 13 of 13 kinds, as it should. `bugs/04` shows what
  it says on both compilers. `check` exits 0 with "OK: 5 declarations across 2 modules" (its
  header said 2; corrected), and `wasm` exits 1 with the Bun stack trace.
- **Time again, on a quiet machine** (just after the restart, load average 0.1 to 0.5, under the
  lock, the same `bench-g2.cjs`, 5 processes): within 2% of G2's numbers, which were taken at a
  load of 2.3 to 2.8.

  | Kernel | port ms | MoonBit ms | JS ms | MoonBit / port |
  | --- | ---: | ---: | ---: | ---: |
  | L107 casual x1000 | 13.93 | 15.27 | 22.98 | 1.10x |
  | L107 par | 9.13 | 11.68 | 16.41 | 1.28x |
  | L107 solve 2000 | 0.194 | 0.261 | 0.356 | 1.35x |
  | L118 casual x1000 | 9.88 | 9.86 | 15.95 | 1.00x |
  | L118 par | 5.96 | 7.72 | 11.15 | 1.29x |
  | L118 solve 2000 | 0.095 | 0.124 | 0.203 | 1.31x |

  Weave on `test/g2.wasm`: 289.5 ms against the JS's 641.6 (3 processes). After the review's
  two asserts (below), again under the lock but at a load of 1.0: casual 13.98 and 9.90 ms,
  solve 0.196 and 0.096 (within 1% of the quiet run), par 9.23 and 6.08 (1.1% and 2.0% slower:
  postpone builds a board for every trial, and each board now checks its body cells; the load
  counts too). MoonBit / port is 1.10x, 1.28x, 1.26x on L107 and 1.00x, 1.27x, 1.23x on L118.
- **Extended:**
  - `oracle/check-g2-wide.cjs` (written in the first half; 56f8116): 400 synthetic boards (1x2
    to 48x48, mirrors on up to a third of the cells), the 33 square reference boards with
    springs (springs ignored), and the 131 square boards of `fixtures/g2-review-boards.jsonl`.
    That fixture is the JS game's own boards from 300 random codes, minus G1's. On top come
    budgets 0 and below, games 0 and below, junk in prefer, and taps out of range. It
    reaches what `check-g2` never does: `boardOf` throwing (26 boards), ways out capped at
    2 * W * H (10) or passing a cell twice (217), `selfBlocked` true (1,990 times), a replay
    ending unsolved, and solve giving up at 2,000.
  - This half added an **aimed** set: 150 boards made as the synthetic ones, their mirrors
    replaced by 1 (most), 2 or 3 placed on a rope's straight way out or on its head. The other
    sets almost never make a board with exactly one mirror.
  - **Other seeds** (`--seed`, which changes the synthetic and aimed boards): at the default
    0x62, then 1, 2 and 0x5151 there are 714 boards and about 3,500 positions each, about
    105,000 comparisons of 5.3M to 6.2M values each, 0 failed. Seed 2 turned up one trap where
    the JS answers: `rays` on S276 (48x45, 272 ropes, 688 mirrors). That hook's output would be
    96,537 words, and the ABI's buffer holds 65,536 (`put` traps; G1's limit). It is a limit
    of the test hook, not of the kernel, and is now counted as a limit. The seed 0x5151 boards
    are the ones where solve and fewest give up at their default budgets.
  - **The review's limits are checked to trap**: 34 calls (a path with a cell at row -1, row
    H or column -1 through every kernel that builds a board; `rays` on 49x48, 48x49, 50x50 and
    2x1200 with a mirror). G2's committed wasm fails 32 of them by answering.
  - `oracle/check-g2-weave-big.cjs`: 118 weave calls recorded from the real generator on
    48x48 colossal maps (mirrors, cores), 24x24, 30x30, 48x40 and 48x8, replayed on the port:
    0 mismatches.
  - **A mutation run** (`oracle/mutate-g2.sh` with `oracle/mutants-g2.cjs`): 55 seeded one-line
    changes of `square.ents` (a turn swapped, a bound off by one, a branch dropped, a default
    changed, and so on), each built and run against `check-g2` and then `check-g2-wide`.
    `check-g2` alone fails 34 of them. The wide check fails 17 more: the ray cap, the
    duplicate check, all 5 changes to `self_blocked` (the one-mirror one only through the
    aimed set), a way out passing a cell twice accepted, relax's own-body rule, junk in
    prefer, both default budgets, budget -1, a plan that leaves ropes, a tap of a gone rope, a
    replay past the end, and 0 games. 4 survive. 3 of them cannot change an output (below),
    and `postpone: one pass` (postponeExits' second pass never run) changed nothing on 36,190
    plans tried in the JS: 27,390 on synthetic boards at 6 seeds and 8,800 on the game's
    boards.
    - `search: relaxed knots not remembered` and `deepen: knot remembered as 0`: a position
      relax gives up on is counted as a node before the visited set is asked, and relax gives
      the same `false` again. The set only saves time.
    - `replay: exit at offset 0` (`to <= 0` for `to < 0`): a slide always moves its rope
      forward, so a slide never ends at offset 0.
- **What it found:**
  1. **`self_blocked` read past `body_marks` on boards past max_area.** With a mirror on the
     board, the cells ahead of a rope were looked up in `body_marks` (2,304 entries) unchecked.
     On a 50x50 board they ran on into the next data block, weave-rng's trace buffer: with the
     next stamp's value left there, the port said a rope was blocked by its own body where
     the JS says not (`probes/past-max-area.cjs` in the review's scratch). `has_dup` already
     trapped on such boards when a way out turned. The game makes no board past 48 x 48, so
     no game board was ever answered wrong.
  2. **A body cell off its board wrote over the stack.** `sq_board` writes `occ` and `at` at the
     body's cells unchecked. A path with a cell at r = H wrote past `occ` into `at` and on,
     and the kernels answered wrong (`free` 0 where the JS says 1, solve "no way" where the JS
     solves it; `probes/off-board.cjs`). The JS's typed arrays ignore such writes. The game
     never sends such a path, and `read_position` does not check; a q/r swap in a later group
     on a board that is not square would.
  3. **The oracle did not try a board with exactly one mirror.** A mutant that took
     `m.size() > 1` for `> 0` in `self_blocked` passed `check-g2`, `--extra` and the whole
     wide check; the aimed set fails it 10 times.
  4. **PORT-PLAN's budgets were incomplete.** The game also solves at 5,000 (auto-solve, in
     app.js and in MoonBit's own game) and at `round(12000 / ropes)` in the generator. At
     5,000 on the 223-rope board the port needs 5.42 MB and matches the JS (8 budgets from
     900 to 9,000 tried); only the default 20,000 traps.
  5. **Aliasing:** `sq_fewest_player_taps` returns `known` itself as the plan when it finds
     nothing shorter, where MoonBit and the JS copy it. Nothing reads it after its scope today;
     noted for G7's `score`.
- **Fixed:** two asserts in `square.ents`. `self_blocked` asserts `w * h <= 2304` once the board
  has a mirror, and `sq_board` asserts each body cell is in `0..w * h`. Both are traps where
  the port had answered wrong. The WAT differs in those two places only; the timed kernels
  are otherwise unchanged. `g2.wasm` is 51,422 bytes (+42). `check-all.sh` passes on it (187
  s): G1, G1-wide, the weave on big boards (118 calls), the wide check, G2 (22,106
  comparisons), `--extra` (3,850), and the weave fixture, seeds and sizes, with 0 failures and
  0 mismatches. `check-g2 --controls` gives 13 of 13, and the wide check's `--js` and
  `--controls` (11 of 11) pass.
- **Unchanged:** for every board the game makes, the port agreed with the JS before the review
  and does now: 0 failures in all the review's runs.

### Friction

1. **An unchecked many-pointer drops the length the data block had.** `data body_marks = mut
   [0:i32; 2304]` is a `*mut [2304]i32`, and indexing it is checked. G2 cast it to `[*]mut
   i32` for speed and wrote `// unchecked: a cell of the board`. That reason held only up to
   max_area, which nothing asserted, and past it the reads went on into the next module's data,
   silently. Of G2's 16 `// unchecked:` sites, the review found 2 whose reason was not
   asserted anywhere. One is this. The other is `occ[c] = i` in `sq_board`, where "a cell of
   the board" assumed the path lies on the board. Both are now asserts, at about 10 minutes
   each with a probe. `self_blocked` is not hot: the checked form, `body_marks[c] ?? 0`, would
   have cost nothing measurable. A "debug" build that checks `[*]T` against the block it came
   from would find both. No planned feature does that.
2. **`??` binds loosest** (G2's friction 7, met again): `return s + marks[0] ?? 0` in the
   bugs/05 repro is a parse error listing about 60 alternatives. Wrote `(marks[0] ?? 0)`. 1
   site, 1 minute.
3. **Diffing two builds' WAT needs the generated names normalised.** One added `assert` renumbers
   every `$__for_ptr_NNNN` local after it in the module (445 lines differ for one changed
   line). `sed -E 's/_[0-9]+\b//g'` on both sides left the one real line. 5 minutes.

### Error messages (verbatim)

1. `return s + marks[0] ?? 0`: `Expected "}", "a".."z", "false", "true", "'", ... "||", or "&&"`
   at the `??` (about 60 alternatives; nothing says that `??` binds looser than `+`).

### Bugs

- **bugs/05-hover-name-is-a-substring.ents (tooling).** The CLI's `<file>:<line>:<name>` form
  takes the first place the name occurs on the line as text (cli.ts `lineText.indexOf(name)`),
  not the first identifier of that name. `hover square.ents:106:n` on `func table(n: i32, ...)`
  says "No info" (the n of `func`). On a comment line (`// reserve: a hopeless key per node`),
  `hover square.ents:503:s` said `func reserve: ...`, because the s of the comment's
  "reserve" was taken and the comment's word resolved as code. By column too, `hover` and
  `definition` resolve a word of a comment as the function it names. And a `data` block
  hovers as `def marks: *mut [4]i32` (a def is a compile-time constant, a data block is
  memory). Same at 03225bc and 8f459f1. 10 minutes to see why `s` gave `reserve`.
- **bugs/04 holds** at 8f459f1 too (now `codegen.ts:4116`).
- No wrong code from the compiler: both defects above were the port's.

### Tooling

- `check square.ents` 0.83 s, `check test/g2.ents` (17 modules, 606 declarations) 1.66 s,
  `test square.ents` 0.83 s, `build.sh` 11 s, on a quiet machine.
- `encantis fmt` on `square.ents` changes 116 of its lines and keeps the wasm the same. It is
  idempotent. But it writes `n:i32` where the reference writes `n: i32` (171 of the 191
  signatures in `docs/encantis.md` have the space). It writes the type `[]?[]Pt` as
  `[] ? []Pt`. It puts a type declaration's second line at column 0, and it narrows the two
  spaces before a trailing comment to one. The same at 8f459f1. G2 did not run it, and neither
  does the review: the files keep their hand layout.
- `hover square.ents:182:body` gives `local body: [*]mut i32`, and a parameter hovers as
  `local n: i32` too. `references square.ents:166:stamp` lists the 3 uses, not the declaration.
- The mutation run: 55 builds of `test/g2.wasm` (2.5 s each), then each mutant through a quarter
  of `check-g2` and 150 wide boards, and the full checks only when those passed. About 1
  hour under the lock (43 minutes for the last 47).

### Pleasant

- **The tags made the audit fast.** `grep "unchecked:" square.ents` listed every unchecked
  site with the reason it was thought safe. Checking the 16 reasons against the MoonBit and
  the JS took 15 minutes and found both defects.
- **A fix is one line and one rebuild.** `assert` with the reason beside it, 11 s for
  `build.sh`, and the WAT shows exactly what was added.
- **The oracle's shape carried a third set with no new hooks**: the aimed boards are 20 lines
  of board making. `--js` and `--controls` (11 of 11) passed on them unchanged.
- The port was stable across a compiler update: #32 and #33 changed 73 files of the compiler,
  and the core's wasm did not change by a byte.

### Counts (review)

| What | Count |
| --- | ---: |
| `// unchecked:` sites in `square.ents` audited | 16 |
| of them, reasons not asserted anywhere (now asserts) | 2 |
| asserts added | 2 (`self_blocked`, `sq_board`) |
| seeded mutants of `square.ents` | 55 |
| killed by `check-g2` alone | 34 |
| killed only by the wide check (1 of them only by the aimed set) | 17 |
| surviving, equivalent (no output can differ) | 3 |
| surviving, not shown to differ on 36,190 plans (`postpone: one pass`) | 1 |
| wide check: boards at each seed (400 synthetic, 33 springs, 131 generated, 150 aimed) | 714 |
| wide check: comparisons over the 4 seeds | about 423,000 (23M values), 0 failed |
| bugs filed | 1 (bugs/05, tooling) |
| minutes | about 40 reading the port against the MoonBit and the JS, 30 widening the oracle, 20 fixing and probing, 15 the hover repro, 70 the mutation run (mostly waiting), 20 timing |

## 18 Nov: G3, the Hex offset kernel (geometry, ways out, HexBoard and its searches)

- **Compiler:** 8f459f1b04de1e315cf9786702028710b2ecb676 (origin/main, which since G2's 03225bc
  has #32, comptime value parameters, and #33, fix round 3). `build.sh` rebuilt G1's and G2's
  three wasm files byte for byte with it, and `check-all.sh` passed before any G3 code was
  written (G1 4.9 s, G1-wide 13.8 s, G2 31.6 s, G2 `--extra` 8.8 s, the weave scripts).
- **Files:** `hex.ents`; `test/g3.ents`; `oracle/check-g3.cjs`, `oracle/check-g3-wide.cjs`,
  `oracle/bench-g3.cjs`, `oracle/mutants-g3.cjs`, `oracle/mutate-g3.sh`; G3's lines in
  `build.sh`, `size.cjs` and `check-all.sh`.
- **Oracle** (`check-g3.cjs`, against `hex/engine.js` at 9e69e3a):
  - the 33 Hex boards of `reference.json` without springs (28 Journey, 5 custom; 4x6 to 32x32,
    up to 105 ropes, up to 7 mirrors), at 1,352 positions (the start, every plan prefix, 20 of
    random play), 12 calls per position: compile (tracks, lengths, offsets, `to` of every rope
    and of -1 and n, free, dead, frozen, the reach of `relaxed()`, left, `occupied` and `at` by
    cell, the paths), rays (exit index, the way out as left even when refused, the turning
    cells), turning, solve at 40, 900, 2,000 and 2,000 with no preferred order, replay of every
    prefix, postpone, casual x1000 with its draws, fewest at 6,000 and at the generator's 2,500.
    16,224 comparisons of 2,235,224 values, **0 failed**, in order and in reverse (210 s, of
    which the JS is about 190: `fewestPlayerTaps` and casual play on C15's 105 ropes). Then the
    geometry: `point` and `cell` on every size to 12x12 and 48x48, `cell` and `inside` off the
    board, `reflect` for d and axis from -6 to 12, `dirIndex` for steps -3 to 3, `DIRS[d]`
    (`hex_dir`) for d from -3 to 9: 41,175 comparisons, 0 failed.
  - What hex/engine.js does not export (`relaxed()`, `at`, `point`, `dirIndex`, `rayTrack`,
    `exitIndex`) is read from a copy of it made at run time by two text substitutions, each
    checked to apply once; every position compares the copy's compile with the original's.
  - `--js` passes (365 s); `--controls`: 14 of 14 kinds fail on one spoiled value and name it;
    `--extra`, the 21 Hex boards without springs of G1's extra fixture (4x4 to 48x48 with 197
    ropes, 48x8 with 6 mirrors), 234 positions: 2,808 comparisons of 480,115 values, 0 failed.
  - `--moonbit`: MoonBit's `dist/mf.wasm` against the JS on the 28 Journey Hex boards
    (`bench_par`, `bench_solve` at 40, 900 and 2,000, `bench_casual` x1, x100, x1000): 196
    comparisons, 0 failed. So the oracle agrees with the build the game ships.
  - **The port was exact on its first run** (the first `wasm` that built): no output of any
    kind ever differed from the JS, on the reference set, the extra boards or the wide sets.
  - **`check-g3-wide.cjs`** (G2's review's shape): 400 synthetic Hex boards (1x2 to 48x48,
    mirrors of axis 0 to 2 on up to a third of the cells, ropes as self-avoiding walks over the
    six neighbours) and 150 aimed ones (1 to 3 mirrors on a rope's straight way out or its
    head), at 2,112 positions, with plans that solve, plans with a tap added (some out of
    range) and random taps; budgets 0 and below, games 0 and below, junk in prefer. 48,589
    comparisons of 2,632,695 values, 0 failed, in 8 s; `--js` passes; `--controls` 8 of 8. It
    reaches what the generator's boards never do: 32 boards whose ways out pass a cell twice
    (compile throws, and every kernel that compiles must trap), 199 ways out refused for a
    repeated cell and 2 at the 2*W*H cap, 640 heads on a mirror, 143 boards with exactly one
    mirror, 21 solves out of budget at 2,000, 1,710 plans that do not clear the board. And 24
    calls that must trap where the JS answers: a body cell off the board (cell index below 0 or
    past W * H) through every kernel that compiles, and a turning way out past max_area.
  - **Mutants** (`mutate-g3.sh`, 60 seeded one-line changes of `hex.ents`): `check-g3` on a
    quarter of the positions of the boards up to 30 ropes kills 48; the wide check kills 7 more
    that passed it. 3 of those (the solve budget off by one, a search going on once out of
    budget, out of budget read as "no way") fail the whole of `check-g3` too; 4 pass all of
    it and only the wide check sees them: the ray cap at W*H, no duplicate check, a single
    mirror ignored, and the seen set never asked (on the reference boards, solve finds its
    way before it meets a position twice). 5 survive every check, and none can change an
    output:
    - `relaxed: own body by reach` (the round's starting reach for the rope's own body, not the
      reach so far): it stops a rope that chases its own tail one round early, but the next
      round starts from there and passes, so the fixpoint, the only thing read, is the same
      (probed: 404 such ropes on 3,000 synthetic boards, 0 differences);
    - `hex_replay: a slide to 0 is an exit`: a slide always moves its rope forward, so it never
      ends at offset 0;
    - `deepen: dead positions retried` (0 for 1e6 in `tried`): a node is counted before the
      table is asked, and `dead()` gives `false` again: the table only saves time;
    - `postpone: one pass` and `postpone: last tap test skips one`: in the JS, neither variant
      of `postponeExits` answers otherwise on 14,210 plans (the 1,352 reference positions and
      the wide sets at 6 seeds); the second only repeats a trial the loop makes one step
      earlier. (G2's review found the same of `postpone: one pass` on square boards.)
- **Stack peak:** 2,860,176 bytes on the reference set (C15, `fewest` at 6,000), 5,254,740 on the
  48x48 board of 197 ropes (the same). As in G2, nearly all of it is the visited keys, reserved
  for the whole budget.
- **Time** (`bench-g3.cjs` under the lock on a quiet machine, load 0.6 to 0.9: 5 processes, best
  of 5 rounds each, the median over processes; port, MoonBit `dist/mf.wasm` and the JS
  interleaved in each round, values checked to agree). The last column is MoonBit's time over
  the port's: above 1, the port is faster.

  | Kernel | port ms | MoonBit wasm-gc ms | JS ms | MoonBit / port |
  | --- | ---: | ---: | ---: | ---: |
  | L114 casual x1000 | 3.695 | 5.146 | 16.00 | 1.39x |
  | L114 par (postpone, fewest 2500) | 1.883 | 2.486 | 14.18 | 1.32x |
  | L114 solve 2000 | 0.043 | 0.065 | 0.124 | 1.51x |
  | L116 casual x1000 | 5.065 | 6.217 | 19.33 | 1.23x |
  | L116 par | 2.868 | 3.607 | 18.98 | 1.26x |
  | L116 solve 2000 | 0.047 | 0.073 | 0.147 | 1.53x |

  As first written (8906d3a, the same bench): casual 4.649 and 6.153 ms (1.05x and **0.97x**),
  par 1.854 and 2.831 (1.33x, 1.27x), solve 0.040 and 0.048 (1.38x, 1.43x). Two changes found
  with a CPU profile (friction 3) made casual faster than MoonBit on both boards: `hex_cell`
  takes floor(r / 2) as `r >> 1` instead of calling `floor_div` (compile 26% faster, casual
  15%), and casual play's scan has `to` inlined with the board's tables in locals (another 10%,
  G2's `// inline:` again). Par and solve did not move. A compile is about half of casual play
  (a compile per game, as MoonBit and the JS do): 1.56 and 2.19 ms of the 3.7 and 5.1. Solve
  2000 looks at only 23 and 30 positions on these boards, so its 40 us is mostly reading the
  position.
- **Size** (`size.cjs G3`): `hex.ents` 548 code lines and 4,911 tokens against the 27
  declarations of `hex.mbt` lines 1 to 668 (602 lines, 3,772 tokens): **1.30x**; 1.49x with its
  41 lines of imports (576 tokens) and 7 lines of restated types (124). Without the hand
  inlining, 1.28x. wasm: `test/g3.wasm` 31,620 bytes (14,048 gzipped); it carries `random`,
  `board`, `keys`, `abi` and `codes` (the layout key, through `abi`) whole.
- **What a generic over the board type would share** (the plan's question). 125 of `hex.ents`'s
  555 code lines (imports left out; lines of more than 12 characters) are the same text as a
  line of `square.ents`: `table`, `reserve`, `Try` and `first`, `bound`, most of `deepen` and of
  the fewest driver, the casual player's loop, `postpone`'s trial loop, the shape of
  `paths_now`. With overloads (`to(b: *HexBoard)` beside `slide_to(b: *SqBoard)`, `place` for
  both, `free` and `all_free`, `dead` and `relax() > 0`) and the same field names, one generic
  `deepen(comptime B: type, s: *mut Fewest(B), remaining)` and one casual game could serve both
  kernels, the method calls resolved per board type at compile time. What differs is small and
  real: hex's deepening starts at `max(1, bound)` and square's at `left > 0`; hex verifies the
  fallback with a replay (which builds the paths), square with `sq_player_taps` (which stops
  testing `all_free` once released); hex's solve asks its seen set before counting a node and
  follows a preferred prefix, square's ranks by first and last tap; hex compiles per game,
  square resets one board. Each would be a comptime function parameter or a flag. The plan
  keeps the searches apart for parity, and so does this port: the sharing would be about 250
  tokens, and every difference above is one a shared version would have to get exactly right.

### Friction

1. **A local may not take the name of an imported function.** `relaxed()`'s `let next = r` (the
   JS's name) collides with `random.ents`'s `next`, imported for casual play's draws: `'next'
   is already declared in this scope`. Renamed `got`. 1 site, 1 minute. The message names
   neither the import nor its line, and "in this scope" reads as the function's scope. (G2 met
   the converse: a parameter that hides a function.)
2. **`assert` does not narrow a range, and there is no trap statement.** To index the direction
   rows by a proven `u32#6`, a direction from the caller (an `i32`, -1 when a path's last step
   is no direction) must trap outside 0 to 5, as the JS (`DIRS[-1]` is undefined) and MoonBit
   do. `assert k < 6` traps but leaves `k` a `u32` (`cannot assign u32 to u32#6`), so it is
   `if k >= 6 { assert false; return 0 }`, after which `k` is a `u32#6`: 4 lines for 1. The
   `assert false` and then a dead `return` also end `hex_compile_exn`. 2 sites, 5 minutes with
   the probe. A narrowing `assert`, or an `unreachable` that ends a branch, would remove both;
   no planned feature does.
3. **No inliner: small calls cost, and a profile has no names.** The first build's casual play
   was 3% slower than MoonBit on L116. `node --cpu-prof` lists only `wasm-function[N]`, because
   the wasm has no name section; the names came from the order of `(func` in `encantis
   compile`'s WAT (a 10-line script). Then: `floor_div` (`random.ents`, one call per `hex_cell`)
   was 8% of casual play, more than `place`; `r >> 1` is floor(r / 2) for every `i32` and is one
   instruction. `vec.push` is 14% (the tracks, built per game), `board.at` (the mirror lookup per
   ray cell) 3%, `hex_inside` 2%: each a call V8 does not inline. The scan's `b.to(i)` inlined by
   hand (`// inline:`, as G2's `slide_to`) gave 10%. About 5 minutes of wall clock, the variants
   timed under the lock. `inline func` (reference 3.5, parsed, not implemented) would remove the
   hand inlining, and a name section the script. MoonBit's own optimizer does both.
4. **Options by hand** (`// enum:`): 5 sites. `0 as ?*mut HexBoard` and `0 as ?*Par` for none,
   `(0 as [*]i32, 0:u32)` for the none of `?[]i32`, -1 for a replay that does not clear the
   board (`solved_taps`), and `Solved.solved`'s tri-state. The plan's out-parameter option
   works as written: `ray_track(..., turns: ?*mut Vec(i32))` takes `0 as ?*mut Vec(i32)` for none
   and a bare `*mut Vec(i32)` for some, and `if let t = turns` inside. Enums (`Option(T)`) would
   remove the 5.
5. **Closures** (`// closure:`): 7 sites. `search` of `hex_solve` and `bound` and `search` of
   `hex_fewest_player_taps` are top-level functions over `Solve` and `Fewest` behind `*mut` (2
   types, 3 lines, and 42 `s.` prefixes); the 2 comparator lambdas are one `first`; `path.map`,
   `Array::makei` and `turns?.add(c)` (a JS `Set`: here `contains` then `push`, insertion
   order kept) are loops. Closures would remove all 7.
6. **The comparator that captures `p0`**, as the plan said: the rank (-1 for the preferred
   rope, 0 for an exit, 1 for a slide) goes into each try when it is made, and the stable
   `lib/sort` gives the JS's order: 2 lines, no global, exact on 5,408 solves and 19,008 in the
   wide set. `preferred[1:]` is a `u32` offset into `prefer`, read `s.prefer[preferred] ?? -1`:
   the checked index with its fallback is exactly the JS's `preferred[0]` being `undefined`
   past the end.
7. **Reserves** (`// reserve:`): 10 sites: the moves of both searches and the fewest plan (4),
   the keys of both (2), casual play's exit and move lists, written inside each game's scope
   (2), `hex_turning`'s result (1, sized by the mirrors: only a mirror's cell turns a way out)
   and `hex_mirrors`' keys (1). Casual play's two are new against G2: G2's casual play resets
   one board, but a compile per game (as MoonBit and the JS do) needs a scope per game, and a
   list made outside it that grew inside would move into it.
8. **Unchecked tables** (`// unchecked:`): 18 sites, every one a read or write through a board
   table or a track's `.ptr`. Audited as G2's review did, before any review: every reason is
   asserted or follows from a guard (body cells are asserted on the board; way-out cells come
   from `hex_inside` points; rope indices from `to(i) != -2`, from `for i in n`, or from a plan a
   replay accepted). The wide check's limit calls show the asserts trap.
9. **Casts:** 25 `as i32`, 32 `as u32`, 3 `f64(...)`, 1 `i32(...)`. As in G2, most `as i32` are a
   `for i in n` index (a `u32`) passed to `to(i as i32)` or pushed into an `i32` list.
10. **The task's notes for G3 name two things that are not in its lines.** `neighbours` (a flat
    `[*]mut i32` indexed `c * 6 + d`) and `done` (`i32`, where the JS's is a `Uint8Array`)
    belong to `hex_intentions` and `hex_build` (hex.mbt lines 680 on), which are G4's. Nothing in
    lines 1 to 668 has either.
11. **An oracle in a copied directory does not run**: `check-g1.cjs` (which every check requires
    for `readPosition`) finds `moonbit/scripts/cases.cjs` relative to itself, so a copy of
    `oracle/` outside the repository fails to load. To keep a running mutation job on the old
    oracle while `check-g3.cjs` changed, the copy went inside the worktree (untracked, removed
    after). 3 minutes. Not a language matter.

### Error messages (verbatim)

1. `hex.ents:412:11: 'next' is already declared in this scope` (friction 1).
2. `p1.ents:9:18: cannot assign u32 to u32#6`, after `assert k < 6` (friction 2): right, but
   nothing says that `assert` does not narrow, nor what does.

### Bugs

- None. The compiler made no wrong code: what `check` let through was exact on 4.9M values
  (reference, extra and wide sets). `bugs/04` (two memory declarations) was avoided by
  declaring memory in `test/g3.ents` only.

### Tooling

- `check hex.ents` (7 modules, 188 declarations): 0.8 s; `check test/g3.ents` (13 modules, 358
  declarations): 1.3 s; `wasm test/g3.ents`: 1.2 s, the same bytes every time; `test
  hex.ents`: 0.9 s (quiet machine; 1.1 to 1.7 s with the mutation run beside them).
- `check` found what was wrong with `hex.ents` in one pass (the name clash); `test/g3.ents`
  checked clean the first time. An inline test caught one wrong expectation of my own (a way
  out's length worked out by hand).
- `hover hex.ents:571:p0` gives `local p0: i32` (1.0 s). Over `search` it prints `Solve` spelled
  out in full, about 600 characters: a named type is never shown by its name (as G2 found).
  `references` on `to` lists its 11 uses in `hex.ents`, method calls included, but not the
  declaration, and not the uses in `test/g3.ents`.
- `encantis fmt --check` says both files need formatting. Formatted, `hex.ents` builds the same
  wasm, but 260 lines change: `n:i32` for `n: i32`, `[] ? []Pt` for `[]?[]Pt`, a type's second
  line at column 0 (what G2's review described). Not used.
- No name section in the wasm (friction 3).
- The mutation run: 60 builds of `test/g3.wasm` (1.5 s each), each through a quarter of
  `check-g3` (5 s), the wide check (8 s), 4 edge boards, and the full check only when those
  passed: about 35 minutes under the lock, most of it the 5 full runs of the survivors.

### Pleasant

- **Exact on the first run again**, on 2.2M values of the reference set and, afterwards, on the
  extra boards to 48x48 and 2.6M values of synthetic boards.
- **The ranged direction index.** `data dirs: *[6]Pt = [(1, 0), (0, 1), ...]` reads like the
  JS's `DIRS`, and is indexed by the `u32#6` that `turn` returns (`((2 * axis - d) % 6 + 6) as
  u32 % 6`) with no check and no fallback; the trap for a bad direction is in one place, `dir`.
- **G2's shape carried over whole**: the context struct, the node scope with `defer`,
  `keys.ents` for the visited sets, the test entry's hooks, and the oracle's `--js`,
  `--controls` and wide-check patterns. The test entry and the bench script are G2's with the
  names changed.
- **Speed**: every kernel is faster than MoonBit's wasm-gc on both boards (1.23x to 1.53x) and 3x
  to 7.5x faster than the JS. The two speed-ups were found, timed and checked within minutes.
- **Comptime values cost nothing to try** (probe `p2` below): a second 1 MiB arena compiles to
  158 bytes of wasm.

### Where `comptime n: u32` with `[n]T` would help G3 (it landed in 8f459f1)

The task said comptime value parameters were not available; they are on origin/main since #32,
and its library has `FixedVec(n, T)`, `Ring(n, T)` and a bitset with them. In G3:

- **The direction rows** (1 site): `dirs: *[6]Pt` is already proven with a written 6. A grid
  kernel generic over `comptime D: u32` (4 or 6) would share `ray_track` with square's
  `ray_cells` only if the reflection were a comptime function as well; the searches stay
  apart either way.
- **A second arena for the visited keys** (2 sites). Probe `p2` **[ran]**: `func space(comptime
  n: u32) -> *mut [n]u8 => mut [0:u8; n]` is a static buffer of its own for each `n`, and a bump
  allocator over it works (its test passes). With it, the keys of `hex_solve` and
  `hex_fewest_player_taps` could grow as found, in an arena the node scopes do not reset,
  instead of being reserved for the whole budget (2.9 MB at fewest 6,000 on C15, 5.3 MB on the
  48x48 board). That needs `keys.ents` (G1's) to take its room from such an arena: a change left
  for G7 to weigh, across G2's and G3's four sets.
- Nothing else: every other list is sized by the board, at run time.

### Counts (tags in G3's files, sites; header mentions left out)

| Tag | hex.ents | test/g3.ents |
| --- | ---: | ---: |
| `// closure:` | 7 | 0 |
| `// fnvalue:` | 0 | 0 |
| `// enum:` | 5 | 0 |
| `// comptime-n:` | 3 | 0 |
| `// unchecked:` | 18 | 0 |
| `// reserve:` | 10 | 0 |
| `// inline:` | 1 | 0 |

| What | Count |
| --- | ---: |
| seeded mutants of `hex.ents` | 60 |
| killed by a quarter of `check-g3` | 48 |
| then killed by the wide check | 7 (4 of them pass all of `check-g3`) |
| surviving, shown unable to change an output | 5 |
| compiler bugs | 0 |

Minutes, wall clock from the session's file times (one agent): about 4 reading the plan, the
MoonBit, the JS and G2, and rerunning `check-all` at the new compiler; 3 the oracle's JS side; 7
writing `hex.ents` (1 to clear `check`) and 1 the test entry; 4 the first full run; 6 timing,
profiling and the two speed-ups; 20 the mutants and the wide check (most of it waiting on runs);
15 the log, sizes and counts. The plan's estimate for the group was about 4 hours.

## 18 to 19 Nov: review of G3 (adversarial)

- **Compiler:** 8f459f1b04de1e315cf9786702028710b2ecb676, as G3 used (origin/main was unchanged
  after `git fetch` at 23:29; it has `lib/vec.ents`). Reviewed head da866ee. The machine was
  not restarted during the review; the reviewing agent was, once (00:16), and went on from its
  progress file with the runs it had queued under the lock still going.
- **Reran first:** `build.sh` (13 s) gave `g1.wasm`, `g2.wasm`, `g3.wasm` and `weave.wasm`
  byte for byte. Under the lock: `check-g3` 1,352 positions, 16,224 comparisons of 2,235,224
  values, 0 failed (200 s), geometry 41,175, stack peak 2,860,176 (C15, fewest 6,000): G3's
  numbers exactly. `--controls` 14 of 14, `--moonbit` 196 comparisons and 0 failed, `--extra`
  2,808 comparisons of 480,115 values and 0 failed (peak 5,254,740), `check-g3-wide` 48,589 of
  2,632,695 and 0 failed, its `--controls` 8 of 8. `size.cjs G3` gives 4,911 tokens, 1.30x and
  1.49x, and `gzip -9` 14,048 bytes, as claimed; the tag counts of the G3 section are exact, the
  casts too once the inline tests are left out (with them, 34 `as u32`).
- **The bug repros** (`bugs/01` to `05`) were rerun on 8f459f1 and each shows what its header
  says: 01 prints "8 12", 02 "8 101 7", 03 "16 0" (and `checked()` traps), 04 checks "OK: 5
  declarations across 2 modules" and `wasm` dies with the Bun stack trace (the `throw` is now
  at codegen.ts:4116, the header's 4063 is 03225bc's), 05's five hovers answer as listed.
- **Read against the MoonBit (hex.mbt lines 1 to 668) and the JS (hex/engine.js), function by
  function.** No difference in behaviour on any input the game makes. The port differs from
  the JS only where MoonBit does too, on inputs no level has: a body cell off the board, a mirror
  off the board (`set_at` asserts; the JS's Map keeps it and counts it in `bent.size`), a one-cell
  rope or a last step that is not a direction (the JS throws a TypeError, the port traps), a
  negative mirror axis (read as no mirror, as MoonBit's -1 sentinel; the JS reflects), a head
  off the board in `hex_turning` (`hex_point` truncates where the JS floors), and a turning way
  out on a board past 2,304 cells. Each is "trap or answer as MoonBit does"; none is reachable
  from a generated or Journey level.
- **What the oracles never called: the game's own calls.** `check-g3` and the wide check solve
  at 40, 900 and 2,000, give `fewest` the position's plan, and play casually from one seed. The
  game and the generator also call:
  - `solve` at **5,000**: the auto-solve (app.js `seekPlan([], 5000)`, MoonBit `seek_plan([],
    5000)`), with no preferred order;
  - `fewest` at 2,500 from **the plan `postponeExits` returns** (`score()` in grid-generator.js,
    gridgen.mbt's `score`); only `--moonbit`'s `bench_par` made that call, at the start of 28
    boards;
  - casual play of **32 games** seeded `hashString('casual/' + seed + '/' + attempt)`.
  `oracle/check-g3-review.cjs` makes those calls (and `fewest` at 30 and 300, budgets that run
  out on real boards), on the 33 reference boards, the 21 extra boards, and 160 generated Hex
  levels (`fixtures/g3-review-boards.jsonl`): 112 from `gen-g3-review-boards.cjs` (48x48 colossal
  at difficulty 1, 50 and 100 with and without mirrors, 4x4, 8x8, 4x30, 30x4, 8x48, 48x8, Hex
  levels of mixed codes, 100 random codes) and the 48 Hex levels without springs of G2's review's
  300 random codes, none in `reference.json` or in G1's extra fixture. On the generated set it
  also makes every `check-g3` call. **40,640 comparisons of 3,913,190 values at 2,389 positions on
  214 boards, 0 failed** (394 s, nearly all of it the JS). `--js` passes (a third of the
  generated set, 11,960 comparisons), `--controls` 9 of 9.
- **Limits, measured where the game can reach them.** The most ropes a code gives is 224
  (U3-H-100-100-48-48-1-C, difficulty 100 on 48x48; 212 and 218 with mirrors). There `solve` at
  5,000 peaks at 5.29 MiB of the 16 MiB stack and `fewest` at 6,000 (the JS's default, which the
  game never passes) at 5.57 MiB: at least 2.8x of room. Solve 5,000 runs out of budget on two of
  those boards (5,001 nodes) and still matches. The stack would run out at about 800 ropes for
  `solve` 5,000 and 700 for `fewest` 6,000; a budget past 2^26 traps in `reserve` (the JS takes
  any). Neither is reachable.
- **Wider seeds:** `check-g3-wide --seed 1`, `2`, `0x5151`, and `--seed 777 --boards 1200 --aimed
  400` (1,600 boards, 6,422 positions, 147,688 comparisons of 9.04M values): 0 failed.
- **Coverage** (JS-side outcome counts over each oracle's cases, `review-g3/tools/coverage.cjs`):
  the reference set never has a compile that throws, a way out refused for a repeated cell or at
  the 2*W*H cap, solve out of budget at 900 or 2,000, or a replay that ends unsolved; the wide
  set has all of them (32, 199, 2, 21, 124). No set has a way out whose last step is no
  direction, or a second `postpone` pass that improves.
- **G3's surviving mutants, rechecked.** `relaxed: own body by reach`, `a slide to 0 is an exit`
  and `dead positions retried` are equivalent as argued. `postpone: last tap test skips one` is
  provably equivalent too: it differs only where `best[k + 1]` is rope `i`'s last tap, and then
  its trial (best without tap k, then `i`) is the same list as the trial for k + 1, which the
  loop made one step earlier and either took (then the test at k sees `i` again at the end) or
  refused (and refuses again). `postpone: one pass` is not provably equivalent: an exit left on
  the board can make a later slide stop shorter, so a second pass could find what the first could
  not. A search for one (`review-g3/probes/postpone-passes.cjs`: random small boards, random
  solving plans that favour slides) found none in 33,646 plans, on top of G3's 14,210 and G2's
  review's 36,190 square ones. It stays an untested branch.
- **The review's 15 mutants** (`oracle/mutants-g3-review.cjs`, a different set of one-line
  changes): each built in a copy of `core/` (`mut/run.sh`, under
  the lock, about 25 minutes), then the inline tests, a quarter of `check-g3`, the wide check, and
  `check-g3-review` on a tenth of the generated set where the first two passed. 12 are killed:
  11 by the quarter of `check-g3` alone (a length taken from the track, a rope out one cell
  early in `relaxed`, an unsolved replay read as 0 taps, the trial that keeps its order, keys
  reserved for half the budget (a trap), the empty board counted as a node, `tried` one tap
  short, the release naming gone ropes, deepening to the fallback's own taps, the bound counting
  the head, a mirror on the head ignored), and one, casual play that never clears its move list,
  by hanging (it can take a move back for ever; both checks time out at 300 s). The inline tests
  catch 3 of the 15. The 3 that survive everything, `check-g3-review` included:
  - `turning: out never cleared` is equivalent: `ray_track` measures its cap and its duplicate
    check from `start = out.len`, so a list that keeps the last rope's cells changes nothing
    (only memory);
  - `relaxed: starts at 0` (gone ropes start at 0, not -1) is equivalent: a gone rope owns no
    cell, so no rope reads its reach, and its own turn sets it to -1 in the first round;
  - `postpone: stops after the first pass that improves` is G3's `postpone: one pass` in
    another form: the second pass runs only when the first found nothing, and then it finds
    nothing. The same open question as above.
- **Time.** `bench-g3.cjs` again, under the lock at a load of 1.0 to 1.4, 5 processes, best of 5
  rounds, median over processes. The port's times are G3's within 2% (casual 3.713 and 5.071 ms,
  par 1.841 and 2.857, solve 0.039 and 0.045); MoonBit's were 8 to 12% faster than in G3's run,
  so the ratios are lower than G3 wrote for casual play:

  | Kernel | port ms | MoonBit ms | JS ms | MoonBit / port (G3's) |
  | --- | ---: | ---: | ---: | ---: |
  | L114 casual x1000 | 3.713 | 4.539 | 13.98 | 1.22x (1.39x) |
  | L114 par | 1.841 | 2.411 | 13.90 | 1.31x (1.32x) |
  | L114 solve 2000 | 0.039 | 0.055 | 0.116 | 1.42x (1.51x) |
  | L116 casual x1000 | 5.071 | 5.767 | 17.07 | 1.14x (1.23x) |
  | L116 par | 2.857 | 3.579 | 18.48 | 1.25x (1.26x) |
  | L116 solve 2000 | 0.045 | 0.068 | 0.140 | 1.49x (1.53x) |

  MoonBit's time moves more between runs than the port's (its range within one run is 4.30 to
  4.78 ms on L114 casual, the port's 3.62 to 3.76): read the casual ratios as 1.1x to 1.4x.
  **On the largest boards** (`oracle/bench-g3-big.cjs`, three 48x48 levels of 212 to 224 ropes,
  3 processes, best of 3): par (postpone, then fewest at 2,500, which runs its whole budget) 227,
  185 and 239 ms against MoonBit's 261, 213 and 272 (1.14x to 1.15x) and the JS's 2,985, 2,636
  and 3,187 (13x to 14x); solve at 5,000 (out of budget on two of the three) 4.3, 32.8 and 30.2
  ms (1.23x to 1.42x); casual x100 19.0, 22.1 and 19.0 ms (1.33x to 1.47x). A CPU profile of par
  there: `bound()` is 77% of it, the walk over every rope's way out at every search node, which
  the JS and MoonBit do the same way; the port's inner loop is a pointer walk with two loads and
  no checks. So par on big boards is the algorithm's time, and only an incremental bound would
  change it (outputs would stay the same, nodes included).
- **What was fixed in the port:** nothing. No output of any kind differed from the JS, and
  every limit that traps is one the game cannot reach. The review's changes are in the oracle:
  `check-g3-review.cjs` with its fixture and generator, `bench-g3-big.cjs`,
  `mutants-g3-review.cjs` (`mutate-g3.sh` takes `MUTANTS=`), a quarter of the review oracle in
  `check-all.sh`, and the oracle README's G3 rows, which G3 had not written.

### Exactness: the owner's question (relayed 19 Nov)

The owner asked why the port does exact math, and said the set of generated levels may
change as long as the levels keep the same qualities. What exactness means in G3, and where
it costs elsewhere:

- **In G3 it cost no code.** The hex kernel is integer code; its one float expression is
  casual play's `floor(r.next() * n / 2)`, which a port that kept only the qualities would
  write the same. Every branch `hex.ents` has (the search, the bound, the budgets, the cap
  on a way out) is the algorithm itself. No line exists only to match the JS.
- **What it bought:** the oracle is a plain comparison, so one differing value names the
  board, the position and the call. G3 matched on its first build, and the review could show
  it on 22M more values instead of arguing it. An oracle of qualities compares distributions
  over many seeds (par, exact, coverage, wins, challenge) and says only that something drifted.
- **What it cost here:** oracle time (the JS side is nearly all of `check-g3`'s 200 s and the
  review oracle's 394 s), and questions that matter only to exactness: `postpone`'s second
  pass (above), and the mutants argued equivalent by hand (G3's 5, the review's 2).
- **Where it costs code:** G1's `fmath.ents` (284 lines and 2,139 tokens without comments, no
  MoonBit counterpart) exists so that `pow` is V8's bit for bit and `to_fixed` is `toFixed` on
  the exact product (Dekker's two-product). MoonBit's own `@math.pow` is one ulp off V8's on
  316 of 10,001 difficulties, its `to_fixed` rounds 60 of 90,300 ratios the other way, and
  MoonBit still regenerates every Journey level (the `pow` results are rounded before they
  decide anything; G1, "Found beyond the language"). So that
  is the first exactness to drop. Wasm has no `pow` and a host import breaks the glue (G1,
  friction 2), so some `pow` stays, but a short one would do. Float order (G6's metrics) and
  draw order (G4, G5, G7) come next, where matching them costs.
- **Recommendation**, added under rule 1 of PORT-PLAN: keep exact parity where it is free, as
  in G3 and every integer kernel, because it is the cheapest strong oracle. Where it costs
  code or speed, a group may drop it and then shows the same qualities: over many seeds per
  code, the JS's distributions of par, exact, coverage, wins and challenge within sampling
  error, and every level valid (it solves at its par). G3's verdict is unchanged: exact, at
  no cost.

### Friction (review)

1. **An import's signature is never checked against the export.** Reference 7.1 says so ("The
   signature an import writes is documentation"), but the port treats its restated types as
   load-bearing ("Copy it; never retype it", board.ents). Probed in a copy of `core/`
   (`review-g3/probes/restated`): in `test/g3.ents`, swapping the names of `occupied` and `at` in
   the restated `HexBoard`, dropping `Par.nodes`, or renaming `Solved.nodes` to `count` all give
   `check` "OK: 361 declarations across 13 modules" and **byte-identical wasm**, even though the
   file still reads `f.nodes` and `s.nodes`: the calls take the exporter's types, and the
   restated ones are not compared. A wrong restated type is caught only where it meets the real
   one in the importer's own code (a local `func occ0(b: *HexBoard)` given `hex_compile`'s
   result). So of hex.ents's 41 import lines and 7 restated types (700 tokens, 12% of the
   file's), none is verified; a stale one misleads a reader and nothing says so. A check that an
   import's written signature matches the export (or an import that names a type instead of
   restating it) would remove the risk; no planned feature does. 15 minutes to probe.
2. **The 18 `// unchecked:` reads cannot be run checked.** To audit them the review read each
   reason against its assert or guard; the oracles cannot test them by running, because the
   many-pointer tables have no length and there is no build that checks them (no debug mode, no
   `--checked`). A switch that compiled `[*]T` indexing with the asserts the reasons describe
   would let the millions of values of the oracles test the audit. Not planned.
3. **`-O` is `wasm-opt -Oz`** (cli.ts: `npx wasm-opt -Oz ...`), a size setting; G2 found it did
   not change casual play. On G3's kernels (the same bench, the same processes): `-Oz` makes
   casual play 3% and 7% faster (3.585 and 4.713 ms) and the file 29% smaller (22,342 bytes).
   `wasm-opt -O3` (the same tool, node_modules/.bin/wasm-opt version 129, run by hand) makes
   casual play **14% and 19% faster** (3.191 and 4.085 ms: 1.38x and 1.36x MoonBit), solve 10%
   and 11%, par 2% and 3%, and the file 40% smaller (18,861 bytes). It inlines, leaving 72
   functions of the 193 (`-Oz` leaves 96): the work `// inline:` did by hand for one call. On
   the large boards it gives casual 12% to 18% and nothing on par or solve (bound's loop is
   already tight). The `-O3` file passes every G3 oracle unchanged (`review-g3/optcheck.sh`,
   under the lock): `check-g3` 16,224 comparisons with the same stack peak, the wide check
   48,589, `--extra` 2,808 and `check-g3-review` 40,640, 0 failed in each (the `-Oz` file passed
   `check-g3 --frac 0.05`). The CLI offers no way to ask for `-O3`; a flag for the level
   would make it a one-word change.
4. **Profiling still needs the WAT-order script** (no name section): G3's `profile.sh` worked
   unchanged on the review's builds (2 minutes). It showed where `par` goes on the large boards
   (Time, above).

### Error messages (verbatim)

1. The restated type that meets the real one (friction 1), printed twice, the source type
   spelled out and the target only by its alias, so the reader diffs 9 fields by eye to find
   that two names are swapped:
   `swap2.ents:176:17: argument 1: cannot assign *mut (w: i32, n: i32, left: i32, tracks: [*]mut []i32, lengths: [*]mut i32, offsets: [*]mut i32, occupied: [*]mut i32, at: [*]mut i32, reach: [*]mut i32) to *HexBoard`

### Bugs

- None new, and no wrong code. bugs/01 to 05 still show what they say on 8f459f1 (04's line
  number in codegen.ts has moved).

### Tooling

- Checked G3's numbers: `check hex.ents` 0.85 s, `check test/g3.ents` 1.35 s, `test hex.ents`
  0.90 s, `wasm test/g3.ents` 1.17 s and the same bytes. `hover hex.ents:571:p0` is `local p0:
  i32`, and over `search` it spells `Solve` out (about 600 characters), as G3 wrote.
- Two of the G3 section's counts are off: `references hex.ents:326:to` lists **10** uses, not 11
  (4 + 2 of them in the inline tests), and `fmt` changes **131** lines of `hex.ents`, not 260
  (260 is both sides of the diff).
- Each mutant built in about 1.2 s and its inline tests ran in about 0.9 s, so a mutant costs what
  its oracle costs. Running the review oracle on a mutant that broke the board was slow (a wrong
  `lengths` made casual and fewest wander): the runner now skips the review stage for mutants
  the first two checks have already killed.

### Pleasant

- **Auditing was fast because of the tags.** `grep '// unchecked:'` gives the 18 sites with
  their reasons, `// reserve:` the 10 lists that must not grow, `// closure:` and `// enum:` the
  places where the port's shape differs from MoonBit's. Reading the port beside hex.mbt was
  line by line: the same names, the same order, the same branches.
- **The port is exact where the game is heaviest.** On the 48x48 levels of 224 ropes, at the
  auto-solve budget, and from the generator's own seeds: 3.9M more values, 0 different.
- **Fast on the biggest boards** (Time, above), without any change made for them: 13x the JS on
  par, and faster than MoonBit on every kernel.

### Counts (review)

| What | Count |
| --- | ---: |
| values compared on new cases (review oracle; wide seeds 1, 2, 0x5151, 777) | 22.1M |
| values compared in reruns of G3's checks | 5.3M |
| new oracle calls the game makes (solve 5000 x2, par, fewest 30/300, casual x32 x3) | 8 per position |
| generated Hex levels added (fixture) | 160 |
| differences from the JS | 0 |
| G3 mutant survivors shown equivalent / only empirically | 4 / 1 |
| review mutants: killed / equivalent / the open postpone pass | 12 / 2 / 1 |
| compiler bugs | 0 |
| fixes to `hex.ents` | 0 |

Wall clock (from the progress file): about 1.3 hours, 23:29 to 00:45, much of it
runs under the lock (the review oracle 7 minutes, the reruns 6, the bench 10, the mutants 22,
the -O3 build's oracles 11) while reading, probes and this log went on beside them.

## 19 Nov: G4, the Hex woven builder (hex_intentions, hex_build)

Compiler: encantis origin/main **8f459f1** (fetched at the start: #29 to #33 merged, with lib/vec.ents
and comptime value parameters). Commits eac6f18, 8e2db21, a4b133d and the ones after. The first
engineer on G4 was killed by a restart at 00:44 after writing `dump-hexbuild.cjs` and the fixture;
this section is the second's, from 00:46.

### What was built

- `hexbuild.ents`: `hex_intentions` (the replay with stops, MoonBit's `step` closure as a top-level
  `step` over an `Intent` context) and `hex_build` with its seven closures as top-level functions over
  33 module globals reset at entry, as weave.ents does. Plus `set_draw_exact` (below).
- `test/g4.ents`: `t_build(state, coverage, tapDepth)`, `t_intentions()`, `t_bench(..., reps)`,
  `t_draw_exact(on)`, `draws()`, `rng_state()`, over cfg words.
- Oracles: `dump-hexbuild.cjs` and `fixtures/hexbuild-expected.json` (the first engineer's: 250 of the
  809 H.build calls the 9e69e3a generator makes over the 60 Hex Journey levels and 15 custom Hex and
  mixed codes, 4x5 to 32x32 colossal; no call returned null), `check-hexbuild.cjs` (exact), `hybrid.cjs`
  (the JS generator with H.build replaced by the port), `quality-hexbuild.cjs` (distributions),
  `bench-g4.cjs` (time, against a scratch MoonBit package that exports `@core.hex_build`).

### Exactness (draw-exact mode)

- `check-hexbuild.cjs` compares every rope cell, the stops (read from a copy of hex/engine.js whose
  build also returns them), plan, knots, traps, depth, cost, the draw count and the generator's state
  after, then `intentions()` three ways on each built board (with the plan, with none, without the
  last rope). **4,000 comparisons on 250 builds, 0 failed, in order and in reverse, on the first
  build** (00:59). `--seeds 20` (20 other states per cfg, against the live JS): 5,250 builds, 54,000
  comparisons, 0 failed (348 s). `--js` passes; `--controls` 16 of 16.
- Through the whole generator (`hybrid.cjs`, draw-exact): **all 120 Journey levels come out as in
  reference.json** (layout key and par), in 52.9 s, of which the port's 501 builds took 2.3 s.
- On the final file (after the speed-ups, in draw-exact mode): check-hexbuild 4,000 comparisons,
  0 failed; `--seeds 20` 5,250 builds, 54,000 comparisons, 0 failed (306 s); the `wasm-opt -O3` build of it passes check-hexbuild too.
- The earlier groups' oracles, rerun after G4 (`check-all.sh`, now with G4's two lines, under the
  lock): every check passed (G1, G1-wide, G2, G2-wide, G2 `--extra`, the three weave scripts, G3,
  G3-wide, G3 `--extra`, G3's review at a quarter, check-hexbuild `--seeds 2`, the builder part).

### Departures (from the JS's exact behaviour)

By default `hex_build` draws less than the JS in two places. Each leaves the *law* of what is built
unchanged (the same distribution of boards, another realisation), because each skips draws whose
outcome cannot change what the step does:

| | What the JS does | What the port does | Saved |
| --- | --- | --- | --- |
| **D1** | A knot attempt shapes rope a, then rope b in full, then requires each one's way out to cross the other's body | Gives b up as soon as its way out (known before its body grows) misses a's cells: the attempt fails then whatever b's body is (`shape(want, aim, must)`) | Over the fixture's builds the JS grows 3.36M of its 8.0M knot-phase body cells in attempts that fail exactly there (297K of 910K attempts) |
| **D2** | A shape without an aim draws a cell 24 times and keeps the first free one | Draws what that comes to: none with the chance that all 24 miss, (1 - f)^24 for a share f of free cells, else one of the free cells, all alike, from a list of free cells kept as ropes are laid (`random_head`): two draws | The JS spends 12.1M of its 30.2M draws over the fixture in this search (2.28M searches, 152K of which miss all 24) |

Together: over the fixture's 250 cfgs, 30.2M draws become 19.5M, and the time falls 16% (1.29 s a
pass against 1.54 s in draw-exact mode, interleaved). Code: D1 is 3 lines, D2 about 40 (the list, its
upkeep at 4 sites, the draw). `set_draw_exact(true)` restores the JS's draws; the exact oracle runs
in that mode.

Smaller departures, none of which changes a level:
- The core's compile failing (a way out passes a cell twice) makes `hex_build` return none, where
  H.build throws; woven() turns that throw into null, so the generator sees the same.
- (From MoonBit, not the JS:) the core's covered cells are counted as distinct cells, as the JS's
  `used.size` does; MoonBit counts points. `done` is an i32 as in MoonBit (the JS's Uint8Array would
  wrap at 256 stops on one rope, which no build reaches).

**Journey levels that now differ from the JS game's: 60 of 120, every Hex level** (the square levels
do not use hex_build). 54 change; **6 cannot be generated at all** with their Journey seeds (L32, L36,
L37, L38, L46, L50: every attempt rejected, "Could not densely weave"). The Journey's seeds were
chosen by scripts/build-grid-journey.cjs against the JS's own draws: on fresh seeds the JS gives up
on 19, 12 and 11 of 240 levels of the same 60 specs (5 to 8%), the port on 9 and 10 (quality run,
below), and on the Journey's own seeds the JS on none. Any change of draws loses that choice. Either the Journey is rebuilt with the new builder, or Journey levels are generated in
draw-exact mode (one call, `set_draw_exact(true)`, before them): **G7 should do the second unless the
Journey is rebuilt.**

### Quality (the default mode, against the JS on other seeds)

`quality-hexbuild.cjs`, the rule fixed before set C was looked at: every set-C level valid by the
exact kernels; for each of 27 level metrics a two-sample KS test of C against A and B pooled must not
reject at 1%; the failure rate by a test of proportions at 1%. Sets A and B are the JS (9e69e3a) on
two seed sets, set C the same specs on a third with hex_build the port's (hybrid.cjs); 1,440 levels
a set over 7 classes, 4,320 in all, 3 workers under the lock, 31 minutes (01:29 to 02:00).

| Class (levels a set) | Failed A / B / C | KS failures (of 27) | Set-C invalid | Time a set: JS / with the port (its hex_build) |
| --- | --- | ---: | ---: | --- |
| Journey Hex specs x 4 seeds (240) | 19 / 12 / 9 | 1: coverage | 0 | 220.6 s / 107.8 s (8.2 s) |
| small: 4x5, 6x6, 8x8 M, 8x8 MS (200) | 1 / 1 / 0 | 0 | 0 | 16.6 s / 6.0 s (1.4 s) |
| medium: 12x12 N and M, 16x10, 16x16 M (200) | 0 / 0 / 0 | 0 | 0 | 219.3 s / 43.1 s (9.3 s) |
| large: 20x20 and 24x24, N and M (200) | 0 / 0 / 0 | 0 | 0 | 1,168.5 s / 325.9 s (44.7 s) |
| colossal 32x32, C and MC (200) | 0 / 0 / 0 | 0 | 0 | 93.3 s / 11.4 s (6.8 s) |
| colossal 48x48, C and MC (200) | 0 / 0 / 0 | 0 | 0 | 670.5 s / 72.5 s (51.3 s) |
| mixed 10x14 N, 12x12 M (200, half Hex) | 0 / 0 / 0 | 0 | 0 | 75.0 s / 25.2 s (3.5 s) |

The 27 metrics: par, exact, ropes, mean and longest rope, coverage, casual wins, work, challenge,
distance from the target challenge, wins over the ceiling, manual slides, repeated, interleaved and
automatic ropes, knots, traps, construction depth and average depth, mirrors, spinners, manual
mirrors, interaction, joins, mutual-wait ropes, branching depth, largest coupled group. Every
quantile table is in `fixtures/quality-g4-report.txt`; for example on the large boards the medians
of par are 45 / 44 / 45, of challenge 9.09 / 9.06 / 9.00, of interaction 4.34 / 4.29 / 4.32, of knots
4 / 4 / 4 and of traps 4 / 4 / 4 (A / B / C).

**The one failure, looked at:** Journey coverage, D = 0.141 against 0.132 (A against B: 0.050). Means
0.9130 / 0.9133 / 0.9089; paired by spec and seed, C minus the mean of A and B is -0.0032 with a
standard error of 0.0023 (1.4 se). No other class moves the same way (medium +0.0035, small
+0.0002, mixed +0.0003, large +0.0009), and C kept 9 levels the JS gave up on more often (19 and 12),
which shifts the mix. 189 tests at 1% expect about 2 false failures. **Replicated** (a fresh seed set
for each side, 240 Journey levels each: D the JS, E the port): E's coverage mean is 0.9132 (D 0.9124),
E alone against A, B and D pooled gives D = 0.045 against 0.124, and the port's 480 levels (C and E)
against the JS's 720 (A, B, D) fail none of the 27 tests (coverage D = 0.085 against 0.098). Failure
rates: 11 (D) and 10 (E) of 240. So it was chance, and **the departures keep every quality measured**.

The builder alone (`--builder --seeds 10`: 2,500 builds a set on the fixture's 250 cfgs): 0 invalid
port builds, and none of the 8 outputs (ropes, cells, mean length, knots made, traps, depth, cost,
plan length) differs (largest D 0.027 against 0.040). Draws (median 74K against 112K) and time
(median 3.75 ms against 21.5 ms) differ, as meant.

### Time

`bench-g4.cjs` under the lock (load 1.3 at the end): hex_build over the fixture's 250 cfgs, each from
its recorded state, the call alone, port then MoonBit wasm-gc (a scratch package, `g4/mbt`, that
exports `@core.hex_build` behind the same cfg words; src/core unchanged) then the JS, interleaved,
best of 5 rounds per process, median over processes. MoonBit's and the JS's results agree on every
call (and the port's too in draw-exact mode). The last two columns are how many times faster the
port is.

| Cells (cases) | Port, default | Port, draw-exact | MoonBit | JS | MoonBit / port (default, exact) | JS / port (default, exact) |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| up to 100 (88) | 100.0 | 146.6 | 294.8 | 665.6 | 2.95x, 2.11x | 6.66x, 4.88x |
| 101 to 300 (149) | 745.3 | 885.0 | 2,175.1 | 5,330.0 | 2.92x, 2.53x | 7.15x, 6.31x |
| 301 to 600 (9) | 348.0 | 487.5 | 1,487.5 | 4,929.5 | 4.27x, 3.06x | 14.16x, 10.62x |
| over 600 (4) | 141.6 | 178.3 | 489.9 | 1,282.2 | 3.46x, 2.85x | 9.05x, 7.38x |
| **all (250)** | **1,349.3** | **1,733.6** | **4,462.5** | **12,295.7** | **3.31x, 2.73x** | **9.11x, 7.38x** |

(ms; 5 processes for the default mode, 3 for draw-exact, whose MoonBit and JS columns are 4,725.7 and
12,792.1 in all; the default mode's are shown.)

How it got there (`g4/prof/ab.cjs`: every version interleaved in one process, ms a pass over the
fixture, best of 5, while check-all ran beside it, so slower than the bench above):

| Step | Time | Exact? |
| --- | ---: | --- |
| The straight port (v1, eac6f18): MoonBit's algorithm, a compile per candidate | 3,304 | yes |
| The laid ropes compiled once per step; a candidate's board is the laid board's tables copied plus its own track (`with_shape`) (v2) | 2,040 | yes |
| shape's free-cell test by hand, seen and forward one stamp table, the mirror and kept-gap tables one; `to()` inlined in the replay (v3, 8e2db21) | 1,672 | yes |
| The final file in draw-exact mode | 1,657 | yes |
| The final file, default mode: D1 and D2 (a4b133d) | 1,320 | no: the same law |
| The final file through `wasm-opt -O3` (the CLI's `-O` is `-Oz`): default / draw-exact | 1,150 / 1,564 | it passes check-hexbuild |
| Tried and dropped: a dirty-rope list in the replay (try a rope again only after a cell of its track changed) | 20 to 30% slower than v3 | (yes) |

The profile (`--cpu-prof`, names from the WAT, inclusive) of the default mode: the knot phase 49%
(nearly all of it shape: two shapes per attempt, 1% of attempts reach a board), the candidates'
replays 32%, `try_trap` 28% (with its replays), the random draws 18%.

Through the whole generator (quality run, above): with the port's builder a large board takes 28% of
the JS's time to generate, a 48x48 colossal one 11%; the port's hex_build is 14% and 71% of that.

### Size

`node oracle/size.cjs G4`: hexbuild.ents is 5,912 tokens against MoonBit's 3,654 for the same
declarations (1.62x), 1.87x with its 45 import lines (637 tokens) and restated types (284). The
straight port first written (v1, exact, before any speed-up) was 4,980 tokens (1.36x, 1.61x with
imports): the speed-ups and the departures cost 932 tokens (`laid_board`, `copied`, `with_shape` and
`trial`; the shape test by hand; `random_head` with its list of free cells and its upkeep; the
draw-exact switch and D1). test/g4.wasm is 42,672 bytes (21,337 through `wasm-opt -O3`).

### Friction

1. **Seven closures over twenty locals became 33 module globals** (`// closure:` 12 sites). `free`,
   `ray`, `intent`, `shape`, `aim_at`, `note_turns` and `try_trap` share the builder's tables, so their
   state is module globals set up again at the top of `hex_build` (29 lines of resets), as weave.ents
   does; `step` keeps its state in a context struct (`Intent`) because `hex_intentions` is also
   called on its own. One builder runs at a time. Closures, even non-escaping ones, would remove the
   globals and the resets. About 20 minutes.
2. **A `let` is seen to the end of its function** (reference 3.3), so a name used in one loop body
   cannot be used again in a later one: 12 renames on the first `check` of hexbuild.ents and 2 more
   after the laid-board refactor (`c` four times, `p` twice, `s` twice, `n`, `spot`, `fatal`, `base`
   twice). The message names the clash but not where the first one is (below). 10 minutes.
3. **A local cannot take the name of an imported function**: `size` (board.ents's) became `distinct`,
   and a local `step` (a function of the module) became `knot_scope`. 2 sites, 2 minutes.
4. **None by hand** (`// enum:` 9 sites): `0 as ?*HexIntent` (3), `0 as ?*Shape`, `0 as ?*HexBuilt` (2),
   `(0 as [*]i32, 0:u32)` for a `?[]i32` with no certificate, and `Aim(-1, 0)` for MoonBit's
   `(Int32, Int32)?`. There is no `none` literal for an optional pointer or slice. Enums
   (`Option(T)`) would remove all of them.
5. **No `let ... else`**: MoonBit's 9 `guard ... else` in these lines became nested `if let`s (3 deep
   in `knot_attempt`) or functions that return early (`knot_attempt`, `lay_core`). 19 `if let`s in all
   (4 in tests).
6. **`free`'s test, and `to()` in the replay, written out by hand** (`// inline:` 1 site, plus the
   shape loop): there is no inliner, and `free` and `to` were 8% of the time each in the first
   profile. `wasm-opt -O3` on the same wasm does it, and more: 14% faster again.
7. **The laid board's scope is not lexical.** The laid ropes are compiled once per step and kept in
   a "phase" scope that `laid_board(phase)` resets when a rope has been laid; that reset must never
   run while an inner scope is open (it would free it), which only the call sites' order ensures. A
   second arena (`Stack(n)`, comptime-n, PORT-PLAN 10.1) would hold it safely. 10 minutes of thought.
8. **The keep pattern**: 17 `// reserve:` sites. What outlives a step (the rope pool of area + core
   cells, the rope and stop lists of area / 2 + 2 + core ropes, the plan and best candidate's moves
   of 2 x ropes + core stops, the best candidate's cells, the stop cells returned) is given all its
   room at the call's start and asserted.
9. **`memcpy` wants a sized array pointer** even for a run-time length: the 4 copies of `with_shape`
   cast a many-pointer to `*mut [1]u8`, a fiction, to copy `n * 4` bytes. A `memcpy` over
   many-pointers would read better. And `&p[k]` on a many-pointer is a `*mut T`, so passing it on as
   a many-pointer needs `(&p[k]) as [*]mut i32` (probe; the final code does not need it).
10. **FixedVec(6, i32) worked first time** for `choices` and `dirs` (`data choices: FixedVec(6, i32) =
    mut (0, choice_cells)`, static, no allocation). The plan's `*mut [6]i32` indexed by `k % 6` was
    not needed. Its names clash with lib/vec's, so 3 renames on import (`fixed_push`, `fixed_items`,
    `fixed_clear`), as lib/README says.

### Error messages (verbatim)

1. For a `let c` inside an earlier, closed loop body:
   `hexbuild.ents:341:7: 'c' is already declared: a loop variable cannot reuse the name of a variable in scope`
   ("in scope" reads wrong for a variable whose block has ended, and the first declaration's line is
   not given).
2. For a local named like an imported function: `hexbuild.ents:391:7: 'size' is already declared in this scope`
   (it does not say that `size` is an imported function).
3. A clash cascades: after `'base' is already declared in this scope`, the uses of the parameter
   `base` were typed as the clashing local's i32:
   `hexbuild.ents:527:15: no field 'n' on type i32` and
   `hexbuild.ents:530:18: receiver: cannot assign i32 to *HexBoard`.
4. `argument 1: cannot assign *mut i32 to [*]mut i32` for `&a[10]` passed as a many-pointer (probe).

### Bugs

None found: no wrong code and no crash in G4, so no new file in bugs/ (01 to 05 are the earlier groups').

### Tooling

- Under the quality run's load (3 workers): `check hexbuild.ents` 1.7 s, `check test/g4.ents` 2.2 s,
  `test hexbuild.ents` 1.8 s (2 tests), `wasm test/g4.ents` 2.3 s. `build.sh` with G4: 17.7 s.
- `hover hexbuild.ents:325:with_shape` spells `HexBoard` and `Shape` out (405 characters), as G3 found.
  `references` lists the 6 uses.
- `fmt` would change 189 lines of hexbuild.ents, nearly all `n: u32` to `n:u32` in signatures (the
  reference's own examples use both). Not applied.
- Profiling as G3 did (`--cpu-prof`, names from the WAT order), with an inclusive view added
  (`g4/prof/incl.cjs`). It found the knot phase (half the time) and the per-candidate compile.

### Pleasant

- **Exact on the first build**, 250 recorded builds and 5,250 more from other states: the port
  reads beside hex.mbt line by line, and the JS's draw order was easy to keep (short-circuits are
  the JS's).
- **The hybrid harness**: because mulberry32's state only adds 0x6D2B79F5 per draw, the JS generator
  can hand its state to the wasm and catch up afterwards; so the whole JS generator runs on the
  port's builder, and the qualities of whole levels can be compared before G7 exists.
- **Comptime value parameters were already there**: FixedVec in static data, its bound in its type.
- Speed-ups without departures were easy to verify: each was one rebuild and 17 s of
  check-hexbuild.

### Where `comptime n: u32` with `[n]T` helped G4

- Used: `FixedVec(6, i32)` for `choices` and `dirs` (1 `// comptime-n:` site; 2 lists).
- Would help: a second arena for the laid board (friction 7), and for the keep lists of friction 8,
  which could then grow as found instead of being reserved.

### Counts (tags in G4's files, sites; header mentions left out)

| Tag | hexbuild.ents | test/g4.ents |
| --- | ---: | ---: |
| `// closure:` | 12 | 0 |
| `// fnvalue:` | 0 | 0 |
| `// enum:` | 8 | 1 |
| `// comptime-n:` | 1 | 0 |
| `// unchecked:` | 24 | 1 |
| `// reserve:` | 17 | 0 |
| `// inline:` | 1 | 0 |

| What | Count |
| --- | ---: |
| module globals for builder state | 33 |
| names renamed for function-scoped lets / imported names | 14 / 2 |
| `if let` (deepest nesting) | 15 outside tests (3) |
| compiler bugs | 0 |
| differences from the JS in draw-exact mode | 0 |
| departures that change draws (D1, D2) | 2 |
| Journey levels that differ (of 120) / fail to generate | 60 / 6 |

## 19 Nov: review of G4 (adversarial)

- **Compiler:** encantis origin/main **ce7ee77** (fetched at 02:34: 12 commits after G4's 8f459f1,
  among them `wasm --release` and `--size`, binaryen pinned and run in process for `-O`, and
  f72a795 "Index a fixed array that lies in memory where it lies"). Every wasm of the core rebuilds
  byte for byte under it (`build.sh`, 25 s, `git status` clean), so no result can have moved;
  check-all was rerun at the end anyway. Reviewed head 233baf3. Scratch: `review-g4/`.
- **Reran first:** `test/g4.wasm` rebuilds to the committed 42,672 bytes; inline tests 2 of 2
  (hexbuild) and 2 of 2 (fixedvec). `check-hexbuild` 4,000 comparisons of 69,867 rope and plan
  words, 0 failed (16.5 s), the same `--reverse`; `--js` passes; `--controls` 16 of 16. `--seeds
  20`: 5,250 builds, 54,000 comparisons of 1,467,201 words, 0 failed (311 s). The `wasm-opt -O3`
  build (21,337 bytes, the same file G4 made) and the new `wasm --release` build (20,627 bytes)
  pass check-hexbuild too. `size.cjs G4`: 5,912 tokens, 1.62x and 1.87x; `fmt` would change 189
  lines; `references` on `with_shape` gives its 6 uses: all as G4 says. G4's quality report rebuilt
  from its own data is `fixtures/quality-g4-report.txt` line for line. Bug repros 01 to 04 still
  show what their headers say on ce7ee77 (04's throw is now at codegen.ts:4127).
- **Read against hex.mbt 669 to 1238 and hex/engine.js** line by line, draw by draw. The port
  differs from the JS only where MoonBit does, on calls the game never makes: no `ropeCount`;
  `minLength` fixed at 2 (the JS's `shape` defaults to max(2, minLength || 3), but the generator
  passes 2 in every call); `tapDepth` always given (the JS reads null as 2); the stats beside the
  ropes left to the caller (hybrid.cjs computes them as the JS does). The memory discipline holds:
  every list that outlives a step is reserved and asserted, and each bound follows from the ropes
  sharing no cell (at most area / 2 ropes, one stop per knot plus the core's); `defer` is
  block-scoped (reference "Defer"), so each knot attempt and each candidate frees its scope; the
  laid board's phase is reset only with no inner scope open.
- **The departures are sound.** D1 skips growing a knot's second rope once its way out misses the
  first rope, where the JS's attempt fails whatever the body; D2 draws a head from the law of the
  JS's 24 tries, none with probability (1 - f)^24, else uniform over the free cells. Both leave
  the builder's law unchanged. D2 rests on its free-cell list being exact, which no oracle saw:
  draw-exact mode does not use it, and the quality oracle sees only distributions. A probe build
  that asserts at every random head that the list is exactly the free cells
  (`oracle/check-hexbuild-d2.cjs`, made by text substitution into a copy of the sources) passes
  1,000 default-mode builds on the fixture's cfgs; its control, the gaps kept in front of traps
  left on the list, traps in 160 of 250. That mutation passes every exact check and would show in
  the quality oracle only as weaker traps.
- **What the oracles never reached.** A branch count of the JS over the fixture's 250 builds
  (`oracle/cov-hexbuild.cjs`, 32 counters substituted into a copy of hex/engine.js; the port
  mirrors it branch for branch): no core is ever refused or fails its certificate, no certificate
  step fails in `intentions`, and **247 of the 250 builds end at the attempt limit** (`area * 22`)
  under their coverage, only 3 reaching 0.99. Unreachable in any build: `aimAt` with no idle
  mirror (it is called only when one is idle), a trap's rope that would not stop in its gap, and a
  shape under its minimum of 2. **`oracle/check-hexbuild-edges.cjs`** makes 32 cfgs for the rest: a
  core with a one-cell rope, off the board, on another rope's cell, with a way out that passes a
  cell twice (the JS throws "twice", the port returns none, woven() makes both null), with a
  failing, an empty and no certificate, stops off the track, fewer stop lists than ropes; knots and
  traps past what fits (the attempt limits), coverage 0 and 1, tapDepth 0, 1 and 100, length 1 and
  80, stage 0 and 200, dense mirrors, 12x1, 1x12, 2x2, 3x3, 2x9, and 40x40 with traps (no game cfg
  has traps above 24x24). **4 states each: 128 builds (92 built, 32 null, 4 thrown by the JS), 264
  replays, 1,547 comparisons, 0 failed**; its stack peaks at 666,920 bytes (the 40x40 one).
- **The exact check on the generator's own calls for new specs.** **`oracle/check-hexbuild-shadow.cjs`**
  runs the 9e69e3a generator as the JS does and hands every H.build call to the port as well, from
  the same state, in draw-exact mode, comparing everything check-hexbuild compares. 22 codes the
  fixture lacks (4x4, 5x4, 4x24, 24x4, 7x9, 13x11, 8x8 M, 8x24 M, 24x8 M, 15x17 M, 10x14 S, 12x12 MS,
  18x18, 22x24 M; the colossal rules at 12x12, 48x16 M, 8x48 M, 48x48 and 20x20 MS; difficulty 90 to
  100 and 1 to 10; a mixed MS set), 12 levels each, and the 60 Hex Journey specs on new seeds:
  **324 levels, 2,328 builds, 37,235 comparisons of 766,245 rope and plan words, 0 failed** (291 s);
  another 8 levels a code on other seeds, 1,210 builds and 19,355 comparisons, 0 failed. Its
  `--control` (the default mode) fails, on draws first.
- **Quality on new seeds and classes** (**`oracle/quality-g4-review.cjs`**; the rule is in its
  header and was in the progress file before set H existed): sets F and G the JS, H the JS
  generator with the port's hex_build in its default mode (hybrid.cjs); 9 classes, 1,840 levels a
  set, 5,520 in all, under the lock with 3 workers (39 minutes). 40 metrics a class: G4's 27, and
  the shortest rope, bends and the most in one rope, par per rope, the dependency graph's edges,
  essential edges, forks, depth, mutual-wait groups and coupled groups, manual bounces, and the
  H.build calls a level took and how many returned null. **Every set-H level is valid by the exact
  kernels (0 of 1,840 invalid), and none of the 400 KS tests rejects at 1%** (nor does any of the
  400 JS-against-JS ones); the closest is colossalx's mean rope length, D = 0.125 against a
  critical 0.141 (JS against JS 0.105).

  | Class (levels a set) | Failed F / G / H | KS rejections (of 40) | H invalid | Time a set: JS / with the port (its hex_build) |
  | --- | --- | ---: | ---: | --- |
  | Journey Hex specs x 4 seeds (240) | 7 / 11 / 8 | 0 | 0 | 207.1 s / 126.4 s (10.0 s): 61% |
  | thin: 4x24, 24x4, 8x24 M, 24x8 M (200) | 0 / 0 / 0 | 0 | 0 | 127.1 s / 33.8 s (8.0 s): 27% |
  | tiny: 4x4, 5x4, 4x6, 7x5 (200) | 0 / 0 / 0 | 0 | 0 | 4.6 s / 1.9 s (0.9 s): 40% |
  | spinners: 10x14 S, 12x12 S, 16x16 MS, 20x20 S (200) | 0 / 0 / 0 | 0 | 0 | 558.2 s / 307.6 s (17.0 s): 55% |
  | colossal rules: 12x12, 48x16 M, 16x48, 20x20 MS (200) | 0 / 0 / 0 | 0 | 0 | 31.7 s / 8.2 s (2.7 s): 26% |
  | difficulty 1-10 and 90-100, 10x14 and 14x14 M (200) | 0 / 0 / 0 | 0 | 0 | 108.3 s / 28.1 s (7.2 s): 26% |
  | mixed: 14x10 MS, 18x18 (200, half Hex) | 0 / 0 / 0 | 0 (0 on the Hex half alone) | 0 | 242.7 s / 126.0 s (8.2 s): 52% |
  | large: 18x22, 22x18 M, 24x20, 20x24 M (200) | 0 / 0 / 0 | 0 | 0 | 1,018.7 s / 273.1 s (39.8 s): 27% |
  | colossal 48x48, plain and M (200) | 0 / 0 / 0 | 0 | 0 | 711.1 s / 81.9 s (57.4 s): 12% |

  Medians (F / G / H), for example: on the large boards par 42 / 42 / 42, challenge 8.88 / 8.88 /
  9.00, interaction 4.16 / 4.33 / 4.24, knots 4 / 4 / 4, traps 3 / 3 / 3; on 48x48 par 216 / 212 /
  214, knots 11.5 / 12 / 12; on the Journey specs challenge 6.8 / 6.8 / 6.4 and distance from the
  target 1.25 / 0.99 / 1.01. Every quantile table is in `fixtures/quality-g4-review-report.txt`,
  every level in `fixtures/quality-g4-review.jsonl.gz`.
- **Paired by cfg** (**`oracle/quality-g4-paired.cjs`**). The builder part of quality-hexbuild pools
  250 cfgs from 4x5 to 32x32 into one distribution per output, which the differences between cfgs
  dominate: a small systematic shift would hide in it. Here each fixture cfg is built from 8 new
  states by the JS twice (J1, J2) and the port once, and each of 13 outputs is compared cfg by cfg
  (a z per cfg, summed over the cfgs of a size group; |Z| under 3.29 required, fixed first): **0 of
  65 fail**, no port build invalid, no null builds on either side (215 s). The largest are the
  longest rope on boards of up to 100 cells (Z = -2.82, the JS against itself -0.66) and on 101 to
  300 cells (+2.54): opposite signs, and +0.08 over all 250 cfgs. A replicate on other states (16
  a set, the 237 cfgs of up to 300 cells, 236 s) fails none either: the longest rope is then -0.36
  on the small boards and -2.17 on 101 to 300 cells (its sign turned), the largest |Z| of the
  replicate. Chance, as the departures' argument says it must be.
- **Journey** (`oracle/journey-g4.cjs`, the 120 levels through the JS generator three
  ways). Draw-exact: **all 120 levels are the JS's, every field** (not only layout key and par), and
  match reference.json. Default mode: **60 of the 120 differ from the JS game's** (every Hex level):
  54 change and 6 cannot be generated (L32, L36, L37, L38, L46, L50), as G4 found. The 54 also lose
  what build-grid-journey.cjs chose their seeds for: their mean distance from the target challenge
  is 1.78 (15 of 54 within 0.5), against 0.97 for the Journey's own 60 (29 within 0.5), and 1.64 to
  1.72 for the JS on fresh seeds of the same specs (25 to 31% within 0.5). So the departures keep
  the qualities of generated levels, but the Journey is not a sample: it is a selection made
  against the JS's draws, and in default mode it becomes a sample. G7 must generate it in
  draw-exact mode (G4 said so in its as-built notes; PORT-PLAN's G7 section now says it where G7
  reads, with these numbers).
- **Time.** `bench-g4.cjs` again, under the lock at a load of 1.6 to 2.1, best of 5 rounds a
  process, median over processes: the default mode 1,374.8 ms over the 250 fixture cfgs (3
  processes; G4's 1,349.3) against MoonBit wasm-gc's 4,660.2 and the JS's 12,815.7, **3.39x and
  9.32x**; draw-exact 1,748.8 ms (2 processes; G4's 1,733.6), 2.71x and 7.47x. G4's numbers
  reproduce within 2%. **But the MoonBit ratio is not the language's alone.** The straight port
  (G4's v1 of eac6f18: MoonBit's algorithm, a compile per candidate) takes 3,450.2 ms in the same
  harness: **1.37x MoonBit** and 3.56x the JS. The rest, to 2.71x, is the speed-ups (the laid board
  compiled once per step, `with_shape`, the shape test by hand, the inlined `to`), which MoonBit's
  code could make as well; and to 3.39x the departures. Build flags, default mode: `wasm --release`
  1,352.1 ms (3.60x), `wasm-opt -O3` 1,294.6 ms (3.87x), 2 processes each (MoonBit's column was
  4,870 and 5,007 in those runs). A whole level generated with the port's builder takes 12% (48x48)
  to 61% (the Journey specs, where scoring and spinners dominate) of the JS's time (quality run).
- **What was fixed:** nothing in `hexbuild.ents`: no output differed from the JS in draw-exact mode,
  no generated level was invalid or differed in a quality, and no limit that traps is reachable by
  the game. In the oracles: **`check-all.sh` ran `node quality-hexbuild.cjs --builder --seeds 2 |
  grep -v '^  ' || fail=1`, whose status is grep's**, so a builder part that printed its invalid
  builds and exited 1 still passed check-all; it now keeps node's status, and runs the shadow,
  edge and D2 checks briefly. `check-hexbuild.cjs` printed `stack_peak()` after its last call, an
  intentions replay (4,780 bytes), as the builds' peak; it now prints the highest any build
  reached (260,256 bytes with `--seeds 20`). PORT-PLAN's G7 section: the draw-exact rule above.
- **check-all.sh at the end** (the final tree, with the review's lines; under the lock, 04:33 to
  04:46): every check passed: G1, G1-wide, G2, G2-wide, G2 `--extra`, the weave scripts, G2's big
  weave, G3, G3-wide, G3 `--extra`, G3's review at a quarter, check-hexbuild `--seeds 2` (9,000
  comparisons), the builder part (0 invalid, now with its own status), the shadow at 2 levels a
  code (4,783 comparisons), the edges at 2 states (771) and the D2 probe (250 builds, 0 traps).
- **Small inaccuracies in G4's section:** its tag table counts the header's mention of each tag
  (in code: `// closure:` 11 sites, not 12; `// enum:` 7, not 8; `// reserve:` 16, not 17). Its
  other numbers reproduce.

### Departures (the review's)

None added: the review changed no generation code. G4's D1 and D2 (G4's "Departures") stand, now
checked directly (D2's list) as well as by distributions. With G7 generating the Journey in
draw-exact mode, 0 of the 120 Journey levels differ from the JS game's; in the default mode 60 do.

### Friction (review)

1. **No coverage for wasm.** To find what the oracles never reach, I counted branches in the JS (32
   text substitutions into a copy of hex/engine.js), which works only because the port mirrors it.
   For the port's own branches (D2's list and its upkeep, the reserve asserts) there is nothing.
   A `test --coverage`, or branch counters in a debug build, would answer it directly. About 40
   minutes; no planned feature removes it.
2. **A debug-only invariant has nowhere to live.** D2's check costs O(area) at every random head,
   too slow to ship, so the probe is made by substituting it into a copy of the sources (2
   substitutions). A `def debug = false` guard would work in the source: `if debug { ... }`
   compiles to `(if (i32.const 0) ...)`, 61 bytes of dead code in a probe until `-O` removes it.
   A comptime `if` that drops the branch would make it free. 10 minutes.
3. **Every export clears the stack and its peak**, so an oracle that interleaves builds and replays
   must read `stack_peak()` after each build: check-hexbuild printed the last replay's 4,780 bytes
   as its stack peak (fixed). 5 minutes.
4. **Reviewing the speed-ups beside MoonBit.** `with_shape`, the laid board's phase scope, the
   inlined `to`, the merged stamp table and D2's list move the code away from hex.mbt's shape; each
   was checked against the invariant its comment states (tables copied, the phase never reset
   under an open scope, `taken[second]` tested before the body is marked, the list kept at its 4
   sites). The comments made that possible; the 33 globals make it slow: who touches what is found
   by grep (the global `occupied` is used in 8 functions and written in 3). Closures would put the
   state back in one place. About an hour of the review.

### Error messages (verbatim)

None met: the D2 probe and the `def debug` probe compiled first time.

### Bugs

None found in or through G4's code; no new file in bugs/. 01 to 04 reproduce on ce7ee77.

### Tooling

- Byte-identical builds across a compiler move (8f459f1 to ce7ee77) made "rerun every oracle" a
  `cmp` first.
- The new `wasm --release --size`: test/g4.ents to 20,627 bytes (gzip 9,812, brotli 8,632) in 6.9 s,
  `-O` (now in process) 20,716 bytes in 5.1 s; both builds pass check-hexbuild. External `wasm-opt
  -O3` needs `--enable-multivalue` (and the other features) on the port's output, or it refuses it
  with a page of validator errors.
- `check hexbuild.ents` 1.6 s, `check test/g4.ents` 1.9 s, `test hexbuild.ents` 1.3 s, `wasm
  test/g4.ents` 2.0 s, on a loaded machine.
- `hover` on `with_shape` still spells both structural types out.

### Pleasant

- The port reads beside the JS line by line: each of the 32 branch counters of the JS found its
  line in hexbuild.ents at once, which is what made the JS's coverage stand in for the port's.
- The hybrid harness (mulberry32's additive state) made the shadow check possible: every H.build
  of any spec, compared in place while the JS generator runs on.
- `?? -1` at a checked index says at the site what an index off the end means (`lay_core`'s stops
  off the track: the edge cfg for it passed first time).

### Counts (review)

| What | Count |
| --- | ---: |
| exact comparisons, draw-exact mode (fixture, --seeds 20, shadow x2, edges) | 4,000 + 54,000 + 56,590 + 1,547 |
| H.build calls compared (fixture, --seeds 20, shadow, edges) | 250 + 5,250 + 3,538 + 128 |
| levels generated for the quality comparison (JS / port) | 3,680 / 1,840 |
| KS tests (port against the JS / the JS against itself), rejections | 400 / 400, 0 / 0 |
| paired builder tests (and the replicate's), failures | 65 (+39), 0 |
| port levels or builds invalid | 0 |
| Journey levels that differ (of 120): draw-exact / default | 0 / 60 (6 not generated) |
| changes to hexbuild.ents | 0 |
| oracle fixes (check-all's masked status, check-hexbuild's stack peak) | 2 |
| new oracles | 5 (shadow, edges, d2, quality-g4-review, quality-g4-paired) |
| compiler bugs | 0 |

## 19 Nov: G5, full geometry, the routing to the kernels, the repeated-slide core and the hints

Compiler: encantis origin/main **0c7737d** (fetched at the start; it has lib/vec.ents, so no other
branch). Every earlier wasm rebuilt byte for byte at 0c7737d (`cmp` against the committed ones).
Commits a52ca8a, 23bc682, 6e76323 and the ones after. The first engineer on G5 was killed at about
05:02 after two probes of the JS (`g5/probes/js-sizes.txt`, `js-depth.txt`); this section is the
second's, from 05:04.

### What was built

- `mech.ents` (all of mech.mbt): the `Geo` tables (behind `*mut`, holding the `Board` by value),
  `cell`, `inside`, `direction`, the full-geometry tap of both grids, `all_free_full`, the position
  key (`key_of`, u16 words), `solve_full`'s two searches as one recursive `search` over a `Full`
  context, and game-engine.js's routing: `tracked`, `all_free`, `replay`, `replay_plan`, `solve`,
  `frozen`, `minimum_taps`.
  - A tap is `walk` (or `walk_at`, below): the rope's head is walked through static scratch (a
    `FixedVec(13826, Pt)` route, a stamp table of the states seen), and the only thing put on the
    stack is the rope's path after. `tap` is the game's: it adds the position after (8 bytes a
    rope) and a copy of the route, as `?*Move`.
  - The depth-first search keeps its positions as keys.ents keys of u16 words reserved for
    (budget + 1) keys; its tries hold `(i, order, event, path)`, and the position is copied only for
    the tap followed. On Hex the JS's comparator (p0 first, then exits) is a rank 0, 1, 2 and the
    stable `lib/sort`, which gives its order exactly.
  - `minimum_taps`'s queue is a `Vec` of `(paths, parent, rope, depth)`, and its seen set a lib/set
    keyed by the queue's own positions, with a `hash` and an `eq` for `[]?[]Pt` written in mech.ents:
    no key is copied. Nothing is reset while the set or the queue may have grown above a scope.
- `assist.ents`: `guide`, and `reachable_features` with `live` as a list plus flags (insertion
  order) and each rope's states in a lib/set that grows within the rope's scope.
- `core-rope.ents`: `Core` and `repeated_core`, the JS's draws in its order.
- `test/g5.ents`: a hook per unit, gen.mbt's own `guide` and `features` exports (so the game's glue
  drives it as `dist/gen.wasm`), `t_tap`, `t_core`, `t_bench_solve`.
- Oracles: `check-g5.cjs`, `check-core-rope.cjs` (with `fixtures/core-rope-expected.json`),
  `check-g5-harness.sh`, `hybrid-g5.cjs`; timing `bench-g5.cjs`; `size.cjs` and `check-all.sh` lines.

### Exactness

Everything in G5 is the game's rules or a measurement of a given board, except `repeated_core`,
which is generation; it costs nothing to keep exact, so it is exact too. Results on the final file:

- **check-g5.cjs**, against game-engine.js, mechanics.js and hex/mechanics.js at 9e69e3a, on all
  135 reference boards (both grids, 67 with springs; C13 and C14 sampled to 25 positions each):
  **5,821 positions, 93,527 comparisons of 3.86M values, 0 failed**, in order and with `--reverse`.
  Every tap of every rope (event, distance, route, the paths after), direction, allFree routed and
  full, frozenRopes, solve at 40, 900, 4,000 and 900 with no prefer, the full-geometry solve on
  every board (the kernels' boards too), replay and replay with a move left out, guide at 40 and
  900, reachableFeatures at 500 and 10,000, tracked, and minimumTaps at 1,200 and 5,000 from the
  start of the 128 boards of at most 40 ropes. **It passed on its first run** (on the 132 boards
  then filled; the three colossal ones the same day). `--controls` 12 of 12; `--js` (the JS live
  through the same converters, against the cache) passes, 688 s; `--moonbit`: MoonBit's dist/gen.wasm (guide, features at every position)
  and dist/mf.wasm (bench_solve on the Journey) agree with the JS, 22,908 comparisons, 0 failed.
- **check-core-rope.cjs**: the 282 repeatedCore calls the generator makes over the 135 reference
  levels (277 give a core), replayed from their numbers, and 3,000 calls on random inputs (both
  grids, 4 to 48 a side, any difficulty and state) against the live JS: ropes, stops, plan, par,
  exact, depth, draws and the rng state after. **0 failed on the first build.** `--js` passes,
  `--controls` 9 of 9.
- **The hints through the game's glue** (`check-g5-harness.sh`, test/g5.wasm as dist/gen.wasm):
  assist.test.cjs `--test-name-pattern=wasm` passes (521 positions, 2,084 checks); a harness on
  test/g3.wasm fails it (`x.guide is not a function`), so the harness reads the file given.
  solver/check.cjs, whose "moonbit wasm-gc" side is then the port: 330 + 3,039 guide checks, 0
  mismatches, against the old Encantis solver and MoonBit's JS build. check-features.cjs (a copy
  whose boards come from MFGame.generate, as the port has no generate yet): 4,458 positions and
  1,042 pinned checks, 0 mismatches, insertion order included.
- **The whole generator** (`hybrid-g5.cjs`: the JS generator of 9e69e3a with every G.tap,
  G.replay, G.solve, G.minimumTaps, G.allFree, G.direction and repeatedCore answered by the port):
  **135 of 135 reference levels the same** (ropes, mirrors, springs, plan, par, exact, layout key),
  over 2,145,256 taps, 20,707 replays, 1,347 solves, 35 minimumTaps, 6,774 allFree, 325,267
  directions and 282 repeatedCores, in 88.7 s; the same patched generator with the JS alone (`--js`,
  the comparison's positive control) makes the 135 the same in 132.1 s.
- **The earlier groups' oracles**, rerun with G5's lines (`check-all.sh` under the lock, 06:28 to
  06:42): every check passed: G1, G1-wide, G2, G2-wide, G2 `--extra`, the three weave scripts, G3,
  G3-wide, G3 `--extra`, G3's review at a quarter, check-hexbuild `--seeds 2` and G4's review
  oracles, then check-g5, check-core-rope and check-g5-harness. build.sh rebuilds every earlier
  wasm byte for byte.

### Departures (from the JS's exact behaviour)

**None.** G5 changes no answer and no draw. So **no Journey level differs from the JS game's because
of G5 (0 of 120)**; the hybrid run makes all 135 reference levels as the JS does. (G4's departures
are G4's: 60 of 120 in hex_build's default mode, 0 in draw-exact mode.)

What changed is work, after parity, each step rerun through check-g5:

| | The JS and MoonBit | The port | What it saved |
| --- | --- | --- | --- |
| S1 | stamp every cell of every rope for each tap | the searches (solve_full, minimum_taps, all_free_full, frozen) stamp a position once for the taps of all its ropes (`walk_at`) | the most: solve 2000 went from 1.01 to 1.15 times MoonBit's speed to 1.82 to 3.16 (table below; S3 is the features half of the assist pass there) |
| S2 | the states a tap has seen in a Set (JS) or a list searched (MoonBit) | a stamp table by state number, one load a look | 6 to 11% of solve 2000 and of the assist pass (none on L89); no walk is quadratic in its steps |
| S3 | reachableFeatures's states as strings in a Set | each rope's states as u32 cells in a lib/set grown in the rope's scope | the first version reserved a keys.ents set for the whole budget (10,000 keys) per rope, whose clearing made features(10000) 2.8x slower than MoonBit; now 3.2x faster |
| S4 | a tap builds the route and the position | the walk is in static scratch; only tap copies the route and the position | no route or position garbage in the searches |
| S5 | minimumTaps keys positions by JSON strings | its set holds the queue's own positions, hashed rope by rope | no key copies: 8.8 MB peak at 5,000 on L118, which would not fit with copied keys |

The plan said the tap's linear seen search stays for parity of work; it did until parity, then went
(S2).

### Time

`bench-g5.cjs` under the lock (06:07 to 06:09; load average 2.0 at the start and 1.7 at the end, so
the machine was not quiet), 5 processes, best of 5 rounds in each, median over processes; port,
MoonBit wasm-gc (dist/mf.wasm's bench_solve; dist/gen.wasm through the glue) and the JS interleaved,
values checked to agree. The last two columns: how many times faster the port is.

| Kernel | port ms | MoonBit ms | JS ms | MoonBit / port | JS / port |
| --- | ---: | ---: | ---: | ---: | ---: |
| L30 solve 2000 (29 nodes) | 0.033 | 0.084 | 1.185 | 2.51x | 35.6x |
| L60 solve 2000 (2,001 nodes, gives up) | 4.211 | 8.073 | 113.8 | 1.92x | 27.0x |
| L89 solve 2000 (28 nodes) | 0.043 | 0.112 | 1.902 | 2.62x | 44.6x |
| L120 solve 2000 (50 nodes) | 0.097 | 0.333 | 6.895 | 3.42x | 70.8x |
| assist: the 2,084 checks of assist.test.cjs | 39.1 | 67.7 | 363.5 | 1.73x | 9.3x |

(The assist pass includes the glue's writing of each position word by word, the same for both
wasm builds.) How it got there, the same bench, 3 processes each, run after the main one:

| Version | L30 solve | L60 solve | L89 solve | L120 solve | assist (2,084) |
| --- | ---: | ---: | ---: | ---: | ---: |
| a52ca8a, the straight port (exact on its first run) | 0.072 (1.15x) | 7.068 (1.13x) | 0.101 (1.01x) | 0.320 (1.04x) | 62.5 (1.00x) |
| 6e76323, S1 and S3 | 0.037 (2.23x) | 4.463 (1.82x) | 0.046 (2.39x) | 0.109 (3.16x) | 39.7 (1.64x) |
| final, S2 too | 0.034 (2.47x) | 4.209 (1.92x) | 0.047 (2.30x) | 0.097 (3.40x) | 36.7 (1.78x) |

(ms, and in brackets MoonBit wasm-gc's time over the port's, measured in the same processes. The
straight port's assist pass is MoonBit's time because its reachable_features was 2.8x slower than
MoonBit's (the reserve of S3) while its guide was faster.)

Other timings met on the way (not under the lock): check-features.cjs's own column, summed over
the Journey boards with mirrors or springs at the start, budget 10,000: JS 6.9 ms, the old Encantis
features.wasm 0.76 ms, the port through the glue 1.5 ms, MoonBit 4.0 ms; solver/check.cjs's 3,039
square guide checks: the old Encantis solver.wasm 54 to 62 ms, the port 114 ms (through the glue,
with the Geo and SqMirrors made per call), MoonBit wasm-gc 138 ms, MoonBit's JS 253 to 300 ms.

Stack: peak 14.4 MB of the 16 MiB on C14 (40x40, 152 ropes, a spring) at solve budget 4,000: the
DFS's reserve is (budget + 1) keys of 1,653 u16 words. 8.8 MB on L118 for minimumTaps at 5,000
(20,601 positions queued). 136 KB at most for repeated_core (its solve's reserve at budget 2,000).

### Size

`node oracle/size.cjs G5`: mech.ents 4,525 tokens, assist.ents 874, core-rope.ents 1,586: **6,985
against MoonBit's 5,370 for the same declarations (1.30x), 1.75x with the 128 lines of import
declarations (1,692 tokens) and restated types (696)**: a quarter of G5's tokens are restatement.
(The plan's estimate was 4.6k MoonBit tokens; mech.mbt, assist.mbt and the two declarations of
gridgen.mbt measure 5,370.) Of mech.ents, the position's hash and eq (S5) are 269 tokens and the
seen table (S2) 87. test/g5.wasm is 56,486 bytes (22,318 gzipped).

### Friction

1. **No counted range loop.** repeated_core builds its pair with nine C-style JS loops (`for (let q
   = left + 1; q <= -depth - 2; q++)`). `for r in 1..=depth` is a parse error (below), so the five
   that count up became `for k in count` with the count worked out by hand (`-depth - 2 - left` for
   that one), and the four that count down `while` loops with the step written at the end. Easy to get wrong by one; the oracle passed first
   time. 10 minutes. No planned feature names it.
2. **A `let` is seen to the end of its function** (reference 3.3): `'t' is already declared in this
   scope` three times in repeated_core (one `let t = turned(...)` in each of four loops); in all
   about 12 names were chosen to avoid it (`ta` to `td`, `c2`, `q4`, `r2`, `r3`, `t2`, `t3`, `at`).
   5 minutes.
3. **A field wins over a function of its name**: `g.tracked()` (the Geo had a field `tracked`, as
   MoonBit's has) and `g.stamp(...)` gave 10 errors; the field became `kernels` and the function
   `mark_ropes`. The message says exactly that, and what to write. 2 minutes.
4. **No bare block for a scope**: in minimum_taps I wanted `{ let m = mark(); defer reset(m); ...
   }` round the fallback's replay; a block is not a statement, so it is a helper, `plan_taps`. 1
   site.
5. **Restated types** (25% of the tokens, above): `Geo` (ten fields, the `Board` inside) is restated
   in assist.ents, core-rope.ents and test/g5.ents, and the rename of friction 3 had to be made in
   all four. `Step` in three files, `Solved` in four, and mech.ents restates `SqBoard` and `HexBoard`
   only to import the kernels' signatures.
6. **Closures** (`// closure:` 8 sites): the two recursive local functions of solve_full became one
   top-level `search` over an 11-field context (`Full`); two comparator lambdas one `before`; and
   nine lambdas became loops or helpers (repeated_core's two nested turning maps and two nested
   placing maps as `turned` and `placed`, `chosen.map(_ => [])`; reachable_features's `makei`,
   `path.map`, and the state string's `map` and `join`). Closures
   would remove all of them; none needed a run-time function value (`// fnvalue:` 0).
7. **The DFS's seen set cannot grow**, because the search's node scopes would free what it grew
   into: it is reserved for (budget + 1) keys of the start's length, 14.4 MB on C14 at 4,000, 2.4 MB short
   of the stack's 16.8 MB. A second arena (`Stack(n)`, PORT-PLAN 10.1) would let it grow as found. And
   the opposite trap, met: a reserve sized for the worst case costs its clearing on every call
   (friction-turned-departure S3). `// reserve:` 8 sites.
8. **A range of a slice is optional** even where its bounds are known: `cells[cells.len - n..] ??
   cells` in walk_at, where n <= cells.len always. 1 site.
9. **Hand-made tags** (`// enum:` 2 sites): `ev_none` for a tap that is not allowed (MoonBit's
   `Move?` is `?*Move` where the position is wanted, but the searches' `Step` is a value) and
   `solved_unknown`. Enums would remove both.

### Error messages (verbatim)

1. `mech.ents:561:39: cannot call non-function type: i32 ('tracked' is a field here, and a field wins over the function 'tracked': write tracked(...))` (clear).
2. For `for r in 1..=depth {` (a parse error, which reads as if a type were wanted):
   `Expected "a".."z", "bool", "f64", "f32", "u8", "u16", "u32", "u64", "u128", "u256", "u512", "i8", "i16", "i32", "i64", "i128", "i256", "i512", "*", or a digit`
3. For `export type Core = (...)` (a type is not exported: types are structural, reference 7.1, but
   the message does not say so): `Expected "memory", "global", "func", "b\"", "x\"", or "\""`
4. For a bare `{` block in a function body: a list of 60 tokens, `Expected "}", "a".."z", "false", "true", "'", ... "&&", or "??"`.
5. `core-rope.ents:169:15: 't' is already declared in this scope` (as G4 found: it does not say
   where the first one is).
6. In a test, `p[0].q` on a `[]Pt`: `index 0 on []Pt requires 'if let' or '??': a slice's length is only known at run time (no optional type for Pt)` (clear; `p.ptr[0]` there).

### Bugs

None: no wrong code and no crash in G5, so no new file in bugs/.

### Tooling

- `check mech.ents` 1.6 s (12 modules), `test mech.ents` 1.7 s, `wasm test/g5.ents` 2.1 s; `build.sh`
  with G5 26 s (G5's three modules tested: 4 inline tests).
- `hover mech.ents:<line>:walk_at` (1.6 s) spells the `Geo` out in full, 600 characters, as G3 and
  G4 found for their types; on a local it gives `(event: i32, distance: i32, path: ?[](q: i32, r: i32)) (4 slots)`,
  and on `hashset` the instance (`calls hashset(K = []?[]Pt)`). `references` lists the 5 uses of
  walk_at. (Without a line, `hover mech.ents:walk_at` is `Error: expected <file>:<line>:<col>`.)
- `fmt` would change 151 lines of mech.ents, nearly all `n: u32` to `n:u32` in import signatures.
  Not applied.
- The JS's answers are cached per board (check-g5's `--fill`): the JS needs about 10 minutes for the
  135 boards (C14's solves most of it; C13 and C14 are sampled because the JS takes about 25 s a
  position there), the port 15 s; so each change to mech.ents was one rebuild and 15 s.

### Pleasant

- **Exact on the first run, all three modules** (93,527 comparisons; 3,282 core calls; the harness
  tests), and the whole generator on the port's units made the 135 reference levels unchanged.
- `if let path = paths[i as u32]` checks the index and the element at once: the JS's `paths[i]`
  falsy test, out of range included, in one construct.
- **None is `0`** for `?*Move`, `?*Par` and a `?[]Pt` field (`Step(ev_none, 0, 0)`, `return 0`): no
  casts, which G4 still wrote.
- **lib/set over a key type of my own**: `hashset([]?[]Pt, 10)` called the `hash` and `eq` written in
  mech.ents, first time, so the BFS keys positions by themselves.
- A struct in memory holding a struct by value (`g.b`, and `&g.b` for a `*Board`), `FixedVec(13826,
  Pt)` in static data, `mut [(0, 0); 13826]`, method calls on builtins (`fallback.len.max(...)`,
  `w.min(height)`, `(10).min(...)`), the stable `lib/sort` with a comptime comparator.

### Where `comptime n: u32` with `[n]T` helped G5

- Used: the walk's route is a `FixedVec(13826, Pt)` in static data (1 `// comptime-n:` site).
- Would help: a second arena for the DFS's seen set (friction 7), which could then grow.

### Counts (tags in G5's files, sites; header mentions left out)

| Tag | mech.ents | assist.ents | core-rope.ents | test/g5.ents |
| --- | ---: | ---: | ---: | ---: |
| `// closure:` | 2 | 3 | 3 | 0 |
| `// fnvalue:` | 0 | 0 | 0 | 0 |
| `// enum:` | 2 | 0 | 0 | 0 |
| `// comptime-n:` | 1 | 0 | 0 | 0 |
| `// unchecked:` | 21 | 7 | 3 | 0 |
| `// reserve:` | 4 | 2 | 2 | 0 |

| What | Count |
| --- | ---: |
| exact comparisons (check-g5; core recorded + wide; harness checks) | 93,527; 282 + 3,000; 2,084 + 3,369 + 5,500 |
| generator calls on the port in the hybrid run, levels the same | 2.5M, 135 of 135 |
| local functions made top-level / comparators / lambdas made loops or helpers | 2 (into 1) / 2 (into 1) / 9 |
| names renamed for function-scoped lets / field-function clashes | about 12 / 2 |
| counted JS loops rewritten (no `a..=b` loop) | 9 |
| `if let` outside tests and test/g5.ents (deepest nesting) | 15 (2, in `eq`) |
| compiler bugs | 0 |
| departures that change an answer or a draw | 0 |
| Journey levels that differ because of G5 (of 120) | 0 |

## 19 Nov: review of G5 (adversarial)

Compiler: encantis origin/main **399ca7e** (Release 0.3.0, two merges after G5's 0c7737d). Every
core wasm rebuilds byte for byte under it (`build.sh`, 31 s; `git status` clean). The reviewer's
scratch is `/home/user/mf-core-scratch/review-g5/` (logs/, probes/, cache/).

### What was rerun, as G5 left it

- `check-g5.cjs`: 5,821 positions, 93,527 comparisons, 0 failed; `--reverse` 0 failed; `--controls`
  every kind fails and names its case. `check-core-rope.cjs`: 282 recorded and 3,000 random calls,
  0 failed; `--controls` 9 of 9. The bug repros 01 to 05 still show what they say at 399ca7e (01
  prints "8 12", 02 "8 101 7", 03 "16 0", 04 checks OK and `wasm` throws at codegen.ts:4148, 05's
  hovers as written). G5 added none.
- After the fix, `check-all.sh` with the review's three new lines (check-g5-review, check-g5-budgets,
  stress-g5-stack), under the lock, 08:02 to 08:19: **every check passed** (G1 to G5 and the
  harness). The harness on the fixed wasm alone: assist.test 521 positions pass, solver/check 330 +
  3,039 guide checks and check-features 4,458 + 1,042 checks, 0 mismatches.

### Found: the search's reserve passed the stack at the game's own budget (P1, fixed)

`solve_full` (the full-geometry search: every board with spinners, and the game's hint and
auto-solve through `guide`) reserved, before searching, room for (budget + 1) positions, each a
copy of every cell of every rope: (budget + 1) x (cells + ropes) u16 words. G5's log saw the
margin ("14.4 MB on C14 at 4,000, 2.4 MB short of the stack's 16.8 MB") but `check-g5.cjs` asked
for 40, 900 and 4,000 (mechanics.js's default) and never for 5,000, the budget of the game's
auto-solve (app.js `seekPlan([], 5000)` -> generator-worker.js -> `MFGame.guide`). At 5,000:

- **C14** (U3-S-70-70-40-40-1-MSC-COLOSSAL, a reference board): `t_solve(5000)` and the auto-solve
  `guide(5000)` with no preferred order **trap** (`unreachable`: the stack is full); 4,500 peaks at
  16.16 MB.
- **Every 48x48 board with spinners** the JS game makes (g1-extra's U3-S/H-70-70-48-48-1-MSC-MAX,
  and the review's 48x48 and 48x40 fixtures): solve **traps at 4,000 and at 5,000, even with the
  plan** as the preferred order. `oracle/stress-g5-stack.cjs` (new) on the pre-fix wasm: 9 of the 23
  fixture boards of at least 1,000 cells trap (all the 44x41 to 48x48 spinner boards), at 5 random
  positions each.

The JS (a Set of JSON strings) and MoonBit (a HashSet of Strings, wasm-gc) have no such limit.
**Fix (mech.ents, 4f7de81):** each path a rope takes gets a number the first time it is met (a
keys.ents `KeyMap(u16, u32)` from the rope and its cells), and a position seen is its ropes'
numbers, one u32 a rope. A child differs from its parent in one rope, so only that rope's new path
is looked up, where G5 rebuilt and hashed the whole position at every node. Reserved: (budget + 1)
x ropes words for the positions, and the start's paths plus (budget + 2) paths of the longest rope
for the numbers (one new path per position looked at, plus the one past the budget). Same answers
(below); peak at 5,000 on the 48x48 spinner boards 7.5 MB, C14 5.3 MB; check-g5's peak fell from
14.4 MB to 8.8 MB (now L118's minimumTaps at 5,000). stress-g5-stack on the fixed wasm: 0 traps on the
23 big boards at 20 random positions each (guide 5,000 with no prefer, solve 4,000 with the plan,
features 10,000, frozen), worst 7.46 MB (44.5% of the stack). It is also faster (Time, below):
solve 2000 on L60, the bench board whose search runs out, 4.18 to 2.13 ms. 60 lines of mech.ents
changed (+273 tokens).

### The extended exact oracle

`oracle/check-g5-review.cjs` runs check-g5's whole battery (every tap of every rope, direction,
allFree routed and full, frozen, solve 40/900/4,000/900 with no prefer, the full solve, replay with
and without the first move, guide 40/900, features 500/10,000) plus what the game calls that
check-g5 did not: **the auto-solve, `G.guide(b, paths, 5000, [])`**, and **minimumTaps at 1,200 on
boards of at most 12 ropes** (the generator's call) and 5,000 on boards of at most 40, on 440
boards check-g5 never saw, all made by the JS game at 9e69e3a: g1-extra (79: 4x4, 8x8 with
mechanics, strips, 48x48 both grids with spinners), g2-review (131 square, 71 with spinners),
g3-review (160 Hex to 48x48 with 224 ropes) and the review's own fixture
(`gen-g5-review-boards.cjs`, 70 boards that all have spinners, both grids: 8x8, 8x24 and 24x8
strips, 12x16 at difficulty 100, 24x24 at 1/50/100, 32x32 and 48x48/48x40 colossal, and 40 random
codes). **18,070 positions, 291,464 comparisons of 15.9M values, 0 failed**
(1,908 auto-solves and 436 minimumTaps among them), 43 s with the JS's answers cached; filling the
cache took about an hour of JS in three workers, most of it the nine 44x41 to 48x48 spinner boards
(8 to 15 minutes each). `--controls`: 12 of 12 kinds fail and name their case.
**On the pre-fix wasm (e1b28f6) the same run fails 76 comparisons, every one a trap**: 58 solves at
4,000 and 18 auto-solves, all on the 44x41 to 48x48 spinner boards. The fixed wasm's stack peak over
the run is 12.3 MB, for minimumTaps at 5,000 on a 40-rope board, a call the game never makes: the
generator calls minimumTaps only on boards of at most 12 ropes, at 1,200 (peak 403 KB over the 107
such boards, probes/min-peak.cjs), and on repeatedCore's two ropes. Two more oracles, both in
check-all: `check-g5-budgets.cjs` (the full solve and guide at budgets 0, -5, 1, 2, 3, 7 and 25, the
edges of the new reserve: 103,992 comparisons against the live JS, 0 failed, 30 s) and
`stress-g5-stack.cjs` (above).

### Generation: the quality oracle

G5's one generation unit, `repeated_core`, stays draw-exact, and nothing else in G5 is generation,
so the rule (written in PROGRESS-review-G5.md before any result) is equality: every level the
generator makes with G5's units on the port must equal the JS's in every field, its measured
qualities included, and the port must not be slower.

- `check-core-rope.cjs --wide 20000 --seed 1, 2, 3` (the new `--seed`): 60,000 more random calls
  (both grids, 4 to 48 a side, difficulty 0 to 100), 0 failed; with the recorded and G5's 3,000,
  63,282 calls, all equal.
- `hybrid-g5.cjs --fixtures g1,g2,g3,g5` (new): the 440 fixture levels regenerated from their
  codes with every G.tap, replay, solve, minimumTaps, allFree, direction and repeatedCore on the
  port: **440 of 440 levels the same** (ropes, mirrors, springs, plan, par,
  exact, layout key), with 11.1M taps, 1.56M directions, 59,552 replays, 29,851 allFree, 1,354
  solves, 46 minimumTaps and 896 repeatedCores answered by the port (479 s).
- `hybrid-g5.cjs --codes ... --count 100` (new: each level made twice in one process, by the JS
  alone and on the port, the whole returned level compared) on three classes of new seeds:
  **300 of 300 levels the same in every field**, 1,122 repeatedCores
  on the port, no null level on either side; every metric's two distributions are the same (KS D
  0.000 for par, exact, ropes, rope length, coverage, challenge, casual wins, work, knots, traps,
  repeated depth, interaction, dependency depth, mirrors, spinners, manual slides, mechanics used;
  `fixtures/quality-g5-review-report.txt`). Generation time (the JS's builders included; the two
  runs of a level interleaved in one process, beside the cache fill, so the ratio is fair but the
  milliseconds are not quiet-machine numbers):

  | Class (100 levels each) | repeatedCore calls | JS alone | G5 on the port | port / JS, median a level |
  | --- | ---: | ---: | ---: | ---: |
  | U3-M-60-100-12-14-100-MS (both grids, mirrors and spinners, difficulty 60 to 100) | 481 | 173.4 s | 115.1 s | 0.66 |
  | U3-M-60-100-14-12-100-N (no mechanics) | 453 | 69.6 s | 64.2 s | 0.82 |
  | U3-M-1-100-10-10-100-S (spinners, difficulty 1 to 100) | 188 | 59.3 s | 29.2 s | 0.50 |
- `hybrid-g5.cjs` on the 135 reference levels with the fixed wasm: **135 of 135 the same**, in 83.9 s under the lock (G5: 88.7 s; the JS
  alone 132.1 s).

### Departures (the review's)

None. The fix changes memory and time, not an answer or a draw. **Journey levels that differ from
the JS game's because of G5: 0 of 120.**

### Time

`bench-g5.cjs` under the lock (07:58 to 08:01, load average 1.1 to 1.4), the fixed wasm in 5
processes and the pre-fix one (e1b28f6) in 3, alternating; best of 5 rounds in each, median over
processes; MoonBit wasm-gc and the JS interleaved in the same processes, values checked to agree.

| Kernel | pre-fix port ms | fixed port ms | MoonBit ms | JS ms | MoonBit / fixed port | JS / fixed port |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| L30 solve 2000 (29 nodes) | 0.034 | 0.027 | 0.077 | 1.096 | 2.84x | 40.5x |
| L60 solve 2000 (2,001 nodes, gives up) | 4.180 | 2.127 | 7.428 | 108.7 | 3.49x | 51.1x |
| L89 solve 2000 (28 nodes) | 0.041 | 0.033 | 0.100 | 1.755 | 3.02x | 53.1x |
| L120 solve 2000 (50 nodes) | 0.095 | 0.076 | 0.332 | 6.057 | 4.37x | 79.7x |
| assist: the 2,084 checks of assist.test.cjs | 32.9 | 29.8 | 63.5 | 345.4 | 2.13x | 11.6x |

(G5's own run: 1.92x to 3.42x MoonBit on solve and 1.73x on assist; the pre-fix column reproduces
it.) A node now costs one path's lookup and a hash of n words, where it cost the whole position's
cells, built and hashed.

The game's auto-solve, `guide(5000)` with no preferred order, through web/generator.js's glue, on
the boards where it matters (probes/auto-time.cjs, best of 3, not under the lock, beside the fill;
the port and MoonBit give the same answers):

| Board | port | MoonBit wasm-gc | JS | MoonBit / port |
| --- | ---: | ---: | ---: | ---: |
| C13 (24x24, 145 ropes, solved in 167 nodes) | 2.7 ms | 17.6 ms | 229 ms | 6.5x |
| C14 (40x40, 152 ropes; runs out at 5,001) | 32.2 ms (trapped before the fix) | 479 ms | 8.6 s | 14.9x |
| nine 44x41 to 48x48 spinner boards (all run out at 5,001) | 52 to 82 ms (all trapped before) | 1.23 to 3.82 s | 43 s and 60 s (g1#14, g1#15) | 24x to 46x |

(probes/c14-auto.cjs: on C13 and C14 the JS gives the same answer as the port.) MoonBit keys a position by a
String of all its cells, as G5 did, and pays for it most on the biggest boards.

### Friction (review)

1. **A fixed 16 MiB stack and no memory-grow** turn every search's visited set into a worst-case
   reservation made before the search, and a wrong guess is a trap in the player's auto-solve,
   not a slow path. The JS and MoonBit cannot have this bug. Diagnosing it took 10 minutes (lib/stack's
   `peak()` made it plain), the fix 25, reasoning out the new bound (how many new paths a
   depth-first search can meet: one per position looked at, plus the one past the budget) most of
   it. G5's friction 7 named the cause (a set made outside the DFS's scopes cannot grow inside them);
   a second arena (`Stack(n)`, waiting on comptime values) or `memory-grow` (documented, "not yet
   implemented", reference 10.3) would let the set grow as found. `// reserve:` sites in mech.ents: 4
   (unchanged).
2. **Hover spells out a context type in full**: `hover mech.ents:<line>:state_of` is 1,300
   characters, `Full` written out with the `Geo`, `Board`, `KeySet` and `KeyMap` inside it; the
   names exist only in my source. (G3 and G4 found the same.)
3. **An oracle's budgets were taken from the module, not from the game**: not Encantis, but the
   reason P1 shipped: mechanics.js's default solve budget is 4,000 and the app's 5,000. G3's review
   had already found and checked the Hex kernels' 5,000.

### Error messages (verbatim)

None new: the fix compiled and passed its inline test on the first build.

### Bugs

No compiler bug: no wrong code and no crash. P1 is the port's.

### Tooling

- `check mech.ents` 1.4 s; `test mech.ents` 1.7 s; `hover` 2.3 s.
- `wasm test/g5.ents --release --size`: 57,997 bytes unoptimized (G5: 56,486; the fix adds 1.5 KB),
  32,226 optimized (-44%), 14,556 gzipped, 12,523 brotli.
- `node oracle/size.cjs G5`: mech.ents 4,798 tokens (G5: 4,525), the group 7,258 against MoonBit's
  5,370: 1.35x, 1.82x with imports and restated types (G5: 1.30x and 1.75x).

### Pleasant

- keys.ents's `KeyMap` with `ref_key` (`?*mut V`): numbering the paths is `if let at =
  s.states.ref_key(key) { return at.* }` then `set_key`; the generic instance (`calls ref_key(W =
  u16, V = u32)`) shows in hover.
- lib/stack's `peak()`, reported by every oracle, made the bug a number before it was a trap.
- The exact oracle made the fix safe: one rebuild and 10 s of check-g5 (93,527 comparisons) per
  edit.

### Counts (review)

| What | Count |
| --- | ---: |
| boards that trap at the game's budgets before the fix (stress-g5-stack, 5 positions each) | 9 of 23 |
| traps after it (20 positions each) | 0 |
| review-oracle comparisons that trap on the pre-fix wasm / fail on the fixed one | 76 / 0 of 291,464 |
| exact comparisons added by the review (check-g5-review, check-g5-budgets, core-rope seeds) | 291,464; 103,992; 60,000 |
| levels regenerated through the port and compared (fixtures, classes, reference) | 440 + 300 + 135, all the same |
| new `// unchecked:` in mech.ents (the numbers by rope) | 4 |
| compiler bugs | 0 |
| departures | 0 |
| Journey levels that differ because of G5 (of 120) | 0 |

## 19 Nov: G6, measured play and the interaction analysis

Compiler: encantis origin/main **399ca7e** (Release 0.3.0; fetched at the start, the same commit as
G5's review, so nothing to rebuild: build.sh made every earlier wasm byte for byte, `git status`
clean). Commits 662b6b5 and the ones after. No predecessor: G6 started at 08:29.

### What was built

- `metrics.ents` (metrics.mbt but `to_fixed`, which is G1's exact one): `analyze`, which is
  `Q.analyze(board, plan, manual, G)`. It returns a value, `Complexity`: the interaction and the five
  counts it is made of (joins, mutualWaitRopes, revisitedRopes, branchingDepth, largestCoupledGroup:
  MoonBit computes them unnamed; the JS reports them, so the oracle compares six values a call
  where interaction alone would be one, at no cost). Inside, all in analyze's own scope:
  - the snapshot is a ray a rope (`ray`), the rope on each cell a table, the cells stamped once a
    position (`mark_ropes`), and the states a ray has seen in mech.ents's stamp table (`new_walk`,
    `seen_before`, now exported);
  - the relations are deduplicated with an n x n byte table and kept as a list in the order found;
  - the graph's lists (dependents, prerequisites, the arcs between components) are built in two
    passes, count then fill, into one array of targets and an index (`Lists`, `l.of(v)`);
  - Tarjan's `visit` is a top-level recursive function over a 12-field context (`Tarjan`), the
    components kept as their members in pop order plus starts;
  - `reach` is a k x k byte table, `essential` a byte per arc;
  - the JS's arithmetic in its order, then G1's exact `to_fixed(x, 4)`.
- `play.ents` (gridgen.mbt lines 42 to 88, 666 to 894, 1088 to 1100): `coverage`, `adjacent`,
  `valid`, `regional`, `trivial`, `features_used`, `feature_stats` (`?*FeatureStats`), `slide_stats`
  (the measurement grid_generate makes inline: slides and bounces by hand, repeated ropes, automatic
  exits, any slide: G7 calls it), `postpone`, `score` (a `Par` value whose plan is in the caller's
  scope), `casual_rate`, `casual_measure`, `bench_casual`, `bench_par`. They take the board's tables
  (`*Geo`) or, where the board alone is read (coverage, regional), the `Board` value.
- `test/g6.ents`: a hook a unit, `t_seed`/`t_measure` for the stored measurements, `t_target`,
  `t_bench_casual`, `t_bench_par`.
- Oracles: `check-g6.cjs` (parts direct, derived, mutated, calls, stored), `dump-g6.cjs` and
  `fixtures/g6-calls.json.gz`, `hybrid-g6.cjs`; timing `bench-g6.cjs`; `size.cjs` G6, `build.sh` and
  `check-all.sh` lines; `bugs/06`.

### Exactness

Everything in G6 is a rule or a measurement of a given board, so it is all exact, `casual_rate` too
(below). Results on the final file (test/g6.wasm, 62,756 bytes):

- **check-g6.cjs**, against grid-generator.js and dependency-metrics.js at 9e69e3a: **13,813
  comparisons of 81,758 values, 0 failed, on the first build of every part**, in order and with
  `--reverse`, 5.4 s on the port (the JS's answers cached: 230 s of JS to fill, nearly all casual
  play on spinner boards):
  - direct, on the 135 reference boards with their plans and par: 2,158 (coverage, valid, regional,
    trivial, featuresUsed, featureStats with manual = par, 0 and all, slideStats, postpone, score with
    and without skip, casualRate x100 and x1000 at hashString('bench') with the draws (x10 on C13
    and C14), Q.analyze with manual = par and all);
  - derived, on 386 boards of the ropes left after each quarter of each plan: 5,404. These are where
    the reject branches run: trivial true 43 times, regional false 345, featuresUsed false 204,
    valid false 100 (a rope that has slid can lie on a mirror's cell, 44, or a spring's, 56);
  - mutated: 2,745, on 645 broken copies (valid false 621 times) and on each board with a last tap
    of a rope that has left (featureStats null 135 times; analyze and the replays stop there);
  - calls: 2,691 calls recorded while the JS generator made the 135 reference levels and the 70 of
    g5-review-boards.jsonl (12,289 calls made, sampled by a rule fixed before any port run: every
    rejection, every s-th other call), against the answers and draws the JS gave then. In real
    generation over those 205 levels valid and regional never rejected and trivial never did either;
    featuresUsed rejected 50 times;
  - stored: 815, the measurements of the 120 Journey levels in grid-journey-measurements.json at
    9e69e3a, from the reference boards: casualWins (96 or 24 games seeded by
    'journey/5/MONKEYFIST/measure/' + seed), work, challenge, coverage, targetChallenge, slideStats,
    mechanicStats (95 levels) and the complexity's six fields, each rounded as the build rounds it.
    (measurements-wasm.test at unit level; it needs G7's generate_spec to run whole.)
- `--extra` adds the 79 boards of g1-extra (4x4 strips to 48x48, 21 with spinners) to direct and
  derived: 4,412 more comparisons, 0 failed (582 s of JS to fill; the 48x48 spinner boards' casual
  play and postponement most of it). Stack peak 2.66 MB (g1#12, 48x48, score); 1.25 MB on the
  reference boards (C15, score).
- `--controls`: 16 of 16 kinds fail on one spoiled value and name the case. `--js` (the JS live
  through the same words and hooks) passes, 308 s.
- **The whole generator** (`hybrid-g6.cjs`: the JS generator of 9e69e3a with every valid,
  coverage, regional, trivial, featuresUsed, featureStats, postpone, score and casualRate call and
  every Q.analyze answered by the port): **135 of 135 reference levels the same**, over 7,472 calls,
  in 89.6 s; the JS alone (`--js`) 153.4 s (neither under the lock). `--codes` made 40 levels each
  of U3-M-60-100-12-14-40-MS-GSIX, U3-H-1-100-10-12-40-M-GSIX and U3-S-1-100-8-10-40-S-GSIX twice,
  the JS alone and with G6's units on the port: **120 of 120 equal in every field**, the measured
  qualities included (par, exact, coverage, slideStats, play's casualWins, work and challenge,
  mechanicStats, the complexity's six fields), 0 null; JS 89.5 s, port 53.1 s. And 30 levels each of
  U3-H-30-80-8-10-30-S-GSIX (Hex spinners), U3-S-60-100-16-16-30-MS-GSIX,
  U3-M-1-100-24-24-30-N-GSIX (large, both grids) and U3-M-70-70-40-40-30-MSC-GSIX (colossal): **120 of
  120 equal in every field** (1 null on both sides); JS 308.8 s, port 188.1 s. 240 levels of seven
  codes in all, the generator's choices among attempts (which read every one of G6's measures)
  unchanged.
- **The earlier groups' oracles**, rerun with G6's lines (`check-all.sh` under the lock, after
  build.sh, 09:22 to 09:40): every check passed: G1, G1-wide, G2, G2-wide, G2 `--extra`, the three
  weave scripts, G3, G3-wide, G3 `--extra`, G3's review at a quarter, check-hexbuild `--seeds 2` and
  G4's review oracles, check-g5, check-core-rope, check-g5-harness and G5's review oracles, then
  check-g6 (13,813, 5.5 s) and check-g6 `--extra` (11,974, 9.7 s).

### Departures (from the JS's exact behaviour)

**None.** The owner's decision lets casualRate's random playouts depart, but keeping them exact cost
nothing: the draw is one `rng()` a turn over the legal taps in rope order, exits first, which is what
any natural loop does; and the exact playout is already 3 to 5 times MoonBit's speed (below). So **no
Journey level differs from the JS game's because of G6 (0 of 120)**: hybrid-g6.cjs regenerates all 135 reference levels (120 Journey) with G6's units on the port, unchanged.

What changed is work, not answers:

| | The JS and MoonBit | The port | What it saves |
| --- | --- | --- | --- |
| W1 | a casual turn on a spinner board taps every rope: each tap builds the position after it and the route (G.tap) | one stamp of the position for all its ropes (`walk_at`), the walks in a scope freed each turn, and only the chosen rope's path copied, into a buffer of its own kept for the game | the most: full-geometry casual play is 3.2 to 5.2 times MoonBit's speed and 66 to 135 times the JS's (below) |
| W2 | the snapshot ray keeps its states in a Set of strings (JS) or a list it searches (MoonBit) | mech.ents's stamp table, one load a look | no ray is quadratic in its length |
| W3 | featureStats: four Sets of cell keys (JS), four bool tables (MoonBit) | one byte of four flags a cell, counted once | three tables |
| W4 | the relations in Sets (JS) or lists searched (MoonBit) | an n x n byte table, and the lists built once at the end in two passes | no search per relation |
| W5 | trivial and featuresUsed build a Move per tap | `walk` (the path after, nothing else) in a scope per tap | the route and position copies |

### Time

`bench-g6.cjs` under the lock (09:17 to 09:21; load average 1.3 at the start and 1.2 at the end),
5 processes, best of 5 rounds in each, median over processes; port (test/g6.wasm's t_bench_casual
and t_bench_par: the board's tables made from its words, then the call), MoonBit wasm-gc
(dist/mf.wasm's bench_casual and bench_par on its current level) and the JS (F.casualRate,
F.score) interleaved, the values checked equal. The last two columns: how many times faster the
port is. The JS is not run at x1000 on the spinner boards (8 s a call on L120; bench-node.mjs itself
plays 100 games there).

| Kernel | port ms | MoonBit ms | JS ms | MoonBit / port | JS / port |
| --- | ---: | ---: | ---: | ---: | ---: |
| L30 casual x100 | 1.912 | 6.484 | 127.0 | 3.39x | 66.4x |
| L30 casual x1000 | 19.34 | 67.59 | | 3.50x | |
| L30 par | 0.161 | 0.202 | 3.492 | 1.26x | 21.7x |
| L60 casual x100 | 1.732 | 5.551 | 138.7 | 3.21x | 80.1x |
| L60 casual x1000 | 17.31 | 56.22 | | 3.25x | |
| L60 par | 0.119 | 0.158 | 3.074 | 1.33x | 25.9x |
| L89 casual x100 | 2.000 | 7.767 | 189.0 | 3.88x | 94.5x |
| L89 casual x1000 | 20.46 | 77.06 | | 3.77x | |
| L89 par | 0.216 | 0.254 | 4.942 | 1.18x | 22.9x |
| L120 casual x100 | 5.006 | 25.15 | 674.4 | 5.02x | 134.7x |
| L120 casual x1000 | 50.39 | 263.4 | | 5.23x | |
| L120 par | 0.594 | 0.820 | 15.51 | 1.38x | 26.1x |
| L107 casual x100 | 1.460 | 1.589 | 2.439 | 1.09x | 1.7x |
| L107 casual x1000 | 13.40 | 15.09 | 22.59 | 1.13x | 1.7x |
| L107 par | 8.473 | 11.46 | 16.23 | 1.35x | 1.9x |
| L118 casual x100 | 0.968 | 0.975 | 1.572 | 1.01x | 1.6x |
| L118 casual x1000 | 9.384 | 9.569 | 14.89 | 1.02x | 1.6x |
| L118 par | 5.627 | 7.797 | 10.72 | 1.39x | 1.9x |
| L114 casual x100 | 0.346 | 0.429 | 1.576 | 1.24x | 4.6x |
| L114 casual x1000 | 3.520 | 5.131 | 18.16 | 1.46x | 5.2x |
| L114 par | 1.700 | 2.503 | 15.08 | 1.47x | 8.9x |
| L116 casual x100 | 0.495 | 0.558 | 1.948 | 1.13x | 3.9x |
| L116 casual x1000 | 4.756 | 6.183 | 22.48 | 1.30x | 4.7x |
| L116 par | 2.644 | 4.033 | 22.14 | 1.53x | 8.4x |

- **G6's own code** is the casual play on the four spinner boards (L30, L60, L89, L120: the
  full-geometry playouts, W1): 3.2 to 5.2 times MoonBit's speed and 66 to 135 times the JS's, as
  first written (there was no slower version: the walk of G5 was already there to use).
- On the four boards without spinners casual play and par are G2's and G3's kernels, reached
  through play.ents's routing: 1.01 to 1.53 times MoonBit, as G2 and G3 measured them (L118 casual
  is the one even: G2 had it at 1.00x). Par on the spinner boards is the postponement, replay after
  replay on G5's full geometry: 1.18 to 1.38 times MoonBit.
- analyze is not timed (no MoonBit export runs it alone); in the hybrid run it is 647 of the
  7,472 calls.

### Size

`node oracle/size.cjs G6`: metrics.ents 2,823 tokens against metrics.mbt's 1,995 (1.41x), play.ents
2,862 against the 14 declarations of gridgen.mbt it replaces, 2,145 (1.33x; it includes slide_stats,
about 150 tokens that MoonBit has inline in grid_generate and that G7 will not write): **5,685 against
4,140 (1.37x), 1.75x with the 89 lines of import declarations (1,176 tokens) and restated types
(393)**. What makes metrics.ents bigger: the allocations written out (`alloc(un * 4) as [*]mut i32`,
nine tokens, 24 times), the two-pass lists (`lists` and `of`, about 160 tokens) where MoonBit pushes
into `Array[Array[Int32]]`, the Tarjan context's type and constructor (about 150), and loops for
eight lambdas. test/g6.wasm is 62,756 bytes (24,327 gzipped).

### Friction

1. **A `let` is seen to the end of its function** (reference 3.3), now for the third group running:
   13 errors on the first `check`: 9 in metrics.ents's `graph` (`c` five times, `a` twice, `first`,
   `size`, each a loop's variable or a `let` of an earlier loop), 4 in play.ents (`p`, `c` twice, and
   a loop `c`). Each became a name of its own (`from`/`to`, `src`, `up`/`up_first`, `members`, `at`,
   `sc`/`mc`). 10 minutes. No planned feature names it.
2. **A local of a function's own name**: in `func board()` of test/g6.ents, `let (board:, paths:,
   prefer:) = read_position()` is `'board' is already declared in this scope`. The destructuring
   renames (`(board: b, paths:, prefer:)`), which was a pleasant find. 2 minutes.
3. **Closures** (`// closure:` 12 sites): Tarjan's `visit` became a top-level recursion over a
   12-field context, and the JS's and MoonBit's lambdas became loops: the snapshot's `paths.map`,
   three `Array::makei(_, _ => [])` of lists (two-pass lists instead), `reach`'s makei, the essential
   arcs' `filter`/`any`, the internal joins' nested `filter`, the junctions' `makei`, regional's
   `every`, trivial's `some`, featureStats's four `filter().count()`, slideStats's `filter`, casual
   play's `flatMap` and `filter`. Closures would remove all; none needed a function value
   (`// fnvalue:` 0). The context struct was the costly one: about 15 minutes, and 150 tokens (below).
4. **No `let ... else`**: `feature_stats` returns `?*FeatureStats` (MoonBit's `FeatureStats?`), and
   `score`'s kernel calls `?*Par`; each is one `if let` level. `?? b.plan` on the kernels' `?[]i32`
   (postponed exits or none) reads as the JS's `start ? start.taps : b.plan`, which was pleasant.
5. **A copy of a range of run-time length is a loop**: postpone's trial (best without its k-th tap,
   then that tap) is two element loops, as in G2 and G3's postponements; casual play's path copy one.
   `memcpy` takes bytes and pointers, so the loops read better. 3 sites.
6. **Tables are many-pointers, unchecked** (`// unchecked:` 33 sites): every graph table
   is indexed by a node or a component number that the graph's own construction bounds; a `?? 0`
   would hide a builder bug, as the plan says. Ranged indices (`u32#4`) proved the one fixed-size
   table (regional's quarters).
7. **Where a unit lives, `*Geo` or `Board`**: the MoonBit passes both (`valid(b, g)`); the Geo holds
   the board, so one argument does, and `g.valid()`, `geo(b).score(false).par` read well. coverage
   and regional take the `Board` (they need no table). A choice to make once, 2 minutes.

### Error messages (verbatim)

1. `metrics.ents:299:7: 'c' is already declared: a loop variable cannot reuse the name of a variable in scope`
   (clear; as G4 and G5 found, it does not say where the first one is, here 20 lines up).
2. `test/g6.ents:96:7: 'board' is already declared in this scope`: the other `board` is the function
   the `let` is in, which the message does not say.
3. `metrics.ents:177:9: if let requires an optional expression or bounds-checked index`, for
   `if let seen = &related[at]` with `related` a many-pointer: right (a many-pointer's element is not
   checked, so its address is not optional), and the fix was to drop the `if let`.

### Bugs

- `bugs/06-fmt-optional-slice-element.ents`: `encantis fmt` prints `[]?[]T` as `[] ? []T` (spaces
  round the `?`, as if it were an operator), drops the space after a parameter's or field's `:`, and
  the second space before an end-of-line comment. The output still parses to the same types. And
  `fmt` writes in place and takes no `-o` (`fmt f.ents -o out` formats f.ents, then fails with
  `Error: File not found: -o`), though the CLI's general options list `-o` (default stdout). G6 ran
  `fmt play.ents` expecting stdout; undoing it was a 15-line script (whitespace only, `check` and the
  oracle unchanged) and 10 minutes. Not a compiler bug: the compiler made no wrong code in G6.

### Tooling

- `check play.ents` 2.5 s, `check metrics.ents` 2.7 s (13 modules), `test` 3.1 to 3.3 s, `wasm
  test/g6.ents` 4.2 s; build.sh with G6 31 s (G6's two modules: 4 inline tests), every earlier wasm byte for byte.
- `hover metrics.ents:236:12` (the Tarjan context `t`) prints the whole struct, 330 characters
  (`local t: *mut (dep: (at: [*]mut i32, list: [*]mut i32), next: i32, ...)`): structural types have
  no name to show, as G3 to G5 found.
- `fmt`: bugs/06.
- The JS's answers are cached per board (`--fill`, 230 s of JS for the 135 boards, most of it casual
  play on spinner boards: C13 and C14 take 80 and 200 s for 100 games, so they get 10); then the
  whole check is 4 s on the port.

### Pleasant

- **Exact on the first run**, every part (11,122 comparisons, then the calls), and the hybrid made
  the reference levels unchanged.
- `let (board: b, paths:, prefer:) = read_position()`: named results, destructured with a rename.
- `zeroed(16) as *mut [4]i32` indexed by a `zone()` that returns `u32#4`: proven in range, no `??`,
  no tag.
- `if let i = plan[k] { actions[i] += 1 }`; `hex_postpone_exits(...) ?? b.plan`; a `Par` returned by
  value as `p.*` with its plan in the caller's scope.
- One stamp table shared by two modules through two exports, and a function of mech.ents
  (`walk_at`) that made casual play's speed without a line of mech.ents changed.

### Where `comptime n: u32` with `[n]T` would help G6

- regional's two quarter tables are `*mut [4]i32` from `zeroed(16)` (1 `// comptime-n:` site): a
  `[4]i32` in registers cannot take a run-time index (PORT-PLAN 10, p4), and a `FixedVec(4, i32)`
  would add a length nothing needs.

### Counts (tags in G6's files, sites; header mentions left out)

| Tag | metrics.ents | play.ents | test/g6.ents |
| --- | ---: | ---: | ---: |
| `// closure:` | 7 | 5 | 0 |
| `// fnvalue:` | 0 | 0 | 0 |
| `// enum:` | 1 | 0 | 0 |
| `// comptime-n:` | 0 | 1 | 0 |
| `// unchecked:` | 19 | 14 | 0 |
| `// reserve:` | 0 | 2 | 0 |

| What | Count |
| --- | ---: |
| exact comparisons (check-g6; more on the g1 boards) | 13,813; 4,412 |
| levels regenerated with G6's units on the port, the same (reference; seven codes, every field) | 135 of 135; 240 of 240 |
| local functions made top-level / sites where lambdas became loops (lambdas) | 1 (Tarjan's visit) / 11 (about 20) |
| names renamed for function-scoped lets / a local named like its function | 13 / 1 |
| copies of a run-time range written as loops | 3 |
| `if let` outside tests (deepest nesting) | 7 (1) |
| compiler bugs / tooling bugs | 0 / 1 (bugs/06, fmt) |
| departures that change an answer or a draw | 0 |
| Journey levels that differ because of G6 (of 120) | 0 |
