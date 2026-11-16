# Comptime generics for Encantis: the language design

Lens of this document: **the language user and the zero-cost guarantee.** It is written in the order a
user meets the feature. Part I is the reference chapter as it would appear in `docs/encantis.md`: exact
syntax and semantics, inference rules a programmer can predict, every error and how it reads. Part II
says what "zero-cost" means and how it is tested. Part III derives the implementation from the two:
grammar, checker, codegen, tooling, tests, staging, risks.

Paths are relative to `/home/user/encantis` (branch `claude/generics`, = v0.2.1) unless absolute;
`checker.ts`, `codegen.ts` and so on mean `packages/compiler/<file>`, `ohm:N` means
`packages/compiler/encantis-grammar.ohm` line N. Line numbers are for v0.2.1.

Evidence marks:

- **[probe]** ran against the unmodified 0.2.1 compiler (by me, files in
  `/tmp/claude-0/-home-user-monkey-fist/c2838201-d71f-55a0-bc1a-cc2e586d01ea/scratchpad/generics/lang/probes/`, or by the five mapping notes).
- **[spike]** ran on a private copy of the compiler,
  `/tmp/claude-0/-home-user-monkey-fist/c2838201-d71f-55a0-bc1a-cc2e586d01ea/scratchpad/generics/lang/spike-min/`.
  It is a copy of the prototype another design run left in `generics/min/repo` (comptime type and
  function parameters, type functions, UFCS, a first cut of overloads), plus four small patches of
  mine, each marked `PROBE (lang)` in the source: operand validation and the recovery type
  (III.2.7), a declared function replacing a builtin (III.2.3), and the emission order of III.3.2.
  I ran every result quoted here myself; I did not write that prototype and I do not treat
  anything I did not run as evidence. `bun test` in the copy with all four patches: 676 pass, 6
  skip, 2 fail; the two failures are tests the prototype added that expect the cascade errors my
  patch removes. No test that exists in 0.2.1 fails.
- **[design]** not run anywhere. Where the spike behaves differently from this design, the text says so.

Nothing in `/home/user/encantis` or `/home/user/monkey-fist` was modified. The directory
`generics/lang/` named in the task did not exist; there was nothing from the interrupted run to reuse.

Contents

- 0. The design in one page
- Part I. The reference chapter
  - I.1 Compile-time parameters
  - I.2 Calling a generic function
  - I.3 Generic types
  - I.4 Method-call syntax
  - I.5 Overloads and requirements
  - I.6 Instances
  - I.7 Modules, exports, tests
  - I.8 Errors
  - I.9 Not in this version
  - I.10 How this is compile-time evaluation
- Part II. The zero-cost guarantee and its tests
- Part III. Implementation
  - III.1 Syntax: grammar, AST, ambiguities
  - III.2 Checker
  - III.3 Codegen
  - III.4 Tooling
  - III.5 Tests and docs
  - III.6 Staging: four pull requests
  - III.7 Risks, open questions, what to cut first
- Appendix. Probes run for this document

---

## 0. The design in one page

```ents
func Vec(comptime T: type) -> type => (ptr: [*]mut T, len: u32, cap: u32)
func push(comptime T: type, v: *mut Vec(T), x: T) { ... }
func max(comptime T: type, a: T, b: T) -> T => if a > b { a } else { b }
func sort(comptime T: type, xs: []mut T, comptime before: (T, T) -> bool) { ... }

let v = vec(u32, 16)     // every type parameter written
v.push(7)                // method-call syntax; T decided by v
let m = max(a, b)        // T decided by a
xs.sort(by_cost)         // T decided by xs; by_cost is called directly
```

**The model, in one sentence.** An instance of a generic is the function you would get by writing the
generic out by hand for those arguments, and the compiler guarantees it compiles to the same bytes.
Everything else follows from taking that sentence literally:

| Question | Answer | Where |
|---|---|---|
| What can be a comptime parameter? | A type (`comptime T: type`) or a function (`comptime before: (T, T) -> bool`). Values (`comptime n: u32`) parse and are rejected with a message until a later version | I.1 |
| When may type arguments be left out? | All of them or none. A call with every parameter written is explicit; a call with only the non-type parameters is inferred. Argument count tells them apart | I.2 |
| How is `T` inferred? | By the first argument, left to right, whose parameter mentions `T` and which is not an untyped literal. Its type is matched against the parameter's written type. Every other argument is then an ordinary argument of a known type | I.2 |
| What is `Vec(u32)`? | A structural alias, like every type in the language today. `Vec(u32)`, `Stack(u32)` with the same body, and the written-out struct are one type and share instances. Inference sees through it because matching uses the body | I.3 |
| How is a `Vec(u32)` built? | Three spellings, all the same value: `Vec(u32)(p, 0, cap)`, a struct literal where the type is expected, or a helper function | I.3 |
| `v.push(7)`? | `x.f(args)` is `f(x, args)` when `x` has no field `f`. The receiver is the first non-comptime parameter and is passed as written: no implicit `&` | I.4 |
| How does `Set(K)` find `hash(k)`? | Functions may share a name when their parameter types differ. A call picks the one that accepts the arguments. In an instance the lookup is done for the concrete types: first in the generic's module, then in the module that asked for the instance | I.5 |
| What is one instance? | One per generic and argument set for the whole program. Types compare structurally; functions by identity. If two modules would give the same instance different `hash` functions, that is an error | I.6 |
| What does an error in a generic body look like? | One error, at the offending line of the generic, with the instance named and the call that asked for it: `no function 'eq' accepts (u32, u32), in index_of(T = u32)` | I.8 |
| What is emitted for an unused generic? | Nothing. Its body is not even checked | I.6, II |
| How is zero-cost tested? | The generic program and the hand-written program are compiled and their `.wasm` files compared byte for byte, in unit tests and in the spec-tested docs | II |

**What was run for this document** (details in the appendix):

| Claim | Evidence |
|---|---|
| The owner's six lines compile and run with a header behind a pointer | **[spike]** `probes/s1.ents`: `vec(u32, 16)`, `v.push(7)`, `v.push(u32, 8)`, `max(a, b)` for `u32` and `f64`; test passes; WAT has `$vec<u32>`, `$push<u32>`, `$max<u32>`, `$max<f64>` and direct calls only |
| A generic program and its hand-written twin are the same `.wasm` file | **[spike] + [probe]** `probes/z1g.ents` (generic `max` and `sum`, five instances) compiled by the spike and `probes/z1h.ents` (hand-written, functions in emission order) compiled by unmodified 0.2.1: both 317 bytes, `cmp` reports no difference, same sha256 |
| An unused generic emits nothing, and its body is not checked | **[spike]** `probes/u1c.ents` (an unused generic type and two unused generic functions, one of them calling a function that does not exist) and `probes/u1a.ents` (without them): identical 108-byte `.wasm` |
| Generic types are structural and share instances | **[spike]** `probes/c1.ents`: a `Vec(u64)`, a `Stack(u64)` and the written-out struct all reach one `$cap_of<u64>`; `Vec(T)(...)`, a struct literal and `T(a, b)` construct; `sizeof(Vec(T))`, `sizeof(Pair(T, bool))` are right per instance; test passes |
| Inference rules of I.2 | **[spike]** `probes/i1.ents`, `i2.ents`: range dropped (`u32#12` gives `max<u32>`), `*[4]u32` for `[]T`, `*mut u64` for `*T`, literal takes `T` (`max(a, 3)` with `a: u64`), `max(a, 3)` with `a: f64` is the same error a hand-written function gives, first argument decides (`max(a_u8, b_u32)`: `argument 2: cannot assign u32 to u8`) |
| Comptime function parameters are direct calls | **[spike]** `probes/x2.ents`: `$sort<i32\|ascending>` contains `(call $ascending ...)`; `xs.sort(descending)` works; `twice(inc, x)` compiles to `(call $inc (call $inc ...))` |
| Duck-typed `hash`/`eq` through overloads and method syntax | **[spike]** `probes/o1.ents`: `a.hash() == hash(b) && a.eq(b)` in a generic resolves per key type; a key type with no `eq` reports `no function 'eq' for ([]u32, []u32) [in same([]u32)]` |
| Operators can be checked per instance without breaking anything | **[spike]** my patch to `inferBinary`: `operator > is not defined for Pt [in max(Pt)]`; no 0.2.1 test fails; no file under `examples/`, `lib/` or `/home/user/monkey-fist/moonbit/encantis` gets the new error |
| One mistake can be one error | **[spike]** my recovery-type patch: `probes/e2.ents` goes from 15 errors to 9 for its 9 mistakes, a missing `eq` from 3 errors to 1; no 0.2.1 test fails |
| A declared function can replace a builtin | **[spike]** my patch (4 lines): `probes/r3.ents` now calls the user's `max`; no 0.2.1 test fails; the WAT of all 83 `.ents` files under `examples/`, `lib/` and the monkey-fist kernels is unchanged by my four patches |
| "A generic's place is taken by its instances, in name order" gives byte-identical output against a twin written the natural way | **[spike] + [probe]** my emission patch: `probes/d1g.ents` against `d1h.ents` (the example of II.3, 94 bytes) and `z2g.ents` against `z3h.ents` (1,323 bytes) |
| The grammar of III.1 changes no existing parse | **[probe]** `probes/gram.ts`: 352 sources (every `.ents` file and markdown block of both repos), 0 change in parse result against the grammar the syntax map already compared with 0.2.1; all new forms parse |
| What the prototype, as found, gets wrong for a user, which this design specifies away | **[spike]** `probes/e2.ents`: every failed generic call is followed by a second, false error (`cannot assign i32 to u32`); a missing `eq` is three errors; the nesting-limit error prints a type several kilobytes long; `export func` of a generic in an entry module emits an export of a function that does not exist (`probes/u1b.ents`, wabt error); a user `max` that is not generic still loses to the builtin (`probes/r3.ents`) |
| The owner already keeps the list of what blocks containers | `/home/user/monkey-fist/moonbit/encantis/builder/bugs/` holds 20 repro files for 0.2.1. Eight are the "values in memory" work of PR 3 (04, 05, 06, 07, 09, 13, 17, 18); 10 ("a function passed as an argument cannot be called... so a sort cannot take its comparator") is answered by comptime function parameters; 12 (builtin `max(1.0, x)` rejects a literal first argument) is rule 3 of I.2; 19 is fixed by III.2.9's `inferBody` change |

**Four pull requests.** (1) Generic functions and generic types in one module, with the zero-cost
tests. (2) Method-call syntax, overloads, requirements. (3) Values in memory: structs, tuples and
`bool` behind pointers, `v.len` through a pointer; no generics code, and the largest piece of work on
the way to the first users. (4) Generics across modules and the container library. III.6 lists the
acceptance programs of each.

---

# Part I. The reference chapter

This part is written as documentation. It becomes the new section "Generics" of
`docs/encantis.md` (III.5 says where and what moves), inside a region that the spec runner executes
(II.3), so every `ents` block below is a test.

The chapter is shown in its final form. Three of its examples reach a struct through a pointer
with `v.len` or store a whole struct (`v.* = ...`) or keep a `bool` in a slot; those forms are
miscompiled by 0.2.1 whether or not generics are involved and are repaired in PR 3 (III.3.6). Until
then the same examples are written `v.*.len`, with field-by-field stores and a `u32` flag, which
is how the probes of this document are written.

## I.1 Compile-time parameters

A parameter marked `comptime` is given at compile time. The function is compiled once for each
distinct set of compile-time arguments it is used with, and each copy is an ordinary function with
only the remaining parameters.

```ents
func max(comptime T: type, a: T, b: T) -> T => if a > b { a } else { b }

export func widest(a: u32, b: u32) -> u32 => max(u32, a, b)
```

There are two kinds of compile-time parameter.

**A type parameter**, `comptime T: type`. Its name starts with an upper-case letter, like every type
name. Inside the function `T` is a type: it can be used wherever a type can be written (`x: T`,
`[]T`, `*mut T`, `sizeof(T)`, `p as [*]mut T`, `Vec(T)`), and passed on as a type argument (`vec(T, 4)`).

**A function parameter**, `comptime before: (T, T) -> bool`. Its argument is the name of a function.
Inside the generic, `before(a, b)` is a direct call of that function. This is how a sort takes its
comparator without a function pointer:

```ents
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

func ascending(a: i32, b: i32) -> bool => a < b
func descending(a: i32, b: i32) -> bool => a > b

export func up(xs: []mut i32) { sort(xs, ascending) }
export func down(xs: []mut i32) { sort(xs, descending) }
```

`up` and `down` call two different copies of `sort`; one contains `call $ascending`, the other
`call $descending`. **[spike]**

Rules:

1. Comptime parameters may appear anywhere in the parameter list. By convention type parameters
   come first and function parameters last (so that `xs.sort(by_cost)` reads well).
2. A parameter's type may mention any type parameter of the same function, wherever it is declared.
3. `comptime` is only allowed on the parameters of a named function declared with `func`. It is an
   error in a struct type, an enum payload, a result list or a function type.
4. A function with a comptime parameter is a *generic function*. It is not a value: it cannot be
   stored, passed as an argument, or exported to the host. It can only be called.
5. The body of a generic function is checked when the function is instantiated, with the types
   filled in, and not before. A generic function that is never used is only parsed, and nothing is
   emitted for it. (Its signature is checked when it is declared: an unknown type name in a
   parameter is reported whether or not the function is used.)
