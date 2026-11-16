# Comptime generics for Encantis: the architecture design

Lens: generics as a first-class part of the checker. One program-wide instantiation table keyed by
(declaration, comptime arguments), one set of checker tables per instance that codegen consumes
unchanged, unification-based inference, type functions evaluated at compile time, and the same
machinery carrying comptime value parameters, comptime function parameters and (later) comptime
function execution.

Paths are relative to `/home/user/encantis` (branch `claude/generics`, = v0.2.1). `checker.ts`,
`codegen.ts`, `types.ts` and so on mean `packages/compiler/<file>`; line numbers are for v0.2.1.
"Spike" means the prototype described in Appendix A: a private copy of the compiler in which the core
of this design is implemented and passes the existing suite. Statements marked **(spike)** were run
there; statements marked **(probe)** were run against the unmodified compiler by the five mapping
notes or by me. Everything else is design, not yet evidence.

Contents

0. The design in one page
1. Syntax
2. Semantics
3. Checker changes
4. Codegen changes
5. Tooling
6. Tests and docs
7. Staging: four pull requests
8. Risks, open questions, what to cut first
Appendix A. The spike: what exists, what it proved, what it got wrong
Appendix B. From here to comptime evaluation

---

## 0. The design in one page

```ents
func Vec(comptime T: type) -> type => (ptr: [*]mut T, len: u32, cap: u32)
func push(comptime T: type, v: *mut Vec(T), x: T) { ... }
func max(comptime T: type, a: T, b: T) -> T => if a > b { a } else { b }
func sort(comptime T: type, xs: []mut T, comptime before: (T, T) -> bool) { ... }

let v = vec(u32, 16)        // explicit: every parameter written, the type as an argument
v.push(7)                   // UFCS; T inferred by unifying *mut Vec(T) with the type of v
let m = max(a, b)           // T inferred from a and b
sort(xs, by_cost)           // T inferred from xs and from by_cost; before is called directly
```

1. **A comptime parameter is a name bound at compile time in the function's scope.** It reuses the
   symbol kinds the compiler already has: a `comptime T: type` is bound as a `type` symbol, a
   `comptime f: (A) -> B` as a `func` symbol, a `comptime n: u32` as a `def` symbol. Every existing
   consumer of those kinds (`resolveType`, `inferIdent`, `evalComptimeExpr`, `sizeof`, codegen's
   constant inlining and call path) works on them without change. Generics are scoped `type`/`def`
   bindings plus specialisation, which is why this is step one of comptime evaluation and not a
   second mechanism.
2. **One instantiation table for the whole program**, `ProgramState.memo`, keyed by
   (defining module, declaration offset, canonical comptime arguments, lookup environment). It
   memoises three kinds of thing with one mechanism: instances of generic functions (code is
   emitted), applications of type functions (the value is a type, nothing is emitted), and later
   calls of comptime functions (the value is a constant).
3. **An instance owns its tables.** `Instance { sig, types, calls, consts, literals }`. Its body is
   the generic's own AST, checked by the ordinary `checkFuncBody` with `this.types` pointing at the
   instance's map and the comptime parameters bound. Codegen calls the unmodified `funcToWat` with a
   view of the check result built from the instance. No AST cloning, no shifted spans, no key
   prefixes.
