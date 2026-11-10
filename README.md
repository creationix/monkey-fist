# Monkey Fist

A rope-untangling puzzle game for the browser and phone.

**Play it:** https://creationix.github.io/monkey-fist/

## How to play

The board is a tangle of ropes, each with an arrow at one end. Tap a rope and it slides out of the board arrow-first, following its own bends. If another rope is in its path it bumps and you lose a heart, so the puzzle is finding the order that frees them all.

- Three hearts per level; hearts left at the end are your stars.
- The lightbulb highlights a rope that can leave right now.
- Levels are endless. Each one is generated from its level number, so level 12 is the same puzzle for everyone, and every level is checked to be solvable.

## Install

It is an installable web app that works offline after the first visit.

- **Android:** open the link in Chrome, then menu → "Install app".
- **iPhone:** open the link in Safari, then Share → "Add to Home Screen".

## Running locally

Everything is in `index.html` with no dependencies and no build step. Serve the folder with any static web server and open it.
