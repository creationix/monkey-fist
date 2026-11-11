# Monkey Fist

A rope-untangling puzzle game for the browser and phone.

**Play it:** https://creationix.github.io/monkey-fist/

## How to play

The board is a tangle of ropes, each with an arrow at one end. Tap a rope and it slides out of the board arrow-first, following its own bends. There are two games on the same boards.

**Sliding ropes** (the default). A rope whose way is clear leaves. A rope that is blocked slides forward until it meets another rope, and stays there. Ropes never go backwards, so every slide is for keeps.

- Some ropes start tied in a **knot**: a loop in which each rope is waiting on the next, so none of them can leave. Sliding the right one forward draws its tail out of another's way and undoes it.
- Some slides are **traps**: they leave ropes that can never get out. The game says "Knotted!" as soon as that happens and dims the ropes that are locked together for good, which is why. Nothing is locked, and any rope that can still move can still be tapped, but the board can no longer be cleared.
- There are no hearts. Instead each level allows **three undos**, each taking back one move. The level is lost only when the board is knotted, nothing on it can move and no undos are left.
- **Every tap counts**, including ones you take back. The top of the screen shows your taps against **par**, the fewest taps the level can be done in. Stars are 3 for par, 2 for up to two taps over, 1 otherwise.
- Once nothing is blocked the puzzle is solved, so the remaining ropes let themselves out.
- The lightbulb highlights the next tap of a solution in par.

**The original game** (turn Sliding ropes off, or turn Kid mode on). A blocked rope bumps and springs back, and costs a heart: three hearts per level, and hearts left at the end are your stars. Nothing you tap can make the board worse, so the puzzle is purely finding the order.

- **Tangle** (top of the screen) is how knotted the board still is, and it falls as you pull ropes out.
- The lightbulb highlights a rope that can leave right now.
- **Kid mode**: always the original game, with no hearts. Each bump points out a rope that can go, and the score is your time.

Both games:

- **Levels**: 60 built-in levels for each game, from tangle 1 up to 300, starting gently. The sliding game's first few have no knots.
- **Custom**: generate your own set of 10, 20 or 30 levels at Easy, Normal, Hard or Extreme, for either game. Each set has a share code such as `N20S-K7F3Q`; anyone who enters the same code gets exactly the same levels. The `S` marks a sliding set.

## How levels are made

All level logic is in [`levels.js`](levels.js), which has no dependency on the page. This section describes the original game; the sliding game builds on it and is described after.

**Difficulty (tangle).** A rope's *block cost* is how many layers of other ropes must leave before it can: a free rope costs 0, and a blocked rope costs 1 more than the deepest rope in its way. A rope waiting on a chain seven ropes deep costs 7.

A rope's *score* is its block cost plus one for each bend in it, whether or not it is blocked: a rope that winds around is harder to follow and to plan around than a straight one. A level's difficulty is the sum of its ropes' scores, and the live tangle score is the same sum over the ropes still on the board, so it falls to 0 as the board empties.

**Each setting is a difficulty range**, and a set fills its range evenly:

| Setting | Difficulty | With Bigger boards |
| --- | --- | --- |
| Easy | 2 to 40 | 2 to 80 |
| Normal | 20 to 80 | 20 to 160 |
| Hard | 60 to 150 | 60 to 300 |
| Extreme | 150 to 500 | 150 to 1000 |
| Built-in levels | 1 to 300, bunched toward the easy end | |

Extreme runs right up to what a packed 12x16 board can reach: its hardest levels are about 45 ropes, chains 20 or more deep, with only a handful of ropes free at the start.

**The depth floor.** Every level's *average block cost per rope* must reach a minimum that rises with its difficulty, so a high score cannot be made from a crowd of ropes that barely block each other.

| Difficulty | Minimum average block cost per rope |
| --- | --- |
| under 10 | none |
| 10 to 19 | 1.5 |
| 20 to 39 | 2 |
| 40 to 59 | 2.5 |
| 60 to 99 | 3 |
| 100 to 149 | 4 |
| 150 to 249 | 5 |
| 250 to 399 | 6.5 |
| 400 and up | 8 |

**Packed boards.** Past the smallest sizes a board must be at least 78% rope (typically it is 85 to 90%), and at least half its ropes must be blocked by something.

