# Monkey Fist

A rope-untangling puzzle game for the browser and phone.

**Play it:** https://creationix.github.io/monkey-fist/

## How to play

The board is a tangle of ropes, each with an arrow at one end. Tap a rope and it slides out of the board arrow-first, following its own bends. If another rope is in its path it bumps and you lose a heart, so the puzzle is finding the order that frees them all.

- **Tangle** (top of the screen) is how knotted the board still is, and it falls as you pull ropes out. Once nothing is blocked any more the puzzle is solved, so the remaining ropes let themselves out.
- Three hearts per level; hearts left at the end are your stars.
- The lightbulb highlights a rope that can leave right now.
- **Kid mode** (menu toggle): bumps never cost a heart, and each bump points out a rope that can go.
- **Levels**: 60 built-in levels, from tangle 1 up to 300, starting gently.
- **Custom**: generate your own set of 10, 20 or 30 levels at Easy, Normal, Hard or Extreme. Each set has a share code such as `N20-K7F3Q`; anyone who enters the same code gets exactly the same levels.

## How levels are made

All level logic is in [`levels.js`](levels.js), which has no dependency on the page.

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

## Tests

Open [`tests/index.html`](tests/index.html) in a browser (served from the project folder), or visit https://creationix.github.io/monkey-fist/tests/. The page title and heading show `PASS n/n` or `FAIL`. The tests cover block-cost and bend scoring on hand-built boards, 300 built boards cross-checked against actually playing them (solvable, costs correct, never over their slot), that every setting fills its range evenly with unique difficulties, the depth floor, how full the boards are, how hard the hardest Extreme level is, rope-style variety, board-size limits, share codes, and the board-quality rules.

## Install

It is an installable web app that works offline after the first visit.

- **Android:** open the link in Chrome, then menu → "Install app".
- **iPhone / iPad:** open the link in Safari, then Share → "Add to Home Screen".

## Running locally

No dependencies and no build step. Serve the folder with any static web server and open it.
