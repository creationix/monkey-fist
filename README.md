# Monkey Fist

A tap-to-untangle puzzle with colorful braided ropes on square and hexagonal grids.
No build step, dependencies, accounts, or network requests during play.

**Play:** https://creationix.github.io/monkey-fist/

## One journey, both grids

The default journey has 120 deterministic, procedurally generated levels. Every
level, including the opening ten, is derived from the `MONKEYFIST` seed; none is
hand-picked:

- Opening puzzles mix square and Hex grids, use at most five ropes, and
  gradually add partial-slide dependencies.
- Later boards remain moderate, at most 12 columns by 16 rows. Difficulty comes
  from interacting blocking dependencies, not steadily larger boards or longer
  single chains. Boards stay packed instead of growing sparse strips.
- Difficulty is measured by play: the slides and spins the par solution must
  make, and how often a casual player (exits first, otherwise random moves)
  loses. Each level is the best of several seeds for a target that rises over
  the Journey. Mirrors and spring spinners start after the opening ten and recur
  throughout. Mirror and spinner levels are sliding puzzles in their own right:
  ropes are woven around the mirrors with knots and traps, and spinners are added
  only where the solution must bounce off them after another rope moves. Harder
  levels are chosen so that a careless slide can lose them.
- Most later puzzles use mirrors, spinners, or both, with a plain-rules interlude
  in each chapter. Late mirror maps use at least three mirrors; late spinner maps
  use at least two distinct spinners. Their verified solutions must use them
  during manual play.
- The first ten levels are open. Clear level 10 to open 11–20, level 20 to open
  21–30, and so on. Every level in an open group is immediately playable, so
  players can jump to the group’s last level to progress faster.

Both grids share the same full-screen canvas, floating controls, menus, scoring,
audio, zoom, panning, and responsive orientation. There is no separate Hex app.

## Custom sets

Open **Menu → Custom** to choose:

- Square + Hex, square only, or Hex only.
- Mirrors and springs, independently.
- A difficulty range from 1 to 100, using two touch-friendly sliders.
- Independent grid width and height, from 4 to 24 cells each. Mirrors or springs
  require at least an 8 × 8 grid.
- Optional **Colossal** boards, only in Custom, extend the limits to 48 × 48.
  They use the same woven generator with longer ropes, skip the slower par
  search, and never appear in Journey.
- A level-count slider from 1 to 200.
- A seed, with dice to randomize it and a reset button for `MONKEYFIST`.

All custom levels are playable immediately. Set links include every setting and
reproduce the same puzzles on every device. For example:

`?set=U3-M-1-100-10-14-120-MS-MONKEYFIST&level=35`

The code encodes format version, grid (`S`/`H`/`M`), minimum and maximum
difficulty, grid width and height, level count, and flags for mirrors (`M`),
springs (`S`), or Colossal (`C`), followed by the seed. `N` means no optional
flags. The journey is `J3-MONKEYFIST`. These are the only set formats; earlier
pre-release formats were removed.

Size means grid dimensions. A 10 × 14 board remains 10 × 14 at every difficulty;
rope count and rope shapes adapt to fill it. Every plain board uses the original
dense weaving approach, including the small introductions. Difficulty changes
blocking and sliding dependencies within the same space. Packing preserves the
small gaps required for sliding instead of filling the solution’s movement lanes.
Par must be at least one tap for every three ropes; boards with more than three
ropes cannot clear after one player tap. Mirrors and springs are optional. Every generated board
starts blocked and has a replayed solution. Par is a verified target; bounded
searches label an unproved optimum as best known.

`grid-journey.js` stores only each level's specification and map seed, not maps or
solutions; it is what the game loads. The builder's measurements (par, rope count,
challenge, casual win rate, slide and mechanic use) go to
`scripts/grid-journey-measurements.json`, which only tests and docs read.
Rebuild it with `node scripts/build-grid-journey.cjs` after changing the grid
generator. For experiments, `--seed YOURSEED --out /tmp/journey.js` builds a
different deterministic campaign; `--plan` inspects the seeded schedule. The
opening uses quality constraints rather than a list of pinned maps. The builder
orders the default campaign without generating all 120 maps on each visit. The builder checks exact dimensions, replayed tap counts, overall
rope coverage, coverage in each quarter of the board, and the minimum tap-to-rope
ratio. Each displayed chapter has a mechanics quota, so challenge sorting cannot
push every spinner into the middle of the Journey. Within each chapter, ordering
runs from the lowest measured challenge to the highest. The builder also checks that larger boards cannot auto-release
after one tap, and steps a board toward 12 × 16 only if no seed works at its
planned size.

Custom sets are free. The single Custom entry point is a natural place for a
future purchase entitlement; no payment or entitlement code is included yet.

## Play

