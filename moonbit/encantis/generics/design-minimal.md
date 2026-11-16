# Comptime generics for Encantis: the smallest correct change

Lens of this document: deliver the chosen syntax and the acceptance programs with the least new
machinery and the least risk to the 0.2.1 compiler. Line numbers are for
`/home/user/encantis` at `claude/generics` (= v0.2.1); `ohm:N` is
`packages/compiler/encantis-grammar.ohm`, other files are under `packages/compiler/`.

Everything marked **[spike]** was run against a private copy of the compiler that implements
stages 1 and 2 of this design (and a probe of the overload part of stage 2):

- copy: `/tmp/claude-0/-home-user-monkey-fist/c2838201-d71f-55a0-bc1a-cc2e586d01ea/scratchpad/generics/min/repo`
  (git: `5b2ee39 base` = v0.2.1, `17585bc prototype: stage 1+2`, then `prototype: overload sets ...`).
  `git diff 5b2ee39 17585bc` is the reference patch: 10 files, +1,111 / -53, of which 272 are tests.
- its state: `bun test` 678 pass / 6 skip / 0 fail (667 before, 11 new), `bun run typecheck` and
  `bun run lint` clean. An earlier, interrupted run of this task built it; I re-ran all three and
  every probe below myself before relying on it.
- probes of this run: `.../scratchpad/generics/min2/` (`e1`, `e2`, `h1`, `w1`-`w3`, `o1`, `o2`, `mm/`, `idem.ts`);
  acceptance programs in today's-memory-model spelling: `.../scratchpad/generics/min/t/`.

Nothing in `/home/user/encantis` or `/home/user/monkey-fist` was modified.

---

## 0. The design in one page

**The idea.** A comptime parameter is a name bound to a compile-time value. Encantis already has
exactly one such mechanism: `def`, which the parser implements by *substituting a copy of the value
for the name* (`encantis-actions.ts:1386-1412`). Generics are the same mechanism with two changes:
the values include **types** (and function names), and the substitution happens **in the checker,
when a call supplies the values**, not in the parser.

So instantiating `push` for `T = u32` is:

1. deep-copy the `FuncDecl`, replacing every reference to `T` by a node that carries the resolved
   type (`BoundType`), dropping the comptime parameters, renaming it `push<u32>`;
2. give every span in the copy an offset in a private range (`+ index * 2^28`), so that everything
   the compiler keys by source offset (the types map, literal ids, scratch locals) is per instance
   with no further bookkeeping;
3. hand the copy to the existing passes as an ordinary function of the module that declares the
   generic: `collectFunc`, later `checkFuncBody`, later `funcToWat`. None of them is changed.

A call to a generic is checked by inferring the comptime arguments, getting (or making) the
instance, and recording a **lowered call**: an ordinary `CallExpr` to `push<u32>` with only the
runtime arguments. Codegen compiles the lowered expression in place of the written one (one new
line in `callToWat`). UFCS, constructor calls on applied types (`Vec(T)(...)`), comptime function
arguments and overloads all use that one table.

A type function (`func Vec(comptime T: type) -> type => (...)`) is the same substitution applied to
a type: `Vec(u32)` is the body with `T` replaced, resolved in the declaring module, wrapped as the
structural alias `named('Vec(u32)', ...)`.

**Why this is the smallest change.** The alternative the maps recommend (one AST, a fresh types
map and call table per instance, a symbol overlay per instance in codegen) needs changes in every
place that today assumes "one module, one map": the final concretize pass, `usesMemory`, the data
section (`DataTarget` entries and literal ids are per offset), reference tracking, `sizeof`'s
private resolver, and a per-instance view object in three emit loops. With copies at private
offsets all of those work unchanged, because an instance *is* an ordinary function with its own
offsets. What the copy costs is three guards for "an offset that is not in the file"
(`error`/`warn`, `recordDefinition`, `recordReference`), which map it back with `offset % 2^28`.

**What was measured [spike].**

| Claim | Evidence |
|---|---|
| Existing programs compile to the same WAT | 87 `.ents` files of both repos compiled with 0.2.1 and with the spike (`min/samewat.sh`): 83 identical; 2 differ only in the line numbers of an existing compiler crash; 2 differ because two existing miscompiles are fixed (section 4.4) |
| An instance is the hand-written function, byte for byte | `generics.test.ts` "an instance is the code of the hand-written function, byte for byte": code-section bodies of `push<u32>`, `total<u32>`, `grow<u32>` and the `u128` ones equal those of the hand-specialised module |
| Nothing is emitted for an unused generic; one function per distinct argument set | same file, first two tests; `first<<q:i32\|r:i32>>` is one instance for `Pt`, its structure, and the explicit form |
| a00, a01 (scalar), a02, a04 and a08 (scalar, explicit `.*`), a07 (scalar) run | `encantis test` on `min/t/*.ents`: 3+3+2+3+2 tests pass |
| Literals in a generic body are per instance, with no literal-id work | `min2/w3.ents`: `tab<u8>` gets `(data "\01\02\03\04")`, `tab<u64>` gets 32 bytes |
| Instances requested only by tests are absent from `compile` | `min2/h1.ents`: `compile` emits `$a`, `$twice<u32>`; `test` passes with `twice<f64>`, `twice<i64>`, a generic declared inside the test |
| Errors in a body point into the generic's source and name the instance | `min2/e1.ents`: `e1.ents:3:19: unknown identifier 'eq' ... [in index_of(u32)]` |
| Duck-typed `hash`/`eq` for two key types, through overloads | `min2/o1.ents`: `Set(u32)` and `Set([]u32)` in one module, 2 tests pass; +53 lines on the spike; suite still 678 pass |
| The final concretize pass can be run again after late instances | `min2/idem.ts`: 28,135 type entries of 78 files, 0 changed by a second pass |

**What it does not buy.** It is not a general compile-time evaluator, and section 9 says where it
stops being the right tool. The acceptance programs as written also need codegen work that has
nothing to do with generics (structs and `bool` in memory, `v.len` through a pointer); that is
stage 3 and is the largest single piece of work on the way to the first users.

---

## 1. Syntax

All grammar changes are the `narrow` variant of `map-syntax.md` section 7, which was already
measured: 273 of 273 corpus sources keep the same parse result and AST, full suite green.

### 1.1 Grammar (`encantis-grammar.ohm`), exact rules

```
// ohm:68. The existing action FuncDecl must be renamed FuncDecl_func.
FuncDecl = func typeIdent BaseType "->" type "=>" Type  -- typeFunc
         | inline? func ident? FuncSignature Body        -- func

// ohm:76-77
Field = comptime typeIdent ":" type      -- comptimeType     // comptime T: type
      | comptime ident TypeAnnotation    -- comptimeValue    // comptime before: (T, T) -> bool
      | ident TypeAnnotation             -- named
      | Type                             -- anonymous

// ohm:151: one alternative BEFORE `typeIdent -- named`
         | typeApplyHead NonemptyListOf<Type, ","> ")"  -- apply
         | typeIdent                                    -- named
typeApplyHead = typeIdent "("            // lexical: Vec(u32), never Vec (u32)

// ohm:422-424
Arg = ident ":" Expr          -- named
    | ident ":"               -- shorthand
    | TypeLit &("," | ")")    -- type
    | Expr                    -- positional
TypeLit = Type_func                 -- func       // u32 -> u32, (T, T) -> bool
        | &typeOnlyStart BaseType   -- base
typeOnlyStart = "?" | "*" | "[*]" | "[]" | arrayPrefix | rangedUnsigned | bareTypeIdent
arrayPrefix   = "[" arrayFramings "]"
bareTypeIdent = typeIdent ~"("

// ohm:514-518 and the token list: reserve the word
keyword = (... | sizeof | comptime) ~identChar
comptime = "comptime" ~identChar
```

Stage 4 adds one alternative so a type function can be imported:

```
ImportItem = func typeIdent BaseType "->" type   -- typeFunc      // "Vec" func Vec(comptime T: type) -> type
           | func ident? FuncSignature           -- func
           | ...
```

After every `.ohm` edit: `bun run bundle:grammar`. Stage 1 adds a test that compares the committed
bundle with a fresh `ohm.grammar(src).toRecipe()`, because a stale bundle silently tests the old
grammar.

### 1.2 AST (`ast.ts`)

