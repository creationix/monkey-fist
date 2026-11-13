# Generating hard, compact rope puzzles: prior work and its application to Monkey Fist

*Research note, November 2026. Measurements refer to revision `90b522e` (the J3
Journey, generation revision 3), to revision `ee2ec69` (generation revision 4,
section 5.6), to generation revision 5 (section 5.7, which applies parts of
section 6), and to revision `0be7c3a` (the J1 Journey, the last one before
difficulty was separated from board size).*

## Abstract

Monkey Fist needs a default set of levels that become hard through interacting
dependencies on a board no larger than 12 × 16, with mirrors and spinners that
matter. This note surveys what computer science knows about generating and
rating puzzles of this family, chiefly from work on Rush Hour and Sokoban, and
tests how the repository's generators measure up.

Six results stand out. The first four were measured on generation revision 3,
the fifth on revision 4, and the sixth on revision 5, which applies sections
6.1 to 6.5.

1. **The literature says difficulty must be measured by play, not by shape.**
   For puzzles with irreversible moves, the length of the best solution predicts
   human difficulty poorly, while a simulated imperfect player predicts it much
   better [16]. Hard instances are rare and are found by solver-driven selection
   over very many candidates [5, 13].
2. **The current Journey's mechanic levels contain no sliding puzzle.** All 47
   mirror-only levels can be cleared by tapping any rope whose exit is clear, in
   any order, without ever sliding a rope. Every spinner level has one spinner
   and one bounce. The hardest plain level forces three slides.
3. **The older generator was better for one identifiable reason.** It asked for
   two to three times as many knots and about five times as many traps. Restoring
   only those two numbers in the current fixed-size driver raises proven forced
   slides on a 10 × 14 board from 1.6 to 4.0 at mid difficulty and makes par
   exceed the rope count on 13 boards of 16 instead of 3, while coverage stays
   at or above 85 % (section 5.4).
4. **Mirrors do not require a separate generator.** Under fixed mirrors a
   rope's future cells are still a fixed sequence, so the fast straight-track
   solver and the knot-weaving builder apply unchanged once the exit ray is
   allowed to bend (section 6.3). This is a design argument, not yet an
   implemented result.
5. **Revision 4 fixed the distribution and mostly fixed the counts, using one
   template.** Mechanics now appear in every chapter after the first, spinner
   levels use two spinners, and forced non-exit moves across the set rose from
   87 to 404. But in chapters 7 to 12, 49 of 60 levels get their slides from the
   same two-rope staircase, which on its own has no losing move; difficulty is
   flat across those six chapters; 13 of 13 early mirror-only levels are still
   exit-only; and 28 of the 62 levels required to have par above the rope count
   meet that requirement only because their par is not minimal (section 5.6).
6. **Revision 5 makes mirror levels sliding puzzles and smooths the curve.** With
   mirror-aware tracks, the restored knot and trap budget, honest par and
   selection by play, every mirror-only level in chapters 2 to 6 now forces
   slides (16 of 16, against 0 of 13), levels the casual player cannot lose fall
   from 58 to 41, no par can be shortened by postponing exits (against 93), and
   only 5 levels use the full 12 × 16 grid (against 46). Measured challenge now
   rises in every chapter but two. The mean casual win rate is unchanged at 75 %,
   and spinner levels, still built by routed circuits, are not improved
   (section 5.7).

## 1. Introduction

The design goals are stated in [`generator-design.md`](../generator-design.md):
harder levels should need converging prerequisites, mutual waits broken by
partial slides, returns to a rope whose options have changed, and choices that
require looking ahead, all on a moderate board that is densely filled. A long
chain of single-tap exits is explicitly not enough.

That document also lists what the current generator fails to deliver: few
forced slides, mechanics bunched in the middle of the set, one spinner per
level, and pars of uneven quality. This note asks two questions. What does
prior work recommend for this kind of problem? And which specific choices in
the code produce the gaps, given that an earlier revision did better?

Section 2 fixes a formal model. Section 3 surveys prior work. Sections 4 and 5
report measurements of the current and the earlier generator. Section 6 applies
the survey to the game, in order of cost. Section 7 lists what remains
unverified.

## 2. The puzzle as a formal object

### 2.1 Tracks and offsets

A rope is a path of cells with a head. A tap moves it head first until the next
cell is occupied, a spinner is reached, or it leaves the board. On a board
without spinners, the cells a rope can ever occupy form a fixed sequence, its
**track**: its body as first laid, followed by the ray ahead of its head. The
rope's state is one integer, its **offset** along the track. This is the
representation `boardOf` in [`levels.js`](../../levels.js) and `compile` in
[`hex/engine.js`](../../hex/engine.js) already use.

Offsets only increase. A board with `R` ropes therefore has no cycles in its
state graph, a solution has at most the total track length in taps, and
solvability is in NP. This separates the game from Rush Hour, where every move
can be undone, solutions can be very long, and the decision problem is
PSPACE-complete [1, 2, 3]. Hearn and Demaine's framework places games with
bounded, irreversible moves in NP [2].

### 2.2 The waits-for graph and forced slides

Let the **waits-for graph** `W` have an edge `A → B` when `B` occupies a cell on
`A`'s track ahead of `A`'s head. This is the resource-allocation graph of
deadlock theory [23]. A rope with no outgoing edge can exit. If `W` is acyclic
the board is the original no-slide game: exits in topological order clear it,
and no tap can ever be wrong.

Call a slide or a bounce a **non-exit move**. The following bound is simple but
does not appear in the repository, and it gives the generator a target that can
be computed without search.

> **Proposition.** In any solution, the set `S` of ropes that make at least one
> non-exit move meets every directed cycle of the initial waits-for graph.
>
> *Proof.* Suppose a cycle `A₁ → A₂ → … → A_k → A₁` contains no rope of `S`, so
> each `Aᵢ` moves only once, to exit. Take the first of them to exit, `Aᵢ`. Its
> successor `Aᵢ₊₁` has not yet moved, so it still stands on `Aᵢ`'s track, and
> `Aᵢ` cannot exit. Contradiction. ∎