Tap a rope to slide it in its arrow’s direction. It stops at another rope or
leaves the board. Two-sided mirrors turn its route; springs reverse the rope
end-for-end. There are no locks in generated levels. Mirrors have muted glass,
rounded frames, and cord bindings. Both sides reflect; there is no triangle
implying a non-reflective side. Arrowheads curve into their reflected direction
when resting on a mirror.
Springs have a copper coil and braided rim. The coil spins from the moment
the arrow crosses the preceding dot until the tail settles, keeping its final
orientation. The arrow enters the spring cell completely, then reflects 180°
and slides back directly over its own rope, ending at the old tail. The return carries the incoming speed through contact without a pause
or easing. The arrowhead is drawn on top of the overlapping body. Starting arrows leave at least one grid space before a bouncer. Spring
approaches have varied run-up lengths, and ordinary
ropes can block the approach until cleared. Their removal is included in the
generated solution certificate. Generators also prefer shared bouncers: multiple
ropes can use one spring, but a parked tail occupies that cell until it leaves.
Every generated plan is replayed with that occupancy rule. Other ropes remain tappable. Reduced motion uses a brief fade
between directions.

On Hex, mirrors lie along the three grid axes (0°, 60°, 120°). An angled
approach turns 120°; an edge-on approach continues straight. Springs work from
all six directions. Rules use canonical grid coordinates, independent of the
board’s screen rotation.

Other ropes remain tappable while animations run, including on mirror and spring
boards. Movement commits logically at the tap; each rope keeps its own visual
route. Tap a bouncing rope again to queue its next move before the flip finishes.
Auto-solve queues the complete solution immediately, hides the HUD and notices
until the animation finishes, and awards zero stars. Its empty grid fades for
one second at Normal speed (two on Slow, half a second on Fast), then the result appears
with a soft bass resolution reserved for zero stars. Earned one-, two-, and three-star results play increasingly cheerful celebrations; one star is a short two-note finish, while two stars climbs through a longer phrase.
Earned scores take precedence over auto-solved clears. Undo restores the previous full board and cancels in-flight animations.
Queued moves yield at shared paths until the earlier rope's tail clears them;
independent routes still animate together. An accepted player tap gets an immediate
soft tick and a brief flash on the visible rope. Each queued move swishes once
when it actually starts moving. Departures run at half their original
speed to keep the clearance readable.

Par is the fewest player taps found. Exits the rest of the solution does not
need are first moved to the automatic release, then a bounded search looks for
fewer taps. Boards without spinners, mirrors included, search on the compact
offset kernels; spinner boards with up to twelve ropes use a full-geometry
search. An unfinished search keeps the best verified solution.

Graphics can switch between braided Rope and translucent Tiles. Tiles use
flat, beveled panels with clear rims. Mirrors
match the glass-like panels; bouncers have a spinning gear profile in both styles.
The setting is shared by square and Hex and saved across sessions.

Permanently immobile ropes darken while keeping their braid and arrow readable.
Detection is conservative: temporary blockers and search timeouts never mark a
rope as frozen. Results are computed when the board changes, cached for drawing,
and restored on undo. Mirrors and bouncers use the same movement rules as play.

Mirrors and bouncers fade once no remaining rope can ever reach them. A bounded
background check explores optimistic routes with blockers removed, including
future reversals; uncertain results keep features visible. Queued animations and
occupied cells retain them until their tails clear. This changes drawing only,
and undo restores the earlier features.

Scoring counts player taps. Blocked taps and each of the three undos cost one;
a hint costs two. Once everything can leave, remaining releases are automatic
and free. Par is a replay-verified target; where the bounded search does not
finish, it is the best known solution rather than a proven optimum. Three stars means par
or better, two means within two taps, and one means completion. There is no hard
tap budget.

Small boards stay centered with zoom and panning disabled. On larger boards,
scroll or pinch to zoom, drag to explore the overflowing area, and press **Fit**
to smoothly recenter. At Fit, panning is disabled. Finger drift is tolerated;
resting edge contacts do not take ownership of other fingers' taps. Keyboard:
arrow keys select ropes, Enter/Space slides, +/− zooms, and 0 fits the board.
The app respects reduced-motion preferences. Fullscreen is available where the
browser supports it. [Touch input and platform limits](docs/touch-and-platforms.md)
documents gesture handling, device testing, and native iOS/Android options.

## Generation and solving

The [generator design note](docs/generator-design.md) separates the desired
puzzle qualities from the techniques currently used to produce them.

[`game-engine.js`](game-engine.js) is the common set format, progression schedule,
and gameplay adapter. Every published board must have at least two ropes, at
least one blocked rope at startup, and a fully replayable solution certificate.
Deterministic, bounded retries reject trivial candidates. The main thread loads
boards through [`generator-worker.js`](generator-worker.js), with a synchronous
fallback if workers are unavailable.

The underlying engines remain specialized:

