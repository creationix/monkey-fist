# Comptime generics for Encantis: the final plan

This is the plan to implement. It is self-contained together with the five maps
(`map-syntax.md`, `map-checker.md`, `map-codegen.md`, `map-types-tooling.md`,
`map-tests-docs-usecases.md`, in the same directory as this file); the three design documents it
judges are not needed to implement it.

Conventions. Paths are relative to `/home/user/encantis` (branch `claude/generics`, = v0.2.1,
commit 2ba1c05) unless absolute. `checker.ts`, `codegen.ts` and so on mean
`packages/compiler/<file>`; `ohm:N` is `packages/compiler/encantis-grammar.ohm` line N. All line
numbers are for v0.2.1 and were re-checked for this plan.

Evidence marks used throughout:

- **[ran]**: I ran it for this plan. Probes and the patched compiler copy are in
  `/tmp/claude-0/-home-user-monkey-fist/c2838201-d71f-55a0-bc1a-cc2e586d01ea/scratchpad/generics/judge/`
  (section 11 lists them). "judge copy" is `judge/repo`: the minimal design's prototype at its
  commit `17585bc` plus six patches of mine (argument widening, recovery type, operand validation,
  export skip, `, in f(...)` label, instances emitted in place in name order).
- **[design]**: specified here, not run anywhere. Every such item is small and is named as such.

Nothing in `/home/user/encantis` or `/home/user/monkey-fist` was modified.

Contents

1. Verdict: the base, the grafts, the scores
2. Every disagreement between the designs, decided
3. The language specification (the new chapter of `docs/encantis.md`)
4. Grammar and AST changes
5. Checker changes, by function
6. Codegen changes, by function
7. Tooling changes
8. The staged pull requests (file lists, acceptance programs, tests, zero-cost checks)
9. Non-goals, with the error each produces
10. Risks, open questions, and the order to cut scope
11. Appendix: what was run for this plan

---

## 1. Verdict

**Base: `design-minimal.md`.** An instance of a generic is a copy of its declaration with the
comptime parameters substituted, placed at private source offsets, and handed to the unchanged
`collectFunc`, `checkFuncBody` and `funcToWat`. Calls are lowered through one per-call table. No
new `ResolvedType` kind.

**Grafted from `design-language.md`:** the reference chapter and its rules (the first typed
argument decides a type parameter; untyped literals never decide; an explicit type argument is
read as a type because of its position); the recovery type (one mistake, one error); operand
validation as written there; instances emitted in the generic's place in name order, which makes
whole-file byte equality testable; the `ents same-wasm` spec block and spec-tested regions of
`docs/encantis.md`; the `, in f(T = u32)` error label and `notes`; the `typePun` grammar boundary;
two lenient parameter forms that exist only to give a clear error.

**Grafted from `design-architecture.md`:** the `Param`/`ParamList` grammar rule, so `comptime`
cannot be written outside a declaration's parameter list at all; `ComptimeValue` gaining `type`
and `func` kinds, so an instance is keyed by its comptime argument values (the link to comptime
evaluation); function identity (module and name) in instance keys; the corpus WAT comparison as a
kept script; loud failures replacing silent codegen fallbacks; values-in-memory as its own stage.

**Rejected:** per-instance checker tables over a shared AST, type variables in `ResolvedType`,
per-owner literal tables in `data-pack.ts`, the lookup environment in the instance key with a
merge pass (architecture); the coherence check and three-level overload ranking with generic
candidates (language); literal defaulting in inference, scope-first reading of type arguments,
instances appended in request order (minimal).

### Scores (1 = poor, 5 = best)

| Criterion | minimal | architecture | language | Why |
|---|---|---|---|---|
| Correct against the real compiler | 5 | 3 | 4 | minimal's prototype passes `bun test` (678), `bun run lint` and `bun run typecheck` **[ran]**. architecture's passes `bun test` (672) but fails `typecheck` (4 errors) and `lint` (1 error) **[ran]**, compiles literals in generic bodies to address 0 and a third-module comparator to an undefined function (its own appendix). language has no prototype of its own; its evidence is minimal's prototype plus patches, all of which I could reproduce |
| Zero-cost guarantee | 4 | 4 | 5 | All three produce instance bodies identical to hand-written code. Only language fixes emission order and tests whole-file byte equality; I reproduced it at 105, 361, 535, 1,323 and 1,331 bytes **[ran]** |
| Fit with the chosen syntax | 4 | 5 | 4 | All parse the owner's six lines. architecture's `Param` rule confines `comptime` by grammar; the other two parse it in every struct type and reject it in the checker |
| Simplicity and risk | 5 | 2 | 3 | minimal: about 1,100 lines with tests, no change inside `funcToWat` or the body checker. architecture: two new type kinds through every exhaustive switch, instance views, `data-pack.ts` rewrite, program-wide tables from the first PR. language: minimal's mechanism plus a coherence check and overload ranking that nothing ran |
| Path to comptime evaluation | 3 | 5 | 4 | architecture binds comptime parameters as scoped symbols, which is what an evaluator wants. minimal substitutes, as `def` does today; it stops at compile-time control flow. This plan takes minimal's mechanism and architecture's value model (section 3.10, 5.1) |
| **Total** | **21** | **19** | **20** | |

---

## 2. Every disagreement, decided

Each row names the deciding fact and how it was checked. "A/M/L" = architecture / minimal / language.

