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

Every board, at every size and with any mechanics, comes from the same woven
construction. `grid-generator.js` chooses a seeded short/medium/twisty style once
per square level. Hex uses its own strand-building rules. Both try a bounded pool
of candidates inside the exact requested dimensions.

For square boards, `levels.js` constructs ropes together with a
replayable sequence of intermediate stops and exits, then packs remaining gaps.
For Hex boards, `hex/engine.js` seeds mutual-wait pairs and adds long
strands while maintaining a complete certificate. It also places traps: a rope
with a one-to-three-cell gap ahead of its head, kept empty, accepted only if
sliding into the gap leaves some rope that can never leave. It prefers gaps that
lie on the way out of the rope ahead, where such a deadlock forms. Its
straight-track solver represents a rope by its offset along its original body and
forward ray.

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

Spinner levels are woven too. The board is first woven as a sliding puzzle
(with mirrors for combined levels). Spinner cells are taken, in seeded order,
from the empty cells the solution's manual moves pass through, and only if none
of those works from the other empty cells on ropes' ways out; never directly in
front of a head. The known solution is then adapted: the first rope to bounce
off the new spinner gets one more tap, at once or at the end. Only if no
candidate cell allows that does a bounded search under the full rules look for a
new solution; its node budget shrinks as ropes grow, since each node tries every
rope. Either way the bounce must come before the automatic release, and the
bouncing rope must not have a clear run to the spinner from the start, so using
it waits on another rope. The woven board's knots and traps survive, so a
careless slide can still lose the level.

Colossal maps use the same construction with longer ropes. Before, colossal
maps with mechanics came from separate routed generators (`twist-circuits.js`
and `hex/mirrors.js`); their par equalled the rope count with no manual slides.
Woven colossal maps force slides and use more mirrors. Most settings generate in
0.2–3.5 s; Hex with spinners takes 8–17 s at 40 × 40 and 48 × 48, comparable to
the routed path's worst case of 14 s.

Hard ordinary boards can begin with a procedural two-rope mutual-wait core that
requires several successive blocking stops. Depth, orientation, placement and
noncritical body details vary. Core depth is capped relative to the shorter grid
dimension to leave room for surrounding dependencies. The remaining grid is
densely woven around the core while preserving its intermediate stops. These
are families of constructive motifs, rather than an unrestricted search over all
possible maps.

The final selected solution is replayed to measure manual partial slides, ropes
slid more than once, and ordinary filler ropes moved between core actions. A
specification can require minimum amounts of this work; the Journey instead
selects by measured play. A requirement checks the selected solution; necessity
is proven only when the corresponding minimum-tap search finishes.

A normal rope tap travels until an obstruction, a spinner, or an exit. A solver
cannot invent an arbitrary intermediate stopping point. Any proposed stop must
arise from the actual occupied board at that moment.

### Candidate filtering and selection

Candidates are checked for exact dimensions, legal adjacency, initial blocking,
non-overlapping initial occupancy, and a successful solution replay. Generation
then optimizes within practical limits rather than proving maximum packing.

One density rule applies to every board: ropes fill at least 85 % of the cells
they can occupy (mirror and spinner tiles excluded), or 80 % on boards of at most
48 cells. A board below 85 % must use that space: its final certificate has to
include a slide. Boards of at least 8 × 8 also reject sparse quarters. The
Journey builder relies on these checks rather than repeating them.

Woven boards ask for about `0.6 √T` knots and as many traps, with a tangle
target `T = 300 (d/100)^1.3`, as the J1 generator did. Revision 3 tied these
counts to area instead, which asked for a third as many knots and a fifth as
many traps and was the main reason fixed-size boards forced so few slides.

Candidates are chosen by play. Each one is measured by the manual slides and
bounces in its par solution (`work`) and by how often a casual player wins: one
that taps a rope that can leave if there is one, and otherwise any legal move,
at random. The measured challenge is `work + 6 × (1 − wins)`; the difficulty
setting maps to a target `0.5 + 9.5 (d/100)^1.3`, and the candidate closest to
it (weighted with density) is kept. Above difficulty 30, a candidate whose
casual win rate exceeds a ceiling (falling linearly to 50 % at difficulty 100) is
penalised, so forced but safe work cannot stand in for decisions. Playouts run on
the compact offset kernels except on spinner boards, which use fewer games on the
full-geometry rules.

Colossal generation uses longer ropes, three candidate attempts, and skips the
minimum-tap search, playouts and structural analysis; par is the construction's
replayed tap count. It still has to return a dense, replayable board; exhausting
a budget is not permission to publish an invalid or sparse result.

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

These measures contribute a small term to selection. They no longer reject
candidates or order the Journey: they describe one certificate, and the
measurements in the research note found them a weak guide to whether a board
can be lost.

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
20 to 100 after the introductions), tries several derived seeds (the
generator enforces every rule above; the builder only adds that no map repeats
and that introductions have at most five ropes), re-measures them with more casual
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

Harder levels should also be losable: the builder caps the casual player's win
rate at the generator's ceiling for the level's difficulty (from 1 at difficulty
30 down to 0.5 at 100), keeps trying seeds while the best candidate is over it,
and otherwise takes the most losable one. It never substitutes a sparse or
unsolved map. Earlier builds also demanded three manual slides in late levels
and a par above the rope count in late plain levels; selection by measured
challenge makes those rules unnecessary.

### Reproducibility and saved progress

The Journey builder regenerates its seed/settings index and records measurements
and a layout hash. Maps and solutions are still generated, not stored as a fixed
collection of hand-authored levels. Runtime generation computes the hash again
from grid dimensions, rope paths and mechanic tiles; tests check that it matches.

Before public release, saves keep no history across generator changes: when
`GRID_VERSION` changes, saved scores are cleared and Journey chapter access is kept.

### Remaining limitations

- The casual player is a comparative measure, not a model of people; it has not
  been calibrated against human solving times.
- Spinners are placed after weaving and checked with the full-geometry rules,
  so spinner levels take longer to generate (up to about three seconds on
  moderate boards) and their par is less often proven minimal.
- Construction starts from a limited family of sliding cores. Dense
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
- Colossal boards skip the minimum-tap search and playouts, so their par is the
  construction's tap count and they are not chosen by measured challenge.
