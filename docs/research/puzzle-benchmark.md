# Comparing rope generators

This benchmark is independent of candidate selection and campaign ordering. It
compares generated boards under the same production movement rules. It does not
assign a universal human difficulty score or select a winning generator.

## Run it

No dependencies or build step are required:

```sh
node --test tests/puzzle-search.test.cjs tests/puzzle-players.test.cjs tests/puzzle-benchmark.test.cjs tests/revision-generator.test.cjs
node scripts/benchmark-puzzles.cjs --refs 90b522e,ee2ec69 --nodes 2000 --trials 64 --out /tmp/comparison.json
```

`--refs` loads every dependency from the selected Git commit into an isolated
module environment. It neither checks out branches nor mixes historical
kernels with current generator modules. All returned boards are then evaluated
with one common rules implementation. Historical certificates that no longer
solve under those rules are reported as errors.

The default eight cases include two campaign positions, four fixed 8 × 8 Custom
puzzles, and two later campaign positions. Campaign positions are historical
snapshots, **not matched puzzles**: their grids, dimensions and intended
challenge can differ after a rebalance. Compare the fixed-size Custom cases or
explicitly matched strata when drawing generator-quality conclusions. J1 does
not support independent grid size, so these Custom cases are marked unsupported
for that revision.

Search and simulation limits are deterministic counts, not elapsed time. The
report records full source revisions, rules-source hash, options, layout hashes,
quality measurements, exact search bounds, policy definitions and trial counts.
Timings vary by machine. Generation failures remain in the report rather than
silently disappearing from a candidate sample. Boards above `--max-area` (192 by
default) retain their quality measurements but are excluded from expensive
search and simulation.

## Plug in another generator

The simplest interchange is a JSON array of `{ "id": "example", "board": ... }`
objects:

```sh
node scripts/benchmark-puzzles.cjs --boards /tmp/generated-boards.json --nodes 20000 --trials 128 --out /tmp/results.json
```

A board uses the game's common coordinate format:

```js
{
  grid: 'square', // or 'hex'
  W: 8, H: 8,
  ropes: [ [{q: 0, r: 0}, {q: 1, r: 0}], /* tail to head */ ],
  mirrors: [ {cell: {q: 4, r: 3}, slope: '/'} ], // square: '/' or '\\'
  springs: [ {q: 6, r: 4} ],
  plan: [0 /* complete sequence of rope indices, including automatic exits */],
  par: 1 // optional declared target, kept separate from measured optimum
}
```

Hex coordinates are axial; the finite board uses the existing offset-row
footprint. Hex mirror orientation is `axis: 0`, `1` or `2`, replacing `slope`.
Initial and intermediate rope occupancy must be valid. A certificate is optional,
but when present it must solve completely under the common rules. Without one,
a bounded search can return unknown solvability. Locks are outside this
comparison. Starting with a tail on a spinner is allowed by the movement rules;
the benchmark does not impose one generator's extra construction restrictions.

For direct generation, export a CommonJS function or an object with
`generate(options, {rules, spec})`; it may return a board or a promise:

```sh
node scripts/benchmark-puzzles.cjs --generator /tmp/my-generator.cjs --cases scripts/benchmark-cases.json --out /tmp/results.json
```

`rules` is the shared game API and `spec` is the current seed/settings
specification. `options` come directly from the case file. Fixed-size cases must
preserve their requested grid dimensions. To compare a larger sample, supply a
JSON array of `{id, options}` cases containing an explicit seed per case. Use the
same case file, rules, node budgets and simulation settings for every generator.

## Two independent search objectives

The evaluator explores full rope paths and **all legal moves**, including the
choice to leave an available exit in place. Mirrors and spinners can introduce
cycles; visited states prevent repeated expansion.

- **Manual taps:** each chosen move costs one until every remaining rope can
  leave automatically. The final automatic suffix costs zero. A nonempty,
  initially all-free board still needs its initiating tap, as in the game.
- **Non-exit moves:** exits cost zero; partial slides and spinner reversals cost
  one. This measures the least non-exit work in any solution, independently of
  the minimum-tap objective.

Removing individual clear ropes greedily is unsound for the second objective as
well as the first. A clear rope can be a useful temporary stopper. The regression
suite includes an 8 × 6 board where the old greedy helper claims two slides with
`exact: true`, although a one-slide solution exists. It also covers mirror-only
cycles, spinner cycles, automatic-release accounting and an independent
full-state-graph oracle.

Each result reports:

- `optimal`: the lower and upper bounds coincide, with a replayable best plan.
- `budget-exhausted`: the lower bound remains honest; an upper bound and plan
  are present if a solution is known. This is not a proof of optimality or a
  proof that an uncertified board is unsolvable.
- `unsolvable`: the complete reachable search has been exhausted without a
  solution. Upper bound and plan are absent.

Node limits count unique expanded states. The solver uses a complete validated
certificate as an incumbent, rather than trusting its declared par. A solution
minimizing non-exit moves need not minimize player taps.

## Three explicitly limited toy players

All policies choose legal moves, use seeded streams, and stop at the automatic
suffix. They omit blocked taps, touch mistakes, undo, hint use and human visual
reasoning.

| Policy | Choice rule |
| --- | --- |
| `exitFirst` | Random clear exit when one exists; otherwise a random legal move. |
| `randomLegal` | Random legal move, including partial slides while exits exist. |
| `cautious` | Exit-first after screening moves that immediately leave no legal move. |

The cautious policy has bounded one-step screening, not a full solver. Unchecked
choices remain available; uncertainty is never treated as a proved dead end.
Different policies have independent deterministic random streams. Their finite
samples can therefore rank differently even when one policy usually helps.

Report wins, observed dead ends, repeated-state loops and step-limit timeouts
separately. Loops and timeouts are **censored**, not proofs that a state cannot
be solved. `winRate` and its Wilson 95% interval describe success under this
bounded procedure, not eventual human success. Even 64 wins in 64 trials are
not evidence of universal safety.

`meanManualTaps` is conditional on winning. `meanExcessTaps` compares those wins
with the replayed certificate and can be negative. `meanTapRegret` is provided
only when the manual-tap optimum is proved; it compares wins with that optimum.
`screenedChoices` and `fatalChoices` count policy checks across trials, not unique
decision states. Success-conditioned averages can hide hard failed attempts,
so always read them alongside outcome counts and censoring.

## How to use the results

Keep board size, grid type, density and mechanic flags comparable. Measure
construction failure rate across the complete candidate stream. Use several
seeded samples and retain raw rows, not only favorable examples.

The benchmark is a diagnostic. Forced slides can distinguish sliding from
exit-only cleanup, but a compulsory sequence with one safe choice at each step
can still be easy. Random failure can expose fatal options, but obscure traps
can be frustrating. Neither alone demonstrates a good puzzle.

Useful next experiments are separate knot, trap and pull-budget ablations;
comparison of candidate-selection objectives; and small playtests that record
completion, excess taps and undo use. An independent reflected-track solver
prototype can be checked against `rules.tap` before attempting a shared builder.