6. A comptime function argument is the name of a function declared at module level, or a comptime
   function parameter of the enclosing generic passed on. It can decide a type parameter like any
   other argument (`twice(inc, x)` with `comptime f: (T) -> T` gives `T` from `inc`); a name with
   several overloads decides nothing and is chosen once the types are known.

`comptime` is a keyword. So is `type`, as before.

## I.2 Calling a generic function

A call to a generic function is written in one of two forms.

**Explicit.** Every parameter gets an argument, in order. The argument of a type parameter is a type:

```ents
func max(comptime T: type, a: T, b: T) -> T => if a > b { a } else { b }
type Pt = (q: i32, r: i32)
func first(comptime T: type, xs: []T) -> T => xs[0]

export func a(x: u8, y: u32) -> u32 => max(u32, x, y)      // x is widened, as for any u32 parameter
export func b(ps: []Pt) -> Pt => first(Pt, ps)
export func c(ps: [][]u8) -> []u8 => first([]u8, ps)
export func d(ps: []*mut Pt) -> *mut Pt => first(*mut Pt, ps)
export func e(ps: [](i32, i32)) -> (i32, i32) => first((i32, i32), ps)
```

Any type can be written as a type argument, in the same syntax as after a colon. In that position a
name is read as a type even if a variable of the same name is in scope (`u8` there is the type, as
it is in `let x: u8`).

**Inferred.** The type parameters are left out, all of them, and the compiler finds them from the
other arguments:

```ents
func max(comptime T: type, a: T, b: T) -> T => if a > b { a } else { b }
func first(comptime T: type, xs: []T) -> T => xs[0]

export func a(x: u32, y: u32) -> u32 => max(x, y)          // T = u32
export func b(x: f64) -> f64 => max(x, 0.5)                 // T = f64; the literal is an f64
export func c(xs: []u64) -> u64 => first(xs)                // T = u64
```

Comptime *function* parameters are never left out: `sort(xs, ascending)` is the inferred form of
`sort(i32, xs, ascending)`.

**Which form a call is** depends only on how many arguments it has. If a function has `P` parameters
of which `K` are type parameters, a call with `P` arguments is explicit and a call with `P - K`
arguments is inferred. Anything else is an error that says both counts. There is no form that
writes some type parameters and infers others.

### How type parameters are inferred

The rules are meant to be predictable from the call alone.

1. **The first argument that can decide a type parameter decides it.** Go through the parameters
   left to right. The first one whose written type mentions `T`, and whose argument is not an
   untyped literal, decides `T`.
2. **Deciding is matching shapes.** The parameter's written type is laid over the argument's type:
   `T` against `u32` gives `T = u32`; `[]T` against `[]u64` gives `T = u64`; `*mut Vec(T)` against
   a `*mut Vec(u32)` gives `T = u32` (I.3); `(T, U)` against `(i32, f64)` gives both.
   Matching looks through the conversions an argument gets anyway, and through nothing else:

   | Parameter | Argument | Result |
   |---|---|---|
   | `*T` | `*mut X` | `T = X` (mutable to read-only) |
   | `[]T` | `[]mut X` | `T = X` |
   | `[]T`, `[*]T` | `*[N]X` (a `data` array, a string) | `T = X` (array pointer to slice) |
   | `?*T` | `*X` | `T = X` (a pointer is an optional pointer) |
   | `T` | a value known to be in a range, `u32#12` | `T = u32` (the range is dropped) |
   | `T` | `u8` where another argument is `u32` | `T = u8`: numbers are **not** widened to make arguments agree |

   Type aliases are transparent, as everywhere: `T` matched against a `Pt` is the struct `Pt` names.
3. **Untyped literals never decide.** `7`, `0.5` and `[1, 2, 3]` have no type of their own; they take
   the type the parameter turns out to have. `v.push(7)` pushes a `u32` because `v` is a
   `*mut Vec(u32)`. A literal with a type written on it (`7:u8`) is typed and can decide.
4. **Every other argument is an ordinary argument.** Once `T` is decided, the remaining arguments
   are checked against the now-concrete parameter types exactly as for a hand-written function:
   the same implicit conversions, the same errors.
5. **Nothing left to chance.** If no argument decides a type parameter, the call is an error and
   the parameter has to be written. That includes a call whose only candidates are literals
   (`max(1, 2)`), and a type parameter that appears only in the result (`zero()`): the expected
   type of the call is not used for inference.

Consequences worth seeing once:

```ents
func max(comptime T: type, a: T, b: T) -> T => if a > b { a } else { b }

func f(a: u8, b: u32) -> u32 => max(a, b)
```

```errors
argument 2: cannot assign u32 to u8 (T = u8 was decided by argument 1; write max(u32, a, b) to choose)
```

`max(b, a)` is accepted (`T = u32`, and `a` widens like any `u8` passed for a `u32`), and so is
`max(u32, a, b)`. The rule is "first decides", not "find a type that fits all": the second is harder
to predict and the builtin `min`/`max` already work the first way (checker.ts:2481-2495).

```ents
func max(comptime T: type, a: T, b: T) -> T => if a > b { a } else { b }
func g(a: f64) -> f64 => max(a, 3)
```

```errors
argument 2: cannot assign int(3) to f64
```

That is the error `let x: f64 = 3` gives today **[probe]** and the error a hand-written
`max_f64(a, 3)` gives; `max(a, 3.0)` is fine. Generics do not change what a literal can become.

## I.3 Generic types

A generic type is a function from types to a type. It is declared with `func`, an upper-case name,
the result `type`, and a type after `=>`:

```ents
func Vec(comptime T: type) -> type => (ptr: [*]mut T, len: u32, cap: u32)
func Pair(comptime A: type, comptime B: type) -> type => (first: A, second: B)
func Slot(comptime K: type) -> type => (used: bool, hash: u32, key: K)
func Set(comptime K: type) -> type => (slots: [*]mut Slot(K), mask: u32, count: u32)
```

Applying it, `Vec(u32)`, is a type, and can be written wherever a type can: a parameter
(`v: *mut Vec(T)`), a result, a field, a cast (`p as *mut Vec(T)`), `sizeof(Vec(T))`, a `let`
annotation, another generic type's body, a type argument (`first(Vec(u32), vs)`). There is no space
between the name and the parenthesis: `Vec(u32)`, not `Vec (u32)`.

All parameters of a generic type are type parameters, and all of them are always written: `Vec`
alone is not a type.

### What `Vec(u32)` is: an alias with parameters

`Vec(u32)` **is** the type `(ptr: [*]mut u32, len: u32, cap: u32)`. It is not a new, distinct type.
This is the rule every type name in Encantis already follows (`type Meters = f64` and `f64` are the
same type), extended to names with parameters. Consequences:

- A value built as a plain struct with those fields is a `Vec(u32)` and can be passed as one.
- Two generic types with the same body (`Vec` and a `Stack` declared with the same fields) are
  interchangeable, and functions instantiated for them share one copy. **[spike]**
- `Vec(u8)` and `Vec(u32)` are different types because their bodies differ (`[*]mut u8` against
  `[*]mut u32`), and the error says so with the names: `cannot assign *Vec(u8) to *Vec(u32)`. **[spike]**
- Error messages and hover show the name as written, `Vec(u32)`.

This answers the open question "how does a signature spell *a pointer to some `Vec(T)`*": it spells
it `v: *mut Vec(T)`, and inference works by matching the *body* of `Vec` against the argument's
type. Given a `*mut Vec(u32)`, the parameter `*mut (ptr: [*]mut T, len: u32, cap: u32)` is laid over
`*mut (ptr: [*]mut u32, len: u32, cap: u32)` and `T = u32` falls out. It does not matter how the
argument's type was written. One limit follows: a type parameter that the body never uses cannot
be inferred through the type, and must be written at the call (`cannot infer T ... : 'Tagged(T)'
does not use T in its fields`).

### Building a value

There are three spellings, and they are the same value:

```ents
func Vec(comptime T: type) -> type => (ptr: [*]mut T, len: u32, cap: u32)
data room = mut [0:u8; 64]

// 1. The applied type as a constructor, like Point(1, 2).
func a(comptime T: type) -> Vec(T) => Vec(T)(room as [*]mut T, 0, 4)
// 2. A struct literal where the type is known.
func b(comptime T: type) -> Vec(T) => (ptr: room as [*]mut T, len: 0, cap: 4)
// 3. Whatever helper the library offers.
func c() -> Vec(u32) => a(u32)
```

`Vec(T)(args)` takes its fields by position or by name, as every struct constructor does. `T(args)`
also works when `T` is a type parameter that turns out to be a struct or tuple; when `T` is a
number it is an error that suggests `x as T`. (`u32(x)` is a cast because `u32` is a primitive's
name; `T(x)` is a constructor because `T` is a type name. A generic body that converts numbers
writes `x as T`.)

### Size and layout

`sizeof(T)`, `sizeof(Vec(T))` and `sizeof(Slot(K))` are constants in each instance. A struct's size
is the sum of its fields' sizes: fields are packed in declaration order with no padding and no
alignment. `sizeof((bool, u32, []u32))` is 13. **[probe]** (This is today's layout, written down. It
answers the stack README's open question; containers compute element strides from it, so it becomes
part of the language once documented.)

### Where the header lives

A value of type `Vec(u32)` in a local is three wasm locals, like any struct, and has no address.
A function that changes a container takes a pointer to it, so the container's header lives in
memory and the program holds a pointer:

```ents
import "./stack" ( "alloc" func alloc(n: u32) -> u32 )

func Vec(comptime T: type) -> type => (ptr: [*]mut T, len: u32, cap: u32)

func vec(comptime T: type, cap: u32) -> *mut Vec(T) {
  let v = alloc(sizeof(Vec(T))) as *mut Vec(T)
  v.* = Vec(T)(alloc(cap * sizeof(T)) as [*]mut T, 0, cap)
  return v
}

func push(comptime T: type, v: *mut Vec(T), x: T) {
  v.ptr[v.len] = x          // growth omitted here
  v.len += 1
}

export func demo() -> u32 {
  let v = vec(u32, 16)      // *mut Vec(u32)
  v.push(7)
  return v.len
}
```

`let v = vec(u32, 16)` followed by `v.push(7)`, as the owner wrote it, works because `vec` returns
the pointer. A by-value `Vec` cannot be pushed to through `v.push(7)`: that would need the address
of a local, which does not exist in this memory model (`&v` on a local is not an address
**[probe]**). This is a decision for the owner (III.7, Q1); the document assumes the pointer form
throughout, which is also what the hand-written kernels do with their globals.

## I.4 Method-call syntax

`x.f(a, b)` calls the function `f` with `x` as its first argument, when `x` has no field named `f`:

```ents
func Vec(comptime T: type) -> type => (ptr: [*]mut T, len: u32, cap: u32)
func last(comptime T: type, v: *Vec(T)) -> T => v.ptr[v.len - 1]
func double(n: u32) -> u32 => n * 2

export func f(v: *mut Vec(u32)) -> u32 => v.last().double()
```

Rules:

1. **Fields win.** If the type of `x` has a field `f` (directly, or through one pointer, as for
   `v.len`), `x.f` is that field. The built-in members (`.ptr`, `.len`, `.*`, `.0`, the type views
   `.u32`) are fields in this sense. Otherwise `f` is looked up as a function, like any call (I.5).
2. **The receiver is the first non-comptime parameter.** `x.f(a, b)` is `f(x, a, b)`; for a generic
   `f` it is the inferred form, and the receiver usually decides the type parameters.
   `v.push(u32, 7)`, with the type parameters written after the receiver, is the explicit form:
   it means `push(u32, v, 7)`.
3. **The receiver is passed as written.** It gets the conversions any argument gets (`*mut` to
   `*`, array pointer to slice) and nothing more: no implicit `&x`, no implicit `x.*`. A function
   that takes `v: *mut Vec(T)` is called on a pointer.
4. Calls chain left to right: `v.last().double()` is `double(last(v))`.
5. Method-call syntax is only syntax. `x.f(a)` and `f(x, a)` are the same call, compile to the same
   code, and report the same errors.

A field of function type cannot be called with this syntax (function values are not callable in
this version of the language at all **[probe]**).

## I.5 Overloads and requirements

### Functions that share a name

Two functions may have the same name when their non-comptime parameter lists differ in count or in
types:

```ents
type Pt = (q: i32, r: i32)

func hash(k: u32) -> u32 => k * 0x45d9f3b
func hash(k: []u32) -> (h: u32) {
  h = 0x811c9dc5
  for w in k {
    h = (h ^ w) * 0x01000193
  }
}
func hash(p: Pt) -> u32 => hash(((p.q * 73856093) ^ (p.r * 19349663)) as u32)

func eq(a: u32, b: u32) -> bool => a == b
func eq(a: Pt, b: Pt) -> bool => a.q == b.q && a.r == b.r
```

A call picks the one function whose parameters accept the arguments:

1. Candidates are the functions of that name with the right number of non-comptime parameters
   (for the explicit form of a generic: the right total number).
2. A candidate *accepts* the call if each argument can be passed to its parameter under the usual
   rules (for a generic candidate: if inference succeeds and the arguments are then accepted).
3. If exactly one candidate accepts, it is called.
4. If several accept, the more specific wins, in this order: a non-generic function whose parameter
   types are exactly the argument types; then a non-generic function that needs conversions; then a
   generic function. Two candidates left at the same level is an error that lists them.