So the number of forced non-exit moves is at least the size of a minimum
feedback vertex set of `W`, which is at least the largest number of
vertex-disjoint cycles, which is at least the number of non-trivial strongly
connected components. Computing a minimum feedback vertex set is NP-hard in
general [24], but the two weaker bounds are linear-time and already useful:
*a board with `k` disjoint mutual waits forces at least `k` slides.* The proof
uses only that a rope which never makes a non-exit move stays on its initial
track, so it holds with mirrors and spinners too.

### 2.3 What par measures

Par counts player taps until every remaining rope is free; the rest leave
automatically. Every rope that stands on another rope's track must move before
that happens, so

```text
par ≥ number of ropes that block at least one other rope
par − ropes ≈ forced non-exit moves − ropes that block nothing
```

On the 51 plain Journey levels the first bound is within 5 taps of the reported
par, and usually within 2. Two consequences follow. The ratio of par to rope
count mostly measures what fraction of ropes stand in another rope's way, which
on a dense board is always close to one. And par exceeds the rope count only
when forced non-exit moves outnumber the ropes that block nothing, so "par
above ropes" is a statement about the number of forced slides and little else.

### 2.4 Spinners restore reversibility

A spinner reverses a rope: its tail becomes its head. A rope then follows a
deterministic sequence of tracks, switching at each bounce, and its state is a
pair (phase, offset). A straight rope lying between two spinners on one line
alternates between two positions for as long as it is tapped. That is a
two-state toggle, the element from which Rush Hour's long solutions are built
[1, 2]. Spinners are therefore the one mechanic in the game through which the
reversible-puzzle literature applies directly, and the only one that can make a
solution much longer than the number of ropes on a small board.

## 3. Prior work

### 3.1 Complexity

Flake and Baum proved Rush Hour PSPACE-complete by building logic gates from
cars [1]. Hearn and Demaine generalised the argument with nondeterministic
constraint logic, and showed that the bounded variant, in which each element
moves at most once, is NP-complete [2]. Tromp and Cilibrasi showed that the
result survives when every car has length two [3]. Two lessons carry over. Hardness
comes from *gadgets*: small arrangements in which one piece's position decides
whether another may pass. And there is no formula for difficulty: rating a
board takes search. The repository's own notes reach the same conclusion
([`generation.md`](../generation.md)).

### 3.2 Exhaustive enumeration and the "unsolved" state

Collette, Raskin and Servais computed the hardest 6 × 6 Rush Hour
configurations symbolically [4]. Fogleman later enumerated every configuration
and published a database of 2,577,412 puzzles covering about 9.7 × 10⁹ states
[5]. His pipeline is worth copying in outline:

1. Enumerate positions, grouped into **clusters** of mutually reachable states.
2. In each cluster, run a breadth-first search backwards from all solved
   states. The states farthest from any solution are the cluster's **unsolved**
   states: "the puzzle cannot be made any harder by moving the pieces around."
3. Keep only **minimal** puzzles, in which "no piece can be removed without
   altering the solution."

He reports that the most common solution length in the database is 11 moves
while the hardest needs 51 (60 with one wall added), that "hard puzzles are
rare", and that his first
attempt, simulated annealing on solution length, gave unsatisfying results
before he turned to enumeration [5]. Sturtevant makes the general case that
exhaustive breadth-first search is a practical design tool for small puzzle
boards, using Fling! [6]. The underlying idea is retrograde analysis, introduced
for chess endgames [7].

### 3.3 Building backwards

Sokoban generators have long worked in reverse from the solved position, so
that every level arrives with a solution [8, 9]. Taylor and Parberry place
goals and then search backwards for the start state farthest from them [9].
The repository's `weave` is a member of this family: a knot is a rope "already
pulled back from the place it is meant to slide to", which is a slide un-made.
Bento, Pereira and Lelis search backwards for Sokoban starts that are hard for
a solver, guiding the search with heuristic-based hardness estimates and a
novelty term so that it keeps exploring instead of circling one region [11].

### 3.4 Search-based generation with a solver in the loop

Togelius and colleagues frame generation as search over content with a test
function [12]. Three practical accounts are close to this project.

- Snellman's generator for a logic puzzle builds a mediocre level quickly, then
  improves it with a small pool: pick a level, mutate it, re-solve, add the
  child, drop the worst. Fitness comes from a solver that reasons the way a
  person does and reports how deep and how narrow the solution is. He found
  that simulated annealing and crossover did worse than this pool, and that
  not checking whether the solution was unique was "a horrible mistake" [13].
- Kartal, Sohre and Guy generate Sokoban levels by Monte Carlo tree search,
  scoring with features fitted to a user study of perceived difficulty [10].
- A Rush Hour generator from Paris-Dauphine samples random boards, uses a
  solver to grade them into four difficulty bands, and trains classifiers to
  predict solvability and difficulty so that fewer boards need the solver [14].

### 3.5 Excluding shortcuts

Smith, Butler and Popović point out that a generated puzzle with an intended
solution is only as good as its *other* solutions. They generate levels under
the constraint that no shortcut solution exists, quantifying over all play
instead of over one certificate [15]. For this game a shortcut is a solution
with fewer non-exit moves than the certificate intends.

### 3.6 Measuring difficulty

Jarušek and Pelánek collected solving times from many players on Sokoban, Rush
Hour and a third transport puzzle, and compared candidate metrics [16, 17].
Their table is the most relevant evidence available:

| Puzzle | State space | Shortest path (Pearson / Spearman) | Simulated player |
| --- | --- | --- | --- |
| Rush Hour | undirected | 0.77 / 0.90 | 0.75 / 0.90 |
| Sokoban | directed | 0.19 / 0.41 | 0.39 / 0.61 |
| Replacement puzzle | directed | 0.28 / 0.21 | 0.57 / 0.49 |