```ts
interface Field { kind: 'Field'; ident: string | null; type: Type; comptime?: boolean }       // ast:94
interface TypeFuncDecl { kind: 'TypeFuncDecl'; ident: string; params: Type /* CompositeType */; body: Type }
interface TypeApply { kind: 'TypeApply'; name: string; args: Type[] }                         // Vec(u32)
interface TypeType  { kind: 'TypeType' }                // the keyword `type`, only as a comptime field's type
interface BoundType { kind: 'BoundType'; name: string; type: ResolvedType }   // never parsed, see 3.3
interface TypeExpr  { kind: 'TypeExpr'; type: Type }    // a type written as a call argument
interface FuncDecl  { ...; overload?: string }          // set by the checker (stage 2), like dataId and mut
```

`TypeFuncDecl` joins `Declaration` and `ExportDecl.item`; `TypeApply | TypeType | BoundType` join
`Type`; `TypeExpr` joins `Expr`. `comptime` is absent (not `false`) on ordinary fields, so no
existing `json ast` expectation changes. `BoundType.type` uses `import type { ResolvedType }`
(types.ts imports nothing from ast.ts, and a type-only import creates no cycle).

Consumers that need a case because TypeScript demands it: `resolveType` (checker.ts:1752),
`astToResolved` (type-lib.ts:30, throw as `TypeRef` does), `inferExprInner` (checker.ts:2171,
`TypeExpr` is an error there), `inferIdent`'s switch on `Symbol.kind` (2294). Consumers with a
silent default that are deliberately left alone: codegen's `resolveTypeFromAST` (no longer
consulted for `sizeof`, 4.3), `walkExpr`, `meta.ts:1164-1188` (section 5).

### 1.3 Every ambiguity from the syntax map, and its resolution

| # | Ambiguity | Resolution |
|---|---|---|
| 1 | `func Vec(...)` reads as an anonymous function whose input type is `Vec` | A separate first alternative `FuncDecl_typeFunc`, entered only for an upper-case name followed by `BaseType "->" type`. `func Point -> Point => p` still parses: the first alternative fails at `type` and PEG tries the second. No greedy `(ident \| typeIdent)?` |
| 2 | Body of a type function is not an expression (`[*]mut T`, bare `T`) | The body is a `Type` after `=>`. No block body in this version |
| 3 | `comptime` is a legal identifier today | Reserved. No `.ents` file in either repo uses it. Breaking in principle; say so in the PR title |
| 4 | `T` is not an `ident`; `type` is not a `Type` | `Field_comptimeType` takes `typeIdent ":" type` literally. `type` does **not** become a general type: `(t: type)`, `let t: type`, `-> type` on a lower-case function stay parse errors [spike, `e2`] |
| 5 | `Field` is shared with struct types, results, enum payloads, function types | The checker rejects a `comptime` field anywhere but the parameter list of a function declaration or import item: `'comptime' is only for the parameters of a function declaration` (`resolveType` `CompositeType` case and `typeToFields`) |
| 6 | Type application against a following `(...)` line (no statement separators) | The head is lexical, `typeIdent "("` with no space. `1 as Big⏎(Green, Red) => 2` parses as today |
| 7 | Types that are already expressions: `u32`, `(u32, u32)`, `(a: u32, b: u32)`, `()`, `Vec(u32)` | They stay expressions (`IdentExpr`, `TupleExpr`, `CallExpr`). The checker reads them as types **only** where it expects a type: the argument of a `comptime T: type` parameter, and the callee of a constructor call. One function does it, `exprAsType` (3.2). A variable in scope named `u8` wins over the primitive, so no existing program changes meaning |
| 8 | Types that are not expressions: `Point`, `T`, `[]u8`, `[4]u8`, `*mut T`, `?*T`, `u8#16`, `u32 -> u32` | `Arg_type`: tried after the named forms, before `Expr`, only for syntax that cannot start an expression, and only when followed by `,` or `)`. Gives `TypeExpr`. Confined to argument position, so `let xs = [1]⏎Point(1, 2).draw()` is unaffected |
| 9 | The one parse that changes | An array literal that is *called*, in argument position: `f([]())`, `f([4](u32))` become types. The checker rejects those programs today (`cannot call non-function type`). Documented, with a spec case |
| 10 | `x: T` inside parentheses | Unchanged: no named type arguments (`f(x: T)` stays a parse error), bare type names do not become primary expressions, so `spec/syntax.md:191` and `:229` keep failing with `Expected "("` |
| 11 | Constructor against type application: `Point(1, 2)` and `Vec(u32)` are the same shape | One node (`CallExpr`); the checker decides from the callee symbol: a `type` symbol constructs, a type function applies. `Vec(T)(ptr, 0, cap)` is a call whose callee `exprAsType` turns into a type; it is lowered to a struct literal |
| 12 | Cast against explicit type argument: `u32(x)` and `max(u32, a, b)` | Differ only in the callee; no conflict. A generic named like a primitive is still unreachable, as any function is today |
| 13 | `set` is a keyword | Not changed. The Set constructor is `hashset(K, bits)` in the acceptance programs and the library |
| 14 | Array lengths are lexical digits | Not changed: `[n]T` with a comptime `n` is out of this version (section 2.8) |
| 15 | `export func Vec(...)` would be named `"memory"` by `ExportDecl_unnamed` (actions:291-313) | The action gets a `TypeFuncDecl` case (export name = its identifier). Exporting a generic never makes a wasm export (4.5) |
| 16 | Member names starting with a primitive name misparse (`s.u8count`) | Existing bug, not touched; mention in the UFCS docs |

Allowed forms of an explicit type argument, as a consequence of 7 and 8: every type the language
can write, in its normal spelling: `max(u32, a, b)`, `vec(Pt, 4)`, `vec((i32, i32, i32), 2)`,
`hashset([]u32, 6)`, `f(*mut T, x)`, `f(Vec(u8), x)`, `f((T, T) -> bool, x)`. The only form with a
caveat is `()`: as an argument it is the unit value, so the empty type cannot be passed (nothing
needs it).

Formatter: token based, already prints all of this stably (`func Vec(comptime T:type) -> type => ...`);
add `'comptime'` to `KEYWORDS` (formatter.ts:161-167). TextMate grammar: add `comptime` at
`packages/extension/encantis.tmlanguage.json:132`.

---

## 2. Semantics

### 2.1 Comptime parameters

- `comptime T: type`: a type parameter. Upper-case by grammar, because it is used in type position.
- `comptime f: <function type>`: a function parameter (`comptime before: (T, T) -> bool`). Its
  argument must be the name of a function; inside the instance a call `before(x, y)` is a direct
  `call` to that function. This is what the sort needs, it is how duck-typed requirements can be
  spelled explicitly, and it costs 20 lines once type parameters exist.
- Comptime parameters may appear anywhere in the list. They exist only at compile time: an
  instance's wasm signature has the runtime parameters only.
- A function with at least one comptime parameter is **generic**. Nothing in it is resolved or
  checked until it is instantiated (an unused generic is only parsed, plus the two declaration
  checks in 2.8).
- `func Name(comptime A: type, ...) -> type => Type` is a **type function**: all parameters are
  type parameters, the body is a type.

### 2.2 Calls: explicit and inferred

A call to a generic `g` with `P` parameters, `C` of them type parameters, is one of two forms,
told apart by the number of arguments (a UFCS receiver counts as one):

- **explicit**: `P` arguments, every parameter given in its position: `max(u32, a, b)`,
  `sort(Try, tries, by_order)`;
- **inferred**: `P - C` arguments, **all** type parameters left out: `max(a, b)`, `v.push(7)`,
  `sort(ids, by_cost_desc)`.

Any other count is `'g' expected 2 arguments (3 with its type arguments), got 1`. Leaving out
some type parameters and not others is not supported. Comptime function parameters are always
written. Arguments are positional (`'g' takes positional arguments`).

Algorithm (`inferGenericCall`), in this order:

1. Pair parameters with arguments. With a receiver, the receiver is the first parameter that is
   not a type parameter.
2. **Written type arguments**: `exprAsType(arg)`; not a type → `argument for T of 'g' must be a
   type known at compile time`.
3. **Comptime function arguments**: the argument must be an identifier naming a function; its
   signature is unified with the parameter's declared function type, which can bind type
   parameters (`sort(xs, ascending)` learns nothing new, `apply(double)` could).
