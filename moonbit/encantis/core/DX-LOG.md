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
