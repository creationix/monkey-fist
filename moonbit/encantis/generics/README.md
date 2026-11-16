# Generics for Encantis: design record

Design work for comptime generics in Encantis (creationix/encantis), done for the
Monkey Fist kernels in this directory. The implementation lives in the Encantis
repository; this is the record of how the design was reached.

| File | What it is |
| --- | --- |
| `PLAN.md` | The judged plan: the language chapter, grammar and compiler changes, five staged pull requests with acceptance programs, non-goals, risks, and questions for the language owner |
| `design-minimal.md` | Design 1, smallest correct change: instances are substituted copies of the declaration. The plan's base |
| `design-architecture.md` | Design 2, first-class instances with per-instance tables and unification |
| `design-language.md` | Design 3, written as the language chapter first, with the zero-cost tests |

The direction was chosen by the language owner: Zig-style comptime type
parameters, monomorphised, with no runtime cost.

```ents
func Vec(comptime T: type) -> type => (ptr: [*]mut T, len: u32, cap: u32)
func push(comptime T: type, v: *mut Vec(T), x: T) { ... }
func max(comptime T: type, a: T, b: T) -> T => if a > b { a } else { b }
```

Five readers mapped the 0.2.1 compiler, three designers wrote independent designs
(two built prototype compilers), and a judge checked their claims against the real
compiler before writing `PLAN.md`.
