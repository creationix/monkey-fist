# Monkey Fist

A rope-untangling puzzle game for the browser and phone.

**Play it:** https://creationix.github.io/monkey-fist/

## How to play

The board is a tangle of ropes, each with an arrow at one end. Tap a rope and it slides out of the board arrow-first, following its own bends. If another rope is in its path it bumps and you lose a heart, so the puzzle is finding the order that frees them all.

- Three hearts per level; hearts left at the end are your stars.
- The lightbulb highlights a rope that can leave right now.
- **Kid mode** (menu toggle): bumps never cost a heart, and each bump points out a rope that can go.
- **Levels**: 60 built-in levels, ordered from simplest to hardest.
- **Custom**: generate your own set of 10, 20 or 30 levels at Easy, Normal or Hard, optionally with long twisty ropes. Each set has a share code such as `N20-K7F3Q`; anyone who enters the same code gets exactly the same levels.

## How levels are made

All level logic is in [`levels.js`](levels.js), which has no dependency on the page.

**Difficulty.** A rope's *block cost* is how many layers of other ropes must leave before it can: a free rope costs 0, and a blocked rope costs 1 more than the deepest rope in its way. A rope waiting on a chain seven ropes deep costs 7. A level's difficulty is the sum of its ropes' block costs.

**Generating a set** from a seed, a difficulty setting and a number of levels:

1. Generate candidate levels, each with a random board size, rope length and crowding, until there are three times as many as needed. Only one candidate is kept per difficulty score, so every level in a set has a different difficulty.
2. Reject candidates that don't earn their size: boards less than half covered in rope, and boards 6 or more wide where fewer than half the ropes are blocked by something.
3. Sort the candidates by difficulty and cut them into thirds.
4. Easy takes 70% of its levels from the easiest third (20% middle, 10% hardest), Normal takes evenly from all three, Hard takes 70% from the hardest third.
5. Return the picks in order from simplest to hardest.

Bigger, fuller boards score higher, so the difficulty setting decides board size too. The built-in levels are one fixed set (`N60-MONKEYFIST`).

**Cost.** Checking a board is one topological sort of the "waits for" graph, which gives every rope's block cost and finds any deadlock in a single pass: `O(W*H + R * max(W, H))` for `R` ropes on a `W x H` board. Building a level untangles deadlocks by turning or dropping one rope from the knot at a time, at most `2R` passes. Generating a set stops at 3x the levels needed, when new difficulty scores stop turning up, or after 60 builds per level asked for, whichever comes first. The built-in 60-level set takes about a tenth of a second on a laptop.

## Tests

Open [`tests/index.html`](tests/index.html) in a browser (served from the project folder), or visit https://creationix.github.io/monkey-fist/tests/. The page title and heading show `PASS n/n` or `FAIL`. The tests cover block-cost scoring on hand-built boards, a cross-check of the scores against actually playing 300 random levels, solvability, the set-selection rules for each difficulty, uniqueness and ordering, share codes, and the board-quality rules.

## Install

It is an installable web app that works offline after the first visit.

- **Android:** open the link in Chrome, then menu → "Install app".
- **iPhone / iPad:** open the link in Safari, then Share → "Add to Home Screen".

## Running locally

No dependencies and no build step. Serve the folder with any static web server and open it.