4. **Inferred type arguments**: for each runtime parameter, in order, whose declared type still
   mentions an unbound type parameter: `inferExpr(argument)` (bottom-up, as the checker already
   does before re-checking in `inferBinary`); if the result is concrete, `unify(declared type,
   argument type)`. Untyped literals (`7`, `1.5`, `[1, 2]`) are set aside and used only if a
   parameter is still unbound after every typed argument was seen, with the default a `let` would
   give (`i32`, else `i64`; `f64`). Literal registrations made by this first look are rolled back
   (`pendingLiterals.length = saved`); step 6 registers them once, with their final type.
5. A type parameter still unbound → `cannot infer T for 'g': pass the type arguments explicitly`.
6. Get or make the instance (2.4), then check every runtime argument against the **instance's**
   parameter type with the ordinary `checkExpr(arg, type, 'argument N')`. This is where `7`
   becomes `u32` in `push(v, 7)`, where coercions are validated, and where a mismatch is reported
   exactly as for a hand-written function: `argument 2: cannot assign f64 to u32`.
7. Record the lowered call; the result type is the instance's.

`unify(pattern: AST.Type, actual: ResolvedType)` only **binds**; whether the argument fits is
decided by step 6. It walks the declared type (AST) against the argument's type with aliases
unwrapped:

| Pattern | Matches |
|---|---|
| `T` (an unbound type parameter) | binds `T` to the argument's type. At the top level a range is dropped (`u32#12` binds `u32`), so narrowed loop variables do not multiply instances [spike, `w3`: `keep(i)` with `i: u32#12` gives `keep<u32>`] |
| `*P`, `*mut P`, `?*P` | a pointer; continue into the pointee (mutability and optionality are not compared here) |
| `[]P`, `[*]P`, `[N]P` | a slice, an array, or a pointer to an array; continue into the element. This is how `find(nums, 8)` with `nums: *[4]u32` finds `T = u32` |
| `(a: P, b: Q)` | a tuple with the same number of fields; field by field |
| `P -> Q` | a function type; parameters and results |
| `Vec(P)` | the type function's body with its parameters replaced by the pattern's arguments, matched structurally. `*mut Vec(T)` against `*mut (ptr: [*]mut u32, len: u32, cap: u32)` binds `T = u32` whether or not the argument was ever called a `Vec`. A parameter that does not occur in the body cannot be inferred |

The first binding of a parameter wins; later arguments are checked against it in step 6
(`max(a_u32, b_f64)` → `argument 2: cannot assign f64 to u32`).

Explicit arguments are required when a type parameter does not occur in the type of any runtime
or comptime-function parameter (`vec(u32, 16)`, `zero(u32)`), when it occurs only as a phantom
argument of a type function, or when only literals mention it and the default is not wanted
(`keep(7)` is `keep<i32>`; write `keep(u32, 7)` or `keep(7:u32)`). There is no inference from the
expected result type (`let x: u64 = zero()` is "cannot infer").

A user generic takes precedence over a builtin of the same name (`max`, `min`, `abs`, ...): the
generic lookup comes before `inferBuiltin` in the checker, and the lowered call comes before
`builtinToWat` in codegen. Non-generic user functions keep today's behaviour (the builtin wins).

### 2.3 UFCS (stage 2)

`x.f(args)` is `f(x, args)` when `x` has no field `f` (a struct field through at most one pointer,
or the built-in `.ptr`/`.len`/`.wid`) and a function or generic `f` is in scope. A field always
wins. The receiver is an ordinary first argument: it is evaluated once, checked against the
parameter type with the usual coercions (`*mut T` → `*T`), and never has its address taken
(a register-held struct has no address; `vec` therefore returns `*mut Vec(T)`, decision S8 of the
use-case map). For a generic the receiver fills the first non-type parameter and the type
parameters are inferred. Chains work (`out.items().len`, `p.scale(2).length()`), which requires
moving `CallExpr` to the `span.end` kinds of `exprTypeOffset`, because both calls of a chain start
at the same offset.

### 2.4 Instances: identity, names, where they live

- An instance belongs to the module that **declares** the generic. Its key is the comptime
  arguments in declaration order: for a type, `watSafe(canonicalKey(type))`; for a function, the
  function's internal name. The memo is `Symbol.generic.instances: Map<key, Instance>`, on the
  symbol, so every module that imports the generic shares it.
- `canonicalKey` (types.ts, 40 lines, prototyped and checked against wabt in
  `probes-tooling/typekey.ts`) prints a type with every alias unwrapped at every depth, so `Pt`,
  `(q: i32, r: i32)` and another alias of it are one instance, and two different types called
  `Slot` in two modules are two. It throws on non-concrete types; callers guard with
  `isConcreteType`.
- Internal name: `ident<key|key>`: `max<u32>`, `push<<q:i32|r:i32>>`, `sort<i32|by_cost_desc>`.
  `<` cannot occur in a user identifier, wabt accepts every character `watSafe` produces, and the
  names never reach the binary (`toBinary({})`). The wasm name is the usual module prefix plus the
  internal name (`$containers$push<u32>`). Deterministic across runs.
- Instances are emitted in the order they were first requested, after the module's ordinary
  functions.

### 2.5 Duck-typed requirements

A requirement is whatever the body does with a value of type `T`. Because the body is checked as
ordinary code after substitution, every existing check applies per instance, and its error carries
the instance: `... [in index_of(u32)]`.

- **Operators.** `a > b`, `v == x`, `sum += x` are checked per instance. One addition is required,
  because `inferBinary` (checker.ts:2578) validates nothing today and `max(Pt, Pt)` currently
  passes `check` and fails in wabt [spike, `w1`]: an arithmetic or comparison operand whose type is
  not a single scalar or a wide integer is an error, `operator '>' is not defined for Pt`. This
  rejects only programs that cannot validate today (`map-codegen.md` 4.5: every such cell is
  invalid wasm).
- **Calls.** `eq(a, b)`, `hash(k)`, `k.hash()` are looked up when the instance is checked, in the
  module that declares the generic, for the concrete argument types. Two key types in one program
  means two functions named `hash`, so stage 2 adds **overloads**: a module may declare several
  functions with one name and different parameter types; a call picks the one whose parameter
  types are the argument types, else the only one the arguments are assignable to, else it is an
  error (`no function 'hash' for (Pt)`, `'size' is ambiguous for (int(7))`). This is safe to add:
  today a second function with the same name silently replaces the first in the checker and is a
  duplicate `$name` in wabt, so no working program has one. [spike, `o1`, `o2`]
- **Across modules** (stage 4): a function the declaring module does not have for these argument
  types is looked up in the module that instantiates the generic (2.7).
- Typing rules that depend on the kind of `T` (a runtime index on `*[4]T` is an error unless `T`
  is a pointer or slice) surface the same way [spike, `w3`: `runtime index on *[4]u8 requires
  'if let' ... [in tab(u8)]`].

There are no traits and no declaration-time checks of a generic body.

### 2.6 Recursion, generics calling generics, type functions

- **Generics calling generics.** Inside an instance every type is concrete, so a call to another
  generic is an ordinary generic call: explicit (`table(K, s, size)`; the copy turned `K` into a
  bound type) or inferred (`out.push(x)`). The requested instance joins the queue.
- **Recursion.** An instance is entered in the memo, and its signature registered, before its body
  is checked, so direct and mutual recursion terminate (`fact(n - 1)` inside `fact<u64>` finds
  itself). Bodies are checked from a queue after the module's own declarations, never in the
  middle of the caller, so no checker state (`loopDepth`, `deferLoopDepth`, narrowings, scope)
  leaks into them.
- **Runaway instantiation** (`deep(T)` calling `deep((T, T))`) stops at a nesting depth of 64 or a
  key longer than 4,096 characters: `instantiating deep: too many nested instantiations`. The
  spike prints the whole type in the `[in ...]` suffix (several kilobytes, `e2`); labels in
  messages must be cut at about 80 characters.
- **Type functions.** `Vec(u32)` is a **structural alias**: `named('Vec(u32)', (ptr: [*]mut u32,
  len: u32, cap: u32))`. Equal arguments give the same type; it equals any struct of the same
  shape, which is the language's existing rule for every alias (there are no nominal types).
  Messages print `Vec(u32)` (`cannot assign *Vec(u8) to *Vec(u32)` [spike, `e2`]); hovers print
  the expansion, as for every alias today. Applications are memoised per (function, canonical
  arguments), evaluated in the declaring module's scope. A type function may use other type
  functions (`Set` uses `Slot(K)`). A type function that reaches itself
  (`List(T) = (next: ?*List(T), ...)`) is `generic type 'List' refers to itself without end`:
  recursive generic types are not supported (recursive plain types are already unreliable).
  Inference sees through a type function by matching its body (2.2).

