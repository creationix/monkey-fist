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