State-space size had no significant correlation with human time. Where moves
are irreversible, as in Sokoban and in Monkey Fist, shortest solution length is
a weak predictor. Their simulated player walks the state graph at random with a
bonus for moves that reduce the distance to the goal and, in one variant,
restarts when it is stuck among dead states; the number of steps it needs is
the difficulty estimate.
Adding a simple greedy heuristic raised the Sokoban correlation to 0.56 / 0.73
[16].

Chen, White and Sturtevant define difficulty as the information needed to
communicate a solution to a player of a given skill, and show that it largely
recovers the designed order of puzzles in The Witness [18]; Shen and Sturtevant
generalise the measure [19]. Van Kreveld, Löffler and Mutser fit a weighted
combination of level features to rated levels of three mobile puzzle games
[20]. Nielsen and colleagues rate a game by the *gap* between strong and weak
automated players, on the assumption that a good game lets skill show [21].

All of these agree on one point: difficulty is a property of how a fallible
player fares, and is estimated by simulating one.

### 3.7 Curating a set

MAP-Elites keeps, for each cell of a grid of chosen features, the best
candidate found so far [22]. It is the standard tool when the goal is a
*varied* collection instead of one optimum, which is the Journey's situation:
grid type, mechanics, size and difficulty band should all be covered.

### 3.8 Deadlock and relaxation

The waits-for graph and its cycles come from operating-system deadlock theory
[23]. The repository's quick solvability check is a delete relaxation in the
sense of heuristic planning [25, 26]: it lets every rope advance as far as it
ever could and declares the board lost if some rope still cannot leave. The
minimum-tap search is iterative deepening [27].

## 4. How the measurements were made

All 120 boards of each Journey were regenerated from their seeds with the code
of the corresponding revision and replayed through the game's own `tap`.

- **Forced non-exit moves.** The minimum number of slides and bounces in any
  solution, found by breadth-first search over non-exit moves with every
  available exit taken in between. For straight-track square boards
  `fewestTaps` gives the same quantity. Results marked *proven* finished within
  the node budget. Taking exits greedily is assumed harmless; the repository
  reports that this held in 400 simulated games.
- **Casual win rate.** The share of random playouts that clear the board when
  the player taps a random rope with a clear exit if there is one, and
  otherwise a random rope that can move. This is the simplest instance of the
  simulated player of [16]: it plays the original game perfectly and guesses at
  every slide.
- **Par bounds.** A lower bound from section 2.3, and an upper bound obtained
  from the stored certificate by postponing every exit the rest of the
  certificate does not need.
- **Mechanic use.** Ropes whose route changes direction on a mirror, distinct
  spinners used, and bounces, counted over the certificate.

The casual win rate has not been validated against human players of this game.
It is used here as a comparative measure between generators, where its meaning
is plain: at 100 % the level cannot be lost by anyone who taps free ropes
first.

## 5. Findings

### 5.1 The current Journey (J3)

| Kind (levels 11–120) | Levels | Forced non-exit moves, mean (max) | Casual win rate | Cannot be lost by tapping free ropes first | Par above ropes |
| --- | --- | --- | --- | --- | --- |
| Plain | 51 | 1.41 (3) | 76 % | 23 | 9 |
| Mirrors only | 47 | 0 (0) | 100 % | 47 | 0 |
| Spinner, with or without mirrors | 12 | 1.00 (1) | 97 % | 11 | 0 |

**Mirror levels are the original no-slide game with a bent path.** Their
waits-for graphs are acyclic. The generator routes one core rope through the
mirrors (two cores on four boards) and then inserts ordinary ropes only at
points where they can exit, so no knot is ever built
([`twist-circuits.js`](../../twist-circuits.js), `populate`). A mean of two
ropes per level turn on a mirror. Sweeping the difficulty setting from 25 to
100 on a 10 × 14 board changed none of this: forced moves stayed at zero and
the casual win rate at 100 % on all 40 mirror boards generated.

**Every spinner level has one spinner and one bounce**, as the design document
notes. Three choices combine: the core count is
`round(area / 100 × (0.3 + d / 100))`, which is 1 for most Journey sizes; it
drops to 1 after six attempts; and a second core is made to share the first
spinner for 150 of its 180 placement attempts. Candidate selection has no term
that rewards more cores, spinners or bounces.

**The chapter profile is flat, then steps up at the end.** Mirror and spinner
levels occupy positions 32 to 104; the last 16 levels are plain.

| Chapter | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mechanic levels | 0 | 0 | 0 | 7 | 8 | 9 | 9 | 9 | 10 | 5 | 2 | 0 |
| Mean forced non-exit moves | 0.3 | 0.7 | 0.8 | 0.4 | 0.4 | 0.3 | 0.2 | 0.4 | 0.3 | 0.8 | 1.8 | 2.3 |
| Casual win rate | 100 % | 87 % | 88 % | 90 % | 95 % | 96 % | 96 % | 100 % | 96 % | 88 % | 77 % | 63 % |

Chapters 4 to 9 are easier, by this measure, than chapters 2 and 3. The cause
is not the sort itself. The sort key is dominated by the interaction score
([`build-grid-journey.cjs`](../../scripts/build-grid-journey.cjs)), mirror
levels cannot earn the mutual-wait and revisit parts of that score because they
have no slides, and so they land below every knotted plain level.

**The difficulty setting and the final position are nearly unrelated.** For
positions 31 to 120 the correlation between position and the requested
difficulty is 0.34. The last level was generated at difficulty 57; position 42
holds a level generated at 99.

**The interaction score does not detect whether a level can be lost.** It is
computed from the shape of one certificate's dependency graph. Level 118 has
the third-highest interaction score in the set (6.12) and a 100 % casual win
rate: three slides are forced, but at each one there is nothing else to try.
Of the 46 plain levels that force at least one slide, 18 cannot be lost by the
casual player. The score also counts as "mutual wait" every rope on a chain
between one knot's slide and its exit: level 120 reports a mutual-wait group of
22 ropes from three slides.

