# Monkey Fist

A rope-untangling puzzle game for the browser and phone.

**Play it:** https://creationix.github.io/monkey-fist/

## How to play

The board is a tangle of ropes, each with an arrow at one end. Tap a rope and it slides out of the board arrow-first, following its own bends. If another rope is in its path it bumps and you lose a heart, so the puzzle is finding the order that frees them all.

- **Tangle** (top of the screen) is how knotted the board still is, and it falls as you pull ropes out. Once nothing is blocked any more the puzzle is solved, so the remaining ropes let themselves out.
- Three hearts per level; hearts left at the end are your stars.
- The lightbulb highlights a rope that can leave right now.
- **Kid mode** (menu toggle): bumps never cost a heart, and each bump points out a rope that can go.
- **Levels**: 60 built-in levels, from tangle 1 up to 200, starting gently.
- **Custom**: generate your own set of 10, 20 or 30 levels at Easy, Normal, Hard or Extreme. Each set has a share code such as `N20-K7F3Q`; anyone who enters the same code gets exactly the same levels.

## How levels are made

All level logic is in [`levels.js`](levels.js), which has no dependency on the page.

**Difficulty (tangle).** A rope's *block cost* is how many layers of other ropes must leave before it can: a free rope costs 0, and a blocked rope costs 1 more than the deepest rope in its way. A rope waiting on a chain seven ropes deep costs 7.

A rope's *score* is its block cost plus one for each bend in it, whether or not it is blocked: a rope that winds around is harder to follow and to plan around than a straight one. A level's difficulty is the sum of its ropes' scores, and the live tangle score is the same sum over the ropes still on the board, so it falls to 0 as the board empties.

**Each setting is a difficulty range**, and a set fills its range evenly:

| Setting | Difficulty |
| --- | --- |
| Easy | 2 to 40 |
| Normal | 20 to 80 |
| Hard | 60 to 130 |
| Extreme | 100 to 200 |
| Built-in levels | 1 to 200, bunched toward the easy end |

**The depth floor.** Every level's *average block cost per rope* must reach a minimum that rises with its difficulty. Without it, the cheapest way to a high score is a crowd of short ropes that barely block each other; with it, a hard level has to be built from ropes that wait on each other in long chains.

| Difficulty | Minimum average block cost per rope |
| --- | --- |
| under 10 | none |
| 10 to 19 | 1.5 |
| 20 to 39 | 2.5 |
| 40 to 59 | 3 |
| 60 to 99 | 4 |
| 100 to 149 | 5 |
| 150 and up | 5.5 |

**Building one level.** Levels are built backwards: ropes are added one at a time, in the reverse of the order they will be pulled out, under a single rule.

> A new rope's own way out must be clear of every rope already on the board.

So a new rope never waits on an older one, every "waits for" link runs from an older rope to a newer one, and a loop is impossible: the board is solvable by construction, with nothing to untangle afterwards. A new rope may, however, be laid across the way out of older ropes, and that is how depth is made on purpose. Lay it across the path of a rope at the bottom of a long chain and every rope up that chain gets one deeper.

1. **Lay ropes.** Each rope's effect on the score is known before it is placed, so the builder steers. It paces the score to arrive in the level's slot about when the board is as full as planned, keeps the average block cost per rope up near its target, never adds more than the slot allows, and never adds a rope the depth floor could not afford.
2. **Turn ropes**, only if the board filled up short of its slot. Ropes are turned around one at a time, and a turn is kept when the board stays solvable and the total block cost rises without overshooting the slot.
3. **Trim** the empty outer rows and columns, and turn the board on its side if that left it wider than tall.

**Generating a set** from a seed, a setting and a number of levels:

1. Cut the range into one slot per level. One level per slot means the set is spread evenly over the range and no two levels can share a difficulty.
2. Aim at the empty slots in turn. For each, pick a rope style at random (short and straight, medium, or long and twisty), choose a depth a little past the floor and a board sized for about the right number of ropes, and build a level to land in that slot.
3. The level takes whichever empty slot its score falls in, provided it meets the depth floor for that score and earns its size (at least half covered in rope; on boards 6 or more wide, at least half the ropes blocked). About a third land in the slot aimed at; one that comes up short can still fill an easier slot.
4. Stop when every slot is filled. Slots run from easiest to hardest, so the set comes out sorted.

Board size follows from difficulty: Easy sets are small boards, and Extreme sets are mostly 9x12 to 12x16 with around 20 ropes in chains about 13 deep.

**Bigger boards** (a Custom option, `B` in the share code) uses longer ropes on boards up to 16x22, at the cost of small cells on a phone. The built-in levels never use it.

**Cost.** For `R` ropes on a `W x H` board:

- Checking a board is one topological sort of the "waits for" graph, which gives every rope's block cost and finds any deadlock in a single pass: `O(W*H + R * max(W, H))`. The game uses this for the live tangle score.
- Laying ropes looks at up to 6 placements per rope. Trying one walks the rope, a few ways out, and the ropes whose cost it would raise: `O(R * (R + max(W, H)))` for the level.
- Turning ropes makes at most `4R` tries. Turning a rope does not change which cells are occupied, so what each rope would wait on, facing either way, is worked out once; each try is then a topological sort over those lists with no walking of the board.
- Generating a set stops when every slot is filled, after 60 builds per level asked for, or after 600 builds in a row that fill nothing.

On a laptop the built-in set and the slowest custom request (30 Extreme levels) each take about 0.1 s.

## Tests

Open [`tests/index.html`](tests/index.html) in a browser (served from the project folder), or visit https://creationix.github.io/monkey-fist/tests/. The page title and heading show `PASS n/n` or `FAIL`. The tests cover block-cost and bend scoring on hand-built boards, 300 built boards cross-checked against actually playing them (solvable, costs correct, never over their slot), that every setting fills its range evenly with unique difficulties, the depth floor, rope-style variety, board-size limits, share codes, and the board-quality rules.

## Install

It is an installable web app that works offline after the first visit.

- **Android:** open the link in Chrome, then menu → "Install app".
- **iPhone / iPad:** open the link in Safari, then Share → "Add to Home Screen".

## Running locally

No dependencies and no build step. Serve the folder with any static web server and open it.