5. If none accepts, the error lists the argument types: `no function 'eq' accepts ([]u32, []u32)`.

Two declarations with the same name and the same parameter types are an error (today the second
silently replaces the first **[probe]**). An exported overload needs its own export name
(`export "hash_u32" func hash(k: u32)`); two exports named `"hash"` are an error.

A function you declare with the name of a builtin (`min`, `max`, `abs`, ...) replaces the builtin in
your module. (Today the builtin silently wins and the declared function is dead code **[probe]**.)

### Requirements are duck-typed

A generic states no requirements. It uses its type parameter, and each use is checked for the
concrete type when the generic is instantiated:

```ents
func Slot(comptime K: type) -> type => (used: bool, hash: u32, key: K)
func Set(comptime K: type) -> type => (slots: [*]mut Slot(K), mask: u32, count: u32)

// The slot of k: its own, or the empty one where it would go.
func slot(comptime K: type, s: *Set(K), h: u32, k: K) -> u32 {
  let i = h & s.mask
  loop {
    return i when !s.slots[i].used
    return i when s.slots[i].hash == h && eq(s.slots[i].key, k)
    i = (i + 1) & s.mask
  }
}

func has(comptime K: type, s: *Set(K), k: K) -> bool => s.slots[s.slot(hash(k), k)].used
```

`has` for `K = u32` calls `hash(k: u32)` and, through `slot`, `eq(a: u32, b: u32)`; for `K = Pt` it
calls the `Pt` pair. Both are direct calls. A key type with no `hash` is an error when `has` is
first used with it, at the line of `hash(k)`, naming the instance (I.8). There are no traits or
interfaces, and nothing to declare: what a type must provide is whatever the generic's body uses.

Operators are requirements too. `a > b` exists for numbers; `==` and `!=` for numbers, `bool` and
pointers. They are not defined for structs, tuples, slices or arrays, and using one in an instance
is an error (`operator > is not defined for Pt, in max(T = Pt)`). A generic that should work for
any key calls `eq(a, b)` and lets each type bring its own.

### Where a call in a generic body is looked up

A call written in a generic body, `hash(k)` or `k.hash()`, is resolved when the instance is checked,
by name and argument types:

1. in **the generic's own module** (the functions it declares or imports);
2. if no function there accepts the arguments, in **the module that contains the call which asked
   for the instance**; if that call is itself in a generic's body, in the module that asked for
   that one, and so on outward.

So a container library can provide `hash` and `eq` for the common key types itself, and a program
that uses `Set(Cell)` with its own `Cell` brings `hash(c: Cell)` and `eq(a: Cell, b: Cell)` in the
module that creates the set. A library's own functions come first and cannot be replaced from
outside.

Everything else in a generic body (its helpers, its globals, the types it names) resolves in the
generic's own module, as written.

## I.6 Instances

An *instance* is one generic function with all its comptime arguments fixed.

- **Identity.** Two calls use the same instance when they name the same generic and their comptime
  arguments are equal: types compared structurally, with aliases and generic-type names expanded
  (`Pt`, the struct `(q: i32, r: i32)` it names, and any generic type that expands to those fields
  are one argument **[spike]**); functions compared by which function they are. Explicit and inferred calls that arrive at the same
  arguments share the instance.
- **One per program.** An instance exists once in the output however many modules use it. It
  belongs to the module that declares the generic.
- **Coherence.** Because an instance exists once, it must mean one thing. If two modules use the
  same instance and the lookup rule of I.5 would give them different functions (each brings its
  own `hash` for the same structural type), that is an error at the second use. One program has
  one `hash` for a given type.
- **On demand.** An instance is created by the first call that needs it. A generic nobody calls has
  no instances; a generic used only from `test` blocks has instances only in test builds.
- **Statics.** A data literal in a generic body belongs to each instance separately, as it would in
  hand-written copies. Equal read-only bytes are shared by the data section as usual; a `mut`
  literal is one buffer per instance.
- **Recursion.** A generic may call itself or another generic. `fact(n - 1)` inside `fact` for
  `T = u64` is a call of the same instance. A generic that instantiates itself with a larger type
  each time (`deep((T, T), (x, x))`) never finishes; the compiler stops after 64 nested
  instantiations with one error.
- **Names.** In the WAT output an instance is named after the generic and its arguments,
  `$push<u32>`, `$sort<i32|ascending>`, `$containers$push<u32>` when it comes from another module.
  The exact spelling is not part of the language; names do not reach the `.wasm` file.

## I.7 Modules, exports, tests

**Export.** `export func max(comptime T: type, ...)` and `export func Vec(comptime T: type) -> type`
make a generic importable by other source modules. A generic is never exported to the WebAssembly
host: it has no single wasm signature. In an entry module the `export` of a generic therefore emits
nothing; this is not an error, because every library file is also compiled on its own (by
`encantis check`, by its inline tests).

**Import.** A source import names what it uses with its signature, as today. A generic type is
imported as the function it is:

```ents
import "./containers" (
  "Vec" func Vec(comptime T: type) -> type
  "vec" func vec(comptime T: type, cap: u32) -> *mut Vec(T)
  "push" func push(comptime T: type, v: *mut Vec(T), x: T)
)

export func three() -> u32 {
  let v = vec(u32, 4)
  v.push(1)
  v.push(2)
  v.push(3)
  return v.len
}
```

Calls to imported generics are instantiated exactly like local ones; the instance lives in
`containers`, and a second module that also pushes to a `Vec(u32)` reuses it. As for every source
import today, the restated signature is documentation: the compiler uses the declaration in the
imported file. (Checking a file on its own, as an editor does, uses the restated signatures; see
III.4.)

**Tests.** `test` blocks call generics like any other code. Instances needed only by tests are not
in the output of `encantis compile` or `encantis wasm`. **[spike]** A generic may be declared inside
a `test` block.

## I.8 Errors

Two principles: **one mistake is one error**, and **an error is reported where the fix is most
likely to be made**, with the other end of the story attached.

### Errors at a call

Reported at the call, like any call error.

| Mistake | Message |
|---|---|
| Wrong number of arguments | `'max' expects 2 arguments, or 3 with its type argument written; got 1` |
| A type parameter nothing decides | `cannot infer T for 'zero': write it, as in zero(u32)` |
| Only literals could decide | `cannot infer T for 'max' from literals: write max(i32, 1, 2), or give a literal a type (1:i32)` |
| The deciding argument has the wrong shape | `argument 1 of 'push': expected *mut Vec(T), got u32` |
| A later argument does not fit | `argument 2: cannot assign u32 to u8 (T = u8 was decided by argument 1; write max(u32, a, b) to choose)` |
| A value where a type is needed | `argument 1 of 'size' is the type parameter T: expected a type, got a value of type u32` |
| A type where a value is needed | `'u32' is a type, but argument 1 of 'max' is the value 'a'; to pass type arguments write all of them: max(T, a, b)` |
| A type passed to an ordinary function | `'Point' is a type; 'area' has no type parameters` |
| A comptime function argument that is not a function name | `argument 3 of 'sort' is the comptime function 'before': expected the name of a function` |
| ... or has the wrong signature | `'inc' is (u32) -> u32, but 'sort' needs before: (i32, i32) -> bool` |
| Wrong number of type arguments | `Vec expects 1 type argument, got 2` |
| A generic used as a value | `generic function 'max' must be called`; `'Vec' is a generic type: write Vec(T)` |
| No overload accepts | `no function 'hash' accepts (Cell)` |
| Several overloads accept | `'hash' is ambiguous for (int(5)): hash(k: u32) at 3:1 and hash(k: u64) at 4:1 both accept it` |

After any of these the call's result has an unknown type, and the checker reports nothing further
about it. (In the prototype as found, every one of them is followed by a false
`cannot assign i32 to u32` **[spike]**; III.2.7 removes that.)

### Errors at a declaration

| Mistake | Message |
|---|---|
| `func f(t: type)` | `a parameter of type 'type' must be comptime: write 'comptime T: type'` |
| `func f(comptime t: type)` | `a type parameter's name starts with an upper-case letter: 'comptime T: type'` |
| `func f(comptime N: u32)` | `'N' is named like a type; a comptime value parameter starts lower-case` |
| `func f(comptime n: u32)` | `comptime value parameters are not supported yet: only 'type' and function types` |
| `comptime` in a struct type, result, enum payload or function type | `'comptime' is only allowed on function parameters` |
| A generic type whose parameter is not `comptime X: type`, or with none | `a generic type takes comptime type parameters only` |
| `func Vec(...) -> type` referring to itself | `generic type 'List' refers to itself; recursive generic types are not supported yet` |
| Same name, same parameter types | `'hash' is already declared with parameters (u32) at 3:1` |
| Two exports with one name | `export name 'hash' is used twice: give one an explicit name, as in export "hash_u32" func hash(...)` |

### Errors inside an instance

The body of a generic is checked for each instance. An error there is reported **at the line of the
generic's body** where it occurs, in the file that declares the generic, with types printed as they
are in that instance (never as `T`), followed by the instance and by the call that asked for it:

```text
containers.ents:57:11: error: no function 'hash' accepts (Cell), in add(K = Cell)
   57 |   let h = hash(k)
      |           ^
  required from main.ents:31:5
   31 |     seen.add(c)
      |     ^
```

- The message proper is one line and ends with `, in <generic>(<parameter> = <argument>, ...)`.
  That whole line is what `errors` blocks in spec tests match and what an editor shows.
- `required from` names the call that first asked for the instance. When that call is itself in an
  instance, the chain continues, innermost first, at most four lines.
- Each instance is checked once, so its errors appear once however many calls use it.
- Two instances with the same mistake are two errors; they differ in the instance named.
- In an editor the error is shown at the body line with the call as related information, and the
  requesting call is also marked (`instantiating add(K = Cell) fails: no function 'hash' accepts
  (Cell)`), because the person at the call is usually the one who can fix it.

The three body errors generics add:

| Mistake | Message |
|---|---|
| A requirement the type does not meet | `no function 'eq' accepts (u32, u32), in index_of(T = u32)` |
| An operator the type does not have | `operator > is not defined for Pt, in max(T = Pt)` |
| Runaway instantiation | `too many nested instantiations (64) starting from deep(T = u32)`, reported once at the call inside `deep`, types longer than 60 characters cut with `...` |

Every other error of the language can occur in an instance and reads as usual plus the suffix:
`cannot assign int(0) to f64, in total(T = f64)`.

One error concerns two modules:

```text
b.ents:12:5: error: add(K = Cell) already exists with 'hash' from a.ents:4:1; here it would be b.ents:3:1.
A program has one 'hash' for a type
```

## I.9 Not in this version

Each of these is rejected with the message shown, so that the syntax stays free for a later version.

| Not supported | What happens |
|---|---|
| Comptime value parameters (`comptime n: u32`), and with them `[n]T` | declaration error (I.8) |
| Writing some type parameters and inferring others | arity error; write all or none |
| Inferring a type parameter from the expected result type | `cannot infer T ...` |
| A generic function passed as a comptime function argument, or stored | `generic function 'max' must be called` |
| Anonymous functions as comptime arguments (there are no function expressions) | parse error, as today |
| Recursive generic types (`List(T)` with a `?*List(T)` field) | declaration error (I.8) |
| Generic types with a block body or conditions (`-> type { ... }`) | parse error |
| Exporting an instance to the host directly | write a wrapper: `export func push_u32(v: *mut Vec(u32), x: u32) { push(v, x) }` |
| Traits, interfaces, declared requirements, default type arguments, specialisation by type | not planned; requirements are duck-typed |
| Calling a function-typed runtime value | unchanged from today (invalid; a comparator is a comptime parameter) |
| Operators on structs, tuples, slices | `operator == is not defined for ...`; write `eq` |

## I.10 How this is compile-time evaluation

Encantis already has names bound at compile time: `def n = 64` binds a number, `type Pt = (...)`
binds a type, and `sizeof(T)` is an expression the compiler evaluates. Generics add one thing to
that picture: **a name bound at compile time can be a parameter.**

| Bound at compile time | Module level (today) | Parameter (this design) | Later |
|---|---|---|---|
| a type | `type Pt = (q: i32, r: i32)` | `comptime T: type` | |
| a function | `func f(...)` | `comptime before: (T, T) -> bool` | |
| a number, bool | `def n = 64` | reserved: `comptime n: u32` | value parameters; `[n]T` |
| a type computed from types | | `func Vec(comptime T: type) -> type => ...` | block bodies, conditions |
| a value computed from values | `def bytes = n * 8` (integer arithmetic, `sizeof`) | | `comptime func`, tables |

A call with comptime arguments is *evaluated* as far as its comptime parameters go: for a generic
type, completely (the result is a type and nothing is left for run time); for a generic function,
partially (the result is a specialised function). The "Comptime Evaluation" section of Future
Additions becomes the continuation of this chapter: the same binding, with more kinds of value and
more that can be computed from them. `comptime func` in that sketch is then a function all of whose
parameters are comptime, which is exactly what a generic type is today.

---

# Part II. The zero-cost guarantee and its tests

## II.1 What is guaranteed

The *hand specialisation* of a generic `G` for comptime arguments `A` is the source text you get by:
deleting `G`'s comptime parameters; replacing each type parameter by its argument, written out;
replacing each comptime function parameter by the name of the function passed; and giving the
function a new name. The hand specialisation of a *program* replaces each generic by the hand
specialisations it is used with, replaces each call by a call of the right one with the comptime
arguments removed, writes `x.f(a)` as `f(x, a)`, gives overloads distinct names, and deletes
generic types in favour of the structs they stand for.