### 2.7 Modules (stage 4)

- `export` on a generic or a type function means "importable". It is never a wasm export; in an
  entry module it emits nothing, so a library file still compiles alone to a valid module.
- An import item restates the signature as today: `"push" func push(comptime T: type, v: *mut
  Vec(T), x: T)`, `"Vec" func Vec(comptime T: type) -> type`. For a source import the checker
  takes the exporter's symbol (as it already does for functions, checker.ts:527); the importer and
  the exporter then share the generic's memo, so `push<u32>` exists once in the program whoever
  asks.
- An instance is created, checked and emitted in the **declaring** module: its body's names are
  that module's names, its errors print against that module's source.
- A duck-typed function that the declaring module lacks for the argument types at hand is looked
  up in the module that requested the instance. An instance that needed this depends on its
  requester; if a *different* module later requests the same key, it gets its own instance
  (`add<Cell>@main`). Instances that did not need it are shared by everyone. Functions of the
  declaring module win over the requester's.

### 2.8 Not supported in the first version, with the error for each

| Not supported | What the user sees |
|---|---|
| Comptime value parameters (`comptime n: u32`) | `comptime parameter 'n' must be 'type' or a function type` (at the declaration, even if unused) |
| A generic function with unnamed parameters or the anonymous-input form | `a generic function's parameters need names` |
| `comptime` in a struct type, result, enum payload, function type | `'comptime' is only for the parameters of a function declaration` |
| `type` anywhere but a comptime parameter or a type function's result | parse error (grammar) |
| A type function with a non-type parameter, or a block body | `generic type 'Vec' takes comptime type parameters only, as (comptime T: type)`; parse error |
| Leaving out some type arguments, named arguments | the arity error of 2.2; `'g' takes positional arguments` |
| Inference from the result type, or of a phantom parameter | `cannot infer T for 'g': pass the type arguments explicitly` |
| A generic used as a value, a type function without arguments | `generic function 'max' has to be called`; `generic type 'Vec' needs its type arguments` |
| A type passed where a value is expected | `a type can only be passed for a comptime parameter` |
| A non-concrete type argument | `type argument T of 'g' must be a concrete type` |
| Applying a type parameter (`T(u32)` in type position) | `a type parameter cannot be applied` (the spike throws here; it must be a checker error) |
| Recursive generic types; runaway instantiation | the two messages of 2.6 |
| A comptime function argument that is not a plain function name (a generic, an overloaded name, an expression) | `argument for comptime parameter 'before' of 'sort' must be the name of a function` |
| A generic host import | `a host import cannot have comptime parameters` |
| Exporting a generic to the host | accepted, emits nothing (2.7) |
| Wrong number of type arguments to a type function | `Vec expects 1 type argument, got 2` |
| `[n]T` with a comptime length, comptime `if`, `comptime func` | not expressible: future steps (section 9) |
| A generic declared in a `test` block reading the test's locals | it sees module-level names only (`unknown identifier`) |

`inline` on a generic is accepted and ignored, as everywhere. A `mut` data literal in a generic
body is one buffer per instance (it falls out of the copy; documented).

---

## 3. Checker changes, pass by pass

Reference implementation: `git diff 5b2ee39 17585bc -- packages/compiler/checker.ts` in the spike
(+~580 lines, of which ~370 are the new "Generics" section; ~25 existing lines changed).

### 3.1 Tables and types

| Where | Change |
|---|---|
| `Symbol` (checker.ts:56-63) | two kinds: `{ kind: 'generic'; decl: AST.FuncDecl; owner: CheckContext; instances: Map<string, Instance> }` and `{ kind: 'typefunc'; decl: AST.TypeFuncDecl; owner: CheckContext; cache: Map<string, ResolvedType> }`. Neither has a `type`; a helper `typeOfSymbol(sym)` replaces the `sym.type` reads that can meet one (1096, 3154; `resolveForwardRefs` 607-612 and the symbol loop of `typecheck()` skip them). `func` gains `alias?: string` (a comptime function parameter inside an instance, 3.3 and 3.4) |
| `Instance` (new) | `{ name; label; decl /* the copy */; depth; aliases; requester /* stage 4 */ }` |
| `CheckContext` fields (403-435) | `instances`, `instanceQueue`, `currentInstance`, `calls: Map<number, AST.Expr>`, `pinned: Map<AST.Expr, ResolvedType>` (a UFCS receiver is inferred once); stage 2: `overloads: Map<string, string[]>`, `funcDecls`, `overloadDecls` |
| `TypeCheckResult` (100-117) | `instances?: AST.FuncDecl[]` (the copies, in request order; stage 2 also the renamed overloads) and `calls?: Map<number /* CallExpr span.end */, AST.Expr>` (the expression to compile in place of that call). Both optional: nothing else that builds or reads a result changes |
| `INSTANCE_STRIDE = 2 ** 28` (exported) | offsets of instance `i` of a module are `i * STRIDE + original`. Limits: sources under 256 MB, 2^25 instances per module |
| `exprTypeOffset` (82-84) | add `CallExpr` to the `span.end` kinds (chained calls). No test keys on `CallExpr` today |
| `types.ts` | `canonicalKey`, `watSafe` (45 lines). **No new `ResolvedType` kind**: no type variable, no type-of-types. Nothing generic ever reaches `typeToWasm`, `byteSize`, `concretizeType`, meta or queries |

### 3.2 Collection (first pass)

- `preRegisterTypes` (463-467): also registers every `TypeFuncDecl` (plain or exported) as a
  `typefunc` symbol (`collectTypeFunc`). A type function needs nothing resolved to be declared, so
  it is usable from any signature in the module, before or after.
- `collectFunc` (572-583): **before** `resolveSignature` (574), `if (isGenericDecl(decl))` (any
  input field has `comptime`): run `checkComptimeParams` (the two declaration checks of 2.8),
  register `{ kind: 'generic', ... }`, `recordDefinition`, return. Nothing else is resolved, so
  `unknown type 'T'` can no longer happen.
  Stage 2: a second module-level non-generic function with an existing name is registered under an
  internal name `name:<param keys>` (`hash:''u32`), added to `overloads.get(name)`, its decl
  marked `decl.overload = key`, and a shallow copy `{ ...decl, ident: key }` (same spans, same
  body object) pushed on `overloadDecls` for codegen. The first declaration keeps the plain name,
  so every existing reader of `symbols.get(name)` is unaffected. Functions declared in `test`
  blocks keep today's replace-by-name behaviour.
