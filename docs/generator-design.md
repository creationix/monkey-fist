# Generator design: goals and current techniques

This document separates the game we want from the methods currently used to
build it. The implementation described here is the grid-size generator used by
`J3` Journey and `U3` Custom sets, with generation revision 5. Older shared set
codes retain their legacy generators. Goals describe intended player experience;
techniques describe implemented rules and heuristics, including their limits.

## 1. Desired goals

### Interesting difficulty within a moderate board

Journey should become harder through **interacting dependencies**, with only
moderate growth in physical size. Harder puzzles should involve several of:

- Multiple prerequisites converging on a rope, and unlocks that affect several
  other ropes.
- Mutual waits that require a partial slide to break.
- Returning to a rope after moving other ropes has changed its options.
- Interleaved partial slides, reflections, and spinner reversals whose order
  matters.
- Choices that require looking ahead, rather than one obvious next exit at
  every step.

A long linear sequence of single-tap exits is more work, but is not sufficient
by itself to make a puzzle hard. Neither is a longer rope, a longer route off
screen, or a larger grid.

The normal Journey should not need zoom to be comfortably playable on typical
phones and tablets. Its current size ceiling is **12 × 16**. Sizes can vary
throughout the set; they should not grow continuously to manufacture difficulty.
Colossal maps belong behind an explicit Custom option, currently allowing up to
**48 × 48**, where using zoom is expected.

### Dense, balanced layouts with useful movement space

Fill the chosen grid with ropes as much as practical. Avoid empty corners,
sparse diagonal strips, separate puzzle islands, and large amounts of padding.
Prefer varied winding ropes and a mix of lengths and arrow directions.

Density is a constraint on good puzzle construction, not a demand for 100%
occupancy. A small empty space that enables a necessary partial slide is useful.
Removing all such space can turn an interesting sliding puzzle into exit-only
cleanup. Empty space should serve the solution, rather than compensate for a
poorly fitted construction.

### A coherent opening and progression

Keep the opening small, readable, and varied, normally with at most five ropes.
Use the original game's successful small-board pacing. Mix square and Hex
puzzles according to challenge; changing grid type must not restart difficulty.

Use **one player tap per three ropes** as the minimum target ratio. A puzzle with
more than three ropes should never have a one-tap automatic-clear solution.
However, the ratio is only one signal: total player taps, rope count, board area,
and the structure of the dependencies all matter.

Later hard puzzles should regularly require meaningful non-exit actions. Par
above the number of ropes should become possible and reasonably common, but
should follow from necessary moves, not a deliberately inefficient solution.
Do not make every puzzle maximize the same metric.

### Mirrors and spinners as regular, consequential mechanics

After the opening, mirrors and spinners should appear regularly across the
Journey, including its final chapters. Keep some plain puzzles for variety.
Do not let sorting collect all mechanic levels in the middle of the set.

Mechanics should affect real decisions:

- A mirror should actually turn a rope, not merely lie on a path traversed
  edge-on.
- A spinner should actually reverse a rope. Harder mechanic puzzles should
  include more than one visible spinner where the board supports it.
- Approaches can be blocked initially. Shared use can make another rope wait
  until the previous rope has cleared the spinner.
- Repeated use and interacting routes are more valuable than decorative blocks
  or an isolated extra bounce.

These remain environmental rules. Playing still consists of simple rope taps;
there is no separate player action for changing direction.

### Correct, reproducible and responsive generation

Every map must fit its specified grid, begin with a real dependency, and have a
complete solution replayed under the same rules as the game. Resting ropes must
never overlap. Mirrors are two-sided; a reversed rope's tail can occupy a
spinner and block another rope from entering it.

A seed and settings must reproduce the same map. Work should be bounded and run
in a worker so generation does not interfere with touch handling. Changes to
maps must not leave unrelated scores or chapter unlocks corrupted.

## 2. Techniques currently used

### Fixed dimensions, seeded styles and constructive certificates

`game-engine.js` turns the set code and level index into a deterministic board
specification. Custom grid width and height are independent of difficulty.
`grid-journey.js` stores seeds, settings and measured metadata for 120 levels;
it stores neither hand-authored maps nor solution paths. Boards are constructed
when opened.

`grid-generator.js` chooses a seeded short/medium/twisty style once per ordinary
square level. Hex uses its own strand-building rules. Both try a bounded pool of
candidates inside the exact requested dimensions.

For ordinary square boards, `levels.js` constructs ropes together with a
replayable sequence of intermediate stops and exits, then packs remaining gaps.
For ordinary Hex boards, `hex/engine.js` seeds mutual-wait pairs and adds long
strands while maintaining a complete certificate. Its straight-track solver
represents a rope by its offset along its original body and forward ray.