| Module | Responsibility |
| --- | --- |
| `grid-generator.js`, `grid-journey.js` | Fixed-size dense packing, independent difficulty, and the Journey's level specifications |
| `dependency-metrics.js` | Causal joins, mutual waits, repeated slides, and branching depth |
| `levels.js` | Square woven builder (long ropes, sliding knots and traps, fixed tracks that bend on mirrors) and the compact offset kernels: replay, solver, par search and casual playouts |
| `mechanics.js` | Square full-geometry movement: every tap and its route, mirrors and spinners, bounded full-path solving |
| `hex/engine.js` | Hex woven builder (mutual-wait pairs, long strands, traps, mirrors) and the compact offset kernels |
| `hex/mechanics.js` | Hex full-geometry movement: every tap and its route, mirrors and spinners, bounded full-path solving |
| `app.js` | Shared interaction, animation, camera, scoring, persistence and menus |
| `input.js` | Independent touch contacts, intentional pan/pinch recognition, and centered camera bounds |
| `rope-art.js` | Cached braid geometry that follows rounded bends, matching arrowheads, and reduced detail at small sizes |
| `audio.js`, `music.js`, `sounds.js` | Shared Web Audio session, arrangements, and effects |

Each grid has two kernels, and both grids use them the same way. Without
spinners, every rope only advances along a fixed track (its body, then its way
out as fixed mirrors bend it), so replays, checks and solvers use the compact
offset kernels (`levels.js`, `hex/engine.js`) and prune boards a relaxation
proves lost. Spinners reverse ropes and can revisit states, so spinner boards
replay and search on the full-geometry kernels (`mechanics.js`,
`hex/mechanics.js`), which store full rope geometry and enforce search budgets.
Every tap, and the route it animates, comes from the full-geometry kernels. Exhausting
a budget means unknown, not a false declaration that a board is lost. A valid
remaining certificate is reused before attempting another search.
Checks after off-certificate moves and hint searches run in a cancellable worker,
so the next tap and animations do not wait for search. New moves, undo, and restart
discard stale results. The workerless fallback uses a much smaller search budget.

Every board, colossal maps included, is woven the same way. Difficulty changes
blocking depth, knots, traps and sliding while keeping the chosen dimensions
fixed, and packing continues into small gaps while preserving the solution
certificate.

The historical [`mechanics playground`](https://creationix.github.io/monkey-fist/experiments/mechanics/)
is still available as a separate sandbox. Its older gate/wall fixtures and pure
kernel tests remain useful; those features are not part of generated gameplay.
The [generator background](docs/generation.md) retains the original square
algorithm notes, difficulty metrics, and research references. The
[research note](docs/research/generating-hard-compact-puzzles.md) surveys puzzle
generation research and measures each Journey revision.

## Sound, saves, and offline play

Six synthesized arrangements change with the level: bass-led percussion,
restrained melody, and no downloaded audio. The same swish plays on both grids.
The exit sound plays as soon as the entire rope clears both the board and the
visible viewport; animation does not wait for an invisible extended route.
The sound-effects button cycles **Off → Low → Full**; Low is the default and
uses one quarter of Full’s gain. Music has a separate toggle. Audio initializes
on the first gesture, pauses in the background, and music pauses in menus.
Mirror turns make a low, hollow pluck tuned to the current music, timed to the
head reaching each mirror. Sliding away from a mirror does not repeat its sound.
Spring impacts make a low, damped boing when the coil compresses.

In **Menu**, toggle **Dark mode** for a black page background and nearly black
board and menu surfaces. It preserves rope colors, works on both grids, and
remembers the setting across sessions, including offline play.

The shared save key is `monkey-fist-unified-v1`. It stores chapter unlocks,
best scores by set code, custom preferences, audio, and the current level.
When generation changes (`GRID_VERSION` in `game-engine.js`), saved scores are
cleared because they belong to different boards; Journey chapter unlocks stay.
Only scores are persisted, so par always comes from the current generated board.

The service worker caches the complete app, including worker dependencies, for
offline play. Bump the cache version and changed asset URLs when publishing.
On iOS, use Share → Add to Home Screen; on Android/desktop use the browser’s
install action. Installed play supports both portrait and landscape.

## Run and test

```sh
python -m http.server 4173
```

Open http://localhost:4173/. Tests use Node and Playwright with Chromium:

```sh
MF_TEST_URL=http://127.0.0.1:4173/ node --test tests/*.test.cjs experiments/mechanics/*.test.cjs
```

Set `CHROMIUM_PATH` if Chromium is not at `/usr/bin/chromium`.
The automated tests replay all 120 journey levels,
exercise custom grid/feature combinations and tiny random seeds, verify mirror
geometry and generator certificates, and play real pointer taps on laptop and
phone layouts. They cover chapter unlocks, concurrent animation, hints, undo,
audio gains, worker fallback, persistence, and offline reloads.

### Code size

`node scripts/code-metrics.cjs` reports size and complexity by area and file:
tokens (lines mislead in code with long lines), functions, and decision points
(`if`, loops, `case`, `catch`, `?:`, `&&`, `||`, `??`), plus the functions with the most
decisions. `--history` prints the same totals at every commit on `main`. The test
suite checks game code against `scripts/code-budget.json` (current size plus 2 %
headroom): simplify, or run `--update` when growth is deliberate. Removing code can
lower the budget the same way.

The [generator benchmark](docs/research/puzzle-benchmark.md) compares Git revisions
or independent generators under common movement rules, with separate tap/slide
searches and seeded player policies. It runs offline and does not change gameplay.