- `collectDeclaration` / `collectExport` switches: a `TypeFuncDecl` case that does nothing.
- `resolveType` (1752-1838), three cases and one check:
  - `TypeApply` → `applyTypeFunc(name, args.map(resolveType), offset)`;
  - `BoundType` → `type.type` (the already-resolved type; **not** wrapped in `named('T', ...)`,
    which avoids `checkExpr`'s "record the expected type when it is named" trap at 2118);
  - `TypeType` → error (unreachable from the grammar, kept for exhaustiveness);
  - `CompositeType`: reject `comptime` fields (also in `typeToFields`, 1850-1861).
  The `TypeRef` case still looks in `moduleScope` only (1816): type parameters never need a scope
  lookup, because the copy has no `TypeRef` to them left.
- `applyTypeFunc`: arity and concreteness checks; memo by joined `canonicalKey`s; copy the body
  with parameters replaced by `BoundType`s (`cloneAst(body, 0, subst)`); `owner.resolveType(copy)`
  under a depth counter; wrap as `named('Vec(u32)', resolved)`. Not cached while
  `pendingTypeNames` is non-empty (the body may still hold forward references).
- `exprAsType(expr): ResolvedType | null`, the reader of type-valued expressions: `TypeExpr` →
  `resolveType`; `IdentExpr` naming a primitive with no variable of that name in scope; `GroupExpr`;
  `TupleExpr` whose elements are all types (named elements make a struct type); `CallExpr` whose
  callee names a type function. Anything else is `null`. **This function is the seed of the
  compile-time evaluator** (section 9): it is `evalComptimeExpr` for values of kind `type`.

### 3.3 Instantiation

`instantiate(sym, bound, aliases)`:

1. key and label from the comptime arguments; memo hit → return it;
2. depth and key-length limits;
3. `decl = cloneAst(sym.decl, index * INSTANCE_STRIDE, name => BoundType for name)`; remove the
   comptime fields from the copy's input; `decl.ident = 'max<u32>'`;
4. memo, `owner.instances.push`, `owner.instanceQueue.push`;
5. `owner.collectFunc(decl)`: the unchanged collector resolves the copy's signature and registers
   an ordinary `func` symbol under the instance name in the owner's module scope.

`cloneAst(node, delta, subst)` is 25 lines: a generic deep copy of plain objects and arrays
(`Uint8Array`s by reference), every `span` shifted by `delta`, every `TypeRef` whose name `subst`
knows replaced by the `BoundType`, every such `IdentExpr` replaced by `TypeExpr(BoundType)` (so
`T(a, b)` constructs and `g(T, x)` passes the type on). It always copies the **original**
declaration, never a copy, so offsets are never shifted twice. It replaces the partial
`cloneExprWithSpan` of the parser for this purpose.

`drainInstances()` runs at the end of `checkModule` (after the second pass, which includes test
blocks): while the queue is not empty, take an instance, set `currentScope = moduleScope` and
`currentInstance`, call the unchanged `checkFuncBody(inst.decl)`, restore. Instances requested by
that body join the queue. The only addition inside `checkFuncBody` (1268-1297) is binding the
instance's comptime function parameters in the function scope as `func` symbols with `alias` set.

### 3.4 Calls (`inferCall`, 2312-2393)

New dispatch at the top, before the builtin test at 2314:

1. callee is an identifier whose symbol is `generic` → `inferGenericCall` (2.2);
   stage 2: callee names an overload set → `pickOverload`, lower to the chosen internal name,
   continue as a plain call;
2. callee is a `TypeExpr` or a `CallExpr` that `exprAsType` accepts → `inferConstruct`: check the
   arguments against the struct's fields with the existing constructor loop (2368-2389, factored
   out as `checkConstructorArgs`), lower to a `TupleExpr` with the fields in declaration order;
3. callee is `x.name` → `inferMethodCall`: infer `x`; if it has no such field and `name` is a
   function or generic, build `name(x, args)`, pin the receiver's type, and check that call.
   Otherwise fall through to today's errors.

In the existing plain-call branch (2332): if the callee symbol has `alias`, lower the call to the
aliased function (comptime function parameters). Everything else in `inferCall` is unchanged.

Every lowering is `this.calls.set(expr.span.end, loweredExpr)`. The lowered node reuses the
argument nodes of the written call, so their types are already in the map at their own offsets.
`inferGenericCall` also records the instance's `FuncRT` at the callee identifier
(`offset:IdentExpr`), which is what makes the editor show the inferred signature at a call with no
change to meta (section 5).

### 3.5 Other checker edits

| Where | Change | Why |
|---|---|---|
| `inferIdent` (2294-2309) | cases `generic` and `typefunc`: the two "has to be called / needs its arguments" errors | exhaustive switch |
| `inferExprInner` (2171) | return a pinned type if the node is pinned; `TypeExpr` case: error | UFCS receiver; exhaustiveness |
| `inferBinary` (2578) | operand check of 2.5 | `w1` |
| `inferBody` (3293) | use `exprTypeOffset(last.expr)` | a block ending in a call, member or binary expression is typed `()` today (probe z1); with calls at `span.end` this would hit generic bodies at once |
| `inferSizeof` (3314) | also store the resolved operand at `typeKey(expr.span.start, 'SizeofType')` | codegen reads it instead of re-resolving the AST type (4.3). Concretization leaves it intact |
| `error`, `warn` (3450-3460) | first line: `[offset, message] = this.atSource(offset, message)`: an offset at or above the stride becomes `offset % STRIDE` and the message gains ` [in max(f64)]` (label cut at 80 characters) | positions in the generic's real source; which instance |
| `recordDefinition` (3471) | ignore offsets at or above the stride | an instance's parameters and locals must not re-point names (the D1/D2 defects of the tooling map) |
| `recordReference` (3477) | from an instance: keep only references to module-level names, at `offset % STRIDE` | helpers called only from generic bodies (`hash`, `eq`, `zeroed`) must not be reported as never used |
| `checkDeclaration` (1166), `checkTestDecl` (1189) | skip the body of a generic | |
| `typecheck()` (150-211) | skip `generic`/`typefunc` in the symbol-type loop (164-179); include `generic` in the never-used warning; add `instances` and `calls` to the result | the concretize loop (159-162) already covers instance entries: they are in the same map |
| `getExportedSymbols`, `collectImport`, `typecheckProgram` | stage 4, section 3.6 | |

Not changed: scopes, `bindFields`, `bindPattern`, `checkExpr`, `resolveSignature`, literals
(`addLiteral`, `dataId`, `mut` land on the copy), narrowing, `defer`, bounds proofs, `concretizeType`.

### 3.6 Stage 4: modules

- `getExportedSymbols` (216-230): export `generic` and `typefunc` symbols of exported declarations
  by reference. `collectImport` (501-555): for a source import whose exported symbol is one of
  them, register that same symbol under the local name (a new `ImportTypeFunc` item for type
  functions). The restated signature is not compared, as today.
- In single-module mode (`typecheck` without `moduleExports`: the editor, the spec runner) an
  imported generic function becomes a **signature-only** generic built from the import item:
  calls are inferred and checked against the substituted signature, and no body is queued. An
  imported type function has no body there; see the open question in section 8.
- `typecheck()` is split into `checkToContext()` and `finalize(ctx)`. `typecheckProgram`
  (237-273) keeps every context; after each module's check it drains the queues of **all**
  contexts to a fixpoint (an importer's request lands in the exporter's queue), and re-runs
  `finalize` for every context that gained instances. `finalize` is idempotent [`idem.ts`: 0 of
  28,135 entries change on a second pass], so importers keep seeing finalized exporter symbols
  exactly as today. `allErrors` is computed once at the end from the live `errors` arrays (today
  it is a snapshot at 267, and the CLI gates on its length).
- Requester fallback (2.7): `Instance.requester`; a callee lookup inside an instance that fails in
  the owner (unknown name, or no overload for the argument types) is retried in
  `requester.moduleScope`. A hit sets `inst.usedSite`, registers the function in the owner under an
  alias (`hash@main`) with an entry in `externs: Map<alias, { module, name }>`, and lowers the call
  to the alias. After each drain, `usedSite` is propagated to instances that requested a
  `usedSite` instance. On a memo hit from a different requester with `usedSite` set, a separate
  instance is made with the requester in its key. Modules are checked strictly one after another
  (dependencies first), so `usedSite` is final before another module can ask.

---

## 4. Codegen changes

Reference: `git diff 5b2ee39 17585bc -- packages/compiler/codegen.ts` in the spike: 63 changed
lines. `funcToWat`, `typeToWasm`, `flattenType`, the load/store primitives, the data section, the
wide-int helper scan and `usesMemory` are **not** changed: an instance is an ordinary `FuncDecl`
with its own offsets, a `func` symbol under its own name in the module's symbols, and its types in
the module's map.

### 4.1 Calls

- `CodegenContext` (25-51) gains `calls?: Map<number, AST.Expr>`, set from `checkResult.calls` in
  `createContext` (53-65).
- `callToWat` (901), first statement:

  ```ts
  const lowered = ctx.calls?.get(expr.span.end)
  if (lowered && lowered !== expr) return exprToWat(lowered, ctx)
  ```

  The lowered node is an ordinary call to `max<u32>` (name through `ctx.nameMap` as for any
  function, comptime arguments simply absent), a call with the receiver as first argument, a
  `TupleExpr` for `Vec(T)(...)`, or a call to the function a comptime parameter stands for.
  Because this comes before `builtinToWat` (912), a generic named `max` is reachable. The
  `call_indirect` stub at 904-909 should become `throw new Error('unresolved call')`: after this
  change a checked program cannot reach it.
- `collectLocals` (2845-2849): for a `CallExpr`, visit the lowered expression when there is one
  (a UFCS receiver may need scratch locals), else the arguments as today.