**Par is loose on larger boards.** Of the 74 pars not proven minimal, 69 are
beaten merely by postponing unneeded exits in the stored certificate, by 2.1
taps on average and by up to 5. Three stars require matching par, so these
levels award three stars for play that is several taps from optimal.

**The par-to-ropes target cannot be met.** Candidate selection subtracts
`|par / ropes − target(d)|`, with a target rising from 0.33 to 1.40. Section
2.3 explains why dense boards land between 0.85 and 1.0 regardless. At low
difficulty the term does have an effect, and an unwanted one: at `d = 40` the
target is 0.67, so a knotted candidate with ratio 1.1 loses 0.4 against an
unknotted one, the weight of ten points of density. Below `d = 40` nothing in
the formula favours interaction at all.

**Hex and square are different sizes of puzzle.** From position 31 on, plain
square levels average 30.9 ropes and plain Hex levels 13.3 on similar boards,
because the Hex builder is asked for ropes up to twice the board's shorter
side.

**Generation is cheap and the build does not exploit it.** A level takes 133 ms
on average. The Journey build tries at most six seeds per position and keeps
the first that passes the acceptance checks.

### 5.2 The earlier Journey (J1)

J1 chose a board to suit the difficulty, so its sizes grew to 16 × 22 square
and 38 × 51 Hex. That growth is what the rewrite was right to remove. But on
boards within today's 12 × 16 limit it produced levels the current generator
does not:

| J1 level | Board | Ropes | Par | Slides in certificate | Forced, proven | Casual win rate |
| --- | --- | --- | --- | --- | --- | --- |
| 47 | 9 × 12, one mirror | 14 | 17 | 5 | 5 | 20 % |
| 71 | 8 × 11 | 18 | 19 | 5 | 4 | 30 % |
| 81 | 9 × 12 | 23 | 28 | 8 | 4 | 93 % |
| 91 | 10 × 14 | 23 | 26 | 6 | 5 | 5 % |

Its mechanic levels were richer as well: all but one of its twelve spinner
levels used 2 to 5 spinners, with 2 to 5 bounces, and mirror levels within the
12 × 16 limit carried about 8 mirrors with 4 to 6 ropes turning.

Not everything was better. J1's large mirror levels were also built by the
circuit method and are also unlosable by the casual player; that weakness is
older than the rewrite. And level 81 shows the shortcut problem of section 3.5:
its certificate uses eight slides where four suffice.

### 5.3 What changed between them

The weaving kernel is the same code in both revisions; the diff adds optional
parameters only. What changed is the driver.

| | J1 driver | J3 driver |
| --- | --- | --- |
| Knots requested | `round(0.6 √T)`, with tangle target `T = 300 (d/100)^1.3` (500 from `d = 80`) | `round(area / 30 × d / 100)` |
| Traps requested | the same number as knots | `round(area / 70 × d / 100)` |
| At `d = 60` on 10 × 14 | 7 knots, 7 traps | 3 knots, 1 trap |
| Coverage goal | 0.88 to 0.96, floor 0.72 | 0.99, floor 0.85 |
| Steering | pace the tangle score into a slot, with a depth floor | off: slot is `[0, 10⁶)`, every rope aims for the same gain |
| Candidates | first valid board | best of 8 to 16 by density and par ratio |
| Small or early square mirror boards | weave a knotted board, then place a mirror where the re-solved solution uses it | circuit method only |
| Core ropes in a circuit | square `max(2, min(5, 1 + ⌊area / 70⌋))`; Hex 1 to 5, rising with difficulty | `round(area / 100 × (0.3 + d / 100))`, usually 1 |
| Order | by difficulty setting | re-sorted by interaction score |

The J1 levels in the table above that carry one mirror *and* several forced
slides came from the weave-then-place path in [`twists.js`](../../twists.js).
It is the only construction in either revision that has put a mirror into a
sliding puzzle.

### 5.4 Ablation: which difference matters

To separate these factors, the current kernel was run on fixed boards under the
current driver (A) and under the same driver with only the knot and trap counts
and the maximum pull restored to the J1 formulas (B). Sixteen seeds per cell,
medium rope style, forced slides proven by exhaustive search unless noted.

| Board | Driver | `d` | Knots / traps asked | Coverage | Forced slides, mean (max) | Casual win rate | Par above ropes | Coverage ≥ 85 % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 9 × 12 | A | 40 | 1 / 1 | 93 % | 1.0 (1) | 77 % | 0 / 16 | 16 |
| 9 × 12 | B | 40 | 6 / 6 | 88 % | 3.4 (6) | 44 % | 10 / 16 | 14 |
| 9 × 12 | A | 80 | 3 / 1 | 90 % | 2.3 (3) | 54 % | 1 / 16 | 15 |
| 9 × 12 | B | 80 | 9 / 9 | 88 % | 3.7 (5) | 34 % | 10 / 16 | 13 |
| 10 × 14 | A | 40 | 2 / 1 | 93 % | 1.6 (2) | 73 % | 3 / 16 | 16 |
| 10 × 14 | B | 40 | 6 / 6 | 90 % | 4.0 (6) | 22 % | 13 / 16 | 16 |
| 10 × 14 | A | 80 | 4 / 2 | 89 % | 3.2 (4) | 31 % | 13 / 16 | 14 |
| 10 × 14 | B | 80 | 9 / 9 | 88 % | 4.3 (7) | 25 % | 13 / 16 | 15 |
| 12 × 16 | A | 40 | 3 / 1 | 92 % | 2.5 (3) | 62 % | 10 / 16 | 16 |
| 12 × 16 | B | 40 | 6 / 6 | 88 % | 4.2 (6) | 16 % | 16 / 16 | 13 |
| 12 × 16 | A | 80 | 5 / 2 | 89 % | 3.3 (5) | 25 % | 16 / 16 | 16 |
| 12 × 16 | B | 80 | 9 / 9 | 87 % | 5.8 (9) | 10 % | 16 / 16 | 12 |