**Building one level.** Ropes are added one at a time under a single rule.

> A new rope must never close a loop.

A new rope waits on whatever stands in its way out, and every rope whose way out it lies across now waits on it. Before it is placed, the builder follows the chain down from the ropes it would wait on; if that reaches any rope that would wait on *it*, the placement is refused. So the "waits for" links can never form a loop, and the board is solvable by construction with nothing to untangle afterwards.

That one rule lets the builder do two useful things on purpose. It can lay a rope across the path of a rope at the bottom of a long chain, making every rope up that chain one deeper. And it can drop a rope into an enclosed pocket, where it simply waits on the ropes around it, which is what lets a board be packed full.

1. **Lay ropes.** Each rope's effect on the score is known before it is placed, so the builder steers. It paces the score to arrive in the level's slot about when the board is full, keeps the average block cost per rope up near its target, never adds more than the slot allows, and never adds a rope the depth floor could not afford.
2. **Pack the gaps.** It goes round the cells still empty and fits a rope into each gap that will take one, under the same rules.
3. **Turn ropes**, only if the board is still short of its slot. Ropes are turned around one at a time, and a turn is kept when the board stays solvable and the total block cost rises without overshooting the slot.
4. **Trim** any empty outer rows and columns, and turn the board on its side if that left it wider than tall.

**Generating a set** from a seed, a setting and a number of levels:

1. Cut the range into one slot per level. One level per slot means the set is spread evenly over the range and no two levels can share a difficulty.
2. Aim at the empty slots in turn. For each, pick a rope style at random (short and straight, medium, or long and twisty) and the smallest board that style can pack full and still reach the slot's difficulty, and build a level to land there.
3. The level takes whichever empty slot its score falls in, provided it meets the depth floor and the packing rule. About two thirds land in the slot aimed at; one that comes up short can still fill an easier slot.
4. Stop when every slot is filled. Slots run from easiest to hardest, so the set comes out sorted.

Board size follows from difficulty: Easy sets are small boards, and the top of Extreme is 12x16.

**Bigger boards** (a Custom option, `B` in the share code) allows boards up to 16x22 and doubles the top of each range, at the cost of small cells on a phone. The built-in levels never use it.

**Cost.** For `R` ropes on a `W x H` board:

- Checking a board is one topological sort of the "waits for" graph (Kahn's algorithm), which gives every rope's block cost and finds any deadlock in a single pass: `O(W*H + R * max(W, H))`. The game uses this for the live tangle score.
- Laying and packing ropes tries a bounded number of placements per rope (6 while laying, 3 per empty cell while packing). Trying one walks the rope, a few ways out, the chain below it for the loop check, and the ropes whose cost it would raise: `O(R + max(W, H))` per try, with the links between ropes counted in `R`.
- Turning ropes makes at most `4R` tries. Turning a rope does not change which cells are occupied, so what each rope would wait on, facing either way, is worked out once; each try is then a topological sort over those lists with no walking of the board.
- Generating a set stops when every slot is filled, after 60 builds per level asked for, or after 600 builds in a row that fill nothing.

On a laptop a 30-level set takes 10 to 55 ms and the built-in 60 levels about 50 ms.

## How sliding levels are made

In the original game no tap can make the board worse, so any rope that can leave is always safe to take and no arrangement of ropes can demand planning. The sliding game changes one rule: a blocked rope slides until it meets something and stays. Now a move can be wrong, and a board has to be searched to know whether it can still be solved. This section is for readers interested in how such levels are generated; numbers in brackets refer to the list at the end.

### Building backwards

Random sliding boards are almost never good puzzles: most are either impossible or trivial. The standard answer for puzzles whose moves cannot be taken back is to generate them in reverse, starting from the solved position and un-making moves, so that every level comes with a solution by construction. It is the idea behind retrograde analysis of chess endgames [1] and behind several Sokoban generators [2, 3]. The builder here, `weave` in [`levels.js`](levels.js), does the same.

A level under construction is a board together with a way to solve it. The solution is not kept as a list of taps. It is kept as **intentions**: for each rope, the places it is meant to slide to and stop, in order, before it finally leaves. A **replay** plays the intentions out. It goes round the ropes, tapping any rope whose tap would do exactly what is meant for it next (stop on that very cell, or leave the board), until the board is empty or nothing more can be done. A board whose intentions replay to an empty board is solvable, and the taps the replay made are a solution.

Keeping intentions instead of a fixed order is what lets the builder add a rope anywhere, not only at the front of the solution. A new rope re-times everything around it by itself: whatever now has to wait for it simply becomes tappable later in the replay.

Every step of the build is one of three moves made in reverse, and it is kept only if the board still replays:

- **Lay.** A rope appears, meant simply to leave. It may lie across other ropes' ways out, in a pocket where it must wait its turn, or in the gap a knot is going to slide into, in which case it has to leave before that slide can happen.
- **Knot.** A rope appears already pulled back from the place it is meant to slide to, where its head will be hard against another rope. Its tail lies across the way out of a rope it is itself waiting on, which closes a loop: nothing in it can leave until this rope slides forward and draws its tail clear. Half the time, when there is the chance, the knot is laid against the place *another knot will come to rest*, so that the two must be slid in the right order.
- **Trap.** A rope appears with a gap in front of it, kept empty, into which it must not be slid: there it would lie across the way out of a rope it is waiting on, hard against its blocker with nowhere left to go. This is checked directly, by sliding it there and finding ropes that can then never leave.

So slides and exits come out woven together. In generated sets about half of all slides cannot be made at the start (a rope in the gap has to leave first, or the rope to stop against has not arrived), and about one in eight comes to rest against a rope that itself slid into place.

Finding where a knot or trap can go uses the "waits for" graph of the board as it stands, as in deadlock detection [7]: rope A waits for rope B if B lies on A's way out. A cell is *tied* for a new rope if lying there would put it on the way out of something it would be waiting on, down any chain. A knot's body avoids tied cells and its tail must reach one; a trap needs one in its gap. Whether a knot really starts in a loop is confirmed afterwards with Tarjan's strongly-connected-components algorithm [6].

### Difficulty

The original game's block cost is the depth of a rope in the "waits for" graph, found by a topological sort (Kahn's algorithm [5]). With loops there is no such order, so the sliding game takes its block cost from the solution instead. During a replay each tap is given a **layer**: one more than the latest layer among the taps it had to wait for (the taps that emptied a cell it passes over, the tap that brought the rope it stops against into place, and the rope's own previous slide), or 0 if it waited for nothing. A rope's block cost is the layer of the tap that takes it off the board: the length of the longest chain of moves that must come before it.

On a board with no slides this is exactly the original block cost. A knot adds a layer to everything waiting behind it, so knotted boards score higher, by what the knots hold up. A level's difficulty is the sum of block costs plus bends, as before, so the same ranges and the same depth floor apply.

Because one replay gives both "is it still solvable" and the new score, every candidate rope's effect on the difficulty is known exactly before it is placed. The builder steers by that just as the original one does: it paces the score to arrive in the level's slot about when the board is full, and never adds more than the slot allows. This is a small instance of search-based content generation [4], with the replay as the test and the slot as the target.

There is also a **knot floor**:

| Difficulty | Fewest knots |
| --- | --- |
| under 15 | none |
| 15 to 39 | 1 |
| 40 to 79 | 2 |
| 80 to 149 | 3 |
| 150 to 249 | 4 |
| 250 and up | 5 |

A level is built with about `0.6 * sqrt(difficulty)` knots and as many traps, or as many as the board will take. Typical sets come out at about 1 knot per level on Easy, 3 on Normal, 4 on Hard and 9 on Extreme (up to 18), with one or two fatal slides open at the start. Sliding boards are a little less full than the original's (at least 72% rope), because the gaps are part of the puzzle.

### Can a board still be solved?

The game needs to answer this after every move, to say "Knotted!" the moment a board is lost and to keep a hint ready.

- **The quick check** is a *delete relaxation*, the idea behind the heuristics of the HSP and FF planners [8, 9]: solve an easier problem in which nothing a move achieves is ever undone. Here, every rope is allowed to move as freely as it ever could. In rounds, each rope pushes forward through empty cells, and through a cell another rope sits on once that rope has slid clear of it or left; nothing a rope does ever gets in another's way. A rope that cannot get out even so can never leave, and the board is lost. Because the relaxation only ever makes things easier, it never condemns a board that could be solved. It is not complete the other way: two ropes facing each other with room between them pass the check, and are caught only when they meet. `O(W*H + R * (max(W, H) + rounds))`.
- **The knot** shown to the player is not every rope that can never leave, which is usually most of the board, but the ring of ropes that is the reason. After the quick check each stranded rope is held by one other, the rope on the cell in front of it. Following "is held by" from any of them must come round in a circle, and the ropes on those circles are the knot: each needs the next one gone, all the way round.
- **The solver** is a depth-first search over boards. It gives up at once on any board the quick check condemns, remembers every board it has found hopeless so that none is explored twice, and tries the taps of a known solution first (the level's par solution, then the last one it found). Following a known solution it looks at one board per tap. After a careless move it typically looks at a few dozen; it is capped at 4000, and on the rare board where that runs out the player is given the benefit of the doubt.

### The fewest taps

Every rope takes exactly one tap to leave, so solutions differ only in how many slides they spend, and par is the number of ropes plus the fewest slides that will do. The builder's own solution is often not the shortest (on Hard it wastes about one slide a level), so par is searched for separately when a level is opened.

The search is depth-first iterative deepening [13]: is there a solution with no slides? with one? with two? The first that exists is the fewest. Between slides it takes out every rope that can leave, since leaving costs nothing extra; it drops any board the quick check condemns, and does not retry a board it has already tried with as many slides in hand.

Taking ropes out as soon as they can leave is a shortcut, and shortcuts can miss things, so the result is checked against a breadth-first search over every possible sequence of taps on the generated levels small enough for that: about 200 in the tests. It matches on all of them.

The search is capped (6000 boards) so that a level opens promptly: at most a few tens of milliseconds. In the tests' 720 levels it finishes, making par exact, on every Easy and Normal level, on all but 3 of the 180 Hard ones, and on about four in ten Extreme ones; it finishes on 55 of the 60 built-in sliding levels. Where it runs out, par is the builder's solution: the best known, which a player may beat. The result screen says "the fewest possible" only when par is exact.

### How hard is the problem?

Deciding whether a sliding board can be cleared is in NP: every tap moves a rope at least one cell forward along a track no longer than its own length plus a board side, so a solution is at most a polynomial number of taps and can be checked by playing it. Whether it is NP-hard is not settled here. The comparison is with Rush Hour, where pieces slide both ways and the question is PSPACE-complete [10]; puzzles whose moves cannot be undone, like this one, usually land in NP, and Hearn and Demaine's bounded constraint logic is the usual tool for proving them NP-complete [11]. Either way, the practical consequence is the one above: no formula rates a board, and checking one takes search.

For small boards the whole space can be searched. The hardest Rush Hour positions were found that way, by analysing all 3.6 × 10^10 configurations [12]. That has not been done here; it would be a way to find the hardest possible small levels rather than merely good ones.

### What is measured

On generated sets:

- A player who only ever taps ropes that can leave (which always wins the original game) finishes no sliding level from Normal up, since every one of them has a knot.
- One who does that and slides a rope at random whenever stuck finishes about 60% of Normal levels, 40% of Hard and 20% of Extreme.
- Taking a rope that can leave was never the losing move in 400 simulated games (10 of them ran past what the solver could decide). So the planning in these levels is all about slides: which rope, and in what order. Levels in which a free rope must be left in place for now, because another rope needs it to stop against, would be a step further. An attempt to build them was measured and dropped: the arrangement can be laid, but it almost never turned out to be fatal.

**Cost.** A replay is one or two passes over the ropes: `O(W*H + R * max(W, H))`. A level takes a few hundred of them. A 20-level sliding set takes 45 to 110 ms on a laptop (up to about 450 ms for 30 Extreme levels with Bigger boards), and the 60 built-in sliding levels about 150 ms.

### References

1. K. Thompson, "Retrograde analysis of certain endgames", *ICCA Journal* 9(3), 1986, pp. 131–139.
2. Y. Murase, H. Matsubara, Y. Hiraga, "Automatic making of Sokoban problems", *PRICAI'96*, LNCS 1114, Springer, 1996. [doi:10.1007/3-540-61532-6_50](https://doi.org/10.1007/3-540-61532-6_50)
3. J. Taylor, I. Parberry, "Procedural generation of Sokoban levels", *Proc. 6th North American Conference on AI and Simulation in Games (GAMEON-NA)*, EUROSIS, 2011, pp. 5–12. [PDF](https://ianparberry.com/pubs/GAMEON-NA_METH_03.pdf)
4. J. Togelius, G. N. Yannakakis, K. O. Stanley, C. Browne, "Search-based procedural content generation: a taxonomy and survey", *IEEE Transactions on Computational Intelligence and AI in Games* 3(3), 2011, pp. 172–186. [doi:10.1109/TCIAIG.2011.2148116](https://doi.org/10.1109/TCIAIG.2011.2148116)
5. A. B. Kahn, "Topological sorting of large networks", *Communications of the ACM* 5(11), 1962, pp. 558–562. [doi:10.1145/368996.369025](https://doi.org/10.1145/368996.369025)
6. R. Tarjan, "Depth-first search and linear graph algorithms", *SIAM Journal on Computing* 1(2), 1972, pp. 146–160. [doi:10.1137/0201010](https://doi.org/10.1137/0201010)
7. E. G. Coffman, M. J. Elphick, A. Shoshani, "System deadlocks", *ACM Computing Surveys* 3(2), 1971, pp. 67–78. [doi:10.1145/356586.356588](https://doi.org/10.1145/356586.356588)
8. B. Bonet, H. Geffner, "Planning as heuristic search", *Artificial Intelligence* 129(1–2), 2001, pp. 5–33. [doi:10.1016/S0004-3702(01)00108-4](https://doi.org/10.1016/S0004-3702(01)00108-4)
9. J. Hoffmann, B. Nebel, "The FF planning system: fast plan generation through heuristic search", *Journal of Artificial Intelligence Research* 14, 2001, pp. 253–302. [doi:10.1613/jair.855](https://doi.org/10.1613/jair.855)
10. G. W. Flake, E. B. Baum, "Rush Hour is PSPACE-complete, or 'Why you should generously tip parking lot attendants'", *Theoretical Computer Science* 270(1–2), 2002, pp. 895–911. [doi:10.1016/S0304-3975(01)00173-6](https://doi.org/10.1016/S0304-3975(01)00173-6)
11. R. A. Hearn, E. D. Demaine, *Games, Puzzles, and Computation*, A K Peters, 2009.
12. S. Collette, J.-F. Raskin, F. Servais, "On the symbolic computation of the hardest configurations of the Rush Hour game", *Computers and Games (CG 2006)*, LNCS 4630, Springer, 2007, pp. 220–233. [doi:10.1007/978-3-540-75538-8_20](https://doi.org/10.1007/978-3-540-75538-8_20)
13. R. E. Korf, "Depth-first iterative-deepening: an optimal admissible tree search", *Artificial Intelligence* 27(1), 1985, pp. 97–109. [doi:10.1016/0004-3702(85)90084-0](https://doi.org/10.1016/0004-3702(85)90084-0)

## Tests

Open [`tests/index.html`](tests/index.html) in a browser (served from the project folder), or visit https://creationix.github.io/monkey-fist/tests/. The page title and heading show `PASS n/n` or `FAIL`.

For the original game the tests cover block-cost and bend scoring on hand-built boards, 300 built boards cross-checked against actually playing them (solvable, costs correct, never over their slot), that every setting fills its range evenly with unique difficulties, the depth floor, how full the boards are, how hard the hardest Extreme level is, rope-style variety, board-size limits, share codes, and the board-quality rules. A fingerprint test pins its 60 built-in levels, so that progress already made in them stays valid.

For the sliding game they cover the slide rule, a knot and a trap built by hand, the quick check and the solver, and then 720 generated levels: each is cleared by its own solution, has the difficulty that solution's layers give it, meets the knot floor, cannot be cleared by ropes simply leaving, and has exactly the traps it counts. They also check that slides and exits really are woven together, run the solver after every move of a simulated careless player, and check par against a search of every possible sequence of taps on the levels small enough for that.

## Install

It is an installable web app that works offline after the first visit.

- **Android:** open the link in Chrome, then menu → "Install app".
- **iPhone / iPad:** open the link in Safari, then Share → "Add to Home Screen".

## Running locally

No dependencies and no build step. Serve the folder with any static web server and open it.