| | Guarantee |
|---|---|
| G1 | **Same code.** The wasm body of every instance is byte-identical to the body the same compiler produces for its hand specialisation |
| G2 | **Same calls.** A call of a generic compiles to one `call` of the instance with exactly the non-comptime arguments. Method-call syntax, overload choice and explicit or inferred form leave no trace |
| G3 | **Nothing else.** A program and its hand specialisation compile to the same `.wasm` file: same functions, same data, same imports and exports, same globals. In particular an unused generic, a generic type, and a comptime argument emit nothing |
| G4 | **No new wasm.** No table, no `call_indirect`, no `ref.func`, no type section entries beyond function signatures, no runtime type information. Output validates with the feature flags the CLI uses today |
| G5 | **Once.** An instance is one function in the program however many calls, modules or spellings of its arguments reach it |
| G6 | **Old programs unchanged.** A program that uses none of the new syntax compiles to the same bytes as before, except where this work fixes a listed miscompile. Two are known in advance, both from codegen looking a builtin's operand type up at the right key when calls move to `span.end` (III.2.1): builtin `min`/`max` on unsigned member expressions compared signed (`examples/math/trig/strcmp.ents`: `i32.lt_s` becomes `i32.lt_u`), and `abs(a - b)` lost its `abs` (the owner's `bugs/01`). **[spike]** these are the only two real differences in the WAT of 83 existing files; the kernels `stack/features.ents` and `solver/solver.ents` are unchanged |

G3 is the strong form and it is checkable as stated, because function and local names do not reach
the binary (`toBinary({})` writes no name section, cli.ts:284) and because emission order is fixed
(III.3.2; the spike emits instances after the ordinary functions in request order, and the
hand-written files of these two probes mirror that). **[spike] + [probe]**: `probes/z1g.ents` against `probes/z1h.ents` (317 bytes) and
`probes/z2g.ents` against `probes/z2h.ents` (1,323 bytes: `Vec` of `u64` and of `[]u8` with growth,
a sort with two comparators, overloaded `hash` reached through `k.hash()`, explicit, inferred and
method-call forms) are byte-identical, the generic side compiled by the spike and the hand-written
side by unmodified 0.2.1. With the emission order of III.3.2 patched into the copy, `z2g.ents` is
also byte-identical to `probes/z3h.ents`, the same hand-written program with each specialisation
placed where its generic was declared.

What is **not** promised, so that nobody reads more into "zero-cost":

- No inlining. `inline` is still ignored by codegen; a comparator is a direct call, not inlined.
- No merging of instances that happen to compile to the same bytes (`push<u32>` and `push<i32>`
  are two functions, as two hand-written functions would be). The owner's rule is one function per
  distinct argument set.
- A user-declared generic `max` is a function call, where the builtin `max` is an inline `select`.
  The comparison is with a hand-written `max_u32`, not with the builtin.
- The comparison is with hand-written code *in the same style*. The kernels' current sets keep
  their state in globals; a `*Set(K)` loads it through a pointer. That is a different program.

## II.2 The tests

All in `packages/compiler/generics.test.ts` unless another place is named. Helpers (about 60 lines,
next to the `modWat` pattern of codegen.test.ts:120-135 and `compileToWasm` of test-utils.ts):

```ts
wasmOf(source: string, opts?: { tests?: boolean }): Uint8Array   // parse, typecheck, moduleToWat, wabt with the CLI's flags
expectSameWasm(generic: string, byHand: string): void            // bytes equal; on failure print both WATs, canonicalised, as a diff
funcs(wat: string): string[]                                     // names of the functions, in order
expectPlainWasm(wat: string): void                               // none of: call_indirect, (table, (elem, ref.func; and it validates
```

`expectSameWasm` runs both sources through **both** assemblers (`moduleToWat`, used by unit tests,
and `programToWat`, used by the CLI), because a change made in only one is the classic way for
these tests to pass while the product is wrong (map-codegen risk).

| Id | Test | Guards |
|---|---|---|
| Z1 | `expectSameWasm` for a table of pairs: `max`/`min`/`clamp` for `u8 u32 i64 f32 f64 u128`; `swap` through `*mut T`; `sum` over `[]T`; `find`; `Vec` (`vec`, `push` with growth, `pop`, `items`) for `u8 u32 u64 f64 u128 []u8 *u32`; `sort` with two comparators for one `T`; `Set(K)` for `u32` and `[]u32` with overloaded `hash`/`eq`. From PR 3 on, the same table with struct, tuple and `bool`-holding element types | G1, G2, G3 |
| Z2 | The same call written three ways (`push(u32, v, x)`, `push(v, x)`, `v.push(x)`) in three programs: three identical `.wasm` files | G2 |
| Z3 | A program, and the same program with unused generic functions and generic types added (one with a body that could never check): identical `.wasm` | G3 |
| Z4 | `funcs(wat)` has exactly one entry per expected instance when the same arguments arrive as `Pt`, as `(q: i32, r: i32)`, as `Pair2(i32, i32)`, explicitly and inferred, from two functions | G5 |
| Z5 | `expectPlainWasm` on every WAT these tests produce, and (in examples.test.ts) on the output of every file under `examples/generics/` and `lib/` | G4 |
| Z6 | The `(param ...)` list of each instance equals the flattened non-comptime parameters; a call site pushes exactly that many values | G2 |
| Z7 | `wasmOf(src)` has no instance that only a `test` block requests; `wasmOf(src, { tests: true })` has it | G3 |
| Z8 | Golden hashes: `packages/compiler/tests/golden/wasm-sha256.json` holds the sha256 of the `.wasm` of every file under `examples/`, `lib/` and `tests/fixtures/`, generated at v0.2.1 before any change. A test recomputes them. A PR that changes one says why in the diff of that file | G6 |
| Z9 | Cross-module fixture (`tests/fixtures/generics/{main,other,containers}.ents`, in loader.test.ts): the WAT contains `$containers$push<u32>` once though two modules use it; the program equals its single-file hand specialisation in function count and bodies | G5 |
| Z10 | A `same-wasm` block in the spec-tested docs (II.3) | G3, and keeps the documentation honest |

Outside the repository, as the acceptance test of PR 4: `stack/features.ents` rewritten on
`Set([]u32)` passes `check-features.cjs` with 0 mismatches, and the harness's timing is within noise
of the hand-written kernel. That is the property the owner cares about; it is not a CI test because
the kernels live in another repository and compiling their 16 MB stack takes 9 s.

When Z1 fails, the failure message is a function-by-function diff of the two WATs after
canonicalisation (function names replaced by their index, scratch locals `$__x_<offset>` numbered by
first appearance), so the reader sees which instruction differs, not two hex dumps.

## II.3 The guarantee as an executable example in the docs

The spec runner (spec/spec.test.ts:78-113) gets one new expectation block. An `ents` block may be
followed by a block whose info string is `ents same-wasm`; the runner compiles both to wasm and
requires equal bytes:

````markdown
```ents
func max(comptime T: type, a: T, b: T) -> T => if a > b { a } else { b }

export func f(a: u32, b: u32) -> u32 => max(a, b)
export func g(a: f64, b: f64) -> f64 => max(a, b)
```

compiles to exactly the module this does:

```ents same-wasm
func max_f64(a: f64, b: f64) -> f64 => if a > b { a } else { b }
func max_u32(a: u32, b: u32) -> u32 => if a > b { a } else { b }

export func f(a: u32, b: u32) -> u32 => max_u32(a, b)
export func g(a: f64, b: f64) -> f64 => max_f64(a, b)
```
````

In the output a generic's place is taken by its instances, in name order (III.3.2), which is what
makes the hand-written side easy to write: put the specialisations where the generic was.

The fence language stays `ents` so the block is highlighted; the word after it is an expectation
keyword instead of a start rule (today the word after `ents` is always a start rule, and no grammar
rule is named `same-wasm`). About 25 lines in the runner.

The runner also learns to read the reference itself, so that the documentation is the test and
there is no second copy: blocks of `docs/encantis.md` between `<!-- spec:begin -->` and
`<!-- spec:end -->` are run like the blocks of `spec/*.md`, and with `<!-- spec:begin compile -->`
every module block without an `errors` block and without a source import is also compiled and
validated with wabt (a block that imports `./containers` is checked in single-file mode, III.2.10,
and not compiled). The generics chapter is written inside such a region. In the runner,
`ents same-wasm` is an expectation of the block before it: the two places that test
`lang === 'ents'` (spec.test.ts:78 and the loop that collects expectations) exclude that meta. (Today no block of `docs/` is executed: only `spec/*.md`
is, and only through parse and single-module typecheck, map-tests-docs A1.5. The requirement "runs
the docs' code blocks as spec tests" is not met by the repository as it stands; this is the
smallest change that makes it true for the new chapter without touching the 97 older blocks that
would not pass.)

---

# Part III. Implementation

The implementation follows from one decision: **an instance is made by substitution.** The checker
copies the generic's declaration, replaces the comptime parameters by what they are bound to, and
hands the copy to the passes that exist. Part II's guarantee then holds by construction rather than
by a list of per-feature arguments: the copy *is* the hand specialisation, in AST form, and goes
through the same `checkFuncBody` and the same `funcToWat` as a hand-written function. Literals,
`defer`, named results, narrowing, bounds proofs, wide-integer helpers and whatever is added to the
language later behave in an instance as they do in ordinary code, because to the compiler an
instance is ordinary code.

The alternative the mapping notes lean towards (one AST, a fresh `types` map and call table per
instance, an overlay of symbols per instance in codegen) also produces identical function bodies
(map-codegen 8.2-8.3), but it shares AST nodes between instances, and the checker writes on AST
nodes (`dataId`, `mut`: checker.ts:720, 743, 1886, 1891, 2047, 2689, 2693). A data literal in a
generic body is then one literal for all instances, which is wrong as soon as its type mentions `T`
and differs from hand-written copies for a `mut` literal (map-codegen 7.3). It can be made right,
with per-owner literal tables; with copies there is nothing to make right. I take the copy for that
reason, and because a working prototype of it exists that I could run my own programs on.

The cost of copies is that an instance needs source offsets of its own (everything the compiler
records is keyed by offset) which still lead back to the generic's text. Instance `i` of a module
uses offsets `i * 2^28 + original`; three places map back with `offset % 2^28` (III.2.9).

## III.1 Syntax

### III.1.1 Grammar (`packages/compiler/encantis-grammar.ohm`)

Six rules change and seven small ones are new. Then `bun run bundle:grammar`.

```
// ohm:68. The existing action FuncDecl becomes FuncDecl_func.
FuncDecl = func typeIdent BaseType "->" type "=>" Type  -- typeFunc
         | inline? func ident? FuncSignature Body        -- func

// ohm:76-77
Field = comptime (ident | typeIdent) ":" ComptimeParamType  -- comptime
      | ident ":" type        -- typeNoComptime     // parses so the checker can explain
      | ident TypeAnnotation  -- named
      | Type                  -- anonymous
ComptimeParamType = type  -- type
                  | Type  -- other

// ohm:151: one alternative before `typeIdent -- named`
BaseType = ...
         | typeApplyHead NonemptyListOf<Type, ","> ")"  -- apply
         | typeIdent                                     -- named
typeApplyHead = typeIdent "("        // lexical rule: no space between the name and "("

// ohm:422-424
Arg = ident ":" Expr          -- named
    | ident ":"               -- shorthand
    | TypeLit &("," | ")")    -- type
    | Expr                    -- positional
TypeLit = Type_func                 -- func       // (T, T) -> bool, u32 -> u32
        | &typeOnlyStart BaseType   -- base
typeOnlyStart = "?" | "*" | "[*]" | "[]" | arrayPrefix | rangedUnsigned | bareTypeIdent
arrayPrefix = "[" arrayFramings "]"
bareTypeIdent = typeIdent ~"("

// ohm:50-51
ImportItem = func typeIdent BaseType "->" type  -- typeFunc
           | func ident? FuncSignature          -- func
           | global ident TypeAnnotation        -- global

// ohm:253: a member whose name merely starts like a primitive is a field, not a type view
AccessSuffix = ...
             | "." PrimitiveType ~(letter | digit | "_")  -- typePun

// ohm:514-551
keyword = (... | sizeof | comptime) ~identChar
comptime = "comptime" ~identChar
```

`Exportable` (ohm:60-62) needs no change: it contains `FuncDecl`, which now includes the type
function. The `ExportDecl_unnamed` action (encantis-actions.ts:291-313) must take the export name
from a `TypeFuncDecl`'s `ident` (today anything that is not a function or global is named "memory").

**[probe]** `probes/gram.ts` builds this grammar (the syntax map's "narrow" prototype plus my four
changes: the lenient `Field_comptime`, `Field_typeNoComptime`, the `typePun` boundary, the
`ImportItem` alternative) and compares it with the prototype on 352 sources: 0 differences in parse
result. The syntax map compared that prototype with 0.2.1 on the corpus (identical parse result and
AST) and ran the full suite on it (667 pass). All new forms parse, including
`func f(comptime t: type)`, `func f(comptime T: u32)` and `func f(t: type)`, which exist only to be
rejected by the checker with the messages of I.8 instead of by the parser with a list of expected
tokens. `p.u32`, `p.u8[4]` and `p.u32-1` parse as before; `s.u32s`, `s.boolish` and `v.u32s()`
become fields and methods (in 0.2.1 `s.boolish` is a parse error **[probe]** `probes/r2.ents`).