Mirrors no longer need a separate construction. Without spinners, a rope's
future cells are one fixed sequence even with fixed mirrors: its body, then its
way out as the mirrors bend it. `levels.js` and `hex/engine.js` build tracks
that way (`rayCells`, `rayTrack`), and refuse a rope whose way out would enter a
cell twice. The replay, knots, traps, relaxation and exact searches then work
unchanged. A mirror-only level places its mirrors first, away from the edges and
from any repeated-slide core's ways out, weaves knots and traps around them, aims
some ropes at idle mirrors, and finally removes mirrors no rope turns on. The
offset model was cross-checked against the game's own taps over more than
14,000 random moves on both grids without a disagreement.

For spinners, and for colossal mirror maps, `twist-circuits.js` and
`hex/mirrors.js` construct routed core ropes first. Ordinary ropes are inserted at positions in that certificate
where they can legally leave before a route needs their occupied cells. This
can create dependencies both before and after a mechanic move. The routed
solver tracks full rope paths because mirrors and reversals change them.

Hard ordinary boards can begin with a procedural two-rope mutual-wait core that
requires several successive blocking stops. Depth, orientation, placement and
noncritical body details vary. Core depth is capped relative to the shorter grid
dimension to leave room for surrounding dependencies. The remaining grid is
densely woven around the core while preserving its intermediate stops. Hard featured boards can combine
this pair with routed core ropes before population. These are families of
constructive motifs, rather than an unrestricted search over all possible maps.

The final selected solution is replayed to measure manual partial slides, ropes
slid more than once, and ordinary filler ropes moved between core actions. Late
Journey specifications require minimum amounts of this work and a reported
par above rope count. The constraint checks the selected solution; necessity is
proven only when the corresponding minimum-tap search finishes.

A normal rope tap travels until an obstruction, a spinner, or an exit. A solver
cannot invent an arbitrary intermediate stopping point. Any proposed stop must
arise from the actual occupied board at that moment.

### Candidate filtering and selection

Candidates are checked for exact dimensions, legal adjacency, initial blocking,
non-overlapping initial occupancy, and a successful solution replay. Generation
then optimizes within practical limits rather than proving maximum packing.

Published density floors are approximately:

| Board | Minimum rope-cell occupancy |
| --- | --- |
| Ordinary board | 85% |
| Small board with a verified partial slide | 80% |
| Routed mechanic board | 80–84%, depending on size |

Feature cells are not counted as rope cells. Larger boards also reject sparse
quarters; the Journey builder checks regional coverage on every map.

Woven boards ask for about `0.6 √T` knots and as many traps, with a tangle
target `T = 300 (d/100)^1.3`, as the J1 generator did. Revision 3 tied these
counts to area instead, which asked for a third as many knots and a fifth as
many traps and was the main reason fixed-size boards forced so few slides.

Candidates are chosen by play. Each one is measured by the manual slides and
bounces in its par solution (`work`) and by how often a casual player wins: one
that taps a rope that can leave if there is one, and otherwise any legal move,
at random. The measured challenge is `work + 6 × (1 − wins)`; the difficulty
setting maps to a target `0.5 + 9.5 (d/100)^1.3`, and the candidate closest to
it (weighted with density) is kept. Playouts run on the compact offset kernels
except on spinner boards, which use fewer games on the routed rules.

Colossal generation uses longer ropes, fewer candidate attempts, no expensive
optimal-par or structural search, and a deterministic packing-work budget. It
still has to return a dense, replayable board; exhausting a budget is not
permission to publish an invalid or sparse result.

### Measuring dependencies instead of rewarding trivial chains

`dependency-metrics.js` observes the manual part of a verified solution. A causal
edge is recorded when moving a blocker gives another rope more legal travel.
It measures converging prerequisites, forks, mutual-wait groups, branching
depth, and ropes revisited after another rope actually unblocked them.

The analysis collapses strongly connected groups and removes transitive
shortcut edges before evaluating branching. A plain chain does not become a
complex join merely because its graph also contains redundant shortcut edges.
One-key fans and unrelated moves do not supply join or revisit evidence.
Disconnected dependency groups are discounted according to the largest coupled
group. Additional viewport padding does not increase these interaction metrics.

These measures still reject advanced candidates without mutual waits, revisits
or joins, and contribute a small term to selection. They no longer order the
Journey: they describe one certificate, and the measurements in the research
note found them a weak guide to whether a board can be lost.