4. **Body checks are queued**, not run inside the call that asked for the instance. The call needs
   only the instantiated signature. The queue is drained when the checker is at rest (after a
   module's second pass), so no function-local checker state leaks into a generic body and
   recursion terminates because the instance is in the table before its body is checked.
5. **Calls are resolved by the checker and recorded per call site** in `calls: Map<CallExpr
   span.end, CallTarget>`. Codegen reads the record first and falls back to today's name-based
   chain only for builtins and casts. The same table carries generic instances, UFCS, overloads and
   constructors of applied types.
6. **Inference is unification** of each parameter's declared type (a pattern with type variables)
   against the argument's own type, through pointers, slices, arrays, tuples, function types and
   type-function applications (which are structural, so they unify by their expansion). Literals do
   not decide a type parameter; they take it.
7. **Requirements are duck-typed.** Operators are checked for the concrete type when the instance
   body is checked. A call such as `hash(k)` is resolved by argument type from an overload set,
   looked up first in the generic's own module and then in the modules that asked for the instance
   (the instantiation chain). Instances whose bodies never needed the chain are shared by every
   module of the program.
8. **Zero cost holds by construction.** An instance is the code `funcToWat` produces for the same
   text with the types written in; comptime arguments are not emitted; a generic that is never
   called is never looked at by codegen. **(spike)** five zero-cost tests pass, and the cross-module
   run shows one `$containers$push<u32>` shared by all callers.

What the spike established (details in Appendix A):

| Claim | Evidence |
|---|---|
| The grammar extension changes no existing parse | **(spike)** 292 of 292 corpus sources (99 `.ents` files in both repos plus markdown blocks) have identical parse result and AST |
| The core (comptime type and function parameters, type functions, explicit and inferred calls, instances, queue, call table, cross-module instantiation) fits in 731 added and 28 removed lines in five files, without touching the statement and expression logic of the checker or the inside of `funcToWat` | **(spike)** `bun test` in the copy: 672 pass, 6 skip, 0 fail (667 existing + 5 new zero-cost tests) |
| Existing programs compile to the same code | **(spike)** `watdiff.ts`: all 87 compilable `.ents` entries under `examples/`, `lib/`, `packages/compiler/tests/` and the monkey-fist kernels produce byte-identical WAT with the pristine compiler and with the spike |
| Instances are shared program-wide and live with the defining module | **(spike)** `$containers$vec<u32>`, `$containers$push<u32>`, `$containers$sort<u32\|descending>` each emitted once, called from the entry module |
| A comptime function parameter is a direct call, one instance per function | **(spike)** `(call $ascending ...)` / `(call $descending ...)` in two `sort` instances; no `call_indirect`, table or `ref.func` |
| Recursion, mutual recursion and polymorphic recursion | **(spike)** `fact` and `even`/`odd` instantiate once per type and run; `deep((T, T), (x, x))` reports `too many nested instantiations` |
| Inference through a type function is structural | **(spike)** `first(Pair(u32)(3, 4))` and `first((a: 7:u64, b: 8:u64))` both infer `T` |
| Test-only instances stay out of release output; unused generics emit nothing | **(spike)** `probes/r1.ents` declares nine generic functions and a type function, all exercised by its `test` block; compiled without tests, the only instances emitted are `$fact<u32>` and `$fact<u64>`, the two the exported function reaches |
| Body errors print against the defining module with the instance named | **(spike)** `lib.ents:5:16: cannot assign int(0) to f64, in total(T = f64)` when `main.ents` instantiates it |
| `def` can leave the parser | **(spike)** with parser substitution disabled the suite still passes 672/0; one kernel literal (`data kinds = [...]` of def names in `builder/weave.ents`) is then serialised as zeros, which names the one thing that has to move with it |

What the spike showed to be wrong or missing, which this design fixes on paper:

| Finding | Consequence in this design |
|---|---|
| Moving `CallExpr` type keys to `span.end` breaks `set (a, b) = f()`: `types/positional-destructuring.ents` fails with `Missing tuple type for set pattern at offset 717` (codegen.ts:2063 reads `span.start`) | The six `span.start` lookups listed in 4.3 move in the same commit as `exprTypeOffset` |
| A literal in a generic body compiles to address 0 (its `DataTarget` entry is in the instance map, which the data-section builder never sees) | Literals are owned: per-module and per-instance literal lists and ref maps (2.8, 4.5) |
| A comptime function argument from a third module is emitted as `(call $inc ...)`, an undefined function (`$keys$inc` was meant) | Function references in instances and call targets carry (module path, declaration), and codegen resolves names through `watNameOf` (4.2) |
| The instance key used the function's name for a comptime function argument | Keys use the function's identity (module path and declaration offset) |
| `encantis hover` on a type function crashes in `typeToString(undefined)` | Every `Symbol` variant keeps a `type` (5.2) |

---

## 1. Syntax

### 1.1 Grammar changes (`packages/compiler/encantis-grammar.ohm`)

These are the rules of the spike, which are the syntax map's `decl` + `narrow` variants with one
change: comptime parameters get their own `Param` rule instead of being added to `Field`.

```
  // keyword list (ohm:514-518) and tokens (ohm:520-551)
  keyword = (... | sizeof | comptime) ~identChar
  comptime = "comptime" ~identChar

  // ohm:50
  ImportItem = func typeIdent ParamList "->" type  -- typeFunc
             | func ident? FuncSignature           -- func
             | global ident TypeAnnotation         -- global

  // ohm:68
  FuncDecl = func typeIdent ParamList "->" type "=>" Type  -- typeFunc
           | inline? func ident? FuncSignature Body        -- func

  // ohm:72
  FuncSignature = ParamList ("->" Type)?  -- params
                | BaseType ("->" Type)?   -- plain

  ParamList = "(" ListOf<Param, ","> ")"

  Param = comptime typeIdent ":" type    -- comptimeType     // comptime T: type
        | comptime ident TypeAnnotation  -- comptimeValue    // comptime before: (T, T) -> bool, comptime n: u32
        | Field                          -- plain

  // ohm:151, inserted before `typeIdent -- named`
  BaseType = ...
           | typeApplyHead NonemptyListOf<TypeArg, ","> ")"  -- apply
           | typeIdent                                        -- named
  TypeArg = Type
  typeApplyHead = typeIdent "("          // lexical: Vec(u32), never Vec (u32)

  // ohm:422-424
  Arg = ident ":" Expr          -- named
      | ident ":"               -- shorthand
      | TypeLit &("," | ")")    -- type
      | Expr                    -- positional

  TypeLit = Type_func                 -- func    // u32 -> u32, (T, T) -> bool
          | &typeOnlyStart BaseType  -- base
  typeOnlyStart = "?" | "*" | "[*]" | "[]" | arrayPrefix | rangedUnsigned | bareTypeIdent
  arrayPrefix = "[" arrayFramings "]"
  bareTypeIdent = typeIdent ~"("
```

Semantic actions (`encantis-actions.ts`): `FuncDecl` is renamed `FuncDecl_func`, `FuncSignature`
becomes `FuncSignature_params` and `FuncSignature_plain` (same body), and new actions are added for
`FuncDecl_typeFunc`, `ImportItem_typeFunc`, `ParamList`, `Param_*`, `BaseType_apply`,
`typeApplyHead`, `TypeArg`, `Arg_type`, `TypeLit_*`. `ExportDecl_unnamed` (actions:291-313) takes its
name from a `TypeFuncDecl` as it does from a `FuncDecl`. After every `.ohm` edit:
`bun run bundle:grammar`. A new test compares the committed bundle with a fresh recipe, so a stale
bundle fails CI instead of silently testing the old grammar.

### 1.2 AST (`ast.ts`)

```ts
interface Field        { kind: 'Field'; ident: string | null; type: Type; comptime?: boolean; span }   // ast:94-98
interface TypeType     { kind: 'TypeType'; span }                          // the keyword `type` as a parameter's type
interface TypeApply    { kind: 'TypeApply'; name: string; args: Type[]; span }          // Vec(T), Map(K, V)
interface TypeExpr     { kind: 'TypeExpr'; type: Type; span }              // a type written as a call argument
interface TypeFuncDecl { kind: 'TypeFuncDecl'; ident: string; params: Field[]; body: Type; span }
interface ImportTypeFunc { kind: 'ImportTypeFunc'; ident: string; params: Field[]; span }

type Type        = ... | TypeApply | TypeType          // ast:570-578
type Expr        = ... | TypeExpr                      // ast:308-327
type Declaration = ... | TypeFuncDecl                  // ast:27-37; also in ExportDecl.item
type ImportItem  = ImportFunc | ImportGlobal | ImportTypeFunc
```

`ParamList` produces the same `CompositeType` of `Field`s that `BaseType_composite` produces, so
`FuncSignature.input` keeps its shape and every reader of `input.fields` (checker.ts:1840-1851,
meta.ts:385, codegen.ts:3115) is untouched. `ASTVisitor`, `walkDeclaration` and `walkExpr`
(ast:669-965) get the new cases. `resolveType` and `astToResolved` (type-lib.ts:30-90) have
exhaustive switches, so `tsc` forces the two new `Type` kinds to be handled there; codegen's private
resolvers (`resolveTypeFromAST` codegen.ts:1852, `resolveAstType` 3206) have silent defaults and are
changed to throw on an unknown kind.

### 1.3 Every ambiguity from the syntax map, and its resolution

| # | Ambiguity | Resolution |
|---|---|---|
| 1 | `func Vec(...)`: `ident?` matches empty and `Vec` is read as the input type of an anonymous function | A dedicated first alternative `FuncDecl_typeFunc`, entered only for an upper-case name followed by a parameter list, `-> type` and `=> Type`. `func Point -> Point => p` still parses: the first alternative fails at `->` and the second is tried **(spike, corpus)** |
| 2 | `comptime` is a legal identifier today | Reserved. No `.ents` file in either repository uses it as a name. Listed as a breaking change in the release notes |
| 3 | `Field` is shared by structs, results, enum payloads and function types | Comptime parameters are a `Param`, which exists only inside `ParamList`, which exists only in a declaration's or import's signature. `type P = (comptime T: type)`, `-> (comptime U: type)`, a comptime field in an enum payload or in a function *type* are parse errors; the checker needs no rejections for them |
| 4 | Type parameter names: a type can only be referenced by a `typeIdent` | `comptime typeIdent ":" type`: a type parameter is upper-case because it is used in type position; other comptime parameters are lower-case because they are used in expressions. `comptime t: type` and `comptime T: u32` are parse errors |
| 5 | `type` is not a `Type` | It is accepted in exactly two places, both written into the rules above: as the type of a comptime type parameter and as the result of a type function. `let t: type`, `(t: type)`, `[]type` stay parse errors. A plain parameter `t: type` is a parse error too (the a11 message "must be comptime" is therefore not needed) |
| 6 | The body of a type function is a type, not an expression | `=> Type`: the body uses the type grammar, so `=> ?*T`, `=> (T, T) -> bool`, `=> (ptr: [*]mut T, len: u32)` all parse. Block bodies (`-> type { ... }`) are not accepted; they arrive with comptime `if` (Appendix B) |
| 7 | `Vec(T)` in type position; a type can end a statement and the next line can start with `(` | `BaseType_apply` with the lexical head `typeIdent "("`. `1 as Big⏎(Green, Red) => 2` and `let a: T⏎(c).d()` parse as today **(probe, syntax map)** |
| 8 | Types as call arguments: `u32`, `(u32, u32)`, `(a: u32)`, `()`, `Vec(u32)`, `[]`, `[4]` are all expressions today | Two-part rule. (a) The grammar adds only type syntax that cannot be an expression (`TypeLit`: starts with `?`, `*`, `[*]`, `[]`, `[N]`, a ranged primitive, a bare upper-case name not followed by `(`, or is a function type), only as a whole argument (followed by `,` or `)`), producing `TypeExpr`. (b) Everything else stays the expression it is today, and the checker reads it as a type when, and only when, the parameter at that position is `comptime T: type` (`evalTypeExpr`, 3.5). `u32` is `IdentExpr`, `(u32, K)` is `TupleExpr`, `Vec(T)` is `CallExpr` |
| 9 | A local named like a primitive (`let u8 = 3` is legal) | In a comptime type position an identifier is looked up in scope first. A `type` symbol is that type; a value symbol is an error (`'u8' is a variable here, not a type`); otherwise a primitive name is the primitive |
| 10 | `[`: `[]u8` and `[4]u8` begin like array literals | Only inside `TypeLit`, only as a whole argument. The one existing parse that changes is an array literal that is *called* in argument position (`f([]())`, `f([4](u32))`), which the checker rejects today **(probe, syntax map)**. A general "type literal is a primary expression" rule is rejected: it mis-parses `let xs = [1]⏎Point(1, 2).draw()` |
| 11 | `name: T` in parentheses is the named-argument prefix | Unchanged. A bare upper-case name does not become a primary expression, so `(x: T)` stays an annotation in a group, `spec/syntax.md:191` and `:229` keep expecting `Expected "("`, and enum variants stay non-expressions |
| 12 | Constructor against type application: `Point(1, 2)` and `Vec(u32)` are both `typeIdent "(" ... ")"` in expressions | One node (`CallExpr`), decided by what the callee is: a `type` symbol constructs, a `typefunc` symbol applies. `Vec(T)(ptr, 0, cap)` is a call whose callee is a call, which already parses |
| 13 | Cast against explicit type argument: `u32(x)` and `max(u32, a, b)` | No conflict: they differ in the callee. A user function named like a primitive stays unreachable, as today |
| 14 | `set` is a keyword | Not changed. The draft's `set(K, bits)` is renamed (`hashset` in the acceptance programs). Reported as a naming constraint, not a design problem |
| 15 | `def` is substituted by the parser, unscoped: a parameter named like an earlier `def` is replaced in the body before the checker runs | Type parameters are upper-case and `def` names are lower-case, so they cannot collide. A lower-case comptime parameter (`before`, `n`) has exactly the exposure every ordinary parameter has today (`def n = 5` then `func f(n: u32) => n` returns 5 **(probe)**). It is fixed for all parameters at once when substitution leaves the parser in PR 4 (Appendix B); PR 1 adds no special case |
| 16 | Array lengths are lexical digits: `[n]T` with a comptime `n` cannot be written | Out of scope for these four PRs. Needed only for fixed-capacity containers. Noted in 8 |
| 17 | Importing a type | A type function is imported as a function: `"Vec" func Vec(comptime T: type) -> type` (`ImportItem_typeFunc`). Plain types still cross modules structurally |

### 1.4 The owner's six lines under these rules **(spike)**

| Source | AST |
|---|---|
| `func Vec(comptime T: type) -> type => (ptr: [*]mut T, len: u32, cap: u32)` | `TypeFuncDecl{ident: "Vec", params: [Field{comptime, ident: "T", type: TypeType}], body: CompositeType}` |
| `func push(comptime T: type, v: *mut Vec(T), x: T) { ... }` | `FuncDecl` whose input fields are `[T comptime, v: PointerType{TypeApply Vec [TypeRef T]}, x: TypeRef T]` |
| `func max(comptime T: type, a: T, b: T) -> T => if a > b { a } else { b }` | `FuncDecl`, body unchanged |
| `vec(u32, 16)` | `CallExpr{callee: IdentExpr vec, args: [IdentExpr u32, Literal 16]}` (unchanged from today) |
| `v.push(7)` | `CallExpr{callee: MemberExpr{object: v, member: push}, args: [7]}` (unchanged from today) |
| `hashset([]u32, 6)`, `vec(Pt, 4)`, `f(*mut T, x)` | first argument is `TypeExpr` |

---

## 2. Semantics

### 2.1 Comptime parameters

A parameter marked `comptime` is supplied at compile time and is not a wasm parameter. A function
with at least one comptime parameter is *generic*: it is never checked or emitted by itself, only
through its instances. There are three kinds, told apart by the declared type:

| Declared as | Argument | Bound in the instance's scope as | Stage |
|---|---|---|---|
| `comptime T: type` | a type | `{ kind: 'type', type, param: true }` | PR 1 |
| `comptime f: (A, B) -> C` (a function type) | the name of a function: a non-generic function visible at the call, or a comptime function parameter of the calling instance | the bound function's own `func` symbol, under the parameter's name | PR 1 |
| `comptime n: u32` (any other type) | an expression `evalComptimeExpr` can evaluate | `{ kind: 'def', type, value }` | PR 4 |

All three are symbol kinds that exist today, so the body needs no new rules: `T` is a type name,
`f(a, b)` is a call of a named function (a direct `call` in the instance), `n` is a constant that
codegen inlines (codegen.ts:342-350). `param: true` on a bound type makes `resolveType` return the
argument itself rather than `named('T', arg)`: messages then say `f64`, not `T`, and `checkExpr`'s
"record the expected type when it is named" rule (checker.ts:2118) cannot mis-record arguments.

Comptime parameters may appear anywhere in the list (type parameters first by convention; the
acceptance programs put a comparator last so that `xs.sort(by_cost)` reads well). A parameter's type
may mention any type parameter of the same function, whatever the order.

### 2.2 The two call forms, and UFCS

Let P be the parameters in declaration order and C the comptime *type* parameters among them.

- **Explicit**: `args.length == P.length`. Every parameter is written, types included:
  `vec(u32, 16)`, `max(f64, a, b)`, `sort(u32, xs, descending)`.
- **Inferred**: `args.length == P.length - C.length`. All type parameters are left out together and
  inferred (2.3): `max(a, b)`, `push(v, 7)`, `sort(xs, descending)`. Comptime function and value
  parameters are always written; they cannot be inferred.
- Any other count is an error:
  `push expects 2 arguments (or 3 with its type argument), got 1`. Leaving out some type parameters
  but not others is not supported.

The two forms never overlap, because a generic function with no type parameter has only one count.

**UFCS** (PR 2). `x.f(a, b)` where the type of `x` (after the one automatic dereference member
access already does) has no field `f` is the call `f(x, a, b)`, with `x` placed at the first
parameter that is not comptime. The counting rule above is then applied to receiver plus arguments,
so `v.push(7)` is the inferred form and `v.push(u32, 7)` the explicit one. A field named `f` wins
over a function named `f`. The receiver is checked like any argument, with the usual coercions
(`*mut T` to `*T`, `*[N]T` to `[]T`). There is no automatic address-of: structs in locals are
register-flattened and have no address, so a receiver passed for a pointer parameter must already
be a pointer. This is why the containers return `*mut Vec(T)` from `vec` (decision S8 of the
use-case notes): `let v = vec(u32, 16)` then `v.push(7)` passes that pointer.

### 2.3 Inference of type arguments

Each generic function has a *declared signature*: its signature resolved once, at collection, with
every type parameter bound to a type variable (`{ kind: 'typevar', name }`). `v: *mut Vec(T)`
becomes the pattern `*mut (ptr: [*]mut 'T, len: u32, cap: u32)` (shown as `*mut Vec(T)`).

```
infer(call):
  B = {}                                  // T -> { type, fromArgument }
  L = {}                                  // T -> the literal type of a bare-T argument
  for each written argument k whose parameter pattern mentions a type variable, left to right:
      A = inferExpr(arg_k)                // bottom-up, recorded in the types map as for any call
      unify(pattern_k, A, B, L, depth 0)
  for each T in C still unbound:
      if T in L:  B[T] = concretize(L[T])                 // i32 / i64 / f64, the `let` defaults
      else:       error "cannot infer T for vec: pass it explicitly, as vec(T, ...)"
  instantiate the signature with B        // 2.4; no body check yet
  for each written argument k:  checkExpr(arg_k, instantiatedParam_k, "argument k")
```

`unify(P, A)`, with aliases unwrapped on both sides:

| Pattern P | Actual A | Action |
|---|---|---|
| type variable `T`, depth 0 (the parameter is exactly `T`) | `comptime_int`, `comptime_float`, array literal | No binding; remember the literal in L. Literals take the type the other arguments decide |
| type variable `T`, depth 0 | any other type X | Strip a proven range first (`u32#12` to `u32`), so that narrowing never multiplies instances. Unbound: bind. Bound by a structural position: nothing (the argument check decides). Bound by another depth-0 argument to Y: keep Y if X is assignable to Y, rebind to X if Y is assignable to X, otherwise error `T is u8 from argument 1 and f64 from argument 2` |
| type variable `T`, depth > 0 (under a pointer, slice, array, tuple or function type) | X | Bind exactly, ranges kept. Already bound by another structural position to a different type: the same conflict error. A structural binding replaces a depth-0 candidate |
| `*P'`, `[*]P'` | pointer | Unify pointees; `[*]T` accepts `*[N]X`, `*T` accepts `[*]X` (element with element). Mutability and optionality are not unified |
| `[]P'` | slice, array, pointer to array, array literal type | Unify elements |
| `[N]P'` | array | Unify elements |
| tuple | tuple of the same length | Field by field |
| function type | function type of the same shape | Parameters and results. This is how `sort(xs, by_cost)` can bind `T` from the comparator |
| anything else | anything | Nothing |

Unification only binds. It never reports a structural mismatch: the ordinary `checkExpr` loop that
follows reports `argument 1: cannot assign *Vec(u8) to *Vec(u32)` with the messages the checker has
today, gives every literal its concrete type (`7` becomes `u32` in `push(v, 7)`), registers data for
string and array literals at the instantiated type, and applies the existing coercions.

Structural bindings are definitive and bare-`T` arguments are then merely assignable: `push(v, i)`
with `v: *mut Vec(u64)` and `i: u32` is `T = u64` with a widened second argument, as it would be for
a hand-written `push_u64`. Because the code generator today passes a widened argument unconverted
**(probe v1, checker map)**, calls recorded in the call table get the integer and float widening
that arrow-body results already get (codegen.ts:2552-2561) applied per argument (4.3). If that is
cut, rule 2 of the second row becomes "must be equal" and the user writes `i as u64`.

Explicit type arguments are required when a type parameter appears in no written parameter
(`vec(T, cap)`, `zero(T)`, `sizeof`-style helpers), when it appears only in a position that
unification cannot see (a type function that does not use its parameter in its body), and when the
call's type would have to come from the expected result type (`let x: u64 = zero()` is not inferred;
`inferCall` is not told the expected type and that stays so).

