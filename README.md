# Monkey Fist

A rope-untangling puzzle game for the browser and phone.

**Play it:** https://creationix.github.io/monkey-fist/

## How to play

The board is a tangle of ropes, each with an arrow at one end. Tap a rope and it slides out of the board arrow-first, following its own bends. There are two games on the same boards.

**Sliding ropes** (the default). A rope whose way is clear leaves. A rope that is blocked slides forward until it meets another rope, and stays there. Ropes never go backwards, so every slide is for keeps.

- Some ropes start tied in a **knot**: a loop in which each rope is waiting on the next, so none of them can leave. Sliding the right one forward draws its tail out of another's way and undoes it.
- Some slides are **traps**: they tie a knot that can never be undone. The game says "Knotted!" as soon as that happens.
- There are no hearts. Instead each level allows **three undos**, each taking back one move. A knot with no undos left loses the level. Stars are 3 for no undos used, 2 for one, 1 otherwise.
- The top of the screen shows how many ropes are tied in knots. Once nothing is blocked the puzzle is solved, so the remaining ropes let themselves out.
- The lightbulb highlights the next tap of a way out that is known to work.

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

- Checking a board is one topological sort of the "waits for" graph, which gives every rope's block cost and finds any deadlock in a single pass: `O(W*H + R * max(W, H))`. The game uses this for the live tangle score.
- Laying and packing ropes tries a bounded number of placements per rope (6 while laying, 3 per empty cell while packing). Trying one walks the rope, a few ways out, the chain below it for the loop check, and the ropes whose cost it would raise: `O(R + max(W, H))` per try, with the links between ropes counted in `R`.
- Turning ropes makes at most `4R` tries. Turning a rope does not change which cells are occupied, so what each rope would wait on, facing either way, is worked out once; each try is then a topological sort over those lists with no walking of the board.
- Generating a set stops when every slot is filled, after 60 builds per level asked for, or after 600 builds in a row that fill nothing.

On a laptop a 30-level set takes 10 to 55 ms and the built-in 60 levels about 50 ms.

## How sliding levels are made

In the original game no tap can make the board worse, so any rope that can leave is always safe and no arrangement of ropes can demand planning. The sliding game changes that with one rule: a blocked rope slides until it meets something and stays. Two things follow, and the generator builds both in on purpose.

**A knot** is a rope that starts the level pulled back from where it belongs, with its tail lying across the way out of a rope it is itself waiting on. That closes a loop, which the original game could never solve. Sliding the rope forward draws its tail clear.

**A trap** is a rope with a gap in front of it that it must not be slid into yet, because there it would lie across the way out of a rope it is waiting on, hard against its blocker with nowhere left to go.

**Building one.** The board is built exactly as above, under the same no-loops rule, with knots and traps laid into it as it goes:

- A knot is laid *in the place it will slide to*: head hard against another rope, loop-free there like every other rope. Its first few cells run straight so that it can start one to three cells further back, and the cells its tail then reaches into are kept empty for it. Those cells must cross the way out of a rope it waits on, directly or down a chain.
- A trap is laid where it stays, with one to three cells kept empty in front of it, at least one of which crosses the way out of a rope it waits on.

So the board that gets built is the level *with its knots already undone*, and everything said above about it still holds. The level then starts with each knot pulled back. That gives every level a known solution for free: slide each knot forward, oldest first, then take the ropes out in order of block cost. The builder replays that solution before handing a level out.

**Difficulty** of a sliding level is that of the board once its knots are undone, so the same ranges and the same depth floor apply. Knots are counted separately, and there is a **knot floor**:

| Difficulty | Fewest knots |
| --- | --- |
| under 15 | none |
| 15 to 39 | 1 |
| 40 to 79 | 2 |
| 80 to 149 | 3 |
| 150 to 249 | 4 |
| 250 and up | 5 |

A level is built with about `0.6 * sqrt(difficulty)` knots and as many traps, or as many as the board will take. Typical sets come out at about 1 knot per level on Easy, 3 on Normal, 5 on Hard and 9 on Extreme (up to 16), with a little over one fatal slide open at the start on average. Sliding boards are a little less full than the original's (at least 72% rope), because the gaps are part of the puzzle.

**Can it still be solved?** Because a slide cannot be taken back, this takes more than a sort.

- *The quick check* lets every rope move as freely as it ever could: in rounds, each rope pushes forward through empty cells, and through a cell another rope sits on once that rope has slid clear of it or left. A rope that does not get out even so can never leave, and the board is lost. It is generous (it ignores that one rope sliding may get in another's way), so it never condemns a board that could be solved. `O(W*H + R * (max(W, H) + rounds))`.
- *The solver* is a search: try a tap, and if the board that leaves cannot be finished, take it back and try another. It gives up at once on any board the quick check condemns, remembers every board it has found hopeless, and tries the taps of a known solution first. The game runs it after every move, to say "Knotted!" the moment a board is lost and to keep a hint ready. Following a known solution it looks at one board per tap; after a careless move it typically looks at a few dozen, and it is capped at 4000.

**What is measured.** On generated sets, a player who only ever taps ropes that can leave (which always wins the original game) finishes no sliding level from Normal up, since every one of them has a knot. One who does that and slides a rope at random whenever stuck finishes about two thirds of Normal, half of Hard and a quarter of Extreme.

**Cost.** A sliding set takes 30 to 250 ms on a laptop (up to about 750 ms for 30 Extreme levels with Bigger boards), and the 60 built-in sliding levels about 150 ms.

## Tests

Open [`tests/index.html`](tests/index.html) in a browser (served from the project folder), or visit https://creationix.github.io/monkey-fist/tests/. The page title and heading show `PASS n/n` or `FAIL`.

For the original game the tests cover block-cost and bend scoring on hand-built boards, 300 built boards cross-checked against actually playing them (solvable, costs correct, never over their slot), that every setting fills its range evenly with unique difficulties, the depth floor, how full the boards are, how hard the hardest Extreme level is, rope-style variety, board-size limits, share codes, and the board-quality rules. A fingerprint test pins its 60 built-in levels, so that progress already made in them stays valid.

For the sliding game they cover the slide rule, a knot and a trap built by hand, the quick check and the solver, and then 720 generated levels: each is cleared by its own solution, has the difficulty it claims once its knots are undone, meets the knot floor, cannot be cleared by ropes simply leaving, and has exactly the traps it counts. The solver is also run after every move of a simulated careless player.

## Install

It is an installable web app that works offline after the first visit.

- **Android:** open the link in Chrome, then menu → "Install app".
- **iPhone / iPad:** open the link in Safari, then Share → "Add to Home Screen".

## Running locally

No dependencies and no build step. Serve the folder with any static web server and open it.