- `CallExpr` types are now keyed at `span.end`. The direct `span.start` lookups of a value that
  may be a call switch to the existing `lookupExprType` (which tries `exprTypeOffset`, start, end):
  842 and 862 (operand type of builtin `min`/`max`/`abs`), 965 (argument type for the array→slice
  coercion), 2063 (`set (a, b) = f()`), 2093 (compound-assignment value), 2555 (arrow-body result
  coercion); `resolveExprType` (504-531) adds `CallExpr` to its `span.end` kinds.
- Required in stage 1 and not in the spike: **argument widening**. `max(a_u64, b_u32)` infers
  `T = u64`, the checker accepts the `u32` argument as a lossless widening, and `callToWat` passes
  it unconverted: invalid wasm [spike, `w2`]. This is the existing bug for every call (probe v1 of
  the checker map); inference makes it easy to hit. Fix in the argument loop (952-977): when the
  argument's type and the parameter's type are integers or floats with different wasm
  representations, wrap with the existing `emitConversion`. About 8 lines; same in `letToWat`
  (2012-2032) if cheap.

### 4.2 Emitting instances once, and nothing for unused generics

- The three loops that emit every `FuncDecl` skip generic declarations (`isGenericDecl(decl)`,
  exported from the checker): `moduleToWat` 2935-2942, `programToWat` 3431-3440, `emitTestDecl`
  3033-3039. A generic has no `func` symbol, so without the skip `funcToWat` would throw at 2478.
- After the module's ordinary functions, each assembler emits the module's instances:

  ```ts
  for (const inst of result.instances ?? []) {
    const watName = modNameMap.get(inst.ident as string) ?? (inst.ident as string)
    parts.push(funcToWat(inst, result, globalLiteralRefs, modNameMap, watName, undefined, dataSection.totalSize))
  }
  ```

  (`moduleToWat`: the same without a name map.) This is before the helper scan at 3495 / 2970, so
  an instance that adds two `u128`s gets `$__w2_add` like any function [spike test: `__w2_add`
  appears once after `grow<u128>`].
- `perModuleNameMap` (3301-3324) gets one entry per instance: `ident → prefix$ident`, so calls
  from any module resolve through the usual maps.
- "Emitted once" is the checker's memo (one `Instance` per key, 2.4). "Nothing for an unused
  generic" holds by construction: declarations are skipped and only instances are emitted; the
  WAT of a module with an unused generic is identical to the module without it [spike test].
  Instances requested only from `test` blocks exist only when the checker ran with
  `includeTests` (the CLI uses the same flag for check and codegen) [spike, `h1`].
- Test-declared generics: their instances are module instances (emitted with the module's, named
  `ident<key>`); the `__test_<prefix>_` naming is not applied. Two tests declaring different
  generics with one name follow today's rule for test functions (the later replaces the earlier).

### 4.3 `sizeof`

`sizeofToWat` (1838-1848) reads `ctx.types.get(typeKey(expr.span.start, 'SizeofType'))`, the
operand as the checker resolved it, and falls back to `resolveTypeFromAST` only when the entry is
missing. `sizeof(T)`, `sizeof(Vec(T))` and `sizeof((bool, u32, K))` are then right in every
instance, and the private resolver's "unknown name is `i32`" fallback can no longer be reached
from checked code.

### 4.4 Two existing miscompiles that the lookup change fixes

Switching 842/862 to `lookupExprType` changes the output of two existing files, both for the
better: builtin `min(a.len, b.len)` on `u32` lengths compared with `i32.lt_s` and now uses
`i32.lt_u` (`examples/math/trig/strcmp.ents`), and `abs(a - b)` on `f64` dropped the `f64.abs`
(`/home/user/monkey-fist/moonbit/encantis/builder/bugs/01-abs-of-difference.ents`). The operand was
a member or binary expression, whose type is keyed at `span.end`, so the old lookup found nothing
and fell back to signed `i32`. Stage 1 states this in its description and adds both as tests.
`stack/features.ents` and `solver/solver.ents` compile to identical WAT.

### 4.5 Exports

`exportToWat` (3177-3198) and its two callers (`moduleToWat`'s export loop, `programToWat`
3459-3470) skip an `ExportDecl` whose item is a generic `FuncDecl` or a `TypeFuncDecl`. Without
this the spike emits `(export "first" (func $first))` for a function that does not exist
[`min2/mm/lib.ents`], so a generic-only library file would not compile as an entry, which
`examples.test.ts` and `encantis check lib/x.ents` both do.

### 4.6 Later stages

- Stage 2 (overloads): the emit loops also skip `decl.overload`; the renamed shallow copies are
  already in `result.instances` and are emitted by the loop of 4.2 under `name:<keys>`
  (`$hash:''u32`). No other codegen change [spike probe: +8 lines].
- Stage 4: `buildFullNameMap(path)` (3336-3361) adds, for each entry of the module's `externs`,
  `alias → perModuleNameMap.get(module).get(name)`. While there, fix the existing lookup of an
  import by export name in a map keyed by identifier (3351, probe mm3), and give each module its
  own literal-ref map (literal ids are bare offsets in one program-wide map, 3285-3293; two
  modules with a literal at one offset already collide, probe mm2, and a library of generics makes
  multi-module programs the normal case).
- Stage 3 is codegen-only and unrelated to generics; it is listed in section 7.

---

## 5. Tooling: the minimum that keeps it correct

| Tool | Change | State without it |
|---|---|---|
| Formatter | `'comptime'` in `KEYWORDS` (formatter.ts:161-167) | Prints all new syntax stably already (`map-syntax.md` 8) |
| TextMate grammar | `comptime` in the keyword pattern (`encantis.tmlanguage.json:132`) | Upper-case names already colour as types |
| `queries.ts` | `symbolTypeString`: `generic func` / `generic type` for the two new symbol kinds (2 lines); `documentSymbols`: a `TypeFuncDecl` case | `hover` on a generic's name would call `typeToString(undefined)` |
| `meta.ts` | none required. `collectFunc` returns early for a non-`func` symbol (313-314) and every lookup is guarded | [spike] `encantis meta` on the Vec file: exit 0, 32 symbols, 136 hints, none outside the file, no warnings. Calls to a generic show the **instance's** signature, because the checker records it at the callee identifier. Generic declarations and their bodies have no hover and no semantic tokens |
| Language server | none required (`buildMeta` is already inside a `try`, serve.ts:248-261) | as meta |
| CLI `check`, `compile`, `wasm`, `run`, `test` | none | Instance errors are in the declaring module's `errors` with offsets inside its source, so the per-module printers (cli.ts:193-199 and the other three) print the right file and line, with `[in push(u32)]` in the message. Test-only instances follow `includeTests` |
| CLI `definition` / `references` / `rename` | none | Unchanged for ordinary code: instance checks do not write `symbolDefOffsets` and add only module-level references at real offsets. `T` has no definition (`No definition found`) |
| WAT preview | none | It runs `typecheckProgram` + `programToWat`, so instances appear |

Worth doing in stage 2 because the copy design makes it cheap (about 30 lines in meta.ts, no
checker change): **hover inside a generic body shows the first instance's types.** Meta walks the
original declaration and reads types at `offset + k * INSTANCE_STRIDE`, where `k` is the index of
the declaration's first instance. All 13 lookups in meta.ts are
`this.checkResult.types.get(typeKey(offset, kind))`; route them through one helper with a `shift`
field that is non-zero while a generic declaration is walked, and take the function symbol's type
from that instance. A generic with no instance stays without hints, which is honest: it has not
been checked. This also gives the declaration an outline entry and a semantic token.

Not done: a `typeParameter` token kind, go-to-definition for `T`, "which instances exist" in the
editor, and anything for imported generic types in single-file mode (section 8, Q3).

---

## 6. Tests and documentation

### 6.1 Tests