| # | Point | Positions | Decision | Deciding fact |
|---|---|---|---|---|
| 1 | How an instance is made | M, L: copy the declaration, substitute, shift spans by `index * 2^28`. A: one AST, tables swapped per instance | **Copy** | The checker writes on AST nodes (`dataId`, `mut`: checker.ts:720, 743, 1886, 1891, 2043, 2047, 2689, 2693 **[ran: grep]**) and literal ids are bare offsets, so a shared AST needs per-owner literal tables; A's own prototype gets literals wrong. The copy prototype is clean on test, lint and typecheck; with my patches no 0.2.1 test fails, and of the 92 `.ents` files of both repositories 87 compile to identical WAT, 2 differ only in the line numbers of an existing compiler crash, and 3 are existing miscompiles that the stage 3 lookup changes fix (section 8, stage 3) **[ran: `judge/samewat.sh`]** |
| 2 | New `ResolvedType` kinds | A: `typevar`, `type`. M, L: none | **None** | Nothing generic then reaches `typeToWasm`, `byteSize`, `concretizeType`, meta or queries. Inference matches the declared type's *AST* against a concrete type |
| 3 | Where `comptime` may be written | A: a `Param` rule used only in parameter lists. M, L: in the shared `Field` rule, rejected by the checker elsewhere | **`Param` rule** | The combined grammar of section 4 parses 352 corpus sources exactly as 0.2.1 does (175 parse, 177 do not, 0 changed) and rejects `type P = (comptime T: type)`, `-> (comptime T: type)`, `(comptime T: type) -> u32` at parse time **[ran: `judge/gram.ts`]** |
| 4 | Friendly errors for near-miss parameters | L: lenient grammar forms. A, M: parse errors | **Two lenient forms** inside `Param` (`comptime t: type`, `T: type`) | Both parse only in a parameter list and produce one checker error each; no corpus parse changes **[ran]** |
| 5 | Which argument decides `T` | M, L: the first typed argument. A: unify all, later bare-`T` arguments may widen `T` | **First typed argument decides** | It is what the builtin `min`/`max` do (checker.ts:2481-2495: `inferExpr` the first argument, `checkExpr` the second against it **[ran: read]**). Relaxing later is compatible; tightening is not. `max(a_u8, b_u32)` is an error on M and L prototypes and `u32` on A's **[ran: `judge/i1.ents`]** |
| 6 | A call where only untyped literals could decide (`max(1, 2)`) | M: `let` defaults (`i32`, `f64`). L: error. A: defaults | **Error**, with the fix in the message | M's defaulting mistypes a literal that is not a scalar: `count([3:u32, 5, 5], 5)` binds `T = i32` and then reports `cannot assign u32 to i32` **[ran: `judge/l4c.ents`]**. An error can become a default later without breaking a program. Owner question Q2 |
| 7 | How an explicit type argument is read | M: scope first (a variable named `u8` wins). A: scope, then primitive. L: by position, as after a colon | **By position** | The call form is already known from the argument count, so position is unambiguous. M's prototype rejects `count(u8, xs)` when a local is named `u8`, with a cascade error **[ran: `judge/i4.ents`]** |
| 8 | Order of instances in the output | M, A: after the module's functions, in request order. L: in the generic's place, in name order | **In place, name order** | Request order depends on checker traversal. With the fixed order a generic program and its hand-written twin are the same `.wasm` file; I patched both assemblers of the judge copy (30 lines) and got identical files against unmodified 0.2.1 and against the released 0.2.1 binary **[ran: `judge/s1/zc_*`, `judge/s2/zc2_*`, `judge/doc/d1*`]** |
| 9 | Error cascades after a failed generic call | L: recovery type. M: accepts follow-on errors. A: silent | **Recovery type**, minimal form | One identity-compared sentinel, returned by a failed generic call, silent in `checkExpr`: 4 lines. With it the 667 tests of 0.2.1 still pass and each mistake of `judge/e4.ents`, `judge/doc/d9.ents` is one error **[ran]** |
| 10 | Operands of operators | All agree a check is needed; L has the code | **L's check** | `Pt > Pt` passes `check` on 0.2.1 and is invalid wasm (`judge/p2.ents`); with the check: `operator > is not defined for Pt`. No 0.2.1 test fails and no corpus file is rejected **[ran]** |
| 11 | Implicitly widened call arguments | All agree; none implemented | **Convert in `callToWat`**, stage 1 | `f(a_u32)` for a `u64` parameter passes `check` and is invalid wasm on 0.2.1 (`judge/p1.ents`). My 12-line patch fixes it and `max(a_u64, b_u32)`; corpus WAT unchanged **[ran]** |
| 12 | Error label | M: `[in max(f64)]`. A, L: `, in max(T = f64)` | **`, in max(T = f64)`** | Names the parameter; two designs agree; no cost |
| 13 | Requesting call on body errors | A: `related`. L: `notes`. M: none | **`notes`**, stage 2 | Optional field on `TypeError`; spec `errors` blocks match the message only |
| 14 | Moving `CallExpr` type keys to `span.end` | M: stage 1. A, L: with method calls | **With method calls (stage 3)** | Two `CallExpr` nodes share a start offset only in a method chain `a.f().g()`. In `Vec(T)(...)` the inner call is read as a type and never gets a types-map entry. The lowering table is keyed by `span.end` from stage 1 |
| 15 | A declared function with a builtin's name | M: only a generic replaces the builtin. A, L: any declared function does | **Generics in stage 1; all functions in stage 3** (with overload resolution) | Today the builtin wins silently and the user's function is dead code (`judge/p3.ents` **[ran]**). The owner's `max` needs the generic case now. Owner question Q3 for the rest |
| 16 | Generic declared inside a `test` block | M, A: supported. L: on the cut list | **Rejected with an error** for now | `collectFunc` always registers in module scope, so two tests declaring the same generic would produce two wasm functions with one name. No acceptance program needs it |
| 17 | Overload sets | M, L: internal names for the second and later declarations. A: an `overloads` symbol kind | **Internal names** | Every existing reader of `symbols.get(name)` keeps working. `Set(u32)` and `Set([]u32)` run on M's probe (`judge/s3/set.ents`, 2 tests **[ran]**) and the output equals the hand-written twin (361 bytes **[ran]**) |
| 18 | Generic functions inside overload sets | L: yes, ranked last. A: yes. M: no | **No**: a generic's name is unique in its module | First item on A's and L's own cut lists; no acceptance program has two generics with one name **[ran: grep of `acceptance/`]** |
| 19 | Cross-module instantiation | A: in the first PR, program-wide tables. M, L: last stage | **Last stage** | Stage 1 must be the smallest end-to-end step. Instances live on the generic's symbol, which importers already receive by reference (checker.ts:527), so the later stage adds queues and finalization, not a new identity scheme |
| 20 | A duck-typed call the generic's module cannot answer | M: look in the requesting module; such instances are per requester. A: lookup chain in the instance key, merge afterwards. L: one instance per program plus a coherence error | **M's rule, made precise** (section 3.8): owner module, then the *site* (the module whose ordinary code started the instantiation chain); a site-dependent instance is per site | Types are structural, so two unrelated modules can each have a `(i32, i32)` key with its own `hash`; L's rule makes that an error. A's is correct but needs a graph merge. Nothing here is prototyped by anyone: section 10 |
| 21 | Data literals in generic bodies | A: per-owner tables in `data-pack.ts`. M, L: nothing to do | **Nothing to do** | Copies have their own offsets, so their literals are separate entries (M's probe `min2/w3.ents`; a string argument of an inferred call is emitted once, `judge/l4a.ents` **[ran]**) |
| 22 | `sizeof` in instances | A: a `consts` table. M, L: a `SizeofType` entry in the types map | **`SizeofType` entry**, stage 1 | `sizeofToWat` re-resolves the AST with a private resolver that returns `i32` for unknown names (codegen.ts:1846-1859 **[ran: read]**), so `sizeof(T)` would silently be 4. `bytes(u64, 3) == 24` and `bytes((u32, u16), 2) == 12` on the judge copy **[ran]** |
| 23 | Where the docs' examples are executed | M: a second copy in `spec/generics.md`. A, L: marked regions of `docs/encantis.md` | **Marked regions**, plus `ents same-wasm` | Only `spec/*.md` is run today (spec/spec.test.ts:67 **[ran: read]**). Regions make the chapter itself the test, with no second copy |
| 24 | Comptime value parameters, `def` leaving the parser | A: PR 4. M, L: not now | **Not in these stages**; parsed and rejected | No first user needs them. Section 3.10 says how they follow |
| 25 | Members whose name starts like a primitive (`s.boolish`, `v.u32s()`) | L: fix the `typePun` rule. Others: untouched | **Fix, stage 3** | `s.boolish` is a parse error on 0.2.1 (`judge/t1.ents` **[ran]**); method names must be free. `p.u32`, `p.u32-1`, `p.u8[4]` parse as before **[ran: `judge/gram.ts`]** |
| 26 | Declaration-time check of an unused generic's signature | L: a syntactic walk. M, A: none | **None** | An unused generic is only parsed plus the parameter checks of section 5.2. Errors in its signature appear at first use, with the label |
| 27 | Imported generic types when a file is checked alone | M: open. A: suppress type diagnostics. L: opaque types | **Program check when imports can be read, else suppress** (stage 5) | Opaque types need the recovery type propagated through member, index and operator expressions, which nobody ran. Owner question Q6 |

---

## 3. The language specification

This section is the text of the new chapter **"8. Generics"** of `docs/encantis.md`, placed after
"7. Modules" (Memory Model and the later chapters move down by one). It is written inside
`<!-- spec:begin compile -->` ... `<!-- spec:end -->` markers, so the spec runner parses, checks,
compiles and validates every `ents` block in it (section 8, stage 1, `spec/spec.test.ts`). Each
subsection carries the stage that adds it; a stage adds its subsections to the chapter in the same
pull request as the code.

Every `ents` block below that has no `errors` block compiles to valid wasm on the judge copy
**[ran: `judge/doc/`]**; the blocks of 3.1-3.4 need only stage 1. Messages in `errors` blocks are
this plan's final wording; where the prototype words them differently the text says so in
section 9.

Three forms are written in their stage-4 spelling only after stage 4 lands: reaching a field
through a pointer as `v.len` (until then `v.*.len`), storing a whole struct through a pointer, and
a `bool` field in memory. 0.2.1 miscompiles all three with or without generics (stage 4).

### 3.1 Compile-time parameters (stage 1)

> A parameter marked `comptime` is given at compile time. The function is compiled once for each
> distinct set of compile-time arguments it is called with, and each copy is an ordinary function
> that has only the remaining parameters.
>
> ```ents
> func max(comptime T: type, a: T, b: T) -> T => if a > b { a } else { b }
>
> export func widest(a: u32, b: u32) -> u32 => max(u32, a, b)
> export func longest(a: f64, b: f64) -> f64 => max(a, b)
> ```
>
> compiles to exactly the module this does:
>
> ```ents same-wasm
> func max_f64(a: f64, b: f64) -> f64 => if a > b { a } else { b }
> func max_u32(a: u32, b: u32) -> u32 => if a > b { a } else { b }
>
> export func widest(a: u32, b: u32) -> u32 => max_u32(a, b)
> export func longest(a: f64, b: f64) -> f64 => max_f64(a, b)
> ```
>
> A **type parameter** is written `comptime T: type`. Its name starts with an upper-case letter,
> like every type name. Inside the function `T` is a type: it can be used wherever a type can be
> written (`x: T`, `[]T`, `*mut T`, `sizeof(T)`, `p as [*]mut T`) and passed on as a type argument
> (`fact(T, n - 1)`).
>
> Rules:
>
> 1. Comptime parameters may appear anywhere in the parameter list; by convention type parameters
>    come first. A parameter's type may mention any type parameter of the same function.
> 2. `comptime` is only written in the parameter list of a named function declared with `func` at
>    module level. Every parameter of such a function has a name.
> 3. A function with a comptime parameter is a *generic function*. It is not a value: it cannot
>    be stored, passed as an ordinary argument, or exported to the host. It can only be called.
>    Its name is unique in its module.
> 4. The body of a generic function is checked when the function is instantiated, with the types
>    filled in, and not before. A generic function that is never called is only parsed, and
>    nothing is emitted for it.
>
> `comptime` is a reserved word.

(The byte-identical pair above: 105 bytes on both sides **[ran: `judge/doc/d1g.ents`, `d1h.ents`]**.)

### 3.2 Calling a generic function (stage 1)

> A call to a generic function is written in one of two forms.
>
> **Explicit.** Every parameter gets an argument, in order. The argument of a type parameter is a
> type, written as it is after a colon:
>
> ```ents
> type Pt = (q: i32, r: i32)
>
> func pick(comptime T: type, first: bool, a: T, b: T) -> T => if first { a } else { b }
> func head(comptime T: type, xs: []T) -> T => xs.ptr[0]
>
> export func a(c: bool, x: u8, y: u32) -> u32 => pick(u32, c, x, y)      // x is widened, as for any u32 parameter
> export func b(c: bool, p: Pt, q: Pt) -> Pt => pick(Pt, c, p, q)
> export func c(c: bool, p: (i32, i32), q: (i32, i32)) -> (i32, i32) => pick((i32, i32), c, p, q)
> export func d(xs: [][]u8) -> []u8 => head([]u8, xs)
> export func e(xs: []*mut Pt) -> *mut Pt => head(*mut Pt, xs)
> export func f(xs: []u64) -> u64 => head(u64, xs)
> ```
>
> In that position a name is read as a type even if a variable of the same name is in scope
> (`u8` there is the type, as it is in `let x: u8`).
>
> **Inferred.** All type parameters are left out, and the compiler finds them from the other
> arguments:
>
> ```ents
> func max(comptime T: type, a: T, b: T) -> T => if a > b { a } else { b }
> func head(comptime T: type, xs: []T) -> T => xs.ptr[0]
> func swap(comptime T: type, a: *mut T, b: *mut T) {
>   let tmp = a.*
>   a.* = b.*
>   b.* = tmp
> }
>
> data primes = [2:u16, 3, 5, 7]
>
> export func a(x: u32, y: u32) -> u32 => max(x, y)          // T = u32
> export func b(x: f64) -> f64 => max(x, 0.5)                 // T = f64; the literal is an f64
> export func c(x: u64) -> u64 => max(1, x)                   // T = u64, decided by x
> export func d(xs: []u64) -> u64 => head(xs)                 // T = u64, from []T
> export func e() -> u16 => head(primes)                      // T = u16: a data array is a slice here
> export func f(p: *mut i64, q: *mut i64) { swap(p, q) }      // T = i64, from *mut T
> ```
>
> **Which form a call is** depends only on how many arguments it has. If a function has `P`
> parameters of which `K` are type parameters, a call with `P` arguments is explicit and a call
> with `P - K` arguments is inferred. Anything else is an error that says both counts. There is no
> form that writes some type parameters and infers others. Arguments are positional.
>
> #### How type parameters are inferred
>
> 1. **The first argument that can decide a type parameter decides it.** Go through the
>    parameters left to right. The first one whose written type mentions `T`, and whose argument
>    has a type of its own, decides `T`.
> 2. **Deciding is matching shapes.** The parameter's written type is laid over the argument's
>    type: `T` against `u32` gives `T = u32`; `[]T` against `[]u64` gives `T = u64`; `*mut T`
>    against `*mut i64` gives `T = i64`; `(T, U)` against `(i32, f64)` gives both. Matching looks
>    through the conversions an argument gets anyway, and through nothing else:
>
>    | Parameter | Argument | Result |
>    |---|---|---|
>    | `*T` | `*mut X` | `T = X` |
>    | `[]T` | `[]mut X` | `T = X` |
>    | `[]T`, `[*]T` | `*[N]X` (a `data` array, a string) | `T = X` |
>    | `?*T` | `*X` | `T = X` |
>    | `T` | a value known to lie in a range, `u32#12` | `T = u32` (the range is dropped) |
>    | `T` | `u8`, where a later argument is `u32` | `T = u8`: numbers are not widened to make arguments agree |
>
>    Type aliases are transparent, as everywhere.
> 3. **Untyped literals never decide.** `7`, `0.5` and `[1, 2, 3]` have no type of their own;
>    they take the type the parameter turns out to have. A literal with a type written on it
>    (`7:u8`) is typed and can decide.
> 4. **Every other argument is an ordinary argument.** Once `T` is decided, the remaining
>    arguments are checked against the now-concrete parameter types exactly as for a hand-written
>    function: the same implicit conversions, the same errors.
> 5. **Nothing is guessed.** If no argument decides a type parameter the call is an error and the
>    type has to be written. That includes a call whose only candidates are literals (`max(1, 2)`)
>    and a type parameter that appears only in the result (`zero()`): the expected type of the
>    call is not used.
>
> ```ents
> func max(comptime T: type, a: T, b: T) -> T => if a > b { a } else { b }
>
> func f(a: u8, b: u32) -> u32 => max(a, b)
> ```
>
> ```errors
> argument 2: cannot assign u32 to u8
> ```
>
> `max(b, a)` is accepted (`T = u32`, and `a` widens like any `u8` passed for a `u32`), and so is
> `max(u32, a, b)`.
>
> ```ents
> func max(comptime T: type, a: T, b: T) -> T => if a > b { a } else { b }
> func zero(comptime T: type) -> T => 0
>
> func f() -> i32 => max(1, 2)
> func g() -> u32 => zero()
> ```
>
> ```errors
> cannot infer T for 'max' from untyped literals: write max(i32, ...) or give a literal its type (1:i32)
> cannot infer T for 'zero': write the type argument, as in zero(u32)
> ```

### 3.3 Requirements (stage 1: operators; stage 3: calls)

> A generic states no requirements. It uses its type parameter, and each use is checked for the
> concrete type when the generic is instantiated. There are no traits or interfaces: what a type
> must provide is whatever the generic's body does with it.
>
> Operators are requirements. `<`, `>`, `<=`, `>=` and arithmetic exist for numbers; `==` and
> `!=` for numbers, `bool` and pointers. None is defined for structs, tuples, slices or arrays:
>
> ```ents
> type Pt = (q: i32, r: i32)
> func max(comptime T: type, a: T, b: T) -> T => if a > b { a } else { b }
>
> export func f(a: Pt, b: Pt) -> Pt => max(a, b)
> ```
>
> ```errors
> operator > is not defined for Pt, in max(T = Pt)
> ```
>
> The error is reported at the line of the generic's body where it occurs, with types printed as
> they are in that instance (never as `T`), followed by the instance. Each instance is checked
> once, so its errors appear once however many calls use it. Every other error of the language can
> occur in an instance and reads as usual plus the `, in ...` suffix.
>
> *(Stage 2 adds:)* The command line also prints the call that first asked for the instance:
>
> ```text
> shapes.ents:2:51: operator > is not defined for Pt, in max(T = Pt)
>   required from shapes.ents:4:38
> ```
>
> *(Stage 3 adds:)* A call in a generic body, `eq(a, b)` or `k.hash()`, is a requirement too. It
> is resolved when the instance is checked, by name and argument types (3.7), so each key type
> brings its own function:
>
> ```ents
> func hash(k: u32) -> u32 => k * 0x45d9f3b
> func hash(k: []u8) -> (h: u32) {
>   h = 0x811c9dc5
>   for w in k {
>     h = (h ^ (w as u32)) * 0x01000193
>   }
> }
> func eq(a: u32, b: u32) -> bool => a == b
> func eq(a: []u8, b: []u8) -> bool {
>   return false when a.len != b.len
>   for i in a.len {
>     return false when a.ptr[i] != b.ptr[i]
>   }
>   return true
> }
> func bucket(comptime K: type, k: K, n: u32) -> u32 => k.hash() % n
> func same(comptime K: type, a: K, b: K) -> bool => hash(a) == hash(b) && a.eq(b)
>
> export func f(a: []u8, b: []u8) -> u32 => if same(a, b) { bucket(a, 16) } else { bucket(7:u32, 3) }
> export func g(a: u32, b: u32) -> bool => same(u32, a, b)
> ```
>
> `same` for `K = []u8` calls `hash(k: []u8)` and `eq(a: []u8, b: []u8)`; for `K = u32` the
> other pair. All are direct calls. A key type with no `hash` is one error when `same` is first
> used with it: `no function 'hash' accepts (f64), in same(K = f64)`.

(The last block equals its hand-written twin, 361 bytes **[ran: `judge/s3/zc3_over_*`]**.)

### 3.4 Instances (stage 1)

> An *instance* is one generic function with all its comptime arguments fixed.
>
> - **Identity.** Two calls use the same instance when they name the same generic and their
>   comptime arguments are equal. Types compare structurally, with aliases expanded: `Pt` and the
>   struct `(q: i32, r: i32)` it names are one argument. Explicit and inferred calls that arrive at
>   the same arguments share the instance.
> - **Once.** An instance is one function in the output however many calls use it.
> - **On demand.** An instance is created by the first call that needs it. A generic nobody calls
>   has no instances; a generic used only from `test` blocks has instances only in test builds.
> - **Zero cost.** An instance is the function you would get by writing the generic out by hand
>   for those arguments, and it compiles to the same bytes. A call compiles to one `call` of the
>   instance with only the non-comptime arguments. Nothing exists at run time for a type
>   parameter, a generic type, or a generic that is not used. No function tables and no indirect
>   calls are involved.
> - **Statics.** A data literal in a generic body belongs to each instance separately, as it
>   would in hand-written copies; a `mut` literal is one buffer per instance.
> - **Recursion.** A generic may call itself or another generic. A generic that instantiates
>   itself with a larger type each time never finishes; the compiler stops after 64 nested
>   instantiations with one error.
> - **Place and names.** In the output a generic's place is taken by its instances, in the order
>   of their names. In WAT an instance is named after the generic and its arguments,
>   `$max<u32>`, `$head<''u8>`; the exact spelling is not part of the language and names do not
>   reach the `.wasm` file.
>
> ```ents
> func bytes(comptime T: type, n: u32) -> u32 => n * sizeof(T)
> func fact(comptime T: type, n: T) -> T => if n <= 1 { 1 } else { n * fact(T, n - 1) }
>
> export func a() -> u32 => bytes(u64, 3) + bytes((u32, u16), 2)   // 24 + 12
> export func b() -> u64 => fact(u64, 20)
> ```
>
> What "zero cost" does not promise: no inlining (a user-declared generic `max` is a call where
> the builtin `max` is an inline `select`), and no merging of instances that happen to compile to
> the same bytes (`push` for `u32` and for `i32` are two functions, as two hand-written functions
> would be).

### 3.5 Generic types (stage 2)

> A generic type is a function from types to a type. It is declared with `func`, an upper-case
> name, the result `type`, and a type after `=>`:
>
> ```ents
> func Vec(comptime T: type) -> type => (ptr: [*]mut T, len: u32, cap: u32)
> func Pair(comptime A: type, comptime B: type) -> type => (first: A, second: B)
>
> func last(comptime T: type, v: *Vec(T)) -> T => v.*.ptr[v.*.len - 1]
> func swapped(comptime A: type, comptime B: type, p: Pair(A, B)) -> Pair(B, A) => Pair(B, A)(p.second, p.first)
>
> export func a(v: *Vec(u32)) -> u32 => last(v)
> export func b(v: *(ptr: [*]mut f64, len: u32, cap: u32)) -> f64 => last(v)
> export func c(p: Pair(u8, u64)) -> Pair(u64, u8) => swapped(p)
> export func d() -> u32 => sizeof(Vec(u8)) + sizeof(Pair(u8, u64))     // 12 + 9
> ```
>
> Applying it, `Vec(u32)`, is a type and can be written wherever a type can: a parameter, a
> result, a field, a cast, `sizeof(Vec(T))`, a `let` annotation, another generic type's body, a
> type argument. There is no space between the name and the parenthesis. All parameters of a
> generic type are type parameters and all are always written: `Vec` alone is not a type.
>
> **`Vec(u32)` is an alias with parameters.** It *is* the type `(ptr: [*]mut u32, len: u32,
> cap: u32)`, not a new, distinct type; this is the rule every type name already follows. A value
> built as a plain struct with those fields is a `Vec(u32)`; two generic types with the same body
> are interchangeable and functions instantiated for them share one copy; `Vec(u8)` and
> `Vec(u32)` differ because their bodies differ, and the error says so with the names
> (`cannot assign *Vec(u8) to *Vec(u32)`).
>
> **Inference sees through a generic type** by matching its body: given a `*Vec(u32)`, the
> parameter `v: *Vec(T)` is laid over `*(ptr: [*]mut u32, len: u32, cap: u32)` and `T = u32`
> falls out, however the argument's type was written (function `b` above). A type parameter that
> the body never uses cannot be inferred and must be written at the call.
>
> **Building a value.** `Vec(T)(p, 0, cap)` constructs like `Point(1, 2)`, by position or by
> name; a struct literal where the type is known works as for any struct. `T(a, b)` also
> constructs when `T` is a type parameter that turns out to be a struct or tuple; a generic body
> that converts numbers writes `x as T`.
>
> **Size and layout.** `sizeof(T)` and `sizeof(Vec(T))` are constants in each instance. A
> struct's size is the sum of its fields' sizes: fields are packed in declaration order with no
> padding. `sizeof((bool, u32, []u32))` is 13.
>
> **Where a container's header lives.** A `Vec(u32)` in a local is three wasm locals and has no
> address. A function that changes a container takes a pointer to it, so the header lives in
> memory and the program holds a pointer: `vec(u32, 16)` returns `*mut Vec(u32)`.
>
> A generic type that refers to itself (`func List(comptime T: type) -> type => (head: T,
> next: ?*List(T))`) is not supported: `generic type 'List' refers to itself`.

### 3.6 Comptime function parameters (stage 2)

> A **function parameter**, `comptime before: (T, T) -> bool`, is given the name of a function.
> Inside the generic, `before(a, b)` is a direct call of that function. This is how a sort takes
> its comparator without a function pointer:
>
> ```ents
> func sort(comptime T: type, xs: []mut T, comptime before: (T, T) -> bool) {
>   let p = xs.ptr
>   for i in xs.len {
>     let x = p[i]
>     let j = i
>     while j > 0 && before(x, p[j - 1]) {
>       p[j] = p[j - 1]
>       j -= 1
>     }
>     p[j] = x
>   }
> }
>
> func ascending(a: i32, b: i32) -> bool => a < b
> func descending(a: i32, b: i32) -> bool => a > b
>
> export func up(xs: []mut i32) { sort(xs, ascending) }
> export func down(xs: []mut i32) { sort(xs, descending) }
> ```
>
> `up` and `down` call two different copies of `sort`; one contains `call $ascending`, the other
> `call $descending`. Comptime function parameters are always written, also in the inferred form:
> `sort(xs, ascending)` is the inferred form of `sort(i32, xs, ascending)`. The argument is the
> name of a function declared at module level (not a generic, not an expression), or a comptime
> function parameter of the enclosing generic passed on. Its signature can decide a type
> parameter like any other argument: `twice(inc, x)` with `comptime f: (T) -> T` gets `T` from
> `inc`. Two instances are the same when the functions are the same function.

### 3.7 Method-call syntax and overloads (stage 3)

This subsection replaces the present second "4.8 UFCS" (docs/encantis.md:1248-1284, "Status: Not
yet implemented") as "4.9 Method-Call Syntax", and adds overloads to "3.4 Functions"; the generics
chapter links to both.

> `x.f(a, b)` calls the function `f` with `x` as its first argument, when `x` has no field named `f`:
>
> ```ents
> func Vec(comptime T: type) -> type => (ptr: [*]mut T, len: u32, cap: u32)
> func last(comptime T: type, v: *Vec(T)) -> T => v.*.ptr[v.*.len - 1]
> func double(n: u32) -> u32 => n * 2
>
> export func f(v: *mut Vec(u32)) -> u32 => v.last().double()
> ```
>
> 1. **Fields win.** If the type of `x` has a field `f` (directly, or through one pointer),
>    `x.f` is that field; the built-in members (`.ptr`, `.len`, `.*`, `.0`, the type views such
>    as `.u32`) are fields in this sense.
> 2. **The receiver is the first non-comptime parameter.** `x.f(a, b)` is `f(x, a, b)`; for a
>    generic `f` it is the inferred form and the receiver usually decides the type parameters.
>    `v.push(u32, 7)`, with the type parameters written after the receiver, is the explicit form
>    and means `push(u32, v, 7)`.
> 3. **The receiver is passed as written.** It gets the conversions any argument gets (`*mut` to
>    `*`, array pointer to slice) and nothing more: no implicit `&x`, no implicit `x.*`.
> 4. Calls chain left to right: `v.last().double()` is `double(last(v))`.
> 5. It is only syntax: `x.f(a)` and `f(x, a)` are the same call and compile to the same code.
>
> **Overloads.** Two functions may have the same name when their parameter lists differ in count
> or in types. A call picks the one whose parameter types are exactly the argument types; if
> there is none, the only one the arguments can be passed to; otherwise it is an error
> (`no function 'hash' accepts (Cell)`, or `'hash' is ambiguous for (int(5))`). Two declarations
> with the same name and the same parameter types are an error (`'hash' is already declared with
> parameters (u32)`). A generic function cannot share its name. An exported overload needs its
> own export name. A function you declare with the name of a builtin (`min`, `max`, `abs`, ...)
> replaces the builtin in your module.

### 3.8 Modules (stage 5)

> `export func max(comptime T: type, ...)` and `export func Vec(comptime T: type) -> type` make a
> generic importable by other source modules. A generic is never exported to the WebAssembly
> host: in an entry module the `export` of a generic emits nothing, so a library file still
> compiles on its own.
>
> A source import names what it uses with its signature, as today. A generic type is imported as
> the function it is:
>
> ```text
> import "./containers" (
>   "Vec" func Vec(comptime T: type) -> type
>   "vec" func vec(comptime T: type, cap: u32) -> *mut Vec(T)
>   "push" func push(comptime T: type, v: *mut Vec(T), x: T)
> )
> ```
>
> An instance belongs to the module that declares the generic: its body's names are that
> module's names, its errors print against that module's source, and its code is emitted with
> that module's functions. A second module that also pushes to a `Vec(u32)` reuses the instance.
>
> **Where a call in a generic body is looked up.** In the generic's own module first. If no
> function there accepts the arguments, in the *site*: the module whose ordinary (non-generic)
> code started the chain of instantiations. So a library provides `hash` and `eq` for the common
> key types, and a program that uses `Set(Cell)` with its own `Cell` writes `hash(c: Cell)` and
> `eq(a: Cell, b: Cell)` in the module that creates the set. A library's own functions come first
> and cannot be replaced from outside. Only the callee of a call is looked up in the site:
> types, globals and helpers of a generic body always resolve in its own module.
>
> An instance whose body needed the site belongs to that site: another module that uses the same
> generic with the same arguments gets its own copy, calling its own functions. Instances that
> did not need the site exist once in the program.

(The import block is `text`, not `ents`: a block with a source import cannot be compiled alone.
The multi-file behaviour is tested by fixtures, stage 5.)

### 3.9 Not in this version (grows per stage; the full table is section 9)

> Comptime value parameters (`comptime n: u32`) and `[n]T`; writing some type parameters and
> inferring others; inference from the expected result type; generic functions as values;
> recursive generic types; generic types with a block body; generic functions declared inside
> `test` blocks; generic functions that share a name; traits or declared requirements.

### 3.10 How this is compile-time evaluation (stage 1, extended in stage 2)

> Encantis already has names bound at compile time: `def n = 64` binds a number, `type Pt = (...)`
> binds a type, and `sizeof(T)` is an expression the compiler evaluates. Generics add one thing:
> **a name bound at compile time can be a parameter**, and a compile-time value can be a type or
> a function.
>
> | Bound at compile time | Module level | Parameter | Later |
> |---|---|---|---|
> | a type | `type Pt = (q: i32, r: i32)` | `comptime T: type` | |
> | a function | `func f(...)` | `comptime before: (T, T) -> bool` | |
> | a number, bool | `def n = 64` | reserved: `comptime n: u32` | value parameters; `[n]T` |
> | a type computed from types | | `func Vec(comptime T: type) -> type => ...` | block bodies, conditions |
> | a value computed from values | `def bytes = n * 8` | | `comptime func`, tables |
>
> A call with comptime arguments is evaluated as far as its comptime parameters go: for a generic
> type completely (the result is a type and nothing is left for run time), for a generic function
> partially (the result is a specialised function).

"Future Additions: Generics" (docs/encantis.md:2017-2031, the `<T>` sketch) is deleted. "Future
Additions: Comptime Evaluation" (:2048-2069) is rewritten as the continuation of this table:
comptime value parameters, `[n]T`, `comptime func`, comptime `if`.

How the implementation makes this one mechanism rather than two (section 5.1): the compiler's
existing `ComptimeValue` (checker.ts:50-54: int, float, bool, data pointer) gains the kinds `type`
and `func`; a comptime argument is evaluated to a `ComptimeValue` by one function
(`evalComptimeArg`), an instance is keyed by its `ComptimeValue`s, and binding is substitution of
the value for the name, which is what `def` does today in the parser (encantis-actions.ts:1386-1412).
The next steps reuse those parts: a value parameter evaluates its argument with the existing
`evalComptimeExpr` and substitutes a literal; `def` moves from the parser to the same checker-side
substitution; a `comptime func` is a function whose call is one more `ComptimeValue` producer.
Where substitution stops being enough (compile-time control flow) the substitution callback
becomes an environment; the instance table, keys, names and the lowering table stay.

---

## 4. Grammar and AST changes

### 4.1 Grammar (`packages/compiler/encantis-grammar.ohm`)

The complete change, with the stage that adds each rule. After every `.ohm` edit run
`bun run bundle:grammar`. The whole of it, applied to the 0.2.1 grammar, changes the parse result
of none of the 352 sources of both repositories (every `.ents` file and every `ents` block in a
markdown file), and every form listed in the table below it parses or is rejected as stated
**[ran: `judge/gram.ts`]**.

```
// ---- stage 1 ----------------------------------------------------------------
// ohm:72. The existing action FuncSignature becomes FuncSignature_params and
// FuncSignature_plain (same body).
FuncSignature = ParamList ("->" Type)?  -- params
              | BaseType ("->" Type)?   -- plain

// Parameters of a declaration or import item: fields, plus comptime parameters.
// Struct types, results, enum payloads and function types keep using FieldList.
ParamList = "(" ListOf<Param, ","> ")"

Param = comptime typeIdent ":" type    -- comptimeType        // comptime T: type
      | comptime ident ":" type        -- comptimeTypeLower   // rejected by the checker, with a message
      | comptime ident TypeAnnotation  -- comptimeValue       // comptime before: (T, T) -> bool; comptime n: u32
      | typeIdent ":" type             -- typeNoComptime      // rejected by the checker, with a message
      | Field                          -- plain

// ohm:422-424
Arg = ident ":" Expr          -- named
    | ident ":"               -- shorthand
    | TypeLit &("," | ")")    -- type          // new: a type that cannot be an expression
    | Expr                    -- positional

TypeLit = Type_func                 -- func    // u32 -> u32, (T, T) -> bool
        | &typeOnlyStart BaseType   -- base
typeOnlyStart = "?" | "*" | "[*]" | "[]" | arrayPrefix | rangedUnsigned | bareTypeIdent
arrayPrefix   = "[" arrayFramings "]"
bareTypeIdent = typeIdent ~"("

// ohm:514-551
keyword  = (... | sizeof | comptime) ~identChar
comptime = "comptime" ~identChar

// ---- stage 2 ----------------------------------------------------------------
// ohm:68. The existing action FuncDecl becomes FuncDecl_func.
FuncDecl = func typeIdent ParamList "->" type "=>" Type  -- typeFunc
         | inline? func ident? FuncSignature Body        -- func

// ohm:151: one alternative before `typeIdent -- named`
BaseType = ...
         | typeApplyHead NonemptyListOf<Type, ","> ")"  -- apply
         | typeIdent                                     -- named
typeApplyHead = typeIdent "("        // lexical: Vec(u32), never Vec (u32)

// ---- stage 3 ----------------------------------------------------------------
// ohm:253: a member whose name merely starts like a primitive is a field or a method
AccessSuffix = ...
             | "." PrimitiveType ~(letter | digit | "_")  -- typePun

// ---- stage 5 ----------------------------------------------------------------
// ohm:50
ImportItem = func typeIdent ParamList "->" type  -- typeFunc
           | func ident? FuncSignature           -- func
           | global ident TypeAnnotation         -- global
```

| Source | Result |
|---|---|
| `func max(comptime T: type, a: T, b: T) -> T => ...` | parses (stage 1) |
| `func sort(comptime T: type, xs: []mut T, comptime before: (T, T) -> bool) { }` | parses (stage 1; checked from stage 2) |
| `func f(comptime t: type)`, `func f(T: type, a: T)`, `func f(comptime n: u32)` | parse; the checker rejects each with a message (section 9) |
| `func f(t: type)`, `let t: type = 1`, `type P = (comptime T: type, x: T)`, `-> (comptime T: type)`, `g: (comptime T: type) -> u32`, `func comptime(...)` | parse errors |
| `func Point -> Point => p`, `func (a: i32, b: i32) -> i32 => a`, `func f(i32, i32) -> i32 => 0`, `func f() { }` | parse as today |
| `max(u32, a, b)`, `first((i32, i32), ps)`, `f(Vec(u32), x)`, `Vec(T)(p, 0, c)`, `f([], x)`, `f([4], x)`, `f(Point(1, 2), x)` | parse as today: `IdentExpr`, `TupleExpr`, `CallExpr`, array literals |
| `first(Pt, ps)`, `first([]u8, ps)`, `first(*mut Pt, ps)`, `first(?*Pt, ps)`, `first([4]u8, ps)`, `first(u8#16, ps)`, `apply((u32) -> u32, f)` | new: the argument is a `TypeExpr` |
| `f(x: T)` | parse error, as today |
| `func Vec(comptime T: type) -> type => (...)`, `*mut Vec(T)`, `Map(K, Vec(V))` | parse (stage 2); `Vec (u32)` in type position does not |
| `s.boolish`, `v.u32s()` | parse (stage 3; parse errors on 0.2.1); `p.u32`, `p.u32-1`, `p.u8[4]` as today |

Known parse change, for the release notes: an array literal that is *called* in argument position
(`f([]())`, `f([4](u32))`) becomes a type argument. The checker rejects those programs today
(`cannot call non-function type`). `comptime` becomes a reserved word; no `.ents` file in either
repository uses it as a name.

Why these resolutions (the ambiguities of `map-syntax.md` section 5): a type function needs a
dedicated first alternative because `func Vec(...)` otherwise reads `Vec` as the input type of an
anonymous function, and `func Point -> Point => p` still parses because that alternative fails at
`->`; type application has a lexical head because a type can end a statement and the next line can
start with `(`; types that are already expressions stay expressions and are read as types by the
checker, by position (5.5); a bare upper-case name does not become a primary expression, so
`spec/syntax.md:191` and `:229` keep failing with `Expected "("`; `set` stays a keyword, so the
set constructor is `hashset(K, bits)`.

### 4.2 Semantic actions (`packages/compiler/encantis-actions.ts`)

| Stage | Action | Produces |
|---|---|---|
| 1 | `FuncSignature_params(input, _arrow, output)`, `FuncSignature_plain(...)` | the body of today's `FuncSignature` (actions:330), twice |
| 1 | `ParamList(_lp, list, _rp)` | `{ kind: 'CompositeType', fields: list.asIteration().children.map(toAST), span: span(this) }`: the same node `BaseType_composite` produces, so every reader of `signature.input.fields` is untouched |
| 1 | `Param_comptimeType(_c, name, _colon, typeKw)` | `{ kind: 'Field', comptime: true, ident: name.sourceString, type: { kind: 'TypeType', span: span(typeKw) }, span }` |
| 1 | `Param_comptimeTypeLower` | the same node (the checker sees the lower-case `ident`) |
| 1 | `Param_comptimeValue(_c, ident, ann)` | `{ kind: 'Field', comptime: true, ident: ident.toAST(), type: ann.toAST(), span }` |
| 1 | `Param_typeNoComptime(name, _colon, typeKw)` | `{ kind: 'Field', ident: name.sourceString, type: { kind: 'TypeType', ... }, span }` (no `comptime`) |
| 1 | `Param_plain(f)` | `f.toAST()` |
| 1 | `Arg_type(type, _lookahead)` | `{ kind: 'Arg', name: null, value: { kind: 'TypeExpr', type: type.toAST(), span: span(type) }, span }` |
| 1 | `TypeLit_func(t)`, `TypeLit_base(_la, t)` | `t.toAST()` |
| 2 | `FuncDecl_typeFunc(_func, name, params, _arrow, _type, _fat, body)` | `{ kind: 'TypeFuncDecl', ident: name.sourceString, params: params.toAST().fields, body: body.toAST(), span }` |
| 2 | `FuncDecl_func(...)` | today's `FuncDecl` action, renamed |
| 2 | `BaseType_apply(head, args, _rp)`, `typeApplyHead(name, _lp)` | `{ kind: 'TypeApply', name, args, span }`; the head returns `name.sourceString` |
| 2 | `ExportDecl_unnamed` (actions:291-313) | takes the export name from a `TypeFuncDecl`'s `ident` (today anything that is not a function or global is named `"memory"`) |
| 5 | `ImportItem_typeFunc(_func, name, params, _arrow, _type)` | `{ kind: 'ImportTypeFunc', ident, params: params.toAST().fields, span }` |

Ohm checks action names and arities when the semantics object is created, which is at import
time: a mistake fails every test at once.

### 4.3 AST (`packages/compiler/ast.ts`)

```ts
// stage 1
interface Field { kind: 'Field'; ident: string | null; type: Type; comptime?: true; span }   // ast:94-98; absent, not false, on ordinary fields
interface TypeType  { kind: 'TypeType'; span }                      // the keyword `type` as a parameter's type
interface BoundType { kind: 'BoundType'; name: string; type: ResolvedType; span }   // never parsed: put where a type parameter was named
interface TypeExpr  { kind: 'TypeExpr'; type: Type; span }          // a type written as a call argument
type Type = ... | TypeType | BoundType                              // ast:570-578
type Expr = ... | TypeExpr                                          // ast:308-327

// stage 2
interface TypeApply    { kind: 'TypeApply'; name: string; args: Type[]; span }       // Vec(T), Map(K, V)
interface TypeFuncDecl { kind: 'TypeFuncDecl'; ident: string; params: Field[]; body: Type; span }
type Type        = ... | TypeApply
type Declaration = ... | TypeFuncDecl                               // ast:27-37; also ExportDecl.item

// stage 3
interface FuncDecl { ...; overload?: string }                       // internal name of a second or later overload; set by the checker

// stage 5
interface ImportTypeFunc { kind: 'ImportTypeFunc'; ident: string; params: Field[]; span }
type ImportItem = ImportFunc | ImportGlobal | ImportTypeFunc
```

`BoundType.type` uses `import type { ResolvedType } from './types'` (types.ts imports nothing
from ast.ts, and a type-only import creates no cycle). Because `comptime` is absent on ordinary
fields, no existing `json ast` expectation changes.

Consumers of the new kinds:

| Consumer | Change |
|---|---|
| `resolveType` (checker.ts:1752), exhaustive | cases in 5.4 |
| `astToResolved` (type-lib.ts:30-90), exhaustive | `TypeType`, `BoundType`, `TypeApply`: `throw new Error(...)`, as `FuncType` does |
| `inferExprInner` (checker.ts:2173), exhaustive | `TypeExpr` case: error (5.8) |
| `inferIdent` switch on `Symbol.kind` (checker.ts:2294-2309), exhaustive | `generic`, `typefunc` cases (5.8) |
| `walkDeclaration`, `walkExpr`, `ASTVisitor` (ast.ts:669-965) | add `TypeFuncDecl`, `TypeExpr` by hand: `walkExpr` skips unknown kinds silently, tsc does not flag it |
| codegen's `resolveTypeFromAST` (codegen.ts:1852), `resolveAstType` (3206) | silent `i32` defaults; no longer reached for `sizeof` (6.4). Leave, or make the default branch throw |
| `meta.ts:1164-1188` (`generateHintsForTypeExpr`), `generateHintsForExpr` | if-chains that skip unknown kinds: section 7 |

---

## 5. Checker changes, by function (`packages/compiler/checker.ts`)

The reference for stages 1-3 is the minimal design's prototype
(`generics/min/repo`, `git diff 5b2ee39 17585bc -- packages/compiler/checker.ts`, +~580 lines of
which ~370 are the new "Generics" section, about 25 existing lines changed). Read it; then apply
the differences this plan decides, which are marked **(differs from the prototype)**.

### 5.1 Types and tables

```ts
// checker.ts:50-54. The existing compile-time value type gains two kinds.
export type ComptimeValue =
  | { kind: 'int'; ... } | { kind: 'float'; ... } | { kind: 'bool'; ... } | { kind: 'data_ptr'; ... }   // today
  | { kind: 'type'; type: ResolvedType }                                   // stage 1
  | { kind: 'func'; name: string; module: string; sym: Symbol & { kind: 'func' } }   // stage 2

// checker.ts:56-63
export type Symbol =
  | { kind: 'type'; ... } | { kind: 'global'; ... } | { kind: 'def'; ... } | { kind: 'local'; ... } | { kind: 'param'; ... } | { kind: 'return'; ... }
  | { kind: 'func'; type: FuncRT; inline: boolean; alias?: string }        // alias: stage 2, a comptime function parameter inside an instance
  | { kind: 'generic'; decl: AST.FuncDecl; owner: CheckContext; instances: Map<string, Instance> }                  // stage 1
  | { kind: 'typefunc'; decl: AST.TypeFuncDecl; owner: CheckContext; cache: Map<string, ResolvedType>; busy: Set<string> }   // stage 2

export interface Instance {
  name: string                 // symbol-table key and base of the wasm name: max<u32>
  label: string                // for messages: max(T = u32)
  of: AST.FuncDecl             // the generic's declaration
  decl: AST.FuncDecl           // the substituted copy; spans shifted by index * INSTANCE_STRIDE
  args: ComptimeValue[]        // in comptime-parameter order
  depth: number                // instantiation nesting
  requestedAt: { ctx: CheckContext; offset: number }      // stage 2: the first call that asked, for notes
  aliases: Map<string, { target: string; sym: Symbol & { kind: 'func' } }>   // stage 2
  site?: CheckContext; usedSite?: boolean                 // stage 5
}

export const INSTANCE_STRIDE = 2 ** 28    // instance i (from 1) of a module has offsets i * STRIDE + original
const MAX_INSTANCE_DEPTH = 64
const MAX_INSTANCE_KEY = 4096
export const RECOVERY: ResolvedType = primitive('i32')   // compared by identity: the type of an expression whose error is already reported

// checker.ts:88-91
export interface TypeError { offset: number; message: string; notes?: { path?: string; offset: number; message: string }[] }   // notes: stage 2

// checker.ts:100-117, added to TypeCheckResult (all optional: nothing else that builds a result changes)
instances?: { of: AST.FuncDecl; decl: AST.FuncDecl }[]   // this module's instances
calls?: Map<number /* CallExpr span.end */, AST.Expr>     // the expression to compile in place of that call
externs?: Map<string, { module: string; name: string }>   // stage 5

// CheckContext fields (checker.ts:403-435)
instances: Instance[] = []; instanceQueue: Instance[] = []; currentInstance: Instance | null = null
calls = new Map<number, AST.Expr>()
pinned = new Map<AST.Expr, ResolvedType>()                 // stage 3: a method receiver is inferred once
overloads = new Map<string, string[]>()                    // stage 3: name -> internal names, declaration order
```

`types.ts` gains `canonicalKey(t)` and `watSafe(key)` (45 lines; copy them from the prototype's
`types.ts:1196-1240`). `canonicalKey` prints a type with every alias unwrapped at every depth
(`Pt` and `(q:i32,r:i32)` are one key), keeps explicit ranges, prints `void` as `()`, and throws
on a type that is not concrete. `watSafe` maps space to `.`, `(` to `<`, `)` to `>`, `,` to `|`,
`[` and `]` to `'`, `->` to `=>`: characters wabt accepts and `canonicalKey` never produces.
**No new `ResolvedType` kind is added in any stage.**

A `generic` or `typefunc` symbol has no `type`. tsc then flags every reader of `sym.type` that can
meet one; add `typeOfSymbol(sym): ResolvedType | undefined` and use it at checker.ts:1096 and 3154;
`resolveForwardRefs` (607-612) and the symbol loop of `typecheck()` (164-179) skip both kinds.

### 5.2 Collection

| Function (0.2.1 lines) | Stage | Change |
|---|---|---|
| `collectFunc` (572-583) | 1 | First statement after the anonymous check: `if (isGenericDecl(decl))`: run `checkGenericDecl(decl)`; if a symbol of that name exists, error `'max' is already declared: a generic function's name is unique in its module`; else `moduleScope.symbols.set(ident, { kind: 'generic', decl, owner: this, instances: new Map() })` and `recordDefinition(ident, decl.span.start)`; return. Nothing else of a generic is resolved, so `unknown type 'T'` cannot happen. A non-generic function whose name is held by a `generic` symbol gets the same error |
| `isGenericDecl(decl)` (new, exported) | 1 | `decl.signature.input.kind === 'CompositeType'` and some field has `comptime` or a `TypeType` type |
| `checkGenericDecl(decl)` (new) | 1 | The declaration errors of section 9: a comptime parameter that is not `comptime T: type` (stage 1) or a function type (from stage 2); lower-case type parameter; `T: type` without `comptime`; a parameter without a name; a type parameter whose name is a declared type (`moduleScope.symbols` or `pendingTypeNames`) or is repeated; an anonymous generic function |
| `checkDeclaration` (1158-1175) | 1 | Skip `warnManyPointerParams` and `checkFuncBody` for a generic declaration |
| `checkTestDecl` (1177-1205) | 1 | A generic `FuncDecl` item: error `a generic function is declared at module level, not inside a test`; do not collect it |
| `collectImport` (501-555) | 1 | An `ImportFunc` whose signature has a comptime field: error `generic functions cannot be imported yet` (stages 1-4); for a host import, in every stage: `a host import cannot have comptime parameters` |
| `collectFunc`, overloads | 3 | A second module-level non-generic function with an existing name: compare `canonicalKey` of the parameter types with each earlier one. Equal: error `'hash' is already declared with parameters (u32)`. Different: register it under the internal name `hash:<watSafe keys joined by \|>`, push that on `overloads.get('hash')`, set `decl.overload`. The first declaration keeps the plain name, so every existing reader of `symbols.get(name)` is unaffected. Functions declared in `test` blocks keep today's replace-by-name behaviour |
| `preRegisterTypes` (463-467) | 2 | Also registers every `TypeFuncDecl` (plain or exported) as a `typefunc` symbol (`collectTypeFunc`: all parameters must be `comptime X: type`, at least one). A type function needs nothing resolved to be declared, so any signature in the module can apply it |
| `collectDeclaration` / `collectExport` switches | 2 | a `TypeFuncDecl` case that does nothing |
| `typecheck()` (150-211) | 1 | The symbol loop (164-179) skips `generic` and `typefunc`; the never-used warning (190-199) includes `generic` with the same wording; the result gains `instances` and `calls`. The concretize loop (159-162) already covers instance entries: they are in the same map |

### 5.3 Instantiation

`instantiate(sym, args: ComptimeValue[], aliases, at)`:

1. `key` = for each comptime parameter in declaration order, `watSafe(canonicalKey(type))` for a
   type and the function's name for a function (stage 5: `name@<module>` when the function is not
   in the generic's module), joined by `|`. `label` = `max(T = u32, before = ascending)`, each
   argument printed with `typeToString` and cut at 60 characters with `...`.
2. Memo hit on `sym.instances.get(key)`: return it.
3. `depth = (currentInstance?.depth ?? 0) + 1`. If `depth > MAX_INSTANCE_DEPTH` or
   `key.length > MAX_INSTANCE_KEY`: error at the call,
   `too many nested instantiations (64) while instantiating 'deep'`; return null.
4. `index = owner.instances.length + 1`; `decl = cloneAst(sym.decl, index * INSTANCE_STRIDE, subst)`;
   remove the comptime fields from the copy's `signature.input.fields`;
   `decl.ident = `` `${sym.decl.ident}<${key}>` ``.
5. Enter it in `sym.instances`, `owner.instances` and `owner.instanceQueue`, then
   `owner.collectFunc(decl)`: the unchanged collector resolves the copy's signature and registers
   an ordinary `func` symbol under the instance name in the owner's module scope. The signature
   exists now; the body waits.

`cloneAst(node, delta, subst)` (25 lines; copy from the prototype): a deep copy of plain objects
and arrays (`Uint8Array`s by reference) in which every `span` is shifted by `delta`, every
`TypeRef` whose name `subst` knows becomes a `BoundType`, and every `IdentExpr` with such a name
becomes `TypeExpr(BoundType)` (so `g(T, x)` passes the type on and, from stage 2, `T(a, b)`
constructs). It always copies the **original** declaration, never a copy, so offsets are never
shifted twice. It does not reuse the parser's partial `cloneExprWithSpan`. A `TypeApply` whose
name is a type parameter is the error `a type parameter cannot be applied` (the prototype throws;
it must be a checker error).

`drainInstances()`, called at the end of `checkModule` (442-460; after the second pass, so after
`test` blocks): while the queue is not empty, take an instance, set
`currentScope = moduleScope` (the **owner's**: a generic body sees its own module, never the
caller's locals) and `currentInstance`, call the unchanged `checkFuncBody(inst.decl)`, restore.
Instances requested by that body join the queue. Checking bodies when the checker is at rest keeps
`loopDepth`, `deferLoopDepth`, `insideIfLetCondition` and the name-keyed `narrowings` of a caller
out of a generic body; it is possible because a call needs only the signature. Recursion needs
nothing special: the instance is in the memo before its body is checked.

Limits to assert: `source.length < INSTANCE_STRIDE` and `index < 2 ** 24` (offsets stay exact
integers).

### 5.4 `resolveType` (1752-1838)

| Case | Stage | Result |
|---|---|---|
| `BoundType` | 1 | `type.type`, **not** wrapped in `named('T', ...)`: messages then print `f64`, not `T`, and `checkExpr`'s "record the expected type when it is named" rule (2118) cannot mis-record arguments |
| `TypeType` | 1 | error `a parameter of type 'type' must be comptime: write 'comptime T: type'`; returns `RECOVERY` (reached only through `Param_typeNoComptime`, which `checkGenericDecl` reports first) |
| `TypeApply` | 2 | `applyTypeFunc(name, args.map(resolveType), offset)` |

The `TypeRef` case keeps looking in `moduleScope` only (1816): the copy has no `TypeRef` to a type
parameter left. No `comptime` rejection is needed in the `CompositeType` case or `typeToFields`:
the grammar cannot produce a comptime field outside a parameter list.

`applyTypeFunc(name, args, offset)` (stage 2): look the name up (`'Point' is not a generic type`,
`unknown generic type 'Vex'`); arity (`Vec expects 1 type argument, got 2`); every argument
concrete; `key` = the arguments' `canonicalKey`s joined; memo hit returns; if `key` is in
`sym.busy`, error `generic type 'List' refers to itself` and return `RECOVERY`; otherwise copy the
body with parameters replaced by `BoundType`s (`cloneAst(body, 0, subst)`),
`sym.owner.resolveType(copy)` with the key in `busy`, wrap as
`named('Vec(u32)', resolved)` and memoise (not while `pendingTypeNames` is non-empty: the body
may still hold forward references). The `named` wrapper is display only, as for every alias:
"structural" is implemented by doing nothing.

### 5.5 Reading a comptime argument: `evalComptimeArg` and `typeOfArg`

`evalComptimeArg(param: AST.Field, arg: AST.Expr): ComptimeValue | null` is the one place a
comptime argument is evaluated:

- type parameter: `const ast = typeOfArg(arg)`; null is the error
  `argument 1 of 'max' must be a type: T is a type parameter`; otherwise
  `{ kind: 'type', type: this.resolveType(ast) }`, and a type that is not concrete
  (`isConcreteType`, checker.ts:366) is `type argument T of 'max' must be a concrete type`;
- function parameter (stage 2): 5.7;
- (future) value parameter: the existing `evalComptimeExpr` (1026-1122).

`typeOfArg(expr): AST.Type | null` converts the argument *syntactically* to a type AST
**(differs from the prototype, which looks in scope first)**:

| Expression | Type AST |
|---|---|
| `TypeExpr` | its `type` |
| `IdentExpr` whose name is in `PRIMITIVE_NAMES` | `PrimitiveType` |
| `GroupExpr` | `typeOfArg` of the inner expression |
| `TupleExpr` with at least one element, every element a positional or named value that converts | `CompositeType` with one `Field` per element (the element's name is the field name) |
| `CallExpr` whose callee is an `IdentExpr` with an upper-case name, all arguments positional and convertible (stage 2) | `TypeApply` |
| anything else (a variable, a literal, `()`) | null |

Because the conversion is syntactic, "a type argument is written as after a colon" is true by
construction and no scope rule exists. The types are resolved in the **calling** module's context.

### 5.6 Calls to a generic: `inferGenericCall(expr, sym, name, receiver?)`

Dispatch, at the top of `inferCall` (2312), before the builtin test at 2314:

```ts
if (expr.callee.kind === 'IdentExpr') {
  const sym = this.lookup(expr.callee.name)
  if (sym?.kind === 'generic') return this.inferGenericCall(expr, sym, expr.callee.name)
}
```

Algorithm (the prototype's, with rule changes marked):

1. **Form.** `fields` = the declaration's parameters, `K` = the type parameters among them,
   `count` = arguments (plus one for a receiver, stage 3). A named or shorthand argument:
   `'max' takes positional arguments`. `count === fields.length`: explicit.
   `count === fields.length - K`: inferred. Otherwise
   `'max' expects 2 arguments, or 3 with its type argument written; got 1`.
2. **Pair** parameters with arguments in order (inferred: skip type parameters; a receiver fills
   the first parameter that is not a type parameter).
3. **Written type arguments**: `evalComptimeArg` (5.5).
4. **Comptime function arguments** (stage 2): 5.7.
5. **Inferred type arguments.** Remember `pendingLiterals.length`. For each runtime parameter in
   order whose declared type AST still mentions an unbound type parameter: `t = inferExpr(arg)`;
   if `isConcreteType(t)`, `matchType(field.type, t, bound)`; otherwise note that an untyped
   literal stood at a parameter mentioning those type parameters. Then reset
   `pendingLiterals.length` (step 7 registers the literals once, with their final types). A type
   parameter still unbound is an error **(differs from the prototype, which defaults literals)**:
   `cannot infer T for 'max' from untyped literals: write max(i32, ...) or give a literal its type (1:i32)`
   when a literal stood there, else `cannot infer T for 'zero': write the type argument, as in zero(u32)`.
6. **Instance**: `instantiate` (5.3); null means the nesting error was reported.
7. **Arguments.** Check every runtime argument against the **instance's** parameter type with the
   ordinary `checkExpr(arg, type, 'argument N')`. This is where `7` becomes `u32` in
   `push(v, 7)`, where coercions are validated and where a mismatch reads exactly as for a
   hand-written function.
8. **Record.** `this.calls.set(expr.span.end, lowered)` where `lowered` is
   `{ kind: 'CallExpr', callee: { kind: 'IdentExpr', name: inst.name, span: expr.callee.span }, args: <the runtime Arg nodes of the written call>, span: expr.span }`;
   the instance's `FuncRT` at the callee identifier (`typeKey(callee.span.start, 'IdentExpr')`),
   which is what the editor shows at the call; `recordReference(name, callee.span.start)`.
   Return the instance's result type as 2355-2362 does.
9. **On failure** at any step: report, infer the remaining value arguments once (so their own
   errors still appear), return `RECOVERY`, record nothing.

`matchType(pattern: AST.Type, actual: ResolvedType, bound, depth = 0)` only **binds**; step 7
decides whether the argument fits. `actual` is unwrapped at each step:

| Pattern AST | Against | Action |
|---|---|---|
| `TypeRef` naming an unbound type parameter | any concrete type | bind it; at depth 0 a primitive's range is dropped (`u32#12` binds `u32`). Already bound: nothing (a later argument never re-decides) |
| `PointerType` | pointer | recurse on the pointee; mutability and optionality are not compared |
| `IndexedType` (slice, many-pointer, array) | slice, array, or pointer to array | recurse on the element |
| `CompositeType` | tuple with the same field count | field by field |
| `FuncType` (stage 2) | function type | parameters and results |
| `TypeApply F(A...)` (stage 2) | any type | match `F`'s **body AST** against the type, with `F`'s parameters standing for the argument ASTs `A...` |
| anything else | any | nothing |

### 5.7 Comptime function parameters (stage 2)

- Argument: an `IdentExpr` naming a `func` symbol that is not generic (inside an instance, a
  comptime function parameter being passed on is such a symbol, and its `alias` is the target).
  Anything else: `argument 3 of 'sort' must be the name of a function: before is a comptime function parameter`.
  From stage 3, an overloaded name is rejected with `('hash' has several overloads)` appended.
- Its signature is matched against the parameter's declared function type (`matchType`, depth 1),
  which can bind type parameters; after instantiation the parameter's type is resolved with the
  bindings (in the **owner's** context) and compared:
  `'inc' is (u32) -> u32, but 'sort' needs before: (i32, i32) -> bool`.
- In `checkFuncBody` (1268-1297), the only addition: when `currentInstance?.decl === decl`, bind
  each alias in the function scope as `{ ...alias.sym, alias: alias.target }`. The body then needs
  no new rule (`before(a, b)` is a call of a `func` symbol), and the no-shadowing rule rejects a
  local named like the parameter.
- In the plain-call branch of `inferCall` (2332): if the callee symbol has `alias`, record the
  lowered call `{ ...expr, callee: { ...expr.callee, name: alias } }` in `calls`.

### 5.8 Other edits

| Function | Stage | Change |
|---|---|---|
| `inferIdent` (2294-2309) | 1 | `generic`: error `generic function 'max' must be called`, return `RECOVERY`. Stage 2, `typefunc`: `'Vec' is a generic type: write Vec(T)` |
| `inferExprInner` (2173) | 1 | `TypeExpr` case: error `'u32' is a type; a type can only be passed for a comptime parameter` |
| `inferCall`, type-parameter callee | 1 | A callee that is a `TypeExpr` (inside an instance, `T(a, b)` after substitution): error `T(...) on a type parameter is not supported yet`, return `RECOVERY`. Stage 2 replaces this with the constructor dispatch below |
| `checkExpr` (2103-2108) | 1 | `if (inferred !== RECOVERY && !typeAssignable(expected, inferred))`: nothing is reported about an expression whose error is already reported |
| `inferBinary` (2578) | 1 | After unwrapping, before the comparison branch: an operand of kind `tuple`, `slice`, `array`, `func` or `void` to any operator other than `&&`/`\|\|` is `operator > is not defined for Pt`; return `bool` for comparisons, `RECOVERY` otherwise. Mixed numeric operands stay as today |
| `inferSizeof` (3314) | 1 | Also `this.types.set(typeKey(expr.span.start, 'SizeofType'), resolvedType)` |
| `error`, `warn` (3450-3460) | 1 | First line: `[offset, message] = this.atSource(offset, message)`. An offset at or above the stride is reported at `offset % INSTANCE_STRIDE` with `, in <label>` appended (the instance is `this.instances[Math.floor(offset / STRIDE) - 1]`). De-duplication stays on (offset, message). Stage 2: also attach `notes: [{ offset: inst.requestedAt.offset, message: 'required from' }]`, following `requestedAt` through enclosing instances, at most four |
| `recordDefinition` (3471) | 1 | Ignore offsets at or above the stride: an instance's parameters and locals must not re-point names |
| `recordReference` (3477) | 1 | From an instance (offset at or above the stride): keep only references to module-level names, at `offset % STRIDE`, so helpers used only by generic bodies are not reported as never used |
| `findIdentOffset` (3464) | 1 | takes `offset % STRIDE` |
| `inferCall`, constructor (2368-2389) | 2 | Factor the argument loop out as `checkConstructorArgs(expr, tupleType, shown)`. New dispatch: a callee that is a `TypeExpr`, or a `CallExpr` that `typeOfArg` converts, is a constructor: resolve the type, require a tuple (`u32 is not a struct or tuple type: it has no constructor; to convert a number write x as T`), check the arguments, record the lowered `TupleExpr` with the fields in declaration order |
| `exprTypeOffset` (82-84) | 3 | `CallExpr` joins the `span.end` kinds |
| `inferBody` (3293) | 3 | Use `exprTypeOffset(last.expr)`. Today a block ending in a member, binary or index expression is typed `()` (`judge/p4.ents`: `let z = if c { p.x } else { p.y }` is `cannot assign () to f64` **[ran]**); with calls at `span.end` the same would hit every block ending in a call. This one-line fix is independent and may be merged earlier |
| `inferCall`, method calls | 3 | Callee `x.name`: infer `x` once and pin its type; if `hasField(type, name)` (a struct field through at most one pointer, or built-in `.ptr`/`.len`/`.wid`) continue as today; otherwise, if `name` is a generic, `inferGenericCall(expr, sym, name, x)`; if it is a function or overload set, build `name(x, args...)`, record it in `calls` and resolve that call; otherwise today's `no field` error extended with `, and no function 'name' accepts (X, ...)` |
| `inferCall`, overloads and builtins | 3 | A callee naming an overload set: `pickOverload(name, args)`: infer each argument once (pinned); a candidate whose parameter types equal the argument types wins; else the only candidate every argument is `typeAssignable` to; else `no function 'hash' accepts (f64)` or `'hash' is ambiguous for (int(5))`, returning `RECOVERY`. The call is lowered to the chosen internal name. The builtin test (2314) runs only when the program declares no function of that name |

Not changed in any stage: scopes, `bindFields`, `bindPattern`, `resolveSignature`, literal
registration (`addLiteral`, `dataId`, `mut` land on the copy), narrowing, `defer`, bounds proofs,
`concretizeType`.

### 5.9 Stage 5: modules

- `getExportedSymbols` (216-230) exports the `generic` and `typefunc` symbols of exported
  declarations by reference (they carry their owner). `collectImport` (501-555), program mode
  (`moduleExports` present): an import item whose exported symbol is one of them registers that
  same symbol under the local name. The restated signature is not compared, as today for every
  source import (checker.ts:527).
- Every copy of a generic's AST is resolved in the **owner's** context (`sym.owner.resolveType`,
  `sym.owner.collectFunc`); only written type arguments are resolved in the caller's.
- A call from module `M` to an instance of module `O` is lowered to the callee name
  `<local name><key>`; `M` registers a `func` symbol with the instance's signature under it and
  an entry `externs.set(thatName, { module: O.path, name: inst.name })`.
- `typecheck()` is split into `checkToContext()` and `finalize(ctx)`. `typecheckProgram`
  (237-273) keeps every context alive; after each module's check it drains the queues of **all**
  contexts to a fixpoint (an importer's request lands in the exporter's queue), then re-runs
  `finalize` for every context that gained instances (a second finalize changes none of 28,135
  type entries of 78 files: the minimal design's `min2/idem.ts`). `allErrors` is computed once at
  the end from the live arrays; today it is a snapshot per module (267) and the CLI gates on its
  length. An instance body error in a module other than the requester's also adds one error at
  the requesting call: `add(K = Cell) cannot be instantiated: no function 'hash' accepts (Cell) (containers.ents:57:11)`.
- **Site.** `inst.site` is the context of the module whose ordinary code started the chain: for
  a request from ordinary code, that module; for a request from an instance body, the requesting
  instance's `site`. `pickOverload` (and the plain callee lookup) inside an instance that finds no
  function in the owner retries in `inst.site.moduleScope`; a hit sets `inst.usedSite`, and the
  call is lowered to an extern alias (`hash@<site>`) registered as above. After each drain,
  `usedSite` is propagated to every instance that requested a `usedSite` instance, to a fixpoint.
  On a memo hit where the existing instance has `usedSite` and a different `site`, a separate
  instance is made (key and name suffixed `@<site module prefix>`). Modules are checked one after
  another, dependencies first, and all chains started while a module is checked have that module
  as their site, so `usedSite` is final before another site can ask.
- Single-file mode (`typecheck` without `moduleExports`: the spec runner, the language server
  without a file reader): an imported generic function is **signature-only** (a `generic` symbol
  built from the import item with `signatureOnly`; calls are inferred and checked against the
  substituted signature, no body is queued, codegen is not reached). A file that imports a generic
  *type* cannot be checked alone: the checker reports no type errors for it and adds one warning,
  `imported generic types are resolved only when the program is checked`.

---

## 6. Codegen changes, by function (`packages/compiler/codegen.ts`)

`funcToWat`, `typeToWasm`, `flattenType`, the load/store primitives, the data section, the
wide-integer helper scan and `usesMemory` are **not** changed by generics: an instance is an
ordinary `FuncDecl` with its own offsets, a `func` symbol under its own name, and its types and
literals in the module's tables. Reference: the prototype's 63 changed lines
(`git diff 5b2ee39 17585bc -- packages/compiler/codegen.ts`), with the differences marked.

### 6.1 Calls (`callToWat`, 901-981)

- `CodegenContext` (25-51) gains `calls?: Map<number, AST.Expr>`, set from `checkResult.calls`
  in `createContext` (53-65).
- First statement of `callToWat`:

  ```ts
  const lowered = ctx.calls?.get(expr.span.end)
  if (lowered && lowered !== expr) return exprToWat(lowered, ctx)
  ```

  The lowered node has the written call's span, so when it is compiled the table returns the node
  itself and the ordinary path runs. That path finds `max<u32>` through `ctx.symbols` and
  `ctx.nameMap` like any function; comptime arguments are simply absent. Because this comes before
  `builtinToWat` (912), a generic named `max` is reachable.
- `collectLocals` (2845-2849): for a `CallExpr`, visit the lowered expression when there is one,
  else the arguments as today.
- **Argument widening** (stage 1; in none of the prototypes; 12 lines **[ran]**). In the argument
  loop (952-977), read the argument's type with `lookupExprType(argExpr, ctx)` instead of the
  `span.start` lookup at 965 (a member, binary or index argument is keyed at `span.end`, so the
  array-to-slice coercion misses it today), and after the array-to-slice case:

  ```ts
  const a = argType ? RT.unwrap(argType) : null
  const p = RT.unwrap(paramType)
  if (a && a.kind === 'primitive' && p.kind === 'primitive' && wideIntParts(a) === 0 && wideIntParts(p) === 0) {
    const aw = typeToWasm(a), pw = typeToWasm(p)
    if (aw.length === 1 && pw.length === 1 && aw[0] !== pw[0]) {
      if (aw[0] === 'f32' && pw[0] === 'f64') return `(f64.promote_f32 ${wat})`
      if (aw[0] === 'i32' && pw[0] === 'i64') return coerceWasmType(wat, 'i32', 'i64', isSigned(a))
    }
  }
  ```

  Use `coerceWasmType` (2074), not `emitConversion`: the latter masks `u8`/`u16` values even
  when the wasm type is unchanged, which would alter existing output. With this patch
  `max(a_u64, b_u32)` and the non-generic `f(a_u32)` for a `u64` parameter validate, no 0.2.1
  test fails and no corpus WAT changes **[ran]**.

### 6.2 Emitting instances once, in a fixed place, and nothing for unused generics

One helper replaces the function loops of `moduleToWat` (2935-2942) and `programToWat`
(3426-3441) **(differs from the prototype, which appends instances in request order)**:

```ts
// The functions of a module in emission order: a generic's place is taken by its instances, in name order.
function funcsInOrder(decls: AST.Declaration[], result: TypeCheckResult): AST.FuncDecl[] {
  const byGeneric = new Map<AST.FuncDecl, AST.FuncDecl[]>()
  for (const i of result.instances ?? []) byGeneric.set(i.of, [...(byGeneric.get(i.of) ?? []), i.decl])
  const out: AST.FuncDecl[] = []
  for (const decl of decls) {
    const fn = decl.kind === 'FuncDecl' ? decl : decl.kind === 'ExportDecl' && decl.item.kind === 'FuncDecl' ? decl.item : null
    if (!fn) continue
    if (!isGenericDecl(fn)) { out.push(fn); continue }
    out.push(...(byGeneric.get(fn) ?? []).sort((a, b) => ((a.ident as string) < (b.ident as string) ? -1 : 1)))
  }
  return out
}
```

- `programToWat` keeps its `decl.ident` requirement and name lookup
  (`modNameMap.get(fn.ident) ?? fn.ident`); `perModuleNameMap` (3301-3324) gets one entry per
  instance, `ident -> prefix$ident`.
- **Nothing for an unused generic** holds by construction: a generic has no `func` symbol and no
  path that could emit it; only copies are emitted, and copies exist only for calls the checker
  met. Instances requested only from `test` blocks exist only when the checker ran with
  `includeTests` (the CLI uses the same flag for check and codegen).
- **Once**: one copy per key in the owner's list.
- Instances are in the output before the wide-integer helper scan (2970-2973, 3495-3498), which
  works on the module text, so an instance that adds two `u128`s gets `$__w2_add` like any
  function (`judge/s1/zc_generic.ents` **[ran]**).
- `emitTestDecl` (3033-3039) is not changed in stage 1: generics inside tests are rejected.
- Stage 3: an overload is emitted at its own declaration under its internal name
  (`funcToWat({ ...decl, ident: decl.overload }, ...)`, name map entry `hash:''u8 -> prefix$hash:''u8`).

### 6.3 Exports

`exportToWat` (3177-3198) returns nothing for an `ExportDecl` whose item is a generic `FuncDecl`
or (stage 2) a `TypeFuncDecl`, and its two callers (`moduleToWat`'s export loop; `programToWat`
3459-3470) push nothing for it. Without this, `export func max(comptime ...)` in an entry module
emits `(export "max" (func $max))` for a function that does not exist and wabt rejects the module
(`judge/e3.ents` **[ran]**).

### 6.4 `sizeof`

`sizeofToWat` (1838-1848) reads `ctx.types.get(typeKey(expr.span.start, 'SizeofType'))`, the
operand as the checker resolved it, and calls `byteSize` on it; it falls back to
`resolveTypeFromAST` only when the entry is missing.

### 6.5 Stage 3: lookups that move with `CallExpr`

The direct `span.start` lookups of a value that may be a call switch to `lookupExprType`
(498-502): codegen.ts 842 and 862 (operand type of builtin `min`/`max`/`abs`), 2063
(`set (a, b) = f()`), 2093 (compound-assignment value), 2555 (arrow-body result coercion);
`resolveExprType` (504-531) adds `CallExpr` to its `span.end` kinds. The `call_indirect` stub at
904-909 and the unknown-identifier fallback at 369-370 (`(i32.const 0)`) become
`throw new Error(...)`: a checked program cannot reach them, and new plumbing must not hide there.

This changes the output of exactly three existing files, all fixes, to be named in the pull
request and the release notes **[ran: `judge/samewat.sh`]**:

- `examples/math/trig/strcmp.ents`: builtin `min(a.len, b.len)` compared `u32` lengths with
  `i32.lt_s`; now `i32.lt_u` (`judge/p5.ents` shows the bug on 0.2.1);
- `/home/user/monkey-fist/moonbit/encantis/builder/bugs/01-abs-of-difference.ents`: `abs(a - b)`
  on `f64` lost its `f64.abs`;
- `.../builder/bugs/19-if-expression-first-branch.ents`: compiles (the `inferBody` fix).

### 6.6 Stage 5

`buildFullNameMap(path)` (3336-3361) adds, for each entry of the module's `externs`,
`alias -> perModuleNameMap.get(module).get(name)`. While there: give each module its own
literal-ref map (literal ids are bare offsets in one program-wide map, 3285-3293; two modules
with a literal at one offset already share an address today, `map-codegen.md` 7.3 probe mm2, and
a library of generics makes multi-module programs the normal case), and fix the lookup of an
import by export name in a map keyed by identifier (3351, probe mm3).

---

## 7. Tooling changes

| Tool | Stage | Change | Why it is enough |
|---|---|---|---|
| Formatter (`formatter.ts:161-167`) | 1 | `'comptime'` in `KEYWORDS` | Token based; it already prints every new form stably and never puts a space between a name and `(` (`map-syntax.md` 8). A first `formatter.test.ts` pins idempotence on a file with every new form |
| TextMate grammar (`packages/extension/encantis.tmlanguage.json:132`) | 1 | `comptime` in the `storage.type` pattern | Upper-case names already colour as types |
| `queries.ts` | 1 | `symbolTypeString`: `generic func` for a `generic` symbol (stage 2: `generic type`); `typeCostAnnotation` and `signatureHelp` skip both kinds; hover on an identifier whose symbol is `generic` prefers the `IdentExpr` types-map entry at that offset, which at a call holds the instance's signature | Otherwise hover calls `typeToString(undefined)`. On the judge copy `encantis hover` at a call prints `generic find: generic func` because the by-name lookup wins **[ran]**; the preference is **[design]** |
| `queries.ts` `documentSymbols` (201-288), `meta.ts` `collectDeclaration` (210-240) | 2 | a `TypeFuncDecl` case (outline entry, type symbol) | Switches without default skip it silently otherwise |
| `meta.ts` | 1 | None. `collectFunc` there returns early for a non-`func` symbol and every lookup is guarded | On the judge copy `encantis meta` on a generics file exits 0, lists no symbol with `<` in its name and no hint outside the file, and its type table holds the **instance's** signature for each call of a generic (`(xs:[]u8,x:u8)->u32`), because the checker records it at the callee identifier **[ran]**. A test pins all three |
| `meta.ts` hints | 2 | `generateHintsForTypeExpr` (1164-1188): a `TypeApply` case (hint on the head, recurse into arguments); `generateHintsForExpr`: skip `TypeExpr` | |
| Hover inside a generic body | 3 | In the one lookup helper of meta: `types.get(key(offset)) ?? types.get(key(firstInstanceBase(decl) + offset))`, so hover inside a generic shows the types of its first instance | Cheap because instances are in the same map at shifted offsets. Until then: no hints there, never wrong ones |
| Definition, references, rename | 1 | Nothing beyond 5.8. Type parameters are not recorded as definitions | The tables are name-keyed and already wrong for same-named parameters of different functions (`map-types-tooling.md` 5.5) |
| CLI (`packages/cli/src/cli.ts`) | 2 | The four copies of the error printer (193-199, 262-267, 460-465, 545-550) become one function that also prints `notes` as `  required from <file>:<line>:<col>` | `check`, `compile`, `wasm`, `run`, `test` already go through `typecheckProgram`; instance errors are in the declaring module's `errors` at offsets inside its source. `compile` checks without tests and `test` with them, which is what keeps test-only instances out of release output. An `assert` inside any function is a bare `unreachable` (only asserts written directly in a test body carry an offset, codegen.ts:1919-1922), so private offsets never reach the test runner |
| Language server (`packages/extension/src/server/serve.ts`) | 2 | Diagnostics (274-305) map `notes` to related information | |
| Language server, CLI query commands | 5 | When the file has source imports and files can be read, check the program (`loadModule` + `typecheckProgram`) and build meta from the entry's result; otherwise 5.9's single-file rules | |
| Grammar bundle | 1 | `packages/compiler/grammar-bundle.test.ts`: the committed bundle equals a fresh `ohm.grammar(src).toRecipe()` | Nothing checks this today; a forgotten `bun run bundle:grammar` silently tests the old grammar |
| Spec runner (`spec/spec.test.ts`) | 1 | `ents same-wasm` expectation; spec regions of `docs/encantis.md` (section 8, stage 1) | |
| `scripts/watdiff.ts` (new) | 1 | Compiles every `.ents` file under `examples/`, `lib/`, `packages/compiler/tests/` with two compiler checkouts and reports differing WAT (port of `judge/samewat.sh`) | Each stage states the differences it is allowed |

---

## 8. The staged pull requests

Five pull requests. Each leaves `bun test`, `bun run lint`, `bun run typecheck` and
`bun run examples:all` green, documents what it adds in `docs/encantis.md` and `docs/grammar.md`
in the same pull request, and is useful on its own. Stage 4 does not depend on stages 1-3 and can
be built in parallel or merged first.

| Stage | Title | Makes work | Size (prototype evidence) |
|---|---|---|---|
| 1 | Generic functions: comptime type parameters | `max`, `swap`, generics over slices and pointers, explicit and inferred calls, one function per argument set, zero-cost tests | about 600 lines of compiler change plus tests and docs |
| 2 | Generic types and comptime function parameters | `Vec(T)`, `Vec(T)(...)`, `sizeof(Vec(T))`, inference through `*Vec(T)`, a sort with a comparator, `required from` notes | about 250 lines |
| 3 | Method-call syntax and overloads | `v.push(7)`, chains, duck-typed `hash`/`eq` for several key types in one module | about 200 lines |
| 4 | Values in memory (no generics code) | structs, tuples and `bool` behind pointers, `v.len` through a pointer: the container programs exactly as the owner wrote them | the largest stage; codegen only |
| 5 | Generics across modules, and the container library | importing generics, one instance per program, the site rule, `lib/vec.ents`, `lib/set.ents`, `lib/map.ents`, `lib/sort.ents` | no prototype |

The acceptance programs of stages 1-3 below are complete files. Every one was run for this plan:
`pick`, `minmax`, `slices`, `vec`, `sort` and `methods` on the judge copy, `set` on the minimal
prototype with its overload probe (commit `750fee5`) **[ran: `judge/final/`]**. They use only
forms that 0.2.1's code generator compiles correctly (explicit `.*`, scalar and slice elements);
stage 4 rewrites them to the natural spelling. Sizes are kept small because a bun test has 5 s.

### Stage 1: generic functions

**Scope.** Sections 3.1-3.4 and 3.10 of the specification; grammar and actions marked stage 1
(4.1, 4.2); AST marked stage 1 (4.3); checker 5.1 (without `func` values, `typefunc`, `notes`,
`pinned`, `overloads`), 5.2 rows marked 1, 5.3, 5.4 rows marked 1, 5.5 (type parameters), 5.6
(without receiver, `FuncType` and `TypeApply` patterns), 5.8 rows marked 1; codegen 6.1-6.4;
tooling rows marked 1.

Not in this stage, each with its error: comptime function parameters
(`comptime parameter 'before' must be a type parameter: comptime function parameters are not supported yet`);
generic types (parse error); method calls; `T(...)` constructors
(`T(...) on a type parameter is not supported yet`); importing a generic.

**Files.**

| File | Change |
|---|---|
| `packages/compiler/encantis-grammar.ohm` | the stage 1 rules of 4.1 |
| `packages/compiler/encantis-grammar.bundle.ts` | regenerated (`bun run bundle:grammar`) |
| `packages/compiler/encantis-actions.ts` | the stage 1 actions of 4.2 |
| `packages/compiler/ast.ts` | `Field.comptime`, `TypeType`, `BoundType`, `TypeExpr`; `walkExpr` case |
| `packages/compiler/types.ts` | `canonicalKey`, `watSafe` |
| `packages/compiler/type-lib.ts` | `astToResolved`: two throwing cases |
| `packages/compiler/checker.ts` | `ComptimeValue` kind `type`; `generic` symbol; `Instance`; `INSTANCE_STRIDE`; `RECOVERY`; context fields; `isGenericDecl`, `checkGenericDecl`, `typeOfSymbol`; `collectFunc`, `checkDeclaration`, `checkTestDecl`, `collectImport` edits; `evalComptimeArg`, `typeOfArg`, `matchType`, `inferGenericCall`, `instantiate`, `cloneAst`, `drainInstances`, `atSource`; `resolveType`, `inferIdent`, `inferExprInner`, `inferCall` dispatch, `checkExpr`, `inferBinary`, `inferSizeof`, `error`/`warn`, `recordDefinition`, `recordReference`, `findIdentOffset`, `typecheck()` edits |
| `packages/compiler/codegen.ts` | `ctx.calls`; `callToWat` (lowered call first; `lookupExprType` for the argument; widening); `collectLocals`; `funcsInOrder` in `moduleToWat` and `programToWat`; `perModuleNameMap` entries; `exportToWat` and its callers; `sizeofToWat`; `resolveExprType` and `labelDataEntries` guards for the new symbol kind |
| `packages/compiler/queries.ts`, `formatter.ts` | section 7 rows marked 1 |
| `packages/extension/encantis.tmlanguage.json` | `comptime` |
| `packages/compiler/test-utils.ts` | `wasmOfSource(source, opts?)`: parse, `typecheck`, `moduleToWat`, wabt with the CLI's flags (`simd`, `multi_value`, `bulk_memory`), validate, `toBinary({})` |
| `packages/compiler/generics.test.ts` (new) | tests below |
| `packages/compiler/grammar-bundle.test.ts`, `formatter.test.ts`, `golden.test.ts` (new) | tests below |
| `packages/compiler/checker.test.ts`, `codegen.test.ts`, `types.test.ts`, `meta.test.ts`, `parser.test.ts` | additions below |
| `packages/compiler/tests/golden/wasm-sha256.json` (new) | generated at v0.2.1, **before the first change** |
| `spec/spec.test.ts` | `ents same-wasm`; spec regions of `docs/encantis.md` (below) |
| `spec/generics.md` (new), `spec/README.md` | cases below; the new file and the two runner features |
| `examples/generics/pick.ents`, `minmax.ents`, `slices.ents` (new) | the acceptance programs; picked up by `examples/examples.test.ts` and `examples:all` unchanged |
| `scripts/watdiff.ts` (new) | section 7 |
| `docs/encantis.md` | 1.3 Type Identifiers (type parameters are type identifiers); 1.4 Reserved Keywords (`comptime`); new chapter 8 with 3.1-3.4, 3.9, 3.10 inside a spec region; 9 Builtins (a generic named like a builtin replaces it); Future Additions edited as in 3.10 |
| `docs/grammar.md` | Identifiers (11-34: `comptime`); Functions (155-199: `ParamList`, `Param`); Function Call (661-669: type arguments; which forms are parsed as types and which are read as types by position); close the unclosed fence at 271 |
| `CLAUDE.md` | Key Design Decisions, one paragraph: "Generics are substitution: an instance is a copy of the declaration with its comptime parameters replaced, compiled like any function" |

**The spec runner (`spec/spec.test.ts`), about 50 lines.**

1. *Expectation `ents same-wasm`.* A block whose language is `ents` and whose meta is `same-wasm`
   is an expectation of the `ents` block before it, not a source: the two places that test
   `block.lang === 'ents'` (the source filter at line 78 and the loop that collects expectations)
   exclude that meta. The runner compiles both with `wasmOfSource` and requires equal bytes; on
   failure it prints both WATs.
2. *Spec regions of the reference.* The runner also reads `docs/encantis.md` and runs only the
   blocks between `<!-- spec:begin -->` and `<!-- spec:end -->` lines, with the rules of
   `spec/*.md`. With `<!-- spec:begin compile -->`, every module block that has no `errors` block
   and contains no source import is also compiled and validated with wabt, which catches
   "checks, then fails in wabt". The existing 120 `ents` blocks of the reference stay outside
   regions (23 would pass as modules today).

**Acceptance programs.**

`examples/generics/pick.ents`. Expected: `encantis test`: 3 passed. `encantis compile` emits, in
this order, `$pick<<q:i32|r:i32>>`, `$pick<f64>`, `$pick<u32>`, then the three wrappers; no
`$pick`; `$pick<<q:i32|r:i32>>` has five `i32` parameters (the `bool` and two flattened `Pt`s)
and `(result i32 i32)`; `$pick<i64>` is absent (only a test asks for it).

```ents
// The smallest generic: one comptime type parameter, used in parameter and
// result types, called with the type named and with it inferred. One wasm
// function per distinct T; nothing is emitted for `pick` itself.

type Pt = (q: i32, r: i32)

func pick(comptime T: type, first: bool, a: T, b: T) -> T => if first { a } else { b }

// Exported wrappers, so `encantis compile` shows the instances.
export func pick_u32(c: bool, a: u32, b: u32) -> u32 => pick(u32, c, a, b)   // T named
export func pick_f64(c: bool, a: f64, b: f64) -> f64 => pick(c, a, b)        // T inferred from a
export func pick_pt(c: bool, a: Pt, b: Pt) -> Pt => pick(c, a, b)            // a struct T: register-flattened

test "the type argument can be named" {
  assert pick(u32, true, 1, 2) == 1
  assert pick(u32, false, 1, 2) == 2
  assert pick(i64, true, -1, 5) == -1
}

test "the type argument can be inferred from the other arguments" {
  let x: f64 = 1.5
  let y: f64 = 2.5
  assert pick(false, x, y) == 2.5
  let n: u32 = 7
  assert pick(true, n, 9) == 7       // 9 takes T = u32 from n
}

test "a struct type argument is passed in registers" {
  let p = pick(Pt, false, Pt(1, 2), Pt(3, 4))
  assert p.q == 3
  assert p.r == 4
  let s = pick(true, p, Pt(0, 0))
  assert s.r == 4
}
```

`examples/generics/minmax.ents`. Expected: 4 passed. `compile` emits `$max<f64>`, `$max<i32>`,
`$max<u32>`, `$max<u64>`, `$min<i32>`, `$clamp<i32>`, `$swap<u32>`, then the wrappers;
`$max<u32>` contains `i32.gt_u`, `$max<i32>` `i32.gt_s`, `$max<f64>` `f64.gt`; `$clamp<i32>` is
`(call $min<i32> (call $max<i32> ...) ...)`; `$widen` contains
`(call $max<u64> (local.get $a) (i64.extend_i32_u (local.get $b)))`. A user generic named `max`
or `min` replaces the builtin.

```ents
// Generic functions: max, min, clamp, swap. Operators on T are checked for each
// instance: `a > b` is i32.gt_u for u32, i32.gt_s for i32, f64.gt for f64.
// clamp is a generic calling generics; swap infers T through `*mut T`.

func max(comptime T: type, a: T, b: T) -> T => if a > b { a } else { b }
func min(comptime T: type, a: T, b: T) -> T => if a < b { a } else { b }
func clamp(comptime T: type, x: T, lo: T, hi: T) -> T => min(max(x, lo), hi)

func swap(comptime T: type, a: *mut T, b: *mut T) {
  let tmp = a.*
  a.* = b.*
  b.* = tmp
}

export func max_u32(a: u32, b: u32) -> u32 => max(a, b)
export func max_i32(a: i32, b: i32) -> i32 => max(a, b)
export func max_f64(a: f64, b: f64) -> f64 => max(f64, a, b)
export func clamp_i32(x: i32, lo: i32, hi: i32) -> i32 => clamp(x, lo, hi)
export func swap_u32(a: *mut u32, b: *mut u32) { swap(a, b) }
export func widen(a: u64, b: u32) -> u64 => max(a, b)

test "max and min compare as their type does" {
  let big: u32 = 0xFFFFFFFF
  let one: u32 = 1
  assert max(big, one) == big
  let neg: i32 = -1
  assert max(neg, 1) == 1
  assert min(neg, 1) == -1
  assert max(f64, 1.5, -2.0) == 1.5
  assert min(u8, 200, 100) == 100
}

test "clamp calls max and min for its own T" {
  assert clamp(i32, 15, 0, 10) == 10
  assert clamp(i32, -5, 0, 10) == 0
  let x: f64 = 0.25
  assert clamp(x, 0.0, 1.0) == 0.25
}

test "swap exchanges two cells" {
  let a = &1:u32
  let b = &2:u32
  swap(a, b)
  assert a.* == 2
  assert b.* == 1
  let x = &1.5:f64
  let y = &2.5:f64
  swap(f64, x, y)
  assert x.* == 2.5
}

test "a later argument is widened to T" {
  let a: u64 = 0x100000000
  let b: u32 = 7
  assert max(a, b) == a
  assert widen(1, b) == 7
}
```

`examples/generics/slices.ents`. Expected: 4 passed. `compile` emits `$find<u32>`, `$find<u8>`,
`$contains<u8>`, `$sum<u64>`, then the wrappers; `$find<u8>` exists once although `has_byte`
reaches it through `contains`.

```ents
// Generic functions over slices and pointers. T is found inside a type: []T,
// [*]T, *mut T, and through the usual coercion of a `data` array to a slice.

data nums = [3:u32, 5, 8, 13]
data text = "hello"
data room = mut [0:u8; 64]

// The index of the first x in xs, or xs.len when there is none.
func find(comptime T: type, xs: []T, x: T) -> u32 {
  for i, v in xs {
    return i when v == x
  }
  return xs.len
}

func contains(comptime T: type, xs: []T, x: T) -> bool => find(xs, x) < xs.len

func sum(comptime T: type, xs: []T) -> (total: T) {
  total = 0
  for v in xs {
    total += v
  }
}

func fill(comptime T: type, xs: []mut T, x: T) {
  let p = xs.ptr
  for i in xs.len {
    p[i] = x
  }
}

// Bytes taken by n values of T.
func bytes(comptime T: type, n: u32) -> u32 => n * sizeof(T)

func fact(comptime T: type, n: T) -> T => if n <= 1 { 1 } else { n * fact(T, n - 1) }

export func find_u32(xs: []u32, x: u32) -> u32 => find(xs, x)
export func has_byte(xs: []u8, x: u8) -> bool => contains(xs, x)
export func sum_u64(xs: []u64) -> u64 => sum(xs)

test "find gives the first index, or len" {
  assert find(nums, 8) == 2
  assert find(u32, nums, 4) == 4
  assert contains(nums, 13)
  assert !contains(nums, 0)
}

test "the same functions on bytes" {
  assert find(text, 108) == 2
  assert !contains(text[0..2], 108)
  assert sum(nums) == 29
}

test "sum and fill for two element types" {
  let a = (room as [*]mut u64)[0..4]
  fill(a, 5)
  assert sum(a) == 20
  let b = (room as [*]mut u16)[0..3]
  fill(u16, b, 7)
  assert sum(b) == 21
}

test "sizeof and recursion follow the type argument" {
  assert bytes(u8, 3) == 3
  assert bytes(u64, 3) == 24
  assert bytes((u32, u16), 2) == 12
  assert fact(u64, 20) == 2432902008176640000
  assert fact(u32, 5) == 120
}
```

**`spec/generics.md`.** Cases, each an `ents` block with its expectation:

- Parse, with `json ast` (generate with `UPDATE_SPEC=1 bun test spec`, then review):
  `ents FuncDecl` for `func max(comptime T: type, a: T, b: T) -> T => a` (the first field is
  `{ "kind": "Field", "comptime": true, "ident": "T", "type": { "kind": "TypeType" } }`);
  `ents Expr` for `first(Pt, ps)`, `first([]u8, ps)`, `first(*mut Pt, ps)`, `first(u8#16, ps)`,
  `apply((u32) -> u32, f)` (first argument `TypeExpr`); and for the forms that must stay
  expressions: `max(u32, a, b)` (`IdentExpr`), `first((i32, i32), ps)` (`TupleExpr`),
  `f([], x)`, `f([4], x)` (`ArrayExpr`).
- Parse errors (`errors` block with `Expected`): `type P = (comptime T: type, x: T)`;
  `func f(a: u32) -> (comptime T: type) => a`; `func f(t: type) -> u32 => 0`;
  `func comptime(a: i32) -> i32 => a`.
- Accepted modules: the blocks of 3.1-3.4 that are too detailed for the reference (a type
  parameter in the middle of the list; a struct literal argument; a generic called from a global
  initializer; a generic used only by a test).
- Rejected modules: one block per stage 1 row of section 9, with a one-line `errors` block each
  (the count is exact, so each block also proves "one mistake, one error").

**Unit tests.**

| File | Tests |
|---|---|
| `generics.test.ts`, zero cost | see "Zero-cost checks" below |
| `generics.test.ts`, inference | one test per row of the table in 3.2 and per rule 1-5: `u32#12` gives `max<u32>` (loop variable); `*[4]u32` for `[]T`; `*mut u64` for `*T`; `max(1, x)` with `x: u64` is `max<u64>`; `max(a_u8, b_u32)` is `argument 2: cannot assign u32 to u8`; `max(1, 2)` and `count([3:u32, 5, 5], 5)` are the literal error; `zero()` is the plain cannot-infer error; a local named `u8` does not change `count(u8, xs)` |
| `generics.test.ts`, checker | error position is inside the generic's source and the message ends `, in max(T = Pt)`; an unused generic with a broken body is not an error; recursion (`fact`) and mutual recursion terminate; the nesting limit is one error; a test-only instance is absent with `includeTests: false`; every offset in `errors`, `warnings`, `references` and `symbolRefs` of every example file is below the source length; a helper called only from a generic body is not `never used`; an unused generic is |
| `checker.test.ts` | operand validation (`Pt > Pt`, `[]u8 == []u8`, struct `+`); the recovery type (each failed generic call is one error; `judge/e4.ents`) |
| `codegen.test.ts` | argument widening for a non-generic call: `u32` to `u64` (`i64.extend_i32_u`), `i32` to `i64` (`_s`), `f32` to `f64`; `u8` to `u32` unchanged; a member-expression array argument gets its slice length |
| `types.test.ts` | `canonicalKey`: alias-free, `void` is `()`, distinct for the 37 types of `probes-tooling/typekey.ts`, throws on comptime types; `watSafe` output accepted by wabt as `$f<...>` |
| `parser.test.ts` | the corpus-stability claims as tests: `func Point -> Point => p`; a type at the end of a match arm followed by `(` on the next line; `f([4], x)`; a function named `comptime` is a parse error |
| `meta.test.ts`, `queries.test.ts` | `buildMeta` on `examples/generics/slices.ents` does not throw, has no symbol with `<` in its name and no hint beyond the source; hover on a generic's name is `generic func`; hover on a call shows the instance signature |
| `grammar-bundle.test.ts` | committed bundle equals a fresh recipe |
| `formatter.test.ts` | formatting a file with every new form is idempotent |
| `golden.test.ts` | recomputes the sha256 of the `.wasm` of every file under `examples/`, `lib/` and `packages/compiler/tests/fixtures/` and compares with `tests/golden/wasm-sha256.json`. Stage 1 changes no entry and adds the three new examples |

**Zero-cost checks** (`generics.test.ts`; helpers `expectSameWasm(generic, byHand)`,
`funcs(wat)`, `expectPlainWasm(wat)`). `expectSameWasm` compares whole `.wasm` files and runs both
sources through **both** assemblers: `moduleToWat` in memory, and `programToWat` by writing the two
sources to a temporary directory and calling `compileToWasm`. On failure it prints a
function-by-function diff of the two WATs.

| Id | Check |
|---|---|
| Z1 | `expectSameWasm` for the pair of 3.1 (105 bytes) and for the pair below (535 bytes): explicit and inferred calls, a generic calling generics, `*mut T`, `[]T` with a named result, a `u128` instance (wide-integer helper), an unused generic whose body could never check |
| Z2 | *(from stage 3)* the same call written three ways gives three identical files |
| Z3 | a program, and the same program with unused generic functions added: identical `.wasm` |
| Z4 | `funcs(wat)` has exactly one instance when the same argument arrives as `Pt`, as `(q: i32, r: i32)`, explicitly and inferred, from three functions |
| Z5 | `expectPlainWasm`: none of `call_indirect`, `(table`, `(elem`, `ref.func`, `funcref` in any WAT these tests produce, and (in `examples.test.ts`) in the output of every file under `examples/generics/` |
| Z6 | the `(param ...)` list of each instance equals the flattened non-comptime parameters; a call site pushes exactly that many values |
| Z7 | `wasmOfSource(src)` has no instance that only a `test` block requests; with tests it has |
| Z8 | `golden.test.ts`: programs without generics compile to the same bytes as on v0.2.1 |
| Z10 | the `ents same-wasm` block of chapter 8 in `docs/encantis.md` |

The Z1 pair. Generic side (compiled by the judge copy):

```ents
func max(comptime T: type, a: T, b: T) -> T => if a > b { a } else { b }
func min(comptime T: type, a: T, b: T) -> T => if a < b { a } else { b }
func clamp(comptime T: type, x: T, lo: T, hi: T) -> T => min(max(x, lo), hi)

func swap(comptime T: type, a: *mut T, b: *mut T) {
  let tmp = a.*
  a.* = b.*
  b.* = tmp
}

func sum(comptime T: type, xs: []T) -> (total: T) {
  total = 0
  for v in xs {
    total += v
  }
}

func unused(comptime T: type, x: T) -> T => nothing(x)

export func max_u32(a: u32, b: u32) -> u32 => max(a, b)
export func max_f64(a: f64, b: f64) -> f64 => max(f64, a, b)
export func clamp_i32(x: i32, lo: i32, hi: i32) -> i32 => clamp(x, lo, hi)
export func swap_u64(a: *mut u64, b: *mut u64) { swap(a, b) }
export func sum_u8(xs: []u8) -> u8 => sum(xs)
export func sum_u128(xs: []u128) -> u128 => sum(u128, xs)
```

Hand-written side (compiled by unmodified 0.2.1 from source, and by the released 0.2.1 binary;
all three files are the same 535 bytes, sha256 `44eae0b6...8206c` **[ran]**). Note the order:
each generic's place is taken by its instances in name order (`max<f64>`, `max<i32>`, `max<u32>`;
`sum<u128>`, `sum<u8>`).

```ents
func max_f64_(a: f64, b: f64) -> f64 => if a > b { a } else { b }
func max_i32_(a: i32, b: i32) -> i32 => if a > b { a } else { b }
func max_u32_(a: u32, b: u32) -> u32 => if a > b { a } else { b }
func min_i32_(a: i32, b: i32) -> i32 => if a < b { a } else { b }
func clamp_i32_(x: i32, lo: i32, hi: i32) -> i32 => min_i32_(max_i32_(x, lo), hi)

func swap_u64_(a: *mut u64, b: *mut u64) {
  let tmp = a.*
  a.* = b.*
  b.* = tmp
}

func sum_u128_(xs: []u128) -> (total: u128) {
  total = 0
  for v in xs {
    total += v
  }
}

func sum_u8_(xs: []u8) -> (total: u8) {
  total = 0
  for v in xs {
    total += v
  }
}

export func max_u32(a: u32, b: u32) -> u32 => max_u32_(a, b)
export func max_f64(a: f64, b: f64) -> f64 => max_f64_(a, b)
export func clamp_i32(x: i32, lo: i32, hi: i32) -> i32 => clamp_i32_(x, lo, hi)
export func swap_u64(a: *mut u64, b: *mut u64) { swap_u64_(a, b) }
export func sum_u8(xs: []u8) -> u8 => sum_u8_(xs)
export func sum_u128(xs: []u128) -> u128 => sum_u128_(xs)
```

**Corpus check.** `bun scripts/watdiff.ts <v0.2.1 checkout> .`: 0 differing files (two files that
crash the compiler today print different stack-trace line numbers:
`packages/compiler/tests/fixtures/modular/mem-conflict.ents`,
monkey-fist `builder/bugs/09-store-returned-slice.ents`).

### Stage 2: generic types and comptime function parameters

**Scope.** 3.5, 3.6 and the stage 2 note of 3.3; grammar, actions and AST marked stage 2;
checker: `typefunc` symbol, `collectTypeFunc`, `applyTypeFunc`, `resolveType` `TypeApply`,
`typeOfArg` `CallExpr` case, `matchType` `TypeApply` and `FuncType` cases, the constructor
dispatch and `checkConstructorArgs`, 5.7, `ComptimeValue` kind `func`, `notes`; codegen: the
export skip for `TypeFuncDecl` (the lowered `TupleExpr` and aliased calls need no codegen
change); tooling rows marked 2.

**Files.** `encantis-grammar.ohm` (+ bundle), `encantis-actions.ts`, `ast.ts`
(`TypeApply`, `TypeFuncDecl`, visitor cases), `type-lib.ts`, `checker.ts`, `codegen.ts`
(`exportToWat`), `queries.ts`, `meta.ts`, `packages/cli/src/cli.ts` (one error printer, notes),
`packages/extension/src/server/serve.ts` (related information), `generics.test.ts`,
`spec/generics.md`, `examples/generics/vec.ents`, `examples/generics/sort.ents`,
`docs/encantis.md` (3.5, 3.6; "2. Type System": structs and constructors gain `Vec(T)(...)`;
"8. Memory Model", Data Layout: `sizeof` and the packed layout, undocumented today),
`docs/grammar.md` (Functions: generic types; Types 267-398: `Name(args)`; Literals and
Constructors 671-683).

**Acceptance programs.**

`examples/generics/vec.ents`. Expected: 4 passed. `compile` emits `$alloc`, `$vec<u32>`,
`$push<u32>`, `$items<u32>`, `$sum_to`; nothing for `Vec`, `Pair`, `get` or `swapped`.

```ents
// A growable vector as a generic type, written with plain calls and explicit
// `.*` (method-call syntax arrives in stage 3, `v.len` through a pointer in
// stage 4). The header lives in memory; `vec` returns a pointer to it.

data space = mut [0:u8; 4096]
global top: u32 = 0

// A bump allocator: n bytes, 8-byte aligned.
func alloc(n: u32) -> (p: u32) {
  top = (top + 7) & 0xFFFFFFF8
  p = (space as u32) + top
  top += n
  assert top <= 4096
}

func Vec(comptime T: type) -> type => (ptr: [*]mut T, len: u32, cap: u32)
func Pair(comptime A: type, comptime B: type) -> type => (first: A, second: B)

func vec(comptime T: type, cap: u32) -> *mut Vec(T) {
  let v = alloc(sizeof(Vec(T))) as *mut Vec(T)
  let made = Vec(T)(alloc(cap * sizeof(T)) as [*]mut T, 0, cap)
  v.*.ptr = made.ptr
  v.*.len = made.len
  v.*.cap = made.cap
  return v
}

func push(comptime T: type, v: *mut Vec(T), x: T) {
  if v.*.len == v.*.cap {
    let moved = alloc(v.*.cap * 2 * sizeof(T)) as [*]mut T
    for i in v.*.len {
      moved[i] = v.*.ptr[i]
    }
    v.*.ptr = moved
    v.*.cap *= 2
  }
  v.*.ptr[v.*.len] = x
  v.*.len += 1
}

func get(comptime T: type, v: *Vec(T), i: u32) -> T => v.*.ptr[i]
func items(comptime T: type, v: *Vec(T)) -> []T => v.*.ptr[0..v.*.len]

func swapped(comptime A: type, comptime B: type, p: Pair(A, B)) -> Pair(B, A) => Pair(B, A)(p.second, p.first)

export func sum_to(n: u32) -> (s: u32) {
  let v = vec(u32, 2)
  for i in n {
    push(v, i)
  }
  s = 0
  for x in items(v) {
    s += x
  }
}

test "a vec grows and keeps its elements" {
  let v = vec(u64, 2)
  for i in 10 {
    push(v, (i as u64) * 3)
  }
  assert v.*.len == 10
  assert v.*.cap == 16
  assert get(v, 0) == 0
  assert get(v, 9) == 27
  assert items(v).len == 10
  assert sum_to(5) == 10
}

test "T is inferred through *mut Vec(T), or written" {
  let b = vec(u8, 4)
  push(b, 200)
  push(u8, b, 55)
  assert get(u8, b, 0) == 200
  assert get(b, 1) == 55
}

test "a struct with the same fields is a Vec" {
  let raw: *mut (ptr: [*]mut u16, len: u32, cap: u32) = vec(u16, 1)
  push(raw, 7)
  push(raw, 8)
  assert get(raw, 1) == 8
}

test "sizes and constructors follow the type arguments" {
  assert sizeof(Vec(u8)) == 12
  assert sizeof(Pair(u8, u64)) == 9
  let p = swapped(Pair(u8, u64)(1, 2))
  assert p.first == 2
  assert p.second == 1
}
```

`examples/generics/sort.ents`. Expected: 3 passed. `compile` emits `$sort<i32|ascending>` and
`$sort<i32|by_cost_desc>` (two copies for one `T`), one containing `call $ascending`, the other
`call $by_cost_desc`; no `call_indirect`, table or `ref.func`.

```ents
// A stable sort with a comparator. The comparator is a comptime function
// parameter: each (T, comparator) pair is its own copy of sort, and the copy
// calls the comparator directly. No function table, no call_indirect.

data space = mut [0:u8; 256]
data costs = [5:i32, 1, 5, 3, 1, 9]

// Sorts xs in place. `before(a, b)` says a must come before b; elements neither
// of which must come before the other keep their order (insertion sort).
func sort(comptime T: type, xs: []mut T, comptime before: (T, T) -> bool) {
  let p = xs.ptr
  for i in xs.len {
    let x = p[i]
    let j = i
    while j > 0 && before(x, p[j - 1]) {
      p[j] = p[j - 1]
      j -= 1
    }
    p[j] = x
  }
}

func twice(comptime T: type, comptime f: (T) -> T, x: T) -> T => f(f(x))

func ascending(a: i32, b: i32) -> bool => a < b
func by_cost_desc(a: i32, b: i32) -> bool => costs.i32[a] > costs.i32[b]
func longer(a: f64, b: f64) -> bool => a > b
func inc(x: u32) -> u32 => x + 1

export func sort_ids(ids: []mut i32) { sort(ids, by_cost_desc) }
export func sort_up(xs: []mut i32) { sort(i32, xs, ascending) }

test "ints sort ascending" {
  let a = space as [*]mut i32
  a[0] = 3
  a[1] = -1
  a[2] = 2
  a[3] = -1
  sort(a[0..4], ascending)
  assert a[0] == -1
  assert a[1] == -1
  assert a[2] == 2
  assert a[3] == 3
}

test "ids sort by cost, highest first, equal costs keeping their order" {
  let ids = space as [*]mut i32
  for i in 6 {
    ids[i] = i as i32
  }
  sort_ids(ids[0..6])
  assert ids[0] == 5
  assert ids[1] == 0
  assert ids[2] == 2
  assert ids[3] == 3
  assert ids[4] == 1
  assert ids[5] == 4
}

test "another element type, and a comptime function that decides T" {
  let f = space as [*]mut f64
  f[0] = 1.5
  f[1] = 4.0
  f[2] = 2.5
  sort(f[0..3], longer)
  assert f[0] == 4.0
  assert f[2] == 1.5
  assert twice(inc, 5) == 7
  assert twice(u32, inc, 0) == 2
}
```

**Unit tests.** `generics.test.ts`: applied types are structural (a `Vec(u64)`, a same-shaped
`Stack(u64)` and the written-out struct reach one instance); `sizeof(Vec(T))`,
`sizeof(Pair(T, bool))` per instance; the three constructor spellings give the same WAT;
`T(a, b)` constructs and `T(x)` for a number is the constructor error; a phantom type parameter
cannot be inferred; `Vec` without arguments, wrong arity, a non-generic type applied, a recursive
generic type: one error each; comptime function arguments: not a function, wrong signature, a
generic passed, forwarding a comptime function parameter, `twice(inc, x)` decides `T`; instance
identity includes the function; `notes` carry the requesting call and at most four levels.
`spec/generics.md`: `json ast` for a type function, `TypeApply` under each prefix form, and one
`errors` block per stage 2 row of section 9.

**Zero-cost checks.** Z1 gains the pair below (1,331 bytes on both sides **[ran]**): `Vec` for
`u64` and `[]u8` with growth, a sort with three comparators (two for one `T`), explicit and
inferred calls. Z5 on the sort output. Generic side:

```ents
data heap = mut [0:u8; 4096]
global top: u32 = 0
func alloc(n: u32) -> u32 {
  let p = (heap as u32) + top
  top += n
  return p
}
func Vec(comptime T: type) -> type => (ptr: [*]mut T, len: u32, cap: u32)
func vec(comptime T: type, cap: u32) -> *mut Vec(T) {
  let v = alloc(sizeof(Vec(T))) as *mut Vec(T)
  v.*.ptr = alloc(cap * sizeof(T)) as [*]mut T
  v.*.len = 0
  v.*.cap = cap
  return v
}
func push(comptime T: type, v: *mut Vec(T), x: T) {
  if v.*.len == v.*.cap {
    let moved = alloc(v.*.cap * 2 * sizeof(T)) as [*]mut T
    for i in v.*.len {
      moved[i] = v.*.ptr[i]
    }
    v.*.ptr = moved
    v.*.cap *= 2
  }
  v.*.ptr[v.*.len] = x
  v.*.len += 1
}
func items(comptime T: type, v: *Vec(T)) -> []mut T => v.*.ptr[0..v.*.len]
func sort(comptime T: type, xs: []mut T, comptime before: (T, T) -> bool) {
  let p = xs.ptr
  for i in xs.len {
    let x = p[i]
    let j = i
    while j > 0 && before(x, p[j - 1]) {
      p[j] = p[j - 1]
      j -= 1
    }
    p[j] = x
  }
}
func ascending(a: u64, b: u64) -> bool => a < b
func descending(a: u64, b: u64) -> bool => a > b
func shorter(a: []u8, b: []u8) -> bool => a.len < b.len
export func run(n: u32, up: bool) -> u64 {
  let v = vec(u64, 2)
  for i in n {
    push(v, i as u64)
  }
  if up {
    sort(items(v), ascending)
  } else {
    sort(u64, items(v), descending)
  }
  return v.*.ptr[0]
}
export func words(a: []u8, b: []u8) -> u32 {
  let w = vec([]u8, 1)
  push([]u8, w, a)
  push(w, b)
  sort(items(w), shorter)
  return w.*.ptr[0].len
}
```

Hand-written side:

```ents
data heap = mut [0:u8; 4096]
global top: u32 = 0
type VecU64 = (ptr: [*]mut u64, len: u32, cap: u32)
type VecBytes = (ptr: [*]mut []u8, len: u32, cap: u32)
func alloc(n: u32) -> u32 {
  let p = (heap as u32) + top
  top += n
  return p
}
func vec_bytes(cap: u32) -> *mut VecBytes {
  let v = alloc(sizeof(VecBytes)) as *mut VecBytes
  v.*.ptr = alloc(cap * sizeof([]u8)) as [*]mut []u8
  v.*.len = 0
  v.*.cap = cap
  return v
}
func vec_u64(cap: u32) -> *mut VecU64 {
  let v = alloc(sizeof(VecU64)) as *mut VecU64
  v.*.ptr = alloc(cap * sizeof(u64)) as [*]mut u64
  v.*.len = 0
  v.*.cap = cap
  return v
}
func push_bytes(v: *mut VecBytes, x: []u8) {
  if v.*.len == v.*.cap {
    let moved = alloc(v.*.cap * 2 * sizeof([]u8)) as [*]mut []u8
    for i in v.*.len {
      moved[i] = v.*.ptr[i]
    }
    v.*.ptr = moved
    v.*.cap *= 2
  }
  v.*.ptr[v.*.len] = x
  v.*.len += 1
}
func push_u64(v: *mut VecU64, x: u64) {
  if v.*.len == v.*.cap {
    let moved = alloc(v.*.cap * 2 * sizeof(u64)) as [*]mut u64
    for i in v.*.len {
      moved[i] = v.*.ptr[i]
    }
    v.*.ptr = moved
    v.*.cap *= 2
  }
  v.*.ptr[v.*.len] = x
  v.*.len += 1
}
func items_bytes(v: *VecBytes) -> []mut []u8 => v.*.ptr[0..v.*.len]
func items_u64(v: *VecU64) -> []mut u64 => v.*.ptr[0..v.*.len]
func sort_bytes_shorter(xs: []mut []u8) {
  let p = xs.ptr
  for i in xs.len {
    let x = p[i]
    let j = i
    while j > 0 && shorter(x, p[j - 1]) {
      p[j] = p[j - 1]
      j -= 1
    }
    p[j] = x
  }
}
func sort_u64_ascending(xs: []mut u64) {
  let p = xs.ptr
  for i in xs.len {
    let x = p[i]
    let j = i
    while j > 0 && ascending(x, p[j - 1]) {
      p[j] = p[j - 1]
      j -= 1
    }
    p[j] = x
  }
}
func sort_u64_descending(xs: []mut u64) {
  let p = xs.ptr
  for i in xs.len {
    let x = p[i]
    let j = i
    while j > 0 && descending(x, p[j - 1]) {
      p[j] = p[j - 1]
      j -= 1
    }
    p[j] = x
  }
}
func ascending(a: u64, b: u64) -> bool => a < b
func descending(a: u64, b: u64) -> bool => a > b
func shorter(a: []u8, b: []u8) -> bool => a.len < b.len
export func run(n: u32, up: bool) -> u64 {
  let v = vec_u64(2)
  for i in n {
    push_u64(v, i as u64)
  }
  if up {
    sort_u64_ascending(items_u64(v))
  } else {
    sort_u64_descending(items_u64(v))
  }
  return v.*.ptr[0]
}
export func words(a: []u8, b: []u8) -> u32 {
  let w = vec_bytes(1)
  push_bytes(w, a)
  push_bytes(w, b)
  sort_bytes_shorter(items_bytes(w))
  return w.*.ptr[0].len
}
```

**Corpus check.** 0 differing files.

### Stage 3: method-call syntax and overloads

**Scope.** 3.7 and the stage 3 part of 3.3; the `typePun` grammar boundary; checker rows marked
3 in 5.2 and 5.8 (`pinned`, `hasField`, method calls, overload sets, `pickOverload`, a declared
function replaces a builtin, `CallExpr` at `span.end`, `inferBody`); codegen 6.5 and the overload
emission of 6.2; hover inside generic bodies (section 7).

**Files.** `encantis-grammar.ohm` (+ bundle), `ast.ts` (`FuncDecl.overload`), `checker.ts`,
`codegen.ts`, `meta.ts`, `generics.test.ts`, `checker.test.ts`, `codegen.test.ts`,
`spec/generics.md`, `spec/checks.md` (overloads), `examples/generics/methods.ents`,
`examples/generics/set.ents`, `tests/golden/wasm-sha256.json` (the `strcmp.ents` entry changes:
6.5), `docs/encantis.md` (3.4 Functions: overloads, builtin replacement; the second "4.8 UFCS"
becomes "4.9 Method-Call Syntax" as implemented, which also fixes the duplicate section number;
"Operator Overloading via UFCS" in Future Additions now builds on overloads that exist),
`docs/grammar.md` (Member Access 643-653, Function Call).

**Acceptance programs.**

`examples/generics/methods.ents`. Expected: 3 passed. `v.last().double()`-style chains compile
to nested direct calls; `v.push(i)` and `push(v, i)` compile to the same instruction.

```ents
// Method-call syntax: x.f(args) is f(x, args) when x has no field f. The
// receiver is passed as written (no implicit address-of), so the vector's
// header lives in memory and `vec` returns a pointer to it.

data space = mut [0:u8; 4096]
global top: u32 = 0

func alloc(n: u32) -> (p: u32) {
  top = (top + 7) & 0xFFFFFFF8
  p = (space as u32) + top
  top += n
  assert top <= 4096
}

func Vec(comptime T: type) -> type => (ptr: [*]mut T, len: u32, cap: u32)

func vec(comptime T: type, cap: u32) -> *mut Vec(T) {
  let v = alloc(sizeof(Vec(T))) as *mut Vec(T)
  let made = Vec(T)(alloc(cap * sizeof(T)) as [*]mut T, 0, cap)
  v.*.ptr = made.ptr
  v.*.len = made.len
  v.*.cap = made.cap
  return v
}

func push(comptime T: type, v: *mut Vec(T), x: T) {
  if v.*.len == v.*.cap {
    let moved = alloc(v.*.cap * 2 * sizeof(T)) as [*]mut T
    for i in v.*.len {
      moved[i] = v.*.ptr[i]
    }
    v.*.ptr = moved
    v.*.cap *= 2
  }
  v.*.ptr[v.*.len] = x
  v.*.len += 1
}

func pop(comptime T: type, v: *mut Vec(T)) -> T {
  v.*.len -= 1
  return v.*.ptr[v.*.len]
}

func get(comptime T: type, v: *Vec(T), i: u32) -> T => v.*.ptr[i]
func items(comptime T: type, v: *Vec(T)) -> []T => v.*.ptr[0..v.*.len]

func find(comptime T: type, xs: []T, x: T) -> u32 {
  for i, e in xs {
    return i when e == x
  }
  return xs.len
}

func contains(comptime T: type, xs: []T, x: T) -> bool => find(xs, x) < xs.len
func double(n: u32) -> u32 => n * 2

// The first occurrence of each element of xs, in order.
func unique(comptime T: type, xs: []T) -> *mut Vec(T) {
  let out = vec(T, xs.len)
  for x in xs {
    if !out.items().contains(x) {
      out.push(x)
    }
  }
  return out
}

data repeats = [4:u32, 7, 4, 4, 9, 7, 1]
data letters = "mississippi"

export func sum_to(n: u32) -> (s: u32) {
  let v = vec(u32, 4)
  for i in n {
    v.push(i)
  }
  s = 0
  for x in v.items() {
    s += x
  }
}

test "the receiver decides T" {
  let v = vec(u32, 2)
  for i in 100 {
    v.push(i * 3)
  }
  assert v.*.len == 100
  assert v.*.cap == 128
  assert v.get(99) == 297
  assert v.pop() == 297
  assert v.items().len == 99
  assert sum_to(5) == 10
}

test "explicit type arguments come after the receiver" {
  let b = vec(u8, 2)
  b.push(u8, 9)
  assert b.get(u8, 0) == 9
  assert get(u8, b, 0) == 9
}

test "calls chain, and plain functions are methods too" {
  let u = unique(repeats)
  assert u.*.len == 4
  assert u.get(2) == 9
  assert u.items().find(1) == 3
  assert u.get(0).double() == 8
  assert unique(letters).items().len == 4
  assert unique(letters).items().contains(112)
}
```

`examples/generics/set.ents`. Expected: 2 passed. With tests, the output has `$slot<u32>`,
`$slot<''u32>`, `$has<...>`, `$add<...>` for both key types; `$add<u32>` calls `$hash` and
(through `$slot<u32>`) `$eq`, `$add<''u32>` calls `$hash:''u32` and `$eq:''u32|''u32`.

```ents
// Duck typing through overloads: Set(K) calls hash(k) and eq(a, b) for its K.
// Two key types in one module means two functions named hash and two named eq;
// each instance of slot, has and add calls the pair for its own K, directly.
// (Slots use a u32 `used` flag and explicit `.*` until stage 4.)

data space = mut [0:u8; 8192]
global top: u32 = 0
func alloc(n: u32) -> u32 {
  let p = (space as u32) + top
  top += n
  return p
}

func Slot(comptime K: type) -> type => (used: u32, hash: u32, key: K)
func Set(comptime K: type) -> type => (slots: [*]mut Slot(K), mask: u32, count: u32)

func hashset(comptime K: type, bits: u32) -> *mut Set(K) {
  let s = alloc(sizeof(Set(K))) as *mut Set(K)
  let size: u32 = 1 << bits
  let bytes = size * sizeof(Slot(K))
  let p = alloc(bytes)
  let raw = p as [*]mut u8
  raw[0..bytes] = 0
  s.*.slots = p as [*]mut Slot(K)
  s.*.mask = size - 1
  s.*.count = 0
  return s
}

// The slot of k: its own, or the empty one where it would go.
func slot(comptime K: type, s: *Set(K), h: u32, k: K) -> u32 {
  let i = h & s.*.mask
  loop {
    return i when s.*.slots[i].used == 0
    return i when s.*.slots[i].hash == h && eq(s.*.slots[i].key, k)
    i = (i + 1) & s.*.mask
  }
}

func has(comptime K: type, s: *Set(K), k: K) -> bool => s.*.slots[s.slot(k.hash(), k)].used != 0

func add(comptime K: type, s: *mut Set(K), k: K) -> bool {
  let h = hash(k)
  let i = s.slot(h, k)
  return false when s.*.slots[i].used != 0
  s.*.slots[i].used = 1
  s.*.slots[i].hash = h
  s.*.slots[i].key = k
  s.*.count += 1
  return true
}

func hash(k: u32) -> (h: u32) {
  h = (k ^ (k >> 16)) * 0x45d9f3b
  h = h ^ (h >> 16)
}
func eq(a: u32, b: u32) -> bool => a == b

func hash(k: []u32) -> (h: u32) {
  h = 0x811c9dc5
  for w in k {
    h = (h ^ w) * 0x01000193
  }
}
func eq(a: []u32, b: []u32) -> bool {
  return false when a.len != b.len
  for i in a.len {
    return false when a.ptr[i] != b.ptr[i]
  }
  return true
}

data abc = [1:u32, 2, 3]
data abd = [1:u32, 2, 4]
data abc2 = mut [1:u32, 2, 3]

test "a set of u32" {
  let s = hashset(u32, 6)
  assert s.add(7)
  assert s.add(8)
  assert !s.add(7)
  assert s.has(8)
  assert !s.has(9)
  assert s.*.count == 2
}

test "a set of slices compares contents" {
  let s = hashset([]u32, 4)
  assert s.add(abc)
  assert s.add(abd)
  assert !s.add(abc2)
  assert s.has(abc2[..])
  assert s.*.count == 2
  assert hash(5:u32) == hash(5:u32)
}
```

**Unit tests.** `checker.test.ts`: the overload table (exact match; unique assignable;
`no function ... accepts`; `ambiguous`; duplicate declaration; a declared `max` replaces the
builtin; an exported overload needs its own export name). `generics.test.ts`: a field wins over
a function of the same name; no implicit address-of (`push takes *mut Vec(u32) first; the
receiver is a Vec(u32)`); explicit type arguments after the receiver; a chain of three calls; a
missing requirement is one error with the instance named. `codegen.test.ts`: after the
`span.end` move, `set (a, b) = f()`, a call as arrow body, a call as compound-assignment value,
`min(a.len, b.len)` on `u32` uses `i32.lt_u`, `abs(a - b)` on `f64` keeps `f64.abs`,
`let z = if c { p.x } else { p.y }`. `parser.test.ts`: `s.boolish`, `v.u32s()`, `p.u32-1`.

**Zero-cost checks.** Z2: the stage 2 generic program with its calls rewritten as method calls
(`v.push(i as u64)`, `v.items().sort(ascending)`, `v.items().sort(u64, descending)`,
`w.push(b)`, `w.items().sort(shorter)`) equals the **same** hand-written file, 1,331 bytes
**[ran: `judge/final/zc3_methods.ents`]**. Z1 gains the overload pair (361 bytes on both sides
**[ran]**, generic side on the language design's copy of the prototype). Generic side:

```ents
func hash(k: u32) -> u32 => k * 0x45d9f3b
func hash(k: []u8) -> (h: u32) {
  h = 0x811c9dc5
  for w in k {
    h = (h ^ (w as u32)) * 0x01000193
  }
}
func eq(a: u32, b: u32) -> bool => a == b
func eq(a: []u8, b: []u8) -> bool {
  return false when a.len != b.len
  for i in a.len {
    return false when a.ptr[i] != b.ptr[i]
  }
  return true
}
func bucket(comptime K: type, k: K, n: u32) -> u32 => k.hash() % n
func same(comptime K: type, a: K, b: K) -> bool => hash(a) == hash(b) && a.eq(b)

export func f(a: []u8, b: []u8) -> u32 => if same(a, b) { bucket(a, 16) } else { bucket(7:u32, 3) }
export func g(a: u32, b: u32) -> bool => same(u32, a, b)
```

Hand-written side (an overload is emitted at its own declaration; `bucket` and `same` are
replaced by their instances in name order: `''u8` before `u32`):

```ents
func hash_u32(k: u32) -> u32 => k * 0x45d9f3b
func hash_bytes(k: []u8) -> (h: u32) {
  h = 0x811c9dc5
  for w in k {
    h = (h ^ (w as u32)) * 0x01000193
  }
}
func eq_u32(a: u32, b: u32) -> bool => a == b
func eq_bytes(a: []u8, b: []u8) -> bool {
  return false when a.len != b.len
  for i in a.len {
    return false when a.ptr[i] != b.ptr[i]
  }
  return true
}
func bucket_bytes(k: []u8, n: u32) -> u32 => hash_bytes(k) % n
func bucket_u32(k: u32, n: u32) -> u32 => hash_u32(k) % n
func same_bytes(a: []u8, b: []u8) -> bool => hash_bytes(a) == hash_bytes(b) && eq_bytes(a, b)
func same_u32(a: u32, b: u32) -> bool => hash_u32(a) == hash_u32(b) && eq_u32(a, b)

export func f(a: []u8, b: []u8) -> u32 => if same_bytes(a, b) { bucket_bytes(a, 16) } else { bucket_u32(7:u32, 3) }
export func g(a: u32, b: u32) -> bool => same_u32(a, b)
```

**Corpus check.** Exactly the three files of 6.5 differ, all fixes.

### Stage 4: values in memory (no generics code)

What the container programs need from code generation, wrong on 0.2.1 with or without generics.
Each row has a ready-made failing case in the maps (`map-codegen.md` 4.3-4.5, probes
`probes-codegen/s1.cases`, `p2`-`p4`; `map-tests-docs-usecases.md` B0) and most are already
written up by the owner as repro files in
`/home/user/monkey-fist/moonbit/encantis/builder/bugs/` (numbers below).

| Change | Where (codegen.ts) | Today |
|---|---|---|
| `bool` loaded and stored as one byte (`i32.load8_u` / `i32.store8`) | `loadFromMemory` / `storeToMemory` (433-475) | 4-byte access with a 1-byte layout: a `bool` field store clobbers its neighbour, silently |
| Structs, tuples and `[N]T` loaded and stored field by field at `fieldByteOffset`, the address in a scratch local declared by `collectLocals` (2608-2864); element loops over structs; a call result stored straight to memory | same | invalid wasm; `dst[i] = src[i]` silently copies 4 bytes (`bugs/04`, `05`, `09`, `17`, `18`) |
| One recursive place function for `X.*`, `X[i]`, `place.field`, `place.0`, and a pointer-typed object dereferenced automatically (`v.len` for `v: *Vec`); a field of a call result. `fieldByteOffset` (types.ts:1124-1142) learns positional fields | `lvalueAddressOf` (983-1008), used by `memberToWat` (1010-1147) and `assignLvalue` (2201-2225) | only `X.*.f` and `X[i].f` one level deep; `v.len` reads the pointer itself; nested writes emit nothing (`bugs/06`, `07`, `13`) |
| `&p[i]`, `&p[i].f` on a many-pointer | `addressOfIndexToWat` (1387-1408) | compiled as a load |
| An `if` statement whose branch ends in a value-returning call drops the value | statement `if` | invalid wasm |
| Implicit numeric widening of `let` values and in mixed arithmetic is emitted | `letToWat` (2012-2032), `binaryToWat` | checker accepts, wasm invalid (`bugs/16`) |
| `&local` | checker | new error: `'v' is held in registers and has no address` (today the value is passed) |
| Unsupported member reads and assignments throw instead of emitting the object or nothing | 1146-1147, 2268 | wrong code that validates |

**Files.** `codegen.ts`, `types.ts` (`fieldByteOffset`), `checker.ts` (the `&local` error),
`codegen.test.ts` (each row as a non-generic test), `examples/types/` (the owner's repro files
`bugs/04`, `05`, `06`, `07`, `09`, `13`, `16`, `17`, `18` as passing examples),
`examples/generics/*.ents` (rewritten to the natural spelling), `docs/encantis.md`
(Memory Model: field access through pointers; the chapter 8 examples rewritten to `v.len`).

**Acceptance programs.** `map-tests-docs-usecases.md` section B3 holds the complete sources
(also as files under `generics/acceptance/`). They must pass `encantis test` **exactly as
written there**, and replace the stage 1-3 spellings in `examples/generics/`:

| Program | Tests | What it adds over stages 1-3 |
|---|---|---|
| a01 `a01_minmax_swap.ents` | 4 | `swap` of two structs through pointers (whole-struct load and store) |
| a03 `a03_duck.ents` | 2 | `index_of` over `[]Pt` with `eq(Pt, Pt)`: struct elements loaded in a `for` |
| a04 `a04_vec.ents` | as written | `v.len += 1`, `v.* = Vec(T)(...)`, struct and tuple elements |
| a05 `a05_set.ents` | as written | a `bool` in a slot, `s.slots[i] = (true, h, k)` |
| a06 `a06_map.ents` | as written | `Map(K, V)`, `lookup -> ?*mut V` |
| a07 `a07_sort.ents` | 3 | sorting structs with a two-field comparator; `ids[0..6].sort(by_cost_desc)` |
| a08 `a08_compose.ents` | as written | generics calling generics over struct elements |

**Zero-cost checks.** Z1 gains the stage 2 pair with struct, tuple and `bool`-holding element
types. Instances and hand-written code go through the same paths, so the guarantee is unaffected;
the test proves it. **Corpus check:** the existing examples and kernels stay inside the subset
that already works, so 0 differing files besides the repro files this stage fixes.

### Stage 5: generics across modules, and the container library

**Scope.** 3.8; `ImportItem_typeFunc` and `ImportTypeFunc`; checker 5.9; codegen 6.6; tooling
rows marked 5; `lib/stack.ents`, `lib/vec.ents`, `lib/set.ents`, `lib/map.ents`, `lib/sort.ents`
with inline tests and small buffers (a 16 MB zeroed `data` takes 9 s to compile and a bun test
has 5 s).

**Files.** `encantis-grammar.ohm` (+ bundle), `encantis-actions.ts`, `ast.ts`, `checker.ts`
(`getExportedSymbols`, `collectImport`, `typecheckProgram`, `checkToContext`/`finalize`, site
lookup, externs, signature-only imports), `codegen.ts` (`buildFullNameMap`, per-module literal
refs), `loader.ts` (an injectable file reader), `meta.ts`, `packages/cli/src/cli.ts`,
`packages/extension/src/server/serve.ts`, `packages/compiler/tests/fixtures/generics/`
(`main.ents`, `other.ents`, `containers.ents`, `stack.ents`), `loader.test.ts`, `lib/*.ents`,
`lib/README.md`, `README.md`, `docs/encantis.md` (3.8; 7.1 Imports and 7.2 Exports).

**Acceptance.**

- **a09** (`map-tests-docs-usecases.md` B3, files `acceptance/a09_modules/{main,containers,stack}.ents`)
  as written: one instance each of `vec`, `push`, `items` for `u32` and for `Cell`; `hashset`,
  `table`, `slot`, `add` for `Cell`, calling `main`'s `$hash` and `$eq` directly; `zeroed` once;
  `containers.ents` compiled alone has no functions and no exports.
- **Fixture tests** (`loader.test.ts`): `$containers$push<u32>` appears once although two
  modules push to a `Vec(u32)` (Z9); an instance that used the site is per site, and each copy
  calls its own module's `hash`; a module that uses `Set(Cell)` without providing `hash(Cell)`
  gets `no function 'hash' accepts (Cell), in add(K = Cell)` in the library's errors plus the
  call-site error in its own; a comparator from a third module is called by its mangled name; the
  error gate stops the build for a late body error in an already-checked module.
- **a12** (outside the repository, by hand before release): monkey-fist `stack/features.ents`
  rewritten on `Set([]u32)` passes `node moonbit/encantis/check-features.cjs` with 0 mismatches,
  and its timing is within noise of the hand-written kernel.

**Zero-cost checks.** Z9: the two-module fixture equals its single-file hand specialisation in
function count and bodies. Z5 on every file under `lib/`.

---

## 9. Non-goals, with the error each produces

Each is rejected with the message shown, so the syntax stays free for a later version. "Stage" is
the stage whose `spec/generics.md` gets the case. Messages marked (P) are worded differently in
the prototype and must be changed to this wording; the rest are **[design]** or already match.

### At a declaration

| Not supported | Stage | What the user sees |
|---|---|---|
| A comptime function parameter, before stage 2 | 1 | `comptime parameter 'before' must be a type parameter: comptime function parameters are not supported yet` |
| A comptime value parameter (`comptime n: u32`), and with it `[n]T` | 1 (wording from 2) | `comptime value parameters are not supported yet: 'n' must be 'type' or a function type` (P) |
| `func f(comptime t: type)` | 1 | `a type parameter's name starts with an upper-case letter: write 'comptime T: type'` |
| `func f(T: type, a: T)` | 1 | `a parameter of type 'type' must be comptime: write 'comptime T: type'` |
| `comptime` in a struct type, a result, an enum payload, a function type; `let t: type`; `func f(t: type)` | 1 | parse error (no grammar rule) |
| A generic function with an unnamed parameter, or the anonymous-input form | 1 | `a generic function's parameters need names` |
| An anonymous generic function | 1 | `a generic function needs a name` |
| A type parameter named like a declared type, or repeated | 1 | `type parameter 'Pt' has the name of a type declared in this module`; `type parameter 'T' is declared twice` |
| A generic function declared inside a `test` block | 1 | `a generic function is declared at module level, not inside a test` |
| A generic function sharing its name with another function | 1 | `'max' is already declared: a generic function's name is unique in its module` |
| Importing a generic, before stage 5 | 1 | `generic functions cannot be imported yet` |
| A generic host import | 1 | `a host import cannot have comptime parameters` |
| Exporting a generic to the host | 1 | accepted; emits nothing (the export means "importable" from stage 5). To export an instance write a wrapper: `export func push_u32(v: *mut Vec(u32), x: u32) { push(v, x) }` |
| A generic type with a parameter that is not `comptime X: type`, or with none | 2 | `generic type 'Vec' takes comptime type parameters only, as (comptime T: type)` |
| A generic type with a block body or conditions | 2 | parse error (`Expected "=>"`) |
| A recursive generic type | 2 | `generic type 'List' refers to itself` (P) |
| Two functions with the same name and parameter types | 3 | `'hash' is already declared with parameters (u32)` (today the second silently replaces the first, `judge/t2.ents`) |
| Two exports with one name | 3 | `export name 'hash' is used twice: give one an explicit name, as in export "hash_u32" func hash(...)` |

### At a call

| Not supported | Stage | What the user sees |
|---|---|---|
| Writing some type parameters and inferring others; a wrong count | 1 | `'max' expects 2 arguments, or 3 with its type argument written; got 1` (P) |
| Named arguments to a generic | 1 | `'max' takes positional arguments` |
| Inference from the expected result type, or of a parameter nothing mentions | 1 | `cannot infer T for 'zero': write the type argument, as in zero(u32)` (P) |
| Inference from untyped literals only | 1 | `cannot infer T for 'max' from untyped literals: write max(i32, ...) or give a literal its type (1:i32)` (the prototype defaults to `i32`) |
| A value where a type is needed | 1 | `argument 1 of 'max' must be a type: T is a type parameter` (P) |
| A type where a value is needed | 1 | `'u32' is a type; a type can only be passed for a comptime parameter` (P) |
| A type argument that is not concrete | 1 | `type argument T of 'max' must be a concrete type` |
| A generic function used as a value | 1 | `generic function 'max' must be called` (P) |
| `T(...)` on a type parameter, before stage 2 | 1 | `T(...) on a type parameter is not supported yet` |
| Runaway instantiation | 1 | `too many nested instantiations (64) while instantiating 'deep'`, once, types cut at 60 characters (the prototype prints several kilobytes) |
| A generic type without arguments, with the wrong number, or a plain type applied | 2 | `'Vec' is a generic type: write Vec(T)` (P); `Vec expects 1 type argument, got 2`; `'Point' is not a generic type` |
| Applying a type parameter (`T(u32)` in type position) | 2 | `a type parameter cannot be applied` (the prototype throws) |
| A phantom type parameter inferred through a generic type | 2 | `cannot infer T for 'tag': 'Tagged(T)' does not use T in its fields; write the type argument` |
| A constructor on a type that is not a struct or tuple | 2 | `u32 is not a struct or tuple type: it has no constructor; to convert a number write x as T` |
| A comptime function argument that is not a plain function name (a generic, an expression; from stage 3 an overloaded name) | 2 | `argument 3 of 'sort' must be the name of a function: before is a comptime function parameter` (P) |
| A comptime function argument with the wrong signature | 2 | `'inc' is (u32) -> u32, but 'sort' needs before: (i32, i32) -> bool` (P) |
| Calling a function-typed runtime value | unchanged | still invalid wasm on 0.2.1 (`judge/t3.ents`); the comparator is a comptime parameter. Stage 3 turns the `call_indirect` stub into a thrown compiler error |
| A by-value receiver for a pointer parameter | 3 | `push takes *mut Vec(u32) first; the receiver is a Vec(u32), which is held in registers and has no address` |
| No overload accepts; several accept | 3 | `no function 'hash' accepts (Cell)`; `'hash' is ambiguous for (int(5))` |

### In an instance

| Not supported | Stage | What the user sees |
|---|---|---|
| An operator the type does not have (struct `==`, tuple `<`, slice `==`) | 1 | `operator > is not defined for Pt, in max(T = Pt)`; write `eq` |
| A requirement the type does not meet | 3 | `no function 'eq' accepts (u32, u32), in index_of(T = u32)` (stages 1-2 report the ordinary unknown-identifier or argument errors, with the label) |
| A requirement that only a module other than the owner or the site provides | 5 | the same `no function ... accepts` error |
| Traits, interfaces, declared requirements, default type arguments, specialisation by type, lambdas as comptime arguments | not planned | not parsed |

---

## 10. Risks, open questions, and the order to cut scope

### Risks

| # | Risk | Why it matters | Mitigation |
|---|---|---|---|
| 1 | **Private offsets.** An instance's nodes carry offsets of `index * 2^28 + original`. Any consumer that turns an offset into a source position and is missed reports a line that does not exist | "offset" gets a second meaning | Three mapping points (`error`/`warn`, `recordDefinition`, `recordReference`) plus `findIdentOffset`; the test that every offset in `errors`, `warnings`, `references`, `symbolRefs` of every example is below the source length; asserts in functions carry no offset (codegen.ts:1919-1922 **[ran: read]**); meta walks `module.decls`, where copies never appear (no hint outside the file on the judge copy **[ran]**). A future feature that reports offsets from inside functions must map them |
| 2 | **Stage 5 has no prototype.** The site rule, `usedSite` propagation, extern aliases, late finalization and signature-only imports are design only, in all three source designs too | The first users (kernels importing a container library) need it | It is the last stage and everything before it is useful without it. The rule is conservative: it never shares an instance that might differ. Cut list items 1-2 |
| 3 | **The first users need stage 4 more than generics.** `v.len` through a pointer, whole-struct stores and `bool` slot fields are miscompiled today, two of them silently | A generic `Set` can check, validate and corrupt data | Stage 4 is independent and can start now; unsupported forms throw instead of emitting wrong code; Z1 runs the struct and `bool` cases as soon as it lands. Until then the examples use the spellings that work |
| 4 | **Arguments of inferred calls are inferred, then checked.** Literal registrations are rolled back in between (`pendingLiterals.length`) | Relies on `inferExpr` being repeatable | Holds today (the checker does the same for binary operands; errors de-duplicate). Covered by tests with string, array and `if` arguments (`judge/l4a.ents`, `l4b.ents`, `l4e.ents` **[ran]**) |
| 5 | **The checker accepts more than codegen compiles.** Beyond operand validation and argument widening, an unsuitable type argument can still surface as a wabt error (mixed-width arithmetic, `?T` for a non-pointer `T`, `&[1:T, 2]` array literals, which crash 0.2.1's data builder with or without generics: `judge/l5.ents` **[ran]**) | Duck typing is only as strict as the checker | `expectPlainWasm` validates every test output; spec regions compile every documented example; stage 4 turns silent fallbacks into throws |
| 6 | **Instance body errors come after the module's own errors** | Spec `errors` blocks are matched in order | The order is deterministic and documented: a module's own errors, then instance errors in the order the instances were created |
| 7 | **"First argument decides" surprises** someone who expected the widest type (`max(a_u8, b_u32)`) | An error where another language would widen | The remedy is one word (`max(u32, a, b)` or swapping); relaxing later is compatible. Q1 |
| 8 | **Stage 3 changes the output of three existing files** | Behaviour change in a feature PR | All three are fixes of miscompiles; named in the PR; the golden-hash test shows exactly one changed entry in this repository |
| 9 | **Reserved word.** `comptime` stops being an identifier | Formally breaking | No `.ents` file in either repository uses it; release notes. Q5 |
| 10 | **Overloads are name rewriting**, not symbol identity | An overload set cannot be imported under one name; meta shows the first declaration's signature for every member | Enough for `hash`/`eq`. A library exports each overload under its own export name |
| 11 | **Two assemblers** (`moduleToWat` for unit tests, `programToWat` for the CLI) | A change in one passes unit tests and fails in the product | `funcsInOrder` is shared; `expectSameWasm` runs both |
| 12 | **`def` substitution in the parser is unscoped** (encantis-actions.ts:1386-1412) | A lower-case comptime function parameter named like an earlier `def` is replaced in the body before the checker sees it, as any parameter is today | Not made worse; goes away when `def` moves into the checker (3.10) |
| 13 | **Cost per instance.** Every instance is a deep copy checked from scratch | Checking time grows with instances times body size | Not measurable for tens of instances of tens of nodes |
| 14 | **Substitution is not an evaluator.** Compile-time `if`, block-bodied type functions and `comptime func` need an environment | The mechanism stops there | 3.10: the value model, keys, instance table, names and lowering table survive; only the substitution callback is replaced |

### Open questions for the owner

Only decisions that are the language owner's and that this plan had to guess.

| | Question | This plan assumes |
|---|---|---|
| Q1 | `max(a_u8, b_u32)`: an error because the first argument decided `T = u8`, or should a later argument be able to widen `T`? | Error, as the builtin `min`/`max` behave; relaxing later breaks nothing |
| Q2 | `max(1, 2)` with nothing but untyped literals: an error, or `T = i32` as `let x = 1` would give? | Error with the fix in the message; a default can be added later |
| Q3 | Should a *non-generic* function named like a builtin (`min`, `max`, `abs`) also replace the builtin? Today the builtin wins silently and the function is dead code | Yes, from stage 3. Stage 1 does it for generics only, which the owner's `max` needs |
| Q4 | Where does a container's header live? `v.push(7)` on `let v = vec(u32, 16)` needs a pointer header or the address of a local, which the memory model does not have | `vec` returns `*mut Vec(T)`; no implicit address-of |
| Q5 | Is reserving `comptime` acceptable in a minor release? | Yes |
| Q6 | A generic's unqualified call that its own module cannot answer: look in the module that started the instantiation (as planned), or should `Set(K)` take `hash` and `eq` as comptime function parameters across modules? | The site lookup. The comptime-function form works from stage 2 and is the fallback |
| Q7 | A file that imports a generic *type*, checked alone in the editor's WebWorker mode (no file access): no type diagnostics for that file, or should the import item restate the type's body? | No type diagnostics, one warning; the desktop server and the CLI check the program |
| Q8 | Is the packed, unaligned struct layout the documented layout (`sizeof((bool, u32, []u32))` is 13)? Containers compute strides from it | Yes: it is what the compiler does |
| Q9 | Struct `==`: undefined (write `eq`), or field-wise later? | Undefined: an error instead of invalid wasm |
| Q10 | The set constructor's name, since `set` is a keyword; and where the bump stack lives (`lib/stack.ents`, or `comptime alloc`) | `hashset(K, bits)`; `lib/stack.ents` |

### What to cut first if it runs long

In this order; each cut leaves everything before it intact and has a one-line error for users.

1. Sharing of instances across sites (stage 5): key every cross-module instance by its site.
   Costs duplicate functions only when two importing modules use the same instance.
2. The site lookup (stage 5): requirements across modules are passed as comptime function
   parameters. This changes the surface the owner described: Q6.
3. Hover inside generic bodies (stage 3); `notes` in the language server (stage 2).
4. The two lenient parameter forms (stage 1): they become parse errors.
5. Spec regions of `docs/encantis.md` and `ents same-wasm` (stage 1): fall back to
   `spec/generics.md` holding a copy of the chapter's examples, with the zero-cost property
   tested only in `generics.test.ts`.
6. `Vec(T)(...)` and `T(...)` constructors (stage 2): the struct-literal form needs nothing.
7. Explicit type arguments after a receiver (`v.push(u32, 7)`, stage 3).
8. Overloads (stage 3): ship method calls alone, and containers that take `comptime hash` and
   `comptime eq`. A fallback, not a plan: it changes the surface.

Not to cut, because the guarantee or correctness depends on them: operand validation, argument
widening, the export skip, the `SizeofType` entry, the recovery type, the fixed emission order
with `expectSameWasm`, the golden hashes, the grammar-bundle test.

---

## 11. Appendix: what was run for this plan

All under
`/tmp/claude-0/-home-user-monkey-fist/c2838201-d71f-55a0-bc1a-cc2e586d01ea/scratchpad/generics/judge/`.
"0.2.1" is `bun /home/user/encantis/packages/cli/src/cli.ts`; "judge copy" is
`bun judge/repo/packages/cli/src/cli.ts`.

| What | Result |
|---|---|
| The three prototypes | minimal (`min/repo`, commit `750fee5`): `bun test` 678 pass, 0 fail; `typecheck` and `lint` clean. architecture (`arch/repo`): 672 pass, 0 fail; `typecheck` 4 errors (a `typefunc` symbol without `type`); `lint` 1 error. language (`lang/spike-min`): a copy of minimal's with patches |
| The judge copy: minimal at `17585bc` + argument widening, recovery type, operand validation, export skip, `, in` label, in-place emission | `bun test`: every one of the 667 tests of 0.2.1 passes; 6 of the prototype's own 11 tests fail because they pin the request-order emission (4), the old label (1) and a cascade error (1). `typecheck` and `lint` clean with all six patches |
| `p1.ents`-`p5.ents` on 0.2.1 | a widened argument is invalid wasm; `Pt > Pt` passes `check` and is invalid wasm; a user `max` loses to the builtin; `let z = if c { p.x } else { p.y }` is `cannot assign () to f64`; `min(a.len, b.len)` compares signed |
| `t1.ents`-`t3.ents` on 0.2.1 | `s.boolish` is a parse error; a second function of the same name silently replaces the first; a function-typed runtime parameter compiles to an undefined `$f` |
| `i1.ents`-`i4.ents` on all three prototypes | `max(a_u8, b_u32)`: error on minimal and language, `u32` on architecture; `max(a_u64, b_u32)`: invalid wasm on all three (no widening); a local named `u8`: minimal rejects `count(u8, xs)` with a cascade |
| `l4a`-`l4e.ents`, `l5.ents` | string, array and `if` arguments of inferred calls work and literals are emitted once; `count([3:u32, 5, 5], 5)` mis-infers `i32` on the prototype; `&[1:u64, 2, 3, 4]` crashes 0.2.1's data builder without generics |
| `e1`-`e5.ents` on the judge copy | `max(1, 2)` defaults to `i32` (this plan: error); `max` on `Pt` is one error at the generic's line with the label; an unused generic with a broken body or signature is no error; an exported generic emits no export and the module validates; each mistake is one error; a test-only instance is absent from `compile` |
| `gram.ts` | the grammar of 4.1 against 0.2.1's on 352 sources: 0 changed parse results; 44 new-form cases as tabulated |
| `samewat.sh` (twice) | 92 `.ents` files of both repositories, 0.2.1 against the judge copy: 87 identical; `mem-conflict.ents` and `bugs/09` differ only in a crash's stack-trace line numbers; `strcmp.ents`, `bugs/01`, `bugs/19` are the three fixes of 6.5 |
| `final/*.ents` | `pick` 3, `minmax` 4, `slices` 4, `vec` 4, `sort` 3, `methods` 3 tests pass on the judge copy; `set` 2 on minimal `750fee5` and on the language copy |
| Byte identity, generic side on the judge copy, hand-written side on 0.2.1 | `doc/d1g`/`d1h` 105 bytes; `final/zc_generic`/`zc_byhand` 535 bytes (also against the released 0.2.1 binary); `zc2_generic`/`zc2_byhand` 1,331 bytes; `zc3_methods` against the same `zc2_byhand` 1,331 bytes; `zc3_over_*` 361 bytes (generic side on the language copy); the language design's `z2g`/`z3h` 1,323 bytes re-run |
| `doc/d2`-`d9`, `t1`-`t4.ents` | every example of section 3 without an `errors` block validates; the error examples report one error each (wording per section 9) |
| Tooling on the judge copy | `encantis meta` on a generics file: exit 0, no symbol with `<`, no hint outside the file, instance signatures in its type table; `symbols` lists generics as `generic func`; `encantis hover` on a call of a generic prints `generic func` (this plan: the instance signature recorded at the callee) |

Not run by anyone, and therefore design only: reading type arguments by position (`typeOfArg`);
`evalComptimeArg` and `ComptimeValue` as the carrier of comptime arguments (the prototype passes
a map of bound types and a map of aliases; the change renames data, not behaviour); the
literal-only inference error (so the second `errors` block of 3.2 is one error on the prototype
and two under this plan); the `Param` actions (the grammar was run, the architecture
prototype has the actions for three of the five alternatives); the exact error texts marked (P)
or [design] in section 9; `notes`; rejection of generics in tests and of shadowing type
parameters; `funcsInOrder` as written (the judge copy groups instances by name prefix instead of
by an `of` link); the spec runner changes; the golden-hash test; everything in stage 4; everything
in stage 5 (the architecture and minimal prototypes import and instantiate generics across
modules, without the site rule).