(On 12 × 16 at `d = 80`, 13 of the 16 minimums under B were proven; the rest
are upper bounds.)

Three further variants on 10 × 14 complete the picture. Lowering the coverage
goal from 0.99 to 0.92 changed nothing measurable. Restoring J1's slot steering
as well cost 3 to 14 points of coverage without adding forced slides. Starting
from that steered variant, doubling the knots and removing the traps raised
forced slides from about 4 to about 5, but the casual win rate rose from
between 22 % and 54 % to between 35 % and 63 %: knots create forced slides,
and traps are what make the wrong slide available.

The knot and trap budget is the decisive difference, and it is compatible with
the density floor.

### 5.5 Hard boards are a minority, as elsewhere

Driver B at `d = 70` on 10 × 14 was sampled over 240 seeds. Of the 203 boards
at or above 85 % coverage, forced slides were distributed as follows.

| Forced slides | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Boards | 3 | 9 | 45 | 53 | 52 | 28 | 10 | 3 |

The casual win rate ranged from 0 % at the 5th percentile to 65 % at the 95th,
with a median of 23 %. Eighteen boards (8.9 %) both forced six or more slides
and held the casual player to 10 % or less. This matches Fogleman's observation
for Rush Hour [5]: a generator's typical output is moderate, and the levels
worth shipping at the top of the curve are roughly one in ten.

### 5.6 Generation revision 4

Revision `ee2ec69` changed the J3 generator and rebuilt the Journey. Its main
changes are:

- **Chapter quotas.** Each chapter is built and sorted separately. From chapter
  4 on, every chapter holds one plain level, two mirror levels, two spinner
  levels and five that combine both.
- **Distinct spinners.** Spinner levels must use at least two spinners, each
  bouncing a rope during the manual part of the solution, and later cores may
  share a spinner only once two exist.
- **A repeated-slide core.** Hard boards start from a two-rope mutual-wait
  motif in which each rope must stop several times against the other
  (`repeatedCore` in [`grid-generator.js`](../../grid-generator.js)). Depth,
  orientation and placement vary; the shape is fixed. The kernel builders accept
  this core and weave the rest of the board around it.
- **Requirements on the certificate.** From chapter 7, featured levels need at
  least three manual partial slides, two ropes that slide more than once, a
  filler rope moved between core actions, and par at least 1.05 times the rope
  count. Late plain levels have similar requirements.
- **An exact Hex par search** on the compact offset model, and layout hashes
  that keep saved results attached to unchanged boards.

All 120 boards were regenerated from the published seeds, matched the stored
layout hashes, and were measured as in section 4.

| Chapter | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mechanic levels | 0 | 6 | 8 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |
| 12 × 16 boards | 0 | 0 | 0 | 1 | 2 | 0 | 8 | 7 | 7 | 7 | 7 | 7 |
| Mean forced non-exit moves | 0.3 | 0.3 | 1.2 | 1.5 | 1.8 | 1.8 | 5.8 | 5.4 | 5.4 | 5.6 | 5.6 | 5.7 |
| Casual win rate | 100 % | 96 % | 100 % | 99 % | 94 % | 85 % | 59 % | 70 % | 71 % | 41 % | 47 % | 65 % |
| Levels the casual player cannot lose | 10 | 9 | 10 | 9 | 7 | 6 | 2 | 4 | 5 | 1 | 2 | 3 |

Compared with revision 3, over levels 11 to 120:

| Measure | Revision 3 | Revision 4 |
| --- | --- | --- |
| Forced non-exit moves, all levels | 87 | 404 |
| Levels with reported par above the rope count | 9 | 75 |
| ... of which still above after postponing unneeded exits | 9 | 45 |
| Levels the casual player cannot lose | 81 | 58 |
| Mean casual win rate | 89 % | 75 % |
| Spinner levels using two or more spinners | 0 of 12 | 68 of 70 |
| Mean ropes on plain levels 31 to 120, square / Hex | 30.9 / 13.3 | 22.8 / 15.7 |

The forced moves are real: on 112 of the 117 levels where the minimum could be
proven, the certificate uses exactly the minimum number of non-exit moves.
Revision 4 therefore addresses findings 2 and 3 of section 5.1 in part, and the
distribution and spinner findings in full. Five weaknesses remain.

**Late difficulty comes from one motif.** All 60 levels in chapters 7 to 12 are
built on the repeated-slide core. In 49 of them the manual solution makes
exactly four slides, all by two ropes that each slide twice, and in 58 of the
62 cored levels those two ropes strictly alternate. Only 9 of the 60 make any
other slide. The typical late level is therefore the same staircase, two
spinner bounces and filler. Given only its two core ropes, the casual player
solved the staircase in every one of 58 tested levels: the motif makes slides
necessary but offers no wrong slide. The losing options come from elsewhere on
the board, which is why 17 of the 60 late levels still cannot be lost.

**The curve is a step.** Forced moves average 1.2 to 1.8 in chapters 3 to 6 and
5.4 to 5.8 in chapters 7 to 12. Within chapters 7 to 12 the correlation between
position and forced moves is 0.03, and between position and casual win rate
−0.12. Inside a single late chapter the casual win rate ranges over 73 to 100
percentage points; in chapter 11, level 104 holds the casual player to 0 %
while level 101 cannot be lost. The ordering key is still the interaction
score of section 5.1.

**Early mirror levels are still exit-only.** All 13 mirror-only levels in
chapters 2 to 6 have no forced slide and cannot be lost. The repeated core is
applied to featured boards only from difficulty 75 or when the specification
requires partial slides, and the circuit builder still inserts exit-only
ropes around it.

