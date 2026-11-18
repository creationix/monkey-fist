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