### III.1.2 AST (`ast.ts`)

```ts
interface Field { kind: 'Field'; ident: string | null; type: Type; comptime?: true }        // ast:94-98
interface TypeType { kind: 'TypeType'; span }                 // the keyword `type` as a parameter's type
interface TypeApply { kind: 'TypeApply'; name: string; args: Type[]; span }                 // Vec(T)
interface BoundType { kind: 'BoundType'; type: ResolvedType; label: string; span }          // only in instance copies
type Type = ... | TypeType | TypeApply | BoundType                                          // ast:570-578

interface TypeExpr { kind: 'TypeExpr'; type: Type; span }     // a type written as an argument
type Expr = ... | TypeExpr                                                                  // ast:308-327

interface TypeFuncDecl { kind: 'TypeFuncDecl'; ident: string; params: Field[]; body: Type; span }
type Declaration = ... | TypeFuncDecl                                                       // ast:27-37

interface ImportTypeFunc { kind: 'ImportTypeFunc'; ident: string; params: Field[]; span }   // import item
```

`walkDeclaration` (ast:732-772), `walkExpr` (ast:851-965) and `ASTVisitor` get the new cases
(`walkExpr` silently skips unknown kinds, so the cases must be added by hand, not found by tsc).
Switches over `AST.Type['kind']` that tsc does flag: `resolveType` (checker.ts:1752) and
`astToResolved` (type-lib.ts:30-90). Switches it does not flag, each of which gets an explicit case
that throws for a kind that must never reach it: codegen.ts:1852-1888, codegen.ts:3232-3248,
meta.ts:1164-1188.

### III.1.3 Every ambiguity from the syntax map, and how it is resolved

| Ambiguity | Resolution |
|---|---|
| `func Vec(` reads `Vec` as the input type of an anonymous function | A dedicated first alternative, entered only for `func` + upper-case name + type + `-> type`. `func Point -> Point => p` still parses: the first alternative fails at `->` and the second is tried |
| `Vec(u32)` in type position against a type followed by `(...)` on the next line (no statement separators) | The head is lexical: `Vec(` with no space. `1 as Big⏎(Green, Red) => 2` parses as today |
| Types that are also expressions: `u32`, `(u32, u32)`, `(a: u32)`, `()`, `Vec(u32)` | They stay expressions in the AST. The checker reads an argument as a type when, and only when, it stands at a type parameter's position in an explicit call (`typeOfArg`, III.2.4). No scoping rule is needed: position decides, so a variable named `u8` does not change what `count(u8, xs)` means. (The spike looks at scope first and rejects that call, `probes/f1.ents`; this design does not) |
| Types that are not expressions: `Point`, `T`, `[]u8`, `[4]u8`, `*mut T`, `?*T`, `u8#16`, `(T, T) -> bool` | `Arg_type`: tried after the named forms and before `Expr`, accepts only type syntax that cannot start an expression, and only when followed by `,` or `)`. Produces `TypeExpr` |
| `[]` and `[4]` are array literals | `[]u8` and `[4]u8` are only taken as types where the next token ends the argument. The one changed parse is an array literal that is *called* in argument position (`f([]())`, `f([4](u32))`), which the checker rejects today (`cannot call non-function type`) |
| `let xs = [1]⏎Point(1, 2).draw()` if type literals were general expressions | They are not: type syntax is confined to argument position |
| `f(x: T)`: `x:` commits as a named argument | Stays a parse error. A type argument is positional |
| `Point(1, 2)` (constructor) against `Vec(u32)` (application) in expressions | Both are `CallExpr{callee: IdentExpr}`. The checker decides by what the callee names. `Vec(T)(p, 0, c)` is a call whose callee is such a call |
| `u32(x)` (cast) against `max(u32, a, b)` | No conflict: they differ in the callee. `T(x)` is a constructor, never a cast (I.3) |
| A bare type name as an expression (`let t = Point`) | Still not an expression. `spec/syntax.md:191` and `:229` keep failing with `Expected "("` |
| `comptime` was a legal identifier | Reserved. No `.ents` file in either repository uses it. Listed as a breaking change in the release notes |
| `Field` is shared by struct types, results, enum payloads, function types | `comptime` parses there and the checker rejects it (I.8). One spec case each |
| `set` is a keyword, so the draft's `func set(comptime K: type, ...)` cannot parse | Not changed. The constructor is `hashset(K, bits)` in the library and the examples |
| A member that starts like a primitive (`v.u32s()`, `s.boolish`) is a type view followed by junk | The `typePun` boundary above. Needed before method names can be chosen freely |
| `def` is substituted by the parser, unscoped (encantis-actions.ts:1386-1412): a parameter named like a `def` is replaced | Unchanged in this work and independent of it: copies are made after parsing. Comptime *value* parameters, which would collide with it, are rejected in this version. Moving `def` into the checker is the natural companion of adding them (III.7) |

## III.2 Checker (`checker.ts`)

### III.2.1 Tables

| Where | Change |
|---|---|
| `Symbol` (56-63) | New kinds `{ kind: 'generic'; decl: AST.FuncDecl; owner: CheckContext; instances: Map<string, Instance>; signatureOnly?: true }` and `{ kind: 'typefunc'; decl: AST.TypeFuncDecl \| AST.ImportTypeFunc; owner: CheckContext; cache: Map<string, ResolvedType>; opaque?: true }`. Both carry a display `type` (a `func` type with no parameters) so that readers of `sym.type` never see `undefined` (hover crashed on this in the other spike) |
| `Instance` (new) | `{ generic; key; label /* 'add(K = Cell)' */; decl /* the copy */; index; depth; requestedAt: { ctx, offset, inst? }; env: CheckContext[]; outside: { name, argKey, target }[]; nested: Instance[]; laterEnvs: { env, at }[] }` |
| `CheckContext` (403-435) | `instances: Instance[]`, `queue: Instance[]`, `current?: Instance`, `calls: Map<number, AST.Expr>`, `overloads: Map<string, string[]>`, `pinned: Map<AST.Expr, ResolvedType>` |
| `TypeCheckResult` (100-117) | `instances?: AST.FuncDecl[]` (copies, for codegen), `calls?: Map<number /* CallExpr span.end */, AST.Expr>` (what to compile in place of that call), `sizes` are not needed (III.3.3) |
| `TypeError` (88-91) | `notes?: { path?: string; offset: number; message: string }[]`. Optional, so every existing reader keeps working |
| `exprTypeOffset` (82-84) | `CallExpr` joins the `span.end` kinds: chained calls `a.f().g()` share `span.start`. The six direct `span.start` lookups of a possible call in codegen move in the same commit (842, 862, 965, 2063, 2093, 2555); the other design run found that forgetting 2063 breaks `set (a, b) = f()` |
| `types.ts` | `canonicalKey(t)` (aliases expanded at every depth, void = `()`, results always parenthesised: prototype in `probes-tooling/typekey.ts`, 37 distinct types gave 37 distinct keys) and `watSafe(key)`. **No new `ResolvedType` kind.** No type variable and no type-of-types exist at any point, so nothing generic can reach `typeToWasm`, `byteSize`, `concretizeType`, meta or queries, which all have silent or throwing defaults (map-types 1.6) |

### III.2.2 Collection

- `preRegisterTypes` (463-467) also registers every `TypeFuncDecl` as a `typefunc` symbol. A type
  function needs nothing resolved to be declared, so it can be used from any signature, before or
  after its declaration.
- `collectFunc` (572-583), before `resolveSignature` (574): if any input field is `comptime` or of
  `TypeType`, call `checkGenericDecl(decl)` and register a `generic` symbol; resolve nothing else.
  `checkGenericDecl` reports the declaration errors of I.8 and walks the signature's type ASTs to
  report unknown type names and wrong type-function arity (type parameters count as known). This is
  a walk over syntax, not a resolution, so no type variable is needed.
- Overloads, in the same function: a second module-level function with a name already declared is
  compared by `canonicalKey` of its non-comptime parameter types. Equal: the duplicate error.
  Different: it is registered under an internal name (`hash:<key>`), listed in
  `overloads.get('hash')`, and its declaration marked so codegen emits it under that name. The
  first declaration keeps the plain name, so every existing reader of `symbols.get(name)` is
  untouched. Functions declared in `test` blocks keep today's replace-by-name behaviour.
- `collectImport` (501-555): III.2.10.
- `checkDeclaration` (1166-1168) and `checkTestDecl` (1189-1192) skip the body of a generic;
  `warnManyPointerParams` (1254-1266) skips generics.
- `resolveType` (1752-1838) gets three cases: `TypeApply` → `applyTypeFunc`; `BoundType` → its
  `type`, **not** wrapped in `named('T', ...)` (this is what makes messages print `f64` and not `T`,
  and avoids `checkExpr` recording the expected type for arguments when it is `named`, 2118);
  `TypeType` → the error of I.8. The `CompositeType` case and `typeToFields` (1850-1861) reject
  `comptime` fields outside a function declaration's parameter list.
- `applyTypeFunc(sym, args, offset)`: arity check; memo by the joined `canonicalKey`s; an
  "in progress" mark on the key, so that a type function reaching itself reports the
  recursive-type error instead of looping; copy the body with parameters replaced by `BoundType`
  (`cloneAst`); `owner.resolveType(copy)`; wrap as `named('Vec(u32)', resolved)`. The `named`
  wrapper is display only, as for every alias (types.ts:449-450, 548-549): this is where
  "structural" is implemented, by doing nothing.

### III.2.3 Calls (`inferCall`, 2312-2393)

New dispatch at the top, before the builtin test (2314):

1. The callee is an identifier that names a user function, an overload set or a generic: resolve
   it with `resolveCall` (III.2.8) and continue. Only if the name is not declared by the program
   does the builtin test run, and codegen's `callToWat` makes the same test before
   `builtinToWat` (codegen.ts:912). This is what lets the owner's `max` exist. No `.ents` file in
   either repository, and no test, declares a function with a builtin's name **[probe]**;
   `docs/grammar.md:731-735` does, in prose. **[spike]** with the two tests patched in, a
   non-generic user `max` is called (`probes/r3.ents`) and nothing else changes. Two of the owner's
   bug files disappear for a user-declared generic `max`: it evaluates each argument once
   (`bugs/02`) and takes a literal first (`bugs/12`).
2. The callee is a `TypeExpr`, or a call that names a type function (`Vec(T)(...)`): evaluate it
   with `typeOfArg`, require a tuple type, check the arguments with the existing constructor loop
   (2368-2389, factored out), and record the lowered form: a `TupleExpr` with the fields in
   declaration order.
3. The callee is `x.name` and `x` has no member `name`: III.2.5.
4. Everything else: today's code.