### Counting taps and interpreting par

Par counts player actions in the selected verified solution. Once every
remaining rope can exit, the automatic suffix is free. Passing through several mirrors in one
uninterrupted move still costs one tap. A spinner reversal or a partial stop is
a separate move and can require another tap later.

For a complete verified solution:

```text
par = manual exits + manual partial slides + manual reversals
ropes = manual exits + automatic exits
par - ropes = manual partial slides + manual reversals - automatic exits
```

Consequently, a level can contain several partial slides yet still have par
below its rope count if it ends with a large automatic release. Conversely, a
long exit-only chain can have par close to the rope count without being very
interesting.

Par is computed honestly. Exits the rest of the certificate does not need are
first moved to the automatic release, then a bounded minimum-tap search runs
from there: on the offset kernels for every board without spinners, and on full
geometry for spinner boards with up to twelve ropes. Where the search does not
finish, the result is the best verified solution found, an **upper bound** on
the true minimum. Current
acceptance enforces the 1/3 floor against that reported target and independently
rejects complete one-tap clears on boards containing more than three ropes.
It does not limit partial cascades or prove a global minimum-ratio bound for
every large board.

### Chapter quotas and meaningful feature use

Journey builds and orders each displayed group of ten separately, so sorting
cannot move every mechanic level into the middle of the campaign.

| Displayed chapter | Featured levels | Mirror levels | Spinner levels |
| --- | ---: | ---: | ---: |
| 1 | 0 | 0 | 0 |
| 2 | 6 | 5 | 2 |
| 3 | 8 | 6 | 5 |
| 4–12 | 9 | 7 | 6 |

A level with both mechanics counts in both columns. From chapter 4 a chapter has
one plain level, three mirror levels, two spinner levels and four with both.
Later chapters keep the plain-rules interlude between featured puzzles and
finish on a featured puzzle.

Every level, the opening ten included, is built from the master seed. The
builder plans each position's kind, size and difficulty (rising smoothly from
20 to 100 after the introductions), tries several derived seeds, rejects any
candidate that fails the checks above, re-measures the rest with more casual
games, and keeps the one closest to the position's target challenge. Within a
chapter, levels run from lowest to highest measured challenge. If no seed works
at the planned size, the board steps toward 12 × 16. Each level records its
`slot`, `journeySeed` and `seedAttempt`, and its map seed is a hash of those
alone, so `--seed` builds a different deterministic campaign and no layout or
seed is listed in the source.

From chapter 4, enabled mechanics require at least three actually turning
mirrors or two distinct actually used spinners. The checks inspect the final
solution's manual prefix as well as its full replay. Requested distinct
spinners are established before allowing further core ropes to share them;
shared occupancy still follows normal collision rules.

From chapter 7, featured levels also require at least three manual partial
slides, two repeatedly slid ropes, an intervening filler move, and reported
par/rope count of at least 1.05. Late plain levels have similar sliding and ratio
requirements. The builder retries bounded seed alternatives if a specification
cannot be satisfied; it never substitutes a sparse or unsolved map.

### Reproducibility and progress migration

The Journey builder regenerates its seed/settings index and records measurements,
feature usage and a layout hash. Maps and solutions are still generated, not
stored as a fixed collection of hand-authored levels. Runtime generation computes
the hash again from grid dimensions, rope paths and mechanic tiles.

Saved results carry a layout hash. During a generator revision change, unchanged
Journey layouts keep their results even if their displayed positions move.
Earlier results without hashes use the builder's previous-index mapping. Results
for changed boards are archived; chapter access and preferences are retained.

### Remaining limitations

- The casual player is a comparative measure, not a model of people; it has not
  been calibrated against human solving times.
- Spinner levels still use routed circuits and the repeated-slide core. Their
  slides come mostly from that core, and they are the least losable featured
  levels in the late chapters.
- Construction starts from a limited family of sliding and routed cores. Dense
  packing and random transformations add variety, but this does not explore every
  possible dependency structure.
- Slide counts and interleaving describe the selected solution. On larger boards,
  a shorter solution may exist; reported par is an upper bound when `exact` is
  false. A higher reported par alone does not prove higher difficulty.
- Dependency metrics describe demonstrated causal relationships in one solution,
  rather than every possible player choice. Their weighting is a practical
  approximation to human difficulty.
- Candidate pools and solver work are bounded. An overconstrained seed can fail;
  bounded retries improve reliability without relaxing correctness or density.
- Colossal boards deliberately use a faster construction path. They do not get
  the same repeated-core search or minimum-tap proof effort as moderate boards.