**The par requirement is met by loose pars.** 93 of the 96 pars not proven
minimal are beaten by postponing unneeded exits, by 2.8 taps on average and up
to 7. Of the 62 levels whose specification requires par at least 1.05 times
the rope count, 28 fall below that ratio once this is done. Because three stars
require matching par, those levels also award three stars to play several taps
from the best.

**The knot and trap budget is unchanged.** Section 5.4's main lever was not
applied. Run in a scratch copy of revision 4 on plain square boards, adding the
J1 knot and trap counts on top of the repeated core raised proven forced slides
from 3.9 to 7.1 on 10 × 14 at `d = 65` and from 7.8 to 11.0 on 12 × 16 at
`d = 80`. The added slides come from ordinary knots spread through the board,
not from the core: slides outside the core rose from about 1 to about 5 per
board. Coverage stayed at 90 % or above.

Two smaller observations. Forty-six of the 120 levels, and 43 of the last 60,
use the full 12 × 16 grid, so size is again doing some of the work. And the
ten introductory maps are pinned to hand-picked seeds and layouts.

### 5.7 Generation revision 5

Revision 5 applies sections 6.1 to 6.5 and the mirror half of 6.3:

- **Mirror-aware tracks.** `levels.js` and `hex/engine.js` build each rope's track
  as its body followed by its way out bent by fixed mirrors, and reject a track
  that enters a cell twice. The offset model agreed with the game's own taps on
  every one of 15,049 random moves across 70 mirrored boards on both grids.
- **Woven mirror levels.** Mirror-only levels place mirrors first, weave knots and
  traps around them, aim ropes at idle mirrors, and remove mirrors no rope turns
  on. Spinner levels and colossal mirror maps keep the routed circuits.
- **The J1 knot and trap budget** (section 6.1), on top of revision 4's optional
  repeated-slide core.
- **Honest par** (section 6.5): unneeded exits are postponed before the bounded
  minimum-tap search, which runs on the offset kernels for every board without
  spinners.
- **Selection by play** (section 6.2): candidates are scored by the manual slides
  and bounces of their par solution plus `6 × (1 − casual win rate)`, against a
  target set by the difficulty.
- **A seeded, curated Journey** (section 6.4): all 120 levels, the introductions
  included, come from seeds derived from the master seed. Each position tries
  several seeds and keeps the one closest to a target challenge that rises
  smoothly; chapters keep the revision 4 quotas, shifted from four to three mirror
  levels against two spinner levels.

The same independent measurements as before, over levels 11 to 120:

| Measure | Revision 3 | Revision 4 | Revision 5 |
| --- | --- | --- | --- |
| Forced non-exit moves, all levels | 84 | 401 | 436 |
| Levels the casual player cannot lose | 81 | 58 | 41 |
| Mean casual win rate | 89 % | 75 % | 75 % |
| Pars beaten by postponing unneeded exits | 69 | 93 | 0 |
| Levels with par above the rope count after that check | 9 | 45 | 59 |
| Mirror-only levels in chapters 2 to 6 that force a slide | 0 of 19 | 0 of 13 | 16 of 16 |
| Mirror-only levels, mean ropes turned by a mirror | 1.9 | 3.9 | 5.5 |
| Levels on the full 12 × 16 grid | 1 | 46 | 5 |
| Mean generation time per level | | 137 ms | 211 ms |

Measured challenge (forced moves plus six times the casual loss rate) by chapter:

| Chapter | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Revision 4 | 0.3 | 0.5 | 1.2 | 1.6 | 2.2 | 2.7 | 8.3 | 7.2 | 7.2 | 9.1 | 8.8 | 7.8 |
| Revision 5 | 1.7 | 1.6 | 2.3 | 2.9 | 4.1 | 4.9 | 6.6 | 6.3 | 6.4 | 7.7 | 8.5 | 8.9 |

The step at chapter 7 is now a ramp, and the last chapter is the hardest. The
trade is that chapters 7 to 10 are somewhat gentler than revision 4's: only 2
late levels hold the casual player to 15 % or less, against 7. The target
curve, not the generator, sets that balance.

What did not improve:

- **Spinner levels.** They still come from routed circuits with the repeated
  core. In the late chapters they make most of their slides in that core and
  remain the least losable featured kind.
- **The casual win rate overall.** It is flat at 75 %. Early chapters are more
  often losable than before; chapters 7 to 9 are less so.
- **Proofs.** 42 of 120 pars are proven minimal; the rest are the best solution
  found after postponement.

## 6. Applying the techniques

The recommendations are ordered by evidence and cost. The first two are
supported by the measurements above; the rest are designs that follow from the
literature and from the model in section 2.

Revision 4 implemented the quota half of 6.4 and the spinner fixes of 6.3.
Revision 5 implemented 6.1, 6.2, 6.5, the mirror half of 6.3 and the slot
filling of 6.4 (section 5.7). Sections 6.6 and 6.7, and spinner levels built
by search rather than by circuit, remain open.

### 6.1 Restore the knot and trap budget, and stop selecting against it

Set knots and traps from a difficulty-driven target instead of from area, as
J1 did, and cap the pull at 3. Remove the par-ratio target from candidate
selection and stop weighting density once the floor is met: both currently
favour the candidates in which knots failed to place. This is the smallest
change with a measured effect (section 5.4).

### 6.2 Rate candidates by simulated play

Replace the interaction score, as the selection and ordering criterion, with
quantities taken from play, following [16, 18, 21]:

- proven forced non-exit moves, with the cycle bound of section 2.2 as a
  search-free estimate during construction;
- the casual win rate, and the rate for a second, stronger simulated player
  that avoids slides the relaxation proves fatal. The gap between the two is
  the skill the level rewards [21];
- the number of points at which the casual player has a fatal option.

The dependency graph remains useful for the stated goal of *variety* of
structure, as a descriptor and not as a score.

### 6.3 Give mirror levels the same sliding puzzle