### 2.4 Instantiation: identity, table, names

```
key(instance) = definingModulePath # declarationOffset < comptimeKey(arg_1) | ... > @ env
comptimeKey(type)     = canonicalKey(type)             // alias-free structural rendering; equal iff typeEquals
comptimeKey(function) = modulePath # declarationOffset // identity, not spelling
comptimeKey(value)    = kind : value
env                   = the lookup environment, 2.6; empty for most instances after merging
```

- `canonicalKey` (new, `types.ts`) unwraps every `named`, prints tuples with their field names,
  keeps explicit ranges, and throws on a type that is not concrete (a comptime literal type, a type
  variable), which becomes the error `type argument is not concrete`. `typeToString` is not usable:
  it prints aliases by bare name, merges `void` with the empty tuple and `comptime_array` with
  `array` **(probe, types map)**.
- The table is `ProgramState.memo: Map<string, Instance | TypeValue>`, one per `typecheckProgram`
  run (one per `typecheck` call in single-module mode). `compile` (tests excluded) and `test` (tests
  included) are separate runs, so test-only instances never reach release output.
- Requesting an instance resolves its **signature** at once (the declaration's value parameters and
  results, resolved in a scope that binds the comptime parameters and whose parent is the declaring
  scope), enters it in the table and appends it to `ProgramState.queue`. Its **body** is checked
  when the queue is drained (3.3).
- **wasm name**: the name the declaration would have had (`ident`, `module$ident`,
  `__test_<prefix>_<ident>`), then `<`, the comptime arguments joined by `|`, then `>`:
  `$max<u32>`, `$containers$push<u64>`, `$containers$sort<u32|descending>`,
  `$push<'*'mut.u32>`. Type arguments are `watSafe(canonicalKey)`: `(`→`<`, `)`→`>`, `,`→`|`,
  `[` and `]`→`'`, space→`.`, `->`→`=>` (wabt rejects ``( ) [ ] { } , ; "`` and spaces **(probe,
  codegen map)**). Function arguments are printed by name. `<` cannot occur in a user identifier, so
  no user function can collide; names never reach the binary (`toBinary({})`), so length is free. If
  two distinct keys ever print the same name (two functions of one name from different modules, two
  environments), a numeric suffix `~2` is appended; the naming pass checks uniqueness.

### 2.5 Type functions

```ents
func Vec(comptime T: type) -> type => (ptr: [*]mut T, len: u32, cap: u32)
func Map(comptime K: type, comptime V: type) -> type => (keys: Vec(K), vals: Vec(V))
```

- A type function is a function whose parameters are all comptime and whose result is a type. It is
  evaluated by the checker: its body (a type expression) is resolved in a scope that binds the
  parameters and whose parent is the declaring module's scope. The result is memoised in the same
  table as instances, keyed by (declaration, canonical arguments). Nothing is emitted for it, ever.
- **Applications are structural aliases**, like every type declaration in Encantis today:
  `Vec(u32)` is `named('Vec(u32)', (ptr: [*]mut u32, len: u32, cap: u32))`. The name is for
  messages (`cannot assign *Vec(u8) to *Vec(u32)`); equality and assignability see the structure.
  `Vec(u8)` and `Vec(u32)` are different types because their bodies differ; a hand-written
  `(ptr: [*]mut u32, len: u32, cap: u32)` *is* a `Vec(u32)`. Nominal (distinct) types do not exist
  in the language (the `@Name` syntax does not parse **(probe)**) and this design does not add them.
- **Inference sees through an application by unifying against its expansion** (2.3). No record of
  "this type came from `Vec`" is needed, which matters because `typecheck()` strips every `named`
  wrapper when a module is finished (checker.ts:159-162): a `*mut Vec(u32)` returned by an ordinary
  exported function of another module arrives as a bare tuple and still unifies with `*mut Vec(T)`.
  The cost: a parameter the body does not use cannot be inferred, and must be passed explicitly.