| Kind | File | Contents |
|---|---|---|
| Grammar bundle | `packages/compiler/grammar-bundle.test.ts` (new, 10 lines) | the committed bundle equals a fresh recipe of the `.ohm` |
| Parse | `spec/generics.md` (new; picked up automatically; add to the list at `spec/README.md:36-39`) | `ents FuncDecl`, `ents Type`, `ents Expr` blocks with `json ast` for: a comptime type field, a comptime function field, a type function, `Vec(T)` under each prefix form, each type-argument form of 1.3, and the forms that must stay expressions (`f(u32, x)`, `f((u32, u32), x)`, `f([], x)`) |
| Check, accept | `spec/generics.md` | whole-module blocks for each rule of section 2 (they are the tested copies of the docs' examples) |
| Check, reject | `spec/generics.md` | one block per row of 2.8 and the inference errors, with `errors` blocks. Based on `acceptance/a11_errors.md`, with the messages of this design. The checker reports follow-on errors after a failed call (`cannot assign i32 to u32`, as it does after any unknown identifier), so some blocks list two lines |
| Zero cost | `packages/compiler/generics.test.ts` (new; the spike's 272-line file is the starting point, derived from `acceptance/a10_zero_cost.test.ts`) | unused generic emits nothing (WAT identical to the module without it); one function per distinct argument set, repeats and aliases share; **instance equals the hand-written function byte for byte** (code-section bodies of two modules with functions in the same order); comptime function argument is a direct `call`; no `call_indirect`, `(table`, `(elem`, `ref.func`, `funcref` in the WAT; `sizeof` and load widths per instance; per-instance literals; parameter lists contain runtime parameters only |
| Checker | `packages/compiler/generics.test.ts` | error position and `[in ...]` suffix; an unused generic with a broken body is not an error; recursion; depth limit; test-only instances absent with `includeTests: false` |
| Regressions | `codegen.test.ts` | the two fixed builtins (4.4); argument widening (4.1); `if c { p.x } else { p.y }` typed correctly (`inferBody`) |
| Behaviour | `examples/generics/*.ents` (new directory, every file compiled as an entry by `examples.test.ts` and `examples:all`) | the acceptance programs with inline tests: `pick.ents` (a00), `minmax.ents` (a01), `find.ents` (a02), `sort.ents` (a07) in stage 1; `duck.ents` (a03), `vec.ents` (a04), `set.ents` (a05 shape), `compose.ents` (a08) in stage 2, in the spelling today's memory model allows; rewritten to the acceptance text in stage 3. Small `data` buffers: a bun test has 5 s and a 16 MB zeroed stack takes 9 s to compile |
| Modules | `packages/compiler/tests/fixtures/modular/` + `loader.test.ts`; `examples/generics-modules/main.ents` (a09) | one copy of `push<u32>` when two modules ask; mangled names; a library compiled alone has no functions and no exports; the requester's `hash` is called from the library's instance |
| Kernel | monkey-fist harnesses, run by hand before release | `node moonbit/encantis/check-features.cjs` on a12: 0 mismatches; wasm size and time against `stack/features.wasm` |

### 6.2 Documentation

Only `spec/*.md` is executed (`spec/spec.test.ts:67`); of the 120 `ents` blocks in
`docs/encantis.md`, 23 would pass as modules. The requirement "docs' code blocks run as spec
tests" is therefore met by writing every generics example as a block in `spec/generics.md` and
using the same text in the reference. No runner change in this design (a `wat` expectation block
would be new runner code at `spec.test.ts:105-113`; the zero-cost property is tested in
`generics.test.ts` instead).

`docs/encantis.md`:

- Keywords (`:47-57`): add `comptime`.
- New section **"Compile-time values"**, placed with the type system, replacing both "Future
  Additions: Generics" (`:2017-2031`, the `<T>` sketch) and the first half of "Comptime
  Evaluation" (`:2048-2069`): one idea, three existing forms and one new one: literal types
  (`int(5)`), `def`, `sizeof`, and now **types**; a `comptime` parameter must be given such a
  value; a function whose parameters are all comptime and whose result is `type` is evaluated by
  the compiler. Then: generic functions (explicit and inferred arguments, the inference rules of
  2.2 as a table), comptime function parameters, generic types (structural aliases; construction
  with `Vec(T)(...)`), requirements checked at instantiation (with an error example), instances
  and zero cost (one function per argument set, nothing at run time, nothing for unused generics),
  limits (2.8).
- "Future Additions: Comptime Evaluation" keeps what is still future: comptime value parameters,
  `[n]T`, comptime `if`, `comptime func`; described as the next steps of the same mechanism.
- UFCS (`:1248-1284`): remove "Not yet implemented" in stage 2; add field precedence, the receiver
  rule for generics, "no address is taken", chaining.
- Functions (`:803-847`): overloads by parameter type (stage 2); the `:2090-2109` sketch already
  assumes them.
- Builtins (`:1852-1921`): a generic named like a builtin takes precedence.
- Structs: document memory layout and `sizeof` (packed, declaration order, no padding:
  `sizeof((bool, u32, []u32))` is 13). Containers depend on it and it is undocumented.
- Imports (`:1629-1654`): generics and type functions as import items (stage 4); `export` on a
  generic.

`docs/grammar.md`: Identifiers (`:11-34`: `comptime`; upper-case names for type parameters and
type functions), Functions (`:155-199`: comptime fields, type functions), Types (`:267-398`:
`Name(args)`; fix the unclosed fence at `:271`), Function Call (`:661-683`: type arguments, which
forms are parsed as types and which are read as types by the checker). `README.md` and
`lib/README.md`: one generic example; the library files once they exist.

---

## 7. Staging

Four pull requests. Each leaves `bun test`, `bun run lint`, `bun run typecheck` and
`bun run examples:all` green. Stage 3 is independent of the others and can be built in parallel
or first.

### Stage 1: "Comptime type parameters: generic functions and generic types"

Sections 1 (all grammar and AST except the import item), 2.1, 2.2, 2.4, 2.5 (operators), 2.6, 2.8,
3.1-3.5 without UFCS and overloads, 4.1-4.5, the required tooling of section 5, tests, docs.
It includes moving `CallExpr` types to `span.end`: `Vec(T)(a, b)` is a call of a call, and both
start at the same offset. Known size: the spike's patch minus UFCS, about 1,000 lines with tests;
plus the five items the spike lacks (operand check, argument widening, export skip, label
truncation, `T(...)` error).

Acceptance: a00 as written; a01 without its struct-swap test; a02 as written; a07 for `i32` with
two comparators, calls spelled `sort(xs, by)`; a10; the stage-1 rows of a11. All of these pass on
the spike today (`min/t/a00_pick.ents`, `a01_scalar.ents`, `a02_find.ents`, `a07_scalar.ents`).
Useful on its own: `max`/`min`/`clamp`/`swap`/`find`/`sort` once per program instead of once per
type, and generic types for code written in the explicit style.

### Stage 2: "Method-call syntax and overloads: calls resolved by receiver and argument types"

2.3 and the overload half of 2.5; the stage-2 parts of 3.2, 3.4, 4.6; hover in generic bodies
(section 5); UFCS and overload docs. About 150 lines plus tests. Neither feature is about
comptime, and both are useful without generics.

Acceptance: a03 for `u32` and `[]u8` elements; a04 and a08 for scalar elements with explicit
`.*` (`min/t/a04_vec_scalar.ents`: passes on the spike, including chained calls); a set for two
key types in one module with duck-typed `hash`/`eq` (`min2/o1.ents`: passes on the spike with the
overload probe).

### Stage 3: "Values in memory: structs, tuples and bool behind pointers" (no generics code)

What the container programs need from codegen, each with a non-generic regression test (the
probes in `probes-codegen/s1.cases`, `p2`-`p4`, and `probes/p01`-`p33` are ready-made cases):

1. `bool` loads and stores are one byte (today 4 bytes at a 1-byte size: a store clobbers the
   neighbour);
2. whole struct, tuple and `[N]T` load and store, field by field at `fieldByteOffset`, with a
   scratch local for the address (today invalid wasm, and a silent 4-byte copy for
   `dst[i] = src[i]`);
3. field access through a pointer without `.*` (`v.len`, `v.len += 1`: today the read returns the
   pointer), nested fields and positional fields in memory (today wrong offsets, writes emit
   nothing), by making `lvalueAddressOf` (983-1008) a recursive place function;
4. `&p[i]` and `&p[i].f` on a many-pointer (today a load);
5. an `if` statement whose branches differ in value-ness; a member of a call result;
6. the silent fallbacks become thrown errors (1146-1147, 2268, 369-370, 313/364/1784).

Acceptance: a01, a03, a04, a05, a06, a07, a08 **exactly as written** in `acceptance/`, replacing
the stage-1/2 spellings in `examples/generics/`.

### Stage 4: "Generics across modules, and the container library"

1.1 import item, 2.7, 3.6, 4.6; `lib/vec.ents`, `lib/set.ents`, `lib/map.ents`, `lib/sort.ents`
with inline tests (and the bump stack they allocate from: an owner decision, Q4).

Acceptance: a09 as written (one instance of each of `vec`, `push`, `items` for `u32` and for
`Cell`; `slot` and `add` for `Cell` calling `main`'s `hash` and `eq` directly; `zeroed` once;
`containers.ents` compiled alone has no functions and no exports); a12, the features kernel on
`Set([]u32)`, against `check-features.cjs` with 0 mismatches.

---

## 8. Risks, open questions, and what to cut first

### Risks

1. **Virtual offsets.** Any code that turns an offset into a place, or assumes an offset is inside
   the file, must go through the three guards. Today's consumers were audited: errors and warnings
   (guarded), definitions and references (guarded), `findIdentOffset` (`def` and `data` declarations only,
   never inside a function), test assert offsets (emitted only for asserts written
   directly in a test body, never in a function), meta and queries (they walk `module.decls`, where
   copies never appear; [spike] no hint outside the file). A future feature that reports offsets
   from inside functions (assert locations in functions, source maps) has to map them. The types
   map contains keys beyond the file; nothing iterates it by position.
2. **Double inference of arguments.** Inferred calls look at each argument twice (`inferExpr`,
   then `checkExpr`). The checker already does this for binary operands; errors de-duplicate;
   literal registrations are rolled back. A side effect in inference that is not idempotent would
   show up here first. `pinned` exists for the same reason (a UFCS receiver).
3. **The checker accepts what codegen cannot compile.** Duck typing is only as good as the
   checker's checks. Stage 1 adds operand validation and argument widening; anything else of this
   kind (struct `==`, calling a function-typed runtime parameter) still appears as a wabt error
   at the instance. The stage-3 "throw instead of emitting wrong code" items narrow this.
4. **Follow-on errors.** A failed generic call recovers as `i32`, so `cannot assign i32 to u32`
   often follows the real error. Same as every unknown identifier today. A shared recovery
   sentinel that `checkExpr` accepts silently would fix it for the whole checker; not in this plan
   because it changes existing error counts.
5. **Two existing outputs change** (4.4). Both are fixes, both in files that are examples of the
   bug, but they are behaviour changes in a feature PR.
6. **Overload sets through internal names.** No general symbol identity: an overload set cannot be
   imported or exported under one name, `symbols.get(name)` returns the first declaration (meta
   shows the first signature at every declaration of the name), and the never-used warning is
   keyed by name. Enough for `hash`/`eq`; a real overload feature would revisit it.
7. **Cross-module state.** Stage 4 keeps contexts alive, re-finalizes results and makes one
   module's result depend on what later modules requested. The CLI recomputes everything per run,
   so this is safe today; an incremental or multi-file language server would need a program-level
   instance table instead.
8. **Requester-dependent instances** (2.7) are the least-tested idea here: nothing in the spike
   covers it. The rule is conservative (never shares an instance that might differ) and relies on
   modules being checked strictly in sequence.
9. **Instance names and stage order.** Names are stable for a given program but an instance's
   position in the output follows request order, so adding a call can reorder functions (not
   their bodies). Byte-identical rebuilds of unchanged sources are unaffected.
10. **`def` substitution in the parser** is unscoped: a comptime *function* parameter (lower-case)
    named like an earlier `def` is replaced in the body before the checker sees it, exactly as an
    ordinary parameter is today. Not made worse; fixed only when `def` moves into the checker.

### Open questions for the owner

- Q1. Are overloads acceptable as the way two key types coexist (it is what "resolved for the
  concrete K" needs, and the docs already plan them), or should `hash`/`eq` be comptime function
  parameters of the containers? The second works at stage 1 with no further code.
- Q2. `vec` returns `*mut Vec(T)` (header on the bump stack), as the acceptance programs assume.
  A by-value header with `v.push(x)` needs the address of a register-held struct and is a
  different feature.
- Q3. Imported generic **types** in the single-file editor: the import item has no body, so
  `Vec(u32)` cannot be expanded there. Either the language server loads source imports for
  checking (the desktop WAT preview already has a synchronous loader; the web build has no file
  system) or files that import generic types show degraded diagnostics. Not solvable inside the
  checker alone.
- Q4. Where the bump stack lives (`lib/stack.ents`, or the containers take `comptime alloc`).
- Q5. Is reserving `comptime` in a minor release acceptable.
- Q6. Should a non-generic user function named like a builtin also win (today the builtin wins
  silently)? This design changes it only for generics.

### What to cut first if it runs long

1. Sharing requester-independent instances across modules: key every cross-module instance by its
   requester. Costs duplicate functions only when two importing modules use the same instance.
2. Hover inside generic bodies (section 5).
3. Overloads: ship stage 2 with UFCS only and containers that take `comptime hash` / `comptime eq`.
   This changes the surface the owner described, so it is a fallback, not a plan.
4. Inference through type functions' bodies for anything but pointers to them (keep `*Vec(T)`,
   drop nested cases).
5. The literal-ref-per-module fix (existing bug, orthogonal).
Not cuttable: operand validation, argument widening, the export skip, the `sizeof` entry, the
bundle test, the zero-cost tests.

---

## 9. Where this approach stops, honestly

**Why it is still "the first step of comptime evaluation" and not a second mechanism.** The model
is: a compile-time value bound to a name is substituted where the name is used. `def` is that for
integers, floats and data pointers, at parse time, module-wide. A comptime parameter is that for
types and function names, at instantiation, scoped to one function. `exprAsType` evaluates a
type-valued expression exactly as `evalComptimeExpr` (checker.ts:1026-1122) evaluates an
integer-valued one, and a type function is a function the compiler evaluates. The next steps reuse
the same parts:

- **comptime value parameters** (`comptime n: u32`): evaluate the argument with
  `evalComptimeExpr`, substitute a literal in the copy (what `def` does), put the value in the
  instance key. Needs `[n]T` in the grammar for fixed-capacity containers.
- **moving `def` into the checker**: the same substitution with proper scoping, removing the
  parser's unscoped map (`encantis-actions.ts:8`) and its order dependence.
- **merging the evaluators**: `ComptimeValue` (checker.ts:50-54) gains `{ kind: 'type' }` and
  `{ kind: 'func' }`, `exprAsType` becomes a case of `evalComptimeExpr`.

**Where substitution into a copy is the wrong tool:**

1. **Compile-time control flow.** `if` on a comptime condition that removes a branch before it is
   checked, type functions with block bodies, loops unrolled at compile time, `comptime func`
   building a table: these need an evaluator that walks statements with an environment. A copy
   with names replaced cannot decide anything. The copy can remain as the last step (evaluate,
   then specialise), but the substitution callback becomes an environment, and at that point
   binding comptime parameters in a scope (and resolving `TypeRef` through the scope chain) is the
   natural representation; `BoundType` would go.
2. **Anything that needs the type of an uninstantiated generic.** There is no `FuncRT` for
   `push`, no type variables, no type-of-types. So: no declaration-level hover with `T` in it, no
   errors in an unused generic, no function-typed values of generic functions, no bounded or
   constrained parameters, no inference that has to reason about two unknowns at once (it matches
   declared-type syntax against one concrete type at a time). Adding `typevar` to `ResolvedType`
   later is possible and local (it would replace `unify` over AST types), but it is new machinery
   this design deliberately does not have.
3. **Offset arithmetic as identity.** Keeping instances apart by shifting spans is cheap because
   everything is keyed by offset today. It is also a second meaning for "offset". If the compiler
   ever gets node identities, per-function tables, or an incremental checker, instances should
   become records with their own tables (option A of the checker map) and the stride should go.
   The public shape (`result.instances`, `result.calls`, internal names) would survive that.
4. **Cost per instance.** Every instance is a deep copy of the body, checked from scratch. Bodies
   are tens of nodes and programs have tens of instances, so it is not measurable now; a generic
   used at hundreds of types in a large program would make checking time proportional to
   instances × body size, which is inherent to duck-typed checking, plus the copy.
5. **Overloads and the lowering table** are name rewriting, not resolution: fine for direct calls,
   useless for a future feature that needs "the function this call refers to" as a first-class
   thing (function values, closures, call graphs for dead-code elimination).

None of these is needed for `Vec(T)`, `Set(K)`, `Map(K, V)` or the sort.