Under fixed mirrors a rope's track is still a fixed cell sequence: its body,
then its ray as the mirrors bend it. The offset representation, the
relaxation, the exact searches and the knot-weaving builder depend only on that
sequence. Computing the ray with reflections, and rejecting a track that
revisits a cell, would let `weave` build knots and traps on a mirrored board
with no other change. The same holds for the Hex kernel.

Until that exists, J1's weave-then-place path is available today: build a
knotted board, then try mirrors in empty cells and on exit rays, keeping one
when the re-solved board still forces as many slides and a rope turns on it.
Repeating the step places several mirrors. Either route removes the root cause
of the flat chapters in section 5.1, and with it the reason mirror levels sort
below plain ones.

Spinners need a (phase, offset) state, as section 2.4 describes, which is a
larger change. The immediate fixes are narrower: request at least two cores on
boards that can hold them, do not fall back to one, do not force a second core
onto the first spinner, and reward distinct spinners and bounces in selection.

### 6.4 Build the Journey by slot filling, offline

Generation is fast enough to treat the Journey build as the search-based
process of [5, 12, 13]:

1. Fix the schedule first. For each of the 120 positions decide grid, mechanic
   set, size band and a difficulty band expressed in the measures of 6.2. The
   mechanic quotas per chapter then hold by construction and cannot be undone
   by a later sort.
2. For each position sample seeds, a few hundred where the band is demanding,
   measure each board, and keep the best board that lands in the band. This is
   the per-level slot filling that `generateSet` performed for the original
   game, and an instance of the archive of [22].
3. Store the seed, the proven par and the measurements.

Sorting by a measured score *within* a quota is harmless. Sorting across the
whole set by a score that some level kinds cannot earn is what moved the
mechanics to the middle.

### 6.5 Verify necessity as well as solvability

Following [5, 15]: prove the minimum number of non-exit moves for every
shipped level and reject a candidate whose certificate intends more than the
minimum, since its extra slides are optional. Apply Fogleman's minimality idea
to knots: a knot the exact solution never has to slide is decoration. Compute
par with the postponement pass of section 4 and a larger offline search budget,
and store it, instead of recomputing a looser value when the level opens.

### 6.6 Multi-stop ropes and toggles, by search instead of by template

The multi-stop cores now being built by hand are retrograde moves applied twice
to one rope: pull it back from a stop, then pull it back again from an earlier
stop, each time against a stopper that must be in place when the slide happens.
The same reverse move can drive a search in the manner of [9, 11]: start from a
solved dense board, apply un-exits and pull-backs, score each state with the
measures of 6.2, and keep a small pool as in [13]. Because every state reached
this way is solvable by construction, the solver is needed only for scoring and
for the shortcut check.

For spinners, a rope between two spinners is a toggle (section 2.4). A small
group of toggles and the ropes they gate has a reversible state graph that can
be enumerated completely on a 12 × 16 board, and Fogleman's rule then applies
as written: start the level from the state farthest from the solved one [5].
This is the most direct route to levels whose par is well above their rope
count without a larger board.

### 6.7 One kernel

There are four movement engines and three builders. Knots and traps exist only
in the square straight-track builder, multi-rope mechanics only in the
circuits, and each improvement has to be made up to four times. The track
model of section 2 covers square and Hex, straight and mirrored, with one
neighbour table and one ray function; spinners add a phase. Unifying them is
the structural change that would let every technique above reach every kind of
level.

## 7. Limitations

- The casual win rate is a model, not human data. Its use here is comparative.
  A small playtest that records failures per level would calibrate it, as in
  [10, 16].
- Forced-move counts assume that taking an available exit never harms
  solvability. This rests on the repository's simulations, not on a proof.
- The ablation used one rope style and 16 seeds per cell on square boards. The
  direction of the effect is large and consistent across three sizes; the exact
  figures will move with style and seed.
- Sections 6.3, 6.6 and 6.7 are designs. Nothing in them has been built or
  measured.
- Sources [1, 2, 3, 4, 6, 8–12, 15, 18–22] were consulted at the level of their
  abstracts and published summaries. Sources [5, 13, 14, 16, 17] were read in
  full or in substantial part; the figures quoted from [5] and [16] were
  checked against the text.

## References