- Where an application may be written: any type position (`v: *mut Vec(T)`, `-> Vec(T)`,
  `x as [*]mut Vec(T)`, `sizeof(Vec(T))`, a field, another type function's body), and as a callee to
  construct a value: `Vec(T)(ptr, 0, cap)` checks its arguments against the fields of the expansion
  exactly as `Point(1, 2)` does.
- Arguments are types only in these PRs (`TypeArg = Type`). Value arguments (`Array(T, 16)`) need
  `[n]T` and are future work.
- A type function that mentions itself (`func List(comptime T: type) -> type => (head: T, next:
  ?*List(T))`) is rejected: `recursive generic type List(u32) is not supported`. Recursive plain
  types are already unreliable (`cannot assign *Node to *Node` **(probe r5)**); making both work
  needs a placeholder in the memo and a fix to forward-reference unfolding, and is not needed by the
  first users.

### 2.6 Requirements: duck typing, overloads, and where a call is looked up

A generic body states no requirements. Whatever it uses must exist for the concrete arguments when
an instance's body is checked:

- **Operators and member access** are checked by the ordinary rules on the concrete types. Today
  `inferBinary`/`inferUnary` validate nothing (`Pt + Pt` and `[]u8 == []u8` pass the checker and
  fail in wabt **(probe y1)**), so PR 1 adds the missing operand checks for aggregates: arithmetic,
  comparison and equality operators require primitive or pointer operands. The error is
  `operator > is not defined for Pt, in max(T = Pt)`.
- **Calls** (`hash(k)`, `eq(a, b)`, `k.hash()`) are resolved by argument type (PR 2):

**Overload sets.** Several functions may share a name in one module (declared there or imported
under that name) if their parameter lists differ in length or in the canonical type of some
parameter. Two functions with the same name and the same parameter types are an error (today the
later silently replaces the earlier in the checker and wabt reports a duplicate **(probes q2,
p29)**, so no working program changes).

**Resolution of `f(args)`**, the same for a plain call and for UFCS with the receiver prepended:

1. Infer each argument's type once (`inferExpr`).
2. Scopes are searched in order: S0, the scope chain of the code being checked, up to and including
   its module; then, only while an instance body is being checked, S1..Sn, the module scopes of the
   *instantiation chain*: the module that asked for this instance, then the module that asked for
   that one, and so on, each once, the defining module excluded.
3. In a scope, a candidate is *applicable* if the argument count fits (either form of 2.2 for a
   generic candidate) and, after inferring a generic candidate's type arguments and instantiating
   its signature, every argument type is assignable to its parameter type. Applicability is a pure
   test on types; it records nothing and reports nothing.
4. The first scope with an applicable candidate decides. One: that is the callee. Several: prefer
   the candidates whose parameter types equal the argument types, then non-generic over generic;
   if that leaves more than one, `ambiguous call to 'eq' for (Cell, Cell)`.
5. No scope has one. If S0 holds exactly one function of that name, check the call against it and
   report its ordinary argument errors: non-overloaded programs get exactly today's messages.
   Otherwise `no function 'eq' accepts (u32, u32)`, with the instance named when inside one.
6. A builtin of that name is used only when no user function of that name is visible. A user
   function therefore takes precedence over a builtin with its name, in the checker and (through
   the call table) in codegen. Today the builtin wins silently and the user function is dead code
   **(probes q1b, p6)**; the owner's own `max` example needs this. PR 1 applies it to generic
   functions (**(spike)**), PR 2 to all functions.

Only the callee of a call is ever looked up in S1..Sn: not types, globals, defs or locals, so a
generic body cannot capture anything from its caller except the functions its types bring along.

```ents
// lib/set.ents                                  // main.ents
export func add(comptime K: type,                type Cell = (q: i32, r: i32)
                s: *mut Set(K), k: K) -> bool {  func hash(c: Cell) -> u32 => ...
  let h = hash(k)      // for K = Cell: not in   func eq(a: Cell, b: Cell) -> bool => ...
  ...                  // set.ents, found in     ...
}                      // main.ents (S1)         cells.add(Cell(1, 2))
```

**The lookup environment is part of an instance's identity.** `env` in the key of 2.4 is the
instantiation chain (a list of module paths). Two modules that instantiate `add` for the same
structural `K` but bring different `hash` functions therefore get two instances, each correct.
After all bodies are checked, one pass over the table marks an instance *open* if its body resolved
a call in S1..Sn or calls an open instance (propagated to a fixpoint over the call records), and
merges all *closed* instances that differ only in `env` into the one created first. Every call
record then points at the representative. Result: everything that does not use the chain (`Vec`,
`sort` with a comparator, `max`, a `Set` whose `hash` lives beside it) exists once per program
whoever asked for it, and only code whose meaning really depends on the asking module is
duplicated. A request for an instance that already exists for another environment, is already checked and is
closed together with everything it calls, reuses it directly and is not checked again, so in the
common case the body of a shared instance is checked once. Two open instances from different modules that happen to resolve to the very same
functions stay separate in these PRs (an exact merge by resolved-callee fingerprint is a later
optimisation; it changes nothing observable but size).

### 2.7 Recursion, and generics calling generics

- A generic body may call any generic, itself included, with any arguments it can form from its own
  bindings. The call is resolved under the instance's bindings (all types are concrete there), the
  child instance is requested, and the call is recorded in the *instance's* call table, so one call
  expression can reach a different callee in each instance.
- Direct and mutual recursion terminate because an instance is in the table before its body is
  checked.
- Polymorphic recursion (`deep(T)` calling `deep((T, T))`) is stopped by two limits: a requested
  instance records `depth = requester.depth + 1` and depth 64 is an error; so is a canonical key
  longer than 1,024 characters. The message is `instantiating deep: too many nested instantiations`
  with the type printed to at most 60 characters (the spike printed the whole type: four kilobytes
  of parentheses) **(spike)**.

### 2.8 Constants, `sizeof`, data literals and asserts in a generic body

- `sizeof(T)`, `sizeof(Vec(T))`, `sizeof((bool, u32, K))` are evaluated by the checker for each
  instance and recorded in the instance's `consts` table; codegen emits the recorded constant
  **(spike)**. Codegen's own re-resolution of the type, with its silent `i32` fallback
  (codegen.ts:1838-1888), is removed.
- A data literal in a generic body (`"hello"`, `[1, 2, 3]`, `[0:T; 8]`, `mut [0:T; 4]`) belongs to
  the instance: its serialisation type is recorded in the instance's map and its bytes are placed
  per instance. Identical immutable bytes are deduplicated by the data builder as today, so a
  string costs nothing extra; a literal whose bytes depend on `T` gets the right bytes for each
  instance; a `mut` literal is one static cell per instance, exactly what the hand-specialised
  source would have.
- `assert` inside an instance is the bare `unreachable` it is inside any function.
- A generic may be declared inside a `test` block; it is collected there and its instances are
  named and emitted with the test **(spike)**.

### 2.9 Modules

```ents
import "../lib/vec" (
  "Vec"  func Vec(comptime T: type) -> type
  "vec"  func vec(comptime T: type, cap: u32) -> *mut Vec(T)
  "push" func push(comptime T: type, v: *mut Vec(T), x: T)
)
```

- `export` on a generic function or a type function means "importable". It never produces a wasm
  export, also when the module is the entry: a library file compiles alone to a module with no
  functions. Exporting it under an explicit name (`export "push" func ...`) works the same way.
- An import restates the signature, as imports of ordinary functions do; in a program check the
  exporter's symbol is used (the existing rule, checker.ts:527) and carries its generic
  declaration, its declaring scope and its owning checker context.
- **An instance belongs to the module that declares the generic.** Its body is checked in that
  module's context (that module's names, that module's error list and source for positions) and its
  code is emitted with that module's functions under that module's name prefix, whichever module
  asked for it **(spike)**.
- An instance body error is reported once, at its position in the declaring module, as
  `cannot assign int(0) to f64, in total(T = f64)`, with a related location naming the first call
  that asked for the instance. When that call is in another module, the calling module also gets
  one error at the call: `total(T = f64) cannot be instantiated: cannot assign int(0) to f64
  (lib.ents:5:16)`, so the diagnostic is visible in the file the user is editing.

### 2.10 Not supported in the first version, and the error for each

| Not supported | What the user sees |
|---|---|
| `comptime` in a struct type, result, enum payload, function type; `t: type` without `comptime`; `let t: type`; a lower-case type parameter | Parse error (the grammar has no rule for it) |
| A block body for a type function; value arguments to a type function | Parse error: `Expected "=>"`; `Vec(4)` fails in `TypeArg` |
| Some type arguments written, others inferred | `push expects 2 arguments (or 3 with its type argument), got ...` |
| A type parameter that cannot be inferred, including inference from the expected result type | `cannot infer T for zero: pass it explicitly, as zero(T, ...)` |
| Arguments that disagree | `T is u32 from argument 1 and f64 from argument 2` |
| A value where a type is required | `argument 1 of size must be a type known at compile time` |
| A type where a value is required (`f([]u8)` for a runtime parameter; `let t = u32`) | `a type is not a value: types can only be passed for comptime parameters` |
| A comptime function argument that is not a function name, or names a generic function | `argument 3 of sort must be a function known at compile time` |
| A function-typed *runtime* parameter that is called | New checker error replacing today's invalid wasm **(probe t3)**: `'before' is a runtime function value and cannot be called: declare it comptime` |
| A generic function used as a value (`let f = max`) | `'max' is generic: call it, or pass a non-generic function` |
| `comptime n: u32` before PR 4 | `comptime value parameters are not supported yet` |
| A type function without arguments, with the wrong number, or a non-generic type applied | `'Vec' is a generic type: give it type arguments`; `Vec expects 1 type argument, got 2`; `'Point' is not a generic type` |
| A recursive type function | `recursive generic type List(u32) is not supported` |
| Unbounded instantiation | `instantiating deep: too many nested instantiations` |
| An operator or call the concrete type does not have | `operator > is not defined for Pt, in max(T = Pt)`; `no function 'eq' accepts (u32, u32), in index_of(T = u32)` |
| Two functions with the same name and parameter types | `function 'hash' is already declared for ([]u32)` |
| A by-value receiver for a pointer parameter | `push takes *mut Vec(u32) first: 'v' is held in registers and has no address` |
| A wasm export of a generic | None: the export is importable by other modules and emits nothing |
| Default values for comptime parameters, named type arguments, lambdas as comptime arguments, specialisation ("this body for `T = bool`"), `[n]T` with a comptime length | Not parsed |

---

## 3. Checker changes

### 3.1 Data structures

```ts
// types.ts:51-64. Two new kinds; typeEquals (446-512) and typeToString (899-975) are exhaustive, tsc enforces both.
| { kind: 'typevar'; name: string }   // a type parameter inside a generic's declared signature; never in an instance
| { kind: 'type' }                    // the type of a `comptime T: type` parameter, in declared signatures only
// new helpers in types.ts: mentionsTypeVar(t), unify(pattern, actual, bindings, literals, from, depth),
//                          canonicalKey(t), watSafe(key)

// checker.ts:50-54
type ComptimeValue = { kind: 'int' | 'float' | 'bool' | 'data_ptr'; ... }      // today
                   | { kind: 'type'; type: ResolvedType }                      // PR 1
                   | { kind: 'func'; ref: FuncRef }                            // PR 1

// A function by identity, usable from any module's codegen.
interface FuncRef { module: string; name: string; decl: AST.FuncDecl | null; sym: Symbol & { kind: 'func' } }

// checker.ts:56-63
type Symbol =
  | { kind: 'type'; type; unique; param?: boolean }
  | { kind: 'func'; type: FuncRT; inline; ref: FuncRef; generic?: GenericInfo }
  | { kind: 'overloads'; type: FuncRT; funcs: (Symbol & { kind: 'func' })[] }            // PR 2
  | { kind: 'typefunc'; type: FuncRT /* (T: type) -> type, for display */; decl: AST.TypeFuncDecl | null;
      declScope: Scope; owner: CheckContext }
  | global | def | local | param | return                                                 // unchanged

interface GenericInfo {
  decl: AST.FuncDecl                 // the one AST every instance shares
  hasBody: boolean                   // false for a restated import in single-module mode
  params: { name: string; index: number; kind: 'type' | 'func' | 'value' | 'runtime' }[]
  declared: FuncRT                   // all parameters, type parameters as typevars: unification and hover
  declScope: Scope                   // module scope, or the test scope it was declared in
  owner: CheckContext                // the declaring module's context, kept alive by this reference
}

interface ProgramState {             // one per typecheckProgram run (or per single-module typecheck)
  memo: Map<string, Instance | { kind: 'type'; type: ResolvedType }>
  queue: Instance[]
  contexts: Map<string, CheckContext>
}

interface Instance {
  key: string; display: string       // "push(T = u32)", "sort(T = u32, before = descending)"
  generic: GenericInfo
  args: ComptimeValue[]              // in comptime-parameter order
  bindings: Map<string, Symbol>      // parameter name -> the symbol it is bound to (2.1)
  env: string[]                      // lookup environment: module paths of the instantiation chain
  sig: FuncRT                        // runtime parameters and results, names kept, for the checker
  wasmSig: FuncRT                    // sig after concretizeType, for codegen
  types: Map<string, ResolvedType>   // what this.types is while the body is checked
  calls: Map<number, CallTarget>
  consts: Map<number, ComptimeValue>
  literals: PendingLiteral[]
  site: { module: string; offset: number }; depth: number
  state: 'signature' | 'queued' | 'checked'
  open: boolean                      // resolved a call through the lookup environment
  canonical: Instance                // the representative after merging (2.6); itself by default
}

type CallTarget =                    // keyed by CallExpr span.end
  | { kind: 'instance'; instance: Instance; plan: ArgPlan }
  | { kind: 'func'; ref: FuncRef; plan: ArgPlan }               // PR 2: UFCS, overloads, user-before-builtin
  | { kind: 'construct'; type: ResolvedType }                   // Vec(T)(...)
interface ArgPlan {
  receiver: boolean                  // UFCS: expr.callee.object supplies the first runtime parameter
  runtime: number[]                  // for each remaining runtime parameter, the index into expr.args
  params: ResolvedType[]             // instantiated runtime parameter types, for argument coercions
}

// checker.ts:88-91
interface TypeError { offset: number; message: string; related?: { module?: string; offset: number; message: string }[] }

// checker.ts:100-117, added to TypeCheckResult
instances: Instance[]                // owned by this module, in creation order (representatives and merged alike)
calls: Map<number, CallTarget>
consts: Map<number, ComptimeValue>
typeNames: Map<string, string>       // canonicalKey -> "Vec(u32)", for hover (5.2)
```

`FuncRT`, `ResolvedField` and `NamedRT` gain nothing: `resolveForwardRefsInType`
(checker.ts:616-652) rebuilds types with the constructors and would drop extra properties. All
generic metadata lives on the `Symbol`.

### 3.2 What happens to each existing table

| Table | Today | With generics |
|---|---|---|
| `types` (`"offset:kind"`) | one per module; codegen's and meta's source of truth | The module's map holds what it holds today, plus `Field` entries for a generic declaration's value parameters with their declared (typevar) types, for hover. **Nothing of a generic body is ever written to it.** Each instance has its own map, which *is* `this.types` while its body is checked, because the checker reads its map back (checker.ts:1095, 1226, 2910, 3021, 3087, 3293) |
| `moduleScope.symbols` | one symbol per name, last wins | New kinds `typefunc`, `overloads`; `func` symbols carry `ref` and optionally `generic` |
| `symbolDefOffsets`, `references`, `symbolRefs` (keyed by name, last definition wins) | filled by every body check | Describe declarations only. While `currentInstance` is set, `recordDefinition` is a no-op and `recordReference` only marks the target used (`markUsed`, below). A call to a generic records a reference to the generic at the call site, so rename and "never used" keep working |
| `pendingLiterals` and `id:'DataTarget'` entries | one list per module, ids are bare offsets | Per owner: the module's list, and `Instance.literals` with the `DataTarget` entry in the instance's map. `addLiteral` de-duplicates by id within an owner (it is called twice for an argument that is inferred, then checked) |
| `errors`, `warnings` | de-duplicated on (offset, message) | Instance context appended to the message (`, in push(T = Cell)`) and a `related` location; an instance's errors go to the declaring module's list. Unused warnings are computed after the whole program is checked, because a function may be used only by an instance requested from a later module |
| `narrowings`, `loopDepth`, `deferLoopDepth`, `insideIfLetCondition`, `currentReturnType`, `currentScope` | belong to the function being checked; only the last two are saved by `checkFuncBody` | Untouched, because instance bodies are checked from the queue while the checker is at rest. `checkInstanceBody` asserts they are at rest and resets them anyway |
| `typeCache` (written, never read) | dead | Removed |
| new: `calls`, `consts`, `instances` | | Swapped with `types` per instance |

### 3.3 Passes

`typecheckProgram` (checker.ts:237-273) creates one `ProgramState` and passes it to every module's
check; a single-module `typecheck` creates its own. `typecheck` (150-211) is split into
`checkModuleInto(ctx)` and `finalize(ctx)`; the program driver finalizes every module after the
last one is checked, so that instance tables, signatures, errors and unused warnings that arrive
late (an instance of module A requested while checking module B) are included. `allErrors` is
collected then, not at line 267.

| Pass | Function (v0.2.1 lines) | Change |
|---|---|---|
| 0. Pre-register | `preRegisterTypes` (463-467) | Also registers every `TypeFuncDecl` (top level or exported) as a `typefunc` symbol, so signatures collected in pass 1 can apply it before its declaration **(spike)** |
| 1. Collect | `collectFunc` (572-583) | Before `resolveSignature` (574): if any input field is `comptime`, build `GenericInfo`, resolve the declared signature in a scope that binds each type parameter to a `typevar`, store `{ kind: 'func', type: declared, generic, ref }`, write `Field` entries for value parameters, and stop. Otherwise as today, plus `ref`. PR 2: a second function of the same name turns the symbol into `overloads` (error if the parameter keys are equal) |
| | `collectImport` (501-555) | Source import in a program check: copies the exporter's symbol including `generic` and `ref` (527) **(spike)**. `ImportTypeFunc` copies the exporter's `typefunc` symbol. Single-module mode: a restated signature with comptime parameters becomes a `GenericInfo` with `hasBody: false`; a restated type function has `decl: null` (5.4). PR 2: importing under a local name that already holds a function forms an overload set |
| | `getExportedSymbols` (216-230) | Exports `typefunc` symbols and generic `func` symbols like any function |
| | `collectDef`, `collectData`, `collectGlobal` | Unchanged. A generic called from an initializer is instantiated at signature level there and its body is queued; the signature sees the symbols collected so far, the limitation initializers already have **(probe r2)** |
| 2. Forward refs | `resolveForwardRefs` (598-653) | Skips `typefunc` and generic symbols; drops the type-function applications memoised during pass 1 for this module, which may hold `forward_ref`s **(spike)** |
| 3. Bodies | `checkDeclaration` (1158-1175), `checkTestDecl` (1177-1205) | Skip the body of a generic declaration; skip `warnManyPointerParams` (1254-1266) for it |
| 4. Instances | new `drainInstances()`, called at the end of `checkModule` (442-460) | `while (queue.length) { const i = queue.shift(); i.generic.owner.checkInstanceBody(i) }`. Bodies request more instances; the loop closes the set. Instances declared by an earlier module are checked in that module's context, which is alive through `GenericInfo.owner` |
| 5. Finalize | `finalize(ctx)`, from `typecheck()`'s tail (159-199) | Concretize the module map as today; for every instance concretize `types`, compute `wasmSig`; run the open/closed merge of 2.6 over `ProgramState.memo` (program driver, once); then unused warnings, consulting `used` marks |

### 3.4 `checkInstanceBody(inst)` (new; the instance entry point)

```ts
checkInstanceBody(inst) {
  if (!inst.generic.hasBody) return                        // signature-only import (editor)
  save { types, calls, consts, pendingLiterals, currentScope, currentReturnType, currentInstance }
  this.types = inst.types; this.calls = inst.calls; this.consts = inst.consts
  this.pendingLiterals = inst.literals
  this.currentScope = { parent: inst.generic.declScope, symbols: inst.bindings }   // never the caller's scope
  this.currentInstance = inst                              // error suffix, silenced definitions, lookup environment
  this.loopDepth = this.deferLoopDepth = 0; this.insideIfLetCondition = false; this.narrowings.clear()
  this.checkFuncBody(inst.generic.decl)                    // the ordinary function, unchanged
  inst.state = 'checked'
  restore
}
```

The scope parent is the declaring scope, so the no-shadowing rule (`bindPattern`, 1528-1531) sees
only the generic's own module: a local `at` in `add` cannot clash with a global `at` of the kernel
that instantiates it (the kernels have globals named `n`, `len`, `at`, `off`, `mask`, `table`,
`count`).

Changes inside functions the body check uses:

| Function | Change |
|---|---|
| `checkFuncBody` (1268-1297) | None in logic. `currentReturnType` comes from `resolveType(decl.signature.output)` (1280), which now resolves under the bindings |
| `bindFields` (1299-1310) | Skips `comptime` fields (they are in `inst.bindings`) **(spike)** |
| `resolveType` (1752-1838) | `TypeRef`: `this.lookup(name)` through the scope chain instead of `moduleScope.symbols.get` (1816); a `param` type symbol returns its bound type without a `named` wrapper. New cases: `TypeApply` calls `applyTypeFunc`; `TypeType` returns `{ kind: 'type' }` **(spike)** |
| new `applyTypeFunc(name, args, offset)` | 2.5: lookup, arity, memo by canonical arguments (only when no argument mentions a typevar), depth guard, recursion guard, evaluate the body in `{ parent: sym.declScope, symbols: params }` on the *owner's* context, wrap in `named(display, body)`, record `typeNames` **(spike, minus the recursion guard)** |
| new `evalTypeExpr(expr)` | Reads an expression as a type: `TypeExpr`; `IdentExpr` (scope symbol of kind `type`, else primitive name; a value symbol is an error); `GroupExpr`; `TupleExpr` of types (named or positional); `CallExpr` whose callee names a `typefunc`. Returns null otherwise. This is the comptime evaluator restricted to type values; `evalComptimeExpr` (1026-1122) gains the same `{ kind: 'type' }` case in PR 4 and the two merge **(spike)** |
| `inferCall` (2312-2393) | New first step `resolveCallee(expr)`: PR 1 dispatches a generic callee to `inferGenericCall` and a `typefunc`-headed callee (`Vec(T)(...)`) to the constructor path (2368-2389, factored out) before the builtin test at 2314 **(spike)**. PR 2 replaces the head of the function with the full resolution of 2.6 (UFCS receiver, overloads, lookup environment, user before builtin) and records a `CallTarget` for every call that resolves to a user function |
| new `inferGenericCall(expr, sym, receiver?)` | 2.2-2.4: split arguments by count; `evalTypeExpr` for explicit type arguments; `inferExpr` + `unify` for inferred ones; bind comptime function arguments (`lookup`, must be a non-generic `func`, or a bound comptime function parameter; `typeEquals` against the instantiated parameter type); `instantiate`; the existing argument loop (2345-2352) against the instantiated parameter types; `this.calls.set(expr.span.end, ...)`; record the instance signature at the callee identifier's `IdentExpr` key (hover); return the result type as 2355-2362 does **(spike)** |
| new `instantiate(generic, args, site)` | Compute the key (with `env` from `currentInstance` and the current module); memo hit returns it; limits of 2.7; resolve `sig` in the binding scope on the owner's context; create the `Instance`, push it on `owner.instances` and on the queue **(spike, without `env`)** |
| `inferIdent` (2282-2310) | `typefunc`: error `'Vec' is a generic type: give it type arguments`. A generic `func` used as a value: error. `TypeExpr` reaching `inferExprInner`: `a type is not a value` **(spike)** |
| `inferMember` (2703-2787) | PR 2: the field search (2713-2784) is factored into `findField(objType, name)`, which returns undefined instead of reporting, so the UFCS path can ask first |
| `inferBinary`, `inferUnary` (2578-2701) | Operand validation for aggregates (2.6) |
| `inferSizeof` (3314-3322) | Records `this.consts.set(expr.span.start, { kind: 'int', value: size })` **(spike)** |
| `exprTypeOffset` (82-84) | PR 2: `CallExpr` joins the `span.end` kinds, because UFCS chains and `Vec(T)(...)` put two calls at one start offset. The call table is keyed by `span.end` from PR 1 |
| `inferBody` (3285-3298) | Uses `exprTypeOffset` at 3293. Existing bug (`let z = if c { p.x } else { p.y }` is typed `()` **(probe z1)**) that generic bodies written with inferred `if` hit at once |
| `error`, `warn` (3450-3460) | Inside an instance: append `, in <display>` and attach `related`; when `inst.site.module` differs from the owner, also report once at the site (2.9) |
| `recordDefinition`, `recordReference` (3471-3486) | Inside an instance: no-op, except that a reference to a module-level symbol calls `markUsed(module, defOffset)` on the context that owns it |
| `addLiteral` (437-440) | De-duplicate by id; writes to the current owner's list and map |

### 3.5 Why the body check itself does not change

Everything a body check writes goes through `this.types`, `this.calls`, `this.consts` and
`this.pendingLiterals`; everything it resolves goes through `this.lookup` and `resolveType`.
Swapping the first four and binding the comptime parameters in the scope is therefore the whole
mechanism. The 34 `types` write sites, the six read-backs, bidirectional checking, literal typing,
range narrowing, `defer` rules and return checking are used as they are. **(spike)**: the diff does
not touch `checkStmt`, `checkExpr`, `inferBinary`, `inferMember`, `inferIndex` or any statement
logic, and the existing 667 tests pass unchanged.

---

## 4. Codegen changes

Codegen never infers a type; it reads `ctx.types` at about 70 sites. `funcToWat(decl, checkResult,
literalRefs, nameMap, watName, extraSymbols, dataSectionSize)` (codegen.ts:2462-2591) takes
everything it needs as arguments and builds its own context. So an instance is emitted by calling
the unmodified `funcToWat` on the generic's AST with a *view* of the check result.

### 4.1 The instance view (new `instanceView(result, inst)`)

| Piece | Value for an instance | Why |
|---|---|---|
| `types`, `calls`, `consts` | the instance's own | every type-dependent decision; one call expression reaches a different callee per instance |
| `symbols` | a **copy** of the declaring module's symbols, plus `decl.ident -> { kind: 'func', type: inst.wasmSig }` and every entry of `inst.bindings` | 2478-2481 looks the signature up by name and emits one wasm parameter per entry, so the signature must hold runtime parameters only; a bound type makes `T(...)` a constructor (931); a bound value is inlined as a constant (342-350). A copy, because 2472-2474 and 3020 write into the map |
| `nameMap` | the declaring module's full map, plus `parameterName -> watNameOf(boundFunction)` for each comptime function parameter | a body's calls to its own module's helpers keep that module's prefix; `before(a, b)` becomes a direct `(call $by_cost ...)` |
| `literalRefs` | the declaring module's refs overlaid with the instance's (4.5) | |
| `watName` | assigned by the naming pass (4.2) | |

**(spike)** `instanceView` and `instanceNameMap` are 20 lines; `funcToWat` is not edited.

### 4.2 Names: `watNameOf`

`programToWat` already builds `perModuleNameMap` (3301-3324) before generating anything. Directly
after it, a naming pass gives every *representative* instance (`inst.canonical === inst`) its name:
base name from its declaring module's map, suffix from 2.4, uniqueness checked across the program.
A closure `watNameOf(target)` is put in the codegen context:

- for an `Instance`: the name of `inst.canonical`;
- for a `FuncRef`: `perModuleNameMap.get(ref.module).get(ref.name)` (plus the overload suffix in
  PR 2: an overloaded function is `name<paramKeys>`; a function that is not overloaded keeps
  exactly today's name, so existing output does not change).

Every recorded call and every comptime function binding is emitted through `watNameOf`, never
through the name map of the module being generated. This is what makes a callee from a third
module correct: the spike used the generating module's map and emitted `(call $inc ...)` for a
comparator that lives in `keys.ents` (`$keys$inc`), which wabt rejects **(spike)**. `moduleToWat`
(single module, tests only) uses the identity closure.

### 4.3 `callToWat` (codegen.ts:901-981)

```ts
function callToWat(expr, ctx) {
  const target = ctx.calls?.get(expr.span.end)            // first: before the callee-kind test at 904
  if (target) return resolvedCallToWat(expr, target, ctx) // and before the builtin test at 912
  ... today's chain, now reached only by builtins, casts, plain constructors and (until PR 2) plain calls
}
```

`resolvedCallToWat`:

- `construct`: the field-ordering code of 931-945, factored out, applied to the recorded type.
- `instance` / `func`: `(call $<watNameOf(target)> ...)` with, in order, the receiver
  (`exprToWat(expr.callee.object)`) when `plan.receiver`, then `expr.args[i]` for each `i` of
  `plan.runtime`. Comptime arguments are simply absent from the plan and never reach `exprToWat`.
- Per argument, coercion against `plan.params[k]`: the existing array-to-slice length push (962-975,
  but reading the argument's type with `lookupExprType`, not at `span.start`, 965), and new: integer
  and float widening (`i64.extend_i32_u/s`, `f64.promote_f32`), the conversion arrow-body results
  already get (2552-2561). Today a widened argument is passed unconverted and fails validation
  **(probe v1)**.

Loud failures replace silent ones on the paths the new plumbing can hit: `identToWat` on an unknown
identifier (369-370, returns `(i32.const 0)` today), a missing literal ref (313, 364, 1784: address
0 today), `exprToWat` on a `TypeExpr`, and a non-identifier callee without a call record (904-909:
a `call_indirect` stub today) all throw. `typeToWasm` already throws on an unknown kind, which is
what a leaked `typevar` would hit.

When PR 2 moves `CallExpr` type keys to `span.end`, the direct `span.start` lookups of a value that
can be a call move with it: codegen.ts 842, 862, 965, 2063, 2093, 2555 (use `lookupExprType`,
498-502). **(spike)**: changing only `exprTypeOffset` fails `types/positional-destructuring.ents` at
2063. `collectLocals`' `CallExpr` case (2845-2849) additionally visits `expr.callee` (a UFCS
receiver can need scratch locals) and no walker descends into a `TypeExpr`.

### 4.4 Emission: once per instance, nothing for an unused generic

There are three loops that emit "every `FuncDecl`": `moduleToWat` (2935-2942), `programToWat`
(3426-3441) and `emitTestDecl` (3033-3039). They are replaced by one helper so they cannot drift:

```ts
function emitFunctions(decls, result, nameMap, refs, parts, ctx) {
  for (const decl of funcDeclsOf(decls))                       // FuncDecl and ExportDecl(FuncDecl)
    if (!isGeneric(decl, result)) parts.push(funcToWat(decl, viewFor(decl, result), refs.module, nameMap, nameFor(decl), ...))
}
function emitInstances(result, nameMap, refs, parts, ctx) {    // after the module's functions
  for (const inst of result.instances)
    if (inst.canonical === inst && inst.state === 'checked')
      parts.push(funcToWat(inst.generic.decl, instanceView(result, inst), refs.of(inst), instanceNameMap(nameMap, inst), ctx.watNameOf(inst), ...))
}
```

- A generic declaration is skipped by the loop; a type function is not a `FuncDecl` at all. The only
  source of generic code is `result.instances`. A generic nobody calls has no instance, so codegen
  never looks at it: no function, no data, no memory. Test: the WAT of a module with an unused
  generic equals the WAT of the module without it **(spike)**.
- An instance is emitted once, with the module that declares the generic, however many modules and
  call sites asked for it; merged duplicates (2.6) are skipped by `inst.canonical === inst`.
- Instances are pushed before the wide-integer helper scan (2970-2973, 3495-3498), which works on
  the module text, so helpers an instance needs are generated.
- `exportToWat` (3177-3185) and the export loop (3459-3470) skip generic functions and type
  functions; `usesMemory` (2994-3000) also looks at instance maps **(spike)**.
- An instance's parameter list is `wasmSig.params` flattened: comptime arguments leave no trace in
  the signature, at the call site, or in the body.

### 4.5 Data literals: owners instead of bare offsets

`buildDataSection` (data-pack.ts:1014-1040) takes a list of owners, `{ literals, types }[]`, one
per module and one per representative instance, and returns one data builder and one ref map per
owner. `programToWat` (3285-3298) stops merging every module's types into `allTypes`. A module's
functions get the module's map; an instance gets the module's map overlaid with its own. The lookup
sites in codegen (`ctx.literalRefs.get(expr.dataId ?? expr.span.start)`, about ten) do not change.
This fixes, with the same change, the existing bug that two modules with a literal at the same
offset share one address **(probe mm2, codegen map)**, and it is what makes a `[0:T; 8]` literal
correct per instance. Identical immutable bytes are still interned once by the builder.

### 4.6 `sizeof`

`sizeofToWat` (1838-1848) emits `ctx.consts.get(expr.span.start)` **(spike)** and throws if there is
none. `resolveTypeFromAST` (1852-1888) loses its only caller's fallback use; its `i32` defaults
become throws.

### 4.7 What "zero cost" is measured against

The reference is the generic source with the type written in and the comptime parameter removed,
compiled by the same compiler. The codegen map did this outside the compiler for 5 types and 6
container functions and found the instances identical as canonicalised WAT (30 of 30) and as raw
code-section bytes **(probe poc-instances, poc-binary)**; the spike's test does it inside the
compiler for `max`. It is not measured against the kernels' present hand-written sets, which keep
their state in globals where a `*Set(K)` loads from memory: that is a difference between two
programs, not a cost of generics.

### 4.8 Aggregates in memory (PR 3; not generics, but under every container)

`Vec(T)`, `Set(K)`, `Map(K, V)` and a sort over structs need code generation that is wrong today,
independently of generics **(probes: codegen map 4.3-4.5, use-case map B1-B5, B13, B14)**:

| Today | Change |
|---|---|
| A struct, tuple or `[N]T` loaded from or stored to memory is one load/store of the first field (invalid wasm, or a silent 4-byte copy in `dst[i] = src[i]`) | `loadFromMemory`/`storeToMemory` (433-475) go field by field at `fieldByteOffset`, with the address in a scratch local declared by `collectLocals` so an index expression is evaluated once |
| `bool` is 1 byte in layouts and 4 bytes in loads and stores | `i32.load8_u` / `i32.store8` |
| `v.len` through `v: *Vec` reads the pointer; the write names an undeclared local. `r.*.size.y`, `rs[i].size.y`, `t[k].2` read the wrong offset and their writes emit nothing | One recursive `placeAddress(expr)` replacing `lvalueAddressOf` (983-1008): `X.*`, `X[i]`, `place.field`, `place.N`, and `X.field` where `X` has pointer type (automatic dereference). Used by `memberToWat` (1130-1147) and `assignLvalue` (2201-2225); their fallbacks (1146-1147 returns the object, 2268 returns `''`) become throws. `fieldByteOffset` (types.ts:1124-1142) learns positional fields |
| `&e[i]` and `&e[i].f` on a many-pointer load the element | `addressOfIndexToWat` (1387-1408) uses `placeAddress` |
| `&local` passes the value | Checker error: `'v' is held in registers and has no address` |
| `if c { f() } else { x = 1 }` with a value-returning `f` is invalid wasm | The statement form drops branch values |

---

## 5. Tooling

### 5.1 Formatter and syntax highlighting

The formatter is token based and already prints every new form stably **(probe, syntax map)**:
`func Vec(comptime T:type) -> type => (ptr:[*]mut T, len:u32, cap:u32)`, `v:*mut Vec(T)`,
`f(*mut T, x)`. It never puts a space between a name and `(`, so it cannot break the lexical
`Vec(` rule. Changes: `'comptime'` in `KEYWORDS` (formatter.ts:161-167);
`packages/extension/encantis.tmlanguage.json:132` gets `comptime` (upper-case names are already
coloured as types). A first `formatter.test.ts` pins the generic forms (idempotence on a file with
every new construct).

### 5.2 `meta.ts`, `queries.ts`: hover, definition, outline

The editor's tables describe declarations; instances never write them (3.2). The minimum:

| Reader | Change | Evidence |
|---|---|---|
| anything that reads `sym.type` by name (`queries.ts:99` hover, `meta.ts` `addSymbol`, `serve.ts:457`) | Every `Symbol` variant has a `type`. A `typefunc` symbol's is the function type `(T: type) -> type` | **(spike)** `encantis hover` on `Vec` crashes in `typeToString(undefined)` without it |
| `meta.ts` `collectDeclaration` (210-240), `generateHintsForDecl` (661-694), `queries.ts` `documentSymbols` (201-288) | A `TypeFuncDecl` case: outline entry and a symbol of kind `type` | switches have no default, so it is skipped silently otherwise |
| `meta.ts` `collectFunc` (311-340) | Works as is: a generic is a `func` symbol whose `type` is the declared signature. Hover shows `func max: func(T: type, a: T, b: T) -> T`. Its value parameters get `Field` entries with their declared types (3.3) so that they hover as `v: *mut Vec(T)` | **(spike)** `hover`, `definition`, `symbols` and `meta` work on a generic's name and on calls of it; parameters show "No info" there because the spike writes no `Field` entries |
| hover on a call of a generic | Shows the declared signature (the by-name lookup wins). Improvement in PR 2: when the symbol is generic, prefer the `IdentExpr` entry at the hovered offset, which holds the instance signature (`func(a: f64, b: f64) -> f64`) | **(spike)** the entry is recorded |
| hover inside a generic body | "No info": a generic body has no declaration-level types. Not an error | **(spike)** |
| `typeCostAnnotation` (`queries.ts:350-366`) | Returns nothing for a type that mentions a `typevar` or is `type` (`typeToWasm` would throw) | types map |
| `generateHintsForTypeExpr` (`meta.ts:1164-1188`), `generateHintsForExpr` (886-1162) | A `TypeApply` case (hint on the head, recurse into arguments) and a `TypeExpr` case | if-chains, silently skipped otherwise |
| hover on a value of an applied type | Shows the expansion, because `typecheck()` strips `named` wrappers. PR 2 improvement: `typeToString(t, { names: result.typeNames })` prints `Vec(u32)` for any tuple whose canonical key is a memoised application. No change to codegen's 59 direct `kind` tests | **(spike)** `v` hovers as `*(ptr: [*]mut u8, len: u32, cap: u32)` |
| rename and references of a type parameter | Not offered (no definition is recorded for `T`): a body's uses are not in the declaration tables, and a partial rename is worse than none | |
| unused-function fade (`serve.ts:293` matches `'is never used'`) | Functions used only from instance bodies are marked used (3.2) | types map risk |
| diagnostics | `MetaError` carries `related`; the server maps it to related information (`serve.ts:274-305`) | |
| `formatSymbolDisplay` (`serve.ts:83`) | Splits a signature at the first `->`; a comparator parameter garbles it. Split at the last `->` outside parentheses | types map |

### 5.3 CLI

- `check`, `compile`, `wasm`, `run`, `test` already use `loadModule` + `typecheckProgram` +
  `programToWat`. They need: the error gate computed after all modules are finalized (3.3), and one
  shared error printer instead of four copies (cli.ts:193-199, 262-267, 460-465, 545-550) that also
  prints `related` (`    instantiated at main.ents:12:5`).
- `test` checks and generates with `includeTests: true` throughout, `compile` with `false`; the
  instance set is computed per run, so nothing needs to be cached or filtered. Generics declared in
  test blocks and instances requested only by tests work **(spike)**.
- `meta`, `hover`, `definition`, `references`, `symbols`, `signature`, `rename` check one module
  (cli.ts:329, 406). When the file has source imports they switch to `loadModule` +
  `typecheckProgram` and hand the entry's result to `buildMeta(module, source, { checkResult })`.

### 5.4 Language server

The server (`packages/extension/src/server/serve.ts`) calls `parse`, `buildMeta` and the formatter
on one file. Three cases:

1. A file that declares and uses its own generics: single-module `typecheck` does everything,
   instance bodies included. Correct with no server change.
2. A file that imports generics, desktop (Node) mode: the server passes `buildMeta` a `readFile`
   callback (open documents first, then disk); `buildMeta` loads the imports and checks the
   program. `loader.ts` gets an injectable reader for this.
3. A file that imports generics where imports cannot be loaded (WebWorker mode, missing file):
   single-module mode. An imported generic function is checked at signature level only (its
   restated signature gives inference and result types; `hasBody: false`, so no body errors and
   no "cannot instantiate"). An imported type function has no body to expand, so type diagnostics
   for that file are suppressed and one informational diagnostic says imported generic types are
   not resolved in this environment. Parse errors, formatting, tokens and hover of local
   declarations keep working. No false errors is the requirement; this is the smallest thing that
   meets it.

---

## 6. Tests and docs

### 6.1 What runs what today (from the tests map)

Only `spec/*.md` is executed as spec tests, and only through parse plus single-module `typecheck`
(spec/spec.test.ts:67-113). The 120 `ents` blocks of `docs/encantis.md` are not run (23 would pass
as modules). Runtime behaviour is tested by inline `test` blocks in `examples/**/*.ents` and
`lib/*.ents` (examples/examples.test.ts). WAT shape is tested in `codegen.test.ts`. A spec block can
therefore pass while the program produces invalid wasm, which matters here because many of the
blockers are "checks, then fails in wabt".

### 6.2 New tests

| Where | What | PR |
|---|---|---|
| `packages/compiler/generics.test.ts` (new) | Zero cost, as assertions on generated WAT. Already written and passing in the spike: an uninstantiated generic emits nothing; one function per distinct argument set, repeats shared; an instance's text equals the hand-written function's; two comparators give two `sort` instances with direct calls and no `call_indirect`, `(table`, `funcref`, `ref.func`, `(elem`; a type argument changes load widths and `sizeof` constants. To add: an instance's code-section bytes equal the hand-specialised module's (the `wasm-bodies.ts` reader from the codegen probes moves into `test-utils.ts`); the parameter list equals the runtime parameters; a module-wide function count for a two-module program (one copy per instance) | 1 |
| `packages/compiler/types.test.ts` | `unify` (each row of the table in 2.3), `canonicalKey` (alias-free, `void` vs `()`, injective on the 37 types of the tooling probe), `watSafe` accepted by wabt | 1 |
| `packages/compiler/checker.test.ts` | Instance tables: the module map has no entry inside a generic body; two instances have different entries at the same offset; `symbolDefOffsets` and `references` are unchanged by instance checks (a caller's local named like a generic's parameter keeps its definition); a global named like a generic's local is not an error; instance signatures | 1 |
| `packages/compiler/loader.test.ts` + `tests/fixtures/modular/` | A generic library fixture: instances named `$lib$push<u32>`, emitted once for two importers; a comparator from a third module is called by its mangled name; a body error is in the library's result with a related location | 1 |
| `packages/compiler/encantis-actions.test.ts` | The committed grammar bundle equals a freshly generated recipe | 1 |
| `packages/compiler/formatter.test.ts` (new) | Idempotence on the new syntax | 1 |
| `packages/compiler/queries.test.ts`, `meta.test.ts` | Hover on a generic, on a type function, on a call; outline; no throw for typevar-typed entries | 1 |
| `spec/generics.md` (new, picked up automatically) | Syntax: one `json ast` case per new node (`Param`, type function, `TypeApply`, `TypeExpr`, import forms) and the parse errors of 1.3. Checks: every row of 2.10 as an `errors` case; modules that must check cleanly | 1, 2 |
| `examples/generics/*.ents` (new; run by `examples.test.ts` and `examples:all`) | The acceptance programs as they become compilable: `pick`, `minmax`, `find`, `sort`, `vec` (PR 1 forms), `duck`, `compose`, `methods` (PR 2), `set`, `map`, struct elements (PR 3). `examples/generics/modules/main.ents` + library for the multi-file case | 1-3 |
| `lib/vec.ents`, `lib/set.ents`, `lib/map.ents`, `lib/sort.ents`, `lib/stack.ents` with inline tests | The containers. A library of generics is a valid entry module (no functions, no exports) | 4 |
| Corpus stability, as a script kept in `scripts/` (the spike's `watdiff.ts`) | Every existing example, lib file and kernel compiles to byte-identical WAT before and after each PR that is not meant to change code generation | 1, 2, 4 |
| `/home/user/monkey-fist`: `node moonbit/encantis/check-features.cjs`, `solver/check.cjs` | The kernels on generic containers: 0 mismatches, no slowdown | after 4 |

### 6.3 Making documentation executable

Two additions to `spec/spec.test.ts`, about 40 lines:

1. **Expectation blocks about generated code**, so a spec file can state the zero-cost property and
   catch "checks but does not compile":
   - a ```` ```wat ```` block after a module: each line is a substring that must appear in the
     module's WAT, in order; a line starting with `!` must not appear (`!call_indirect`);
   - a ```` ```run ```` block after a module: the module's inline `test` blocks are compiled and
     run, and all must pass.
2. **Spec-tested regions of `docs/encantis.md`**: the runner also reads `docs/encantis.md` and runs
   the `ents` blocks between `<!-- spec:begin -->` and `<!-- spec:end -->` markers with the same
   rules. The new Generics and Compile time chapters are written inside such regions, so every
   block in them is a test. The existing blocks stay outside until they are repaired; this states
   the requirement honestly ("the docs of this feature run as spec tests") without pretending the
   other 97 blocks pass.

### 6.4 Documentation changes

`docs/encantis.md`:

| Section (v0.2.1 lines) | Change |
|---|---|
| Type identifiers (31-45), keywords (47-57) | Type parameters and type-function names are type identifiers; `comptime` is a keyword |
| Structs and constructors (487-523) | Constructing a value of an applied type: `Vec(T)(ptr, 0, cap)` |
| Functions (803-890) | Comptime parameters (pointer to the new chapter); PR 2: overloading by parameter types; a user function takes precedence over a builtin of the same name |
| UFCS (1248-1284) | PR 2: "Not yet implemented" becomes the rules of 2.2, including the no-address rule for by-value receivers |
| Imports (1629-1654) | Importing generic functions and type functions; `export` on a generic means importable and emits nothing |
| Builtins (1852-1868) | `min`/`max`/`abs` can be replaced by user definitions |
| **New chapter "Generics"**, in a spec-tested region, before Future Additions | Comptime parameters; explicit and inferred calls; the inference rules; generic types (type functions, structural); requirements (operators, calls, where a call is looked up); instances and what they cost (nothing); modules; limits and errors |
| **New chapter "Compile time"** | One place for what is known at compile time: literal types, `def`, `sizeof` and the packed layout (both undocumented today), comptime parameters, type functions |
| Future Additions: Generics (2017-2031) | Removed (the `<T>` sketch is replaced by the chapter) |
| Future Additions: Comptime Evaluation (2048-2069) | Rewritten as what remains: comptime value parameters in types (`[n]T`), `comptime func`, comptime-computed tables |
| Future Additions: Operator overloading via UFCS (2090-2109) | Says that function overloading and UFCS exist after PR 2; operators as functions stay future |

`docs/grammar.md`: Identifiers (11-32): `comptime`; Functions (155-199): `ParamList`, `Param`, type
functions; Type Declarations (201-220): type functions next to aliases; Types (267-398):
application, and the unclosed code fence at 271 and the dead links are fixed while there; Function
Call (661-669): which type forms can be written as arguments (1.3 row 8); Literals and Constructors
(671-683). `spec/README.md` (36-39): the new file and block kinds. `README.md` (60-66) and
`lib/README.md`: the feature and the containers (the library now has modules that allocate).

---

## 7. Staging: four pull requests

Order: 1, then 2 and 3 in either order or in parallel (they do not overlap: 2 is the checker's call
resolution, 3 is code generation for memory), then 4. Each leaves `bun test`, `bun run lint` and
`bun run typecheck` clean and existing output byte-identical unless stated.

### PR 1. Comptime parameters, type functions, instances

The engine. Everything in sections 1, 2.1-2.5, 2.7-2.9, 3 and 4.1-4.7 except what is marked PR 2.

- Grammar, bundle, actions, AST (section 1). `comptime` reserved.
- `types.ts`: `typevar`, `type`, `unify`, `canonicalKey`, `watSafe`.
- Checker: `GenericInfo`, `ProgramState`, `Instance`, the queue and `checkInstanceBody`; type
  functions; explicit and inferred calls of generic functions by plain name; comptime type and
  function parameters; `calls` (instances and applied-type constructors), `consts`; per-owner
  literals; error context and related locations; operand checks for aggregates; a user *generic*
  takes precedence over a builtin of its name; program-wide instantiation across modules (import
  and export of generic functions and type functions); `typecheck` split into check and finalize.
- Codegen: `instanceView`, `watNameOf`, `resolvedCallToWat` with argument widening,
  `emitFunctions`/`emitInstances` in all three assemblers, owners in `buildDataSection`, `sizeof`
  from `consts`, the loud failures of 4.3.
- Tooling minimum (5.1, 5.2 rows without "PR 2", 5.3), tests (6.2), spec runner additions (6.3),
  docs (Generics chapter without UFCS and overloads; grammar.md).
- **Acceptance**: a00 (pick); a01 for scalars (max, min, clamp, swap through `*mut T`); a02 (find,
  with `T` through `[]T` and array-to-slice coercion); a07 (sort with a comptime comparator,
  scalar elements, called as `sort(xs, by)`); a10 (zero cost); the a11 cases for type arguments,
  generic types and exports; a `Vec(T)` over scalars and slices written with explicit `v.*.len`
  and plain calls; a generic library imported by a second module. The spike passes its versions
  of all of these today (`arch/run/`), except literals in generic bodies and the third-module
  comparator, which need the owner and `watNameOf` changes above.
- **Useful on its own**: generic functions and generic types work, with plain call syntax, for
  scalar and slice elements, across modules.
- Size: the spike is 731 added lines in five files without tests, tooling or docs. Expect about
  1,500 lines of compiler change and as much again in tests and docs.

### PR 2. Calls resolved by type: UFCS, overloads, duck-typed lookup

- `inferCall` head replaced by `resolveCallee` (2.6): overload sets (`overloads` symbol,
  `collectFunc`, `collectImport`, duplicate error), UFCS (`findField`, receiver in `ArgPlan`),
  lookup through the instantiation chain, `env` in the instance key, the open/closed merge, user
  functions before builtins for all functions, a `CallTarget` for every user call.
- `CallExpr` type keys move to `span.end` together with the six codegen lookups (4.3).
- Codegen: overload names and views, receiver emission, `collectLocals` visits callees, the
  `call_indirect` stub becomes an error.
- Tooling: hover on a generic call shows the instance; `typeNames` in hover; UFCS member hints
  (`meta.ts:940-983`); by-name symbol readers tolerate `overloads`.
- **Acceptance**: a03 (duck-typed `eq` for two element types); a08 (generics calling generics);
  `v.push(7)`, `xs.sort(by)`, chained calls; a09 with the importer's own key type and its
  `hash`/`eq`; all of a11. The owner's six lines compile and run as written (with `vec` returning
  a pointer).
- **Useful on its own**: method-call syntax and overloading for all code, generic or not.
- What to watch: this is the PR with no spike behind it (8.1).

### PR 3. Aggregates in memory

Section 4.8, plus the checker errors that replace invalid wasm (`&local`, calling a function-typed
runtime parameter, `==` on aggregates is already in PR 1). Documentation of `sizeof` and the packed
layout. No generics code.

- **Acceptance**: a04 complete (struct and tuple elements), a05 (`Set(K)` with a `bool` in its
  slot), a06 (`Map(K, V)`, `lookup -> ?*mut V`), a01's struct swap; the 24-function, 13-type
  matrix of the codegen probes (`matrix.ts`) with every cell valid and run-time checked; existing
  kernels and examples byte-identical (they stay inside the subset that already works), verified
  with `watdiff.ts`.
- **Useful on its own**: fixes silent miscompiles that affect non-generic programs today.

### PR 4. The containers library, and comptime step two

- `lib/stack.ents`, `lib/vec.ents`, `lib/set.ents`, `lib/map.ents`, `lib/sort.ents` with inline
  tests; `lib/README.md`.
- Comptime value parameters (`comptime n: u32`, bound as `def`; `comptimeKey(value)`).
- `def` leaves the parser (Appendix B): `PrimaryExpr` stops substituting, `currentDefs` and
  `cloneExprWithSpan` are deleted, `evalComptimeExpr` looks names up through the scope chain,
  `data-pack.ts` asks the checker for the value of an identifier that names a def.
- Docs: the Compile time chapter; Future Additions rewritten.
- **Acceptance**: a09 against `lib/`; a12, the monkey-fist kernel `stack/features.ents` on
  `Set([]u32)`, passes `check-features.cjs` with 0 mismatches (a change in that repository, made
  after this PR is released); every existing source compiles to byte-identical WAT after the `def`
  move; comptime value parameter tests.

---

## 8. Risks, open questions, what to cut first

### 8.1 Where this design is most likely wrong or costly

1. **Lookup through the instantiation chain, with the environment in the instance key and a merge
   afterwards (2.6), is the one part with no prototype.** It is new language semantics (a call in a
   library body can resolve to a function of the program that uses the library), it interacts with
   overloading, and the merge is a graph pass over call records. Failure modes: a duplicated
   instance (cost, not correctness), a surprising resolution when both the library and the caller
   define an applicable function (the library's wins), and open instances that could have been
   shared. The alternative that needs none of it is to pass `hash` and `eq` as comptime function
   parameters, which PR 1 already supports, at the price of the surface the owner described.
2. **Overload sets cut across everything keyed by function name**: `moduleScope.symbols`,
   `funcToWat`'s lookup by `decl.ident`, name maps, exports, the editor's by-name hover and the
   name-keyed definition table (which is already wrong for same-named symbols **(probe x1)**). The
   call table removes the need for names at call sites, but declarations still need views and
   mangled names. Expect PR 2 to find more by-name readers than this document lists.
3. **PR 1 is large**, and cross-module instantiation is in it from the start (the instance table
   has to be program-wide from day one, or keys and ownership change later). The spike says the
   mechanism is small; the review surface is not.
4. **Applied types are structural and their names are display-only.** A parameter the body does not
   use cannot be inferred; two type functions with equal bodies are interchangeable; the editor
   shows expansions until `typeNames` lands. If the owner wants `Vec(u8)` to be distinct from a
   look-alike struct, that is nominal typing, which the language does not have and this design does
   not add.
5. **PR 3 is probably the most work and is not generics.** Without it, containers hold scalars,
   pointers, wide integers and slices only, must be written with explicit `.*`, and cannot have a
   `bool` in a slot. The first users want `Vec((i32, i32, i32))` and a `(used, hash, key)` slot.
6. **Types in argument position rest on the checker reading expressions as types.** `u32`, `(u32,
   K)` and `Vec(T)` arrive as `IdentExpr`, `TupleExpr`, `CallExpr`. Any path that evaluates such an
   argument as a value first (a new builtin, a meta hint, a walker in codegen) misreports or
   crashes; 4.3 turns the silent cases into throws, but the class of bug exists.
7. **Deferred body checks change error order and timing.** Errors in generic bodies come after all
   errors of ordinary bodies, and errors for a library's instance arrive in the library's list
   while a later module is checked. The gate, the printers, spec `errors` blocks (ordered) and the
   unused warnings all had to move to "after everything"; anything else that reads a module's
   result early is a bug waiting.
8. **Per-owner literal refs touch `data-pack.ts`**, which the editor runs on every keystroke
   through meta. A mistake there is an "Internal compiler error" in the editor.
9. **The editor without import resolution** (5.4 case 3) degrades to "no type diagnostics for this
   file". It is honest, but it is a loss for WebWorker users of generic libraries.
10. **Checker permissiveness elsewhere** still turns an unsuitable type argument into a wabt error
    rather than a diagnostic (mixed-type arithmetic, range fills, `?T` for non-pointer `T`, runtime
    indexing of `[]T` being `?T` only for pointer-like `T`). PR 1 covers aggregates under
    operators; the rest surfaces as invalid wasm in one instance only.

### 8.2 Open questions for the owner

| # | Question | This design assumes |
|---|---|---|
| Q1 | How does `Set(K)` find `hash` for a key type the library has never seen? | By lookup in the modules of the instantiation chain (2.6). Alternative: comptime function parameters |
| Q2 | May a user function replace a builtin of the same name? | Yes. The owner's `max` needs it |
| Q3 | What does `vec(u32, 16)` return? | `*mut Vec(u32)`, header on the bump stack. By-value headers with `v.push(x)` need an address for a register-held struct, which the memory model does not have |
| Q4 | `export func push(comptime ...)` in an entry module | Legal, importable, emits nothing. Alternative: a warning when the entry module exports a generic nobody can import |
| Q5 | Is `comptime` as a keyword an acceptable break? | Yes; no source in either repository uses it as a name |
| Q6 | Should `max(a_u8, b_u32)` widen to `u32` or be an error? | Widen, as assignment does; requires argument widening in codegen (4.3) |
| Q7 | Where do library containers get memory? | `lib/stack.ents` (the monkey-fist bump stack). Alternative: `comptime alloc: (u32) -> u32` on each constructor, which PR 1 supports |
| Q8 | Should a restated import signature be compared with the real one? | Not in these PRs (it is not compared for ordinary functions today either) |
| Q9 | Error wording (2.10), instance names (`$push<u32>`) | Proposals |

### 8.3 What to cut first if it runs long

In this order; each cut leaves the rest intact.

1. The `def` move out of the parser (PR 4). Nothing depends on it; it is the tidy-up that makes
   `def` and comptime parameters visibly one mechanism.
2. Comptime value parameters (PR 4). No first user needs them.
3. Generic functions inside overload sets (PR 2): plain functions can be overloaded, a generic's
   name must be unique. Costs library names like `vec_len`/`map_len`.
4. Explicit type arguments in UFCS form (`v.push(u32, 7)`), hover improvements, `typeNames`.
5. The `wat`/`run` spec blocks and the spec-tested doc regions: fall back to `spec/generics.md`
   plus example files.
6. Argument widening at recorded calls: fall back to "bare-`T` arguments must agree exactly".
7. Last, and only with the owner's agreement, the instantiation-chain lookup (Q1): replace it by
   comptime function parameters for `hash` and `eq`. This removes `env`, the merge and half of the
   overload work, and changes the surface.

Not cuttable: per-instance tables, the call table, the queue, program-wide instances, per-owner
literals, and loud failures in codegen. They are the architecture.

---

## Appendix A. The spike

Location: `/tmp/claude-0/-home-user-monkey-fist/c2838201-d71f-55a0-bc1a-cc2e586d01ea/scratchpad/generics/arch/`.
It was started by an earlier, interrupted run of this task; I re-ran everything quoted here.

| File | What |
|---|---|
| `repo/` | A private copy of the compiler with the spike applied (`node_modules` linked). `bun test` there: 672 pass, 6 skip, 0 fail |
| `spike.diff` | The spike as a unified diff against v0.2.1: 731 lines added, 28 removed, in `encantis-grammar.ohm`, `encantis-actions.ts`, `types.ts`, `checker.ts`, `codegen.ts` (regenerated from `repo/` for this document; `spike-grammar.diff` is the grammar part alone) |
| `repo/packages/compiler/generics.test.ts` | The five zero-cost tests |
| `run/a00_pick.ents`, `a01_scalars.ents`, `a02_find.ents`, `vec_lite.ents`, `run/mod/{main,containers,stack}.ents` | Acceptance programs in the PR 1 subset. All pass `encantis test` with the spike's CLI (`bun repo/packages/cli/src/cli.ts test <file>`) |
| `run/a01_minmax_swap.ents` | Fails in wabt on the struct `swap`: the whole-struct load/store bug, PR 3 |
| `probes/x/{lib,keys,main}.ents` | Cross-module probes: body error placement; the third-module comparator that compiles to an undefined `$inc` |
| `probes/t1.ents` | Literals in generic bodies: compile to address 0 in the spike |
| `probes/e1.ents` | Error cases: argument count, literal against `f64`, missing `eq`, polymorphic recursion |
| `probes/r1.ents` | Recursion, mutual recursion, `sizeof` per instance, inference through `Pair(T)`, a comptime function passed on by a generic, a generic declared in a test: passes `encantis test`; `encantis compile` emits only the two instances reachable without tests |
| `probes/m1.ents`, `probes/tables.ts` | Table dump: module map has no entries inside generic bodies; instance maps are separate |
| `probes/g2.txt`, `gp.ts` | Parse probes for the claims of 1.3 (all confirmed) |
| `corpus.ts` | Corpus regression: 292 sources, 292 identical, 0 differences |
| `watdiff.ts`, `watdiff.out.txt` | Compiles every `.ents` entry with two compiler copies and compares WAT. Pristine against spike: `88 files: identical 87, different 0` (the 88th, `containers.draft.ents`, is skipped) |
| `checker.callend.bak` | The spike's `checker.ts` with `CallExpr` moved to `span.end` in `exprTypeOffset`: one example fails (4.3) |
| `probes/weave.base.wat`, `weave.nosubst.wat`, `weave.nosubst2.wat` | `builder/weave.ents` compiled with and without parser-level `def` substitution: the only difference is the `data kinds` literal |

What the spike implements: the grammar of 1.1; `typevar`/`type` kinds, `unify`, `canonicalKey`,
`watSafe`; generic `func` symbols with a declared signature; `typefunc` symbols and
`applyTypeFunc` with memo and depth limit; `evalTypeExpr`; `inferGenericCall` (explicit and
inferred, comptime function parameters); `instantiate` with a program-wide table and queue;
`checkInstanceBody` by swapping tables; error suffix; silenced definitions; `consts` for `sizeof`;
`calls` for instances and applied-type constructors; `instanceView`, emission in `moduleToWat` and
`programToWat`; import and export of generics.

What it does not implement, so this document's claims about them are design only: UFCS, overload
sets, the lookup environment and merge (all of PR 2); per-owner literals; `FuncRef` and
`watNameOf`; related error locations and call-site errors across modules; operand validation;
argument widening; structural-versus-candidate bindings in `unify` (the spike joins at every
depth); the recursion guard for type functions; signature-only imports for the editor; every
tooling change of section 5; comptime value parameters; all of PR 3.

Things it got wrong that are worth knowing before implementing: it keyed comptime function
arguments by name; it resolved a comptime function's wasm name in the generating module's name map;
it printed whole types in the nesting-limit error; it stored instance literals where the data
builder cannot see them; its `typefunc` symbol has no `type`, which crashes hover; and it carries a
debugging guard for an `undefined` entry in an instance map (`SPIKE: undefined type at ...`). The
guard does not fire on any program listed above; whatever once triggered it is not known, so the
real implementation should assert instead of skipping.

## Appendix B. From here to comptime evaluation

The docs sketch three things under "Comptime Evaluation": constant arithmetic in `def`, a
`comptime func` that fills a table, and `def crc_table = generate_table()`. This design is the
first step toward them in a precise sense: the pieces they need are the pieces built here.

| Piece | After these PRs | What comptime evaluation adds |
|---|---|---|
| Comptime values | `ComptimeValue` = int, float, bool, data pointer, **type**, **function** | aggregates and byte buffers |
| Comptime bindings | scoped symbols (`type`, `def`, `func`) bound per instance; after PR 4, `def` is the same thing at module level, resolved by the checker, order-independent and scoped | `comptime` locals inside a body |
| Evaluator | `evalComptimeExpr` (integers, defs, `.len`, `sizeof`) and `evalTypeExpr` (types), merged in PR 4 into one evaluator that looks names up through the scope chain | statements, loops, calls: an interpreter over the checked AST |
| A function evaluated at compile time | type functions: all parameters comptime, body evaluated by the checker, memoised by arguments, nothing emitted | `comptime func`: the same rule with a block body and a value result; a type function with a block body (`-> type { if ... }`) is the same feature |
| Memo | `ProgramState.memo` keyed by (declaration, comptime arguments) | unchanged; a comptime call is one more entry kind |
| Results reaching codegen | `consts` (expression offset to value), per-owner literal lists | a comptime-computed table is a literal owned by the `def` that computed it |
| Specialisation | instances keyed by types, functions and (PR 4) values | `[n]T` with a comptime `n` (needs the array-length grammar to accept names), `Array(T, n)` |

Concretely, the `def` move in PR 4: the `PrimaryExpr` action (encantis-actions.ts:1386-1412) stops
replacing identifiers; `inferIdent`'s `def` case (already there) types the identifier and
`identToWat` (codegen.ts:342-350) already inlines the constant, which is why the suite passes with
substitution disabled **(spike)**. Two things must move with it: `data-pack.ts` must ask the
checker for the value of an identifier that names a def (today it serialises such an element as
zero once the parser stops substituting; `data kinds` in `builder/weave.ents` is the corpus's one
case), and a `def` with a type annotation must keep typing its uses as the parser's
`AnnotationExpr` wrapper does now. The gain is that `def`, `type`, type functions and comptime
parameters are then one notion, a name bound to a compile-time value in a scope, and the unscoped,
order-dependent substitution (`def n = 5` shadowing a parameter `n`) is gone.

What stays out of reach until an interpreter exists: `comptime func` with loops, comptime-computed
tables, comptime `if` on types. Nothing in these four PRs has to be redone for them.
