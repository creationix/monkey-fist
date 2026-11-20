# Initial comparison

The [raw report](baseline.json) contains 28 evaluated boards and four unsupported
cases across J1 (`0be7c3a`), the research baseline (`90b522e`), the repeated-slide
update (`ee2ec69`), and the fully seeded Journey (`a094047`). All boards were
played with the same rules from `a094047`.

Reproduce it from the repository:

```sh
node scripts/benchmark-puzzles.cjs --refs 0be7c3a,90b522e,ee2ec69,a094047 --nodes 2000 --trials 64 --steps 200 --out /tmp/baseline.json
```

The case definitions are in `scripts/benchmark-cases.json`. Functional results
are deterministic; wall-clock timings and the recorded current rules revision
can differ after documentation-only commits. The rules hash should match.

## A useful distinction

These are selected fixed-size cases, not a representative population sample.
They demonstrate why required moves and decision difficulty should be measured
separately:

| Generator | Fixed 8 × 8 case | Proven minimum non-exit moves | Exit-first wins | Cautious wins |
| --- | --- | ---: | ---: | ---: |
| `90b522e` | Square hard | 2 | 42/64 | 47/64 |
| `a094047` | Square hard | 4 | 3/64 | 23/64 |
| `90b522e` | Hex hard | 2 | 64/64 | 64/64 |
| `a094047` | Hex hard | 4 | 64/64 | 64/64 |

The new Hex case requires twice as many non-exit moves, yet neither policy failed
in this sample. The Square case has fatal choices that the one-step cautious
policy often avoids. This is evidence that slide count alone misses important
structure; it is not evidence that all Hex puzzles are easier or that a low toy
player win rate makes a puzzle enjoyable.

The four rows use the same requested dimensions, difficulty and seed within each
grid type. Rope count, packing and shape differ because the generators differ.
All three toy policies know which moves are legal; exit-first also knows which
ropes can leave immediately. These are not human playtest results. Each raw row
includes Wilson intervals and separately records censored outcomes.

At the 2,000-state search budget, 13 of 28 manual-tap searches and four of 28
non-exit searches remain bounded rather than proved. Inspect each row's status
and bounds. In particular, high certificate par on the larger maps does not
prove that every listed partial slide is necessary. J1's four fixed-size Custom
cases are unsupported because that API does not separate dimensions from
difficulty; they were not silently replaced with differently sized boards.

## Next comparison

An independent generator can export boards or implement the adapter described
in [the benchmark guide](../puzzle-benchmark.md). Start with matched grid sizes,
mechanic flags and multiple explicit seeds. Retain generation failures and raw
results. Compare both search objectives and all player outcomes before tuning a
single aggregate score.