1. G. W. Flake, E. B. Baum. "Rush Hour is PSPACE-complete, or 'Why you should
   generously tip parking lot attendants'." *Theoretical Computer Science*
   270(1–2), 2002, 895–911.
   [doi:10.1016/S0304-3975(01)00173-6](https://doi.org/10.1016/S0304-3975(01)00173-6)
2. R. A. Hearn, E. D. Demaine. "PSPACE-completeness of sliding-block puzzles
   and other problems through the nondeterministic constraint logic model of
   computation." *Theoretical Computer Science* 343(1–2), 2005, 72–96.
   [arXiv:cs/0205005](https://arxiv.org/abs/cs/0205005). See also *Games,
   Puzzles, and Computation*, A K Peters, 2009.
3. J. Tromp, R. Cilibrasi. "Limits of Rush Hour Logic Complexity." 2005.
   [arXiv:cs/0502068](https://arxiv.org/abs/cs/0502068)
4. S. Collette, J.-F. Raskin, F. Servais. "On the symbolic computation of the
   hardest configurations of the Rush Hour game." *Computers and Games (CG
   2006)*, LNCS 4630, Springer, 2007, 220–233.
   [doi:10.1007/978-3-540-75538-8_20](https://doi.org/10.1007/978-3-540-75538-8_20)
5. M. Fogleman. "Solving Rush Hour, the Puzzle." July 2018.
   [michaelfogleman.com/rush](https://www.michaelfogleman.com/rush/)
6. N. R. Sturtevant. "An argument for large-scale breadth-first search for game
   design and content generation via a case study of Fling!" *AI in the Game
   Design Process, AIIDE Workshop*, AAAI Technical Report WS-13-20, 2013.
   [doi:10.1609/aiide.v9i3.12594](https://doi.org/10.1609/aiide.v9i3.12594)
7. K. Thompson. "Retrograde analysis of certain endgames." *ICCA Journal* 9(3),
   1986, 131–139.
8. Y. Murase, H. Matsubara, Y. Hiraga. "Automatic making of Sokoban problems."
   *PRICAI '96*, LNCS 1114, Springer, 1996.
   [doi:10.1007/3-540-61532-6_50](https://doi.org/10.1007/3-540-61532-6_50)
9. J. Taylor, I. Parberry. "Procedural generation of Sokoban levels." *Proc.
   6th North American Conference on AI and Simulation in Games (GAMEON-NA)*,
   EUROSIS, 2011, 5–12.
   [PDF](https://ianparberry.com/pubs/GAMEON-NA_METH_03.pdf)
10. B. Kartal, N. Sohre, S. J. Guy. "Data-driven Sokoban puzzle generation with
    Monte Carlo tree search." *AIIDE 2016*.
    [ojs.aaai.org/index.php/AIIDE/article/view/12859](https://ojs.aaai.org/index.php/AIIDE/article/view/12859)
11. D. S. Bento, A. G. Pereira, L. H. S. Lelis. "Procedural generation of
    initial states of Sokoban." *IJCAI 2019*, 4651–4657.
    [ijcai.org/proceedings/2019/646](https://www.ijcai.org/proceedings/2019/646)
12. J. Togelius, G. N. Yannakakis, K. O. Stanley, C. Browne. "Search-based
    procedural content generation: a taxonomy and survey." *IEEE Transactions
    on Computational Intelligence and AI in Games* 3(3), 2011, 172–186.
    [doi:10.1109/TCIAIG.2011.2148116](https://doi.org/10.1109/TCIAIG.2011.2148116)
13. J. Snellman. "Writing a procedural puzzle generator." May 2019.
    [snellman.net/blog/archive/2019-05-14-procedural-puzzle-generator](https://www.snellman.net/blog/archive/2019-05-14-procedural-puzzle-generator/)
14. G. de Batz de Trenquelleon, A. Choukarah, M. Roucairol, M. Addoum,
    T. Cazenave. "Procedural generation of Rush Hour levels." LAMSADE,
    Université Paris Dauphine – PSL.
    [PDF](https://www.lamsade.dauphine.fr/~cazenave/papers/RushHour.pdf)
15. A. M. Smith, E. Butler, Z. Popović. "Quantifying over play: constraining
    undesirable solutions in puzzle design." *Foundations of Digital Games
    (FDG 2013)*, 221–228.
    [PDF](https://grail.cs.washington.edu/wp-content/uploads/2015/08/smith2013qop.pdf)
16. P. Jarušek, R. Pelánek. "What determines difficulty of transport puzzles?"
    *Proc. 24th International FLAIRS Conference*, AAAI, 2011, 428–433.
    [PDF](https://cdn.aaai.org/ocs/2518/2518-11200-1-PB.pdf)
17. P. Jarušek, R. Pelánek. "Difficulty rating of Sokoban puzzle." *STAIRS
    2010*. [PDF](https://www.fi.muni.cz/~xpelanek/publications/stairs2010-final.pdf)
18. E. Y. C. Chen, A. White, N. R. Sturtevant. "Entropy as a measure of puzzle
    difficulty." *AIIDE 2023*, 34–42.
    [doi:10.1609/aiide.v19i1.27499](https://doi.org/10.1609/aiide.v19i1.27499)
19. J. Shen, N. R. Sturtevant. "Generalized entropy and solution information
    for measuring puzzle difficulty." *AIIDE 2024*.
    [ojs.aaai.org/index.php/AIIDE/article/view/31872](https://ojs.aaai.org/index.php/AIIDE/article/view/31872)
20. M. van Kreveld, M. Löffler, P. Mutser. "Automated puzzle difficulty
    estimation." *IEEE Conference on Computational Intelligence and Games (CIG
    2015)*, 415–422.
    [doi:10.1109/CIG.2015.7317913](https://doi.org/10.1109/CIG.2015.7317913)
21. T. S. Nielsen, G. A. B. Barros, J. Togelius, M. J. Nelson. "General video
    game evaluation using relative algorithm performance profiles."
    *EvoApplications 2015*, LNCS 9028, Springer.
    [doi:10.1007/978-3-319-16549-3_30](https://doi.org/10.1007/978-3-319-16549-3_30)
22. J.-B. Mouret, J. Clune. "Illuminating search spaces by mapping elites."
    2015. [arXiv:1504.04909](https://arxiv.org/abs/1504.04909)
23. E. G. Coffman, M. J. Elphick, A. Shoshani. "System deadlocks." *ACM
    Computing Surveys* 3(2), 1971, 67–78.
    [doi:10.1145/356586.356588](https://doi.org/10.1145/356586.356588)
24. R. M. Karp. "Reducibility among combinatorial problems." In *Complexity of
    Computer Computations*, Plenum, 1972, 85–103.
    [doi:10.1007/978-1-4684-2001-2_9](https://doi.org/10.1007/978-1-4684-2001-2_9)
25. B. Bonet, H. Geffner. "Planning as heuristic search." *Artificial
    Intelligence* 129(1–2), 2001, 5–33.
    [doi:10.1016/S0004-3702(01)00108-4](https://doi.org/10.1016/S0004-3702(01)00108-4)
26. J. Hoffmann, B. Nebel. "The FF planning system: fast plan generation
    through heuristic search." *Journal of Artificial Intelligence Research*
    14, 2001, 253–302.
    [doi:10.1613/jair.855](https://doi.org/10.1613/jair.855)
27. R. E. Korf. "Depth-first iterative-deepening: an optimal admissible tree
    search." *Artificial Intelligence* 27(1), 1985, 97–109.
    [doi:10.1016/0004-3702(85)90084-0](https://doi.org/10.1016/0004-3702(85)90084-0)
