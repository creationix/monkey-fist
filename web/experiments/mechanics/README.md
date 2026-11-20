# Advanced mechanics feasibility spike

The browser playground is a separate, tap-to-play subpage. Nothing here is imported by the
main game. The existing level format, generator, saves, and shipped solver are unchanged.

## Play the experiments

Open [the playground](https://creationix.github.io/monkey-fist/experiments/mechanics/).
It includes eight introductory puzzles and four frozen generated examples, with mirrors,
key gates, spring blocks, and combinations of all three. Moves animate along their actual
routes; spring contact reverses the whole rope. Hint, Restart, and unlimited Undo are available.
There is no saved progress and no effect on your main game. Link to a specific puzzle using
`?puzzle=5` (the first spring puzzle), for example.

Serve the repository root with a static server to run locally, then visit
`/experiments/mechanics/`. The page uses `sandbox-logic.js` for both play and hint search;
all twelve starting boards have replay-verified solutions in `sandbox.test.cjs`.
`sandbox-generated.js` freezes actual generated examples rather than generating on load.
The sandbox remains a prototype, not the production animation or level-generation engine.

## Recommendation

Build **fixed 45-degree mirrors** as the first substantial new movement mechanic, with
**key ropes and gates** as the lowest-risk complementary mechanic. Start with a small
curated pack, then add constrained generation. Automatic **spring blocks** are a promising
follow-up. Player-triggered direction flips are ruled out; defer tunnels.
Permanent barriers alone do not add useful puzzles under the current movement rules.

**Interaction constraint:** the only puzzle action is tapping a rope. Undo is the only
exception. Mirrors, springs, and gates act automatically; there is no tool selection,
flip button, special tap, or consumable powerup mode. The original free-flip experiment
is retained below as historical solver research, not a proposed gameplay feature.

This spike implements solver extensions, generation experiments, and a playable browser
prototype, not production integration, exact par calculation, or a finished advanced generator.

## Reproduce

Requires Node; no packages or browser required:

```sh
node --test experiments/mechanics/*.test.cjs
```

`results.json` and `springs-results.json` came from `run.cjs` and `springs-run.cjs`, which
built their corpus with the original game's set generator. Both were removed with that
generator; check out commit d3abcdc to rerun them.

Browser checks require Playwright, Chromium, and a server on port 4173 (or `MF_TEST_URL`):

```sh
node --test tests/playground.test.cjs
```

`results.json` records one run on Node v24.22.1. The corpus is deterministic: seeds ALPHA,
BRAVO, E5DDK; Normal, Hard, Extreme; levels 1, 5, 10 of each ten-level sliding set.
Extreme uses Bigger boards. Timing depends on the machine and is not a mobile benchmark.
The runner uses the real `generateSet` and `weave` functions, excluding `levelFrom`'s
separate par optimization. Every claimed solution is replayed. Search uses the current
game's 4,000-state interactive budget; `null` means unknown, never impossible.

## Results

| Experiment | Measured outcome | Interpretation |
| --- | --- | --- |
| Existing solver vs extended solver, no new mechanics | Both solved 27/27 with identical node counts | The track/offset search model is retained |
| Permanent wall on an empty exit-lane cell | 27/27 impossible | A fixed-direction rope can never pass that wall |
| Permanent wall off every exit lane | 24/24 solvable; 3 boards had no such empty cell | These walls cannot affect a legal move |
| One or two gate overlays | 27/27 replayed and solved, with baseline node counts | Key removal can be incorporated into optimistic pruning |
| Does the first gate add a new dependency? | 19 yes, 6 redundant, 2 unknown | Solvability alone is not enough to select interesting gates |
| One mirror, up to eight empty lane cells, both slopes | 251 solved, 82 impossible, 39 unknown, 18 unsupported out of 390 | Every sampled board had at least one solvable placement |
| Reverse an arrow to create a flip-required puzzle | Found on 26/27 boards, trying at most eight arrows each | An initial flip restores a verified original solution |
| Search those flip-required puzzles with one charge | 24 solved, 2 unknown | A valid puzzle can already exceed the interactive budget |

Mirrors here are fixed, two-sided `/` or `\` reflectors on grid cells. Their art is a thin,
symmetric diagonal strip: neither half of the cell is filled as a triangular solid.
Entering one bends the head
90 degrees and the body follows the resulting track. A mirror is not an impassable wall;
ropes may occupy its cell and block other ropes there. This is a movement model for the
suggested triangular reflectors, not a decision about their final artwork.

The mirror compiler rejects cycles, repeated-cell routes, and routes returning through the
rope's initial body. Those conservative restrictions protect the solver's one-track-index-
per-cell assumption. The 18 unsupported candidates are not counted as impossible puzzles.
The corpus measures one-mirror overlays, not large boards with many interacting mirrors.
Some accepted placements can simplify a puzzle; these numbers prove feasibility, not fun
or increased difficulty.
The corpus tests mechanics separately, not arbitrary combinations of flips, gates, and mirrors.

## Why these results follow from the current code

### Fixed walls: inert or fatal until movement gains a way to turn

`levels.js:boardOf` creates one track per rope: its original body followed by a straight
ray to the edge. `slideTo` changes an offset on that track; sliding never redirects it.
A wall on that ray permanently prevents the rope from leaving. A wall on an initially
empty cell outside all such rays can never be reached. It therefore cannot provide a
useful intermediate stop on an otherwise solvable board. This corrects the initial idea
that permanent barriers alone could create useful stopping positions.

A hand-built fixture demonstrates a mirror routing a rope around a wall that otherwise
makes the puzzle impossible. Even with fixed mirrors, walls cannot provide temporary stops:
a successful fixed route must avoid them. Useful stopping barriers would need to move,
disappear like gates, or be combined with a way to change the route during play.

### Gates: minimal additional state, good fit for replay-based generation

The spike represents a gate as `{ cell, key }`, with `key` a stable rope index. A gate is
closed while that rope remains on the board and permanently opens when it exits. No timer,
switch toggle, inventory, or independent door-state bitmask is needed. Several cells can
share one key. Rendering could use matching colors plus a distinct symbol.

`relax` remains sound if it opens a gate only after the key could optimistically leave.
The cyclic-key fixture confirms it rejects an unresolvable dependency cycle. Ordinary
rope offsets still suffice for memoization, and removing an exiting key only helps other
ropes. Undo can derive gate state from the restored key rope, subject to the same stack order.

`gateCandidates` traces a generated board's known solution, records the first time any
head traverses an initially empty cell, and selects a key that exited earlier. Adding
that gate preserves the known replay by construction. The dependency probe then searches
the original board for a way to clear the affected rope while keeping the key: success
proves the new gate adds an ordering restriction. Production selection should require this
proof and discard redundant or budget-unknown candidates.

The 27 gated searches in the recorded run used the same number of states as their baselines.
The slowest took about 9 ms here. This uses the known solution as the preference order;
it is not a claim about arbitrary off-solution player states.

### Mirrors: keep fixed tracks, generalize how tracks are constructed

A fixed mirror is deterministic. Compile its reflected route once into `seq[i]`; the
offset, `slideTo`, backtracking, and optimistic relaxation can still operate on that route.
The spike's generic solver solved mirror variants without adding a per-move mirror state.
Nine tests include reflection from every direction, cyclic routes, a mirror/wall fixture,
and independent exhaustive checks of 240 small two-mirror layouts. Another 360 seeded
small boards compare walls, gates, and flips against an independent path-based solver.

Production work is broader than `boardOf`: straight rays are also embedded in `ray`,
`advance`, blocker graphs, deadlock detection, the shaper's `wayOut`, generator surveys,
the replay's track construction, `solutionCosts`, animation `pointAt`, and exit effects.
Extract one shared route compiler and transition kernel for all these consumers. A rope's
head direction must come from its current route segment when drawing and animating.
Display rotation must rotate the mirror symbol and its effective visible slope consistently.

For a first generator, place a bounded number of mirrors, compile only simple routes,
and accept candidates with a replayed solution within budget. The spike demonstrates this
as a post-generation overlay search. To regain the existing generator's strong guarantees,
give `weave` a fixed mirror field before it lays ropes, and make every trial replay use
the routed tracks. This full reverse-generator integration is proposed, not implemented.
Recalibrate difficulty and par; a solved mirror overlay may be easier than its source board.

### Player-triggered direction flips: rejected interaction, historical measurements

This is no longer a proposed mechanic: it violates the rope-tap-only interaction constraint.
The original prototype allows one flip of any current rope body, including after a slide. It reverses
the current path and rebuilds its track. To generate a guaranteed example, reverse one
original arrow, prove the board without a flip is impossible, then verify the witness
`flip that rope; replay original solution`. This found 26 candidates; the remaining board
was not proved to lack such a candidate, since only eight arrows were tried.

The fixed-track `relax` proof is invalid while a flip remains. A rope declared permanently
dead under its present track can escape after reversal. The spike disables that pruning
until the charge is spent; cache keys also include charge and changed track geometry.
Two known-solvable Extreme candidates then exhausted 4,000 states; the slowest search in
the recorded flip sample took about 276 ms. New pruning would be needed for responsive hints
and loss detection on larger boards. The existing fewest-taps/par search also needs
to count flip actions rather than assuming every extra action is a slide.

### Spring blocks: automatic reversal using only ordinary rope taps

`springs.cjs` models a solid spring cell. A tap moves the rope forward as usual. When its
head reaches the spring, it stops immediately before the block, swaps head and tail, and
ends the move. The next ordinary tap moves from the new arrow end. A spring directly ahead
can trigger the same reversal without an approach slide. Another rope can block access to
the spring. This stop-after-bounce rule is an explicit spike assumption: continuing within
the same tap would need additional rules to prevent endless automatic bouncing.

The entire current body reverses, rather than the head bending 180 degrees into its own
neck. For a bent rope, the new outgoing direction follows the old tail's segment, so it
need not be geometrically opposite the old head's heading. A production animation should
make the head/tail swap unmistakable, for example with spring compression and an arrow
transition. This experiment implements the logical transition, not that animation.

All solution moves are plain rope indices; there is no flip action or charge. Transitions
return a new path array and preserve the pre-tap snapshot for undo. The solver stores full
current geometry and marks visited states before descending, which detects cycles such as
one rope bouncing endlessly between two springs. It intentionally avoids fixed-track deadlock
pruning because a future bounce can change the route.

`springs-results.json` records 36 placements on nine existing boards: ALPHA, Normal/Hard/
Extreme, levels 1/5/10, Bigger boards for Extreme, up to four initially empty exit-lane cells
per board. Fourteen candidates solved with a replayed solution that actually bounced at least
once, five were proved impossible, and seventeen exceeded 4,000 states. Six of the nine
boards yielded at least one verified solution. This is a different, smaller corpus than
the earlier mirror sample, and does not establish comparative performance at equal workload.

Five additional tests cover approach and reversal, adjacent contact, another rope blocking
access, bent-body reversal with immutable undo snapshots, and endless bounce cycles. The
spring prototype does not yet combine mirrors, gates, or animated gameplay. For generation,
accept only replay-verified candidates, discard budget-unknown placements, and reserve a
forward/inverse replay strategy for later work. Reverse-building through a spring may have
multiple predecessors; the old monotone offset proof does not automatically apply.

Naming: **spring block** communicates the bounce most directly. Reserve **mirror** for
the fixed 90-degree triangular reflectors, so the two automatic effects remain distinct.

### Tunnels: topology only, collision and animation remain open

The tunnel probe traces a head through paired entrances, including a changed exit direction,
and detects a portal loop. It does NOT implement a tunnel solver or generator. Fixed routes
could also be compiled, but deciding which cells the hidden body occupies, how overlapping
layers collide, and how a length-preserving body traverses a discontinuity needs an explicit
model. The present one-occupant-per-cell grid and continuous path renderer cannot represent
an underpass merely by changing the outgoing direction. Mirrors provide a smaller first step.

## Suggested implementation sequence

1. Extract and verify a shared track/transition kernel, preserving all existing levels.
2. Build a small fixed-mirror pack with simple routes and continuous corner animations.
3. Add key gates, selecting proven new dependencies and rejecting key cycles.
4. Integrate routed replay into reverse generation, including metadata-preserving trim/rotation.
5. Add new format/version fields without regenerating existing campaigns or changing share codes.

Keep the old straight-track path fast. Treat solver budget exhaustion as unknown. Add
new geometry to hinting, auto-clear, undo, scoring, and loss detection together; otherwise
the UI can contradict a puzzle that the standalone solver correctly accepts.