Every resolved call is recorded as `calls.set(expr.span.end, lowered)`, where `lowered` is an
ordinary `CallExpr` to the chosen function's internal name with only the non-comptime arguments
(the written call's own argument nodes, so their types are already in the map). This table is what
G2 rests on: codegen compiles the lowered call, which is the call a hand-written program contains.

### III.2.4 Generic calls: `inferGenericCall(sym, expr, receiver?)`

1. **Form.** `P` = parameters, `K` = type parameters, `n` = arguments (plus one for a receiver).
   `n == P`: explicit. `n == P - K`: inferred. Otherwise the arity error. Named arguments are an
   error (`'push' takes positional arguments`), as functions are positional today.
2. **Explicit type arguments** are read by `typeOfArg(expr)`: the argument expression is converted
   to a type AST and resolved with `resolveType`. `TypeExpr` → its type; `IdentExpr` naming a
   primitive → `PrimitiveType`; `GroupExpr`/`TupleExpr` → `CompositeType` (named elements are named
   fields); the unit `()` → the empty composite; a call whose callee is an upper-case identifier →
   `TypeApply` with converted arguments. Anything else is the "expected a type" error. Because the
   conversion is syntactic, "a type argument is written as after a colon" is true by construction,
   and this function is the first piece of the compile-time evaluator: it evaluates an expression to
   a value of kind *type*.
3. **Inference** follows I.2 literally. For each type parameter, find the first non-comptime
   parameter (and comptime function parameter) whose type AST mentions it and whose argument is not
   an untyped literal (its `inferExpr` type is not `comptime_int`, `comptime_float`,
   `comptime_list`) and not an overloaded name. `inferExpr` that argument once (pinned, so the
   later `checkExpr` does not infer it again) and call
   `matchType(paramTypeAst, argType, bindings)`:

   | Pattern AST | Against | Action |
   |---|---|---|
   | `TypeRef T`, `T` a type parameter | any type | bind `T` to it with a top-level range removed (`stripMax`, 2586-2587); already bound: nothing (a later argument never re-decides) |
   | `PointerType` | pointer | recurse on the pointee; `mut` on the argument only is fine; optional on the pattern only is fine |
   | `IndexedType` slice or many-pointer | slice, many-pointer, or pointer to array | recurse on the element |
   | `IndexedType` array | array with the same sizes | recurse on the element |
   | `CompositeType` | tuple with the same field count | recurse field by field |
   | `FuncType` | function type | recurse on parameters and results |
   | `TypeApply F(A...)` | any type | match `F`'s **body AST** against the type, with `F`'s parameters standing for the argument ASTs `A...` (an environment, not a substitution: when the walk meets one of `F`'s parameters it continues with the corresponding `A`) |
   | anything else (`u32`, a non-parameter `TypeRef`) | any | nothing to bind |

   The argument's type is unwrapped (`unwrap`) at each step, so aliases and applied generic types
   are transparent. A shape that does not fit is the "expected ..., got ..." error. A type
   parameter that stays unbound is the "cannot infer" error; the message distinguishes the
   literal-only case and the case where a `TypeApply` mentions the parameter but its body does not.
   `matchType` is about 60 lines and has no effect on `types.ts`.
4. **Comptime function arguments.** The argument must be an identifier naming a `func` symbol or
   overload set (or, inside an instance, a comptime function parameter being passed on, which is
   already such a symbol). After the type parameters are known, the parameter's function type is
   resolved and the function (or the one overload with exactly that signature) is chosen; identity
   for the key is (module path, declaration offset).
5. **Instance.** `instantiate(sym, typeBindings, funcBindings, requestedAt)` (III.2.6) returns the
   instance, whose copy has an ordinary resolved signature.
6. **Arguments.** The existing loop (2345-2352) checks each non-comptime argument against the
   instance's parameter types: literals get their types, conversions apply, errors read as for any
   call. One addition: when an argument fails and its parameter's written type mentions a type
   parameter decided by an earlier argument, the hint of I.8 is appended.
7. **Record.** The lowered call; the instance's `FuncRT` at the callee identifier
   (`offset:IdentExpr`), which is what the editor shows on hover with no change to meta
   (meta.ts:892-899); a reference to the generic's declaration (so it is not "never used").
8. **On failure** at any step the call's type is the recovery type (III.2.7) and nothing is lowered.

The spike differs from steps 1-3 in two user-visible ways that this design changes: `max(1, 2)`
defaults to `i32` there (here: an error, I.2 rule 5), and an explicit type argument is looked up in
scope first (here: position decides). Both are small.

### III.2.5 Method calls: `inferMethodCall(expr)`

The field search of `inferMember` (2713-2784) is factored into `findMember(objType, name)`, which
returns `undefined` instead of reporting `no field` (2785). In `inferCall`, for a callee
`MemberExpr` with a `field` member: infer the object once and pin its type; if `findMember` finds
a member, continue as today; otherwise build `name(object, args...)` and resolve that call
(`resolveCall`, with the object as the first non-comptime argument). If no function `name` exists
either, the error is today's `no field 'name' on type X`, extended with `, and no function
'name' accepts (X, ...)`. `collectLocals` (codegen.ts:2845-2849) must visit the callee of a call so
that a receiver expression's scratch locals are declared.

### III.2.6 Instantiation

`instantiate(sym, bindings, funcs, requestedAt)`:

1. `key` = `canonicalKey` of each type argument and the identity of each function argument;
   `label` = `name(T = ..., ...)` with `typeToString`, each argument cut at 60 characters.
2. Memo hit: if the requester's lookup chain differs from the instance's `env`, push it on
   `laterEnvs` (for the coherence check, III.2.8); return the instance.
3. `depth` = requester's depth + 1; over 64: the runaway error, once, and the recovery type.
4. `decl = cloneAst(sym.decl, index * STRIDE, subst)`: a deep copy of plain objects and arrays in
   which every `span` is shifted, every `TypeRef` to a type parameter becomes a `BoundType`, every
   `IdentExpr` naming a type parameter becomes `TypeExpr(BoundType)` (so `T(a, b)` constructs and
   `vec(T, 4)` passes the type on), and the comptime fields are removed from the input. The copy is
   always made from the original declaration, so offsets are never shifted twice. `decl.ident` is
   the instance name, `push<u32>`.
5. Register in the memo, in `owner.instances` and `owner.queue`, then `owner.collectFunc(decl)`:
   the unchanged collector resolves the copy's signature and registers an ordinary `func` symbol
   under the instance name in the owner's module scope. The signature exists now; the body waits.

`drainInstances()` runs at the end of `checkModule` (442-460), after the second pass and so after
`test` blocks: while the queue is not empty, take an instance, set `currentScope = moduleScope`
(the **owner's**: a generic body sees its own module, never the caller's locals, and the
no-shadowing rule of `bindPattern`, 1528-1531, cannot trip over the caller's names), set
`current`, bind the instance's comptime function parameters in the function scope as `func`
symbols that lower to their targets, call the unchanged `checkFuncBody(decl)`, restore. Instances
requested by that body join the queue. Checking bodies when the checker is at rest is what keeps
`loopDepth`, `deferLoopDepth`, `insideIfLetCondition` and the name-keyed `narrowings` of a caller
out of a generic body (map-checker 6.2); it is possible because a call needs only the signature.

Recursion needs nothing special: the instance is in the memo before its body is checked.

### III.2.7 One mistake, one error

Two changes, both small, both visible to users of generics on the first day.

**Operands are checked** (`inferBinary`, 2578). After unwrapping, an operand of kind `tuple`,
`slice`, `array`, `func` or `void` to any operator other than `&&`/`||` is
`operator <op> is not defined for <type>`. Without this, `max(a, b)` on two structs passes the
checker and fails in wabt with a message about `i32.gt_u` (**[probe]** `probes/r4.ents`: `a == b`
on structs and on slices, and `a > b` on structs, are `check` OK and invalid wasm). **[spike]** I
added exactly this check to the copy: the suite stays at 678 pass, the new error is
`operator > is not defined for Pt [in max(Pt)]`, and no file under `examples/`, `lib/` or the
monkey-fist kernels is rejected by it. Mixed numeric operands are left as they are today.

**A failed call does not cascade.** `RECOVERY` is one distinguished `primitive('i32')` object
(same kind as today's recovery value, so no consumer can choke on it) with a helper
`isRecovery(t)`. A generic call, overload resolution or type application that reports an error
returns it. `checkExpr` (2103) reports nothing when the inferred type is `RECOVERY`;
`inferMember`, the index and deref cases, `inferBinary` and `inferCall` on a `RECOVERY` object
return `RECOVERY` without reporting; `checkLetStmt` binds it as is. The prototype as found shows
why this is needed: every failed generic call there is followed by `cannot assign i32 to u32`, a
missing `eq` is three errors, and spec `errors` blocks count errors exactly. **[spike]** I patched
in the core of it (the sentinel; `checkExpr` silent on it; returned by a failed generic call, a
failed overload choice, a generic used as a value, and a call of a name that is no function, which
now reads `no function 'eq' accepts (u32, u32)` instead of `unknown identifier` plus `cannot call
non-function type: i32`). `probes/e2.ents` then reports exactly one error per mistake (9 for 9,
before: 15) and `probes/o1.ents` one (before: 3). No 0.2.1 test fails, so no existing test pins a
cascade. The propagation through member, index and operator expressions is not in the patch.

### III.2.8 Overloads, requirements, the lookup chain: `resolveCall(name, args, at)`

1. Candidates: the symbols `overloads.get(name)` (or the one symbol `name`) visible in the current
   module scope, kinds `func` and `generic`.
2. Infer each argument once (pinned). A candidate accepts if the counts fit and each argument is
   `typeAssignable` to its parameter (generic: if `matchType` binds every type parameter and the
   arguments are assignable to the substituted parameter types; no instance is made while testing).
3. Rank as in I.5: exact non-generic, converting non-generic, generic. One candidate at the best
   non-empty level is the answer; several are the ambiguity error.
4. No candidate, and the checker is inside an instance: repeat 1-3 in each context of
   `current.env`, nearest first. A hit there is recorded in `current.outside` and the call is
   lowered to an alias that codegen maps to the function in its own module (III.3.1).
5. Still none: `no function 'name' accepts (types)`, with the instance suffix when inside one, and
   `RECOVERY`.

With a single non-generic candidate and no instance in progress this reduces to today's path, so
existing programs take no new route.

**The chain.** `env` of an instance is the requester's context followed by the requester's own
`env` (empty for ordinary code), without repeats and without the owner. In a one-module program it
is empty and step 4 never runs.

**Coherence** (I.6). After all queues are empty: for each instance with `laterEnvs`, re-run steps
1-4 for each entry of `outside` under each later chain, and for each instance in `nested` check it
under the chain extended the same way (memo on instance and chain). A different function is the
coherence error of I.8 at the later requester's call; no function at all is the ordinary
`no function ... accepts` error with that call as `required from`, which is what the lookup rule
says for a module that uses `Set(Cell)` without providing `hash(Cell)`, even if another module
provides one. Instances that resolved nothing outside their own
module, which is every instance of a container over scalar or slice keys with library-provided
`hash`, pass trivially.

### III.2.9 Offsets, errors, references

- `STRIDE = 2 ** 28`; instance `i` (from 1) of a module has offsets `i * STRIDE + original`.
  Sources are far below 256 MB; a module can have 2^25 instances.
- `error` and `warn` (3450-3460): an offset at or above the stride is reported at `offset % STRIDE`
  with `, in <label>` appended and `notes` built from the `requestedAt` chain (at most four).
  De-duplication stays on (offset, message), now including the label. Errors of an instance go
  into its **owner's** `errors`, which is the list printed against the owner's source
  (cli.ts:193-199).
- `recordDefinition` (3471) ignores offsets at or above the stride: an instance's parameters and
  locals must not re-point names. (The table is keyed by name and the last definition wins, which
  already gives a global the type of a same-named parameter, map-checker probe x1; instances must
  not add to that.)
- `recordReference` (3477) from an instance keeps only references to module-level names, at
  `offset % STRIDE`: `hash`, `eq` and helpers used only by generic bodies are then not reported as
  `never used`, and "find references" on them shows the line in the generic.
- `findIdentOffset` (3464-3469, reads the source at an offset) takes `offset % STRIDE`.
- `typecheck()` (150-211): the concretize loop (159-162) already covers instance entries, which
  are in the same map at their own offsets; the symbol loop (164-179) skips `generic` and
  `typefunc`; the never-used warning (190-199) includes a `generic` with no instances and no
  export, with the same wording, so the editor's fade (serve.ts:293) works unchanged.
- `inferBody` (3293) uses `exprTypeOffset(last.expr)`. Today a block ending in a member, binary or
  index expression is typed `()` (map-checker probe z1); with calls at `span.end` the same would
  hit every generic body ending in a call.
- `inferSizeof` (3314) also stores the resolved operand at `typeKey(expr.span.start, 'SizeofType')`.

### III.2.10 Modules

- `getExportedSymbols` (216-230) exports the `generic` and `typefunc` symbols of exported
  declarations, by reference (they carry their owner).
- `collectImport` (501-555), program mode (`moduleExports` present): an import item whose exported
  symbol is `generic` or `typefunc` registers that symbol under the local name. The restated
  signature is not compared, as today for every source import (checker.ts:527).
- `collectImport`, single-file mode (the editor, the spec runner, `encantis hover`): an imported
  generic function becomes a `generic` with `signatureOnly`: calls are inferred and checked against
  the restated signature and no body is queued. An imported type function becomes a `typefunc`
  with `opaque`: `Vec(u32)` resolves to `named('Vec(u32)', RECOVERY)`, so member access on it and
  assignments involving it report nothing (III.2.7). No false errors, and hover shows `Vec(u32)`.
- `typecheck()` is split into `checkToContext()` and `finalize(ctx)`. `typecheckProgram` (237-273)
  keeps every context alive; after each module's check it drains the queues of all contexts to a
  fixpoint (an importer's request lands in the exporter's queue), then runs the coherence check and
  `finalize` for every context that gained instances. The other design run measured that a second
  finalize changes none of 28,135 type entries. `allErrors` is computed at the end from the live
  arrays; today it is a snapshot taken per module (267) and the CLI gates on its length, so a late
  body error in an already-checked module would otherwise not stop the build.
- An `export` of a generic in the entry module is skipped by the export table (III.3.4).

## III.3 Codegen (`codegen.ts`)

The spike's whole codegen change for stages 1 and 2 is 63 lines; an instance is an ordinary
function by the time codegen sees it.

### III.3.1 Calls

`callToWat` (901), first lines:

```ts
const lowered = ctx.calls?.get(expr.span.end)
if (lowered) return exprToWat(lowered, ctx)
```

The lowered expression is a plain call by name (or a `TupleExpr` for a constructor), so lines
952-980 emit it as they emit any call: G2. The name is found through `ctx.nameMap` as today.
For a callee in another module (an instance that lives in the library, called from the entry; a
`hash` of the entry called from a library instance) the per-module name maps (3301-3324) get an
entry from the alias the checker used to the function's wasm name in its own module. Two silent
fallbacks become errors so that new plumbing cannot hide in them: an unknown identifier compiling
to `(i32.const 0)` (369-370) and a non-identifier callee compiling to a `call_indirect` stub
(904-909) both throw.

One existing hole is closed here because inference leans on it. Rule 4 of I.2 says every argument
after the deciding one is an ordinary argument, so `max(u64, a, b)` with `a: u32` must widen `a`.
The checker accepts an implicitly widened argument today and codegen passes it unconverted, which
is invalid wasm whenever the wasm types differ (**[probe]** `probes/r5.ents`: `u32` for `u64`).
In the argument loop (952-977), an argument whose own type and parameter type are numeric
primitives with different wasm types goes through the conversion the `as` cast already emits.
This is in PR 1 and is tested with a non-generic call.

### III.3.2 Emitting instances once, in a fixed place, and nothing for unused generics

The three loops that emit every `FuncDecl` (`moduleToWat` 2935-2942, `programToWat` 3431-3440,
`emitTestDecl` 3033-3039) change the same way:

```ts
for (const decl of decls) {
  if (isGeneric(decl)) {                                   // has a comptime parameter
    for (const inst of instancesOf(decl, result)) emit(inst)   // copies, sorted by instance name
  } else if (decl.kind === 'FuncDecl') {
    emit(decl)                                             // an overload under its internal name
  }                                                        // TypeFuncDecl: nothing
}
```

- **Nothing for an unused generic** is not a rule that has to be enforced: a generic has no `func`
  symbol and no code path that could emit it; only copies are emitted, and copies exist only for
  calls the checker met. A generic type never reaches codegen at all.
- **Once**: `instancesOf` reads the owner module's list, which holds one copy per key for the whole
  program.
- **Fixed place**: a generic's instances are emitted where the generic is declared, in the order
  of their names (plain code-unit order of the mangled key). The order is independent of the order
  in which the checker happened to meet the calls, which is an accident of traversal (in the spike,
  `sort(w.items(), shorter)` creates the `sort` instance before the `items` instance). The
  prototype as found appends instances after the ordinary functions in request order. **[spike]**
  I patched the `programToWat` loop to this rule (25 lines): II.3's example and the 1,323-byte
  program are byte-identical to hand-written twins laid out the natural way, and an overload is
  emitted at its own declaration. `moduleToWat` and `emitTestDecl` were not patched.
- Names: `<ident><<key>>` passed through `watSafe`, prefixed like every function of its module
  (`$containers$push<u32>`, 3273-3275). `<`, `>`, `|` and `'` cannot occur in an Encantis
  identifier, so an instance name cannot collide with a user's function. Names must not match the
  helper scans (`$__w<n>_`, `$__mul_hi`: wide-int.ts:178, codegen.ts:3496).
- Instances must be in the output before the wide-integer helper scan (2970-2973, 3495-3498),
  which they are, being emitted in the function loop.

### III.3.3 `sizeof`

`sizeofToWat` (1838-1848) reads the operand type the checker stored at `'SizeofType'` and calls
`byteSize` on it. Today it re-resolves the AST type with a private resolver that returns `i32`
(size 4) for anything it does not know (1852-1888), which would make `sizeof(T)` and
`sizeof(Vec(T))` silently 4. The private resolver is deleted.

### III.3.4 Exports

`exportToWat` (3177-3185) and the export loop (3459-3470) skip an `ExportDecl` whose item is a
generic or a type function. **[spike]** without this, `export func gen(comptime T: type, ...)` in an
entry module emits `(export "gen" (func $gen))` for a function that does not exist and wabt rejects
the module (`probes/u1b.ents`).

### III.3.5 What codegen does not need

No per-instance context, no symbol overlay, no second types map, no change to `funcToWat`,
`collectLocals` (beyond visiting a call's callee), `usesMemory`, `buildDataSection` or the literal
tables: instance entries and instance literals are in the module's tables at their own offsets.
The existing cross-module collision of literal ids (two modules with a literal at the same offset
get the same address, map-codegen probe mm2) is unrelated to generics but becomes likely once a
library with string literals is imported; it is fixed in PR 4 by keying literal refs per module.

### III.3.6 Values in memory (PR 3; not generics, but under every container)

Each item has a ready-made failing probe in the mapping notes, and most are already written up by
the owner as repro files in `/home/user/monkey-fist/moonbit/encantis/builder/bugs/` (numbers
below); all can be developed and tested with non-generic programs. Zero-cost is unaffected:
instances and hand-written code go through the same paths.

| Change | Where | Today |
|---|---|---|
| `bool` loaded and stored as one byte | `loadFromMemory`/`storeToMemory` (433-475) | 4-byte access with a 1-byte layout: a `bool` field store clobbers its neighbour, silently |
| Structs, tuples and `[N]T` loaded and stored field by field, the address in a scratch local; element loops over structs; a call result stored straight to memory | same, plus scratch locals in `collectLocals` (2740-2864) | invalid wasm; `dst[i] = src[i]` silently copies 4 bytes (`bugs/04`, `05`, `09`, `17`, `18`) |
| A recursive *place* function: `X.*`, `X[i]`, `place.field`, `place.0`, and a pointer-typed object dereferenced (`v.len` for `v: *Vec`); a field of a call result | `lvalueAddressOf` (983-1008), used by `memberToWat` (1130-1147) and `assignLvalue` (2201-2225) | only `X.*.f` and `X[i].f` one level deep; `v.len` reads the pointer itself; nested writes emit nothing (`bugs/06`, `07`, `13`) |
| `&p[i]`, `&p[i].f` on a many-pointer | `addressOfIndexToWat` (1387-1408) | compiled as a load |
| An `if` statement whose branch ends in a value-returning call | statement `if` | invalid wasm |
| Implicit numeric widening of `let` values and in arithmetic is emitted | `letToWat` (2012-2032), `binaryToWat` | checker accepts, wasm invalid (`bugs/16`) |
| Unsupported member reads and assignments throw instead of emitting the object or nothing | 1146-1147, 2268 | wrong code that validates |

## III.4 Tooling: the minimum that keeps it correct

| Tool | Change | Why it is enough |
|---|---|---|
| Formatter (formatter.ts:161-167) | `comptime` in `KEYWORDS`; a first `formatter.test.ts` with the new forms | The formatter is token based and already prints every new form stably (map-syntax 8): `func Vec(comptime T:type) -> type => (...)`, `v:*mut Vec(T)`, `f(*mut T, x)`. It never puts a space between a name and `(`, so it cannot break `Vec(` |
| TextMate grammar (packages/extension/encantis.tmlanguage.json:132) | `comptime` in the keyword pattern | Upper-case names are already coloured as types (:250) |
| meta.ts | `collectDeclaration` (210-240) and `generateHintsForDecl` (661-694): a `generic` gets a function symbol whose display is its declaration's signature text; a `TypeFuncDecl` gets a type symbol. `generateHintsForTypeExpr` (1164-1188): `TypeApply` (hint on the head, recurse into arguments). `TypeExpr` argument case in `generateHintsForExpr` | Unknown kinds are skipped silently there, so each must be added by hand. Call sites need nothing: the instance signature recorded at the callee identifier is what hover shows (`func push(v: *mut Vec(u32), x: u32)`) |
| Hover inside a generic body | None in PR 1: the module's map has no entries inside generic bodies, every reader is guarded, so there are no hints rather than wrong ones. PR 2 adds a fallback in the one lookup helper: `types.get(key(offset)) ?? types.get(key(firstInstanceBase(decl) + offset))`, so hover inside a generic shows the types of its first instance, labelled `in push(T = u32)` | Cheap because instances are in the same map at shifted offsets |
| Definition, references, rename (queries.ts) | Nothing beyond III.2.9. Type parameters are not recorded as definitions in this version | The tables are name-keyed and already wrong for same-named parameters of different functions (map-types 5.5); adding `T` from every generic would make that worse |
| queries.ts | `documentSymbols` (201-288) lists generics and type functions; `signatureHelp` (290-313) accepts `generic` and shows the declared signature; `typeCostAnnotation` (350-366) skips them (`typeToWasm` at 362 throws on a type it does not know) | |
| CLI (packages/cli/src/cli.ts) | The four copies of the error printer (193-199, 262-267, 460-465, 545-550) become one function that also prints `notes`, each with the source line of the module it names. Nothing else: `check`, `compile`, `wasm`, `test` already go through `typecheckProgram`; `compile` checks without tests and `test` with them, which is what makes test-only instances absent from release output | `encantis test` needs nothing: an `assert` inside a generic function is a bare `unreachable`, as in any function (only asserts written directly in a test body carry a source offset, codegen.ts:1919-1922), so an instance's private offsets never reach the runner's offset-to-line mapping (cli.ts:584-603) |
| Language server (packages/extension/src/server/serve.ts) | Diagnostics (274-305) map `notes` to related information, and add a second diagnostic at a note's position when it is in the same file. `formatSymbolDisplay` (70-112) gets the two symbol kinds | The server checks one file with no imports resolved (meta.ts:143). `signatureOnly` and `opaque` (III.2.10) make that mode free of false errors for files that import generics |
| Grammar bundle | A test that regenerates the recipe from the `.ohm` and compares it with the committed bundle | Nothing checks this today; a forgotten `bun run bundle:grammar` silently tests the old grammar (map-syntax 8) |

## III.5 Tests and documentation

### Tests

| File | Contents | PR |
|---|---|---|
| `packages/compiler/generics.test.ts` | Z1-Z7 of II.2; an inference table (one row per line of the table in I.2 and per rule 1-5); instance identity; recursion; the nesting limit | 1 |
| `packages/compiler/tests/golden/wasm-sha256.json` + test | Z8. Generated before the first change | 1 |
| `spec/spec.test.ts` | `ents same-wasm` blocks; the `<!-- spec:begin [compile] -->` regions of `docs/encantis.md` | 1 |
| `spec/generics.md` | Everything that is a rule but too detailed for the reference: every error of I.8 as an `ents` + `errors` pair (the count is exact, so each pair also proves "one mistake, one error"); parse cases with `json ast` for each new grammar rule; `comptime` in each place it is rejected | 1, grows in 2 and 4 |
| `spec/syntax.md` | Unchanged; the two `Expected "("` cases still hold | |
| `packages/compiler/parser.test.ts` | The corpus-stability claims as tests: `func Point -> Point => p`, a type at the end of a match arm followed by `(`, `f([4], x)`, `p.u32-1` | 1 |
| `packages/compiler/checker.test.ts` | Overload resolution table (I.5 rules 1-5); operand validation; `RECOVERY` (one error per failed call) | 1, 2 |
| `packages/compiler/codegen.test.ts` | Chained calls after the `span.end` move (`set (a, b) = f()`, a call as arrow body, as compound-assignment value); the PR 3 probes as tests | 2, 3 |
| `examples/generics/*.ents` | The acceptance programs a00-a08 with their inline tests; picked up by `examples/examples.test.ts` with no change. A multi-file example needs a `main.ents` (scripts/examples.ts:38-50) | 1-3 |
| `lib/vec.ents`, `lib/set.ents`, `lib/map.ents`, `lib/sort.ents`, `lib/stack.ents` | The container library with inline tests, small buffers (the bun timeout is 5 s; a 16 MB `data` takes 9 s to compile) | 4 |
| `packages/compiler/tests/fixtures/generics/` + `loader.test.ts` | Z9; a duck-typed `hash` found in the requesting module; the coherence error; an exported generic in an entry module | 4 |
| `packages/compiler/formatter.test.ts` | New: idempotence on a file with every new form | 1 |

### Documentation

`docs/encantis.md`:

- 1.3 Type Identifiers: type parameters and generic types are type identifiers. 1.4 Reserved
  Keywords (:47-57): add `comptime`.
- 3.4 Functions (:803-890): overloads (I.5, first half); the note that a declared function replaces
  a builtin of the same name; "positional arguments only" stays.
- 4.9 Method-Call Syntax: the present second "4.8 UFCS" (:1248-1284, "Status: Not yet implemented")
  rewritten from I.4 as implemented, which also fixes the duplicate section number.
- **New section 8, "Generics"**, after "7. Modules": I.1-I.3, I.5 (second half), I.6-I.10, inside
  a `<!-- spec:begin compile -->` region. Memory Model and the later sections move down by one.
- 7.1 Imports / 7.2 Exports (:1629-1678): generics and generic types in imports; an exported
  generic is importable and never a host export.
- Memory Model, Data Layout (:1694): `sizeof` and the packed layout, which are undocumented today.
- Builtin Functions (:1852): the replace-by-declaration rule.
- Future Additions: delete "Generics" (:2017-2031, the `<T>` sketch); rewrite "Comptime
  Evaluation" (:2048-2069) as the continuation of section 8 (I.10's table); "Operator Overloading
  via UFCS" (:2090-2109) now builds on overloads that exist.

`docs/grammar.md`: Identifiers and Naming (:11-32), Functions (:155-199, comptime parameters and
generic types), Types (:267-398, type application), Function Call (:661-669, type arguments, method
calls), Literals and Constructors (:671-683, `Vec(T)(...)`). While there: close the unclosed fence
at :271 and repair the links to the grammar file. `spec/README.md`: the new file and the two new
runner features. `lib/README.md` and `README.md:60-66` in PR 4. `CLAUDE.md`, Key Design Decisions:
one paragraph, "Generics are substitution: an instance is a copy of the declaration with its
comptime parameters replaced, compiled like any function."

## III.6 Staging: four pull requests

Each leaves `bun test`, `bun run lint` and `bun run typecheck` clean, is documented and spec-tested
in the same PR, and is useful on its own. Acceptance programs are the files in
`generics/acceptance/` (a00-a12), which become `examples/generics/` and fixtures.

### PR 1. Comptime parameters: generic functions and generic types

In: the whole grammar of III.1 (so the syntax never changes again) and the AST; `comptime` type
and function parameters; explicit and inferred calls (III.2.4); generic types, `Vec(T)(...)`,
`sizeof`; instances by substitution, the queue, the nesting limit; operand validation and
`RECOVERY`; error labels and notes; a declared function replaces a builtin; exported generics are
not host exports; codegen III.3.1-III.3.4, including the widening of call arguments; the
`inferBody` fix (the owner's `bugs/19`); formatter, TextMate, meta symbols, CLI printer; the
zero-cost tests Z1-Z8 and the spec runner changes; the new docs section, with its pointer-header
examples in the `v.*.len` spelling until PR 3.

Not in: method calls and overloads (a second function of the same name becomes the duplicate
error in this PR, where today it silently replaces the first); modules (an import item with
`comptime` reports `generics cannot be imported yet`).

Must pass: **a00** (pick), **a01** with scalar types (the struct `swap` waits for PR 3), **a02**
(find), **a07** written as plain calls `sort(xs, by_order)` over scalar elements, **a10** (the
zero-cost tests), the declaration and call rows of **a11**, and a scalar `Vec` written with
explicit `v.*.len` (`probes/s1.ents` without its method calls). Evidence that this stage is
reachable: all of these run on the spike today.

### PR 2. Method-call syntax, overloads, requirements

In: `inferMethodCall`; `CallExpr` types at `span.end` with the six codegen lookups; the `typePun`
boundary is already in the grammar; overload sets and `resolveCall` with ranking and the
ambiguity error; duck-typed requirements within a module; the explicit-export-name rule for
overloads; hover inside generic bodies; docs 3.4 and 4.9.

Must pass: **a03** (duck-typed `eq`, scalar and slice types), **a04** and **a08** for scalar and
slice elements in the explicit `.*` spelling, **a05** with all-`u32` slots (no `bool` field),
**a07** as `xs.sort(by_order)`, the requirement rows of **a11**, Z2. Evidence: `probes/o1.ents`,
`z2g.ents` run on the spike.

### PR 3. Values in memory (no generics code)

In: III.3.6, each row with its probe as a test; the owner's repro files `bugs/04`, `05`, `06`,
`07`, `09`, `13`, `16`, `17` and `18` become passing examples. Independent of PRs 1 and 2 and can
be developed in parallel or merged first; it is numbered third only because the acceptance
programs it unlocks are generic. The docs chapter's examples are rewritten to `v.len` here.

Must pass: **a01** complete (struct `swap`), **a04**, **a05**, **a06**, **a07**, **a08** exactly
as written (`v.len += 1`, `s.slots[i] = (true, h, k)`, struct and tuple elements, a `bool` in a
slot, `lookup -> ?*mut V`), and Z1 with struct, tuple and `bool`-holding element types.

### PR 4. Generics across modules, and the container library

In: III.2.10 (export, import, program-wide queues, `signatureOnly` and `opaque` for single-file
mode); the lookup chain and the coherence check (III.2.8 step 4 and after); cross-module names in
codegen; per-module literal refs; `lib/` containers; language-server notes.

Must pass: **a09** (generics from `./containers` instantiated for the importer's `Cell` with the
importer's `hash` and `eq`), Z9, and **a12**: `stack/features.ents` on `Set([]u32)` against
`check-features.cjs` with 0 mismatches and no slowdown.

## III.7 Risks, open questions, what to cut first

### Risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| The first users need PR 3 more than they need generics | The container draft uses `v.len` through a pointer, whole-struct stores and a `bool` slot field; all three are miscompiled today, two of them silently. A generic `Set` can check, validate and corrupt data | PR 3 is specified row by row with failing probes; the unsupported forms throw instead of emitting wrong code; Z1 runs the struct and `bool` cases as soon as PR 3 lands |
| Private offset ranges leak to a consumer that reads source at an offset | A diagnostic on a line that does not exist | Three mapping points (III.2.9); a test that every offset in `errors`, `warnings`, `references` and `symbolRefs` of every example is below the source length |
| Instance bodies are checked late, so their errors come after the module's own | Order of messages; spec `errors` blocks are matched in order (spec.test.ts:95-103) | The order is deterministic and documented: a module's own errors, then instance errors in the order the instances were created. Spec cases are written to it. No re-sorting by offset, which would reorder what existing spec cases expect |
| "First argument decides" surprises someone who expected the widest type | `max(a_u8, b_u32)` is an error | The message says which argument decided and how to choose; relaxing to "a later argument may widen `T`" is backward compatible, the reverse is not |
| Overload resolution grows into C++ | Every extra ranking rule is a rule users must know | Three levels, no partial ordering of generics, ambiguity is an error. The cut list drops generic candidates first |
| The lookup chain lets a generic's unqualified call be answered by its caller | A library that forgot a helper compiles for the users who happen to define that name | The generic's own module is always searched first; documented; an unused generic is not checked at all, which is the same class of risk and the owner's chosen rule |
| Coherence check has a hole | Two modules silently share an instance that calls the wrong `hash` | The check is a re-run of the same lookup function under the other chain, not a second implementation; a fixture test with two modules and two `hash(Cell)` |
| Builtin precedence flips for a non-generic user function | A program that declared `max` and relied on getting the builtin changes behaviour | None exists in either repository (**[spike]**: the WAT of all 83 files is unchanged by the patch); Z8 would show it; called out in the release notes with the `comptime` keyword |
| Checker accepts more than codegen compiles (mixed-width arithmetic, function values) | A type argument the generic's author never imagined produces a wabt error, not a diagnostic | Operand validation covers the aggregate cases now; `expectPlainWasm` validates every test output; the remaining holes are listed in map-checker 0.12 and are not made worse |
| Two assemblers and `emitTestDecl` | A change in one passes unit tests and fails in the CLI | `expectSameWasm` runs both; Z7 covers the test path |
| `def` substitution in the parser | A generic body mentioning a parameter named like a `def` is rewritten before the checker sees it | Existing behaviour for all functions; flagged; fixed when comptime value parameters are added |
| Recursive types are already unreliable (`cannot assign *Node to *Node`, map-checker probe r5) | A `List(T)` would inherit it | Recursive generic types are rejected in this version |

### Open questions for the owner

| | Question | This document assumes |
|---|---|---|
| Q1 | Where does a container's header live? `v.push(7)` on `let v = vec(u32, 16)` needs either a pointer header or the address of a local | `vec` returns `*mut Vec(T)`; no address-of-local. A by-value `Vec` stays possible for read-only use |
| Q2 | `max(1, 2)`: an error, or `T = i32` as `let x = 1` would give? | Error; the default can be added later without breaking anything |
| Q3 | Is "the first argument decides" right, or should any argument be able to widen `T`? | First decides, as the builtin `min`/`max` do |
| Q4 | Should a generic's unqualified calls reach the caller's module at all, or should `Set(K)` take `hash` and `eq` as comptime function parameters across modules? | They reach it, after the generic's own module, with the coherence rule. The comptime-function form already works and is the fallback if this is cut |
| Q5 | Struct `==`: undefined (write `eq`), or field-wise? | Undefined; an error instead of invalid wasm |
| Q6 | Is the packed, unaligned layout the documented layout? | Yes: it is what the compiler does, and `sizeof` arithmetic in the kernels depends on it |
| Q7 | Should a source import's restated signature be checked against the real one? | No, unchanged: it is documentation, for generics as for other functions |
| Q8 | The name of the set constructor, since `set` is a keyword | `hashset(K, bits)` |

### What to cut first if it runs long

In this order; each cut leaves everything before it intact and has a one-line error for users.

1. Generic functions as overload candidates (one generic per name; non-generic overloads stay).
2. The coherence *check*; keep the rule in the docs and reject, for now, a lookup that leaves the
   generic's module when the instance already exists from another requester.
3. The lookup chain beyond one step (requester's module only), then the chain altogether:
   requirements across modules are passed as comptime function parameters.
4. `Vec(T)(...)` as a constructor (the struct literal form needs nothing).
5. Hover inside generic bodies; the second diagnostic at the requesting call in the editor.
6. Generic declarations inside `test` blocks.
7. `opaque` imported types in single-file mode (declare the generic type again in the importing
   file, which structural typing allows).

Not to cut, because the guarantee or the first day's experience depends on them: `RECOVERY` and
operand validation (one mistake, one error); the error label and note; the fixed emission order
and `expectSameWasm`; the golden hashes.

---

## Appendix. Probes run for this document

All under `/tmp/claude-0/-home-user-monkey-fist/c2838201-d71f-55a0-bc1a-cc2e586d01ea/scratchpad/generics/lang/`.
"0.2.1" is `bun /home/user/encantis/packages/cli/src/cli.ts`; "spike" is
`bun lang/spike-min/packages/cli/src/cli.ts`.

| File | Compiler | Result |
|---|---|---|
| `probes/r1.ents` | 0.2.1 | A named struct is built by `Name(...)`, by a named struct literal and by a positional tuple; all check and compile |
| `probes/r2.ents` | 0.2.1 | `s.boolish` is a parse error (type view `.bool` then junk) |
| `probes/r3.ents` | 0.2.1, spike | A user `func max(a: i32, b: i32)` is ignored: the call compiles to the builtin `select` (both compilers) |
| `probes/r4.ents` | 0.2.1 | `==` on structs and slices, `>` on structs: `check` OK, wasm invalid |
| `probes/r5.ents` | 0.2.1 | `u32` argument for a `u64` parameter: `check` OK, wasm invalid (`u8` for `u32` is fine: same wasm type) |
| `probes/s1.ents` | spike | The owner's six lines with a pointer header; test passes; four instances, direct calls |
| `probes/i1.ents`, `i2.ents` | spike | Inference: ranges, coercions, literals, first-decides; `max(1, 2)` defaults to `i32` (this design: error) |
| `probes/c1.ents` | spike | Structural generic types, three constructor spellings, `sizeof` of applied types; test passes; shared instances |
| `probes/f1.ents`, `f2.ents` | spike | Every explicit type-argument form; `Pt`, its structure and the inferred call share `count<<q:i32\|r:i32>>`; a generic declared in a `test`; a variable named `u8` makes `count(u8, xs)` an error there (this design: position decides) |
| `probes/m1.ents` | spike | `v.last().double()` and `double(last(v))` compile to the same instruction |
| `probes/x1.ents`, `x2.ents` | spike | Comptime function parameters: direct calls, `sort<i32\|ascending>`, forwarding through `twice`, recursion `fact<u64>`; the spike's messages for wrong comptime arguments |
| `probes/o1.ents` | spike | Overloaded `hash`/`eq`, duck-typed through `a.hash()` and `a.eq(b)` in a generic; missing overload reported with the instance (plus two cascade errors) |
| `probes/e1.ents`, `e2.ents` | spike | Error texts and cascades listed in section 0 |
| `probes/u1a.ents`, `u1c.ents` | 0.2.1, spike | Unused generics: identical 108-byte `.wasm` |
| `probes/u1b.ents` | spike | Exported generic in an entry module: export of a missing function |
| `probes/t1.ents` | spike | A test-only instance is absent from `compile`, present in `test` |
| `probes/z1g.ents`, `z1h.ents` | spike, 0.2.1 | Byte-identical `.wasm`, 317 bytes |
| `probes/z2g.ents`, `z2h.ents` | spike, 0.2.1 | Byte-identical `.wasm`, 1,323 bytes; `probes/novel.sh` finds no `call_indirect`, table, `elem`, `ref.func` or `(type` in either WAT |
| `probes/gram.ts` | ohm, both grammars | 352 sources, 0 changed parses; new forms parse |
| `probes/d1g.ents`, `d1h.ents`; `z2g.ents`, `z3h.ents` | spike + emission patch, 0.2.1 | Byte-identical with instances emitted at the generic's declaration in name order: 94 bytes (the example of II.3) and 1,323 bytes |
| operand check | spike + patch in `spike-min/packages/compiler/checker.ts` (marked `PROBE (lang)`) | no 0.2.1 test fails; no example, lib or kernel file rejected |
| recovery type | spike + patch, same file (`checker.before-recovery.bak` is the state before it) | `e2.ents`: 9 errors for 9 mistakes; `o1.ents`: 1 error; 676 pass, 2 fail, both tests added by the prototype that expect the cascade |
| declared function replaces builtin | spike + patch in `checker.ts` and `codegen.ts` | `r3.ents` calls `$max`; no further test fails |
| WAT of existing programs | 0.2.1 against the copy with all four patches | 83 `.ents` files under `examples/`, `lib/` and the monkey-fist kernels: 79 identical. The 4 that differ also differ for the prototype as found, not through my patches: `examples/math/trig/strcmp.ents` (`min` of two `u32` used `i32.lt_s`, now `i32.lt_u`) and `bugs/01` (a dropped `abs`), two existing miscompiles the prototype's lookup change fixes; `bugs/19` (now compiles); `bugs/09` (a compiler crash whose stack trace has different line numbers) |

Not run, and therefore design only: the exact error texts of I.8, the `, in f(T = ...)` label
form and the `notes` field (the prototype prints `[in f(u32)]`); `RECOVERY` propagating through
member, index and operator expressions; inference reporting literal-only calls as errors and
reading explicit type arguments by position; generic functions as overload candidates and the
third ranking level (exact and converting non-generic levels are in the prototype); the lookup
chain and coherence check; `signatureOnly` and `opaque`; `checkGenericDecl`'s signature walk; the
actions and checker rules for the three lenient grammar forms (only their parsing was run); the
emission order in `moduleToWat` and `emitTestDecl`; the widening of call arguments; the spec
runner changes; everything in PR 3. `bun run lint` and `bun run typecheck` were not run on my
patched copy. For the cross-module half, the other two design runs report prototypes that import
and instantiate generics across modules; I did not re-run those.
