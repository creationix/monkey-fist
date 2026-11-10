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

**Each setting is a difficulty range and a depth floor.** A set fills its range evenly, and every level's *average block cost per rope* must be at least the setting's minimum. The floor is what stops a hard level being a crowd of short ropes that barely block each other: to score high with the floor in place, a level has to be built from ropes that wait on each other in long chains.

| Setting | Difficulty | Minimum average block cost per rope |
| --- | --- | --- |
| Easy | 2 to 40 | none |
| Normal | 20 to 80 | 2 |
| Hard | 60 to 130 | 3 |
| Extreme | 100 to 200 | 4 |
| Built-in levels | 1 to 200, bunched toward the easy end | steps up through 2, 3 and 4 at difficulty 20, 60 and 100 |

**Generating a set** from a seed, a setting and a number of levels:

1. Cut the range into one slot per level. One level per slot means the set is spread evenly over the range and no two levels can share a difficulty.
2. Aim at the empty slots in turn. Pick a rope style at random (short and straight, medium, or long and twisty), then the board width most likely to land near that slot's difficulty with that style, and build a level with random rope lengths and crowding. Most ropes are pointed the long way across the board, so they have other ropes in their path, and boards 8 or more wide have no two-cell ropes.
3. If the setting has a depth floor, deepen the board: turn ropes around one at a time, keeping a turn only if the board is still solvable and its total block cost went up, until the average passes the floor.
4. A level whose difficulty falls in a slot that is still empty, and which meets the depth floor, takes that slot; otherwise it is discarded. Boards that don't earn their size are discarded too: less than half covered in rope, or 6 or more wide with fewer than half the ropes blocked by something.
5. Stop when every slot is filled. Slots run from easiest to hardest, so the set comes out sorted.

Aiming uses a table of typical difficulty per board width, corrected as it goes by what the boards of each rope style actually score. Board size follows from difficulty: Easy sets are small boards, and Extreme sets are mostly 9x12 to 11x15 with around 27 ropes in chains about 12 deep.

**Bigger boards** (a Custom option, `B` in the share code) allows boards up to 16x22, at the cost of small cells on a phone. The built-in levels never use it.

**Cost.** Checking a board is one topological sort of the "waits for" graph, which gives every rope's block cost and finds any deadlock in a single pass: `O(W*H + R * max(W, H))` for `R` ropes on a `W x H` board. Building a level untangles deadlocks by turning knotted ropes around (several per pass) and dropping one only when none are left to turn, at most `2R` passes. Deepening a board tries each rope at most three times, one linear check per try. Generating a set stops when every slot is filled, after 60 builds per level asked for, or after 600 builds in a row that fill nothing. On a laptop the built-in set takes about 0.1 s and the slowest custom request (30 Extreme levels) about 0.3 s.

## Tests

Open [`tests/index.html`](tests/index.html) in a browser (served from the project folder), or visit https://creationix.github.io/monkey-fist/tests/. The page title and heading show `PASS n/n` or `FAIL`. The tests cover block-cost scoring on hand-built boards, a cross-check of the scores against actually playing 300 random levels, solvability, that every setting fills its range evenly with unique difficulties, rope-style variety, board-size limits, share codes, and the board-quality rules.

## Install

It is an installable web app that works offline after the first visit.

- **Android:** open the link in Chrome, then menu → "Install app".
- **iPhone / iPad:** open the link in Safari, then Share → "Add to Home Screen".

## Running locally

No dependencies and no build step. Serve the folder with any static web server and open it.
