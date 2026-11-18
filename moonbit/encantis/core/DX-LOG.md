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
